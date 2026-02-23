# SwimEx EDGE — Error Code Reference

This document describes HTTP status codes, application error codes, and the standard error response format.

## Error Response Format

All API errors return a consistent structure:

```json
{
  "error": {
    "code": "AUTH_INVALID_CREDENTIALS",
    "message": "Invalid username or password",
    "details": {}
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| error.code | string | Application error code |
| error.message | string | Human-readable message |
| error.details | object | Optional additional context |

## HTTP Status Codes

| Code | Meaning | Typical Use |
|------|---------|-------------|
| 400 | Bad Request | Invalid input, validation failure |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Duplicate resource, state conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |

### 400 Bad Request

Invalid request body or query parameters.

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "username": "Username must be 3-32 characters",
      "password": "Password must contain at least one digit"
    }
  }
}
```

### 401 Unauthorized

Authentication required or failed.

```json
{
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication required"
  }
}
```

### 403 Forbidden

Authenticated but not authorized for the action.

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions for this action"
  }
}
```

### 404 Not Found

Resource not found.

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Workout wrk_999 not found",
    "details": {
      "resource": "workout",
      "id": "wrk_999"
    }
  }
}
```

### 409 Conflict

Resource conflict or invalid state.

```json
{
  "error": {
    "code": "WORKOUT_IN_USE",
    "message": "Cannot delete workout: currently in use",
    "details": {
      "sessionId": "sess_001"
    }
  }
}
```

### 429 Too Many Requests

Rate limit exceeded.

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Try again in 60 seconds",
    "details": {
      "retryAfter": 60
    }
  }
}
```

### 500 Internal Server Error

Unexpected server error.

```json
{
  "error": {
    "code": "SYSTEM_ERROR",
    "message": "An unexpected error occurred",
    "details": {
      "requestId": "req_abc123"
    }
  }
}
```

## Application Error Codes

### AUTH_*

| Code | HTTP | Description |
|------|------|-------------|
| AUTH_INVALID_CREDENTIALS | 401 | Invalid username or password |
| AUTH_TOKEN_EXPIRED | 401 | Access token expired |
| AUTH_TOKEN_INVALID | 401 | Malformed or invalid token |
| AUTH_REFRESH_TOKEN_INVALID | 401 | Refresh token invalid or revoked |
| AUTH_REQUIRED | 401 | No authentication provided |
| AUTH_USER_DISABLED | 403 | User account is disabled |

### WORKOUT_*

| Code | HTTP | Description |
|------|------|-------------|
| WORKOUT_NOT_FOUND | 404 | Workout program not found |
| WORKOUT_IN_USE | 409 | Workout is active in a session |
| WORKOUT_VALIDATION_ERROR | 400 | Invalid workout structure or steps |
| WORKOUT_STEP_INVALID | 400 | Invalid step duration, speed, or type |

### DEVICE_*

| Code | HTTP | Description |
|------|------|-------------|
| DEVICE_NOT_FOUND | 404 | Device not found |
| DEVICE_ALREADY_REGISTERED | 409 | MAC address already registered |
| DEVICE_INVALID_MAC | 400 | Invalid MAC address format |
| DEVICE_NOT_AUTHORIZED | 403 | Device not in allowed list |

### TAG_*

| Code | HTTP | Description |
|------|------|-------------|
| TAG_NOT_FOUND | 404 | Tag not found |
| TAG_IN_USE | 409 | Tag is bound to UI element |
| TAG_VALIDATION_ERROR | 400 | Invalid tag name or data type |
| TAG_READ_ONLY | 403 | Tag cannot be modified via API |

### COMM_*

| Code | HTTP | Description |
|------|------|-------------|
| COMM_PLC_DISCONNECTED | 503 | PLC communication unavailable |
| COMM_MODBUS_ERROR | 502 | Modbus protocol error |
| COMM_MQTT_ERROR | 502 | MQTT broker error |
| COMM_TIMEOUT | 504 | Communication timeout |

### SYSTEM_*

| Code | HTTP | Description |
|------|------|-------------|
| SYSTEM_ERROR | 500 | Unexpected internal error |
| SYSTEM_MAINTENANCE | 503 | Server in maintenance mode |
| SYSTEM_DATABASE_ERROR | 500 | Database operation failed |
| SYSTEM_CONFIG_ERROR | 500 | Configuration error |

## Client Handling Recommendations

| HTTP Code | Client Action |
|-----------|---------------|
| 400 | Display validation errors to user; allow correction |
| 401 | Clear tokens; redirect to login; optionally refresh token |
| 403 | Display "Access denied" message |
| 404 | Display "Not found" message; optionally redirect |
| 409 | Display conflict message; suggest resolution |
| 429 | Wait retryAfter seconds; optionally show "Try again" |
| 500 | Display generic error; log requestId for support |

## WebSocket Error Format

WebSocket errors use the same structure:

```json
{
  "type": "error",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Insufficient permissions for command_start"
  }
}
```
