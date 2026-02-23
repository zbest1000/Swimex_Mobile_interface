# SwimEx EDGE Client — Android APK Installation Guide

This document describes installing the SwimEx EDGE Client (Android kiosk app) on pool control tablets.

## Prerequisites

| Requirement | Details |
|-------------|---------|
| Device | Android tablet, 7.0 (API 24) or higher |
| Network | Wi-Fi connectivity to EDGE Server |
| APK | `swimex-edge-client-1.0.0.apk` from release package or OTA |

## Enable Unknown Sources

Before installing, allow installation from unknown sources:

1. Open **Settings** > **Security** (or **Apps & notifications** > **Special app access**).
2. Enable **Install unknown apps** (or **Unknown sources** for older Android).
3. Select the app or browser you will use to install the APK (e.g., Chrome, Files).
4. Enable **Allow from this source**.

| Android Version | Path |
|-----------------|------|
| 8.0+ | Settings > Apps & notifications > Special app access > Install unknown apps |
| 7.x | Settings > Security > Unknown sources |

## Install APK

### Via File Manager

1. Copy the APK to the device (USB, email, or download).
2. Open a file manager and navigate to the APK.
3. Tap the APK file.
4. Confirm installation when prompted.
5. Tap **Install** and wait for completion.
6. Tap **Open** or **Done**.

### Via ADB

```bash
adb install -r swimex-edge-client-1.0.0.apk
```

The `-r` flag allows reinstalling (upgrade) while preserving data.

## Required Permissions

The app requests the following permissions. Grant all for full functionality:

| Permission | Purpose |
|------------|---------|
| **Device Admin** | Kiosk lockdown, prevent app switching |
| **Wi-Fi** | Connect to EDGE Server, configure Wi-Fi |
| **Bluetooth** | Optional: BLE for local sensors |
| **Boot Completed** | Auto-launch kiosk on device reboot |

On first launch, the app may prompt for each permission. Denying critical permissions (e.g., Device Admin) will limit kiosk functionality.

## First-Launch Wizard

After installation, the first launch runs a setup wizard:

### Step 1: Wi-Fi Configuration

- Select the Wi-Fi network that reaches the EDGE Server.
- Enter the network password if required.
- The tablet must be on the same network as the server (or routable).

### Step 2: Server URL

- Enter the EDGE Server URL: `http://<server-ip>:<port>` or `https://<server-ip>:<port>`.
- Example: `http://192.168.1.100:80` or `https://192.168.1.100`.
- Tap **Test Connectivity** to verify the connection.

### Step 3: Confirm Kiosk Mode

- Review kiosk settings (full-screen, no navigation bar, etc.).
- Confirm to enable kiosk mode.
- The device will prompt to reboot to apply lockdown.

### Step 4: Reboot

- Tap **Reboot** to restart the device.
- After reboot, the EDGE Client auto-launches in kiosk mode.

## Subsequent Boots

After the first-run wizard:

- The device boots directly into the EDGE Client.
- The kiosk app launches automatically (Boot Completed permission).
- No launcher or other apps are accessible (Device Admin lockdown).
- To exit kiosk (e.g., for maintenance), use the admin PIN or connect via ADB.

## Verification

| Check | Expected Result |
|-------|-----------------|
| App launches | Full-screen pool control UI |
| Server connection | Status indicator shows "Connected" |
| Wi-Fi | Connected to configured network |
| Kiosk mode | No back button, no app switcher |

## Uninstall (Maintenance)

To remove the app (e.g., for replacement):

1. Disable Device Admin: Settings > Security > Device administrators > SwimEx EDGE > Disable.
2. Uninstall: Settings > Apps > SwimEx EDGE > Uninstall.

Or via ADB:

```bash
adb shell pm uninstall com.swimex.edge.client
```

## Troubleshooting

| Issue | Resolution |
|-------|------------|
| "App not installed" | Enable unknown sources; ensure sufficient storage |
| Cannot connect to server | Verify Wi-Fi, server URL, firewall; ping server from device |
| Kiosk not auto-launching | Grant Boot Completed permission; check battery optimization |
| Device Admin not working | Re-enable in Settings; some OEMs require additional steps |
| Permission denied | Uninstall and reinstall; grant permissions when prompted |
