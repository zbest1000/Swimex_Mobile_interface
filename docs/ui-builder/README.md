# SwimEx EDGE — UI Builder

The UI Builder is a visual design tool for creating and editing EDGE interface layouts. It provides a WYSIWYG canvas, property inspector, tag binding, and integration with the Graphic Library and animation system.

## Overview

| Component | Description |
|-----------|-------------|
| **Workspace** | Object palette, WYSIWYG canvas, property inspector, layer panel |
| **Tag Binding** | Object-to-tag mapping, tag browser, data type validation |
| **Theming** | Light/dark mode, 5 templates, CSS custom properties |
| **Graphics** | Graphic Library browser, symbol instances, import integration |

## Documentation Index

| Document | Description |
|----------|-------------|
| [DRAG_AND_DROP.md](DRAG_AND_DROP.md) | Builder workspace, canvas, property inspector, layer panel, tag browser |
| [TAG_BINDING.md](TAG_BINDING.md) | Object-to-tag mapping, data types, access modes, import/export |
| [THEMING.md](THEMING.md) | Light/dark mode, 5 templates, theme tokens, template customization |

## Builder Workflow

```
+------------------+     +------------------+     +------------------+
|  Object Palette  |     |  WYSIWYG Canvas  |     |  Property        |
|  (Widgets)       |---->|  (Drag & Drop)   |<----|  Inspector       |
+------------------+     +------------------+     +------------------+
        |                         |                         |
        v                         v                         v
+------------------+     +------------------+     +------------------+
|  Graphic Library |     |  Tag Browser     |     |  Layout/Style/   |
|  (Import SVG)    |     |  (PLC tags)      |     |  Data/Animations |
+------------------+     +------------------+     +------------------+
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Drag-and-Drop** | Widgets from palette, graphics from library, tags onto elements |
| **Zoomable/Pannable Canvas** | Navigate large layouts |
| **Property Inspector** | Layout, Style, Data, Animations, Events tabs |
| **Layer Panel** | Z-order, grouping, lock |
| **Symbol Instances** | Reusable components with override support |
| **Layout Grid** | Snap-to-grid, responsive breakpoints |
| **Live Preview** | Real-time preview with PLC data |

## Version Control

| Feature | Description |
|---------|-------------|
| **Undo/Redo** | Full history of edits |
| **Copy/Paste** | Across layouts or projects |
| **Save/Publish** | Draft vs published state |
| **Version History** | Rollback to previous versions |

## Workspace Components

| Component | Purpose |
|-----------|---------|
| **Object Palette** | 30+ widgets in 10 categories; drag onto canvas to add |
| **WYSIWYG Canvas** | Zoomable, pannable; layout grid; responsive preview; live preview with PLC data |
| **Property Inspector** | Layout, Style, Data, Animations, Events tabs; configure selected element |
| **Layer Panel** | Z-order, group, lock; tree view of canvas elements |
| **Tag Browser** | Hierarchical PLC tags; drag tag onto element to bind |
| **Graphic Library Browser** | Search, categories; drag graphic onto canvas |

## Template Integration

The UI Builder integrates with the 5 pre-built templates (Classic, Modern, Clinical, Sport, Minimal). Admin selects the active template; tag bindings are preserved when switching. Templates use SVG-based layouts and shared widget library with theme tokens for light/dark adaptation. Templates are exportable as .edge-template packages for backup or transfer between installations.

## Getting Started

1. Open the UI Builder from the admin or design menu.
2. Create a new layout or open an existing one.
3. Drag widgets from the Object Palette onto the canvas.
4. Use the Tag Browser to bind PLC tags to widget properties.
5. Configure animations in the Property Inspector Animations tab.
6. Save and publish when ready.

## Related Documentation

- [Graphics System](../graphics/README.md) — Rendering, import, widgets, animation
- [Templates](../graphics/TEMPLATES.md) — Pre-built screen sets
- [Tag Database](../server/TAG_DATABASE.md) — PLC tag structure
