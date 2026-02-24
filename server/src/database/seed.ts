import { getDb } from './connection';
import { createLogger } from '../utils/logger';
import { config } from '../utils/config';
import * as authService from '../auth/auth-service';
import { UserRole, CommissioningOrg } from '../shared/models';

const log = createLogger('seed');

/**
 * Auto-seed the database with default data for quick deployment.
 * Only runs if the database is empty (no users exist).
 * Skips if already commissioned.
 */
export async function seedDefaults(): Promise<void> {
  const db = getDb();

  const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
  if (userCount > 0) {
    log.info('Database already has users — skipping seed');
    return;
  }

  log.info('Seeding default data for quick deployment...');

  // Set default commissioning codes
  const defaultSwimexCode = process.env.SWIMEX_CODE ?? 'SW1MEX-D3FALT-QU1CKD-3PL0Y1';
  const defaultBscCode = process.env.BSC_CODE ?? 'BSC1ND-D3FALT-QU1CKD-3PL0Y2';

  try {
    await authService.setCommissioningCode(CommissioningOrg.SWIMEX, defaultSwimexCode);
    await authService.setCommissioningCode(CommissioningOrg.BSC_INDUSTRIES, defaultBscCode);
    log.info('Commissioning codes set');
  } catch (err: any) {
    log.warn(`Commissioning code setup: ${err.message}`);
  }

  // Create Super Admin
  try {
    await authService.createUser('superadmin', 'superadmin', 'Super Administrator', UserRole.SUPER_ADMINISTRATOR);
    log.info('Created Super Administrator: superadmin / superadmin');
  } catch (err: any) {
    log.warn(`Super admin creation: ${err.message}`);
  }

  // Create Admin
  const adminUser = config.defaultAdminUser;
  const adminPass = config.defaultAdminPass;
  try {
    await authService.createUser(adminUser, adminPass, 'Administrator', UserRole.ADMINISTRATOR);
    log.info(`Created Administrator: ${adminUser} / ${adminPass}`);
  } catch (err: any) {
    log.warn(`Admin creation: ${err.message}`);
  }

  // Create demo user
  try {
    await authService.createUser('swimmer', 'swimmer', 'Demo Swimmer', UserRole.USER);
    log.info('Created demo user: swimmer / swimmer');
  } catch (err: any) {
    log.warn(`Demo user creation: ${err.message}`);
  }

  // Seed sample workout programs
  try {
    const adminRow = db.prepare("SELECT id FROM users WHERE role = 'ADMINISTRATOR' LIMIT 1").get() as { id: string } | undefined;
    if (adminRow) {
      const programs = [
        {
          name: 'Morning Warm-Up',
          type: 'CUSTOM',
          sets: 1,
          steps: [
            { order: 1, minutes: 3, seconds: 0, speed: 20 },
            { order: 2, minutes: 5, seconds: 0, speed: 35 },
            { order: 3, minutes: 5, seconds: 0, speed: 45 },
            { order: 4, minutes: 2, seconds: 0, speed: 25 },
          ],
          isPublic: true,
        },
        {
          name: 'Endurance Builder',
          type: 'CUSTOM',
          sets: 2,
          steps: [
            { order: 1, minutes: 5, seconds: 0, speed: 30 },
            { order: 2, minutes: 10, seconds: 0, speed: 50 },
            { order: 3, minutes: 5, seconds: 0, speed: 60 },
            { order: 4, minutes: 5, seconds: 0, speed: 40 },
            { order: 5, minutes: 3, seconds: 0, speed: 25 },
          ],
          isPublic: true,
        },
        {
          name: 'Recovery Session',
          type: 'CUSTOM',
          sets: 1,
          steps: [
            { order: 1, minutes: 10, seconds: 0, speed: 15 },
            { order: 2, minutes: 10, seconds: 0, speed: 20 },
            { order: 3, minutes: 5, seconds: 0, speed: 10 },
          ],
          isPublic: true,
        },
      ];

      const { v4: uuidv4 } = require('uuid');
      for (const prog of programs) {
        db.prepare(`
          INSERT INTO workout_programs (id, owner_id, name, type, sets, steps, is_public)
          VALUES (?, ?, ?, ?, ?, ?, 1)
        `).run(uuidv4(), adminRow.id, prog.name, prog.type, prog.sets, JSON.stringify(prog.steps));
      }
      log.info(`Seeded ${programs.length} sample workout programs`);
    }
  } catch (err: any) {
    log.warn(`Sample programs: ${err.message}`);
  }

  // Seed default UI layout
  try {
    const { v4: uuidv4 } = require('uuid');
    db.prepare(`
      INSERT INTO ui_layouts (id, name, template_id, is_active, widgets, version)
      VALUES (?, 'Default Layout', 'modern', 1, '[]', 1)
    `).run(uuidv4());
    log.info('Created default UI layout (Modern template)');
  } catch (err: any) {
    log.warn(`Default layout: ${err.message}`);
  }

  log.info('========================================');
  log.info(' Quick Deploy — Default Accounts');
  log.info('========================================');
  log.info(` Super Admin: superadmin / superadmin`);
  log.info(` Admin:       ${adminUser} / ${adminPass}`);
  log.info(` Demo User:   swimmer / swimmer`);
  log.info('========================================');
  log.info(' CHANGE THESE PASSWORDS after first login!');
  log.info('========================================');
}
