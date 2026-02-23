import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/connection';
import { createLogger } from '../utils/logger';
import { GraphicFormat } from '../shared/models';
import { auditLog } from '../auth/audit';
import { NotFoundError, ValidationError } from '../utils/errors';

const log = createLogger('graphics');

export interface GraphicAssetDTO {
  id: string;
  name: string;
  category: string;
  tags: string[];
  format: GraphicFormat;
  svgContent: string | null;
  isBuiltIn: boolean;
  version: number;
  elements: GraphicElementDTO[];
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GraphicElementDTO {
  elementId: string;
  elementType: string;
  displayName: string;
  bindable: boolean;
}

function toDTO(row: Record<string, unknown>): GraphicAssetDTO {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as string,
    tags: JSON.parse(row.tags as string || '[]'),
    format: row.format as GraphicFormat,
    svgContent: row.svg_content as string | null,
    isBuiltIn: Boolean(row.is_built_in),
    version: row.version as number,
    elements: JSON.parse(row.elements as string || '[]'),
    createdBy: row.created_by as string | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function listGraphics(options?: {
  category?: string;
  search?: string;
  format?: GraphicFormat;
  limit?: number;
  offset?: number;
}): { assets: GraphicAssetDTO[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.category) { conditions.push('category = ?'); params.push(options.category); }
  if (options?.format) { conditions.push('format = ?'); params.push(options.format); }
  if (options?.search) { conditions.push('(name LIKE ? OR tags LIKE ?)'); params.push(`%${options.search}%`, `%${options.search}%`); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM graphic_assets ${where}`).get(...params) as { count: number }).count;
  const rows = db.prepare(`SELECT id, name, category, tags, format, svg_content, is_built_in, version, elements, created_by, created_at, updated_at FROM graphic_assets ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as Record<string, unknown>[];

  return { assets: rows.map(toDTO), total };
}

export function getGraphic(id: string): GraphicAssetDTO {
  const db = getDb();
  const row = db.prepare('SELECT id, name, category, tags, format, svg_content, is_built_in, version, elements, created_by, created_at, updated_at FROM graphic_assets WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) throw new NotFoundError('Graphic not found');
  return toDTO(row);
}

export function getGraphicFile(id: string): Buffer {
  const db = getDb();
  const row = db.prepare('SELECT source_file FROM graphic_assets WHERE id = ?').get(id) as { source_file: Buffer } | undefined;
  if (!row) throw new NotFoundError('Graphic not found');
  return row.source_file;
}

export function importGraphic(
  name: string,
  category: string,
  tags: string[],
  format: GraphicFormat,
  sourceFile: Buffer,
  svgContent: string | null,
  elements: GraphicElementDTO[],
  createdBy: string,
): GraphicAssetDTO {
  if (!name) throw new ValidationError('Name is required');

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO graphic_assets (id, name, category, tags, format, source_file, svg_content, elements, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, category, JSON.stringify(tags), format, sourceFile, svgContent, JSON.stringify(elements), createdBy);

  auditLog('GRAPHIC_IMPORTED', createdBy, 'graphic', id, { name, format, category });
  log.info(`Graphic imported: ${name} (${format})`);

  return getGraphic(id);
}

export function updateGraphic(
  id: string,
  updates: { name?: string; category?: string; tags?: string[]; svgContent?: string; elements?: GraphicElementDTO[] },
  actorId: string,
): GraphicAssetDTO {
  const db = getDb();
  const existing = db.prepare('SELECT id, version FROM graphic_assets WHERE id = ?').get(id) as { id: string; version: number } | undefined;
  if (!existing) throw new NotFoundError('Graphic not found');

  const fields: string[] = ['version = ?', "updated_at = datetime('now')"];
  const values: unknown[] = [existing.version + 1];

  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.category !== undefined) { fields.push('category = ?'); values.push(updates.category); }
  if (updates.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(updates.tags)); }
  if (updates.svgContent !== undefined) { fields.push('svg_content = ?'); values.push(updates.svgContent); }
  if (updates.elements !== undefined) { fields.push('elements = ?'); values.push(JSON.stringify(updates.elements)); }

  values.push(id);
  db.prepare(`UPDATE graphic_assets SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  auditLog('GRAPHIC_UPDATED', actorId, 'graphic', id, { updates: Object.keys(updates) });
  return getGraphic(id);
}

export function deleteGraphic(id: string, actorId: string): void {
  const db = getDb();
  const existing = db.prepare('SELECT name FROM graphic_assets WHERE id = ?').get(id) as { name: string } | undefined;
  if (!existing) throw new NotFoundError('Graphic not found');

  db.prepare('DELETE FROM graphic_assets WHERE id = ?').run(id);
  auditLog('GRAPHIC_DELETED', actorId, 'graphic', id, { name: existing.name });
  log.info(`Graphic deleted: ${existing.name}`);
}

export function parseSvgElements(svgContent: string): GraphicElementDTO[] {
  const elements: GraphicElementDTO[] = [];
  const idRegex = /id="([^"]+)"/g;
  const tagRegex = /<(g|path|rect|circle|ellipse|text|image|polygon|line)\s/gi;

  let match;
  while ((match = idRegex.exec(svgContent)) !== null) {
    const elementId = match[1];
    const before = svgContent.substring(Math.max(0, match.index - 50), match.index);
    let elementType = 'GROUP';

    const tagMatch = tagRegex.exec(before);
    if (tagMatch) {
      elementType = tagMatch[1].toUpperCase();
    }

    elements.push({
      elementId,
      elementType,
      displayName: elementId.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      bindable: true,
    });
  }

  return elements;
}

export function getCategories(): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT DISTINCT category FROM graphic_assets ORDER BY category').all() as { category: string }[];
  return rows.map(r => r.category);
}
