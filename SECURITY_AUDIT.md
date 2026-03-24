# Security Audit Report — HTTP Layer

**Scope:** `/workspace/server/src/http/` (server.ts, middleware.ts, routes/*.ts), plus supporting auth, websocket, and config files.

**Date:** 2026-03-24

---

## Table of Contents

1. [CORS Configuration](#1-cors-configuration)
2. [Security Headers](#2-security-headers)
3. [Input Validation](#3-input-validation)
4. [Path Traversal](#4-path-traversal)
5. [Rate Limiting](#5-rate-limiting)
6. [Error Handling](#6-error-handling)
7. [File Upload](#7-file-upload)
8. [Static File Serving](#8-static-file-serving)
9. [WebSocket Authentication](#9-websocket-authentication)
10. [Additional Findings](#10-additional-findings)

---

## 1. CORS Configuration

### Finding SEC-01: Fully Permissive CORS — `cors()` with No Origin Restriction

| Field | Value |
|-------|-------|
| **Severity** | **HIGH** |
| **File** | `server/src/http/server.ts` |
| **Line** | 19 |
| **Code** | `app.use(cors());` |

**Description:** `cors()` called with zero arguments defaults to `Access-Control-Allow-Origin: *`. This allows any website on the internet to make credentialed cross-origin requests to the API. On an embedded device this may be lower risk (LAN-only), but it still permits any malicious page open on a device within the same network to exfiltrate tokens and interact with the API.

**Recommended Fix:**
```ts
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin requests (no Origin header) and known origins
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      `http://localhost:${config.httpPort}`,
      `http://127.0.0.1:${config.httpPort}`,
      // Add the device's LAN IP or hostname
    ];
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
```

---

## 2. Security Headers

### Finding SEC-02: No Security Headers (Helmet.js Not Installed or Used)

| Field | Value |
|-------|-------|
| **Severity** | **HIGH** |
| **File** | `server/src/http/server.ts` |
| **Line** | N/A (missing) |

**Description:** The `helmet` package is **not in `package.json`** and no security headers are set anywhere in the HTTP layer. The following headers are all missing:

| Header | Status | Risk |
|--------|--------|------|
| `X-Content-Type-Options: nosniff` | Missing | MIME-type sniffing can lead to XSS |
| `X-Frame-Options: DENY` | Missing | Clickjacking on admin panels |
| `Strict-Transport-Security` | Missing | Downgrade attacks (if HTTPS ever used) |
| `Content-Security-Policy` | Missing | XSS via injected scripts |
| `X-XSS-Protection` | Missing | Legacy XSS filter |
| `Referrer-Policy` | Missing | Token leakage via Referer header |
| `Permissions-Policy` | Missing | Feature abuse (camera, microphone) |

**Recommended Fix:**
```bash
npm install helmet
```
```ts
import helmet from 'helmet';
// In createApp(), before routes:
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

---

## 3. Input Validation

### Finding SEC-03: No Schema Validation on Request Bodies (Multiple Endpoints)

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **Files** | All route files |
| **Lines** | Throughout |

**Description:** Request bodies are destructured and used directly with minimal ad-hoc validation. There is no schema validation library (e.g., `zod`, `joi`, `express-validator`). While parameterized SQL queries protect against SQL injection, unvalidated body fields are passed directly to service functions. Specific examples:

- `auth-routes.ts:58` — `req.body` destructured for `/register` with no type/length checks on `email`
- `auth-routes.ts:68-69` — `/login` does not validate `username`/`password` are strings before passing to `authService.login()`
- `admin-routes.ts:53` — `POST /devices` passes `macAddress`, `deviceName`, `deviceType` with no format validation
- `admin-routes.ts:86-88` — `POST /communication` passes `protocol`, `name`, `configData` without schema validation
- `user-routes.ts:76-77` — `POST /users` passes `role` from body directly — a non-admin could potentially supply `SUPER_ADMINISTRATOR` if the service layer doesn't re-check (it does, partially)
- `workout-routes.ts:141-178` — `POST /programs` has the best validation of all routes, but other workout endpoints are less rigorous

No endpoint uses a dedicated validation/sanitization library.

**Recommended Fix:** Introduce `zod` or `joi` for request body schema validation at the route handler level. Define schemas per-endpoint and validate before any business logic executes.

---

### Finding SEC-04: No Sanitization of String Inputs Returned in Responses

| Field | Value |
|-------|-------|
| **Severity** | **LOW** |
| **Files** | All route files |
| **Lines** | Throughout |

**Description:** User-supplied strings (e.g., `displayName`, `deviceName`, `name`) are stored and returned verbatim in JSON responses. While this is generally safe for JSON API responses (XSS risk is primarily in HTML rendering), if any of these values are ever rendered in HTML (e.g., in the SPA served from `public/`), XSS is possible. The SVG upload path in `graphics-routes.ts:68` parses and stores raw SVG content, which can contain embedded JavaScript.

**Recommended Fix:**
- Sanitize SVG uploads by stripping `<script>`, `onload`, and other event handlers.
- Consider HTML-entity-encoding user-supplied strings before storage, or ensure the client always escapes them.

---

### Finding SEC-05: SQL Queries Use Parameterized Statements — No Raw SQL Injection

| Field | Value |
|-------|-------|
| **Severity** | **INFO (Positive)** |
| **Files** | All files using `getDb()` |

**Description:** All SQL queries use `better-sqlite3` prepared statements with `?` placeholders. No string concatenation of user input into SQL was found. The dynamic `WHERE` clause building in `audit.ts:50` and `workout-routes.ts:113-117` both use parameterized arrays correctly.

---

## 4. Path Traversal

### Finding SEC-06: Logo Type Parameter Not Validated in Public Endpoint

| Field | Value |
|-------|-------|
| **Severity** | **LOW** |
| **File** | `server/src/http/server.ts` |
| **Line** | 70-81 |
| **Code** | `const type = req.params.type as 'primary' \| 'secondary' \| 'favicon' \| 'splash';` |

**Description:** The `/api/logos/:type` public endpoint casts the `type` parameter to a union type via TypeScript, but this provides no runtime validation. The actual validation depends on what `brandingService.getLogo(type)` does internally. If `getLogo` uses the type to construct a file path, this could be a traversal vector. The admin route `POST /admin/logos/:type` at `admin-routes.ts:294-307` does validate against a whitelist (`validTypes`), but the public routes at `server.ts:70` and `admin-routes.ts:284` do not.

**Recommended Fix:** Add runtime validation of the `type` parameter against the known whitelist in all logo-serving routes:
```ts
const validTypes = ['primary', 'secondary', 'favicon', 'splash'];
if (!validTypes.includes(req.params.type)) {
  return res.status(400).json({ ... });
}
```

---

### Finding SEC-07: No Path Traversal Risk in Static File Serving

| Field | Value |
|-------|-------|
| **Severity** | **INFO (Positive)** |
| **File** | `server/src/http/server.ts` |
| **Lines** | 129-140 |

**Description:** Static file serving uses `express.static(publicPath)` with a resolved absolute path, and the SPA fallback uses `path.join(publicPath, 'index.html')` with a hardcoded filename. No user input is used to construct file paths for the static file server. This is safe.

---

## 5. Rate Limiting

### Finding SEC-08: Rate Limiting Only on Auth Routes — All Other Endpoints Unprotected

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **File** | `server/src/http/routes/auth-routes.ts` |
| **Lines** | 14-36 |

**Description:** Three rate limiters are defined, all exclusively in `auth-routes.ts`:

| Limiter | Window | Max | Applied To |
|---------|--------|-----|------------|
| `authRateLimiter` | 15 min | 20 | `/login`, `/reset-super-admin` |
| `registerRateLimiter` | 1 hour | 10 | `/register` |
| `commissionRateLimiter` | 15 min | 5 | `/commission/step1-codes` only |

**Missing rate limiting on:**
- All `/api/admin/*` endpoints (device management, config import/export, branding, i18n, audit log, WiFi, communication, tags, feature flags, layouts)
- All `/api/users/*` endpoints (user CRUD, password changes, profile photo upload)
- All `/api/workouts/*` endpoints (workout start/stop/pause, program CRUD, history, stats)
- All `/api/graphics/*` endpoints (graphic listing, upload, file serving)
- `/api/health`, `/api/features`, `/api/branding`, `/api/logos/:type`, `/api/i18n/*`
- Commissioning steps 2-5 (only step 1 has the limiter)
- The 50MB graphics upload endpoint (`POST /api/graphics/`) has no rate limiting

**Recommended Fix:** Add a global rate limiter as baseline protection, plus stricter per-route limiters for sensitive operations:
```ts
// Global baseline
app.use('/api/', rateLimit({ windowMs: 60_000, max: 100 }));
// Stricter for uploads
router.post('/', authenticate, requireRole(...), uploadLimiter, upload.single('file'), ...);
```

---

## 6. Error Handling

### Finding SEC-09: Stack Traces Logged but Not Leaked to Clients

| Field | Value |
|-------|-------|
| **Severity** | **INFO (Positive)** |
| **File** | `server/src/http/server.ts` |
| **Lines** | 143-156 |

**Description:** The global error handler correctly differentiates between `AppError` (which returns structured error codes/messages) and unexpected errors (which log the stack trace server-side but return a generic "Internal server error" to the client). This is good practice.

---

### Finding SEC-10: WebSocket Error Messages May Leak Internal Details

| Field | Value |
|-------|-------|
| **Severity** | **LOW** |
| **File** | `server/src/websocket/ws-handler.ts` |
| **Lines** | 247-248 |
| **Code** | `this.send(client.ws, { type: 'command_error', payload: { command, message: err.message } });` |

**Description:** When a WebSocket command throws an error, the raw `err.message` is sent to the client. If the error originates from the database layer or an unexpected exception, it could leak internal details (table names, column names, etc.).

**Recommended Fix:** Wrap command error responses in a safe error handler that only passes through known `AppError` messages and replaces unexpected errors with a generic message.

---

## 7. File Upload

### Finding SEC-11: No MIME Type Validation on File Uploads

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **Files** | `admin-routes.ts`, `user-routes.ts`, `graphics-routes.ts` |
| **Lines** | admin:20, user:8, graphics:9 |

**Description:** Three `multer` instances are configured:

| Instance | Location | Size Limit | MIME Filter |
|----------|----------|------------|-------------|
| `logoUpload` | `admin-routes.ts:20` | 5 MB | **None** |
| `profileUpload` | `user-routes.ts:8` | 2 MB | **None** |
| `upload` (graphics) | `graphics-routes.ts:9` | 50 MB | **None** |

All three use `multer.memoryStorage()` with size limits but **no `fileFilter`** to validate MIME types. This means:
- A user could upload an executable, HTML file, or malicious SVG as a "logo" or "profile photo"
- The 50 MB graphics upload is especially concerning — large files held in memory could be used for DoS

**Recommended Fix:**
```ts
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/x-icon'];
    cb(null, allowed.includes(file.mimetype));
  },
});
```

---

### Finding SEC-12: SVG Upload Allows Stored XSS via Embedded Scripts

| Field | Value |
|-------|-------|
| **Severity** | **HIGH** |
| **File** | `server/src/http/routes/graphics-routes.ts` |
| **Lines** | 64-69 |
| **Code** | `svgContent = file.toString('utf-8');` |

**Description:** SVG files are uploaded, stored as raw UTF-8 strings, and served back with `Content-Type: image/svg+xml` (`graphics-routes.ts:42`). SVG files can contain `<script>` tags, `onload` attributes, and other JavaScript vectors. When served with the SVG MIME type and no `Content-Security-Policy` header, the browser will execute embedded JavaScript.

Combined with:
- No CSP header (SEC-02)
- No MIME type validation (SEC-11)
- Public unauthenticated access to graphic files (`GET /:id/file` at line 37 has no auth)

This creates a stored XSS attack chain: upload a malicious SVG → anyone visiting the graphic URL executes arbitrary JavaScript.

**Recommended Fix:**
1. Sanitize SVG content on upload using a library like `DOMPurify` (with jsdom) or `sanitize-svg`
2. Serve SVGs with `Content-Disposition: attachment` or via a sandboxed iframe
3. Add `Content-Security-Policy: script-src 'none'` to SVG responses
4. Implement CSP globally (SEC-02)

---

### Finding SEC-13: Graphics File Endpoint is Fully Unauthenticated

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **File** | `server/src/http/routes/graphics-routes.ts` |
| **Line** | 37 |
| **Code** | `router.get('/:id/file', (req, res, next) => { ... });` |

**Description:** The `GET /api/graphics/:id/file` endpoint serves uploaded graphic binary data with no authentication whatsoever. Combined with the SVG XSS issue (SEC-12), anyone on the network can access any uploaded graphic file. The listing endpoints (`GET /` and `GET /:id`) use `optionalAuth`, meaning they also work without authentication.

**Recommended Fix:** Require at least `optionalAuth` with appropriate access control, or add `Content-Disposition: attachment` headers to prevent in-browser rendering of uploaded files.

---

## 8. Static File Serving

### Finding SEC-14: Static File Serving is Properly Scoped

| Field | Value |
|-------|-------|
| **Severity** | **INFO (Positive)** |
| **File** | `server/src/http/server.ts` |
| **Lines** | 129-140 |

**Description:** `express.static()` is called with a resolved absolute path (`path.resolve(__dirname, '../../public')`), which prevents directory traversal above the public root. The SPA fallback correctly filters API routes before falling through to `index.html`. This is safe.

---

## 9. WebSocket Authentication

### Finding SEC-15: WebSocket Connections Allow Unauthenticated Access to Sensitive Data

| Field | Value |
|-------|-------|
| **Severity** | **HIGH** |
| **File** | `server/src/websocket/ws-handler.ts` |
| **Lines** | 56-92 |

**Description:** WebSocket connections are accepted from **any client** with or without authentication. The token in the query string is optional — if missing or invalid, the client is still connected as a "guest." Guest clients immediately receive:

1. **Active workout state** (line 85): `workoutEngine.getActiveWorkout()`
2. **Pool ID** (line 86): `config.poolId`
3. **Connection status** (line 90): MQTT, Modbus, PLC heartbeat status
4. **All workout broadcasts** (lines 291-306): Every workout event (start, stop, speed change, tick) is broadcast to ALL clients, including unauthenticated ones
5. **Safety stop alerts** (lines 323-331): Broadcast to all clients

Only tag subscriptions and commands require authentication. The `keepalive` and `get_workout` message types work without auth.

**Recommended Fix:**
- Require authentication for WebSocket connections, or at minimum limit what data is broadcast to unauthenticated clients
- Validate the token's session against the database (the HTTP `authenticate` middleware checks session revocation, but the WS handler only calls `verifyToken()` which only checks JWT signature/expiry — a revoked session's token still works over WebSocket)

---

### Finding SEC-16: WebSocket Token in Query String Exposes JWT in Logs

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **File** | `server/src/websocket/ws-handler.ts` |
| **Lines** | 57-58 |
| **Code** | `const token = url.searchParams.get('token');` |

**Description:** The WebSocket authentication token is passed as a URL query parameter (`?token=<JWT>`). Query string parameters are commonly logged by proxies, web servers, and browser history. This increases the risk of JWT token leakage.

**Recommended Fix:** Accept the token as the first message after connection (the "authenticate" message type already exists), or use the `Sec-WebSocket-Protocol` header to pass the token.

---

### Finding SEC-17: WebSocket Does Not Validate Session Revocation

| Field | Value |
|-------|-------|
| **Severity** | **HIGH** |
| **File** | `server/src/websocket/ws-handler.ts` |
| **Lines** | 62-63, 177-187 |

**Description:** Both the initial connection authentication and the `authenticate` message type call `verifyToken(token)`, which only validates the JWT signature and expiry. It does **not** check if the session has been revoked in the database (the `sessions.is_revoked` flag). This means:

1. A user logs out (session is revoked via `POST /api/auth/logout`)
2. Their JWT is still valid until it expires (24 hours by default)
3. The WebSocket handler will accept this revoked token and grant full authenticated access

The HTTP `authenticate` middleware correctly checks session revocation (middleware.ts:33-38), but the WebSocket handler bypasses this entirely.

**Recommended Fix:** After `verifyToken()`, check the session table:
```ts
const db = getDb();
const session = db.prepare(
  "SELECT * FROM sessions WHERE token = ? AND is_revoked = 0 AND expires_at > datetime('now')"
).get(payload.sessionId);
if (!session) { /* reject authentication */ }
```

---

## 10. Additional Findings

### Finding SEC-18: JSON Body Size Limit Set to 50 MB

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **File** | `server/src/http/server.ts` |
| **Line** | 20 |
| **Code** | `app.use(express.json({ limit: '50mb' }));` |

**Description:** The global JSON body parser accepts up to 50 MB. This is extremely large for an API that primarily handles small JSON payloads. An attacker could send many 50 MB requests concurrently to exhaust server memory (this is an embedded device with limited resources).

The 50 MB limit was likely set to support the config import (`POST /api/admin/config/import`) or graphics metadata, but these endpoints should have their own size limits.

**Recommended Fix:** Set a conservative global limit (e.g., 1 MB) and override per-route where needed:
```ts
app.use(express.json({ limit: '1mb' }));
// For config import:
router.post('/config/import', authenticate, requireSuperAdmin, express.json({ limit: '10mb' }), ...);
```

---

### Finding SEC-19: Weak Password Policy

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **File** | `server/src/auth/auth-service.ts` |
| **Lines** | 81, 171 |

**Description:** Minimum password length is only **4 characters** (`auth-service.ts:81,171`). During commissioning step 2, the Super Admin password requires 8 characters (`auth-routes.ts:165`), but the general `createUser` and `updatePassword` functions only require 4. The Administrator account created during commissioning also only requires 4 characters (`auth-routes.ts:172`).

**Recommended Fix:** Enforce a minimum of 8 characters for all passwords, with additional complexity requirements for admin/super-admin roles.

---

### Finding SEC-20: Health Endpoint Exposes Server Uptime

| Field | Value |
|-------|-------|
| **Severity** | **LOW** |
| **File** | `server/src/http/server.ts` |
| **Lines** | 30-40 |

**Description:** The `/api/health` endpoint exposes `process.uptime()` and server version to unauthenticated clients. While useful for monitoring, this leaks operational information (how long the server has been running, exact version).

---

### Finding SEC-21: Dashboard Exposes `process.memoryUsage()` and Client Details

| Field | Value |
|-------|-------|
| **Severity** | **LOW** |
| **File** | `server/src/http/routes/admin-routes.ts` |
| **Lines** | 25-44 |

**Description:** The `/api/admin/dashboard` endpoint (admin-only, properly authenticated) exposes detailed memory usage (`process.memoryUsage()`) and the full WebSocket client list including IP addresses. This is appropriate for admin-level access but should be noted.

---

### Finding SEC-22: `optionalAuth` in Middleware Does Not Check Session Revocation

| Field | Value |
|-------|-------|
| **Severity** | **LOW** |
| **File** | `server/src/auth/middleware.ts` |
| **Lines** | 47-58 |

**Description:** The `optionalAuth` middleware calls `verifyToken()` but does not check session revocation in the database (unlike the full `authenticate` middleware). A revoked token would still populate `req.user` on routes using `optionalAuth`. Currently used by `GET /api/workouts/active` and several graphics endpoints.

**Recommended Fix:** Either check session revocation in `optionalAuth` or document the trust boundary explicitly.

---

### Finding SEC-23: Admin Password Reset Does Not Require Current Password

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **File** | `server/src/http/routes/user-routes.ts` |
| **Lines** | 89-94 |

**Description:** The admin endpoint `PUT /api/users/:id/password` allows administrators to change any user's password without supplying the current password. While this is a common admin feature, combined with the weak password policy (SEC-19), it increases the risk of privilege abuse.

---

### Finding SEC-24: WiFi Password Stored and Transmitted in Plaintext

| Field | Value |
|-------|-------|
| **Severity** | **MEDIUM** |
| **File** | `server/src/http/routes/auth-routes.ts` |
| **Lines** | 197-202, 209-214 |

**Description:** During commissioning step 3, the WiFi AP password is stored as a plaintext `system_config` value via `setSystemConfig('wifi_password', wifiPassword || '')`. The default fallback password is hardcoded as `'swimex2024'` at line 212. This password is also readable via the admin WiFi endpoint (`GET /api/admin/wifi`).

**Recommended Fix:** Encrypt WiFi passwords at rest. Remove the hardcoded default password.

---

### Finding SEC-25: `require()` Used Dynamically in Request Handlers

| Field | Value |
|-------|-------|
| **Severity** | **LOW** |
| **File** | `server/src/http/server.ts` |
| **Lines** | 45, 72, 85, 100, 110 |

**Description:** Several inline handlers use `require()` to lazily import services at runtime. While not a direct security issue, this pattern makes it harder to audit the dependency graph and could mask import errors until a route is first hit.

---

## Summary Table

| ID | Severity | Category | Finding |
|----|----------|----------|---------|
| SEC-01 | **HIGH** | CORS | Fully permissive `cors()` with no origin restriction |
| SEC-02 | **HIGH** | Headers | No security headers (no Helmet, no CSP, no HSTS, etc.) |
| SEC-03 | MEDIUM | Validation | No schema validation library on request bodies |
| SEC-04 | LOW | Validation | No sanitization of user strings in responses |
| SEC-05 | INFO+ | SQL | Parameterized queries — no SQL injection |
| SEC-06 | LOW | Path Traversal | Logo type parameter not validated in public routes |
| SEC-07 | INFO+ | Path Traversal | Static file serving properly scoped |
| SEC-08 | MEDIUM | Rate Limiting | Only auth routes have rate limiting |
| SEC-09 | INFO+ | Errors | Stack traces logged but not leaked to clients |
| SEC-10 | LOW | Errors | WebSocket error messages may leak internals |
| SEC-11 | MEDIUM | Upload | No MIME type validation on file uploads |
| SEC-12 | **HIGH** | Upload/XSS | SVG upload allows stored XSS via embedded scripts |
| SEC-13 | MEDIUM | Auth | Graphics file endpoint is fully unauthenticated |
| SEC-14 | INFO+ | Static | Static file serving properly scoped |
| SEC-15 | **HIGH** | WebSocket | Unauthenticated WS clients receive sensitive broadcasts |
| SEC-16 | MEDIUM | WebSocket | JWT in query string (logged by proxies) |
| SEC-17 | **HIGH** | WebSocket | WebSocket does not validate session revocation |
| SEC-18 | MEDIUM | DoS | JSON body limit set to 50 MB |
| SEC-19 | MEDIUM | Auth | Minimum password length is only 4 characters |
| SEC-20 | LOW | Info Leak | Health endpoint exposes uptime and version |
| SEC-21 | LOW | Info Leak | Dashboard exposes memory usage and client IPs |
| SEC-22 | LOW | Auth | `optionalAuth` doesn't check session revocation |
| SEC-23 | MEDIUM | Auth | Admin password reset doesn't require current password |
| SEC-24 | MEDIUM | Secrets | WiFi password stored/transmitted in plaintext |
| SEC-25 | LOW | Code Quality | Dynamic `require()` in request handlers |

### Risk Distribution

- **HIGH:** 5 findings (SEC-01, SEC-02, SEC-12, SEC-15, SEC-17)
- **MEDIUM:** 8 findings (SEC-03, SEC-08, SEC-11, SEC-13, SEC-16, SEC-18, SEC-19, SEC-23, SEC-24)
- **LOW:** 6 findings (SEC-04, SEC-06, SEC-10, SEC-20, SEC-21, SEC-22, SEC-25)
- **INFO (Positive):** 4 findings (SEC-05, SEC-07, SEC-09, SEC-14)

### Priority Remediation Order

1. **SEC-02** — Install and configure Helmet.js (quick win, broad impact)
2. **SEC-12** — Sanitize SVG uploads or serve with safe headers (stored XSS)
3. **SEC-01** — Restrict CORS to known origins
4. **SEC-17** — Add session revocation check to WebSocket auth
5. **SEC-15** — Limit data broadcast to unauthenticated WebSocket clients
6. **SEC-11** — Add MIME type validation to all multer instances
7. **SEC-08** — Add global and per-route rate limiting
8. **SEC-18** — Reduce global JSON body limit to 1 MB
9. **SEC-03** — Add schema validation (zod/joi)
10. **SEC-19** — Strengthen password policy
