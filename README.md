# SwimEx EDGE — Mobile Control Interface

A two-tier embedded pool control platform for SwimEx swim-in-place pools.

## System Overview

```
┌──────────────────┐    Wired Ethernet     ┌──────────────────┐
│  EDGE Server     │══════════════════════►│  PLC / Pool      │
│  (Linux/Windows/ │  MQTT / Modbus TCP /  │  Controller      │
│   Docker)        │  HTTP + Keep-Alive    │                  │
└────────┬─────────┘                       └──────────────────┘
         │ Wi-Fi (primary)
         │ Bluetooth (hidden, Super Admin)
         │
┌────────┴─────────┐    ┌──────────────────┐
│  EDGE Client     │    │  Web Browser     │
│  (Android Kiosk) │    │  (View-only)     │
└──────────────────┘    └──────────────────┘
```

**EDGE Server** — Web application on a Linux/Windows edge device. Hosts the UI, built-in MQTT broker, Modbus TCP server/client, authentication engine, graphics engine, and database.

**EDGE Client** — Android kiosk app that locks down the tablet, boots into the EDGE interface, and prevents exit without Admin/Maintenance credentials.

**PLC Controller** — Connected via wired Ethernet. Controls pool motor, reads air buttons, sends telemetry.

## Repository Structure

```
├── PROJECT_DESCRIPTION.md      # Comprehensive system design document
├── docs/                       # All technical documentation
│   ├── architecture/           #   System architecture & data flow
│   ├── server/                 #   Server setup, config, built-in services
│   ├── client/                 #   Android kiosk client
│   ├── authentication/         #   RBAC, commissioning codes, sessions
│   ├── communication/          #   MQTT, Modbus TCP, HTTP, keep-alive, Bluetooth
│   ├── graphics/               #   SVG rendering, import, editor, animations
│   ├── ui-builder/             #   Drag-and-drop builder, tag binding, theming
│   ├── workouts/               #   Quick Start, Custom, Interval, Presets
│   ├── admin/                  #   Admin panel, user/device management
│   ├── user-profiles/          #   Accounts, usage tracking
│   ├── database/               #   Schema, migrations
│   ├── api/                    #   REST API, WebSocket, error codes
│   ├── deployment/             #   Install, Docker, commissioning, upgrades
│   └── security/               #   Security model, threat mitigation
├── server/                     # EDGE Server source code
│   ├── src/                    #   Application source
│   │   ├── app/                #     Main application entry
│   │   ├── auth/               #     Authentication engine
│   │   ├── mqtt/               #     Built-in MQTT broker
│   │   ├── modbus/             #     Modbus TCP server/client
│   │   ├── http/               #     HTTP/REST layer
│   │   ├── communication/      #     Internal data bridge
│   │   ├── database/           #     Models & migrations
│   │   ├── graphics/           #     Graphics engine
│   │   ├── workouts/           #     Workout logic
│   │   ├── admin/              #     Admin panel
│   │   ├── tags/               #     Unified tag database
│   │   ├── websocket/          #     WebSocket handler
│   │   └── utils/              #     Shared utilities
│   ├── config/                 #   Configuration files
│   ├── templates/              #   5 built-in UI templates
│   ├── assets/                 #   Built-in widgets, icons, graphics
│   ├── tests/                  #   Unit & integration tests
│   ├── docker/                 #   Dockerfile & compose
│   └── installer/              #   Native installer scripts (Linux/Windows)
├── client/                     # EDGE Client (Android kiosk app)
│   └── app/
│       └── src/
│           ├── main/
│           │   ├── java/       #     Kotlin/Java source (kiosk, WebView, BT, Wi-Fi)
│           │   ├── res/        #     Android resources
│           │   └── assets/     #     Web assets
│           └── test/           #     Client tests
└── shared/                     # Shared definitions
    ├── protocols/              #   Protocol message definitions
    └── models/                 #   Shared data models
```

## Key Features

| Feature | Description |
|---|---|
| **Kiosk Mode** | Android tablet boots directly into EDGE; exit requires Admin/Maintenance login |
| **5 Workout Modes** | Quick Start, Custom Programs (10 steps), Interval, Distance Presets, Sprint Presets |
| **Multi-Protocol PLC** | MQTT broker + Modbus TCP server/client + HTTP — all synced via internal data bridge |
| **SVG Graphics Engine** | Import, build, and animate graphics bound to live PLC data (rotation, fill, color, visibility, etc.) |
| **Drag-and-Drop UI Builder** | Visual layout editor with 30+ widgets, 5 templates, live PLC preview |
| **Role-Based Access** | Super Admin, Admin, Maintenance, User, Guest — server-managed auth |
| **Safety Stop** | Automatic pool halt on heartbeat loss; no auto-resume |
| **MAC Registration** | Device-level write access control (unregistered = view-only) |
| **Light/Dark Mode** | User-togglable theme across all templates |
| **User Profiles** | Per-user workout programs, history, usage statistics |

## Quick Start

### Server (Docker)

```bash
docker run -d \
  --name edge-server \
  -p 80:80 -p 1883:1883 -p 502:502 \
  -v edge-data:/data -v edge-config:/config \
  -e ADMIN_USER=admin -e ADMIN_PASS=changeme \
  swimex/edge-server:latest
```

Then open `http://<server-ip>` in a browser to run the commissioning wizard.

### Client (Android)

1. Sideload the `.apk` onto the tablet.
2. Grant Device Admin and all requested permissions.
3. Enter the server URL on first launch.
4. Tablet reboots into kiosk mode.

## Documentation

Start with the [Documentation Index](docs/README.md) or the [Project Description](PROJECT_DESCRIPTION.md) for the full system design.

| Quick Links | |
|---|---|
| [System Architecture](docs/architecture/SYSTEM_OVERVIEW.md) | [Communication Protocols](docs/communication/README.md) |
| [Server Setup](docs/server/SETUP.md) | [Client Setup](docs/client/SETUP.md) |
| [REST API Reference](docs/api/REST_API.md) | [WebSocket API](docs/api/WEBSOCKET_API.md) |
| [Graphics & Animation](docs/graphics/ANIMATION_SYSTEM.md) | [UI Builder](docs/ui-builder/DRAG_AND_DROP.md) |
| [Docker Deployment](docs/deployment/DOCKER_DEPLOYMENT.md) | [Commissioning Guide](docs/deployment/COMMISSIONING_GUIDE.md) |
| [Security Model](docs/security/SECURITY_MODEL.md) | [Database Schema](docs/database/SCHEMA.md) |
