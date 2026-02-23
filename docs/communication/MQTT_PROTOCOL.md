# SwimEx EDGE — MQTT Protocol

The EDGE Server embeds an MQTT broker used for bidirectional communication between the server and the PLC over wired Ethernet. Clients interact with the server via HTTP/WebSocket; the server translates client actions into MQTT messages to the PLC and forwards PLC telemetry to clients.

---

## Topic Hierarchy

All topics use the prefix `swimex/{pool_id}/` where `{pool_id}` is the unique pool identifier (e.g., `pool-01`).

| Topic | Direction | Description |
|-------|-----------|-------------|
| `swimex/{pool_id}/command/start` | Server to PLC | Start motor / begin workout |
| `swimex/{pool_id}/command/stop` | Server to PLC | Stop motor / end workout |
| `swimex/{pool_id}/command/speed` | Server to PLC | Set speed setpoint (0–100%) |
| `swimex/{pool_id}/status/speed` | PLC to Server | Actual motor speed (0–100%) |
| `swimex/{pool_id}/status/state` | PLC to Server | Current state (idle, running, fault, etc.) |
| `swimex/{pool_id}/status/faults` | PLC to Server | Active fault codes and descriptions |
| `swimex/{pool_id}/keepalive` | Bidirectional | Heartbeat; see [Keep-Alive](KEEP_ALIVE.md) |

---

## Message Formats

All payloads use JSON. Content-Type is implied by topic; no additional header is required.

### Command: Start

```json
{
  "command": "start",
  "timestamp": "2025-02-23T14:30:00.000Z",
  "source": "edge-server"
}
```

### Command: Stop

```json
{
  "command": "stop",
  "timestamp": "2025-02-23T14:35:00.000Z",
  "source": "edge-server"
}
```

### Command: Speed

```json
{
  "speed": 75,
  "unit": "percent",
  "timestamp": "2025-02-23T14:32:15.000Z",
  "source": "edge-server"
}
```

### Status: Speed

```json
{
  "speed": 74,
  "unit": "percent",
  "timestamp": "2025-02-23T14:32:16.000Z"
}
```

### Status: State

```json
{
  "state": "running",
  "previous": "idle",
  "timestamp": "2025-02-23T14:30:01.000Z"
}
```

Valid `state` values: `idle`, `starting`, `running`, `stopping`, `fault`, `maintenance`.

### Status: Faults

```json
{
  "faults": [
    {"code": 12, "description": "Motor overtemperature", "severity": "critical"},
    {"code": 5, "description": "Low water level", "severity": "warning"}
  ],
  "timestamp": "2025-02-23T14:33:00.000Z"
}
```

### Keepalive

```json
{
  "type": "heartbeat",
  "source": "plc",
  "timestamp": "2025-02-23T14:32:20.000Z",
  "sequence": 42
}
```

---

## QoS Recommendations

| Topic Type | QoS | Rationale |
|------------|-----|-----------|
| Command (start, stop, speed) | 1 | At-least-once delivery; commands must not be lost |
| Status (speed, state, faults) | 0 | Fire-and-forget; latest value matters; retained messages provide current state |
| Keepalive | 0 | High frequency; loss of one heartbeat is acceptable |

---

## Retained Messages

Current-state topics use retained messages so new subscribers immediately receive the latest value:

| Topic | Retained | Purpose |
|-------|----------|---------|
| `status/speed` | Yes | New client sees current speed |
| `status/state` | Yes | New client sees current state |
| `status/faults` | Yes | New client sees active faults |
| `command/*` | No | Commands are transient; no retention |
| `keepalive` | No | Heartbeat is ephemeral |

---

## Example: Publish/Subscribe Sequence for Workout Session

```
Client                Server                 MQTT Broker              PLC
  |                      |                         |                     |
  |-- HTTP: start ------>|                         |                     |
  |                      |-- PUBLISH command/start->|                     |
  |                      |    QoS 1                |-- forward --------->|
  |                      |                         |                     |
  |                      |<-- PUBLISH status/state--|<- PLC publishes ----|
  |<-- WebSocket: state--|    (retained)           |                     |
  |                      |                         |                     |
  |-- HTTP: speed 75 --->|                         |                     |
  |                      |-- PUBLISH command/speed->|                     |
  |                      |    QoS 1                |-- forward --------->|
  |                      |                         |                     |
  |                      |<-- PUBLISH status/speed--|<- PLC publishes ----|
  |<-- WebSocket: speed--|    (retained)           |                     |
  |                      |                         |                     |
  |-- HTTP: stop ------->|                         |                     |
  |                      |-- PUBLISH command/stop->|                     |
  |                      |    QoS 1                |-- forward --------->|
  |                      |                         |                     |
  |                      |<-- PUBLISH status/state--|<- PLC publishes ----|
  |<-- WebSocket: state--|    (retained)           |                     |
```

---

## Connection Parameters

| Parameter | Default | Notes |
|-----------|---------|-------|
| Broker port | 1883 | Non-TLS; TLS on 8883 if configured |
| Client ID | `edge-server` / `plc-{pool_id}` | Unique per connection |
| Clean session | false (PLC), true (clients) | PLC uses persistent session |
| Keep-alive (seconds) | 60 | MQTT-level keep-alive; distinct from application heartbeat |

---

## Related Documentation

- [Keep-Alive](KEEP_ALIVE.md) — Heartbeat mechanism and safety stop
- [Modbus Protocol](MODBUS_PROTOCOL.md) — Alternative PLC register access
- [Architecture — Data Flow](../architecture/DATA_FLOW.md) — End-to-end data flow
