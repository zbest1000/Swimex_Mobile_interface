# SwimEx EDGE — Client Documentation

This section documents the SwimEx EDGE Android kiosk client: the tablet application that provides a locked-down, full-screen interface for pool control. The client boots directly into the EDGE UI and restricts exit to authorized roles only.

---

## Client Section Index

| Document | Description |
|----------|-------------|
| [Kiosk Mode](KIOSK_MODE.md) | Kiosk mode architecture: open-source foundation, auto-launch on boot, full-screen immersive mode, system button overrides (home/back/recent), settings blocking, USB lock, screen pinning/lock task APIs. Exit flow via Admin/Maintenance/Super Admin authentication. |
| [Setup](SETUP.md) | Client setup guide: APK sideload, minimum Android 8.0 (API 26), required permissions, first-run wizard (Wi-Fi, server URL, connectivity test, kiosk confirmation, reboot). |
| [WebView Integration](WEBVIEW_INTEGRATION.md) | Embedded WebView: loads EDGE web app from server, JavaScript bridge for native features (kiosk exit, Bluetooth), auto-reconnection on network loss, caching strategy, tablet performance optimization. |

---

## Overview

The EDGE Client is an Android application designed to run on dedicated pool-side tablets. It operates as a **kiosk** that:

- **Locks down** the device: no access to home screen, app drawer, or system settings
- **Auto-launches** the EDGE UI on boot (replaces default launcher)
- **Renders** the EDGE web application inside an embedded WebView
- **Exits** only when an authenticated Admin, Maintenance, or Super Admin user navigates to settings and selects "Exit Kiosk"

All communication flows through the EDGE Server. The client never talks directly to the PLC or pool controller.

---

## Architecture Summary

```
+------------------+     Wi-Fi / Bluetooth      +------------------+
|  Android Tablet  | <------------------------> |   EDGE Server    |
|                  |      HTTP / WebSocket      |                  |
|  +------------+  |                            |  Web App         |
|  | Kiosk Shell|  |                            |  MQTT Broker     |
|  | +--------+ |  |                            |  Auth Engine     |
|  | | WebView | |  |                            |  Database        |
|  | |  +----+ | |  |                            +------------------+
|  | |  |UI  | | |  |                            |        |        |
|  | |  +----+ | |  |                            +--------+--------+
|  | +--------+ |  |                                     |
|  +------------+  |                            +--------+--------+
+------------------+                            |   PLC / Pool    |
                                                |   Controller    |
                                                +-----------------+
```

---

## Quick Reference

| Aspect | Value |
|--------|-------|
| Platform | Android 8.0+ (API 26) |
| Distribution | APK sideload |
| UI Source | Web app loaded from EDGE Server |
| Primary Transport | Wi-Fi (HTTP, WebSocket) |
| Secondary Transport | Bluetooth (Super Admin only) |
| Exit Method | Admin/Maintenance/Super Admin login, then "Exit Kiosk" |

---

## Deployment Checklist

| Step | Action |
|------|--------|
| 1 | Sideload APK to tablet |
| 2 | Run first-run wizard (Wi-Fi, server URL) |
| 3 | Confirm kiosk mode and reboot |
| 4 | Verify client connects to server |
| 5 | Test exit flow with Admin credentials |

---

## Related Documentation

- [Architecture](../architecture/) — System overview, two-tier design, communication topology
- [Authentication](../authentication/) — Roles, permissions, kiosk exit authorization
- [Server](../server/) — EDGE Server configuration and API
- [Deployment](../deployment/) — Full installation and commissioning guide
