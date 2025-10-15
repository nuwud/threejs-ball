# Three.js Version Upgrade Workflow

This workflow keeps the Three.js import maps, runtime metadata, and documentation aligned with a single manifest (`config/threejs-version.json`). Follow these steps whenever you need to upgrade, pin, or validate a release.

## 1. Review the Manifest

The manifest stores the authoritative release data:
- `latest`: Upstream release we consider the default.
- `pinned`: Optional override chosen for the project; when `null`, we fall back to `latest`.
- `supported`: Whitelist of releases the tooling accepts.
- `cdn`: Base CDN URL + package used for import maps.
- `releaseNotes`: Handy links for quick reference.

Update `supported` when you add or retire releases. The tooling blocks versions that are not explicitly listed.

## 2. Apply or Pin a Version

Use the wrapper scripts from the repository root to apply the manifest configuration. Both scripts accept the same switches.

```bash
# Apply manifest state (pinned ?? latest)
scripts/update-threejs-version.sh

# Pin a supported release
scripts/update-threejs-version.sh --tag r180
scripts/update-threejs-version.sh --npm 0.180.0

# Clear the pin so the manifest falls back to `latest`
scripts/update-threejs-version.sh --clear
```

```powershell
# PowerShell variant
./scripts/update-threejs-version.ps1 --npm 0.179.0
```

The scripts perform three actions:
1. Update the manifest (`pinned`, `updatedAt`, etc.).
2. Rewrite every HTML import map that references Three.js so the URLs point at the active release.
3. Regenerate `src/utils/versioning.js`, which exposes version metadata for the runtime (`window.app.meta.threeVersion`) and console logging.

## 3. Run the Smoke Checklist

Serve the project from the repo root (`python -m http.server`) and complete the verification steps below. Record your observations under the "Results" column.

| Step | Check | Result |
| --- | --- | --- |
| 1 | `index.html` loads with no console errors and logs the expected Three.js version. | |
| 2 | Interactions (drag, hover, rainbow toggle) still function. | |
| 3 | Audio diagnostics (`window.testAudioSystem()`) complete successfully. | |
| 4 | `testcase.html` loads with correct import map URLs. | |
| 5 | Inspect DevTools network panel: Three.js requests come from the expected CDN version. | |

> **Spec Kit Note**: Track completion in `.specify/specs/001-threejs-version-upgrade/checklists/UpgradeChecklist.md` so the Spec-Kit workflow stays in sync with documentation.

## 4. Commit the Changes

Create a single commit containing:
- Updated `config/threejs-version.json` and regenerated `src/utils/versioning.js`.
- Any HTML import-map changes.
- Updated documentation or checklist results.

Include a link to the upstream release notes in the commit message or PR description.

## Troubleshooting

- **Unsupported release**: Add the tag/npm pair to `supported` before running the script.
- **Import map unchanged**: Ensure the HTML file still uses the standard `three` / `three/addons/` keys with double-quoted URLs.
- **No console log**: Verify that `src/utils/versioning.js` exists and that `src/core/main.js` imports `logThreeVersion`.
- **Missing Node.js**: Install Node 18+ so the wrapper scripts can invoke the `apply-threejs-version.mjs` helper.
