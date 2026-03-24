# SwimEx EDGE — Complete User Manual

**Version 1.0 | February 2026**

This manual covers everything you need to know to install, set up, and use the SwimEx EDGE pool control system. Written for non-technical users with step-by-step instructions.

---

## Table of Contents

1. [What is SwimEx EDGE?](#1-what-is-swimex-edge)
2. [What You Need (Requirements)](#2-what-you-need)
3. [Installation](#3-installation)
   - [Option A: Quick Install (Recommended)](#option-a-quick-install)
   - [Option B: Docker Install](#option-b-docker-install)
   - [Option C: Windows EXE (Portable)](#option-c-windows-exe-portable)
   - [Option D: Windows Install (From Source)](#option-d-windows-install-from-source)
   - [Option E: Raspberry Pi](#option-e-raspberry-pi)
4. [First-Time Setup](#4-first-time-setup)
5. [Logging In](#5-logging-in)
6. [EDGE Server Access](#6-edge-server-access)
7. [EDGE Client Access](#7-edge-client-access)
8. [Home Screen](#8-home-screen)
9. [Workout Modes](#9-workout-modes)
   - [Quick Start](#91-quick-start)
   - [Custom Programs](#92-custom-programs)
   - [Interval Training](#93-interval-training)
   - [Distance Presets](#94-distance-presets)
   - [Sprint Presets](#95-sprint-presets)
10. [During a Workout](#10-during-a-workout)
11. [Your Profile](#11-your-profile)
12. [Changing Themes](#12-changing-themes)
13. [Administration Guide](#13-administration-guide)
    - [User Management](#131-user-management)
    - [Device Registration](#132-device-registration)
    - [Communication Setup](#133-communication-setup)
14. [Android Tablet Setup](#14-android-tablet-setup)
15. [Safety Features](#15-safety-features)
16. [Builds & Releases](#16-builds--releases)
17. [Troubleshooting](#17-troubleshooting)
18. [Frequently Asked Questions](#18-faq)

---

## 1. What is SwimEx EDGE?

SwimEx EDGE is a touch-screen control system for SwimEx swim-in-place pools. It lets you:

- **Control the pool** — start, stop, and adjust water current speed from a tablet or browser
- **Run workout programs** — timed workouts with changing speeds, like a personal swim coach
- **Track your progress** — see your workout history, total swim time, and statistics
- **Manage multiple users** — everyone gets their own profile and saved workouts

The system has two parts:
- **EDGE Server** — the brain of the system, runs on a small computer near the pool
- **EDGE Client** — a tablet mounted pool-side, or any web browser on the local network

---

## 2. What You Need

### For the Server (the computer that runs the system)

You need ONE of these:
- **A computer with Node.js** — Any Windows, Mac, or Linux computer
- **A computer with Docker** — If you prefer containers
- **A dedicated edge device** — Recommended for permanent installations (small fanless PC)

### For the Pool-Side Tablet

- Android tablet (Android 8.0 or newer)
- Connected to the same Wi-Fi network as the server

### For Browser Access

- Any device (phone, tablet, laptop) on the same Wi-Fi network
- Chrome, Firefox, Safari, or Edge browser

---

## 3. Installation

Choose the installation option that matches your environment. All options produce the same running EDGE Server.

| Option | Best For | Requires |
|--------|----------|----------|
| **A — Quick Install** | Linux / Mac development | Node.js 18+ |
| **B — Docker** | Production, any OS with Docker | Docker Engine + Compose |
| **C — Windows EXE** | Windows deployment (no Node install) | Windows 10/11 x64 |
| **D — Windows (Source)** | Windows developers | Node.js 18+ |
| **E — Raspberry Pi** | Dedicated pool-side hardware | RPi 3B+/4/5, Raspberry Pi OS |

---

### Option A: Quick Install

This is the easiest method. It works on Mac, Linux, and Windows (with Git Bash or WSL).

#### Step 1: Install Node.js (if not already installed)

1. Go to **https://nodejs.org**
2. Download the **LTS** version (the green button)
3. Run the installer — click Next through all screens
4. Restart your terminal/command prompt after installing

To verify it worked, open a terminal and type:
```
node --version
```
You should see something like `v20.11.0`. The number must be 18 or higher.

#### Step 2: Download SwimEx EDGE

Download the SwimEx EDGE release archive from the [GitHub Releases](../../releases) page. Pick `swimex-edge-server-<version>.tar.gz` (Linux/Mac) or `.zip` (Windows). Extract it to a folder you'll remember (for example, `~/SwimEx` or `C:\SwimEx`).

#### Step 3: Run the Setup

1. Open a terminal (Command Prompt on Windows, Terminal on Mac/Linux)
2. Navigate to the SwimEx EDGE folder:
   ```
   cd path/to/swimex-edge
   ```
3. Run the setup script:
   ```
   bash setup.sh
   ```
4. Wait about 30–60 seconds. You'll see a progress display.
5. When you see the green **"SwimEx EDGE is running!"** message, you're done!

The screen will show you a URL like `http://192.168.1.100` — open this in your browser.

---

### Option B: Docker Install

Docker is recommended for production deployments. The image is multi-architecture (amd64 + arm64) so it runs on standard servers and ARM hardware alike.

#### Using the Quick Script

1. Open a terminal in the SwimEx EDGE folder
2. Run:
   ```
   bash setup-docker.sh
   ```
3. Wait for the containers to build and start (about 2–3 minutes on first run)
4. Open `http://your-server-ip` in a browser

#### Using a Pre-Built Image

If you have a release image published to a registry:

```bash
docker pull ghcr.io/<org>/swimex/edge-server:latest

docker run -d --name swimex-edge \
  -p 80:80 -p 502:502 -p 1883:1883 \
  -v swimex-data:/data \
  -e ADMIN_USER=admin \
  -e ADMIN_PASS=changeme \
  ghcr.io/<org>/swimex/edge-server:latest
```

Replace `<org>` with your GitHub organization or username.

#### Docker Compose (Production)

Create a `docker-compose.yml` or use the one included in `server/docker/`:

```bash
cd server/docker
docker compose up -d
```

Key environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `HTTP_PORT` | `80` | Web UI and API port |
| `MQTT_PORT` | `1883` | MQTT broker port |
| `MODBUS_PORT` | `502` | Modbus TCP port |
| `ADMIN_USER` | `admin` | Initial admin username |
| `ADMIN_PASS` | `changeme` | Initial admin password |
| `SIMULATOR_MODE` | `false` | Enable PLC simulator for testing |
| `DATA_DIR` | `/data` | Persistent data volume |
| `LOG_LEVEL` | `info` | Log verbosity (`debug`, `info`, `warn`, `error`) |

**Persistent data:** The `/data` volume stores the SQLite database, uploads, and logs. Always mount a named volume or bind mount so data survives container restarts.

**Health check:** `curl http://localhost/api/health` — returns JSON with `{"status":"ok"}`.

---

### Option C: Windows EXE (Portable)

The Windows release is a self-contained ZIP — no Node.js installation required. It bundles a portable `node.exe` alongside the compiled server.

1. Download `swimex-edge-server-<version>-windows-x64.zip` from the [Releases](../../releases) page
2. Extract the ZIP to a folder (e.g., `C:\SwimEx`)
3. **Double-click `swimex-edge-server.bat`**
4. A console window opens showing the server startup log
5. Open `http://localhost` in your browser
6. Default login: **admin** / **admin123**

#### Install as a Windows Service (Auto-Start on Boot)

1. Right-click `install-service.ps1` → **Run with PowerShell** (as Administrator)
2. Follow the on-screen instructions (uses [NSSM](https://nssm.cc/) to register the service)
3. The service starts automatically after reboot

#### Changing the Port

Edit `swimex-edge-server.bat` and change `set HTTP_PORT=80` to your desired port (e.g., `set HTTP_PORT=8080`).

---

### Option D: Windows Install (From Source)

If you prefer to install from source with Node.js:

1. Install Node.js from https://nodejs.org (LTS version)
2. Open **Command Prompt** (search for "cmd" in the Start menu)
3. Navigate to the SwimEx EDGE folder:
   ```
   cd C:\path\to\swimex-edge\server
   ```
4. Install dependencies:
   ```
   npm install
   ```
5. Build the application:
   ```
   npm run build
   ```
6. Start the server:
   ```
   set HTTP_PORT=80
   set ADMIN_USER=admin
   set ADMIN_PASS=admin123
   npm start
   ```
7. Open `http://localhost` in your browser

---

### Option E: Raspberry Pi

The Raspberry Pi package is optimized for headless RPi deployments (pool-side edge hardware). Tested on RPi 3B+, 4B, and 5 running Raspberry Pi OS (Lite or Desktop, 32-bit or 64-bit).

#### Quick Install

1. Download `swimex-edge-server-<version>-rpi-arm.tar.gz` from the [Releases](../../releases) page
2. Copy it to the Raspberry Pi (via SCP, USB, etc.)
3. Extract and run the installer:
   ```bash
   tar -xzf swimex-edge-server-*-rpi-arm.tar.gz
   cd swimex-edge-server-*-rpi-arm
   sudo bash installer/install.sh
   ```
4. The installer will:
   - Install Node.js if not present (prompts for confirmation)
   - Copy files to `/opt/swimex-edge`
   - Install production dependencies
   - Create a dedicated `swimex` service user
   - Set GPU memory to 16 MB for headless mode
   - Register and start a `systemd` service
5. Open `http://<raspberry-pi-ip>` from any browser on the same network

#### Managing the Service

```bash
sudo systemctl status swimex-edge    # Check status
sudo systemctl restart swimex-edge   # Restart
sudo journalctl -u swimex-edge -f    # Live logs
```

#### RPi Hardware Recommendations

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Model | RPi 3B+ | RPi 4B (2 GB+) or RPi 5 |
| Storage | 8 GB microSD | 16 GB+ A2 microSD or USB SSD |
| Network | Wi-Fi | Ethernet (PLC) + Wi-Fi (clients) |
| Power | Official PSU | UPS HAT for graceful shutdown |

#### Headless Setup (No Monitor)

1. Flash Raspberry Pi OS Lite to the SD card using [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. In the imager, configure Wi-Fi, enable SSH, and set a hostname (e.g., `swimex-edge`)
3. Boot the RPi, SSH in: `ssh pi@swimex-edge.local`
4. Run the installer as shown above
5. Access the Web UI from any device on the network

---

## 4. First-Time Setup

When you first open SwimEx EDGE in your browser, the system has already created default accounts for you:

| Who | Username | Password | What They Can Do |
|-----|----------|----------|------------------|
| Super Administrator | `superadmin` | `superadmin` | Everything (hidden advanced settings) |
| Administrator | `admin` | `admin123` | Manage users, devices, pool settings |
| Demo Swimmer | `swimmer` | `swimmer` | Run workouts, save programs |

### Important: Change Your Passwords

1. Log in as **admin**
2. Click your username in the top-right corner
3. Go to **Profile** → **Change Password**
4. Set a strong, new password
5. Repeat for the **superadmin** account

---

## 5. Logging In

1. Open the SwimEx EDGE URL in your browser
2. Click **Log In** in the top-right corner
3. Enter your **username** and **password**
4. Click **Sign In**

### Creating a New Account

If you're a swimmer and want your own account:

1. Click **Register** on the login screen
2. Fill in:
   - **Username** — pick something you'll remember (e.g., your first name)
   - **Display Name** — your name as it will appear in the system
   - **Password** — at least 6 characters
3. Click **Create Account**
4. You're logged in! Your workouts will now be saved to your profile.

---

## 6. EDGE Server Access

The EDGE Server provides the Web UI, REST API, MQTT broker, and Modbus TCP gateway. Depending on your installation method, here's how to access it.

### Finding the Server Address

| Installation | Default URL | How to Find the IP |
|-------------|-------------|-------------------|
| Quick Install / Source | `http://<server-ip>:80` | Shown in the startup log (`HTTP server listening on...`) |
| Docker | `http://<host-ip>:80` | The Docker host's IP; check with `docker inspect` or `hostname -I` |
| Windows EXE | `http://localhost:80` | Shown in the console window; use machine IP for remote access |
| Raspberry Pi | `http://<rpi-ip>:80` | Shown at end of installer; or use `hostname -I` on the RPi |

### Ports and Services

| Port | Protocol | Service | Notes |
|------|----------|---------|-------|
| **80** | HTTP | Web UI + REST API | Main access point for browsers and tablets |
| **1883** | MQTT | MQTT broker (embedded Aedes) | PLC telemetry, real-time status |
| **502** | TCP | Modbus TCP server | Industrial PLC integration |
| **9001** | WebSocket | MQTT over WebSocket | Browser-based MQTT clients |

> **Tip:** If ports 80 or 502 conflict with other services, set `HTTP_PORT` and `MODBUS_PORT` environment variables before starting. For Docker, change the host port mapping (e.g., `-p 8080:80`).

### REST API Quick Reference

| Endpoint | Method | Auth Required | Description |
|----------|--------|--------------|-------------|
| `/api/health` | GET | No | Server health check |
| `/api/auth/login` | POST | No | User login (returns JWT) |
| `/api/auth/register` | POST | No | User self-registration |
| `/api/features` | GET | No | Feature flags |
| `/api/workouts` | GET | Yes | List workouts |
| `/api/admin/users` | GET | Admin | List all users |

Pass the JWT token as `Authorization: Bearer <token>` in request headers.

### Verifying the Server is Running

```bash
# Health check (should return {"status":"ok"})
curl http://<server-ip>/api/health

# Linux service
sudo systemctl status swimex-edge

# Docker
docker ps | grep swimex
docker logs swimex-edge

# Windows
# Check the console window, or:
sc query SwimExEDGE
```

### Server Logs

| Installation | Log Location |
|-------------|-------------|
| Quick Install / Source | Console output (stdout) |
| Docker | `docker logs swimex-edge` or `docker compose logs` |
| Linux Service | `sudo journalctl -u swimex-edge -f` |
| Windows Service | Event Viewer or NSSM logs |

---

## 7. EDGE Client Access

The EDGE Client is any device that connects to the EDGE Server to control the pool. There are two client types:

### 1. Web Browser (Any Device)

Any modern browser on the same network can access the full SwimEx EDGE interface.

**Supported browsers:** Chrome, Firefox, Safari, Edge (latest versions)

**How to connect:**
1. Ensure your device is on the same Wi-Fi network as the server
2. Open your browser and navigate to `http://<server-ip>` (e.g., `http://192.168.1.100`)
3. Log in with your credentials
4. You have full access to workouts, profiles, and (if admin) the admin panel

**Responsive design:** The Web UI adapts to phones, tablets, and desktops.

### 2. Android Kiosk App (Pool-Side Tablet)

The dedicated Android app locks a tablet into a single-purpose pool control station. See [Android Tablet Setup](#14-android-tablet-setup) for full installation instructions.

**Key features of the kiosk app:**
- Full-screen, no navigation bar or app switcher
- Auto-launches on boot
- WebView pointing to the EDGE Server URL
- Bluetooth LE for optional local sensors
- Only admin/maintenance users can exit kiosk mode

### Client–Server Network Requirements

| Requirement | Details |
|-------------|---------|
| Network | Client and server must be on the same LAN (or routable subnet) |
| Protocol | HTTP (port 80) + WebSocket (same port, path `/ws`) |
| Latency | < 100 ms recommended for responsive control |
| Internet | **Not required** — everything runs locally |

### Registering Client Devices

For security, tablets must be **registered** in the Admin Panel before they can issue pool control commands (start, stop, adjust speed). Unregistered devices can view the UI but cannot control the pool.

1. Log in as Admin → gear icon → **Devices** tab
2. Click **Register New Device**
3. Enter the device MAC address and a friendly name
4. The device now has full control permissions

---

## 8. Home Screen

After logging in, you'll see the **Home Screen** with five workout modes:

| Icon | Mode | Description |
|------|------|-------------|
| ⚡ | **Quick Start** | Jump right in — set a speed and go |
| 📋 | **Custom Programs** | Build multi-step workouts with changing speeds |
| 🔄 | **Interval** | Alternate between two speeds for a set number of rounds |
| 📏 | **Distance** | Pre-built workouts for Beginner, Intermediate, or Advanced |
| 🏃 | **Sprint** | Pre-built high-intensity sprint sets |

Tap any card to enter that mode.

---

## 9. Workout Modes

### 9.1 Quick Start

The simplest mode — set a speed and swim.

**How to use:**

1. From the Home Screen, tap **Quick Start**
2. **Set the speed:** Tap the speed number and use the keypad to enter a value (0–100%)
3. **Set a timer (optional):** Tap the time field and enter minutes and seconds. Leave it blank for unlimited swimming.
4. **Press START** (the big green button)
5. The pool starts! You'll see the speed and elapsed time on screen.
6. **To adjust speed:** Press the **+5** or **-5** buttons during the workout
7. **To stop:** Press the red **STOP** button

**Tip:** You can also start the pool using the physical in-pool air buttons. The tablet will show the current speed.

---

### 9.2 Custom Programs

Create your own multi-step workouts with up to 10 steps per set.

**How to create a program:**

1. From the Home Screen, tap **Custom Programs**
2. Tap **New Program**
3. **Name your program** — tap the name field and type something like "Morning Swim"
4. **Set the number of sets** — this is how many times the sequence repeats (start with 1)
5. **Add steps:**
   - Each step has a **Time** (minutes:seconds) and a **Speed** (%)
   - For example:
     - Step 1: 3:00 at 20% (warm-up)
     - Step 2: 10:00 at 50% (main workout)
     - Step 3: 2:00 at 15% (cool-down)
   - Tap a cell to edit it using the keypad
6. Tap **Save** to store the program
7. Tap **Start** to begin the workout

**How to load a saved program:**

1. In Custom Programs, tap **Library**
2. Your saved programs appear in a list
3. Tap a program to select it
4. Tap **Load**
5. The program steps appear on screen
6. Tap **Start** to begin

**How to edit a program:**

1. Load the program from the Library
2. Change any step's time or speed by tapping on it
3. Tap **Save** to update, or **Save As** to create a copy with a new name

---

### 9.3 Interval Training

Alternates between two speeds for a set number of rounds. Great for building endurance.

**How to use:**

1. From the Home Screen, tap **Interval**
2. **Set the number of sets** — how many rounds (e.g., 5)
3. **Configure Step 1** — the "work" phase:
   - Time: e.g., 0:30 (30 seconds)
   - Speed: e.g., 60%
4. **Configure Step 2** — the "rest" phase:
   - Time: e.g., 1:00 (1 minute)
   - Speed: e.g., 20%
5. Tap **Start**
6. The pool will alternate: 30s at 60% → 1:00 at 20% → repeat 5 times

---

### 9.4 Distance Presets

Pre-built distance workouts at three difficulty levels.

1. From the Home Screen, tap **Distance**
2. Choose your level:
   - **Beginner** — gentle, longer warm-up, moderate main set
   - **Intermediate** — moderate intensity, longer main set
   - **Advanced** — higher speeds, longer duration
3. Tap **Start**

The workout runs automatically through all steps and stops when complete.

---

### 9.5 Sprint Presets

Pre-built high-intensity sprint workouts.

1. From the Home Screen, tap **Sprint**
2. Choose your level: **Beginner**, **Intermediate**, or **Advanced**
3. Tap **Start**

Sprint workouts alternate between high-speed bursts and recovery periods for 3 sets.

---

## 10. During a Workout

While a workout is running, you'll see:

- **Speed Gauge** — large circular dial showing current speed
- **Timer** — elapsed time and remaining time (if timed)
- **Step Progress** — which step you're on (for multi-step workouts)
- **Set Counter** — which set you're on (for multi-set workouts)

### Controls During a Workout

| Button | What It Does |
|--------|-------------|
| **PAUSE** | Temporarily stops the pool. Press again to resume. |
| **STOP** | Ends the workout completely and returns to the setup screen. |
| **+5 / -5** | Increase or decrease speed by 5% |
| **In-pool START button** | Starts or resumes the workout |
| **In-pool STOP button** | Immediately stops the pool (safety feature) |

### When a Workout Ends

The workout ends when:
- The timer runs out (if set)
- All steps and sets are complete
- You press STOP
- The in-pool STOP button is pressed

After the workout ends, your session is automatically saved to your profile.

---

## 11. Your Profile

Click your **username** in the top-right corner to access your profile.

### Workout History

See a list of all your past workouts with:
- Date and time
- Duration
- Workout type
- How it ended (completed, stopped manually, etc.)

### Usage Statistics

See your overall stats:
- Total swim time
- Number of sessions
- Average workout duration
- Most-used workout mode
- Recent activity chart

### Preferences

- **Theme** — switch between Light and Dark mode
- **Fitness Level** — set your level for better preset recommendations

---

## 12. Changing Themes

SwimEx EDGE supports **Light** and **Dark** visual modes.

**To switch:**
1. Click the **sun/moon icon** in the top-right corner of any screen
2. The theme changes immediately

Your preference is saved and will be remembered next time you log in.

SwimEx EDGE also comes with 5 visual templates (Classic, Modern, Clinical, Sport, Minimal). Administrators can change the active template from the Admin Panel.

---

## 13. Administration Guide

> This section is for **Administrators** only. These options are not visible to regular users.

### 13.1 User Management

**To access:** Log in as Admin → click the **gear icon** → **Users** tab

From here you can:

- **View all users** — see everyone registered on the system
- **Create a user** — add a new account with a specific role
- **Change someone's role** — promote or demote (User ↔ Maintenance ↔ Admin)
- **Disable an account** — temporarily lock someone out without deleting them
- **Delete an account** — permanently remove a user and their data
- **Reset a password** — if a user forgot their password

### User Roles Explained

| Role | What They Can Do |
|------|-----------------|
| **User** | Run workouts, save programs, view own history |
| **Maintenance** | Everything a User can do + configure communication settings, access diagnostics |
| **Administrator** | Everything + manage users, register devices, configure the system |
| **Super Admin** | Everything + enable hidden features, factory reset (hidden from normal UI) |

---

### 13.2 Device Registration

For security, tablets must be **registered** to control the pool. Unregistered devices can only view — they can't start, stop, or change speed.

**To register a tablet:**

1. Go to Admin Panel → **Devices** tab
2. Click **Register New Device**
3. Enter the tablet's **MAC address** (found in Android Settings → About Tablet → Wi-Fi MAC address)
4. Give it a **name** (e.g., "Pool-side Tablet")
5. Click **Register**

The tablet now has full control permissions.

**To revoke a device:**

1. Find the device in the list
2. Click **Revoke** — the device becomes view-only

---

### 13.3 Communication Setup

The EDGE server connects to the pool controller (PLC) using communication protocols. This is typically set up by the installation technician.

**MQTT (Message Broker):**
- The system uses Eclipse Mosquitto as its MQTT broker
- Status: shown on the Dashboard as "MQTT Connected" or "Disconnected"
- Topics follow the pattern: `swimex/default/command/*` and `swimex/default/status/*`

**Modbus TCP:**
- Used for connecting to industrial PLCs
- Server mode: exposes pool data to external monitoring systems
- Client mode: reads data from the pool PLC

---

## 14. Android Tablet Setup

### Installing the Kiosk App

The SwimEx EDGE Android app locks the tablet into a dedicated pool control station.

**Step 1: Prepare the tablet**
1. Power on the Android tablet
2. Connect to Wi-Fi (the same network as the EDGE server)
3. Go to **Settings** → **Security** → enable **Install from Unknown Sources**

**Step 2: Install the app**
1. Transfer the `SwimEx-EDGE.apk` file to the tablet (via USB, email, or download)
2. Open the file and tap **Install**
3. When prompted, grant **all permissions** (Device Admin is required for kiosk mode)

**Step 3: Configure the app**
1. On first launch, you'll see a setup screen
2. Enter the **Server URL** — this is the same URL you use in the browser (e.g., `http://192.168.1.100:3000`)
3. Tap **Connect**
4. The tablet will verify the connection and then enter kiosk mode

**Step 4: Kiosk mode is active**
- The tablet now shows only the SwimEx EDGE interface
- The home button, back button, and recent apps are all disabled
- Only an Administrator or Maintenance user can exit kiosk mode

### Exiting Kiosk Mode

Only Administrators and Maintenance users can exit:

1. In the EDGE app, go to the Admin panel
2. Tap **Exit Kiosk Mode**
3. Enter Admin or Maintenance credentials
4. The tablet returns to normal Android operation

---

## 15. Safety Features

SwimEx EDGE includes multiple safety mechanisms:

### Automatic Safety Stop

If the connection between the server and pool controller is lost:
1. The pool **stops immediately** (Safety Stop)
2. A **red warning** appears on all connected screens
3. The pool **will not restart automatically**
4. When connection is restored, you must manually press **START** to resume

### Physical In-Pool Buttons

The in-pool air buttons (START, STOP, SLOW, FAST) **always work**, even if:
- The tablet is disconnected
- The server is restarting
- There's a Wi-Fi problem

**The STOP button always stops the pool**, regardless of what the tablet is doing.

### View-Only Mode for Unregistered Devices

If a device is not registered in the Admin Panel, it can see the pool status but **cannot control anything**. This prevents unauthorized users from starting or stopping the pool.

---

## 16. Builds & Releases

SwimEx EDGE uses GitHub Actions for automated builds. Every release produces multiple artifacts for different platforms.

### Release Artifacts

| Artifact | Platform | Description |
|----------|----------|-------------|
| `swimex-edge-server-<tag>.tar.gz` | Linux (generic) | Compiled JS + assets. Requires Node.js 18+ on host. |
| `swimex-edge-server-<tag>.zip` | Linux / Mac / Windows | Same as above, ZIP format. |
| `swimex-edge-server-<tag>-windows-x64.zip` | Windows x64 | Portable package with embedded `node.exe`. No install required. |
| `swimex-edge-server-<tag>-rpi-arm.tar.gz` | Raspberry Pi (ARM) | Compiled JS + RPi installer script. Runs on RPi 3B+/4/5. |
| Docker image | `linux/amd64`, `linux/arm64` | Multi-arch image pushed to GHCR or Docker Hub. |

### Triggering a Build

Builds are triggered via **GitHub Actions → Build and Release → Run workflow**.

Required input: **Release tag** (e.g., `v1.2.0`).

Optional toggles:
- **Build Docker** — push a multi-arch Docker image (default: on)
- **Build Windows** — produce the Windows EXE portable package (default: on)
- **Build RPi** — produce the Raspberry Pi ARM package (default: on)
- **Create Release** — publish a GitHub Release with all artifacts (default: on)

### CI Pipeline

Every push and pull request to `main` runs the CI workflow which:
1. Installs dependencies (`npm ci`)
2. Compiles TypeScript (`tsc`)
3. Runs the full test suite (`npm test`)

### Docker Image Details

| Property | Value |
|----------|-------|
| Base image | `node:20-alpine` |
| Architectures | `linux/amd64`, `linux/arm64` |
| Exposed ports | 80 (HTTP), 502 (Modbus) |
| Volumes | `/data` (database, logs), `/config` (overrides) |
| Health check | `GET /api/health` every 30s |
| Default registry | `ghcr.io/<org>/swimex/edge-server` |

---

## 17. Troubleshooting

### "Cannot connect to server"

**Check these things:**
1. Is the server running? Open a terminal and check if the process is active.
2. Are you on the same Wi-Fi network as the server?
3. Try opening the server URL directly in a browser: `http://server-ip:3000/api/health`
4. If using Docker: run `docker compose logs` to see error messages

### "Login failed"

- Double-check your username and password (they're case-sensitive)
- Ask an Administrator to check if your account is disabled
- Try the default accounts: `admin` / `admin123`

### "View only — cannot control pool"

- Your device may not be registered. Ask an Administrator to register your tablet's MAC address
- Or log in with an Administrator account (which bypasses device registration)

### "Pool stopped unexpectedly"

- This is usually a **Safety Stop** triggered by a lost connection
- Check that the Ethernet cable between the server and pool controller is connected
- Check that the server is still running
- Once the connection is restored, press **START** to resume

### "The workout completed but I wanted more time"

- In Quick Start mode, leave the time field **empty** for unlimited swimming
- You can always start a new workout after one finishes

### Server won't start

- Check that port 80 (or your configured port) isn't in use by another program
- Make sure Node.js is version 18 or higher: `node --version`
- Try deleting the `server/data` folder and restarting (this resets the database)

### Docker container exits immediately

- Check logs: `docker logs swimex-edge`
- Ensure `/data` volume is writable
- Verify port 80 isn't already bound: `docker run -p 8080:80 ...` to use an alternate port

### Raspberry Pi installer fails

- Ensure you're running as root: `sudo bash installer/install.sh`
- If `npm ci` fails with memory errors, add swap: `sudo dphys-swapfile swapon`
- Check Node.js is installed: `node --version`
- For native module build errors (argon2, better-sqlite3), install build tools: `sudo apt-get install python3 make g++`

### Windows EXE won't start

- Right-click `swimex-edge-server.bat` → **Run as administrator** (required for port 80)
- Or edit the `.bat` file to use `set HTTP_PORT=8080` to avoid needing admin privileges
- Ensure no antivirus is blocking `node.exe`

---

## 18. Frequently Asked Questions

**Q: Can I use this without the Android tablet?**
A: Yes! Open the server URL in any web browser on the same network. You get the full interface. The Android app just adds kiosk mode (locks the tablet to the SwimEx app).

**Q: Can multiple people use the system at the same time?**
A: Yes. Multiple browsers can view the pool status simultaneously. However, only registered devices can issue control commands, and only one workout can run at a time.

**Q: Does this need internet access?**
A: No. SwimEx EDGE runs entirely on your local network. No internet connection is needed or used.

**Q: How do I back up my data?**
A: The database is stored in the `server/data/` folder (or `/data` in Docker). Copy this folder to back up all users, workout programs, and session history.

**Q: Can I change the speed during a custom program?**
A: Yes! While a program is running, you can use the +5/-5 buttons to adjust the speed temporarily. The program will return to the programmed speed on the next step change.

**Q: What happens if the power goes out?**
A: The pool motor stops immediately (no power = no motor). When power returns, the server restarts automatically (if configured as a service or using Docker). You'll need to manually start a new workout.

**Q: Can I run this on a Raspberry Pi?**
A: Yes! Download the RPi ARM package from the Releases page, extract it, and run `sudo bash installer/install.sh`. Works on RPi 3B+, 4B, and 5. See [Option E: Raspberry Pi](#option-e-raspberry-pi) for full instructions.

**Q: How do I update SwimEx EDGE?**
A: Download the new version, stop the current server, replace the files, and run `bash setup.sh` again (or `docker pull` for Docker). Your data (users, workouts, settings) is preserved in the `data/` folder (or `/data` Docker volume).

**Q: I forgot the admin password. What do I do?**
A: Use the Super Administrator commissioning code reset. Contact SwimEx support or your system integrator for the commissioning code. See the Installation section for details.

---

## Support

For technical support, contact:

- **SwimEx Engineering** — for pool hardware and firmware issues
- **Your installation technician** — for network and connectivity issues
- **This manual** — for software usage questions

---

*SwimEx EDGE v1.0 — Built for reliable, safe, and intuitive pool control.*
