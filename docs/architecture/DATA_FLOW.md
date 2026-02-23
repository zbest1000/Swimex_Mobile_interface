# SwimEx EDGE — Data Flow

This document describes the data flow for key scenarios in the SwimEx EDGE platform: user commands, telemetry, keep-alive heartbeats, safety stop triggers, workout session lifecycle, and authentication. Each section includes ASCII flow diagrams.

---

## 1. User Command Flow (Client to Server to PLC)

When a user issues a control command (e.g., START, STOP, speed change) from the Android kiosk or web browser, the command flows through the EDGE Server to the PLC. The client never communicates directly with the PLC.

### 1.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         USER COMMAND FLOW                                                │
│                                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐                     │
│  │   Client     │         │   EDGE       │         │   PLC /      │                     │
│  │   (Kiosk or  │         │   Server     │         │   Pool       │                     │
│  │   Browser)   │         │              │         │   Controller  │                     │
│  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘                     │
│         │                        │                        │                             │
│         │  1. User taps START    │                        │                             │
│         │     (or STOP, speed)   │                        │                             │
│         │                        │                        │                             │
│         │  2. HTTP POST / API     │                        │                             │
│         │     or WebSocket msg    │                        │                             │
│         │───────────────────────►│                        │                             │
│         │                        │                        │                             │
│         │                        │  3. Auth check         │                             │
│         │                        │     MAC registration   │                             │
│         │                        │     Role permissions   │                             │
│         │                        │                        │                             │
│         │                        │  4. Update Tag DB      │                             │
│         │                        │     (unified store)    │                             │
│         │                        │                        │                             │
│         │                        │  5. Forward to PLC      │                             │
│         │                        │     (MQTT publish,     │                             │
│         │                        │      Modbus write,     │                             │
│         │                        │      or HTTP POST)     │                             │
│         │                        │───────────────────────►│                             │
│         │                        │                        │                             │
│         │                        │                        │  6. PLC executes             │
│         │                        │                        │     (motor start/stop/speed) │
│         │                        │                        │                             │
│         │  7. ACK / state update  │  8. Telemetry         │                             │
│         │◄───────────────────────│◄──────────────────────│                             │
│         │     (WebSocket push)   │     (MQTT/Modbus/HTTP) │                             │
│         │                        │                        │                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Step Summary

| Step | Actor | Action |
|------|-------|--------|
| 1 | User | Taps START, STOP, or adjusts speed on client UI |
| 2 | Client | Sends HTTP POST or WebSocket message to EDGE Server API |
| 3 | Server | Validates authentication, MAC registration, role permissions |
| 4 | Server | Updates unified Tag Database |
| 5 | Server | Forwards command to PLC via MQTT, Modbus TCP, or HTTP |
| 6 | PLC | Executes command (motor control, state change) |
| 7–8 | Server | Receives PLC telemetry; pushes state update to client |

---

## 2. Telemetry Flow (PLC to Server to Client)

PLC telemetry (motor speed, water temperature, button states, fault codes) flows from the PLC to the server, then to all connected clients.

### 2.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         TELEMETRY FLOW                                                  │
│                                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐     ┌────────────┐  │
│  │   PLC /      │         │   EDGE       │         │   Tag        │     │  Clients   │  │
│  │   Pool       │         │   Server     │         │   Database   │     │  (Kiosk,   │  │
│  │   Controller │         │              │         │   + Bridge   │     │   Browser)  │  │
│  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘     └─────┬──────┘  │
│         │                        │                        │                   │         │
│         │  1. PLC publishes      │                        │                   │         │
│         │     (MQTT) or          │                        │                   │         │
│         │     responds to poll   │                        │                   │         │
│         │     (Modbus/HTTP)      │                        │                   │         │
│         │──────────────────────►│                        │                   │         │
│         │                        │                        │                   │         │
│         │                        │  2. Update Tag DB      │                   │         │
│         │                        │───────────────────────►│                   │         │
│         │                        │                        │                   │         │
│         │                        │  3. Sync across        │                   │         │
│         │                        │     protocols          │                   │         │
│         │                        │◄───────────────────────│                   │         │
│         │                        │     (MQTT publish,     │                   │         │
│         │                        │      Modbus register)  │                   │         │
│         │                        │                        │                   │         │
│         │                        │  4. WebSocket push     │                   │         │
│         │                        │     to all clients     │                   │         │
│         │                        │───────────────────────────────────────────►│         │
│         │                        │                        │                   │         │
│         │                        │                        │  5. Client UI     │         │
│         │                        │                        │     updates       │         │
│         │                        │                        │     (speed, temp, │         │
│         │                        │                        │     status)       │         │
│         │                        │                        │                   │         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Telemetry Sources

