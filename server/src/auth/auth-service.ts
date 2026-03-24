import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database/connection';
import { config } from '../utils/config';
import { createLogger } from '../utils/logger';
import { AuthError, ForbiddenError, ValidationError, RateLimitError, NotFoundError } from '../utils/errors';
import { UserRole, CommissioningOrg } from '../shared/models';
import { auditLog } from './audit';

const log = createLogger('auth');

const USER_SAFE_COLUMNS = 'id, username, display_name, email, role, is_active, created_at, last_login_at';

export interface TokenPayload {
  userId: string;
  username: string;
  role: UserRole;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface UserDTO {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

function toUserDTO(row: Record<string, unknown>): UserDTO {
  return {
    id: row.id as string,
    username: row.username as string,
    displayName: row.display_name as string,
    email: row.email as string | null,
    role: row.role as UserRole,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at as string,
    lastLoginAt: row.last_login_at as string | null,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(
    { userId: payload.userId, username: payload.username, role: payload.role, sessionId: payload.sessionId },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: config.jwtExpiresIn as any },
  );
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as TokenPayload;
  } catch {
    throw new AuthError('Invalid or expired token');
  }
}

export async function createUser(
  username: string,
  password: string,
  displayName: string,
  role: UserRole = UserRole.USER,
  email?: string,
  createdBy?: string,
): Promise<UserDTO> {
  const db = getDb();

  if (!username || username.length < 3) throw new ValidationError('Username must be at least 3 characters');
  if (!password || password.length < 8) throw new ValidationError('Password must be at least 8 characters');
  if (!displayName) throw new ValidationError('Display name is required');

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) throw new ValidationError('Username already taken');

  const id = uuidv4();
  const passwordHash = await hashPassword(password);

