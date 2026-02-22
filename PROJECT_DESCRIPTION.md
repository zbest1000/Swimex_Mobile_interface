# SwimEx EDGE Touch Screen Monitor — Project Description

**Document Version:** 1.0
**Based on:** EDGE Operation Instructions v1 (02/01/2023)
**System Type:** Embedded Touch-Screen Pool Control Interface

---

## 1. Project Overview

The **SwimEx EDGE** is a tablet-based touch-screen control system designed to operate SwimEx swim-in-place (counter-current) pools. It serves as the primary user interface for programming, monitoring, and executing swim workouts by communicating wirelessly with the pool's motor controller. The system replaces or supplements physical in-pool air buttons with a rich graphical interface, providing real-time feedback on speed, time, distance, and workout progression.

### 1.1 Business Context

SwimEx manufactures aquatic therapy and fitness pools that generate an adjustable water current for stationary swimming. The EDGE tablet elevates the user experience by:

- Offering a visual, programmable interface beyond basic physical buttons.
- Enabling custom and preset workout programs with save/load capability.
- Providing a library system for workout management and recall.
- Supporting multiple user skill levels (Beginner, Intermediate, Advanced).

### 1.2 Key Stakeholders

| Stakeholder | Role |
|---|---|
| End Users | Pool swimmers, aquatic therapy patients, fitness professionals |
| Facility Operators | Gyms, rehab clinics, private pool owners |
| SwimEx Engineering | Hardware and firmware teams maintaining pool controllers |
| SwimEx Software Team | Developers maintaining the EDGE application |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────┐       Wi-Fi (PoolCtrl)       ┌──────────────────────┐
│   EDGE Tablet       │◄────────────────────────────►│   Pool Controller    │
│  (Android Tablet)   │     System-Generated AP       │   (Embedded MCU)     │
│                     │                               │                      │
│  ┌───────────────┐  │                               │  ┌────────────────┐  │
│  │ EDGE Web App  │  │                               │  │ Motor Driver   │  │
│  │ (Browser-     │  │   Commands: Start/Stop/       │  │                │  │
│  │  based UI)    │──┼── Speed/Time/Program ────────►│  │ Current Gen    │  │
│  │               │  │                               │  │                │  │
│  │               │◄─┼── Status: Speed/Time/ ◄──────│  │ Sensor Array   │  │
│  │               │  │   State Feedback              │  └────────────────┘  │
│  └───────────────┘  │                               │                      │
│                     │                               │  ┌────────────────┐  │
│  ┌───────────────┐  │                               │  │ Air Buttons    │  │
│  │ Android OS    │  │                               │  │ (Physical I/O) │  │
│  └───────────────┘  │                               │  └────────────────┘  │
└─────────────────────┘                               └──────────────────────┘
```

### 2.2 Component Breakdown

#### 2.2.1 EDGE Tablet (Client)

- **Platform:** Android tablet (Samsung-based, with physical Home button).
- **Application Type:** Browser-based web application launched via the Android INTERNET (browser) app.
- **Display:** Touch-screen interface with tap, numeric keypad input, and button interactions.
- **Connectivity:** Connects to the pool controller's dedicated Wi-Fi access point (`PoolCtrl` SSID).

#### 2.2.2 Pool Controller (Server)

- **Role:** Embedded controller that manages pool motor speed, current generation, and physical button I/O.
- **Communication:** Hosts a local Wi-Fi access point (`PoolCtrl`) and serves the EDGE web application.
- **Physical Interface:** In-pool air buttons (`START`, `STOP`, `SLOW`, `FAST`) that operate independently or in tandem with the tablet.

### 2.3 Communication Protocol

| Aspect | Detail |
|---|---|
| Transport | Wi-Fi (802.11), system-generated local AP |
| Network SSID | `PoolCtrl` |
| Topology | Direct tablet-to-controller (no internet required) |
| Application Layer | HTTP/WebSocket (browser-based app served by controller) |
| Latency Requirement | Near-real-time for speed adjustments and start/stop commands |

### 2.4 Critical Configuration Constraints

- **Manual Date/Time:** The tablet's date and time must be set manually. Automatic date/time and automatic time zone must be **disabled**. This implies the controller uses timestamp validation or certificate pinning that breaks with NTP-synced time, or the system operates fully offline and relies on local clock consistency.
- **No Internet:** The tablet connects exclusively to the `PoolCtrl` network, which is a local-only AP with no upstream internet.

---

## 3. Functional Requirements

### 3.1 Workout Modes

The EDGE application supports five distinct workout modes:

#### 3.1.1 Quick Start / Timed Workout

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

#### 3.1.2 Custom Programs

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
| Save | Persist program with user-defined name |
| Save As | Clone existing program under new name for editing |
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

#### 3.1.3 Interval Training

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

#### 3.1.4 Distance (Preset)

**Purpose:** Pre-programmed distance-based workouts at three difficulty levels.

**Levels:**

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

#### 3.1.5 Sprint Set (Preset)

**Purpose:** Pre-programmed high-intensity sprint workouts at three difficulty levels.

**Levels:** Beginner, Intermediate, Advanced (same tier structure as Distance).

**Workflow:** Identical to Distance preset workflow.

### 3.2 Navigation & UI Conventions

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

---

## 4. Non-Functional Requirements

### 4.1 Reliability

| Requirement | Specification |
|---|---|
| Dual-Input Safety | Both tablet and physical air buttons can stop the pool at any time |
| Failsafe on Disconnect | If Wi-Fi drops, physical air buttons remain operational (controller is independent) |
| State Reset | Screen returns to default settings after any stop action |

### 4.2 Usability

| Requirement | Specification |
|---|---|
| Touch Target Size | All interactive elements must be large enough for wet-finger operation |
| Input Validation | Numeric keypads constrain input to valid ranges |
| Visual Feedback | Selected items highlight green; loaded programs show name at top |
| Navigation Escape | SwimEx logo always returns to home — no dead-end screens |
| Minimal Steps | Quick Start allows zero-configuration pool operation |

### 4.3 Environment

| Requirement | Specification |
|---|---|
| Operating Conditions | Pool-side (humid, splash-prone environment) |
| Network | Closed local Wi-Fi; no internet dependency |
| Time Sync | Manual only; no NTP or automatic time zone |

### 4.4 Performance

| Requirement | Specification |
|---|---|
| Command Latency | Speed changes and start/stop must reflect within 1–2 seconds |
| UI Responsiveness | Keypad popups and navigation transitions must be near-instant |
| Program Storage | Must support multiple saved custom programs with no practical limit mentioned |

---

## 5. Data Model

### 5.1 Workout Program Schema

```
WorkoutProgram {
  id:        UUID
  name:      String              // User-defined label
  type:      Enum [CUSTOM, INTERVAL, DISTANCE_PRESET, SPRINT_PRESET]
  sets:      Integer (≥ 1)       // Number of set repetitions
  steps:     Array<Step> (1–10)  // Ordered sequence of steps
  level:     Enum [BEGINNER, INTERMEDIATE, ADVANCED]  // Presets only
  createdAt: DateTime
  updatedAt: DateTime
}

