# SwimEx EDGE Server Configuration Reference

This document reflects the current server runtime configuration in `server/src/utils/config.ts` and related startup code.

## Configuration Model

The server is currently **environment-variable driven**. There is no runtime parser for `edge.conf`/YAML in the server process.

Primary defaults are loaded in `loadConfig()` and used by:

- `server/src/app/index.ts` (startup sequence)
- `server/src/http/server.ts` (HTTP/CORS/security headers)
- `server/src/mqtt/*` (embedded/external broker behavior)
- `server/src/admin/wifi-service.ts` (generated hostapd/dnsmasq files under `CONFIG_DIR`)

## Core Environment Variables

| Variable | Default | Used for |
|---|---:|---|
| `HTTP_PORT` | `80` | Express HTTP server listen port |
| `HTTPS_PORT` | `443` | Reserved in config; HTTPS server not started by default entrypoint |
| `MODBUS_PORT` | `502` | Modbus TCP server listen port |
| `MQTT_PORT` | `1883` | MQTT client target port and embedded broker default TCP port |
| `MQTT_TLS_PORT` | `8883` | Exposed in config object for TLS port conventions |
| `DATA_DIR` | `server/data` | SQLite path root (`$DATA_DIR/edge.db`) |
| `CONFIG_DIR` | `server/config` | Generated AP config destination (`hostapd.conf`, `dnsmasq.conf`) |
| `POOL_ID` | `default` | MQTT topic namespace (`swimex/<poolId>/...`) |

### Developer defaults (non-root ports)

```bash
HTTP_PORT=8080 MODBUS_PORT=5020 npm start
```

## Auth and Session Variables

| Variable | Default | Notes |
|---|---|---|
| `JWT_SECRET` | random ephemeral value | If unset, generated at boot; all prior JWTs become invalid after restart |
| `JWT_EXPIRES_IN` | `24h` | JWT `exp` claim duration |
| `ADMIN_USER` | `admin` | Seed/config default admin username |
| `ADMIN_PASS` | empty | If set, overrides seeded `admin` password on first run |
| `SUPERADMIN_PASS` | unset | If set, overrides seeded `superadmin` password on first run |

> Constraint: session DB rows are currently written with `expires_at = now + 24h` in `auth-service.ts`. Keep `JWT_EXPIRES_IN` aligned with that window to avoid confusing mismatches.

## MQTT Mode and Connectivity Variables

| Variable | Default | Effect |
|---|---|---|
| `MQTT_EXTERNAL` | `false` | `false`: start embedded Aedes broker; `true`: connect to external broker only |
| `MQTT_HOST` | `localhost` | Host for external broker mode |
| `MQTT_USER` | `edge-server` | MQTT client/broker auth username |
| `MQTT_PASS` | empty | MQTT client/broker auth password |
| `MQTT_BROKER_PORT` | `MQTT_PORT` | Embedded broker TCP listen port override |
| `MQTT_WS_PORT` | `9001` | Embedded broker WebSocket transport port |
| `MQTT_AUTH` | `true` | Embedded broker auth on/off (`false` disables credential check) |

See [MQTT_BROKER.md](MQTT_BROKER.md) for runtime behavior details.

## Logging Variables

| Variable | Default | Effect |
|---|---|---|
| `LOG_LEVEL` | `info` | Minimum emitted level (`debug`, `info`, `security`, `warn`, `error`, `fatal`) |
| `LOG_FILE` | empty | If set, enables file logging |
| `LOG_FORMAT` | `text` | `text` or `json` file output format |
| `LOG_MAX_SIZE_MB` | `10` | Rotation threshold per log file |
| `LOG_MAX_FILES` | `5` | Number of rotated files retained |

File logging is configured in `app/index.ts` via `configureFileLogging(...)`.

## Safety / Simulation Variables

| Variable | Default | Effect |
|---|---|---|
| `HEARTBEAT_INTERVAL_MS` | `2000` | Keepalive ping interval |
| `HEARTBEAT_MISSED_THRESHOLD` | `3` | Number of missed intervals before timeout event |
| `DISABLE_PLC_CHECKS` | `false` | Suppresses keepalive timeout safety-stop trigger (demo/dev only) |
| `SIMULATOR_MODE` | `false` | Enables internal PLC simulator (`true` or `1`) |

## HTTP Security / Access Variables

| Variable | Default | Effect |
|---|---|---|
| `CORS_ORIGIN` | allow all | Comma-separated CORS allowlist when set |
| `ENABLE_HSTS` | `false` | Adds `Strict-Transport-Security` header when `true` |

## Data and Persistence Notes

- SQLite DB file: `$DATA_DIR/edge.db`
- Migrations run automatically at startup.
- First run seeds default accounts if no users exist.
- Delete `edge.db`, `edge.db-shm`, and `edge.db-wal` to fully reset local state.

## Troubleshooting

### Sessions invalid after restart
Cause: `JWT_SECRET` was not set, so a random secret was generated at boot.

Fix: set a stable `JWT_SECRET` in the environment.

### Frequent PLC heartbeat timeout warnings in demo/dev
Cause: no PLC response to keepalive pings.

Fix: enable simulator (`SIMULATOR_MODE=true`) or suppress checks (`DISABLE_PLC_CHECKS=true`) for demo environments.

### MQTT client cannot connect

1. Confirm mode (`MQTT_EXTERNAL` true/false).
2. For external mode, verify `MQTT_HOST`, `MQTT_PORT`, credentials.
3. For embedded mode, check local port collisions (broker may auto-shift TCP port by +10).
