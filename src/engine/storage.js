// Local Storage persistence for high scores, lifetime player stats, achievements & Cyber Armory

const STORAGE_KEY = 'neonpulse_arcade_v2';

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
  neonCredits: 150, // Starting bonus credits
  inventory: {
    trails: ['cyan'],
    themes: ['cyberpunk']
  },
  equipped: {
    trail: 'cyan',
    theme: 'cyberpunk',
    mech: 'specter'
  },
  achievements: {
    first_game: { id: 'first_game', title: 'Arcade Initiate', desc: 'Play your first game', unlocked: false, icon: '🎮' },
    drone_hunter: { id: 'drone_hunter', title: 'Drone Hunter', desc: 'Defeat 50 cyber drones', unlocked: false, icon: '⚡' },
    level_ten: { id: 'level_ten', title: 'Apex Survivor', desc: 'Reach Level 10 in Cyber Survivors', unlocked: false, icon: '🛡️' },
    gravity_champ: { id: 'gravity_champ', title: 'Gravity Bender', desc: 'Reach 300 score in Neon Dash', unlocked: false, icon: '🚀' },
    brick_wrecker: { id: 'brick_wrecker', title: 'Quantum Breaker', desc: 'Shatter 50 bricks', unlocked: false, icon: '💥' },
    combo_god: { id: 'combo_god', title: 'Combo Maestro', desc: 'Achieve a 15x Combo in Quantum Breaker', unlocked: false, icon: '🔥' },
    arcade_master: { id: 'arcade_master', title: 'All-Star Champion', desc: 'Score over 1,000 in all 3 games', unlocked: false, icon: '👑' },
    first_purchase: { id: 'first_purchase', title: 'Cyber Shopper', desc: 'Unlock an item in the Cyber Armory', unlocked: false, icon: '🛍️' }
  },
  settings: {
    sfxVolume: 0.6,
    bgmVolume: 0.4,
    crtFilter: true,
    bgmTrack: 'synthwave'
  }
};

class StorageManager {
  constructor() {
    this.data = this.load();
    this.onAchievementUnlock = null;
    this.onCreditsChange = null;
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
          inventory: {
            trails: parsed.inventory?.trails || ['cyan'],
            themes: parsed.inventory?.themes || ['cyberpunk']
          },
          equipped: { ...INITIAL_DATA.equipped, ...(parsed.equipped || {}) },
          achievements: { ...INITIAL_DATA.achievements, ...(parsed.achievements || {}) },
          settings: { ...INITIAL_DATA.settings, ...(parsed.settings || {}) }
        };
      }
    } catch (e) {
      console.warn('LocalStorage load error:', e);
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

  getCredits() {
    return this.data.neonCredits || 0;
  }

  addCredits(amount) {
    this.data.neonCredits = (this.data.neonCredits || 0) + amount;
    this.save();
    if (this.onCreditsChange) this.onCreditsChange(this.data.neonCredits);
    return this.data.neonCredits;
  }

  spendCredits(cost) {
    if (this.getCredits() >= cost) {
      this.data.neonCredits -= cost;
      this.unlockAchievement('first_purchase');
      this.save();
      if (this.onCreditsChange) this.onCreditsChange(this.data.neonCredits);
      return true;
    }
    return false;
  }

  hasItem(category, id) {
    return (this.data.inventory[category] || []).includes(id);
  }

  unlockItem(category, id) {
    if (!this.hasItem(category, id)) {
      if (!this.data.inventory[category]) this.data.inventory[category] = [];
      this.data.inventory[category].push(id);
      this.save();
    }
  }

  equipItem(category, id) {
    this.data.equipped[category] = id;
    this.save();
  }

  getEquipped(category) {
    return this.data.equipped[category] || 'cyan';
  }

  getHighScore(gameKey) {
    return this.data.highScores[gameKey] || 0;
  }

  saveHighScore(gameKey, score) {
    if (score > (this.data.highScores[gameKey] || 0)) {
      this.data.highScores[gameKey] = score;
      this.save();
      this.checkAchievements();
      return true;
    }
    return false;
  }

  recordGamePlayed() {
    this.data.stats.gamesPlayed = (this.data.stats.gamesPlayed || 0) + 1;
    this.unlockAchievement('first_game');
    this.addCredits(25); // Participation reward
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
      this.addCredits(100); // 100 bonus credits for achievements!
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
