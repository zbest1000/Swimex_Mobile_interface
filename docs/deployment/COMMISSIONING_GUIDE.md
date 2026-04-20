# SwimEx EDGE — Commissioning Guide

This guide walks through the full first-run commissioning process for a new SwimEx EDGE installation.

## Overview

Commissioning is a one-time process performed after server installation. It configures security codes, admin accounts, network interfaces, and PLC communication.

## Prerequisites

- EDGE Server installed and running (native or Docker)
- Browser access to `http://<server-ip>:<port>`
- Commissioning codes from SwimEx and BSC Industries
- Network information for Ethernet (PLC) and Wi-Fi (clients)

## Commissioning Steps (Current Backend Flow)

The backend currently exposes a **5-step commissioning flow** under `/api/auth/commission/*`.

### Step 1: Set Commissioning Codes (`/api/auth/commission/step1-codes`)

Request fields:

| Field | Required | Format |
|-------|----------|--------|
| `swimexCode` | Yes | `XXXXXX-XXXXXX-XXXXXX-XXXXXX` |
| `bscCode` | Yes | `XXXXXX-XXXXXX-XXXXXX-XXXXXX` |

Notes:

- Both codes must be 4 segments of 6 alphanumeric chars.
- Codes are hashed with Argon2id before storage.
- Rate-limited to 5 attempts per 15 minutes.

### Step 2: Configure Accounts (`/api/auth/commission/step2-accounts`)

Request fields:

| Field | Required | Constraint |
|-------|----------|------------|
| `superAdminNewPassword` | Yes | min length 8 |
| `adminUsername` | Yes | min length 3 |
| `adminPassword` | Yes | min length 4 |
| `adminDisplayName` | No | fallback to `adminUsername` |

Notes:

- Changes current Super Admin password.
- Creates initial Administrator account.

### Step 3: Configure Network (`/api/auth/commission/step3-network`)

Request fields:

| Field | Required | Default |
|-------|----------|---------|
| `wifiSsid` | No | `PoolCtrl` |
| `wifiPassword` | No | implementation default |
| `wifiChannel` | No | `6` |
| `serverIp` | No | empty |
| `subnetMask` | No | `255.255.255.0` |
| `gateway` | No | empty |

Notes:

- Persists legacy `system_config` keys.
- Also attempts to update unified Wi-Fi AP config via `wifi-service`.

### Step 4: Configure PLC Communication (`/api/auth/commission/step4-plc`)

Request fields:

| Field | Required | Default |
|-------|----------|---------|
| `protocol` | No | `MQTT` |
| `plcIp` | No | empty |
| `plcPort` | No | `502` |
| `mqttTopicPrefix` | No | `swimex/default` |
| `modbusUnitId` | No | `1` |
| `pollingIntervalMs` | No | `500` |

Notes:

- Stores selected protocol/network details in `system_config`.
- If `protocol` is `MODBUS_TCP` and `plcIp` exists, creates a communication config row.

### Step 5: Finalize (`/api/auth/commission/step5-finalize`)

Request fields:

| Field | Required | Description |
|-------|----------|-------------|
| `tabletMacs` | No | Optional list of initial registered devices |
| `template` | No | Initial layout template (default `modern`) |

Finalization actions:

- Registers provided tablet MAC addresses.
- Creates default UI layout.
- Seeds sample workout programs.
- Marks system commissioned (`system_config.commissioned=true`).

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
