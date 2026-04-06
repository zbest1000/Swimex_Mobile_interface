# SwimEx EDGE Server Configuration Reference

This document reflects the current server runtime behavior in `server/src/utils/config.ts`, `server/src/utils/logger.ts`, and admin services.

## Configuration Model

The server currently reads runtime configuration from environment variables plus built-in defaults.

## Config Precedence

1. Environment variables (highest)
2. Built-in defaults in code (lowest)

There is no generic `edge.conf`/`edge.yaml` parser in the current server runtime.

## Core Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_PORT` | `80` | HTTP listen port |
| `HTTPS_PORT` | `443` | Reserved HTTPS port setting |
| `MQTT_PORT` | `1883` | MQTT plaintext port |
| `MQTT_TLS_PORT` | `8883` | MQTT TLS port |
| `MODBUS_PORT` | `502` | Modbus TCP server port |
| `DATA_DIR` | `./data` | Data directory (SQLite DB at `<DATA_DIR>/edge.db`) |
| `CONFIG_DIR` | `./config` | Config directory for generated files (for example `hostapd.conf`) |
| `POOL_ID` | `default` | Pool identifier used in core tag addresses |
| `JWT_SECRET` | random per process | JWT signing secret (set explicitly for persistent sessions) |
| `JWT_EXPIRES_IN` | `24h` | JWT access token expiry |
| `ADMIN_USER` | `admin` | Seeded admin username |
| `ADMIN_PASS` | empty | Optional seeded admin password |
| `SUPERADMIN_PASS` | empty | Optional seeded super-admin password |
| `HEARTBEAT_INTERVAL_MS` | `2000` | PLC heartbeat interval |
| `HEARTBEAT_MISSED_THRESHOLD` | `3` | Missed heartbeats before timeout handling |
| `LOG_LEVEL` | `info` | Console/file minimum log level |
| `LOG_FILE` | empty | File path to enable file logging |
| `LOG_FORMAT` | `text` | File log format: `text` or `json` |
| `LOG_MAX_SIZE_MB` | `10` | Per-file rotation size limit |
| `LOG_MAX_FILES` | `5` | Number of rotated files to keep |
| `SIMULATOR_MODE` | `false` | Start PLC simulator when `true` or `1` |
| `MQTT_EXTERNAL` | `false` | Set `true` to use an external MQTT broker instead of embedded broker |
| `DISABLE_PLC_CHECKS` | `false` | Disable PLC keepalive safety checks (dev/demo only) |
| `CORS_ORIGIN` | unset | Comma-separated allowlist for CORS origins |
| `ENABLE_HSTS` | `false` | Set HSTS header when `true` |

## Recommended Dev Startup

Use non-privileged ports and keep PLC checks disabled when no PLC is attached:

```bash
HTTP_PORT=8080 MODBUS_PORT=5020 DISABLE_PLC_CHECKS=true npm run dev
```

## Ports Reference

| Port | Protocol | Default | Notes |
|------|----------|---------|-------|
| `HTTP_PORT` | HTTP | `80` | Use non-root port (for example `8080`) in local dev |
| `MQTT_PORT` | MQTT | `1883` | Used by embedded broker unless `MQTT_EXTERNAL=true` |
| `MQTT_TLS_PORT` | MQTTS | `8883` | TLS port setting |
| `MODBUS_PORT` | Modbus TCP | `502` | Use non-root port (for example `5020`) in local dev |

## Wi-Fi AP Constraints (Admin)

These constraints come from `server/src/admin/wifi-service.ts`.

| Field | Constraint |
|-------|------------|
| `ssid` | 1-32 characters |
| `password` | 8-63 characters |
| `channel` | 2.4 GHz channels `1-11` |
| `maxClients` | integer `1-50` |
| `interface` | alphanumeric/underscore/hyphen, max 15 chars |
| `band` | fixed to `2.4GHz` |

Operational details:

- AP network gateway is `192.168.4.1`.
- DHCP pool is currently fixed to `192.168.4.2-192.168.4.20` (24h lease).
- Wi-Fi config is stored in `system_config.wifi_ap_config`.

## Logging

Supported log levels:

`debug`, `info`, `security`, `warn`, `error`, `fatal`

File logging behavior:

- Enabled only when `LOG_FILE` is set.
- `LOG_FORMAT=json` writes structured JSON lines.
- Rotates at `LOG_MAX_SIZE_MB` and keeps `LOG_MAX_FILES` archives.

Example:

```bash
LOG_LEVEL=debug LOG_FILE=/var/log/swimex-edge/edge.log LOG_FORMAT=json LOG_MAX_SIZE_MB=20 LOG_MAX_FILES=10 npm start
```

## Security-Sensitive Configuration Behavior

- If `JWT_SECRET` is unset, the server generates an ephemeral random secret at startup. Existing sessions become invalid after restart.
- `JWT_SECRET` should be at least 32 characters in production.
- Config export (`/api/admin/config/export`) excludes sensitive system keys such as `jwt_secret` and `wifi_password`.
- Exported Wi-Fi password is emitted as `password_encrypted` (AES-256-GCM, key derived from `JWT_SECRET`).
- Config import decrypts `password_encrypted`; import fails for Wi-Fi password if the target server uses a different JWT secret.
