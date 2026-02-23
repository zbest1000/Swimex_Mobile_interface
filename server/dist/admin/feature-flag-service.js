"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listFlags = listFlags;
exports.getFlag = getFlag;
exports.isFlagEnabled = isFlagEnabled;
exports.isFlagVisible = isFlagVisible;
exports.setFlag = setFlag;
const connection_1 = require("../database/connection");
const logger_1 = require("../utils/logger");
const audit_1 = require("../auth/audit");
const errors_1 = require("../utils/errors");
const log = (0, logger_1.createLogger)('feature-flags');
function toDTO(row) {
    return {
        id: row.id,
        featureKey: row.feature_key,
        displayName: row.display_name,
        description: row.description,
        isEnabled: Boolean(row.is_enabled),
        isVisible: Boolean(row.is_visible),
        enabledBy: row.enabled_by,
        enabledAt: row.enabled_at,
        updatedAt: row.updated_at,
    };
}
function listFlags() {
    const db = (0, connection_1.getDb)();
    const rows = db.prepare('SELECT * FROM feature_flags ORDER BY feature_key').all();
    return rows.map(toDTO);
}
function getFlag(key) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT * FROM feature_flags WHERE feature_key = ?').get(key);
    return row ? toDTO(row) : null;
}
function isFlagEnabled(key) {
    const flag = getFlag(key);
    return flag?.isEnabled ?? false;
}
function isFlagVisible(key) {
    const flag = getFlag(key);
    return (flag?.isEnabled && flag?.isVisible) ?? false;
}
function setFlag(key, enabled, visible, actorId) {
    const db = (0, connection_1.getDb)();
    const existing = db.prepare('SELECT * FROM feature_flags WHERE feature_key = ?').get(key);
    if (!existing)
        throw new errors_1.NotFoundError(`Feature flag "${key}" not found`);
    const enabledAt = enabled ? "datetime('now')" : 'NULL';
    db.prepare(`
    UPDATE feature_flags 
    SET is_enabled = ?, is_visible = ?, enabled_by = ?, enabled_at = ${enabledAt}, updated_at = datetime('now')
    WHERE feature_key = ?
  `).run(enabled ? 1 : 0, visible ? 1 : 0, actorId, key);
    (0, audit_1.auditLog)('FEATURE_FLAG_CHANGED', actorId, 'feature_flag', key, { enabled, visible });
    log.info(`Feature flag "${key}": enabled=${enabled}, visible=${visible}`);
    return getFlag(key);
}
//# sourceMappingURL=feature-flag-service.js.map