# SwimEx EDGE — Communication Configuration

Communication Configuration allows Admins to configure MQTT, Modbus TCP, and HTTP protocols. Multiple protocols can run simultaneously. The EDGE Server supports server mode (listen for connections) and client mode (connect to external systems) depending on the protocol.

---

## Overview

| Protocol | Server Mode | Client Mode | Use Case |
|----------|-------------|-------------|----------|
| MQTT | Broker | Client | PLC communication, telemetry |
| Modbus TCP | Listen | Connect to PLC | PLC register access |
| HTTP | N/A | Polling client | External API integration |

---

## MQTT Configuration

### Broker Settings (Server Mode)

| Parameter | Description | Example |
|-----------|-------------|---------|
| Listen port | TCP port for broker | 1883 |
| TLS | Enable TLS | Yes/No |
| Auth | Username/password | Optional |
| Max connections | Connection limit | 100 |

---

### Client Settings (Client Mode)

| Parameter | Description | Example |
|-----------|-------------|---------|
| Broker URL | MQTT broker address | tcp://plc.local:1883 |
| Client ID | Unique identifier | edge-client-01 |
| Username | Auth username | Optional |
| Password | Auth password | Optional |
| Keep-alive | Heartbeat interval | 60 |

---

## Modbus TCP Configuration

### Server Mode (Listen)

| Parameter | Description | Example |
|-----------|-------------|---------|
| Listen port | TCP port | 502 |
| Unit IDs | Allowed Modbus unit IDs | 1, 2, 3 |
| Register map | Register layout | Holding, Input |
| Access control | Read/write permissions | Per register range |

---

### Client Mode (Connect to PLC)

| Parameter | Description | Example |
|-----------|-------------|---------|
| PLC IP | PLC address | 192.168.1.10 |
| Polling interval | Read cycle (ms) | 500 |
| Scan groups | Register groups to poll | Speed, Temp, Status |
| Write strategy | Immediate or buffered | Immediate |

---

## HTTP Configuration

| Parameter | Description | Example |
|-----------|-------------|---------|
| Endpoint | URL to poll | https://api.example.com/status |
| Auth | Basic, Bearer, API key | Bearer token |
| Format | JSON, XML | JSON |
| Polling interval | Request frequency (s) | 10 |

---

## Protocol Coexistence

```
EDGE Server
===========

+-- MQTT Broker (listen :1883)
|   +-- PLC publishes/subscribes
|
+-- Modbus TCP Server (listen :502)
|   +-- External clients read/write registers
|
+-- Modbus TCP Client
|   +-- Connects to PLC
|   +-- Polls registers
|
+-- HTTP Client
    +-- Polls external API
    +-- Updates tag database
```

---

## Configuration Flow

```
Communication Config
====================

Admin opens Communication Config
    |
    v
Select protocol (MQTT / Modbus / HTTP)
    |
    v
Edit parameters
    |
    v
Save
    |
    v
Server applies config
    |
    v
Connections established per protocol
```

---

## Validation Rules

| Protocol | Rule | Validation |
|----------|------|------------|
| MQTT | Port | 1–65535 |
| MQTT | Broker URL | Valid URI |
| Modbus | Port | 1–65535 |
| Modbus | PLC IP | Valid IPv4 |
| Modbus | Unit IDs | 1–247 |
| HTTP | Endpoint | Valid URL |
| HTTP | Polling | > 0 seconds |

---

## Permission Matrix

| Action | Admin | Maintenance | User |
|--------|-------|-------------|------|
| View config | Yes | No | No |
| Edit MQTT | Yes | No | No |
| Edit Modbus | Yes | No | No |
| Edit HTTP | Yes | No | No |
| Restart services | Yes | No | No |

---

## Related Documentation

- [MQTT Protocol](../communication/MQTT_PROTOCOL.md) — MQTT message format
- [Modbus Protocol](../communication/MODBUS_PROTOCOL.md) — Modbus register map
- [HTTP Protocol](../communication/HTTP_PROTOCOL.md) — HTTP integration
- [Server Configuration](../server/CONFIGURATION.md) — Server config reference
