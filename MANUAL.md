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
   - [Option C: Windows Install](#option-c-windows-install)
4. [First-Time Setup](#4-first-time-setup)
5. [Logging In](#5-logging-in)
6. [Home Screen](#6-home-screen)
7. [Workout Modes](#7-workout-modes)
   - [Quick Start](#71-quick-start)
   - [Custom Programs](#72-custom-programs)
   - [Interval Training](#73-interval-training)
   - [Distance Presets](#74-distance-presets)
   - [Sprint Presets](#75-sprint-presets)
8. [During a Workout](#8-during-a-workout)
9. [Your Profile](#9-your-profile)
10. [Changing Themes](#10-changing-themes)
11. [Administration Guide](#11-administration-guide)
    - [User Management](#111-user-management)
    - [Device Registration](#112-device-registration)
    - [Communication Setup](#113-communication-setup)
12. [Android Tablet Setup](#12-android-tablet-setup)
13. [Safety Features](#13-safety-features)
14. [Troubleshooting](#14-troubleshooting)
15. [Frequently Asked Questions](#15-faq)

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

Download the SwimEx EDGE files to your computer. If you received a ZIP file, unzip it to a folder you'll remember (for example, `C:\SwimEx` or `~/SwimEx`).

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

The screen will show you a URL like `http://192.168.1.100:3000` — open this in your browser.

---

### Option B: Docker Install

If you have Docker installed:

1. Open a terminal in the SwimEx EDGE folder
2. Run:
   ```
   bash setup-docker.sh
   ```
3. Wait for the containers to build and start (about 2–3 minutes on first run)
4. Open `http://your-server-ip` in a browser

---

### Option C: Windows Install

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
   set HTTP_PORT=3000
   set ADMIN_USER=admin
   set ADMIN_PASS=admin123
   npm start
   ```
7. Open `http://localhost:3000` in your browser

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

## 6. Home Screen

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

## 7. Workout Modes

### 7.1 Quick Start

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

### 7.2 Custom Programs

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

### 7.3 Interval Training

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

### 7.4 Distance Presets

Pre-built distance workouts at three difficulty levels.

1. From the Home Screen, tap **Distance**
2. Choose your level:
   - **Beginner** — gentle, longer warm-up, moderate main set
   - **Intermediate** — moderate intensity, longer main set
   - **Advanced** — higher speeds, longer duration
3. Tap **Start**

The workout runs automatically through all steps and stops when complete.

---

### 7.5 Sprint Presets

Pre-built high-intensity sprint workouts.

1. From the Home Screen, tap **Sprint**
2. Choose your level: **Beginner**, **Intermediate**, or **Advanced**
3. Tap **Start**

Sprint workouts alternate between high-speed bursts and recovery periods for 3 sets.

---

## 8. During a Workout

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

## 9. Your Profile

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

## 10. Changing Themes

SwimEx EDGE supports **Light** and **Dark** visual modes.

**To switch:**
1. Click the **sun/moon icon** in the top-right corner of any screen
2. The theme changes immediately

Your preference is saved and will be remembered next time you log in.

SwimEx EDGE also comes with 5 visual templates (Classic, Modern, Clinical, Sport, Minimal). Administrators can change the active template from the Admin Panel.

---

## 11. Administration Guide

> This section is for **Administrators** only. These options are not visible to regular users.

### 11.1 User Management

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

### 11.2 Device Registration

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

### 11.3 Communication Setup

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

## 12. Android Tablet Setup

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

## 13. Safety Features

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

## 14. Troubleshooting

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

- Check that port 3000 (or your configured port) isn't in use by another program
- Make sure Node.js is version 18 or higher: `node --version`
- Try deleting the `server/data` folder and restarting (this resets the database)

---

## 15. Frequently Asked Questions

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

**Q: How do I update SwimEx EDGE?**
A: Download the new version, stop the current server, replace the files, and run `bash setup.sh` again. Your data (users, workouts, settings) is preserved in the `data/` folder.

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
