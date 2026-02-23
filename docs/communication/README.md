# SwimEx EDGE — Communication Layer Documentation

This section documents the communication protocols and transport mechanisms used by the SwimEx EDGE platform. The EDGE Server connects to the PLC via wired Ethernet and to clients via Wi-Fi. A built-in MQTT broker and Modbus TCP server/client provide the primary PLC interface. Bluetooth is fully implemented but hidden and disabled by default (Super Admin activation only).

---

## Communication Section Index

| Document | Description |
|----------|-------------|
| [MQTT Protocol](MQTT_PROTOCOL.md) | MQTT topic hierarchy, message formats (JSON payloads), QoS recommendations, retained messages, publish/subscribe sequences for workout sessions |
| [Modbus Protocol](MODBUS_PROTOCOL.md) | Modbus TCP register map (holding, input, coils, discrete inputs), byte order, data types, scan group examples (fast 100ms, slow 5s) |
| [HTTP Protocol](HTTP_PROTOCOL.md) | HTTP/REST endpoint structure for PLC interface, request/response examples, authentication options, polling vs webhook patterns |
| [Keep-Alive](KEEP_ALIVE.md) | Two-segment heartbeat (server-PLC, client-server), configurable intervals, missed threshold, safety stop trigger, recovery procedure, audit logging |
| [Bluetooth](BLUETOOTH.md) | Bluetooth transport: fully implemented but disabled by default, Super Admin feature flag, same data flow as Wi-Fi, pairing process, supported profiles |

---

## Communication Topology Summary

| Path | Transport | Protocols | Notes |
|------|-----------|-----------|-------|
| Server to PLC | Wired Ethernet | MQTT, Modbus TCP, HTTP | Permanent link; always present when PLC powered |
| Client to Server | Wi-Fi | HTTP, WebSocket | Primary client connection path |
| Client to Server | Bluetooth | BLE, Serial | Built-in, disabled by default; Super Admin only |
| Client to PLC | None | N/A | Client never connects directly to PLC |

---

## Protocol Selection Guide

| Use Case | Recommended Protocol | Rationale |
|----------|----------------------|-----------|
| Commands (start, stop, speed) | MQTT | Low latency, pub/sub, QoS 1 delivery |
| Telemetry (speed, state, faults) | MQTT | Real-time updates, QoS 0 acceptable |
| PLC register polling | Modbus TCP | Standard industrial protocol, efficient bulk reads |
| Configuration / diagnostics | HTTP REST | Familiar, tooling support, JSON payloads |
| Keep-alive heartbeat | MQTT (dedicated topic) | Lightweight, consistent with command path |

---

## Protocol Details by Transport

### Server to PLC (Wired Ethernet)

The server maintains a permanent connection to the PLC over wired Ethernet. Primary protocols are MQTT (commands, status, keep-alive) and Modbus TCP (register polling). HTTP may be used when the PLC exposes an HTTP interface for configuration or diagnostics.

### Client to Server (Wi-Fi)

Clients connect to the server over Wi-Fi using HTTP for REST API calls and WebSocket for real-time updates. The server translates client requests into MQTT or Modbus messages to the PLC and forwards PLC telemetry to clients.

### Client to Server (Bluetooth)

Bluetooth is available as an alternative transport when enabled by Super Admin. The data flow is identical to Wi-Fi: client to server only. See [Bluetooth](BLUETOOTH.md) for activation and pairing requirements.

---

## Implementation Notes

- Server-side MQTT broker: embedded (e.g., Mosquitto, Eclipse Mosquitto, or equivalent)
- Modbus TCP: server acts as both client (polling PLC) and server (exposing for external tools)
- Keep-alive: application-level heartbeat distinct from MQTT protocol keep-alive
- All timestamps in ISO 8601 UTC format

---

## Document Conventions

- Code blocks use JSON for message examples and HTTP for request/response examples
- ASCII diagrams use `|` for vertical flow and `--` for horizontal message flow
- Register addresses use Modbus standard notation (4xxxx, 3xxxx, 0xxxx, 1xxxx)
- Topic names use lowercase with underscores; pool IDs use alphanumeric and hyphens

---

## Troubleshooting Quick Reference

| Symptom | Likely Cause | See |
|---------|--------------|-----|
| Commands not reaching PLC | Ethernet link down, MQTT broker offline | [MQTT](MQTT_PROTOCOL.md), [Keep-Alive](KEEP_ALIVE.md) |
| Client cannot connect | Wi-Fi issue, server unreachable | [Keep-Alive](KEEP_ALIVE.md) |
| Register reads fail | Modbus timeout, wrong address | [Modbus](MODBUS_PROTOCOL.md) |
| Bluetooth option missing | Feature disabled; Super Admin required | [Bluetooth](BLUETOOTH.md) |

---

## Related Documentation

- [Architecture — Communication Topology](../architecture/COMMUNICATION_TOPOLOGY.md) — Network topology and data paths
- [Architecture — Data Flow](../architecture/DATA_FLOW.md) — End-to-end data flow diagrams
- [Project Description](../../PROJECT_DESCRIPTION.md) — Comprehensive system design document
