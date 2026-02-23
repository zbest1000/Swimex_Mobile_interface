import Aedes, { AedesOptions } from 'aedes';
import { createServer, Server } from 'net';
import { config } from '../utils/config';
import { createLogger } from '../utils/logger';
import { tagDatabase } from '../tags/tag-database';
import { DEFAULT_TOPICS } from '../shared/protocols';

const log = createLogger('mqtt-broker');

export class MqttBroker {
  private aedes: Aedes;
  private server: Server;
  private topics: ReturnType<typeof DEFAULT_TOPICS>;
  private started = false;

  constructor() {
    const aedesOpts: AedesOptions = {
      id: 'swimex-edge-broker',
      heartbeatInterval: config.heartbeatIntervalMs,
    };

    this.aedes = new Aedes(aedesOpts);
    this.server = createServer(this.aedes.handle);
    this.topics = DEFAULT_TOPICS(config.poolId);
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.aedes.on('client', (client) => {
      log.info(`MQTT client connected: ${client.id}`);
    });

    this.aedes.on('clientDisconnect', (client) => {
      log.info(`MQTT client disconnected: ${client.id}`);
    });

    this.aedes.on('publish', (packet, _client) => {
      if (packet.topic.startsWith('$SYS')) return;

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
    tagDatabase.on('tag:changed', (address: string, tagValue: { value: unknown; source: string }) => {
      if (tagValue.source === 'mqtt') return; // Avoid loops
      const topic = this.tagAddressToMqttTopic(address);
      if (topic) {
        this.publish(topic, JSON.stringify(tagValue.value));
      }
    });
  }

  private bridgeToTagDatabase(topic: string, payload: string): void {
    const tagAddress = this.mqttTopicToTagAddress(topic);
    if (tagAddress) {
      try {
        const value = JSON.parse(payload);
        tagDatabase.writeTag(tagAddress, value, 'mqtt');
      } catch {
        tagDatabase.writeTag(tagAddress, payload, 'mqtt');
      }
    }
  }

  private mqttTopicToTagAddress(topic: string): string | null {
    if (topic.startsWith(this.topics.statusPrefix)) {
      return topic;
    }
    if (topic.startsWith(this.topics.commandPrefix)) {
      return topic;
    }
    return null;
  }

  private tagAddressToMqttTopic(address: string): string | null {
    if (address.startsWith('swimex/')) {
      return address;
    }
    return null;
  }

  publish(topic: string, payload: string, options?: { retain?: boolean; qos?: 0 | 1 | 2 }): void {
    this.aedes.publish({
      topic,
      payload: Buffer.from(payload),
      cmd: 'publish',
      qos: options?.qos ?? 0,
      retain: options?.retain ?? false,
      dup: false,
    }, () => {});
  }

  publishKeepAlive(): void {
    const msg = {
      type: 'ping',
      timestamp: Date.now(),
      source: 'server',
      sequenceNumber: Date.now(),
    };
    this.publish(this.topics.keepAlive, JSON.stringify(msg), { qos: 1 });
  }

  async start(): Promise<void> {
    if (this.started) return;

    return new Promise((resolve, reject) => {
      this.server.listen(config.mqttPort, () => {
        this.started = true;
        log.info(`MQTT broker listening on port ${config.mqttPort}`);
        resolve();
      });
      this.server.on('error', (err) => {
        log.error('MQTT broker error', err);
        reject(err);
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.started) return;
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

  getConnectedClients(): number {
    return this.aedes.connectedClients;
  }

  isRunning(): boolean {
    return this.started;
  }
}

export const mqttBroker = new MqttBroker();
