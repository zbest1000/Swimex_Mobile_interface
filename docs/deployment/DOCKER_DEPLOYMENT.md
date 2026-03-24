# SwimEx EDGE Server — Docker Deployment Guide

This document describes deploying the SwimEx EDGE Server using Docker.

## Image Overview

| Property | Value |
|----------|-------|
| Image | `swimex/edge-server:latest` |
| Base | Alpine Linux |
| Architecture | amd64, arm64 |

## Exposed Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 80 | HTTP | Web UI, REST API |
| 443 | HTTPS | Web UI, REST API (TLS) |
| 1883 | MQTT | MQTT broker (plaintext) |
| 8883 | MQTTS | MQTT broker (TLS) |
| 502 | TCP | Modbus TCP server |

## Volumes

| Host Path | Container Path | Purpose |
|-----------|----------------|---------|
| `/data` | `/data` | Persistent database, logs, uploads |
| `/config` | `/config` | Optional: custom configuration overrides |

Data in `/data` persists across container restarts. Ensure the volume is backed up for production.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADMIN_USER` | Initial admin username (first-run only) | — |
| `ADMIN_PASS` | Initial admin password (first-run only) | — |
| `HTTP_PORT` | HTTP listen port (inside container) | 80 |
| `HTTPS_PORT` | HTTPS listen port (inside container) | 443 |
| `MQTT_PORT` | MQTT plaintext port | 1883 |
| `MQTT_TLS_PORT` | MQTT TLS port | 8883 |
| `TLS_CERT` | Path to TLS certificate file | — |
| `TLS_KEY` | Path to TLS private key file | — |
| `LOG_LEVEL` | Log verbosity (debug, info, warn, error) | info |
| `DB_PATH` | Database file path | /data/db/edge.db |

## Basic Run

```bash
docker run -d \
  --name swimex-edge \
  -p 80:80 -p 443:443 \
  -p 1883:1883 -p 8883:8883 \
  -p 502:502 \
  -v swimex-data:/data \
  swimex/edge-server:latest
```

## docker-compose.yml Example

```yaml
version: "3.8"

services:
  edge-server:
    image: swimex/edge-server:latest
    container_name: swimex-edge
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "1883:1883"
      - "8883:8883"
      - "502:502"
    volumes:
      - swimex-data:/data
      - ./config:/config:ro
    environment:
      - ADMIN_PASS=${ADMIN_PASS}    # Set in .env file or shell
      - MQTT_PORT=1883
      - HTTP_PORT=80
      - LOG_LEVEL=info
      - TLS_CERT=/config/cert.pem
      - TLS_KEY=/config/key.pem
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  swimex-data:
```

## Health Check Endpoint

The server exposes a health endpoint for container orchestration:

| Endpoint | Method | Response |
|----------|--------|----------|
| `/api/health` | GET | `{"status":"ok","version":"1.0.0"}` |

Example:

```bash
curl http://localhost/api/health
```

```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected",
  "mqtt": "running"
}
```

## Dual-Network Setup (Ethernet + Wi-Fi)

For production deployments requiring Ethernet (PLC) and Wi-Fi (clients):

1. **Host networking**: Use `network_mode: host` so the container shares the host's interfaces. This allows the server to bind to both Ethernet and Wi-Fi.

```yaml
services:
  edge-server:
    image: swimex/edge-server:latest
    network_mode: host
    volumes:
      - swimex-data:/data
    # Port mapping not needed with host mode
```

2. **Macvlan**: Create a macvlan network for the PLC segment and attach the container to both bridge and macvlan networks. This requires Docker networking configuration beyond basic compose.

3. **Dedicated host**: Run Docker on a machine with dual NICs; configure the host's routing so Ethernet traffic goes to the PLC subnet and Wi-Fi serves clients. The container uses bridge networking with port mapping.

## TLS Configuration

To enable HTTPS with custom certificates:

```yaml
environment:
  - TLS_CERT=/config/fullchain.pem
  - TLS_KEY=/config/privkey.pem
volumes:
  - ./certs:/config:ro
```

Ensure the certificate and key files are readable by the container user.

## Upgrading

```bash
docker pull swimex/edge-server:latest
docker stop swimex-edge
docker rm swimex-edge
# Re-run with same volume mounts
docker run -d ... -v swimex-data:/data swimex/edge-server:latest
```

Database migrations run automatically on startup. Back up the `/data` volume before upgrading.

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Container exits immediately | Check logs: `docker logs swimex-edge` |
| Health check failing | Ensure `/api/health` responds; increase `start_period` |
| Port conflict | Change host port mapping (e.g., `8080:80`) |
| Permission denied on /data | Ensure volume has correct ownership; run with `--user` if needed |
