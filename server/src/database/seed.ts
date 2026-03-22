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

  // Create default Super Admin
  try {
    await authService.createUser('superadmin', 'superadmin', 'Super Administrator', UserRole.SUPER_ADMINISTRATOR);
    log.info('Created Super Administrator: superadmin / superadmin');
  } catch (err: any) {
    log.warn(`Super admin creation: ${err.message}`);
  }

  // Create default Admin
  try {
    await authService.createUser('admin', 'admin', 'Administrator', UserRole.ADMINISTRATOR);
    log.info('Created Administrator: admin / admin');
  } catch (err: any) {
    log.warn(`Admin creation: ${err.message}`);
  }

  log.info('========================================');
  log.info(' Default Accounts');
  log.info('========================================');
  log.info(' Super Admin: superadmin / superadmin');
  log.info(' Admin:       admin / admin');
  log.info('========================================');

  // Seed sample workout programs
  try {
    const db = getDb();
    const adminUser = db.prepare("SELECT id FROM users WHERE username = 'admin'").get() as { id: string } | undefined;
    if (adminUser) {
      const existingPrograms = (db.prepare('SELECT COUNT(*) as count FROM workout_programs').get() as { count: number }).count;
      if (existingPrograms === 0) {
        const { v4: uuidv4 } = require('uuid');
        
        // Program 1: Easy Warm-Up (5 min)
        db.prepare(`
          INSERT INTO workout_programs (id, owner_id, name, type, sets, steps, level, is_public)
          VALUES (?, ?, ?, 'CUSTOM', 1, ?, 'BEGINNER', 1)
        `).run(uuidv4(), adminUser.id, 'Easy Warm-Up', JSON.stringify([
          { order: 1, minutes: 2, seconds: 0, speed: 20 },
          { order: 2, minutes: 2, seconds: 0, speed: 35 },
          { order: 3, minutes: 1, seconds: 0, speed: 15 },
        ]));

        // Program 2: Endurance Builder (15 min)
        db.prepare(`
          INSERT INTO workout_programs (id, owner_id, name, type, sets, steps, level, is_public)
          VALUES (?, ?, ?, 'CUSTOM', 1, ?, 'INTERMEDIATE', 1)
        `).run(uuidv4(), adminUser.id, 'Endurance Builder', JSON.stringify([
          { order: 1, minutes: 2, seconds: 0, speed: 25 },
          { order: 2, minutes: 5, seconds: 0, speed: 45 },
          { order: 3, minutes: 3, seconds: 0, speed: 55 },
          { order: 4, minutes: 3, seconds: 0, speed: 40 },
          { order: 5, minutes: 2, seconds: 0, speed: 20 },
        ]));

        // Program 3: Power Intervals (12 min)
        db.prepare(`
          INSERT INTO workout_programs (id, owner_id, name, type, sets, steps, level, is_public)
          VALUES (?, ?, ?, 'CUSTOM', 2, ?, 'ADVANCED', 1)
        `).run(uuidv4(), adminUser.id, 'Power Intervals', JSON.stringify([
          { order: 1, minutes: 1, seconds: 0, speed: 30 },
          { order: 2, minutes: 1, seconds: 30, speed: 70 },
          { order: 3, minutes: 1, seconds: 0, speed: 40 },
          { order: 4, minutes: 1, seconds: 30, speed: 80 },
          { order: 5, minutes: 1, seconds: 0, speed: 25 },
        ]));

        log.info('Seeded 3 sample workout programs');
      }
    }
  } catch (err: any) {
    log.warn(`Sample program seeding: ${err.message}`);
  }
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
