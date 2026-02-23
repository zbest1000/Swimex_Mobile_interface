# SwimEx EDGE — Usage Tracking

This document describes account creation, profile data, and automatic usage tracking for the SwimEx EDGE platform. Profile data includes saved programs, workout history, usage statistics, and preferences. Guest sessions are tracked anonymously.

---

## Account Creation

| Field | Required | Description |
|-------|----------|-------------|
| Username | Yes | Unique login identifier |
| Password | Yes | Must meet complexity requirements |
| Display name | Yes | User-facing name shown in UI |
| Email | No | Optional; for notifications or recovery |
| Photo | No | Optional; profile avatar |

---

## Profile Data

### Saved Programs

| Data | Description | Source |
|------|-------------|--------|
| Program name | User-defined | Custom Programs mode |
| Steps | Time and speed per step | Custom Programs mode |
| Set repetitions | Number of set repeats | Custom Programs mode |
| Created/Modified | Timestamps | Server |

---

### Workout History

| Data | Description | Source |
|------|-------------|--------|
| Session date/time | When workout occurred | Server |
| Mode | Quick Start, Custom, Interval, Preset | Server |
| Duration | Total time | Server |
| Speed profile | Speed over time | Server |
| Steps/sets completed | Progress within program | Server |

---

### Usage Statistics

| Statistic | Description | Unit |
|-----------|-------------|------|
| Total swim time | Sum of all session durations | Minutes |
| Session count | Number of workouts | Count |
| Avg speed | Average speed across sessions | % |
| Calories | Estimated (if supported) | kcal |

---

### Preferences

| Preference | Description | Options |
|------------|-------------|---------|
| Theme | Light or dark mode | Light, Dark, System |
| Default speed | Default for Quick Start | 0–100% |
| Fitness level | Beginner/Intermediate/Advanced | For preset suggestions |

---

## Automatic Tracking

The server automatically tracks the following during workouts:

| Metric | When Recorded | Stored |
|--------|---------------|--------|
| Session start | User starts workout | Yes |
| Session end | User stops or timer completes | Yes |
| Mode used | Workout mode selected | Yes |
| Speed over time | Sampled during workout | Yes |
| Steps/sets completed | Per step/set completion | Yes |
| Calories | Estimated from duration/speed | Yes (if enabled) |

---

## Tracking Flow

```
Workout Session
===============

User starts workout
    |
    v
Server records: mode, start time
    |
    v
During workout:
    +-- Speed sampled periodically
    +-- Steps/sets completion logged
    |
    v
User stops or timer completes
    |
    v
Server records: end time, duration, stats
    |
    v
Update user profile:
    +-- Workout history entry
    +-- Total swim time
    +-- Session count
    +-- Avg speed (recalculated)
```

---

## Guest Sessions

| Aspect | Behavior |
|--------|----------|
| Identity | No user account; anonymous |
| Tracking | Session data recorded without user link |
| Storage | Aggregated for analytics; no personal history |
| Write access | None; view-only |

---

## Data Retention

| Data Type | Retention | Notes |
|-----------|-----------|-------|
| Workout history | Per policy | Configurable; e.g., 90 days, 1 year |
| Usage stats | Permanent | Rolling aggregates |
| Saved programs | Until deleted | Per user |
| Guest sessions | Anonymous aggregate | No PII |

---

## Profile API Summary

| Operation | Description |
|-----------|-------------|
| Create account | Register new user |
| Update profile | Change display name, email, photo |
| Get history | Fetch workout history (paginated) |
| Get stats | Fetch usage statistics |
| Get programs | Fetch saved custom programs |
| Update preferences | Change theme, default speed, fitness level |

---

## Permission Matrix

| Action | User | Guest |
|--------|------|-------|
| Create account | N/A (already has) | Yes (optional) |
| View own profile | Yes | No |
| Edit profile | Yes | No |
| View history | Yes | No |
| View stats | Yes | No |
| Save programs | Yes | No |
| Update preferences | Yes | Session only |

---

## Related Documentation

- [User Profiles README](README.md) — User profiles index
- [Workouts](../workouts/README.md) — Workout modes and data
- [Authentication](../authentication/SESSION_MANAGEMENT.md) — Session and user context