  db.prepare(`
    INSERT INTO users (id, username, password_hash, display_name, email, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, username, passwordHash, displayName, email ?? null, role);

  db.prepare(`
    INSERT INTO user_preferences (user_id, theme, default_speed, fitness_level, active_template)
    VALUES (?, 'LIGHT', 50, 'BEGINNER', 'modern')
  `).run(id);

  auditLog('USER_CREATED', createdBy ?? null, 'user', id, { username, role });
  log.info(`User created: ${username} (${role})`);

  const row = db.prepare(`SELECT ${USER_SAFE_COLUMNS} FROM users WHERE id = ?`).get(id) as Record<string, unknown>;
  return toUserDTO(row);
}

export async function login(username: string, password: string, sourceIp?: string): Promise<{ user: UserDTO; token: string }> {
  const db = getDb();
  const row = db.prepare('SELECT id, username, display_name, email, role, is_active, created_at, last_login_at, password_hash FROM users WHERE username = ? AND is_active = 1').get(username) as Record<string, unknown> | undefined;

  if (!row) {
    log.security(`Login failed: unknown user "${username}"`, { sourceIp });
    auditLog('LOGIN_FAILED', null, 'auth', null, { username, reason: 'user not found', sourceIp });
    throw new AuthError('Invalid credentials');
  }

  const valid = await verifyPassword(row.password_hash as string, password);
  if (!valid) {
    log.security(`Login failed: wrong password for "${username}"`, { sourceIp });
    auditLog('LOGIN_FAILED', row.id as string, 'auth', null, { username, reason: 'wrong password', sourceIp });
    throw new AuthError('Invalid credentials');
  }

  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(row.id);

  const user = toUserDTO(row);
  const sessionId = uuidv4();
  const token = generateToken({ userId: user.id, username: user.username, role: user.role, sessionId });

  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, user.id, expiresAt);

  auditLog('LOGIN_SUCCESS', user.id, 'auth', user.id, { sourceIp });
  log.security(`Login success: "${username}" (${user.role})`, { sourceIp });

  return { user, token };
}

export function getUserById(id: string): UserDTO | null {
  const db = getDb();
  const row = db.prepare(`SELECT ${USER_SAFE_COLUMNS} FROM users WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
  return row ? toUserDTO(row) : null;
}

export function listUsers(role?: UserRole): UserDTO[] {
  const db = getDb();
  let rows: Record<string, unknown>[];
  if (role) {
    rows = db.prepare(`SELECT ${USER_SAFE_COLUMNS} FROM users WHERE role = ? ORDER BY created_at DESC`).all(role) as Record<string, unknown>[];
  } else {
    rows = db.prepare(`SELECT ${USER_SAFE_COLUMNS} FROM users WHERE role != ? ORDER BY created_at DESC`).all(UserRole.SUPER_ADMINISTRATOR) as Record<string, unknown>[];
  }
  return rows.map(toUserDTO);
}

export async function updateUserRole(userId: string, newRole: UserRole, actorId: string): Promise<UserDTO> {
  const db = getDb();
  const actor = db.prepare('SELECT role FROM users WHERE id = ?').get(actorId) as { role: string } | undefined;
  if (!actor) throw new AuthError('Actor not found');

  if (newRole === UserRole.SUPER_ADMINISTRATOR && actor.role !== UserRole.SUPER_ADMINISTRATOR) {
    throw new ForbiddenError('Only Super Administrators can escalate to Super Administrator');
  }

  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(newRole, userId);
  auditLog('ROLE_CHANGED', actorId, 'user', userId, { newRole });

  const row = db.prepare(`SELECT ${USER_SAFE_COLUMNS} FROM users WHERE id = ?`).get(userId) as Record<string, unknown>;
  return toUserDTO(row);
}

export async function updatePassword(userId: string, newPassword: string, actorId?: string, currentPassword?: string): Promise<void> {
  if (!newPassword || newPassword.length < 8) throw new ValidationError('Password must be at least 8 characters');
  const db = getDb();

  if (currentPassword !== undefined) {
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as { password_hash: string } | undefined;
    if (!row) throw new AuthError('User not found');
    const valid = await verifyPassword(row.password_hash, currentPassword);
    if (!valid) throw new AuthError('Current password is incorrect');
  }

  const hash = await hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, userId);
  db.prepare("UPDATE sessions SET is_revoked = 1 WHERE user_id = ?").run(userId);
  log.security(`Password changed for user ${userId}`, { actorId: actorId ?? userId });
  auditLog('PASSWORD_CHANGED', actorId ?? userId, 'user', userId, {});
}

export function disableUser(userId: string, actorId: string): void {
  const db = getDb();
  db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(userId);
  db.prepare("UPDATE sessions SET is_revoked = 1 WHERE user_id = ?").run(userId);
  log.security(`User disabled: ${userId}`, { actorId });
  auditLog('USER_DISABLED', actorId, 'user', userId, {});
}

export function enableUser(userId: string, actorId: string): void {
  const db = getDb();
  db.prepare('UPDATE users SET is_active = 1 WHERE id = ?').run(userId);
  auditLog('USER_ENABLED', actorId, 'user', userId, {});
}

export function deleteUser(userId: string, actorId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  log.security(`User deleted: ${userId}`, { actorId });
  auditLog('USER_DELETED', actorId, 'user', userId, {});
}

// --- Commissioning code management ---

const LOCKOUT_DURATIONS_MS = [30_000, 60_000, 300_000, 900_000, 3_600_000];

export async function setCommissioningCode(org: CommissioningOrg, code: string): Promise<void> {
  const db = getDb();
  const normalized = code.replace(/-/g, '').toUpperCase();
  if (!/^[A-Z0-9]{24}$/.test(normalized)) {
    throw new ValidationError('Commissioning code must be 4 segments of 6 alphanumeric characters (XXXXXX-XXXXXX-XXXXXX-XXXXXX)');
  }

  const hash = await argon2.hash(normalized, { type: argon2.argon2id });
  const id = uuidv4();

  const existing = db.prepare('SELECT id FROM commissioning_codes WHERE organization = ?').get(org);
  if (existing) {
    db.prepare("UPDATE commissioning_codes SET code_hash = ?, commissioned_at = datetime('now') WHERE organization = ?")
      .run(hash, org);
  } else {
    db.prepare('INSERT INTO commissioning_codes (id, organization, code_hash) VALUES (?, ?, ?)')
      .run(id, org, hash);
  }

  auditLog('COMMISSIONING_CODE_SET', null, 'commissioning', org, { organization: org });
  log.security(`Commissioning code set for ${org}`);
}

