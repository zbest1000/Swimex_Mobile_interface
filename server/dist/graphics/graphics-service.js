"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listGraphics = listGraphics;
exports.getGraphic = getGraphic;
exports.getGraphicFile = getGraphicFile;
exports.importGraphic = importGraphic;
exports.updateGraphic = updateGraphic;
exports.deleteGraphic = deleteGraphic;
exports.parseSvgElements = parseSvgElements;
exports.getCategories = getCategories;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const logger_1 = require("../utils/logger");
const audit_1 = require("../auth/audit");
const errors_1 = require("../utils/errors");
const log = (0, logger_1.createLogger)('graphics');
function toDTO(row) {
    return {
        id: row.id,
        name: row.name,
        category: row.category,
        tags: JSON.parse(row.tags || '[]'),
        format: row.format,
        svgContent: row.svg_content,
        isBuiltIn: Boolean(row.is_built_in),
        version: row.version,
        elements: JSON.parse(row.elements || '[]'),
        createdBy: row.created_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function listGraphics(options) {
    const db = (0, connection_1.getDb)();
    const conditions = [];
    const params = [];
    if (options?.category) {
        conditions.push('category = ?');
        params.push(options.category);
    }
    if (options?.format) {
        conditions.push('format = ?');
        params.push(options.format);
    }
    if (options?.search) {
        conditions.push('(name LIKE ? OR tags LIKE ?)');
        params.push(`%${options.search}%`, `%${options.search}%`);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;
    const total = db.prepare(`SELECT COUNT(*) as count FROM graphic_assets ${where}`).get(...params).count;
    const rows = db.prepare(`SELECT id, name, category, tags, format, svg_content, is_built_in, version, elements, created_by, created_at, updated_at FROM graphic_assets ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
        .all(...params, limit, offset);
    return { assets: rows.map(toDTO), total };
}
function getGraphic(id) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT id, name, category, tags, format, svg_content, is_built_in, version, elements, created_by, created_at, updated_at FROM graphic_assets WHERE id = ?').get(id);
    if (!row)
        throw new errors_1.NotFoundError('Graphic not found');
    return toDTO(row);
}
function getGraphicFile(id) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT source_file FROM graphic_assets WHERE id = ?').get(id);
    if (!row)
        throw new errors_1.NotFoundError('Graphic not found');
    return row.source_file;
}
function importGraphic(name, category, tags, format, sourceFile, svgContent, elements, createdBy) {
    if (!name)
        throw new errors_1.ValidationError('Name is required');
    const db = (0, connection_1.getDb)();
    const id = (0, uuid_1.v4)();
    db.prepare(`
    INSERT INTO graphic_assets (id, name, category, tags, format, source_file, svg_content, elements, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, category, JSON.stringify(tags), format, sourceFile, svgContent, JSON.stringify(elements), createdBy);
    (0, audit_1.auditLog)('GRAPHIC_IMPORTED', createdBy, 'graphic', id, { name, format, category });
    log.info(`Graphic imported: ${name} (${format})`);
    return getGraphic(id);
}
function updateGraphic(id, updates, actorId) {
    const db = (0, connection_1.getDb)();
    const existing = db.prepare('SELECT id, version FROM graphic_assets WHERE id = ?').get(id);
    if (!existing)
        throw new errors_1.NotFoundError('Graphic not found');
    const fields = ['version = ?', "updated_at = datetime('now')"];
    const values = [existing.version + 1];
    if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.category !== undefined) {
        fields.push('category = ?');
        values.push(updates.category);
    }
    if (updates.tags !== undefined) {
        fields.push('tags = ?');
        values.push(JSON.stringify(updates.tags));
    }
    if (updates.svgContent !== undefined) {
        fields.push('svg_content = ?');
        values.push(updates.svgContent);
    }
    if (updates.elements !== undefined) {
        fields.push('elements = ?');
        values.push(JSON.stringify(updates.elements));
    }
    values.push(id);
    db.prepare(`UPDATE graphic_assets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    (0, audit_1.auditLog)('GRAPHIC_UPDATED', actorId, 'graphic', id, { updates: Object.keys(updates) });
    return getGraphic(id);
}
function deleteGraphic(id, actorId) {
    const db = (0, connection_1.getDb)();
    const existing = db.prepare('SELECT name FROM graphic_assets WHERE id = ?').get(id);
    if (!existing)
        throw new errors_1.NotFoundError('Graphic not found');
    db.prepare('DELETE FROM graphic_assets WHERE id = ?').run(id);
    (0, audit_1.auditLog)('GRAPHIC_DELETED', actorId, 'graphic', id, { name: existing.name });
    log.info(`Graphic deleted: ${existing.name}`);
}
function parseSvgElements(svgContent) {
    const elements = [];
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
function getCategories() {
    const db = (0, connection_1.getDb)();
    const rows = db.prepare('SELECT DISTINCT category FROM graphic_assets ORDER BY category').all();
    return rows.map(r => r.category);
}
//# sourceMappingURL=graphics-service.js.map