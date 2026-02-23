# EDGE Client (Android Kiosk Application)

The EDGE Client is a native Android application that transforms a standard tablet into a dedicated SwimEx pool control terminal. It runs in full kiosk mode, completely locking down the device.

## Architecture

```
┌─────────────────────────────────┐
│  EDGE Client (Android)          │
│                                 │
│  ┌───────────────────────────┐  │
│  │  Kiosk Shell              │  │
│  │  (Launcher replacement,   │  │
│  │   button override,        │  │
│  │   screen pinning)         │  │
│  ├───────────────────────────┤  │
│  │  Embedded WebView         │  │
│  │  (Renders EDGE UI from    │  │
│  │   server via HTTP)        │  │
│  ├───────────────────────────┤  │
│  │  JavaScript Bridge        │  │
│  │  (Kiosk exit, Bluetooth,  │  │
│  │   native features)        │  │
│  ├───────────────────────────┤  │
│  │  Connection Manager       │  │
│  │  (Wi-Fi, Bluetooth,       │  │
│  │   auto-reconnect)         │  │
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

## Source Structure

| Directory | Description |
|---|---|
| `app/src/main/java/.../kiosk/` | Kiosk mode implementation (launcher, screen pinning, button overrides) |
| `app/src/main/java/.../webview/` | WebView configuration and JavaScript bridge |
| `app/src/main/java/.../bluetooth/` | Bluetooth transport (built-in, disabled by default) |
| `app/src/main/java/.../wifi/` | Wi-Fi connection management |
| `app/src/main/java/.../service/` | Background services (keep-alive, auto-reconnect) |
| `app/src/main/res/` | Android resources (layouts, drawables, values) |
| `app/src/main/assets/` | Local web assets (offline fallback pages) |
| `app/src/test/` | Unit tests |

## Key Behaviors

- **Auto-launch on boot** — registers as default launcher
- **Full device lockdown** — home, back, recent apps, settings all blocked
- **Exit requires auth** — only Admin, Maintenance, or Super Admin roles
- **WebView rendering** — loads the EDGE UI served by the EDGE Server
- **Auto-reconnect** — reconnects to server on Wi-Fi drop
- **Bluetooth** — fully built but hidden/disabled until Super Admin enables

## Documentation

- [Kiosk Mode](../docs/client/KIOSK_MODE.md)
- [Client Setup Guide](../docs/client/SETUP.md)
- [WebView Integration](../docs/client/WEBVIEW_INTEGRATION.md)
- [Client Installation](../docs/deployment/CLIENT_INSTALLATION.md)
