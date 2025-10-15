# Three.js Upgrade Workflow

This project tracks and applies Three.js releases through a small manifest and helper scripts. Follow the steps below whenever you need to bump the engine version.

## 1. Review the manifest

The file `config/threejs-version.json` holds the version state. It records:
- `latest`: upstream release data sourced from the official changelog
- `supported`: the whitelist of versions our tooling accepts
- `pinned`: the currently applied version (falls back to `latest` when `null`)
- `cdn`: the CDN package info used to build import map URLs

Update `supported` when you add or retire releases. The automation will refuse versions that are not in this list.

## 2. Apply a version

Run one of the wrapper scripts from the repository root:

```bash
# Default behaviour: apply the manifest's pinned version or fall back to latest
scripts/update-threejs-version.sh

# Pin a new supported release by npm version or tag
scripts/update-threejs-version.sh --npm 0.180.0
scripts/update-threejs-version.sh --tag r180

# Clear the pin so the manifest falls back to `latest`
scripts/update-threejs-version.sh --clear
```

PowerShell users can call `scripts/update-threejs-version.ps1` with the same flags.

The script performs three operations:
1. Updates `config/threejs-version.json` (`pinned`, `updatedAt`, and any new metadata).
2. Rewrites each HTML import map so `three` and `three/addons/` point at the selected CDN release.
3. Regenerates `src/utils/versioning.js`, which exposes version data to the runtime and test harnesses.

## 3. Validate in the browser

Serve the project (`python -m http.server` from the repo root) and open `index.html`. The console logs a line such as:

```
[threejs-ball] Using Three.js r180 (npm 0.180.0)
```

Confirm that interactions still work, run the existing audio diagnostics, and spot-check `testcase.html` for regressions.

## 4. Commit changes

Each version bump should commit the updated manifest, regenerated versioning module, and any HTML import map edits. Include a link to the upstream release notes in your commit message or PR description for quick reference.

## Troubleshooting

- If the script reports "Unsupported Three.js version", add the release to the `supported` array first.
- If the import maps do not update, ensure the HTML files still declare `three` and `three/addons/` entries that match the expected format.
- Node.js 18 or later is required; install it if the wrapper scripts cannot find `node`.
