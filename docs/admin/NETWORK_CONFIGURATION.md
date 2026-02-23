# SwimEx EDGE — Network Configuration

Network Configuration covers Wi-Fi Access Point settings and Bluetooth configuration. Wi-Fi settings are available to Admin users; Bluetooth configuration is Super Admin only.

---

## Overview

| Section | Access | Description |
|---------|--------|-------------|
| Wi-Fi AP | Admin | SSID, password, channel, DHCP range, diagnostics |
| Bluetooth | Super Admin only | Enable/disable, pair, preferred connection, link quality |

---

## Wi-Fi Access Point Configuration

### Basic Settings

| Parameter | Description | Example |
|-----------|-------------|---------|
| SSID | Network name | SwimEx-Pool-01 |
| Password | WPA2 passphrase | ******** |
| Channel | WiFi channel (1–11 for 2.4 GHz) | 6 |
| Security | WPA2-PSK recommended | WPA2 |

---

### DHCP Range

| Parameter | Description | Example |
|-----------|-------------|---------|
| Start IP | First address in pool | 192.168.4.100 |
| End IP | Last address in pool | 192.168.4.200 |
| Lease time | Duration of DHCP lease | 86400 (24 hours) |

---

### Diagnostics

| Diagnostic | Description |
|------------|-------------|
| Connected clients | List of devices with IP, MAC, hostname |
| Signal strength | RSSI per client (if available) |
| DHCP leases | Active lease table |
| AP status | Up/down, channel utilization |

---

## Wi-Fi Configuration Flow

```
Wi-Fi AP Config
===============

Admin opens Network Config
    |
    v
Edit SSID, password, channel
    |
    v
Edit DHCP range (optional)
    |
    v
Save
    |
    v
AP restarts with new settings
    |
    v
Clients may need to reconnect
```

---

## Bluetooth Configuration (Super Admin Only)

| Parameter | Description | Access |
|-----------|-------------|--------|
| Enable/Disable | Turn Bluetooth on or off | Super Admin |
| Pair | Pair with client device | Super Admin |
| Preferred connection | Wi-Fi vs Bluetooth priority | Super Admin |
| Link quality | Signal strength, connection status | Super Admin |

---

## Bluetooth Flow

```
Bluetooth Config (Super Admin)
==============================

Super Admin opens hidden Bluetooth section
    |
    v
Enable or disable Bluetooth
    |
    v
Pair: Initiate pairing with client
    |
    v
Set preferred connection (Wi-Fi / Bluetooth)
    |
    v
View link quality (RSSI, latency)
```

---

## Permission Matrix

| Feature | Admin | Super Admin |
|---------|-------|-------------|
| Wi-Fi SSID | Yes | Yes |
| Wi-Fi password | Yes | Yes |
| Wi-Fi channel | Yes | Yes |
| DHCP range | Yes | Yes |
| Wi-Fi diagnostics | Yes | Yes |
| Bluetooth enable/disable | No | Yes |
| Bluetooth pair | No | Yes |
| Preferred connection | No | Yes |
| Link quality | No | Yes |

---

## Security Notes

| Setting | Recommendation |
|---------|----------------|
| Wi-Fi password | Strong passphrase; change from default |
| Bluetooth | Disabled by default; enable only when needed |
| DHCP range | Limit to expected client count |

---

## Related Documentation

- [Device Registration](DEVICE_REGISTRATION.md) — MAC-based access control
- [Communication Bluetooth](../communication/BLUETOOTH.md) — Bluetooth protocol
- [Admin README](README.md) — Admin panel index
