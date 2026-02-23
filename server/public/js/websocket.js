/**
 * SwimEx EDGE — WebSocket Client
 * Auto-connect with token, reconnection, event handlers, connection status
 */

const WebSocketClient = (function () {
  'use strict';

  let ws = null;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let heartbeatTimer = null;
  let heartbeatSequence = 0;
  const MAX_RECONNECT_ATTEMPTS = 10;
  const BASE_DELAY_MS = 1000;
  const HEARTBEAT_INTERVAL_MS = 15000;

  const listeners = {
    workout: [],
    tag: [],
    keepalive: [],
    connected: [],
    disconnected: [],
    error: [],
  };

  function getWsUrl() {
    if (typeof window === 'undefined') return '';
    const { protocol, hostname, port } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    const portPart = port && !['80', '443'].includes(port) ? `:${port}` : '';
    const token = typeof API !== 'undefined' && API.getToken ? API.getToken() : null;
    const qs = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${wsProtocol}//${hostname}${portPart}/ws${qs}`;
  }

  function emit(event, data) {
    const list = listeners[event];
    if (list) list.forEach((fn) => { try { fn(data); } catch (e) { console.error(e); } });
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    const delay = Math.min(BASE_DELAY_MS * Math.pow(2, reconnectAttempts), 60000);
    reconnectAttempts++;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function startHeartbeat() {
    stopHeartbeat();
    heartbeatTimer = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        heartbeatSequence++;
        ws.send(JSON.stringify({
          type: 'keepalive',
          payload: { sequenceNumber: heartbeatSequence, timestamp: Date.now() },
          timestamp: Date.now(),
        }));
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const url = getWsUrl();
    try {
      ws = new WebSocket(url);
    } catch (e) {
      emit('error', e);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      reconnectAttempts = 0;
      startHeartbeat();
      emit('connected', {});
    };

    ws.onclose = () => {
      stopHeartbeat();
      emit('disconnected', {});
      scheduleReconnect();
    };

    ws.onerror = (e) => {
      emit('error', e);
    };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        switch (msg.type) {
          case 'connected':
            emit('connected', msg.payload);
            break;
          case 'workout_update':
            emit('workout', msg.payload);
            break;
          case 'tag_update':
            emit('tag', msg.payload);
            break;
          case 'keepalive':
            emit('keepalive', msg.payload);
            break;
          case 'authenticated':
          case 'auth_error':
          case 'error':
            emit('workout', msg);
            break;
          default:
            emit('workout', msg);
        }
      } catch (e) {
        console.error('WS message parse error', e);
      }
    };
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopHeartbeat();
    if (ws) {
      ws.close();
      ws = null;
    }
    reconnectAttempts = MAX_RECONNECT_ATTEMPTS;
  }

  function send(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }

  function sendCommand(command, payload = {}) {
    send({ type: 'command', payload: { command, ...payload }, timestamp: Date.now() });
  }

  function isConnected() {
    return ws && ws.readyState === WebSocket.OPEN;
  }

  function on(event, fn) {
    if (listeners[event]) listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!listeners[event]) return;
    const i = listeners[event].indexOf(fn);
    if (i >= 0) listeners[event].splice(i, 1);
  }

  return {
    connect,
    disconnect,
    send,
    sendCommand,
    isConnected,
    on,
    off,
    getReconnectAttempts: () => reconnectAttempts,
  };
})();
