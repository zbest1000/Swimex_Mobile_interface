# SwimEx EDGE — Security Model and Threat Mitigation

This document describes the threat model and security mitigations for the SwimEx EDGE platform.

## Threat Model Overview

| Threat | Description | Mitigation |
|--------|-------------|------------|
| Unauthorized pool control | Attacker controls pool speed/flow without permission | MAC registration, RBAC |
| Unauthorized system access | Attacker gains admin or user access | RBAC, strong auth, commissioning codes |
| Kiosk bypass | User escapes kiosk to access device or other apps | Device Admin, Boot Completed lockdown |
| Network attacks | Eavesdropping, MITM, unauthorized network access | Closed LAN, TLS, no internet |
| Credential compromise | Passwords or tokens stolen | bcrypt/argon2, token expiry, HTTPS |
| Physical safety | Pool runs when it should stop | STOP always wins, safety stop on disconnect |
| Admin lockout | Lost admin credentials | Super admin recovery via commissioning codes |
| Audit evasion | Malicious actions not traceable | Audit trail for admin actions |

## Unauthorized Pool Control

### Threat

An attacker gains control of pool speed, starts/stops the pool, or modifies workout programs without authorization.

### Mitigations

| Control | Description |
|---------|-------------|
| MAC registration | Only devices with registered MAC addresses can access the kiosk UI. Unregistered devices receive 403. |
| RBAC | Pool control commands require appropriate role. User role can control pool; anonymous cannot. |
| Device binding | Sessions can be tied to registered devices for additional verification. |

### Implementation

- `RegisteredDevice` table stores allowed MAC addresses.
- API and WebSocket validate device registration for kiosk endpoints.
- Admin panel manages device registration.

## Unauthorized System Access

### Threat

An attacker gains access to admin functions, user management, or system configuration.

### Mitigations

| Control | Description |
|---------|-------------|
| RBAC | super_admin, admin, user roles. Admin endpoints require admin or super_admin. |
| Strong authentication | Passwords must meet complexity; bcrypt/argon2 for hashing. |
| Commissioning codes | Super admin recovery requires both SwimEx and BSC Industries codes. |
| Session security | Short-lived access tokens; refresh token rotation; HTTPS for transport. |

### Role Permissions

| Role | Pool Control | User Management | Device Registration | System Config | Commissioning |
|------|--------------|-----------------|---------------------|---------------|---------------|
| user | Yes | No | No | No | No |
| admin | Yes | Yes | Yes | Yes | No |
| super_admin | Yes | Yes | Yes | Yes | Yes (recovery) |

## Kiosk Bypass

### Threat

A user at the pool bypasses the kiosk app to access the Android launcher, settings, or other applications.

### Mitigations

| Control | Description |
|---------|-------------|
| Device Admin | Android Device Admin API locks down the device; prevents app switching, back button escape. |
| Boot Completed | App auto-launches on boot; no opportunity to access launcher. |
| Full-screen | Kiosk runs full-screen; navigation bar hidden or restricted. |
| No uninstall | Device Admin can prevent uninstall without admin PIN. |

### Limitations

- Rooted devices may bypass some restrictions.
- Physical access to USB (ADB) can allow escape; restrict physical access in deployment.

## Network Security

### Threat

Eavesdropping, man-in-the-middle attacks, or unauthorized access via the network.

### Mitigations

| Control | Description |
|---------|-------------|
| Closed LAN | System designed for closed LAN; no internet required. PLC and clients on isolated segments. |
| No internet | Reduces attack surface; no external dependencies for core operation. |
| TLS | HTTPS for web UI and API; MQTTS for MQTT. Certificates for server authentication. |
| Dual NIC | Ethernet for PLC (isolated), Wi-Fi for clients; traffic separation. |
| Firewall | Restrict which ports are exposed; limit client access to necessary services only. |

### Network Topology

```
[PLC Network] ---- Ethernet ---- [EDGE Server] ---- Wi-Fi ---- [Client Tablets]
     (isolated)                      (dual NIC)                 (client LAN)
```

## Credential Storage

### Threat

Passwords or commissioning codes are stolen from storage or memory.

### Mitigations

