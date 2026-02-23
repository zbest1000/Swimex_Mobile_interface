# SwimEx EDGE — API Documentation

This section contains the API reference for the SwimEx EDGE platform. The EDGE Server exposes a REST API and WebSocket interface for pool control, workout management, and system administration.

## API Overview

| API Type | Protocol | Base URL | Purpose |
|----------|----------|----------|---------|
| REST | HTTP/HTTPS | `/api` | Authentication, CRUD operations, admin endpoints |
| WebSocket | WS/WSS | `/ws` | Real-time pool control, state updates, commands |

## Documentation Index

| Document | Description |
|----------|-------------|
| [REST_API.md](REST_API.md) | REST API reference. Authentication, workouts, users, admin, tags, system endpoints. Request/response examples. |
| [WEBSOCKET_API.md](WEBSOCKET_API.md) | WebSocket events. Connection, authentication, server events (speed_update, state_change, etc.), client commands. |
| [ERROR_CODES.md](ERROR_CODES.md) | Error code reference. HTTP status codes, application error codes, error response format. |

## Authentication

Most API endpoints require authentication. Use one of:

| Method | Description |
|--------|-------------|
| Bearer Token | `Authorization: Bearer <access_token>` |
| Session Cookie | Cookie set by login endpoint |

Obtain a token via `POST /api/auth/login`. Refresh with `POST /api/auth/refresh`.

## Base URL

| Environment | REST | WebSocket |
|-------------|------|-----------|
| HTTP | `http://<server-ip>:80/api` | `ws://<server-ip>:80/ws` |
| HTTPS | `https://<server-ip>:443/api` | `wss://<server-ip>:443/ws` |

## Rate Limiting

| Limit | Value |
|-------|-------|
| Login attempts | 5 per minute per IP |
| API requests | 100 per minute per user (authenticated) |
| WebSocket connections | 10 per user |

## Versioning

The API version is included in responses:

```json
{
  "data": { ... },
  "apiVersion": "1.0"
}
```

Breaking changes will increment the major version. Minor versions add fields without removing existing ones.

## Common Request Headers

| Header | Required | Description |
|--------|----------|-------------|
| Authorization | Yes (most endpoints) | `Bearer <access_token>` |
| Content-Type | Yes (POST/PUT) | `application/json` |
| Accept | No | `application/json` (default) |

## Common Response Headers

| Header | Description |
|--------|-------------|
| Content-Type | `application/json` |
| X-Request-Id | Request ID for debugging |
| X-RateLimit-Limit | Request limit per window |
| X-RateLimit-Remaining | Remaining requests in window |

## Pagination

List endpoints support pagination via query parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| page | 1 | Page number |
| limit | 20 | Items per page (max 100) |

Response includes `total`, `page`, `limit` for client-side pagination.

## Error Handling

All errors return JSON with `error` object. See [ERROR_CODES.md](ERROR_CODES.md) for full reference.

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid username or password"
  }
}
```

## Related Documentation

- [Authentication](../authentication/README.md) — Roles, permissions, session management
- [Communication](../communication/README.md) — MQTT, Modbus, HTTP protocols
- [Server Configuration](../server/CONFIGURATION.md) — API port, TLS, CORS settings
