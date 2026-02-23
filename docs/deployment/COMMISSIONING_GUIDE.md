# SwimEx EDGE — Commissioning Guide

This guide walks through the full first-run commissioning process for a new SwimEx EDGE installation.

## Overview

Commissioning is a one-time process performed after server installation. It configures security codes, admin accounts, network interfaces, and PLC communication.

## Prerequisites

- EDGE Server installed and running (native or Docker)
- Browser access to `http://<server-ip>:<port>`
- Commissioning codes from SwimEx and BSC Industries
- Network information for Ethernet (PLC) and Wi-Fi (clients)

## Commissioning Steps

### Step 1: Enter SwimEx Code

| Field | Format | Example |
|-------|--------|---------|
| SwimEx Code | 4 segments × 6 alphanumeric characters | `ABC123` `DEF456` `GHI789` `JKL012` |

- Enter the 24-character code in four segments of six characters each.
- Codes are stored as a hash; plaintext is never persisted.
- Codes cannot be changed via the UI after commissioning.

[Placeholder: Screenshot of SwimEx code entry screen]

### Step 2: Enter BSC Industries Code

| Field | Format | Example |
|-------|--------|---------|
| BSC Industries Code | 4 segments × 6 alphanumeric characters | `XYZ987` `UVW654` `RST321` `PON098` |

- Same format as SwimEx code.
- Both codes are required for Super Admin recovery.

[Placeholder: Screenshot of BSC Industries code entry screen]

### Step 3: Create Super Admin Account

| Field | Required | Description |
|-------|----------|-------------|
| Username | Yes | Unique login name |
| Password | Yes | Must meet complexity policy |
| Display Name | No | Optional friendly name |

Password policy:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit
- At least one special character

[Placeholder: Screenshot of Super Admin creation form]

### Step 4: Create Admin Account

- Create at least one Admin account for day-to-day operations.
- Same field requirements as Super Admin.
- Admin can manage users, devices, and configuration; Super Admin can additionally recover access via commissioning codes.

[Placeholder: Screenshot of Admin creation form]

### Step 5: Configure Ethernet (PLC)

Configure the Ethernet interface for PLC communication:

| Setting | Description | Example |
|---------|-------------|---------|
| IP Address | Static IP on PLC network | 192.168.10.10 |
| Subnet Mask | Network mask | 255.255.255.0 |
| Gateway | Default gateway (optional) | 192.168.10.1 |
| DNS | DNS servers (optional) | — |

- Use a static IP; DHCP is not recommended for PLC interface.
- Ensure the IP is in the same subnet as the PLC.

[Placeholder: Screenshot of Ethernet configuration]

### Step 6: Configure Wi-Fi AP

Configure the built-in Wi-Fi Access Point for client tablets:

| Setting | Description | Example |
|---------|-------------|---------|
| SSID | Network name | PoolCtrl |
| Password | WPA2 password | 8+ characters |
| Channel | Wi-Fi channel (2.4 GHz) | 6 |
| DHCP Range | IP range for clients | 192.168.20.100–200 |

- Clients connect to this SSID to reach the EDGE Server.
- Ensure the DHCP range does not overlap with other networks.

[Placeholder: Screenshot of Wi-Fi AP configuration]

### Step 7: Configure MQTT

| Setting | Description | Default |
|---------|-------------|---------|
| Plaintext Port | MQTT without TLS | 1883 |
| TLS Port | MQTT with TLS | 8883 |
| Enable TLS | Use TLS for MQTT | No |
| Authentication | Username/password or anonymous | Anonymous |

- Configure if PLC or other devices use MQTT.
- Enable TLS for production when supported.

[Placeholder: Screenshot of MQTT configuration]

### Step 8: Select PLC Protocol

Choose the primary protocol for PLC communication:

| Option | Use Case |
|--------|----------|
| MQTT | PLC supports MQTT client; publish/subscribe |
| Modbus TCP | PLC is Modbus TCP server |
| HTTP | PLC exposes REST API |

- Select the protocol that matches your PLC hardware.
- Protocol-specific configuration (e.g., Modbus register map) can be configured later in the admin panel.

[Placeholder: Screenshot of PLC protocol selection]

### Step 9: Optional — Import Backup

- If migrating from an existing installation, select a backup file to import.
- Restores users, devices, workout programs, and configuration.
- Commissioning codes and Super Admin are not overwritten by backup import.

[Placeholder: Screenshot of backup import]

### Step 10: Optional — Register Tablets

- Pre-register tablet MAC addresses for device lockdown.
- Devices can also be registered later via the admin panel.
- Each tablet must be registered to access the kiosk UI.

[Placeholder: Screenshot of tablet registration]

## Completion

After all steps:

- The wizard completes and the server enters normal operation.
- Access the web admin at `https://<server-ip>/admin` (or `http://` if TLS is not configured).
- Log in with the Super Admin or Admin account created in the wizard.
- Install the EDGE Client APK on tablets and complete the client setup wizard.

## Post-Commissioning Checklist

| Task | Status |
|------|--------|
| Verify Ethernet connectivity to PLC | |
| Verify Wi-Fi AP is broadcasting | |
| Test MQTT/Modbus from server to PLC | |
| Create additional user accounts as needed | |
| Register all tablets | |
| Configure workout programs | |
| Test pool control from UI | |

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| Commissioning wizard not appearing | Ensure first run; clear browser cache; check server logs |
| Cannot save configuration | Verify all required fields; check disk space |
| Ethernet not connecting | Verify cable, IP, subnet; ping PLC from server |
| Wi-Fi AP not visible | Check channel; ensure Wi-Fi hardware is present |
| PLC protocol not working | Verify PLC address; check firewall; review protocol docs |
