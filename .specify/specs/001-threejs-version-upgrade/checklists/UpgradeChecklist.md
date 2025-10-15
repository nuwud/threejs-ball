# Upgrade Checklist: Three.js Version Management Workflow

**Purpose**: Verify import maps, runtime logging, audio behaviour, and documentation after applying a Three.js release via the manifest workflow.

**Spec Reference**: `.specify/specs/001-threejs-version-upgrade/spec.md`

- [ ] CHK-001 Run `scripts/update-threejs-version.(sh|ps1)` with the desired selector (or no selector for latest) and confirm the script finishes without errors.
- [ ] CHK-002 Inspect the diff to ensure `config/threejs-version.json`, the HTML import maps, and `src/utils/versioning.js` updated consistently.
- [ ] CHK-003 Serve the repo root (`python -m http.server`) and open `index.html`; verify the console logs `Using Three.js <tag>` with the expected version.
- [ ] CHK-004 Exercise core interactions (drag, hover, rainbow toggle, reset) to confirm the ball remains functional and auto-movement resumes when expected.
- [ ] CHK-005 Trigger the audio diagnostics (`window.testAudioSystem?.()`) and ensure hover/click sounds still fire without warnings.
- [ ] CHK-006 Open `testcase.html` and other harness pages to confirm their import maps request the same CDN version.
- [ ] CHK-007 Update documentation (`docs/version-upgrades/README.md`, README links, release notes) with any version-specific notes.
- [ ] CHK-008 Record checklist results (pass/fail notes) in the PR description or changelog and link to the upstream Three.js release notes.
