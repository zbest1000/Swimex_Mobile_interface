# SwimEx EDGE — HTTP/REST Protocol

The EDGE Server exposes HTTP/REST endpoints for client interaction and, when the PLC supports it, for direct PLC configuration and diagnostics. This document covers the endpoint structure, request/response formats, authentication, and integration patterns.

---

## Endpoint Structure

Base URL: `https://{server_host}/api/v1` (or `http://` for local development)

| Resource | Method | Path | Description |
|----------|--------|------|-------------|
| Status | GET | `/pools/{pool_id}/status` | Current pool state, speed, faults |
| Start | POST | `/pools/{pool_id}/command/start` | Start motor / workout |
| Stop | POST | `/pools/{pool_id}/command/stop` | Stop motor / workout |
| Speed | PUT | `/pools/{pool_id}/command/speed` | Set speed setpoint |
| Diagnostics | GET | `/pools/{pool_id}/diagnostics` | Extended diagnostics (PLC HTTP only) |
| Configuration | GET/PUT | `/pools/{pool_id}/config` | Pool configuration (PLC HTTP only) |

---

## Request/Response Examples

### GET /pools/pool-01/status

**Request:**

```http
GET /api/v1/pools/pool-01/status HTTP/1.1
Host: edge.swimex.local
Authorization: Bearer {access_token}
Accept: application/json
```

**Response (200 OK):**

```json
{
  "pool_id": "pool-01",
  "state": "running",
  "speed": 75,
  "faults": [],
  "timestamp": "2025-02-23T14:32:00.000Z",
  "source": "mqtt"
}
```

**Response (200 OK, with faults):**

```json
{
  "pool_id": "pool-01",
  "state": "fault",
  "speed": 0,
  "faults": [
    {"code": 12, "description": "Motor overtemperature", "severity": "critical"}
  ],
  "timestamp": "2025-02-23T14:33:00.000Z",
  "source": "mqtt"
}
```

---

### POST /pools/pool-01/command/start

**Request:**

```http
POST /api/v1/pools/pool-01/command/start HTTP/1.1
Host: edge.swimex.local
Authorization: Bearer {access_token}
Content-Type: application/json

{}
```

**Response (200 OK):**

```json
{
  "pool_id": "pool-01",
  "command": "start",
  "status": "accepted",
  "timestamp": "2025-02-23T14:30:00.000Z"
}
```

**Response (503 Service Unavailable):**

```json
{
  "error": "plc_unavailable",
  "message": "PLC not reachable; command not sent",
  "timestamp": "2025-02-23T14:30:00.000Z"
}
```

---

### PUT /pools/pool-01/command/speed

**Request:**

```http
PUT /api/v1/pools/pool-01/command/speed HTTP/1.1
Host: edge.swimex.local
Authorization: Bearer {access_token}
Content-Type: application/json

{"speed": 75}
```

**Response (200 OK):**

```json
{
  "pool_id": "pool-01",
  "command": "speed",
  "speed": 75,
  "status": "accepted",
  "timestamp": "2025-02-23T14:32:15.000Z"
}
```

**Response (400 Bad Request):**

```json
{
  "error": "invalid_speed",
  "message": "Speed must be between 0 and 100",
  "timestamp": "2025-02-23T14:32:15.000Z"
}
```

---

### GET /pools/pool-01/diagnostics (PLC HTTP Interface)

**Request:**

```http
GET /api/v1/pools/pool-01/diagnostics HTTP/1.1
Host: edge.swimex.local
Authorization: Bearer {access_token}
Accept: application/json
```

**Response (200 OK):**

```json
{
  "pool_id": "pool-01",
  "motor_temp": 45.2,
  "water_level": 98,
  "power_draw": 1250.5,
  "run_time_seconds": 3600,
  "firmware_version": "2.1.4",
  "timestamp": "2025-02-23T14:35:00.000Z"
}
```

---

## Authentication Options

| Method | Header | Use Case |
|--------|--------|----------|
| Bearer Token | `Authorization: Bearer {access_token}` | Session-based auth; primary for clients |
| API Key | `X-API-Key: {api_key}` | Machine-to-machine; integrations |
| Basic Auth | `Authorization: Basic {base64(user:pass)}` | Legacy; admin tools |

### API Key Example

```http
GET /api/v1/pools/pool-01/status HTTP/1.1
Host: edge.swimex.local
X-API-Key: sk_live_abc123xyz789
Accept: application/json
```

### Basic Auth Example

```http
GET /api/v1/pools/pool-01/status HTTP/1.1
Host: edge.swimex.local
Authorization: Basic dXNlcjpwYXNzd29yZA==
Accept: application/json
```

---

## Polling vs Webhook Patterns

### Polling

| Parameter | Recommended | Notes |
|-----------|--------------|-------|
| Status interval | 1–2 s | Balance between freshness and load |
| Diagnostics interval | 5–10 s | Lower priority data |
| Backoff on error | Exponential | 1s, 2s, 4s, 8s, max 30s |

**Example polling sequence:**

```
Client                    Server
  |                          |
  |-- GET /status ---------->|
  |<-- 200 OK ---------------|
  |                          |
  |  [wait 2s]               |
  |                          |
  |-- GET /status ---------->|
  |<-- 200 OK ---------------|
```

### Webhook (Server Push)

For real-time updates, use WebSocket instead of HTTP polling:

| Endpoint | Protocol | Purpose |
|----------|----------|---------|
| `wss://{host}/ws/status` | WebSocket | Real-time status updates |
| `wss://{host}/ws/events` | WebSocket | Event stream (start, stop, fault) |

WebSocket provides push-based delivery; no polling required. See [API](../api/) documentation for WebSocket message formats.

---

## Error Codes

| HTTP Code | Error Key | Description |
|-----------|-----------|-------------|
| 400 | invalid_request | Malformed request body or parameters |
| 401 | unauthorized | Missing or invalid authentication |
| 403 | forbidden | Insufficient permissions |
| 404 | not_found | Pool not found |
| 503 | plc_unavailable | PLC not reachable |

---

## Related Documentation

- [MQTT Protocol](MQTT_PROTOCOL.md) — Server uses MQTT to communicate with PLC
- [API](../api/) — Full REST API reference
- [Authentication](../authentication/) — Roles, permissions, session management