| Source | Protocol | Example Data |
|--------|----------|--------------|
| Motor Driver | MQTT / Modbus | Current speed, run status, fault code |
| Sensor Array | MQTT / Modbus | Water temperature, flow rate |
| Air Buttons | MQTT / Modbus | START, STOP, SLOW, FAST button states |

---

## 3. Keep-Alive Heartbeat (Two Segments)

The keep-alive heartbeat operates on **two independent segments** of the communication chain. Each segment has its own heartbeat exchange.

### 3.1 Segment 1: Server to PLC (Ethernet)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    KEEP-ALIVE SEGMENT 1: SERVER ↔ PLC (Ethernet)                        │
│                                                                                         │
│  ┌─────────────────────┐                          ┌─────────────────────┐              │
│  │     EDGE Server      │      Wired Ethernet      │  PLC / Pool         │              │
│  │                      │                          │  Controller         │              │
│  │  Heartbeat Sender    │  ────► Heartbeat ───────►│  Heartbeat Receiver │              │
│  │  (every N seconds)   │                          │  (ACK)              │              │
│  │                      │  ◄──── Heartbeat ACK ────│                      │              │
│  │  Heartbeat Receiver  │                          │  Heartbeat Sender   │              │
│  │  (timeout = fail)    │                          │                     │              │
│  └─────────────────────┘                          └─────────────────────┘              │
│                                                                                         │
│  If N consecutive heartbeats missed: PLC enters SAFETY STOP (motor halts immediately)    │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Segment 2: Client to Server (Wi-Fi)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                    KEEP-ALIVE SEGMENT 2: CLIENT ↔ SERVER (Wi-Fi)                         │
│                                                                                         │
│  ┌─────────────────────┐                          ┌─────────────────────┐              │
│  │     EDGE Client      │         Wi-Fi            │  EDGE Server        │              │
│  │     (Kiosk/Browser)  │                          │                     │              │
│  │                      │  ────► Heartbeat ───────►│  Heartbeat Receiver │              │
│  │  Heartbeat Sender    │       (WebSocket ping   │  (timeout = client   │              │
│  │  (every N seconds)   │        or HTTP poll)     │   disconnected)     │              │
│  │                      │  ◄──── Heartbeat ACK ────│  Heartbeat Sender   │              │
│  │  Heartbeat Receiver  │                          │                     │              │
│  └─────────────────────┘                          └─────────────────────┘              │
│                                                                                         │
│  Server may trigger PLC stop if no active client connected (configurable)               │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Heartbeat Parameters

| Parameter | Default | Configurable |
|-----------|---------|--------------|
| Heartbeat Interval | 2 seconds | Yes (1–5 seconds) |
| Missed Heartbeats Threshold | 3 | Yes |
| Timeout Action (Segment 1) | PLC SAFETY STOP | Fixed |
| Timeout Action (Segment 2) | Mark client disconnected | Configurable (may trigger PLC stop) |

---

## 4. Safety Stop Trigger Flow

When a safety stop is triggered (heartbeat timeout, cable disconnect, server crash), the PLC halts the motor immediately. The following diagram shows the trigger and response flow.

