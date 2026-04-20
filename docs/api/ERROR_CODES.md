# SwimEx EDGE — Error Code Reference

This page documents the error formats and codes currently emitted by:

- `server/src/utils/errors.ts`
- `server/src/http/server.ts`
- `server/src/http/routes/*.ts`
- `server/src/websocket/ws-handler.ts`

## REST Error Envelope

Most REST failures return:

```json
{
  "success": false,
  "error": {
    "code": "SOME_CODE",
    "message": "Human-readable message"
  }
}
```

## Common HTTP Statuses

| HTTP | Typical meaning in this server |
|---|---|
| 400 | Validation/input errors |
| 401 | Missing/invalid/expired auth |
| 403 | Authenticated but not authorized |
| 404 | Resource/route not found |
| 429 | Rate limit hit |
| 500 | Internal server error |

## Canonical AppError Codes (shared)

These are emitted by `AppError` subclasses in `utils/errors.ts`:

| Code | HTTP | Source |
|---|---:|---|
| `AUTH_REQUIRED` | 401 | `AuthError` |
| `INSUFFICIENT_PERMISSIONS` | 403 | `ForbiddenError` |
| `RESOURCE_NOT_FOUND` | 404 | `NotFoundError` |
| `VALIDATION_ERROR` | 400 | `ValidationError` |
| `RATE_LIMITED` | 429 | `RateLimitError` |
| `VIEW_ONLY` | 403 | `DeviceNotRegisteredError` |

## Additional REST Codes Seen in Routes

Some handlers return literal code strings (not `AppError` constants):

| Code | Typical HTTP | Where seen |
|---|---:|---|
| `NOT_FOUND` | 404 | public i18n/logo/misc resource routes |
| `SERVER_ERROR` | 500 | generic fallback/internal handler |
| `RATE_LIMIT` | 429 | express-rate-limit messages in auth routes |
| `INVALID_CREDENTIALS` | 400 | current-password check in `users/me/password` |

## WebSocket Error Payloads

WebSocket errors are sent as:

```json
{
  "type": "error",
  "payload": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required for commands"
  }
}
```

Common WS error `payload.code` values:

| Code | Meaning |
|---|---|
| `PARSE_ERROR` | Invalid JSON message |
| `AUTH_REQUIRED` | Command/subscription needs authenticated user |
| `UNKNOWN_TYPE` | Unknown WS message `type` |
| `UNKNOWN_COMMAND` | Unknown command in `type: "command"` |
| `FORBIDDEN` | Role restriction (e.g., wildcard tag subscription) |

## Client Handling Recommendations

| HTTP | Recommended client action |
|---:|---|
| 400 | Show validation feedback; allow correction |
| 401 | Clear auth state and redirect to login |
| 403 | Show access denied; hide disallowed controls |
| 404 | Show not-found state; optionally redirect |
| 429 | Back off and retry after cooldown |
| 500 | Show generic failure and capture request context |

## Notes

- The codebase currently contains both shared error constants and a few legacy literal error codes.
- If you build strict client-side error handling, include a fallback for unknown `error.code` values.
