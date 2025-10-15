# Data Model: Three.js Version Manifest

## Overview

Central manifest drives import-map templating, developer overrides, and upgrade workflow reporting.

## `threejs-version.json`

```json
{
  "latest": "r180",
  "pinned": null,
  "supported": ["r180", "r179"],
  "cdn": {
    "primary": "https://cdn.jsdelivr.net/npm",
    "package": "three"
  },
  "releaseNotes": {
    "r180": "https://github.com/mrdoob/three.js/releases/tag/r180",
    "r179": "https://github.com/mrdoob/three.js/releases/tag/r179"
  },
  "updatedAt": "2025-10-14T00:00:00Z"
}
```

### Field Definitions

- **latest**: Upstream release our project targets by default.
- **pinned**: Optional override set by developers/UI; `null` means use `latest`.
- **supported**: Ordered array of known-good releases for quick rollback.
- **cdn.primary**: Base CDN host (switchable if jsDelivr unavailable).
- **cdn.package**: NPM package name consumed by import map.
- **releaseNotes**: Map release -> upstream changelog URL (for changelog generation).
- **updatedAt**: ISO timestamp set by upgrade workflow.

## Derived Values

- **activeVersion** = `pinned ?? latest`
- **baseImportUrl** = `${cdn.primary}/${cdn.package}@${activeVersion}/`

## Storage

- Manifest stored in `config/threejs-version.json` committed to repo.
- Optionally cached in `localStorage` as `ballThreeJsVersion` for UI hints, but script remains source of truth.
