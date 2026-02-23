import http from 'http';
import { config } from '../utils/config';
import { createLogger, setLogLevel, LogLevel } from '../utils/logger';
import { initDatabase, closeDatabase } from '../database/connection';
import { runMigrations } from '../database/migrate';
import { createApp } from '../http/server';
import { wsHandler } from '../websocket/ws-handler';
import { mqttBroker } from '../mqtt/mqtt-broker';
import { modbusServer } from '../modbus/modbus-server';
import { dataBridge } from '../communication/data-bridge';
import { workoutEngine } from '../workouts/workout-engine';
import { tagDatabase } from '../tags/tag-database';

const log = createLogger('app');

async function main(): Promise<void> {
  setLogLevel(config.logLevel as LogLevel);
  log.info('========================================');
  log.info(' SwimEx EDGE Server — Starting');
  log.info('========================================');

  // 1. Initialize database
  log.info('Initializing database...');
  initDatabase();
  runMigrations();

  // 2. Register core PLC tags
  registerCoreTags();

  // 3. Initialize data bridge (loads tag mappings from DB)
  dataBridge.initialize();

  // 4. Create HTTP server
  const app = createApp();
  const httpServer = http.createServer(app);

  // 5. Attach WebSocket handler
  wsHandler.attach(httpServer);

  // 6. Start MQTT broker
  try {
    await mqttBroker.start();
  } catch (err) {
    log.warn('MQTT broker failed to start (port may be in use)', err);
  }

  // 7. Start Modbus TCP server
  try {
    await modbusServer.start();
  } catch (err) {
    log.warn('Modbus TCP server failed to start (port may be in use)', err);
  }

  // 8. Start HTTP server
  httpServer.listen(config.httpPort, '0.0.0.0', () => {
    log.info(`HTTP server listening on port ${config.httpPort}`);
    log.info('========================================');
    log.info(' SwimEx EDGE Server — Ready');
    log.info(`   HTTP:     http://0.0.0.0:${config.httpPort}`);
    log.info(`   MQTT:     mqtt://0.0.0.0:${config.mqttPort}`);
    log.info(`   Modbus:   tcp://0.0.0.0:${config.modbusPort}`);
    log.info(`   WS:       ws://0.0.0.0:${config.httpPort}/ws`);
    log.info('========================================');
  });

  // 9. Start MQTT keep-alive heartbeat
  setInterval(() => {
    mqttBroker.publishKeepAlive();
  }, config.heartbeatIntervalMs);

  // Graceful shutdown
  const shutdown = async () => {
    log.info('Shutting down...');
    wsHandler.stop();
    await mqttBroker.stop();
    await modbusServer.stop();
    closeDatabase();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

function registerCoreTags(): void {
  const poolId = config.poolId;
  const coreTags = [
    `swimex/${poolId}/command/speed`,
    `swimex/${poolId}/command/start`,
    `swimex/${poolId}/command/stop`,
    `swimex/${poolId}/command/pause`,
    `swimex/${poolId}/status/current_speed`,
    `swimex/${poolId}/status/target_speed`,
    `swimex/${poolId}/status/state`,
    `swimex/${poolId}/status/motor_temp`,
    `swimex/${poolId}/status/elapsed_time`,
    `swimex/${poolId}/status/fault_codes`,
    `swimex/${poolId}/keepalive`,
  ];

  for (const tag of coreTags) {
    tagDatabase.registerTag(tag, {
      address: tag,
      dataType: tag.includes('fault') ? 'STRING' : 'FLOAT32',
      accessMode: tag.includes('command') ? 'WRITE' : 'READ',
      scaleFactor: 1.0,
      offset: 0,
      description: tag.split('/').pop(),
    });
  }

  log.info(`Registered ${coreTags.length} core PLC tags`);
}

main().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
