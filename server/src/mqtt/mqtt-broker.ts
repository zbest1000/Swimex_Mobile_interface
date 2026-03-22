import mqtt, { MqttClient, IClientOptions, IPublishPacket } from 'mqtt';
import { EventEmitter } from 'events';
import { config } from '../utils/config';
import { createLogger } from '../utils/logger';
import { tagDatabase } from '../tags/tag-database';
import { DEFAULT_TOPICS } from '../shared/protocols';
import { embeddedBroker } from './embedded-broker';

const log = createLogger('mqtt');

export interface MqttBrokerConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  clientId: string;
  keepalive: number;
  reconnectPeriod: number;
  useTls: boolean;
  topicPrefix: string;
  qos: 0 | 1 | 2;
  useEmbeddedBroker: boolean;
}

const DEFAULT_MQTT_CONFIG: MqttBrokerConfig = {
  host: process.env.MQTT_HOST ?? 'localhost',
  port: parseInt(process.env.MQTT_PORT ?? '1883', 10),
  username: process.env.MQTT_USER ?? 'edge-server',
  password: process.env.MQTT_PASS ?? 'edge-server-secret',
  clientId: `edge-server-${process.env.POOL_ID ?? 'default'}-${Date.now()}`,
  keepalive: 60,
  reconnectPeriod: 5000,
  useTls: false,
  topicPrefix: `swimex/${process.env.POOL_ID ?? 'default'}`,
  qos: 1,
  useEmbeddedBroker: (process.env.MQTT_EXTERNAL ?? 'false') !== 'true',
};

/**
 * MQTT Service — connects to Eclipse Mosquitto broker as a client.
 * Bridges MQTT messages ↔ Tag Database for real-time PLC data sync.
 */
export class MqttService extends EventEmitter {
  private client: MqttClient | null = null;
  private mqttConfig: MqttBrokerConfig;
  private topics: ReturnType<typeof DEFAULT_TOPICS>;
  private connected = false;
  private subscriptions = new Map<string, { qos: 0 | 1 | 2; handler?: (topic: string, payload: Buffer) => void }>();
  private keepAliveSequence = 0;
  private keepAliveTimer: NodeJS.Timeout | null = null;
  private lastKeepAliveResponse: number = Date.now();

  constructor(mqttCfg?: Partial<MqttBrokerConfig>) {
    super();
    this.mqttConfig = { ...DEFAULT_MQTT_CONFIG, ...mqttCfg };
    this.topics = DEFAULT_TOPICS(config.poolId);
    this.on('error', (err: Error) => {
      log.error('MqttService EventEmitter error', err?.message ?? 'unknown');
    });
  }

  async start(): Promise<void> {
    if (this.client) return;

    if (this.mqttConfig.useEmbeddedBroker && !embeddedBroker.isRunning()) {
      log.info('Starting embedded MQTT broker (Aedes)...');
      await embeddedBroker.start();
      this.mqttConfig.host = 'localhost';
      this.mqttConfig.port = embeddedBroker.getPort();
      log.info(`Embedded broker ready on port ${this.mqttConfig.port}`);
    }

    const protocol = this.mqttConfig.useTls ? 'mqtts' : 'mqtt';
    const url = `${protocol}://${this.mqttConfig.host}:${this.mqttConfig.port}`;

    const opts: IClientOptions = {
      clientId: this.mqttConfig.clientId,
      username: this.mqttConfig.username,
      password: this.mqttConfig.password,
      keepalive: this.mqttConfig.keepalive,
      reconnectPeriod: this.mqttConfig.reconnectPeriod,
      clean: true,
      will: {
        topic: `${this.mqttConfig.topicPrefix}/status/server_online`,
        payload: Buffer.from(JSON.stringify({ online: false, timestamp: Date.now() })),
        qos: 1,
        retain: true,
      },
    };

    const brokerType = this.mqttConfig.useEmbeddedBroker ? 'embedded Aedes' : 'external';
    log.info(`Connecting to ${brokerType} broker at ${url} as "${this.mqttConfig.clientId}"...`);
    this.client = mqtt.connect(url, opts);

    this.client.on('connect', () => {
      this.connected = true;
      log.info(`Connected to MQTT broker at ${url}`);

      this.publishRetained(`${this.mqttConfig.topicPrefix}/status/server_online`, { online: true, timestamp: Date.now() });

      this.subscribeToCoreTopic();
      for (const [topic, sub] of this.subscriptions) {
        this.client!.subscribe(topic, { qos: sub.qos });
      }

      this.startKeepAlive();
      this.emit('connected');
    });

    this.client.on('reconnect', () => {
      log.info('Reconnecting to MQTT broker...');
      this.emit('reconnecting');
    });

    this.client.on('disconnect', () => {
      this.connected = false;
      this.stopKeepAlive();
      log.warn('Disconnected from MQTT broker');
      this.emit('disconnected');
    });

    this.client.on('offline', () => {
      this.connected = false;
      this.stopKeepAlive();
      log.warn('MQTT client offline');
      this.emit('offline');
    });

    this.client.on('error', (err) => {
      log.error('MQTT client error', err.message);
      // Only emit if there are listeners (prevents unhandled error crash)
      if (this.listenerCount('error') > 0) {
        this.emit('error', err);
      }
    });

    this.client.on('message', (topic: string, payload: Buffer, packet: IPublishPacket) => {
      this.handleMessage(topic, payload, packet);
    });

    return new Promise((resolve) => {
      this.client!.once('connect', () => resolve());
      setTimeout(() => {
        if (!this.connected) {
          log.warn('MQTT connection timeout — will continue retrying in background');
          resolve();
        }
      }, 10000);
    });
  }

