# SwimEx EDGE — Custom Programs

Custom Programs allow users to create and save workout programs with multiple steps and sets. Programs are stored on the server per user and can be loaded from the library for reuse.

---

## Overview

| Feature | Limit | Description |
|---------|-------|-------------|
| Steps per set | Up to 10 | Each step has time and speed |
| Set repetitions | Configurable | Number of times to repeat the set |
| Time per step | 1–480 min | Maximum 480 minutes per step |
| Speed per step | 0–100% | Motor speed for each step |
| Saved programs | Per user | Stored on server; library management |

---

## Step Configuration

Each step in a set has two parameters:

| Parameter | Range | Unit | Description |
|-----------|-------|------|-------------|
| Time | 1–480 | minutes | Duration of this step |
| Speed | 0–100 | % | Motor speed during this step |

---

## Workflow

```
Custom Program Workflow
======================

NAVIGATE (to Custom Programs mode)
    |
    v
SETS (view or create/edit sets)
    |
    v
EDIT (configure steps, time, speed per step)
    |
    v
SAVE or SAVE AS (enter name, confirm)
    |
    v
SELECT (browse library, highlight green)
    |
    v
LOAD (confirm YES)
    |
    v
START (begin workout)
```

---

## Library Management

| Action | Description | UI Feedback |
|--------|-------------|-------------|
| Browse | Scroll through saved programs | List view |
| Select | Tap to select a program | Highlight green |
| Load | Load selected program | Confirm YES dialog |
| Delete | Remove program from library | Confirm dialog |

---

## Save and Save As

| Action | Use Case | Result |
|--------|----------|--------|
| Save | Save changes to existing program | Overwrites current program |
| Save As | Create new program from current | Prompts for name; creates new entry |

---

## Save Dialog

When saving a program:

1. User enters program name (required).
2. User confirms Save or Save As.
3. Server validates and stores program.
4. Program appears in library.

---

## Program Structure

```
Program: "Morning Swim"
======================

Set: 1 repetition
  Step 1: 5 min @ 40%
  Step 2: 10 min @ 60%
  Step 3: 5 min @ 80%
  Step 4: 5 min @ 40%
  Step 5: 5 min @ 20%

Total: 30 minutes
```

---

## Edit Flow

1. **Add step**: Tap Add Step; configure time and speed.
2. **Edit step**: Tap step; modify time or speed.
3. **Remove step**: Tap Remove; confirm.
4. **Set repetitions**: Set number of times to repeat the set (must be > 0).
5. **Reorder**: Drag to reorder steps (if supported).

---

## Validation Rules

| Rule | Validation |
|------|------------|
| Step count | 1–10 steps per set |
| Set repetitions | Must be > 0 |
| Time per step | 1–480 minutes |
| Speed per step | 0–100% |
| Program name | Non-empty, unique per user |

---

## Data Storage

| Data | Location | Scope |
|------|----------|-------|
| Program definitions | Server database | Per user |
| Program metadata | Server database | Name, created, modified |
| Step data | Server database | Time, speed per step |

---

## Related Documentation

- [Workout Lifecycle](WORKOUT_LIFECYCLE.md) — State machine and transitions
- [Interval Training](INTERVAL_TRAINING.md) — Simplified two-step interval mode
- [User Profiles](../user-profiles/USAGE_TRACKING.md) — Saved programs and usage tracking
