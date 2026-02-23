# SwimEx EDGE — Animation System

The animation system binds PLC tag values to graphic properties, producing data-driven visual feedback. A mapping function translates raw tag values into display-ready property values.

## Core Binding Model

```
PLC Tag --> Mapping Function --> Graphic Property --> Visual Output
   |              |                     |                   |
   v              v                     v                   v
(int/float/   (linear scale,      (fill color,        (on-screen
 bool/string)  threshold, etc.)     rotation, etc.)     change)
```

## Bindable Properties (16)

| Property | Type | Typical Use |
|----------|------|-------------|
| **Fill Color** | color | Status color, alarm state |
| **Fill Level** | 0–100% | Tank level, progress, gauge fill |
| **Stroke** | color, width | Outline emphasis |
| **Opacity** | 0–1 | Fade in/out |
| **Visibility** | visible/hidden | Show/hide based on condition |
| **Rotation** | degrees | Needle, dial, orientation |
| **Scale X** | 0–n | Horizontal stretch |
| **Scale Y** | 0–n | Vertical stretch |
| **Position X** | px | Horizontal movement |
| **Position Y** | px | Vertical movement |
| **Text Content** | string | Dynamic labels, values |
| **Font Size** | px | Text scaling |
| **Shadow/Glow** | color, blur | Highlight, alarm glow |
| **Clip Path** | 0–100% | Reveal, mask progress |
| **Stroke Dash** | offset | Animated border, loading |
| **Path Morph** | 0–1 | Morph between two paths |

## Mapping Functions (8)

| Function | Input | Output | Example |
|----------|-------|--------|---------|
| **Linear Scale** | number | number | Tag 0–100 -> fill level 0–100% |
| **Threshold/Discrete** | number | discrete value | Tag < 50 -> red, >= 50 -> green |
| **Boolean Toggle** | bool | on/off | Tag true -> visible, false -> hidden |
| **Color Gradient** | number | color | Tag 0–100 -> gradient from red to green |
| **String Format** | any | string | Tag 42 -> "42 RPM" |
| **Expression** | any | computed | Tag A + Tag B, or conditional |
| **Lookup Table** | number | mapped value | 0->off, 1->low, 2->high |
| **Clamp** | number | number | Limit output to min/max range |

## Timing Options

| Option | Description | Default |
|--------|-------------|---------|
| **Transition Duration** | ms for property change | 300 |
| **Easing** | linear, ease-in, ease-out, ease-in-out, spring | ease-out |
| **Debounce** | ms to wait before applying (rapid updates) | 0 |
| **Frame Rate Cap** | Max updates per second | 60 |

## Configuration UI

### Property Inspector -> Animations Tab

1. Select element on canvas
2. Open Animations tab in Property Inspector
3. Click "Add Binding"
4. Select property (e.g., Fill Color)
5. Select PLC tag from tag browser
6. Choose mapping function
7. Configure mapping parameters (min, max, thresholds, etc.)
8. Preview with simulation slider

### Simulation Slider

- Simulates tag value from min to max
- Live preview on canvas without PLC connection
- Useful for tuning thresholds and easing

## Binding Configuration Example

```
Property: Fill Level
Tag: TankLevel (float, 0–100)
Mapping: Linear Scale
  Input range: 0–100
  Output range: 0–100 (%)
  Clamp: yes
Timing:
  Duration: 200ms
  Easing: ease-out
  Debounce: 50ms
```

## Diagram: Binding Flow

```
+-------------+     +------------------+     +------------------+
|  PLC Tag    |     |  Mapping         |     |  Graphic         |
|  (live)     |---->|  Function        |---->|  Property        |
+-------------+     +------------------+     +------------------+
      |                      |                        |
      v                      v                        v
  Value change          Transform              DOM/CSS update
  (subscribe)           (e.g., linear)         (requestAnimFrame)
```

## Multiple Bindings per Element

- An element can have multiple bindings (e.g., fill color AND opacity)
- Bindings evaluated in order; later can override earlier for same property
- Conflicting bindings: last wins unless mapping combines (e.g., expression)

## Expression Mapping

Supports simple expressions:

- Arithmetic: `tagA + tagB`, `tag * 2`
- Conditional: `tag > 50 ? 'high' : 'low'`
- Min/Max: `min(tag, 100)`
- Reference multiple tags in one expression

## Lookup Table Format

| Input (tag value) | Output |
|-------------------|--------|
| 0 | "Off" |
| 1 | "Low" |
| 2 | "Medium" |
| 3 | "High" |

Handles interpolation for numeric outputs; discrete for string outputs.

## Best Practices

| Practice | Reason |
|----------|--------|
| Use debounce for high-frequency tags | Reduce CPU and DOM thrashing |
| Prefer CSS transitions for simple changes | GPU-accelerated, efficient |
| Use threshold mapping for discrete states | Clear visual feedback |
| Cap frame rate for charts | Balance smoothness and CPU |
| Test with simulation slider | Verify before deployment |
