# SwimEx EDGE — Widget Library

The Widget Library provides 30+ built-in SVG widgets across 10 categories. All widgets are SVG-based, support bindable properties, and adapt to light/dark themes.

## Widget Categories

| Category | Count | Description |
|----------|-------|-------------|
| Controls | 6 | Buttons, toggles, sliders, inputs |
| Indicators | 4 | LEDs, badges, banners, connection status |
| Gauges | 4 | Radial, semi-circular, linear, arc |
| Levels | 4 | Tank, battery, progress, donut |
| Charts | 4 | Line, bar, sparkline, speed trend |
| Text | 5 | Label, numeric, countdown, stopwatch, clock |
| Navigation | 3 | Tab bar, page selector, breadcrumb |
| Layout | 4 | Container, card, divider, tab container |
| Pool-Specific | 5 | Pool diagram, swimmer, speed dial, workout step, set/rep |
| Media | 3 | Image, SVG container, video embed |

## Controls (6)

| Widget | Description | Bindable Properties |
|--------|-------------|---------------------|
| **Button** | Primary, secondary, icon button | Label, disabled state, pressed state |
| **Toggle** | On/off switch | Value (bool), disabled |
| **Slider** | Horizontal/vertical slider | Value, min, max, step |
| **Knob** | Rotary control | Value, min, max, step |
| **Numeric Input** | Number entry field | Value, min, max, decimals |
| **Dropdown** | Selection list | Selected value, options list |

## Indicators (4)

| Widget | Description | Bindable Properties |
|--------|-------------|---------------------|
| **LED** | Status light (on/off/color) | State, color (or threshold-based) |
| **Status Badge** | Text badge with color | Text, status (ok/warning/error) |
| **Alarm Banner** | Full-width alert strip | Message, severity, visibility |
| **Connection Icon** | PLC/network connection state | Connected (bool), signal strength |

## Gauges (4)

| Widget | Description | Bindable Properties |
|--------|-------------|---------------------|
| **Radial Gauge** | Full 360-degree dial | Value, min, max, needle rotation |
| **Semi-Circular Gauge** | 180-degree arc | Value, min, max |
| **Linear Gauge** | Horizontal bar gauge | Value, min, max |
| **Arc Gauge** | Custom arc angle | Value, min, max, start/end angle |

## Levels (4)

| Widget | Description | Bindable Properties |
|--------|-------------|---------------------|
| **Tank Level** | Vertical fill with optional waves | Level (0–100%), low/high alarms |
| **Battery** | Battery icon with fill | Level (0–100%), charging state |
| **Progress Bar** | Horizontal progress | Value (0–100%), label |
| **Donut** | Circular progress | Value (0–100%), label, color |

## Charts (4)

| Widget | Description | Bindable Properties |
|--------|-------------|---------------------|
| **Real-Time Line** | Canvas-based line chart | Data array, time window, Y range |
| **Bar Chart** | Vertical/horizontal bars | Data array, labels |
| **Sparkline** | Compact trend line | Data array, color |
| **Speed Trend** | Pool speed over time | Data array, target line |

## Text (5)

| Widget | Description | Bindable Properties |
|--------|-------------|---------------------|
| **Dynamic Label** | Text from tag or format | Content, font size, color |
| **Numeric Display** | Formatted number | Value, decimals, unit, prefix/suffix |
| **Countdown** | Count-down timer | Remaining seconds, format |
| **Stopwatch** | Elapsed time | Running state, elapsed seconds |
| **Clock** | Current time | Format (12/24h), timezone |

## Navigation (3)

| Widget | Description | Bindable Properties |
|--------|-------------|---------------------|
| **Tab Bar** | Tab strip | Selected index, tab labels |
| **Page Selector** | Page dots or list | Current page, total pages |
| **Breadcrumb** | Path navigation | Items array, current index |

## Layout (4)

| Widget | Description | Bindable Properties |
|--------|-------------|---------------------|
| **Container** | Flex/Grid wrapper | Direction, gap, padding |
| **Card** | Bordered content block | Title, collapsible |
| **Divider** | Horizontal/vertical line | Orientation, style |
| **Tab Container** | Tabbed content area | Active tab index |

## Pool-Specific (5)

| Widget | Description | Bindable Properties |
|--------|-------------|---------------------|
| **Pool Diagram** | Pool outline with animated current | Current speed, direction, zones |
| **Swimmer Silhouette** | Swimmer icon/avatar | Visibility, position |
| **Speed Dial** | Large speed display | Value, unit (mph/kph) |
| **Workout Step Indicator** | Current step in program | Step index, total, label |
| **Set/Rep Counter** | Sets and reps display | Sets, reps, target |

## Media (3)

| Widget | Description | Bindable Properties |
|--------|-------------|---------------------|
| **Image** | Raster image from library | Source, visibility, opacity |
| **SVG Container** | Embedded SVG graphic | Source, bindable elements |
| **Video Embed** | Video player | Source, play state, visibility |

## Common Properties (All Widgets)

| Property | Description |
|----------|-------------|
| **Light/Dark** | Theme token references; auto-adapt |
| **Customizable** | Colors, sizes, labels via Property Inspector |
| **Accessible** | ARIA labels, keyboard focus where applicable |

## Widget Selection Matrix

| Use Case | Recommended Widgets |
|----------|---------------------|
| Start/stop pump | Button, Toggle |
| Display tank level | Tank Level, Gauge |
| Show speed | Speed Dial, Numeric Display, Sparkline |
| Workout progress | Progress Bar, Workout Step Indicator |
| Alarm display | Alarm Banner, LED, Status Badge |
| Navigation | Tab Bar, Breadcrumb |
| Custom graphic | SVG Container, Image |
