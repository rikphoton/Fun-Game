// NeonPulse Arcade Main Orchestrator - Ultra Arcade Edition
import { sound } from './engine/audio.js';
import { ParticleSystem } from './engine/particles.js';
import { storage } from './engine/storage.js';
import { CyberSurvivorsGame } from './games/cyberSurvivors.js';
import { NeonDashGame } from './games/neonDash.js';
import { QuantumBreakerGame } from './games/quantumBreaker.js';
import { AstroPulseGame } from './games/astroPulse.js';
import { NeonDriftGame } from './games/neonDrift.js';

class ArcadeApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = new ParticleSystem();

    this.activeGameKey = null;
    this.activeGame = null;
    this.selectedMech = storage.getEquipped('mech') || 'specter';
    this.lastTime = performance.now();
    this.isPaused = false;

    this.initDOMElements();
    this.applyCabinetTheme(storage.getEquipped('theme') || 'cyberpunk');
    this.initGames();
    this.bindEvents();
    this.updateLobbyScores();
    this.updateCreditsDisplay();

    // Storage Event Listeners
    storage.onAchievementUnlock = (ach) => this.showAchievementToast(ach);
    storage.onCreditsChange = () => this.updateCreditsDisplay();
    storage.onQuestUpdate = () => this.renderQuests();

    requestAnimationFrame((t) => this.loop(t));
  }

  initDOMElements() {
    this.lobbyView = document.getElementById('lobby-view');
    this.gameView = document.getElementById('game-view');

    // Header Controls
    this.headerCredits = document.getElementById('header-credits');
    this.btnOpenQuests = document.getElementById('btn-open-quests');
    this.btnOpenLab = document.getElementById('btn-open-lab');
    this.btnOpenArmory = document.getElementById('btn-open-armory');
    this.btnOpenArmoryBadge = document.getElementById('btn-open-armory-badge');
    this.btnOpenAudio = document.getElementById('btn-open-audio');
    this.btnCrt = document.getElementById('btn-toggle-crt');
    this.btnAchievements = document.getElementById('btn-open-achievements');
    this.btnFullscreen = document.getElementById('btn-toggle-fullscreen');
    this.btnHomeLogo = document.getElementById('btn-home-logo');
    this.btnBackToHub = document.getElementById('btn-back-to-hub');
    this.btnPause = document.getElementById('btn-pause-game');

    // HUD
    this.hudGameName = document.getElementById('hud-game-name');
    this.hudScore = document.getElementById('hud-score');
    this.hudSecondary = document.getElementById('hud-secondary-stat');
    this.hudSuperContainer = document.getElementById('hud-super-container');
    this.btnSuperAbility = document.getElementById('btn-super-ability');
    this.hudSuperFill = document.getElementById('hud-super-fill');
    this.hudSuperText = document.getElementById('hud-super-text');
    this.hudHpContainer = document.getElementById('hud-hp-container');
    this.hudHpFill = document.getElementById('hud-hp-fill');
    this.instructionsEl = document.getElementById('game-instructions');

    // Modals
    this.modalLab = document.getElementById('modal-lab');
    this.labCreditsDisplay = document.getElementById('lab-credits-display');
    this.labUpgradesList = document.getElementById('lab-upgrades-list');
    this.btnCloseLab = document.getElementById('btn-close-lab');

    this.modalQuests = document.getElementById('modal-quests');
    this.questCreditsDisplay = document.getElementById('quest-credits-display');
    this.questsList = document.getElementById('quests-list');
    this.btnCloseQuests = document.getElementById('btn-close-quests');

    this.modalMechSelect = document.getElementById('modal-mech-select');
    this.btnLaunchMech = document.getElementById('btn-launch-mech');
    this.btnCancelMech = document.getElementById('btn-cancel-mech');

    this.modalArmory = document.getElementById('modal-armory');
    this.shopCreditsDisplay = document.getElementById('shop-credits-display');
    this.tabTrails = document.getElementById('tab-trails');
    this.tabThemes = document.getElementById('tab-themes');
    this.shopTrailsList = document.getElementById('shop-trails-list');
    this.shopThemesList = document.getElementById('shop-themes-list');
    this.btnCloseArmory = document.getElementById('btn-close-armory');

    this.modalAudio = document.getElementById('modal-audio');
    this.sliderBgm = document.getElementById('slider-bgm');
    this.sliderSfx = document.getElementById('slider-sfx');
    this.valBgm = document.getElementById('val-bgm');
    this.valSfx = document.getElementById('val-sfx');
    this.checkAnnouncer = document.getElementById('check-announcer');
    this.btnCloseAudio = document.getElementById('btn-close-audio');

    this.modalUpgrade = document.getElementById('modal-upgrade');
    this.upgradeCardsContainer = document.getElementById('upgrade-cards');

    this.modalGameOver = document.getElementById('modal-game-over');
    this.goTitle = document.getElementById('go-title');
    this.goSubtitle = document.getElementById('go-subtitle');
    this.goStats = document.getElementById('go-stats');
    this.btnRestart = document.getElementById('btn-restart-game');
    this.btnGoHub = document.getElementById('btn-go-hub');

    this.modalPause = document.getElementById('modal-pause');
    this.btnResume = document.getElementById('btn-resume-game');
    this.btnPauseHub = document.getElementById('btn-pause-hub');

    this.modalAchievements = document.getElementById('modal-achievements');
    this.achievementsList = document.getElementById('achievements-list');
    this.btnCloseAchievements = document.getElementById('btn-close-achievements');
    this.toastContainer = document.getElementById('toast-container');
  }

  initGames() {
    this.games = {
      cyberSurvivors: new CyberSurvivorsGame(this.canvas, this.particles, {
        onGameOver: (data) => this.handleGameOver(data),
        onScoreUpdate: (score, level, hp, maxHp, superPercent) => {
          this.hudScore.textContent = score;
          this.hudSecondary.innerHTML = `LVL: <span>${level}</span>`;
          if (this.hudHpFill) {
            this.hudHpFill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
          }
          if (this.hudSuperFill) {
            this.hudSuperFill.style.width = `${superPercent}%`;
            this.hudSuperText.textContent = superPercent >= 100 ? 'READY!' : `${superPercent}%`;
            this.btnSuperAbility.classList.toggle('ready', superPercent >= 100);
          }
        },
        onLevelUpChoice: (cards, onSelect) => this.showUpgradeModal(cards, onSelect)
      }),

      neonDash: new NeonDashGame(this.canvas, this.particles, {
        onGameOver: (data) => this.handleGameOver(data),
        onScoreUpdate: (score, distance, stars, multiplier) => {
          this.hudScore.textContent = score;
          storage.recordDistance(distance);
          const multiText = multiplier > 1 ? ` | <span style="color:#ffe600;font-weight:900;">${multiplier}x STREAK</span>` : '';
          this.hudSecondary.innerHTML = `DIST: <span>${distance}m</span> | ⭐ <span>${stars}</span>${multiText}`;
        }
      }),

      quantumBreaker: new QuantumBreakerGame(this.canvas, this.particles, {
        onGameOver: (data) => this.handleGameOver(data),
        onScoreUpdate: (score, lives, combo, stage) => {
          this.hudScore.textContent = score;
          this.hudSecondary.innerHTML = `LIVES: <span>${'❤️'.repeat(Math.max(0, lives))}</span> | STAGE: <span>${stage}/5</span> | COMBO: <span>${combo}x</span>`;
        }
      }),

      astroPulse: new AstroPulseGame(this.canvas, this.particles, {
        onGameOver: (data) => this.handleGameOver(data),
        onScoreUpdate: (score, weaponLvl, hp, maxHp) => {
          this.hudScore.textContent = score;
          this.hudSecondary.innerHTML = `GUN: <span>TIER ${weaponLvl}</span>`;
          if (this.hudHpFill) {
            this.hudHpFill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
          }
        }
      }),

      neonDrift: new NeonDriftGame(this.canvas, this.particles, {
        onGameOver: (data) => this.handleGameOver(data),
        onScoreUpdate: (score, distance, speed, nitroPercent, hp, maxHp) => {
          this.hudScore.textContent = score;
          this.hudSecondary.innerHTML = `SPEED: <span>${speed} KM/H</span> | DIST: <span>${distance}M</span>`;
          if (this.hudSuperFill) {
            this.hudSuperFill.style.width = `${nitroPercent}%`;
            this.hudSuperText.textContent = nitroPercent >= 100 ? 'NITRO MAX!' : `NITRO: ${nitroPercent}%`;
            this.btnSuperAbility.classList.toggle('ready', nitroPercent >= 50);
          }
          if (this.hudHpFill) {
            this.hudHpFill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
          }
        }
      })
    };
  }

  updateLobbyScores() {
    const sScore = storage.getHighScore('cyberSurvivors');
    const dScore = storage.getHighScore('neonDash');
    const bScore = storage.getHighScore('quantumBreaker');
    const aScore = storage.getHighScore('astroPulse');
    const rScore = storage.getHighScore('neonDrift');

    const sEl = document.getElementById('best-score-survivors');
    const dEl = document.getElementById('best-score-dash');
    const bEl = document.getElementById('best-score-breaker');
    const aEl = document.getElementById('best-score-shmup');
    const rEl = document.getElementById('best-score-drift');

    if (sEl) sEl.textContent = `${sScore.toLocaleString()} PTS`;
    if (dEl) dEl.textContent = `${dScore.toLocaleString()} M`;
    if (bEl) bEl.textContent = `${bScore.toLocaleString()} PTS`;
    if (aEl) aEl.textContent = `${aScore.toLocaleString()} PTS`;
    if (rEl) rEl.textContent = `${rScore.toLocaleString()} PTS`;
  }

  updateCreditsDisplay() {
    const credits = storage.getCredits();
    if (this.headerCredits) this.headerCredits.textContent = credits.toLocaleString();
    if (this.shopCreditsDisplay) this.shopCreditsDisplay.textContent = credits.toLocaleString();
    if (this.labCreditsDisplay) this.labCreditsDisplay.textContent = credits.toLocaleString();
    if (this.questCreditsDisplay) this.questCreditsDisplay.textContent = credits.toLocaleString();
  }

  applyCabinetTheme(theme) {
    document.body.className = `theme-${theme}`;
    if (!storage.getSetting('crtFilter')) {
      document.body.classList.add('crt-off');
    }
  }

  bindEvents() {
    // Fullscreen Toggle
    this.btnFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Cyber Lab Modal
    this.btnOpenLab.addEventListener('click', () => {
      sound.init();
      this.renderCyberLab();
      this.modalLab.style.display = 'flex';
    });
    this.btnCloseLab.addEventListener('click', () => {
      this.modalLab.style.display = 'none';
    });

    // Daily Quests Modal
    this.btnOpenQuests.addEventListener('click', () => {
      sound.init();
      this.renderQuests();
      this.modalQuests.style.display = 'flex';
    });
    this.btnCloseQuests.addEventListener('click', () => {
      this.modalQuests.style.display = 'none';
    });

    // Audio Modal
    this.btnOpenAudio.addEventListener('click', () => {
      sound.init();
      this.sliderBgm.value = sound.bgmVolume * 100;
      this.sliderSfx.value = sound.sfxVolume * 100;
      this.valBgm.textContent = `${Math.round(sound.bgmVolume * 100)}%`;
      this.valSfx.textContent = `${Math.round(sound.sfxVolume * 100)}%`;
      this.checkAnnouncer.checked = storage.getSetting('announcerEnabled') !== false;
      this.modalAudio.style.display = 'flex';
    });

    this.btnCloseAudio.addEventListener('click', () => {
      this.modalAudio.style.display = 'none';
    });

    this.sliderBgm.addEventListener('input', (e) => {
      const val = e.target.value / 100;
      sound.setBgmVolume(val);
      this.valBgm.textContent = `${e.target.value}%`;
      storage.setSetting('bgmVolume', val);
    });

    this.sliderSfx.addEventListener('input', (e) => {
      const val = e.target.value / 100;
      sound.setSfxVolume(val);
      this.valSfx.textContent = `${e.target.value}%`;
      storage.setSetting('sfxVolume', val);
    });

    this.checkAnnouncer.addEventListener('change', (e) => {
      storage.setSetting('announcerEnabled', e.target.checked);
      if (e.target.checked) sound.announce('Announcer Active');
    });

    document.querySelectorAll('.track-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.track-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const track = btn.dataset.track;
        storage.setSetting('bgmTrack', track);
        sound.startBgm(track);
      });
    });

    // CRT Toggle
    this.btnCrt.addEventListener('click', () => {
      document.body.classList.toggle('crt-off');
      const isOff = document.body.classList.contains('crt-off');
      storage.setSetting('crtFilter', !isOff);
      this.btnCrt.textContent = `📺 CRT: ${isOff ? 'OFF' : 'ON'}`;
    });

    // Cyber Armory Shop
    const openArmory = () => {
      sound.init();
      this.renderArmory();
      this.modalArmory.style.display = 'flex';
    };
    this.btnOpenArmory.addEventListener('click', openArmory);
    this.btnOpenArmoryBadge.addEventListener('click', openArmory);
    this.btnCloseArmory.addEventListener('click', () => {
      this.modalArmory.style.display = 'none';
    });

    this.tabTrails.addEventListener('click', () => {
      this.tabTrails.classList.add('active');
      this.tabThemes.classList.remove('active');
      this.shopTrailsList.style.display = 'grid';
      this.shopThemesList.style.display = 'none';
    });

    this.tabThemes.addEventListener('click', () => {
      this.tabThemes.classList.add('active');
      this.tabTrails.classList.remove('active');
      this.shopTrailsList.style.display = 'none';
      this.shopThemesList.style.display = 'grid';
    });

    // Trophies Modal
    this.btnAchievements.addEventListener('click', () => this.openAchievementsModal());
    this.btnCloseAchievements.addEventListener('click', () => {
      this.modalAchievements.style.display = 'none';
    });

    // Cyber Survivors Mech Chooser
    document.getElementById('btn-play-survivors').addEventListener('click', () => {
      this.modalMechSelect.style.display = 'flex';
    });

    document.querySelectorAll('.mech-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mech-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedMech = card.dataset.mech;
        storage.equipItem('mech', this.selectedMech);
      });
    });

    this.btnLaunchMech.addEventListener('click', () => {
      this.modalMechSelect.style.display = 'none';
      this.launchGame('cyberSurvivors', this.selectedMech);
    });

    this.btnCancelMech.addEventListener('click', () => {
      this.modalMechSelect.style.display = 'none';
    });

    // Play Buttons for other games
    document.getElementById('btn-play-dash').addEventListener('click', () => this.launchGame('neonDash'));
    document.getElementById('btn-play-breaker').addEventListener('click', () => this.launchGame('quantumBreaker'));
    document.getElementById('btn-play-shmup').addEventListener('click', () => this.launchGame('astroPulse'));
    const btnPlayDrift = document.getElementById('btn-play-drift');
    if (btnPlayDrift) btnPlayDrift.addEventListener('click', () => this.launchGame('neonDrift'));

    // Navigation & Pause
    this.btnHomeLogo.addEventListener('click', () => this.returnToHub());
    this.btnBackToHub.addEventListener('click', () => this.returnToHub());
    this.btnPause.addEventListener('click', () => this.togglePause());
    this.btnResume.addEventListener('click', () => this.togglePause());
    this.btnPauseHub.addEventListener('click', () => {
      this.modalPause.style.display = 'none';
      this.returnToHub();
    });

    // Super Ability Button Click (HUD)
    this.btnSuperAbility.addEventListener('click', () => {
      if (this.activeGame && this.activeGame.triggerSuperAbility) {
        this.activeGame.triggerSuperAbility();
      }
      if (this.activeGame && this.activeGame.triggerBomb) {
        this.activeGame.triggerBomb();
      }
    });

    // Game Over Buttons
    this.btnRestart.addEventListener('click', () => {
      this.modalGameOver.style.display = 'none';
      if (this.activeGameKey) this.launchGame(this.activeGameKey, this.selectedMech);
    });
    this.btnGoHub.addEventListener('click', () => {
      this.modalGameOver.style.display = 'none';
      this.returnToHub();
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (this.activeGame && this.activeGame.isRunning) {
          this.togglePause();
          return;
        }
      }
      if (this.activeGame && this.activeGame.handleKeyDown) {
        this.activeGame.handleKeyDown(e.code);
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.activeGame && this.activeGame.handleKeyUp) {
        this.activeGame.handleKeyUp(e.code);
      }
    });

    window.addEventListener('blur', () => {
      if (this.activeGame) {
        this.activeGame.keys = {};
        if (this.activeGame.pointer) this.activeGame.pointer.active = false;
      }
    });

    // Pointer Events on Canvas
    const getCanvasPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    this.canvas.addEventListener('mousemove', (e) => {
      const pos = getCanvasPos(e);
      if (this.activeGame && this.activeGame.handlePointerMove) {
        this.activeGame.handlePointerMove(pos.x, pos.y);
      }
    });

    this.canvas.addEventListener('mousedown', (e) => {
      sound.init();
      const pos = getCanvasPos(e);
      if (this.activeGame && this.activeGame.handlePointerDown) {
        this.activeGame.handlePointerDown(pos.x, pos.y);
      }
    });

    this.canvas.addEventListener('mouseup', () => {
      if (this.activeGame && this.activeGame.handlePointerUp) {
        this.activeGame.handlePointerUp();
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      sound.init();
      const pos = getCanvasPos(e);
      if (this.activeGame && this.activeGame.handlePointerDown) {
        this.activeGame.handlePointerDown(pos.x, pos.y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const pos = getCanvasPos(e);
      if (this.activeGame && this.activeGame.handlePointerMove) {
        this.activeGame.handlePointerMove(pos.x, pos.y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (this.activeGame && this.activeGame.handlePointerUp) {
        this.activeGame.handlePointerUp();
      }
    }, { passive: false });

    // Mobile Action Buttons
    const btnTouchA = document.getElementById('touch-action-a');
    const btnTouchSuper = document.getElementById('touch-super-btn');

    btnTouchA.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.activeGame && this.activeGame.handleAction) this.activeGame.handleAction();
      if (this.activeGame && this.activeGame.fireLaser) this.activeGame.fireLaser();
    });

    btnTouchSuper.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.activeGame && this.activeGame.triggerSuperAbility) {
        this.activeGame.triggerSuperAbility();
      }
      if (this.activeGame && this.activeGame.triggerBomb) {
        this.activeGame.triggerBomb();
      }
    });
  }

  // --- CYBER LAB TECH TREE RENDERER ---

  renderCyberLab() {
    this.updateCreditsDisplay();
    const labItems = [
      { id: 'hull', name: 'Hull Plating', desc: '+20 Max HP in Cyber Survivors & Astro Pulse', costs: [75, 150, 300], icon: '🛡️' },
      { id: 'thrusters', name: 'Sub-Light Thrusters', desc: '+10% Speed boost across all games', costs: [75, 150, 300], icon: '🚀' },
      { id: 'shield', name: 'Quantum Safeguard', desc: 'Start with an Energy Shield barrier in Breaker & Astro', costs: [100, 200, 400], icon: '⚡' },
      { id: 'siphon', name: 'Credit Siphon', desc: '+25% Bonus Neon Credits earned from all games', costs: [120, 240, 500], icon: '💎' }
    ];

    this.labUpgradesList.innerHTML = '';

    for (const item of labItems) {
      const currentLevel = storage.getLabLevel(item.id);
      const isMax = currentLevel >= 3;
      const nextCost = isMax ? 0 : item.costs[currentLevel];

      const card = document.createElement('div');
      card.className = 'lab-card';
      card.innerHTML = `
        <div>
          <div class="lab-card-header">
            <span class="lab-card-title">${item.icon} ${item.name}</span>
            <span class="lab-level-badge">${isMax ? 'MAX TIER' : `TIER ${currentLevel}/3`}</span>
          </div>
          <div class="lab-card-desc">${item.desc}</div>
        </div>
        <div>
          <button class="lab-upgrade-btn ${isMax ? 'maxed' : ''}">
            ${isMax ? 'COMPLETED' : `<span>UPGRADE</span><span>💎 ${nextCost} NC</span>`}
          </button>
        </div>
      `;

      if (!isMax) {
        const btn = card.querySelector('.lab-upgrade-btn');
        btn.addEventListener('click', () => {
          if (storage.upgradeLab(item.id, nextCost)) {
            sound.playVictory();
            sound.announce('Tech Upgraded!');
            this.renderCyberLab();
          } else {
            sound.playHit();
            alert('Not enough Neon Credits! Play games or complete bounties to earn more.');
          }
        });
      }

      this.labUpgradesList.appendChild(card);
    }
  }

  // --- DAILY QUESTS & BOUNTIES RENDERER ---

  renderQuests() {
    this.updateCreditsDisplay();
    const quests = storage.data.quests;
    this.questsList.innerHTML = '';

    for (const q of quests) {
      const isComplete = q.current >= q.target;
      const pct = Math.min(100, Math.floor((q.current / q.target) * 100));

      const card = document.createElement('div');
      card.className = `quest-card ${isComplete && !q.claimed ? 'ready' : ''} ${q.claimed ? 'claimed' : ''}`;
      card.innerHTML = `
        <div class="quest-info">
          <h4>${q.icon} ${q.title} ${isComplete ? (q.claimed ? '✅' : '🌟') : ''}</h4>
          <p>${q.desc}</p>
          <div class="quest-progress-track">
            <div class="quest-progress-bar" style="width: ${pct}%;"></div>
          </div>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">${q.current} / ${q.target}</span>
        </div>
        <div>
          ${q.claimed 
            ? `<span style="font-family: var(--font-mono); color: var(--neon-green); font-size: 0.9rem; font-weight:700;">CLAIMED</span>`
            : `<button class="quest-claim-btn" ${!isComplete ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
                CLAIM 💎 ${q.reward}
              </button>`
          }
        </div>
      `;

      if (isComplete && !q.claimed) {
        const btn = card.querySelector('.quest-claim-btn');
        btn.addEventListener('click', () => {
          const reward = storage.claimQuest(q.id);
          if (reward > 0) {
            sound.playVictory();
            sound.announce('Bounty Claimed!');
            this.renderQuests();
          }
        });
      }

      this.questsList.appendChild(card);
    }
  }

  // --- CYBER ARMORY CATALOG ---

  renderArmory() {
    this.updateCreditsDisplay();

    const trails = [
      { id: 'cyan', name: 'Electric Cyan', desc: 'Sleek standard pulsing cyber trail', cost: 0, color: '#00f3ff' },
      { id: 'neon_pink', name: 'Hot Pink Neon', desc: 'Vibrant cyberpunk magenta thruster glow', cost: 50, color: '#ff007b' },
      { id: 'gold', name: 'Golden Plasma', desc: 'Blazing gilded flare particles', cost: 100, color: '#ffe600' },
      { id: 'rainbow', name: 'Rainbow Prism', desc: 'Dynamic spectrum trail cycling colors', cost: 200, color: 'linear-gradient(90deg, #ff0055, #ffe600, #00ff88, #00f3ff)' }
    ];

    this.shopTrailsList.innerHTML = '';
    const equippedTrail = storage.getEquipped('trail') || 'cyan';

    for (const t of trails) {
      const owned = storage.hasItem('trails', t.id) || t.cost === 0;
      const isEquipped = equippedTrail === t.id;

      const card = document.createElement('div');
      card.className = `shop-item-card ${isEquipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div>
          <div class="shop-item-header">
            <span class="shop-item-name">${t.name}</span>
            <div style="width: 16px; height: 16px; border-radius: 50%; background: ${t.color}; box-shadow: 0 0 8px ${t.color};"></div>
          </div>
          <div class="shop-item-desc">${t.desc}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--neon-yellow);">${t.cost === 0 ? 'FREE' : `💎 ${t.cost} NC`}</span>
          <button class="shop-btn ${isEquipped ? 'equipped' : (owned ? 'equip' : 'buy')}">${isEquipped ? 'ACTIVE' : (owned ? 'EQUIP' : 'UNLOCK')}</button>
        </div>
      `;

      const btn = card.querySelector('.shop-btn');
      btn.addEventListener('click', () => {
        if (isEquipped) return;
        if (owned) {
          storage.equipItem('trail', t.id);
          sound.playPowerup();
          this.renderArmory();
        } else {
          if (storage.spendCredits(t.cost)) {
            storage.unlockItem('trails', t.id);
            storage.equipItem('trail', t.id);
            sound.playVictory();
            this.renderArmory();
          } else {
            sound.playHit();
            alert('Not enough Neon Credits!');
          }
        }
      });

      this.shopTrailsList.appendChild(card);
    }

    const themes = [
      { id: 'cyberpunk', name: 'Cyberpunk 2077', desc: 'Classic electric cyan & neon pink aesthetic', cost: 0 },
      { id: 'vaporwave', name: '1984 Vaporwave', desc: 'Dreamy retro magenta, purple & sunset cyan', cost: 75 },
      { id: 'matrix', name: 'Matrix Terminal', desc: 'Dark retro phosphor green mainframe theme', cost: 150 }
    ];

    this.shopThemesList.innerHTML = '';
    const equippedTheme = storage.getEquipped('theme') || 'cyberpunk';

    for (const th of themes) {
      const owned = storage.hasItem('themes', th.id) || th.cost === 0;
      const isEquipped = equippedTheme === th.id;

      const card = document.createElement('div');
      card.className = `shop-item-card ${isEquipped ? 'equipped' : ''}`;
      card.innerHTML = `
        <div>
          <div class="shop-item-header">
            <span class="shop-item-name">${th.name}</span>
          </div>
          <div class="shop-item-desc">${th.desc}</div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <span style="font-family: var(--font-mono); font-weight: 700; color: var(--neon-yellow);">${th.cost === 0 ? 'FREE' : `💎 ${th.cost} NC`}</span>
          <button class="shop-btn ${isEquipped ? 'equipped' : (owned ? 'equip' : 'buy')}">${isEquipped ? 'ACTIVE' : (owned ? 'EQUIP' : 'UNLOCK')}</button>
        </div>
      `;

      const btn = card.querySelector('.shop-btn');
      btn.addEventListener('click', () => {
        if (isEquipped) return;
        if (owned) {
          storage.equipItem('theme', th.id);
          this.applyCabinetTheme(th.id);
          sound.playPowerup();
          this.renderArmory();
        } else {
          if (storage.spendCredits(th.cost)) {
            storage.unlockItem('themes', th.id);
            storage.equipItem('theme', th.id);
            this.applyCabinetTheme(th.id);
            sound.playVictory();
            this.renderArmory();
          } else {
            sound.playHit();
            alert('Not enough Neon Credits!');
          }
        }
      });

      this.shopThemesList.appendChild(card);
    }
  }

  launchGame(gameKey, mechClass = 'specter') {
    sound.init();
    this.activeGameKey = gameKey;
    this.activeGame = this.games[gameKey];
    this.isPaused = false;
    this.lastTime = performance.now();

    this.lobbyView.style.display = 'none';
    this.gameView.style.display = 'flex';
    this.modalGameOver.style.display = 'none';
    this.modalPause.style.display = 'none';
    this.modalUpgrade.style.display = 'none';
    this.particles.clear();

    if (gameKey === 'cyberSurvivors') {
      this.hudGameName.textContent = `Cyber Survivors (${mechClass.toUpperCase()})`;
      this.hudHpContainer.style.display = 'flex';
      this.hudSuperContainer.style.display = 'flex';
      this.instructionsEl.innerHTML = `Move: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Mouse Drag | Super EMP: <kbd>SPACE</kbd> | Auto-Fire`;
      this.activeGame.init(mechClass);
    } else if (gameKey === 'neonDash') {
      this.hudGameName.textContent = 'Neon Dash';
      this.hudHpContainer.style.display = 'none';
      this.hudSuperContainer.style.display = 'none';
      this.instructionsEl.innerHTML = `Flip Gravity: <kbd>SPACE</kbd> or Click | Air-Dash: Tap while airborne | Dodge Spikes`;
      this.activeGame.init();
    } else if (gameKey === 'quantumBreaker') {
      this.hudGameName.textContent = 'Quantum Breaker';
      this.hudHpContainer.style.display = 'none';
      this.hudSuperContainer.style.display = 'none';
      this.instructionsEl.innerHTML = `Paddle: Mouse or <kbd>A</kbd><kbd>D</kbd> | Fire Lasers: <kbd>SPACE</kbd> or Click | Catch Power-ups`;
      this.activeGame.init();
    } else if (gameKey === 'astroPulse') {
      this.hudGameName.textContent = 'Astro Pulse';
      this.hudHpContainer.style.display = 'flex';
      this.hudSuperContainer.style.display = 'flex';
      this.hudSuperText.textContent = 'BOMB';
      this.instructionsEl.innerHTML = `Move: Mouse / <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> | Smart Bomb: <kbd>SPACE</kbd> | Auto-Fire`;
      this.activeGame.init();
    } else if (gameKey === 'neonDrift') {
      this.hudGameName.textContent = 'Neon Drift';
      this.hudHpContainer.style.display = 'flex';
      this.hudSuperContainer.style.display = 'flex';
      this.hudSuperText.textContent = 'NITRO';
      this.instructionsEl.innerHTML = `Steer: <kbd>A</kbd><kbd>D</kbd> or Mouse | Nitro: <kbd>W</kbd> / <kbd>SPACE</kbd> | Drift: <kbd>S</kbd> / <kbd>SHIFT</kbd>`;
      this.activeGame.start();
    }
  }

  returnToHub() {
    if (this.activeGame) {
      this.activeGame.isRunning = false;
      this.activeGame = null;
    }
    sound.stopBgm();
    this.gameView.style.display = 'none';
    this.lobbyView.style.display = 'flex';
    this.modalPause.style.display = 'none';
    this.modalGameOver.style.display = 'none';
    this.modalUpgrade.style.display = 'none';
    this.updateLobbyScores();
    this.updateCreditsDisplay();
  }

  togglePause() {
    if (!this.activeGame || !this.activeGame.isRunning) return;

    this.isPaused = !this.isPaused;
    this.activeGame.isPaused = this.isPaused;
    this.modalPause.style.display = this.isPaused ? 'flex' : 'none';
    if (!this.isPaused) {
      this.lastTime = performance.now();
    }
  }

  showUpgradeModal(cards, onSelect) {
    this.upgradeCardsContainer.innerHTML = '';
    for (const card of cards) {
      const el = document.createElement('div');
      el.className = 'upgrade-card';
      el.innerHTML = `
        <div class="upgrade-icon">${card.icon}</div>
        <div class="upgrade-info">
          <h4>${card.title}</h4>
          <p>${card.desc}</p>
        </div>
      `;
      el.addEventListener('click', () => {
        this.modalUpgrade.style.display = 'none';
        sound.playPowerup();
        this.lastTime = performance.now();
        onSelect(card.id);
      });
      this.upgradeCardsContainer.appendChild(el);
    }
    this.modalUpgrade.style.display = 'flex';
  }

  handleGameOver(data) {
    this.goTitle.textContent = data.isRecord ? '⚡ NEW HIGH SCORE! ⚡' : 'SYSTEM OFFLINE';
    this.goTitle.className = data.isRecord ? 'modal-title gold' : 'modal-title red';
    this.goSubtitle.textContent = data.isRecord ? 'Unbelievable performance, Operative!' : 'Mission Terminated';

    let statsHtml = `
      <div class="stat-row">
        <span>FINAL SCORE:</span>
        <span class="stat-val">${data.score.toLocaleString()}</span>
      </div>
    `;

    if (data.time !== undefined && data.kills !== undefined) {
      statsHtml += `
        <div class="stat-row"><span>SURVIVAL TIME:</span><span class="stat-val">${data.time}s</span></div>
        <div class="stat-row"><span>ENEMIES DESTROYED:</span><span class="stat-val">${data.kills}</span></div>
      `;
      if (data.level) statsHtml += `<div class="stat-row"><span>FINAL LEVEL:</span><span class="stat-val">${data.level}</span></div>`;
    } else if (data.distance !== undefined && this.activeGameKey === 'neonDrift') {
      statsHtml += `
        <div class="stat-row"><span>HIGHWAY DISTANCE:</span><span class="stat-val">${data.distance}m</span></div>
        <div class="stat-row"><span>CREDITS EARNED:</span><span class="stat-val">💎 ${data.credits} NC</span></div>
      `;
      storage.updateQuestProgress('quest_drift', data.score);
    } else if (data.distance !== undefined) {
      statsHtml += `
        <div class="stat-row"><span>DISTANCE RUN:</span><span class="stat-val">${data.distance}m</span></div>
        <div class="stat-row"><span>STARS COLLECTED:</span><span class="stat-val">${data.stars}</span></div>
        <div class="stat-row"><span>MAX MULTIPLIER:</span><span class="stat-val">${data.multiplier || '1x'}</span></div>
      `;
    } else if (data.stage !== undefined) {
      statsHtml += `
        <div class="stat-row"><span>STAGE REACHED:</span><span class="stat-val">${data.stage}/5</span></div>
        <div class="stat-row"><span>MAX COMBO:</span><span class="stat-val">${data.maxCombo}x</span></div>
      `;
    }

    this.goStats.innerHTML = statsHtml;
    this.modalGameOver.style.display = 'flex';
    this.updateLobbyScores();
    this.updateCreditsDisplay();

    if (data.isRecord) sound.announce('New Record!');
  }

  openAchievementsModal() {
    const achs = storage.data.achievements;
    this.achievementsList.innerHTML = '';

    for (const key in achs) {
      const a = achs[key];
      const item = document.createElement('div');
      item.className = `achievement-item ${a.unlocked ? 'unlocked' : 'locked'}`;
      item.innerHTML = `
        <div class="ach-icon">${a.icon}</div>
        <div class="ach-text">
          <h5>${a.title} ${a.unlocked ? '✅' : '🔒'}</h5>
          <p>${a.desc}</p>
        </div>
      `;
      this.achievementsList.appendChild(item);
    }

    this.modalAchievements.style.display = 'flex';
  }

  showAchievementToast(ach) {
    sound.playVictory();
    sound.announce('Achievement Unlocked!');
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="toast-icon">${ach.icon}</div>
      <div class="toast-text">
        <h5>Achievement Unlocked! (+100 💎)</h5>
        <p>${ach.title}</p>
      </div>
    `;
    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(60px)';
      toast.style.transition = 'all 0.4s ease';
      setTimeout(() => toast.remove(), 400);
    }, 3800);
  }

  loop(currentTime) {
    const rawDt = (currentTime - this.lastTime) / 1000;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    this.lastTime = currentTime;

    if (this.activeGame && this.activeGame.isRunning) {
      if (!this.isPaused && !this.activeGame.isPaused) {
        this.activeGame.update(dt);
        this.particles.update(dt);
      }

      const shake = this.particles.getShakeOffset();
      this.ctx.save();
      this.ctx.translate(shake.x, shake.y);

      this.activeGame.draw();
      this.particles.draw(this.ctx);

      this.ctx.restore();
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ArcadeApp();
});
