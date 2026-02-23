# SwimEx EDGE — Architecture Documentation

This section documents the system architecture of the SwimEx EDGE two-tier pool control platform. The architecture encompasses the EDGE Server (Linux/Windows/Docker), the Android kiosk client, the PLC controller, and all communication paths between them.

---

## Architecture Section Index

| Document | Description |
|----------|-------------|
| [System Overview](SYSTEM_OVERVIEW.md) | High-level overview of the two-tier system: EDGE Server, Android kiosk client, PLC controller, and web browser access. Covers server components (web app server, MQTT broker, Modbus TCP server/client, auth engine, database), client components (kiosk shell, embedded WebView), and PLC components (motor driver, sensors, air buttons). |
| [Communication Topology](COMMUNICATION_TOPOLOGY.md) | Network topology and communication paths: Server-to-PLC via wired Ethernet (MQTT, Modbus TCP, HTTP), Client-to-Server via Wi-Fi (HTTP/WebSocket) and Bluetooth (hidden, Super Admin enabled), web browser access modes. Internal data bridge and unified tag database. |
| [Data Flow](DATA_FLOW.md) | Data flow documentation for user commands, telemetry, keep-alive heartbeats, safety stop triggers, workout session lifecycle, and authentication. Includes ASCII flow diagrams for each scenario. |

---

## Quick Reference

### System Tiers

| Tier | Component | Platform | Role |
|------|-----------|----------|------|
| 1 | EDGE Server | Linux / Windows / Docker | Central hub: Web app, MQTT broker, Modbus, auth, database |
| 2 | EDGE Client | Android tablet | Kiosk shell with embedded WebView; UI rendering only |
| 0 | PLC / Pool Controller | Embedded | Motor control, sensors, physical air buttons |

### Communication Summary

| Path | Transport | Protocols | Notes |
|------|-----------|-----------|-------|
| Server ↔ PLC | Wired Ethernet | MQTT, Modbus TCP, HTTP | Permanent link; always present |
| Client ↔ Server | Wi-Fi (primary) | HTTP, WebSocket | Primary client connection |
| Client ↔ Server | Bluetooth | HTTP, WebSocket | Built-in, disabled by default; Super Admin only |
| Client ↔ PLC | Direct | None | Client never talks directly to PLC |
| Browser ↔ Server | Wi-Fi (or LAN) | HTTP, WebSocket | View-only default; admin full access |

---

## Related Documentation

- [Project Description](../../PROJECT_DESCRIPTION.md) — Comprehensive system design document
- [Communication Layer](../communication/) — MQTT, Modbus TCP, HTTP protocol details
- [Authentication](../authentication/) — Roles, permissions, session management
- [Deployment](../deployment/) — Server install, Docker, Android client setup
