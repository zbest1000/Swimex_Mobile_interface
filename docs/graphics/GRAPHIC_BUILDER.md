# SwimEx EDGE — Built-in SVG Editor (Graphic Builder)

The Graphic Builder is a built-in SVG editor integrated into the EDGE platform. No external tools (e.g., Illustrator, Inkscape) are required to create or modify graphics.

## Drawing Tools

| Tool | Shortcut | Description | Output Element |
|------|----------|-------------|----------------|
| **Rectangle** | R | Rectangles and squares (hold Shift) | `<rect>` |
| **Circle** | C | Circles (from center) | `<circle>` |
| **Ellipse** | E | Ellipses | `<ellipse>` |
| **Line** | L | Straight line segments | `<line>` |
| **Polyline** | P | Connected line segments | `<polyline>` |
| **Polygon** | G | Closed polygon | `<polygon>` |
| **Arc/Pie** | A | Arc or pie slice | `<path>` |
| **Pen/Bezier** | B | Bezier curves, freeform paths | `<path>` |
| **Text** | T | Text labels | `<text>` |
| **Image Embed** | I | Embed raster image | `<image>` |

## Tool Behavior

### Rectangle, Circle, Ellipse

- Click-drag to define bounds
- Hold Shift for square (rectangle) or circle (ellipse)
- Corner radius for rectangles (optional)

### Line, Polyline, Polygon

- Line: two clicks (start, end)
- Polyline: multiple clicks, double-click or Enter to finish
- Polygon: same as polyline but auto-closes

### Arc/Pie

- Center point, then radius, then start/end angles
- Toggle between arc (open) and pie (closed) mode

### Pen/Bezier

- Click for corner points, drag for curve handles
- Close path by clicking first point or Cmd/Ctrl+Click

### Text

- Click to place, type in inline editor
- Font family, size, weight configurable in Property Inspector

### Image Embed

- Select image from Graphic Library or upload
- Place and resize on canvas; aspect ratio lock optional

## Group and Symbol System

### Groups

- Select multiple elements, Group (Ctrl+G)
- Move, scale, rotate as single unit
- Ungroup (Ctrl+Shift+G) to edit individually

### Symbols (Components)

- Convert selection to Symbol; stored in project symbol library
- Instances placed on canvas reference symbol definition
- Edit symbol: all instances update
- Override: per-instance fill, stroke, or visibility

## Styling

| Property | Options | Notes |
|----------|---------|-------|
| **Fill** | Solid color, linear gradient, radial gradient | Gradient editor with stops |
| **Stroke** | Color, width, dash array, line cap/join | Per-element |
| **Opacity** | 0–1 | Fill and stroke can have separate opacity |
| **Shadow** | X offset, Y offset, blur, color | Drop shadow filter |

### Fill Types

- **Solid**: Single color, theme token or hex
- **Linear Gradient**: Start/end points, color stops, angle
- **Radial Gradient**: Center, radius, color stops

### Stroke Options

- Color, width (px)
- Dash array: e.g., "5,5" for dashed
- Line cap: butt, round, square
- Line join: miter, round, bevel

## Export

| Format | Description |
|--------|-------------|
| **SVG** | Export current artboard or selection as .svg file |
| **Copy SVG** | Copy to clipboard for paste into other tools |
| **To Library** | Save as new graphic in Graphic Library |

Export preserves:

- Element IDs (for binding)
- Gradients and filters
- Groups and symbol references (expanded or kept as refs)

## Canvas Controls

| Control | Action |
|---------|--------|
| Zoom | Mouse wheel, pinch, or zoom slider |
| Pan | Middle-click drag, or space+drag |
| Grid | Toggle snap-to-grid, configurable spacing |
| Rulers | Show/hide, unit (px, mm) |
| Guides | Drag from rulers, snap elements |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+G | Group |
| Ctrl+Shift+G | Ungroup |
| Ctrl+D | Duplicate |
| Delete | Delete selection |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+A | Select all |
| Escape | Deselect |

## Integration with UI Builder

- Graphics created in Graphic Builder can be saved to Library
- Placed on UI Builder canvas as graphic instances
- Bindable elements (with IDs) appear in Property Inspector for animation setup

## Limitations

- No bitmap editing (use external tools for photo editing)
- No mesh gradients (linear/radial only)
- Symbol nesting limited to 3 levels
- Max canvas size: 4096x4096 px
