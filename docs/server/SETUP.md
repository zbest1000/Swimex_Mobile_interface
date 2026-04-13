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

## First-Run Commissioning Wizard

On first boot, the server presents a commissioning wizard. Complete all steps before normal operation.

### Step 1: Commissioning Codes

Enter two sets of commissioning codes:

| Code Set | Owner | Format |
|----------|-------|--------|
| SwimEx | SwimEx organization | 4 segments × 6 alphanumeric characters |
| BSC Industries | BSC Industries | 4 segments × 6 alphanumeric characters |

Codes are hashed and stored; plaintext is never persisted. They are used for Super Admin recovery and cannot be changed via the UI.

### Step 2: Admin Credentials

Create the initial Super Administrator account:

- Username (required)
- Password (required; must meet complexity policy)
- Display name (optional)

### Step 3: Ethernet Configuration

Configure the Ethernet interface for PLC communication:

| Setting | Description |
|---------|-------------|
| IP Address | Static IP on the PLC network |
| Subnet Mask | Network mask |
| Gateway | Default gateway (optional) |
| DNS | DNS servers (optional) |

### Step 4: Wi-Fi Access Point

Configure the built-in Wi-Fi AP for client devices:

| Setting | Description |
|---------|-------------|
| SSID | Network name (e.g., `PoolCtrl`) |
| Password | WPA2 password |
| Channel | Wi-Fi channel (2.4 GHz recommended) |
| DHCP Range | IP range for client leases |

### Step 5: MQTT Settings

| Setting | Description |
|---------|-------------|
| Plaintext Port | Default 1883 |
| TLS Port | Default 8883 |
| Enable TLS | Yes/No |
| Authentication | Username/password or anonymous |

### Step 6: PLC Protocol Selection

Choose the primary protocol for PLC communication:

| Option | Use Case |
|--------|----------|
| MQTT | PLC supports MQTT client |
| Modbus TCP | PLC is Modbus TCP server |
| HTTP | PLC exposes REST API |

The wizard completes and the server enters normal operation. Access the web admin at `https://<server-ip>/admin` (or `http://` if TLS is not configured).
