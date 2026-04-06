# SwimEx EDGE — Network Configuration

This page documents the network controls currently implemented in the server admin API.

## Current Scope

Implemented admin network operations are Wi-Fi Access Point management endpoints:

- `GET /api/admin/wifi`
- `PUT /api/admin/wifi`
- `POST /api/admin/wifi/start`
- `POST /api/admin/wifi/stop`

All require authenticated Admin access.

## Wi-Fi AP Data Model and Constraints

Source: `server/src/admin/wifi-service.ts`.

| Field | Type | Constraints |
|-------|------|-------------|
| `ssid` | string | 1-32 characters |
| `password` | string | 8-63 characters |
| `channel` | number | 2.4 GHz channels `1-11` |
| `band` | string | fixed to `2.4GHz` |
| `hidden` | boolean | controls broadcast suppression |
| `maxClients` | number | 1-50 |
| `interface` | string | alphanumeric/underscore/hyphen, max 15 chars |

Default config:

```json
{
  "ssid": "PoolCtrl",
  "password": "Swimex2026!",
  "channel": 6,
  "band": "2.4GHz",
  "hidden": false,
  "maxClients": 10,
  "interface": "wlan0"
}
```

## Runtime Behavior

- Wi-Fi config is stored in `system_config` under `wifi_ap_config`.
- `GET /api/admin/wifi` returns a safe config view (`passwordMasked`, `hasPassword`) plus AP status.
- AP status checks `hostapd` service state and counts associated stations from `iw`.
- `POST /api/admin/wifi/start` writes:
  - `hostapd.conf` to `<CONFIG_DIR>/hostapd.conf`
  - `dnsmasq.conf` to `<CONFIG_DIR>/dnsmasq.conf`
- Start flow configures interface IP `192.168.4.1/24`, starts `hostapd`, then starts `dnsmasq`.
- DHCP pool is currently fixed to `192.168.4.2-192.168.4.20` with 24h lease.

## Operational Runbook

1. `GET /api/admin/wifi` and verify current config/status.
2. `PUT /api/admin/wifi` with validated changes.
3. `POST /api/admin/wifi/start` to apply files and start AP services.
4. Re-check `GET /api/admin/wifi` for `isRunning=true` and expected channel/interface.
5. If rollback is needed, restore config via `PUT` and call `/wifi/start` again, or stop AP with `/wifi/stop`.

## Troubleshooting

| Symptom | Likely Cause | Action |
|---------|--------------|--------|
| `success=false` from `/wifi/start` with hostapd error | Invalid interface/channel or hostapd failure | Validate interface exists and channel is 1-11; inspect hostapd output on host |
| `connectedClients` always `0` | AP not running or `iw` unavailable | Confirm `status.isRunning`; verify wireless tooling on target OS |
| Clients cannot get IP | dnsmasq failed to start | Check dnsmasq process and generated `<CONFIG_DIR>/dnsmasq.conf` |
| Password rejected on update | Fails 8-63 char validation | Submit WPA2 passphrase in allowed length |

## Notes on Bluetooth

Bluetooth appears as a feature flag in database seed/migrations, but this server runtime does not currently expose Bluetooth admin configuration endpoints in `admin-routes.ts`.

## Related Documentation

- [Admin README](README.md)
- [Server Configuration](../server/CONFIGURATION.md)
- [Communication Bluetooth](../communication/BLUETOOTH.md)
