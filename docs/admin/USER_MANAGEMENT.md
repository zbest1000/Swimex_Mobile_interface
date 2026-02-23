# SwimEx EDGE — User Management

User Management is an Admin Panel feature visible only to users with the Administrator role. Admins can view all users, assign roles, disable or enable accounts, delete users, and reset passwords. Super Admin accounts are invisible in this view.

---

## Overview

| Action | Description | Permission |
|--------|-------------|------------|
| View users | List all non-Super-Admin users | Admin |
| Assign roles | Set User, Maintenance, or Admin | Admin |
| Disable account | Prevent login | Admin |
| Enable account | Restore login | Admin |
| Delete user | Remove user from system | Admin |
| Reset password | Force password reset | Admin |

---

## Role Assignment

| Role | Description | Visible in List |
|------|-------------|-----------------|
| User | Standard pool user | Yes |
| Maintenance | Kiosk exit, UI builder, diagnostics | Yes |
| Admin | Full admin access | Yes |
| Super Admin | Highest privilege; hidden | No |

---

## User List

The user management screen displays a table of all users except Super Admin:

| Column | Description |
|--------|-------------|
| Username | Login identifier |
| Display Name | User-facing name |
| Role | User, Maintenance, or Admin |
| Status | Enabled or Disabled |
| Last Login | Timestamp of last session |
| Actions | Edit, Disable/Enable, Delete, Reset Password |

---

## Actions

### Assign Role

1. Select user from list.
2. Open role dropdown.
3. Select User, Maintenance, or Admin.
4. Confirm change.
5. Server updates role; user may need to re-login for new permissions.

---

### Disable Account

| Before | After |
|--------|-------|
| User can log in | User cannot log in |
| Existing sessions may remain until token expires | New login attempts rejected |

---

### Enable Account

| Before | After |
|--------|-------|
| User cannot log in | User can log in |
| Login attempts rejected | Login allowed |

---

### Delete User

1. Select user.
2. Tap Delete.
3. Confirm deletion (irreversible).
4. User record removed; workout history may be retained or purged per policy.

---

### Reset Password

1. Select user.
2. Tap Reset Password.
3. Enter new password (or generate temporary).
4. Confirm.
5. User receives notification (if configured) or must use new password on next login.

---

## Super Admin Invisibility

```
User List Query
===============

Server: Get users for admin list
    |
    v
Filter: role != Super Admin
    |
    v
Return: User, Maintenance, Admin only
    |
    v
Super Admin accounts never appear in list
```

---

## Permission Matrix

| Action | Admin | Maintenance | User |
|--------|-------|-------------|------|
| View user list | Yes | No | No |
| Assign role | Yes | No | No |
| Disable account | Yes | No | No |
| Enable account | Yes | No | No |
| Delete user | Yes | No | No |
| Reset password | Yes | No | No |

---

## Validation Rules

| Rule | Validation |
|------|------------|
| Role change | Cannot demote self below Admin if only Admin |
| Delete | Cannot delete self |
| Disable | Cannot disable self (optional policy) |
| Password | Must meet complexity requirements |

---

## Related Documentation

- [Roles and Permissions](../authentication/ROLES_AND_PERMISSIONS.md) — Role definitions
- [Session Management](../authentication/SESSION_MANAGEMENT.md) — Token and session handling
- [Admin README](README.md) — Admin panel index