  private subscribeToCoreTopic(): void {
    if (!this.client) return;

    const prefix = this.mqttConfig.topicPrefix;
    const topicPatterns = [
      `${prefix}/status/#`,
      `${prefix}/command/#`,
      `${prefix}/keepalive`,
    ];

    for (const pattern of topicPatterns) {
      this.client.subscribe(pattern, { qos: this.mqttConfig.qos }, (err) => {
        if (err) {
          log.error(`Failed to subscribe to ${pattern}`, err.message);
        } else {
          log.info(`Subscribed to ${pattern}`);
        }
      });
    }
  }

  private handleMessage(topic: string, payload: Buffer, packet: IPublishPacket): void {
    const payloadStr = payload.toString();

    // Handle keep-alive responses from PLC
    if (topic === this.topics.keepAlive) {
      try {
        const msg = JSON.parse(payloadStr);
        if (msg.type === 'pong' && msg.source === 'plc') {
          this.lastKeepAliveResponse = Date.now();
          this.emit('keepalive:plc_response', msg);
        }
      } catch { /* not JSON, ignore */ }
      return;
    }

    // Bridge MQTT → Tag Database
    const tagAddress = topic;
    let value: unknown;
    try {
      value = JSON.parse(payloadStr);
    } catch {
      value = payloadStr;
    }

    tagDatabase.writeTag(tagAddress, value, 'mqtt');
    this.emit('message', topic, value, packet);

    // Invoke specific subscription handlers
    const sub = this.subscriptions.get(topic);
    if (sub?.handler) {
      sub.handler(topic, payload);
    }
  }

  // --- Publishing ---

  publish(topic: string, data: unknown, qos?: 0 | 1 | 2): void {
    if (!this.client || !this.connected) {
      log.warn(`Cannot publish to ${topic} — not connected`);
      return;
    }

    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.client.publish(topic, payload, { qos: qos ?? this.mqttConfig.qos }, (err) => {
      if (err) {
        log.error(`Publish failed for ${topic}`, err.message);
      }
    });
  }

  publishRetained(topic: string, data: unknown, qos?: 0 | 1 | 2): void {
    if (!this.client || !this.connected) return;

    const payload = typeof data === 'string' ? data : JSON.stringify(data);
    this.client.publish(topic, payload, { qos: qos ?? this.mqttConfig.qos, retain: true }, (err) => {
      if (err) {
        log.error(`Publish retained failed for ${topic}`, err.message);
      }
    });
  }

  publishCommand(command: string, data: unknown): void {
    const topic = `${this.mqttConfig.topicPrefix}/command/${command}`;
    this.publish(topic, data, 1);
  }

  publishStatus(key: string, data: unknown, retained = true): void {
    const topic = `${this.mqttConfig.topicPrefix}/status/${key}`;
    if (retained) {
      this.publishRetained(topic, data, 1);
    } else {
      this.publish(topic, data, 0);
    }
  }

  // --- Subscriptions ---

  subscribe(topic: string, qos: 0 | 1 | 2 = 1, handler?: (topic: string, payload: Buffer) => void): void {
    this.subscriptions.set(topic, { qos, handler });
    if (this.client && this.connected) {
      this.client.subscribe(topic, { qos });
    }
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);
    if (this.client && this.connected) {
      this.client.unsubscribe(topic);
    }
  }

  // --- Keep-Alive Heartbeat ---

  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      this.sendKeepAlive();
      this.checkKeepAliveTimeout();
    }, config.heartbeatIntervalMs);
    log.info(`Keep-alive heartbeat started (interval: ${config.heartbeatIntervalMs}ms)`);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private sendKeepAlive(): void {
    this.keepAliveSequence++;
    const msg = {
      type: 'ping',
      timestamp: Date.now(),
      source: 'server',
      sequenceNumber: this.keepAliveSequence,
    };
    this.publish(this.topics.keepAlive, msg, 1);
  }

  private checkKeepAliveTimeout(): void {
    const elapsed = Date.now() - this.lastKeepAliveResponse;
    const threshold = config.heartbeatIntervalMs * config.heartbeatMissedThreshold;

    if (elapsed > threshold && this.lastKeepAliveResponse > 0) {
      log.warn(`PLC keep-alive timeout: ${elapsed}ms since last response (threshold: ${threshold}ms)`);
      this.emit('keepalive:plc_timeout', elapsed);
    }
  }

  getTimeSinceLastPlcResponse(): number {
    return Date.now() - this.lastKeepAliveResponse;
  }

  // --- Status ---

  isConnected(): boolean {
    return this.connected;
  }

  getTopicPrefix(): string {
    return this.mqttConfig.topicPrefix;
  }

  getConfig(): MqttBrokerConfig {
    return { ...this.mqttConfig };
  }

  async stop(): Promise<void> {
    this.stopKeepAlive();
    if (this.client) {
      this.publishRetained(`${this.mqttConfig.topicPrefix}/status/server_online`, { online: false, timestamp: Date.now() });

      await new Promise<void>((resolve) => {
        this.client!.end(false, {}, () => {
          this.client = null;
          this.connected = false;
          log.info('MQTT client disconnected');
          resolve();
        });
      });
    }

    if (this.mqttConfig.useEmbeddedBroker && embeddedBroker.isRunning()) {
      await embeddedBroker.stop();
    }
  }

  getEmbeddedBrokerStats() {
    return embeddedBroker.isRunning() ? embeddedBroker.getStats() : null;
  }
}

export const mqttBroker = new MqttService();
