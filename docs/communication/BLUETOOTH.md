# SwimEx EDGE — Bluetooth Transport

Bluetooth connectivity is fully implemented in the EDGE platform but disabled and hidden by default. Activation requires Super Admin privileges and a feature flag. The Bluetooth path provides the same data flow as Wi-Fi: client to server only. The client never connects directly to the PLC.

---

## Feature Status

| Aspect | Status | Notes |
|--------|--------|-------|
| Implementation | Complete | BLE and Serial profiles supported |
| Default state | Disabled | Hidden from normal users |
| Activation | Super Admin only | Feature flag in admin panel |
| Data flow | Same as Wi-Fi | Client to server; server to PLC unchanged |

---

## Data Flow

```
Client (Android)          Server (EDGE)              PLC
  |                            |                       |
  |-- Bluetooth (BLE/Serial) -->|                       |
  |   HTTP / WebSocket         |-- Ethernet (MQTT) --->|
  |                            |<-- Ethernet (MQTT) ---|
  |<-- Bluetooth (BLE/Serial)--|                       |
  |   HTTP / WebSocket         |                       |

Client never connects to PLC directly.
```

---

## Supported Profiles

| Profile | Use Case | Notes |
|---------|----------|-------|
| BLE (Bluetooth Low Energy) | Primary | Low power, standard Android support |
| BLE Serial (SPP over BLE) | Fallback | Serial-like protocol over BLE |
| Classic Bluetooth SPP | Legacy | If BLE unavailable on older devices |

---

## Pairing Process

| Step | Action | Notes |
|------|--------|-------|
| 1 | Super Admin enables Bluetooth | Feature flag in admin panel |
| 2 | Client discovers server | BLE scan for EDGE server advertisement |
| 3 | User initiates pairing | Pairing request from client to server |
| 4 | Server accepts pairing | PIN or passkey if required |
| 5 | Connection established | Secure channel for HTTP/WebSocket |
| 6 | Session begins | Same API as Wi-Fi; no protocol change |

---

## Fallback Behavior on Disable

When Bluetooth is disabled:

| Scenario | Behavior |
|----------|----------|
| Feature flag off | Bluetooth option hidden in UI; no pairing possible |
| Active Bluetooth session | Session terminated; client must reconnect via Wi-Fi |
| Client on Wi-Fi | No impact; Wi-Fi remains primary |
| Client only on Bluetooth | Client loses connection; must reconnect via Wi-Fi |

---

## Pairing Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| Discovery timeout | 30 s | Time to scan for server |
| Pairing timeout | 60 s | Time for user to complete pairing |
| Bond timeout | 7 days | Stored bond duration; re-pair after expiry |
| Max bonded devices | 5 | Per server |

---

## Security Considerations

| Aspect | Implementation |
|--------|----------------|
| Encryption | BLE pairing with encryption; TLS over HTTP/WebSocket |
| Authentication | Same credentials as Wi-Fi; no separate Bluetooth auth |
| Authorization | Super Admin required to enable; normal users cannot enable |

---

## Super Admin Enablement

To enable Bluetooth:

1. Log in as Super Admin.
2. Open Admin Panel.
3. Navigate to **Communication** > **Bluetooth**.
4. Set **Bluetooth Enabled** to ON.
5. Save configuration.

The Bluetooth option then appears in the client connection settings. Normal users cannot access this setting.

---

## Comparison: Bluetooth vs Wi-Fi

| Aspect | Wi-Fi | Bluetooth |
|--------|-------|-----------|
| Default | Enabled | Disabled |
| Range | ~30 m typical | ~10 m typical |
| Throughput | Higher | Lower |
| Power | Higher | Lower (BLE) |
| Latency | Similar | Similar |
| Setup | Network join | Pairing |
| Use case | Primary | Fallback / alternative |

---

## Related Documentation

- [Architecture — Communication Topology](../architecture/COMMUNICATION_TOPOLOGY.md) — Network topology including Bluetooth
- [Communication README](README.md) — Protocol index
- [Admin](../admin/) — Super Admin panel and feature flags
