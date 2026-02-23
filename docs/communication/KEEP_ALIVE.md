# SwimEx EDGE — Keep-Alive Heartbeat

The keep-alive mechanism ensures continuous connectivity between the EDGE Server and PLC (over Ethernet) and between clients and the server (over Wi-Fi). Missed heartbeats trigger a safety stop and require manual recovery. This document describes the two-segment design, configuration, timing, and recovery procedure.

---

## Two-Segment Design

| Segment | Path | Transport | Purpose |
|---------|------|-----------|---------|
| 1 | Server to PLC | Wired Ethernet (MQTT) | Detect PLC disconnect or network failure |
| 2 | Client to Server | Wi-Fi (WebSocket) | Detect client disconnect or Wi-Fi loss |

The client never sends keep-alive directly to the PLC. All communication flows through the server.

---

## Configuration Parameters

| Parameter | Default | Range | Description |
|-----------|---------|-------|-------------|
| Interval | 2 s | 1–10 s | Time between heartbeat messages |
| Missed Threshold | 3 | 2–10 | Consecutive misses before fault |
| Safety Stop Delay | 0 s | 0–5 s | Delay before executing safety stop |

---

## Segment 1: Server to PLC

```
Server                    MQTT Broker                    PLC
  |                            |                           |
  |-- PUBLISH keepalive ------>|-------------------------->|
  |    (interval: 2s)          |                           |
  |                            |<-- PUBLISH keepalive ------|
  |<-- (PLC echo) -------------|                           |
  |                            |                           |
  |  [2s]                      |                           |
  |-- PUBLISH keepalive ------>|-------------------------->|
  |                            |<-- PUBLISH keepalive ------|
  |<-- (PLC echo) -------------|                           |
  |                            |                           |
  |  [2s]                      |                           |
  |-- PUBLISH keepalive ------>|-------------------------->|
  |                            |     X (PLC offline)        |
  |  [2s]                      |                           |
  |-- PUBLISH keepalive ------>|-------------------------->|
  |                            |     X (no response)        |
  |  [2s]                      |                           |
  |-- PUBLISH keepalive ------>|-------------------------->|
  |                            |     X (missed 3)           |
  |                            |                           |
  |  SAFETY STOP TRIGGERED     |                           |
  |  (audit log)               |                           |
```

---

## Segment 2: Client to Server

```
Client                    Server
  |                          |
  |-- WebSocket ping ------->|
  |<-- WebSocket pong -------|
  |                          |
  |  [2s]                    |
  |-- WebSocket ping ------->|
  |<-- WebSocket pong -------|
  |                          |
  |  [2s]                    |
  |-- WebSocket ping ------->|
  |     X (Wi-Fi lost)        |
  |  [2s]                    |
  |  (no ping sent)          |
  |  [2s]                    |
  |  (no ping sent)          |
  |                          |
  |  Server: missed 3 pings   |
  |  SAFETY STOP TRIGGERED    |
  |  (audit log)              |
```

---

## Timing Diagram: Normal Operation

```
Time (s)  0    2    4    6    8   10
          |----|----|----|----|----|
Server:   H    H    H    H    H    H    (heartbeat to PLC)
PLC:      H    H    H    H    H    H    (heartbeat echo)
Client:   P    P    P    P    P    P    (ping to server)
Server:   P    P    P    P    P    P    (pong to client)

H = heartbeat
P = ping/pong
```

---

## Timing Diagram: PLC Disconnect

```
Time (s)  0    2    4    6    8
          |----|----|----|----|
Server:   H    H    H    H    H
PLC:      H    H    X    X    X    (disconnect at t=4)
Client:   P    P    P    P    P

t=6: Server detects 1st miss
t=8: Server detects 2nd miss
t=10: Server detects 3rd miss -> SAFETY STOP
```

---

## Safety Stop Trigger

When the missed threshold is exceeded:

1. **Server to PLC** (Segment 1): Server sends STOP command to PLC; motor halts immediately.
2. **Client to Server** (Segment 2): Server sends STOP command to PLC (client cannot reach PLC directly).
3. **Audit log**: Event recorded with timestamp, segment, reason, pool ID.
4. **UI state**: Client shows "Connection lost" and requires manual recovery.

---

## Recovery Procedure

After a safety stop due to missed keep-alive:

| Step | Action | Notes |
|------|--------|-------|
| 1 | Restore connectivity | Fix Ethernet cable, Wi-Fi, or reboot |
| 2 | Reconnect client | Client reconnects to server via WebSocket |
| 3 | Verify PLC link | Server confirms PLC heartbeat resumes |
| 4 | Manual START | User must explicitly press START; no auto-resume |
| 5 | Audit log | Recovery event logged |

---

## Audit Logging

| Event | Fields | Example |
|-------|--------|---------|
| Keep-alive lost | segment, pool_id, timestamp, missed_count | `segment=1, pool_id=pool-01, missed=3` |
| Safety stop | pool_id, timestamp, reason | `reason=plc_keepalive_lost` |
| Recovery | pool_id, timestamp, user | `user=operator, manual_start=true` |

---

## MQTT Keepalive Topic

Topic: `swimex/{pool_id}/keepalive`

**Server to PLC:**

```json
{
  "type": "heartbeat",
  "source": "edge-server",
  "timestamp": "2025-02-23T14:32:00.000Z",
  "sequence": 101
}
```

**PLC to Server:**

```json
{
  "type": "heartbeat",
  "source": "plc",
  "timestamp": "2025-02-23T14:32:00.100Z",
  "sequence": 101
}
```

Sequence numbers allow detection of out-of-order or duplicate messages.

---

## Related Documentation

- [MQTT Protocol](MQTT_PROTOCOL.md) — Keepalive topic and message format
- [Architecture — Data Flow](../architecture/DATA_FLOW.md) — End-to-end flow diagrams
- [Security](../security/) — Audit logging and threat mitigation
