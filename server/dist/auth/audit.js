"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLog = auditLog;
exports.getAuditLogs = getAuditLogs;
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
function auditLog(action, actorId, targetType, targetId, details = {}, sourceIp) {
    const db = (0, connection_1.getDb)();
    let actorUsername = null;
    if (actorId) {
        const user = db.prepare('SELECT username FROM users WHERE id = ?').get(actorId);
        actorUsername = user?.username ?? null;
    }
    db.prepare(`
    INSERT INTO audit_log (id, action, actor_id, actor_username, target_type, target_id, details, source_ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run((0, uuid_1.v4)(), action, actorId, actorUsername, targetType, targetId, JSON.stringify(details), sourceIp ?? null);
}
function getAuditLogs(options) {
    const db = (0, connection_1.getDb)();
    const conditions = [];
    const params = [];
    if (options.action) {
        conditions.push('action = ?');
        params.push(options.action);
    }
    if (options.actorId) {
        conditions.push('actor_id = ?');
        params.push(options.actorId);
    }
    if (options.targetType) {
        conditions.push('target_type = ?');
        params.push(options.targetType);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit ?? 50;
    const offset = options.offset ?? 0;
    const total = db.prepare(`SELECT COUNT(*) as count FROM audit_log ${where}`).get(...params).count;
    const entries = db.prepare(`SELECT * FROM audit_log ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
        .all(...params, limit, offset);
    return { entries, total };
}
//# sourceMappingURL=audit.js.map