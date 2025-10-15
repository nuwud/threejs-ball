---
description: "Implementation tasks for Three.js version management"
---

# Tasks: Three.js Version Management & Upgrade Workflow

**Input**: Design documents from `/specs/001-threejs-version-upgrade/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: Manual smoke validation plus optional automation stub

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup & Shared Infrastructure

- [ ] T001 [P] [Foundation] Create `config/threejs-version.json` seeded with `r180`, `supported` list, and metadata.
- [ ] T002 [P] [Foundation] Add `scripts/update-threejs-version.ps1` and `.sh` placeholders referencing manifest + GitHub API.
- [x] T003 [Foundation] Add `docs/version-upgrades/README.md` with workflow overview and checklist template.

---

## Phase 2: Foundational Changes (Prerequisite for all stories)

- [x] T101 [Foundation] Update `.github/copilot-instructions.md` and README dependency sections to mention manifest-based versioning.
- [ ] T102 [Foundation] Add `src/utils/versioning.js` helper that reads manifest via fetch (with fallback) and exposes `getActiveThreeVersion()` for logging.
- [ ] T103 [Foundation] Ensure `window.app` initialization logs active version and attaches it to `window.app.meta.threeVersion`.

**Checkpoint**: Manifest exists, documentation references it, runtime can report active version.

---

## Phase 3: User Story 1 – Upgrade to Latest Release (Priority: P1)

**Goal**: Default import maps pull r180 (or latest) automatically, regression checklist documented.

**Independent Test**: Serve via `python -m http.server`, confirm network requests point to manifest `latest` version and interactions succeed.

### Implementation

- [ ] T201 [US1] Refactor import maps in `index.html`, `testcase.html`, `facet-rainbow-test.html`, `audio-test.html` to use templated placeholders (`{{THREE_VERSION}}`) or script-injected URLs.
- [ ] T202 [US1] Implement `scripts/apply-threejs-version.js` Node/uv script that reads manifest and rewrites HTML import maps with resolved CDN URLs.
- [ ] T203 [US1] Update `tools/path-checker.js` or add new lint check to ensure all import map references match manifest active version.
- [x] T204 [US1] Document smoke test checklist in `docs/version-upgrades/threejs-smoke-checklist.md` covering visual/audio verification.

### Validation

- [ ] T205 [US1] Run smoke checklist manually (record results in docs) verifying r180 loads with no console errors.

---

## Phase 4: User Story 2 – Select Specific Three.js Version (Priority: P2)

**Goal**: Developers can pin an alternate version and see it applied across entry points.

**Independent Test**: Set `pinned` in manifest (or via UI), run apply script, confirm import map uses pinned version.

### Implementation

- [ ] T301 [US2] Extend manifest schema to include `pinned` and `supported` validations (update `config/threejs-version.json`).
- [ ] T302 [US2] Enhance `scripts/apply-threejs-version.js` to resolve `activeVersion = pinned ?? latest` and validate against `supported` list.
- [ ] T303 [US2] Add developer UI toggle (hidden menu or console command) exposing `window.app.uiBridge.setThreeVersion(version)` for quick swaps (updates manifest or triggers script instruction).
- [ ] T304 [US2] Persist selected version in `localStorage` (`ballThreeJsVersion`) and surface banner/log if it diverges from manifest latest.

### Validation

- [ ] T305 [US2] Smoke test pinned version (e.g., set to r179) ensuring import map rewrites and runtime log show correct version.

---

## Phase 5: User Story 3 – Guided Upgrade Workflow (Priority: P3)

**Goal**: Scripted process fetches latest release, updates manifest + docs, and records validation steps.

**Independent Test**: Run workflow in dry-run mode; confirm manifest bump, HTML rewrites, changelog entry, and checklist output.

### Implementation

- [ ] T401 [US3] Implement GitHub release fetcher inside update scripts (PowerShell & Bash) with error handling for API limits/404s.
- [ ] T402 [US3] Generate changelog file `docs/version-upgrades/threejs-<version>.md` summarizing release notes and upgrade steps.
- [ ] T403 [US3] Automate smoke checklist invocation (e.g., launch headless browser or prompt manual actions) and append results to changelog.
- [ ] T404 [US3] Add CI-friendly entry point (e.g., `npm run check-three-version`) that verifies HTML import maps match manifest and active version logs on page load.

### Validation

- [ ] T405 [US3] Dry-run workflow on new branch, attach output artifacts, and ensure repo remains clean after reset.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T501 [P] Update `.specify/quickstart.md` references and constitution if workflow introduces new guardrails.
- [ ] T502 [P] Add automated test or lint rule that catches mismatched Three.js version strings during PR CI.
- [ ] T503 Final documentation sweep: README, docs/version-upgrades/, `.github/copilot-instructions.md` upgrade section.
- [ ] T504 Record upgrade instructions video/screencast link placeholder in docs (optional if time permits).

---

## Dependencies & Execution Order

- Phase 1 must complete before modifying runtime files.
- Phase 2 establishes manifest + logging; required before import map refactors.
- User Story 1 (P1) must land before User Story 2/3 to ensure base upgrade works.
- User Story 2 depends on manifest schema from Phase 1/2.
- User Story 3 depends on scripts from US1/US2 (reuse apply logic).
- Polish tasks run after all stories; documentation updates can happen incrementally but must conclude post-implementation.
