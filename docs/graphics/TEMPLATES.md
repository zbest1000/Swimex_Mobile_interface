# SwimEx EDGE — Pre-Built Templates

Five pre-built templates provide complete screen sets for the EDGE interface. Each template defines visual style, theme tokens, and layout structure while preserving tag bindings when switching.

## Template Overview

| Template | Style | Best For |
|----------|-------|----------|
| **Classic** | Traditional EDGE look | Existing installations, familiarity |
| **Modern** | Flat material design | Contemporary facilities |
| **Clinical** | High-contrast, WCAG AA | Healthcare, accessibility |
| **Sport** | Dark bg, neon accents | Fitness centers, performance focus |
| **Minimal** | Stripped-down essentials | Simple setups, kiosks |

## Classic Template

**Description**: Traditional EDGE look with familiar controls and layout.

| Aspect | Details |
|--------|---------|
| **Colors** | Navy, gray, white; blue accents |
| **Typography** | Serif headings, sans body |
| **Shadows** | Subtle drop shadows on cards |
| **Borders** | Rounded corners (4–8px) |
| **Screens** | Home, workout modes, execution, profile, admin |

## Modern Template

**Description**: Flat material design with clean lines and card-based layout.

| Aspect | Details |
|--------|---------|
| **Colors** | White/light gray bg, primary accent (blue/green) |
| **Typography** | Sans-serif throughout, medium weight |
| **Shadows** | Material elevation (2–8dp) |
| **Borders** | Minimal; card separation via shadow |
| **Screens** | Home, workout modes, execution, profile, admin |

## Clinical Template

**Description**: High-contrast accessibility, WCAG AA compliant.

| Aspect | Details |
|--------|---------|
| **Colors** | Black/white or dark/light; high contrast ratio |
| **Typography** | Large, readable fonts; clear hierarchy |
| **Shadows** | Reduced; rely on borders for separation |
| **Borders** | Strong outlines, 2px minimum |
| **Touch Targets** | 48x48 dp minimum enforced |
| **Screens** | Home, workout modes, execution, profile, admin |

## Sport Template

**Description**: Dark background with neon accents, performance-oriented gauges.

| Aspect | Details |
|--------|---------|
| **Colors** | Dark gray/black bg; cyan, green, orange accents |
| **Typography** | Bold, condensed for data density |
| **Shadows** | Glow effects on accents |
| **Borders** | Thin, accent-colored |
| **Gauges** | Prominent speed dials, trend charts |
| **Screens** | Home, workout modes, execution, profile, admin |

## Minimal Template

**Description**: Stripped-down essentials, maximum clarity.

| Aspect | Details |
|--------|---------|
| **Colors** | Monochrome or single accent |
| **Typography** | Single font family, limited weights |
| **Shadows** | None or minimal |
| **Borders** | 1px lines only |
| **Layout** | Generous whitespace |
| **Screens** | Home, workout modes, execution, profile, admin |

## Complete Screen Set (All Templates)

Each template provides these screens:

| Screen | Purpose |
|--------|---------|
| **Home** | Dashboard, quick start, status overview |
| **Workout Modes** | Mode selection (manual, program, etc.) |
| **Execution** | Active workout display, controls, feedback |
| **Profile** | User profile, settings |
| **Admin** | Configuration, commissioning (role-gated) |

## Template Internals

### SVG-Based Layouts

- All layouts built from SVG components
- Shared widget library across templates
- Layout structure (grid, flex) defined in template CSS

### Theme Tokens

Each template defines:

```
--bg-primary
--bg-secondary
--fg-primary
--fg-secondary
--accent-primary
--accent-success
--accent-warning
--accent-error
--border-color
--shadow-sm
--shadow-md
```

### Shared Widget Library

- Same 30+ widgets available in all templates
- Widget appearance driven by theme tokens
- No template-specific widget variants; tokens handle styling

## Template Behavior

| Behavior | Description |
|----------|-------------|
| **Admin Selects Active** | Admin chooses which template is live |
| **Customizable via Builder** | Colors, fonts can be overridden per installation |
| **Tag Bindings Preserved** | Switching template keeps all PLC tag bindings |
| **Exportable** | Save as .edge-template package for backup or transfer |

## Export Format (.edge-template)

| Contents | Description |
|----------|-------------|
| **layouts/** | SVG/HTML layout files |
| **theme.json** | Token values, fonts |
| **manifest.json** | Template name, version, screen list |
| **widgets/** | Any custom widget overrides (optional) |

## Template Selection Flow

```
Admin Panel --> Template Gallery --> Select Template --> Apply
      |                |                    |              |
      v                v                    v              v
  List installed   Preview each        Confirm        Reload UI
  templates        template           (bindings      with new
                                      preserved)     theme
```
