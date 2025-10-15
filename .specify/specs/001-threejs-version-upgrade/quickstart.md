# Quickstart: Three.js Upgrade Workflow

1. **Install prerequisites**
   - Ensure `uv` and `python` available (already used by project).
   - Install Spec Kit CLI: `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git`.

2. **Fetch latest release metadata**
   - Run `scripts/update-threejs-version.ps1` (Windows) or `scripts/update-threejs-version.sh` (macOS/Linux).
   - Script queries GitHub Releases API, updates `config/threejs-version.json`, and patches import maps.

3. **Run smoke validation**
   - Start local server: `python -m http.server`.
   - Visit `index.html`, `facet-rainbow-test.html`, `testcase.html`.
   - Trigger hover/click interactions, toggle effects, and run `window.testAudioSystem()`.

4. **Document change**
   - Review generated changelog snippet (e.g., `docs/version-upgrades/threejs-r180.md`).
   - Update `.github/copilot-instructions.md` version references if script didn’t auto-inject.

5. **Commit**
   - Stage manifest, HTML updates, docs, and script outputs.
   - Commit message template: `chore(threejs): upgrade to r<version>`.
   - Add checklist results to PR description.
