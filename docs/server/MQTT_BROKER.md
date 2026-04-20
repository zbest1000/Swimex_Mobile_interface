# SwimEx EDGE Server — MQTT Runtime (Embedded + External)

This document reflects the MQTT implementation in:

- `server/src/mqtt/mqtt-broker.ts`
- `server/src/mqtt/embedded-broker.ts`
- `server/src/shared/protocols.ts`

## Architecture

The server always runs an MQTT **client bridge**. Broker mode is selectable:

| Mode | How to enable | Behavior |
|---|---|---|
| Embedded broker (default) | `MQTT_EXTERNAL=false` (default) | Starts Aedes broker in-process, then connects client bridge to it |
| External broker | `MQTT_EXTERNAL=true` | Skips embedded broker startup and connects to external host/port |

The client bridge subscribes to core topic patterns, writes inbound values to the tag database, and publishes server/workout state.

## Environment Variables

| Variable | Default | Notes |
|---|---|---|
| `MQTT_EXTERNAL` | `false` | `true` = external broker mode |
| `MQTT_HOST` | `localhost` | External broker host |
| `MQTT_PORT` | `1883` | Client target port (also embedded default TCP port) |
| `MQTT_USER` | `edge-server` | MQTT username |
| `MQTT_PASS` | empty | MQTT password |
| `MQTT_BROKER_PORT` | `MQTT_PORT` | Embedded broker TCP override |
| `MQTT_WS_PORT` | `9001` | Embedded broker WebSocket transport |
| `MQTT_AUTH` | `true` | Embedded broker auth enforcement (`false` disables) |
| `POOL_ID` | `default` | Topic namespace base |

## Topic Namespace

Default namespace (from `POOL_ID`):

```text
swimex/<pool_id>/command/...
swimex/<pool_id>/status/...
swimex/<pool_id>/keepalive
```

Core subscriptions by the server client:

- `swimex/<pool_id>/status/#`
- `swimex/<pool_id>/command/#`
- `swimex/<pool_id>/keepalive`

## Keepalive Behavior

- Server publishes `ping` payloads to `swimex/<pool_id>/keepalive`.
- PLC is expected to reply with JSON `{"type":"pong","source":"plc",...}`.
- If no PLC response is seen for `HEARTBEAT_INTERVAL_MS * HEARTBEAT_MISSED_THRESHOLD`, server emits `keepalive:plc_timeout`.
- App startup wires that timeout to workout safety-stop unless `DISABLE_PLC_CHECKS=true`.

## Retained / LWT Messages

On MQTT connect, server publishes retained online state:

- Topic: `swimex/<pool_id>/status/server_online`
- Payload: `{"online":true,"timestamp":...}`

Client LWT is configured so unexpected disconnect publishes retained offline state to the same topic with `online:false`.

## Embedded Broker Authorization Rules

Embedded Aedes authorization enforces pool scoping:

- Publish to `$SYS/...` is denied.
- Publish outside `swimex/<pool_id>/...` is denied.
- Subscribe to `$SYS/...` is allowed.
- Subscribe outside `swimex/<pool_id>/...` is denied, except `#` is explicitly allowed.

If authentication is enabled (`MQTT_AUTH != false`), credentials are validated against configured username/password.

## Embedded Transport and Port Fallbacks

### TCP transport
- Binds to `MQTT_BROKER_PORT` (or `MQTT_PORT`).
- If port is already in use, broker retries on `port + 10`.

### WebSocket transport
- Attempts to bind on `MQTT_WS_PORT` (default `9001`).
- If WS port is in use, WS transport is skipped while TCP remains active.

## Operational Notes

- MQTT connection timeout does not crash startup; server continues and retries in background.
- In embedded mode, the bridge client auto-points to localhost and the effective broker port.
- Incoming MQTT payloads are parsed as JSON when possible, otherwise stored as strings.

## Quick Validation

### Check effective mode in logs
Look for lines similar to:

- `Starting embedded MQTT broker (Aedes)...` (embedded mode)
- `Connecting to external broker at mqtt://...` (external mode)

### Example external mode launch
```bash
MQTT_EXTERNAL=true MQTT_HOST=192.168.10.20 MQTT_PORT=1883 MQTT_USER=edge-server MQTT_PASS='***' npm start
```

### Example embedded mode launch
```bash
MQTT_EXTERNAL=false MQTT_BROKER_PORT=1883 MQTT_WS_PORT=9001 npm start
```

## Troubleshooting

### Broker starts but clients cannot publish
Check topic path. Embedded authorization rejects topics outside `swimex/<pool_id>/...`.

### Embedded broker did not use requested TCP port
Likely collision; it may have moved to `requested_port + 10`. Verify startup logs.

### Repeated PLC heartbeat timeout warnings
PLC is not replying on keepalive topic. For demo environments, set `DISABLE_PLC_CHECKS=true`.

### Background reconnect spam in external mode
Verify broker reachability, credentials, and firewall for `MQTT_HOST:MQTT_PORT`.
