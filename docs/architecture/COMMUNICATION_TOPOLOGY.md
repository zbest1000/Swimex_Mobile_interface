# SwimEx EDGE — Communication Topology

This document describes the network topology and communication paths of the SwimEx EDGE platform. It covers Server-to-PLC connectivity via wired Ethernet, Client-to-Server connectivity via Wi-Fi and Bluetooth, web browser access modes, and the internal data bridge with unified tag database.

---

## 1. Topology Overview

The SwimEx EDGE system uses a star topology with the EDGE Server at the center. All PLC communication flows through the server. Clients (Android kiosk, web browsers) connect only to the server.

```
                              Wired Ethernet
                                    │
         Wi-Fi                      │
              │                     │
    ┌─────────┴─────────┐    ┌──────┴──────┐
    │                   │    │             │
    │  Android Kiosk    │    │   EDGE      │    ┌─────────────────┐
    │  Client           │◄──►│   Server    │◄──►│  PLC / Pool     │
    │                   │    │             │    │  Controller     │
    └───────────────────┘    └──────┬──────┘    └─────────────────┘
                                     │
         Bluetooth                   │ Wi-Fi / LAN
         (hidden, Super Admin)       │
              │                      │
    ┌─────────┴─────────┐    ┌───────┴───────┐
    │                   │    │               │
    │  Android Kiosk    │    │  Web Browser  │
    │  (alternate)      │    │  (View/Admin) │
    └───────────────────┘    └───────────────┘
```

---

## 2. Server to PLC: Wired Ethernet

The EDGE Server connects to the PLC exclusively via **wired Ethernet**. This is a permanent, dedicated link. No wireless connection exists between the server and the PLC.

### 2.1 Protocol Summary

| Protocol | Direction | Port | Purpose |
|----------|-----------|------|---------|
| **MQTT** | Bidirectional | 1883 (plaintext), 8883 (TLS) | Real-time pub/sub for commands, status, keep-alive |
| **Modbus TCP** | Bidirectional | 502 (default) | Register-based polling and writes for PLC data |
| **HTTP** | Bidirectional | 80/443 or PLC-configured | REST-style API for PLCs with HTTP interfaces |

### 2.2 Connection Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WIRED ETHERNET LINK                                  │
│                                                                             │
│  ┌─────────────────────┐                          ┌─────────────────────┐   │
│  │     EDGE SERVER      │   Ethernet Cable         │  PLC / Pool         │   │
│  │                     │   (RJ45)                 │  Controller         │   │
│  │  MQTT Broker ◄──────┼── MQTT publish/subscribe ─┼──► MQTT Client       │   │
│  │  Modbus TCP Client ◄┼── Modbus read/write ─────┼──► Modbus Server     │   │
│  │  HTTP Client ◄──────┼── REST API calls ────────┼──► HTTP Server       │   │
│  │                     │                          │                     │   │
│  │  Keep-Alive ◄───────┼── Heartbeat exchange ────┼──► Keep-Alive        │   │
│  └─────────────────────┘                          └─────────────────────┘   │
│                                                                             │
│  NOTE: One or more protocols may be active. Configuration is per-install.   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Key Characteristics

| Aspect | Detail |
|--------|--------|
| **Permanence** | Link is always present when both devices are powered |
| **Determinism** | Wired Ethernet provides low latency and reliable delivery |
| **Safety** | Keep-alive heartbeat detects disconnect; triggers safety STOP |
| **No Wireless** | PLC has no Wi-Fi or Bluetooth; Ethernet only |

---

## 3. Client to Server: Wi-Fi (Primary)

The Android kiosk client connects to the EDGE Server over the local **Wi-Fi** network. This is the primary and default transport.

### 3.1 Protocol Summary

| Protocol | Purpose |
|----------|---------|
| **HTTP** | Initial page load, API requests, static assets |
| **WebSocket** | Real-time bidirectional updates (tag values, state changes) |

