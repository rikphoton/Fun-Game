// Local Storage persistence for high scores, lifetime player stats & achievements

const STORAGE_KEY = 'neonpulse_arcade_v1';

const INITIAL_DATA = {
  highScores: {
    cyberSurvivors: 0,
    neonDash: 0,
    quantumBreaker: 0
  },
  stats: {
    gamesPlayed: 0,
    enemiesKilled: 0,
    gemsCollected: 0,
    maxSurvivorsLevel: 1,
    dashDistance: 0,
    bricksBroken: 0,
    maxCombo: 0
  },
  achievements: {
    first_game: { id: 'first_game', title: 'Arcade Initiate', desc: 'Play your first game', unlocked: false, icon: '🎮' },
    drone_hunter: { id: 'drone_hunter', title: 'Drone Hunter', desc: 'Defeat 50 cyber drones', unlocked: false, icon: '⚡' },
    level_ten: { id: 'level_ten', title: 'Apex Survivor', desc: 'Reach Level 10 in Cyber Survivors', unlocked: false, icon: '🛡️' },
    gravity_champ: { id: 'gravity_champ', title: 'Gravity Bender', desc: 'Reach 300 score in Neon Dash', unlocked: false, icon: '🚀' },
    brick_wrecker: { id: 'brick_wrecker', title: 'Quantum Breaker', desc: 'Shatter 50 bricks', unlocked: false, icon: '💥' },
    combo_god: { id: 'combo_god', title: 'Combo Maestro', desc: 'Achieve a 15x Combo in Quantum Breaker', unlocked: false, icon: '🔥' },
    arcade_master: { id: 'arcade_master', title: 'All-Star Champion', desc: 'Score over 1,000 in all 3 games', unlocked: false, icon: '👑' }
  },
  settings: {
    sfxVolume: 0.7,
    bgmVolume: 0.5,
    crtFilter: true,
    particlesEnabled: true
  }
};

class StorageManager {
  constructor() {
    this.data = this.load();
    this.onAchievementUnlock = null;
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...INITIAL_DATA,
          ...parsed,
          highScores: { ...INITIAL_DATA.highScores, ...(parsed.highScores || {}) },
          stats: { ...INITIAL_DATA.stats, ...(parsed.stats || {}) },
          achievements: { ...INITIAL_DATA.achievements, ...(parsed.achievements || {}) },
          settings: { ...INITIAL_DATA.settings, ...(parsed.settings || {}) }
        };
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return JSON.parse(JSON.stringify(INITIAL_DATA));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  getHighScore(gameKey) {
    return this.data.highScores[gameKey] || 0;
  }

  saveHighScore(gameKey, score) {
    if (score > (this.data.highScores[gameKey] || 0)) {
      this.data.highScores[gameKey] = score;
      this.save();
      this.checkAchievements();
      return true; // New record!
    }
    return false;
  }

  recordGamePlayed() {
    this.data.stats.gamesPlayed = (this.data.stats.gamesPlayed || 0) + 1;
    this.unlockAchievement('first_game');
    this.save();
  }

  recordEnemiesKilled(count = 1) {
    this.data.stats.enemiesKilled = (this.data.stats.enemiesKilled || 0) + count;
    if (this.data.stats.enemiesKilled >= 50) {
      this.unlockAchievement('drone_hunter');
    }
    this.save();
  }

  recordBricksBroken(count = 1) {
    this.data.stats.bricksBroken = (this.data.stats.bricksBroken || 0) + count;
    if (this.data.stats.bricksBroken >= 50) {
      this.unlockAchievement('brick_wrecker');
    }
    this.save();
  }

  recordCombo(combo) {
    if (combo > (this.data.stats.maxCombo || 0)) {
      this.data.stats.maxCombo = combo;
    }
    if (combo >= 15) {
      this.unlockAchievement('combo_god');
    }
    this.save();
  }

  recordSurvivorLevel(lvl) {
    if (lvl > (this.data.stats.maxSurvivorsLevel || 1)) {
      this.data.stats.maxSurvivorsLevel = lvl;
    }
    if (lvl >= 10) {
      this.unlockAchievement('level_ten');
    }
    this.save();
  }

  checkAchievements() {
    const scores = this.data.highScores;
    if (scores.neonDash >= 300) {
      this.unlockAchievement('gravity_champ');
    }
    if (scores.cyberSurvivors >= 1000 && scores.neonDash >= 1000 && scores.quantumBreaker >= 1000) {
      this.unlockAchievement('arcade_master');
    }
  }

  unlockAchievement(id) {
    if (this.data.achievements[id] && !this.data.achievements[id].unlocked) {
      this.data.achievements[id].unlocked = true;
      this.save();
      if (this.onAchievementUnlock) {
        this.onAchievementUnlock(this.data.achievements[id]);
      }
    }
  }

  getSetting(key) {
    return this.data.settings[key];
  }

  setSetting(key, val) {
    this.data.settings[key] = val;
    this.save();
  }
}

export const storage = new StorageManager();
