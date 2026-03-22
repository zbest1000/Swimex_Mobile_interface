#!/usr/bin/env bash
# Generate Mosquitto password file for SwimEx EDGE
# Run this script once during commissioning

PASSWD_FILE="${1:-/mosquitto/config/passwd}"

echo "Generating Mosquitto password file: ${PASSWD_FILE}"

# Create/clear the file
> "${PASSWD_FILE}"

# Add default users (passwords should be changed during commissioning)
mosquitto_passwd -b "${PASSWD_FILE}" edge-server "edge-server-secret"
mosquitto_passwd -b "${PASSWD_FILE}" plc-controller "plc-secret"
mosquitto_passwd -b "${PASSWD_FILE}" edge-client "edge-client-secret"
mosquitto_passwd -b "${PASSWD_FILE}" scada-client "scada-readonly"

echo "Password file generated with default credentials."
echo "IMPORTANT: Change passwords during system commissioning!"
