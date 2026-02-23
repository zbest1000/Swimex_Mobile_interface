"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mqttBroker = exports.MqttBroker = void 0;
const aedes_1 = __importDefault(require("aedes"));
const net_1 = require("net");
const config_1 = require("../utils/config");
const logger_1 = require("../utils/logger");
const tag_database_1 = require("../tags/tag-database");
const protocols_1 = require("../shared/protocols");
const log = (0, logger_1.createLogger)('mqtt-broker');
class MqttBroker {
    aedes;
    server;
    topics;
    started = false;
    constructor() {
        const aedesOpts = {
            id: 'swimex-edge-broker',
            heartbeatInterval: config_1.config.heartbeatIntervalMs,
        };
        this.aedes = new aedes_1.default(aedesOpts);
        this.server = (0, net_1.createServer)(this.aedes.handle);
        this.topics = (0, protocols_1.DEFAULT_TOPICS)(config_1.config.poolId);
        this.setupHandlers();
    }
    setupHandlers() {
        this.aedes.on('client', (client) => {
            log.info(`MQTT client connected: ${client.id}`);
        });
        this.aedes.on('clientDisconnect', (client) => {
            log.info(`MQTT client disconnected: ${client.id}`);
        });
        this.aedes.on('publish', (packet, _client) => {
            if (packet.topic.startsWith('$SYS'))
                return;
            const topic = packet.topic;
            const payload = packet.payload.toString();
            log.debug(`MQTT publish: ${topic}`, payload);
            // Bridge MQTT → tag database
            this.bridgeToTagDatabase(topic, payload);
        });
        this.aedes.on('subscribe', (subscriptions, client) => {
            const topics = subscriptions.map(s => s.topic).join(', ');
            log.debug(`MQTT subscribe: ${client.id} → ${topics}`);
        });
        // Bridge tag database → MQTT
        tag_database_1.tagDatabase.on('tag:changed', (address, tagValue) => {
            if (tagValue.source === 'mqtt')
                return; // Avoid loops
            const topic = this.tagAddressToMqttTopic(address);
            if (topic) {
                this.publish(topic, JSON.stringify(tagValue.value));
            }
        });
    }
    bridgeToTagDatabase(topic, payload) {
        const tagAddress = this.mqttTopicToTagAddress(topic);
        if (tagAddress) {
            try {
                const value = JSON.parse(payload);
                tag_database_1.tagDatabase.writeTag(tagAddress, value, 'mqtt');
            }
            catch {
                tag_database_1.tagDatabase.writeTag(tagAddress, payload, 'mqtt');
            }
        }
    }
    mqttTopicToTagAddress(topic) {
        if (topic.startsWith(this.topics.statusPrefix)) {
            return topic;
        }
        if (topic.startsWith(this.topics.commandPrefix)) {
            return topic;
        }
        return null;
    }
    tagAddressToMqttTopic(address) {
        if (address.startsWith('swimex/')) {
            return address;
        }
        return null;
    }
    publish(topic, payload, options) {
        this.aedes.publish({
            topic,
            payload: Buffer.from(payload),
            cmd: 'publish',
            qos: options?.qos ?? 0,
            retain: options?.retain ?? false,
            dup: false,
        }, () => { });
    }
    publishKeepAlive() {
        const msg = {
            type: 'ping',
            timestamp: Date.now(),
            source: 'server',
            sequenceNumber: Date.now(),
        };
        this.publish(this.topics.keepAlive, JSON.stringify(msg), { qos: 1 });
    }
    async start() {
        if (this.started)
            return;
        return new Promise((resolve, reject) => {
            this.server.listen(config_1.config.mqttPort, () => {
                this.started = true;
                log.info(`MQTT broker listening on port ${config_1.config.mqttPort}`);
                resolve();
            });
            this.server.on('error', (err) => {
                log.error('MQTT broker error', err);
                reject(err);
            });
        });
    }
    async stop() {
        if (!this.started)
            return;
        return new Promise((resolve) => {
            this.aedes.close(() => {
                this.server.close(() => {
                    this.started = false;
                    log.info('MQTT broker stopped');
                    resolve();
                });
            });
        });
    }
    getConnectedClients() {
        return this.aedes.connectedClients;
    }
    isRunning() {
        return this.started;
    }
}
exports.MqttBroker = MqttBroker;
exports.mqttBroker = new MqttBroker();
//# sourceMappingURL=mqtt-broker.js.map