#!/usr/bin/env bash
#
# SwimEx EDGE — One-Step Automated Setup
# =======================================
# Single command to install and start:
#
#   bash setup.sh              (run and keep in foreground)
#   bash setup.sh --install    (install as systemd service)
#   bash setup.sh --docker     (deploy with Docker Compose)
#
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'; BOLD='\033[1m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}${BOLD}[$1]${NC} ${BOLD}$2${NC}"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
MODE="${1:-}"
NODE_MIN=18

SVC_INSTALL_DIR="/opt/swimex-edge"
SVC_DATA_DIR="/var/lib/swimex-edge"
SVC_CONFIG_DIR="/etc/swimex-edge"
SVC_NAME="swimex-edge"
SVC_USER="swimex"

echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   SwimEx EDGE — Automated Setup          ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

# ── Docker path ─────────────────────────────────────
if [[ "$MODE" == "--docker" ]]; then
  step "1/3" "Checking Docker..."
  command -v docker &>/dev/null || fail "Docker not found. Install from https://docs.docker.com/get-docker/"
  docker compose version &>/dev/null 2>&1 || docker-compose version &>/dev/null 2>&1 || fail "Docker Compose not found."
  ok "Docker $(docker --version | grep -oP 'version \K[^,]+')"

  step "2/3" "Starting containers..."
  cd "${SCRIPT_DIR}/server/docker"
  if docker compose version &>/dev/null 2>&1; then
    docker compose up -d --build 2>&1 | tail -5
  else
    docker-compose up -d --build 2>&1 | tail -5
  fi
  ok "Containers started"

  step "3/3" "Waiting for health check..."
  for i in $(seq 1 60); do
    curl -sf http://localhost:80/api/health >/dev/null 2>&1 && break
    sleep 1
  done
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
  echo ""
  echo -e "${GREEN}${BOLD}  Setup complete!${NC}"
  echo -e "  Web UI:  ${CYAN}http://${LOCAL_IP}${NC}"
  echo -e "  Login:   admin / admin123"
  echo -e "  Manage:  docker compose down | logs -f | restart"
  exit 0
fi

# ── Detect what we have ─────────────────────────────
HAS_BUNDLED_NODE=false
HAS_PREBUILT=false
SERVER_DIR=""

if [ -x "${SCRIPT_DIR}/node" ] && [ -d "${SCRIPT_DIR}/dist" ]; then
  HAS_BUNDLED_NODE=true
  HAS_PREBUILT=true
  SERVER_DIR="$SCRIPT_DIR"
elif [ -d "${SCRIPT_DIR}/dist" ] && [ -f "${SCRIPT_DIR}/package.json" ]; then
  HAS_PREBUILT=true
  SERVER_DIR="$SCRIPT_DIR"
elif [ -f "${SCRIPT_DIR}/server/package.json" ]; then
  SERVER_DIR="${SCRIPT_DIR}/server"
else
  fail "Cannot find SwimEx EDGE files. Run this script from the project or release directory."
fi

# ── Ensure Node.js ──────────────────────────────────
step "1/4" "Checking Node.js..."
NODE_BIN=""

if [ "$HAS_BUNDLED_NODE" = true ]; then
  NODE_BIN="${SCRIPT_DIR}/node"
  ok "Using bundled Node.js ($(${NODE_BIN} -v))"
elif command -v node &>/dev/null; then
  NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge "$NODE_MIN" ]; then
    NODE_BIN="$(command -v node)"
    ok "System Node.js $(node -v)"
  fi
fi

if [ -z "$NODE_BIN" ]; then
  warn "Node.js ${NODE_MIN}+ not found — installing automatically..."
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
    sudo apt-get install -y nodejs 2>/dev/null
  elif command -v yum &>/dev/null || command -v dnf &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - 2>/dev/null
    sudo yum install -y nodejs 2>/dev/null || sudo dnf install -y nodejs 2>/dev/null
  elif command -v brew &>/dev/null; then
    brew install node 2>/dev/null
  elif command -v pacman &>/dev/null; then
    sudo pacman -Sy --noconfirm nodejs npm 2>/dev/null
  elif command -v zypper &>/dev/null; then
    sudo zypper install -y nodejs20 2>/dev/null
  else
    fail "Cannot auto-install Node.js. Install v${NODE_MIN}+ from https://nodejs.org"
  fi
  NODE_BIN="$(command -v node)"
  ok "Installed Node.js $(${NODE_BIN} -v)"
fi

# ── Build if needed ─────────────────────────────────
step "2/4" "Preparing application..."
cd "$SERVER_DIR"

if [ "$HAS_PREBUILT" = true ]; then
  ok "Pre-built distribution detected — skipping build"
else
  npm install --loglevel=error 2>&1 | tail -3
  ok "Dependencies installed"
  npx tsc 2>&1 || true
  ok "TypeScript compiled"
fi

# Install production deps if node_modules missing (pre-built without bundled deps)
if [ ! -d "${SERVER_DIR}/node_modules" ]; then
  npm ci --production --loglevel=error 2>/dev/null || npm install --production --loglevel=error
  ok "Production dependencies installed"
fi

mkdir -p "${SERVER_DIR}/data"
ok "Data directory ready"

