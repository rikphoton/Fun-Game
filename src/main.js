// NeonPulse Arcade Main Orchestrator - Ultra-Smooth & Stutter-Free
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
    this.lastTime = performance.now();
    this.isPaused = false;

    this.initDOMElements();
    this.initGames();
    this.bindEvents();
    this.updateLobbyScores();

    storage.onAchievementUnlock = (ach) => this.showAchievementToast(ach);

    requestAnimationFrame((t) => this.loop(t));
  }

  initDOMElements() {
    this.lobbyView = document.getElementById('lobby-view');
    this.gameView = document.getElementById('game-view');

    this.btnSound = document.getElementById('btn-toggle-sound');
    this.soundIcon = document.getElementById('sound-icon');
    this.btnCrt = document.getElementById('btn-toggle-crt');
    this.btnAchievements = document.getElementById('btn-open-achievements');
    this.btnHomeLogo = document.getElementById('btn-home-logo');
    this.btnBackToHub = document.getElementById('btn-back-to-hub');
    this.btnPause = document.getElementById('btn-pause-game');

    this.hudGameName = document.getElementById('hud-game-name');
    this.hudScore = document.getElementById('hud-score');
    this.hudSecondary = document.getElementById('hud-secondary-stat');
    this.hudHpContainer = document.getElementById('hud-hp-container');
    this.hudHpFill = document.getElementById('hud-hp-fill');
    this.instructionsEl = document.getElementById('game-instructions');

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
        onScoreUpdate: (score, level, hp, maxHp) => {
          this.hudScore.textContent = score;
          this.hudSecondary.innerHTML = `LVL: <span>${level}</span>`;
          if (this.hudHpFill) {
            this.hudHpFill.style.width = `${Math.max(0, (hp / maxHp) * 100)}%`;
          }
        },
        onLevelUpChoice: (cards, onSelect) => this.showUpgradeModal(cards, onSelect)
      }),

      neonDash: new NeonDashGame(this.canvas, this.particles, {
        onGameOver: (data) => this.handleGameOver(data),
        onScoreUpdate: (score, distance, stars) => {
          this.hudScore.textContent = score;
          this.hudSecondary.innerHTML = `DIST: <span>${distance}m</span> | ⭐ <span>${stars}</span>`;
        }
      }),

      quantumBreaker: new QuantumBreakerGame(this.canvas, this.particles, {
        onGameOver: (data) => this.handleGameOver(data),
        onScoreUpdate: (score, lives, combo, level) => {
          this.hudScore.textContent = score;
          this.hudSecondary.innerHTML = `LIVES: <span>${'❤️'.repeat(Math.max(0, lives))}</span> | LVL: <span>${level}</span> | COMBO: <span>${combo}x</span>`;
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

  bindEvents() {
    // Audio Toggle
    this.btnSound.addEventListener('click', () => {
      sound.init();
      const muted = sound.toggleMute();
      this.soundIcon.textContent = muted ? '🔇' : '🔊';
      this.btnSound.innerHTML = `<span id="sound-icon">${muted ? '🔇' : '🔊'}</span> Sound: ${muted ? 'OFF' : 'ON'}`;
    });

    // CRT Toggle
    this.btnCrt.addEventListener('click', () => {
      document.body.classList.toggle('crt-off');
      const isOff = document.body.classList.contains('crt-off');
      this.btnCrt.textContent = `📺 CRT: ${isOff ? 'OFF' : 'ON'}`;
    });

    // Trophies Modal
    this.btnAchievements.addEventListener('click', () => this.openAchievementsModal());
    this.btnCloseAchievements.addEventListener('click', () => {
      this.modalAchievements.style.display = 'none';
    });

    // Lobby Play Buttons
    document.getElementById('btn-play-survivors').addEventListener('click', () => this.launchGame('cyberSurvivors'));
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

    // Game Over Buttons
    this.btnRestart.addEventListener('click', () => {
      this.modalGameOver.style.display = 'none';
      if (this.activeGameKey) this.launchGame(this.activeGameKey);
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

    // ANTI-STUCK: Clear all stuck keys when window loses focus
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

    // Touch support
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

    // Mobile Virtual Touch Buttons
    const btnTouchA = document.getElementById('touch-action-a');
    const btnTouchB = document.getElementById('touch-action-b');

    btnTouchA.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.activeGame && this.activeGame.handleAction) this.activeGame.handleAction();
      if (this.activeGame && this.activeGame.fireLaser) this.activeGame.fireLaser();
    });

    btnTouchB.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.activeGame && this.activeGame.handleAction) this.activeGame.handleAction();
    });
  }

  launchGame(gameKey) {
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
      this.hudGameName.textContent = 'Cyber Survivors';
      this.hudHpContainer.style.display = 'flex';
      this.instructionsEl.innerHTML = `Move: <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Drag Mouse | Weapons Auto-Fire | Grab XP Gems to Level Up`;
    } else if (gameKey === 'neonDash') {
      this.hudGameName.textContent = 'Neon Dash';
      this.hudHpContainer.style.display = 'none';
      this.instructionsEl.innerHTML = `Flip Gravity: <kbd>SPACE</kbd>, <kbd>W</kbd>, <kbd>↑</kbd> or Click Canvas | Dodge Spikes & Lasers`;
    } else if (gameKey === 'quantumBreaker') {
      this.hudGameName.textContent = 'Quantum Breaker';
      this.hudHpContainer.style.display = 'none';
      this.instructionsEl.innerHTML = `Paddle: Move Mouse or <kbd>A</kbd><kbd>D</kbd> | Fire Lasers: <kbd>SPACE</kbd> or Click | Catch Glowing Power-ups`;
    }

    this.activeGame.init();
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
      `;
    } else if (data.maxCombo !== undefined) {
      statsHtml += `
        <div class="stat-row"><span>LEVEL REACHED:</span><span class="stat-val">${data.level}</span></div>
        <div class="stat-row"><span>MAX COMBO:</span><span class="stat-val">${data.maxCombo}x</span></div>
      `;
    }

    this.goStats.innerHTML = statsHtml;
    this.modalGameOver.style.display = 'flex';
    this.updateLobbyScores();
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
        <h5>Achievement Unlocked!</h5>
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
    // Tightly capped delta time (max 50ms) to prevent position jumping on hitches
    const rawDt = (currentTime - this.lastTime) / 1000;
    const dt = Math.min(0.05, Math.max(0.001, rawDt));
    this.lastTime = currentTime;

    if (this.activeGame && this.activeGame.isRunning) {
      if (!this.isPaused && !this.activeGame.isPaused) {
        this.activeGame.update(dt);
        this.particles.update(dt);
      }

      // Always draw even when paused so scene remains visible
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
