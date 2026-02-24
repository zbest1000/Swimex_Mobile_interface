import path from 'path';

export interface ServerConfig {
  httpPort: number;
  httpsPort: number;
  mqttPort: number;
  mqttTlsPort: number;
  modbusPort: number;
  dataDir: string;
  configDir: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  heartbeatIntervalMs: number;
  heartbeatMissedThreshold: number;
  defaultAdminUser: string;
  defaultAdminPass: string;
  poolId: string;
  logLevel: string;
}

function env(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export function loadConfig(): ServerConfig {
  return {
    httpPort: parseInt(env('HTTP_PORT', '80'), 10),
    httpsPort: parseInt(env('HTTPS_PORT', '443'), 10),
    mqttPort: parseInt(env('MQTT_PORT', '1883'), 10),
    mqttTlsPort: parseInt(env('MQTT_TLS_PORT', '8883'), 10),
    modbusPort: parseInt(env('MODBUS_PORT', '502'), 10),
    dataDir: env('DATA_DIR', path.resolve(__dirname, '../../data')),
    configDir: env('CONFIG_DIR', path.resolve(__dirname, '../../config')),
    jwtSecret: env('JWT_SECRET', 'swimex-edge-dev-secret-change-in-production'),
    jwtExpiresIn: env('JWT_EXPIRES_IN', '24h'),
    heartbeatIntervalMs: parseInt(env('HEARTBEAT_INTERVAL_MS', '2000'), 10),
    heartbeatMissedThreshold: parseInt(env('HEARTBEAT_MISSED_THRESHOLD', '3'), 10),
    defaultAdminUser: env('ADMIN_USER', 'admin'),
    defaultAdminPass: env('ADMIN_PASS', 'changeme'),
    poolId: env('POOL_ID', 'default'),
    logLevel: env('LOG_LEVEL', 'info'),
  };
}

export const config = loadConfig();
