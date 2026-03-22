import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/connection';
import { createLogger } from '../utils/logger';
import { auditLog } from '../auth/audit';
import { DeviceType } from '../shared/models';
import { NotFoundError, ValidationError } from '../utils/errors';

const log = createLogger('device-service');

const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;

export interface DeviceDTO {
  id: string;
  macAddress: string;
  deviceName: string;
  deviceType: DeviceType;
  isRegistered: boolean;
  registeredBy: string | null;
  registeredAt: string;
  lastSeenAt: string;
}

function toDTO(row: Record<string, unknown>): DeviceDTO {
  return {
    id: row.id as string,
    macAddress: row.mac_address as string,
    deviceName: row.device_name as string,
    deviceType: row.device_type as DeviceType,
    isRegistered: Boolean(row.is_registered),
    registeredBy: row.registered_by as string | null,
    registeredAt: row.registered_at as string,
    lastSeenAt: row.last_seen_at as string,
  };
}

export function listDevices(): DeviceDTO[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM registered_devices ORDER BY last_seen_at DESC').all() as Record<string, unknown>[];
  return rows.map(toDTO);
}

export function getDevice(id: string): DeviceDTO {
  const db = getDb();
  const row = db.prepare('SELECT * FROM registered_devices WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) throw new NotFoundError('Device not found');
  return toDTO(row);
}

export function getDeviceByMAC(mac: string): DeviceDTO | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM registered_devices WHERE mac_address = ?').get(mac.toUpperCase()) as Record<string, unknown> | undefined;
  return row ? toDTO(row) : null;
}

export function registerDevice(
  macAddress: string,
  deviceName: string,
  deviceType: DeviceType,
  registeredBy: string,
): DeviceDTO {
  if (!MAC_REGEX.test(macAddress)) throw new ValidationError('Invalid MAC address format (expected XX:XX:XX:XX:XX:XX)');

  const db = getDb();
  const normalized = macAddress.toUpperCase();

  const existing = db.prepare('SELECT id FROM registered_devices WHERE mac_address = ?').get(normalized);
  if (existing) {
    db.prepare("UPDATE registered_devices SET is_registered = 1, device_name = ?, device_type = ?, registered_by = ?, registered_at = datetime('now') WHERE mac_address = ?")
      .run(deviceName, deviceType, registeredBy, normalized);
    auditLog('DEVICE_REGISTERED', registeredBy, 'device', normalized, { deviceName });
    log.info(`Device re-registered: ${normalized}`);
    return getDeviceByMAC(normalized)!;
  }

  const id = uuidv4();
  db.prepare('INSERT INTO registered_devices (id, mac_address, device_name, device_type, is_registered, registered_by) VALUES (?, ?, ?, ?, 1, ?)')
    .run(id, normalized, deviceName, deviceType, registeredBy);

  auditLog('DEVICE_REGISTERED', registeredBy, 'device', id, { macAddress: normalized, deviceName });
  log.info(`Device registered: ${normalized} (${deviceName})`);
  return getDevice(id);
}

export function revokeDevice(id: string, actorId: string): void {
  const db = getDb();
  db.prepare('UPDATE registered_devices SET is_registered = 0 WHERE id = ?').run(id);
  auditLog('DEVICE_REVOKED', actorId, 'device', id, {});
  log.info(`Device registration revoked: ${id}`);
}

export function deleteDevice(id: string, actorId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM registered_devices WHERE id = ?').run(id);
  auditLog('DEVICE_DELETED', actorId, 'device', id, {});
}

export function isDeviceRegistered(mac: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT is_registered FROM registered_devices WHERE mac_address = ? AND is_registered = 1').get(mac.toUpperCase());
  return !!row;
}

export function trackDeviceSeen(mac: string): void {
  const db = getDb();
  const normalized = mac.toUpperCase();
  const existing = db.prepare('SELECT id FROM registered_devices WHERE mac_address = ?').get(normalized);
  if (existing) {
    db.prepare("UPDATE registered_devices SET last_seen_at = datetime('now') WHERE mac_address = ?").run(normalized);
  } else {
    db.prepare('INSERT INTO registered_devices (id, mac_address, device_name, device_type, is_registered) VALUES (?, ?, ?, ?, 0)')
      .run(uuidv4(), normalized, 'Unknown Device', DeviceType.OTHER);
  }
}
