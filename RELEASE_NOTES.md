# NeonPulse Arcade: Release Candidate 1 (RC1) Release Notes

**Target Version**: `1.0.0-rc1`  
**Date**: November 1, 2026  
**Status**: Release Candidate 1 Ready for Final Verification

---

## 🌟 Executive Summary
We are proud to announce **NeonPulse Arcade - Release Candidate 1 (RC1)**!
NeonPulse Arcade is a hyper-kinetic retro cyberpunk arcade featuring **seven complete games**, roguelite tech tree progression, procedural synthwave audio, a local Hall of Fame, desktop packaging, and a redesigned mobile touch interface.

RC1 represents the culmination of comprehensive quality assurance, automated browser testing, mobile ergonomics redesign, and performance benchmarking.

---

## 🚀 Key Highlights in RC1

### 1. Centred Ergonomic Mobile Layout
- **Horizontally Centred Movement**: The primary directional input (virtual 360° joystick, 4-direction D-pad, or paddle slider) is horizontally centred on the viewport midpoint ($\le 2\text{px}$ deviation across phone screens from 320px to 430px).
- **Balanced Three-Zone Deck**:
  - **Left**: Secondary ability (Boost, Thrust, Drift, Air Dash, Laser, Nitro).
  - **Center**: Primary movement controls.
  - **Right**: Special Ability (EMP, Bomb, Nova) and Primary Action (Fire, Jump, Flip, Launch).
- **Zero Dead Space**: Mobile canvases now dynamically utilize up to 50–60% of vertical phone height with zero black voids.
- **Configurable Joystick Settings**: Players can choose Small, Medium, or Large joystick sizes, and adjust vertical deck offset (-10px, 0px, +10px) in the Settings Console.

### 2. Multi-Touch Pointer Capture Lifecycle
- Full implementation of `setPointerCapture`, `releasePointerCapture`, `pointerup`, `pointercancel`, and `lostpointercapture`.
- Independent multi-touch pointer tracking ensures holding a direction while tapping or holding action buttons never drops inputs or leaves stuck keys.
- Automatic neutral snapback on backgrounding, phone locking, or entering the pause menu.

### 3. Automated Browser Testing (Playwright)
- Dedicated `npm run test:browser` suite evaluating Chromium Desktop and Mobile viewports.
- Automated testing covers game launching, mission briefing modals, active canvas drawing, pause/resume lifecycles, and return-to-hub routing for all seven games.
- Visual failure screenshots and diagnostic traces automatically captured.

### 4. Lean Performance & Deterministic Physics
- **Ultra-Lean Memory**: In-game JS heap usage sits between **2.05 MB and 2.87 MB** across all seven games.
- **Instant Game Startup**: Game initialization time measured at $\le 1.0\text{ms}$.
- **Decoupled Physics**: Deterministic $60\text{Hz}$ fixed-timestep physics loop ensures uniform gameplay mechanics across high-refresh displays (90Hz, 120Hz, 144Hz).

### 5. High-Resolution PWA Asset Integration
- Modernized icon pack including 512px, 512px maskable, 192px, apple-touch-icon, and favicon.
- Precached offline service worker with deterministic versioned cache invalidation.

---

## 🕹️ The Seven Games
1. **Cyber Survivors** (Bullet-Heaven Roguelite)
2. **Neon Dash** (Gravity Rhythm Runner)
3. **Quantum Breaker** (Hyper Brick Breaker)
4. **Astro Pulse** (Vertical Cyber Shmup)
5. **Neon Drift** (Cyber Highway Racer)
6. **Hexa-Tron** (Lightcycle Arena Combat)
7. **Cyber Pacman** (Cyberpunk Maze Infiltrator)

---

## 🧪 Verification Matrix
- **Unit Tests**: 105 passed, 0 failed (`npm test`).
- **Browser E2E Tests**: 32 passed, 0 failed across desktop & mobile projects (`npm run test:browser`).
- **Live Layout CDP Tests**: 49 passed, 0 failed across all 7 games × 7 viewports.
- **Production Build**: Clean single-bundle build with classic deferred script for `file://` compatibility (`npm run build` in <800ms).
