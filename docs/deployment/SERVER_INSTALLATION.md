# SwimEx EDGE Server — Native Installation Guide

This document describes native installation of the SwimEx EDGE Server on Linux and Windows systems.

## Prerequisites

### Hardware Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| CPU | 2 cores, 1.5 GHz | 4 cores, 2.0 GHz |
| RAM | 2 GB | 4 GB |
| Storage | 8 GB free | 16 GB SSD |
| Network | Single NIC | **Dual NIC (Ethernet + Wi-Fi)** |

### Dual-NIC Requirement

For production deployments, dual NICs are required:

| NIC | Purpose | Typical Use |
|-----|---------|-------------|
| **Ethernet** | PLC communication | Modbus TCP, MQTT from pool controllers |
| **Wi-Fi** | Client access | Web app, Wi-Fi AP for tablets |

This topology isolates PLC traffic from client traffic and ensures reliable pool control.

### Software Prerequisites

| Platform | Requirements |
|----------|--------------|
| Linux (portable) | glibc 2.28+ (all deps bundled) |
| Linux (package install) | systemd, openssl, glibc 2.28+ |
| Windows (portable EXE) | Windows 10/11 x64 (all deps bundled) |
| Windows (from source) | Node.js 18+, Administrator privileges |

## Linux Installation

### Linux Portable Package (Recommended)

The easiest Linux option — no Node.js installation required. One command to set up and run:

```bash
tar -xzf swimex-edge-server-*-linux-x64.tar.gz
cd swimex-edge-server-*-linux-x64
bash setup.sh
```

To install as a persistent systemd service: `sudo bash setup.sh --install`

Works on any x64 Linux with glibc 2.28+ (Ubuntu 18.04+, Debian 10+, RHEL 8+, Fedora 29+, SUSE 15.1+, Arch).

### Supported Distributions (Package Install)

| Distribution | Package Format | Versions |
|--------------|----------------|----------|
| Debian / Ubuntu | .deb | 20.04 LTS, 22.04 LTS, Debian 10/11/12 |
| RHEL / CentOS / Rocky | .rpm | 8, 9 |

### Debian/Ubuntu (.deb)

```bash
# Download the package
wget https://releases.swimex.com/edge/swimex-edge-server_1.0.0_amd64.deb

# Install
sudo dpkg -i swimex-edge-server_1.0.0_amd64.deb

# Resolve dependencies if needed
sudo apt-get install -f

# Verify installation
dpkg -l | grep swimex-edge
```

### RHEL/CentOS/Rocky (.rpm)

```bash
# Download the package
wget https://releases.swimex.com/edge/swimex-edge-server-1.0.0.x86_64.rpm

# Install
sudo rpm -ivh swimex-edge-server-1.0.0.x86_64.rpm

# Verify installation
rpm -qa | grep swimex-edge
```

### Shell Script Installer (Generic Linux)

For distributions without .deb/.rpm support:

```bash
# Download and run installer
curl -fsSL https://releases.swimex.com/edge/install.sh | sudo bash

# Or with explicit version
curl -fsSL https://releases.swimex.com/edge/install.sh | sudo bash -s -- 1.0.0
```

The script extracts binaries to `/opt/swimex-edge`, creates a system user, and installs the systemd unit.

### systemd Service (Linux)

The EDGE Server runs as a systemd service:

| Command | Description |
|---------|-------------|
| `sudo systemctl start swimex-edge` | Start the service |
| `sudo systemctl stop swimex-edge` | Stop the service |
| `sudo systemctl restart swimex-edge` | Restart the service |
| `sudo systemctl enable swimex-edge` | Enable auto-start on boot |
| `sudo systemctl status swimex-edge` | Check service status |

Service unit file location: `/etc/systemd/system/swimex-edge.service` or `/lib/systemd/system/swimex-edge.service`.

## Windows Installation

### Supported Versions

| OS | Version | Notes |
|----|---------|-------|
| Windows 10 | Pro, Enterprise, IoT Enterprise | 64-bit required |
| Windows 11 | All editions | 64-bit required |
| Windows Server | 2019, 2022 | Headless deployments |

### Portable EXE Package (Recommended)

The easiest Windows option — no Node.js installation required:

1. Download and extract `swimex-edge-server-<version>-windows-x64.zip`
2. **Double-click `setup.bat`**

