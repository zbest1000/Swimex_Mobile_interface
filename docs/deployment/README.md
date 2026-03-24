# SwimEx EDGE — Deployment Documentation

This section covers all deployment-related documentation for the SwimEx EDGE platform, from server installation to client setup and system commissioning.

## Overview

The SwimEx EDGE platform consists of two main components:

| Component | Description | Deployment Options |
|-----------|--------------|-------------------|
| **EDGE Server** | Central control server, MQTT broker, Modbus gateway, web API | Linux portable, Windows EXE, Raspberry Pi, Docker, native (from source) |
| **EDGE Client** | Android kiosk app for pool control tablets | APK sideload |
| **Web Client** | Any modern browser on the same network | No installation needed |

## Deployment Documentation Index

| Document | Description |
|----------|-------------|
| [SERVER_INSTALLATION.md](SERVER_INSTALLATION.md) | Native server installation for Linux (.deb/.rpm/shell script) and Windows (.msi/.exe). Prerequisites, hardware requirements, systemd/Windows Service setup. |
| [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) | Docker image deployment using `swimex/edge-server:latest`. Environment variables, volumes, ports, docker-compose example. |
| [CLIENT_INSTALLATION.md](CLIENT_INSTALLATION.md) | Android APK sideload procedure. Permissions, first-launch wizard, kiosk mode configuration. |
| [COMMISSIONING_GUIDE.md](COMMISSIONING_GUIDE.md) | Full first-run commissioning workflow. Commissioning codes, admin accounts, network config, PLC protocol selection. |
| [UPGRADE_GUIDE.md](UPGRADE_GUIDE.md) | Upgrade procedures for server and client. Database migrations, backup/restore, rollback. |

## Release Artifacts (CI/CD)

The GitHub Actions `Build and Release` workflow produces platform-specific packages:

| Artifact | Platform | Contents |
|----------|----------|----------|
| `-linux-x64.tar.gz` | Linux x64 | Self-contained package with embedded Node.js binary. Run `./swimex-edge-server.sh`. |
| `.tar.gz` / `.zip` | Any OS (generic) | Compiled JS, assets, installer scripts. Requires Node.js 18+. |
| `-windows-x64.zip` | Windows x64 | Self-contained package with embedded `node.exe`. Double-click `.bat` to start. |
| `-rpi-arm.tar.gz` | Raspberry Pi (ARM) | Compiled JS, assets, RPi installer script. Installs as systemd service. |
| Docker image | `linux/amd64`, `linux/arm64` | Multi-arch image pushed to GHCR or Docker Hub. |

See [MANUAL.md](../../MANUAL.md) § 16 (Builds & Releases) for workflow details.

## Deployment Topology

```
                    +------------------+
                    |   EDGE Server    |
                    |  (Dual NIC)      |
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                                       |
    Ethernet (PLC)                          Wi-Fi (Clients)
         |                                       |
    +----+----+                            +-----+-----+
    |   PLC   |                            |  Tablets  |
    | Modbus  |                            |  (APK)    |
    |  MQTT   |                            +-----------+
    +---------+
```

## Quick Start

1. **Server**: Choose [native installation](SERVER_INSTALLATION.md) or [Docker](DOCKER_DEPLOYMENT.md).
2. **Post-install**: Open `http://<server-ip>:<port>` in a browser to run the setup wizard.
3. **Client**: Install the APK on Android tablets per [CLIENT_INSTALLATION.md](CLIENT_INSTALLATION.md).
4. **Commissioning**: Complete the [COMMISSIONING_GUIDE.md](COMMISSIONING_GUIDE.md) for first-run setup.

## Hardware Requirements Summary

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Server CPU | 2 cores, 1.5 GHz | 4 cores, 2.0 GHz |
| Server RAM | 2 GB | 4 GB |
| Server Storage | 8 GB free | 16 GB SSD |
| Server Network | Single NIC | Dual NIC (Ethernet + Wi-Fi) |
| Client | Android 7.0+ | Android 10+ tablet |

## Port Reference

| Port | Service | Required |
|------|---------|----------|
| 80 | HTTP (web, API) | Yes |
| 443 | HTTPS (web, API) | Recommended for production |
| 1883 | MQTT plaintext | If using MQTT |
| 8883 | MQTTS | If using MQTT with TLS |
| 502 | Modbus TCP | If using Modbus |

## Deployment Order

1. Install EDGE Server (native or Docker)
2. Complete the setup wizard at http://<server-ip>:<port>
3. Enter commissioning codes and create admin accounts
4. Configure Ethernet (PLC) and Wi-Fi (clients)
5. Install EDGE Client APK on tablets
6. Complete client first-launch wizard (Wi-Fi, server URL, kiosk)
7. Register tablets in admin panel if not done during commissioning
8. Configure workout programs and test pool control

## Related Documentation

- [Server Configuration](../server/CONFIGURATION.md) — Runtime configuration options
- [Authentication](../authentication/README.md) — Roles, permissions, commissioning codes
- [Communication Topology](../architecture/COMMUNICATION_TOPOLOGY.md) — Network architecture
