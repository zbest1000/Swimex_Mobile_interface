# AGENTS.md

## Cursor Cloud specific instructions

### Overview

See `.cursor/skills/cloud-agent-starter.md` for comprehensive setup, API testing, commissioning flow, and environment variable reference.

SwimEx EDGE is a two-tier embedded pool control platform. The **EDGE Server** (`server/`) is the primary development target — a Node.js/TypeScript application using Express, SQLite (better-sqlite3), MQTT, Modbus TCP, and WebSocket. The **EDGE Client** (`client/`) is an Android kiosk app (Kotlin/Gradle) and is optional for server development.

### Prerequisites

- **Node.js >= 18** (project uses CommonJS modules, TypeScript ES2022 target)
- **Mosquitto MQTT broker** should be running on `localhost:1883` for full MQTT functionality. Install via `apt-get install mosquitto` and start with `mosquitto -d -p 1883`. The server will retry in the background if Mosquitto is unavailable, but some earlier code versions may crash without it.

### Non-obvious caveats

- **Ports**: Default HTTP port is `80` and Modbus is `502`, both require root. Use `HTTP_PORT=8080 MODBUS_PORT=5020` env vars for dev.
- **MQTT is mandatory at startup**: The server will crash if Mosquitto is not reachable — the MQTT client emits an unhandled `error` event. Always start Mosquitto first.
- **SQLite DB**: Auto-created at `$DATA_DIR/edge.db` (default `./data/edge.db`). Migrations run automatically on startup. Delete the DB file (plus `-shm` and `-wal`) to reset.
- **Pre-existing bug**: `auth-service.ts:121` uses `datetime("now")` (double quotes) in SQLite, which fails. This causes login and registration-with-login to error. This is a known code bug, not a setup issue.
- **PLC keep-alive warnings**: Expected in dev without a PLC connected. The server logs repeated "PLC heartbeat lost" warnings and triggers safety stop on the web UI. Use `DISABLE_PLC_CHECKS=true` env var to suppress PLC timeout checks in dev/demo mode.
- **ESLint config**: Added as `.eslintrc.json` (ESLint v8 format). The `lint` script in `package.json` is `eslint src/ --ext .ts`.
- **Jest config**: Added as `jest.config.js` with `ts-jest` preset. Tests are in `server/tests/unit/`.
- **Test results**: 19/21 tests pass. 2 auth tests fail due to the `datetime("now")` bug mentioned above.
