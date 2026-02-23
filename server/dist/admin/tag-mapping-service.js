"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMappings = listMappings;
exports.getMapping = getMapping;
exports.createMapping = createMapping;
exports.updateMapping = updateMapping;
exports.deleteMapping = deleteMapping;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const logger_1 = require("../utils/logger");
const audit_1 = require("../auth/audit");
const errors_1 = require("../utils/errors");
const tag_database_1 = require("../tags/tag-database");
const data_bridge_1 = require("../communication/data-bridge");
const log = (0, logger_1.createLogger)('tag-mapping');
function toDTO(row) {
    return {
        id: row.id,
        objectId: row.object_id,
        objectName: row.object_name,
        tagAddress: row.tag_address,
        protocol: row.protocol,
        dataType: row.data_type,
        accessMode: row.access_mode,
        scaleFactor: row.scale_factor,
        offset: row.offset,
        createdBy: row.created_by,
        updatedAt: row.updated_at,
    };
}
function listMappings() {
    const db = (0, connection_1.getDb)();
    const rows = db.prepare('SELECT * FROM object_tag_mappings ORDER BY object_name').all();
    return rows.map(toDTO);
}
function getMapping(id) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT * FROM object_tag_mappings WHERE id = ?').get(id);
    if (!row)
        throw new errors_1.NotFoundError('Tag mapping not found');
    return toDTO(row);
}
function createMapping(objectId, objectName, tagAddress, protocol, dataType, accessMode, scaleFactor, offset, createdBy) {
    if (!objectId || !objectName || !tagAddress)
        throw new errors_1.ValidationError('objectId, objectName, and tagAddress are required');
    const db = (0, connection_1.getDb)();
    const id = (0, uuid_1.v4)();
    db.prepare(`
    INSERT INTO object_tag_mappings (id, object_id, object_name, tag_address, protocol, data_type, access_mode, scale_factor, "offset", created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, objectId, objectName, tagAddress, protocol, dataType, accessMode, scaleFactor, offset, createdBy);
    // Register in tag database
    tag_database_1.tagDatabase.registerTag(tagAddress, {
        address: tagAddress,
        dataType,
        accessMode,
        scaleFactor,
        offset,
    });
    (0, audit_1.auditLog)('TAG_MAPPING_CREATED', createdBy, 'tag_mapping', id, { objectName, tagAddress, protocol });
    log.info(`Tag mapping created: ${objectName} → ${tagAddress} (${protocol})`);
    return getMapping(id);
}
function updateMapping(id, updates, actorId) {
    const db = (0, connection_1.getDb)();
    const fields = ["updated_at = datetime('now')"];
    const values = [];
    if (updates.objectName !== undefined) {
        fields.push('object_name = ?');
        values.push(updates.objectName);
    }
    if (updates.tagAddress !== undefined) {
        fields.push('tag_address = ?');
        values.push(updates.tagAddress);
    }
    if (updates.dataType !== undefined) {
        fields.push('data_type = ?');
        values.push(updates.dataType);
    }
    if (updates.accessMode !== undefined) {
        fields.push('access_mode = ?');
        values.push(updates.accessMode);
    }
    if (updates.scaleFactor !== undefined) {
        fields.push('scale_factor = ?');
        values.push(updates.scaleFactor);
    }
    if (updates.offset !== undefined) {
        fields.push('"offset" = ?');
        values.push(updates.offset);
    }
    values.push(id);
    db.prepare(`UPDATE object_tag_mappings SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    (0, audit_1.auditLog)('TAG_MAPPING_UPDATED', actorId, 'tag_mapping', id, { updates: Object.keys(updates) });
    // Reload data bridge
    data_bridge_1.dataBridge.reloadMappings();
    return getMapping(id);
}
function deleteMapping(id, actorId) {
    const db = (0, connection_1.getDb)();
    const mapping = getMapping(id);
    db.prepare('DELETE FROM object_tag_mappings WHERE id = ?').run(id);
    tag_database_1.tagDatabase.unregisterTag(mapping.tagAddress);
    (0, audit_1.auditLog)('TAG_MAPPING_DELETED', actorId, 'tag_mapping', id, { objectName: mapping.objectName });
    data_bridge_1.dataBridge.reloadMappings();
}
//# sourceMappingURL=tag-mapping-service.js.map