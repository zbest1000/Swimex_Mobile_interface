# SwimEx EDGE — Admin Panel Documentation

This section documents the Admin Panel for the SwimEx EDGE platform. The Admin Panel is visible only to users with the Administrator role. Super Admin accounts have additional hidden features not covered in the standard admin UI.

---

## Admin Section Index

| Document | Description |
|----------|-------------|
| [User Management](USER_MANAGEMENT.md) | View all users, assign roles (User/Maintenance/Admin), disable/enable accounts, delete users, reset password. Super Admin accounts are invisible in this view. |
| [Device Registration](DEVICE_REGISTRATION.md) | MAC address registry: registered devices have full read/write access; unregistered devices are view-only. Admin actions: view MAC list, register new (manual or from recent devices), revoke, bulk import/export. |
| [Network Configuration](NETWORK_CONFIGURATION.md) | Wi-Fi AP config (SSID, password, channel, DHCP range, diagnostics), Bluetooth config (Super Admin only: enable/disable, pair, preferred connection, link quality). |
| [Communication Config](COMMUNICATION_CONFIG.md) | Protocol configuration: MQTT (broker settings, client settings), Modbus TCP (server mode and client mode), HTTP (endpoint, auth, format, polling). Multiple protocols can run simultaneously. |

---

## Access Control

| Role | Admin Panel Access | Notes |
|------|--------------------|-------|
| Super Admin | Full + hidden features | Commissioning codes, factory reset, Bluetooth config |
| Admin | Full | All admin panel features |
| Maintenance | Partial | UI builder, diagnostics only |
| User | None | Admin panel not visible |
| Guest | None | Admin panel not visible |

---

## Admin Panel Structure

```
Admin Panel
===========

+-- User Management
|   +-- User list
|   +-- Role assignment
|   +-- Account enable/disable
|   +-- Delete user
|   +-- Reset password
|
+-- Device Registration
|   +-- MAC address list
|   +-- Register new device
|   +-- Revoke device
|   +-- Bulk import/export
|
+-- Network Configuration
|   +-- Wi-Fi AP settings
|   +-- Bluetooth (Super Admin only)
|
+-- Communication Config
    +-- MQTT settings
    +-- Modbus TCP settings
    +-- HTTP settings
```

---

## Visibility Rules

| Feature | Admin | Maintenance | User |
|---------|-------|-------------|------|
| User Management | Yes | No | No |
| Device Registration | Yes | No | No |
| Network Config (Wi-Fi) | Yes | No | No |
| Network Config (Bluetooth) | No (Super Admin only) | No | No |
| Communication Config | Yes | No | No |

---

## Related Documentation

- [Roles and Permissions](../authentication/ROLES_AND_PERMISSIONS.md) — Role definitions and permissions matrix
- [Session Management](../authentication/SESSION_MANAGEMENT.md) — Token and role claims
- [Server Configuration](../server/CONFIGURATION.md) — Server-side configuration

---

## Document Quick Reference

| Document | Key Topics |
|----------|------------|
| [User Management](USER_MANAGEMENT.md) | Roles, disable/enable, delete, reset password, Super Admin invisible |
| [Device Registration](DEVICE_REGISTRATION.md) | MAC registry, registered vs view-only, bulk import/export |
| [Network Configuration](NETWORK_CONFIGURATION.md) | Wi-Fi AP, Bluetooth (Super Admin), DHCP, diagnostics |
| [Communication Config](COMMUNICATION_CONFIG.md) | MQTT, Modbus TCP, HTTP, multiple protocols |
