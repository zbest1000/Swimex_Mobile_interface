# SwimEx EDGE — Object-to-Tag Mapping

Tag binding connects UI widgets to PLC tags, enabling data display and control. The UI Builder provides a tag browser, drag-and-drop assignment, and validation for data types and access modes.

## Binding Model

```
UI Widget <--> Tag Binding <--> PLC Tag
    |               |               |
    v               v               v
(property)    (mapping config)   (data source)
```

## Tag Browser

| Feature | Description |
|---------|-------------|
| **Hierarchical List** | Tags organized by path (e.g., Pump.Speed, Tank.Level) |
| **Search** | Filter by name or path |
| **Data Type** | Displayed per tag (int, float, bool, string) |
| **Drag onto Element** | Drag tag onto widget to create binding |
| **Recent** | Recently used tags for quick access |

## Data Type Validation

| Tag Type | Valid Widget Properties | Example |
|----------|-------------------------|---------|
| **int** | Numeric display, slider value, gauge, progress | TankLevel |
| **float** | Same as int; supports decimals | PumpSpeed |
| **bool** | Toggle, LED, visibility | PumpRunning |
| **string** | Label, text content | StatusMessage |

Invalid binding combinations (e.g., bool to gauge) are rejected with validation message.

## Scale Factor and Offset

For numeric bindings:

| Parameter | Description | Example |
|-----------|-------------|---------|
| **Scale Factor** | Multiply tag value | Tag 0–100, scale 0.01 -> display 0–1 |
| **Offset** | Add to value | Tag 0–100, offset -50 -> display -50–50 |

Formula: `display_value = (tag_value * scale) + offset`

## Access Mode

| Mode | Read | Write | Use Case |
|------|------|-------|----------|
| **Read** | Yes | No | Display only (gauges, labels) |
| **Write** | No | Yes | Control only (rare) |
| **Read-Write** | Yes | Yes | Bidirectional (slider, toggle, input) |

Access mode validated against tag permissions; write requires tag to be writable.

## Drag-and-Drop Tag Assignment

1. Open tag browser sidebar
2. Locate tag (search or browse)
3. Drag tag onto widget on canvas
4. Binding dialog opens: select target property
5. Configure scale, offset, access mode if needed
6. Confirm

## Binding Configuration Dialog

| Field | Description |
|-------|-------------|
| **Tag** | Selected tag path (read-only) |
| **Property** | Widget property to bind (e.g., value, fill level) |
| **Access** | Read, Write, Read-Write |
| **Scale** | Scale factor (optional) |
| **Offset** | Offset (optional) |
| **Mapping** | For animations: linear, threshold, etc. (see ANIMATION_SYSTEM.md) |

## Import/Export Tag Maps

### Export

| Format | Contents |
|--------|----------|
| **JSON** | Tag path, widget ID, property, scale, offset, access |
| **CSV** | Simplified: widget, property, tag, scale, offset |

### Import

| Format | Behavior |
|--------|----------|
| **JSON** | Match by widget ID; create bindings; skip if widget missing |
| **CSV** | Match by widget name or ID; create bindings |

Use case: migrate bindings between layouts or installations.

## Tag Map Schema (JSON)

```json
{
  "version": 1,
  "bindings": [
    {
      "widgetId": "gauge-1",
      "property": "value",
      "tagPath": "Pump.Speed",
      "access": "read",
      "scale": 1,
      "offset": 0
    }
  ]
}
```

## Validation Rules

| Rule | Description |
|------|-------------|
| **Tag exists** | Tag must exist in tag database |
| **Type match** | Property type must accept tag type |
| **Access** | Write/Read-Write requires tag writable |
| **No duplicate** | One binding per property (or explicit overwrite) |

## Binding Indicators

| Indicator | Meaning |
|-----------|---------|
| **Green** | Valid, connected |
| **Yellow** | Valid, tag not found (e.g., PLC offline) |
| **Red** | Invalid (type mismatch, missing tag) |

## Multiple Bindings per Widget

- A widget can have multiple bindings (e.g., value, fill color, visibility)
- Each binding is independent
- Property Inspector shows all bindings in Data tab