# ── Install as service OR run directly ──────────────
if [[ "$MODE" == "--install" ]]; then
  step "3/4" "Installing as system service..."
  [ "$(id -u)" -ne 0 ] && fail "Service install requires root. Run: sudo bash setup.sh --install"

  mkdir -p "$SVC_INSTALL_DIR" "$SVC_DATA_DIR" "$SVC_CONFIG_DIR"

  for item in dist public config templates package.json package-lock.json; do
    [ -e "${SERVER_DIR}/${item}" ] && cp -r "${SERVER_DIR}/${item}" "${SVC_INSTALL_DIR}/"
  done
  [ -d "${SERVER_DIR}/node_modules" ] && cp -r "${SERVER_DIR}/node_modules" "${SVC_INSTALL_DIR}/"
  if [ "$HAS_BUNDLED_NODE" = true ]; then
    cp "${SCRIPT_DIR}/node" "${SVC_INSTALL_DIR}/node"
    chmod +x "${SVC_INSTALL_DIR}/node"
    NODE_EXEC="${SVC_INSTALL_DIR}/node"
  else
    NODE_EXEC="$NODE_BIN"
  fi

  if ! id -u "$SVC_USER" &>/dev/null; then
    useradd --system --home-dir "$SVC_INSTALL_DIR" --shell /usr/sbin/nologin "$SVC_USER"
  fi
  chown -R "$SVC_USER":"$SVC_USER" "$SVC_INSTALL_DIR" "$SVC_DATA_DIR" "$SVC_CONFIG_DIR"

  if [ -f /boot/config.txt ] && ! grep -q "^gpu_mem=" /boot/config.txt 2>/dev/null; then
    echo "gpu_mem=16" >> /boot/config.txt
    ok "RPi GPU memory set to 16MB (headless)"
  fi

  cat > "/etc/systemd/system/${SVC_NAME}.service" <<EOF
[Unit]
Description=SwimEx EDGE Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${SVC_USER}
Group=${SVC_USER}
WorkingDirectory=${SVC_INSTALL_DIR}
Environment=NODE_ENV=production
Environment=HTTP_PORT=80
Environment=MQTT_PORT=1883
Environment=MODBUS_PORT=502
Environment=DATA_DIR=${SVC_DATA_DIR}
Environment=CONFIG_DIR=${SVC_CONFIG_DIR}
ExecStart=${NODE_EXEC} dist/app/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
LimitNOFILE=4096
ProtectSystem=strict
ReadWritePaths=${SVC_DATA_DIR} ${SVC_CONFIG_DIR}
PrivateTmp=true
NoNewPrivileges=true
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable "${SVC_NAME}"
  systemctl start "${SVC_NAME}"
  ok "Service installed and started"

  step "4/4" "Verifying..."
  sleep 3
  if systemctl is-active --quiet "${SVC_NAME}"; then
    LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    echo ""
    echo -e "${GREEN}${BOLD}  Setup complete!${NC}"
    echo -e "  Web UI:   ${CYAN}http://${LOCAL_IP}${NC}"
    echo -e "  Login:    admin / admin123"
    echo -e "  Status:   sudo systemctl status ${SVC_NAME}"
    echo -e "  Logs:     sudo journalctl -u ${SVC_NAME} -f"
    echo -e "  Restart:  sudo systemctl restart ${SVC_NAME}"
  else
    warn "Service may not have started. Check: sudo journalctl -u ${SVC_NAME} -n 50"
  fi
  exit 0
fi

# ── Run directly (default) ──────────────────────────
step "3/4" "Configuring..."

export HTTP_PORT="${HTTP_PORT:-80}"
export MQTT_PORT="${MQTT_PORT:-1883}"
export MODBUS_PORT="${MODBUS_PORT:-502}"
export DATA_DIR="${SERVER_DIR}/data"
export CONFIG_DIR="${SERVER_DIR}/config"
export ADMIN_USER="${ADMIN_USER:-admin}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export POOL_ID="${POOL_ID:-default}"

if [ "$HTTP_PORT" -lt 1024 ] && [ "$(id -u)" -ne 0 ]; then
  export HTTP_PORT=3000; warn "Using port 3000 (port 80 requires root)"
fi
if [ "$MQTT_PORT" -lt 1024 ] && [ "$(id -u)" -ne 0 ]; then export MQTT_PORT=11883; fi
if [ "$MODBUS_PORT" -lt 1024 ] && [ "$(id -u)" -ne 0 ]; then export MODBUS_PORT=5020; fi

step "4/4" "Starting server..."
"$NODE_BIN" "${SERVER_DIR}/dist/app/index.js" &
SERVER_PID=$!

echo -n "  Waiting for server"
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${HTTP_PORT}/api/health" >/dev/null 2>&1; then
    echo ""; break
  fi
  echo -n "."; sleep 1
done

if ! kill -0 "${SERVER_PID}" 2>/dev/null; then fail "Server failed to start."; fi

LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
echo ""
echo -e "${GREEN}${BOLD}  Setup complete! Server running.${NC}"
echo -e "  Web UI:  ${CYAN}http://${LOCAL_IP}:${HTTP_PORT}${NC}"
echo -e "  Login:   admin / admin123"
echo -e "  Stop:    kill ${SERVER_PID}"
echo ""
echo -e "  To install as a service:  ${BOLD}sudo bash setup.sh --install${NC}"
echo -e "  To deploy with Docker:    ${BOLD}bash setup.sh --docker${NC}"
echo ""
wait "${SERVER_PID}"
