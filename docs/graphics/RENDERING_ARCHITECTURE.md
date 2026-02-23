# SwimEx EDGE — Rendering Architecture

The graphics system uses an SVG-first rendering approach, combining multiple technologies to achieve responsive, performant, and themeable interfaces for pool control displays.

## Technology Stack

| Layer | Technology | Use Case |
|-------|------------|----------|
| **Primary** | SVG | All widgets, gauges, diagrams, icons |
| **Charts** | HTML5 Canvas | Real-time line/bar charts, high-frequency updates |
| **State Changes** | CSS Transitions | Simple property changes (color, opacity, visibility) |
| **Complex Animation** | Web Animations API | Data-driven animations bound to PLC tags |
| **Layout** | CSS | Flexbox, Grid, responsive breakpoints |

## SVG-First Rationale

- **Scalability** — Vector graphics scale without quality loss at any resolution
- **Accessibility** — SVG elements can be labeled and exposed to assistive tech
- **Themeability** — Fill, stroke, and opacity map to CSS custom properties
- **Animation** — Per-element control via attributes or CSS
- **File Size** — Compact for diagrams and icons compared to raster equivalents

## Rendering Pipeline

```
PLC Tag Value --> Mapping Function --> Property Update --> Render
       |                   |                  |              |
       v                   v                  v              v
  (int/float/          (linear scale,     (fill, stroke,   (SVG DOM
   bool/string)         threshold, etc.)   rotation, etc.)  repaint)
```

## Performance Targets

| Metric | Target | Implementation |
|--------|--------|----------------|
| **Frame Rate** | 60 fps | RequestAnimationFrame, frame rate cap option |
| **GPU Acceleration** | Yes | CSS transforms (translate3d, scale3d), will-change |
| **Touch Targets** | 48x48 dp min | Minimum tap area for all interactive elements |
| **First Paint** | < 100ms | Lazy-load off-screen widgets, defer non-critical SVG |

## GPU-Accelerated Transforms

Properties that trigger GPU compositing:

- `transform: translate3d(x, y, 0)` — Position changes
- `transform: scale3d(x, y, 1)` — Scale animations
- `transform: rotateZ(deg)` — Rotation
- `opacity` — Fade in/out

Avoid animating `left`, `top`, `width`, `height` directly; use `transform` instead.

## Touch Optimization

| Requirement | Implementation |
|-------------|----------------|
| Minimum tap area | 48x48 dp for all buttons, toggles, sliders |
| Hit testing | Expanded invisible hit regions for small icons |
| Gesture support | Pinch-zoom on canvas, pan for large layouts |
| Feedback | Immediate visual feedback on touch (CSS :active) |

## Theme Tokens

CSS custom properties drive light/dark adaptation:

| Token Category | Example Variables | Purpose |
|----------------|-------------------|---------|
| **Background** | `--bg-primary`, `--bg-secondary`, `--bg-surface` | Page and card backgrounds |
| **Foreground** | `--fg-primary`, `--fg-secondary`, `--fg-muted` | Text and icon color |
| **Accent** | `--accent-primary`, `--accent-success`, `--accent-warning` | Buttons, status, alerts |
| **Border** | `--border-color`, `--border-width` | Dividers, outlines |
| **Shadow** | `--shadow-sm`, `--shadow-md`, `--shadow-lg` | Elevation |

SVG elements reference tokens via `currentColor` or `var(--token-name)` where supported.

## Light/Dark Adaptation

```
[User Preference] --> [Theme Resolver] --> [CSS Custom Properties]
        |                     |                     |
        v                     v                     v
  (light/dark/         (merge with          (applied to
   system)              template)            document root)
```

- Per-user preference stored in profile
- System default configurable by admin
- Templates define token values for each mode

## Canvas Usage

HTML5 Canvas is used only for:

- Real-time line charts (high sample rate)
- Bar charts with many data points
- Sparklines and speed trends

Canvas is not used for static graphics, gauges, or widgets; SVG handles those.

## CSS Transitions vs Web Animations API

| Aspect | CSS Transitions | Web Animations API |
|--------|-----------------|-------------------|
| **Use** | Simple state changes (hover, active) | PLC-driven property animation |
| **Control** | Duration, easing only | Full keyframe control, pause, reverse |
| **Binding** | Static | Dynamic (tag value drives keyframes) |
| **Complexity** | Low | Medium |

## Diagram: Render Decision Flow

```
                    +------------------+
                    |  Update Request  |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
    +------------------+          +------------------+
    |  Static/Slow      |          |  Real-time Chart |
    |  Change           |          |  (high freq)     |
    +--------+---------+          +--------+---------+
             |                             |
             v                             v
    +------------------+          +------------------+
    |  CSS Transition   |          |  Canvas 2D       |
    |  or WAAPI         |          |  requestAnimFrame|
    +------------------+          +------------------+
```

## File Structure

| Path | Purpose |
|------|---------|
| `themes/*.css` | Theme token definitions (light/dark) |
| `widgets/*.svg` | SVG widget components |
| `templates/*` | Pre-built layout sets with embedded tokens |
