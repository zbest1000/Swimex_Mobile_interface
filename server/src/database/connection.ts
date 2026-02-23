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

export function initDatabase(): Database.Database {
  if (db) return db;

  fs.mkdirSync(config.dataDir, { recursive: true });
  const dbPath = path.join(config.dataDir, 'edge.db');
  log.info(`Opening database at ${dbPath}`);

  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    log.info('Database closed');
  }
}
