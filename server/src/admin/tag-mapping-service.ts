import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/connection';
import { createLogger } from '../utils/logger';
import { auditLog } from '../auth/audit';
import { Protocol, DataType, AccessMode } from '../shared/models';
import { NotFoundError, ValidationError } from '../utils/errors';
import { tagDatabase } from '../tags/tag-database';
import { dataBridge } from '../communication/data-bridge';

const log = createLogger('tag-mapping');

export interface TagMappingDTO {
  id: string;
  objectId: string;
  objectName: string;
  tagAddress: string;
  protocol: Protocol;
  dataType: DataType;
  accessMode: AccessMode;
  scaleFactor: number;
  offset: number;
  createdBy: string | null;
  updatedAt: string;
}

function toDTO(row: Record<string, unknown>): TagMappingDTO {
  return {
    id: row.id as string,
    objectId: row.object_id as string,
    objectName: row.object_name as string,
    tagAddress: row.tag_address as string,
    protocol: row.protocol as Protocol,
    dataType: row.data_type as DataType,
    accessMode: row.access_mode as AccessMode,
    scaleFactor: row.scale_factor as number,
    offset: row.offset as number,
    createdBy: row.created_by as string | null,
    updatedAt: row.updated_at as string,
  };
}

export function listMappings(): TagMappingDTO[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM object_tag_mappings ORDER BY object_name').all() as Record<string, unknown>[];
  return rows.map(toDTO);
}

export function getMapping(id: string): TagMappingDTO {
  const db = getDb();
  const row = db.prepare('SELECT * FROM object_tag_mappings WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) throw new NotFoundError('Tag mapping not found');
  return toDTO(row);
}

export function createMapping(
  objectId: string,
  objectName: string,
  tagAddress: string,
  protocol: Protocol,
  dataType: DataType,
  accessMode: AccessMode,
  scaleFactor: number,
  offset: number,
  createdBy: string,
): TagMappingDTO {
  if (!objectId || !objectName || !tagAddress) throw new ValidationError('objectId, objectName, and tagAddress are required');

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO object_tag_mappings (id, object_id, object_name, tag_address, protocol, data_type, access_mode, scale_factor, "offset", created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, objectId, objectName, tagAddress, protocol, dataType, accessMode, scaleFactor, offset, createdBy);

  // Register in tag database
  tagDatabase.registerTag(tagAddress, {
    address: tagAddress,
    dataType,
    accessMode,
    scaleFactor,
    offset,
  });

  auditLog('TAG_MAPPING_CREATED', createdBy, 'tag_mapping', id, { objectName, tagAddress, protocol });
  log.info(`Tag mapping created: ${objectName} → ${tagAddress} (${protocol})`);
  return getMapping(id);
}

export function updateMapping(
  id: string,
  updates: Partial<{ objectName: string; tagAddress: string; dataType: DataType; accessMode: AccessMode; scaleFactor: number; offset: number }>,
  actorId: string,
): TagMappingDTO {
  const db = getDb();
  const fields: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];

  if (updates.objectName !== undefined) { fields.push('object_name = ?'); values.push(updates.objectName); }
  if (updates.tagAddress !== undefined) { fields.push('tag_address = ?'); values.push(updates.tagAddress); }
  if (updates.dataType !== undefined) { fields.push('data_type = ?'); values.push(updates.dataType); }
  if (updates.accessMode !== undefined) { fields.push('access_mode = ?'); values.push(updates.accessMode); }
  if (updates.scaleFactor !== undefined) { fields.push('scale_factor = ?'); values.push(updates.scaleFactor); }
  if (updates.offset !== undefined) { fields.push('"offset" = ?'); values.push(updates.offset); }

  values.push(id);
  db.prepare(`UPDATE object_tag_mappings SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  auditLog('TAG_MAPPING_UPDATED', actorId, 'tag_mapping', id, { updates: Object.keys(updates) });

  // Reload data bridge
  dataBridge.reloadMappings();

  return getMapping(id);
}

export function deleteMapping(id: string, actorId: string): void {
  const db = getDb();
  const mapping = getMapping(id);
  db.prepare('DELETE FROM object_tag_mappings WHERE id = ?').run(id);
  tagDatabase.unregisterTag(mapping.tagAddress);
  auditLog('TAG_MAPPING_DELETED', actorId, 'tag_mapping', id, { objectName: mapping.objectName });
  dataBridge.reloadMappings();
}
