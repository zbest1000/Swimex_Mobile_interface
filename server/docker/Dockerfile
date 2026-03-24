# SwimEx EDGE Server — Docker Image
# ===================================
# Build: docker build -t swimex/edge-server .
# Run:   docker run -p 80:80 -p 502:502 swimex/edge-server

FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files and install ALL dependencies (including dev)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npx tsc

# ─── Production image ─────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Install curl for health checks, hostapd/dnsmasq for WiFi AP, iw for station info
RUN apk add --no-cache curl hostapd dnsmasq iw wireless-tools

# Copy package files and install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --production && npm cache clean --force

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Copy static frontend
COPY public/ ./public/

# Copy config and templates
COPY config/ ./config/
COPY templates/ ./templates/

# Environment defaults
ENV NODE_ENV=production \
    HTTP_PORT=80 \
    MQTT_HOST=mosquitto \
    MQTT_PORT=1883 \
    MODBUS_PORT=502 \
    DATA_DIR=/data \
    CONFIG_DIR=/config \
    POOL_ID=default \
    LOG_LEVEL=info

# Expose ports
EXPOSE 80 502

# Data volumes
VOLUME ["/data", "/config"]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:80/api/health || exit 1

# Start
CMD ["node", "dist/app/index.js"]
