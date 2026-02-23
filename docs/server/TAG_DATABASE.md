# SwimEx EDGE Server — Unified Tag Database

The unified tag database is the single source of truth for all protocols (MQTT, Modbus, HTTP). All data flows through the tag store, enabling consistent access regardless of protocol.

## Tag Structure

Each tag has the following attributes:

| Attribute | Description |
|-----------|-------------|
| **Address** | Unique identifier; format varies by protocol (e.g., Modbus register, MQTT topic path) |
| **Data Type** | `int16`, `uint16`, `int32`, `uint32`, `float32`, `bool`, `string` |
| **Access Mode** | `read-only`, `read-write`, `write-only` |
| **Scale Factor** | Multiplier for value conversion (e.g., 0.1 for one decimal place) |
| **Unit** | Optional unit string (e.g., `rpm`, `%`, `C`) |
| **Description** | Human-readable description |

Example tag definition:

```json
{
  "id": "speed_setpoint",
  "address": "40001",
  "data_type": "uint16",
  "access_mode": "read-write",
  "scale_factor": 1.0,
  "unit": "rpm",
  "description": "Pool speed setpoint"
}
```

## Protocol Mapping

### MQTT Topics to Tags

| MQTT Topic | Tag Path | Direction |
|------------|----------|-----------|
| `swimex/pool-001/status/speed/actual` | `pool.status.speed.actual` | MQTT -> Tag |
| `swimex/pool-001/command/speed/setpoint` | `pool.command.speed.setpoint` | Tag -> MQTT |

Topic path segments map to tag path segments. Configurable mapping rules define the conversion.

### Modbus Registers to Tags

| Modbus Address | Register Type | Tag Path |
|----------------|---------------|----------|
| 40001 | Holding | `pool.command.speed.setpoint` |
| 40002 | Holding | `pool.command.mode` |
| 30001 | Input | `pool.status.speed.actual` |
| 30002 | Input | `pool.status.temperature` |

Register map configuration defines the mapping. Multi-register types (e.g., float32) span consecutive registers.

### HTTP Endpoints to Tags

| HTTP Method | Endpoint | Tag Path |
|-------------|----------|----------|
| GET | `/api/tags/pool.status.speed.actual` | Read tag |
| PUT | `/api/tags/pool.command.speed.setpoint` | Write tag |
| GET | `/api/tags` | List all tags |

REST API uses tag path as the resource identifier.

## Tag CRUD Operations

### Create

| Method | Example |
|--------|---------|
| Admin UI | Tag browser -> Add Tag |
| REST API | `POST /api/tags` with JSON body |
| Config file | Import tag definitions |

### Read

| Method | Example |
|--------|---------|
| REST API | `GET /api/tags/{path}` |
| Modbus | FC03/FC04 read |
| MQTT | Subscribe to status topic |

### Update

| Method | Example |
|--------|---------|
| Admin UI | Tag browser -> Edit |
| REST API | `PUT /api/tags/{path}` |
| Modbus | FC06/FC16 write |
| MQTT | Publish to command topic |

### Delete

| Method | Example |
|--------|---------|
| Admin UI | Tag browser -> Delete |
| REST API | `DELETE /api/tags/{path}` |

Deleting a tag removes it from all protocol mappings.

## Tag Browser in Admin UI

The tag browser provides a unified view of all tags:

| Feature | Description |
|---------|-------------|
| **Tree view** | Hierarchical display by tag path |
| **Filter** | Search by name, address, or description |
| **Protocol columns** | Shows MQTT topic, Modbus address, HTTP path for each tag |
| **Bulk edit** | Edit multiple tags (scale factor, access mode) |
| **Import/Export** | JSON or CSV for backup and replication |
| **Validation** | Data type and address conflict checks |

Access: Admin Panel -> Communication -> Tag Browser (or Object-to-Tag Mapping).

## Data Type Mapping

| Tag Data Type | Modbus | MQTT Payload |
|---------------|--------|--------------|
| `bool` | 1 coil | `0` or `1` |
| `int16` | 1 register | JSON number |
| `uint16` | 1 register | JSON number |
| `int32` | 2 registers | JSON number |
| `uint32` | 2 registers | JSON number |
| `float32` | 2 registers | JSON number |
| `string` | N registers (configurable) | JSON string |

Byte order for multi-register types is configurable per tag or globally.

## Scale Factor

Scale factor applies when reading/writing:

| Raw Value | Scale Factor | Display Value |
|-----------|--------------|---------------|
| 1234 | 0.1 | 123.4 |
| 100 | 1 | 100 |
| 50 | 0.01 | 0.5 |

Useful for fixed-point representations (e.g., temperature stored as integer * 10).
