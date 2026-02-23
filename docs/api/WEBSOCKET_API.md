# SwimEx EDGE — WebSocket API Reference

This document describes the WebSocket API for real-time pool control and state updates.

## Connection

### Endpoint

```
ws://<server-ip>:<port>/ws
wss://<server-ip>:<port>/ws  (TLS)
```

Default port: 80 (ws), 443 (wss).

### Connection Example

```javascript
const ws = new WebSocket('ws://192.168.1.100/ws');

ws.onopen = () => {
  console.log('Connected');
  // Send authentication
  ws.send(JSON.stringify({
    type: 'auth',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log('Received:', msg);
};

ws.onclose = () => {
  console.log('Disconnected');
};
```

## Authentication

Send the authentication message immediately after connection:

**Client -> Server:**

```json
{
  "type": "auth",
  "token": "<access_token>"
}
```

**Server -> Client (success):**

```json
{
  "type": "auth_ok",
  "userId": "usr_abc123",
  "role": "user"
}
```

**Server -> Client (failure):**

```json
{
  "type": "auth_failed",
  "error": "Invalid or expired token"
}
```

If authentication fails, the connection may be closed. Unauthenticated connections have limited access (e.g., read-only).

## Events from Server

### speed_update

Current pool speed/flow value.

```json
{
  "type": "speed_update",
  "value": 50.0,
  "unit": "percent",
  "timestamp": "2025-02-23T12:00:00.000Z"
}
```

### state_change

Pool or system state changed.

```json
{
  "type": "state_change",
  "state": "running",
  "previousState": "idle",
  "timestamp": "2025-02-23T12:00:00.000Z"
}
```

States: `idle`, `running`, `paused`, `safety_stop`, `error`, `maintenance`

### workout_progress

Workout session progress update.

```json
{
  "type": "workout_progress",
  "sessionId": "sess_001",
  "workoutId": "wrk_001",
  "currentStep": 2,
  "totalSteps": 5,
  "elapsedSeconds": 360,
  "remainingSeconds": 1440,
  "currentSpeed": 60.0,
  "timestamp": "2025-02-23T12:00:00.000Z"
}
```

### safety_stop

Safety stop triggered (e.g., emergency stop, disconnect).

```json
{
  "type": "safety_stop",
  "reason": "emergency_stop",
  "message": "Emergency stop activated",
  "timestamp": "2025-02-23T12:00:00.000Z"
}
```

### connection_status

PLC or device connection status.

```json
{
  "type": "connection_status",
  "target": "plc",
  "status": "connected",
  "lastError": null,
  "timestamp": "2025-02-23T12:00:00.000Z"
}
```

### tag_value_update

Object tag value changed (for UI binding).

```json
{
  "type": "tag_value_update",
  "tagId": "tag_001",
  "tagName": "pool.speed",
  "value": 55.0,
  "dataType": "float",
  "timestamp": "2025-02-23T12:00:00.000Z"
}
```

## Events from Client

### command_start

Start pool or workout.

```json
{
  "type": "command_start",
  "workoutId": "wrk_001"
}
```

Optional `workoutId`; omit to start at current speed.

### command_stop

Stop pool.

```json
{
  "type": "command_stop"
}
```

### command_speed

Set speed directly.

```json
{
  "type": "command_speed",
  "value": 75.0,
  "unit": "percent"
}
```

### command_pause

Pause current workout or pool.

```json
{
  "type": "command_pause"
}
```

## Message Format

All messages are JSON objects with a `type` field. Additional fields depend on the message type.

| Field | Required | Description |
|-------|----------|-------------|
| type | Yes | Message type (string) |
| ... | Varies | Type-specific fields |

## Ping/Pong

The server may send ping frames. Clients should respond with pong. Inactivity may result in connection closure after a timeout (typically 60 seconds).

## Reconnection

On disconnect:

1. Wait a short interval (e.g., 1-5 seconds).
2. Reconnect to the WebSocket URL.
3. Re-authenticate with a valid token (refresh if expired).
4. Re-subscribe to any channels if the protocol supports subscriptions.

## Error Handling

| Scenario | Server Action |
|----------|---------------|
| Invalid JSON | Send `{"type":"error","code":"invalid_json","message":"Invalid JSON"}` |
| Unknown message type | Send `{"type":"error","code":"unknown_type","message":"Unknown message type"}` |
| Unauthorized command | Send `{"type":"error","code":"unauthorized","message":"Insufficient permissions"}` |
| Rate limit exceeded | Send error and may close connection |

## Example Session

```
Client -> Server: {"type":"auth","token":"..."}
Server -> Client: {"type":"auth_ok","userId":"usr_001","role":"user"}
Server -> Client: {"type":"state_change","state":"idle","previousState":null,"timestamp":"..."}
Server -> Client: {"type":"speed_update","value":0,"unit":"percent","timestamp":"..."}
Client -> Server: {"type":"command_speed","value":50,"unit":"percent"}
Server -> Client: {"type":"speed_update","value":50,"unit":"percent","timestamp":"..."}
Server -> Client: {"type":"state_change","state":"running","previousState":"idle","timestamp":"..."}
```
