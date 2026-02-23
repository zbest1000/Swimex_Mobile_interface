# SwimEx EDGE — WebView Integration

This document describes how the SwimEx EDGE Android client embeds the EDGE web application inside a WebView and how native features are exposed via a JavaScript bridge.

---

## Overview

The EDGE client does not render the UI natively. Instead, it:

1. Loads the **EDGE web app** from the configured server URL
2. Displays it in a **full-screen WebView**
3. Exposes **native features** (kiosk exit, Bluetooth) via a JavaScript bridge
4. Handles **network loss** with auto-reconnection

---

## Architecture

```
+------------------------------------------+
|  EDGE Client (Android)                    |
|  +--------------------------------------+ |
|  |  WebView                              | |
|  |  +--------------------------------+  | |
|  |  |  EDGE Web App (from server)     |  | |
|  |  |  - HTML/CSS/JS                  |  | |
|  |  |  - WebSocket to server          |  | |
|  |  |  - JS Bridge: EdgeBridge        |  | |
|  |  +--------------------------------+  | |
|  +--------------------------------------+ |
|  Native Layer: Kiosk, Bluetooth, Network  |
+------------------------------------------+
```

---

## Loading the Web App

| Aspect | Behavior |
|--------|----------|
| URL | Loaded from configured server URL (e.g., `http://server:8080/app`) |
| Protocol | HTTP or HTTPS depending on server configuration |
| Initial load | On app start or when WebView is created |

---

## JavaScript Bridge

The client injects a JavaScript object **EdgeBridge** into the WebView context:

| Bridge Method | Purpose |
|---------------|---------|
| `EdgeBridge.exitKiosk()` | Triggers native exit flow (credentials, server validation, unpin) |
| `EdgeBridge.getBluetoothStatus()` | Returns Bluetooth enabled/disabled (Super Admin only) |
| `EdgeBridge.getDeviceInfo()` | Returns device ID, model, Android version (for diagnostics) |

The web app calls these methods when the user has appropriate permissions (e.g., "Exit Kiosk" button visible only for Admin/Maintenance/Super Admin).

---

## Bridge Call Flow

```
Web App (JavaScript)              Native (Android)
====================              ================

EdgeBridge.exitKiosk()
        |
        |  @JavascriptInterface
        v
Native: showExitDialog()
        |
        v
User enters credentials
        |
        v
Native: POST /api/auth/exit-kiosk
        |
        v
Server validates role
        |
        v
Native: stopLockTask()
```

---

## Auto-Reconnection on Network Loss

When the network is lost:

| Phase | Behavior |
|-------|----------|
| Detection | Client monitors connectivity state |
| Retry | Periodic attempts to reconnect (e.g., every 5–15 seconds) |
| Reload | On success, WebView reloads or re-establishes WebSocket |
| User feedback | Web app shows "Reconnecting..." or similar |

---

## Caching Strategy

| Resource | Cache Policy |
|----------|--------------|
| HTML | Cache-Control from server; may cache for short TTL |
| CSS/JS | Cache for session; revalidate on network restore |
| Static assets | Cache longer when possible |
| API data | No caching; always fetch fresh |

The WebView uses standard HTTP cache headers. For offline resilience, critical assets (e.g., splash screen) may be bundled in the APK.

---

## Performance Optimization for Tablet Hardware

| Optimization | Purpose |
|--------------|---------|
| Hardware acceleration | Enabled in WebView for smooth rendering |
| GPU rendering | Use GPU for compositing when available |
| Reduce viewport complexity | Avoid excessive DOM updates |
| Throttle animations | Limit animations on low-end devices |
| WebView caching | Reduce repeated network fetches |

---

## WebView Configuration Summary

| Setting | Value |
|---------|-------|
| JavaScript | Enabled |
| DOM storage | Enabled |
| Mixed content | Disabled (HTTPS only) or allowed per config |
| Zoom | Disabled |
| File access | Restricted |

---

## Related Documentation

- [Kiosk Mode](KIOSK_MODE.md) — Exit flow and lock task mode
- [Setup](SETUP.md) — Server URL and first-run configuration
- [Authentication](../authentication/) — Role-based access for bridge methods
