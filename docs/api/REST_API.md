# SwimEx EDGE — REST API Reference

This reference is validated against current route handlers under `server/src/http/routes/*.ts` and `server/src/http/server.ts`.

## Base URL

```text
http://<server-ip>:<HTTP_PORT>/api
```

Default `HTTP_PORT` is `80`.

## Response Envelope

Most endpoints return:

```json
{
  "success": true,
  "data": {}
}
```

Failures use:

```json
{
  "success": false,
  "error": {
    "code": "SOME_CODE",
    "message": "Human-readable message"
  }
}
```

## Authentication

- Bearer auth header: `Authorization: Bearer <jwt>`
- Login endpoint: `POST /api/auth/login`
- **No refresh-token endpoint is currently implemented**

### Example: login

**Request**

```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (shape)**

```json
{
  "success": true,
  "data": {
    "token": "<jwt>",
    "user": {
      "id": "uuid",
      "username": "admin",
      "role": "ADMINISTRATOR"
    },
    "commissioned": false,
    "commissioningRequired": false
  }
}
```

## Public Endpoints (no auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Server liveness/uptime payload |
| GET | `/api/features` | Public-visible feature flags |
| GET | `/api/branding` | Branding metadata |
| GET | `/api/logos/:type` | Public logo bytes |
| GET | `/api/i18n/config` | i18n defaults |
| GET | `/api/i18n/languages` | Installed language packs |
| GET | `/api/i18n/:locale` | Translation payload |
| GET | `/api/auth/system-status` | Commissioning state |
| POST | `/api/auth/login` | Obtain JWT/session |
| POST | `/api/auth/register` | User self-registration (only after commissioning) |
| POST | `/api/auth/reset-super-admin` | Recovery flow via commissioning code |
| GET | `/api/admin/layouts/active` | Active layout for clients |
| GET | `/api/admin/public/branding` | Public branding mirror |

## Authenticated User Endpoints

| Method | Path | Notes |
|---|---|---|
| GET | `/api/auth/me` | Current user + preferences |
| PUT | `/api/auth/me/preferences` | Update preferences |
| PUT | `/api/auth/me/password` | Change own password |
| POST | `/api/auth/logout` | Revoke current session |
| GET | `/api/users/me` | Current user profile (duplicate surface) |
| PATCH | `/api/users/me/preferences` | Update preferences |
| PUT | `/api/users/me/password` | Change own password |
| POST | `/api/users/me/profile-photo` | Upload profile photo |

## Workout Endpoints

### Read endpoints

| Method | Path | Auth |
|---|---|---|
| GET | `/api/workouts/active` | Optional |
| GET | `/api/workouts/state` | No |
| GET | `/api/workouts/presets` | No |
| GET | `/api/workouts/programs` | Yes |
| GET | `/api/workouts/programs/:id` | Yes |
| GET | `/api/workouts/history` | Yes |
| GET | `/api/workouts/stats` | Yes |

### Write/control endpoints

These routes require:
`authenticate` + `checkDeviceRegistration` + `requireRegisteredDevice`.

Admin/Super Admin bypass device-registration enforcement.

| Method | Path |
|---|---|
| POST | `/api/workouts/quick-start` |
| POST | `/api/workouts/start-program` |
| POST | `/api/workouts/start-preset` |
| POST | `/api/workouts/start-interval` |
| POST | `/api/workouts/pause` |
| POST | `/api/workouts/resume` |
| POST | `/api/workouts/stop` |
| POST | `/api/workouts/set-speed` |
| POST | `/api/workouts/adjust-speed` |

### Program CRUD

| Method | Path |
|---|---|
| POST | `/api/workouts/programs` |
| PUT | `/api/workouts/programs/:id` |
| DELETE | `/api/workouts/programs/:id` |
| POST | `/api/workouts/programs/:id/clone` |

## Admin Endpoints (high level)

Admin routes live under `/api/admin/*`.

Key groups:

- Dashboard/status: `/dashboard`
- Device management: `/devices`, `/devices/:id/*`, import/export
- Communication config: `/communication*`
- Tag mappings: `/tags*`
- Feature flags: `/feature-flags*` (Super Admin)
- Layout management: `/layouts*`
- Wi-Fi AP operations: `/wifi`, `/wifi/start`, `/wifi/stop`
- Config export/import: `/config/export`, `/config/import` (import requires Super Admin)
- Branding/logo management: `/branding`, `/logos*`
- i18n pack management: `/i18n/*`
- Audit logs: `/audit-log`

## Graphics Endpoints

| Method | Path | Auth |
|---|---|---|
| GET | `/api/graphics` | Optional |
| GET | `/api/graphics/categories` | No |
| GET | `/api/graphics/:id` | Optional |
| GET | `/api/graphics/:id/file` | No |
| POST | `/api/graphics` | Editor roles |
| PUT | `/api/graphics/:id` | Editor roles |
| DELETE | `/api/graphics/:id` | Editor roles |

Editor roles: `SUPER_ADMINISTRATOR`, `ADMINISTRATOR`, `MAINTENANCE`.

## Commissioning Endpoints

Super Admin protected:

| Method | Path |
|---|---|
| POST | `/api/auth/commission/step1-codes` |
| POST | `/api/auth/commission/step2-accounts` |
| POST | `/api/auth/commission/step3-network` |
| POST | `/api/auth/commission/step4-plc` |
| POST | `/api/auth/commission/step5-finalize` |
| GET | `/api/auth/commission/status` |

## Rate Limits (implemented)

| Endpoint | Limit |
|---|---|
| `POST /api/auth/login` | 20 requests / 15 min |
| `POST /api/auth/register` | 10 requests / hour |
| `POST /api/auth/commission/step1-codes` | 5 requests / 15 min |

## Constraints and Pitfalls

- Do not build clients around `/api/auth/refresh`; it is not present.
- Session validity requires both:
  - a valid JWT signature/exp, and
  - an active non-revoked row in `sessions`.
- Some resource surfaces are duplicated (`/api/auth/me` and `/api/users/me`); prefer one consistently in clients.
