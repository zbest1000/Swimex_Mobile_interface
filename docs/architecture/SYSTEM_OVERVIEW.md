# SwimEx EDGE — System Overview

This document provides a high-level overview of the SwimEx EDGE two-tier pool control platform. The system consists of an EDGE Server (Linux/Windows/Docker) connected to a PLC via wired Ethernet, and an Android kiosk client connected to the server via Wi-Fi. The client never communicates directly with the PLC.

---

## 1. Two-Tier Architecture

The SwimEx EDGE platform is a **two-tier embedded pool control system**:

| Tier | Component | Description |
|------|-----------|-------------|
| **Tier 1** | EDGE Server | Central application server running on Linux, Windows, or in a Docker container. Hosts all application logic, authentication, data persistence, and communication services. |
| **Tier 2** | EDGE Client | Android tablet application running in full kiosk mode. Renders the EDGE web UI in an embedded WebView. Connects exclusively to the EDGE Server. |
| **Tier 0** | PLC / Pool Controller | Programmable Logic Controller that physically controls the pool motor, reads sensors, and interfaces with in-pool air buttons. |

---

## 2. High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         LOCAL NETWORK (Closed, No Internet)                              │
│                                                                                         │
│                              Wired Ethernet (MQTT / Modbus TCP / HTTP)                   │
│  ┌─────────────────────────────┐                                    ┌─────────────────┐ │
│  │       EDGE SERVER            │◄══════════════════════════════════►│  PLC / Pool     │ │
│  │  (Linux / Windows / Docker)  │     Keep-Alive Heartbeat           │  Controller     │ │
│  │                             │                                    │                 │ │
│  │  ┌───────────────────────┐  │                                    │  ┌───────────┐  │ │
│  │  │ Web App Server        │  │                                    │  │ Motor     │  │ │
│  │  │ (Serves UI to clients)│  │                                    │  │ Driver    │  │ │
│  │  ├───────────────────────┤  │                                    │  │ (Current  │  │ │
│  │  │ MQTT Broker (Built-in)│  │                                    │  │  Gen)     │  │ │
│  │  ├───────────────────────┤  │                                    │  ├───────────┤  │ │
│  │  │ Modbus TCP Server/    │  │                                    │  │ Sensor    │  │ │
│  │  │ Client                │  │                                    │  │ Array     │  │ │
│  │  ├───────────────────────┤  │                                    │  ├───────────┤  │ │
│  │  │ Auth Engine           │  │                                    │  │ Air       │  │ │
│  │  │ (All accounts, roles) │  │                                    │  │ Buttons   │  │ │
│  │  ├───────────────────────┤  │                                    │  │ (Physical │  │ │
│  │  │ Database              │  │                                    │  │  I/O)     │  │ │
│  │  │ (Users, programs,     │  │                                    │  └───────────┘  │ │
│  │  │  sessions)            │  │                                    └─────────────────┘ │
│  │  └───────────────────────┘  │                                                       │
│  └──────────────┬──────────────┘                                                       │
│                 │                                                                       │
│                 │ Wi-Fi (primary) / Bluetooth (hidden, Super Admin only)               │
│                 │ HTTP / WebSocket                                                     │
│                 │                                                                       │
│  ┌──────────────┴──────────────┐     ┌─────────────────────────────┐                  │
│  │  EDGE CLIENT                │     │  WEB BROWSER                 │                  │
│  │  (Android Kiosk App)        │     │  (Any device on LAN)          │                  │
│  │                             │     │                               │                  │
│  │  ┌───────────────────────┐  │     │  View-Only (default)          │                  │
│  │  │ Kiosk Shell           │  │     │  Full Access (admin login)     │                  │
│  │  │ (Full device lockdown)│  │     └─────────────────────────────┘                  │
│  │  ├───────────────────────┤  │                                                       │
│  │  │ Embedded WebView      │  │                                                       │
│  │  │ (Renders EDGE UI)     │  │                                                       │
│  │  └───────────────────────┘  │                                                       │
│  └─────────────────────────────┘                                                       │
│                                                                                         │
│  NOTE: Client ↔ PLC communication ALWAYS routes through the EDGE Server.                │
│  The client NEVER communicates directly with the PLC.                                   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. EDGE Server Components

The EDGE Server is the central hub of the system. It hosts all application logic, authentication, data persistence, and communication services.

### 3.1 Component Summary

