"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateToken = generateToken;
exports.verifyToken = verifyToken;
exports.createUser = createUser;
exports.login = login;
exports.getUserById = getUserById;
exports.listUsers = listUsers;
exports.updateUserRole = updateUserRole;
exports.updatePassword = updatePassword;
exports.disableUser = disableUser;
exports.enableUser = enableUser;
exports.deleteUser = deleteUser;
exports.setCommissioningCode = setCommissioningCode;
exports.resetSuperAdmin = resetSuperAdmin;
exports.isCommissioned = isCommissioned;
exports.getUserPreferences = getUserPreferences;
exports.updateUserPreferences = updateUserPreferences;
const argon2_1 = __importDefault(require("argon2"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const connection_1 = require("../database/connection");
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const models_1 = require("../shared/models");
const audit_1 = require("./audit");
const log = (0, logger_1.createLogger)('auth');
function toUserDTO(row) {
    return {
        id: row.id,
        username: row.username,
        displayName: row.display_name,
        email: row.email,
        role: row.role,
        isActive: Boolean(row.is_active),
        createdAt: row.created_at,
        lastLoginAt: row.last_login_at,
    };
}
async function hashPassword(password) {
    return argon2_1.default.hash(password, { type: argon2_1.default.argon2id });
}
async function verifyPassword(hash, password) {
    return argon2_1.default.verify(hash, password);
}
function generateToken(payload) {
    return jsonwebtoken_1.default.sign({ userId: payload.userId, username: payload.username, role: payload.role }, config_1.config.jwtSecret, { expiresIn: config_1.config.jwtExpiresIn });
}
function verifyToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
    }
    catch {
        throw new errors_1.AuthError('Invalid or expired token');
    }
}
async function createUser(username, password, displayName, role = models_1.UserRole.USER, email, createdBy) {
    const db = (0, connection_1.getDb)();
    if (!username || username.length < 3)
        throw new errors_1.ValidationError('Username must be at least 3 characters');
    if (!password || password.length < 6)
        throw new errors_1.ValidationError('Password must be at least 6 characters');
    if (!displayName)
        throw new errors_1.ValidationError('Display name is required');
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing)
        throw new errors_1.ValidationError('Username already taken');
    const id = (0, uuid_1.v4)();
    const passwordHash = await hashPassword(password);
    db.prepare(`
    INSERT INTO users (id, username, password_hash, display_name, email, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, username, passwordHash, displayName, email ?? null, role);
    db.prepare(`
    INSERT INTO user_preferences (user_id, theme, default_speed, fitness_level, active_template)
    VALUES (?, 'LIGHT', 50, 'BEGINNER', 'modern')
  `).run(id);
    (0, audit_1.auditLog)('USER_CREATED', createdBy ?? null, 'user', id, { username, role });
    log.info(`User created: ${username} (${role})`);
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return toUserDTO(row);
}
async function login(username, password, sourceIp) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username);
    if (!row) {
        (0, audit_1.auditLog)('LOGIN_FAILED', null, 'auth', null, { username, reason: 'user not found', sourceIp });
        throw new errors_1.AuthError('Invalid credentials');
    }
    const valid = await verifyPassword(row.password_hash, password);
    if (!valid) {
        (0, audit_1.auditLog)('LOGIN_FAILED', row.id, 'auth', null, { username, reason: 'wrong password', sourceIp });
        throw new errors_1.AuthError('Invalid credentials');
    }
    db.prepare('UPDATE users SET last_login_at = datetime("now") WHERE id = ?').run(row.id);
    const user = toUserDTO(row);
    const token = generateToken({ userId: user.id, username: user.username, role: user.role });
    const sessionId = (0, uuid_1.v4)();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, user.id, expiresAt);
    (0, audit_1.auditLog)('LOGIN_SUCCESS', user.id, 'auth', user.id, { sourceIp });
    log.info(`User logged in: ${username}`);
    return { user, token };
}
function getUserById(id) {
    const db = (0, connection_1.getDb)();
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return row ? toUserDTO(row) : null;
}
function listUsers(role) {
    const db = (0, connection_1.getDb)();
    let rows;
    if (role) {
        rows = db.prepare('SELECT * FROM users WHERE role = ? ORDER BY created_at DESC').all(role);
    }
    else {
        rows = db.prepare('SELECT * FROM users WHERE role != ? ORDER BY created_at DESC').all(models_1.UserRole.SUPER_ADMINISTRATOR);
    }
    return rows.map(toUserDTO);
}
async function updateUserRole(userId, newRole, actorId) {
    const db = (0, connection_1.getDb)();
    const actor = db.prepare('SELECT role FROM users WHERE id = ?').get(actorId);
    if (!actor)
        throw new errors_1.AuthError('Actor not found');
    if (newRole === models_1.UserRole.SUPER_ADMINISTRATOR && actor.role !== models_1.UserRole.SUPER_ADMINISTRATOR) {
        throw new errors_1.ForbiddenError('Only Super Administrators can escalate to Super Administrator');
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, userId);
    (0, audit_1.auditLog)('ROLE_CHANGED', actorId, 'user', userId, { newRole });
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    return toUserDTO(row);
}
async function updatePassword(userId, newPassword, actorId) {
    if (!newPassword || newPassword.length < 6)
        throw new errors_1.ValidationError('Password must be at least 6 characters');
    const db = (0, connection_1.getDb)();
    const hash = await hashPassword(newPassword);
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
    (0, audit_1.auditLog)('PASSWORD_CHANGED', actorId ?? userId, 'user', userId, {});
}
function disableUser(userId, actorId) {
    const db = (0, connection_1.getDb)();
    db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);
    (0, audit_1.auditLog)('USER_DISABLED', actorId, 'user', userId, {});
}
function enableUser(userId, actorId) {
    const db = (0, connection_1.getDb)();
    db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(userId);
    (0, audit_1.auditLog)('USER_ENABLED', actorId, 'user', userId, {});
}
function deleteUser(userId, actorId) {
    const db = (0, connection_1.getDb)();
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    (0, audit_1.auditLog)('USER_DELETED', actorId, 'user', userId, {});
}
// --- Commissioning code management ---
const LOCKOUT_DURATIONS_MS = [30_000, 60_000, 300_000, 900_000, 3_600_000];
async function setCommissioningCode(org, code) {
    const db = (0, connection_1.getDb)();
    const normalized = code.replace(/-/g, '').toUpperCase();
    if (!/^[A-Z0-9]{24}$/.test(normalized)) {
        throw new errors_1.ValidationError('Commissioning code must be 4 segments of 6 alphanumeric characters (XXXXXX-XXXXXX-XXXXXX-XXXXXX)');
    }
    const hash = await argon2_1.default.hash(normalized, { type: argon2_1.default.argon2id });
    const id = (0, uuid_1.v4)();
    const existing = db.prepare('SELECT id FROM commissioning_codes WHERE organization = ?').get(org);
    if (existing) {
        db.prepare('UPDATE commissioning_codes SET code_hash = ?, commissioned_at = datetime("now") WHERE organization = ?')
            .run(hash, org);
    }
    else {
        db.prepare('INSERT INTO commissioning_codes (id, organization, code_hash) VALUES (?, ?, ?)')
            .run(id, org, hash);
    }
    (0, audit_1.auditLog)('COMMISSIONING_CODE_SET', null, 'commissioning', org, { organization: org });
    log.info(`Commissioning code set for ${org}`);
}
async function resetSuperAdmin(org, code, newUsername, newPassword, sourceIp) {
    const db = (0, connection_1.getDb)();
    const codeRow = db.prepare('SELECT * FROM commissioning_codes WHERE organization = ?').get(org);
    if (!codeRow)
        throw new errors_1.NotFoundError('No commissioning code configured for this organization');
    // Check lockout
    if (codeRow.lockout_until) {
        const lockoutUntil = new Date(codeRow.lockout_until).getTime();
        if (Date.now() < lockoutUntil) {
            const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
            throw new errors_1.RateLimitError(`Account locked. Try again in ${remaining} seconds.`);
        }
    }
    const normalized = code.replace(/-/g, '').toUpperCase();
    const valid = await argon2_1.default.verify(codeRow.code_hash, normalized);
    if (!valid) {
        const attempts = codeRow.failed_reset_attempts + 1;
        const lockoutIdx = Math.min(attempts - 1, LOCKOUT_DURATIONS_MS.length - 1);
        const lockoutMs = LOCKOUT_DURATIONS_MS[lockoutIdx];
        const lockoutUntil = new Date(Date.now() + lockoutMs).toISOString();
        db.prepare(`
      UPDATE commissioning_codes 
      SET failed_reset_attempts = ?, last_failed_attempt_at = datetime('now'), lockout_until = ?
      WHERE organization = ?
    `).run(attempts, lockoutUntil, org);
        (0, audit_1.auditLog)('SUPER_ADMIN_RESET_FAILED', null, 'commissioning', org, { organization: org, sourceIp, attempts });
        throw new errors_1.AuthError('Invalid commissioning code');
    }
    // Code valid — reset Super Admin
    db.prepare(`
    UPDATE commissioning_codes 
    SET failed_reset_attempts = 0, lockout_until = NULL, last_successful_reset_at = datetime('now'), last_reset_by = ?
    WHERE organization = ?
  `).run(sourceIp ?? 'unknown', org);
    // Delete existing Super Admin accounts
    db.prepare("DELETE FROM users WHERE role = 'SUPER_ADMINISTRATOR'").run();
    // Create new Super Admin
    const user = await createUser(newUsername, newPassword, newUsername, models_1.UserRole.SUPER_ADMINISTRATOR);
    (0, audit_1.auditLog)('SUPER_ADMIN_RESET_SUCCESS', user.id, 'commissioning', org, { organization: org, sourceIp });
    log.info(`Super Admin account reset via ${org} commissioning code`);
    return user;
}
function isCommissioned() {
    const db = (0, connection_1.getDb)();
    const count = db.prepare('SELECT COUNT(*) as count FROM commissioning_codes').get();
    return count.count >= 2;
}
function getUserPreferences(userId) {
    const db = (0, connection_1.getDb)();
    return db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId);
}
function updateUserPreferences(userId, prefs) {
    const db = (0, connection_1.getDb)();
    const fields = [];
    const values = [];
    if (prefs.theme !== undefined) {
        fields.push('theme = ?');
        values.push(prefs.theme);
    }
    if (prefs.defaultSpeed !== undefined) {
        fields.push('default_speed = ?');
        values.push(prefs.defaultSpeed);
    }
    if (prefs.fitnessLevel !== undefined) {
        fields.push('fitness_level = ?');
        values.push(prefs.fitnessLevel);
    }
    if (prefs.activeTemplate !== undefined) {
        fields.push('active_template = ?');
        values.push(prefs.activeTemplate);
    }
    if (fields.length > 0) {
        values.push(userId);
        db.prepare(`UPDATE user_preferences SET ${fields.join(', ')} WHERE user_id = ?`).run(...values);
    }
}
//# sourceMappingURL=auth-service.js.map