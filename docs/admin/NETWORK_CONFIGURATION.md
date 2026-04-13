# SwimEx EDGE — Network Configuration (Admin)

This document covers the **implemented** network features in the current server:

- Wi-Fi AP configuration (`server/src/admin/wifi-service.ts`)
- Wi-Fi admin endpoints (`server/src/http/routes/admin-routes.ts`)

## Scope and Access

| Feature | Role required | Notes |
|---|---|---|
| View Wi-Fi config/status | Admin+ | `GET /api/admin/wifi` |
| Update Wi-Fi settings | Admin+ | `PUT /api/admin/wifi` |
| Start Wi-Fi AP | Admin+ | `POST /api/admin/wifi/start` |
| Stop Wi-Fi AP | Admin+ | `POST /api/admin/wifi/stop` |

## Wi-Fi Data Model

Runtime Wi-Fi settings are stored in `system_config` as `wifi_ap_config` and merged with defaults.

| Field | Type | Default | Constraints |
|---|---|---|---|
| `ssid` | string | `PoolCtrl` | 1-32 chars |
| `password` | string | `Swimex2026!` | 8-63 chars |
| `channel` | number | `6` | 2.4 GHz channels `1-11` |
| `band` | string | `2.4GHz` | Fixed to `2.4GHz` |
| `hidden` | boolean | `false` | SSID broadcast toggle |
| `maxClients` | number | `10` | Range `1-50` |
| `interface` | string | `wlan0` | Alphanumeric/`_`/`-`, max 15 chars |

## API Workflow

```text
GET /api/admin/wifi
  -> inspect current safe config + status
PUT /api/admin/wifi
  -> validate and persist settings
POST /api/admin/wifi/start
  -> write hostapd + dnsmasq files, bring interface up, start AP services
POST /api/admin/wifi/stop
  -> stop hostapd and dnsmasq
```

### Read Config and Status

`GET /api/admin/wifi` returns:

- `config`: safe config (password is masked)
- `status`: AP runtime status (`isRunning`, `ssid`, `channel`, `connectedClients`, `interface`)

### Update Config

`PUT /api/admin/wifi` accepts partial updates. Validation errors return `VALIDATION_ERROR` through the standard error middleware.

Example:

```json
{
  "ssid": "SwimEx-Pool-01",
  "password": "MyStrongPass123",
  "channel": 6,
  "hidden": false,
  "maxClients": 12,
  "interface": "wlan0"
}
```

### Start AP

`POST /api/admin/wifi/start` performs:

1. Write `${CONFIG_DIR}/hostapd.conf`
2. Write `${CONFIG_DIR}/dnsmasq.conf`
3. Try interface setup (`ip addr add`, `ip link set up`)
4. Start `hostapd` (required for success response)
5. Start `dnsmasq` (best-effort warning on failure)

## Operational Constraints

### DHCP range is currently fixed

Generated `dnsmasq.conf` uses a fixed pool:

- `192.168.4.2` to `192.168.4.20` (`24h` lease)
- gateway/address `192.168.4.1`

This range is not currently exposed as an editable API field.

### Host dependencies

AP start requires host tools/services (`hostapd`, `dnsmasq`, `ip`, `iw`, `systemctl`). In dev containers or non-Linux environments, status/start behavior may be limited.

### Input hardening

- Interface names are sanitized and regex-validated.
- `ssid`/`password` values reject newline characters before config file generation.

## Config Export/Import Interaction

When exporting server configuration:

- Wi-Fi plaintext password is replaced with `password_encrypted`.
- Encryption key is derived from `JWT_SECRET`.

If importing onto a server with a different `JWT_SECRET`, decryption can fail and the import response will include:

`wifiConfig: could not decrypt WiFi password (different server key?)`

## Troubleshooting

### AP fails to start

Check:

1. `hostapd` is installed and executable.
2. Selected interface exists (for example `wlan0`).
3. Process has permissions for interface and service operations.

### Connected clients always `0`

The counter depends on:

```bash
iw dev <iface> station dump
```

If `iw` is unavailable or AP is down, the service reports `0`.
