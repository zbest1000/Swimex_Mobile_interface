# SwimEx EDGE — Database Migration Strategy

This document describes the migration strategy for the SwimEx EDGE database.

## Overview

| Property | Value |
|----------|-------|
| Strategy | Versioned, forward-only migrations |
| Execution | Automatic on server startup |
| Rollback | Manual; restore from backup |

## Auto-Run on Startup

Migrations execute automatically when the server starts:

1. Server reads current schema version from `schema_version` table (or creates it if missing).
2. Migration runner scans `migrations/` directory for scripts with version greater than current.
3. Scripts are executed in ascending version order.
4. `schema_version` is updated after each successful migration.
5. Server continues startup.

## Versioned Migrations

Migration files follow the naming convention:

```
migrations/
  001_initial_schema.sql
  002_add_workout_sessions.sql
  003_add_graphic_elements.sql
  004_add_feature_flags.sql
```

| Component | Format | Example |
|-----------|--------|---------|
| Version | 3-digit zero-padded | 001, 002, 003 |
| Name | Snake_case description | add_workout_sessions |
| Extension | .sql | — |

## Forward-Only Policy

- Migrations run only forward (version N to N+1).
- There is no automatic rollback script.
- To revert: restore database from backup and run previous server version.

## Backup Before Migration

Always back up the database before upgrading:

### Linux (Native)

```bash
# Stop server
sudo systemctl stop swimex-edge

# Backup
sudo cp -r /var/lib/swimex-edge/data /backup/edge-data-$(date +%Y%m%d-%H%M%S)

# Start server (migrations run)
sudo systemctl start swimex-edge
```

### Docker

```bash
# Backup volume
docker run --rm \
  -v swimex-data:/data \
  -v /backup:/backup \
  alpine tar czf /backup/edge-data-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .

# Upgrade and restart
docker pull swimex/edge-server:latest
docker stop swimex-edge && docker rm swimex-edge
docker run -d ... -v swimex-data:/data swimex/edge-server:latest
```

### Windows

```powershell
# Stop service
Stop-Service SwimExEDGE

# Backup
Copy-Item -Recurse "$env:ProgramData\SwimEx\EDGE\data" "C:\Backup\edge-data-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

# Start service
Start-Service SwimExEDGE
```

## Migration Script Guidelines

### Idempotency

- Each migration should be idempotent where possible.
- Use `IF NOT EXISTS` for tables, `CREATE INDEX IF NOT EXISTS` for indexes.
- Avoid destructive operations without explicit backup step in docs.

### Example Migration

```sql
-- 004_add_feature_flags.sql
CREATE TABLE IF NOT EXISTS FeatureFlag (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  enabled INTEGER DEFAULT 0,
  config TEXT,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feature_flag_name ON FeatureFlag(name);

INSERT INTO schema_version (version, appliedAt) VALUES (4, datetime('now'));
```

### Schema Version Table

```sql
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  appliedAt TEXT NOT NULL
);
```

## Rollback Instructions

When a migration fails or causes issues:

### 1. Stop the Server

```bash
sudo systemctl stop swimex-edge
# or
docker stop swimex-edge
```

### 2. Restore Database from Backup

```bash
# Linux
sudo rm -rf /var/lib/swimex-edge/data/db
sudo cp -r /backup/edge-data-YYYYMMDD-HHMMSS/db /var/lib/swimex-edge/data/

# Docker: restore volume
docker run --rm \
  -v swimex-data:/data \
  -v /backup:/backup \
  alpine sh -c "rm -rf /data/* && tar xzf /backup/edge-data-YYYYMMDD-HHMMSS.tar.gz -C /data"
```

### 3. Revert to Previous Server Version

```bash
# Debian/Ubuntu
sudo apt install swimex-edge-server=1.0.0

# Docker
docker run -d ... swimex/edge-server:1.0.0
```

### 4. Start Server

```bash
sudo systemctl start swimex-edge
# or
docker start swimex-edge
```

### 5. Verify

- Check logs for errors.
- Verify `/api/health` returns OK.
- Test login and critical workflows.

## Migration Failure Handling

If a migration fails mid-execution:

1. The server does not start; migration transaction is rolled back.
2. Check logs for the specific error (e.g., `migrations/004_add_feature_flags.sql: line 5`).
3. Fix the migration script or data, or restore from backup.
4. Re-run the upgrade after fixing.

## Logging

Migration activity is logged:

| Level | Event |
|-------|-------|
| INFO | Migration started, version X |
| INFO | Migration completed, version X |
| ERROR | Migration failed, version X, error message |
| WARN | No migrations directory found (fresh install) |

Log location: `/var/log/swimex-edge/` (Linux), `%ProgramData%\SwimEx\EDGE\logs\` (Windows), or container stdout (Docker).
