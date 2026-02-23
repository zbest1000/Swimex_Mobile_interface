"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLayouts = listLayouts;
exports.getLayout = getLayout;
exports.getActiveLayout = getActiveLayout;
exports.createLayout = createLayout;
exports.updateLayout = updateLayout;
exports.deleteLayout = deleteLayout;
exports.publishLayout = publishLayout;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const logger_1 = require("../utils/logger");
const audit_1 = require("../auth/audit");
const errors_1 = require("../utils/errors");
const log = (0, logger_1.createLogger)('layout-service');
function toDTO(row) {
    return {
        id: row.id,
        name: row.name,
        templateId: row.template_id,
        isActive: Boolean(row.is_active),
        createdBy: row.created_by,
        widgets: JSON.parse(row.widgets || '[]'),
        version: row.version,
        updatedAt: row.updated_at,
    };
}
function listLayouts() {
    const db = (0, connection_1.getDb)();
    const rows = db.prepare('SELECT * FROM ui_layouts ORDER BY name').all();
    return rows.map(toDTO);
}
function getLayout(id) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT * FROM ui_layouts WHERE id = ?').get(id);
    if (!row)
        throw new errors_1.NotFoundError('Layout not found');
    return toDTO(row);
}
function getActiveLayout() {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT * FROM ui_layouts WHERE is_active = 1').get();
    return row ? toDTO(row) : null;
}
function createLayout(name, templateId, widgets, createdBy) {
    if (!name)
        throw new errors_1.ValidationError('Name is required');
    const db = (0, connection_1.getDb)();
    const id = (0, uuid_1.v4)();
    db.prepare('INSERT INTO ui_layouts (id, name, template_id, widgets, created_by) VALUES (?, ?, ?, ?, ?)')
        .run(id, name, templateId, JSON.stringify(widgets), createdBy);
    (0, audit_1.auditLog)('LAYOUT_CREATED', createdBy, 'layout', id, { name, templateId });
    log.info(`Layout created: ${name}`);
    return getLayout(id);
}
function updateLayout(id, updates, actorId) {
    const db = (0, connection_1.getDb)();
    const existing = db.prepare('SELECT id, version FROM ui_layouts WHERE id = ?').get(id);
    if (!existing)
        throw new errors_1.NotFoundError('Layout not found');
    const fields = ['version = ?', "updated_at = datetime('now')"];
    const values = [existing.version + 1];
    if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.templateId !== undefined) {
        fields.push('template_id = ?');
        values.push(updates.templateId);
    }
    if (updates.widgets !== undefined) {
        fields.push('widgets = ?');
        values.push(JSON.stringify(updates.widgets));
    }
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
    (0, audit_1.auditLog)('LAYOUT_UPDATED', actorId, 'layout', id, { updates: Object.keys(updates) });
    return getLayout(id);
}
function deleteLayout(id, actorId) {
    const db = (0, connection_1.getDb)();
    db.prepare('DELETE FROM ui_layouts WHERE id = ?').run(id);
    (0, audit_1.auditLog)('LAYOUT_DELETED', actorId, 'layout', id, {});
}
function publishLayout(id, actorId) {
    return updateLayout(id, { isActive: true }, actorId);
}
//# sourceMappingURL=layout-service.js.map