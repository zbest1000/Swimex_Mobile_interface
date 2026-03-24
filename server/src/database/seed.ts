import { getDb } from './connection';
import { createLogger } from '../utils/logger';
import * as authService from '../auth/auth-service';
import { UserRole } from '../shared/models';

const log = createLogger('seed');

const DEFAULT_ACCOUNTS = [
  { username: 'superadmin', password: 'superadmin', displayName: 'Super Administrator', role: UserRole.SUPER_ADMINISTRATOR },
  { username: 'admin',      password: 'admin123',   displayName: 'Administrator',       role: UserRole.ADMINISTRATOR },
  { username: 'swimmer',    password: 'swimmer1',    displayName: 'Demo Swimmer',        role: UserRole.USER },
];

/**
 * Auto-seed on first run: creates default accounts.
 * Passwords are hashed with Argon2id before storage — plaintext is never
 * persisted in the database, logs, or filesystem.
 */
export async function seedDefaults(): Promise<void> {
  const db = getDb();

  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) {
    log.info('Database already has users — skipping seed');
    return;
  }

  log.info('First-run detected — seeding default accounts...');

  db.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('commissioned', 'false', datetime('now'))
  `).run();
  db.prepare(`
    INSERT OR REPLACE INTO system_config (key, value, updated_at) VALUES ('commissioning_step', '0', datetime('now'))
  `).run();

  for (const acct of DEFAULT_ACCOUNTS) {
    const password = (acct.username === 'admin' && process.env.ADMIN_PASS)
      ? process.env.ADMIN_PASS
      : (acct.username === 'superadmin' && process.env.SUPERADMIN_PASS)
        ? process.env.SUPERADMIN_PASS
        : acct.password;
    try {
      await authService.createUser(acct.username, password, acct.displayName, acct.role);
      log.info(`Created account: ${acct.username} (${acct.role})`);
    } catch (err: any) {
      log.warn(`Account creation (${acct.username}): ${err.message}`);
    }
  }

  log.info('Default accounts created (passwords stored as Argon2id hashes).');
  log.info('IMPORTANT: Change default passwords after first login.');
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
