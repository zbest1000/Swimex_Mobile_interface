# SwimEx EDGE — User Profiles Documentation

This section documents user profiles, account creation, and usage tracking for the SwimEx EDGE platform. Profile data includes saved programs, workout history, usage statistics, and preferences. All data is stored on the server per user.

---

## User Profiles Section Index

| Document | Description |
|----------|-------------|
| [Usage Tracking](USAGE_TRACKING.md) | Account creation (username, password, display name, optional email/photo). Profile data: saved programs, workout history, usage stats (total swim time, session count, avg speed), preferences (theme, default speed, fitness level). Automatic tracking: session times, mode used, speed over time, steps/sets completed, calories (estimated). Guest sessions tracked anonymously. |

---

## Profile Data Summary

| Data Type | Description | Storage |
|-----------|-------------|---------|
| Saved programs | Custom programs from Custom Programs mode | Per user |
| Workout history | Past sessions with mode, duration, speed | Per user |
| Usage stats | Total swim time, session count, avg speed | Per user |
| Preferences | Theme, default speed, fitness level | Per user |
| Guest sessions | Anonymous session data | Anonymous (no user link) |

---

## Account vs Guest

| Feature | Account | Guest |
|---------|---------|-------|
| Saved programs | Yes | No |
| Workout history | Yes | Anonymous only |
| Preferences | Yes | Session only |
| Usage stats | Yes | Aggregated anonymous |
| Write access | Yes (if device registered) | No |

---

## Profile Structure

```
User Profile
============

+-- Identity
|   +-- Username
|   +-- Display name
|   +-- Email (optional)
|   +-- Photo (optional)
|
+-- Saved Programs
|   +-- Program 1
|   +-- Program 2
|   +-- ...
|
+-- Workout History
|   +-- Session 1
|   +-- Session 2
|   +-- ...
|
+-- Usage Stats
|   +-- Total swim time
|   +-- Session count
|   +-- Avg speed
|
+-- Preferences
    +-- Theme (light/dark)
    +-- Default speed
    +-- Fitness level
```

---

## Related Documentation

- [Usage Tracking](USAGE_TRACKING.md) — Full tracking and profile details
- [Workouts](../workouts/README.md) — Workout modes and saved programs
- [Authentication](../authentication/README.md) — Login and session management

---

## Document Quick Reference

| Document | Key Topics |
|----------|------------|
| [Usage Tracking](USAGE_TRACKING.md) | Account creation, saved programs, workout history, usage stats, preferences, guest sessions |
