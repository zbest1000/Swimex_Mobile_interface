# SwimEx EDGE — Workouts Documentation

This section documents the workout modes and lifecycle for the SwimEx EDGE pool control platform. All workout data is stored on the server per user. The system supports five workout modes: Quick Start (Timed), Custom Programs, Interval Training, Distance Presets, and Sprint Set Presets.

---

## Workouts Section Index

| Document | Description |
|----------|-------------|
| [Quick Start](QUICK_START.md) | Timed workout mode with three control methods: air buttons only, tablet full control with speed and time numeric input, and tablet start with incremental adjust. Parameters: speed 0–100%, time MM:SS. Lifecycle: set, start, run, stop/pause/end, reset. |
| [Custom Programs](CUSTOM_PROGRAMS.md) | User-defined programs with up to 10 steps per set, configurable set repetitions, time up to 480 min per step, speed percentage. Save/Save As with name, library management (browse, select/highlight green, load, confirm YES). Workflow: navigate, sets, edit, time+speed per step, save, select, start. |
| [Interval Training](INTERVAL_TRAINING.md) | Interval mode with two steps and set repetition (must be greater than 0). Time and speed per step configured via blue boxes. Workflow: select, start. |
| [Preset Workouts](PRESET_WORKOUTS.md) | Distance and Sprint Set presets: Beginner, Intermediate, and Advanced levels. Pre-programmed by SwimEx. Workflow: select level, select, start. |
| [Workout Lifecycle](WORKOUT_LIFECYCLE.md) | State machine documentation: IDLE, RUNNING, PAUSED, SAFETY STOP. Transitions: START, PAUSE, END/STOP, timer complete, heartbeat lost (disconnect to SAFETY STOP), reconnect and manual START. Includes ASCII state diagram. |

---

## Workout Modes Summary

| Mode | Control Input | Parameters | Storage |
|------|---------------|------------|---------|
| Quick Start | Air buttons, tablet, or hybrid | Speed 0–100%, time MM:SS | Session only |
| Custom Programs | Tablet only | Steps, sets, time, speed per step | Save to library per user |
| Interval Training | Tablet only | 2 steps, repetition, time, speed | Session only |
| Distance Presets | Tablet only | Level (Beginner/Intermediate/Advanced) | Pre-programmed |
| Sprint Set Presets | Tablet only | Level (Beginner/Intermediate/Advanced) | Pre-programmed |

---

## Data Persistence

All workout data is stored on the EDGE Server:

| Data Type | Storage Location | Scope |
|-----------|------------------|-------|
| Custom programs | Server database | Per user |
| Workout history | Server database | Per user |
| Session data | Server memory | Session only |
| Preset definitions | Server configuration | System-wide |

---

## Quick Reference

### Workout Lifecycle States

| State | Description |
|-------|-------------|
| IDLE | No workout active; ready to start |
| RUNNING | Workout in progress; timer counting |
| PAUSED | Workout paused; timer stopped |
| SAFETY STOP | Emergency stop; heartbeat lost or manual safety trigger |

### Related Documentation

- [Workout Lifecycle](WORKOUT_LIFECYCLE.md) — Full state machine and transitions
- [User Profiles](../user-profiles/USAGE_TRACKING.md) — Workout history and usage statistics
- [Communication Topology](../architecture/COMMUNICATION_TOPOLOGY.md) — Client-to-server communication

---

## Document Quick Reference

| Document | Key Topics |
|----------|------------|
| [Quick Start](QUICK_START.md) | Air buttons, tablet control, speed 0–100%, time MM:SS |
| [Custom Programs](CUSTOM_PROGRAMS.md) | 10 steps, set repetitions, Save As, library, load |
| [Interval Training](INTERVAL_TRAINING.md) | 2 steps, blue boxes, repetition > 0 |
| [Preset Workouts](PRESET_WORKOUTS.md) | Distance, Sprint Set, Beginner/Intermediate/Advanced |
| [Workout Lifecycle](WORKOUT_LIFECYCLE.md) | IDLE, RUNNING, PAUSED, SAFETY STOP, heartbeat |

---

## Server-Side Storage

All workout data is persisted on the EDGE Server. The Android client and web browser act as thin clients; they send commands and receive state updates but do not store workout definitions or history locally. This ensures data consistency and allows users to access their programs from any registered device.

| Data | Server Storage | Client Storage |
|------|----------------|----------------|
| Custom programs | Database | None |
| Workout history | Database | None |
| Session state | Memory | Display only |
