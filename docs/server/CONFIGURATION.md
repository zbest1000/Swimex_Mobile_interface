# SwimEx EDGE Server Configuration Reference

This page documents the **runtime configuration that is actually used by the current server code** (`server/src/utils/config.ts`, `server/src/http/server.ts`, `server/src/app/index.ts`).

## Configuration Model

- The server is configured by **environment variables**.
- There is **no `edge.conf` / YAML parser** in the current server runtime.
- If a variable is not set, a built-in default is used.

## Environment Variables

### Core Runtime

| Variable | Default | Used by | Notes |
|---|---:|---|---|
| `HTTP_PORT` | `80` | HTTP server | Main REST/Web UI port. |
| `HTTPS_PORT` | `443` | config object only | Parsed, but not currently bound by startup. |
| `DATA_DIR` | `server/data` (resolved path) | SQLite and app data | DB file is created under this directory. |
| `CONFIG_DIR` | `server/config` (resolved path) | Wi-Fi config files | Used by Wi-Fi AP writer (`hostapd.conf`, `dnsmasq.conf`). |
| `POOL_ID` | `default` | MQTT topics/tags | Affects topic namespace and core tag addresses. |
| `SIMULATOR_MODE` | `false` | startup | Accepts `true` or `1` to enable PLC simulator. |

### MQTT / Modbus / Keepalive

| Variable | Default | Used by | Notes |
|---|---:|---|---|
| `MQTT_PORT` | `1883` | MQTT client + embedded broker | Main MQTT port. |
| `MQTT_TLS_PORT` | `8883` | config object only | Parsed; TLS listener is not started by default path. |
| `MQTT_EXTERNAL` | `false` | MQTT bootstrap | Set `true` to disable embedded broker and connect externally. |
| `MODBUS_PORT` | `502` | Modbus server | Modbus TCP listen port. |
| `HEARTBEAT_INTERVAL_MS` | `2000` | MQTT keepalive + WS heartbeat | Ping/check cadence. |
| `HEARTBEAT_MISSED_THRESHOLD` | `3` | MQTT keepalive + WS heartbeat | Timeout threshold multiplier. |
| `DISABLE_PLC_CHECKS` | `false` | MQTT keepalive | Set `true` to suppress PLC timeout safety checks (demo/dev only). |

### Auth / Session

| Variable | Default | Notes |
|---|---:|---|
| `JWT_SECRET` | random ephemeral secret | If missing, server generates a random secret at startup and logs a warning. |
| `JWT_EXPIRES_IN` | `24h` | JWT expiry string. |
| `ADMIN_USER` | `admin` | Default admin username seed input. |
| `ADMIN_PASS` | *(empty string)* | Default admin password seed input. |

### Logging

| Variable | Default | Notes |
|---|---:|---|
| `LOG_LEVEL` | `info` | Supported levels: `debug`, `info`, `security`, `warn`, `error`, `fatal`. |
| `LOG_FILE` | *(disabled)* | If set, enables rotating file logs. |
| `LOG_FORMAT` | `text` | `text` or `json`. |
| `LOG_MAX_SIZE_MB` | `10` | Rotation threshold per file. |
| `LOG_MAX_FILES` | `5` | Number of rotated files retained. |

### HTTP Security / Access

| Variable | Default | Notes |
|---|---:|---|
| `CORS_ORIGIN` | allow all origins | Comma-separated allowlist when set. |
| `ENABLE_HSTS` | `false` | When `true`, adds Strict-Transport-Security response header. |

## Logging Behavior

- Logs always go to console (stdout/stderr).
- `security` level is between `info` and `warn`.
- File logging creates parent directories automatically and rotates files when size exceeds `LOG_MAX_SIZE_MB`.
- File permissions are restrictive (`0640` for files, `0700` for created directories).

Example:

```bash
LOG_LEVEL=security \
LOG_FILE=/var/log/swimex-edge/server.log \
LOG_FORMAT=json \
LOG_MAX_SIZE_MB=20 \
LOG_MAX_FILES=7 \
node dist/app/index.js
```

## Admin Config Backup / Restore Runbook

The server exposes configuration backup/restore endpoints in `server/src/http/routes/admin-routes.ts`.

| Endpoint | Role | Purpose |
|---|---|---|
| `GET /api/admin/config/export` | Admin+ | Export system/admin configuration JSON. |
| `POST /api/admin/config/import` | Super Admin | Import configuration JSON with section filtering/overwrite options. |

### Export Example

```bash
curl -H "Authorization: Bearer <token>" \
  http://<edge-host>/api/admin/config/export
```

### Import Example

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  http://<edge-host>/api/admin/config/import \
  -d '{
    "config": { "version": "1.0.0", "system": {}, "communicationConfigs": [] },
    "overwrite": true,
    "sections": ["all"]
  }'
```

### Import Section Names

`system`, `communicationConfigs`, `tagMappings`, `featureFlags`, `devices`, `layouts`, `branding`, `wifiConfig`, or `all`.

## Security Constraint: Wi-Fi Password Export/Import

- Exported `wifiConfig` replaces plaintext `password` with `password_encrypted`.
- Encryption is AES-256-GCM with a key derived from `JWT_SECRET`.
- On import, decryption fails if source and destination use different `JWT_SECRET` values.

Operational guidance:

1. Set a stable `JWT_SECRET` in production.
2. Keep `JWT_SECRET` consistent when migrating backups between servers.
3. If import reports `wifiConfig: could not decrypt WiFi password`, re-enter Wi-Fi password after restore.

## Common Pitfalls

### Environment variables from old docs do not work

Old `EDGE_*` names (for example `EDGE_HTTP_PORT`) are not read by current runtime. Use `HTTP_PORT`, `MQTT_PORT`, `MODBUS_PORT`, etc.

### Privileged port binding in local development

Ports `80` and `502` generally require elevated privileges. For local dev:

```bash
HTTP_PORT=8080 MODBUS_PORT=5020 npm run dev
```

### Ephemeral JWT secret breaks cross-restart session continuity

If `JWT_SECRET` is omitted, the server generates a random one at each restart. Existing sessions and some encrypted export material will not remain valid across restarts.