| Control | Description |
|---------|-------------|
| bcrypt/argon2 | Passwords hashed with bcrypt or argon2; no plaintext storage. |
| Commissioning codes | Hashed before storage; plaintext never persisted. |
| Salt | Unique salt per password; prevents rainbow table attacks. |
| No logging | Passwords and codes never logged. |

### Token Security

| Control | Description |
|---------|-------------|
| Short expiry | Access tokens expire (e.g., 1 hour). |
| Refresh rotation | Refresh tokens rotate on use; old token invalidated. |
| HTTPS | Tokens transmitted only over TLS in production. |
| HttpOnly cookies | If using cookies, HttpOnly and Secure flags. |

## Session Security

### Threat

Session hijacking, token theft, or replay attacks.

### Mitigations

| Control | Description |
|---------|-------------|
| Token expiry | Access tokens expire; limit exposure window. |
| HTTPS | Encrypts tokens in transit. |
| Refresh token | Stored securely; used only to obtain new access token. |
| Logout | Logout invalidates tokens; server-side session invalidation. |

## Modbus TCP Access Control

### Threat

Unauthorized Modbus reads or writes to PLC registers.

### Mitigations

| Control | Description |
|---------|-------------|
| Per-register permissions | Registers classified as read-only or read-write. |
| Server-side validation | EDGE Server validates all Modbus requests against permission map. |
| Write restrictions | Critical registers (e.g., safety) may be read-only from API. |
| PLC network isolation | Modbus only on Ethernet interface; not exposed to client Wi-Fi. |

### Register Permission Example

| Register | Address | Permission | Description |
|----------|---------|------------|-------------|
| Speed setpoint | 1000 | read-write | User can set |
| Current speed | 1001 | read-only | User can read |
| Safety status | 2000 | read-only | No write from API |
| Emergency stop | 3000 | write-only (special) | STOP command only |

## Physical Safety

### Threat

Pool continues running when it should stop (emergency, disconnect, malfunction).

### Mitigations

| Control | Description |
|---------|-------------|
| STOP always wins | STOP command has highest priority; overrides any other command. |
| Safety stop on disconnect | Loss of connection to PLC or client triggers safety stop. |
| Watchdog | Server monitors PLC connection; triggers stop on timeout. |
| Physical STOP button | Pool equipment has physical emergency stop; independent of software. |

### Safety Hierarchy

1. Physical emergency stop (hardware)
2. Safety stop on disconnect
3. Software STOP command
4. Normal speed/control commands

## Super Admin Recovery

### Threat

All admin accounts are locked out (forgot password, account disabled).

### Mitigations

| Control | Description |
|---------|-------------|
| Commissioning codes | SwimEx + BSC Industries codes (4x6 alphanumeric each) enable recovery. |
| Recovery flow | Enter both codes at recovery endpoint; create new Super Admin. |
| Code storage | Codes hashed; cannot be retrieved or changed via UI. |
| Two-party | Requires codes from two organizations; reduces single-point compromise. |

### Recovery Process

1. Navigate to recovery endpoint (e.g., `/recover`).
2. Enter SwimEx code (4 segments).
3. Enter BSC Industries code (4 segments).
4. Create new Super Admin account.
5. Log in with new credentials.

## Audit Trail

### Threat

Malicious or mistaken admin actions are not traceable.

### Mitigations

| Control | Description |
|---------|-------------|
| Admin action logging | User management, device registration, config changes logged. |
| Timestamp | Each log entry has ISO 8601 timestamp. |
| User ID | Logged action includes acting user ID. |
| Action type | Create, update, delete, role change, etc. |
| Resource | Target resource (user, device, config) identified. |

### Audit Log Format

```json
{
  "timestamp": "2025-02-23T12:00:00.000Z",
  "userId": "usr_abc123",
  "action": "user_role_update",
  "resourceType": "user",
  "resourceId": "usr_xyz789",
  "details": {
    "previousRole": "user",
    "newRole": "admin"
  }
}
```

### Logged Actions

| Action | Description |
|--------|-------------|
| user_create | New user created |
| user_role_update | User role changed |
| user_disable | User disabled |
| device_register | Device registered |
| device_unregister | Device unregistered |
| config_update | System configuration changed |
| commissioning_recovery | Super admin recovery performed |
