# SwimEx EDGE — Roles and Permissions

This document describes the full role-based access control (RBAC) model for the SwimEx EDGE platform. All authentication is server-managed; roles determine what actions a user can perform.

---

## Roles Overview

| Role | Description | Visibility |
|------|-------------|------------|
| Super Admin | Highest privilege; factory commissioning, hidden features, factory reset | Hidden from normal UI |
| Admin | Full access; user management, kiosk exit, all settings | Admin panel |
| Maintenance | Kiosk exit, UI builder, diagnostics | Maintenance menu |
| User | Standard user; workouts, profile, light/dark mode | Main UI |
| Guest | View-only; no write access | Main UI (read-only) |

---

## Permissions Matrix

| Permission | Super Admin | Admin | Maintenance | User | Guest |
|------------|:-----------:|:-----:|:-----------:|:----:|:-----:|
| View pool status | Yes | Yes | Yes | Yes | Yes |
| Start/stop workouts | Yes | Yes | Yes | Yes | No |
| Edit profile | Yes | Yes | Yes | Yes | No |
| Light/dark mode | Yes | Yes | Yes | Yes | Yes |
| Exit kiosk | Yes | Yes | Yes | No | No |
| User management | Yes | Yes | No | No | No |
| UI builder | Yes | Yes | Yes | No | No |
| Diagnostics | Yes | Yes | Yes | No | No |
| Network config | Yes | Yes | No | No | No |
| Device registration | Yes | Yes | No | No | No |
| Hidden features | Yes | No | No | No | No |
| Commissioning codes | Yes | No | No | No | No |
| Factory reset | Yes | No | No | No | No |

---

## Role Details

### Super Admin

- **Purpose**: Factory commissioning, recovery, and system-level access
- **Access**: All features; hidden screens and options not visible to other roles
- **Special**: Commissioning codes for credential reset; factory reset; USB lock control
- **Typical use**: Factory setup, field service recovery

### Admin

- **Purpose**: Full operational control of the pool system
- **Access**: User management, kiosk exit, all settings, UI builder, diagnostics
- **Restrictions**: No access to commissioning codes or factory reset
- **Typical use**: Facility manager, pool operator

### Maintenance

- **Purpose**: Day-to-day maintenance and UI customization
- **Access**: Kiosk exit, UI builder, diagnostics
- **Restrictions**: No user management, no network/device config
- **Typical use**: Maintenance staff, technician

### User

- **Purpose**: Routine pool use
- **Access**: Workouts, profile, light/dark mode
- **Restrictions**: No admin features, no kiosk exit
- **Typical use**: Pool user, swimmer

### Guest

- **Purpose**: View-only access
- **Access**: View pool status, light/dark mode
- **Restrictions**: No workouts, no profile editing, no write access
- **Typical use**: Visitor, observer

---

## Kiosk Exit Authorization

Only Admin, Maintenance, and Super Admin can exit kiosk mode:

```
Kiosk Exit Check
================

Request: Exit Kiosk
    |
    v
Server validates token
    |
    v
Extract role from token
    |
    v
Role in {Super Admin, Admin, Maintenance}?
    |
    +-- Yes --> Allow exit
    |
    +-- No  --> Reject (403 Forbidden)
```

---

## Related Documentation

- [Commissioning Codes](COMMISSIONING_CODES.md) — Super Admin reset flow
- [Session Management](SESSION_MANAGEMENT.md) — Token structure and role claims
- [Client Kiosk Mode](../client/KIOSK_MODE.md) — Exit flow from client perspective
