# SwimEx EDGE Server

Web application server for SwimEx swim-in-place pool control.

## Architecture

- **Runtime**: Node.js + TypeScript
- **HTTP**: Express.js REST API + static file serving
- **Database**: SQLite (better-sqlite3)
- **MQTT**: Aedes embedded broker
- **Modbus TCP**: Server (expose data) + Client (poll PLC)
- **WebSocket**: Real-time updates, keepalive heartbeat
- **Auth**: Argon2 password hashing, JWT sessions

## Quick Start

```bash
npm install
npm run build
npm start
```

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `HTTP_PORT` | 80 | HTTP server port |
| `MQTT_PORT` | 1883 | MQTT broker port |
| `MODBUS_PORT` | 502 | Modbus TCP server port |
| `DATA_DIR` | ./data | SQLite database location |
| `CONFIG_DIR` | ./config | Configuration files |
| `ADMIN_USER` | admin | Default admin username |
| `ADMIN_PASS` | *(generated)* | Admin password — set for production, auto-generated if empty |
| `JWT_SECRET` | (dev default) | JWT signing secret |
| `POOL_ID` | default | Pool identifier for MQTT topics |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | - | Self-service user registration |
| POST | `/api/auth/login` | - | Login, returns JWT token |
| POST | `/api/auth/commission` | - | First-run commissioning wizard |
| GET | `/api/auth/me` | JWT | Current user profile |
| GET | `/api/workouts/active` | - | Active workout state |
| POST | `/api/workouts/quick-start` | JWT+MAC | Start Quick Start workout |
| POST | `/api/workouts/start-program` | JWT+MAC | Start saved program |
| POST | `/api/workouts/pause` | JWT+MAC | Pause workout |
| POST | `/api/workouts/stop` | JWT+MAC | Stop workout |
| GET | `/api/workouts/programs` | JWT | List user programs |
| GET | `/api/admin/dashboard` | Admin | System dashboard |
| GET | `/api/admin/devices` | Admin | Device registry |
| GET | `/api/admin/communication` | Admin | Communication configs |
| GET | `/api/admin/tags` | Admin | Object-tag mappings |
| GET | `/api/graphics` | - | Graphic library |
| GET | `/api/health` | - | Health check |

## WebSocket

Connect to `ws://<host>/ws?token=<jwt>` for real-time updates:

- `workout_update` — Workout state changes
- `tag_update` — PLC tag value changes
- `keepalive` — Heartbeat ping/pong
- `connected` — Initial state on connection

## Docker

```bash
cd docker
docker-compose up -d
```

## Project Structure

```
src/
├── app/          # Main entry point
├── auth/         # Authentication engine
├── mqtt/         # Embedded MQTT broker
├── modbus/       # Modbus TCP server/client
├── http/         # Express routes
├── communication/# Internal data bridge
├── database/     # SQLite models & migrations
├── graphics/     # Graphics engine
├── workouts/     # Workout state machine
├── admin/        # Admin panel services
├── tags/         # Unified tag database
├── websocket/    # WebSocket handler
├── shared/       # Shared models/protocols
└── utils/        # Config, logger, errors
```
