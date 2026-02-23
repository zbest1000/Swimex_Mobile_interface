# SwimEx EDGE — Quick Start (Timed) Workout Mode

The Quick Start mode provides a simple timed workout with three control methods. Users can operate the pool using air buttons only, tablet with full control, or a hybrid approach: tablet start with incremental adjust.

---

## Overview

Quick Start is the fastest way to begin a workout. Set speed and time, then start. The workout runs until the timer completes or the user stops manually.

---

## Parameters

| Parameter | Range | Unit | Description |
|-----------|-------|------|-------------|
| Speed | 0–100 | % | Motor speed percentage; 0 = off, 100 = maximum |
| Time | 00:00–99:59 | MM:SS | Workout duration; minutes and seconds |

---

## Control Methods

### Method 1: Air Buttons Only

Physical buttons on the pool deck allow control without a tablet:

| Action | Button | Result |
|--------|--------|--------|
| Start | Start | Begins workout at configured speed and time |
| Pause | Pause | Pauses workout; timer stops |
| Resume | Resume | Resumes from paused state |
| Stop | Stop | Ends workout; returns to IDLE |

**Limitation**: Speed and time must be pre-configured or use last-used values. No numeric input from air buttons.

---

### Method 2: Tablet Full Control

| Action | UI Element | Result |
|--------|------------|--------|
| Set speed | Numeric input (0–100) | Direct speed entry |
| Set time | Numeric input (MM:SS) | Direct time entry |
| Start | Start button | Begins workout |
| Pause | Pause button | Pauses workout |
| Stop | Stop button | Ends workout |

---

### Method 3: Tablet Start + Incremental Adjust

| Action | UI Element | Result |
|--------|------------|--------|
| Start | Start button | Begins workout with default or last speed/time |
| Adjust speed | +/- buttons | Increment or decrement speed during workout |
| Adjust time | +/- buttons | Adjust remaining time during workout |
| Pause | Pause button | Pauses workout |
| Stop | Stop button | Ends workout |

---

## Lifecycle

```
Quick Start Lifecycle
====================

SET (configure parameters)
    |
    v
START (user initiates)
    |
    v
RUN (timer running, motor at speed)
    |
    +---> Timer complete ---> END
    |
    +---> User PAUSE ---> PAUSED
    |                         |
    |                         v
    |                    User RESUME ---> RUN
    |
    +---> User STOP ---> END
    |
    v
STOP / PAUSE / END
    |
    v
RESET (return to IDLE, ready for next workout)
```

---

## Parameter Summary Table

| Parameter | Default | Min | Max | Increment |
|-----------|---------|-----|-----|-----------|
| Speed | 50 | 0 | 100 | 1 (or 5 for +/-) |
| Time | 10:00 | 00:01 | 99:59 | 1 second |

---

## UI Flow

1. **Set**: User selects Quick Start mode; enters or adjusts speed and time.
2. **Start**: User selects Start; server validates and sends command to PLC.
3. **Run**: Timer counts down; motor runs at requested speed.
4. **Stop/Pause/End**: User stops, pauses, or timer completes.
5. **Reset**: System returns to IDLE; ready for next workout.

---

## Data Storage

Quick Start sessions are tracked in workout history (per user) but the parameters themselves are not saved as named programs. Last-used speed and time may be cached for convenience.

---

## Related Documentation

- [Workout Lifecycle](WORKOUT_LIFECYCLE.md) — State machine and transitions
- [Custom Programs](CUSTOM_PROGRAMS.md) — Saving programs for reuse
- [User Profiles](../user-profiles/USAGE_TRACKING.md) — Session tracking and statistics
