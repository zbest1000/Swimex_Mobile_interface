# SwimEx EDGE — Session Management

This document describes the current auth/session behavior implemented in:

- `server/src/auth/auth-service.ts`
- `server/src/auth/middleware.ts`
- `server/src/http/routes/auth-routes.ts`
- `server/src/http/routes/workout-routes.ts`

## Session Model

SwimEx EDGE uses a **JWT + server-side session row** model.

| Aspect | Current behavior |
|---|---|
| Access token | JWT signed with `JWT_SECRET` |
| Session state | Stored in SQLite `sessions` table |
| Session pointer | JWT includes `sessionId` claim |
| Request auth | `Authorization: Bearer <jwt>` |
| Revocation check | Middleware validates matching non-revoked, non-expired `sessions` row |

## Login and Session Creation

On `POST /api/auth/login`:

1. Username/password are verified.
2. A UUID session id is generated.
3. JWT is issued with `userId`, `username`, `role`, and `sessionId`.
4. A `sessions` table row is created (`token=<sessionId>`, `expires_at=now+24h`).

## Auth Validation Flow

Every protected request follows this sequence:

1. Parse bearer token.
2. Verify JWT signature + expiry.
3. Read `sessionId` claim.
4. Query `sessions` where:
   - `token = sessionId`
   - `is_revoked = 0`
   - `expires_at > now`
5. Reject if no active row is found.

This means token validity depends on both JWT integrity and server-side session state.

## Token Claims

| Claim | Purpose |
|---|---|
| `userId` | User id for request context |
| `username` | Username for audit/context |
| `role` | Role-based authorization decisions |
| `sessionId` | Lookup key into `sessions` table |
| `iat` / `exp` | JWT issuance and expiration |

## Expiry and Re-Authentication

- JWT expiry is controlled by `JWT_EXPIRES_IN` (default `24h`).
- Session DB expiry is currently written as `now + 24h`.
- **No refresh-token endpoint is implemented.**
- When token/session expires, clients must re-authenticate with `/api/auth/login`.

## Revocation Events

Sessions are revoked when:

- User calls `POST /api/auth/logout` (current session revoked)
- Password is changed (all user sessions revoked)
- User is disabled (all user sessions revoked)

## Device Registration and Write Access

Device registration is enforced by workout write routes via middleware chain:

`authenticate` → `checkDeviceRegistration` → `requireRegisteredDevice`

Behavior:

| Condition | Result |
|---|---|
| Admin or Super Admin | Bypasses device registration requirement |
| Non-admin + registered MAC (`X-Device-MAC`) | Write allowed |
| Non-admin + missing/unregistered MAC | `DEVICE_NOT_REGISTERED` style denial |

Read-only endpoints can still be accessed without registered device status if route policy allows it.

## Operational Constraints

- If `JWT_SECRET` is unset, a random secret is generated at startup; all existing JWTs become invalid after restart.
- Keep `JWT_EXPIRES_IN` aligned with session row expiry policy to avoid drift.

## Related Documentation

- [Roles and Permissions](ROLES_AND_PERMISSIONS.md)
- [Commissioning Codes](COMMISSIONING_CODES.md)
- [API](../api/) — login/logout/current-user endpoints
