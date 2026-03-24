# Security Audit Report — Authentication & Session Management

**Date:** 2026-03-24  
**Scope:** `server/src/auth/`, `server/src/http/`, `server/src/utils/config.ts`, `server/src/utils/errors.ts`, `server/src/database/migrate.ts`

---

## Files Reviewed

| # | File | Lines |
|---|------|-------|
| 1 | `server/src/auth/auth-service.ts` | 316 |
| 2 | `server/src/auth/middleware.ts` | 115 |
| 3 | `server/src/auth/audit.ts` | 59 |
| 4 | `server/src/http/server.ts` | 159 |
| 5 | `server/src/http/routes/auth-routes.ts` | 403 |
| 6 | `server/src/http/routes/admin-routes.ts` | 377 |
| 7 | `server/src/http/routes/user-routes.ts` | 117 |
| 8 | `server/src/http/routes/workout-routes.ts` | 324 |
| 9 | `server/src/http/routes/graphics-routes.ts` | 110 |
| 10 | `server/src/utils/config.ts` | 63 |
| 11 | `server/src/utils/errors.ts` | 54 |

---

## 1. Password Hashing

### What's good
- Argon2id is used for all password hashing (`auth-service.ts:47`). This is the current best-practice algorithm.
- Salt is handled automatically by the `argon2` library (random salt per hash).
- `argon2.verify()` is used for comparison (`auth-service.ts:51`), which is internally constant-time against the hash.
- Commissioning codes are also hashed with Argon2id (`auth-service.ts:215`).

### Findings

| Severity | Finding | File:Line | Description | Recommendation |
|----------|---------|-----------|-------------|----------------|
| **LOW** | Default Argon2 parameters | `auth-service.ts:47` | `argon2.hash(password, { type: argon2.argon2id })` uses library defaults for memory cost, time cost, and parallelism. The defaults (64 MiB, 3 iterations, 4 parallelism) are reasonable but not explicitly set, so a library upgrade could silently change them. | Explicitly set `memoryCost`, `timeCost`, and `parallelism` to OWASP-recommended values (e.g., `memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`). |
| **INFO** | Timing-safe comparison delegated to library | `auth-service.ts:51` | `argon2.verify()` performs constant-time comparison internally. No custom `timingSafeEqual` call is needed. | No action required — correct. |

---

## 2. JWT

### What's good
- JWT secret falls back to a cryptographically random 48-byte value when `JWT_SECRET` is not set (`config.ts:32`).
- A clear warning is logged when the ephemeral secret is used (`config.ts:33-36`).
- Tokens contain `userId`, `username`, `role`, and `sessionId`.
- `jwt.verify()` is used with the shared secret (`auth-service.ts:64`).

### Findings

| Severity | Finding | File:Line | Description | Recommendation |
|----------|---------|-----------|-------------|----------------|
| **HIGH** | No JWT algorithm pinning | `auth-service.ts:55-59`, `auth-service.ts:62-68` | `jwt.sign()` does not specify `algorithm: 'HS256'` and `jwt.verify()` does not specify `algorithms: ['HS256']`. The `jsonwebtoken` library defaults to HS256 for sign, but `verify()` without `algorithms` accepts **any** algorithm, including `none`. An attacker could forge a token with `alg: "none"` and bypass verification entirely. | Add `{ algorithms: ['HS256'] }` to `jwt.verify()`, and `{ algorithm: 'HS256' }` to `jwt.sign()`. |
| **HIGH** | No minimum JWT secret length enforcement | `config.ts:29-37` | When `JWT_SECRET` is set via environment variable, there is no validation of its length or entropy. A user could set `JWT_SECRET=password` and the system would accept it. | Validate that `JWT_SECRET` is at least 32 characters (256 bits). Refuse to start if the secret is too short. |
| **MEDIUM** | Ephemeral secret invalidates sessions on restart | `config.ts:32` | When `JWT_SECRET` is not set, a random secret is generated on every startup. All existing JWTs become invalid on restart. While the warning is good, this is a production risk. | Consider persisting the generated secret to a file (e.g., `$DATA_DIR/.jwt_secret`) on first run, or require `JWT_SECRET` in production mode. |
| **MEDIUM** | Token expiry mismatch with session expiry | `auth-service.ts:58`, `auth-service.ts:128` | JWT `expiresIn` is configurable (default `24h`), but the session DB record is hard-coded to expire in exactly 24 hours (`Date.now() + 24 * 60 * 60 * 1000`). If `JWT_EXPIRES_IN` is changed, the JWT and session lifetimes diverge. | Derive session expiry from the same config value as JWT expiry, or use a single source of truth. |
| **LOW** | `expiresIn` cast to `any` | `auth-service.ts:58` | `expiresIn: config.jwtExpiresIn as any` suppresses type checking. If `jwtExpiresIn` contains an invalid value (e.g., `"abc"`), `jsonwebtoken` may behave unpredictably. | Validate the format of `JWT_EXPIRES_IN` at startup (e.g., match against `/^\d+[smhd]$/`). |

