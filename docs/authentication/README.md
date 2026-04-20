# SwimEx EDGE — Authentication Documentation

This section documents the authentication and authorization model for the SwimEx EDGE platform. All authentication is **server-managed**; the client and web app rely on the server for role validation and session handling.

---

## Authentication Section Index

| Document | Description |
|----------|-------------|
| [Roles and Permissions](ROLES_AND_PERMISSIONS.md) | Full RBAC: Super Admin, Admin, Maintenance, User, Guest. Permissions matrix, kiosk exit, user management, diagnostics, UI builder. |
| [Commissioning Codes](COMMISSIONING_CODES.md) | Super Admin reset: 4-segment x 6-char alphanumeric codes, SwimEx and BSC Industries code sets, hash-only storage, reset flow, escalating lockout, audit logging, tamper detection. |
| [Session Management](SESSION_MANAGEMENT.md) | JWT + server-side session rows, revocation checks, expiry/re-authentication behavior, and MAC-based write access controls. |

---

## Overview

The EDGE platform uses a **role-based access control (RBAC)** model with five roles:

| Role | Level | Typical Use |
|------|-------|-------------|
| Super Admin | Highest | Factory commissioning, hidden features, factory reset |
| Admin | High | Full access, user management, kiosk exit |
| Maintenance | Medium | Kiosk exit, UI builder, diagnostics |
| User | Standard | Workouts, profile, light/dark mode |
| Guest | Lowest | View-only |

---

## Authentication Flow Summary

```
Client / Web App                    EDGE Server
================                    ===========

1. User enters credentials
        |
        v
2. POST /api/auth/login
        |
        v
3. Server validates credentials
        |
        v
4. Server issues token (JWT or similar)
   - Token includes role claims
        |
        v
5. Client stores token
        |
        v
6. Subsequent requests: Authorization: Bearer <token>
        |
        v
7. Server validates token, checks role for each request
```

---

## Quick Reference

| Aspect | Value |
|--------|-------|
| Auth model | Server-managed, token-based |
| Roles | 5 (Super Admin, Admin, Maintenance, User, Guest) |
| Kiosk exit | Admin, Maintenance, Super Admin only |
| Commissioning | Super Admin only; 4x6-char codes |
| Device registration | MAC address for write access |

---

## Security Notes

- All credentials are validated server-side; never trust client-side role checks for authorization
- Tokens expire; clients must re-authenticate (no refresh-token endpoint)
- Unregistered devices receive view-only access regardless of user role
- Commissioning codes are stored as hashes only; never stored in plain text

---

## Related Documentation

- [Client](../client/) — Kiosk exit flow, authentication prompts
- [Server](../server/) — Auth engine, token validation
- [Security](../security/) — Threat mitigation, audit logging
- [API](../api/) — REST endpoints for login, logout, and current-user flows
