# SwimEx EDGE — Kiosk Mode

This document describes the kiosk mode implementation of the SwimEx EDGE Android client. Kiosk mode completely locks down an Android tablet so that it boots directly into the EDGE UI and restricts exit to authorized roles only.

---

## Open-Source Foundation

The EDGE kiosk client uses a **lockdown approach** built on standard Android APIs and open-source patterns:

- **Device Owner** or **Device Admin** mode for device-level control
- **Screen pinning** (lock task mode) to keep the app in foreground
- **Custom launcher** that replaces the default home screen
- **Immersive mode** to hide system UI

No proprietary kiosk SDK is required. The implementation relies on standard Android features available since API 26.

---

## Auto-Launch on Boot

The client is configured as the **default launcher** (home app):

1. On device boot, Android launches the default launcher
2. The EDGE client registers as a launcher
3. On boot: `BOOT_COMPLETED` broadcast triggers the client
4. The client starts in full-screen mode and loads the EDGE web app

```
Boot Sequence
=============

Android Boot
    |
    v
BOOT_COMPLETED
    |
    v
EDGE Client (default launcher)
    |
    v
Full-screen immersive mode
    |
    v
WebView loads EDGE web app from server
```

---

## Full-Screen Immersive Mode

The client uses **immersive** flags to hide the system navigation bar and status bar:

| Flag | Purpose |
|------|---------|
| `SYSTEM_UI_FLAG_IMMERSIVE_STICKY` | Hides nav/status bars; user swipe briefly reveals them |
| `SYSTEM_UI_FLAG_FULLSCREEN` | Hides status bar |
| `SYSTEM_UI_FLAG_HIDE_NAVIGATION` | Hides navigation bar |
| `SYSTEM_UI_FLAG_LAYOUT_STABLE` | Prevents layout shifts when bars appear |

---

## System Button Overrides

| Button | Default Behavior | Override |
|--------|------------------|----------|
| Home | Returns to launcher | Consumed; stays in EDGE app |
| Back | Goes back in app | Consumed; handled by WebView |
| Recent Apps | Shows app switcher | Consumed; blocked |

The client overrides these by:

- Being the active launcher (home has no effect)
- Intercepting back key events
- Disabling recent apps via `lockTaskMode` / screen pinning

---

## Settings Blocked

The following are blocked or restricted in kiosk mode:

| Setting | Status |
|---------|--------|
| Device settings app | Blocked (unless via in-app authenticated flow) |
| Wi-Fi configuration | Blocked via system settings |
| Developer options | Blocked |
| USB debugging | Blocked when USB lock enabled |
| App installation | Blocked (unless sideloaded by Admin) |

---

## USB Lock

When USB lock is enabled:

- USB debugging is disabled
- ADB access is blocked
- USB file transfer is restricted

Only Super Admin can disable USB lock when exiting kiosk mode for maintenance.

---

## Screen Pinning / Lock Task Mode APIs

The client uses Android **lock task mode** (screen pinning):

| API | Purpose |
|-----|---------|
| `startLockTask()` | Pins the app; user cannot exit without unpinning |
| `stopLockTask()` | Unpins; required on exit |
| `setLockTaskPackages()` | Configures which packages can run in lock task mode |

Exit flow requires the server to validate the user's role and authorize unpinning before `stopLockTask()` is called.

---

## Exit Flow

Exit from kiosk mode is **only** allowed for users with Admin, Maintenance, or Super Admin roles.

```
Exit Kiosk Flow
===============

1. User navigates to Settings (within EDGE web app)
   |
2. User taps "Exit Kiosk" option
   |
3. Client prompts for credentials (username / password)
   |
4. Client sends credentials to EDGE Server
   |
5. Server validates credentials and role
   |
   +-- If role not Admin/Maintenance/Super Admin: reject
   |
   +-- If valid: return success + token
   |
6. Client receives success
   |
7. Client calls stopLockTask() to unpin screen
   |
8. Client exits or minimizes to allow access to system
```

---

## Exit Authorization Summary

| Role | Can Exit Kiosk? |
|------|-----------------|
| Super Admin | Yes |
| Admin | Yes |
| Maintenance | Yes |
| User | No |
| Guest | No |

---

## Exit Flow Diagram

```
+----------------+     +----------------+     +----------------+
|  EDGE Client   |     |  EDGE Server   |     |  Auth Engine   |
+----------------+     +----------------+     +----------------+
        |                       |                       |
        |  Navigate to Settings  |                       |
        |  Tap "Exit Kiosk"      |                       |
        |----------------------->|                       |
        |  Prompt credentials    |                       |
        |<-----------------------|                       |
        |  Submit credentials    |                       |
        |----------------------->|                       |
        |                       |  Validate credentials  |
        |                       |----------------------->|
        |                       |  Role check           |
        |                       |<----------------------|
        |  Success / Reject      |                       |
        |<-----------------------|                       |
        |  stopLockTask()        |                       |
        |  (if success)          |                       |
        +-----------------------                        |
```

---

## Related Documentation

- [Setup](SETUP.md) — Installation and first-run configuration
- [WebView Integration](WEBVIEW_INTEGRATION.md) — JavaScript bridge and native features
- [Roles and Permissions](../authentication/ROLES_AND_PERMISSIONS.md) — Auth roles and kiosk exit permissions
