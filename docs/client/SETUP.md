# SwimEx EDGE — Client Setup

This document describes how to install and configure the SwimEx EDGE Android kiosk client on a tablet.

---

## Requirements

| Requirement | Value |
|-------------|-------|
| Minimum Android version | 8.0 (API 26) |
| Recommended | Android 10+ for best stability |
| Device type | Tablet (7" or 10" recommended) |
| Network | Wi-Fi (required for server communication) |

---

## APK Sideload

The EDGE client is distributed as an **APK** file. Sideload is the primary installation method:

1. **Obtain the APK** from the SwimEx EDGE distribution package or build from source
2. **Enable "Install from unknown sources"** (or "Install unknown apps") for the file manager or browser used to install
3. **Transfer the APK** to the device via USB, email, or cloud storage
4. **Open the APK** and follow the installation prompts
5. **Grant** required permissions when prompted

---

## Required Permissions

The client requests the following permissions at install time:

| Permission | Purpose |
|------------|---------|
| `android.permission.RECEIVE_BOOT_COMPLETED` | Auto-launch on device boot |
| `android.permission.INTERNET` | HTTP/WebSocket communication with server |
| `android.permission.ACCESS_WIFI_STATE` | Wi-Fi connectivity and status |
| `android.permission.ACCESS_NETWORK_STATE` | Network availability detection |
| `android.permission.BLUETOOTH` | Bluetooth (optional; Super Admin only) |
| `android.permission.BLUETOOTH_ADMIN` | Bluetooth configuration (optional) |
| Device Admin (if applicable) | Device lockdown for kiosk mode |

---

## First-Run Wizard

On first launch, the client performs a setup wizard:

```
First-Run Wizard Steps
======================

Step 1: Wi-Fi Network
   - Select Wi-Fi network from list
   - Enter password if required
   - Connect to network

Step 2: Server URL
   - Enter EDGE Server URL (e.g., http://192.168.1.100:8080)
   - Or use discovery if available

Step 3: Test Connectivity
   - Client attempts HTTP request to server
   - Success: proceed
   - Failure: retry or re-enter URL

Step 4: Confirm Kiosk Mode
   - User confirms device will run in kiosk mode
   - Warning: exit only via Admin/Maintenance/Super Admin

Step 5: Reboot
   - Client triggers device reboot
   - On reboot, client launches as default launcher
```

---

## First-Run Configuration Table

| Step | Input | Validation |
|------|-------|------------|
| Wi-Fi | SSID, password | Connection test |
| Server URL | URL | HTTP GET to /health or /api/ping |
| Kiosk confirmation | Confirm checkbox | Required to proceed |
| Reboot | N/A | Automatic after confirmation |

---

## Post-Setup Configuration

After first run, configuration can be changed only by:

- **Admin** or **Super Admin** via authenticated settings
- **Factory reset** (Super Admin only, via commissioning codes)

---

## Troubleshooting

| Issue | Possible Cause | Resolution |
|-------|----------------|------------|
| App does not load on boot | Not set as default launcher | Re-run wizard or set manually |
| Cannot connect to server | Wrong URL, Wi-Fi down | Check URL and network; re-run wizard |
| Exit Kiosk not available | User role insufficient | Log in as Admin/Maintenance/Super Admin |
| WebView blank | Server unreachable | Check server status and connectivity |

---

## Related Documentation

- [Kiosk Mode](KIOSK_MODE.md) — Lockdown behavior and exit flow
- [WebView Integration](WEBVIEW_INTEGRATION.md) — How the client loads the web app
- [Deployment](../deployment/) — Full installation and commissioning guide
