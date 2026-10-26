# 🕹️ NeonPulse Arcade

> **Hyper-Kinetic Cyberpunk Web & Desktop Arcade**  
> Six adrenaline-fueled arcade games, roguelite tech tree progression, procedural Web Audio synthwave soundtracks, local Hall of Fame, full gamepad support, and responsive mobile arcade controls.

🎮 **Play Live in Browser:** **[https://rikphoton.github.io/Fun-Game/](https://rikphoton.github.io/Fun-Game/)**

---

## 🚀 Quick Start

### 🌐 Play Online Instantly
No installation or build setup required — play directly in any desktop or mobile browser:
👉 **[https://rikphoton.github.io/Fun-Game/](https://rikphoton.github.io/Fun-Game/)**

* **Mobile PWA:** Tap **"Add to Home Screen"** on iOS Safari or Android Chrome for edge-to-edge fullscreen and offline play.
* **Desktop PWA:** Click the **Install** icon in your browser's address bar (Chrome, Edge, Brave).

---

### 💻 Local Development (Web Dev Server)
Prerequisites: [Node.js](https://nodejs.org/) (v18+)

```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

* **Windows shortcut:** Double-click [`start-game.bat`](./start-game.bat)
* **macOS / Linux shortcut:** `./start-game.sh`

Open [http://localhost:3000](http://localhost:3000) (or the port Vite prints in your console).

---

### 🧪 Run Automated Tests

```bash
# Run all 45 automated unit tests (using Node's native test runner)
npm test
```

Tests run automatically in GitHub Actions CI on every commit before deployment.

---

### 🖥️ Run as a Desktop App (Electron)

```bash
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

## 🎮 The Games

| Game | Genre | Overview & Signature Mechanics |
| :--- | :--- | :--- |
| **🛸 Cyber Survivors** | Bullet-Heaven Roguelite | Choose between 3 Mech chassis (**Specter**, **Vanguard**, **Stormweaver**). Collect gems, level up combat perks, trigger screen-clearing **Super Nova EMPs**, and survive relentless drone swarms. |
| **🚀 Neon Dash** | Gravity Rhythm Runner | High-speed runner featuring mid-air **Rocket Dashing**, gravity flips, hazard gates, and star pickups that ramp your combo multiplier up to 5x. |
| **💥 Quantum Breaker** | Hyper Brick Breaker | 5 handcrafted stages (*Space Invader*, *Cyber Skull*, *Fortress*, etc.) featuring laser aim trajectory guides, explosive chain reactions, and twin laser power-ups. |
| **🌠 Astro Pulse** | Vertical Cyber Shmup | Retro vertical shooter across scrolling starfields. Pick up 5-way spread cannons, seeking micro-missiles, energy shields, and confront the Mothership boss. |
| **🏎️ Neon Drift** | Cyber Highway Racer | Pseudo-3D Outrun-style highway racer set in Neo-Tokyo 2099. Ignite twin nitro afterburners, drift around bends, weave past cyber traffic, and rack up near-miss points. |
| **⚡ Hexa-Tron** | Lightcycle Arena | High-stakes arena combat against 3 ruthless AI cycles. Draw lethal light ribbons, deploy aerial phase jumps, boost nitro, and drop EMP trail clearers. |

---

## ✨ Features & Architecture

### 🧬 Roguelite Progression & Economy
* **Neon Credits (💎 NC):** Earned naturally by blasting drones, drifting traffic, dodging hazards, and breaking bricks.
* **Cyber Lab Tech Tree:** Spend credits on permanent global upgrades (Max HP, speed, drop rates, critical damage, ability cooldowns) that persist across all games.
* **Daily Bounties & Quests:** Rotating daily challenges with substantial credit rewards.
* **Cyber Armory:** Unlock themes (**Cyberpunk**, **Vaporwave**, **Matrix**), alternate mechs, cosmetic badges, and music tracks.

### 📱 Progressive Web App (PWA) & Offline Play
* **Installable App:** Manifest, custom cyberpunk icons (192px, 512px, maskable), and standalone display mode.
* **Service Worker Caching:** Full offline gameplay and asset precaching on HTTPS / GitHub Pages.

### 🎧 Audio & Visual Polish
* **High-DPI Retina Canvas:** Automatic pixel density scaling (up to 2x) for razor-sharp rendering on Retina/mobile screens.
* **Auto-Pause & Audio Suspend:** Automatically pauses running games and suspends audio context when switching tabs or backgrounding the browser.
* **Procedural Web Audio Engine:** Synthesizes music in real-time with zero external audio assets. Includes *Synthwave*, *Darksynth*, and *Chiptune* themes.
* **Voice Announcer:** Integrated browser text-to-speech commentary for combos, level-ups, and game-over states.
* **CRT Retro Shader:** Toggleable scanlines, CRT curve overlay, and chromatic glow.
* **Particle & Shake Systems:** Optimized high-density particle bursts, floating damage numbers, and camera impacts.

### 🕹️ Multi-Platform Controls
* **Keyboard & Mouse:** Standard WASD / Arrows with Space / Shift / E action keys. Key events prevent default page scrolling.
* **Gamepad Support:** Standard and non-standard controllers supported (PlayStation, Xbox, generic USB). Includes D-pad/hat switch axis fallbacks and controller rumble vibration feedback.
* **Mobile Arcade Deck:** Dedicated, ergonomic on-screen touch D-pad and tactile action clusters designed specifically for portrait and landscape mobile screens.
* **Canvas Touch Steering:** Drag/slide directly on the canvas for fluid mobile navigation.

### 🏆 Hall of Fame & Achievements
* **Local Arcade Hall of Fame:** High scores are saved to `localStorage` per game with a classic 3-letter arcade initials entry screen.
* **Trophy Room:** Comprehensive achievement system with real-time HUD notification toasts.

---

## 📁 Project Structure

```
neon-pulse-arcade/
├── .github/workflows/
│   └── deploy.yml           # GitHub Actions CI (runs tests & deploys to GitHub Pages)
├── electron/
│   └── main.cjs             # Electron main process (sandboxed, secure file:// loader)
├── pwa/                     # PWA icons (192px, 512px, maskable, favicon, touch-icon)
├── scripts/
│   ├── package-desktop.mjs  # Multi-platform desktop packaging script
│   ├── sw-template.js       # Offline service worker template
│   ├── vite-plugin-classic-script.js # Classic deferred script bundler for file://
│   └── vite-plugin-pwa-lite.js       # PWA manifest and service worker build plugin
├── src/
│   ├── engine/
│   │   ├── audio.js         # Procedural synthwave Web Audio synthesizer
│   │   ├── compat.js        # Canvas roundRect polyfill & fullscreen API fallbacks
│   │   ├── display.js       # High-DPI Retina backing store scaler
│   │   ├── gamepad.js       # Gamepad polling, mapping normalizer & rumble
│   │   ├── leaderboard.js   # Local Hall of Fame storage & high-score logic
│   │   ├── particles.js     # Particle physics & camera screen-shake engine
│   │   └── storage.js       # Save management (credits, quests, upgrades, armory)
│   ├── games/
│   │   ├── astroPulse.js    # Vertical cyber shmup
│   │   ├── cyberSurvivors.js# Bullet-heaven roguelite
│   │   ├── hexaTron.js      # Lightcycle arena combat
│   │   ├── neonDash.js      # Gravity runner
│   │   ├── neonDrift.js     # Pseudo-3D highway racer
│   │   └── quantumBreaker.js# Handcrafted brick breaker
│   ├── main.js              # State manager, UI modals, game loop router
│   └── style.css            # Cyberpunk aesthetic, responsive layouts & HUD
├── tests/                   # 45 automated unit tests (node --test)
├── build-desktop.sh         # macOS/Linux desktop build helper
├── build-exe.bat            # Windows .exe builder helper
├── index.html               # Main arcade shell and modals
├── package.json             # Scripts & dependencies
├── run-desktop.bat          # Windows desktop launcher helper
├── run-desktop.sh           # macOS/Linux desktop launcher helper
├── start-game.bat           # Windows dev server launcher
├── start-game.sh            # macOS/Linux dev server launcher
└── vite.config.js           # Single-bundle build config for web and file://
```

---

## 🛠️ Technology Stack

* **Rendering:** Vanilla HTML5 2D Canvas with High-DPI scaling
* **Build System:** [Vite 6](https://vitejs.dev/) with classic deferred script bundling for `file://` compatibility
* **PWA:** Web App Manifest + Service Worker offline asset cache
* **Desktop Wrapper:** [Electron 36](https://www.electronjs.org/) + `@electron/packager`
* **Audio:** Web Audio API (Synthesized oscillators, filters, gain nodes) + Web Speech API
* **Testing:** Node.js native test runner (`node --test`)
* **Fonts:** Google Fonts (*Outfit*, *Share Tech Mono*)

---

## 📜 License

MIT License. Have fun and keep the high score alive!
