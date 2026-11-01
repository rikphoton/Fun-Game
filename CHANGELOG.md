# Changelog

All notable changes to the **NeonPulse Arcade** project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0-rc1] - 2026-11-01

### Added
- **Automated Browser Testing Suite (Playwright)**:
  - Added Playwright configuration in `playwright.config.mjs` with Chromium Desktop and Chromium Mobile projects.
  - Added `npm run test:browser` command.
  - Implemented 44 browser test cases across `e2e/games-smoke.spec.mjs`, `e2e/mobile-responsiveness.spec.mjs`, `e2e/touch-reliability.spec.mjs`, and `e2e/pwa-assets.spec.mjs`.
  - Automatic failure screenshot capture in `test-results/`.
- **Automated Performance Benchmark Suite**:
  - Added `scripts/benchmark-arcade.mjs` and `npm run benchmark` command profiling startup time, frame times, p95, and heap memory usage.
  - Generated `benchmark-results.json` and `docs/PERFORMANCE.md`.
- **PWA High-Resolution Asset Bundle**:
  - Integrated 512px icon, 512px maskable icon, 192px icon, apple touch icon, favicon-16, and favicon.ico from `pwa/`.
  - Automatic asset copying and manifest emission in `scripts/vite-plugin-pwa-lite.js`.
- **Comprehensive Release Documentation**:
  - Added `docs/BROWSER_COMPATIBILITY.md`, `docs/PERFORMANCE.md`, `docs/RELEASE_CHECKLIST.md`.
  - Added `CHANGELOG.md`, `RELEASE_NOTES.md`, `CONTRIBUTING.md`, `SECURITY.md`.
- **Enhanced CI/CD Deployment Pipeline**:
  - Updated `.github/workflows/deploy.yml` with 2-stage verification: automated unit tests, Playwright browser suite, PWA asset verification, diagnostics upload, and conditional deployment.

### Changed
- **Mobile Ergonomics & Centered Primary Controls**:
  - Horizontally centred primary movement controls (360° virtual joystick, 4-way D-pad, paddle slider) docked below the canvas with $\le 2\text{px}$ deviation across all phone viewports (320px–430px).
  - Balanced 3-zone layout: Left (Secondary ability), Center (Primary movement), Right (Action & Super triggers).
  - Configurable joystick sizing (`small`, `medium`, `large`) and vertical offsets (`-10px`, `0px`, `+10px`) in Settings Console.
- **Full Pointer Capture Lifecycle**:
  - Hardened `setPointerCapture` and `releasePointerCapture` across all touch controls with listeners on `pointercancel` and `lostpointercapture`.
  - Implemented `this.resetTouchState()` clearing all active pointer sets and key states on `blur`, `pagehide`, `pause`, and `visibilitychange`.
- **Corridor & Playfield Scaling**:
  - Adjusted `neonDash.portraitDims` to 600×800 and updated `setDimensions` to dynamically compute floor (80%) and ceiling (20%) boundaries.

### Fixed
- Fixed silent fallback to 800×600 in mobile portrait games by auditing all seven entries in `src/engine/gamesRegistry.js`.
- Fixed multi-touch concurrency race conditions by maintaining independent `Set` collections for active pointer IDs.
- Fixed stuck inputs on tab backgrounding by invoking `this.resetTouchState()` on `visibilitychange`.

---

## [0.9.0] - 2026-10-31

### Added
- Per-game mastery progression (Lv 1–10) with challenge mode pickers (Time Attack, One-Life, Boss Rush).
- Local Hall of Fame tie-breaking, demo score clearing, and initials entry screen.
- Procedural daily seed challenge generator.
- Telemetry console and keybindings remapping interface.

---

## [0.8.0] - 2026-10-26

### Added
- Cyber Pacman (7th arcade game) with 4 distinct ghost AI personalities.
- Procedural Web Audio synthwave synthesizer.
- PWA service worker offline caching.
- Electron desktop wrapper with secure sandboxed renderer.
