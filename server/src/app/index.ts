import http from 'http';
import { config } from '../utils/config';
import { createLogger, setLogLevel, LogLevel } from '../utils/logger';
import { initDatabase, closeDatabase } from '../database/connection';
import { runMigrations } from '../database/migrate';
import { createApp } from '../http/server';
import { wsHandler } from '../websocket/ws-handler';
import { mqttBroker } from '../mqtt/mqtt-broker';
import { modbusServer } from '../modbus/modbus-server';
import { modbusClient, ModbusClientConfig } from '../modbus/modbus-client';
import { dataBridge } from '../communication/data-bridge';
import { workoutEngine } from '../workouts/workout-engine';
import { tagDatabase } from '../tags/tag-database';
import { DataType, ByteOrder } from '../shared/models';
import { seedDefaults } from '../database/seed';

const log = createLogger('app');

async function main(): Promise<void> {
  setLogLevel(config.logLevel as LogLevel);
  log.info('========================================');
  log.info(' SwimEx EDGE Server v1.0.0');
  log.info('========================================');

  // 1. Initialize database
  log.info('[1/8] Initializing SQLite database...');
  initDatabase();
  runMigrations();

  // 1b. Auto-seed defaults for quick deployment
  log.info('[1b/8] Checking for first-run setup...');
  await seedDefaults();

  // 2. Register core PLC tags
  log.info('[2/6] Registering core PLC tags...');
  registerCoreTags();

  // 3. Initialize data bridge (loads tag mappings from DB)
  log.info('[3/6] Initializing data bridge...');
  dataBridge.initialize();

  // 4. Start HTTP server + WebSocket (start this FIRST so the UI is available)
  log.info('[4/6] Starting HTTP server...');
  const app = createApp();
  const httpServer = http.createServer(app);
  wsHandler.attach(httpServer);

  await new Promise<void>((resolve) => {
    httpServer.listen(config.httpPort, '0.0.0.0', () => {
      log.info(`HTTP server listening on port ${config.httpPort}`);
      resolve();
    });
  });

  // 5. Connect to communication services in background (non-blocking)
  log.info('[5/6] Connecting to communication services (background)...');

  // MQTT — connect to Eclipse Mosquitto (retries automatically)
  mqttBroker.start().then(() => {
    log.info('MQTT broker connected');
  }).catch((err: any) => {
    log.warn(`MQTT connection pending (will keep retrying): ${err.message ?? 'connection refused'}`);
  });

  // Modbus TCP server — expose registers to external systems
  modbusServer.start().then(() => {
    log.info('Modbus TCP server started');
  }).catch((err: any) => {
    log.warn(`Modbus TCP server deferred: ${err.message}`);
  });

  // Modbus TCP client — connect to PLC (if configured)
  configureModbusClient();

  // 6. Done
  log.info('[6/6] Startup complete');
  log.info('========================================');
  log.info(' SwimEx EDGE Server — Ready');
  log.info(`   Web UI:   http://0.0.0.0:${config.httpPort}`);
  log.info(`   WebSocket ws://0.0.0.0:${config.httpPort}/ws`);
  log.info(`   MQTT:     ${mqttBroker.isConnected() ? 'Connected' : 'Connecting in background...'}`);
  log.info(`   Modbus:   tcp://0.0.0.0:${config.modbusPort}`);
  log.info(`   Pool ID:  ${config.poolId}`);
  log.info('========================================');

  // Safety stop: detect PLC heartbeat loss
  mqttBroker.on('keepalive:plc_timeout', () => {
    workoutEngine.safetyStop();
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal} — shutting down...`);
    wsHandler.stop();
    await mqttBroker.stop();
    await modbusServer.stop();
    await modbusClient.disconnect();
    closeDatabase();
    log.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', (err) => {
    log.error('Uncaught exception', err.message);
  });
  process.on('unhandledRejection', (reason) => {
    log.error('Unhandled rejection', String(reason));
  });
}

function registerCoreTags(): void {
  const poolId = config.poolId;
  const tags: Array<{ address: string; dataType: string; accessMode: string; description: string }> = [
    { address: `swimex/${poolId}/command/speed`, dataType: 'FLOAT32', accessMode: 'WRITE', description: 'Speed setpoint (%)' },
    { address: `swimex/${poolId}/command/start`, dataType: 'BOOLEAN', accessMode: 'WRITE', description: 'Start command' },
    { address: `swimex/${poolId}/command/stop`, dataType: 'BOOLEAN', accessMode: 'WRITE', description: 'Stop command' },
    { address: `swimex/${poolId}/command/pause`, dataType: 'BOOLEAN', accessMode: 'WRITE', description: 'Pause command' },
    { address: `swimex/${poolId}/command/resume`, dataType: 'BOOLEAN', accessMode: 'WRITE', description: 'Resume command' },
    { address: `swimex/${poolId}/status/current_speed`, dataType: 'FLOAT32', accessMode: 'READ', description: 'Actual motor speed (%)' },
    { address: `swimex/${poolId}/status/target_speed`, dataType: 'FLOAT32', accessMode: 'READ_WRITE', description: 'Target speed (%)' },
    { address: `swimex/${poolId}/status/state`, dataType: 'STRING', accessMode: 'READ_WRITE', description: 'Workout state' },
    { address: `swimex/${poolId}/status/motor_temp`, dataType: 'FLOAT32', accessMode: 'READ', description: 'Motor temperature (°C)' },
    { address: `swimex/${poolId}/status/elapsed_time`, dataType: 'UINT32', accessMode: 'READ', description: 'Elapsed time (ms)' },
    { address: `swimex/${poolId}/status/fault_codes`, dataType: 'STRING', accessMode: 'READ', description: 'Fault codes (JSON array)' },
    { address: `swimex/${poolId}/status/workout`, dataType: 'STRING', accessMode: 'READ_WRITE', description: 'Active workout state (JSON)' },
    { address: `swimex/${poolId}/status/server_online`, dataType: 'BOOLEAN', accessMode: 'READ_WRITE', description: 'Server online status' },
    { address: `swimex/${poolId}/keepalive`, dataType: 'STRING', accessMode: 'READ_WRITE', description: 'Keep-alive heartbeat' },
  ];

  for (const tag of tags) {
    tagDatabase.registerTag(tag.address, {
      address: tag.address,
      dataType: tag.dataType,
      accessMode: tag.accessMode,
      scaleFactor: 1.0,
      offset: 0,
      description: tag.description,
    });
  }

  log.info(`Registered ${tags.length} core PLC tags`);
}

function configureModbusClient(): void {
  try {
    const { getDb } = require('../database/connection');
    const db = getDb();
    const configs = db.prepare("SELECT * FROM communication_configs WHERE protocol = 'MODBUS_TCP' AND is_active = 1").all() as Record<string, unknown>[];

    for (const row of configs) {
      const cfg = JSON.parse(row.config as string) as any;
      if (cfg.mode === 'CLIENT' && cfg.host) {
        const clientConfig: ModbusClientConfig = {
          host: cfg.host,
          port: cfg.port ?? 502,
          unitId: cfg.unitId ?? 1,
          timeoutMs: cfg.timeout ?? 5000,
          retries: cfg.retries ?? 3,
          writeStrategy: cfg.writeStrategy ?? 'WRITE_ON_CHANGE',
          scanGroups: (cfg.scanGroups ?? []).map((g: any) => ({
            name: g.name ?? 'default',
            pollingIntervalMs: g.pollingInterval ?? 500,
            enabled: true,
            registers: (g.registerMap ?? []).map((r: any) => ({
              type: r.registerType?.toLowerCase() ?? 'holding',
              startAddress: r.startAddress ?? 0,
              count: r.count ?? 1,
              tagAddresses: r.tagIds ?? [],
              dataType: r.dataType ?? DataType.FLOAT32,
              byteOrder: r.byteOrder ?? ByteOrder.BIG_ENDIAN,
            })),
          })),
        };

        modbusClient.configure(clientConfig);
        modbusClient.connect().catch((err: any) => {
          log.warn(`Modbus client connect deferred: ${err.message}`);
        });
        log.info(`Modbus client configured for ${cfg.host}:${cfg.port}`);
        return;
      }
    }
    log.info('No active Modbus TCP client configuration found');
  } catch {
    log.debug('Modbus client configuration skipped');
  }
}

main().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
