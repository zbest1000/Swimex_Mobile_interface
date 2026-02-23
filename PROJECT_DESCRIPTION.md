# SwimEx EDGE Touch Screen Monitor — Project Description

**Document Version:** 2.5
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
8. [Graphics, UI Builder & Theming](#8-graphics-ui-builder--theming)
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

The EDGE Server communicates with the pool's PLC (Programmable Logic Controller) over a **wired Ethernet** connection using MQTT, Modbus TCP, or HTTP. The EDGE Client (tablet) communicates with the EDGE Server over **Wi-Fi** (primary). A fully implemented **Bluetooth** transport is also built into the system as an alternative client-to-server link, but it ships **disabled and hidden by default** — only a **Super Administrator** can enable and expose it. The client never communicates directly with the PLC — all control and telemetry flows through the server. The entire system operates within a closed, local network with no internet dependency.

### 1.1 Business Context

SwimEx manufactures aquatic therapy and fitness pools that generate an adjustable water current for stationary swimming. The EDGE platform elevates the user experience by:

- Replacing legacy single-purpose controllers with a rich, programmable touch interface.
- Offering user accounts with profile persistence and workout history tracking.
- Providing administrator-level system configuration (networking, device registration, communication mapping).
- Supporting modern SVG-based graphics with import, built-in editor, data-driven animation, drag-and-drop UI builder, and 5 built-in templates.
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
│             │ Bluetooth (built-in, disabled by default — Super Admin activates)   │
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
| MQTT Broker | Built-in broker for real-time pub/sub PLC communication |
| Modbus TCP Server/Client | Built-in Modbus TCP server (exposes registers to external masters) and client (polls/writes to PLC registers) |
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
| Connectivity | Connects to EDGE Server over local Wi-Fi (primary); fully implemented Bluetooth transport is built-in but **disabled and hidden by default** (Super Admin must enable) |
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
         Bluetooth (hidden/disabled)  (permanent link)
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
- **Client ↔ Server: Bluetooth (built-in, disabled by default).** A fully functional Bluetooth transport is implemented in the system, allowing the tablet to connect to the EDGE Server via Bluetooth as an alternative to Wi-Fi. It ships **disabled and hidden** from all users — only a **Super Administrator** can enable it through a hidden system settings panel. Once enabled, it provides the same server-mediated path to the PLC as Wi-Fi.
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
| **Super Administrator** | Can exit kiosk mode, access Android OS, configure the device, and enable hidden features |
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
| **Super Administrator** | SwimEx engineering / BSC Industries system integrator | Everything Administrator can do **plus**: enable/disable hidden features (Bluetooth), access Super Admin panel, manage feature flags, factory reset, firmware-level configuration. This role is **not visible** in the standard user management UI — it can only be created during initial server commissioning or via CLI/API. Account reset requires a **4-segment alphanumeric commissioning code** (set at server commissioning, one code set for SwimEx, one for BSC Industries) |
| **Administrator** | System owner / IT staff | Full access: all user features + admin panel + kiosk exit + UI builder + communication config + device registration + user management. Cannot see or toggle hidden features (e.g., Bluetooth) unless Super Admin has enabled them |
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

- **Super Administrator** accounts are created exclusively during initial server commissioning (first-run wizard) or via CLI/API. They are not visible in the standard user management interface and cannot be created or modified by Administrators. Account reset requires the commissioning code (see Section 4.5).
- **Administrator** accounts are created during initial server setup (first-run wizard), by Super Administrators, or by existing Administrators.
- **Maintenance** accounts are created and assigned by Administrators (or Super Administrators).
- **User** accounts are self-service — anyone can register from the EDGE client login screen.
- Role escalation (User → Maintenance, User → Administrator) can only be performed by an Administrator or Super Administrator. Escalation to Super Administrator is restricted to CLI/API or another Super Administrator.

### 4.5 Super Administrator Commissioning Code & Account Reset

Super Administrator accounts are protected by a **commissioning code system** that is configured once during initial server commissioning and is the **only** mechanism for resetting a Super Admin account (e.g., forgotten password, locked-out account, account recovery).

#### 4.5.1 Commissioning Code Structure

Each commissioning code consists of **four segments**, each segment being a **6-character alphanumeric string** (A–Z, 0–9, case-insensitive):

```
Format:  XXXXXX-XXXXXX-XXXXXX-XXXXXX

Example: A3F7K2-9BQ4M1-R8D2W6-5HN3J7
```

**Two independent commissioning code sets are configured at server commissioning:**

| Code Set | Issuing Organization | Purpose |
|---|---|---|
| **SwimEx Code** | SwimEx (manufacturer) | Allows SwimEx engineering personnel to reset the Super Admin account. Used for factory support, warranty service, and authorized maintenance |
| **BSC Industries Code** | BSC Industries (system integrator) | Allows BSC Industries personnel to reset the Super Admin account. Used for on-site commissioning, system integration, and authorized third-party service |

Either code set can independently reset the Super Admin account — they function as parallel recovery paths.

#### 4.5.2 Commissioning Code Lifecycle

```
┌─────────────────────────────────────────────────────┐
│              SERVER COMMISSIONING                     │
│                                                      │
│  1. First-run wizard prompts for:                    │
│     ├── SwimEx commissioning code (4 × 6-char)       │
│     └── BSC Industries commissioning code (4 × 6-char)│
│                                                      │
│  2. Codes are hashed (bcrypt/argon2) and stored      │
│     in the server's secure configuration store       │
│                                                      │
│  3. Original plaintext codes are NOT stored —         │
│     only the issuing organization retains them       │
└─────────────────────────────────────────────────────┘
```

**Key rules:**
- Commissioning codes are set **once** during initial server setup and **cannot be changed** through the application UI.
- Codes can only be rotated by re-commissioning the server (factory reset + re-run first-run wizard) or via a Super Admin CLI tool with the current code as proof of authorization.
- The plaintext codes are never stored on the server — only salted hashes are persisted.
- Each organization (SwimEx and BSC Industries) is responsible for securely storing and managing its own code set.
- Codes are case-insensitive during entry (normalized to uppercase before hashing/comparison).

#### 4.5.3 Super Admin Account Reset Flow

When a Super Administrator account needs to be reset (forgotten password, locked out, compromised):

```
┌──────────────┐                        ┌──────────────┐
│  Authorized  │   Enter 4-segment      │  EDGE Server │
│  Personnel   │   commissioning code   │  (Reset API) │
│  (SwimEx or  │ ──────────────────────►│              │
│   BSC)       │                        │  Validate    │
│              │                        │  against     │
│              │ ◄──────────────────────│  stored hash │
│              │   Reset confirmed OR   │              │
│              │   code rejected        │              │
└──────────────┘                        └──────────────┘
```

**Reset process:**
1. Navigate to the Super Admin reset screen (accessible from the login page via a hidden gesture or key combination, or via CLI).
2. Select the code set to use: **SwimEx** or **BSC Industries**.
3. Enter the four 6-character alphanumeric segments in order.
4. The server validates the entered code against the stored hash for the selected organization.
5. **If valid:** The server prompts for new Super Admin credentials (username + password). The old account is replaced. An audit log entry is created recording the reset event, the code set used (but not the code itself), and a timestamp.
6. **If invalid:** The attempt is logged, a brief lockout is enforced (escalating: 30s, 1min, 5min, 15min, 1hr for successive failures), and the user is returned to the login screen.

#### 4.5.4 Security Safeguards

| Safeguard | Description |
|---|---|
| **Hash-only storage** | Commissioning codes are stored as salted hashes (bcrypt/argon2); plaintext is never persisted |
| **Rate limiting** | Escalating lockout after failed reset attempts (30s → 1min → 5min → 15min → 1hr) to prevent brute-force |
| **Audit logging** | Every reset attempt (success or failure) is logged with timestamp, source IP/device, and code set used |
| **Dual-organization** | Two independent code sets ensure that either SwimEx or BSC Industries can perform recovery independently |
| **No UI exposure** | The reset screen is not linked from normal navigation; accessed via hidden gesture/key combo or CLI |
| **No code rotation via UI** | Codes cannot be changed through the web interface — only via re-commissioning or CLI with current code proof |
| **Tamper detection** | If the commissioning code hashes are deleted or corrupted in the database, the server enters a locked state that requires physical access (CLI with hardware token or re-imaging) to recover |

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

#### 6.2.2 Bluetooth Configuration (Super Administrator Only)

> **Visibility:** The Bluetooth configuration section is **completely hidden** from all roles (including Administrator and Maintenance) by default. It is only visible and accessible when a **Super Administrator** explicitly enables the Bluetooth feature. Once enabled, standard Administrators can manage the settings below.

| Setting | Description | Default |
|---|---|---|
| Bluetooth Feature Enable/Disable | Master toggle for the entire Bluetooth subsystem (Super Admin only) | **Disabled** |
| Bluetooth Visibility | Show/hide Bluetooth options from Administrator and Maintenance roles (Super Admin only) | **Hidden** |
| Device Pairing | Pair server with Android tablet(s) over Bluetooth | — |
| Preferred Connection | Set priority: Wi-Fi first with Bluetooth fallback, or Bluetooth-only | Wi-Fi only |
| Connection Status | Real-time view of Bluetooth link quality and paired devices | — |
| Bluetooth Power / Range | Configure Bluetooth radio power level | Default |

**Activation flow:**
1. Super Administrator logs in and navigates to the hidden Super Admin panel.
2. Super Administrator toggles "Enable Bluetooth Feature" to ON.
3. Bluetooth configuration section becomes visible in the standard Admin panel.
4. Standard Administrators can now pair devices and configure Bluetooth preferences.
5. Super Administrator can re-disable at any time, which hides the section again and falls back all connections to Wi-Fi.

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

Administrators configure how the EDGE Server communicates with the PLC and external systems:

| Protocol | Mode | Configuration |
|---|---|---|
| **MQTT** | Broker (built-in) | Listen port, TLS enable/disable, authentication, topic ACLs |
| **MQTT** | Client | Broker address (defaults to built-in), port, QoS level, topic prefix, client ID, credentials |
| **Modbus TCP** | Server (built-in) | Listen port (default 502), exposed unit IDs, register map (which internal data points are exposed as Modbus registers), read-only vs read/write access per register range |
| **Modbus TCP** | Client | PLC IP address, port, unit ID, register map (which PLC registers to poll/write), polling interval, timeout |
| **HTTP** | REST API | PLC REST endpoint, authentication (API key / basic auth), request format (JSON/XML), polling interval |

Multiple protocols and multiple instances of each can be active simultaneously. For example, the server can operate as a Modbus TCP client to poll registers from the PLC while simultaneously running a Modbus TCP server to expose pool data to external SCADA/BMS systems.

---

## 7. Communication Layer

### 7.1 Built-in MQTT Broker

The EDGE Server includes an **embedded MQTT broker** as one of two built-in communication services.

| Aspect | Detail |
|---|---|
| Protocol | MQTT v3.1.1 / v5.0 |
| Default Port | 1883 (plaintext), 8883 (TLS) |
| Hosting | Runs as an integrated service within the EDGE Server process |
| Clients | EDGE Server (internal), PLC controller (over Ethernet), external systems |
| Topics | Hierarchical: `swimex/{pool_id}/command/*`, `swimex/{pool_id}/status/*`, `swimex/{pool_id}/keepalive` |
| QoS | Configurable per topic; QoS 1 (at-least-once) recommended for commands; QoS 0 for telemetry |
| Retained Messages | Used for current-state topics (speed, mode) so new subscribers get immediate state |
| ACLs | Per-topic access control lists; restrict which clients can publish/subscribe to specific topics |

### 7.2 Built-in Modbus TCP Server/Client

The EDGE Server includes a **built-in Modbus TCP engine** that operates in both **server** and **client** modes simultaneously.

#### 7.2.1 Modbus TCP Server Mode

The server mode exposes internal EDGE data as standard Modbus registers, allowing external systems to read from and write to the EDGE system using the Modbus TCP protocol.

| Aspect | Detail |
|---|---|
| Protocol | Modbus TCP (MBAP header, per Modbus specification) |
| Default Port | 502 |
| Hosting | Runs as an integrated service within the EDGE Server process |
| Unit IDs | Configurable; supports multiple virtual unit IDs for logical separation |
| Supported Function Codes | FC01 (Read Coils), FC02 (Read Discrete Inputs), FC03 (Read Holding Registers), FC04 (Read Input Registers), FC05 (Write Single Coil), FC06 (Write Single Register), FC15 (Write Multiple Coils), FC16 (Write Multiple Registers) |
| Register Map | Administrator-configured mapping between internal data points and Modbus register addresses |
| Access Control | Per-register-range read-only or read/write permissions |
| Concurrent Connections | Supports multiple simultaneous Modbus TCP master connections |

**Use cases for server mode:**
- **SCADA integration:** Building Management Systems (BMS) or SCADA platforms can poll the EDGE server as a standard Modbus slave to monitor pool status.
- **Third-party HMI:** External HMI panels can read/write EDGE registers.
- **Data logging:** External historians can poll register data for long-term storage.
- **Multi-system coordination:** Other automation controllers on the network can read pool state and issue commands via Modbus writes.

#### 7.2.2 Modbus TCP Client Mode

The client mode allows the EDGE Server to actively poll registers from and write to the PLC (or any Modbus TCP server on the network).

| Aspect | Detail |
|---|---|
| Target | PLC IP address + port + unit ID (configurable) |
| Polling | Cyclic polling at configurable intervals (10ms–60s per register group) |
| Write Strategy | Write-on-change (default) or cyclic write (configurable) |
| Register Groups | Registers organized into scan groups with independent polling rates for priority-based scanning (fast group for speed/status, slow group for diagnostics) |
| Error Handling | Configurable retries per transaction, timeout per request, automatic reconnection on link failure |
| Multiple Targets | Can connect to multiple Modbus TCP servers simultaneously (e.g., pool PLC + auxiliary equipment PLC) |

**Use cases for client mode:**
- **Primary PLC communication:** Poll speed, status, fault codes from the pool PLC; write start/stop/speed commands.
- **Auxiliary equipment:** Read water temperature, chemistry sensors, filter status from secondary controllers.
- **Legacy controllers:** Communicate with older PLCs that only support Modbus TCP (no MQTT or HTTP).

#### 7.2.3 Internal Data Bridge

The MQTT broker and Modbus TCP engine share an **internal data bridge** that automatically synchronizes data between protocols:

```
┌──────────────────────────────────────────────────────────┐
│                    EDGE Server                            │
│                                                          │
│  ┌──────────┐    Internal     ┌────────────────────┐     │
│  │  MQTT    │◄──  Data   ───►│  Modbus TCP         │     │
│  │  Broker  │    Bridge       │  Server / Client    │     │
│  └──────────┘                 └────────────────────┘     │
│       ▲                              ▲    │              │
│       │                              │    ▼              │
│       │              ┌───────────────┴────────┐          │
│       │              │  Tag Database          │          │
│       │              │  (Unified data store   │          │
│       └──────────────│   for all protocols)   │          │
│                      └────────────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

- A value written to an MQTT topic automatically updates the corresponding Modbus register (and vice versa).
- A value polled from a PLC via Modbus client is published to the corresponding MQTT topic.
- The **Tag Database** is the single source of truth — all protocols read from and write to the same unified tag store.
- Mapping between MQTT topics, Modbus registers, and HTTP endpoints is configured via the admin Object-Tag Mapping interface.

### 7.3 Supported Communication Protocols (Summary)

| Protocol | Mode | Direction | Use Case |
|---|---|---|---|
| **MQTT** | Broker (built-in) | Bidirectional | Primary real-time pub/sub backbone; PLC telemetry, commands, keep-alive |
| **MQTT** | Client | Bidirectional | Connect to external MQTT brokers if needed |
| **Modbus TCP** | Server (built-in) | Bidirectional | Expose EDGE data to external SCADA/BMS/HMI as Modbus registers |
| **Modbus TCP** | Client | Bidirectional | Poll/write PLC registers; primary protocol for Modbus-native PLCs |
| **HTTP** | REST Client | Bidirectional | REST-style API calls for PLCs with HTTP interfaces; server-to-server integration |

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

#### 7.3.3 Client ↔ Server: Bluetooth (Built-in, Disabled by Default)

```
EDGE Client ── Bluetooth ──► EDGE Server ══ Ethernet ══► PLC
```

- **Fully implemented** but ships **disabled and hidden** from all roles.
- A **Super Administrator** must explicitly enable the Bluetooth feature before it becomes available.
- Once enabled, provides an alternative wireless link between the tablet and the EDGE Server when Wi-Fi is impractical or unreliable.
- The data flow is identical to Wi-Fi: all traffic still routes through the server to the PLC over Ethernet.
- The client never communicates directly with the PLC, even over Bluetooth.
- If the Super Administrator disables Bluetooth again, all active Bluetooth connections gracefully fall back to Wi-Fi.

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

## 8. Graphics, UI Builder & Theming

The EDGE platform uses **modern, web-native vector graphics** as the foundation for all visual elements. Graphics are primarily SVG-based, rendered via the browser's native SVG/Canvas engine, and are fully animatable and data-driven. The system supports importing external graphics, building custom graphics from scratch, and binding any visual property to live PLC data for real-time animation.

### 8.1 Graphics Architecture

#### 8.1.1 Rendering Technology

| Layer | Technology | Purpose |
|---|---|---|
| **Vector Graphics** | SVG (Scalable Vector Graphics) | Primary format for all UI widgets, gauges, pool diagrams, icons, and custom graphics. Resolution-independent, animatable, styleable via CSS |
| **Canvas Rendering** | HTML5 Canvas (2D context) | Used for high-frequency data visualization: real-time charts, waveforms, speed traces |
| **CSS Animations** | CSS Transitions + Keyframes | Smooth state transitions: color changes, visibility toggles, opacity fades, position shifts |
| **JavaScript Animation** | requestAnimationFrame / Web Animations API | Complex, data-driven animations: rotation, fill level, path morphing, multi-property interpolation |
| **Raster Support** | PNG, JPEG, WebP, GIF | Imported raster images (photos, logos, backgrounds) displayed alongside vector elements |

#### 8.1.2 Design Principles

- **SVG-first:** All built-in widgets and templates are authored as SVG. This ensures crisp rendering at any zoom level, smooth animation, and small file sizes.
- **Data-driven:** Every visual property (color, rotation, fill, position, visibility, opacity, scale, text content) can be bound to a PLC tag value, enabling graphics that react to live process data in real time.
- **Touch-optimized:** All interactive graphic elements meet minimum 48x48dp touch targets for wet-finger pool-side operation.
- **Themeable:** Graphics inherit light/dark mode tokens and adapt automatically when the user toggles themes.
- **Performant:** GPU-accelerated CSS transforms for animations; requestAnimationFrame scheduling ensures 60fps on tablet hardware.

### 8.2 Graphic Import

Administrators and Maintenance users can import external graphics into the EDGE system.

#### 8.2.1 Supported Import Formats

| Format | Type | Animation Support | Notes |
|---|---|---|---|
| **SVG** | Vector | Full — all elements animatable after import | Preferred format; internal structure preserved for per-element binding |
| **PNG** | Raster | Graphic-level only (rotation, scale, opacity, visibility) | Transparency supported |
| **JPEG** | Raster | Graphic-level only | Best for photos/backgrounds |
| **WebP** | Raster | Graphic-level only | Modern compressed format |
| **GIF** | Raster (animated) | Native frame animation plays as-is; also supports graphic-level animation | Useful for simple pre-built animations |
| **DXF** | CAD Vector | Converted to SVG on import; then fully animatable | For importing pool/equipment drawings from CAD software |

#### 8.2.2 Import Workflow

1. Navigate to **UI Builder → Graphic Library → Import**.
2. Upload one or more files (drag-and-drop onto browser or file picker).
3. System validates the file, generates a preview thumbnail, and extracts metadata.
4. For **SVG files**: the importer parses the SVG DOM and lists all named elements (layers, groups, paths) that can be individually targeted for animation and tag binding.
5. For **raster files**: the graphic is treated as a single unit (whole-image animation only).
6. Imported graphics are stored in the server's **Graphic Library** and are available to all layouts.

#### 8.2.3 Graphic Library

| Feature | Description |
|---|---|
| Centralized Storage | All imported and built-in graphics stored server-side; available across all layouts and templates |
| Categorization | Graphics organized by tags/categories (e.g., "Pools", "Gauges", "Icons", "Equipment", "Backgrounds") |
| Search | Full-text search by name, tag, or category |
| Thumbnail Preview | Auto-generated previews for quick browsing |
| Versioning | Track revisions; revert to previous versions of a graphic |
| Usage Tracking | Shows which layouts reference each graphic; prevents accidental deletion of in-use assets |
| Bulk Import/Export | Import/export graphic packs as ZIP archives for backup or transfer between installations |

### 8.3 Graphic Builder (Built-in Editor)

The EDGE system includes a **built-in vector graphic editor** that allows administrators and maintenance users to create and modify SVG graphics directly within the application — no external tools required.

#### 8.3.1 Drawing Tools

| Tool | Description |
|---|---|
| **Rectangle / Rounded Rect** | Draw rectangular shapes with configurable corner radius |
| **Circle / Ellipse** | Draw circular and elliptical shapes |
| **Line / Polyline** | Draw straight lines and multi-segment polylines |
| **Polygon** | Draw closed multi-sided shapes |
| **Arc / Pie** | Draw arc segments and pie/donut chart shapes |
| **Path (Pen Tool)** | Freeform Bezier curve drawing for complex shapes |
| **Text** | Add text labels with configurable font, size, weight, and alignment |
| **Image Embed** | Place imported raster images within an SVG composition |
| **Group** | Group multiple elements for collective manipulation and animation |
| **Symbol / Component** | Define reusable graphic components (e.g., a valve symbol) that can be instantiated multiple times |

#### 8.3.2 Styling Properties

Every graphic element supports the following visual properties, all of which can be set statically or bound to PLC tag values for dynamic behavior:

| Property | Description | Bindable to Tag |
|---|---|---|
| **Fill Color** | Interior color (solid, linear gradient, radial gradient) | Yes — color changes based on value (e.g., green when OK, red on alarm) |
| **Fill Level** | Partial fill from 0–100% (for tank/level indicators) | Yes — fill height/width driven by a tag percentage value |
| **Stroke Color** | Outline/border color | Yes |
| **Stroke Width** | Outline thickness | Yes |
| **Opacity** | Transparency from 0% (invisible) to 100% (fully opaque) | Yes — fade in/out based on state |
| **Visibility** | Show or hide the element entirely | Yes — toggle based on boolean tag |
| **Rotation** | Rotate around a configurable pivot point (0–360°) | Yes — continuous rotation (e.g., spinning motor) or position-based (e.g., dial needle) |
| **Scale X / Scale Y** | Horizontal and vertical scaling | Yes — grow/shrink based on value |
| **Position X / Position Y** | Absolute or relative positioning on the canvas | Yes — move elements based on value (e.g., slider thumb) |
| **Text Content** | Dynamic text display | Yes — show live numeric values, status strings, formatted timestamps |
| **Font Size** | Text size | Yes |
| **Border Radius** | Corner rounding | No (static only) |
| **Shadow / Glow** | Drop shadow or outer glow effects | Yes — activate on alarm/highlight states |
| **Clip Path** | Mask/clipping region for partial reveals | Yes — animate clip region for fill/wipe effects |
| **CSS Class** | Assign CSS classes for theme integration | No (static, but class styles respond to light/dark mode) |

### 8.4 Animation System

The animation system is the core mechanism that makes graphics **react to live PLC data**. Any visual property listed above can be driven by a tag value in real time.

#### 8.4.1 Animation Binding Model

Each animation binding connects a **PLC tag value** to a **graphic property** through a configurable **mapping function**:

```
┌──────────┐     ┌─────────────────┐     ┌──────────────────┐     ┌────────────────┐
│ PLC Tag  │────►│ Mapping Function │────►│ Graphic Property │────►│ Visual Output  │
│ (value)  │     │ (transform)      │     │ (rotation, fill, │     │ (rendered SVG) │
└──────────┘     └─────────────────┘     │  color, etc.)    │     └────────────────┘
                                          └──────────────────┘
```

#### 8.4.2 Mapping Function Types

| Function Type | Description | Example |
|---|---|---|
| **Linear Scale** | Maps an input range [min, max] to an output range [min, max] | Tag 0–100% → Rotation 0–270° (gauge needle) |
| **Threshold / Discrete** | Maps value ranges to discrete states | Tag < 50 → Green fill; 50–80 → Yellow; > 80 → Red |
| **Boolean Toggle** | Maps true/false (or 0/1) to two states | Tag = 1 → Visible; Tag = 0 → Hidden |
| **Color Gradient** | Interpolates between two or more colors based on value | Tag 0–100 → Blue (cold) to Red (hot) |
| **String Format** | Formats a numeric value into a display string | Tag 72.5 → "72.5 %" or "72.5 GPM" |
| **Expression** | Custom JavaScript-like expression for complex transforms | `tag_value * 3.6 + offset` → Rotation |
| **Lookup Table** | Maps specific input values to specific outputs | Tag 0 → "Off", 1 → "Idle", 2 → "Running", 3 → "Fault" |
| **Clamp** | Constrains output to a safe range regardless of input | Rotation clamped to 0–360° even if tag exceeds expected range |

#### 8.4.3 Animation Types

| Animation | Driven By | Property | Example Use Case |
|---|---|---|---|
| **Rotation** | Continuous value (0–N) | `transform: rotate()` | Motor spinning indicator, gauge needle, compass |
| **Fill Level** | Percentage (0–100) | `clip-path` or `height` | Tank level, progress bar, battery indicator |
| **Color Change** | Threshold or gradient | `fill`, `stroke`, `background` | Alarm state (green/yellow/red), temperature heatmap |
| **Visibility Toggle** | Boolean | `display` or `visibility` | Show/hide alarm icons, conditional UI sections |
| **Opacity Fade** | Value or boolean | `opacity` | Fade in active elements, dim inactive elements |
| **Position Shift** | Numeric value | `transform: translate()` | Slider thumb, flow indicator, scroll position |
| **Scale Pulse** | Boolean or threshold | `transform: scale()` | Pulsing alarm indicator, attention-grabbing highlight |
| **Text Update** | Any value | `textContent` | Live speed readout, timer display, status label |
| **Stroke Dash** | Value | `stroke-dashoffset` | Animated progress ring, flow direction indicator |
| **Path Morph** | Discrete states | SVG path `d` attribute | Shape transitions between states (e.g., play → pause icon) |
| **Blink / Flash** | Boolean (alarm) | CSS `animation` (keyframes) | Critical alarm flashing, connection lost warning |
| **Multi-Property** | Value + expression | Any combination | Simultaneously rotate a needle, update a numeric readout, and change a color — all from one tag |

#### 8.4.4 Animation Timing

| Setting | Description | Default |
|---|---|---|
| Update Rate | How frequently the graphic re-renders from tag data | Matches MQTT/polling interval (typically 100–500ms) |
| Transition Duration | Smoothing time for value changes (prevents jumpy visuals) | 200ms (configurable per binding) |
| Easing Function | Interpolation curve (linear, ease-in, ease-out, ease-in-out, spring) | `ease-out` |
| Debounce | Minimum interval between visual updates for a single binding | 50ms |
| Frame Rate Cap | Maximum render FPS to conserve tablet battery/CPU | 60fps (configurable down to 15fps) |

#### 8.4.5 Animation Configuration UI

The animation system is configured through the **Property Inspector** in the UI Builder:

1. Select a graphic element on the canvas.
2. Open the **Animations** tab in the Property Inspector.
3. Click **+ Add Animation** to create a new binding.
4. Select the **target property** (rotation, fill, color, visibility, etc.).
5. Select the **source PLC tag** from the tag browser (or type the tag address).
6. Choose the **mapping function** (linear scale, threshold, boolean, etc.).
7. Configure mapping parameters (input range, output range, thresholds, colors).
8. Preview the animation with a **live simulation slider** that mimics tag value changes.
9. Save — the animation is immediately active in the published layout.

### 8.5 Drag-and-Drop UI Builder

Available to **Administrator** and **Maintenance** roles, the UI builder is the primary workspace for composing screens from graphics, widgets, and imported assets.

| Feature | Description |
|---|---|
| **Object Palette** | Library of built-in widgets and all graphics from the Graphic Library; drag onto canvas to place |
| **Canvas (WYSIWYG)** | Zoomable, pannable editing surface representing the tablet screen; grid-aligned placement |
| **Property Inspector** | Multi-tab panel: **Layout** (position, size), **Style** (colors, fonts), **Data** (tag binding), **Animations** (dynamic properties), **Events** (touch interactions) |
| **Layer Panel** | Z-order management; reorder, group, lock, and toggle visibility of elements during editing |
| **Tag Browser** | Sidebar listing all configured PLC tags; drag a tag onto a graphic element to auto-create a binding |
| **Graphic Library Browser** | Sidebar for browsing, searching, and previewing all imported and built-in graphics |
| **Symbol Instances** | Place reusable symbols (e.g., a valve graphic) multiple times; each instance can be bound to different tags |
| **Layout Grid** | Configurable snap-to-grid alignment; toggleable guides and rulers |
| **Responsive Preview** | Preview how the layout renders on different screen sizes and orientations |
| **Live Preview** | Real-time preview with live PLC data — see animations running while editing |
| **Undo/Redo** | Full undo/redo stack for all editing actions |
| **Copy/Paste** | Copy elements within a layout or across layouts (preserves bindings) |
| **Save/Publish** | Save drafts without affecting the live layout; publish to push changes to all users |
| **Version History** | Browse and restore previous versions of any layout |

### 8.6 Built-in Widget Library

The system ships with a comprehensive library of pre-built, animated SVG widgets:

| Category | Widgets |
|---|---|
| **Controls** | Button, Toggle Switch, Slider, Knob (rotary), Numeric Input, Dropdown Select |
| **Indicators** | LED (on/off/color), Status Badge, Alarm Banner, Connection Status Icon |
| **Gauges** | Radial Gauge (needle), Semi-circular Gauge, Linear Gauge (horizontal/vertical), Arc Gauge |
| **Levels** | Tank Level (vertical/horizontal fill), Battery Indicator, Progress Bar, Donut Chart |
| **Charts** | Real-time Line Chart, Bar Chart, Sparkline, Speed Trend, Historical Playback |
| **Text** | Dynamic Label, Numeric Display (with units), Countdown Timer, Stopwatch, Clock |
| **Navigation** | Tab Bar, Page Selector, Breadcrumb, Back Button, Home Button |
| **Layout** | Container/Panel, Card, Divider, Spacer, Tab Container, Accordion |
| **Pool-Specific** | Pool Diagram (top view, animatable current flow), Swimmer Silhouette, Speed Dial, Workout Step Indicator, Set/Rep Counter |
| **Media** | Image Container, SVG Container, Video Embed (for instruction videos) |

Each built-in widget:
- Is authored as an SVG component with clearly named internal elements.
- Exposes a set of **bindable properties** documented in the widget's spec.
- Supports light/dark mode via theme tokens.
- Can be customized (colors, sizes, labels) without editing the SVG source.
- Can be duplicated and modified to create custom variants.

### 8.7 Pre-Built Templates

Five professionally designed templates ship with the application, each providing a complete screen set (home, workout modes, execution, profile, admin) with consistent styling:

| Template | Visual Style | Best For |
|---|---|---|
| **Classic** | Clean, traditional layout matching the original EDGE look; solid colors, standard fonts | Existing SwimEx installations upgrading to the new system |
| **Modern** | Flat material design with bold accent colors, large touch targets, subtle shadows and transitions | General fitness and therapy facilities |
| **Clinical** | High-contrast, accessibility-focused with large fonts, clear iconography, WCAG AA compliance | Medical/rehab environments with older or visually impaired users |
| **Sport** | Dynamic, energetic design with performance-oriented gauges, dark backgrounds, neon accents | Competitive swim training facilities |
| **Minimal** | Stripped-down interface showing only essential controls; maximum whitespace, minimal decoration | Environments prioritizing simplicity |

**Template internals:**
- Each template is a collection of SVG-based layouts with pre-configured widget placements and animations.
- All templates use the same underlying widget library — only styling and arrangement differ.
- Templates define theme tokens (colors, fonts, spacing, border radii) that propagate to all contained widgets.
- General users see the template selected by the Administrator.
- Administrators select the active template from the admin panel.
- Templates can be further customized via the drag-and-drop builder after selection.
- Switching templates preserves all tag bindings, animation configurations, and functional logic.
- Templates can be exported and shared across installations as `.edge-template` packages.

### 8.8 Light & Dark Mode

| Aspect | Detail |
|---|---|
| Availability | All users (including general/guest) |
| Toggle Location | Accessible from the main UI header or user profile settings |
| Persistence | Preference saved per user account; guests get the system default |
| Scope | Affects all screens — workout, library, settings, execution, and all custom graphics |
| Implementation | CSS custom properties / SVG theme tokens; all 5 templates and all built-in widgets support both modes |
| Custom Graphics | Imported SVGs can reference theme tokens (e.g., `var(--color-primary)`) to automatically adapt to light/dark mode; raster images are unaffected |
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
  role:         Enum [SUPER_ADMINISTRATOR, ADMINISTRATOR, MAINTENANCE, USER]
  profilePhoto: Binary (nullable)
  preferences:  UserPreferences
  isActive:     Boolean
  createdAt:    DateTime
  lastLoginAt:  DateTime
}

CommissioningCodeStore {
  id:                    UUID
  organization:          Enum [SWIMEX, BSC_INDUSTRIES]
  codeHash:              String              // bcrypt/argon2 hash of the full 4-segment code
  salt:                  String              // Per-code unique salt
  failedResetAttempts:   Integer (default: 0)
  lastFailedAttemptAt:   DateTime (nullable)
  lockoutUntil:          DateTime (nullable)  // Escalating lockout timestamp
  lastSuccessfulResetAt: DateTime (nullable)
  lastResetBy:           String (nullable)    // Source IP or device identifier
  commissionedAt:        DateTime            // When the code was first set
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
  mode:            Enum [SERVER, CLIENT]
  // Server mode fields
  listenPort:      Integer (default: 502)          // SERVER only
  exposedUnitIds:  Array<Integer>                   // SERVER only
  serverRegisterMap: Array<ServerRegisterMapping>   // SERVER only — which tags to expose as registers
  accessPolicy:    Enum [READ_ONLY, READ_WRITE]    // SERVER only — default access for unmapped ranges
  maxConnections:  Integer (default: 10)            // SERVER only
  // Client mode fields
  host:            String                           // CLIENT only — PLC IP address
  port:            Integer (default: 502)           // CLIENT only
  unitId:          Integer                          // CLIENT only
  pollingInterval: Integer (ms)                     // CLIENT only
  timeout:         Integer (ms)                     // CLIENT only
  retries:         Integer (default: 3)             // CLIENT only
  writeStrategy:   Enum [WRITE_ON_CHANGE, CYCLIC]   // CLIENT only
  scanGroups:      Array<ScanGroup>                 // CLIENT only — register groups with independent poll rates
}

ServerRegisterMapping {
  registerType:    Enum [COIL, DISCRETE_INPUT, HOLDING_REGISTER, INPUT_REGISTER]
  startAddress:    Integer
  count:           Integer
  tagIds:          Array<UUID> (ref: ObjectTagMapping.id)
  access:          Enum [READ_ONLY, READ_WRITE]
}

ScanGroup {
  name:            String                           // e.g., "Fast — Speed/Status", "Slow — Diagnostics"
  pollingInterval: Integer (ms)
  registerMap:     Array<RegisterMapping>
}

RegisterMapping {
  registerType:    Enum [COIL, DISCRETE_INPUT, HOLDING_REGISTER, INPUT_REGISTER]
  startAddress:    Integer
  count:           Integer
  tagIds:          Array<UUID> (ref: ObjectTagMapping.id)
  byteOrder:       Enum [BIG_ENDIAN, LITTLE_ENDIAN, BIG_ENDIAN_WORD_SWAP, LITTLE_ENDIAN_WORD_SWAP]
  dataType:        Enum [INT16, UINT16, INT32, UINT32, FLOAT32, FLOAT64, BOOLEAN, STRING]
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

### 12.7 Graphic Library Schema

```
GraphicAsset {
  id:           UUID
  name:         String
  category:     String                     // e.g., "Pools", "Gauges", "Icons"
  tags:         Array<String>              // Searchable labels
  format:       Enum [SVG, PNG, JPEG, WEBP, GIF, DXF]
  sourceFile:   Binary                     // Original uploaded file
  svgContent:   String (nullable)          // Parsed SVG markup (for SVG and DXF-converted files)
  thumbnail:    Binary                     // Auto-generated preview
  elements:     Array<GraphicElement>      // Named internal SVG elements (SVG only)
  isBuiltIn:    Boolean                    // true for shipped widgets, false for user imports
  version:      Integer
  createdBy:    UUID (ref: User.id)
  createdAt:    DateTime
  updatedAt:    DateTime
}

GraphicElement {
  elementId:    String                     // SVG element ID (e.g., "needle", "tank-fill", "label-speed")
  elementType:  Enum [GROUP, PATH, RECT, CIRCLE, ELLIPSE, TEXT, IMAGE, POLYGON, LINE]
  displayName:  String                     // Human-friendly name shown in UI builder
  bindable:     Boolean                    // Whether this element can have animations bound to it
}
```

### 12.8 Animation Binding Schema

```
AnimationBinding {
  id:             UUID
  targetElement:  String                   // GraphicElement.elementId within the placed graphic
  targetProperty: Enum [
    FILL_COLOR, FILL_LEVEL, STROKE_COLOR, STROKE_WIDTH,
    OPACITY, VISIBILITY, ROTATION, SCALE_X, SCALE_Y,
    POSITION_X, POSITION_Y, TEXT_CONTENT, FONT_SIZE,
    SHADOW, CLIP_PATH, STROKE_DASH, PATH_MORPH, BLINK
  ]
  sourceTag:      UUID (ref: ObjectTagMapping.id)
  mappingType:    Enum [LINEAR_SCALE, THRESHOLD, BOOLEAN_TOGGLE, COLOR_GRADIENT,
                        STRING_FORMAT, EXPRESSION, LOOKUP_TABLE, CLAMP]
  mappingConfig:  JSON {
    inputMin:        Float (nullable)
    inputMax:        Float (nullable)
    outputMin:       Float (nullable)
    outputMax:       Float (nullable)
    thresholds:      Array<{value: Float, output: Any}> (nullable)
    colorStops:      Array<{value: Float, color: String}> (nullable)
    formatString:    String (nullable)       // e.g., "{value} %"
    expression:      String (nullable)       // e.g., "tag_value * 3.6 + 10"
    lookupTable:     Map<String, Any> (nullable)
    clampMin:        Float (nullable)
    clampMax:        Float (nullable)
  }
  transitionMs:   Integer (default: 200)
  easingFunction: Enum [LINEAR, EASE_IN, EASE_OUT, EASE_IN_OUT, SPRING]
  pivotX:         Float (nullable)          // Rotation pivot point
  pivotY:         Float (nullable)
}
```

### 12.9 UI Layout Schema

```
UILayout {
  id:          UUID
  name:        String
  templateId:  String  // Base template (CLASSIC, MODERN, CLINICAL, SPORT, MINIMAL)
  isActive:    Boolean
  createdBy:   UUID (ref: User.id)
  widgets:     Array<WidgetPlacement>
  version:     Integer
  updatedAt:   DateTime
}

WidgetPlacement {
  id:         UUID
  graphicId:  UUID (ref: GraphicAsset.id)
  widgetType: Enum [BUTTON, SLIDER, GAUGE, NUMERIC_DISPLAY, TIMER, CHART, LABEL,
                    IMAGE, TANK_LEVEL, LED, STATUS_BADGE, POOL_DIAGRAM, CUSTOM_SVG,
                    CONTAINER, TAB_BAR, TOGGLE, KNOB, ALARM_BANNER, ARC_GAUGE,
                    SPARKLINE, DONUT_CHART, VIDEO_EMBED]
  x:          Integer     // Grid position
  y:          Integer
  width:      Integer
  height:     Integer
  zOrder:     Integer     // Layer stacking order
  rotation:   Float       // Static rotation (0–360)
  locked:     Boolean     // Prevent accidental editing
  groupId:    UUID (nullable)  // Parent group for grouped elements
  properties: JSON        // Widget-specific static config (colors, labels, fonts, etc.)
  animations: Array<AnimationBinding>  // Dynamic property bindings
  tagMapping: UUID (ref: ObjectTagMapping.id, nullable)
  events:     Array<EventBinding>      // Touch interaction handlers
}

EventBinding {
  eventType:  Enum [TAP, LONG_PRESS, SWIPE, DOUBLE_TAP]
  action:     Enum [WRITE_TAG, NAVIGATE, TOGGLE_TAG, INCREMENT_TAG, DECREMENT_TAG, SHOW_POPUP]
  targetTag:  UUID (ref: ObjectTagMapping.id, nullable)
  writeValue: Any (nullable)
  targetPage: String (nullable)
}
```

### 12.8 Feature Flags Schema

```
FeatureFlag {
  id:          UUID
  featureKey:  String (unique)           // e.g., "BLUETOOTH_ENABLED"
  displayName: String                    // e.g., "Bluetooth Client-Server Transport"
  description: String
  isEnabled:   Boolean (default: false)  // Master on/off
  isVisible:   Boolean (default: false)  // Whether lower roles can see the feature's UI
  enabledBy:   UUID (ref: User.id)       // Must be SUPER_ADMINISTRATOR
  enabledAt:   DateTime (nullable)
  updatedAt:   DateTime
}
```

**Pre-configured feature flags (shipped with system):**

| Feature Key | Display Name | Default Enabled | Default Visible |
|---|---|---|---|
| `BLUETOOTH_ENABLED` | Bluetooth Client-Server Transport | `false` | `false` |

### 12.9 State Machine — Workout Lifecycle

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
│   ├── Network Config (Wi-Fi AP settings)
│   ├── Bluetooth Config (only visible if Super Admin has enabled Bluetooth)
│   ├── Communication Config (MQTT broker/client, Modbus TCP server/client, HTTP)
│   ├── Object-Tag Mapping (drag-and-drop tag assignment)
│   ├── Graphic Library (import, browse, categorize, version graphics)
│   ├── Graphic Builder (built-in SVG editor for creating/editing graphics)
│   ├── UI Builder (drag-and-drop layout editor with animation binding)
│   ├── Animation Config (bind graphic properties to PLC tags with mapping functions)
│   ├── Template Selector (5 built-in + custom)
│   ├── System Settings (date/time, logging, backup/restore)
│   └── Exit Kiosk Mode
│
├── [Super Administrator Views — Hidden from all other roles]
│   ├── Feature Flags (enable/disable Bluetooth, future hidden features)
│   ├── Bluetooth Master Toggle (enable/disable + show/hide for Admins)
│   ├── Factory Reset
│   ├── Firmware-Level Configuration
│   ├── Super Admin Account Management (CLI/API only for creation)
│   ├── Commissioning Code Status (view hash status, failed attempts, lockout state — codes themselves NOT shown)
│   └── System Diagnostics (low-level logs, hardware info)
│
├── [Super Admin Account Reset — Hidden screen, accessed via hidden gesture or CLI]
│   ├── Organization Select (SwimEx or BSC Industries)
│   ├── 4-Segment Code Entry (6 alphanumeric characters per segment)
│   ├── Validation → New Credentials Prompt (on success)
│   └── Lockout Display (on failure, with escalating timeout)
│
├── [Maintenance Views]
│   ├── Communication Config
│   ├── Graphic Library (import, browse)
│   ├── Graphic Builder (create/edit graphics)
│   ├── UI Builder (layout editor with animation binding)
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
| Server → PLC | Ethernet | MQTT Publish / Modbus TCP Client Write / HTTP POST | Start, Stop, Pause, Speed Set, Program Load |
| PLC → Server | Ethernet | MQTT Publish / Modbus TCP Client Read (polling) / HTTP GET | Current Speed, Elapsed Time, Workout State, Motor Temp, Fault Codes |
| Bidirectional | Ethernet | MQTT Keep-Alive | Heartbeat ping/ack for safety stop mechanism |

### 14.2 EDGE Server ↔ External Systems (Modbus TCP Server)

| Direction | Transport | Protocol | Data |
|---|---|---|---|
| External Master → Server | Ethernet | Modbus TCP (server mode, FC05/06/15/16) | Write commands from SCADA/BMS (start, stop, speed) |
| Server → External Master | Ethernet | Modbus TCP (server mode, FC01/02/03/04) | Pool status registers (speed, state, temp, faults) exposed as standard Modbus registers |

### 14.3 EDGE Client ↔ EDGE Server (Wi-Fi Primary; Bluetooth When Enabled)

| Direction | Transport | Data |
|---|---|---|
| Client → Server | Wi-Fi or Bluetooth: HTTP REST / WebSocket | User commands, authentication requests, program CRUD |
| Server → Client | Wi-Fi or Bluetooth: WebSocket / Server-Sent Events | Real-time status updates, speed/time, PLC connection state |
| Client → Server | Wi-Fi or Bluetooth: HTTP | Workout session logging, usage tracking |
| Bidirectional | Wi-Fi or Bluetooth: WebSocket | Client ↔ Server keep-alive heartbeat |

> **Bluetooth note:** Bluetooth is fully implemented and provides an identical transport for all client ↔ server data flows. The data model and API contracts are the same regardless of transport. Bluetooth is disabled and hidden by default — a Super Administrator must enable it before it becomes available.

### 14.5 Physical Air Buttons ↔ PLC

| Button | Action |
|---|---|
| START | Begin or resume workout |
| STOP | Immediately halt workout; triggers UI reset on tablet |
| SLOW | Decrease speed incrementally |
| FAST | Increase speed incrementally |

### 14.6 Concurrent Control

The tablet, web browsers, air buttons, and external Modbus TCP masters all operate as parallel input sources. The EDGE Server is the **single point of arbitration** — it receives commands from all sources (client over Wi-Fi, browser over Wi-Fi, external systems via Modbus TCP server, air buttons via PLC over Ethernet) and resolves conflicts. STOP always wins for safety. All state changes from any source are synchronized across the internal data bridge and broadcast to all connected clients and protocols in real time.

---

## 15. Security Considerations

| Concern | Mitigation |
|---|---|
| Unauthorized Pool Control | MAC address registration required for write access; unregistered devices are view-only |
| Unauthorized System Access | Role-based access control; all auth managed server-side |
| Kiosk Bypass | Android device lockdown via kiosk mode; exit requires admin/maintenance login |
| Network Security | Wired Ethernet for PLC link (physically secure); closed local Wi-Fi for client access; no internet exposure; optional TLS for MQTT |
| Modbus TCP Server Access | Per-register-range read-only/read-write permissions; administrator controls which registers are exposed; max connection limit prevents resource exhaustion |
| Credential Storage | Passwords hashed server-side (bcrypt/argon2); never stored on client |
| Super Admin Recovery | Account reset requires a 4-segment × 6-char alphanumeric commissioning code (SwimEx or BSC Industries); codes hashed at rest; escalating lockout on failed attempts; full audit trail |
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
| Exposed Ports | 80/443 (HTTP/HTTPS for web UI), 1883/8883 (MQTT broker), 502 (Modbus TCP server — exposes EDGE data to external masters) |
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
| Permissions | Device Admin, Draw Over Apps, System Alert Window, Wi-Fi, Bluetooth, Boot Completed |
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

**Server Wizard (Commissioning):**
1. Enter **SwimEx commissioning code** (4 segments × 6 alphanumeric characters each). This code is provided by SwimEx and must be securely recorded by the commissioning technician.
2. Enter **BSC Industries commissioning code** (4 segments × 6 alphanumeric characters each). This code is provided by BSC Industries and must be securely recorded by the commissioning technician.
3. Create Super Administrator account (first-run only; this is the only time a Super Admin can be created via UI).
4. Set Administrator credentials.
5. Configure Ethernet interface for PLC connection (IP address, subnet, gateway).
6. Configure Wi-Fi interface / AP settings for client-facing network.
7. Configure MQTT broker settings (ports, TLS, credentials).
8. Set PLC communication protocol and connection parameters (Modbus TCP address, MQTT topics, or HTTP endpoint).
9. (Optional) Import existing configuration backup.
10. (Optional) Register initial tablet MAC addresses.

> **Important:** The commissioning codes entered in steps 1–2 are immediately hashed and stored. The plaintext codes are never saved on the server. SwimEx and BSC Industries must independently retain their respective codes for future Super Admin account recovery.

**Client Wizard:**
1. Select Wi-Fi network and enter credentials.
2. Enter EDGE Server address (IP or hostname).
3. Test connectivity to server.
4. Confirm kiosk mode activation.
5. Device reboots into kiosk mode.

> **Bluetooth:** If a Super Administrator has enabled Bluetooth on the server, the client wizard will additionally present a Bluetooth pairing step. If Bluetooth is disabled (default), this step is completely hidden from the wizard.

### 16.4 Web Browser Access

| Scenario | Access Level |
|---|---|
| Any device on local network, no login | **View-only**: live pool status, current speed, active workout display |
| Browser with Super Administrator login | **Full access + hidden features**: everything Administrator sees plus Super Admin panel, feature flags, Bluetooth toggle |
| Browser with Administrator login | **Full access**: all features including admin panel, user management, communication config (Bluetooth settings visible only if Super Admin has enabled them) |
| Browser with User login | **Read + limited write**: can view own profile and history but cannot control pool (control restricted to registered tablets) |

---

## 17. Glossary

| Term | Definition |
|---|---|
| **EDGE** | SwimEx's branded touch-screen control platform for swim-in-place pools |
| **EDGE Server** | The primary application server (Linux/Windows/Docker) hosting the web app, MQTT broker, auth engine, and database |
| **EDGE Client** | The Android kiosk application that locks down the tablet and renders the EDGE UI |
| **PLC** | Programmable Logic Controller — the embedded controller managing pool motor and physical I/O |
| **Super Administrator** | Highest privilege role; can enable/disable hidden features (e.g., Bluetooth), perform factory reset, and access firmware-level config. Created only during server commissioning or via CLI/API. Account reset requires a commissioning code |
| **Commissioning Code** | A 4-segment × 6-character alphanumeric code (format: `XXXXXX-XXXXXX-XXXXXX-XXXXXX`) set during initial server commissioning. Two independent code sets exist — one for SwimEx, one for BSC Industries — either of which can reset a Super Admin account. Stored as salted hashes only |
| **BSC Industries** | System integrator partner; holds an independent commissioning code for Super Admin recovery |
| **Kiosk Mode** | Android device lockdown mode that restricts the tablet to only the EDGE application |
| **Bluetooth (Hidden Feature)** | Fully implemented alternative client-to-server transport; ships disabled and hidden by default; only a Super Administrator can enable and expose it |
| **Feature Flag** | Server-side toggle controlling whether a hidden feature (e.g., Bluetooth) is enabled and visible to lower roles |
| **Air Buttons** | Pneumatic buttons installed in the pool wall; waterproof physical controls |
| **PoolCtrl** | Default Wi-Fi SSID for the local network connecting the EDGE Client (tablet) to the EDGE Server |
| **Keep-Alive** | Periodic heartbeat on two segments: server ↔ PLC (Ethernet) and client ↔ server (Wi-Fi or Bluetooth) to verify end-to-end connectivity |
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
| **Modbus TCP Server** | Built-in service that exposes EDGE data as standard Modbus registers, allowing external SCADA/BMS/HMI systems to read/write pool data |
| **Modbus TCP Client** | Built-in service that actively polls and writes PLC registers over Ethernet |
| **Internal Data Bridge** | Synchronization layer within the EDGE Server that keeps MQTT topics, Modbus registers, and HTTP endpoints in sync via a unified tag database |
| **Graphic Library** | Centralized server-side storage for all imported and built-in SVG/raster graphic assets |
| **Graphic Builder** | Built-in SVG vector editor for creating and modifying graphics directly within the EDGE application |
| **Animation Binding** | Configuration that connects a PLC tag value to a graphic property (rotation, fill, color, etc.) through a mapping function |
| **Mapping Function** | Transform applied between a raw PLC tag value and a visual property output (linear scale, threshold, boolean, color gradient, expression, etc.) |
| **SVG** | Scalable Vector Graphics — the primary graphic format used throughout EDGE for resolution-independent, animatable UI elements |
| **Drag-and-Drop Builder** | Visual WYSIWYG editor allowing admin/maintenance to compose screens from widgets and graphics without code |
| **Template** | Pre-built UI theme/layout (5 ship with the system: Classic, Modern, Clinical, Sport, Minimal) |
| **Symbol / Component** | Reusable graphic element (e.g., a valve or motor icon) that can be instantiated multiple times with different tag bindings |

---

## 18. Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-02-22 | System Design & Engineering | Initial project description derived from EDGE Operation Instructions v1 |
| 2.0 | 2026-02-22 | System Design & Engineering | Major expansion: two-tier architecture (server + kiosk client), authentication & RBAC, kiosk mode, admin panel, MQTT broker, multi-protocol PLC communication, keep-alive safety stop, drag-and-drop UI builder, 5 templates, light/dark mode, MAC registration, user profiles & usage tracking, Docker deployment, installer packages, web browser access |
| 2.1 | 2026-02-22 | System Design & Engineering | Connectivity model correction: Server ↔ PLC is wired Ethernet only (not wireless); Client ↔ Server is Wi-Fi primary with Bluetooth as future addon; client never communicates directly with PLC; two-segment keep-alive (Ethernet + Wi-Fi); updated architecture diagrams, connection paths, integration points, deployment wizards, and glossary |
| 2.2 | 2026-02-22 | System Design & Engineering | Bluetooth reclassified: fully implemented but disabled and hidden by default (not a future feature). New Super Administrator role introduced as the only role that can enable/expose Bluetooth. Added feature flags system, Super Admin panel in UI flow, FeatureFlag data model, updated RBAC to 5 tiers, and updated all Bluetooth references throughout |
| 2.3 | 2026-02-22 | System Design & Engineering | Major graphics system expansion: SVG-first rendering architecture, graphic import (SVG/PNG/JPEG/WebP/GIF/DXF), built-in vector graphic editor, centralized Graphic Library with versioning, comprehensive animation system with data-driven property bindings (rotation, fill level, color, visibility, opacity, scale, position, text, blink, path morph), 8 mapping function types, animation timing controls, expanded built-in widget library (30+ widget types across 10 categories), pool-specific widgets, event bindings for touch interactions, updated data model (GraphicAsset, GraphicElement, AnimationBinding, EventBinding schemas) |
| 2.4 | 2026-02-22 | System Design & Engineering | Added built-in Modbus TCP server/client: server mode exposes EDGE data as standard Modbus registers for external SCADA/BMS/HMI; client mode polls/writes PLC registers. Internal data bridge synchronizes MQTT, Modbus, and HTTP via unified tag database. Expanded ModbusTcpConfig data model with server/client modes, scan groups, register mappings with byte order and data types. Updated integration points (new Section 14.2 for external systems), security (Modbus access control), and glossary |
| 2.5 | 2026-02-22 | System Design & Engineering | Super Admin commissioning code system: account reset requires a 4-segment × 6-char alphanumeric code. Two independent code sets (SwimEx and BSC Industries) configured at server commissioning. Codes stored as salted hashes only. Escalating lockout on failed attempts, full audit trail, tamper detection. Added Section 4.5 with code structure, lifecycle, reset flow, and security safeguards. New CommissioningCodeStore data model. Updated server wizard, Super Admin views, security table, and glossary |
