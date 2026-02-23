"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
const connection_1 = require("../database/connection");
const migrate_1 = require("../database/migrate");
const server_1 = require("../http/server");
const ws_handler_1 = require("../websocket/ws-handler");
const mqtt_broker_1 = require("../mqtt/mqtt-broker");
const modbus_server_1 = require("../modbus/modbus-server");
const data_bridge_1 = require("../communication/data-bridge");
const tag_database_1 = require("../tags/tag-database");
const log = (0, logger_1.createLogger)('app');
async function main() {
    (0, logger_1.setLogLevel)(config_1.config.logLevel);
    log.info('========================================');
    log.info(' SwimEx EDGE Server — Starting');
    log.info('========================================');
    // 1. Initialize database
    log.info('Initializing database...');
    (0, connection_1.initDatabase)();
    (0, migrate_1.runMigrations)();
    // 2. Register core PLC tags
    registerCoreTags();
    // 3. Initialize data bridge (loads tag mappings from DB)
    data_bridge_1.dataBridge.initialize();
    // 4. Create HTTP server
    const app = (0, server_1.createApp)();
    const httpServer = http_1.default.createServer(app);
    // 5. Attach WebSocket handler
    ws_handler_1.wsHandler.attach(httpServer);
    // 6. Start MQTT broker
    try {
        await mqtt_broker_1.mqttBroker.start();
    }
    catch (err) {
        log.warn('MQTT broker failed to start (port may be in use)', err);
    }
    // 7. Start Modbus TCP server
    try {
        await modbus_server_1.modbusServer.start();
    }
    catch (err) {
        log.warn('Modbus TCP server failed to start (port may be in use)', err);
    }
    // 8. Start HTTP server
    httpServer.listen(config_1.config.httpPort, '0.0.0.0', () => {
        log.info(`HTTP server listening on port ${config_1.config.httpPort}`);
        log.info('========================================');
        log.info(' SwimEx EDGE Server — Ready');
        log.info(`   HTTP:     http://0.0.0.0:${config_1.config.httpPort}`);
        log.info(`   MQTT:     mqtt://0.0.0.0:${config_1.config.mqttPort}`);
        log.info(`   Modbus:   tcp://0.0.0.0:${config_1.config.modbusPort}`);
        log.info(`   WS:       ws://0.0.0.0:${config_1.config.httpPort}/ws`);
        log.info('========================================');
    });
    // 9. Start MQTT keep-alive heartbeat
    setInterval(() => {
        mqtt_broker_1.mqttBroker.publishKeepAlive();
    }, config_1.config.heartbeatIntervalMs);
    // Graceful shutdown
    const shutdown = async () => {
        log.info('Shutting down...');
        ws_handler_1.wsHandler.stop();
        await mqtt_broker_1.mqttBroker.stop();
        await modbus_server_1.modbusServer.stop();
        (0, connection_1.closeDatabase)();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
function registerCoreTags() {
    const poolId = config_1.config.poolId;
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
        tag_database_1.tagDatabase.registerTag(tag, {
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
//# sourceMappingURL=index.js.map