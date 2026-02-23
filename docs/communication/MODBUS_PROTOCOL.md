# SwimEx EDGE — Modbus TCP Protocol

The EDGE Server acts as both Modbus TCP client (polling PLC) and Modbus TCP server (exposing PLC data to external systems). This document defines the register map and scan group conventions used for PLC communication.

---

## Register Map Overview

Modbus uses 1-based addressing in documentation; implementations typically use 0-based offsets. The table below uses standard Modbus notation (e.g., 40001 = holding register 1).

---

## Holding Registers (Read/Write) — 4xxxx

| Address | Name | Data Type | Range | Description |
|---------|------|-----------|-------|-------------|
| 40001 | Speed Setpoint | UINT16 | 0–100 | Target speed in percent |
| 40002 | Command Word | UINT16 | bitmask | Bit 0: start, Bit 1: stop, Bit 2: reset fault |
| 40003 | Program ID | UINT16 | 0–255 | Active workout program index |
| 40004 | Interval Phase | UINT16 | 0–255 | Current interval phase (0 = rest) |
| 40005 | Reserved | — | — | Reserved for future use |

### Command Word (40002) Bit Definitions

| Bit | Name | Value | Description |
|-----|------|-------|-------------|
| 0 | Start | 1 | Assert start; clear to release |
| 1 | Stop | 1 | Assert stop; clear to release |
| 2 | Reset Fault | 1 | Clear fault latch (one-shot) |
| 3–15 | Reserved | 0 | Reserved |

---

## Input Registers (Read-Only) — 3xxxx

| Address | Name | Data Type | Range | Description |
|---------|------|-----------|-------|-------------|
| 30001 | Actual Speed | UINT16 | 0–100 | Current motor speed in percent |
| 30002 | Motor Temperature | UINT16 | 0–65535 | Temperature in 0.1 C (e.g., 452 = 45.2 C) |
| 30003 | Fault Code | UINT16 | 0–255 | Active fault code (0 = no fault) |
| 30004 | Run Time | UINT32 | — | Seconds since start (high word at 30004, low at 30005) |
| 30005 | Run Time (low) | UINT16 | — | Low word of run time |
| 30006 | Water Level | UINT16 | 0–100 | Water level percent |
| 30007 | Power Draw | UINT16 | 0–65535 | Watts (0.1 W resolution) |

---

## Coils (Read/Write) — 0xxxx

| Address | Name | Description |
|---------|------|-------------|
| 00001 | Start | Write 1 to start motor; PLC latches internally |
| 00002 | Stop | Write 1 to stop motor; PLC latches internally |
| 00003 | Reset Fault | Write 1 to clear fault latch |
| 00004–00008 | Reserved | Reserved for future use |

---

## Discrete Inputs (Read-Only) — 1xxxx

| Address | Name | Description |
|---------|------|-------------|
| 10001 | Running | 1 = motor running, 0 = stopped |
| 10002 | Fault | 1 = fault active, 0 = no fault |
| 10003 | Ready | 1 = PLC ready to accept commands |
| 10004 | Air Button 1 | 1 = air button 1 pressed |
| 10005 | Air Button 2 | 1 = air button 2 pressed |
| 10006–10016 | Reserved | Reserved for future use |

---

## Byte Order and Data Types

| Data Type | Size | Byte Order | Example |
|-----------|------|------------|---------|
| UINT16 | 2 bytes | Big-endian (network order) | 0x01F4 = 500 |
| UINT32 | 4 bytes | Big-endian (high word first) | 30004: 0x0000, 30005: 0x00E6 = 230 |
| INT16 | 2 bytes | Big-endian | Two's complement for signed values |

---

## Scan Group Examples

### Fast Group (100 ms)

| Register(s) | Purpose |
|-------------|---------|
| 30001 (Actual Speed) | Real-time speed display |
| 10001 (Running) | Quick status for UI |
| 10002 (Fault) | Immediate fault indication |

### Medium Group (500 ms)

| Register(s) | Purpose |
|-------------|---------|
| 30002 (Motor Temp) | Temperature monitoring |
| 30006 (Water Level) | Level display |
| 10003 (Ready) | PLC readiness |

### Slow Group (5 s)

| Register(s) | Purpose |
|-------------|---------|
| 30003 (Fault Code) | Fault code for diagnostics |
| 30004–30005 (Run Time) | Session duration |
| 30007 (Power Draw) | Power consumption |

---

## Example Read Request (Modbus TCP)

Read input registers 30001–30003 (3 registers):

```
Transaction ID: 0x0001
Protocol ID:    0x0000 (Modbus)
Length:         0x0006
Unit ID:        0x01
Function:       0x04 (Read Input Registers)
Start Addr:     0x0000 (30001 - 1)
Quantity:       0x0003
```

---

## Example Write Request (Modbus TCP)

Write holding register 40001 (speed setpoint = 75):

```
Transaction ID: 0x0002
Protocol ID:    0x0000
Length:         0x0006
Unit ID:        0x01
Function:       0x06 (Write Single Register)
Register Addr:  0x0000 (40001 - 1)
Value:          0x004B (75)
```

---

## Connection Parameters

| Parameter | Default | Notes |
|-----------|---------|-------|
| Port | 502 | Standard Modbus TCP |
| Unit ID | 1 | PLC slave address |
| Timeout | 1000 ms | Per request timeout |
| Retries | 2 | Retry failed requests |

---

## Related Documentation

- [MQTT Protocol](MQTT_PROTOCOL.md) — Primary command/status path
- [Keep-Alive](KEEP_ALIVE.md) — Heartbeat; Modbus may supplement health checks
- [Architecture — Communication Topology](../architecture/COMMUNICATION_TOPOLOGY.md) — Network layout
