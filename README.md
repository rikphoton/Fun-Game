# 🕹️ NeonPulse Arcade

> **Hyper-Kinetic Cyberpunk Web & Desktop Arcade — Release Candidate 1 (RC1)**  
> Seven adrenaline-fueled arcade games, roguelite tech tree progression, procedural Web Audio synthwave soundtracks, local Hall of Fame, full gamepad support, centralized mobile touch controls, and Playwright automated testing.

🎮 **Play Live in Browser:** **[https://rikphoton.github.io/Fun-Game/](https://rikphoton.github.io/Fun-Game/)**

---

## 🚀 Quick Start

### 🌐 Play Online Instantly
No installation or build setup required — play directly in any desktop or mobile browser:
👉 **[https://rikphoton.github.io/Fun-Game/](https://rikphoton.github.io/Fun-Game/)**

* **Mobile PWA:** Tap **"Add to Home Screen"** on iOS Safari or Android Chrome for edge-to-edge fullscreen and offline play.
* **Desktop PWA:** Click the **Install** icon in your browser's address bar (Chrome, Edge, Brave).

---

### 💻 Local Development
Prerequisites: [Node.js](https://nodejs.org/) (v18+)

```bash
# Install dependencies
npm install

# Start local development server (Vite)
npm run dev
```

* **Windows shortcut:** Double-click [`start-game.bat`](./start-game.bat)
* **macOS / Linux shortcut:** `./start-game.sh`

Open [http://localhost:3000](http://localhost:3000) (or the port Vite prints in your console).

---

### 🧪 Automated Testing & Benchmarking

```bash
# 1. Run all 105 automated unit & regression tests (Node native test runner)
npm test

# 2. Run Playwright end-to-end browser tests (Chromium Desktop & Mobile)
npm run test:browser

# 3. Run automated performance & frame time benchmark suite
npm run benchmark
```

Tests run automatically in GitHub Actions CI on every commit before deployment. Releases are blocked if any test fails.

---

### 🖥️ Run as a Desktop App (Electron)

```bash
# Launch sandboxed desktop window loading production build
npm run desktop
```

* **Windows shortcut:** Double-click [`run-desktop.bat`](./run-desktop.bat)
* **macOS / Linux shortcut:** `./run-desktop.sh`

---

### 📦 Build Executables & Distributables

```bash
# Build web production bundle (outputs to dist/)
npm run build

# Package desktop app for your current OS:
npm run package

# Or target specific platforms:
npm run package:win    # Windows x64 (.exe in dist-desktop/)
npm run package:mac    # macOS Universal
npm run package:linux  # Linux x64
```

* **Windows shortcut:** Double-click [`build-exe.bat`](./build-exe.bat)
* **macOS / Linux shortcut:** `./build-desktop.sh`

---

## 🎮 The Seven Arcade Games

| Game | Genre | Overview & Signature Mechanics |
| :--- | :--- | :--- |
| **🛸 Cyber Survivors** | Bullet-Heaven Roguelite | Choose between 3 Mech chassis (**Specter**, **Vanguard**, **Stormweaver**). Collect gems, level up combat perks, trigger screen-clearing **Super Nova EMPs**, and survive relentless drone swarms. |
| **🚀 Neon Dash** | Gravity Rhythm Runner | High-speed runner featuring mid-air **Rocket Dashing**, gravity flips, hazard gates, and star pickups that ramp your combo multiplier up to 5x. Dynamic full-height portrait corridor. |
| **💥 Quantum Breaker** | Hyper Brick Breaker | 5 handcrafted stages (*Space Invader*, *Cyber Skull*, *Fortress*, etc.) featuring laser aim trajectory guides, explosive chain reactions, and twin laser power-ups. |
| **🌠 Astro Pulse** | Vertical Cyber Shmup | Retro vertical shooter across scrolling starfields. Pick up 5-way spread cannons, seeking micro-missiles, energy shields, and confront the multi-phase Mothership boss. |
| **🏎️ Neon Drift** | Cyber Highway Racer | Pseudo-3D Outrun-style highway racer set in Neo-Tokyo 2099. Ignite twin nitro afterburners, drift around bends, weave past cyber traffic, and rack up near-miss points. |
| **⚡ Hexa-Tron** | Lightcycle Arena | High-stakes arena combat against 3 ruthless AI cycles. Draw lethal light ribbons, deploy aerial phase jumps, boost nitro, and drop EMP trail clearers. |
| **👾 Cyber Pacman** | Cyber Maze Infiltrator | Hyper-kinetic neon maze runner. Devour encrypted data bits, collect Overclock Power Cores to turn the tables on 4 hunter drone AIs (*RedLine*, *Valkyrie*, *Glitch*, *Chaos*), and discharge screen-clearing EMP Stun Pulses. |

---

## ✨ Features & Architecture

### 📱 Centred Ergonomic Mobile Deck
* **Horizontally Centred Movement**: The primary directional input (virtual 360° joystick, 4-direction D-pad, or paddle slider) is horizontally centred on the viewport midpoint ($\le 2\text{px}$ deviation across all phone viewports from 320px to 430px).
* **Balanced Three-Zone Deck**:
  * **Left Zone**: Secondary ability (Boost, Thrust, Drift, Air Dash, Laser, Nitro).
  * **Center Zone**: Primary movement controls.
  * **Right Zone**: Special Ability (EMP, Bomb, Nova) and Primary Action (Fire, Jump, Flip, Launch).
* **Dynamic Full-Height Canvas**: Playfields expand to utilize up to 50–60% of vertical screen height with zero dead voids.
* **Full Pointer Capture Lifecycle**: Multi-touch pointer events with `setPointerCapture`, `releasePointerCapture`, and safe snapback on blur or tab backgrounding.
* **Ergonomic Settings**: Configurable joystick size (Small, Medium, Large) and vertical offset (-10px, 0px, +10px) saved to player profile.

### 🧬 Roguelite Progression & Economy
* **Neon Credits (💎 NC):** Earned naturally by blasting drones, drifting traffic, dodging hazards, and breaking bricks.
* **Cyber Lab Tech Tree:** Spend credits on permanent global upgrades (Max HP, speed, drop rates, critical damage, ability cooldowns) that persist across all games.
* **Per-Game Mastery Progression (Lv 1–10):** Earn mastery XP per game with reasonable session caps and farming safeguards; unlock specialized challenge modes (**Time Attack**, **One-Life Hardcore**, **Boss Rush**).
* **Daily Seed Challenges:** Synchronized procedural seeds derived daily for deterministic hazard and enemy layouts with daily bonus rewards.
* **Cyber Armory:** Unlock themes (**Cyberpunk**, **Vaporwave**, **Matrix**), alternate mechs, cosmetic badges, and music tracks.

### 📱 Progressive Web App (PWA) & Offline Play
* **Installable App:** Web App Manifest, high-resolution cyberpunk icon pack (512px, 512px maskable, 192px, apple-touch-icon, and favicon), and standalone display mode.
* **Service Worker Caching:** Full offline gameplay and asset precaching on HTTPS / GitHub Pages.

### 🎧 Audio & Visual Polish
* **High-DPI Retina Canvas:** Automatic pixel density scaling (clamped between 1.0x and 2.0x) for razor-sharp rendering on Retina and high-density mobile screens without frame rate drops.
* **Auto-Pause & Audio Suspend:** Automatically pauses running games and suspends audio context when switching tabs or backgrounding the browser.
* **Procedural Web Audio Engine:** Synthesizes music in real-time with zero external audio assets. Includes *Synthwave*, *Darksynth*, and *Chiptune* themes.
* **Voice Announcer:** Integrated browser text-to-speech commentary for combos, level-ups, and game-over states.
* **CRT Retro Shader:** Toggleable scanlines, CRT curve overlay, and chromatic glow.
* **Accessibility**: Reduced-motion toggle, high-contrast mode, and graphics quality profiles.

### 🕹️ Multi-Platform Controls
* **Keyboard & Mouse:** Standard WASD / Arrows with Space / Shift / E action keys. Key events prevent default page scrolling.
* **Gamepad Support:** Standard and non-standard controllers supported (PlayStation, Xbox, generic USB). Includes D-pad/hat switch axis fallbacks and controller rumble vibration feedback.
* **Touch & Canvas Steering:** Direct finger-drag steering on canvas for *Quantum Breaker* and *Neon Drift*.

---

## 📁 Project Structure

```
neon-pulse-arcade/
├── .github/workflows/
│   └── deploy.yml           # CI/CD: Automated Unit tests, Playwright tests, PWA check, Pages deployment
├── docs/
│   ├── BROWSER_COMPATIBILITY.md # Cross-browser compatibility matrix (desktop & mobile)
│   ├── PERFORMANCE.md       # Benchmark report: frame times, p95, memory, load latency
│   └── RELEASE_CHECKLIST.md # Pre-release and post-release quality checklist
├── e2e/                     # Playwright browser end-to-end tests
│   ├── games-smoke.spec.mjs # 7-game smoke, pause, resume, and return-to-hub tests
│   ├── mobile-responsiveness.spec.mjs # 7 mobile phone viewports + landscape + short screen
│   ├── touch-reliability.spec.mjs # Joystick drag, multi-touch concurrency, visibilitychange
│   └── pwa-assets.spec.mjs  # Web App Manifest & Service Worker verification
├── electron/
│   └── main.cjs             # Electron main process (sandboxed, secure file:// loader)
├── pwa/                     # PWA icons (512px, maskable, 192px, favicon, touch-icon)
├── scripts/
│   ├── benchmark-arcade.mjs # Automated performance benchmarking script
│   ├── package-desktop.mjs  # Multi-platform desktop packaging script
│   ├── verify-browser-layout.mjs # Automated live CDP browser layout measurement
│   ├── sw-template.js       # Offline service worker template
│   ├── vite-plugin-classic-script.js # Classic deferred script bundler for file://
│   └── vite-plugin-pwa-lite.js       # PWA manifest and service worker build plugin
├── src/
│   ├── engine/              # Audio, storage, display, gamepad, leaderboard, particles
│   ├── games/               # 7 individual arcade games
│   ├── main.js              # State manager, touch state lifecycle, system console, router
│   └── style.css            # Cyberpunk aesthetic, 3-zone centered mobile deck
├── tests/                   # 105 automated unit tests (node --test)
├── CHANGELOG.md             # Semantic versioning changelog
├── CONTRIBUTING.md          # Contribution guidelines & architecture rules
├── RELEASE_NOTES.md         # Release Candidate 1 announcement & highlights
├── SECURITY.md              # Security model & vulnerability reporting policy
├── index.html               # Main arcade shell and modals
├── package.json             # Scripts & dependencies
└── vite.config.js           # Single-bundle build config for web and file://
```

---

## 📚 Documentation Links
- [Changelog](CHANGELOG.md)
- [Release Notes (RC1)](RELEASE_NOTES.md)
- [Browser Compatibility Matrix](docs/BROWSER_COMPATIBILITY.md)
- [Performance Benchmark Report](docs/PERFORMANCE.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)
- [Security Policy](SECURITY.md)
- [Contributing Guide](CONTRIBUTING.md)

---

## 📜 License

MIT License. Have fun and keep the high score alive!
