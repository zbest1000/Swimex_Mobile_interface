import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/connection';
import { createLogger } from '../utils/logger';
import { auditLog } from '../auth/audit';
import { Protocol } from '../shared/models';
import { NotFoundError, ValidationError } from '../utils/errors';

const log = createLogger('comm-config');

export interface CommConfigDTO {
  id: string;
  protocol: Protocol;
  name: string;
  isActive: boolean;
  config: Record<string, unknown>;
  createdBy: string | null;
  updatedAt: string;
}

function toDTO(row: Record<string, unknown>): CommConfigDTO {
  return {
    id: row.id as string,
    protocol: row.protocol as Protocol,
    name: row.name as string,
    isActive: Boolean(row.is_active),
    config: JSON.parse(row.config as string || '{}'),
    createdBy: row.created_by as string | null,
    updatedAt: row.updated_at as string,
  };
}

export function listConfigs(protocol?: Protocol): CommConfigDTO[] {
  const db = getDb();
  let rows: Record<string, unknown>[];
  if (protocol) {
    rows = db.prepare('SELECT * FROM communication_configs WHERE protocol = ? ORDER BY name').all(protocol) as Record<string, unknown>[];
  } else {
    rows = db.prepare('SELECT * FROM communication_configs ORDER BY protocol, name').all() as Record<string, unknown>[];
  }
  return rows.map(toDTO);
}

export function getConfig(id: string): CommConfigDTO {
  const db = getDb();
  const row = db.prepare('SELECT * FROM communication_configs WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) throw new NotFoundError('Communication config not found');
  return toDTO(row);
}

export function createConfig(
  protocol: Protocol,
  name: string,
  configData: Record<string, unknown>,
  createdBy: string,
): CommConfigDTO {
  if (!name) throw new ValidationError('Name is required');

  const db = getDb();
  const id = uuidv4();

  db.prepare('INSERT INTO communication_configs (id, protocol, name, config, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(id, protocol, name, JSON.stringify(configData), createdBy);

  auditLog('COMM_CONFIG_CREATED', createdBy, 'communication', id, { protocol, name });
  log.info(`Communication config created: ${name} (${protocol})`);
  return getConfig(id);
}

export function updateConfig(
  id: string,
  updates: { name?: string; isActive?: boolean; config?: Record<string, unknown> },
  actorId: string,
): CommConfigDTO {
  const db = getDb();
  const fields: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.isActive !== undefined) { fields.push('is_active = ?'); values.push(updates.isActive ? 1 : 0); }
  if (updates.config !== undefined) { fields.push('config = ?'); values.push(JSON.stringify(updates.config)); }

  values.push(id);
  db.prepare(`UPDATE communication_configs SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  auditLog('COMM_CONFIG_UPDATED', actorId, 'communication', id, { updates: Object.keys(updates) });
  return getConfig(id);
}

export function deleteConfig(id: string, actorId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM communication_configs WHERE id = ?').run(id);
  auditLog('COMM_CONFIG_DELETED', actorId, 'communication', id, {});
}
