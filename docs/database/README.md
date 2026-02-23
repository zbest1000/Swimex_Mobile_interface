# SwimEx EDGE — Database Documentation

This section covers the database schema, entity relationships, and migration strategy for the SwimEx EDGE platform.

## Overview

The EDGE Server uses a relational database (SQLite by default) for persistent storage. The schema supports users, devices, workout programs, communication configuration, UI layouts, and system metadata.

## Documentation Index

| Document | Description |
|----------|-------------|
| [SCHEMA.md](SCHEMA.md) | Full schema reference. Tables, columns, indexes, entity relationships. |
| [MIGRATIONS.md](MIGRATIONS.md) | Migration strategy. Auto-run on startup, versioned migrations, backup, rollback. |

## Database Technology

| Property | Value |
|----------|-------|
| Default Engine | SQLite 3 |
| File Location | `/data/db/edge.db` (configurable) |
| Alternative | PostgreSQL (enterprise deployments) |

## Schema Overview

| Domain | Tables | Purpose |
|--------|--------|---------|
| Users & Auth | User, CommissioningCodeStore | User accounts, roles, commissioning codes |
| Devices | RegisteredDevice | Tablet/kiosk device registration |
| Workouts | WorkoutProgram, Step, WorkoutSession, SpeedSample | Programs, steps, sessions, telemetry |
| Communication | CommunicationConfig | MQTT, Modbus, HTTP configuration |
| Tags & Data | ObjectTagMapping | Tag-to-object bindings for UI |
| Graphics | GraphicAsset, GraphicElement, AnimationBinding | SVG assets, elements, animations |
| UI | UILayout, WidgetPlacement, EventBinding | Layouts, widget positions, event bindings |
| System | FeatureFlag | Feature flags, configuration |

## Entity Relationship Summary

```
User ----< WorkoutSession
User ----< (created) WorkoutProgram
WorkoutProgram ----< Step
WorkoutSession ----< SpeedSample
RegisteredDevice (MAC) -> User/session
ObjectTagMapping -> Tag (logical)
UILayout ----< WidgetPlacement
GraphicAsset ----< GraphicElement ----< AnimationBinding
```

## Backup Recommendations

| Scenario | Frequency | Method |
|----------|-----------|--------|
| Before upgrade | Every upgrade | Full copy of /data directory |
| Scheduled | Daily/weekly | Automated backup script |
| Before config change | Per change | Database file copy |

## Connection Settings

| Setting | Default | Description |
|--------|---------|-------------|
| DB_PATH | /data/db/edge.db | SQLite file path |
| DB_WAL | enabled | Write-ahead logging for SQLite |
| DB_JOURNAL | -wal | WAL mode journal |

## Migration Behavior

- Migrations run automatically on server startup
- Forward-only; no automatic rollback
- Backup database before upgrading
- See [MIGRATIONS.md](MIGRATIONS.md) for rollback procedure

## Data Retention

WorkoutSession and SpeedSample data may grow over time. Consider archival or retention policies for long-running deployments. Configuration for retention is in server settings.

## Related Documentation

- [Authentication](../authentication/README.md) — User roles, commissioning codes
- [Server Configuration](../server/CONFIGURATION.md) — Database path, connection settings
- [Upgrade Guide](../deployment/UPGRADE_GUIDE.md) — Database backup before upgrade
