# SwimEx EDGE — Security Documentation

This section covers the security model, threat mitigation, and security-related practices for the SwimEx EDGE platform.

## Overview

The SwimEx EDGE platform controls pool equipment and must protect against unauthorized access, kiosk bypass, and network-based attacks. Security is designed around defense in depth: device registration, role-based access, network isolation, and physical safety.

## Documentation Index

| Document | Description |
|----------|-------------|
| [SECURITY_MODEL.md](SECURITY_MODEL.md) | Threat model. Unauthorized pool control, system access, kiosk bypass, network security, credential storage, session security, Modbus access control, physical safety, super admin recovery, audit trail. |

## Security Principles

| Principle | Implementation |
|-----------|----------------|
| Least privilege | Role-based access control (RBAC); users have minimum required permissions |
| Defense in depth | Multiple layers: MAC registration, RBAC, network isolation, TLS |
| Fail-safe | STOP always wins; safety stop on disconnect; physical safety prioritized |
| Auditability | Admin actions logged; audit trail for recovery and compliance |
| No plaintext secrets | Commissioning codes and passwords hashed; tokens short-lived |

## Key Security Features

| Feature | Description |
|---------|-------------|
| MAC registration | Only registered devices can access kiosk UI |
| RBAC | super_admin, admin, user roles with distinct permissions |
| Kiosk lockdown | Device Admin prevents app switching; Boot Completed for auto-launch |
| Closed LAN | No internet required; PLC and clients on isolated networks |
| TLS | HTTPS, MQTTS for encrypted transport |
| Credential storage | bcrypt/argon2 for passwords; commissioning codes hashed |
| Session security | JWT expiry + server-side session revocation checks; HTTPS recommended |
| Modbus access control | Per-register permissions; read-only vs read-write |
| Physical safety | STOP always wins; safety stop on disconnect |
| Super admin recovery | Commissioning codes for account recovery |
| Audit trail | Admin actions logged with timestamp and user |

## Security Checklist for Deployment

| Item | Description |
|------|-------------|
| Change default passwords | Use strong passwords for admin accounts |
| Enable TLS | Use HTTPS and MQTTS in production |
| Restrict network access | Firewall; allow only necessary ports |
| Register devices | Only known tablets can access kiosk |
| Backup commissioning codes | Store securely; required for recovery |
| Physical access | Restrict access to server and tablets |
| Audit logs | Review periodically for anomalies |

## Threat Summary

| Threat Category | Primary Mitigation |
|-----------------|-------------------|
| Unauthorized pool control | MAC registration, RBAC |
| Unauthorized system access | RBAC, strong auth, commissioning codes |
| Kiosk bypass | Device Admin, Boot Completed |
| Network attacks | Closed LAN, TLS |
| Credential compromise | bcrypt/argon2, token expiry |
| Physical safety | STOP always wins, safety stop on disconnect |
| Admin lockout | Super admin recovery via commissioning codes |
| Audit evasion | Admin action logging |

## Compliance Notes

The security model supports closed-LAN deployments with no internet connectivity. Credentials and commissioning codes are hashed. Admin actions are logged for audit purposes. Physical safety controls (STOP, safety stop on disconnect) are prioritized.

## Recovery Procedure

If all admin accounts are locked out, use the Super Admin recovery flow. Navigate to the recovery endpoint, enter both SwimEx and BSC Industries commissioning codes (4x6 alphanumeric each), and create a new Super Admin account. Codes cannot be retrieved; they must be stored securely during commissioning.

## Reporting Security Issues

Report suspected security vulnerabilities to the SwimEx security contact. Do not disclose vulnerabilities publicly before a fix is available.

## Related Documentation

- [Authentication](../authentication/README.md) — Roles, permissions, commissioning codes
- [Commissioning Guide](../deployment/COMMISSIONING_GUIDE.md) — First-run security setup
- [Client Kiosk Mode](../client/KIOSK_MODE.md) — Device lockdown details
