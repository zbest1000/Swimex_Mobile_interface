#!/usr/bin/env bash
# Generate Mosquitto password file for SwimEx EDGE
# Run this script once during commissioning
#
# Passwords are read from environment variables.
# If not set, random passwords are generated and printed.

PASSWD_FILE="${1:-/mosquitto/config/passwd}"

generate_password() { openssl rand -base64 16 2>/dev/null || head -c 16 /dev/urandom | base64; }

EDGE_SERVER_PASS="${MQTT_PASS:-$(generate_password)}"
PLC_PASS="${PLC_MQTT_PASS:-$(generate_password)}"
CLIENT_PASS="${CLIENT_MQTT_PASS:-$(generate_password)}"
SCADA_PASS="${SCADA_MQTT_PASS:-$(generate_password)}"

echo "Generating Mosquitto password file: ${PASSWD_FILE}"
> "${PASSWD_FILE}"

mosquitto_passwd -b "${PASSWD_FILE}" edge-server "${EDGE_SERVER_PASS}"
mosquitto_passwd -b "${PASSWD_FILE}" plc-controller "${PLC_PASS}"
mosquitto_passwd -b "${PASSWD_FILE}" edge-client "${CLIENT_PASS}"
mosquitto_passwd -b "${PASSWD_FILE}" scada-client "${SCADA_PASS}"

echo "Password file generated."
echo "========================================"
echo " MQTT Credentials (save these):"
echo "   edge-server:     ${EDGE_SERVER_PASS}"
echo "   plc-controller:  ${PLC_PASS}"
echo "   edge-client:     ${CLIENT_PASS}"
echo "   scada-client:    ${SCADA_PASS}"
echo "========================================"
echo "Set MQTT_PASS, PLC_MQTT_PASS, CLIENT_MQTT_PASS, SCADA_MQTT_PASS"
echo "environment variables to use specific passwords."