### 4.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         SAFETY STOP TRIGGER FLOW                                        │
│                                                                                         │
│  TRIGGER EVENTS:                                                                        │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │  • Ethernet cable unplugged (Server ↔ PLC)                                       │   │
│  │  • EDGE Server process crash or shutdown                                         │   │
│  │  • N consecutive heartbeats missed on Segment 1 (Server ↔ PLC)                    │   │
│  │  • Wi-Fi disconnect (Segment 2) — may trigger PLC stop if no other client        │   │
│  │  • Network congestion causing heartbeat timeout                                  │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐                    │
│  │   PLC        │         │   EDGE       │         │   Client     │                    │
│  │              │         │   Server     │         │              │                    │
│  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘                    │
│         │                        │                        │                             │
│         │  Heartbeat timeout     │                        │                             │
│         │  (no ACK from server)  │                        │                             │
│         │                        │                        │                             │
│         │  1. PLC detects        │                        │                             │
│         │     heartbeat failure  │                        │                             │
│         │                        │                        │                             │
│         │  2. IMMEDIATE:         │                        │                             │
│         │     Motor STOP         │                        │                             │
│         │     (safety relay)     │                        │                             │
│         │                        │                        │                             │
│         │  3. Log disconnect     │                        │                             │
│         │     event + timestamp  │                        │                             │
│         │                        │                        │                             │
│         │                        │  4. When link          │                             │
│         │                        │     restored:          │                             │
│         │  5. Connection         │     Server resumes     │                             │
│         │     restored           │     heartbeat          │                             │
│         │◄───────────────────────│◄───────────────────────│                             │
│         │                        │                        │                             │
│         │  6. Pool remains       │  7. UI shows:          │  8. User must press         │
│         │     STOPPED until      │     "Connection        │     START to resume         │
│         │     explicit START     │      Restored —        │     (no auto-resume)        │
│         │                        │      Press START"      │                             │
│         │                        │                        │                             │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Safety Stop Behavior Summary

| Phase | Action |
|-------|--------|
| **Detection** | PLC or server detects heartbeat failure |
| **Immediate** | PLC halts motor; safety relay engaged |
| **Logging** | Disconnect event logged with timestamp |
| **Recovery** | When connectivity restored, pool remains STOPPED |
| **Resume** | Explicit operator action (START) required; no auto-resume |

---

## 5. Workout Session Lifecycle

A workout session progresses through distinct states from selection to completion. The following diagram shows the lifecycle and data flow.

### 5.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         WORKOUT SESSION LIFECYCLE                                        │
│                                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌────────┐ │
│  │  IDLE       │───►│  CONFIG     │───►│  READY      │───►│  RUNNING    │───►│  END   │ │
│  │  (Home)     │    │  (Set speed,│    │  (Program   │    │  (Motor on, │    │  (Stop,│ │
│  │             │    │   time,     │    │   loaded,   │    │   telemetry │    │  reset)│
│  │             │    │   program)  │    │   awaiting  │    │   flowing)  │    │        │
│  │             │    │             │    │   START)    │    │             │    │        │
│  └─────────────┘    └─────────────┘    └──────┬──────┘    └──────┬──────┘    └────────┘ │
│         ▲                    │                │                 │                │      │
│         │                    │                │                 │                │      │
│         │                    │                │  START (tablet  │  END / STOP    │      │
│         │                    │                │  or air button) │  (tablet or    │      │
│         │                    │                │                 │  air button)   │      │
│         │                    │                │                 │                │      │
│         └────────────────────┴────────────────┴─────────────────┴────────────────┘      │
│                                                                                         │
│  DATA FLOW DURING RUNNING:                                                              │
│                                                                                         │
│  Client                    Server                       PLC                             │
│  ──────                    ──────                       ───                             │
│  START cmd ───────────────► Auth + Tag DB ──────────────► Motor start                    │
│  Speed +/- ───────────────► Tag DB update ─────────────► Speed setpoint                 │
│  PAUSE ───────────────────► Tag DB update ─────────────► Motor pause                    │
│  END ─────────────────────► Tag DB update ─────────────► Motor stop                     │
│  ◄────────────────────────  Telemetry push  ◄──────────  Speed, status, time            │
│  ◄────────────────────────  Session log     ◄──────────  (Server records to DB)        │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Session Data Recorded

