import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/connection';
import { createLogger } from '../utils/logger';
import { auditLog } from '../auth/audit';
import { NotFoundError, ValidationError } from '../utils/errors';

const log = createLogger('layout-service');

export interface UILayoutDTO {
  id: string;
  name: string;
  templateId: string;
  isActive: boolean;
  createdBy: string | null;
  widgets: unknown[];
  version: number;
  updatedAt: string;
}

function toDTO(row: Record<string, unknown>): UILayoutDTO {
  return {
    id: row.id as string,
    name: row.name as string,
    templateId: row.template_id as string,
    isActive: Boolean(row.is_active),
    createdBy: row.created_by as string | null,
    widgets: JSON.parse(row.widgets as string || '[]'),
    version: row.version as number,
    updatedAt: row.updated_at as string,
  };
}

export function listLayouts(): UILayoutDTO[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM ui_layouts ORDER BY name').all() as Record<string, unknown>[];
  return rows.map(toDTO);
}

export function getLayout(id: string): UILayoutDTO {
  const db = getDb();
  const row = db.prepare('SELECT * FROM ui_layouts WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) throw new NotFoundError('Layout not found');
  return toDTO(row);
}

export function getActiveLayout(): UILayoutDTO | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM ui_layouts WHERE is_active = 1').get() as Record<string, unknown> | undefined;
  return row ? toDTO(row) : null;
}

export function createLayout(
  name: string,
  templateId: string,
  widgets: unknown[],
  createdBy: string,
): UILayoutDTO {
  if (!name) throw new ValidationError('Name is required');

  const db = getDb();
  const id = uuidv4();

  db.prepare('INSERT INTO ui_layouts (id, name, template_id, widgets, created_by) VALUES (?, ?, ?, ?, ?)')
    .run(id, name, templateId, JSON.stringify(widgets), createdBy);

  auditLog('LAYOUT_CREATED', createdBy, 'layout', id, { name, templateId });
  log.info(`Layout created: ${name}`);
  return getLayout(id);
}

export function updateLayout(
  id: string,
  updates: { name?: string; templateId?: string; widgets?: unknown[]; isActive?: boolean },
  actorId: string,
): UILayoutDTO {
  const db = getDb();
  const existing = db.prepare('SELECT id, version FROM ui_layouts WHERE id = ?').get(id) as { id: string; version: number } | undefined;
  if (!existing) throw new NotFoundError('Layout not found');

  const fields: string[] = ['version = ?', "updated_at = datetime('now')"];
  const values: unknown[] = [existing.version + 1];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.templateId !== undefined) { fields.push('template_id = ?'); values.push(updates.templateId); }
  if (updates.widgets !== undefined) { fields.push('widgets = ?'); values.push(JSON.stringify(updates.widgets)); }
  if (updates.isActive !== undefined) {
    if (updates.isActive) {
      // Deactivate all other layouts
      db.prepare('UPDATE ui_layouts SET is_active = 0').run();
    }
    fields.push('is_active = ?');
    values.push(updates.isActive ? 1 : 0);
  }

  values.push(id);
  db.prepare(`UPDATE ui_layouts SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  auditLog('LAYOUT_UPDATED', actorId, 'layout', id, { updates: Object.keys(updates) });
  return getLayout(id);
}

export function deleteLayout(id: string, actorId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM ui_layouts WHERE id = ?').run(id);
  auditLog('LAYOUT_DELETED', actorId, 'layout', id, {});
}

export function publishLayout(id: string, actorId: string): UILayoutDTO {
  return updateLayout(id, { isActive: true }, actorId);
}
