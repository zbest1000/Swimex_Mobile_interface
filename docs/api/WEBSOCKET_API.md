# SwimEx EDGE — WebSocket API Reference

This reference is validated against `server/src/websocket/ws-handler.ts`.

## Endpoint

```text
ws://<server-ip>:<HTTP_PORT>/ws
```

Optional token-in-URL is supported:

```text
ws://<server-ip>:<HTTP_PORT>/ws?token=<jwt>
```

## Message Envelope

Messages are JSON objects:

```json
{
  "type": "message_type",
  "payload": {},
  "timestamp": 1713628800000
}
```

`timestamp` is added by server if not supplied.

## Authentication

Two supported patterns:

1. Connect with `?token=<jwt>` query param.
2. Send an `authenticate` message after connect:

```json
{
  "type": "authenticate",
  "payload": {
    "token": "<jwt>"
  }
}
```

### Auth result messages

Success:

```json
{
  "type": "authenticated",
  "payload": {
    "userId": "uuid",
    "username": "admin",
    "role": "ADMINISTRATOR"
  }
}
```

Failure:

```json
{
  "type": "auth_error",
  "payload": {
    "message": "Invalid or expired token"
  }
}
```

> Constraint: WebSocket authentication currently validates JWT signature/expiry, but does not run the REST middleware's `sessions` table revocation check.

## Server -> Client Message Types

| Type | Purpose |
|---|---|
| `connected` | Initial connection snapshot (client id, auth state, pool id, connection status) |
| `authenticated` | Auth success confirmation |
| `auth_error` | Auth failure |
| `keepalive` | Pong response payloads |
| `workout_update` | Workout lifecycle events/ticks |
| `tag_update` | Subscribed tag value updates |
| `tag_value` | Response to `get_tag` |
| `tags_snapshot` | Response to `get_tags` |
| `connection_status` | MQTT/Modbus/WS status heartbeat |
| `command_ack` | Command accepted |
| `command_error` | Command failed |
| `safety_stop` | Broadcast when safety stop is triggered |
| `error` | Generic protocol/auth/parse errors |

## Client -> Server Message Types

| Type | Payload fields | Notes |
|---|---|---|
| `authenticate` | `token` | Authenticates socket user |
| `keepalive` | `sequenceNumber` (optional) | Server responds with `keepalive` pong |
| `command` | `command`, plus command-specific fields | Workout and tag commands |
| `subscribe_tags` | `tags: string[]` | Wildcard `*` requires admin/maintenance role |
| `unsubscribe_tags` | `tags: string[]` | Stops updates for listed tags |
| `get_tag` | `address` | Returns `tag_value` |
| `get_tags` | `addresses: string[]` | Returns `tags_snapshot` |
| `get_workout` | none | Returns current workout snapshot |

## Command Payloads

Sent as:

```json
{
  "type": "command",
  "payload": {
    "command": "QUICK_START",
    "speed": 50,
    "durationMs": null
  }
}
```

Supported `command` values:

- `QUICK_START`
- `START_PROGRAM` (`programId` required)
- `START_PRESET` (`type`, `level`)
- `START_INTERVAL` (`sets`, `step1`, `step2`)
- `START`
- `STOP`
- `PAUSE`
- `RESUME`
- `SET_SPEED` (`speed`)
- `ADJUST_SPEED` (`delta`)
- `WRITE_TAG` (`tagAddress`, `value`) — restricted to `SUPER_ADMINISTRATOR`, `ADMINISTRATOR`, `MAINTENANCE`

## Keepalive and Disconnect Behavior

- Server sends WebSocket ping frames every `HEARTBEAT_INTERVAL_MS`.
- Missed pings are counted; socket is terminated after `HEARTBEAT_MISSED_THRESHOLD` misses.
- Clients may also send `keepalive` messages and receive pong payloads.

## Reconnection Guidance

On disconnect:

1. Reconnect to `/ws`.
2. Re-authenticate (`authenticate` message or `?token=`).
3. Re-send tag subscriptions.
4. Re-fetch workout snapshot (`get_workout`) if needed.

## Minimal Example Session

```text
Client -> {"type":"authenticate","payload":{"token":"..."}}
Server <- {"type":"authenticated","payload":{"userId":"...","username":"...","role":"..."}}
Client -> {"type":"command","payload":{"command":"SET_SPEED","speed":55}}
Server <- {"type":"command_ack","payload":{"command":"SET_SPEED","success":true}}
Server <- {"type":"workout_update","payload":{...}}
```
