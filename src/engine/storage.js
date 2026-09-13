// Local Storage persistence for high scores, stats, Cyber Armory, Cyber Lab & Daily Quests

const STORAGE_KEY = 'neonpulse_arcade_v3';

const INITIAL_DATA = {
  highScores: {
    cyberSurvivors: 0,
    neonDash: 0,
    quantumBreaker: 0,
    astroPulse: 0,
    neonDrift: 0
  },
  stats: {
    gamesPlayed: 0,
    enemiesKilled: 0,
    gemsCollected: 0,
    maxSurvivorsLevel: 1,
    dashDistance: 0,
    bricksBroken: 0,
    maxCombo: 0,
    shmupBossesKilled: 0,
    driftDistance: 0
  },
  neonCredits: 200,
  inventory: {
    trails: ['cyan'],
    themes: ['cyberpunk']
  },
  equipped: {
    trail: 'cyan',
    theme: 'cyberpunk',
    mech: 'specter'
  },
  cyberLab: {
    hull: 0,       // +15 HP per level
    thrusters: 0,  // +8% Speed per level
    shield: 0,     // Extra starting shield
    siphon: 0      // +20% Bonus credits per level
  },
  quests: [
    { id: 'quest_survivor', title: 'Swarm Purge', desc: 'Defeat 40 Drones in Cyber Survivors', current: 0, target: 40, reward: 75, claimed: false, icon: '🛸' },
    { id: 'quest_dash', title: 'Sub-Light Sprint', desc: 'Run 400m in Neon Dash', current: 0, target: 400, reward: 75, claimed: false, icon: '🚀' },
    { id: 'quest_breaker', title: 'Demolition Wave', desc: 'Shatter 30 Bricks in Quantum Breaker', current: 0, target: 30, reward: 75, claimed: false, icon: '💥' },
    { id: 'quest_shmup', title: 'Star Fleet Ace', desc: 'Score 1,000 Points in Astro Pulse', current: 0, target: 1000, reward: 100, claimed: false, icon: '🌠' },
    { id: 'quest_drift', title: 'Highway Phantom', desc: 'Score 1,500 Points in Neon Drift', current: 0, target: 1500, reward: 100, claimed: false, icon: '🏎️' }
  ],
  achievements: {
    first_game: { id: 'first_game', title: 'Arcade Initiate', desc: 'Play your first game', unlocked: false, icon: '🎮' },
    drone_hunter: { id: 'drone_hunter', title: 'Drone Hunter', desc: 'Defeat 50 cyber drones', unlocked: false, icon: '⚡' },
    level_ten: { id: 'level_ten', title: 'Apex Survivor', desc: 'Reach Level 10 in Cyber Survivors', unlocked: false, icon: '🛡️' },
    gravity_champ: { id: 'gravity_champ', title: 'Gravity Bender', desc: 'Reach 300 score in Neon Dash', unlocked: false, icon: '🚀' },
    brick_wrecker: { id: 'brick_wrecker', title: 'Quantum Breaker', desc: 'Shatter 50 bricks', unlocked: false, icon: '💥' },
    combo_god: { id: 'combo_god', title: 'Combo Maestro', desc: 'Achieve a 15x Combo in Quantum Breaker', unlocked: false, icon: '🔥' },
    star_ace: { id: 'star_ace', title: 'Star Fleet Ace', desc: 'Destroy the Mothership in Astro Pulse', unlocked: false, icon: '🌠' },
    speed_demon: { id: 'speed_demon', title: 'Speed Demon', desc: 'Reach 250 km/h in Neon Drift', unlocked: false, icon: '🏎️' },
    highway_legend: { id: 'highway_legend', title: 'Highway Legend', desc: 'Travel 3,000 meters in Neon Drift', unlocked: false, icon: '🛣️' },
    dreadnought_slayer: { id: 'dreadnought_slayer', title: 'Dreadnought Slayer', desc: 'Destroy the Mega Dreadnought in Cyber Survivors', unlocked: false, icon: '👾' },
    multiball_mayhem: { id: 'multiball_mayhem', title: 'Multi-Ball Mayhem', desc: 'Command 6 or more balls at once in Quantum Breaker', unlocked: false, icon: '💥' },
    tech_master: { id: 'tech_master', title: 'Cyber Engineer', desc: 'Upgrade any tech in the Cyber Lab', unlocked: false, icon: '🧬' },
    bounty_hunter: { id: 'bounty_hunter', title: 'Bounty Hunter', desc: 'Complete and claim a daily quest', unlocked: false, icon: '🎯' },
    arcade_master: { id: 'arcade_master', title: 'All-Star Champion', desc: 'Score over 1,000 in all games', unlocked: false, icon: '👑' }
  },
  settings: {
    sfxVolume: 0.6,
    bgmVolume: 0.4,
    crtFilter: true,
    bgmTrack: 'synthwave',
    announcerEnabled: true
  }
};

