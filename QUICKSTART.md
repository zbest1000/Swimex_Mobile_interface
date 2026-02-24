# SwimEx EDGE — 60-Second Quick Start

## Option A: Direct Install (Recommended)

**Requirements:** A computer with Node.js 18+ installed ([download here](https://nodejs.org))

Open a terminal and run:

```bash
bash setup.sh
```

That's it. Open the URL shown in your browser.

---

## Option B: Docker Install

**Requirements:** Docker and Docker Compose installed ([download here](https://docs.docker.com/get-docker/))

```bash
bash setup-docker.sh
```

---

## Default Login Accounts

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `superadmin` | `superadmin` |
| Admin | `admin` | `admin123` |
| Demo Swimmer | `swimmer` | `swimmer` |

> **Change these passwords immediately after first login.**

---

## What Happens Next

1. **Open your browser** → go to the URL shown after setup
2. **Log in** as `admin` / `admin123`
3. **Try a workout** → click "Quick Start" on the home screen → set speed → press START
4. **Explore** → check workout history, custom programs, admin panel

---

## Stop / Restart

**Direct install:**
```bash
# Stop
kill $(cat server/data/server.pid 2>/dev/null) 2>/dev/null || pkill -f "node dist/app/index.js"

# Restart
bash setup.sh
```

**Docker:**
```bash
cd server/docker
docker compose down     # Stop
docker compose up -d    # Start
docker compose logs -f  # View logs
```

---

## Need Help?

See the full [User Manual](MANUAL.md) for detailed instructions.
