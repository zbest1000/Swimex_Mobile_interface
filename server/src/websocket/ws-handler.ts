import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { verifyToken, TokenPayload } from '../auth/auth-service';
import { workoutEngine } from '../workouts/workout-engine';
import { tagDatabase, TagValue } from '../tags/tag-database';
import { createLogger } from '../utils/logger';
import { config } from '../utils/config';

const log = createLogger('websocket');

interface ConnectedClient {
  ws: WebSocket;
  user: TokenPayload | null;
  lastPing: number;
  missedHeartbeats: number;
}

export class WebSocketHandler {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ConnectedClient>();
  private heartbeatTimer: NodeJS.Timeout | null = null;

  attach(server: Server): void {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });

    this.setupWorkoutBroadcasts();
    this.setupTagBroadcasts();
    this.startHeartbeat();

    log.info('WebSocket handler attached');
  }

  private handleConnection(ws: WebSocket, req: any): void {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    let user: TokenPayload | null = null;
    if (token) {
      try {
        user = verifyToken(token);
      } catch {
        log.debug('WebSocket connection with invalid token');
      }
    }

    const client: ConnectedClient = { ws, user, lastPing: Date.now(), missedHeartbeats: 0 };
    this.clients.set(ws, client);
    log.info(`WebSocket client connected (user: ${user?.username ?? 'guest'}), total: ${this.clients.size}`);

    // Send initial state
    this.sendToClient(ws, {
      type: 'connected',
      payload: {
        workout: workoutEngine.getActiveWorkout(),
        poolId: config.poolId,
        authenticated: !!user,
        role: user?.role ?? null,
      },
      timestamp: Date.now(),
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        this.handleMessage(ws, client, msg);
      } catch (err) {
        log.error('Invalid WebSocket message', err);
      }
    });

    ws.on('close', () => {
      this.clients.delete(ws);
      log.info(`WebSocket client disconnected, total: ${this.clients.size}`);
    });

    ws.on('pong', () => {
      client.lastPing = Date.now();
      client.missedHeartbeats = 0;
    });
  }

  private handleMessage(ws: WebSocket, client: ConnectedClient, msg: any): void {
    switch (msg.type) {
      case 'authenticate': {
        try {
          client.user = verifyToken(msg.payload.token);
          this.sendToClient(ws, { type: 'authenticated', payload: { role: client.user.role }, timestamp: Date.now() });
        } catch {
          this.sendToClient(ws, { type: 'auth_error', payload: { message: 'Invalid token' }, timestamp: Date.now() });
        }
        break;
      }

      case 'keepalive': {
        client.lastPing = Date.now();
        this.sendToClient(ws, {
          type: 'keepalive',
          payload: { type: 'pong', timestamp: Date.now(), source: 'server', sequenceNumber: msg.payload?.sequenceNumber ?? 0 },
          timestamp: Date.now(),
        });
        break;
      }

      case 'command': {
        if (!client.user) {
          this.sendToClient(ws, { type: 'error', payload: { code: 'AUTH_REQUIRED', message: 'Authentication required for commands' }, timestamp: Date.now() });
          return;
        }
        this.handleCommand(client, msg.payload);
        break;
      }

      case 'subscribe_tags': {
        // Client wants real-time tag updates — already handled via broadcast
        break;
      }
    }
  }

  private handleCommand(client: ConnectedClient, payload: any): void {
    switch (payload.command) {
      case 'START':
        if (workoutEngine.getState() === 'PAUSED') {
          workoutEngine.resume();
        }
        break;
      case 'STOP':
        workoutEngine.stop();
        break;
      case 'PAUSE':
        workoutEngine.pause();
        break;
      case 'SET_SPEED':
        workoutEngine.setSpeed(payload.speed ?? 0);
        break;
      case 'ADJUST_SPEED':
        workoutEngine.adjustSpeed(payload.delta ?? 0);
        break;
    }
  }

  private setupWorkoutBroadcasts(): void {
    const events = ['workout:started', 'workout:stopped', 'workout:paused', 'workout:resumed',
      'workout:tick', 'workout:step_changed', 'workout:set_changed', 'workout:safety_stop',
      'workout:speed_changed'];

    for (const event of events) {
      workoutEngine.on(event, (data: any) => {
        const workout = workoutEngine.getActiveWorkout();
        this.broadcast({
          type: 'workout_update',
          payload: {
            event: event.replace('workout:', ''),
            workout,
            data,
          },
          timestamp: Date.now(),
        });
      });
    }
  }

  private setupTagBroadcasts(): void {
    tagDatabase.on('tag:changed', (address: string, tagValue: TagValue) => {
      this.broadcast({
        type: 'tag_update',
        payload: { address, ...tagValue },
        timestamp: Date.now(),
      });
    });
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      for (const [ws, client] of this.clients) {
        if (client.missedHeartbeats >= config.heartbeatMissedThreshold) {
          log.warn(`Client heartbeat timeout (user: ${client.user?.username ?? 'guest'})`);
          ws.terminate();
          this.clients.delete(ws);
          continue;
        }
        client.missedHeartbeats++;
        ws.ping();
      }
    }, config.heartbeatIntervalMs);
  }

  broadcast(message: any): void {
    const data = JSON.stringify(message);
    for (const [ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    }
  }

  broadcastToAuthenticated(message: any): void {
    const data = JSON.stringify(message);
    for (const [ws, client] of this.clients) {
      if (ws.readyState === WebSocket.OPEN && client.user) {
        ws.send(data);
      }
    }
  }

  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  getConnectedCount(): number {
    return this.clients.size;
  }

  stop(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

export const wsHandler = new WebSocketHandler();
