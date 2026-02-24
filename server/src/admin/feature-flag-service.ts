import { getDb } from '../database/connection';
import { createLogger } from '../utils/logger';
import { auditLog } from '../auth/audit';
import { NotFoundError } from '../utils/errors';

const log = createLogger('feature-flags');

export interface FeatureFlagDTO {
  id: string;
  featureKey: string;
  displayName: string;
  description: string;
  isEnabled: boolean;
  isVisible: boolean;
  enabledBy: string | null;
  enabledAt: string | null;
  updatedAt: string;
}

function toDTO(row: Record<string, unknown>): FeatureFlagDTO {
  return {
    id: row.id as string,
    featureKey: row.feature_key as string,
    displayName: row.display_name as string,
    description: row.description as string,
    isEnabled: Boolean(row.is_enabled),
    isVisible: Boolean(row.is_visible),
    enabledBy: row.enabled_by as string | null,
    enabledAt: row.enabled_at as string | null,
    updatedAt: row.updated_at as string,
  };
}

export function listFlags(): FeatureFlagDTO[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM feature_flags ORDER BY feature_key').all() as Record<string, unknown>[];
  return rows.map(toDTO);
}

export function getFlag(key: string): FeatureFlagDTO | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM feature_flags WHERE feature_key = ?').get(key) as Record<string, unknown> | undefined;
  return row ? toDTO(row) : null;
}

export function isFlagEnabled(key: string): boolean {
  const flag = getFlag(key);
  return flag?.isEnabled ?? false;
}

export function isFlagVisible(key: string): boolean {
  const flag = getFlag(key);
  return (flag?.isEnabled && flag?.isVisible) ?? false;
}

export function setFlag(key: string, enabled: boolean, visible: boolean, actorId: string): FeatureFlagDTO {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM feature_flags WHERE feature_key = ?').get(key) as Record<string, unknown> | undefined;
  if (!existing) throw new NotFoundError(`Feature flag "${key}" not found`);

  const enabledAt = enabled ? "datetime('now')" : 'NULL';
  db.prepare(`
    UPDATE feature_flags 
    SET is_enabled = ?, is_visible = ?, enabled_by = ?, enabled_at = ${enabledAt}, updated_at = datetime('now')
    WHERE feature_key = ?
  `).run(enabled ? 1 : 0, visible ? 1 : 0, actorId, key);

  auditLog('FEATURE_FLAG_CHANGED', actorId, 'feature_flag', key, { enabled, visible });
  log.info(`Feature flag "${key}": enabled=${enabled}, visible=${visible}`);

  return getFlag(key)!;
}
