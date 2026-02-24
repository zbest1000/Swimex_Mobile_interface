/**
 * SwimEx EDGE — WebSocket Client
 * Auto-connect with JWT, exponential backoff reconnection, event emitter, keepalive.
 */
const EdgeWebSocket = (function () {
  'use strict';

  let ws = null;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let keepaliveTimer = null;
  let keepaliveSeq = 0;
  let intentionalClose = false;

  const MAX_RECONNECT_DELAY = 16000;
  const BASE_DELAY = 1000;
  const KEEPALIVE_MS = 5000;

  const STATE = { DISCONNECTED: 'disconnected', CONNECTING: 'connecting', CONNECTED: 'connected' };
  let connectionState = STATE.DISCONNECTED;

  const listeners = {};
  let onConnectionStatusChange = null;

  function on(event, fn) {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(fn);
  }

  function off(event, fn) {
    if (!listeners[event]) return;
    if (!fn) { listeners[event] = []; return; }
    const idx = listeners[event].indexOf(fn);
    if (idx >= 0) listeners[event].splice(idx, 1);
  }

  function emit(event, data) {
    var fns = listeners[event];
    if (fns) {
      for (var i = 0; i < fns.length; i++) {
        try { fns[i](data); } catch (e) { console.error('[WS] listener error:', e); }
      }
    }
  }

  function setConnectionState(state) {
    if (connectionState === state) return;
    connectionState = state;
    if (typeof onConnectionStatusChange === 'function') {
      onConnectionStatusChange(state);
    }
    emit('connection_status', { state: state });
  }

  function getWsUrl() {
    var loc = window.location;
    var proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    var port = loc.port && !['80', '443'].includes(loc.port) ? ':' + loc.port : '';
    return proto + '//' + loc.hostname + port + '/ws';
  }

  function startKeepalive() {
    stopKeepalive();
    keepaliveTimer = setInterval(function () {
      if (ws && ws.readyState === WebSocket.OPEN) {
        keepaliveSeq++;
        sendRaw({
          type: 'keepalive',
          payload: { sequenceNumber: keepaliveSeq, timestamp: Date.now() },
          timestamp: Date.now()
        });
      }
    }, KEEPALIVE_MS);
  }

  function stopKeepalive() {
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
  }

  function scheduleReconnect() {
    if (reconnectTimer || intentionalClose) return;
    var delay = Math.min(BASE_DELAY * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY);
    reconnectAttempts++;
    setConnectionState(STATE.CONNECTING);
    reconnectTimer = setTimeout(function () {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function sendRaw(msg) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }

  function authenticate(token) {
    sendRaw({ type: 'authenticate', payload: { token: token }, timestamp: Date.now() });
  }

  function sendCommand(cmd, payload) {
    sendRaw({
      type: 'command',
      payload: Object.assign({ command: cmd }, payload || {}),
      timestamp: Date.now()
    });
  }

  function subscribeTags(tags) {
    sendRaw({ type: 'subscribe_tags', payload: { tags: tags }, timestamp: Date.now() });
  }

  function unsubscribeTags(tags) {
    sendRaw({ type: 'unsubscribe_tags', payload: { tags: tags }, timestamp: Date.now() });
  }

  function sendKeepAlive() {
    keepaliveSeq++;
    sendRaw({
      type: 'keepalive',
      payload: { sequenceNumber: keepaliveSeq, timestamp: Date.now() },
      timestamp: Date.now()
    });
  }

  function handleMessage(ev) {
    var msg;
    try { msg = JSON.parse(ev.data); } catch (_) { return; }

    var type = msg.type;
    var payload = msg.payload || msg;

    switch (type) {
      case 'connected':
        emit('connected', payload);
        var token = typeof EdgeAPI !== 'undefined' ? EdgeAPI.getToken() : null;
        if (token) authenticate(token);
        break;
      case 'authenticated':
        emit('authenticated', payload);
        break;
      case 'workout_update':
        emit('workout_update', payload);
        break;
      case 'tag_update':
        emit('tag_update', payload);
        break;
      case 'connection_status':
        emit('connection_status', payload);
        break;
      case 'safety_stop':
        emit('safety_stop', payload);
        break;
      case 'keepalive':
        emit('keepalive', payload);
        break;
      case 'error':
        emit('error', payload);
        break;
      case 'command_ack':
        emit('command_ack', payload);
        break;
      case 'command_error':
        emit('command_error', payload);
        break;
      default:
        emit(type, payload);
        break;
    }
  }

  function connect() {
    if (ws && (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN)) {
      return;
    }
    intentionalClose = false;
    setConnectionState(STATE.CONNECTING);

    var url = getWsUrl();
    var token = typeof EdgeAPI !== 'undefined' ? EdgeAPI.getToken() : null;
    if (token) url += '?token=' + encodeURIComponent(token);

    try {
      ws = new WebSocket(url);
    } catch (e) {
      emit('error', { message: 'WebSocket creation failed', error: e });
      scheduleReconnect();
      return;
    }

    ws.onopen = function () {
      reconnectAttempts = 0;
      setConnectionState(STATE.CONNECTED);
      startKeepalive();
      emit('connected', {});
    };

    ws.onclose = function () {
      stopKeepalive();
      setConnectionState(STATE.DISCONNECTED);
      emit('disconnected', {});
      scheduleReconnect();
    };

    ws.onerror = function (e) {
      emit('error', { message: 'WebSocket error', error: e });
    };

    ws.onmessage = handleMessage;
  }

  function disconnect() {
    intentionalClose = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    stopKeepalive();
    if (ws) {
      ws.close();
      ws = null;
    }
    reconnectAttempts = 0;
    setConnectionState(STATE.DISCONNECTED);
  }

  function isConnected() {
    return ws !== null && ws.readyState === WebSocket.OPEN;
  }

  function getState() {
    return connectionState;
  }

  return {
    connect: connect,
    disconnect: disconnect,
    isConnected: isConnected,
    getState: getState,
    authenticate: authenticate,
    sendCommand: sendCommand,
    subscribeTags: subscribeTags,
    unsubscribeTags: unsubscribeTags,
    sendKeepAlive: sendKeepAlive,
    on: on,
    off: off,
    emit: emit,
    STATE: STATE,
    set onConnectionStatusChange(fn) { onConnectionStatusChange = fn; },
    get onConnectionStatusChange() { return onConnectionStatusChange; }
  };
})();