class StorageManager {
  constructor() {
    this.data = this.load();
    this.onAchievementUnlock = null;
    this.onCreditsChange = null;
    this.onQuestUpdate = null;
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
          cyberLab: { ...INITIAL_DATA.cyberLab, ...(parsed.cyberLab || {}) },
          quests: (parsed.quests && parsed.quests.length === 4) ? parsed.quests : INITIAL_DATA.quests,
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
    const siphonBonus = 1 + (this.getLabLevel('siphon') * 0.2);
    const finalAmount = Math.round(amount * siphonBonus);
    this.data.neonCredits = (this.data.neonCredits || 0) + finalAmount;
    this.save();
    if (this.onCreditsChange) this.onCreditsChange(this.data.neonCredits);
    return this.data.neonCredits;
  }

  spendCredits(cost) {
    if (this.getCredits() >= cost) {
      this.data.neonCredits -= cost;
      this.save();
      if (this.onCreditsChange) this.onCreditsChange(this.data.neonCredits);
      return true;
    }
    return false;
  }

  // --- CYBER LAB TECH TREE ---

  getLabLevel(id) {
    return this.data.cyberLab[id] || 0;
  }

  getLabUpgradeLevel(id) {
    return this.getLabLevel(id);
  }

  getLabBonus(type) {
    const lvl = this.getLabLevel(type);
    if (type === 'hull') return lvl * 20;         // +20 HP per lvl
    if (type === 'thrusters') return lvl * 0.10;  // +10% speed
    if (type === 'shield') return lvl >= 1;       // Free extra shield
    if (type === 'siphon') return lvl * 0.25;     // +25% credits
    return 0;
  }

  upgradeLab(id, cost) {
    if (this.getLabLevel(id) < 3 && this.spendCredits(cost)) {
      this.data.cyberLab[id] = (this.data.cyberLab[id] || 0) + 1;
      this.unlockAchievement('tech_master');
      this.save();
      return true;
    }
    return false;
  }

  // --- DAILY QUESTS & BOUNTIES ---

  updateQuestProgress(questId, amount, isAbsolute = false) {
    const q = this.data.quests.find(item => item.id === questId);
    if (q && !q.claimed) {
      if (isAbsolute) {
        if (amount > q.current) q.current = Math.min(q.target, amount);
      } else {
        q.current = Math.min(q.target, q.current + amount);
      }
      this.save();
      if (this.onQuestUpdate) this.onQuestUpdate();
    }
  }

  claimQuest(questId) {
    const q = this.data.quests.find(item => item.id === questId);
    if (q && q.current >= q.target && !q.claimed) {
      q.claimed = true;
      this.addCredits(q.reward);
      this.unlockAchievement('bounty_hunter');
      this.save();
      if (this.onQuestUpdate) this.onQuestUpdate();
      return q.reward;
    }
    return 0;
  }

  // --- COSMETICS & HIGH SCORES ---

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
    this.addCredits(25);
    this.save();
  }

  recordEnemiesKilled(count = 1) {
    this.data.stats.enemiesKilled = (this.data.stats.enemiesKilled || 0) + count;
    this.updateQuestProgress('quest_survivor', count);
    if (this.data.stats.enemiesKilled >= 50) {
      this.unlockAchievement('drone_hunter');
    }
    this.save();
  }

  recordBricksBroken(count = 1) {
    this.data.stats.bricksBroken = (this.data.stats.bricksBroken || 0) + count;
    this.updateQuestProgress('quest_breaker', count);
    if (this.data.stats.bricksBroken >= 50) {
      this.unlockAchievement('brick_wrecker');
    }
    this.save();
  }

  recordDistance(distance) {
    this.updateQuestProgress('quest_dash', distance, true);
  }

  recordShmupScore(score) {
    this.updateQuestProgress('quest_shmup', score, true);
  }

  recordShmupBossKill() {
    this.data.stats.shmupBossesKilled = (this.data.stats.shmupBossesKilled || 0) + 1;
    this.unlockAchievement('star_ace');
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
    if (scores.cyberSurvivors >= 1000 && scores.neonDash >= 1000 && scores.quantumBreaker >= 1000 && scores.astroPulse >= 1000) {
      this.unlockAchievement('arcade_master');
    }
  }

  unlockAchievement(id) {
    if (this.data.achievements[id] && !this.data.achievements[id].unlocked) {
      this.data.achievements[id].unlocked = true;
      this.addCredits(100);
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
