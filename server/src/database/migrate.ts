import { initDatabase, getDb, closeDatabase } from './connection';
import { createLogger } from '../utils/logger';

const log = createLogger('migration');

const SCHEMA_SQL = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'USER' CHECK (role IN ('SUPER_ADMINISTRATOR','ADMINISTRATOR','MAINTENANCE','USER')),
  profile_photo BLOB,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login_at TEXT
);

-- User preferences
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'LIGHT' CHECK (theme IN ('LIGHT','DARK')),
  default_speed INTEGER NOT NULL DEFAULT 50 CHECK (default_speed BETWEEN 0 AND 100),
  fitness_level TEXT NOT NULL DEFAULT 'BEGINNER' CHECK (fitness_level IN ('BEGINNER','INTERMEDIATE','ADVANCED')),
  active_template TEXT NOT NULL DEFAULT 'modern'
);

-- Commissioning codes (hashed)
CREATE TABLE IF NOT EXISTS commissioning_codes (
  id TEXT PRIMARY KEY,
  organization TEXT NOT NULL UNIQUE CHECK (organization IN ('SWIMEX','BSC_INDUSTRIES')),
  code_hash TEXT NOT NULL,
  failed_reset_attempts INTEGER NOT NULL DEFAULT 0,
  last_failed_attempt_at TEXT,
  lockout_until TEXT,
  last_successful_reset_at TEXT,
  last_reset_by TEXT,
  commissioned_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Registered devices (MAC address registry)
CREATE TABLE IF NOT EXISTS registered_devices (
  id TEXT PRIMARY KEY,
  mac_address TEXT UNIQUE NOT NULL,
  device_name TEXT NOT NULL DEFAULT '',
  device_type TEXT NOT NULL DEFAULT 'TABLET' CHECK (device_type IN ('TABLET','BROWSER','OTHER')),
  is_registered INTEGER NOT NULL DEFAULT 1,
  registered_by TEXT REFERENCES users(id),
  registered_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Workout programs
CREATE TABLE IF NOT EXISTS workout_programs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('CUSTOM','INTERVAL','DISTANCE_PRESET','SPRINT_PRESET')),
  sets INTEGER NOT NULL DEFAULT 1 CHECK (sets >= 1),
  steps TEXT NOT NULL DEFAULT '[]',
  level TEXT CHECK (level IN ('BEGINNER','INTERMEDIATE','ADVANCED')),
  is_public INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  program_id TEXT REFERENCES workout_programs(id) ON DELETE SET NULL,
  device_mac TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  terminated_by TEXT CHECK (terminated_by IN ('TABLET_END','TABLET_PAUSE','AIR_BUTTON_STOP','TIMER_COMPLETE','SAFETY_STOP')),
  steps_completed INTEGER NOT NULL DEFAULT 0,
  total_duration INTEGER NOT NULL DEFAULT 0,
  speed_log TEXT NOT NULL DEFAULT '[]'
);

-- Communication configurations
CREATE TABLE IF NOT EXISTS communication_configs (
  id TEXT PRIMARY KEY,
  protocol TEXT NOT NULL CHECK (protocol IN ('MQTT','MODBUS_TCP','HTTP')),
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  config TEXT NOT NULL DEFAULT '{}',
  created_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Object-tag mappings
CREATE TABLE IF NOT EXISTS object_tag_mappings (
  id TEXT PRIMARY KEY,
  object_id TEXT NOT NULL,
  object_name TEXT NOT NULL,
  tag_address TEXT NOT NULL,
  protocol TEXT NOT NULL CHECK (protocol IN ('MQTT','MODBUS_TCP','HTTP')),
  data_type TEXT NOT NULL DEFAULT 'INT16' CHECK (data_type IN ('INT16','UINT16','INT32','UINT32','FLOAT32','FLOAT64','BOOLEAN','STRING')),
  access_mode TEXT NOT NULL DEFAULT 'READ_WRITE' CHECK (access_mode IN ('READ','WRITE','READ_WRITE')),
  scale_factor REAL NOT NULL DEFAULT 1.0,
  "offset" REAL NOT NULL DEFAULT 0.0,
  created_by TEXT REFERENCES users(id),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Feature flags
CREATE TABLE IF NOT EXISTS feature_flags (
  id TEXT PRIMARY KEY,
  feature_key TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_enabled INTEGER NOT NULL DEFAULT 0,
  is_visible INTEGER NOT NULL DEFAULT 0,
  enabled_by TEXT REFERENCES users(id),
  enabled_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Graphic assets
CREATE TABLE IF NOT EXISTS graphic_assets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  tags TEXT NOT NULL DEFAULT '[]',
  format TEXT NOT NULL CHECK (format IN ('SVG','PNG','JPEG','WEBP','GIF','DXF')),
  source_file BLOB NOT NULL,
  svg_content TEXT,
  thumbnail BLOB,
  elements TEXT NOT NULL DEFAULT '[]',
  is_built_in INTEGER NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- UI layouts
CREATE TABLE IF NOT EXISTS ui_layouts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  template_id TEXT NOT NULL DEFAULT 'modern',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES users(id),
  widgets TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_username TEXT,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  source_ip TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Session tokens
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  is_revoked INTEGER NOT NULL DEFAULT 0
);

-- System configuration (key-value store for commissioning state, etc.)
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_workout_programs_owner ON workout_programs(owner_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started ON workout_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_registered_devices_mac ON registered_devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_object_tag_mappings_object ON object_tag_mappings(object_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`;

export function runMigrations(): void {
  const db = getDb();
  log.info('Running database migrations...');

  db.exec(SCHEMA_SQL);

  // Seed default feature flags
  const existingFlags = db.prepare('SELECT COUNT(*) as count FROM feature_flags').get() as { count: number };
  if (existingFlags.count === 0) {
    const flagInsert = db.prepare(`
      INSERT INTO feature_flags (id, feature_key, display_name, description, is_enabled, is_visible)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    flagInsert.run(
      'ff-bluetooth',
      'BLUETOOTH_ENABLED',
      'Bluetooth Client-Server Transport',
      'Fully implemented Bluetooth transport between client and server. Disabled and hidden by default — only Super Administrator can enable.',
      0, 0,
    );
    flagInsert.run(
      'ff-treadmill',
      'TREADMILL_ENABLED',
      'Treadmill / Distance & Sprint Workouts',
      'Enables Distance and Sprint preset workout modes. Only available on pools equipped with treadmill hardware.',
      0, 1,
    );
    log.info('Seeded default feature flags');
  }

  // Ensure TREADMILL_ENABLED flag exists (for existing databases)
  const treadmillFlag = db.prepare("SELECT id FROM feature_flags WHERE feature_key = 'TREADMILL_ENABLED'").get();
  if (!treadmillFlag) {
    db.prepare(`
      INSERT INTO feature_flags (id, feature_key, display_name, description, is_enabled, is_visible)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      'ff-treadmill',
      'TREADMILL_ENABLED',
      'Treadmill / Distance & Sprint Workouts',
      'Enables Distance and Sprint preset workout modes. Only available on pools equipped with treadmill hardware.',
      0, 1,
    );
    log.info('Added TREADMILL_ENABLED feature flag');
  }

  log.info('Migrations complete');
}

if (require.main === module) {
  initDatabase();
  runMigrations();
  closeDatabase();
  log.info('Migration script finished');
}
