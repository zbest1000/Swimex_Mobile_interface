# SwimEx EDGE — Quick Start

## One Command Setup

Download a release from the [Releases](../../releases) page, extract it, and run the setup script. It handles everything automatically.

**Linux / Mac:**
```bash
tar -xzf swimex-edge-server-*.tar.gz && cd swimex-edge-server-*
bash setup.sh
```

**Windows:** Extract the ZIP → double-click `setup.bat`

**Docker:**
```bash
bash setup.sh --docker
```

**Raspberry Pi:**
```bash
tar -xzf swimex-edge-server-*-rpi-arm.tar.gz && cd swimex-edge-server-*
sudo bash setup.sh --install
```

Open the URL shown in the terminal when setup completes.

---

## First-Run Credentials

On first run, the server creates `superadmin` and `admin` accounts with **randomly generated passwords** printed in the server log.

To find them:
- **File:** `cat data/.initial-credentials` (in the data directory)
- **Service:** `sudo cat /var/lib/swimex-edge/.initial-credentials`
- **Docker:** `docker exec swimex-edge cat /data/.initial-credentials`

Delete the file after saving: `rm data/.initial-credentials`

To set passwords explicitly: `ADMIN_PASS=MyPass SUPERADMIN_PASS=MyPass2 bash setup.sh`

> **Change passwords after first login via Profile → Change Password.**

---

## Setup Modes

| Flag | What It Does |
|------|-------------|
| *(none)* | Start server in foreground (Ctrl+C to stop) |
| `--install` | Install as systemd service (auto-start on boot, requires `sudo`) |
| `--docker` | Deploy using Docker Compose |

---

## Stop / Restart

**Foreground:** Press `Ctrl+C`

**Service:**
```bash
sudo systemctl stop swimex-edge
sudo systemctl restart swimex-edge
sudo journalctl -u swimex-edge -f
```

**Docker:**
```bash
cd server/docker
docker compose down
docker compose up -d
docker compose logs -f
```

---

See the full [User Manual](MANUAL.md) for detailed instructions.