### 3.2 Connection Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT ↔ SERVER (Wi-Fi)                             │
│                                                                             │
│  ┌─────────────────────┐         Wi-Fi          ┌─────────────────────┐     │
│  │  Android Kiosk       │         │              │  EDGE Server        │     │
│  │  Client              │         │              │                     │     │
│  │                      │  HTTP   │              │  Web App Server     │     │
│  │  Embedded WebView ───┼─────────┼─────────────►│  (Serves UI + API)  │     │
│  │                      │         │              │                     │     │
│  │                      │  WS     │              │  WebSocket Handler  │     │
│  │  WebSocket Client ───┼─────────┼─────────────►│  (Real-time push)   │     │
│  │                      │         │              │                     │     │
│  └─────────────────────┘         │              └─────────────────────┘     │
│                                  │                                          │
│  Same Wi-Fi network as server    │                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Key Characteristics

| Aspect | Detail |
|--------|--------|
| **Primary Transport** | Wi-Fi is the default and recommended connection |
| **Local Network** | Client and server must be on the same LAN (or routable) |
| **No Direct PLC** | All PLC traffic routes through the server |

---

## 4. Client to Server: Bluetooth (Hidden, Super Admin Only)

A fully implemented **Bluetooth** transport exists in the system. It ships **disabled and hidden** by default. Only a **Super Administrator** can enable and expose it.

### 4.1 Visibility and Access

| Setting | Default | Controlled By |
|---------|---------|---------------|
| Bluetooth Feature | Disabled | Super Administrator |
| Bluetooth Visibility in UI | Hidden | Super Administrator |
| Device Pairing | N/A when disabled | Administrator (when enabled) |

### 4.2 Connection Diagram (When Enabled)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLIENT ↔ SERVER (Bluetooth — Optional)                    │
│                                                                             │
│  ┌─────────────────────┐      Bluetooth       ┌─────────────────────┐      │
│  │  Android Kiosk       │      Pairing         │  EDGE Server         │      │
│  │  Client              │◄───────────────────►│  Bluetooth Adapter   │      │
│  │                      │                      │  (if hardware        │      │
│  │  Same HTTP/WS        │  Same protocols      │   supports)          │      │
│  │  over BT tunnel      │  as Wi-Fi            │                      │      │
│  └─────────────────────┘                      └─────────────────────┘      │
│                                                                             │
│  Activation: Super Admin → Hidden Settings → Enable Bluetooth Feature       │
│  Fallback: If Bluetooth disabled, all connections use Wi-Fi only            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Key Characteristics

| Aspect | Detail |
|--------|--------|
| **Default State** | Disabled and hidden from all users |
| **Activation** | Super Administrator must enable via hidden system settings |
| **Data Flow** | Identical to Wi-Fi: Client → Server → PLC (no direct PLC) |
| **Use Case** | Alternative when Wi-Fi is impractical or unreliable |

---

## 5. Web Browser Access

Any device on the local network can access the EDGE UI via a standard web browser. The server serves the same web application to browsers as to the kiosk client.

### 5.1 Access Modes

| Mode | Authentication | Capabilities |
|------|----------------|--------------|
| **View-Only** | None (default) | Observe workout status, pool state, telemetry. Cannot issue commands (start, stop, speed change, program save). |
| **Full Access** | Administrator login | Full read/write control; same capabilities as kiosk client with Administrator role. |

### 5.2 Connection Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         WEB BROWSER ACCESS                                  │
│                                                                             │
│  ┌─────────────────────┐         Wi-Fi/LAN        ┌─────────────────────┐  │
│  │  Web Browser         │         │                │  EDGE Server         │  │
│  │  (Any device:        │  HTTP   │                │                     │  │
│  │   laptop, phone,     │  WS     │                │  Same web app       │  │
│  │   tablet)            │─────────┼───────────────►│  as kiosk client    │  │
│  │                      │         │                │                     │  │
│  │  View-Only (default) │         │                │  Auth Engine        │  │
│  │  Full (admin login)  │         │                │  validates role     │  │
│  └─────────────────────┘         │                └─────────────────────┘  │
│                                   │                                          │
│  No kiosk shell; standard browser  │                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Key Characteristics

