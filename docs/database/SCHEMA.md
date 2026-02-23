# SwimEx EDGE — Database Schema Reference

This document describes the full database schema for the SwimEx EDGE platform.

## User and Authentication

### User

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique user ID (e.g., usr_abc123) |
| username | TEXT | UNIQUE, NOT NULL | Login username |
| passwordHash | TEXT | NOT NULL | bcrypt/argon2 hash |
| role | TEXT | NOT NULL | super_admin, admin, user |
| displayName | TEXT | | Display name |
| preferences | JSON | | User preferences (theme, units, etc.) |
| disabled | INTEGER | DEFAULT 0 | 1 if disabled |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |
| updatedAt | TEXT | NOT NULL | ISO 8601 timestamp |

### CommissioningCodeStore

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique ID |
| codeType | TEXT | NOT NULL | swimex, bsc_industries |
| hash | TEXT | NOT NULL | Hashed code value |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |

## Devices

### RegisteredDevice

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique device ID |
| macAddress | TEXT | UNIQUE, NOT NULL | MAC address (AA:BB:CC:DD:EE:FF) |
| name | TEXT | | Friendly name |
| status | TEXT | | online, offline, unknown |
| lastSeen | TEXT | | Last activity timestamp |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |
| updatedAt | TEXT | NOT NULL | ISO 8601 timestamp |

## Workouts

### WorkoutProgram

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique program ID |
| name | TEXT | NOT NULL | Program name |
| description | TEXT | | Program description |
| duration | INTEGER | | Total duration (seconds) |
| createdBy | TEXT | FK User.id | Creator user ID |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |
| updatedAt | TEXT | NOT NULL | ISO 8601 timestamp |

### Step

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique step ID |
| workoutId | TEXT | FK WorkoutProgram.id | Parent workout |
| order | INTEGER | NOT NULL | Step order (1-based) |
| duration | INTEGER | NOT NULL | Step duration (seconds) |
| speed | INTEGER | NOT NULL | Speed/flow (0-100) |
| type | TEXT | | steady, sprint, recovery, interval |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |

### WorkoutSession

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique session ID |
| workoutId | TEXT | FK WorkoutProgram.id | Workout being run |
| userId | TEXT | FK User.id | User who started session |
| deviceId | TEXT | FK RegisteredDevice.id | Device used |
| status | TEXT | | active, completed, paused, stopped |
| startedAt | TEXT | NOT NULL | ISO 8601 timestamp |
| endedAt | TEXT | | Session end timestamp |
| currentStep | INTEGER | | Current step index |
| elapsedSeconds | INTEGER | | Elapsed time |

### SpeedSample

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique sample ID |
| sessionId | TEXT | FK WorkoutSession.id | Parent session |
| timestamp | TEXT | NOT NULL | Sample timestamp |
| speed | REAL | NOT NULL | Speed value |
| stepIndex | INTEGER | | Step at sample time |

## Communication

### CommunicationConfig

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique config ID |
| type | TEXT | NOT NULL | mqtt, modbus, http |
| name | TEXT | | Config name |
| config | JSON | NOT NULL | Protocol-specific config |
| enabled | INTEGER | DEFAULT 1 | 1 if enabled |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |
| updatedAt | TEXT | NOT NULL | ISO 8601 timestamp |

Example config JSON for MQTT: `{"host":"localhost","port":1883,"tls":false}`

Example config JSON for Modbus: `{"host":"192.168.10.1","port":502,"slaveId":1}`

## Tags and Mappings

### ObjectTagMapping

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique mapping ID |
| objectId | TEXT | NOT NULL | Object reference (e.g., graphic element) |
| objectType | TEXT | NOT NULL | graphic_element, widget, etc. |
| tagName | TEXT | NOT NULL | Tag name (e.g., pool.speed) |
| property | TEXT | | Property to bind (e.g., value, visibility) |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |

## Graphics

### GraphicAsset

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique asset ID |
| name | TEXT | NOT NULL | Asset name |
| type | TEXT | | svg, image |
| content | BLOB/TEXT | | Asset content (SVG XML, base64) |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |
| updatedAt | TEXT | NOT NULL | ISO 8601 timestamp |

### GraphicElement

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique element ID |
| assetId | TEXT | FK GraphicAsset.id | Parent asset |
| elementId | TEXT | | SVG element id/selector |
| name | TEXT | | Element name |
| properties | JSON | | Default properties |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |

### AnimationBinding

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique binding ID |
| elementId | TEXT | FK GraphicElement.id | Target element |
| tagName | TEXT | NOT NULL | Source tag |
| property | TEXT | NOT NULL | Animated property |
| mapping | JSON | | Value mapping config |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |

## UI Layouts

### UILayout

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique layout ID |
| name | TEXT | NOT NULL | Layout name |
| description | TEXT | | Layout description |
| isDefault | INTEGER | DEFAULT 0 | 1 if default layout |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |
| updatedAt | TEXT | NOT NULL | ISO 8601 timestamp |

### WidgetPlacement

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique placement ID |
| layoutId | TEXT | FK UILayout.id | Parent layout |
| widgetType | TEXT | NOT NULL | Widget type |
| x | REAL | NOT NULL | X position |
| y | REAL | NOT NULL | Y position |
| width | REAL | NOT NULL | Width |
| height | REAL | NOT NULL | Height |
| config | JSON | | Widget-specific config |
| zIndex | INTEGER | DEFAULT 0 | Layering order |

### EventBinding

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique binding ID |
| layoutId | TEXT | FK UILayout.id | Parent layout |
| widgetId | TEXT | | Widget reference |
| event | TEXT | NOT NULL | click, longPress, etc. |
| action | TEXT | NOT NULL | Action type |
| config | JSON | | Action parameters |
| createdAt | TEXT | NOT NULL | ISO 8601 timestamp |

## System

### FeatureFlag

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | TEXT | PRIMARY KEY | Unique flag ID |
| name | TEXT | UNIQUE, NOT NULL | Flag name |
| enabled | INTEGER | DEFAULT 0 | 1 if enabled |
| config | JSON | | Flag-specific config |
| updatedAt | TEXT | NOT NULL | ISO 8601 timestamp |

## Entity Relationships

```
User 1 ----< * WorkoutSession (userId)
User 1 ----< * WorkoutProgram (createdBy)
WorkoutProgram 1 ----< * Step (workoutId)
WorkoutSession 1 ----< * SpeedSample (sessionId)
RegisteredDevice (standalone, referenced by session)
CommunicationConfig (standalone)
ObjectTagMapping -> logical Tag (tagName)
GraphicAsset 1 ----< * GraphicElement (assetId)
GraphicElement 1 ----< * AnimationBinding (elementId)
UILayout 1 ----< * WidgetPlacement (layoutId)
UILayout 1 ----< * EventBinding (layoutId)
FeatureFlag (standalone)
```

## Indexes

| Table | Index | Columns |
|-------|-------|---------|
| User | idx_user_username | username |
| RegisteredDevice | idx_device_mac | macAddress |
| Step | idx_step_workout | workoutId |
| WorkoutSession | idx_session_workout | workoutId |
| WorkoutSession | idx_session_user | userId |
| WorkoutSession | idx_session_status | status |
| SpeedSample | idx_sample_session | sessionId |
| ObjectTagMapping | idx_mapping_tag | tagName |
| WidgetPlacement | idx_placement_layout | layoutId |
