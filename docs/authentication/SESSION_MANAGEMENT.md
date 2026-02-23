# SwimEx EDGE — Session Management

This document describes how the SwimEx EDGE platform manages user sessions: token-based authentication, server-side validation, role claims, and token expiry/refresh. It also covers MAC address-based write access for registered vs unregistered devices.

---

## Token-Based Sessions

Sessions are **token-based**:

| Aspect | Value |
|--------|-------|
| Token type | JWT or similar signed token |
| Storage | Client stores in memory or secure storage |
| Transmission | `Authorization: Bearer <token>` header |
| Validation | Server validates on each request |

---

## Server-Side Validation

Every authenticated request is validated on the server:

```
Request Flow
============

Request: GET /api/...
        Authorization: Bearer <token>
        |
        v
Server extracts token
        |
        v
Verify signature
        |
        v
Check expiry
        |
        v
Extract role from claims
        |
        v
Apply role-based access control
        |
        v
Process request or return 403
```

---

## Role Claims in Token

The token payload includes role information:

| Claim | Purpose |
|-------|---------|
| `sub` | User ID |
| `role` | User role (Super Admin, Admin, Maintenance, User, Guest) |
| `exp` | Expiration timestamp |
| `iat` | Issued-at timestamp |

---

## Token Expiry and Refresh

| Token Type | Lifetime | Refresh |
|------------|----------|---------|
| Access token | Short (e.g., 15–60 min) | Via refresh token |
| Refresh token | Long (e.g., 7–30 days) | Used to obtain new access token |

Refresh flow:

1. Client sends refresh token to `/api/auth/refresh`
2. Server validates refresh token
3. Server issues new access token (and optionally new refresh token)
4. Client replaces stored tokens

---

## MAC Address Check for Write Access

| Device Status | Write Access |
|---------------|--------------|
| Registered | Read and write |
| Unregistered | View-only |

---

## Device Registration

| Step | Description |
|------|-------------|
| 1 | Client sends MAC address with login or first request |
| 2 | Server checks if MAC is in registered device list |
| 3 | If registered: full access (read/write) |
| 4 | If unregistered: view-only mode |

---

## MAC Check Flow

```
Request with token + MAC
========================

Token valid
    |
    v
Extract role from token
    |
    v
Role allows write?
    |
    +-- No  --> View-only (e.g., Guest)
    |
    +-- Yes --> Check MAC
    |
    v
MAC in registered list?
    |
    +-- Yes --> Read/write
    |
    +-- No  --> View-only (unregistered device)
```

---

## Summary Table

| Aspect | Behavior |
|--------|----------|
| Token validation | Server-side on every request |
| Role source | Token claims |
| Expiry | Access token short; refresh token long |
| Unregistered device | View-only even with valid User/Admin token |
| Registered device | Full access per role |

---

## Related Documentation

- [Roles and Permissions](ROLES_AND_PERMISSIONS.md) — Role definitions and permissions
- [Commissioning Codes](COMMISSIONING_CODES.md) — Credential reset
- [API](../api/) — Auth endpoints: login, logout, refresh
