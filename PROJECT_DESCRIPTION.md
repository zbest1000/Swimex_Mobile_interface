# SwimEx EDGE Touch Screen Monitor — Project Description

**Document Version:** 2.1
**Based on:** EDGE Operation Instructions v1 (02/01/2023)
**System Type:** Two-Tier Embedded Pool Control Platform (Edge Server + Android Kiosk Client)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Kiosk Mode & Device Lockdown](#3-kiosk-mode--device-lockdown)
4. [Authentication & Role-Based Access Control](#4-authentication--role-based-access-control)
5. [User Accounts, Profiles & Usage Tracking](#5-user-accounts-profiles--usage-tracking)
6. [Administration Panel](#6-administration-panel)
7. [Communication Layer](#7-communication-layer)
8. [UI Builder & Theming](#8-ui-builder--theming)
9. [Workout Modes (Functional Requirements)](#9-workout-modes-functional-requirements)
10. [Navigation & UI Conventions](#10-navigation--ui-conventions)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Data Model](#12-data-model)
13. [User Interface Flow](#13-user-interface-flow)
14. [Integration Points](#14-integration-points)
15. [Security Considerations](#15-security-considerations)
16. [Deployment, Packaging & Installation](#16-deployment-packaging--installation)
17. [Glossary](#17-glossary)
18. [Revision History](#18-revision-history)

---

## 1. Project Overview

The **SwimEx EDGE** is a two-tier control platform for SwimEx swim-in-place (counter-current) pools. It consists of:

1. **EDGE Server** — A web application server running on a Linux or Windows edge device that hosts the main application, built-in MQTT broker, authentication engine, and all persistent data.
2. **EDGE Client** — An Android application that runs in full kiosk mode, completely taking over the Android tablet, booting directly into the EDGE interface, and preventing exit without authorized credentials.

The EDGE Server communicates with the pool's PLC (Programmable Logic Controller) over a **wired Ethernet** connection using MQTT, Modbus TCP, or HTTP. The EDGE Client (tablet) communicates with the EDGE Server over **Wi-Fi** (primary), with **Bluetooth as a planned future addon** for server-to-client communication. The client never communicates directly with the PLC — all control and telemetry flows through the server. The entire system operates within a closed, local network with no internet dependency.

### 1.1 Business Context

SwimEx manufactures aquatic therapy and fitness pools that generate an adjustable water current for stationary swimming. The EDGE platform elevates the user experience by:

- Replacing legacy single-purpose controllers with a rich, programmable touch interface.
- Offering user accounts with profile persistence and workout history tracking.
- Providing administrator-level system configuration (networking, device registration, communication mapping).
- Supporting drag-and-drop UI customization with 5 built-in templates.
- Enabling multi-protocol PLC communication (MQTT, Modbus TCP, HTTP) over wired Ethernet with automatic safety stop on disconnect.

### 1.2 Key Stakeholders

| Stakeholder | Role |
|---|---|
| End Users | Pool swimmers, aquatic therapy patients, fitness professionals |
| Facility Operators | Gyms, rehab clinics, private pool owners |
| Maintenance Personnel | On-site technicians responsible for system configuration and upkeep |
| Administrators | System owners who manage device registration, networking, user roles, and communication |
| SwimEx Engineering | Hardware/firmware teams maintaining pool PLCs and controllers |
| SwimEx Software Team | Developers maintaining the EDGE server and client applications |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            LOCAL NETWORK (No Internet)                            │
│                                                                                  │
│                         Wired Ethernet                                           │
│  ┌──────────────────────┐  (MQTT / Modbus TCP /  ┌──────────────────────┐       │
│  │  EDGE SERVER         │   HTTP)                 │  PLC / Pool          │       │
│  │  (Linux or Windows)  │◄══════════════════════►│  Controller          │       │
│  │                      │  Keep-Alive Heartbeat   │                      │       │
│  │  ┌────────────────┐  │                         │  ┌────────────────┐  │       │
│  │  │ Web App Server │  │                         │  │ Motor Driver   │  │       │
│  │  │ (Serves UI)    │  │                         │  │ Current Gen    │  │       │
│  │  ├────────────────┤  │                         │  │ Sensor Array   │  │       │
│  │  │ MQTT Broker    │  │                         │  └────────────────┘  │       │
│  │  │ (Built-in)     │  │                         │                      │       │
│  │  ├────────────────┤  │                         │  ┌────────────────┐  │       │
│  │  │ Auth Engine    │  │                         │  │ Air Buttons    │  │       │
│  │  │ (All accounts) │  │                         │  │ (Physical I/O) │  │       │
│  │  ├────────────────┤  │                         │  └────────────────┘  │       │
│  │  │ Database       │  │                         └──────────────────────┘       │
│  │  │ (Users, Progs) │  │                                                        │
│  │  └────────────────┘  │                                                        │
│  └──────────┬───────────┘                                                        │
│             │                                                                    │
│             │ Wi-Fi (primary)                                                    │
│             │ Bluetooth (future addon)                                           │
│             │ HTTP / WebSocket                                                   │
│             │                                                                    │
│  ┌──────────┴───────────┐        ┌──────────────────────┐                        │
│  │  EDGE CLIENT         │        │  WEB BROWSER          │                       │
│  │  (Android Kiosk App) │        │  (Any Device)         │                       │
│  │                      │        │                       │                       │
│  │  ┌────────────────┐  │        │  ┌─────────────────┐  │                       │
│  │  │ Kiosk Shell    │  │        │  │ View-Only Mode  │  │                       │
│  │  │ (Full Device   │  │        │  │ (Read access)   │  │                       │
│  │  │  Lockdown)     │  │        │  │                 │  │                       │
│  │  ├────────────────┤  │        │  │ Full Access     │  │                       │
│  │  │ Embedded       │  │        │  │ (Admin login    │  │                       │
│  │  │ WebView        │  │        │  │  required)      │  │                       │
│  │  │ (Renders UI)   │  │        │  └─────────────────┘  │                       │
│  │  └────────────────┘  │        └──────────────────────┘                        │
│  └──────────────────────┘                                                        │
│                                                                                  │
│  NOTE: Client ↔ PLC communication ALWAYS routes through the EDGE Server.         │
│  The client NEVER communicates directly with the PLC.                            │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Component Breakdown

#### 2.2.1 EDGE Server (Primary)

| Aspect | Detail |
|---|---|
| Host OS | Linux (preferred) or Windows |
| Deployment | Native install via installer package, or Docker container |
| Role | Hosts all application logic, authentication, MQTT broker, database, and serves the web UI |
| Web Server | Serves the EDGE web application to both the kiosk client and external browsers |
| MQTT Broker | Built-in broker for real-time PLC communication |
| Auth Engine | Manages all user accounts, roles, sessions, and MAC address registration |
| Database | Stores user profiles, workout programs, session history, device registrations, communication configs |

#### 2.2.2 EDGE Client (Android Kiosk Application)

| Aspect | Detail |
|---|---|
| Platform | Android tablet (Samsung-based or compatible) |
| App Type | Native Android app with embedded WebView, built on an open-source kiosk mode framework |
| Boot Behavior | Launches automatically on device boot; replaces the Android launcher |
| Device Lockdown | Completely overrides Android OS — no access to home screen, settings, notifications, or other apps |
| Exit Mechanism | Only users with **Administrator** or **Maintenance** role can exit kiosk mode |
| Connectivity | Connects to EDGE Server over local Wi-Fi (primary); Bluetooth connectivity to server is a **planned future addon** |
| Rendering | Embedded WebView loads the EDGE web application served by the EDGE Server |

#### 2.2.3 PLC / Pool Controller

| Aspect | Detail |
|---|---|
| Role | Controls pool motor speed, current generation, and reads physical button inputs |
| Communication | Connected to EDGE Server via **wired Ethernet**; receives commands and sends telemetry via MQTT, Modbus TCP, or HTTP |
| Physical Interface | In-pool air buttons (START, STOP, SLOW, FAST) operate independently of the tablet |
| Keep-Alive | Maintains heartbeat with the EDGE Server over Ethernet; triggers safety STOP if connection is lost |

#### 2.2.4 Web Browser Access (Optional)

| Aspect | Detail |
|---|---|
| Access | Any device on the local network can open the EDGE UI in a standard web browser |
| Default Mode | **View-only** — users can observe workout status and pool state but cannot issue commands |
| Admin Override | Users logged in with an **Administrator** account gain full read/write control via browser |
| Authentication | All credentials validated by the EDGE Server auth engine |

### 2.3 Communication Topology

```
         Wi-Fi (primary)              Wired Ethernet
         Bluetooth (future)           (permanent link)
              │                            │
         ┌────┴────┐                  ┌────┴─────┐
         │ Android │    ┌──────────┐  │ PLC /    │
         │ Kiosk   │◄──►  EDGE    │══► Controller│
         │ Client  │    │  Server  │◄══          │
         └─────────┘    └────┬─────┘  └──────────┘
                             │
         ┌───────────┐       │ Wi-Fi
         │ Web       │◄──────┘
         │ Browser   │
         │ (View)    │
         └───────────┘
```

**Connection architecture:**
- **Server ↔ PLC: Wired Ethernet (always).** The EDGE Server connects to the PLC via a dedicated Ethernet cable. This link carries all MQTT, Modbus TCP, and HTTP traffic. It is the only path for PLC communication.
- **Client ↔ Server: Wi-Fi (primary).** The Android kiosk client connects to the EDGE Server over the local Wi-Fi network. All user commands flow from client → server → PLC, and all PLC telemetry flows from PLC → server → client.
- **Client ↔ Server: Bluetooth (future addon).** A planned enhancement will allow the tablet to connect to the EDGE Server via Bluetooth as an alternative to Wi-Fi, for scenarios where Wi-Fi is impractical. This will provide the same server-mediated path to the PLC.
- **Client ↔ PLC: Never direct.** The client has no direct communication path to the PLC. The EDGE Server is always the intermediary.

---

## 3. Kiosk Mode & Device Lockdown

### 3.1 Overview

The EDGE Client is a purpose-built Android application based on an existing open-source kiosk mode project. It transforms a standard Android tablet into a dedicated, single-purpose pool control terminal.

### 3.2 Kiosk Behavior

| Behavior | Description |
|---|---|
| Auto-Launch on Boot | The EDGE Client is registered as the device's default launcher; it starts automatically when the tablet powers on |
| Full Screen | The app runs in immersive full-screen mode — no status bar, navigation bar, or notification shade |
| Home Button Override | Pressing the Android Home button has no effect or returns to the EDGE home screen |
| Back Button Override | The Android Back button is intercepted; navigation is controlled entirely within the EDGE UI |
| Recent Apps Blocked | The multitasking/recent apps button is disabled |
| Settings Blocked | Access to Android Settings is prevented from within the kiosk |
| USB/Peripheral Lock | Optional: prevent unauthorized USB device connections |
| Screen Pinning | Uses Android's screen pinning / lock task mode APIs for OS-level enforcement |

### 3.3 Exiting Kiosk Mode

Kiosk mode can **only** be exited by a user authenticated with one of the following roles:

| Role | Exit Capability |
|---|---|
| **Administrator** | Can exit kiosk mode, access Android OS, and configure the device |
| **Maintenance** | Can exit kiosk mode for troubleshooting and system maintenance |
| General User | **Cannot exit** — kiosk remains locked regardless of interaction |

**Exit Flow:**
1. User navigates to the EDGE settings/admin area within the app.
2. User authenticates with Administrator or Maintenance credentials (validated against the EDGE Server).
3. Upon successful authentication, the app presents an "Exit Kiosk" option.
4. Confirming exit un-pins the screen and restores normal Android launcher behavior.
5. Re-entering the EDGE app or rebooting the device re-engages kiosk mode.

### 3.4 Open-Source Kiosk Foundation

The kiosk shell is built on top of an established open-source Android kiosk/lockdown project, extended with:

- Integration with the EDGE Server's authentication API for role-based exit control.
- Embedded WebView configuration optimized for the EDGE web application.
- Automatic reconnection logic when the server or network is temporarily unavailable.
- Customizable branding (splash screen, loading indicators) for SwimEx.

---

## 4. Authentication & Role-Based Access Control

### 4.1 Overview

All authentication is **server-managed**. The EDGE Server is the single source of truth for user credentials, roles, and sessions. Neither the Android client nor the web browser stores or validates credentials locally.

### 4.2 Roles

| Role | Description | Permissions |
|---|---|---|
| **Administrator** | System owner / IT staff | Full access: all user features + admin panel + kiosk exit + UI builder + communication config + device registration + user management |
| **Maintenance** | On-site technician | Kiosk exit + system diagnostics + communication config + UI builder access |
| **User** | End-user (swimmer / patient) | Create account, manage own profile, run workouts, save programs, view usage history, toggle light/dark mode |
| **Guest** (implicit) | Unauthenticated visitor | View-only access (web browser); on registered tablets, can use basic pool controls without profile persistence |

### 4.3 Authentication Flow

```
┌────────────┐     Credentials      ┌──────────────┐     Validate      ┌──────────────┐
│ Client     │ ────────────────────► │ EDGE Server  │ ────────────────► │ Auth Engine   │
│ (Kiosk or  │                       │ (API)        │                   │ (DB Lookup)   │
│  Browser)  │ ◄──────────────────── │              │ ◄──────────────── │              │
│            │     Session Token     │              │     Role + Token  │              │
└────────────┘                       └──────────────┘                   └──────────────┘
```

**Key behaviors:**
- Login returns a session token with embedded role claims.
- The client includes the token in all subsequent API requests.
- Token expiry and refresh are managed server-side.
- Failed authentication on kiosk does not reveal role-specific UI — the interface adapts based on the authenticated role.
- Web browser access without login defaults to view-only mode.

### 4.4 Role Assignment

- Administrator accounts are created during initial server setup (first-run wizard) or by existing Administrators.
- Maintenance accounts are created and assigned by Administrators.
- User accounts are self-service — anyone can register from the EDGE client login screen.
- Role escalation (User → Maintenance, User → Administrator) can only be performed by an Administrator.

---

## 5. User Accounts, Profiles & Usage Tracking

### 5.1 Account Creation

Any user can create an account directly from the EDGE client or via the web interface (if permitted by admin settings). Registration captures:

| Field | Required | Description |
|---|---|---|
| Username | Yes | Unique identifier |
| Password | Yes | Server-stored (hashed) |
| Display Name | Yes | Shown in UI and workout logs |
| Email | Optional | For account recovery (if network permits) |
| Profile Photo | Optional | Avatar shown on login and workout screens |

### 5.2 User Profile

Each user profile stores:

| Data | Description |
|---|---|
| Saved Workout Programs | Custom and interval programs created by the user |
| Workout History | Timestamped log of every session (duration, speed, mode, steps completed) |
| Usage Statistics | Total swim time, session count, average speed, favorite workout mode |
| Preferences | Light/dark mode, default speed, preferred template |
| Fitness Level | Self-reported (Beginner/Intermediate/Advanced) for preset recommendations |

### 5.3 Usage Tracking

The system automatically records:

| Metric | Granularity |
|---|---|
| Session Start/End Time | Per workout |
| Workout Mode Used | Per session |
| Speed Over Time | Sampled at regular intervals during workout |
| Steps/Sets Completed | Per session |
| Total Accumulated Swim Time | Lifetime per user |
| Calories (estimated) | Per session (if enabled) |

Usage data is stored on the EDGE Server and associated with the authenticated user. Guest sessions (no login) are tracked anonymously.

---

## 6. Administration Panel

### 6.1 Overview

The Administration Panel is a set of protected pages within the EDGE web application, visible **only** to users with the **Administrator** role. These pages provide full system configuration capabilities.

### 6.2 Admin Features

#### 6.2.1 Network Configuration — Wi-Fi Access Point

| Setting | Description |
|---|---|
| AP SSID | Configure or change the Wi-Fi access point name (e.g., `PoolCtrl`) |
| AP Password | Set or rotate the Wi-Fi password |
| AP Channel | Select Wi-Fi channel to avoid interference |
| DHCP Range | Configure IP address allocation for connected devices |
| Network Diagnostics | View connected clients, signal strength, and latency metrics |

#### 6.2.2 Bluetooth Configuration (Future Addon)

> **Note:** Bluetooth support for server-to-client communication is a planned future feature. The configuration UI will be present but disabled until the Bluetooth module is implemented.

| Setting | Description |
|---|---|
| Bluetooth Enable/Disable | Toggle Bluetooth communication between server and client |
| Device Pairing | Pair server with Android tablet(s) over Bluetooth |
| Preferred Connection | Set priority: Wi-Fi first with Bluetooth fallback, or Bluetooth-only |
| Connection Status | Real-time view of Bluetooth link quality and paired devices |

#### 6.2.3 Tablet MAC Address Registration

The EDGE Server maintains a registry of authorized tablet MAC addresses. This is a critical access control mechanism:

| MAC Status | Behavior |
|---|---|
| **Registered** | Full read/write access — user can control the pool, run workouts, save programs |
| **Unregistered** | **View-only** — user can see the UI and pool status but **cannot issue any write commands** (start, stop, speed changes, program saves) |

**Admin actions:**
- View all known MAC addresses and their registration status.
- Register a new MAC address (manually or from a list of recently seen devices).
- Revoke registration (demotes the device to view-only).
- Bulk import/export of MAC registrations.

#### 6.2.4 User Management

| Action | Description |
|---|---|
| View All Users | List all registered accounts with role, last login, and usage summary |
| Assign Roles | Promote or demote users between User, Maintenance, and Administrator roles |
| Disable/Enable Account | Temporarily lock a user account without deleting it |
| Delete Account | Permanently remove a user and optionally their associated data |
| Reset Password | Force a password reset for any user |

#### 6.2.5 Object-to-Tag Mapping

Administrators can map application objects (UI elements, data points, control actions) to PLC tags:

| Concept | Description |
|---|---|
| **Object** | A logical entity in the EDGE UI (e.g., "Speed Slider", "Start Button", "Temperature Display") |
| **Tag** | A PLC register or data point address (e.g., Modbus register `40001`, MQTT topic `pool/speed/setpoint`) |
| **Mapping** | Binds an object to a tag so that UI interactions read from or write to the correct PLC address |

**Mapping interface:**
- Drag-and-drop assignment of objects to tags.
- Tag browser showing all discovered/configured PLC tags.
- Validation of data types (integer, float, boolean, string) between object and tag.
- Import/export of tag maps for backup and replication across installations.

#### 6.2.6 Communication Configuration

Administrators configure how the EDGE Server communicates with the PLC:

| Protocol | Configuration |
|---|---|
| **MQTT** | Broker address (defaults to built-in), port, QoS level, topic prefix, TLS enable/disable, client ID, credentials |
| **Modbus TCP** | PLC IP address, port (default 502), unit ID, register map, polling interval, timeout |
| **HTTP** | PLC REST API endpoint, authentication (API key / basic auth), request format (JSON/XML), polling interval |

Multiple protocols can be active simultaneously for redundancy or for communicating with different subsystems.

---

## 7. Communication Layer

### 7.1 Built-in MQTT Broker

The EDGE Server includes an **embedded MQTT broker** as the primary communication backbone between the application and the PLC.

| Aspect | Detail |
|---|---|
| Protocol | MQTT v3.1.1 / v5.0 |
| Default Port | 1883 (plaintext), 8883 (TLS) |
| Hosting | Runs as an integrated service within the EDGE Server process |
| Clients | EDGE Server (internal), PLC controller (over Ethernet) |
| Topics | Hierarchical: `swimex/{pool_id}/command/*`, `swimex/{pool_id}/status/*`, `swimex/{pool_id}/keepalive` |
| QoS | Configurable per topic; QoS 1 (at-least-once) recommended for commands; QoS 0 for telemetry |
| Retained Messages | Used for current-state topics (speed, mode) so new subscribers get immediate state |

### 7.2 Supported Communication Protocols

| Protocol | Direction | Use Case |
|---|---|---|
| **MQTT** | Bidirectional | Primary real-time communication: commands to PLC, status/telemetry from PLC |
| **Modbus TCP** | Bidirectional | Direct register read/write for PLCs that support Modbus; used for legacy controllers |
| **HTTP** | Bidirectional | REST-style API calls for PLCs with HTTP interfaces; also used for server-to-server integration |

### 7.3 Connection Paths

#### 7.3.1 Server ↔ PLC: Wired Ethernet (Permanent)

```
EDGE Server ══ Ethernet ══► PLC Controller
              (MQTT / Modbus TCP / HTTP)
```

- The **only** path between the EDGE system and the PLC.
- Wired Ethernet provides deterministic, low-latency, reliable connectivity.
- The server translates between its internal MQTT topics and whatever protocol the PLC uses (Modbus TCP, HTTP, or native MQTT).
- Keep-alive heartbeat runs over this Ethernet link.

#### 7.3.2 Client ↔ Server: Wi-Fi (Primary)

```
EDGE Client ── Wi-Fi ──► EDGE Server ══ Ethernet ══► PLC
              (HTTP / WebSocket)       (MQTT / Modbus TCP / HTTP)
```

- Primary communication path between the tablet and server.
- All user commands flow: Client → (Wi-Fi) → Server → (Ethernet) → PLC.
- All PLC telemetry flows: PLC → (Ethernet) → Server → (Wi-Fi) → Client.
- The client is a thin presentation layer — it renders the UI and forwards user actions to the server via HTTP/WebSocket.

#### 7.3.3 Client ↔ Server: Bluetooth (Future Addon)

```
EDGE Client ── Bluetooth ──► EDGE Server ══ Ethernet ══► PLC
```

- **Planned future enhancement** — not available in initial release.
- Will provide an alternative wireless link between the tablet and the EDGE Server when Wi-Fi is impractical.
- The data flow remains identical: all traffic still routes through the server to the PLC over Ethernet.
- The client will never communicate directly with the PLC, even over Bluetooth.

### 7.4 Keep-Alive & Safety Stop

A heartbeat mechanism ensures continuous, verified connectivity between the EDGE system and the PLC.

**Keep-Alive Protocol:**

The keep-alive heartbeat operates on **two segments** of the communication chain:

**Segment 1 — Server ↔ PLC (Ethernet):**
```
┌──────────┐    Heartbeat (every N seconds)    ┌──────────┐
│  EDGE    │ ═══════════ Ethernet ════════════►│  PLC     │
│  Server  │                                    │          │
│          │ ◄═══════════ Ethernet ════════════ │          │
│          │    Heartbeat ACK                   │          │
└──────────┘                                    └──────────┘
```

**Segment 2 — Client ↔ Server (Wi-Fi):**
```
┌──────────┐    Heartbeat (every N seconds)    ┌──────────┐
│  EDGE    │ ─────────── Wi-Fi ───────────────►│  EDGE    │
│  Client  │                                    │  Server  │
│          │ ◄─────────── Wi-Fi ─────────────── │          │
│          │    Heartbeat ACK                   │          │
└──────────┘                                    └──────────┘
```

| Parameter | Detail |
|---|---|
| Heartbeat Interval | Configurable (default: 1–5 seconds) |
| Missed Heartbeats Threshold | Configurable (default: 3 consecutive misses) |
| Timeout Action | PLC enters **SAFETY STOP** mode — pool motor halts immediately |
| Recovery | When heartbeat resumes, PLC remains in STOP until an explicit START command is issued |

**Triggers for Safety Stop:**
- Ethernet disconnection between server and PLC (cable unplugged, switch failure).
- EDGE Server process crash or shutdown (PLC loses heartbeat from server).
- Wi-Fi disconnection between client and server (server detects loss of client; depending on configuration, may trigger PLC stop if no other active client is connected).
- Tablet moves out of Wi-Fi range (same as Wi-Fi disconnection).
- Network congestion or hardware failure causing heartbeat timeouts on either segment.

**Safety Stop Behavior:**
1. PLC halts the pool motor immediately upon heartbeat timeout.
2. PLC logs the disconnect event with timestamp.
3. When connectivity is restored, the EDGE UI shows a "Connection Restored — Press START to Resume" prompt.
4. The pool does **not** auto-resume — explicit operator action is required.

---

## 8. UI Builder & Theming

### 8.1 Drag-and-Drop UI Builder

Available to **Administrator** and **Maintenance** roles, the UI builder allows visual customization of the EDGE interface.

| Feature | Description |
|---|---|
| Object Palette | Library of draggable UI widgets: buttons, sliders, gauges, numeric displays, timers, charts, labels, images |
| Canvas | WYSIWYG editor representing the tablet screen; objects are placed by drag-and-drop |
| Property Inspector | Configure each object's properties: size, color, label, tag binding, behavior, animation |
| Tag Binding | Each object can be bound to a PLC tag (configured via the admin object-to-tag mapping) |
| Layout Grid | Snap-to-grid alignment for consistent layouts |
| Responsive Preview | Preview how the layout renders on different screen sizes |
| Undo/Redo | Full undo/redo stack for editing sessions |
| Save/Publish | Save drafts; publish to make the layout live for all users |

### 8.2 Pre-Built Templates

Five professionally designed templates ship with the application, each with a distinct visual style:

| Template | Visual Style | Best For |
|---|---|---|
| **Classic** | Clean, traditional layout matching the original EDGE look | Existing SwimEx installations upgrading to the new system |
| **Modern** | Flat design with bold colors and large touch targets | General fitness and therapy facilities |
| **Clinical** | High-contrast, accessibility-focused with large fonts | Medical/rehab environments with older or visually impaired users |
| **Sport** | Dynamic, energetic design with performance-oriented gauges | Competitive swim training facilities |
| **Minimal** | Stripped-down interface showing only essential controls | Environments prioritizing simplicity |

**Template behavior:**
- General users see the template selected by the Administrator.
- Administrators select the active template from the admin panel.
- Templates can be further customized via the drag-and-drop builder after selection.
- Switching templates preserves all tag bindings and functional configuration.

### 8.3 Light & Dark Mode

| Aspect | Detail |
|---|---|
| Availability | All users (including general/guest) |
| Toggle Location | Accessible from the main UI header or user profile settings |
| Persistence | Preference saved per user account; guests get the system default |
| Scope | Affects all screens — workout, library, settings, execution |
| Implementation | CSS custom properties / theme tokens; all 5 templates support both modes |
| Default | Configurable by Administrator (system-wide default for new users/guests) |

---

## 9. Workout Modes (Functional Requirements)

The EDGE application supports five distinct workout modes:

### 9.1 Quick Start / Timed Workout

**Purpose:** Immediate pool operation with optional time and speed targets.

**Control Methods (3 mutually compatible options):**

| Method | Input | Feedback |
|---|---|---|
| Air Buttons Only | Physical START/STOP/SLOW/FAST buttons in pool | Speed and time displayed on EDGE tablet |
| Tablet Full Control | Numeric input for Speed and Time on tablet | Programmed values displayed; workout auto-runs |
| Tablet Start + Adjust | Press START on tablet, use +/- for speed | Real-time speed shown on tablet |

**Parameters:**

| Parameter | Input Type | Range |
|---|---|---|
| Speed | Numeric keypad popup | Percentage (0–100%) |
| Time | Numeric keypad popup (MM:SS) | Minutes and seconds (independently programmable) |

**Lifecycle:**
1. User sets speed and/or time (optional).
2. User presses START (tablet or in-pool button).
3. Pool runs at set speed for set duration (or until manually stopped).
4. Workout ends via PAUSE, END (tablet), or STOP (in-pool button).
5. Screen resets to default settings on stop.

### 9.2 Custom Programs

**Purpose:** Multi-step programmable workouts with save/load/library functionality.

**Structure:**

```
Custom Program
├── Name: User-defined string
├── Sets: 1–N repetitions of the step sequence
└── Steps: Up to 10 per set
    ├── Step 1: { Time (MM:SS), Speed (%) }
    ├── Step 2: { Time (MM:SS), Speed (%) }
    ├── ...
    └── Step 10: { Time (MM:SS), Speed (%) }
```

**Capabilities:**

| Feature | Description |
|---|---|
| Step Count | Up to 10 steps per set |
| Set Repetition | Configurable number of set repeats |
| Time Range | Up to 480 minutes per step |
| Speed | Percentage-based per step |
| Save | Persist program to user's profile |
| Save As | Clone existing program under new name |
| Library | Browse, select, and load saved programs |
| Edit | Modify any step's time or speed |

**Workflow:**
1. Navigate to Custom Programs from home screen.
2. Configure number of sets (repetitions).
3. Tap Edit icon to enter programming mode.
4. For each step: set Time (minutes + seconds) and Speed (%).
5. Save or Save As with a custom name.
6. Select the program to queue it for execution.
7. Start via tablet START button or in-pool physical START button.

**Library Management:**
1. Tap Library icon to view all saved programs.
2. Select a program (highlighted green on selection).
3. Tap Load to stage it.
4. Confirm with YES.
5. Program name appears at top; tap Select to proceed to execution.

### 9.3 Interval Training

**Purpose:** Alternating-intensity workout with two configurable steps and set repetition.

**Structure:**

```
Interval Program
├── Sets: N repetitions (must be > 0)
├── Step 1: { Time (MM:SS), Speed (%) }
└── Step 2: { Time (MM:SS), Speed (%) }
```

**Parameters:**

| Parameter | Input | Constraint |
|---|---|---|
| Sets | Numeric (green box) | Must be > 0 |
| Step 1 Time | Minutes + Seconds (blue box) | Standard time input |
| Step 1 Speed | Percentage (blue box) | Percentage-based |
| Step 2 Time | Minutes + Seconds (blue box) | Standard time input |
| Step 2 Speed | Percentage (blue box) | Percentage-based |

**Workflow:**
1. Set number of repetitions (sets).
2. Configure Step 1 time and speed.
3. Configure Step 2 time and speed.
4. Tap Select.
5. Start via tablet or in-pool button.

### 9.4 Distance (Preset)

**Purpose:** Pre-programmed distance-based workouts at three difficulty levels.

| Level | Target User |
|---|---|
| Beginner | New swimmers, therapy patients |
| Intermediate | Regular swimmers |
| Advanced | Competitive / high-fitness swimmers |

**Workflow:**
1. Navigate to Distance from home screen.
2. Choose Beginner, Intermediate, or Advanced.
3. Tap Select.
4. Start via tablet or in-pool button.

### 9.5 Sprint Set (Preset)

**Purpose:** Pre-programmed high-intensity sprint workouts at three difficulty levels.

**Levels:** Beginner, Intermediate, Advanced (same tier structure as Distance).

**Workflow:** Identical to Distance preset workflow.

---

## 10. Navigation & UI Conventions

| UI Element | Behavior |
|---|---|
| Home Screen | Tap anywhere to begin; entry point to all modes |
| SwimEx Logo (upper-left green bar) | Returns to home screen from any sub-page |
| Numeric Ovals | Tap to open keypad popup for value entry |
| Green Box (sets) | Tap to configure set/repetition count |
| Blue Boxes (interval) | Tap to configure time/speed per step |
| START Button | Begins workout execution |
| PAUSE Button | Temporarily halts workout |
| END Button | Terminates workout and resets screen |
| +/- Buttons | Incremental speed adjustment during active workout |
| Save Icon | Persist current program |
| Save As Icon | Clone and rename current program |
| Edit Icon | Enter step editing mode |
| Library Icon | Open saved program browser |
| Select Button | Queue loaded program for execution |
| Load Button | Load selected program from library |
| Light/Dark Toggle | Switch between light and dark themes |
| User Avatar / Profile | Access account settings, workout history, logout |
| Admin Gear Icon | Visible only to Administrator role; opens admin panel |

---

## 11. Non-Functional Requirements

### 11.1 Reliability

| Requirement | Specification |
|---|---|
| Dual-Input Safety | Both tablet and physical air buttons can stop the pool at any time |
| Keep-Alive Failsafe | PLC enters SAFETY STOP if Ethernet heartbeat from server is lost; server can also trigger stop if client Wi-Fi heartbeat is lost |
| No Auto-Resume | After safety stop, pool does not restart without explicit human action |
| Failsafe on Disconnect | Physical air buttons remain operational regardless of tablet/server state |
| State Reset | Screen returns to default settings after any stop action |
| Server Crash Recovery | EDGE Server auto-restarts via systemd (Linux) or Windows Service; Docker restart policy |

### 11.2 Usability

| Requirement | Specification |
|---|---|
| Touch Target Size | All interactive elements sized for wet-finger operation (minimum 48x48dp) |
| Input Validation | Numeric keypads constrain input to valid ranges |
| Visual Feedback | Selected items highlight green; loaded programs show name at top |
| Navigation Escape | SwimEx logo always returns to home — no dead-end screens |
| Minimal Steps | Quick Start allows zero-configuration pool operation |
| Light/Dark Mode | User-togglable; all templates support both modes |
| Drag-and-Drop | Admin/Maintenance UI builder is intuitive, no coding required |

### 11.3 Environment

| Requirement | Specification |
|---|---|
| Operating Conditions | Pool-side (humid, splash-prone environment) |
| Network | Wired Ethernet (server ↔ PLC), Wi-Fi (client ↔ server); closed local network, no internet dependency |
| Time Sync | Manual configuration recommended; server can act as local NTP source |
| Edge Device | Linux or Windows machine (small form factor, fanless recommended) |

### 11.4 Performance

| Requirement | Specification |
|---|---|
| Command Latency | Speed changes and start/stop must reflect within 1–2 seconds end-to-end |
| Heartbeat Interval | 1–5 seconds configurable; default 2 seconds |
| UI Responsiveness | Keypad popups and navigation transitions < 200ms |
| MQTT Throughput | Broker must handle 100+ messages/second for telemetry streams |
| Program Storage | No practical limit on saved programs per user |
| Concurrent Users | Server supports multiple simultaneous browser viewers |

### 11.5 Scalability

| Requirement | Specification |
|---|---|
| Multi-Pool | Architecture supports one EDGE Server managing multiple pools (via pool_id in MQTT topics) |
| Multi-Tablet | Multiple kiosk tablets can connect to the same server |
| Multi-Browser | Unlimited view-only browser sessions; admin sessions limited to prevent conflicts |

---

## 12. Data Model

### 12.1 User & Authentication Schema

```
User {
  id:           UUID
  username:     String (unique)
  passwordHash: String
  displayName:  String
  email:        String (nullable)
  role:         Enum [ADMINISTRATOR, MAINTENANCE, USER]
  profilePhoto: Binary (nullable)
  preferences:  UserPreferences
  isActive:     Boolean
  createdAt:    DateTime
  lastLoginAt:  DateTime
}

UserPreferences {
  theme:           Enum [LIGHT, DARK]
  defaultSpeed:    Integer (0–100)
  fitnessLevel:    Enum [BEGINNER, INTERMEDIATE, ADVANCED]
  activeTemplate:  String (template ID)
}
```

### 12.2 Device Registration Schema

```
RegisteredDevice {
  id:           UUID
  macAddress:   String (unique, format: XX:XX:XX:XX:XX:XX)
  deviceName:   String
  deviceType:   Enum [TABLET, BROWSER, OTHER]
  isRegistered: Boolean
  registeredBy: UUID (ref: User.id)
  registeredAt: DateTime
  lastSeenAt:   DateTime
}
```

### 12.3 Workout Program Schema

```
WorkoutProgram {
  id:        UUID
  ownerId:   UUID (ref: User.id)
  name:      String
  type:      Enum [CUSTOM, INTERVAL, DISTANCE_PRESET, SPRINT_PRESET]
  sets:      Integer (>= 1)
  steps:     Array<Step> (1–10)
  level:     Enum [BEGINNER, INTERMEDIATE, ADVANCED]  // Presets only
  isPublic:  Boolean  // Shared with all users or private
  createdAt: DateTime
  updatedAt: DateTime
}

Step {
  order:  Integer (1–10)
  time:   Duration {
    minutes: Integer (0–480)
    seconds: Integer (0–59)
  }
  speed:  Integer (0–100)  // Percentage of max current
}
```

### 12.4 Workout Session Schema

```
WorkoutSession {
  id:             UUID
  userId:         UUID (ref: User.id, nullable for guest)
  programId:      UUID (ref: WorkoutProgram.id, nullable for Quick Start)
  deviceMAC:      String
  startedAt:      DateTime
  endedAt:        DateTime
  terminatedBy:   Enum [TABLET_END, TABLET_PAUSE, AIR_BUTTON_STOP, TIMER_COMPLETE, SAFETY_STOP]
  stepsCompleted: Integer
  totalDuration:  Duration
  speedLog:       Array<SpeedSample>
}

SpeedSample {
  timestamp: DateTime
  speed:     Integer (0–100)
}
```

### 12.5 Communication Configuration Schema

```
CommunicationConfig {
  id:          UUID
  protocol:    Enum [MQTT, MODBUS_TCP, HTTP]
  name:        String
  isActive:    Boolean
  config:      ProtocolConfig (polymorphic)
  createdBy:   UUID (ref: User.id)
  updatedAt:   DateTime
}

MqttConfig {
  brokerHost:  String (default: "localhost" for built-in)
  brokerPort:  Integer (default: 1883)
  useTLS:      Boolean
  username:    String (nullable)
  password:    String (nullable)
  topicPrefix: String (default: "swimex/")
  qos:         Integer (0, 1, or 2)
  clientId:    String
}

ModbusTcpConfig {
  host:            String
  port:            Integer (default: 502)
  unitId:          Integer
  pollingInterval: Integer (ms)
  timeout:         Integer (ms)
  registerMap:     Array<RegisterMapping>
}

HttpConfig {
  baseUrl:         String
  authType:        Enum [NONE, BASIC, API_KEY, BEARER]
  authCredentials: String (encrypted)
  contentType:     Enum [JSON, XML]
  pollingInterval: Integer (ms)
  timeout:         Integer (ms)
}
```

### 12.6 Object-Tag Mapping Schema

```
ObjectTagMapping {
  id:         UUID
  objectId:   String  // UI widget identifier
  objectName: String  // Human-readable name (e.g., "Speed Slider")
  tagAddress: String  // PLC address (e.g., "40001" for Modbus, "pool/speed" for MQTT)
  protocol:   Enum [MQTT, MODBUS_TCP, HTTP]
  dataType:   Enum [INT16, INT32, FLOAT32, BOOLEAN, STRING]
  accessMode: Enum [READ, WRITE, READ_WRITE]
  scaleFactor: Float (default: 1.0)
  offset:      Float (default: 0.0)
  createdBy:  UUID (ref: User.id)
  updatedAt:  DateTime
}
```

### 12.7 UI Layout Schema

```
UILayout {
  id:          UUID
  name:        String
  templateId:  String  // Base template (CLASSIC, MODERN, CLINICAL, SPORT, MINIMAL)
  isActive:    Boolean
  createdBy:   UUID (ref: User.id)
  widgets:     Array<WidgetPlacement>
  updatedAt:   DateTime
}

WidgetPlacement {
  widgetType: Enum [BUTTON, SLIDER, GAUGE, NUMERIC_DISPLAY, TIMER, CHART, LABEL, IMAGE]
  x:          Integer  // Grid position
  y:          Integer
  width:      Integer
  height:     Integer
  properties: JSON     // Widget-specific config (color, label, tag binding, etc.)
  tagMapping: UUID (ref: ObjectTagMapping.id, nullable)
}
```

### 12.8 State Machine — Workout Lifecycle

```
                    ┌─────────────┐
                    │    IDLE      │ ◄─────────────────────────────┐
                    └──────┬──────┘                                │
                           │ START                                 │
                           ▼                                       │
                    ┌─────────────┐                                │
              ┌────►│   RUNNING   │──── TIMER_COMPLETE ───────────┘
              │     └──────┬──────┘                                │
              │            │                                       │
              │     ┌──────┴──────┐                                │
              │     │             │                                │
              │  PAUSE      DISCONNECT                             │
              │     │             │                                │
              │     ▼             ▼                                │
              │  ┌────────┐  ┌──────────────┐                     │
              └──│ PAUSED │  │ SAFETY STOP  │── Reconnect + ─────┘
                 └───┬────┘  │ (Motor Off)  │   Manual START
                     │       └──────────────┘
                  END/STOP ──────────────────────────────────────►│
```

**Transitions:**

| From | Event | To |
|---|---|---|
| IDLE | START (tablet or air button) | RUNNING |
| RUNNING | PAUSE (tablet) | PAUSED |
| RUNNING | END (tablet) or STOP (air button) | IDLE |
| RUNNING | Timer completes | IDLE |
| RUNNING | Heartbeat lost (disconnect) | SAFETY STOP |
| PAUSED | START (resume) | RUNNING |
| PAUSED | END (tablet) or STOP (air button) | IDLE |
| SAFETY STOP | Reconnect + explicit START | IDLE (then RUNNING on START) |

---

## 13. User Interface Flow

### 13.1 Screen Hierarchy

```
Boot → Kiosk Auto-Launch → EDGE Home Screen
│
├── Login / Register
│   ├── Create Account (User self-service)
│   ├── Login (Username + Password)
│   └── Continue as Guest (limited access)
│
├── [Authenticated User Views]
│   ├── Quick Start / Timed
│   │   ├── Speed Input (keypad popup)
│   │   ├── Time Input (keypad popup)
│   │   ├── START → Running Display (+/- speed, PAUSE, END)
│   │   └── STOP → Return to defaults
│   │
│   ├── Custom Programs
│   │   ├── Set Configuration (repetition count)
│   │   ├── Step Editor (up to 10 steps: time + speed)
│   │   ├── Save / Save As (name input via keyboard)
│   │   ├── Library (browse → select → load → confirm)
│   │   ├── Select → Execution Screen
│   │   └── START → Running Display
│   │
│   ├── Interval
│   │   ├── Set Configuration (repetition count, must > 0)
│   │   ├── Step 1 Config (time + speed via blue boxes)
│   │   ├── Step 2 Config (time + speed via blue boxes)
│   │   ├── Select → Execution Screen
│   │   └── START → Running Display
│   │
│   ├── Distance (Preset)
│   │   ├── Level Select (Beginner / Intermediate / Advanced)
│   │   ├── Select → Execution Screen
│   │   └── START → Running Display
│   │
│   ├── Sprint Set (Preset)
│   │   ├── Level Select (Beginner / Intermediate / Advanced)
│   │   ├── Select → Execution Screen
│   │   └── START → Running Display
│   │
│   ├── User Profile
│   │   ├── Edit Profile (name, photo, preferences)
│   │   ├── Workout History (session log with details)
│   │   ├── Usage Statistics (charts, totals)
│   │   └── Light/Dark Mode Toggle
│   │
│   └── Logout
│
├── [Administrator Views — Hidden from non-admin roles]
│   ├── Dashboard (system health, connected devices, active sessions)
│   ├── User Management (list, create, assign roles, disable, delete)
│   ├── Device Registration (MAC address registry)
│   ├── Network Config (Wi-Fi AP settings, Bluetooth pairing)
│   ├── Communication Config (MQTT, Modbus TCP, HTTP)
│   ├── Object-Tag Mapping (drag-and-drop tag assignment)
│   ├── UI Builder (drag-and-drop layout editor)
│   ├── Template Selector (5 built-in + custom)
│   ├── System Settings (date/time, logging, backup/restore)
│   └── Exit Kiosk Mode
│
├── [Maintenance Views]
│   ├── Communication Config
│   ├── UI Builder
│   ├── Diagnostics (connection logs, error logs)
│   └── Exit Kiosk Mode
│
└── [Web Browser — External Access]
    ├── View-Only Dashboard (no login required)
    │   └── Live pool status, current workout, speed, time
    └── Admin Login → Full Access (same as admin views above)
```

### 13.2 Execution Screen (Common)

All workout modes converge to a shared execution screen that:
- Displays current speed, elapsed time, and workout progress.
- Provides START to begin (if not yet started).
- Offers two start methods: tablet START button or physical in-pool START button.
- Shows real-time updates as the workout progresses through steps/sets.
- Displays connection status indicator (Wi-Fi signal strength to server, server-to-PLC Ethernet link status).
- Shows SAFETY STOP alert if heartbeat is lost on either communication segment.

---

## 14. Integration Points

### 14.1 EDGE Server ↔ PLC (Wired Ethernet)

| Direction | Transport | Protocol Options | Data |
|---|---|---|---|
| Server → PLC | Ethernet | MQTT Publish / Modbus Write / HTTP POST | Start, Stop, Pause, Speed Set, Program Load |
| PLC → Server | Ethernet | MQTT Publish / Modbus Read / HTTP GET | Current Speed, Elapsed Time, Workout State, Motor Temp, Fault Codes |
| Bidirectional | Ethernet | MQTT Keep-Alive | Heartbeat ping/ack for safety stop mechanism |

### 14.2 EDGE Client ↔ EDGE Server (Wi-Fi; Bluetooth Future)

| Direction | Transport | Data |
|---|---|---|
| Client → Server | Wi-Fi: HTTP REST / WebSocket | User commands, authentication requests, program CRUD |
| Server → Client | Wi-Fi: WebSocket / Server-Sent Events | Real-time status updates, speed/time, PLC connection state |
| Client → Server | Wi-Fi: HTTP | Workout session logging, usage tracking |
| Bidirectional | Wi-Fi: WebSocket | Client ↔ Server keep-alive heartbeat |

> **Future:** Bluetooth will provide an alternative transport for the same client ↔ server data flows listed above. The data model and API contracts remain identical — only the transport layer changes.

### 14.4 Physical Air Buttons ↔ PLC

| Button | Action |
|---|---|
| START | Begin or resume workout |
| STOP | Immediately halt workout; triggers UI reset on tablet |
| SLOW | Decrease speed incrementally |
| FAST | Increase speed incrementally |

### 14.5 Concurrent Control

The tablet, web browsers, and air buttons operate as parallel input sources. The EDGE Server is the **single point of arbitration** — it receives commands from all sources (client over Wi-Fi, browser over Wi-Fi, air buttons via PLC over Ethernet) and resolves conflicts. STOP always wins for safety. All state changes from any source are broadcast to all connected clients in real time.

---

## 15. Security Considerations

| Concern | Mitigation |
|---|---|
| Unauthorized Pool Control | MAC address registration required for write access; unregistered devices are view-only |
| Unauthorized System Access | Role-based access control; all auth managed server-side |
| Kiosk Bypass | Android device lockdown via kiosk mode; exit requires admin/maintenance login |
| Network Security | Wired Ethernet for PLC link (physically secure); closed local Wi-Fi for client access; no internet exposure; optional TLS for MQTT |
| Credential Storage | Passwords hashed server-side (bcrypt/argon2); never stored on client |
| Session Hijacking | Token-based sessions with expiry; HTTPS between client and server |
| Physical Safety | STOP always wins in command conflicts; safety stop on disconnect; air buttons always functional |
| Data Integrity | All persistent data stored on EDGE Server; client is stateless (WebView) |
| Audit Trail | Admin actions (role changes, device registration, config changes) logged with timestamps and actor |

---

## 16. Deployment, Packaging & Installation

### 16.1 EDGE Server

#### 16.1.1 Native Installer

| Platform | Installer Type | Contents |
|---|---|---|
| Linux | `.deb` / `.rpm` / shell script | Web server, MQTT broker, database, systemd service unit |
| Windows | `.msi` / `.exe` installer | Web server, MQTT broker, database, Windows Service registration |

**Installation steps (native):**
1. Run the installer on the edge device (must have both Ethernet and Wi-Fi network interfaces).
2. Installer prompts for: Ethernet interface (PLC-facing), Wi-Fi interface (client-facing), MQTT port, admin username/password (first-run).
3. Service is registered and started automatically.
4. Admin opens `http://<server-ip>:<port>` from any browser on the Wi-Fi network to complete setup wizard.

#### 16.1.2 Docker Image

```
swimex/edge-server:latest
```

| Aspect | Detail |
|---|---|
| Base Image | Alpine Linux (minimal footprint) |
| Exposed Ports | 80/443 (HTTP/HTTPS for web UI), 1883/8883 (MQTT broker), 502 (Modbus TCP to PLC, optional passthrough) |
| Network | Requires access to both the Wi-Fi network (client-facing) and the Ethernet network (PLC-facing); dual-NIC or VLAN recommended |
| Volumes | `/data` for persistent database, `/config` for configuration files |
| Environment Variables | `ADMIN_USER`, `ADMIN_PASS`, `MQTT_PORT`, `HTTP_PORT`, `TLS_CERT`, `TLS_KEY` |
| Compose Support | `docker-compose.yml` included for one-command startup |
| Health Check | Built-in Docker health check endpoint (`/api/health`) |

**Docker quick start:**

```yaml
version: "3.8"
services:
  edge-server:
    image: swimex/edge-server:latest
    ports:
      - "80:80"
      - "1883:1883"
    volumes:
      - edge-data:/data
      - edge-config:/config
    environment:
      - ADMIN_USER=admin
      - ADMIN_PASS=changeme
    restart: unless-stopped
volumes:
  edge-data:
  edge-config:
```

### 16.2 EDGE Client (Android)

| Aspect | Detail |
|---|---|
| Package | `.apk` installer (sideloaded or via MDM) |
| Minimum Android | Android 8.0 (API 26) |
| Permissions | Device Admin, Draw Over Apps, System Alert Window, Wi-Fi, Boot Completed (Bluetooth permission reserved for future addon) |
| First-Run Config | Server URL/IP, Wi-Fi network selection |

**Installation steps:**
1. Enable "Install from Unknown Sources" on the Android tablet.
2. Transfer and install the `.apk` file.
3. Grant all requested permissions (Device Admin is critical for kiosk lockdown).
4. Launch the EDGE Client app.
5. On first launch, enter the EDGE Server URL/IP address.
6. The app registers itself as the default launcher and enters kiosk mode.
7. Subsequent reboots auto-launch into kiosk mode.

### 16.3 Configuration Wizard

Both server and client include a guided first-run configuration wizard:

**Server Wizard:**
1. Set admin credentials.
2. Configure Ethernet interface for PLC connection (IP address, subnet, gateway).
3. Configure Wi-Fi interface / AP settings for client-facing network.
4. Configure MQTT broker settings (ports, TLS, credentials).
5. Set PLC communication protocol and connection parameters (Modbus TCP address, MQTT topics, or HTTP endpoint).
6. (Optional) Import existing configuration backup.
7. (Optional) Register initial tablet MAC addresses.

**Client Wizard:**
1. Select Wi-Fi network and enter credentials.
2. Enter EDGE Server address (IP or hostname).
3. Test connectivity to server.
4. Confirm kiosk mode activation.
5. Device reboots into kiosk mode.

> **Future:** When Bluetooth support is added, the client wizard will include an optional Bluetooth pairing step as an alternative connection method to the server.

### 16.4 Web Browser Access

| Scenario | Access Level |
|---|---|
| Any device on local network, no login | **View-only**: live pool status, current speed, active workout display |
| Browser with Administrator login | **Full access**: all features including admin panel, user management, communication config |
| Browser with User login | **Read + limited write**: can view own profile and history but cannot control pool (control restricted to registered tablets) |

---

## 17. Glossary

| Term | Definition |
|---|---|
| **EDGE** | SwimEx's branded touch-screen control platform for swim-in-place pools |
| **EDGE Server** | The primary application server (Linux/Windows/Docker) hosting the web app, MQTT broker, auth engine, and database |
| **EDGE Client** | The Android kiosk application that locks down the tablet and renders the EDGE UI |
| **PLC** | Programmable Logic Controller — the embedded controller managing pool motor and physical I/O |
| **Kiosk Mode** | Android device lockdown mode that restricts the tablet to only the EDGE application |
| **Air Buttons** | Pneumatic buttons installed in the pool wall; waterproof physical controls |
| **PoolCtrl** | Default Wi-Fi SSID for the local network connecting the EDGE Client (tablet) to the EDGE Server |
| **Keep-Alive** | Periodic heartbeat on two segments: server ↔ PLC (Ethernet) and client ↔ server (Wi-Fi) to verify end-to-end connectivity |
| **Safety Stop** | Automatic pool motor halt triggered when the keep-alive heartbeat is lost |
| **MAC Registration** | Server-side registry of authorized tablet hardware addresses; controls write access |
| **Object-Tag Mapping** | Binding between a UI widget and a PLC data point (register, topic, or endpoint) |
| **Set** | One complete pass through all programmed steps |
| **Step** | A single time + speed segment within a set |
| **Quick Start** | Zero-configuration workout mode; start the pool and adjust on the fly |
| **Custom Program** | User-created multi-step workout saved to a library |
| **Interval** | Two-step alternating workout with configurable repetitions |
| **Distance** | Preset workout mode focused on swim distance at three difficulty levels |
| **Sprint Set** | Preset high-intensity workout at three difficulty levels |
| **Speed (%)** | Pool current intensity as a percentage of maximum motor output |
| **MQTT** | Message Queuing Telemetry Transport — lightweight pub/sub messaging protocol |
| **Modbus TCP** | Industrial communication protocol for PLC register read/write over TCP/IP |
| **Drag-and-Drop Builder** | Visual editor allowing admin/maintenance to customize the UI layout without code |
| **Template** | Pre-built UI theme/layout (5 ship with the system: Classic, Modern, Clinical, Sport, Minimal) |

---

## 18. Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-02-22 | System Design & Engineering | Initial project description derived from EDGE Operation Instructions v1 |
| 2.0 | 2026-02-22 | System Design & Engineering | Major expansion: two-tier architecture (server + kiosk client), authentication & RBAC, kiosk mode, admin panel, MQTT broker, multi-protocol PLC communication, keep-alive safety stop, drag-and-drop UI builder, 5 templates, light/dark mode, MAC registration, user profiles & usage tracking, Docker deployment, installer packages, web browser access |
| 2.1 | 2026-02-22 | System Design & Engineering | Connectivity model correction: Server ↔ PLC is wired Ethernet only (not wireless); Client ↔ Server is Wi-Fi primary with Bluetooth as future addon; client never communicates directly with PLC; two-segment keep-alive (Ethernet + Wi-Fi); updated architecture diagrams, connection paths, integration points, deployment wizards, and glossary |
