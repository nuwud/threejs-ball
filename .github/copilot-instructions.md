**Project Snapshot**
- `index.html` bootstraps `src/core/main.js`; runtime is browser-only with CDN import maps and no bundler, so always test via a local HTTP server.
- `window.app` is the global contract: renderer, scene, audioContext, effect flags, and `uiBridge` live here; breaking this bag breaks all lazily-loaded scripts.
- Ball survival is non-negotiable (`window.app.ballGroup`, `ballMesh`, `uiBridge.wireMesh`); protection logic in `src/core/main.js` and docs expects them to exist for recoveries.
- `main.js` injects extra scripts (`mouse-controls.js`, `mouse-controls-fix.js`, `ui-connections.js`) after init; anything new must tolerate delayed availability and use optional chaining.

**Runtime Architecture**
- `src/core/main.js` orchestrates renderer/camera creation, effect registration, audio init, pointer handlers, and animation; do not treat it as a pure module.
- `uiBridge` (defined in `main.js`) is the only supported public surface for UI and other agents—add getters/setters/functions there and persist via existing localStorage keys.
- UI bindings live in `src/core/ui-connections.js`; they expect `uiBridge` APIs like `toggleBlackholeEffect`, `toggleCameraPosition`, and spikiness controls to exist and be idempotent.
- Docs under `docs/` (especially `audio-integration-guide.md`, `threejs-ball-troubleshooting.md`) capture recovery flows—mirror them when altering core systems.

**Audio System**
- `src/audio/setup/enhanced-setup.js` wraps `setupEnhancedAudio(app)` to build `AudioContext`, `masterGain`, node pool, `SoundScheduler`, and circuit breaker; call this or wait for its DOMContentLoaded watcher before using audio helpers.
- Playback helpers (`playFacetSound`, `playToneForPosition`, `playClickSound`, `playReleaseSound`) respect throttling, gain pooling, and circuit breaker; do not spawn raw oscillators unless you also update `node-pool.js` and `sound-buffers.js`.
- Persistent audio/UI state is round-tripped through `uiBridge.loadPersistedSettings()` reading keys like `ballVolume`, `ballAudioEnabled`, `ballVisualizationEnabled`; extend that method when adding toggles.
- Diagnostics: `window.initAudio`, `window.testAudioSystem`, and `src/tests/audio-integration-test.js` (run via browser console on `testcase.html`) confirm enhanced audio wiring.

**Effects & Interaction**
- Register visual/audio behaviours via `src/effects/effectManager.js`; prefer `registerEffect` + `callEffect('name', app)` so `updateEffects` keeps running and cleanup is centralized.
- Interaction flow in `main.js` → `setupInteraction()` emits facet events, drives deformation (`applyDeformation` / `resetDeformation`), and triggers audio; keep these APIs aligned when adding input modes.
- Blackhole/magnetic features rely on `effectState`, `app.magneticParticles`, and `_blackholeSound`; on teardown call `removeBlackholeEffect` or `removeMagneticTrail` to avoid orphaned meshes/audio.
- Respect animation loop invariants: `window.app.animate` already enforces auto-movement pause states and effect updates—extend via hooks rather than replacing the loop.

**Workflows & Debugging**
- Serve from repo root with `python -m http.server`; direct file:// loads will break import maps and audio autoplay permissions.
- Before investigating UI bugs, clear localStorage (`localStorage.clear()` or manually remove `ball*` entries) because persisted toggles override defaults on load.
- Use `window.app.debug` (true by default) for verbose logs; fire `window.dispatchEvent(new Event('sceneReady'))` if you hot-reload modules that rely on that signal.
- `tools/path-checker.js` and docs in `docs/path-fix.md` explain historical path issues; follow them when moving assets or scripts.

**Conventions & Guardrails**
- Keep files ASCII unless existing content proves otherwise; check GSAP swaps—every easing call must guard `window.gsap` or fall back gracefully.
- Never mutate state outside `window.app`/`uiBridge`; agents that bypass these surfaces will desync lazy scripts and UI controls.
- Cleanup order matters: stop audio (`app._blackholeSound?.stop()`, scheduler) before touching meshes or removing effects to prevent dangling WebAudio nodes.
- When introducing new toggles/effects, document them in `uiBridge.syncToggleStates()` and update related docs (`docs/audio-integration-guide.md`) so other agents inherit the contract.
