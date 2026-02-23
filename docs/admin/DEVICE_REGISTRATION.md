# SwimEx EDGE — Device Registration

Device Registration controls which client devices can issue write commands to the pool. Devices are identified by MAC address. Registered devices have full read/write access; unregistered devices are view-only (can see the UI but cannot issue write commands).

---

## Overview

| Device Status | Read Access | Write Access | Description |
|---------------|-------------|--------------|-------------|
| Registered | Yes | Yes | Full control; can start/stop workouts, change settings |
| Unregistered | Yes | No | View-only; can see UI but cannot issue write commands |

---

## Admin Actions

| Action | Description |
|--------|-------------|
| View MAC list | List all registered and recently seen devices |
| Register new | Add MAC address to registry (manual or from recent devices) |
| Revoke | Remove MAC from registry; device becomes view-only |
| Bulk import | Import list of MAC addresses from file |
| Bulk export | Export current registry to file |

---

## Registration Methods

### Manual Registration

1. Admin enters MAC address manually (format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX).
2. Admin confirms.
3. Server adds MAC to registry.
4. Device gains full access on next connection.

---

### From Recent Devices

1. Admin views list of recently connected devices (unregistered).
2. Admin selects device from list.
3. Admin taps Register.
4. Server adds MAC to registry.
5. Device gains full access on next connection.

---

## MAC List View

| Column | Description |
|--------|-------------|
| MAC Address | Device identifier |
| Status | Registered or Unregistered |
| Last Seen | Timestamp of last connection |
| Actions | Register (if unregistered), Revoke (if registered) |

---

## Access Control Flow

```
Device Connection
=================

Client connects (MAC: AA:BB:CC:DD:EE:FF)
    |
    v
Server checks MAC in registry
    |
    +-- Registered
    |       |
    |       v
    |   Full read/write access
    |   Can start workouts, change settings
    |
    +-- Unregistered
            |
            v
        View-only access
        UI visible, write commands rejected
```

---

## Revoke Flow

1. Admin selects registered device.
2. Admin taps Revoke.
3. Confirm revocation.
4. Server removes MAC from registry.
5. Device loses write access on next connection (or immediately if connected).

---

## Bulk Import

| Format | Example |
|--------|---------|
| One MAC per line | AA:BB:CC:DD:EE:FF |
| CSV | mac,AA:BB:CC:DD:EE:FF |
| Supported | Plain text, CSV |

---

## Bulk Export

| Format | Description |
|--------|-------------|
| Plain text | One MAC per line |
| CSV | MAC, Status, Last Seen |

---

## Validation Rules

| Rule | Validation |
|------|------------|
| MAC format | Valid 6-byte hex (XX:XX:XX:XX:XX:XX) |
| Duplicate | Ignore or merge on import |
| Revoke | Cannot revoke if device is only admin device (optional) |

---

## Permission Matrix

| Action | Admin | Maintenance | User |
|--------|-------|-------------|------|
| View MAC list | Yes | No | No |
| Register device | Yes | No | No |
| Revoke device | Yes | No | No |
| Bulk import | Yes | No | No |
| Bulk export | Yes | No | No |

---

## Related Documentation

- [Network Configuration](NETWORK_CONFIGURATION.md) — Wi-Fi and Bluetooth
- [Roles and Permissions](../authentication/ROLES_AND_PERMISSIONS.md) — Admin role
- [Admin README](README.md) — Admin panel index
