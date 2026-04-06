# SwimEx EDGE — REST API Reference

This document describes the REST API endpoints exposed by the SwimEx EDGE Server.

## Base URL

```
http://<server-ip>:<port>/api
```

Default port: 80 (HTTP), 443 (HTTPS).

## Authentication Endpoints

### POST /api/auth/login

Authenticate and obtain access token.

**Request:**

```json
{
  "username": "admin",
  "password": "SecurePass123!"
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "usr_abc123",
    "username": "admin",
    "role": "admin",
    "displayName": "Administrator"
  }
}
```

**Errors:** 401 (invalid credentials), 429 (rate limited)

### POST /api/auth/register

Register a new user (requires admin or unauthenticated during commissioning).

**Request:**

```json
{
  "username": "newuser",
  "password": "SecurePass123!",
  "displayName": "New User",
  "role": "user"
}
```

**Response (201):**

```json
{
  "id": "usr_xyz789",
  "username": "newuser",
  "role": "user",
  "displayName": "New User",
  "createdAt": "2025-02-23T12:00:00Z"
}
```

**Errors:** 400 (validation), 409 (username exists)

### POST /api/auth/refresh

Refresh access token using refresh token.

**Request:**

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Errors:** 401 (invalid or expired refresh token)

## Workout Endpoints

### GET /api/workouts

List all workout programs.

**Query Parameters:** `page`, `limit`, `search`

**Response (200):**

