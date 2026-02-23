# SwimEx EDGE Server — Built-in Modbus TCP

The EDGE Server includes a built-in Modbus TCP engine that operates in both **server** and **client** modes simultaneously. An internal data bridge syncs MQTT, Modbus, and HTTP via the unified tag database.

## Server Mode

Server mode exposes EDGE data as Modbus registers for external SCADA, BMS, or HMI systems.

### Port and Protocol

| Aspect | Detail |
|--------|--------|
| Protocol | Modbus TCP (MBAP header, per Modbus specification) |
| Default Port | 502 |
| Hosting | Integrated service within EDGE Server process |
| Concurrent Connections | Multiple simultaneous Modbus TCP connections supported |

### Supported Function Codes

| Code | Name | Description |
|------|------|-------------|
| FC01 | Read Coils | Read discrete outputs (0/1) |
| FC02 | Read Discrete Inputs | Read discrete inputs |
| FC03 | Read Holding Registers | Read 16-bit holding registers |
| FC04 | Read Input Registers | Read 16-bit input registers |
| FC05 | Write Single Coil | Write one coil |
| FC06 | Write Single Register | Write one holding register |
| FC15 | Write Multiple Coils | Write multiple coils |
| FC16 | Write Multiple Registers | Write multiple holding registers |

### Register Map

The register map is administrator-configured. Internal data points (tags) are mapped to Modbus addresses:

| Address Range | Type | Access |
|---------------|------|--------|
| 0x0000–0xFFFF | Coils | Read/Write (FC01, FC05, FC15) |
| 0x0000–0xFFFF | Discrete Inputs | Read-only (FC02) |
| 0x0000–0xFFFF | Holding Registers | Read/Write (FC03, FC06, FC16) |
| 0x0000–0xFFFF | Input Registers | Read-only (FC04) |

### Per-Range Access Control

| Range | Access | Use Case |
|-------|--------|----------|
| 40001–40100 | Read-only | Status exposed to SCADA |
| 40101–40200 | Read/Write | Commands from BMS |
| 40201–40300 | Read-only | Diagnostics |

Configure access per range in the Admin UI or config file.

## Client Mode

Client mode allows the EDGE Server to poll registers from and write to the PLC (or any Modbus TCP server).

### Configuration

| Setting | Description |
|---------|-------------|
| Target IP | PLC or Modbus server IP address |
| Port | Modbus TCP port (default 502) |
| Unit ID | Modbus unit/slave ID |
| Timeout | Request timeout (ms) |

### Scan Groups

Scan groups define independent poll rates:

| Group | Poll Interval | Registers | Purpose |
|-------|---------------|-----------|---------|
| Fast | 100 ms | 40001–40010 | Speed, mode |
| Medium | 1 s | 40011–40050 | Temperature, status |
| Slow | 10 s | 40051–40100 | Diagnostics |

Each group can have its own target, unit ID, and register map.

### Write Modes

| Mode | Description |
|------|-------------|
| **Write-on-change** | Write only when tag value changes |
| **Cyclic** | Write at fixed interval regardless of change |

Use write-on-change for commands; use cyclic for setpoints that must be refreshed.

### Byte Order

Configurable byte order for multi-register values:

| Order | Example (32-bit) |
|-------|------------------|
| Big-endian | High word first, high byte first |
| Little-endian | Low word first, low byte first |
| Swap words | Swap 16-bit words |

### Multiple Targets

The client can poll multiple Modbus TCP servers:

```yaml
modbus_client:
  targets:
    - name: plc-pool-1
      ip: 192.168.10.10
      port: 502
      unit_id: 1
    - name: plc-pool-2
      ip: 192.168.10.11
      port: 502
      unit_id: 1
```

## Internal Data Bridge

The data bridge syncs MQTT, Modbus, and HTTP via the unified tag database:

```
+--------+     +--------+     +--------+
|  MQTT  |<--->|  Tag   |<--->| Modbus |
| Topics |     |Database|     |Registers|
+--------+     +--------+     +--------+
                    |              |
                    +------+-------+
                           |
                    +--------+
                    |  HTTP  |
                    |  REST  |
                    +--------+
```

- **MQTT to Tag:** Incoming MQTT messages update tags; tag addresses map to MQTT topics
- **Modbus to Tag:** Modbus reads/writes read/write tags; register map defines address mapping
- **HTTP to Tag:** REST API reads/writes tags; endpoints map to tag paths

All protocols share the same tag store. A change via MQTT is visible via Modbus and HTTP; a write via Modbus updates the tag used by MQTT and HTTP.

See [TAG_DATABASE.md](TAG_DATABASE.md) for tag structure and mapping details.
