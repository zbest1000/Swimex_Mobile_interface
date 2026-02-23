# SwimEx EDGE — Interval Training

Interval Training mode provides a two-step alternating workout. Users configure step 1 and step 2 with time and speed, set the number of repetitions, and start. Workout data is stored on the server per user.

---

## Overview

| Feature | Limit | Description |
|---------|-------|-------------|
| Steps | 2 | Fixed; alternating work and rest (or high/low intensity) |
| Set repetition | Configurable | Must be greater than 0 |
| Time per step | Configurable | Duration for each step |
| Speed per step | Configurable | Motor speed for each step |

---

## Workflow

```
Interval Training Workflow
==========================

SELECT (choose Interval Training mode)
    |
    v
CONFIGURE (Step 1: time + speed in blue box)
    |
    v
CONFIGURE (Step 2: time + speed in blue box)
    |
    v
SET REPETITION (must be > 0)
    |
    v
START (begin workout)
```

---

## Step Configuration

Each step is configured via a blue box in the UI:

| Step | Parameters | Blue Box |
|------|------------|----------|
| Step 1 | Time, Speed | First blue box |
| Step 2 | Time, Speed | Second blue box |

---

## Parameter Ranges

| Parameter | Range | Unit | Description |
|-----------|-------|------|-------------|
| Step 1 time | 1–480 | minutes | Duration of work/high intensity |
| Step 1 speed | 0–100 | % | Motor speed for step 1 |
| Step 2 time | 1–480 | minutes | Duration of rest/low intensity |
| Step 2 speed | 0–100 | % | Motor speed for step 2 |
| Repetitions | 1–999 | count | Number of times to repeat the set |

---

## Validation Rules

| Rule | Validation |
|------|-------------|
| Set repetition | Must be > 0 |
| Step time | Must be > 0 |
| Step speed | 0–100% |

---

## Execution Example

```
Repetition: 3

Cycle 1:
  Step 1: 2 min @ 70% (work)
  Step 2: 1 min @ 30% (rest)

Cycle 2:
  Step 1: 2 min @ 70% (work)
  Step 2: 1 min @ 30% (rest)

Cycle 3:
  Step 1: 2 min @ 70% (work)
  Step 2: 1 min @ 30% (rest)

Total: 9 minutes
```

---

## UI Elements

| Element | Description |
|---------|-------------|
| Blue box (Step 1) | Time and speed input for first step |
| Blue box (Step 2) | Time and speed input for second step |
| Repetition control | Numeric input or stepper for set count |
| Start button | Initiates workout |

---

## Lifecycle

Interval Training follows the standard workout lifecycle:

1. **IDLE**: Configure steps and repetition.
2. **RUNNING**: Alternates between step 1 and step 2 for the set duration.
3. **PAUSED**: User can pause; resumes from current step.
4. **END**: All repetitions complete or user stops.

---

## Data Storage

| Data | Location | Scope |
|------|----------|-------|
| Session data | Server | Per user, per session |
| Workout history | Server database | Per user |
| Session parameters | Not saved | Must reconfigure each time |

---

## Comparison with Custom Programs

| Feature | Interval Training | Custom Programs |
|---------|-------------------|-----------------|
| Steps | 2 (fixed) | Up to 10 |
| Save to library | No | Yes |
| Repetition | Yes | Yes |
| Complexity | Low | High |

---

## Related Documentation

- [Custom Programs](CUSTOM_PROGRAMS.md) — Multi-step programs with save
- [Workout Lifecycle](WORKOUT_LIFECYCLE.md) — State machine and transitions
- [Quick Start](QUICK_START.md) — Simple timed workout
