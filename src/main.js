// NeonPulse Arcade Main Orchestrator - Mega Evolution Edition
import { sound } from './engine/audio.js';
import { ParticleSystem } from './engine/particles.js';
import { storage } from './engine/storage.js';
import { CyberSurvivorsGame } from './games/cyberSurvivors.js';
import { NeonDashGame } from './games/neonDash.js';
import { QuantumBreakerGame } from './games/quantumBreaker.js';

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

    // Setup Storage Listeners
    storage.onAchievementUnlock = (ach) => this.showAchievementToast(ach);
    storage.onCreditsChange = () => this.updateCreditsDisplay();

    // Start Main Render Loop
    requestAnimationFrame((t) => this.loop(t));
  }

  initDOMElements() {
    this.lobbyView = document.getElementById('lobby-view');
    this.gameView = document.getElementById('game-view');

    // Header Controls
    this.headerCredits = document.getElementById('header-credits');
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
      })
    };
  }

  updateLobbyScores() {
    const sScore = storage.getHighScore('cyberSurvivors');
    const dScore = storage.getHighScore('neonDash');
    const bScore = storage.getHighScore('quantumBreaker');

    document.getElementById('best-score-survivors').textContent = `${sScore.toLocaleString()} PTS`;
    document.getElementById('best-score-dash').textContent = `${dScore.toLocaleString()} M`;
    document.getElementById('best-score-breaker').textContent = `${bScore.toLocaleString()} PTS`;
  }

  updateCreditsDisplay() {
    const credits = storage.getCredits();
    if (this.headerCredits) this.headerCredits.textContent = credits.toLocaleString();
    if (this.shopCreditsDisplay) this.shopCreditsDisplay.textContent = credits.toLocaleString();
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

    // Audio Modal
    this.btnOpenAudio.addEventListener('click', () => {
      sound.init();
      this.sliderBgm.value = sound.bgmVolume * 100;
      this.sliderSfx.value = sound.sfxVolume * 100;
      this.valBgm.textContent = `${Math.round(sound.bgmVolume * 100)}%`;
      this.valSfx.textContent = `${Math.round(sound.sfxVolume * 100)}%`;
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

    // Track buttons
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

    // Touch events
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
    });
  }

  renderArmory() {
    this.updateCreditsDisplay();

    // 1. Trails Catalog
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
            alert('Not enough Neon Credits! Destroy more drones or complete stages to earn more.');
          }
        }
      });

      this.shopTrailsList.appendChild(card);
    }

    // 2. Themes Catalog
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
            alert('Not enough Neon Credits! Play games to earn credits.');
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
      this.instructionsEl.innerHTML = `Move: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Mouse Drag | Super Nova EMP: <kbd>SPACE</kbd> | Auto-Fire`;
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

    if (data.kills !== undefined) {
      statsHtml += `
        <div class="stat-row"><span>SURVIVAL TIME:</span><span class="stat-val">${data.time}s</span></div>
        <div class="stat-row"><span>DRONES DESTROYED:</span><span class="stat-val">${data.kills}</span></div>
        <div class="stat-row"><span>FINAL LEVEL:</span><span class="stat-val">${data.level}</span></div>
      `;
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
