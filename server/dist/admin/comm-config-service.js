"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listConfigs = listConfigs;
exports.getConfig = getConfig;
exports.createConfig = createConfig;
exports.updateConfig = updateConfig;
exports.deleteConfig = deleteConfig;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const logger_1 = require("../utils/logger");
const audit_1 = require("../auth/audit");
const errors_1 = require("../utils/errors");
const log = (0, logger_1.createLogger)('comm-config');
function toDTO(row) {
    return {
        id: row.id,
        protocol: row.protocol,
        name: row.name,
        isActive: Boolean(row.is_active),
        config: JSON.parse(row.config || '{}'),
        createdBy: row.created_by,
        updatedAt: row.updated_at,
    };
}
function listConfigs(protocol) {
    const db = (0, connection_1.getDb)();
    let rows;
    if (protocol) {
        rows = db.prepare('SELECT * FROM communication_configs WHERE protocol = ? ORDER BY name').all(protocol);
    }
    else {
        rows = db.prepare('SELECT * FROM communication_configs ORDER BY protocol, name').all();
    }
    return rows.map(toDTO);
}
function getConfig(id) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT * FROM communication_configs WHERE id = ?').get(id);
    if (!row)
        throw new errors_1.NotFoundError('Communication config not found');
    return toDTO(row);
}
function createConfig(protocol, name, configData, createdBy) {
    if (!name)
        throw new errors_1.ValidationError('Name is required');
    const db = (0, connection_1.getDb)();
    const id = (0, uuid_1.v4)();
    db.prepare('INSERT INTO communication_configs (id, protocol, name, config, created_by) VALUES (?, ?, ?, ?, ?)')
        .run(id, protocol, name, JSON.stringify(configData), createdBy);
    (0, audit_1.auditLog)('COMM_CONFIG_CREATED', createdBy, 'communication', id, { protocol, name });
    log.info(`Communication config created: ${name} (${protocol})`);
    return getConfig(id);
}
function updateConfig(id, updates, actorId) {
    const db = (0, connection_1.getDb)();
    const fields = ["updated_at = datetime('now')"];
    const values = [];
    if (updates.name !== undefined) {
        fields.push('name = ?');
        values.push(updates.name);
    }
    if (updates.isActive !== undefined) {
        fields.push('is_active = ?');
        values.push(updates.isActive ? 1 : 0);
    }
    if (updates.config !== undefined) {
        fields.push('config = ?');
        values.push(JSON.stringify(updates.config));
    }
    values.push(id);
    db.prepare(`UPDATE communication_configs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    (0, audit_1.auditLog)('COMM_CONFIG_UPDATED', actorId, 'communication', id, { updates: Object.keys(updates) });
    return getConfig(id);
}
function deleteConfig(id, actorId) {
    const db = (0, connection_1.getDb)();
    db.prepare('DELETE FROM communication_configs WHERE id = ?').run(id);
    (0, audit_1.auditLog)('COMM_CONFIG_DELETED', actorId, 'communication', id, {});
}
//# sourceMappingURL=comm-config-service.js.map