import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../utils/config';
import { createLogger } from '../utils/logger';

const log = createLogger('database');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function initDatabase(dataDir?: string): Database.Database {
  if (db) return db;

  const dir = dataDir ?? process.env.DATA_DIR ?? config.dataDir;
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const dbPath = path.join(dir, 'edge.db');
  log.info(`Opening database at ${dbPath}`);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  return db;
}

export function closeDatabase(): void {
  if (db) {
    try {
      db.close();
    } catch {
      // already closed
    }
    db = null;
    log.info('Database closed');
  }
}
