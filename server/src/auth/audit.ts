import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/connection';

export function auditLog(
  action: string,
  actorId: string | null,
  targetType: string,
  targetId: string | null,
  details: Record<string, unknown> = {},
  sourceIp?: string,
): void {
  const db = getDb();

  let actorUsername: string | null = null;
  if (actorId) {
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(actorId) as { username: string } | undefined;
    actorUsername = user?.username ?? null;
  }

  db.prepare(`
    INSERT INTO audit_log (id, action, actor_id, actor_username, target_type, target_id, details, source_ip)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    uuidv4(),
    action,
    actorId,
    actorUsername,
    targetType,
    targetId,
    JSON.stringify(details),
    sourceIp ?? null,
  );
}

export function getAuditLogs(options: {
  limit?: number;
  offset?: number;
  action?: string;
  actorId?: string;
  targetType?: string;
}): { entries: Record<string, unknown>[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.action) { conditions.push('action = ?'); params.push(options.action); }
  if (options.actorId) { conditions.push('actor_id = ?'); params.push(options.actorId); }
  if (options.targetType) { conditions.push('target_type = ?'); params.push(options.targetType); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM audit_log ${where}`).get(...params) as { count: number }).count;
  const entries = db.prepare(`SELECT * FROM audit_log ${where} ORDER BY timestamp DESC LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as Record<string, unknown>[];

  return { entries, total };
}
