# SwimEx EDGE — Workout Lifecycle

This document describes the workout state machine and transitions for the SwimEx EDGE platform. All workout modes follow the same lifecycle: IDLE, RUNNING, PAUSED, and SAFETY STOP.

---

## State Machine Overview

| State | Description |
|-------|-------------|
| IDLE | No workout active; ready to start |
| RUNNING | Workout in progress; timer counting; motor running |
| PAUSED | Workout paused; timer stopped; motor stopped |
| SAFETY STOP | Emergency stop; heartbeat lost or manual safety trigger |

---

## ASCII State Diagram

```
                    +--------+
                    |  IDLE  |
                    +--------+
                         |
                         | START
                         v
                    +--------+
                    |RUNNING |
                    +--------+
                    |  |  |  |
                    |  |  |  +-- Timer complete
                    |  |  |         |
                    |  |  |         v
                    |  |  |    +--------+
                    |  |  |    |  END   |
                    |  |  |    +--------+
                    |  |  |
                    |  |  +-- END/STOP (user)
                    |  |         |
                    |  |         v
                    |  |    +--------+
                    |  |    |  IDLE  |
                    |  |    +--------+
                    |  |
                    |  +-- PAUSE (user)
                    |         |
                    |         v
                    |    +--------+
                    |    | PAUSED |
                    |    +--------+
                    |         |
                    |         | RESUME
                    |         v
                    |    +--------+
                    |    |RUNNING |
                    |    +--------+
                    |
                    +-- Heartbeat lost (disconnect)
                              |
                              v
                         +------------+
                         |SAFETY STOP |
                         +------------+
                              |
                              | Reconnect + manual START
                              v
                         +--------+
                         |  IDLE  |
                         +--------+
```

---

## Transition Rules

| From | Transition | To | Trigger |
|------|------------|-----|---------|
| IDLE | START | RUNNING | User initiates workout |
| RUNNING | PAUSE | PAUSED | User taps Pause |
| RUNNING | END/STOP | IDLE | User taps Stop or End |
| RUNNING | Timer complete | IDLE | Workout timer reaches zero |
| RUNNING | Heartbeat lost | SAFETY STOP | Client disconnect or timeout |
| PAUSED | RESUME | RUNNING | User taps Resume |
| PAUSED | END/STOP | IDLE | User taps Stop |
| SAFETY STOP | Reconnect + START | IDLE | Client reconnects; user must manually START |

---

## Heartbeat and Safety Stop

```
Heartbeat Flow
=============

Client sends heartbeat (periodic)
    |
    v
Server receives heartbeat
    |
    v
Server resets timeout
    |
    +-- Heartbeat missed (timeout)
    |       |
    |       v
    |   Server triggers SAFETY STOP
    |       |
    |       v
    |   Motor stops immediately
    |       |
    |       v
    |   UI shows SAFETY STOP state
    |
    +-- Heartbeat received
            |
            v
        Continue RUNNING
```

---

## Reconnect Behavior

After a disconnect (SAFETY STOP):

1. Client reconnects to server.
2. Server restores session state.
3. Workout remains in SAFETY STOP.
4. User must manually acknowledge and tap START to return to IDLE (or begin new workout).
5. System does not auto-resume; safety requires explicit user action.

---

## State Persistence

| State | Persisted | Notes |
|-------|-----------|-------|
| IDLE | No | Default state |
| RUNNING | Session only | Lost on disconnect |
| PAUSED | Session only | Lost on disconnect |
| SAFETY STOP | Session only | Cleared on reconnect |

---

## Timer Behavior

| State | Timer | Motor |
|-------|-------|-------|
| IDLE | Stopped | Off |
| RUNNING | Counting down | At configured speed |
| PAUSED | Paused | Off |
| SAFETY STOP | Stopped | Off |

---

## Related Documentation

- [Quick Start](QUICK_START.md) — Timed workout lifecycle
- [Custom Programs](CUSTOM_PROGRAMS.md) — Multi-step program execution
- [Communication Keep-Alive](../communication/KEEP_ALIVE.md) — Heartbeat protocol
