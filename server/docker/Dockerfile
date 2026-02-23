FROM node:20-alpine

WORKDIR /app

# Install curl for health check
RUN apk add --no-cache curl

# Copy package files and install dependencies (need devDeps for build)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build TypeScript
COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

# Copy public directory for static frontend
COPY public/ ./public/

EXPOSE 80 1883 502

VOLUME ["/data", "/config"]

ENV HTTP_PORT=80 \
    MQTT_PORT=1883 \
    MODBUS_PORT=502 \
    DATA_DIR=/data \
    CONFIG_DIR=/config

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/api/health || exit 1

CMD ["node", "dist/app/index.js"]