The server starts automatically. Open `http://localhost` in a browser. Default login: `admin` / `admin123`.

### .msi Installer (Alternative)

1. Download `swimex-edge-server-1.0.0-x64.msi`.
2. Run as Administrator (right-click, "Run as administrator").
3. Follow the installation wizard:
   - Accept license agreement
   - Choose install directory (default: `C:\Program Files\SwimEx\EDGE`)
   - Select service account (Local System or custom)
   - Complete installation
4. The EDGE Server installs as a Windows Service and starts automatically.

### From Source (Developer)

1. Install Node.js 18+ from https://nodejs.org
2. `cd server && npm install && npm run build && npm start`

### Windows Service Registration

The installer registers the service as `SwimExEDGE`. Manage via:

| Method | Command/Action |
|--------|----------------|
| Services GUI | `services.msc` — locate "SwimEx EDGE Server" |
| Command line | `sc start SwimExEDGE`, `sc stop SwimExEDGE` |
| PowerShell | `Start-Service SwimExEDGE`, `Stop-Service SwimExEDGE` |

## Raspberry Pi Installation

### Supported Hardware

| Model | Status | Notes |
|-------|--------|-------|
| Raspberry Pi 3B+ | Supported | Minimum viable; 1 GB RAM |
| Raspberry Pi 4B (2 GB+) | Recommended | Best performance/cost ratio |
| Raspberry Pi 5 | Supported | Fastest option |

### Supported OS

Raspberry Pi OS (Lite or Desktop), 32-bit or 64-bit. Debian Bookworm or Bullseye.

### Quick Install

```bash
tar -xzf swimex-edge-server-*-rpi-arm.tar.gz
cd swimex-edge-server-*-rpi-arm
sudo bash setup.sh --install
```

The setup script automatically installs Node.js if missing, copies files to `/opt/swimex-edge`, creates a dedicated `swimex` service user, reduces GPU memory to 16 MB (headless), and registers a hardened systemd service with `CAP_NET_BIND_SERVICE`.

### Managing the Service

```bash
sudo systemctl status swimex-edge     # Check status
sudo systemctl restart swimex-edge    # Restart
sudo systemctl stop swimex-edge       # Stop
sudo journalctl -u swimex-edge -f     # Live logs
```

### Headless Setup (No Monitor)

1. Flash Raspberry Pi OS Lite using [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. In the imager settings, configure Wi-Fi, enable SSH, set hostname
3. Boot RPi, SSH in: `ssh pi@<hostname>.local`
4. Transfer and run the installer
5. Access the Web UI from any browser on the network

---

## Post-Installation

### First-Run Setup Wizard

After installation, open a browser and navigate to:

```
http://<server-ip>:<port>
```

| Default | Value |
|---------|-------|
| HTTP Port | 80 |
| HTTPS Port | 443 |
| Server IP | Use the machine's IP on the client-facing interface |

The setup wizard guides you through:

1. Commissioning codes (SwimEx + BSC Industries)
2. Super Admin account creation
3. Ethernet (PLC) configuration
4. Wi-Fi AP configuration
5. MQTT settings
6. PLC protocol selection

### Verify Installation

| Check | Command / Action |
|-------|------------------|
| Service running | `systemctl status swimex-edge` (Linux) or `sc query SwimExEDGE` (Windows) |
| HTTP responding | `curl http://localhost/api/health` |
| Ports listening | `ss -tlnp` (Linux) or `netstat -an` (Windows) |

## Default Ports

| Port | Protocol | Purpose |
|------|----------|---------|
| 80 | HTTP | Web UI, REST API |
| 443 | HTTPS | Web UI, REST API (TLS) |
| 1883 | MQTT | MQTT broker (plaintext) |
| 8883 | MQTTS | MQTT broker (TLS) |
| 502 | Modbus TCP | Modbus TCP server |

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Service fails to start | Check logs: `/var/log/swimex-edge/` (Linux) or `%ProgramData%\SwimEx\EDGE\logs\` (Windows) |
| Port already in use | Change port in config or stop conflicting service |
| Dual NIC not detected | Verify drivers; configure interfaces in setup wizard |
| Firewall blocking | Allow ports 80, 443, 1883, 8883, 502 on client-facing interface |
