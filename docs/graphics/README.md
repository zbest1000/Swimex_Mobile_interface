# SwimEx EDGE — Graphics System

The graphics system provides SVG-first rendering, graphic import, a built-in SVG editor, data-driven animations bound to PLC tags, and a comprehensive widget library for building pool control interfaces.

## Overview

| Component | Description |
|-----------|-------------|
| **Rendering** | SVG-first architecture with Canvas for charts, CSS transitions, and Web Animations API |
| **Import** | SVG, PNG, JPEG, WebP, GIF, and DXF support with centralized Graphic Library |
| **Builder** | Built-in SVG editor with 10 drawing tools, no external tools required |
| **Animation** | 16 bindable properties, 8 mapping functions, PLC tag-driven visual output |
| **Widgets** | 30+ built-in SVG widgets across 10 categories |
| **Templates** | 5 pre-built templates (Classic, Modern, Clinical, Sport, Minimal) |

## Documentation Index

| Document | Description |
|----------|-------------|
| [RENDERING_ARCHITECTURE.md](RENDERING_ARCHITECTURE.md) | SVG-first rendering, Canvas for charts, CSS/Web Animations API, GPU acceleration, theme tokens |
| [GRAPHIC_IMPORT.md](GRAPHIC_IMPORT.md) | Supported formats, import workflow, Graphic Library, versioning, bulk import/export |
| [GRAPHIC_BUILDER.md](GRAPHIC_BUILDER.md) | Built-in SVG editor, 10 drawing tools, group/symbol system, styling, export |
| [ANIMATION_SYSTEM.md](ANIMATION_SYSTEM.md) | Binding model, 16 bindable properties, 8 mapping functions, timing, configuration UI |
| [WIDGET_LIBRARY.md](WIDGET_LIBRARY.md) | 30+ widgets: Controls, Indicators, Gauges, Levels, Charts, Text, Navigation, Layout, Pool-Specific, Media |
| [TEMPLATES.md](TEMPLATES.md) | 5 templates with complete screen sets, theme tokens, exportable packages |

## Architecture Diagram

```
+------------------+     +------------------+     +------------------+
|  Graphic Import  |---->|  Graphic Library  |---->|  UI Builder      |
|  (SVG/PNG/DXF)   |     |  (Storage/Search) |     |  (Drag & Drop)   |
+------------------+     +------------------+     +------------------+
        |                         |                         |
        v                         v                         v
+------------------+     +------------------+     +------------------+
|  SVG Editor      |     |  Widget Library  |     |  Tag Binding     |
|  (10 tools)      |     |  (30+ widgets)   |     |  (PLC tags)      |
+------------------+     +------------------+     +------------------+
        |                         |                         |
        +-------------------------+-------------------------+
                                  |
                                  v
                        +------------------+
                        |  Animation Engine|
                        |  (16 props, 8 maps)|
                        +------------------+
                                  |
                                  v
                        +------------------+
                        |  SVG-First Render|
                        |  (60fps, themes) |
                        +------------------+
```

## Quick Start

1. **Import graphics** — Upload SVG, PNG, or DXF assets to the Graphic Library
2. **Build layouts** — Use the UI Builder to create screens with drag-and-drop
3. **Add widgets** — Select from 30+ built-in widgets or use imported graphics
4. **Bind tags** — Connect PLC tags to widget properties via the Property Inspector
5. **Configure animations** — Map tag values to visual properties (fill, rotation, visibility)
6. **Apply template** — Choose from 5 pre-built templates or customize theme tokens

## Component Summary

| Component | Key Capabilities |
|-----------|------------------|
| **Rendering** | SVG for widgets/gauges/diagrams; Canvas for real-time charts; CSS transitions and Web Animations API for state and data-driven animation |
| **Import** | SVG with per-element animation; PNG/JPEG/WebP/GIF for graphic-level animation; DXF auto-converted to SVG |
| **Builder** | 10 drawing tools (rectangle, circle, ellipse, line, polyline, polygon, arc/pie, pen/bezier, text, image); group and symbol system |
| **Animation** | PLC tag to mapping function to graphic property; 16 bindable properties; 8 mapping functions |
| **Widgets** | Controls, Indicators, Gauges, Levels, Charts, Text, Navigation, Layout, Pool-Specific, Media |
| **Templates** | Classic, Modern, Clinical, Sport, Minimal; each with complete screen set (home, workout modes, execution, profile, admin) |

## Related Documentation

- [UI Builder](../ui-builder/README.md) — Drag-and-drop workspace, tag binding, theming
- [Server Tag Database](../server/TAG_DATABASE.md) — PLC tag structure and types
- [Client WebView Integration](../client/WEBVIEW_INTEGRATION.md) — Runtime rendering
