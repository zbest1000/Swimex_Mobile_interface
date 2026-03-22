import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { verifyToken, TokenPayload } from '../auth/auth-service';
import { workoutEngine } from '../workouts/workout-engine';
import { tagDatabase, TagValue } from '../tags/tag-database';
import { mqttBroker } from '../mqtt/mqtt-broker';
import { modbusClient } from '../modbus/modbus-client';
import { createLogger } from '../utils/logger';
import { config } from '../utils/config';
import { UserRole } from '../shared/models';

const log = createLogger('websocket');

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  user: TokenPayload | null;
  lastPing: number;
  missedHeartbeats: number;
  subscribedTags: Set<string>;
  connectedAt: number;
  remoteAddress: string;
}

/**
 * Full WebSocket handler — real-time bidirectional communication between
 * the EDGE server and all connected clients (tablets, browsers).
 *
 * Message types:
 *   → Client sends: authenticate, keepalive, command, subscribe_tags, unsubscribe_tags, get_tag
 *   ← Server sends: connected, authenticated, auth_error, keepalive, workout_update,
 *                    tag_update, connection_status, error, safety_stop
 */
export class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ConnectedClient>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionStatusTimer: NodeJS.Timeout | null = null;
  private clientIdCounter = 0;

  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));
    this.wss.on('error', (err) => log.error('WebSocket server error', err.message));

    this.setupWorkoutBroadcasts();
    this.setupTagBroadcasts();
    this.setupSafetyStopDetection();
    this.startHeartbeat();
    this.startConnectionStatusBroadcast();

    log.info('WebSocket handler attached at /ws');
  }

  private handleConnection(ws: WebSocket, req: any): void {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const remoteAddress = req.headers['x-forwarded-for'] as string || req.socket.remoteAddress || 'unknown';

    let user: TokenPayload | null = null;
    if (token) {
      try { user = verifyToken(token); } catch { /* guest connection */ }
    }

    const client: ConnectedClient = {
      id: `ws-${++this.clientIdCounter}`,
      ws,
      user,
      lastPing: Date.now(),
      missedHeartbeats: 0,
      subscribedTags: new Set(),
      connectedAt: Date.now(),
      remoteAddress,
    };
    this.clients.set(ws, client);

    log.info(`Client connected: ${client.id} (${user?.username ?? 'guest'}) from ${remoteAddress}, total: ${this.clients.size}`);

    // Send initial state
    this.send(ws, {
      type: 'connected',
      payload: {
        clientId: client.id,
        workout: workoutEngine.getActiveWorkout(),
        poolId: config.poolId,
        authenticated: !!user,
        role: user?.role ?? null,
        serverTime: Date.now(),
        connectionStatus: this.getConnectionStatus(),
      },
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(client, msg);
      } catch (err: any) {
        this.send(ws, { type: 'error', payload: { code: 'PARSE_ERROR', message: 'Invalid message format' } });
      }
    });

    ws.on('close', (code, reason) => {
      this.clients.delete(ws);
      log.info(`Client disconnected: ${client.id} (code ${code}), total: ${this.clients.size}`);
    });

    ws.on('pong', () => {
      client.lastPing = Date.now();
      client.missedHeartbeats = 0;
    });

    ws.on('error', (err) => {
      log.error(`Client ${client.id} socket error`, err.message);
    });
  }

  private handleMessage(client: ConnectedClient, msg: any): void {
    const type = msg.type;
    const payload = msg.payload ?? {};

    switch (type) {
      case 'authenticate':
        this.handleAuth(client, payload);
        break;

      case 'keepalive':
        client.lastPing = Date.now();
        client.missedHeartbeats = 0;
        this.send(client.ws, {
          type: 'keepalive',
          payload: { type: 'pong', timestamp: Date.now(), source: 'server', sequenceNumber: payload.sequenceNumber ?? 0 },
        });
        break;

      case 'command':
        this.handleCommand(client, payload);
        break;

      case 'subscribe_tags':
        if (!client.user) {
          this.send(client.ws, { type: 'error', payload: { code: 'AUTH_REQUIRED', message: 'Authentication required for tag subscriptions' } });
          break;
        }
        this.handleSubscribeTags(client, payload);
        break;

      case 'unsubscribe_tags':
        this.handleUnsubscribeTags(client, payload);
        break;

      case 'get_tag':
        if (!client.user) {
          this.send(client.ws, { type: 'error', payload: { code: 'AUTH_REQUIRED', message: 'Authentication required for tag access' } });
          break;
        }
        this.handleGetTag(client, payload);
        break;

      case 'get_tags':
        if (!client.user) {
          this.send(client.ws, { type: 'error', payload: { code: 'AUTH_REQUIRED', message: 'Authentication required for tag access' } });
          break;
        }
        this.handleGetTags(client, payload);
        break;

      case 'get_workout':
        this.send(client.ws, { type: 'workout_update', payload: { event: 'snapshot', workout: workoutEngine.getActiveWorkout() } });
        break;

      default:
        this.send(client.ws, { type: 'error', payload: { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${type}` } });
    }
  }

  private handleAuth(client: ConnectedClient, payload: any): void {
    try {
      client.user = verifyToken(payload.token);
      this.send(client.ws, {
        type: 'authenticated',
        payload: { userId: client.user.userId, username: client.user.username, role: client.user.role },
      });
      log.info(`Client ${client.id} authenticated as ${client.user.username} (${client.user.role})`);
    } catch {
      this.send(client.ws, { type: 'auth_error', payload: { message: 'Invalid or expired token' } });
    }
  }

  private handleCommand(client: ConnectedClient, payload: any): void {
    if (!client.user) {
      this.send(client.ws, { type: 'error', payload: { code: 'AUTH_REQUIRED', message: 'Authentication required for commands' } });
      return;
    }

    const { command, speed, delta, programId, durationMs, level, type: workoutType, step1, step2, sets } = payload;

    try {
      switch (command) {
        case 'QUICK_START':
          workoutEngine.startQuickStart(speed ?? 50, durationMs ?? null, client.user.userId, 'ws-client');
          break;
        case 'START_PROGRAM':
          workoutEngine.startProgram(programId, client.user.userId, 'ws-client');
          break;
        case 'START_PRESET':
          workoutEngine.startPreset(workoutType, level, client.user.userId, 'ws-client');
          break;
        case 'START_INTERVAL':
          workoutEngine.startInterval(sets ?? 1, step1, step2, client.user.userId, 'ws-client');
          break;
        case 'START':
          if (workoutEngine.getState() === 'PAUSED') workoutEngine.resume();
          break;
        case 'STOP':
          workoutEngine.stop();
          break;
        case 'PAUSE':
          workoutEngine.pause();
          break;
        case 'RESUME':
          workoutEngine.resume();
          break;
        case 'SET_SPEED':
          workoutEngine.setSpeed(speed ?? 0);
          break;
        case 'ADJUST_SPEED':
          workoutEngine.adjustSpeed(delta ?? 0);
          break;
        case 'WRITE_TAG': {
          const writeRoles: string[] = [UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE];
          if (!writeRoles.includes(client.user.role)) {
            this.send(client.ws, { type: 'command_error', payload: { command: 'WRITE_TAG', message: 'Insufficient privileges for WRITE_TAG' } });
            return;
          }
          if (payload.tagAddress && payload.value !== undefined) {
            tagDatabase.writeTag(payload.tagAddress, payload.value, `ws:${client.user.username}`);
          }
          break;
        }
        default:
          this.send(client.ws, { type: 'error', payload: { code: 'UNKNOWN_COMMAND', message: `Unknown command: ${command}` } });
          return;
      }

      this.send(client.ws, { type: 'command_ack', payload: { command, success: true } });
    } catch (err: any) {
      this.send(client.ws, { type: 'command_error', payload: { command, message: err.message } });
    }
  }

  private handleSubscribeTags(client: ConnectedClient, payload: any): void {
    const tags: string[] = payload.tags ?? [];
    const adminRoles: string[] = [UserRole.SUPER_ADMINISTRATOR, UserRole.ADMINISTRATOR, UserRole.MAINTENANCE];
    for (const tag of tags) {
      if (tag === '*' && (!client.user || !adminRoles.includes(client.user.role))) {
        this.send(client.ws, { type: 'error', payload: { code: 'FORBIDDEN', message: 'Wildcard tag subscription requires admin privileges' } });
        continue;
      }
      client.subscribedTags.add(tag);
      const value = tagDatabase.readTag(tag);
      if (value) {
        this.send(client.ws, { type: 'tag_update', payload: { address: tag, ...value } });
      }
    }
  }

  private handleUnsubscribeTags(client: ConnectedClient, payload: any): void {
    const tags: string[] = payload.tags ?? [];
    for (const tag of tags) {
      client.subscribedTags.delete(tag);
    }
  }

  private handleGetTag(client: ConnectedClient, payload: any): void {
    const value = tagDatabase.readTag(payload.address);
    this.send(client.ws, { type: 'tag_value', payload: { address: payload.address, tag: value ?? null } });
  }

  private handleGetTags(client: ConnectedClient, payload: any): void {
    const addresses: string[] = payload.addresses ?? [];
    const results: Record<string, TagValue | null> = {};
    for (const addr of addresses) {
      results[addr] = tagDatabase.readTag(addr) ?? null;
    }
    this.send(client.ws, { type: 'tags_snapshot', payload: results });
  }

  // --- Event Broadcasts ---

  private setupWorkoutBroadcasts(): void {
    const events = ['workout:started', 'workout:stopped', 'workout:paused', 'workout:resumed',
      'workout:safety_stop', 'workout:speed_changed', 'workout:step_changed', 'workout:set_changed'];

    for (const event of events) {
      workoutEngine.on(event, (data: any, extra?: any) => {
        this.broadcast({
          type: 'workout_update',
          payload: { event: event.replace('workout:', ''), workout: workoutEngine.getActiveWorkout(), data, extra },
        });
      });
    }

    workoutEngine.on('workout:tick', (workout: any) => {
      this.broadcast({ type: 'workout_update', payload: { event: 'tick', workout } });
    });
  }

  private setupTagBroadcasts(): void {
    tagDatabase.on('tag:changed', (address: string, tagValue: TagValue) => {
      const update = { type: 'tag_update', payload: { address, value: tagValue.value, quality: tagValue.quality, timestamp: tagValue.timestamp, source: tagValue.source } };

      for (const [ws, client] of this.clients) {
        if (client.subscribedTags.has(address) || client.subscribedTags.has('*')) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(update));
          }
        }
      }
    });
  }

  private setupSafetyStopDetection(): void {
    mqttBroker.on('keepalive:plc_timeout', (elapsedMs: number) => {
      log.warn(`PLC heartbeat lost (${elapsedMs}ms) — triggering safety stop`);
      workoutEngine.safetyStop();
      this.broadcast({
        type: 'safety_stop',
        payload: { reason: 'PLC heartbeat lost', elapsedMs, timestamp: Date.now() },
      });
    });

    modbusClient.on('disconnected', () => {
      log.warn('Modbus client disconnected from PLC');
      this.broadcast({
        type: 'connection_status',
        payload: this.getConnectionStatus(),
      });
    });

    modbusClient.on('connected', () => {
      this.broadcast({
        type: 'connection_status',
        payload: this.getConnectionStatus(),
      });
    });
  }

  // --- Heartbeat ---

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const [ws, client] of this.clients) {
        if (client.missedHeartbeats >= config.heartbeatMissedThreshold) {
          log.warn(`Client ${client.id} heartbeat timeout — disconnecting`);
          ws.terminate();
          this.clients.delete(ws);
          continue;
        }
        client.missedHeartbeats++;
        if (ws.readyState === WebSocket.OPEN) ws.ping();
      }
    }, config.heartbeatIntervalMs);
  }

  private startConnectionStatusBroadcast(): void {
    this.connectionStatusTimer = setInterval(() => {
      this.broadcast({ type: 'connection_status', payload: this.getConnectionStatus() });
    }, 10000);
  }

  private getConnectionStatus() {
    return {
      mqttConnected: mqttBroker.isConnected(),
      modbusClientConnected: modbusClient.isConnected(),
      plcHeartbeatMs: mqttBroker.getTimeSinceLastPlcResponse(),
      wsClients: this.clients.size,
      timestamp: Date.now(),
    };
  }

  // --- Broadcast Utilities ---

  broadcast(message: any): void {
    const data = JSON.stringify({ ...message, timestamp: message.timestamp ?? Date.now() });
    for (const [ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  broadcastToAuthenticated(message: any): void {
    const data = JSON.stringify({ ...message, timestamp: message.timestamp ?? Date.now() });
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN && client.user) {
        ws.send(data);
      }
    }
  }

  private send(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ ...message, timestamp: message.timestamp ?? Date.now() }));
    }
  }

  getConnectedCount(): number {
    return this.clients.size;
  }

  getClientList(): Array<{ id: string; username: string | null; role: string | null; connectedAt: number; remoteAddress: string }> {
    const list: Array<{ id: string; username: string | null; role: string | null; connectedAt: number; remoteAddress: string }> = [];
    for (const [, client] of this.clients) {
      list.push({
        id: client.id,
        username: client.user?.username ?? null,
        role: client.user?.role ?? null,
        connectedAt: client.connectedAt,
        remoteAddress: client.remoteAddress,
      });
    }
    return list;
  }

  stop(): void {
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    if (this.connectionStatusTimer) { clearInterval(this.connectionStatusTimer); this.connectionStatusTimer = null; }
    for (const [ws] of this.clients) { ws.terminate(); }
    this.clients.clear();
    if (this.wss) { this.wss.close(); this.wss = null; }
  }
}

export const wsHandler = new WebSocketHandler();