---

## 3. Session Management

### What's good
- Sessions are stored in a DB table with `token` (the sessionId UUID), `user_id`, `expires_at`, and `is_revoked`.
- The `authenticate` middleware checks both JWT validity AND session validity in the DB (`middleware.ts:28-39`).
- Logout revokes the session via `is_revoked = 1` (`auth-routes.ts:88-91`).
- Session ID is a UUID v4 (`auth-service.ts:125`), not derived from predictable data.

### Findings

| Severity | Finding | File:Line | Description | Recommendation |
|----------|---------|-----------|-------------|----------------|
| **HIGH** | No session invalidation on password change | `auth-service.ts:170-184` | When a user's password is changed (by self or admin), existing sessions remain valid. An attacker who has stolen a session can keep using it even after the victim changes their password. | After password change, revoke all sessions for that user: `UPDATE sessions SET is_revoked = 1 WHERE user_id = ?`. |
| **HIGH** | No session invalidation on user disable | `auth-service.ts:186-189` | When a user is disabled (`is_active = 0`), their existing sessions remain valid. The `authenticate` middleware does not check `is_active` on the user — it only checks the session table. | Either (a) revoke all sessions on disable, or (b) add an `is_active` check in the `authenticate` middleware by joining or querying the `users` table. |
| **MEDIUM** | No "revoke all sessions" / forced logout | N/A | There is no endpoint or mechanism to revoke all sessions for a given user (e.g., "log out everywhere"). | Add an admin endpoint and a self-service endpoint to revoke all sessions for a user. |
| **MEDIUM** | `optionalAuth` does not validate session | `middleware.ts:47-58` | `optionalAuth` only verifies the JWT but does **not** check the session DB. A revoked or expired session will still pass `optionalAuth` and populate `req.user`. Any route relying on `optionalAuth` to gate behavior based on `req.user` presence will honor revoked sessions. | Add session DB validation to `optionalAuth` (or clear `req.user` if the session is invalid). |
| **MEDIUM** | No session cleanup / garbage collection | `migrate.ts:166-172` | Expired and revoked sessions accumulate in the `sessions` table indefinitely. Over time this degrades DB performance. | Add a periodic cleanup job (e.g., on startup or via a cron-like interval) that deletes sessions where `expires_at < datetime('now')` or `is_revoked = 1`. |
| **LOW** | Session table uses `token` as primary key | `migrate.ts:166` | The `token` column stores the session UUID and is the primary key. Column name `token` is misleading since it's not the JWT itself. | Rename to `id` or `session_id` for clarity (cosmetic, not a security bug). |

---

## 4. Brute-Force Protection

### What's good
- `express-rate-limit` is applied to login (`auth-routes.ts:14-20`): 20 attempts per 15 minutes per IP.
- Registration has its own limiter (`auth-routes.ts:22-28`): 10 attempts per hour per IP.
- Commissioning endpoint has a strict limiter (`auth-routes.ts:30-36`): 5 attempts per 15 minutes.
- The `resetSuperAdmin` function has progressive lockouts per commissioning org (`auth-service.ts:206`, `256-268`): 30s → 60s → 5m → 15m → 1h.

### Findings

| Severity | Finding | File:Line | Description | Recommendation |
|----------|---------|-----------|-------------|----------------|
| **HIGH** | No per-account brute-force protection on login | `auth-routes.ts:67`, `auth-service.ts:107-134` | Rate limiting is IP-based only (via `express-rate-limit`). An attacker using distributed IPs (botnet) can brute-force a single account without triggering the rate limit. There is no account lockout after N failed attempts. | Implement per-account lockout: track `failed_login_attempts` and `lockout_until` on the `users` table (similar to how commissioning codes already work). Lock the account after 5-10 failed attempts with progressive delays. |
| **MEDIUM** | Rate limiter uses default key generator | `auth-routes.ts:14-20` | `express-rate-limit` defaults to `req.ip` for keying. Behind a reverse proxy without `trust proxy` set, `req.ip` may be the proxy's IP, allowing all traffic to share one rate-limit bucket (or conversely, be trivially bypassed via `X-Forwarded-For` header spoofing). | Set `app.set('trust proxy', ...)` appropriately, or configure a custom `keyGenerator` on the rate limiter. |
| **LOW** | No rate limiting on password change | `auth-routes.ts:112-121`, `user-routes.ts:28-45` | The `PUT /api/auth/me/password` and `PUT /api/users/me/password` endpoints are not rate-limited. An attacker with a stolen session could brute-force the `currentPassword` field. | Add rate limiting to password-change endpoints. |

