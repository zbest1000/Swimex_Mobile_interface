# SwimEx EDGE Server

The EDGE Server is the central component of the SwimEx EDGE platform. It is a web application that runs on Linux or Windows and can also be deployed as a Docker container. The server hosts all core services required for pool control, user management, and integration with external systems.

## Overview

The EDGE Server consolidates the following components into a single process:

| Component | Description |
|-----------|-------------|
| **Web App Server** | Serves the EDGE web application, REST API, and WebSocket endpoints for real-time updates |
| **Built-in MQTT Broker** | Embedded MQTT broker for communication with PLC controllers and external clients |
| **Built-in Modbus TCP** | Modbus TCP server and client for SCADA/BMS integration and PLC polling |
| **Auth Engine** | Authentication, authorization, role-based access control, and session management |
| **Database** | Persistent storage for configuration, users, tags, and operational data |
| **Graphics Engine** | SVG rendering and animation for pool control interfaces |
| **Tag Database** | Unified tag store that bridges MQTT, Modbus, and HTTP protocols |

## Server Subsection Documentation

| Document | Description |
|----------|-------------|
| [SETUP.md](SETUP.md) | Server setup guide: prerequisites, hardware requirements, installation (native or Docker), and first-run commissioning wizard |
| [CONFIGURATION.md](CONFIGURATION.md) | Configuration reference: config file format, environment variables, network interfaces, ports, TLS, database, logging, feature flags |
| [MQTT_BROKER.md](MQTT_BROKER.md) | Built-in MQTT broker: protocol versions, ports, topic hierarchy, QoS, retained messages, ACLs, PLC client connections |
| [MODBUS_TCP.md](MODBUS_TCP.md) | Built-in Modbus TCP: server mode (expose EDGE data), client mode (poll PLC), function codes, scan groups, data bridge |
| [TAG_DATABASE.md](TAG_DATABASE.md) | Unified tag database: single source of truth, tag structure, protocol mapping, CRUD operations, tag browser |

## Architecture Summary

```
                    +------------------+
                    |   EDGE Server    |
                    +------------------+
                    |                  |
    +---------------+------------------+------------------+
    |               |                  |                  |
    v               v                  v                  v
+-------+     +-----------+     +------------+     +-------------+
| Web   |     | MQTT      |     | Modbus TCP |     | Auth Engine |
| Server|     | Broker    |     | Server/    |     |             |
|       |     |           |     | Client     |     +-------------+
+-------+     +-----------+     +------------+            |
    |               |                  |                  |
    +---------------+------------------+------------------+
                    |
                    v
            +---------------+
            | Tag Database  |
            | (unified)     |
            +---------------+
                    |
    +---------------+------------------+
    |               |                  |
    v               v                  v
  HTTP          MQTT              Modbus
  REST/WS       Topics            Registers
```

## Deployment Options

| Option | Use Case |
|--------|----------|
| **Native Linux** | Production deployments on Ubuntu, Debian, or RHEL; .deb or .rpm packages |
| **Native Windows** | Installations on Windows 10 or Windows Server; .msi installer |
| **Docker** | Containerized deployment for cloud, edge, or development environments |

## Network Topology

The server is designed for dual-NIC deployments:

- **Ethernet (NIC 1):** Dedicated connection to PLC controllers and industrial equipment; isolated from client traffic
- **Wi-Fi (NIC 2):** Access point for tablets, phones, and other client devices; hosts the web app and user sessions

This separation ensures reliable PLC communication while providing flexible client connectivity.

## Related Documentation

- [Architecture Overview](../architecture/) — System design and two-tier topology
- [Communication Layer](../communication/) — Protocol details and data flow
- [Deployment Guide](../deployment/) — Installation and commissioning procedures
