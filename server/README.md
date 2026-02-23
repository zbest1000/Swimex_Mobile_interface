# EDGE Server

The EDGE Server is the primary application backend for the SwimEx EDGE platform. It runs on a Linux or Windows edge device (or as a Docker container) and hosts all core services.

## Components

| Component | Directory | Description |
|---|---|---|
| Main Application | `src/app/` | Application entry point, startup, dependency injection |
| Authentication | `src/auth/` | User accounts, RBAC, session tokens, commissioning codes |
| MQTT Broker | `src/mqtt/` | Built-in MQTT v3.1.1/v5.0 broker for PLC communication |
| Modbus TCP | `src/modbus/` | Built-in Modbus TCP server (exposes registers) and client (polls PLC) |
| HTTP/REST | `src/http/` | REST API for client communication, admin endpoints |
| Communication Bridge | `src/communication/` | Internal data bridge syncing MQTT, Modbus, and HTTP via tag database |
| Database | `src/database/` | ORM models and database migrations |
| Graphics Engine | `src/graphics/` | SVG rendering, graphic library, animation binding engine |
| Workouts | `src/workouts/` | Workout mode logic (Quick Start, Custom, Interval, Presets) |
| Admin | `src/admin/` | Admin panel logic (user management, device registration, network config) |
| Tag Database | `src/tags/` | Unified tag store — single source of truth for all protocols |
| WebSocket | `src/websocket/` | Real-time client communication (status updates, commands) |
| Utilities | `src/utils/` | Shared helpers, logging, validation |

## Other Directories

| Directory | Description |
|---|---|
| `config/` | Configuration files (server.yml, mqtt.yml, modbus.yml) |
| `templates/` | 5 built-in UI templates (Classic, Modern, Clinical, Sport, Minimal) |
| `assets/` | Built-in SVG widgets, icons, and graphics |
| `tests/` | Unit and integration test suites |
| `docker/` | Dockerfile, docker-compose.yml, entrypoint scripts |
| `installer/` | Native installer scripts for Linux (.deb/.rpm) and Windows (.msi) |

## Documentation

- [Server Setup Guide](../docs/server/SETUP.md)
- [Configuration Reference](../docs/server/CONFIGURATION.md)
- [MQTT Broker](../docs/server/MQTT_BROKER.md)
- [Modbus TCP Server/Client](../docs/server/MODBUS_TCP.md)
- [Tag Database](../docs/server/TAG_DATABASE.md)
- [REST API](../docs/api/REST_API.md)
- [Docker Deployment](../docs/deployment/DOCKER_DEPLOYMENT.md)
