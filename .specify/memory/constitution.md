# Threejs-Ball Spec Constitution

## Core Principles

### I. Runtime Contract Preservation (NON-NEGOTIABLE)
- `window.app` is the public contract; renderer, scene, audio context, and `uiBridge` members must remain available for lazy-loaded scripts.
- Ball survival is mandatory (`window.app.ballGroup`, `ballMesh`, and `uiBridge.wireMesh` stay truthy).
- Import-map based bootstrapping (`index.html`) is the source of truth; no bundlers or build steps may break direct browser usage.

### II. Audio & Effects Harmony
- Audio helpers (`setupEnhancedAudio`, `SoundScheduler`, `nodePool`) must initialize before playback helpers are touched.
- Effects register through `src/effects/effectManager.js` via `registerEffect` and `callEffect`; cleanup paths (`removeBlackholeEffect`, `removeMagneticTrail`) must be preserved.
- UI toggles must flow through `uiBridge` and persist via existing localStorage keys.

### III. Versioned Dependency Discipline
- Three.js and related CDN assets are versioned through a single configuration surface (import map + docs).
- Default runtime targets the latest stable Three.js release, with opt-in rollback support for at least the previous release.
- Upgrade workflows must include validation steps (smoke tests over `index.html`, `facet-rainbow-test.html`, and `testcase.html`).

### IV. Browser-First Development Ergonomics
- Serve via `python -m http.server` (or equivalent) from repo root; never rely on `file://`.
- Guard GSAP usage behind `window.gsap` checks; ensure optional libraries fail gracefully.
- Persistent state side effects must be documented and resettable (`localStorage` keys prefixed `ball`).

### V. Documentation & Spec Alignment
- `.github/copilot-instructions.md` and `/docs` must mirror architectural changes introduced via specs.
- Spec artifacts (spec, plan, tasks) must reference authoritative files/directories.
- Regression expectations (ball renders, audio plays, effects toggle) must be captured in acceptance sections.

## Quality & Safety Gates
- **Compatibility Matrix**: Validate against latest Chrome desktop; note caveats for Safari/Firefox; any regressions must be documented before merge.
- **Visual Confirmation**: Provide screenshot notes/screenshare instructions when geometry or material changes are introduced.
- **Audio Sanity**: Run `window.testAudioSystem()` and facet hover interactions after upgrades touching audio or dependency versions.

## Development Workflow
- Run `/speckit.constitution` updates prior to changing core principles.
- Follow Spec Kit sequence (`/speckit.specify` → `/speckit.plan` → `/speckit.tasks` → `/speckit.implement`) per feature branch.
- Each Git commit must reference the spec task or checklist item it satisfies; do not collapse multiple spec tasks into a single opaque commit.

## Governance
- Constitution amendments require updating this file plus notifying maintainers via PR summary.
- Specs and plans may not override core principles without an accompanying constitution change.
- Violations detected during review block merges until remediated.

**Version**: 1.0.0 | **Ratified**: 2025-10-14 | **Last Amended**: 2025-10-14