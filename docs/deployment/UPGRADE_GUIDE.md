# SwimEx EDGE — Upgrade Guide

This document describes upgrade procedures for the EDGE Server and Client, including database migrations and rollback.

## Overview

| Component | Upgrade Method | Notes |
|-----------|----------------|-------|
| Server (native) | apt/yum update or re-run installer | Preserves data in /var/lib/swimex-edge |
| Server (Windows) | Re-run installer | Preserves data in ProgramData |
| Server (Docker) | Pull new image, restart container | Preserves /data volume |
| Client | Push new APK | Sideload or OTA |

## Server Upgrade — Native Linux

### Debian/Ubuntu (apt)

```bash
# Update package list
sudo apt update

# Upgrade EDGE Server
sudo apt install --only-upgrade swimex-edge-server

# Restart service
sudo systemctl restart swimex-edge

# Verify
curl http://localhost/api/health
```

### RHEL/CentOS/Rocky (yum/dnf)

```bash
# Upgrade
sudo yum update swimex-edge-server
# or
sudo dnf upgrade swimex-edge-server

# Restart service
sudo systemctl restart swimex-edge

# Verify
curl http://localhost/api/health
```

### Manual Installer (.deb)

```bash
# Download new version
wget https://releases.swimex.com/edge/swimex-edge-server_1.1.0_amd64.deb

# Upgrade (preserves config and data)
sudo dpkg -i swimex-edge-server_1.1.0_amd64.deb

# Restart
sudo systemctl restart swimex-edge
```

## Server Upgrade — Windows

1. Download the new `.msi` or `.exe` installer.
2. Run as Administrator.
3. The installer detects the existing installation and performs an upgrade.
4. Configuration and data in `%ProgramData%\SwimEx\EDGE` are preserved.
5. Restart the service if prompted, or use Services to restart manually.

## Server Upgrade — Docker

```bash
# Pull new image
docker pull swimex/edge-server:latest

# Stop and remove current container
docker stop swimex-edge
docker rm swimex-edge

# Start new container with same volume
docker run -d \
  --name swimex-edge \
  -p 80:80 -p 443:443 \
  -p 1883:1883 -p 8883:8883 \
  -p 502:502 \
  -v swimex-data:/data \
  swimex/edge-server:latest
```

With docker-compose:

```bash
docker-compose pull
docker-compose up -d
```

## Client Upgrade

### Push New APK

1. Obtain `swimex-edge-client-1.1.0.apk`.
2. Distribute to tablets (USB, email, OTA, or MDM).
3. Install over existing installation (sideload or `adb install -r`).
4. Data and configuration are preserved.
5. Reboot if prompted for kiosk lockdown changes.

### Via ADB

```bash
adb install -r swimex-edge-client-1.1.0.apk
```

The `-r` flag replaces the existing app while preserving data.

## Database Migrations

### Automatic Migration

- Migrations run automatically on server startup.
- Versioned, forward-only migrations.
- No manual intervention required for standard upgrades.

### Migration Process

1. Server starts and reads current schema version from database.
2. Pending migration scripts are executed in order.
3. Schema version is updated.
4. Server continues startup.

### Backup Before Migration

Always back up the database before upgrading:

| Deployment | Backup Location | Command |
|------------|-----------------|---------|
| Linux | /var/lib/swimex-edge/data/ | `cp -r /var/lib/swimex-edge/data /backup/edge-data-$(date +%Y%m%d)` |
| Windows | %ProgramData%\SwimEx\EDGE\data\ | Copy folder to backup location |
| Docker | Volume mount /data | `docker run --rm -v swimex-data:/data -v /backup:/backup alpine cp -r /data /backup/edge-data-$(date +%Y%m%d)` |

### Rollback After Failed Migration

If a migration fails:

1. Stop the server.
2. Restore the database from backup:

```bash
# Linux
sudo systemctl stop swimex-edge
sudo rm -rf /var/lib/swimex-edge/data/db
sudo cp -r /backup/edge-data-YYYYMMDD/db /var/lib/swimex-edge/data/
sudo systemctl start swimex-edge
```

3. Revert to the previous server version.
4. Contact support with migration logs.

## Pre-Upgrade Checklist

| Task | Status |
|------|--------|
| Verify current version | |
| Read release notes for breaking changes | |
| Back up database and config | |
| Schedule maintenance window | |
| Notify users of downtime | |
| Test upgrade in staging if available | |

## Post-Upgrade Verification

| Check | Expected |
|-------|----------|
| Server starts | No errors in logs |
| /api/health | Returns status ok |
| Login | Admin can log in |
| PLC communication | Modbus/MQTT working |
| Client tablets | Connect and display UI |
| Workout programs | Load correctly |

## Rollback Procedures

### Server Rollback

1. Stop the server.
2. Restore database from backup (see above).
3. Install previous version of server package:

```bash
# Debian/Ubuntu
sudo apt install swimex-edge-server=1.0.0

# Or reinstall from old .deb
sudo dpkg -i swimex-edge-server_1.0.0_amd64.deb
```

4. Start the server.

### Docker Rollback

```bash
docker stop swimex-edge
docker rm swimex-edge
docker run -d ... swimex/edge-server:1.0.0
```

Use a specific version tag instead of `latest` for rollback.

### Client Rollback

Install the previous APK over the current one:

```bash
adb install -r swimex-edge-client-1.0.0.apk
```

Data is preserved; downgrade may cause compatibility issues if the server was upgraded.

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Migration fails | Restore backup, rollback server, check logs |
| Server won't start after upgrade | Check logs; verify database integrity; restore backup |
| Client can't connect | Verify server version compatibility; check network |
| Data loss | Restore from backup; ensure backup was taken before upgrade |
