# SwimEx EDGE — Theming System

The theming system supports light/dark mode, CSS custom properties, SVG theme tokens, and five pre-built templates. Per-user preference and system default are configurable.

## Light/Dark Mode

| Aspect | Description |
|--------|-------------|
| **CSS Custom Properties** | All theme colors defined as variables |
| **SVG Theme Tokens** | SVG elements reference tokens (e.g., currentColor, var(--)) |
| **Per-User Preference** | User can choose light, dark, or system |
| **System Default** | Admin configures default for new users |
| **System Default** | Follows OS preference when "system" selected |

## Theme Token Structure

| Category | Tokens | Purpose |
|----------|--------|---------|
| **Background** | --bg-primary, --bg-secondary, --bg-surface | Page, card, surface colors |
| **Foreground** | --fg-primary, --fg-secondary, --fg-muted | Text, icons |
| **Accent** | --accent-primary, --accent-success, --accent-warning, --accent-error | Buttons, status, alerts |
| **Border** | --border-color, --border-width | Dividers, outlines |
| **Shadow** | --shadow-sm, --shadow-md, --shadow-lg | Elevation |

## Five Templates

| Template | Visual Style | Best For |
|----------|--------------|----------|
| **Classic** | Traditional EDGE look; navy, gray, blue accents | Existing installations |
| **Modern** | Flat material design; white/light gray, primary accent | Contemporary facilities |
| **Clinical** | High-contrast, WCAG AA; black/white, strong borders | Healthcare, accessibility |
| **Sport** | Dark background, neon accents; performance gauges | Fitness centers |
| **Minimal** | Stripped-down; monochrome, single accent | Simple setups, kiosks |

## Template Descriptions

### Classic

- Traditional EDGE look
- Navy, gray, white palette
- Blue accents
- Serif headings, sans body
- Subtle shadows, rounded corners

### Modern

- Flat material design
- White/light gray background
- Primary accent (blue or green)
- Sans-serif throughout
- Material elevation shadows

### Clinical

- High-contrast accessibility
- WCAG AA compliant
- Black/white or dark/light
- Large fonts, strong borders
- 48x48 dp minimum touch targets

### Sport

- Dark background
- Neon accents (cyan, green, orange)
- Bold performance gauges
- Glow effects
- Data-dense layout

### Minimal

- Stripped-down essentials
- Monochrome or single accent
- Maximum whitespace
- Single font family
- No shadows or minimal

## Template Behavior

| Behavior | Description |
|----------|-------------|
| **Admin Selects Active** | Admin chooses which template is live |
| **Customizable via Builder** | Colors, fonts can be overridden per installation |
| **Tag Bindings Preserved** | Switching template keeps all PLC tag bindings |
| **Exportable** | Save as .edge-template package |

## .edge-template Package

| Contents | Description |
|----------|-------------|
| **layouts/** | SVG/HTML layout files |
| **theme.json** | Token values for light/dark |
| **manifest.json** | Template name, version, screen list |
| **widgets/** | Custom widget overrides (optional) |

## Theme Resolution Flow

```
User Preference (light/dark/system)
        |
        v
+------------------+
|  Theme Resolver  |
+--------+---------+
         |
         v
+------------------+
|  Template Override|  (if admin customized)
+--------+---------+
         |
         v
+------------------+
|  CSS Custom      |
|  Properties      |
+------------------+
         |
         v
+------------------+
|  Document Root   |
+------------------+
```

## Customization in Builder

| Customizable | Notes |
|--------------|-------|
| **Accent colors** | Override --accent-primary, etc. |
| **Fonts** | Override --font-family, --font-size-base |
| **Border radius** | Override --radius-sm, --radius-md |
| **Shadows** | Override --shadow-* |

## Admin Configuration

| Setting | Description |
|---------|-------------|
| **Default Theme** | light, dark, or system for new users |
| **Active Template** | Which of 5 templates is live |
| **Allow User Override** | Whether users can change light/dark |