Step {
  order:     Integer (1–10)
  time:      Duration {
    minutes: Integer (0–480)
    seconds: Integer (0–59)
  }
  speed:     Integer (0–100)     // Percentage of max current
}
```

### 5.2 Workout Session Schema

```
WorkoutSession {
  id:             UUID
  programId:      UUID (nullable)   // Null for Quick Start
  startedAt:      DateTime
  endedAt:        DateTime
  terminatedBy:   Enum [TABLET_END, TABLET_PAUSE, AIR_BUTTON_STOP, TIMER_COMPLETE]
  stepsCompleted: Integer
  totalDuration:  Duration
}
```

### 5.3 State Machine — Workout Lifecycle

```
                    ┌─────────┐
                    │  IDLE   │ ◄──────────────────────┐
                    └────┬────┘                        │
                         │ START                       │
                         ▼                             │
                    ┌─────────┐                        │
              ┌────►│ RUNNING │────── TIMER_COMPLETE ──┘
              │     └────┬────┘                        │
              │          │ PAUSE                       │
              │          ▼                             │
              │     ┌─────────┐                        │
              └─────│ PAUSED  │────── END/STOP ────────┘
                    └─────────┘
```

**Transitions:**

| From | Event | To |
|---|---|---|
| IDLE | START (tablet or air button) | RUNNING |
| RUNNING | PAUSE (tablet) | PAUSED |
| RUNNING | END (tablet) or STOP (air button) | IDLE |
| RUNNING | Timer completes | IDLE |
| PAUSED | START (resume) | RUNNING |
| PAUSED | END (tablet) or STOP (air button) | IDLE |

---

## 6. User Interface Flow

### 6.1 Screen Hierarchy

```
Home Screen (tap anywhere)
├── Quick Start / Timed
│   ├── Speed Input (keypad popup)
│   ├── Time Input (keypad popup)
│   ├── START → Running Display (+/- speed, PAUSE, END)
│   └── STOP → Return to defaults
│
├── Custom Programs
│   ├── Set Configuration (repetition count)
│   ├── Step Editor (up to 10 steps: time + speed)
│   ├── Save / Save As (name input via keyboard)
│   ├── Library (browse → select → load → confirm)
│   ├── Select → Execution Screen
│   └── START → Running Display
│
├── Interval
│   ├── Set Configuration (repetition count, must > 0)
│   ├── Step 1 Config (time + speed via blue boxes)
│   ├── Step 2 Config (time + speed via blue boxes)
│   ├── Select → Execution Screen
│   └── START → Running Display
│
├── Distance (Preset)
│   ├── Level Select (Beginner / Intermediate / Advanced)
│   ├── Select → Execution Screen
│   └── START → Running Display
│
└── Sprint Set (Preset)
    ├── Level Select (Beginner / Intermediate / Advanced)
    ├── Select → Execution Screen
    └── START → Running Display
