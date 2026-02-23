# SwimEx EDGE — Preset Workouts

Preset Workouts are pre-programmed by SwimEx and available in two categories: Distance and Sprint Set. Each category has three levels: Beginner, Intermediate, and Advanced. Users select a level and preset, then start.

---

## Overview

| Category | Description | Levels |
|----------|-------------|--------|
| Distance | Distance-based swimming workouts | Beginner, Intermediate, Advanced |
| Sprint Set | High-intensity interval sprints | Beginner, Intermediate, Advanced |

---

## Workflow

```
Preset Workout Workflow
=======================

SELECT LEVEL (Beginner / Intermediate / Advanced)
    |
    v
SELECT (choose preset from list)
    |
    v
START (begin workout)
```

---

## Level Selection

| Level | Target User | Typical Duration | Intensity |
|-------|-------------|------------------|-----------|
| Beginner | New users, light fitness | Shorter | Lower |
| Intermediate | Regular users | Moderate | Moderate |
| Advanced | Experienced swimmers | Longer | Higher |

---

## Distance Presets

Pre-programmed distance workouts:

| Level | Example Structure | Notes |
|-------|-------------------|-------|
| Beginner | Short warm-up, moderate swim, cool-down | Lower total distance |
| Intermediate | Extended warm-up, main set, cool-down | Moderate total distance |
| Advanced | Long warm-up, challenging main set, cool-down | Higher total distance |

---

## Sprint Set Presets

Pre-programmed high-intensity interval workouts:

| Level | Example Structure | Notes |
|-------|-------------------|-------|
| Beginner | Short sprints, longer rest | Fewer repetitions |
| Intermediate | Moderate sprints, moderate rest | Balanced |
| Advanced | Long sprints, short rest | More repetitions |

---

## Preset Structure

Presets are stored as fixed programs; users cannot edit them:

```
Distance Preset: Intermediate
============================

Warm-up: 5 min @ 40%
Main: 20 min @ 60%
Cool-down: 5 min @ 30%

Total: 30 minutes
```

---

## UI Flow

1. **Select category**: Distance or Sprint Set.
2. **Select level**: Beginner, Intermediate, or Advanced.
3. **View presets**: List of available presets for that level.
4. **Select preset**: Tap to select; highlight.
5. **Start**: Tap Start to begin workout.

---

## Permission and Access

| Role | Access |
|------|--------|
| User | Full access to preset workouts |
| Guest | View-only; cannot start |
| Admin | Full access |
| Maintenance | Full access |

---

## Data Storage

| Data | Location | Editable |
|------|----------|----------|
| Preset definitions | Server configuration | No (SwimEx only) |
| Preset metadata | Server configuration | No |
| Session history | Server database | Per user |

---

## Preset vs Custom

| Feature | Preset Workouts | Custom Programs |
|---------|-----------------|-----------------|
| Source | SwimEx pre-programmed | User-created |
| Editable | No | Yes |
| Save to library | N/A | Yes |
| Levels | Beginner/Intermediate/Advanced | N/A |

---

## Related Documentation

- [Custom Programs](CUSTOM_PROGRAMS.md) — User-created programs
- [Interval Training](INTERVAL_TRAINING.md) — Two-step interval mode
- [Workout Lifecycle](WORKOUT_LIFECYCLE.md) — State machine and transitions