| Data Point | When Recorded |
|------------|---------------|
| Session Start Time | When START is issued |
| Workout Mode | Quick Start, Custom, Interval, Distance, Sprint |
| Speed Over Time | Sampled at intervals during workout |
| Steps/Sets Completed | Per interval or program step |
| Session End Time | When END or STOP is issued |
| Total Duration | Computed at session end |

---

## 6. Authentication Flow

All authentication is server-managed. The EDGE Server validates credentials and issues session tokens. Clients (kiosk, browser) never store or validate credentials locally.

### 6.1 Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                             │
│                                                                                         │
│  ┌──────────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────┐  │
│  │   Client     │         │   EDGE       │         │   Auth       │         │ Database │  │
│  │   (Kiosk or  │         │   Server     │         │   Engine     │         │ (Users)  │  │
│  │   Browser)   │         │   (API)      │         │              │         │          │  │
│  └──────┬───────┘         └──────┬───────┘         └──────┬───────┘         └────┬─────┘  │
│         │                        │                        │                      │       │
│         │  1. POST /login        │                        │                      │       │
│         │     {username, pass}   │                        │                      │       │
│         │───────────────────────►│                        │                      │       │
│         │                        │  2. Forward credentials │                      │       │
│         │                        │───────────────────────►│                      │       │
│         │                        │                        │  3. Lookup user      │       │
│         │                        │                        │─────────────────────►│       │
│         │                        │                        │                      │       │
│         │                        │                        │  4. Verify password  │       │
│         │                        │                        │     (hash compare)   │       │
│         │                        │                        │◄─────────────────────│       │
│         │                        │                        │                      │       │
│         │                        │  5. Generate session   │                      │       │
│         │                        │     token + role       │                      │       │
│         │                        │◄──────────────────────│                      │       │
│         │                        │                        │                      │       │
│         │  6. Return token       │                        │                      │       │
│         │     {token, role,       │                        │                      │       │
│         │      expiry}           │                        │                      │       │
│         │◄───────────────────────│                        │                      │       │
│         │                        │                        │                      │       │
│         │  7. Client stores      │                        │                      │       │
│         │     token; includes    │                        │                      │       │
│         │     in all API/WS      │                        │                      │       │
│         │     requests          │                        │                      │       │
│         │                        │                        │                      │       │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Authentication Behavior

| Aspect | Detail |
|--------|--------|
| **Token** | Session token with embedded role claims |
| **Subsequent Requests** | Client includes token in Authorization header or WebSocket handshake |
| **Token Expiry** | Managed server-side; refresh available |
| **Failed Auth** | No role-specific UI revealed; interface adapts after successful login |
| **Web Browser (no login)** | Defaults to view-only mode |
| **MAC Registration** | Server may restrict unregistered devices to view-only even with valid login |

---

## 7. Summary Table

| Flow | Direction | Key Path |
|------|-----------|----------|
| User Command | Client → Server → PLC | HTTP/WS → Auth → Tag DB → MQTT/Modbus/HTTP → PLC |
| Telemetry | PLC → Server → Client | MQTT/Modbus/HTTP → Tag DB → WebSocket → Client |
| Keep-Alive (Segment 1) | Server ↔ PLC | Ethernet heartbeat |
| Keep-Alive (Segment 2) | Client ↔ Server | Wi-Fi WebSocket/HTTP heartbeat |
| Safety Stop | PLC (local) | Heartbeat timeout → Motor halt |
| Workout Lifecycle | Client ↔ Server ↔ PLC | State machine + command/telemetry flow |
| Authentication | Client → Server | Credentials → Auth Engine → Token |