export async function resetSuperAdmin(
  org: CommissioningOrg,
  code: string,
  newUsername: string,
  newPassword: string,
  sourceIp?: string,
): Promise<UserDTO> {
  const db = getDb();

  const codeRow = db.prepare('SELECT * FROM commissioning_codes WHERE organization = ?').get(org) as Record<string, unknown> | undefined;
  if (!codeRow) throw new NotFoundError('No commissioning code configured for this organization');

  // Check lockout
  if (codeRow.lockout_until) {
    const lockoutUntil = new Date(codeRow.lockout_until as string).getTime();
    if (Date.now() < lockoutUntil) {
      const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
      throw new RateLimitError(`Account locked. Try again in ${remaining} seconds.`);
    }
  }

  const normalized = code.replace(/-/g, '').toUpperCase();
  const valid = await argon2.verify(codeRow.code_hash as string, normalized);

  if (!valid) {
    const attempts = (codeRow.failed_reset_attempts as number) + 1;
    const lockoutIdx = Math.min(attempts - 1, LOCKOUT_DURATIONS_MS.length - 1);
    const lockoutMs = LOCKOUT_DURATIONS_MS[lockoutIdx];
    const lockoutUntil = new Date(Date.now() + lockoutMs).toISOString();

    db.prepare(`
      UPDATE commissioning_codes 
      SET failed_reset_attempts = ?, last_failed_attempt_at = datetime('now'), lockout_until = ?
      WHERE organization = ?
    `).run(attempts, lockoutUntil, org);

    log.security(`Super admin reset FAILED: invalid code for ${org} (attempt ${attempts})`, { sourceIp });
    auditLog('SUPER_ADMIN_RESET_FAILED', null, 'commissioning', org, { organization: org, sourceIp, attempts });
    throw new AuthError('Invalid commissioning code');
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
  const user = await createUser(newUsername, newPassword, newUsername, UserRole.SUPER_ADMINISTRATOR);
  auditLog('SUPER_ADMIN_RESET_SUCCESS', user.id, 'commissioning', org, { organization: org, sourceIp });
  log.security(`Super admin reset SUCCESS via ${org} commissioning code`, { sourceIp });

  return user;
}

export function isCommissioned(): boolean {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as count FROM commissioning_codes').get() as { count: number };
  return count.count >= 2;
}

export function getUserPreferences(userId: string): Record<string, unknown> | null {
  const db = getDb();
  return db.prepare('SELECT * FROM user_preferences WHERE user_id = ?').get(userId) as Record<string, unknown> | null;
}

export function updateUserPreferences(userId: string, prefs: Partial<{ theme: string; defaultSpeed: number; fitnessLevel: string; activeTemplate: string; language: string }>): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (prefs.theme !== undefined) { fields.push('theme = ?'); values.push(prefs.theme); }
  if (prefs.defaultSpeed !== undefined) { fields.push('default_speed = ?'); values.push(prefs.defaultSpeed); }
  if (prefs.fitnessLevel !== undefined) { fields.push('fitness_level = ?'); values.push(prefs.fitnessLevel); }
  if (prefs.activeTemplate !== undefined) { fields.push('active_template = ?'); values.push(prefs.activeTemplate); }
  if (prefs.language !== undefined) { fields.push('language = ?'); values.push(prefs.language); }

  if (fields.length > 0) {
    values.push(userId);
    db.prepare(`UPDATE user_preferences SET ${fields.join(', ')} WHERE user_id = ?`).run(...values);
  }
}