```json
{
  "workouts": [
    {
      "id": "wrk_001",
      "name": "Interval Training",
      "description": "30 min interval program",
      "duration": 1800,
      "steps": 5,
      "createdAt": "2025-02-23T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### POST /api/workouts

Create a new workout program.

**Request:**

```json
{
  "name": "Custom Program",
  "description": "User-defined workout",
  "steps": [
    {
      "duration": 300,
      "speed": 50,
      "type": "steady"
    },
    {
      "duration": 60,
      "speed": 80,
      "type": "sprint"
    }
  ]
}
```

**Response (201):**

```json
{
  "id": "wrk_002",
  "name": "Custom Program",
  "description": "User-defined workout",
  "steps": [...],
  "createdAt": "2025-02-23T12:00:00Z"
}
```

### GET /api/workouts/:id

Get a single workout by ID.

**Response (200):**

```json
{
  "id": "wrk_001",
  "name": "Interval Training",
  "description": "30 min interval program",
  "duration": 1800,
  "steps": [
    {
      "id": "stp_001",
      "duration": 300,
      "speed": 50,
      "type": "steady",
      "order": 1
    }
  ],
  "createdAt": "2025-02-23T12:00:00Z"
}
```

**Errors:** 404 (not found)

### PUT /api/workouts/:id

Update a workout program.

**Request:** Same as POST /api/workouts (partial update supported)

**Response (200):** Updated workout object

**Errors:** 404 (not found), 400 (validation)

### DELETE /api/workouts/:id

Delete a workout program.

**Response (204):** No content

**Errors:** 404 (not found), 409 (in use)

## User Endpoints

### GET /api/users/me

Get current user profile.

**Response (200):**

```json
{
  "id": "usr_abc123",
  "username": "admin",
  "role": "admin",
  "displayName": "Administrator",
  "preferences": {
    "theme": "dark",
    "units": "metric"
  },
  "createdAt": "2025-02-23T12:00:00Z"
}
```

### PUT /api/users/me

Update current user profile.

**Request:**

```json
{
  "displayName": "Admin User",
  "preferences": {
    "theme": "light",
    "units": "imperial"
  }
}
```

**Response (200):** Updated user object

## Admin Endpoints

Requires `admin` or `super_admin` role.

### GET /api/admin/users

List all users.

**Query Parameters:** `page`, `limit`, `role`, `search`

**Response (200):**

```json
{
  "users": [
    {
      "id": "usr_abc123",
      "username": "admin",
      "role": "admin",
      "displayName": "Administrator",
      "createdAt": "2025-02-23T12:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

### PUT /api/admin/users/:id/role

Update user role.

**Request:**

```json
{
  "role": "admin"
}
```

**Response (200):** Updated user object

**Errors:** 404 (not found), 403 (cannot change own role)

### GET /api/admin/devices

List registered devices.

**Response (200):**

```json
{
  "devices": [
    {
      "id": "dev_001",
      "macAddress": "AA:BB:CC:DD:EE:FF",
      "name": "Pool Tablet 1",
      "status": "online",
      "lastSeen": "2025-02-23T12:00:00Z"
    }
  ],
  "total": 1
}
```

### POST /api/admin/devices

Register a new device.

**Request:**

```json
{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "name": "Pool Tablet 1"
}
```

**Response (201):** Created device object

**Errors:** 400 (invalid MAC), 409 (already registered)

### GET /api/admin/wifi

Get Admin Wi-Fi Access Point configuration (password-safe) and runtime status.

**Auth:** Admin or Super Admin

**Response (200):**

```json
{
  "success": true,
  "data": {
    "config": {
      "ssid": "PoolCtrl",
      "channel": 6,
      "band": "2.4GHz",
      "hidden": false,
      "maxClients": 10,
      "interface": "wlan0",
      "hasPassword": true,
      "passwordMasked": "S*********!"
    },
    "status": {
      "isRunning": false,
      "ssid": null,
      "channel": null,
      "connectedClients": 0,
      "interface": "wlan0"
    }
  }
}
```

### PUT /api/admin/wifi

Update persisted Wi-Fi AP configuration.

**Auth:** Admin or Super Admin

**Request:**

```json
{
  "ssid": "PoolCtrl-DeckA",
  "password": "StrongPass123!",
  "channel": 11,
  "maxClients": 20,
  "hidden": false,
  "interface": "wlan0"
}
```

**Validation rules:**

- `ssid`: 1-32 chars
- `password`: 8-63 chars (when provided)
- `channel`: one of 1-11
- `maxClients`: 1-50
- `interface`: `^[a-zA-Z0-9_-]{1,15}$`

**Response (200):** Updated safe Wi-Fi config object (`passwordMasked`, `hasPassword`, no plaintext password)

### POST /api/admin/wifi/start

Apply current Wi-Fi config to host services (`hostapd`, `dnsmasq`) and attempt to start AP mode.

**Auth:** Admin or Super Admin

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "WiFi AP started: SSID=\"PoolCtrl-DeckA\" on channel 11"
  }
}
```

### POST /api/admin/wifi/stop

Stop Wi-Fi AP services.

**Auth:** Admin or Super Admin

**Response (200):**

```json
{
  "success": true,
  "data": {
    "message": "WiFi AP stopped"
  }
}
```

### GET /api/admin/config/export

Export server configuration snapshot.

**Auth:** Admin or Super Admin

**Response (200):**

```json
{
  "success": true,
  "data": {
    "version": "1.0.0",
    "exportedAt": "2026-04-06T16:00:00.000Z",
    "system": {},
    "communicationConfigs": [],
    "tagMappings": [],
    "featureFlags": [],
    "devices": [],
    "layouts": [],
    "branding": null,
    "wifiConfig": null
  }
}
```

Notes:

- Sensitive system keys (for example `jwt_secret`, `wifi_password`) are excluded.
- If Wi-Fi password exists, export emits `password_encrypted` and omits plaintext.

### POST /api/admin/config/import

Import server configuration snapshot (full or selected sections).

**Auth:** Super Admin only

**Request:**

```json
{
  "config": {
    "version": "1.0.0",
    "system": {},
    "communicationConfigs": [],
    "tagMappings": [],
    "featureFlags": [],
    "devices": [],
    "layouts": [],
    "branding": null,
    "wifiConfig": {
      "ssid": "PoolCtrl",
      "password_encrypted": "base64blob..."
    }
  },
  "overwrite": true,
  "sections": ["system", "wifiConfig"]
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "imported": ["system", "wifiConfig"],
    "skipped": [],
    "errors": []
  }
}
```

Constraint: encrypted Wi-Fi password import succeeds only when the target server can decrypt with its own key derivation (from `JWT_SECRET`).

## Tag Endpoints

### GET /api/tags

List all object tags (data points for UI binding).

**Query Parameters:** `category`, `search`

**Response (200):**

```json
{
  "tags": [
    {
      "id": "tag_001",
      "name": "pool.speed",
      "dataType": "float",
      "unit": "percent",
      "value": 50.0,
      "updatedAt": "2025-02-23T12:00:00Z"
    }
  ]
}
```

### POST /api/tags

Create a tag (admin only).

**Request:**

```json
{
  "name": "pool.temperature",
  "dataType": "float",
  "unit": "celsius",
  "defaultValue": 28.0
}
```

**Response (201):** Created tag object

### GET /api/tags/:id

Get a single tag by ID.

**Response (200):** Tag object

**Errors:** 404 (not found)

### PUT /api/tags/:id

Update a tag.

**Request:** Partial tag object

**Response (200):** Updated tag object

**Errors:** 404 (not found)

### DELETE /api/tags/:id

Delete a tag.

**Response (204):** No content

**Errors:** 404 (not found), 409 (in use)

## System Endpoints

### GET /api/health

Health check (no authentication required).

**Response (200):**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "database": "connected",
  "mqtt": "running",
  "uptime": 3600
}
```

### GET /api/system/status

System status (authenticated, admin recommended).

**Response (200):**

```json
{
  "version": "1.0.0",
  "uptime": 3600,
  "database": {
    "status": "connected",
    "size": 10485760
  },
  "mqtt": {
    "status": "running",
    "clients": 3
  },
  "modbus": {
    "status": "connected",
    "plcAddress": "192.168.10.1"
  }
}
```