```

### 6.2 Execution Screen (Common)

All workout modes converge to a shared execution screen that:
- Displays current speed, elapsed time, and workout progress.
- Provides START to begin (if not yet started).
- Offers two start methods: tablet START button or physical in-pool START button.
- Shows real-time updates as the workout progresses through steps/sets.

---

## 7. Integration Points

### 7.1 Tablet ↔ Pool Controller

| Direction | Data |
|---|---|
| Tablet → Controller | Start, Stop, Pause, End, Speed Set, Program Load |
| Controller → Tablet | Current Speed, Elapsed Time, Workout State, Step Progress |

### 7.2 Physical Air Buttons ↔ Controller

| Button | Action |
|---|---|
| START | Begin or resume workout |
| STOP | Immediately halt workout; resets tablet display |
| SLOW | Decrease speed incrementally |
| FAST | Increase speed incrementally |

### 7.3 Concurrent Control

The tablet and air buttons operate as parallel input sources to the same controller. Both can issue start/stop commands. Speed adjustments from either source are reflected on the tablet display in real time.

---

## 8. Security Considerations

| Concern | Mitigation |
|---|---|
| Unauthorized Pool Access | `PoolCtrl` Wi-Fi is a closed, local AP (not internet-connected) |
| Time Manipulation | Automatic time sync disabled; manual time prevents external drift issues |
| Physical Safety | In-pool STOP button always functional regardless of tablet/Wi-Fi state |
| Data Integrity | Programs saved locally on tablet; no cloud sync (no internet) |

---

## 9. Deployment & Configuration

### 9.1 Initial Setup Procedure

1. **Set Date/Time:** Settings → General Management → Date and Time → set manually. Disable automatic date/time and automatic time zone.
2. **Connect Wi-Fi:** Settings → Connections → Wi-Fi → select `PoolCtrl` network.
3. **Launch App:** Home Screen → INTERNET (browser) app → EDGE application loads automatically.

### 9.2 Environment Assumptions

- Tablet is mounted or positioned pool-side within Wi-Fi range of the controller.
- No internet connectivity required or expected.
- Tablet power is maintained (charging dock or wired power recommended for continuous use).
- Physical air buttons are always available as a fallback control mechanism.

---

## 10. Glossary

| Term | Definition |
|---|---|
| **EDGE** | SwimEx's branded touch-screen control interface for their swim-in-place pools |
| **Air Buttons** | Pneumatic buttons installed in the pool wall; waterproof physical controls |
| **PoolCtrl** | The Wi-Fi SSID broadcast by the pool's embedded controller |
| **Set** | One complete pass through all programmed steps |
| **Step** | A single time + speed segment within a set |
| **Quick Start** | Zero-configuration workout mode; start the pool and adjust on the fly |
| **Custom Program** | User-created multi-step workout saved to a library |
| **Interval** | Two-step alternating workout with configurable repetitions |
| **Distance** | Preset workout mode focused on swim distance at three difficulty levels |
| **Sprint Set** | Preset high-intensity workout at three difficulty levels |
| **Speed (%)** | Pool current intensity as a percentage of maximum motor output |

---

## 11. Revision History

| Version | Date | Author | Description |
|---|---|---|---|
| 1.0 | 2026-02-22 | System Design & Engineering | Initial project description derived from EDGE Operation Instructions v1 |
