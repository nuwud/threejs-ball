# Feature Specification: Three.js Version Management & Upgrade Workflow

**Feature Branch**: `001-threejs-version-upgrade`  
**Created**: 2025-10-14  
**Status**: Draft  
**Input**: User description: "Can we use spec kit to update the project to be able to use the latest version of three.js? Maybe even have a feature that lets you select which version but default to the latest and have a workflow for updating project for latest version in place."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Upgrade to Latest Release (Priority: P1)

As a maintainer I want the project to default to the newest stable Three.js release (starting with r180) so that fresh installs automatically benefit from the latest fixes and features.

**Why this priority**: Keeping the base import map up to date prevents security regressions and keeps visual/audio behaviour aligned with upstream improvements.

**Independent Test**: Serve `index.html` via `python -m http.server`, confirm the import map fetches the configured latest version (r180), run hover/click interactions without console errors.

**Acceptance Scenarios**:

1. **Given** the repo is freshly cloned, **When** I load `http://localhost:8000/index.html`, **Then** the network panel shows Three.js r180 modules and the ball renders without runtime errors.
2. **Given** the upgrade workflow script completes, **When** I run the regression checklist (`index.html`, `facet-rainbow-test.html`, `testcase.html`), **Then** all scenes load with the ball visible and audio hover interactions still functioning.

---

### User Story 2 - Select Specific Three.js Version (Priority: P2)

As a developer I want the ability to pin a specific Three.js release (e.g., r178) for testing or rollback while keeping the latest release as the default.

**Why this priority**: Controlled rollbacks enable debugging without editing multiple files and help reproduce issues against older versions.

**Independent Test**: Update the version selector (config file or UI toggle) to r178, reload `index.html`, verify the import map requests r178 and effects still run.

**Acceptance Scenarios**:

1. **Given** I set the version selector to r178, **When** I reload `index.html`, **Then** `three.module.js` and `OrbitControls.js` load from the r178 CDN path.
2. **Given** a pinned version is lower than the latest, **When** I run the automated smoke workflow, **Then** the workflow reports the active version and regression status.

---

### User Story 3 - Guided Upgrade Workflow (Priority: P3)

As a maintainer I need a documented CLI workflow that checks GitHub releases for the latest Three.js tag, updates project files, and records verification steps.

**Why this priority**: A repeatable process reduces accidental breakage and keeps documentation current.

**Independent Test**: Execute the upgrade script against a sandbox branch, confirm it updates import maps, docs, and changelog notes; run `python -m http.server` smoke tests to verify success.

**Acceptance Scenarios**:

1. **Given** a new Three.js version r181 is available, **When** I run the upgrade workflow, **Then** the import map, version manifest, and docs update to r181 and commit instructions are generated.
2. **Given** the workflow detects breaking changes (e.g., changed exports), **When** the regression script fails, **Then** it surfaces actionable error logs and leaves the repo in a recoverable state.

### Edge Cases

- CDN release artifact temporarily unavailable (HTTP 404). Workflow must surface a clear error and allow retry without leaving partial updates.
- Pinned version older than compatibility floor (e.g., < r150). System should warn and block selection if known to break `window.app` invariants.
- Local storage still referencing older effect flags; ensure version switch does not break persisted UI settings.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST centralize the Three.js version in a single authoritative manifest (e.g., `config/threejs-version.json`) used by import maps and docs.
- **FR-002**: Import map definitions in `index.html`, `testcase.html`, and other entry points MUST read the version manifest and default to the latest release.
- **FR-003**: System MUST provide a developer-facing selector (config file or UI panel) to override the default version, persisting across sessions.
- **FR-004**: Upgrade workflow MUST fetch the latest release tag from `https://api.github.com/repos/mrdoob/three.js/releases` and update local manifests accordingly.
- **FR-005**: Workflow MUST execute regression smoke tests (`index.html`, `facet-rainbow-test.html`, `testcase.html`) and surface failures before finalizing.
- **FR-006**: Documentation (`README.md`, `.github/copilot-instructions.md`) MUST outline how to run the upgrade workflow and switch versions manually.
- **FR-007**: System MUST log the active Three.js version to the console during initialization for quick diagnostics.
- **FR-008**: Workflow MUST generate a changelog snippet summarizing the version change and key upstream release notes (link to r180+).

### Key Entities

- **ThreeJsVersionManifest**: JSON structure containing `latest`, `pinned`, `supported` array, and metadata (release date, links).
- **UpgradeChecklist**: Markdown/JSON artifact capturing steps run, test results, and manual verification sign-off.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Latest Three.js release adopted within 1 business day of publication using the scripted workflow.
- **SC-002**: Zero runtime errors in browser console across smoke pages after upgrade (verified via automated checks).
- **SC-003**: Version selector change propagates to all entry HTML files within 5 seconds (no manual edits required).
- **SC-004**: Documentation updates merged alongside version upgrades 100% of the time (tracked via checklist).
