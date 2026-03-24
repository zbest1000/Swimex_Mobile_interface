#!/usr/bin/env bash
set -euo pipefail

# ========================================
#  SwimEx EDGE Server — Raspberry Pi Installer
# ========================================
# Tested on: Raspberry Pi 3B+, 4B, 5 (Raspberry Pi OS Lite/Desktop, 64-bit or 32-bit)

INSTALL_DIR="/opt/swimex-edge"
DATA_DIR="/var/lib/swimex-edge"
CONFIG_DIR="/etc/swimex-edge"
SERVICE_NAME="swimex-edge"
SERVICE_USER="swimex"
NODE_MIN_VERSION="18"

echo "========================================"
echo " SwimEx EDGE Server — Raspberry Pi Installer"
echo "========================================"

if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: This script must be run as root (use sudo)."
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "$SCRIPT_DIR/.." 2>/dev/null && pwd)" || PACKAGE_DIR="$SCRIPT_DIR"

install_node() {
    echo "[*] Installing Node.js ${NODE_MIN_VERSION}.x via NodeSource..."
    if command -v curl &>/dev/null; then
        curl -fsSL "https://deb.nodesource.com/setup_${NODE_MIN_VERSION}.x" | bash -
    elif command -v wget &>/dev/null; then
        wget -qO- "https://deb.nodesource.com/setup_${NODE_MIN_VERSION}.x" | bash -
    else
        echo "ERROR: curl or wget is required. Install one first."
        exit 1
    fi
    apt-get install -y nodejs
}

# Check / install Node.js
if ! command -v node &>/dev/null; then
    echo "Node.js not found."
    read -rp "Install Node.js ${NODE_MIN_VERSION}.x automatically? [Y/n] " yn
    case "${yn:-Y}" in
        [Nn]*) echo "Aborting — Node.js is required."; exit 1 ;;
        *) install_node ;;
    esac
fi

NODE_VERSION="$(node -v | sed 's/v//' | cut -d. -f1)"
if [ "$NODE_VERSION" -lt "$NODE_MIN_VERSION" ]; then
    echo "Node.js v${NODE_MIN_VERSION}+ required, found v$(node -v)."
    read -rp "Upgrade Node.js automatically? [Y/n] " yn
    case "${yn:-Y}" in
        [Nn]*) echo "Aborting."; exit 1 ;;
        *) install_node ;;
    esac
fi

echo "[1/7] Creating directories..."
mkdir -p "$INSTALL_DIR" "$DATA_DIR" "$CONFIG_DIR"

echo "[2/7] Copying application files..."
for item in dist public config templates package.json package-lock.json; do
    if [ -e "${PACKAGE_DIR}/${item}" ]; then
        cp -r "${PACKAGE_DIR}/${item}" "${INSTALL_DIR}/"
    fi
done

echo "[3/7] Installing production dependencies..."
cd "$INSTALL_DIR"
npm ci --production --no-optional 2>/dev/null || npm install --production --no-optional

echo "[4/7] Creating service user..."
if ! id -u "$SERVICE_USER" &>/dev/null; then
    useradd --system --home-dir "$INSTALL_DIR" --shell /usr/sbin/nologin "$SERVICE_USER"
fi
chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTALL_DIR" "$DATA_DIR" "$CONFIG_DIR"

echo "[5/7] Enabling hardware optimizations..."
# Enable hardware watchdog if available
if [ -e /dev/watchdog ]; then
    echo "Hardware watchdog detected"
fi
# Reduce GPU memory on headless RPi to free RAM for the server
CONFIG_TXT="/boot/config.txt"
if [ -f "$CONFIG_TXT" ]; then
    if ! grep -q "^gpu_mem=" "$CONFIG_TXT"; then
        echo "gpu_mem=16" >> "$CONFIG_TXT"
        echo "  Set GPU memory to 16MB (headless mode)"
    fi
fi

echo "[6/7] Creating systemd service..."
cat > "/etc/systemd/system/${SERVICE_NAME}.service" <<EOF
[Unit]
Description=SwimEx EDGE Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${SERVICE_USER}
Group=${SERVICE_USER}
WorkingDirectory=${INSTALL_DIR}
Environment=NODE_ENV=production
Environment=HTTP_PORT=80
Environment=MQTT_PORT=1883
Environment=MODBUS_PORT=502
Environment=DATA_DIR=${DATA_DIR}
Environment=CONFIG_DIR=${CONFIG_DIR}
ExecStart=/usr/bin/node dist/app/index.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
LimitNOFILE=4096

# Hardening
ProtectSystem=strict
ReadWritePaths=${DATA_DIR} ${CONFIG_DIR}
PrivateTmp=true
NoNewPrivileges=true

# Allow binding to privileged ports (80, 502)
AmbientCapabilities=CAP_NET_BIND_SERVICE
CapabilityBoundingSet=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl start "${SERVICE_NAME}"

echo "[7/7] Verifying..."
sleep 3
if systemctl is-active --quiet "${SERVICE_NAME}"; then
    IP=$(hostname -I | awk '{print $1}')
    echo ""
    echo "========================================"
    echo " SwimEx EDGE Server — Installed on RPi!"
    echo "========================================"
    echo ""
    echo " Web UI:   http://${IP}"
    echo " MQTT:     mqtt://${IP}:1883"
    echo " Modbus:   tcp://${IP}:502"
    echo " Data:     ${DATA_DIR}"
    echo " Config:   ${CONFIG_DIR}"
    echo ""
    echo " Manage:   sudo systemctl {start|stop|restart|status} ${SERVICE_NAME}"
    echo " Logs:     sudo journalctl -u ${SERVICE_NAME} -f"
    echo ""
    echo " Login:     Check 'journalctl -u ${SERVICE_NAME}' for generated credentials"
    echo "========================================"
else
    echo ""
    echo "WARNING: Service did not start. Check logs:"
    echo "  sudo systemctl status ${SERVICE_NAME}"
    echo "  sudo journalctl -u ${SERVICE_NAME} --no-pager -n 50"
fi
