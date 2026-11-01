# NeonPulse Arcade: Release Candidate & Final Release Checklist

## 1. Release Candidate 1 (RC1) Checklist

### Automated Testing & Quality Gates
- [x] All 105 Node native unit tests pass (`npm test`).
- [x] All 32 Playwright E2E browser tests pass across desktop and mobile viewports (`npm run test:browser`).
- [x] Automated performance benchmark suite completes with zero errors (`npm run benchmark`).
- [x] Live Chromium CDP layout tests pass across 49 game-viewport permutations with $\le 2\text{px}$ deviation.
- [x] Production build passes cleanly with Vite v6.4.3 in $< 1\text{s}$ (`npm run build`).

### Mobile & Touch Ergonomics
- [x] Primary movement controls horizontally centred within $\le 2\text{px}$ of viewport midpoint on all phone screen sizes (320px–430px).
- [x] Three-zone balanced touch deck layout (Left: Secondary, Center: Primary movement, Right: Action & Super triggers).
- [x] Full pointer capture lifecycle implemented on all interactive touch controls (`pointerdown`, `pointerup`, `pointercancel`, `lostpointercapture`).
- [x] Configurable joystick size (`small`, `medium`, `large`) and vertical offset (`-10px`, `0px`, `+10px`) in Settings.
- [x] Canvas dynamically utilizes available viewport height with zero vertical voids.
- [x] Zero horizontal page overflow across all tested viewports.

### PWA & Offline Readiness
- [x] Valid `manifest.webmanifest` with `name`, `short_name`, `theme_color`, and `start_url`.
- [x] High-resolution icon pack integrated: 192px, 512px, 512px maskable, apple-touch-icon, and favicon.
- [x] Service worker registers cleanly in production build and precaches app shell for offline play.
- [x] Asset cache invalidates deterministically across new version builds.

### Desktop & Security
- [x] Electron sandboxed main process configured with `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true`.
- [x] Single-bundle classic script architecture allows execution from `file://` protocol.
- [x] External hyperlink interception prevents untrusted navigation.

### CI/CD & Deployment
- [x] GitHub Actions workflow runs unit tests, Playwright tests, production build, PWA verification, and uploads diagnostic artifacts.
- [x] Failed test runs strictly block deployment to GitHub Pages.

---

## 2. Post-RC1 Final Release Roadmap
1. **Physical Device Feedback**: Verify touch feedback on representative physical Android (Samsung OneUI, Pixel) and iOS (Safari PWA) hardware.
2. **Release Tagging**: Create git tag `v1.0.0-rc1` and `v1.0.0`.
3. **Rollback Safety**: Preserve prior deployment history in GitHub Pages.
