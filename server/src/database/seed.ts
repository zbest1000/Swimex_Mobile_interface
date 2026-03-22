import { getDb } from './connection';
import { createLogger } from '../utils/logger';
import * as authService from '../auth/auth-service';
import { UserRole } from '../shared/models';

const log = createLogger('seed');

/**
 * Auto-seed on first run: creates the initial Super Admin account.
 * The system starts UNCOMMISSIONED — the Super Admin must complete
 * the commissioning wizard on first login before anyone else can use the system.
 */
export async function seedDefaults(): Promise<void> {
  const db = getDb();

  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) {
    log.info('Database already has users — skipping seed');
    return;
  }

  log.info('First-run detected — seeding initial Super Admin account...');

  // Mark system as NOT commissioned
  db.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('commissioned', 'false', datetime('now'))
  `).run();
  db.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('commissioning_step', '0', datetime('now'))
  `).run();

  // Create default Super Admin — this is the only account that exists before commissioning
  try {
    await authService.createUser('superadmin', 'superadmin', 'Super Administrator', UserRole.SUPER_ADMINISTRATOR);
    log.info('Created initial Super Administrator: superadmin / superadmin');
  } catch (err: any) {
    log.warn(`Super admin creation: ${err.message}`);
  }

  // Seed default feature flags
  log.info('========================================');
  log.info(' First-Run Setup Required');
  log.info('========================================');
  log.info(' 1. Open the web interface in a browser');
  log.info(' 2. Log in as: superadmin / superadmin');
  log.info(' 3. Complete the commissioning wizard');
  log.info('========================================');
}

/**
 * Check if the system has been commissioned.
 */
export function isSystemCommissioned(): boolean {
  const db = getDb();
  const row = db.prepare("SELECT value FROM system_config WHERE key = 'commissioned'").get() as { value: string } | undefined;
  return row?.value === 'true';
}

/**
 * Mark the system as commissioned.
 */
export function markCommissioned(): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('commissioned', 'true', datetime('now'))
  `).run();
}

/**
 * Get a system config value.
 */
export function getSystemConfig(key: string): string | null {
  const db = getDb();
  const row = db.prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

/**
 * Set a system config value.
 */
export function setSystemConfig(key: string, value: string): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES (?, ?, datetime('now'))
  `).run(key, value);
}
