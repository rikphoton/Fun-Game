# Contributing to NeonPulse Arcade

Thank you for your interest in contributing to NeonPulse Arcade!
Please review the guidelines below to help keep code quality high, tests reliable, and gameplay deterministic.

---

## 🛠️ Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/rikphoton/Fun-Game.git
   cd Fun-Game
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```

---

## 🧪 Testing Guidelines

NeonPulse Arcade enforces a strict quality gate before any code can be merged or deployed:

1. **Unit Tests**:
   ```bash
   npm test
   ```
   Runs all unit tests in `tests/` using Node's native test runner (`node --test`). All tests must pass with 0 failures.

2. **Browser Automation Tests (Playwright)**:
   ```bash
   npm run test:browser
   ```
   Runs the end-to-end Playwright suite in `e2e/` against the production build, testing game lifecycles and mobile responsiveness.

3. **Performance Benchmarking**:
   ```bash
   npm run benchmark
   ```
   Profiles startup latency, frame time metrics, and heap memory usage.

4. **Production Build**:
   ```bash
   npm run build
   ```
   Verifies that the single-bundle classic script and PWA distribution build cleanly.

---

## 📐 Architecture Principles

- **No Duplicated Systems**: Extend existing systems (`src/engine/`) instead of creating parallel state machines.
- **Fixed Timestep Physics**: Never couple game logic directly to unpredictable frame deltas; use the established $60\text{Hz}$ fixed accumulator (`dt = 1/60s`).
- **Mobile Ergonomics**: Preserve the horizontally centred primary movement arrangement below the canvas.
- **Multi-Touch Safety**: When adding touch controls, always implement proper pointer capture lifecycle (`setPointerCapture`, `releasePointerCapture`, `pointercancel`, `lostpointercapture`).
