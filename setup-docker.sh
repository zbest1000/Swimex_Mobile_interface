#!/usr/bin/env bash
#
# SwimEx EDGE — Docker Quick Setup
# ==================================
# One command to deploy with Docker:
#
#   bash setup-docker.sh
#
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'
BOLD='\033[1m'

echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   🌊  SwimEx EDGE — Docker Deploy  🌊   ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

# Check Docker
if ! command -v docker &>/dev/null; then
  echo -e "${RED}Docker not found.${NC} Install from https://docs.docker.com/get-docker/"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker $(docker --version | grep -oP 'version \K[^,]+')"

if ! command -v docker-compose &>/dev/null && ! docker compose version &>/dev/null 2>&1; then
  echo -e "${RED}Docker Compose not found.${NC}"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker Compose available"

# Generate Mosquitto password file
echo -e "\n${BLUE}${BOLD}[1/3]${NC} ${BOLD}Generating MQTT credentials...${NC}"
PASSWD_DIR="${SCRIPT_DIR}/server/config/mosquitto"
PASSWD_FILE="${PASSWD_DIR}/passwd"

if [ ! -f "${PASSWD_FILE}" ]; then
  # Create a simple password file (will be overwritten by Mosquitto container)
  docker run --rm -v "${PASSWD_DIR}:/mosquitto/config" eclipse-mosquitto:2 sh -c "
    mosquitto_passwd -b -c /mosquitto/config/passwd edge-server edge-server-secret
    mosquitto_passwd -b /mosquitto/config/passwd plc-controller plc-secret
    mosquitto_passwd -b /mosquitto/config/passwd edge-client edge-client-secret
    mosquitto_passwd -b /mosquitto/config/passwd scada-client scada-readonly
  " 2>/dev/null
  echo -e "  ${GREEN}✓${NC} MQTT password file generated"
else
  echo -e "  ${GREEN}✓${NC} MQTT password file already exists"
fi

# Build and start containers
echo -e "\n${BLUE}${BOLD}[2/3]${NC} ${BOLD}Building and starting containers...${NC}"
cd "${SCRIPT_DIR}/server/docker"

if docker compose version &>/dev/null 2>&1; then
  docker compose up -d --build 2>&1 | tail -10
else
  docker-compose up -d --build 2>&1 | tail -10
fi
echo -e "  ${GREEN}✓${NC} Containers started"

# Wait for health
echo -e "\n${BLUE}${BOLD}[3/3]${NC} ${BOLD}Waiting for services to be ready...${NC}"
echo -n "  "
for i in {1..60}; do
  if curl -sf http://localhost:80/api/health >/dev/null 2>&1; then
    echo ""
    echo -e "  ${GREEN}✓${NC} All services healthy"
    break
  fi
  echo -n "."
  sleep 1
done

LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")

echo ""
echo -e "${GREEN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════════╗"
echo "  ║                                                      ║"
echo "  ║   ✅  SwimEx EDGE is running!                        ║"
echo "  ║                                                      ║"
echo -e "  ║   Web UI:     ${CYAN}http://${LOCAL_IP}${GREEN}                       ║"
echo -e "  ║   MQTT:       ${CYAN}mqtt://${LOCAL_IP}:1883${GREEN}                  ║"
echo -e "  ║   Modbus TCP: ${CYAN}tcp://${LOCAL_IP}:502${GREEN}                    ║"
echo "  ║                                                      ║"
echo "  ║   Default accounts have been created.                 ║"
echo "  ║                                                      ║"
echo -e "  ║   ${YELLOW}⚠  CHANGE ALL DEFAULT PASSWORDS via the${GREEN}             ║"
echo -e "  ║   ${YELLOW}   commissioning wizard on first login!${GREEN}              ║"
echo "  ║                                                      ║"
echo "  ║   Manage:                                            ║"
echo "  ║     Stop:    docker compose down                     ║"
echo "  ║     Logs:    docker compose logs -f                  ║"
echo "  ║     Restart: docker compose restart                  ║"
echo "  ║                                                      ║"
echo "  ╚══════════════════════════════════════════════════════╝"
echo -e "${NC}"
