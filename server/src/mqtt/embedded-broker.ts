import { Aedes, AedesOptions, Client, AuthenticateError } from 'aedes';
import { Subscription } from 'aedes/types/packet';
import { createServer, Server as NetServer } from 'net';
import { createServer as createHttpServer, Server as HttpServer } from 'http';
import { createLogger } from '../utils/logger';
import { config } from '../utils/config';

const log = createLogger('mqtt-broker-embedded');

export interface EmbeddedBrokerConfig {
  port: number;
  wsPort?: number;
  maxConnections: number;
  heartbeatInterval: number;
  connectTimeout: number;
  authenticate?: boolean;
  credentials?: Array<{ username: string; password: string }>;
}

const DEFAULT_BROKER_CONFIG: EmbeddedBrokerConfig = {
  port: parseInt(process.env.MQTT_BROKER_PORT ?? String(config.mqttPort), 10),
  wsPort: parseInt(process.env.MQTT_WS_PORT ?? '9001', 10),
  maxConnections: 100,
  heartbeatInterval: 60000,
  connectTimeout: 30000,
  authenticate: process.env.MQTT_AUTH === 'true',
  credentials: [
    { username: process.env.MQTT_USER ?? 'edge-server', password: process.env.MQTT_PASS ?? 'edge-server-secret' },
  ],
};

/**
 * Embedded MQTT Broker powered by Aedes.
 * Eliminates the need for an external Mosquitto container.
 * Supports plain TCP and WebSocket transports.
 */
export class EmbeddedMqttBroker {
  private aedes: Aedes | null = null;
  private tcpServer: NetServer | null = null;
  private wsHttpServer: HttpServer | null = null;
  private brokerConfig: EmbeddedBrokerConfig;
  private started = false;
  private stats = {
    clientsConnected: 0,
    messagesReceived: 0,
    messagesPublished: 0,
  };

  constructor(cfg?: Partial<EmbeddedBrokerConfig>) {
    this.brokerConfig = { ...DEFAULT_BROKER_CONFIG, ...cfg };
  }

  async start(): Promise<void> {
    if (this.started) return;

    const opts: AedesOptions = {
      heartbeatInterval: this.brokerConfig.heartbeatInterval,
      connectTimeout: this.brokerConfig.connectTimeout,
      concurrency: 200,
    };

    this.aedes = new Aedes(opts);

    if (this.brokerConfig.authenticate && this.brokerConfig.credentials?.length) {
      this.setupAuthentication();
    }

    this.setupEventHandlers();

    await this.startTcpServer();
    await this.startWebSocketServer();

    this.started = true;
    log.info(`Embedded MQTT broker started (TCP: ${this.brokerConfig.port}, WS: ${this.brokerConfig.wsPort})`);
  }

  private setupAuthentication(): void {
    if (!this.aedes) return;

    const credentials = this.brokerConfig.credentials ?? [];
    this.aedes.authenticate = (
      _client: Client,
      username: Readonly<string | undefined>,
      password: Readonly<Buffer | undefined>,
      callback: (error: AuthenticateError | null, success: boolean | null) => void,
    ) => {
      if (!username || !password) {
        callback(null, !this.brokerConfig.authenticate);
        return;
      }

      const match = credentials.some(
        (c) => c.username === username && c.password === password.toString(),
      );

      if (match) {
        callback(null, true);
      } else {
        log.warn(`Auth rejected for user "${username}"`);
        const err = new Error('Bad credentials') as AuthenticateError;
        err.returnCode = 4;
        callback(err, false);
      }
    };
  }

  private setupEventHandlers(): void {
    if (!this.aedes) return;

    this.aedes.on('client', (client: Client) => {
      this.stats.clientsConnected++;
      log.debug(`Client connected: ${client?.id}`);
    });

    this.aedes.on('clientDisconnect', (client: Client) => {
      this.stats.clientsConnected = Math.max(0, this.stats.clientsConnected - 1);
      log.debug(`Client disconnected: ${client?.id}`);
    });

    this.aedes.on('publish', () => {
      this.stats.messagesPublished++;
    });

    this.aedes.on('subscribe', (subscriptions: Subscription[], client: Client) => {
      const topics = subscriptions.map((s) => s.topic).join(', ');
      log.debug(`Client ${client?.id} subscribed: ${topics}`);
    });

    this.aedes.on('clientError', (client: Client, err: Error) => {
      log.warn(`Client ${client?.id} error: ${err.message}`);
    });
  }

  private startTcpServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.tcpServer = createServer(this.aedes!.handle);

      this.tcpServer.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log.warn(`MQTT TCP port ${this.brokerConfig.port} in use, trying ${this.brokerConfig.port + 10}`);
          this.brokerConfig.port += 10;
          this.tcpServer!.listen(this.brokerConfig.port, '0.0.0.0', () => {
            log.info(`MQTT TCP server listening on port ${this.brokerConfig.port}`);
            resolve();
          });
        } else {
          reject(err);
        }
      });

      this.tcpServer.listen(this.brokerConfig.port, '0.0.0.0', () => {
        log.info(`MQTT TCP server listening on port ${this.brokerConfig.port}`);
        resolve();
      });
    });
  }

  private startWebSocketServer(): Promise<void> {
    if (!this.brokerConfig.wsPort) return Promise.resolve();

    return new Promise((resolve) => {
      try {
        const ws = require('ws');
        this.wsHttpServer = createHttpServer();

        const wss = new ws.WebSocketServer({ server: this.wsHttpServer });
        wss.on('connection', (wsConn: any, req: any) => {
          const stream = ws.createWebSocketStream(wsConn);
          this.aedes!.handle(stream);
          log.debug(`MQTT WebSocket client connected from ${req.socket.remoteAddress}`);
        });

        this.wsHttpServer.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            log.warn(`MQTT WS port ${this.brokerConfig.wsPort} in use, skipping WS transport`);
          }
          resolve();
        });

        this.wsHttpServer.listen(this.brokerConfig.wsPort, '0.0.0.0', () => {
          log.info(`MQTT WebSocket server listening on port ${this.brokerConfig.wsPort}`);
          resolve();
        });
      } catch {
        log.debug('WebSocket transport not available (ws module not found)');
        resolve();
      }
    });
  }

  getPort(): number {
    return this.brokerConfig.port;
  }

  getWsPort(): number | undefined {
    return this.brokerConfig.wsPort;
  }

  isRunning(): boolean {
    return this.started;
  }

  getStats() {
    return {
      ...this.stats,
      connectedClients: this.aedes?.connectedClients ?? 0,
    };
  }

  getAedes(): Aedes | null {
    return this.aedes;
  }

  async stop(): Promise<void> {
    if (!this.started) return;

    return new Promise((resolve) => {
      const cleanup = () => {
        if (this.wsHttpServer) {
          this.wsHttpServer.close();
          this.wsHttpServer = null;
        }
        if (this.tcpServer) {
          this.tcpServer.close();
          this.tcpServer = null;
        }
        this.started = false;
        log.info('Embedded MQTT broker stopped');
        resolve();
      };

      if (this.aedes) {
        this.aedes.close(cleanup);
        this.aedes = null;
      } else {
        cleanup();
      }
    });
  }
}

export const embeddedBroker = new EmbeddedMqttBroker();
