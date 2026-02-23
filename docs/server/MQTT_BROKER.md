# SwimEx EDGE Server — Built-in MQTT Broker

The EDGE Server includes an embedded MQTT broker for communication with PLC controllers and external clients. PLCs connect over Ethernet to publish status and subscribe to commands.

## Protocol Support

| Version | Support |
|---------|---------|
| MQTT v3.1.1 | Full support |
| MQTT v5.0 | Full support |

Clients can connect using either protocol. The broker automatically negotiates the highest supported version.

## Ports

| Port | Protocol | Description |
|------|----------|-------------|
| 1883 | MQTT (plaintext) | Default; use on trusted networks |
| 8883 | MQTTS (TLS) | Encrypted; recommended for production |

Both ports are configurable. Ensure firewall rules allow inbound connections from PLC and client networks.

## Topic Hierarchy

Topics follow a hierarchical structure:

| Pattern | Purpose |
|---------|---------|
| `swimex/{pool_id}/command/*` | Commands from clients to PLC; PLC subscribes |
| `swimex/{pool_id}/status/*` | Status from PLC to clients; PLC publishes |
| `swimex/{pool_id}/keepalive` | Heartbeat; both sides publish/subscribe |

Example topics:

```
swimex/pool-001/command/speed/setpoint
swimex/pool-001/command/start
swimex/pool-001/command/stop
swimex/pool-001/status/speed/actual
swimex/pool-001/status/mode
swimex/pool-001/status/temperature
swimex/pool-001/keepalive
```

`{pool_id}` is a configurable identifier (e.g., `pool-001`, `main`) set during commissioning.

## QoS Per Topic

| QoS | Meaning | Typical Use |
|-----|---------|-------------|
| 0 | At most once | Telemetry, status updates |
| 1 | At least once | Commands, critical state |
| 2 | Exactly once | Rarely used; higher overhead |

Recommended defaults:

- **Commands:** QoS 1 (at-least-once) for reliability
- **Status:** QoS 0 for high-frequency telemetry; QoS 1 for critical state
- **Keepalive:** QoS 0

QoS can be configured per topic in the broker ACL/config:

```yaml
mqtt:
  topic_qos:
    "swimex/+/command/#": 1
    "swimex/+/status/#": 0
    "swimex/+/keepalive": 0
```

## Retained Messages

Retained messages are used for current-state topics so new subscribers receive the latest value immediately:

| Topic Type | Retained |
|------------|----------|
| `status/*` | Yes (speed, mode, temperature) |
| `command/*` | No |
| `keepalive` | No |

Example: A new client subscribing to `swimex/pool-001/status/speed/actual` receives the last published speed immediately.

## Access Control Lists (ACLs)

ACLs restrict which clients can publish or subscribe to specific topics:

| Rule | Description |
|------|-------------|
| Publish | Allow/deny client publish to topic pattern |
| Subscribe | Allow/deny client subscribe to topic pattern |

Example ACL configuration:

```yaml
mqtt:
  acls:
    - client_id: "plc-pool-001"
      allow_publish: ["swimex/pool-001/status/#"]
      allow_subscribe: ["swimex/pool-001/command/#"]
    - client_id: "web-client-*"
      allow_publish: ["swimex/+/command/#"]
      allow_subscribe: ["swimex/+/status/#", "swimex/+/keepalive"]
    - client_id: "scada-*"
      allow_subscribe: ["swimex/+/status/#"]
      allow_publish: []
```

Wildcards: `+` (single level), `#` (multi-level).

## Client Connections from PLC

PLCs connect to the broker over Ethernet:

| Aspect | Detail |
|--------|--------|
| Network | Ethernet interface dedicated to PLC network |
| Client ID | Unique per PLC (e.g., `plc-pool-001`) |
| Authentication | Username/password or anonymous (configurable) |
| TLS | Optional; use port 8883 for encrypted |

The PLC typically:

1. Subscribes to `swimex/{pool_id}/command/#` to receive commands
2. Publishes to `swimex/{pool_id}/status/#` for status updates
3. Publishes to `swimex/{pool_id}/keepalive` for heartbeat

The EDGE Server internal client also connects to the broker to bridge MQTT with the unified tag database (see [TAG_DATABASE.md](TAG_DATABASE.md)).

## Integration with Tag Database

MQTT topics are mapped to tags in the unified tag database. Incoming MQTT messages update the tag store; outgoing commands are published from tag writes. See [TAG_DATABASE.md](TAG_DATABASE.md) for details.
