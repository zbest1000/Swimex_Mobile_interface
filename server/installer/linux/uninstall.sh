#!/usr/bin/env bash
set -euo pipefail

SERVICE_NAME="swimex-edge"
INSTALL_DIR="/opt/swimex-edge"

echo "SwimEx EDGE Server — Uninstaller"
echo ""

read -p "Remove application files? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    systemctl stop ${SERVICE_NAME} 2>/dev/null || true
    systemctl disable ${SERVICE_NAME} 2>/dev/null || true
    rm -f /etc/systemd/system/${SERVICE_NAME}.service
    systemctl daemon-reload
    rm -rf "$INSTALL_DIR"
    echo "Application removed."
fi

read -p "Remove data (database, configs)? This is IRREVERSIBLE. (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -rf /var/lib/swimex-edge
    rm -rf /etc/swimex-edge
    echo "Data removed."
fi

echo "Uninstall complete."
