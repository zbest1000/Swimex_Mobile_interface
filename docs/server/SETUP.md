# SwimEx EDGE Server Setup Guide

This guide covers prerequisites, hardware requirements, installation methods, and the first-run commissioning wizard for the SwimEx EDGE Server.

## Prerequisites

### Linux

| Distribution | Version | Notes |
|--------------|---------|-------|
| Ubuntu | 20.04 LTS, 22.04 LTS | Recommended; full support |
| Debian | 10 (Buster), 11 (Bullseye), 12 (Bookworm) | Supported |
| RHEL / CentOS / Rocky | 8, 9 | Enterprise deployments |

Required packages (typically satisfied by installer):

- `systemd` for service management
- `openssl` for TLS
- `libc6` (glibc 2.31+)

### Windows

| OS | Version | Notes |
|----|---------|-------|
| Windows 10 | Pro, Enterprise, IoT Enterprise | 64-bit required |
| Windows Server | 2019, 2022 | For headless or multi-user deployments |

Required:

- .NET Runtime (included in installer)
- Administrator privileges for installation

### Docker

- Docker Engine 20.10+ or Docker Desktop
- Docker Compose v2 (optional, for multi-container setups)

## Hardware Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 2 cores, 1.5 GHz | 4 cores, 2.0 GHz |
| RAM | 2 GB | 4 GB |
| Storage | 8 GB free | 16 GB SSD |
| Network | Single NIC | **Dual NIC** (Ethernet + Wi-Fi) |

### Dual NIC Recommendation

For production deployments, dual NICs are strongly recommended:

| NIC | Purpose | Interface |
|-----|---------|-----------|
| **Ethernet** | PLC communication, Modbus TCP, MQTT from controllers | Isolated industrial network |
| **Wi-Fi** | Client access, web app, Wi-Fi AP for tablets | Client-facing network |

This topology isolates PLC traffic from client traffic and improves reliability.

## Installation

### Native Linux (.deb / .rpm)

**Debian/Ubuntu (.deb):**

```bash
# Install the package
sudo dpkg -i swimex-edge-server_1.0.0_amd64.deb

# Resolve dependencies if needed
sudo apt-get install -f

# Start the service
sudo systemctl start swimex-edge
sudo systemctl enable swimex-edge
```

**RHEL/CentOS/Rocky (.rpm):**

```bash
# Install the package
sudo rpm -ivh swimex-edge-server-1.0.0.x86_64.rpm

# Start the service
sudo systemctl start swimex-edge
sudo systemctl enable swimex-edge
```

### Native Windows (.msi)

1. Download the `.msi` installer.
2. Run as Administrator.
3. Follow the installation wizard (install path, service account).
4. The EDGE Server installs as a Windows Service and starts automatically.

### Docker

**Single container:**

```bash
docker run -d \
  --name swimex-edge \
  -p 80:80 -p 443:443 \
  -p 1883:1883 -p 8883:8883 \
  -p 502:502 \
  -v /var/edgedata:/data \
  swimex/edge-server:latest
```

**Docker Compose:**

```yaml
version: "3.8"
services:
  edge-server:
    image: swimex/edge-server:latest
    ports:
      - "80:80"
      - "443:443"
      - "1883:1883"
      - "8883:8883"
      - "502:502"
    volumes:
      - edgedata:/data
    environment:
      - DATA_DIR=/data
      - LOG_LEVEL=info
    restart: unless-stopped

volumes:
  edgedata:
```

## First-Run Commissioning Wizard (Current Server Flow)

On first boot, the system starts uncommissioned and tracks progress in `system_config.commissioning_step`. The current API-driven flow has **five** steps:

### Step 1: Set Commissioning Codes

Endpoint: `POST /api/auth/commission/step1-codes`

- Requires authenticated Super Admin
- Captures both SwimEx and BSC Industries codes
- Validates format: `XXXXXX-XXXXXX-XXXXXX-XXXXXX` (4×6 alphanumeric)
- Stores Argon2id hashes only

### Step 2: Configure Accounts

Endpoint: `POST /api/auth/commission/step2-accounts`

- Changes current Super Admin password
- Creates an Administrator account

### Step 3: Configure Network

Endpoint: `POST /api/auth/commission/step3-network`

- Stores Wi-Fi SSID/channel/server IP settings in `system_config`
- Also updates Wi-Fi AP config via `wifi-service`

### Step 4: Configure PLC Communication

Endpoint: `POST /api/auth/commission/step4-plc`

- Stores protocol + PLC settings
- Creates active `communication_configs` row when protocol is `MODBUS_TCP`

### Step 5: Finalize

Endpoint: `POST /api/auth/commission/step5-finalize`

- Registers initial tablets (if provided)
- Creates default UI layout
- Seeds sample workout programs
- Marks system commissioned

Access commissioning status via:

- `GET /api/auth/system-status` (public)
- `GET /api/auth/commission/status` (Super Admin)
