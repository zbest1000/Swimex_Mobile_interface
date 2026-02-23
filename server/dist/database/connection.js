"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = getDb;
exports.initDatabase = initDatabase;
exports.closeDatabase = closeDatabase;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
const log = (0, logger_1.createLogger)('database');
let db = null;
function getDb() {
    if (!db) {
        throw new Error('Database not initialized. Call initDatabase() first.');
    }
    return db;
}
function initDatabase() {
    if (db)
        return db;
    fs_1.default.mkdirSync(config_1.config.dataDir, { recursive: true });
    const dbPath = path_1.default.join(config_1.config.dataDir, 'edge.db');
    log.info(`Opening database at ${dbPath}`);
    db = new better_sqlite3_1.default(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    return db;
}
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        log.info('Database closed');
    }
}
//# sourceMappingURL=connection.js.map