| Aspect | Detail |
|--------|--------|
| **Default** | View-only; no login required |
| **Admin Override** | Administrator login grants full control |
| **Credentials** | Validated by EDGE Server auth engine |
| **MAC Registration** | Unregistered devices may be view-only even with login (admin configurable) |

---

## 6. Internal Data Bridge and Unified Tag Database

Within the EDGE Server, an **internal data bridge** synchronizes data across MQTT topics, Modbus registers, and HTTP endpoints. The **Tag Database** is the single source of truth.

### 6.1 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           EDGE SERVER INTERNAL                                   │
│                                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐  │
│  │ MQTT Broker  │     │ Modbus TCP   │     │ Modbus TCP   │     │ HTTP REST   │  │
│  │ (Built-in)   │     │ Server       │     │ Client       │     │ Client      │  │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘     └──────┬──────┘  │
│         │                    │                    │                    │         │
│         │                    │    Internal Data   │                    │         │
│         │                    │       Bridge       │                    │         │
│         │                    │                    │                    │         │
│         └────────────────────┼────────────────────┼────────────────────┘         │
│                              │                    │                              │
│                              ▼                    ▼                              │
│                    ┌─────────────────────────────────────────┐                   │
│                    │         UNIFIED TAG DATABASE            │                   │
│                    │                                         │                   │
│                    │  Single source of truth for all tags.    │                   │
│                    │  MQTT topics, Modbus registers, HTTP    │                   │
│                    │  endpoints map to same logical tags.    │                   │
│                    │                                         │                   │
│                    │  Object-Tag Mapping (Admin configurable) │                   │
│                    └─────────────────────────────────────────┘                   │
│                                          │                                       │
│                                          ▼                                       │
│                    ┌─────────────────────────────────────────┐                   │
│                    │  WebSocket / API (to Clients)           │                   │
│                    │  Pushes tag updates to kiosk, browser   │                   │
│                    └─────────────────────────────────────────┘                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Synchronization Rules

| Event | Result |
|-------|--------|
| PLC publishes to MQTT topic | Tag Database updated; Modbus Server register updated; clients notified |
| PLC responds to Modbus poll | Tag Database updated; MQTT topic published; clients notified |
| PLC responds to HTTP request | Tag Database updated; MQTT/Modbus sync; clients notified |
| Client writes via API | Tag Database updated; MQTT publish and/or Modbus write to PLC |
| External Modbus master writes to EDGE Server | Tag Database updated; MQTT publish; PLC updated if mapped |

### 6.3 Tag Mapping Configuration

Administrators configure mappings via the Object-Tag Mapping interface:

| Source | Target | Example |
|--------|--------|---------|
| MQTT topic | Tag | `swimex/pool1/speed/setpoint` → Tag `speed_setpoint` |
| Modbus register | Tag | Register 40001 → Tag `motor_speed` |
| HTTP endpoint | Tag | `GET /api/speed` → Tag `current_speed` |

All protocols read from and write to the same unified tag store. The data bridge ensures consistency across protocols in real time.

---

## 7. Summary Table

| Path | Transport | Protocols | Default | Notes |
|------|-----------|-----------|---------|-------|
| Server ↔ PLC | Wired Ethernet | MQTT, Modbus TCP, HTTP | Always | Permanent link; keep-alive |
| Client ↔ Server | Wi-Fi | HTTP, WebSocket | Primary | Default client transport |
| Client ↔ Server | Bluetooth | HTTP, WebSocket | Disabled | Super Admin enables |
| Browser ↔ Server | Wi-Fi/LAN | HTTP, WebSocket | View-only | Admin login for full access |
| Client ↔ PLC | None | — | N/A | Client never talks to PLC |
| Internal (Server) | Process | Tag Database, Data Bridge | Always | Syncs MQTT, Modbus, HTTP |
