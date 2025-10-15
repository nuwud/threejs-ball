# Implementation Plan: Three.js Version Management & Upgrade Workflow

**Branch**: `001-threejs-version-upgrade` | **Date**: 2025-10-14 | **Spec**: `.specify/specs/001-threejs-version-upgrade/spec.md`
**Input**: Feature specification from `/specs/001-threejs-version-upgrade/spec.md`

## Summary

Introduce a single-source Three.js version manifest, defaulted to the latest upstream release (baseline r180), and extend the browser runtime plus documentation so maintainers can upgrade or pin versions with minimal manual edits. Add a scripted workflow that discovers the newest release via GitHub API, updates import maps (`index.html`, `facet-rainbow-test.html`, `testcase.html`), refreshes documentation, and performs regression smoke tests to validate the ball, audio, and effects remain stable.

## Technical Context

**Language/Version**: Browser JavaScript (ES Modules) served without bundler.  
**Primary Dependencies**: Three.js (r180 baseline via CDN import map), optional GSAP, Web Audio API modules in `src/audio`.  
**Storage**: No backend; uses `localStorage` for UI/audio persistence.  
**Testing**: Manual/automated smoke via browser + planned CLI regression workflow (Python shell script invoking `playwright` or `puppeteer-lite` TBD).  
**Target Platform**: Modern desktop browsers (Chrome primary, Firefox/Safari secondary).  
**Project Type**: Browser-only WebGL experience.  
**Performance Goals**: Maintain 60fps render loop; audio latency unchanged; upgrade workflow completes under 2 minutes.  
**Constraints**: Must preserve `window.app` contract and import-map based loading; no bundlers; offline fallback not required.  
**Scale/Scope**: Single page Three.js experience with supplemental test harness pages.

## Constitution Check

- **I. Runtime Contract Preservation**: Plan keeps all changes additive (manifest consumed by import maps and `main.js` logging) without touching `window.app` structure.
- **II. Audio & Effects Harmony**: Regression workflow mandates running `window.testAudioSystem()` and effect toggles post-upgrade.
- **III. Versioned Dependency Discipline**: Core deliverable is the centralized manifest plus upgrade script; aligns with principle.
- **IV. Browser-First Development Ergonomics**: Workflow relies on `python -m http.server` and keeps import maps CDN-based.
- **V. Documentation & Spec Alignment**: Plan includes updates to `.github/copilot-instructions.md`, README, and new upgrade checklist.

✅ Constitution gates satisfied; proceed with design.

## Project Structure

### Documentation (this feature)

```
specs/001-threejs-version-upgrade/
├── plan.md
├── research.md        # placeholder for upstream release notes & API diffs
├── data-model.md      # manifest schema & selector state
├── quickstart.md       # instructions for running upgrade workflow
├── contracts/          # e.g., schema for version manifest JSON
└── tasks.md            # generated later via /speckit.tasks
```

### Source Code (repository root)

```
config/
└── threejs-version.json          # NEW manifest source of truth

scripts/
└── update-threejs-version.ps1    # NEW Powershell (and .sh variant) workflow orchestrator

src/
├── core/
│   ├── main.js                   # Log active version, consume manifest for console messaging
│   └── ui-connections.js         # Optional UI hook if version selector exposed
├── utils/
│   └── versioning.js             # NEW helper to resolve import base URL (browser-safe)
└── tests/
    └── smoke/
        └── threejs-version-check.mjs   # NEW optional automation stub

public html files (root)
├── index.html
├── testcase.html
├── facet-rainbow-test.html
└── audio-test.html               # all import maps pull version from manifest via templating step
```

**Structure Decision**: Maintain single web project layout; introduce `config/` for manifest and `scripts/` for automation. Utilities live under `src/utils` to avoid scattering version logic.

## Complexity Tracking

_No constitution violations; additional tooling (manifest + scripts) justified to enforce Principle III consistently._
