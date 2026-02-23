# SwimEx EDGE — Commissioning Codes

This document describes the Super Admin commissioning code system used for credential reset and recovery when normal access is lost. Commissioning codes are set at factory or during initial commissioning.

---

## Code Format

| Attribute | Value |
|-----------|-------|
| Segments | 4 |
| Characters per segment | 6 |
| Character set | Alphanumeric (A-Z, 0-9) |
| Total length | 24 characters (e.g., `ABC123`-`DEF456`-`GHI789`-`JKL012`) |

---

## Code Sets

Two code sets are supported, one per organization:

| Organization | Code Set | Purpose |
|--------------|----------|---------|
| SwimEx | Primary | SwimEx factory and partners |
| BSC Industries | Secondary | BSC Industries factory and partners |

At commissioning, the appropriate code set is selected and stored.

---

## Storage

| Storage | Format |
|---------|--------|
| Codes | Never stored in plain text |
| Database | Hash only (bcrypt or Argon2) |
| Comparison | User input is hashed and compared to stored hash |

---

## Reset Flow

```
Commissioning Reset Flow
========================

1. User navigates to hidden Super Admin screen
   (e.g., tap sequence or special URL)
   |
2. User selects organization (SwimEx or BSC Industries)
   |
3. User enters 4 segments of 6 characters each
   |
4. Server hashes input and compares to stored hash
   |
   +-- Match: proceed to step 5
   +-- No match: increment failed attempt count; apply lockout
   |
5. Server validates code
   |
6. User sets new credentials (username/password)
   |
7. Server updates credentials
   |
8. Audit log created
```

---

## Escalating Lockout

Failed attempts trigger escalating lockout:

| Failed Attempts | Lockout Duration |
|-----------------|------------------|
| 1st | 30 seconds |
| 2nd | 1 minute |
| 3rd | 5 minutes |
| 4th | 15 minutes |
| 5th+ | 1 hour |

Lockout applies per device/IP and resets after successful entry or manual admin reset.

---

## Lockout Table

| Attempt | Lockout |
|---------|---------|
| 1 | 30 s |
| 2 | 1 min |
| 3 | 5 min |
| 4 | 15 min |
| 5+ | 1 hr |

---

## Audit Logging

All commissioning code events are logged:

| Event | Logged |
|-------|--------|
| Successful reset | Yes |
| Failed attempt | Yes |
| Lockout triggered | Yes |
| Organization selected | Yes |

---

## Tamper Detection

| Mechanism | Purpose |
|-----------|---------|
| Failed attempt logging | Detect brute-force attempts |
| Lockout duration | Slow down brute-force |
| Audit trail | Forensic analysis |
| IP/device tracking | Identify source of attempts |

---

## Hidden Screen Access

The commissioning code entry screen is **hidden** from normal UI:

- Not linked from navigation
- Accessible via: tap sequence, special URL, or Super Admin-only menu
- Requires physical access to device

---

## Related Documentation

- [Roles and Permissions](ROLES_AND_PERMISSIONS.md) — Super Admin role
- [Session Management](SESSION_MANAGEMENT.md) — New credential issuance
- [Security](../security/) — Audit logging and threat mitigation
