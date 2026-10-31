// NeonPulse Arcade Main Orchestrator - Ultra Arcade Edition
import './engine/compat.js'; // must load first: installs canvas roundRect polyfill
import { fullscreenSupported, isFullscreen, enterFullscreen, toggleFullscreen as toggleFs } from './engine/compat.js';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT, fitCanvasToDisplay } from './engine/display.js';
import { sound } from './engine/audio.js';
import { ParticleSystem } from './engine/particles.js';
import { storage } from './engine/storage.js';
import { CyberSurvivorsGame } from './games/cyberSurvivors.js';
import { NeonDashGame } from './games/neonDash.js';
import { QuantumBreakerGame } from './games/quantumBreaker.js';
import { AstroPulseGame } from './games/astroPulse.js';
import { NeonDriftGame } from './games/neonDrift.js';
import { HexaTronGame } from './games/hexaTron.js';
import { CyberPacmanGame } from './games/cyberPacman.js';
import { leaderboard } from './engine/leaderboard.js';
import { gamepad } from './engine/gamepad.js';
import { getGameMeta } from './engine/gamesRegistry.js';

class ArcadeApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.particles = new ParticleSystem();

    this.activeGameKey = null;
    this.activeGame = null;
    this.keyboardHeldKeys = new Set();
    this.touchHeldKeys = new Set();
    this.selectedMech = storage.getEquipped('mech') || 'specter';
    this.lastTime = performance.now();
    this.isPaused = false;
    this.renderScale = 1;

    this.initDOMElements();
    this.applyCabinetTheme(storage.getEquipped('theme') || 'cyberpunk');
    this.initGames();
    this.bindEvents();
    this.updateLobbyScores();
    this.updateCreditsDisplay();
    this.initDisplayScaling();
    this.initVisibilityHandling();

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

    // Leaderboard & Initials Elements
    this.btnOpenLeaderboard = document.getElementById('btn-open-leaderboards');
    this.modalLeaderboard = document.getElementById('modal-leaderboard');
    this.lbTableBody = document.getElementById('lb-table-body');
    this.btnCloseLeaderboard = document.getElementById('btn-close-leaderboard');
    this.btnRefreshLeaderboard = document.getElementById('btn-refresh-leaderboard');
    this.lbTabs = document.getElementById('lb-tabs');
    this.activeLbGame = 'cyberSurvivors';

    this.modalInitials = document.getElementById('modal-initials-entry');
    this.initial1 = document.getElementById('initial-1');
    this.initial2 = document.getElementById('initial-2');
    this.initial3 = document.getElementById('initial-3');
    this.initialsRankInfo = document.getElementById('initials-rank-info');
    this.btnSubmitInitials = document.getElementById('btn-submit-initials');
    this.pendingScoreData = null;

    // Player Profile Elements
    this.btnOpenProfile = document.getElementById('btn-open-profile');
    this.modalPlayerProfile = document.getElementById('modal-player-profile');
    this.btnCloseProfile = document.getElementById('btn-close-profile');
    this.btnExportSave = document.getElementById('btn-export-save');
    this.btnOpenImportModal = document.getElementById('btn-open-import-modal');
    this.modalImportSave = document.getElementById('modal-import-save');
    this.importSaveTextarea = document.getElementById('import-save-textarea');
    this.btnSubmitImport = document.getElementById('btn-submit-import');
    this.btnCancelImport = document.getElementById('btn-cancel-import');
    this.btnResetScores = document.getElementById('btn-reset-scores');
    this.btnResetProgression = document.getElementById('btn-reset-progression');
    this.btnResetAll = document.getElementById('btn-reset-all');

    // Tournament Elements
    this.btnOpenTournament = document.getElementById('btn-open-tournament');
    this.modalTournament = document.getElementById('modal-tournament');
    this.btnCloseTournament = document.getElementById('btn-close-tournament');
    this.btnStartTournament = document.getElementById('btn-start-tournament');
    this.isTournament = false;
    this.tournamentScores = [];
    this.tournamentStage = 0;

    // Replay Element
    this.btnWatchReplay = document.getElementById('btn-watch-replay');
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
          if (!this.games.neonDash.isReplay) {
            storage.recordDistance(distance);
          }
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
      }),

      hexaTron: new HexaTronGame(this.canvas, this.particles, {
        onGameOver: (data) => this.handleGameOver(data),
        onScoreUpdate: (score, round, rivalsLeft, jumps) => {
          this.hudScore.textContent = score;
          this.hudSecondary.innerHTML = `ROUND: <span>${round}</span> | RIVALS: <span>${rivalsLeft}/3</span> | JUMP: <span>${jumps}</span>`;
          if (this.hudSuperFill) {
            this.hudSuperFill.style.width = '100%';
            this.hudSuperText.textContent = 'JUMP';
          }
          if (this.hudHpFill) {
            this.hudHpFill.style.width = '100%';
          }
        }
      }),

      cyberPacman: new CyberPacmanGame(this.canvas, this.particles, {
        onGameOver: (data) => this.handleGameOver(data),
        onScoreUpdate: (score, lives, stage, dotsLeft, totalDots, superPct) => {
          this.hudScore.textContent = score;
          const livesIcons = '🟡'.repeat(Math.max(0, lives));
          this.hudSecondary.innerHTML = `LIVES: <span>${livesIcons}</span> | STAGE: <span>${stage}</span> | BITS: <span>${totalDots - dotsLeft}/${totalDots}</span>`;
          if (this.hudSuperFill) {
            this.hudSuperFill.style.width = `${superPct}%`;
            this.hudSuperText.textContent = superPct >= 100 ? 'READY!' : `${superPct}%`;
            this.btnSuperAbility.classList.toggle('ready', superPct >= 100);
          }
          if (this.hudHpFill) {
            this.hudHpFill.style.width = `${Math.max(0, (lives / 3) * 100)}%`;
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
    const tScore = storage.getHighScore('hexaTron');
    const pScore = storage.getHighScore('cyberPacman');

    const sEl = document.getElementById('best-score-survivors');
    const dEl = document.getElementById('best-score-dash');
    const bEl = document.getElementById('best-score-breaker');
    const aEl = document.getElementById('best-score-shmup');
    const rEl = document.getElementById('best-score-drift');
    const tEl = document.getElementById('best-score-tron');

    if (sEl) sEl.textContent = `${sScore.toLocaleString()} PTS`;
    if (dEl) dEl.textContent = `${dScore.toLocaleString()} M`;
    if (bEl) bEl.textContent = `${bScore.toLocaleString()} PTS`;
    if (aEl) aEl.textContent = `${aScore.toLocaleString()} PTS`;
    if (rEl) rEl.textContent = `${rScore.toLocaleString()} PTS`;
    if (tEl) tEl.textContent = `${tScore.toLocaleString()} PTS`;
    const pEl = document.getElementById('best-score-pacman');
    if (pEl) pEl.textContent = `${pScore.toLocaleString()} PTS`;
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

    // Player Profile Modal & Save Management
    if (this.btnOpenProfile) {
      this.btnOpenProfile.addEventListener('click', () => {
        sound.init();
        this.renderPlayerProfile();
        this.modalPlayerProfile.style.display = 'flex';
      });
    }
    if (this.btnCloseProfile) {
      this.btnCloseProfile.addEventListener('click', () => {
        this.modalPlayerProfile.style.display = 'none';
      });
    }

    if (this.btnExportSave) {
      this.btnExportSave.addEventListener('click', () => {
        const payload = storage.exportSaveData();
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(payload)
            .then(() => this.showToast('✅ Save data copied to clipboard!'))
            .catch(() => this.promptSaveExport(payload));
        } else {
          this.promptSaveExport(payload);
        }
      });
    }

    if (this.btnOpenImportModal) {
      this.btnOpenImportModal.addEventListener('click', () => {
        if (this.importSaveTextarea) this.importSaveTextarea.value = '';
        this.modalImportSave.style.display = 'flex';
      });
    }
    if (this.btnCancelImport) {
      this.btnCancelImport.addEventListener('click', () => {
        this.modalImportSave.style.display = 'none';
      });
    }
    if (this.btnSubmitImport) {
      this.btnSubmitImport.addEventListener('click', () => {
        const raw = this.importSaveTextarea ? this.importSaveTextarea.value.trim() : '';
        if (!raw) return;
        const res = storage.importSaveData(raw);
        if (res.success) {
          this.modalImportSave.style.display = 'none';
          this.renderPlayerProfile();
          this.updateLobbyScores();
          this.updateCreditsDisplay();
          this.showToast('🎉 Save data imported successfully!');
        } else {
          alert(`Save import error: ${res.error}`);
        }
      });
    }

    if (this.btnResetScores) {
      this.btnResetScores.addEventListener('click', () => {
        if (confirm('Reset high scores across all arcade sectors? (Credits & upgrades will remain)')) {
          storage.resetGameScores();
          this.updateLobbyScores();
          this.renderPlayerProfile();
          this.showToast('High scores reset to zero.');
        }
      });
    }
    if (this.btnResetProgression) {
      this.btnResetProgression.addEventListener('click', () => {
        if (confirm('Reset quest progression & Cyber Lab upgrades? (Cosmetics & scores will remain)')) {
          storage.resetProgression();
          this.renderPlayerProfile();
          this.showToast('Progression reset.');
        }
      });
    }
    if (this.btnResetAll) {
      this.btnResetAll.addEventListener('click', () => {
        if (confirm('⚠️ WARNING: Complete Factory Reset? All arcade scores, credits and unlocks will be wiped!')) {
          storage.resetAll();
          this.updateLobbyScores();
          this.updateCreditsDisplay();
          this.renderPlayerProfile();
          this.showToast('Factory reset complete.');
        }
      });
    }

    // Tournament Modal
    if (this.btnOpenTournament) {
      this.btnOpenTournament.addEventListener('click', () => {
        sound.init();
        this.renderTournamentStatus();
        this.modalTournament.style.display = 'flex';
      });
    }
    if (this.btnCloseTournament) {
      this.btnCloseTournament.addEventListener('click', () => {
        this.modalTournament.style.display = 'none';
      });
    }
    if (this.btnStartTournament) {
      this.btnStartTournament.addEventListener('click', () => {
        this.modalTournament.style.display = 'none';
        this.startTournamentGauntlet();
      });
    }

    // Watch Replay
    if (this.btnWatchReplay) {
      this.btnWatchReplay.addEventListener('click', () => {
        this.modalGameOver.style.display = 'none';
        if (this.activeGame && this.activeGame.startReplay) {
          this.activeGame.startReplay();
        }
      });
    }

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
    const btnPlayTron = document.getElementById('btn-play-tron');
    if (btnPlayTron) btnPlayTron.addEventListener('click', () => this.launchGame('hexaTron'));

    const btnPlayPacman = document.getElementById('btn-play-pacman');
    if (btnPlayPacman) btnPlayPacman.addEventListener('click', () => this.launchGame('cyberPacman'));

    // Navigation & Pause
    this.btnHomeLogo.addEventListener('click', () => this.returnToHub());
    this.btnBackToHub.addEventListener('click', () => this.returnToHub());
    this.btnPause.addEventListener('click', () => this.togglePause());
    this.btnResume.addEventListener('click', () => this.togglePause());
    this.btnPauseHub.addEventListener('click', () => {
      this.modalPause.style.display = 'none';
      this.returnToHub();
    });

    // Fullscreen Controls (Header & In-Game HUD)
    const toggleFullscreen = () => {
      sound.init();
      toggleFs();
    };

    const btnHeaderFs = document.getElementById('btn-toggle-fullscreen');
    const btnIngameFs = document.getElementById('btn-ingame-fullscreen');

    if (fullscreenSupported()) {
      if (btnHeaderFs) btnHeaderFs.addEventListener('click', toggleFullscreen);
      if (btnIngameFs) btnIngameFs.addEventListener('click', toggleFullscreen);
    } else {
      // iPhone Safari (and some embedded browsers) cannot fullscreen a page: hide the dead buttons.
      if (btnHeaderFs) btnHeaderFs.style.display = 'none';
      if (btnIngameFs) btnIngameFs.style.display = 'none';
    }

    const updateFsIcons = () => {
      const isFs = isFullscreen();
      if (btnHeaderFs) btnHeaderFs.textContent = isFs ? '✕' : '⛶';
      if (btnIngameFs) btnIngameFs.textContent = isFs ? '✕' : '⛶';
    };

    document.addEventListener('fullscreenchange', updateFsIcons);
    document.addEventListener('webkitfullscreenchange', updateFsIcons);

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
    // Keys the games use. While a game is running we stop the browser from scrolling the page
    // (Space / arrows) or re-clicking the last focused button (Space / Enter).
    const GAME_KEYS = new Set([
      'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'ShiftLeft', 'ShiftRight'
    ]);
    const shouldCaptureKey = (e) => {
      if (!GAME_KEYS.has(e.code)) return false;
      if (!this.activeGame || !this.activeGame.isRunning || this.isPaused) return false;
      const t = e.target;
      const tag = t && t.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return false;
      return true;
    };

    window.addEventListener('keydown', (e) => {
      this.keyboardHeldKeys.add(e.code);
      if (shouldCaptureKey(e)) e.preventDefault();
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
      this.keyboardHeldKeys.delete(e.code);
      // Firefox activates a focused button on Space *keyup*, so block it here too.
      if (shouldCaptureKey(e)) e.preventDefault();
      if (this.activeGame && this.activeGame.handleKeyUp) {
        this.activeGame.handleKeyUp(e.code);
      }
    });

    window.addEventListener('blur', () => {
      this.keyboardHeldKeys.clear();
      this.touchHeldKeys.clear();
      if (this.activeGame) {
        this.activeGame.keys = {};
        if (this.activeGame.pointer) this.activeGame.pointer.active = false;
      }
    });

    // Pointer Events on Canvas
    const getCanvasPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = LOGICAL_WIDTH / rect.width;
      const scaleY = LOGICAL_HEIGHT / rect.height;
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
      if (this.activeGameKey === 'neonDash' && this.activeGame && this.activeGame.handleAction) {
        this.activeGame.handleAction();
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

    // ==========================================================================
    // Tactile Mobile Arcade Deck Controls (D-Pad & Actions)
    // ==========================================================================
    const dpadButtons = [
      { id: 'btn-touch-up', code: 'ArrowUp', altCode: 'KeyW', dir: 'up' },
      { id: 'btn-touch-down', code: 'ArrowDown', altCode: 'KeyS', dir: 'down' },
      { id: 'btn-touch-left', code: 'ArrowLeft', altCode: 'KeyA', dir: 'left', steer: -1 },
      { id: 'btn-touch-right', code: 'ArrowRight', altCode: 'KeyD', dir: 'right', steer: 1 }
    ];

    const pressDirection = (btnDef) => {
      sound.init();
      if (navigator.vibrate) navigator.vibrate(8);
      const el = document.getElementById(btnDef.id);
      if (el) el.classList.add('pressed');
      this.touchHeldKeys.add(btnDef.code);
      if (btnDef.altCode) this.touchHeldKeys.add(btnDef.altCode);

      if (!this.activeGame) return;

      if (this.activeGame.keys) {
        this.activeGame.keys[btnDef.code] = true;
        this.activeGame.keys[btnDef.altCode] = true;
      }
      if (this.activeGame.handleKeyDown) {
        this.activeGame.handleKeyDown(btnDef.code);
      }
      if (this.activeGame.handlePlayerTurn) {
        this.activeGame.handlePlayerTurn(btnDef.code);
      }
      if (btnDef.dir && this.activeGame.setNextDir) {
        this.activeGame.setNextDir(btnDef.dir);
      }
      if (btnDef.steer !== undefined && this.activeGame.touchSteer !== undefined) {
        this.activeGame.touchSteer = btnDef.steer;
      }
    };

    const releaseDirection = (btnDef) => {
      const el = document.getElementById(btnDef.id);
      if (el) el.classList.remove('pressed');
      this.touchHeldKeys.delete(btnDef.code);
      if (btnDef.altCode) this.touchHeldKeys.delete(btnDef.altCode);

      if (!this.activeGame) return;

      if (this.activeGame.keys) {
        this.activeGame.keys[btnDef.code] = false;
        this.activeGame.keys[btnDef.altCode] = false;
      }
      if (this.activeGame.handleKeyUp) {
        this.activeGame.handleKeyUp(btnDef.code);
      }
      if (btnDef.steer !== undefined && this.activeGame.touchSteer !== undefined) {
        if (btnDef.steer === -1 && this.activeGame.keys && this.activeGame.keys['ArrowRight']) {
          this.activeGame.touchSteer = 1;
        } else if (btnDef.steer === 1 && this.activeGame.keys && this.activeGame.keys['ArrowLeft']) {
          this.activeGame.touchSteer = -1;
        } else {
          this.activeGame.touchSteer = 0;
        }
      }
    };

    dpadButtons.forEach(btnDef => {
      const el = document.getElementById(btnDef.id);
      if (!el) return;

      el.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        pressDirection(btnDef);
      }, { passive: false });

      el.addEventListener('pointerup', (e) => {
        e.preventDefault();
        releaseDirection(btnDef);
      }, { passive: false });

      el.addEventListener('pointercancel', (e) => {
        e.preventDefault();
        releaseDirection(btnDef);
      }, { passive: false });

      el.addEventListener('pointerleave', () => {
        releaseDirection(btnDef);
      });
    });

    // Support thumb sliding across the D-Pad
    const dpadCluster = document.getElementById('deck-dpad');
    if (dpadCluster) {
      let activeDpadPointerId = null;
      let lastActiveBtn = null;

      dpadCluster.addEventListener('pointerdown', (e) => {
        activeDpadPointerId = e.pointerId;
      });

      dpadCluster.addEventListener('pointermove', (e) => {
        if (activeDpadPointerId === null || e.pointerId !== activeDpadPointerId) return;
        const target = document.elementFromPoint(e.clientX, e.clientY);
        const btnEl = target ? target.closest('.dpad-btn') : null;

        if (btnEl !== lastActiveBtn) {
          if (lastActiveBtn) {
            const prevDef = dpadButtons.find(b => b.id === lastActiveBtn.id);
            if (prevDef) releaseDirection(prevDef);
          }
          if (btnEl) {
            const newDef = dpadButtons.find(b => b.id === btnEl.id);
            if (newDef) pressDirection(newDef);
          }
          lastActiveBtn = btnEl;
        }
      });

      const clearDpadSlide = (e) => {
        if (e.pointerId === activeDpadPointerId) {
          if (lastActiveBtn) {
            const def = dpadButtons.find(b => b.id === lastActiveBtn.id);
            if (def) releaseDirection(def);
            lastActiveBtn = null;
          }
          activeDpadPointerId = null;
          dpadButtons.forEach(releaseDirection);
        }
      };

      dpadCluster.addEventListener('pointerup', clearDpadSlide);
      dpadCluster.addEventListener('pointercancel', clearDpadSlide);
    }

    // ==========================================================================
    // Virtual 360° Analog Joystick (Cyber Survivors)
    // ==========================================================================
    const joystickBase = document.getElementById('joystick-base');
    const joystickKnob = document.getElementById('joystick-knob');
    this.joystickKnob = joystickKnob;
    let activeJoyPointerId = null;
    let joyCenter = { x: 0, y: 0 };
    const maxJoyRadius = 38; // px

    if (joystickBase && joystickKnob) {
      const updateJoyPosition = (clientX, clientY) => {
        const dx = clientX - joyCenter.x;
        const dy = clientY - joyCenter.y;
        const dist = Math.hypot(dx, dy);

        let nx = 0;
        let ny = 0;
        if (dist > 3) {
          const clampedDist = Math.min(dist, maxJoyRadius);
          const ratio = clampedDist / maxJoyRadius;
          const angle = Math.atan2(dy, dx);
          const visualX = Math.cos(angle) * clampedDist;
          const visualY = Math.sin(angle) * clampedDist;

          joystickKnob.style.transform = `translate(calc(-50% + ${visualX.toFixed(1)}px), calc(-50% + ${visualY.toFixed(1)}px))`;

          nx = Math.cos(angle) * ratio;
          ny = Math.sin(angle) * ratio;
        } else {
          joystickKnob.style.transform = 'translate(-50%, -50%)';
        }

        if (this.activeGame) {
          if (!this.activeGame.joystick) this.activeGame.joystick = { x: 0, y: 0 };
          this.activeGame.joystick.x = nx;
          this.activeGame.joystick.y = ny;

          // In Cyber Pacman: steer according to dominant joystick tilt
          if (this.activeGameKey === 'cyberPacman' && this.activeGame.setNextDir) {
            const absX = Math.abs(nx);
            const absY = Math.abs(ny);
            if (absX > 0.25 || absY > 0.25) {
              if (absX >= absY) {
                this.activeGame.setNextDir(nx > 0 ? 'right' : 'left');
              } else {
                this.activeGame.setNextDir(ny > 0 ? 'down' : 'up');
              }
            }
          }
        }
      };

      const resetJoy = () => {
        activeJoyPointerId = null;
        joystickBase.classList.remove('active');
        joystickKnob.style.transform = 'translate(-50%, -50%)';
        if (this.activeGame && this.activeGame.joystick) {
          this.activeGame.joystick.x = 0;
          this.activeGame.joystick.y = 0;
        }
      };

      joystickBase.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        sound.init();
        if (navigator.vibrate) navigator.vibrate(8);
        activeJoyPointerId = e.pointerId;
        try { joystickBase.setPointerCapture(e.pointerId); } catch (_) {}
        joystickBase.classList.add('active');

        const rect = joystickBase.getBoundingClientRect();
        joyCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
        updateJoyPosition(e.clientX, e.clientY);
      }, { passive: false });

      joystickBase.addEventListener('pointermove', (e) => {
        if (activeJoyPointerId === null || e.pointerId !== activeJoyPointerId) return;
        e.preventDefault();
        updateJoyPosition(e.clientX, e.clientY);
      }, { passive: false });

      const clearJoyPointer = (e) => {
        if (e.pointerId === activeJoyPointerId) {
          e.preventDefault();
          try { joystickBase.releasePointerCapture(e.pointerId); } catch (_) {}
          resetJoy();
        }
      };

      joystickBase.addEventListener('pointerup', clearJoyPointer, { passive: false });
      joystickBase.addEventListener('pointercancel', clearJoyPointer, { passive: false });
    }

    // ==========================================================================
    // Horizontal Touch Slider (Quantum Breaker & Cyber Pacman)
    // ==========================================================================
    const sliderWrap = document.getElementById('slider-track-wrap');
    const sliderTrack = document.getElementById('slider-track');
    const sliderKnob = document.getElementById('slider-knob');
    const sliderFill = document.getElementById('slider-track-fill');
    const btnSliderUp = document.getElementById('btn-slider-up');
    const btnSliderDown = document.getElementById('btn-slider-down');
    this.sliderKnob = sliderKnob;
    this.sliderFill = sliderFill;
    this.isSliderActive = false;
    let activeSliderPointerId = null;
    let sliderStartY = 0;

    const wireSliderBtn = (btnEl, code, dir) => {
      if (!btnEl) return;
      const press = () => {
        sound.init();
        if (navigator.vibrate) navigator.vibrate(8);
        btnEl.classList.add('pressed');
        if (!this.activeGame) return;
        if (this.activeGame.keys) this.activeGame.keys[code] = true;
        if (this.activeGame.handleKeyDown) this.activeGame.handleKeyDown(code);
        if (this.activeGame.setNextDir) this.activeGame.setNextDir(dir);
      };
      const release = () => {
        btnEl.classList.remove('pressed');
        if (!this.activeGame) return;
        if (this.activeGame.keys) this.activeGame.keys[code] = false;
        if (this.activeGame.handleKeyUp) this.activeGame.handleKeyUp(code);
      };
      btnEl.addEventListener('pointerdown', (e) => { e.preventDefault(); press(); }, { passive: false });
      btnEl.addEventListener('pointerup', (e) => { e.preventDefault(); release(); }, { passive: false });
      btnEl.addEventListener('pointercancel', (e) => { e.preventDefault(); release(); }, { passive: false });
      btnEl.addEventListener('pointerleave', release);
    };

    wireSliderBtn(btnSliderUp, 'ArrowUp', 'up');
    wireSliderBtn(btnSliderDown, 'ArrowDown', 'down');

    if (sliderWrap && sliderTrack && sliderKnob) {
      const updateSliderFromClient = (clientX, clientY) => {
        const rect = sliderTrack.getBoundingClientRect();
        const clampedX = Math.max(rect.left, Math.min(rect.right, clientX));
        const ratio = (clampedX - rect.left) / (rect.width || 1);
        const pct = (ratio * 100).toFixed(1);

        sliderKnob.style.left = `${pct}%`;
        if (sliderFill) sliderFill.style.width = `${pct}%`;

        if (!this.activeGame) return;

        // 1. Quantum Breaker: map paddle position across horizontal bounds
        if (this.activeGameKey === 'quantumBreaker') {
          this.activeGame.sliderPos = ratio;
        }

        // 2. Cyber Pacman: steer left/right from slider offset, and up/down from vertical drag
        if (this.activeGameKey === 'cyberPacman') {
          if (clientY !== undefined && sliderStartY !== 0) {
            const dy = clientY - sliderStartY;
            if (dy < -20) {
              this.activeGame.setNextDir('up');
            } else if (dy > 20) {
              this.activeGame.setNextDir('down');
            }
          }
          if (ratio < 0.40) {
            this.activeGame.setNextDir('left');
          } else if (ratio > 0.60) {
            this.activeGame.setNextDir('right');
          }
        }
      };

      sliderWrap.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        sound.init();
        if (navigator.vibrate) navigator.vibrate(8);
        activeSliderPointerId = e.pointerId;
        this.isSliderActive = true;
        sliderStartY = e.clientY;
        try { sliderWrap.setPointerCapture(e.pointerId); } catch (_) {}
        sliderWrap.classList.add('active');
        updateSliderFromClient(e.clientX, e.clientY);
      }, { passive: false });

      sliderWrap.addEventListener('pointermove', (e) => {
        if (activeSliderPointerId === null || e.pointerId !== activeSliderPointerId) return;
        e.preventDefault();
        updateSliderFromClient(e.clientX, e.clientY);
      }, { passive: false });

      const clearSliderPointer = (e) => {
        if (e.pointerId === activeSliderPointerId) {
          e.preventDefault();
          try { sliderWrap.releasePointerCapture(e.pointerId); } catch (_) {}
          activeSliderPointerId = null;
          this.isSliderActive = false;
          sliderStartY = 0;
          sliderWrap.classList.remove('active');

          // For Cyber Pacman, re-center the knob to 50% on release
          if (this.activeGameKey === 'cyberPacman') {
            sliderKnob.style.left = '50%';
            if (sliderFill) sliderFill.style.width = '50%';
          }
        }
      };

      sliderWrap.addEventListener('pointerup', clearSliderPointer, { passive: false });
      sliderWrap.addEventListener('pointercancel', clearSliderPointer, { passive: false });
    }

    // Primary Action Button (🅰️)
    const btnTouchA = document.getElementById('touch-action-a');
    if (btnTouchA) {
      const triggerActionA = (press) => {
        if (press) {
          this.touchHeldKeys.add('Space');
          sound.init();
          if (navigator.vibrate) navigator.vibrate(12);
          btnTouchA.classList.add('pressed');
          if (!this.activeGame) return;

          if (this.activeGame.keys) {
            this.activeGame.keys['Space'] = true;
          }
          if (this.activeGame.handleAction) this.activeGame.handleAction();
          if (this.activeGame.fireLaser) this.activeGame.fireLaser();
          if (this.activeGame.jump) this.activeGame.jump();
          if (this.activeGame.triggerPhaseJump) this.activeGame.triggerPhaseJump();
          if (this.activeGame.setTouchAction) this.activeGame.setTouchAction('nitro', true);
          if (this.activeGame.triggerSuperAbility && this.activeGameKey === 'cyberSurvivors') {
            this.activeGame.triggerSuperAbility();
          }
        } else {
          this.touchHeldKeys.delete('Space');
          btnTouchA.classList.remove('pressed');
          if (!this.activeGame) return;
          if (this.activeGame.keys) {
            this.activeGame.keys['Space'] = false;
          }
          if (this.activeGame.setTouchAction) this.activeGame.setTouchAction('nitro', false);
        }
      };

      btnTouchA.addEventListener('pointerdown', (e) => { e.preventDefault(); triggerActionA(true); }, { passive: false });
      btnTouchA.addEventListener('pointerup', (e) => { e.preventDefault(); triggerActionA(false); }, { passive: false });
      btnTouchA.addEventListener('pointercancel', (e) => { e.preventDefault(); triggerActionA(false); }, { passive: false });
    }

    // Sub Action / Nitro / Drift / Air Dash Button (⚡)
    const btnTouchNitro = document.getElementById('btn-touch-nitro');
    if (btnTouchNitro) {
      const triggerActionNitro = (press) => {
        if (press) {
          this.touchHeldKeys.add('ShiftLeft');
          sound.init();
          if (navigator.vibrate) navigator.vibrate(10);
          btnTouchNitro.classList.add('pressed');
          if (!this.activeGame) return;

          if (this.activeGame.keys) {
            this.activeGame.keys['ShiftLeft'] = true;
          }
          if (this.activeGame.setTouchAction) {
            this.activeGame.setTouchAction('drift', true);
            this.activeGame.setTouchAction('nitro', true);
          }
          if (this.activeGame.handleAction && this.activeGameKey === 'neonDash') {
            this.activeGame.handleAction();
          }
          if (this.activeGame.triggerPhaseJump) this.activeGame.triggerPhaseJump();
        } else {
          this.touchHeldKeys.delete('ShiftLeft');
          btnTouchNitro.classList.remove('pressed');
          if (!this.activeGame) return;
          if (this.activeGame.keys) {
            this.activeGame.keys['ShiftLeft'] = false;
          }
          if (this.activeGame.setTouchAction) {
            this.activeGame.setTouchAction('drift', false);
            this.activeGame.setTouchAction('nitro', false);
          }
        }
      };

      btnTouchNitro.addEventListener('pointerdown', (e) => { e.preventDefault(); triggerActionNitro(true); }, { passive: false });
      btnTouchNitro.addEventListener('pointerup', (e) => { e.preventDefault(); triggerActionNitro(false); }, { passive: false });
      btnTouchNitro.addEventListener('pointercancel', (e) => { e.preventDefault(); triggerActionNitro(false); }, { passive: false });
    }

    // Super Action / EMP / Bomb Button (💣)
    const btnTouchSuper = document.getElementById('touch-super-btn');
    if (btnTouchSuper) {
      const triggerActionSuper = (press) => {
        if (press) {
          this.touchHeldKeys.add('KeyE');
          sound.init();
          if (navigator.vibrate) navigator.vibrate(20);
          btnTouchSuper.classList.add('pressed');
          if (!this.activeGame) return;

          if (this.activeGame.keys) {
            this.activeGame.keys['KeyE'] = true;
          }
          if (this.activeGame.triggerSuperAbility) {
            this.activeGame.triggerSuperAbility();
          }
          if (this.activeGame.triggerBomb) {
            this.activeGame.triggerBomb();
          }
          if (this.activeGame.triggerEmp) {
            this.activeGame.triggerEmp();
          }
          if (this.activeGame.triggerPhaseJump) {
            this.activeGame.triggerPhaseJump();
          }
        } else {
          this.touchHeldKeys.delete('KeyE');
          btnTouchSuper.classList.remove('pressed');
          if (!this.activeGame) return;
          if (this.activeGame.keys) {
            this.activeGame.keys['KeyE'] = false;
          }
        }
      };

      btnTouchSuper.addEventListener('pointerdown', (e) => { e.preventDefault(); triggerActionSuper(true); }, { passive: false });
      btnTouchSuper.addEventListener('pointerup', (e) => { e.preventDefault(); triggerActionSuper(false); }, { passive: false });
      btnTouchSuper.addEventListener('pointercancel', (e) => { e.preventDefault(); triggerActionSuper(false); }, { passive: false });
    }

    // Leaderboard Modal Controls
    if (this.btnOpenLeaderboard) {
      this.btnOpenLeaderboard.addEventListener('click', () => {
        sound.init();
        this.renderLeaderboard(this.activeLbGame);
        this.modalLeaderboard.style.display = 'flex';
      });
    }

    if (this.btnCloseLeaderboard) {
      this.btnCloseLeaderboard.addEventListener('click', () => {
        this.modalLeaderboard.style.display = 'none';
      });
    }

    if (this.btnRefreshLeaderboard) {
      this.btnRefreshLeaderboard.addEventListener('click', () => {
        this.renderLeaderboard(this.activeLbGame);
      });
    }

    if (this.lbTabs) {
      this.lbTabs.querySelectorAll('.lb-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this.lbTabs.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.activeLbGame = tab.dataset.game;
          this.renderLeaderboard(this.activeLbGame);
        });
      });
    }

    // Arcade 3-Letter Initials Entry Navigation
    const advanceInitials = (current, next) => {
      if (current.value.length >= 1 && next) {
        next.focus();
        next.select();
      }
    };

    if (this.initial1 && this.initial2 && this.initial3) {
      this.initial1.addEventListener('input', () => advanceInitials(this.initial1, this.initial2));
      this.initial2.addEventListener('input', () => advanceInitials(this.initial2, this.initial3));
      this.initial3.addEventListener('input', () => {
        if (this.initial3.value.length >= 1) {
          this.btnSubmitInitials.focus();
        }
      });

      [this.initial1, this.initial2, this.initial3].forEach((input, idx, arr) => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Backspace' && !input.value && idx > 0) {
            arr[idx - 1].focus();
          } else if (e.key === 'Enter') {
            this.submitInitialsScore();
          }
        });
      });
    }

    if (this.btnSubmitInitials) {
      this.btnSubmitInitials.addEventListener('click', () => this.submitInitialsScore());
    }

    // Gamepad Connection Status Hook
    gamepad.onStatusChange = (connected, name) => {
      if (connected) {
        this.showToast('🎮', 'GAMEPAD CONNECTED', `${name} ready for action!`);
      } else {
        this.showToast('🔌', 'GAMEPAD DISCONNECTED', 'Switched back to keyboard/touch');
        if (this.activeGame && this.activeGame.keys) {
          this.activeGame.keys['ArrowLeft'] = Boolean(this.keyboardHeldKeys.has('ArrowLeft') || this.keyboardHeldKeys.has('KeyA') || this.touchHeldKeys.has('ArrowLeft'));
          this.activeGame.keys['ArrowRight'] = Boolean(this.keyboardHeldKeys.has('ArrowRight') || this.keyboardHeldKeys.has('KeyD') || this.touchHeldKeys.has('ArrowRight'));
          this.activeGame.keys['ArrowUp'] = Boolean(this.keyboardHeldKeys.has('ArrowUp') || this.keyboardHeldKeys.has('KeyW') || this.touchHeldKeys.has('ArrowUp'));
          this.activeGame.keys['ArrowDown'] = Boolean(this.keyboardHeldKeys.has('ArrowDown') || this.keyboardHeldKeys.has('KeyS') || this.touchHeldKeys.has('ArrowDown'));
          if (this.activeGame.keys['ShiftLeft'] !== undefined) {
            this.activeGame.keys['ShiftLeft'] = Boolean(this.keyboardHeldKeys.has('ShiftLeft') || this.touchHeldKeys.has('ShiftLeft'));
          }
        }
        if (this.activeGame && this.activeGame.joystick && !this.isTouchJoystickActive) {
          this.activeGame.joystick = { x: 0, y: 0, active: false };
        }
      }
    };
  }

  // --- LOCAL HALL OF FAME & ARCADE INITIALS ---

  renderLeaderboard(gameKey = 'cyberSurvivors') {
    if (!this.lbTableBody) return;
    const scores = leaderboard.getScores(gameKey);
    this.lbTableBody.innerHTML = '';

    scores.forEach((entry) => {
      const tr = document.createElement('tr');
      const isPlayer = Boolean(entry.isUser);
      tr.className = isPlayer ? 'lb-row-player' : 'lb-row-demo';

      let rankClass = 'rank-other';
      if (entry.rank === 1) rankClass = 'rank-1';
      else if (entry.rank === 2) rankClass = 'rank-2';
      else if (entry.rank === 3) rankClass = 'rank-3';

      let scoreLabel = entry.score.toLocaleString();
      if (gameKey === 'neonDash') scoreLabel += ' M';
      else scoreLabel += ' PTS';

      tr.innerHTML = `
        <td><span class="lb-rank ${rankClass}">${entry.rank}</span></td>
        <td>
          <span class="lb-tag ${isPlayer ? 'player-tag' : 'demo-tag'}">${entry.tag}</span>
          ${isPlayer ? '<span class="badge-verified">★ VERIFIED</span>' : '<span class="badge-demo">[DEMO]</span>'}
        </td>
        <td><span class="lb-score ${isPlayer ? 'player-score' : 'demo-score'}">${scoreLabel}</span></td>
        <td class="lb-origin" style="font-size:0.75rem;">${isPlayer ? '🎮 LOCAL PLAYER' : '🤖 DEMO SCORE'}</td>
        <td class="lb-date" style="color:var(--text-muted);font-size:0.8rem;">${entry.date || '2026-09-13'}</td>
      `;
      this.lbTableBody.appendChild(tr);
    });
  }

  submitInitialsScore() {
    if (!this.pendingScoreData) {
      this.modalInitials.style.display = 'none';
      return;
    }

    const t1 = (this.initial1.value || 'R').toUpperCase();
    const t2 = (this.initial2.value || 'I').toUpperCase();
    const t3 = (this.initial3.value || 'K').toUpperCase();
    const tag = `${t1}${t2}${t3}`;

    const rank = leaderboard.addScore(
      this.pendingScoreData.gameKey,
      tag,
      this.pendingScoreData.score
    );

    this.modalInitials.style.display = 'none';
    this.pendingScoreData = null;

    sound.playVictory();
    this.showToast('🏆', 'HALL OF FAME', `${tag} secured Rank #${rank}!`);
    this.activeLbGame = this.activeGameKey;
    this.renderLeaderboard(this.activeLbGame);
    this.modalLeaderboard.style.display = 'flex';
  }

  showToast(icon, title, text) {
    const toast = document.createElement('div');
    toast.className = 'achievement-toast';
    toast.innerHTML = `
      <div class="toast-icon">${icon}</div>
      <div class="toast-text">
        <h5>${title}</h5>
        <p>${text}</p>
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
            this.showToast('💎', 'NOT ENOUGH CREDITS', 'Play games or complete bounties to earn more.');
          }
        });
      }

      this.labUpgradesList.appendChild(card);
    }
  }

  // --- DAILY QUESTS & BOUNTIES RENDERER ---

  // --- PLAYER PROFILE & TOURNAMENT GAUNTLET ---

  renderPlayerProfile() {
    const stats = storage.getProfileStats();
    const badge = document.getElementById('profile-level-badge');
    const xpText = document.getElementById('profile-xp-text');
    const xpFill = document.getElementById('profile-xp-fill');
    const statGames = document.getElementById('profile-stat-games');
    const statPlaytime = document.getElementById('profile-stat-playtime');
    const statScore = document.getElementById('profile-stat-score');
    const statTrophies = document.getElementById('profile-stat-trophies');
    const scoresTable = document.getElementById('profile-scores-table');

    if (badge) badge.textContent = `LVL ${stats.playerLevel} OPERATIVE`;
    if (xpText) xpText.textContent = `LEVEL ${stats.playerLevel} (${stats.completionPercent}% PROGRESS)`;
    if (xpFill) xpFill.style.width = `${Math.min(100, Math.max(5, stats.completionPercent))}%`;
    if (statGames) statGames.textContent = stats.gamesPlayed.toLocaleString();

    // Format playtime
    const m = Math.floor(stats.totalPlayTime / 60);
    const h = Math.floor(m / 60);
    const playtimeStr = h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
    if (statPlaytime) statPlaytime.textContent = playtimeStr;

    if (statScore) statScore.textContent = stats.totalScore.toLocaleString();
    if (statTrophies) statTrophies.textContent = `${stats.achievementsUnlocked} / ${stats.totalAchievements}`;

    if (scoresTable) {
      const gameLabels = {
        cyberSurvivors: '🛸 Cyber Survivors',
        neonDash: '🚀 Neon Dash',
        quantumBreaker: '💥 Quantum Breaker',
        astroPulse: '🌠 Astro Pulse',
        neonDrift: '🏎️ Neon Drift',
        hexaTron: '🏍️ Hexa-Tron',
        cyberPacman: '👾 Cyber Pacman'
      };
      scoresTable.innerHTML = Object.entries(stats.highScores).map(([key, sc]) => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.85rem;">
          <span style="color: #cbd5e1;">${gameLabels[key] || key}</span>
          <span style="color: #00f3ff; font-family: monospace; font-weight: bold;">${sc.toLocaleString()} PTS</span>
        </div>
      `).join('');
    }
  }

  promptSaveExport(payload) {
    prompt('Copy your complete save data payload below:', payload);
  }

  renderTournamentStatus() {
    const pb = storage.data.tournamentPB || 0;
    const pbEl = document.getElementById('tournament-pb-score');
    const tierEl = document.getElementById('tournament-rank-tier');
    if (pbEl) pbEl.textContent = `${pb.toLocaleString()} PTS`;
    if (tierEl) {
      let tier = 'UNRANKED';
      let col = '#94a3b8';
      if (pb >= 12000) { tier = '👑 APEX GRANDMASTER'; col = '#ffd700'; }
      else if (pb >= 8000) { tier = '🥇 GOLD OPERATIVE'; col = '#ffe600'; }
      else if (pb >= 4500) { tier = '🥈 SILVER OPERATIVE'; col = '#00f3ff'; }
      else if (pb > 0) { tier = '🥉 BRONZE OPERATIVE'; col = '#cd7f32'; }
      tierEl.textContent = tier;
      tierEl.style.color = col;
    }
  }

  startTournamentGauntlet() {
    this.isTournament = true;
    this.tournamentScores = [];
    this.tournamentStage = 1;
    this.showToast('🏆 TOURNAMENT GAUNTLET STARTED! Stage 1: Neon Dash');
    this.launchGame('neonDash');
  }

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
            this.showToast('💎', 'NOT ENOUGH CREDITS', 'Play games or complete bounties to earn more.');
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
            this.showToast('💎', 'NOT ENOUGH CREDITS', 'Play games or complete bounties to earn more.');
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

    document.body.classList.add('in-game');
    this.lobbyView.style.display = 'none';
    this.gameView.style.display = 'flex';
    this.modalGameOver.style.display = 'none';
    this.modalPause.style.display = 'none';
    this.modalUpgrade.style.display = 'none';
    this.particles.clear();

    // Auto-enter native fullscreen on mobile for true immersive arcade view
    if (window.innerWidth <= 860 && fullscreenSupported() && !isFullscreen()) {
      enterFullscreen();
    }

    const lblPrimary = document.getElementById('lbl-touch-primary');
    const lblSub = document.getElementById('lbl-touch-sub');
    const lblSuper = document.getElementById('lbl-touch-super');
    const hintText = document.getElementById('deck-hint-text');

    const dpadCluster = document.getElementById('deck-dpad');
    const joystickCluster = document.getElementById('deck-joystick');
    const sliderCluster = document.getElementById('deck-slider');
    const sliderVUp = document.getElementById('slider-v-up-wrap');
    const sliderVDown = document.getElementById('slider-v-down-wrap');
    const sliderLabel = document.getElementById('slider-sublabel');
    const btnModeToggle = document.getElementById('btn-deck-mode-toggle');
    const lblModeText = document.getElementById('lbl-deck-mode-text');
    const lblModeIcon = document.getElementById('lbl-deck-mode-icon');

    const setDeckMode = (mode) => {
      if (dpadCluster) dpadCluster.style.display = mode === 'dpad' ? 'flex' : 'none';
      if (joystickCluster) joystickCluster.style.display = mode === 'joystick' ? 'flex' : 'none';
      if (sliderCluster) sliderCluster.style.display = mode === 'slider' ? 'flex' : 'none';
    };

    if (btnModeToggle && !this._modeToggleWired) {
      this._modeToggleWired = true;
      btnModeToggle.addEventListener('click', (e) => {
        e.preventDefault();
        sound.init();
        if (navigator.vibrate) navigator.vibrate(10);
        const curMode = localStorage.getItem('neonpulse_pacman_control') || 'buttons';
        const nextMode = curMode === 'buttons' ? 'joystick' : 'buttons';
        localStorage.setItem('neonpulse_pacman_control', nextMode);
        if (this.activeGameKey === 'cyberPacman') {
          applyPacmanDeck();
        }
      });
    }

    const applyPacmanDeck = () => {
      const mode = localStorage.getItem('neonpulse_pacman_control') || 'buttons';
      if (mode === 'joystick') {
        setDeckMode('joystick');
        if (lblModeIcon) lblModeIcon.textContent = '🎛️';
        if (lblModeText) lblModeText.textContent = 'D-PAD';
        if (hintText) hintText.textContent = '🕹️ CENTER JOYSTICK: STEER | 🅰️ EMP';
      } else {
        setDeckMode('dpad');
        if (lblModeIcon) lblModeIcon.textContent = '🕹️';
        if (lblModeText) lblModeText.textContent = 'STICK';
        if (hintText) hintText.textContent = '🕹️ CENTER D-PAD: STEER | 🅰️ EMP';
      }
    };

    const meta = getGameMeta(gameKey);
    if (meta) {
      this.hudGameName.textContent = gameKey === 'cyberSurvivors'
        ? `Cyber Survivors (${mechClass.toUpperCase()})`
        : meta.title;
      this.hudHpContainer.style.display = meta.hud.hp ? 'flex' : 'none';
      this.hudSuperContainer.style.display = meta.hud.super ? 'flex' : 'none';
      if (meta.hud.superText && this.hudSuperText) {
        this.hudSuperText.textContent = meta.hud.superText;
      }
      this.instructionsEl.innerHTML = meta.instructions;
      if (lblPrimary) lblPrimary.textContent = meta.primaryLabel;
      if (lblSub) lblSub.textContent = meta.subLabel;
      if (lblSuper) lblSuper.textContent = meta.superLabel;
      if (hintText) hintText.textContent = meta.hintText;

      if (meta.controlMode === 'toggle') {
        if (btnModeToggle) btnModeToggle.style.display = 'flex';
        applyPacmanDeck();
      } else {
        if (btnModeToggle) btnModeToggle.style.display = 'none';
        setDeckMode(meta.controlMode);
      }
    }

    if (gameKey === 'quantumBreaker') {
      if (sliderVUp) sliderVUp.style.display = 'none';
      if (sliderVDown) sliderVDown.style.display = 'none';
      if (sliderLabel) sliderLabel.textContent = 'PADDLE SLIDER';
      if (this.sliderKnob) this.sliderKnob.style.left = '50%';
      if (this.sliderFill) this.sliderFill.style.width = '50%';
    }

    if (gameKey === 'cyberSurvivors') {
      this.activeGame.init(mechClass);
    } else if (gameKey === 'neonDrift' || gameKey === 'hexaTron') {
      this.activeGame.start();
    } else if (this.activeGame.init) {
      this.activeGame.init();
    }
  }

  returnToHub() {
    document.body.classList.remove('in-game');
    if (this.activeGame) {
      if (this.activeGame.destroy) this.activeGame.destroy();
      this.activeGame.isRunning = false;
      this.activeGame = null;
    }
    this.physicsAccumulator = 0;
    sound.stopBgm();
    this.gameView.style.display = 'none';
    this.lobbyView.style.display = 'flex';
    this.modalPause.style.display = 'none';
    this.modalGameOver.style.display = 'none';
    this.modalUpgrade.style.display = 'none';
    this.modalInitials.style.display = 'none';
    this.isSliderActive = false;
    if (this.joystickKnob) this.joystickKnob.style.transform = 'translate(-50%, -50%)';
    this.updateLobbyScores();
    this.updateCreditsDisplay();
  }

  // Keep the canvas backing store matched to how big (and how dense) the screen shows it.
  initDisplayScaling() {
    const refit = () => {
      this.renderScale = fitCanvasToDisplay(this.canvas);
    };
    refit();
    if (typeof ResizeObserver !== 'undefined') {
      new ResizeObserver(refit).observe(this.canvas);
    }
    window.addEventListener('resize', refit);
    window.addEventListener('orientationchange', refit);
    // Moving the window between monitors changes devicePixelRatio without resizing the canvas.
    if (window.matchMedia) {
      const watchDpr = () => {
        const mq = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
        const onChange = () => {
          refit();
          if (mq.removeEventListener) mq.removeEventListener('change', onChange);
          watchDpr();
        };
        if (mq.addEventListener) mq.addEventListener('change', onChange);
      };
      watchDpr();
    }
  }

  // Pause when the page is hidden (tab switch, phone locked, app backgrounded) so the player is
  // not dropped back into live action, and silence audio while away.
  initVisibilityHandling() {
    const pauseIfPlaying = () => {
      const game = this.activeGame;
      if (game && game.isRunning && !this.isPaused && !game.isPaused) {
        this.togglePause();
      }
      this.physicsAccumulator = 0;
    };

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        pauseIfPlaying();
        sound.suspend();
      } else {
        this.lastTime = performance.now();
        this.physicsAccumulator = 0;
        sound.resume();
      }
    });
    window.addEventListener('pagehide', pauseIfPlaying);
  }

  togglePause() {
    if (!this.activeGame || !this.activeGame.isRunning) return;

    this.isPaused = !this.isPaused;
    this.activeGame.isPaused = this.isPaused;
    this.modalPause.style.display = this.isPaused ? 'flex' : 'none';
    if (!this.isPaused) {
      this.lastTime = performance.now();
      this.physicsAccumulator = 0;
      sound.resume();
      if (this.activeGame.resume) this.activeGame.resume();
    } else {
      this.physicsAccumulator = 0;
      sound.suspend();
      if (this.activeGame.pause) this.activeGame.pause();
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
    const isReplaySession = Boolean(data.isReplay || (this.activeGame && this.activeGame.isReplay));

    if (isReplaySession) {
      this.goTitle.textContent = '📽️ REPLAY COMPLETE';
      this.goTitle.className = 'modal-title cyan';
      this.goSubtitle.textContent = 'Playback Finished (No Rewards in Replay Mode)';
    } else {
      this.goTitle.textContent = data.isRecord ? '⚡ NEW HIGH SCORE! ⚡' : 'SYSTEM OFFLINE';
      this.goTitle.className = data.isRecord ? 'modal-title gold' : 'modal-title red';
      this.goSubtitle.textContent = data.isRecord ? 'Unbelievable performance, Operative!' : 'Mission Terminated';
    }

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
      if (!isReplaySession) {
        storage.updateQuestProgress('quest_drift', data.score);
      }
    } else if (this.activeGameKey === 'hexaTron') {
      statsHtml += `
        <div class="stat-row"><span>RIVALS DESTROYED:</span><span class="stat-val">${data.kills || 0}</span></div>
        <div class="stat-row"><span>ROUNDS SURVIVED:</span><span class="stat-val">${data.round || 1}</span></div>
        <div class="stat-row"><span>CREDITS EARNED:</span><span class="stat-val">💎 ${data.credits || 0} NC</span></div>
      `;
      if (!isReplaySession) {
        storage.updateQuestProgress('quest_tron', data.kills || 0);
      }
    } else if (this.activeGameKey === 'cyberPacman') {
      statsHtml += `
        <div class="stat-row"><span>STAGE REACHED:</span><span class="stat-val">${data.stage || 1}</span></div>
        <div class="stat-row"><span>BITS CONSUMED:</span><span class="stat-val">${data.dotsEaten || 0}</span></div>
        <div class="stat-row"><span>DRONES NEUTRALIZED:</span><span class="stat-val">${data.ghostsEaten || 0}</span></div>
        <div class="stat-row"><span>CREDITS EARNED:</span><span class="stat-val">💎 ${data.credits || 0} NC</span></div>
      `;
      if (!isReplaySession) {
        storage.updateQuestProgress('quest_pacman', data.ghostsEaten || 0);
      }
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

    // Toggle Watch Replay button visibility
    if (this.btnWatchReplay) {
      this.btnWatchReplay.style.display = (this.activeGameKey === 'neonDash' && data.hasReplay && !isReplaySession) ? 'inline-block' : 'none';
    }

    if (data.isRecord && !isReplaySession) sound.announce('New Record!');

    // Handle Arcade Tournament progression (never in replay mode)
    if (!isReplaySession && this.isTournament) {
      this.tournamentScores.push(data.score);
      if (this.tournamentStage === 1) {
        this.tournamentStage = 2;
        this.modalGameOver.style.display = 'none';
        this.showToast(`✅ STAGE 1 FINISHED! Score: ${data.score}. Moving to Stage 2: Cyber Survivors!`);
        setTimeout(() => this.launchGame('cyberSurvivors', this.selectedMech), 600);
        return;
      } else if (this.tournamentStage === 2) {
        this.tournamentStage = 3;
        this.modalGameOver.style.display = 'none';
        this.showToast(`✅ STAGE 2 FINISHED! Score: ${data.score}. Moving to Final Stage: Quantum Breaker!`);
        setTimeout(() => this.launchGame('quantumBreaker'), 600);
        return;
      } else {
        // Tournament Finished!
        this.isTournament = false;
        const totalTournamentScore = this.tournamentScores.reduce((a, b) => a + b, 0);
        if (totalTournamentScore > (storage.data.tournamentPB || 0)) {
          storage.data.tournamentPB = totalTournamentScore;
          storage.save();
        }
        storage.addCredits(200);
        sound.playLevelUp();
        sound.announce('Tournament Complete! Outstanding Performance!');
        this.showToast(`🎉 TOURNAMENT COMPLETE! Total Score: ${totalTournamentScore.toLocaleString()} PTS (+200 NC)`);
      }
    }

    // Check for Top-10 Leaderboard High Score qualification (never in replay mode)
    if (!isReplaySession && data.score > 0 && leaderboard.isHighScore(this.activeGameKey, data.score)) {
      const rank = leaderboard.getRankForScore(this.activeGameKey, data.score);
      this.pendingScoreData = {
        gameKey: this.activeGameKey,
        score: data.score
      };
      if (this.initialsRankInfo) {
        this.initialsRankInfo.textContent = `RANK: #${rank} • SCORE: ${data.score.toLocaleString()}`;
      }
      setTimeout(() => {
        if (this.modalInitials) {
          this.modalInitials.style.display = 'flex';
          if (this.initial1) {
            this.initial1.focus();
            this.initial1.select();
          }
        }
      }, 700);
    }
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

  handleGamepadInput() {
    if (!gamepad.isConnected || !this.activeGame) return;

    if (gamepad.isJustPressed('pause')) {
      this.togglePause();
      return;
    }

    if (this.isPaused) return;

    const state = gamepad.state;

    // Directional keys dispatch (combining gamepad with keyboard and touch)
    if (this.activeGame.keys !== undefined) {
      this.activeGame.keys['ArrowLeft'] = Boolean(state.left || this.keyboardHeldKeys.has('ArrowLeft') || this.keyboardHeldKeys.has('KeyA') || this.touchHeldKeys.has('ArrowLeft'));
      this.activeGame.keys['ArrowRight'] = Boolean(state.right || this.keyboardHeldKeys.has('ArrowRight') || this.keyboardHeldKeys.has('KeyD') || this.touchHeldKeys.has('ArrowRight'));
      this.activeGame.keys['ArrowUp'] = Boolean(state.up || this.keyboardHeldKeys.has('ArrowUp') || this.keyboardHeldKeys.has('KeyW') || this.touchHeldKeys.has('ArrowUp'));
      this.activeGame.keys['ArrowDown'] = Boolean(state.down || this.keyboardHeldKeys.has('ArrowDown') || this.keyboardHeldKeys.has('KeyS') || this.touchHeldKeys.has('ArrowDown'));
      if (this.activeGame.keys['ShiftLeft'] !== undefined) {
        this.activeGame.keys['ShiftLeft'] = Boolean(state.nitro || this.keyboardHeldKeys.has('ShiftLeft') || this.touchHeldKeys.has('ShiftLeft'));
      }
    }

    // Direct analog joystick steering for games supporting 360 degree movement
    if (this.activeGame.joystick !== undefined) {
      const mag = Math.hypot(state.axisX, state.axisY);
      if (mag > 0.15) {
        this.activeGame.joystick = {
          x: state.axisX,
          y: state.axisY,
          active: true
        };
      } else if (!this.isTouchJoystickActive) {
        this.activeGame.joystick = { x: 0, y: 0, active: false };
      }
    }

    // In Hexa-Tron: steering turns on direction press
    if (this.activeGameKey === 'hexaTron') {
      if (gamepad.isJustPressed('left')) this.activeGame.handleKeyDown('ArrowLeft');
      if (gamepad.isJustPressed('right')) this.activeGame.handleKeyDown('ArrowRight');
      if (gamepad.isJustPressed('up')) this.activeGame.handleKeyDown('ArrowUp');
      if (gamepad.isJustPressed('down')) this.activeGame.handleKeyDown('ArrowDown');
    }

    // Action A (Space / Jump / Gravity / Fire)
    if (gamepad.isJustPressed('action')) {
      if (this.activeGame.handleKeyDown) this.activeGame.handleKeyDown('Space');
      if (this.activeGame.handleAction) this.activeGame.handleAction();
      if (this.activeGame.jump) this.activeGame.jump();
      if (this.activeGame.fireLaser) this.activeGame.fireLaser();
    }

    // Super / EMP / Bomb (Button B or X)
    if (gamepad.isJustPressed('super')) {
      if (this.activeGame.triggerSuperAbility) this.activeGame.triggerSuperAbility();
      if (this.activeGame.triggerBomb) this.activeGame.triggerBomb();
      if (this.activeGame.triggerEmp) this.activeGame.triggerEmp();
    }

    // Nitro Boost (Button Y or RT)
    if (state.nitro) {
      if (this.activeGame.triggerNitro) this.activeGame.triggerNitro();
    }
  }

  loop(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;
    const rawDt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Prevent sudden huge leaps from frame drops, tab suspension or GC pauses
    const dt = Math.min(Math.max(0.001, rawDt), 0.1);

    // Poll Gamepad every frame
    gamepad.poll();

    if (this.activeGame && this.activeGame.isRunning) {
      this.handleGamepadInput();

      // Track active gameplay time for Global Player Profile
      if (!this.isPaused && !this.activeGame.isPaused) {
        this.playtimeTimer = (this.playtimeTimer || 0) + dt;
        if (this.playtimeTimer >= 10) {
          storage.recordPlayTime(this.playtimeTimer);
          this.playtimeTimer = 0;
        }
      }

      if (!this.isPaused && !this.activeGame.isPaused) {
        // Fixed-timestep physics simulation (60Hz = ~0.016667s) with up to 4 sub-steps
        // Guarantees consistent physics, collision accuracy and speeds on 60Hz, 120Hz, 144Hz & mobile
        const FIXED_STEP = 1 / 60;
        this.physicsAccumulator = (this.physicsAccumulator || 0) + dt;

        let steps = 0;
        while (this.physicsAccumulator >= FIXED_STEP && steps < 4) {
          this.activeGame.update(FIXED_STEP);
          this.particles.update(FIXED_STEP);
          this.physicsAccumulator -= FIXED_STEP;
          steps++;
        }
        if (this.physicsAccumulator > FIXED_STEP * 2) {
          this.physicsAccumulator = 0;
        }

        if (this.activeGameKey === 'quantumBreaker' && this.activeGame.paddle && this.sliderKnob && !this.isSliderActive) {
          const halfWidth = this.activeGame.paddle.width / 2;
          const span = this.activeGame.width - this.activeGame.paddle.width;
          if (span > 0) {
            const ratio = Math.max(0, Math.min(1, (this.activeGame.paddle.x - halfWidth) / span));
            const pct = (ratio * 100).toFixed(1);
            this.sliderKnob.style.left = `${pct}%`;
            if (this.sliderFill) this.sliderFill.style.width = `${pct}%`;
          }
        }
      } else {
        this.physicsAccumulator = 0;
      }

      const shake = this.particles.getShakeOffset();
      this.ctx.setTransform(this.renderScale, 0, 0, this.renderScale, 0, 0);
      this.ctx.save();
      this.ctx.translate(shake.x, shake.y);

      this.activeGame.draw();
      this.particles.draw(this.ctx);

      this.ctx.restore();
    } else {
      this.physicsAccumulator = 0;
    }

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new ArcadeApp();
});

// Offline support / installability. Production builds served over http(s) only: never in the dev
// server, and never under file:// (Electron), where service workers are not available.
if (
  typeof __PWA_ENABLED__ !== 'undefined' && __PWA_ENABLED__ &&
  'serviceWorker' in navigator && /^https?:$/.test(location.protocol)
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('Service worker registration failed:', err);
    });
  });
}
