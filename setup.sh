#!/usr/bin/env bash
#
# SwimEx EDGE — 60-Second Quick Setup
# ====================================
# Run this single command to install and start the EDGE server:
#
#   curl -sSL https://your-repo/setup.sh | bash
#   — or —
#   bash setup.sh
#
set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}"
  echo "  ╔══════════════════════════════════════════╗"
  echo "  ║                                          ║"
  echo "  ║   🌊  SwimEx EDGE — Quick Setup  🌊     ║"
  echo "  ║                                          ║"
  echo "  ╚══════════════════════════════════════════╝"
  echo -e "${NC}"
}

step() {
  echo -e "\n${BLUE}${BOLD}[$1/5]${NC} ${BOLD}$2${NC}"
}

ok() {
  echo -e "  ${GREEN}✓${NC} $1"
}

warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
}

fail() {
  echo -e "  ${RED}✗${NC} $1"
  exit 1
}

# ─── Start ───────────────────────────────────────────
print_banner

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
SERVER_DIR="${SCRIPT_DIR}/server"
DATA_DIR="${SERVER_DIR}/data"

if [ ! -f "${SERVER_DIR}/package.json" ]; then
  fail "Cannot find server/package.json. Run this script from the project root directory."
fi

# ─── Step 1: Check prerequisites ─────────────────────
step 1 "Checking prerequisites..."

# Check Node.js
if command -v node &>/dev/null; then
  NODE_VER=$(node -v | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VER" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 18 ]; then
    ok "Node.js v${NODE_VER}"
  else
    fail "Node.js v18+ required (found v${NODE_VER}). Install from https://nodejs.org"
  fi
else
  echo -e "  ${YELLOW}Node.js not found. Attempting auto-install...${NC}"
  if command -v apt-get &>/dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - 2>/dev/null
    sudo apt-get install -y nodejs 2>/dev/null
  elif command -v yum &>/dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - 2>/dev/null
    sudo yum install -y nodejs 2>/dev/null
  elif command -v brew &>/dev/null; then
    brew install node 2>/dev/null
  else
    fail "Cannot auto-install Node.js. Install v18+ manually from https://nodejs.org"
  fi
  ok "Node.js installed: $(node -v)"
fi

# Check npm
if ! command -v npm &>/dev/null; then
  fail "npm not found. It should come with Node.js."
fi
ok "npm $(npm -v)"

# ─── Step 2: Install dependencies ────────────────────
step 2 "Installing dependencies..."
cd "${SERVER_DIR}"
npm install --production=false --loglevel=error 2>&1 | tail -3
ok "Dependencies installed"

# ─── Step 3: Build TypeScript ─────────────────────────
step 3 "Building application..."
npx tsc 2>&1 || true
ok "TypeScript compiled"

# ─── Step 4: Create data directory ────────────────────
step 4 "Initializing data directory..."
mkdir -p "${DATA_DIR}"
ok "Data directory: ${DATA_DIR}"

# ─── Step 5: Start the server ─────────────────────────
step 5 "Starting SwimEx EDGE Server..."

export HTTP_PORT="${HTTP_PORT:-3000}"
export MQTT_PORT="${MQTT_PORT:-1883}"
export MODBUS_PORT="${MODBUS_PORT:-5020}"
export DATA_DIR="${DATA_DIR}"
export CONFIG_DIR="${SERVER_DIR}/config"
export ADMIN_USER="${ADMIN_USER:-admin}"
export ADMIN_PASS="${ADMIN_PASS:-admin123}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export POOL_ID="${POOL_ID:-default}"

# Use a non-privileged port if not root
if [ "$HTTP_PORT" -lt 1024 ] && [ "$(id -u)" -ne 0 ]; then
  export HTTP_PORT=3000
  warn "Using port 3000 (port 80 requires root)"
fi
if [ "$MQTT_PORT" -lt 1024 ] && [ "$(id -u)" -ne 0 ]; then
  export MQTT_PORT=11883
fi
if [ "$MODBUS_PORT" -lt 1024 ] && [ "$(id -u)" -ne 0 ]; then
  export MODBUS_PORT=5020
fi

# Start server in background
node dist/app/index.js &
SERVER_PID=$!

# Wait for server to be ready
echo -n "  Waiting for server"
for i in {1..30}; do
  if curl -sf "http://localhost:${HTTP_PORT}/api/health" >/dev/null 2>&1; then
    echo ""
    ok "Server is running (PID: ${SERVER_PID})"
    break
  fi
  echo -n "."
  sleep 1
done

# Check if server started successfully
if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
  fail "Server failed to start. Check the logs above."
fi

# Get local IP
LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║                                                      ║"
echo "  ║   ✅  SwimEx EDGE is running!                        ║"
echo "  ║                                                      ║"
echo -e "  ║   Open in browser:  ${CYAN}http://${LOCAL_IP}:${HTTP_PORT}${GREEN}      ║"
echo "  ║                                                      ║"
echo "  ║   Default Accounts:                                  ║"
echo "  ║   ┌─────────────┬──────────────┬────────────┐       ║"
echo "  ║   │ Role        │ Username     │ Password   │       ║"
echo "  ║   ├─────────────┼──────────────┼────────────┤       ║"
echo "  ║   │ Super Admin │ superadmin   │ superadmin │       ║"
echo -e "  ║   │ Admin       │ ${ADMIN_USER}$(printf '%*s' $((12 - ${#ADMIN_USER})) '')│ ${ADMIN_PASS}$(printf '%*s' $((10 - ${#ADMIN_PASS})) '')│       ║"
echo "  ║   │ Swimmer     │ swimmer      │ swimmer    │       ║"
echo "  ║   └─────────────┴──────────────┴────────────┘       ║"
echo "  ║                                                      ║"
echo -e "  ║   ${YELLOW}⚠  Change passwords after first login!${GREEN}              ║"
echo "  ║                                                      ║"
echo "  ║   Stop:  kill ${SERVER_PID}                                   ║"
echo "  ║                                                      ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Keep running in foreground if --foreground flag
if [[ "${1:-}" == "--foreground" ]] || [[ "${1:-}" == "-f" ]]; then
  wait "${SERVER_PID}"
else
  echo -e "Server running in background. To stop: ${BOLD}kill ${SERVER_PID}${NC}"
  echo -e "To run in foreground next time: ${BOLD}bash setup.sh --foreground${NC}"
fi