---

## 5. Password Policy

### Findings

| Severity | Finding | File:Line | Description | Recommendation |
|----------|---------|-----------|-------------|----------------|
| **CRITICAL** | Extremely weak password policy (4 characters minimum) | `auth-service.ts:81`, `auth-service.ts:171` | `createUser` and `updatePassword` only require `password.length < 4`. This allows trivially brute-forceable passwords like `1234`, `abcd`, etc. | Enforce a minimum of 8 characters (NIST SP 800-63B recommends 8+). Consider requiring at least 12 characters for admin/superadmin roles. |
| **HIGH** | Inconsistent password policies across endpoints | `auth-routes.ts:165-166` vs `auth-service.ts:81` | The commissioning step 2 route enforces 8 characters for the Super Admin password, but the general `createUser` and `updatePassword` functions only require 4 characters. An admin creating a new user via the API can set a 4-character password. | Centralize password validation into a single function. Apply the same minimum (8+) everywhere. |
| **MEDIUM** | No password complexity requirements | `auth-service.ts:81` | No check for uppercase, lowercase, digits, or special characters. No check against common passwords list. | Add complexity requirements or use a password-strength estimator (e.g., `zxcvbn`). At minimum, check against a list of the top 10,000 common passwords. |
| **LOW** | No maximum password length | `auth-service.ts:81` | No upper bound on password length. Extremely long passwords (e.g., 1 MB) could cause Argon2 to consume excessive memory/time, enabling a denial-of-service. | Set a maximum password length (e.g., 128 characters). |

---

## 6. Token Refresh Mechanism

### Findings

| Severity | Finding | File:Line | Description | Recommendation |
|----------|---------|-----------|-------------|----------------|
| **MEDIUM** | No token refresh mechanism | N/A | There is no refresh token or token renewal endpoint. When the JWT expires (default 24h), the user must re-authenticate with username/password. This incentivizes very long JWT lifetimes and poor UX. | Implement a refresh token flow: issue a short-lived access token (15-30 min) and a long-lived refresh token (e.g., 7 days, stored securely, rotated on use). The refresh token should be a separate DB-backed opaque token. |

---

## 7. Logout / Session Revocation

### What's good
- Logout endpoint exists at `POST /api/auth/logout` (`auth-routes.ts:85-94`).
- It correctly sets `is_revoked = 1` on the session record.
- `authenticate` middleware verifies the session is not revoked on every request (`middleware.ts:33-35`).

### Findings

| Severity | Finding | File:Line | Description | Recommendation |
|----------|---------|-----------|-------------|----------------|
| **HIGH** | JWT remains valid after logout until natural expiry | `auth-routes.ts:85-94` | While the session is revoked in the DB, the JWT itself remains cryptographically valid. If a service or middleware ever skips the session DB check (e.g., `optionalAuth`, a microservice, a WebSocket handler), the token can still be used. | This is mitigated by the DB check in `authenticate`, but ensure **all** auth paths (including WebSocket and `optionalAuth`) validate against the session DB. Consider shorter JWT lifetimes + refresh tokens. |
| **MEDIUM** | No "logout all devices" feature | N/A | There is no way for a user to revoke all their sessions at once. If a user suspects compromise, they cannot force-logout all other sessions. | Add `POST /api/auth/logout-all` that runs `UPDATE sessions SET is_revoked = 1 WHERE user_id = ?`. |
| **LOW** | Logout does not clear expired session records | `auth-routes.ts:85-94` | Logout only sets `is_revoked = 1` but doesn't remove the session. Combined with no cleanup job, this leads to unbounded table growth. | Add periodic session cleanup (see Session Management section). |

---

## 8. Additional Security Findings

