# Three.js Upgrade Smoke Checklist

Use this checklist after running `scripts/update-threejs-version.(sh|ps1)` to validate the new release. Copy the table into your PR description (or link to this file) with the Result column filled out.

| Step | Check | Result |
| --- | --- | --- |
| 1 | Script completed without errors and updated manifest/import maps/versioning module. | |
| 2 | `index.html` loads via `python -m http.server` with no console errors and logs the expected Three.js version. | |
| 3 | Core interactions (drag, hover, rainbow toggle, reset) behave normally with the ball intact. | |
| 4 | Audio diagnostics (`window.testAudioSystem()` or hover/click sounds) succeed without warnings. | |
| 5 | `testcase.html` and other harness pages resolve Three.js assets from the same CDN version. | |
| 6 | Documentation (`docs/version-upgrades/README.md`, README) updated with any release-specific notes. | |
| 7 | Checklist results recorded in PR description or changelog along with upstream release notes link. | |
