"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDevices = listDevices;
exports.getDevice = getDevice;
exports.getDeviceByMAC = getDeviceByMAC;
exports.registerDevice = registerDevice;
exports.revokeDevice = revokeDevice;
exports.deleteDevice = deleteDevice;
exports.isDeviceRegistered = isDeviceRegistered;
exports.trackDeviceSeen = trackDeviceSeen;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const logger_1 = require("../utils/logger");
const audit_1 = require("../auth/audit");
const models_1 = require("../shared/models");
const errors_1 = require("../utils/errors");
const log = (0, logger_1.createLogger)('device-service');
const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/;
function toDTO(row) {
    return {
        id: row.id,
        macAddress: row.mac_address,
        deviceName: row.device_name,
        deviceType: row.device_type,
        isRegistered: Boolean(row.is_registered),
        registeredBy: row.registered_by,
        registeredAt: row.registered_at,
        lastSeenAt: row.last_seen_at,
    };
}
function listDevices() {
    const db = (0, connection_1.getDb)();
    const rows = db.prepare('SELECT * FROM registered_devices ORDER BY last_seen_at DESC').all();
    return rows.map(toDTO);
}
function getDevice(id) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT * FROM registered_devices WHERE id = ?').get(id);
    if (!row)
        throw new errors_1.NotFoundError('Device not found');
    return toDTO(row);
}
function getDeviceByMAC(mac) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT * FROM registered_devices WHERE mac_address = ?').get(mac.toUpperCase());
    return row ? toDTO(row) : null;
}
function registerDevice(macAddress, deviceName, deviceType, registeredBy) {
    if (!MAC_REGEX.test(macAddress))
        throw new errors_1.ValidationError('Invalid MAC address format (expected XX:XX:XX:XX:XX:XX)');
    const db = (0, connection_1.getDb)();
    const normalized = macAddress.toUpperCase();
    const existing = db.prepare('SELECT id FROM registered_devices WHERE mac_address = ?').get(normalized);
    if (existing) {
        db.prepare('UPDATE registered_devices SET is_registered = 1, device_name = ?, device_type = ?, registered_by = ?, registered_at = datetime("now") WHERE mac_address = ?')
            .run(deviceName, deviceType, registeredBy, normalized);
        (0, audit_1.auditLog)('DEVICE_REGISTERED', registeredBy, 'device', normalized, { deviceName });
        log.info(`Device re-registered: ${normalized}`);
        return getDeviceByMAC(normalized);
    }
    const id = (0, uuid_1.v4)();
    db.prepare('INSERT INTO registered_devices (id, mac_address, device_name, device_type, is_registered, registered_by) VALUES (?, ?, ?, ?, 1, ?)')
        .run(id, normalized, deviceName, deviceType, registeredBy);
    (0, audit_1.auditLog)('DEVICE_REGISTERED', registeredBy, 'device', id, { macAddress: normalized, deviceName });
    log.info(`Device registered: ${normalized} (${deviceName})`);
    return getDevice(id);
}
function revokeDevice(id, actorId) {
    const db = (0, connection_1.getDb)();
    db.prepare('UPDATE registered_devices SET is_registered = 0 WHERE id = ?').run(id);
    (0, audit_1.auditLog)('DEVICE_REVOKED', actorId, 'device', id, {});
    log.info(`Device registration revoked: ${id}`);
}
function deleteDevice(id, actorId) {
    const db = (0, connection_1.getDb)();
    db.prepare('DELETE FROM registered_devices WHERE id = ?').run(id);
    (0, audit_1.auditLog)('DEVICE_DELETED', actorId, 'device', id, {});
}
function isDeviceRegistered(mac) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT is_registered FROM registered_devices WHERE mac_address = ? AND is_registered = 1').get(mac.toUpperCase());
    return !!row;
}
function trackDeviceSeen(mac) {
    const db = (0, connection_1.getDb)();
    const normalized = mac.toUpperCase();
    const existing = db.prepare('SELECT id FROM registered_devices WHERE mac_address = ?').get(normalized);
    if (existing) {
        db.prepare('UPDATE registered_devices SET last_seen_at = datetime("now") WHERE mac_address = ?').run(normalized);
    }
    else {
        db.prepare('INSERT INTO registered_devices (id, mac_address, device_name, device_type, is_registered) VALUES (?, ?, ?, ?, 0)')
            .run((0, uuid_1.v4)(), normalized, 'Unknown Device', models_1.DeviceType.OTHER);
    }
}
//# sourceMappingURL=device-service.js.map