| Severity | Finding | File:Line | Description | Recommendation |
|----------|---------|-----------|-------------|----------------|
| **HIGH** | CORS is fully open | `server.ts:19` | `app.use(cors())` allows requests from **any** origin with **any** method and headers. This permits cross-site request attacks from malicious websites. | Configure CORS with a specific `origin` allowlist appropriate for the deployment environment. For an embedded device, this might be the device's own IP/hostname. |
| **HIGH** | Admin can reset any user's password without knowing the current one | `user-routes.ts:89-93` | `PUT /api/users/:id/password` allows an admin to set a new password for any user without supplying the current password. While admin password reset is a legitimate feature, it should be restricted to Super Admins only (not regular Admins), and it should force-logout the affected user. | Restrict to `requireSuperAdmin` (not `requireAdmin`), and revoke all sessions for the target user after reset. |
| **HIGH** | Admin can escalate any user to ADMINISTRATOR role | `user-routes.ts:82-86` | The `PUT /api/users/:id/role` endpoint uses `requireAdmin`, which means an ADMINISTRATOR can promote other users to ADMINISTRATOR. The `updateUserRole` function only blocks escalation to SUPER_ADMINISTRATOR. | Add a check: only SUPER_ADMINISTRATORs should be able to assign the ADMINISTRATOR role. |
| **MEDIUM** | Sensitive data in JWT payload | `auth-service.ts:55-57` | The JWT payload includes `username` and `role`. While not secret, the `role` in the token is trusted by the client. If a user's role is changed, the old JWT still carries the old role until expiry. The server-side middleware re-reads the DB for session validation but trusts `req.user.role` from the JWT for authorization checks. | Either (a) look up the user's current role from DB in the middleware instead of trusting the JWT claim, or (b) revoke all sessions on role change so the user must re-authenticate. |
| **MEDIUM** | `DELETE FROM users WHERE role = 'SUPER_ADMINISTRATOR'` deletes ALL super admins | `auth-service.ts:279` | `resetSuperAdmin` deletes **all** super admin accounts before creating the new one. If there were multiple super admins (e.g., from a bug or direct DB edit), this nukes them all. | This is likely intentional for a "factory reset" flow but should be called out as a destructive operation. Add a confirmation step or limit to a single super admin by design. |
| **MEDIUM** | No HTTPS enforcement | `server.ts` | The server creates an HTTP-only Express app. JWTs are transmitted in plaintext over HTTP. On a local network (pool controller), this may be acceptable, but any network sniffer can capture tokens. | For production, enforce HTTPS or document that the system is intended for isolated networks only. |
| **MEDIUM** | Duplicate password change endpoints | `auth-routes.ts:112-121`, `user-routes.ts:28-45` | Two separate endpoints handle self-password-change (`PUT /api/auth/me/password` and `PUT /api/users/me/password`). The `user-routes.ts` version re-implements password verification inline rather than calling `authService.updatePassword` with `currentPassword`. Code duplication increases the risk of inconsistent security logic. | Consolidate into a single endpoint. Remove the duplicate. |
| **LOW** | Audit log does not consistently capture `sourceIp` | `audit.ts:10`, various callers | Many `auditLog()` calls pass `undefined` for `sourceIp`. The login audit captures it, but user creation, role changes, etc., do not. | Pass `req.ip` through all audit-logging calls for forensic traceability. |
| **LOW** | `50mb` JSON body limit | `server.ts:20` | `express.json({ limit: '50mb' })` is very large. A malicious client could send a 50 MB JSON payload to any endpoint, consuming server memory. | Reduce to a reasonable limit (e.g., `1mb` for most API routes, `50mb` only for specific upload endpoints). |
| **LOW** | Wi-Fi password stored in plaintext | `auth-routes.ts:201` | `wifiPassword` from commissioning step 3 is stored in `system_config` as plaintext. | Document this as a known limitation. If the DB file is compromised, the Wi-Fi credentials are exposed. Consider encrypting sensitive config values at rest. |

---

## Summary of Findings by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 1 |
| HIGH | 7 |
| MEDIUM | 10 |
| LOW | 7 |
| INFO | 1 |

### Critical
1. **4-character minimum password length** — trivially brute-forceable.

### High
1. No JWT algorithm pinning — `alg: "none"` attack possible.
2. No minimum JWT secret length enforcement.
3. No session invalidation on password change.
4. No session invalidation on user disable.
5. No per-account brute-force protection on login.
6. CORS fully open (`cors()` with no config).
7. Admin can reset any user's password without current password and without revoking sessions.

### Top 3 Recommended Immediate Actions
1. **Pin JWT algorithm** to `HS256` in both `sign()` and `verify()`.
2. **Raise minimum password length** to 8 characters across all code paths.
3. **Invalidate all sessions** when a user's password is changed or account is disabled.
