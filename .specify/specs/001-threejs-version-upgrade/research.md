# Research: Three.js Version Management

## Upstream Release Snapshot

- **Latest Stable (2025-10-14)**: [r180](https://github.com/mrdoob/three.js/releases/tag/r180)
  - Highlights: WebGPU renderer improvements, bug fixes in `GLTFLoader`, control updates.
  - Breaking changes: `OrbitControls` continues to ship under `/examples/jsm/controls/OrbitControls.js`; no API rename reported.
- **Prior Release for Rollback**: r179 (2025-09) for regression comparison.

## API Surfaces Used by Threejs-Ball

| Area | Current Usage | Notes |
|------|---------------|-------|
| Core import | `three` main module via `three.module.js` | Needs versioned CDN path.
| Controls | `three/addons/controls/OrbitControls.js` | Must align with same version tag.
| Math/Color utilities | Implicit via `THREE.Color` etc. | No breaking changes flagged.
| Audio | No direct Three.js audio classes used; Web Audio API implemented manually. | Upgrades low risk.

## CDN Options

- Primary: `https://cdn.jsdelivr.net/npm/three@<version>/build/three.module.js`
- Alternative: `https://unpkg.com/three@<version>/build/three.module.js`
- Decision: Continue using jsDelivr (current import map) but parametrize version.

## Tooling Considerations

- GitHub API endpoint: `https://api.github.com/repos/mrdoob/three.js/releases?per_page=1`
- PowerShell + Bash scripts required to keep Windows/macOS parity.
- JSON manifest consumed both by scripts (Node/Python) and HTML (templating or runtime fetch).

## Risks & Mitigations

- **CDN propagation delay**: Provide fallback to previous version within manifest.
- **Manual HTML edits**: Automate via script to avoid human error when updating import maps.
- **Local cache**: Document hard-refresh / cache-busting in quickstart.
