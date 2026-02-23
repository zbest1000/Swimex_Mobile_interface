#!/usr/bin/env bash
set -euo pipefail

INSTALL_DIR="/opt/swimex-edge"
DATA_DIR="/var/lib/swimex-edge"
CONFIG_DIR="/etc/swimex-edge"
SERVICE_NAME="swimex-edge"
NODE_MIN_VERSION="18"

echo "========================================"
echo " SwimEx EDGE Server — Linux Installer"
echo "========================================"

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "ERROR: Node.js is required (>= v${NODE_MIN_VERSION}). Install it first."
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt "$NODE_MIN_VERSION" ]; then
    echo "ERROR: Node.js v${NODE_MIN_VERSION}+ required, found v$(node -v)"
    exit 1
fi

echo "[1/6] Creating directories..."
mkdir -p "$INSTALL_DIR" "$DATA_DIR" "$CONFIG_DIR"

echo "[2/6] Copying application files..."
cp -r ../../src "$INSTALL_DIR/"
cp -r ../../public "$INSTALL_DIR/"
cp ../../package.json "$INSTALL_DIR/"
cp ../../package-lock.json "$INSTALL_DIR/"
cp ../../tsconfig.json "$INSTALL_DIR/"

if [ -f ../../config/default.json ]; then
    cp ../../config/default.json "$CONFIG_DIR/"
fi

echo "[3/6] Installing dependencies..."
cd "$INSTALL_DIR"
npm ci --production 2>/dev/null || npm install --production

echo "[4/6] Building TypeScript..."
npx tsc || true

echo "[5/6] Creating systemd service..."
cat > /etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=SwimEx EDGE Server
After=network.target

[Service]
Type=simple
User=root
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

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ${SERVICE_NAME}
systemctl start ${SERVICE_NAME}

echo "[6/6] Verifying..."
sleep 2
if systemctl is-active --quiet ${SERVICE_NAME}; then
    echo ""
    echo "========================================"
    echo " SwimEx EDGE Server — Installed!"
    echo "========================================"
    echo " HTTP:    http://$(hostname -I | awk '{print $1}'):80"
    echo " MQTT:    mqtt://$(hostname -I | awk '{print $1}'):1883"
    echo " Modbus:  tcp://$(hostname -I | awk '{print $1}'):502"
    echo " Data:    ${DATA_DIR}"
    echo " Config:  ${CONFIG_DIR}"
    echo " Service: systemctl status ${SERVICE_NAME}"
    echo "========================================"
else
    echo "WARNING: Service may not have started. Check:"
    echo "  systemctl status ${SERVICE_NAME}"
    echo "  journalctl -u ${SERVICE_NAME} -f"
fi
