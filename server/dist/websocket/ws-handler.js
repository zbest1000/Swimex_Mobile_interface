"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wsHandler = exports.WebSocketHandler = void 0;
const ws_1 = require("ws");
const auth_service_1 = require("../auth/auth-service");
const workout_engine_1 = require("../workouts/workout-engine");
const tag_database_1 = require("../tags/tag-database");
const logger_1 = require("../utils/logger");
const config_1 = require("../utils/config");
const log = (0, logger_1.createLogger)('websocket');
class WebSocketHandler {
    wss = null;
    clients = new Map();
    heartbeatTimer = null;
    attach(server) {
        this.wss = new ws_1.WebSocketServer({ server, path: '/ws' });
        this.wss.on('connection', (ws, req) => {
            this.handleConnection(ws, req);
        });
        this.setupWorkoutBroadcasts();
        this.setupTagBroadcasts();
        this.startHeartbeat();
        log.info('WebSocket handler attached');
    }
    handleConnection(ws, req) {
        const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
        const token = url.searchParams.get('token');
        let user = null;
        if (token) {
            try {
                user = (0, auth_service_1.verifyToken)(token);
            }
            catch {
                log.debug('WebSocket connection with invalid token');
            }
        }
        const client = { ws, user, lastPing: Date.now(), missedHeartbeats: 0 };
        this.clients.set(ws, client);
        log.info(`WebSocket client connected (user: ${user?.username ?? 'guest'}), total: ${this.clients.size}`);
        // Send initial state
        this.sendToClient(ws, {
            type: 'connected',
            payload: {
                workout: workout_engine_1.workoutEngine.getActiveWorkout(),
                poolId: config_1.config.poolId,
                authenticated: !!user,
                role: user?.role ?? null,
            },
            timestamp: Date.now(),
        });
        ws.on('message', (data) => {
            try {
                const msg = JSON.parse(data.toString());
                this.handleMessage(ws, client, msg);
            }
            catch (err) {
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
    handleMessage(ws, client, msg) {
        switch (msg.type) {
            case 'authenticate': {
                try {
                    client.user = (0, auth_service_1.verifyToken)(msg.payload.token);
                    this.sendToClient(ws, { type: 'authenticated', payload: { role: client.user.role }, timestamp: Date.now() });
                }
                catch {
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
    handleCommand(client, payload) {
        switch (payload.command) {
            case 'START':
                if (workout_engine_1.workoutEngine.getState() === 'PAUSED') {
                    workout_engine_1.workoutEngine.resume();
                }
                break;
            case 'STOP':
                workout_engine_1.workoutEngine.stop();
                break;
            case 'PAUSE':
                workout_engine_1.workoutEngine.pause();
                break;
            case 'SET_SPEED':
                workout_engine_1.workoutEngine.setSpeed(payload.speed ?? 0);
                break;
            case 'ADJUST_SPEED':
                workout_engine_1.workoutEngine.adjustSpeed(payload.delta ?? 0);
                break;
        }
    }
    setupWorkoutBroadcasts() {
        const events = ['workout:started', 'workout:stopped', 'workout:paused', 'workout:resumed',
            'workout:tick', 'workout:step_changed', 'workout:set_changed', 'workout:safety_stop',
            'workout:speed_changed'];
        for (const event of events) {
            workout_engine_1.workoutEngine.on(event, (data) => {
                const workout = workout_engine_1.workoutEngine.getActiveWorkout();
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
    setupTagBroadcasts() {
        tag_database_1.tagDatabase.on('tag:changed', (address, tagValue) => {
            this.broadcast({
                type: 'tag_update',
                payload: { address, ...tagValue },
                timestamp: Date.now(),
            });
        });
    }
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            for (const [ws, client] of this.clients) {
                if (client.missedHeartbeats >= config_1.config.heartbeatMissedThreshold) {
                    log.warn(`Client heartbeat timeout (user: ${client.user?.username ?? 'guest'})`);
                    ws.terminate();
                    this.clients.delete(ws);
                    continue;
                }
                client.missedHeartbeats++;
                ws.ping();
            }
        }, config_1.config.heartbeatIntervalMs);
    }
    broadcast(message) {
        const data = JSON.stringify(message);
        for (const [ws] of this.clients) {
            if (ws.readyState === ws_1.WebSocket.OPEN) {
                ws.send(data);
            }
        }
    }
    broadcastToAuthenticated(message) {
        const data = JSON.stringify(message);
        for (const [ws, client] of this.clients) {
            if (ws.readyState === ws_1.WebSocket.OPEN && client.user) {
                ws.send(data);
            }
        }
    }
    sendToClient(ws, message) {
        if (ws.readyState === ws_1.WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    }
    getConnectedCount() {
        return this.clients.size;
    }
    stop() {
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
exports.WebSocketHandler = WebSocketHandler;
exports.wsHandler = new WebSocketHandler();
//# sourceMappingURL=ws-handler.js.map