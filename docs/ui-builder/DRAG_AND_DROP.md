# SwimEx EDGE — Drag-and-Drop Builder Workspace

The UI Builder workspace provides a WYSIWYG design environment with object palette, canvas, property inspector, layer panel, and integrated tag and graphic browsers.

## Workspace Layout

```
+------------------+--------------------------------+------------------+
|  Object Palette  |                                |  Property        |
|  (Widgets)       |      WYSIWYG Canvas             |  Inspector       |
|                  |      (Zoomable, Pannable)       |  (Layout/Style/  |
|  - Controls      |                                |   Data/Animations|
|  - Indicators    |   [Layout content here]         |   /Events)       |
|  - Gauges        |                                |                  |
|  - ...           |                                |                  |
+------------------+--------------------------------+------------------+
|  Tag Browser     |  Graphic Library Browser       |  Layer Panel     |
|  (PLC tags)      |  (Search, categories)          |  (Z-order, group)|
+------------------+--------------------------------+------------------+
```

## Object Palette

| Section | Contents |
|---------|----------|
| **Controls** | Button, toggle, slider, knob, numeric input, dropdown |
| **Indicators** | LED, status badge, alarm banner, connection icon |
| **Gauges** | Radial, semi-circular, linear, arc |
| **Levels** | Tank level, battery, progress bar, donut |
| **Charts** | Line, bar, sparkline, speed trend |
| **Text** | Label, numeric display, countdown, stopwatch, clock |
| **Navigation** | Tab bar, page selector, breadcrumb |
| **Layout** | Container, card, divider, tab container |
| **Pool-Specific** | Pool diagram, swimmer, speed dial, workout step, set/rep |
| **Media** | Image, SVG container, video embed |

Drag widget onto canvas to instantiate.

## WYSIWYG Canvas

| Feature | Description |
|---------|-------------|
| **Zoomable** | Mouse wheel, pinch, or zoom control (10%–400%) |
| **Pannable** | Middle-click drag, space+drag, or scrollbars |
| **Layout Grid** | Toggle snap-to-grid, configurable spacing (e.g., 8px) |
| **Responsive Preview** | Breakpoints (mobile, tablet, desktop) |
| **Live Preview** | Real-time preview with PLC data when connected |

## Property Inspector

| Tab | Contents |
|-----|----------|
| **Layout** | Position, size, margin, padding, flex/grid options |
| **Style** | Fill, stroke, opacity, font, border |
| **Data** | Tag bindings, data source |
| **Animations** | Bindings list, add mapping, configure mapping |
| **Events** | Click, double-click, handlers |

## Layer Panel

| Feature | Description |
|---------|-------------|
| **Z-Order** | Drag to reorder; top = front |
| **Group** | Group elements; collapse/expand in tree |
| **Lock** | Lock element to prevent selection/editing |
| **Visibility** | Toggle visibility in editor (not runtime) |

## Tag Browser Sidebar

| Feature | Description |
|---------|-------------|
| **Tag List** | Hierarchical list of PLC tags |
| **Search** | Filter by name, path |
| **Drag onto Element** | Drag tag onto widget to create binding |
| **Data Type** | Shows int, float, bool, string per tag |

## Graphic Library Browser

| Feature | Description |
|---------|-------------|
| **Search** | By name, category, tag |
| **Categories** | Filter by category |
| **Thumbnail** | Preview before placement |
| **Drag onto Canvas** | Place as graphic instance |

## Symbol Instances

| Feature | Description |
|---------|-------------|
| **Place Symbol** | From library or current project |
| **Override** | Per-instance fill, stroke, visibility |
| **Edit Symbol** | Update definition; all instances update |

## Layout Grid

| Option | Description |
|--------|-------------|
| **Show Grid** | Toggle visibility |
| **Snap to Grid** | Align elements to grid |
| **Grid Size** | 4, 8, 16 px typical |
| **Guides** | Drag from rulers |

## Responsive Preview

| Breakpoint | Typical Width |
|------------|----------------|
| Mobile | 360–480 px |
| Tablet | 768–1024 px |
| Desktop | 1280+ px |

Preview mode shows layout at selected breakpoint; some layouts may hide or rearrange elements.

## Save and Publish

| Action | Description |
|--------|-------------|
| **Save** | Save draft; not visible to users |
| **Publish** | Make layout live; replaces current |
| **Version History** | List previous versions; rollback |

## Version History

| Feature | Description |
|---------|-------------|
| **Auto-save** | Periodic draft save (configurable) |
| **Manual Save** | Explicit save with optional comment |
| **Rollback** | Restore previous version |
| **Compare** | Diff between versions (future) |

## Copy/Paste Across Layouts

- Copy elements (Ctrl+C); paste within same layout or different layout (Ctrl+V)
- Paste preserves bindings; tag paths must exist in target layout context
- Paste across projects: bindings may need manual re-assignment

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+G | Group selection |
| Ctrl+Shift+G | Ungroup |
| Ctrl+D | Duplicate |
| Delete | Delete selection |
| Ctrl+Z / Ctrl+Y | Undo / Redo |
| Ctrl+S | Save |
| Escape | Deselect |
