# Dependency Health-Check — SwimEx EDGE

**Audit date:** 2026-03-22  
**Node.js:** v22.22.1 · **npm audit:** 0 vulnerabilities  
**Module system:** CommonJS (tsconfig `module: "commonjs"`, no `"type": "module"` in package.json)

---

## Server (`server/package.json`)

### Tier 1 — Safe patch/minor updates (no API changes)

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| `modbus-serial` | 8.0.23 | 8.0.25 | Patch — bug fixes only |
| `ws` | 8.19.0 | 8.20.0 | Patch — bug fixes only |
| `@types/express` | 4.17.21 | 4.17.25 | Type-only patch |
| `@types/node` | 22.19.11 | 22.19.15 | Type-only patch |
| `argon2` | 0.41.1 | 0.44.0 | Minor — adds prebuilt binaries; v0.43.1 fixed TS type regression. No API changes. |
| `mqtt` | 5.15.0 | 5.15.x | Already at latest within ^5 range |

**Risk:** Negligible. These are all semver-compatible in-range updates.

### Tier 2 — Minor bumps requiring light validation

| Package | Current | Target | Notes |
|---------|---------|--------|-------|
| `sharp` | 0.33.5 | 0.34.5 | `removeAlpha` behavior changed; non-animated GIF loop default changed. Requires C++17 compiler. Review `graphics-service.ts` usage. |
| `@types/better-sqlite3` | 7.6.12 | 7.6.13 | Already installed at 7.6.13 (in-range). No action needed. |

**Risk:** Low-moderate. Sharp 0.34 has minor behavior changes that may not affect this project but need a build + smoke test.

### Tier 3 — Major version bumps (likely breaking, defer)

| Package | Current | Latest | Breaking changes |
|---------|---------|--------|------------------|
| `express` | 4.22.1 | 5.2.1 | Removed deprecated APIs (`req.param`, `res.sendfile`, etc.), new path-matching syntax, auto-rejected-promise handling. Significant migration. |
| `better-sqlite3` | 11.10.0 | 12.8.0 | Requires Node.js ≥ 20 (OK here). No real API breaks, but major bump warrants caution. |
| `multer` | 1.4.5-lts.2 | 2.1.1 | ESM-only in v2. **Incompatible** with this project's CommonJS module system without migration. |
| `uuid` | 11.1.0 | 13.0.0 | v12 drops CommonJS support. **Incompatible** without ESM migration. |
| `@types/express` | 4.17.x | 5.0.6 | Only useful after Express 5 migration. |
| `@types/multer` | 1.4.12 | 2.1.0 | Only useful after Multer 2 migration. |

**Risk:** High. `multer@2` and `uuid@12+` drop CommonJS — upgrading requires migrating the entire project to ESM (`"type": "module"`, `tsconfig.module: "nodenext"`, all import paths with `.js` extensions). Express 5 requires path-syntax and API auditing across all route files.

---

## Android Client (`client/`)

| Component | Current | Latest | Notes |
|-----------|---------|--------|-------|
| Android Gradle Plugin | 8.2.0 | 8.8+ | Major; may require Gradle 8.9+, JDK 17+ |
| Kotlin | 1.9.20 | 2.1+ | Major; K2 compiler, new deprecations |
| compileSdk / targetSdk | 34 | 36 | Recommended to stay current for Play Store |
| `androidx.appcompat` | 1.6.1 | 1.7+ | Minor bump, safe |
| `androidx.webkit` | 1.9.0 | 1.13+ | Minor bump, safe |
| `kotlinx-coroutines` | 1.7.3 | 1.10+ | Minor bump, safe |

The Android client is rarely edited from Cloud agents (per AGENTS.md). These are noted but not actioned here.

---

## Update Plan

### Phase 1 — Implement now (Tier 1 safe updates)

Update `server/package.json` pinned ranges and run `npm update` for:
- `modbus-serial`, `ws` (patch)
- `@types/express`, `@types/node` (type patches)
- `argon2` (0.41 → 0.44, no API changes)

Validate: `npm run build` + `npm start` + health check.

### Phase 2 — Implement now with validation (Tier 2)

- `sharp` 0.33.5 → 0.34.5

Validate: build, start, test image processing if possible.

### Phase 3 — Defer (Tier 3, tracked as follow-up)

Requires ESM migration or significant refactoring:
- `express` 4 → 5
- `multer` 1 → 2
- `uuid` 11 → 12+
- `better-sqlite3` 11 → 12

Recommended approach: migrate to ESM first, then upgrade these packages together.