| Component | Role | Description |
|-----------|------|-------------|
| **Web App Server** | UI delivery | Serves the EDGE web application (HTML, CSS, JS) to the Android kiosk client, web browsers, and any other HTTP clients. Handles static assets and API routes. |
| **MQTT Broker** | Broker | Built-in MQTT broker for real-time pub/sub communication with the PLC. Supports MQTT v3.1.1 and v5.0. Default ports: 1883 (plaintext), 8883 (TLS). |
| **Modbus TCP Server** | Expose data | Exposes internal EDGE data as Modbus registers for external SCADA/BMS systems. Listens on port 502 by default. |
| **Modbus TCP Client** | Poll PLC | Polls PLC registers and writes commands via Modbus TCP. Connects to PLC over wired Ethernet. |
| **Auth Engine** | Authentication | Manages all user accounts, roles, sessions, and MAC address registration. Validates credentials for all clients (kiosk, browser). |
| **Database** | Persistence | Stores user profiles, workout programs, session history, device registrations, communication configs, and tag mappings. |

### 3.2 Server Deployment Options

| Option | Platform | Use Case |
|--------|----------|----------|
| Native Linux | Linux (preferred) | Production deployments, headless edge devices |
| Native Windows | Windows | Environments where Linux is not available |
| Docker | Linux host | Containerized deployment, easy updates, portability |

---

## 4. EDGE Client Components

The EDGE Client is an Android application that runs in full kiosk mode. It does not implement business logic; it renders the EDGE web application served by the EDGE Server.

### 4.1 Component Summary

| Component | Role | Description |
|-----------|------|-------------|
| **Kiosk Shell** | Device lockdown | Native Android shell that replaces the system launcher. Auto-launches on boot. Blocks access to home, settings, notifications, and other apps. Only Administrator or Maintenance roles can exit. |
| **Embedded WebView** | UI rendering | Loads and renders the EDGE web application from the EDGE Server. Handles HTTP/WebSocket communication with the server. No direct PLC communication. |

### 4.2 Client Connectivity

| Transport | Status | Notes |
|-----------|--------|-------|
| **Wi-Fi** | Primary | Default and recommended. Connects to local network where EDGE Server is reachable. |
| **Bluetooth** | Built-in, disabled | Fully implemented but hidden and disabled by default. Only Super Administrator can enable via hidden settings. |

---

## 5. PLC / Pool Controller Components

The PLC is the physical controller for the SwimEx pool. It connects to the EDGE Server via wired Ethernet and receives all commands through the server.

### 5.1 Component Summary

| Component | Role | Description |
|-----------|------|-------------|
| **Motor Driver** | Current generation | Controls pool motor speed to generate adjustable water current for stationary swimming. Receives speed setpoints from the EDGE Server. |
| **Sensor Array** | Telemetry | Reads water temperature, flow rate, motor status, and other pool state. Publishes telemetry to the EDGE Server via MQTT, Modbus, or HTTP. |
| **Air Buttons** | Physical I/O | In-pool physical buttons (START, STOP, SLOW, FAST) that operate independently of the tablet. Button states are read by the PLC and reported to the server. |

### 5.2 PLC Communication

| Protocol | Direction | Purpose |
|----------|-----------|---------|
| MQTT | Bidirectional | Real-time commands and status; keep-alive heartbeat |
| Modbus TCP | Bidirectional | Register-based polling and writes |
| HTTP | Bidirectional | REST-style API for PLCs that support it |

---

## 6. Web Browser Access

Any device on the local network can access the EDGE UI via a standard web browser. This provides view-only monitoring or full control when authenticated as Administrator.

### 6.1 Access Modes

| Mode | Authentication | Capabilities |
|------|----------------|--------------|
| **View-Only** | None (default) | Observe workout status, pool state; cannot issue commands |
| **Full Access** | Administrator login | Full read/write control; same as kiosk client with admin role |

---

## 7. Data Flow Principle

All control and telemetry flows through the EDGE Server:

```
  User Command:    Client ──► Server ──► PLC
  Telemetry:       PLC ──► Server ──► Client
  Keep-Alive:      Server ◄──► PLC (Ethernet)
                   Client ◄──► Server (Wi-Fi)
```

The client has no direct path to the PLC. This design ensures:

- Single point of authentication and authorization
- Centralized audit logging
- Consistent safety stop behavior (server detects PLC disconnect)
- Simplified PLC firmware (one communication partner)

---

## 8. System Boundaries

| Boundary | Scope |
|----------|-------|
| **Local Network** | The entire system operates within a closed local network. No internet dependency. |
| **No Cloud** | All data remains on-premises. No cloud sync or remote access by default. |
| **Single Pool** | Each EDGE Server typically manages one pool and one PLC. Multi-pool configurations may use multiple server instances or extended architecture. |
