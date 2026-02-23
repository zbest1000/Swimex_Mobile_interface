# SwimEx EDGE — Graphic Import System

The graphic import system supports multiple file formats and provides a centralized Graphic Library for storing, organizing, and reusing assets across layouts.

## Supported Formats

| Format | Extension | Animation Support | Notes |
|--------|-----------|-------------------|-------|
| **SVG** | .svg | Full per-element animation | Preferred; DOM parsed for named elements |
| **PNG** | .png | Graphic-level only | Raster; thumbnail and embed as image |
| **JPEG** | .jpg, .jpeg | Graphic-level only | Raster; no transparency |
| **WebP** | .webp | Graphic-level only | Raster; supports transparency |
| **GIF** | .gif | Graphic-level only | Raster; supports animation |
| **DXF** | .dxf | N/A | Auto-converted to SVG on import |

## Format-Specific Behavior

### SVG

- Full DOM parsing to extract named elements (IDs, data attributes)
- Per-element animation binding (fill, stroke, visibility, transform)
- Inline styles and gradients preserved
- External references resolved or inlined on import

### PNG, JPEG, WebP, GIF

- Graphic-level animation only (opacity, visibility, scale)
- No per-element binding; treated as single raster asset
- Thumbnail generated for library preview

### DXF

- Automatically converted to SVG during import
- Conversion uses configurable scale and layer mapping
- Resulting SVG follows same rules as native SVG import

## Import Workflow

```
+----------+     +----------+     +----------+     +----------+
|  Upload  |---->| Validate |---->|  Parse   |---->|  Store   |
+----------+     +----------+     +----------+     +----------+
     |                |                |                |
     v                v                v                v
  Select file(s)   Format check    SVG: list named   Graphic Library
  Drag & drop     Size limit      elements          Thumbnail
  or paste        Security scan   Raster: dims      Metadata
```

### Step 1: Upload

- Drag-and-drop onto import zone
- File picker (single or multiple)
- Paste from clipboard (PNG/SVG when supported)

### Step 2: Validate

- Format whitelist check
- File size limit (configurable, default 5 MB per file)
- Security: no scripts, no external entity references in SVG

### Step 3: Parse

- **SVG**: Parse DOM, extract elements with `id` or `data-bind` attributes
- Build list of bindable elements for animation configuration
- **Raster**: Read dimensions, generate thumbnail
- **DXF**: Run conversion pipeline, then parse as SVG

### Step 4: Store

- Save to Graphic Library with metadata
- Generate thumbnail (128x128 or proportional)
- Record version, category, tags

## Graphic Library

| Feature | Description |
|---------|-------------|
| **Centralized Storage** | All imported graphics in one searchable repository |
| **Categories** | User-defined categories (e.g., Icons, Diagrams, Pool Equipment) |
| **Search** | By name, tag, category, format |
| **Versioning** | Keep previous versions; rollback if needed |
| **Usage Tracking** | List layouts/screens that reference each graphic |
| **Bulk Import** | Upload multiple files or ZIP archive |
| **Bulk Export** | Export selected graphics or full library as ZIP |

## Library Metadata

| Field | Type | Purpose |
|-------|------|---------|
| Name | string | Display name |
| Category | string | Grouping |
| Tags | string[] | Search keywords |
| Format | enum | svg, png, jpeg, webp, gif |
| Dimensions | {w, h} | Width and height |
| Bindable Elements | string[] | SVG element IDs (SVG only) |
| Version | number | Increment on replace |
| Created/Modified | datetime | Audit |

## Bulk Import (ZIP)

1. Create ZIP containing graphic files (any supported format)
2. Upload ZIP to import dialog
3. System extracts and validates each file
4. Failed files reported; successful imports added to library
5. Optional: assign category to all in batch

## Bulk Export (ZIP)

1. Select graphics in library (or export all)
2. Choose Export as ZIP
3. ZIP contains original files plus manifest (metadata JSON)
4. Manifest enables re-import with categories and tags preserved

## Security Considerations

| Risk | Mitigation |
|------|------------|
| SVG scripts | Strip or reject `<script>`, event handlers |
| External entities | Resolve and inline or reject |
| XXE | Disable external DTD/entity loading in parser |
| Oversized files | Enforce size limits |

## API Summary

| Action | Endpoint/Method | Description |
|--------|-----------------|-------------|
| Import | POST /graphics/import | Upload and process file(s) |
| List | GET /graphics | List with filter, pagination |
| Get | GET /graphics/:id | Retrieve graphic + metadata |
| Update | PATCH /graphics/:id | Update metadata |
| Delete | DELETE /graphics/:id | Remove (check usage first) |
| Export | GET /graphics/export?ids=... | Download as ZIP |
