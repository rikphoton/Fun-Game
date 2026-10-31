// Local Storage persistence for high scores, stats, Cyber Armory, Cyber Lab, Daily Quests & Player Profile

export const SAVE_VERSION = 4;
export const STORAGE_KEY_V4 = 'neonpulse_arcade_v4';
export const STORAGE_BACKUP_KEY = 'neonpulse_arcade_v4_backup';
export const STORAGE_KEY_LEGACY = 'neonpulse_arcade_v3';

const INITIAL_DATA = {
  version: SAVE_VERSION,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  claimedRewards: [],
  highScores: {
    cyberSurvivors: 0,
    neonDash: 0,
    quantumBreaker: 0,
    astroPulse: 0,
    neonDrift: 0,
    hexaTron: 0,
    cyberPacman: 0
  },
  stats: {
    gamesPlayed: 0,
    totalPlayTime: 0,
    playedGames: [],
    enemiesKilled: 0,
    gemsCollected: 0,
    maxSurvivorsLevel: 1,
    dashDistance: 0,
    bricksBroken: 0,
    maxCombo: 0,
    shmupBossesKilled: 0,
    driftDistance: 0,
    tronRivalKills: 0,
    pacmanPelletsEaten: 0,
    pacmanGhostsEaten: 0
  },
  neonCredits: 200,
  inventory: {
    trails: ['cyan'],
    themes: ['cyberpunk'],
    mechs: ['specter']
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
    { id: 'quest_drift', title: 'Highway Phantom', desc: 'Score 1,500 Points in Neon Drift', current: 0, target: 1500, reward: 100, claimed: false, icon: '🏎️' },
    { id: 'quest_tron', title: 'Grid Gladiator', desc: 'Eliminate 4 Rivals in Hexa-Tron', current: 0, target: 4, reward: 100, claimed: false, icon: '🏍️' }
  ],
  achievements: {
    first_game: { id: 'first_game', title: 'Arcade Initiate', desc: 'Play your first game', unlocked: false, icon: '🎮', category: 'General' },
    arcade_beginner: { id: 'arcade_beginner', title: 'Arcade Explorer', desc: 'Play all seven arcade games', unlocked: false, icon: '🕹️', category: 'General' },
    drone_hunter: { id: 'drone_hunter', title: 'Drone Hunter', desc: 'Defeat 50 cyber drones', unlocked: false, icon: '⚡', category: 'Combat' },
    level_ten: { id: 'level_ten', title: 'Apex Survivor', desc: 'Reach Level 10 in Cyber Survivors', unlocked: false, icon: '🛡️', category: 'Combat' },
    survivor_veteran: { id: 'survivor_veteran', title: 'Iron Will', desc: 'Survive for over 5 minutes in Cyber Survivors', unlocked: false, icon: '⏱️', category: 'Combat' },
    gravity_champ: { id: 'gravity_champ', title: 'Gravity Bender', desc: 'Reach 300 score in Neon Dash', unlocked: false, icon: '🚀', category: 'Arcade' },
    brick_wrecker: { id: 'brick_wrecker', title: 'Quantum Breaker', desc: 'Shatter 50 bricks', unlocked: false, icon: '💥', category: 'Arcade' },
    combo_god: { id: 'combo_god', title: 'Combo Maestro', desc: 'Achieve a 15x Combo in Quantum Breaker', unlocked: false, icon: '🔥', category: 'Arcade' },
    star_ace: { id: 'star_ace', title: 'Star Fleet Ace', desc: 'Destroy the Mothership in Astro Pulse', unlocked: false, icon: '🌠', category: 'Combat' },
    speed_demon: { id: 'speed_demon', title: 'Speed Demon', desc: 'Reach 250 km/h in Neon Drift', unlocked: false, icon: '🏎️', category: 'Racing' },
    highway_legend: { id: 'highway_legend', title: 'Highway Legend', desc: 'Travel 3,000 meters in Neon Drift', unlocked: false, icon: '🛣️', category: 'Racing' },
    grid_master: { id: 'grid_master', title: 'Grid Master', desc: 'Survive as the Last Operative Standing in Hexa-Tron', unlocked: false, icon: '🏍️', category: 'Grid' },
    pacman_ghostbuster: { id: 'pacman_ghostbuster', title: 'Cyber Ghostbuster', desc: 'Chomp 16 ghosts in Cyber Pacman', unlocked: false, icon: '👻', category: 'Arcade' },
    collector: { id: 'collector', title: 'Master Collector', desc: 'Unlock 6 tech upgrades or custom cosmetics', unlocked: false, icon: '💎', category: 'Progression' },
    dreadnought_slayer: { id: 'dreadnought_slayer', title: 'Dreadnought Slayer', desc: 'Destroy the Mega Dreadnought in Cyber Survivors', unlocked: false, icon: '👾', category: 'Combat' },
    multiball_mayhem: { id: 'multiball_mayhem', title: 'Multi-Ball Mayhem', desc: 'Command 6 or more balls at once in Quantum Breaker', unlocked: false, icon: '💥', category: 'Arcade' },
    tech_master: { id: 'tech_master', title: 'Cyber Engineer', desc: 'Upgrade any tech in the Cyber Lab', unlocked: false, icon: '🧬', category: 'Progression' },
    bounty_hunter: { id: 'bounty_hunter', title: 'Bounty Hunter', desc: 'Complete and claim a daily quest', unlocked: false, icon: '🎯', category: 'General' },
    score_centurion: { id: 'score_centurion', title: 'All-Rounder', desc: 'Score 500+ in at least 4 different games', unlocked: false, icon: '⭐', category: 'Mastery' },
    arcade_master: { id: 'arcade_master', title: 'All-Star Champion', desc: 'Score over 1,000 in all games', unlocked: false, icon: '👑', category: 'Mastery' }
  },
  settings: {
    sfxVolume: 0.6,
    bgmVolume: 0.4,
    crtFilter: true,
    bgmTrack: 'synthwave',
    announcerEnabled: true,
    reducedMotion: false,
    haptics: true
  }
};

// Keep saved quest progress by quest id. New quests added in later
// versions are appended with fresh progress, and removed quests are dropped.
export function mergeQuests(saved) {
  const defaults = INITIAL_DATA.quests;
  if (!Array.isArray(saved)) return JSON.parse(JSON.stringify(defaults));
  return defaults.map((def) => {
    const old = saved.find((q) => q && q.id === def.id);
    if (!old) return { ...def };
    const current = Number.isFinite(old.current) ? Math.max(0, Math.min(def.target, old.current)) : 0;
    return { ...def, current, claimed: !!old.claimed };
  });
}

class StorageManager {
  constructor() {
    this.data = this.load();
    this.onAchievementUnlock = null;
    this.onCreditsChange = null;
    this.onQuestUpdate = null;

    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', () => this.save());
      window.addEventListener('beforeunload', () => this.save());
    }
  }

  validateAndSanitize(raw) {
    if (!raw || typeof raw !== 'object') {
      return JSON.parse(JSON.stringify(INITIAL_DATA));
    }
    const clean = JSON.parse(JSON.stringify(INITIAL_DATA));
    clean.version = SAVE_VERSION;
    clean.updatedAt = Date.now();

    // High Scores (Validated against whitelist of games and realistic limits)
    const VALID_GAME_KEYS = ['cyberSurvivors', 'neonDash', 'quantumBreaker', 'astroPulse', 'neonDrift', 'hexaTron', 'cyberPacman'];
    const MAX_SCORE = 99999999;
    if (raw.highScores && typeof raw.highScores === 'object') {
      for (const [k, v] of Object.entries(raw.highScores)) {
        if (VALID_GAME_KEYS.includes(k) && typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          clean.highScores[k] = Math.min(MAX_SCORE, Math.floor(v));
        }
      }
    }

    // Stats
    if (raw.stats && typeof raw.stats === 'object') {
      for (const [k, v] of Object.entries(raw.stats)) {
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          clean.stats[k] = Math.floor(v);
        }
      }
      if (Array.isArray(raw.stats.playedGames)) {
        clean.stats.playedGames = raw.stats.playedGames.filter(x => typeof x === 'string' && VALID_GAME_KEYS.includes(x));
      }
    }

    // Credits
    if (typeof raw.neonCredits === 'number' && Number.isFinite(raw.neonCredits) && raw.neonCredits >= 0) {
      clean.neonCredits = Math.min(10000000, Math.floor(raw.neonCredits));
    }

    // Cyber Lab
    if (raw.cyberLab && typeof raw.cyberLab === 'object') {
      for (const [k, v] of Object.entries(raw.cyberLab)) {
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
          clean.cyberLab[k] = Math.min(5, Math.floor(v));
        }
      }
    }

    // Quests
    clean.quests = mergeQuests(raw.quests);

    // Inventory
    if (raw.inventory && typeof raw.inventory === 'object') {
      if (Array.isArray(raw.inventory.trails)) {
        clean.inventory.trails = Array.from(new Set([...clean.inventory.trails, ...raw.inventory.trails.filter(x => typeof x === 'string')]));
      }
      if (Array.isArray(raw.inventory.themes)) {
        clean.inventory.themes = Array.from(new Set([...clean.inventory.themes, ...raw.inventory.themes.filter(x => typeof x === 'string')]));
      }
      if (Array.isArray(raw.inventory.mechs)) {
        clean.inventory.mechs = Array.from(new Set([...clean.inventory.mechs, ...raw.inventory.mechs.filter(x => typeof x === 'string')]));
      }
    }

    // Equipped (Strictly validated against unlocked inventory)
    if (raw.equipped && typeof raw.equipped === 'object') {
      if (typeof raw.equipped.trail === 'string') clean.equipped.trail = raw.equipped.trail;
      if (typeof raw.equipped.theme === 'string') clean.equipped.theme = raw.equipped.theme;
      if (typeof raw.equipped.mech === 'string') clean.equipped.mech = raw.equipped.mech;
    }
    if (!clean.inventory.trails.includes(clean.equipped.trail)) {
      clean.equipped.trail = clean.inventory.trails[0] || 'cyan';
    }
    if (!clean.inventory.themes.includes(clean.equipped.theme)) {
      clean.equipped.theme = clean.inventory.themes[0] || 'cyberpunk';
    }
    if (!clean.inventory.mechs.includes(clean.equipped.mech)) {
      clean.equipped.mech = clean.inventory.mechs[0] || 'specter';
    }

    // Achievements
    if (raw.achievements && typeof raw.achievements === 'object') {
      for (const [k, v] of Object.entries(raw.achievements)) {
        if (clean.achievements[k] && v && typeof v === 'object' && v.unlocked) {
          clean.achievements[k].unlocked = true;
        }
      }
    }

    // Claimed rewards
    if (Array.isArray(raw.claimedRewards)) {
      clean.claimedRewards = raw.claimedRewards.filter(x => typeof x === 'string');
    }

    // Settings
    if (raw.settings && typeof raw.settings === 'object') {
      if (typeof raw.settings.sfxVolume === 'number') clean.settings.sfxVolume = Math.max(0, Math.min(1, raw.settings.sfxVolume));
      if (typeof raw.settings.bgmVolume === 'number') clean.settings.bgmVolume = Math.max(0, Math.min(1, raw.settings.bgmVolume));
      if (typeof raw.settings.crtFilter === 'boolean') clean.settings.crtFilter = raw.settings.crtFilter;
      if (typeof raw.settings.bgmTrack === 'string') clean.settings.bgmTrack = raw.settings.bgmTrack;
      if (typeof raw.settings.announcerEnabled === 'boolean') clean.settings.announcerEnabled = raw.settings.announcerEnabled;
      if (typeof raw.settings.reducedMotion === 'boolean') clean.settings.reducedMotion = raw.settings.reducedMotion;
      if (typeof raw.settings.haptics === 'boolean') clean.settings.haptics = raw.settings.haptics;
    }

    return clean;
  }

  load() {
    let raw = null;
    let needsSave = false;

    // 1. Try v4 primary save
    try {
      const stored = localStorage.getItem(STORAGE_KEY_V4);
      if (stored) {
        raw = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('LocalStorage v4 parse error, attempting backup recovery:', e);
      try {
        const backup = localStorage.getItem(STORAGE_BACKUP_KEY);
        if (backup) {
          raw = JSON.parse(backup);
          needsSave = true;
        }
      } catch (err) {
        console.warn('Backup recovery failed:', err);
      }
    }

    // 2. If no v4 data, migrate from legacy formats (v3, v2, v1)
    if (!raw) {
      const legacyKeys = [STORAGE_KEY_LEGACY, 'neonpulse_arcade_v2', 'neonpulse_arcade'];
      for (const lk of legacyKeys) {
        try {
          const legacyStored = localStorage.getItem(lk);
          if (legacyStored) {
            raw = JSON.parse(legacyStored);
            needsSave = true;
            break;
          }
        } catch (e) {
          // continue checking other legacy keys
        }
      }
    }

    const sanitized = this.validateAndSanitize(raw);
    if (needsSave) {
      this.data = sanitized;
      this.save();
    }
    return sanitized;
  }

  save() {
    try {
      this.data.updatedAt = Date.now();
      const serialized = JSON.stringify(this.data);
      // Write backup first
      localStorage.setItem(STORAGE_BACKUP_KEY, serialized);
      // Write v4 primary
      localStorage.setItem(STORAGE_KEY_V4, serialized);
      // Mirror to legacy v3 key for backward-compatibility with tests & existing bookmarks
      localStorage.setItem(STORAGE_KEY_LEGACY, serialized);
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // --- SAVE DATA IMPORT / EXPORT & BACKUP RECOVERY ---

  exportSaveData() {
    const payload = {
      app: 'NeonPulseArcade',
      version: SAVE_VERSION,
      exportedAt: new Date().toISOString(),
      data: this.data
    };
    return JSON.stringify(payload, null, 2);
  }

  importSaveData(input) {
    try {
      if (!input) return { success: false, error: 'Empty save data' };
      let parsed = typeof input === 'string' ? JSON.parse(input) : input;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { success: false, error: 'Invalid save payload structure' };
      }

      // Safe rejection of unsupported future save versions
      if (typeof parsed.version === 'number' && parsed.version > SAVE_VERSION) {
        return { success: false, error: `Unsupported future save format (v${parsed.version})` };
      }

      const rawData = (parsed && parsed.data && parsed.app === 'NeonPulseArcade') ? parsed.data : parsed;
      if (!rawData || typeof rawData !== 'object' || Array.isArray(rawData)) {
        return { success: false, error: 'Malformed save data contents' };
      }

      // Migrate older formats cleanly
      let migrated = rawData;
      if (rawData.version === 1 || rawData.version === 2 || rawData.version === 3) {
        migrated = this.migrate(rawData);
      }

      this.data = this.validateAndSanitize(migrated);
      this.save();
      if (this.onCreditsChange) this.onCreditsChange(this.data.neonCredits);
      if (this.onQuestUpdate) this.onQuestUpdate();
      return { success: true, version: this.data.version };
    } catch (e) {
      return { success: false, error: e.message || 'Corrupted save data' };
    }
  }

  // --- SEPARATE RESET OPTIONS ---

  resetGameScores(gameKey = null) {
    if (gameKey) {
      if (this.data.highScores[gameKey] !== undefined) {
        this.data.highScores[gameKey] = 0;
      }
    } else {
      for (const k of Object.keys(this.data.highScores)) {
        this.data.highScores[k] = 0;
      }
    }
    this.save();
  }

  resetProgression() {
    this.data.quests = JSON.parse(JSON.stringify(INITIAL_DATA.quests));
    this.data.cyberLab = JSON.parse(JSON.stringify(INITIAL_DATA.cyberLab));
    this.data.stats = JSON.parse(JSON.stringify(INITIAL_DATA.stats));
    this.data.claimedRewards = [];
    this.save();
    if (this.onQuestUpdate) this.onQuestUpdate();
  }

  resetSettings() {
    this.data.settings = JSON.parse(JSON.stringify(INITIAL_DATA.settings));
    this.save();
  }

  resetAll() {
    this.data = JSON.parse(JSON.stringify(INITIAL_DATA));
    this.save();
    if (this.onCreditsChange) this.onCreditsChange(this.data.neonCredits);
    if (this.onQuestUpdate) this.onQuestUpdate();
  }

  // --- CREDITS & UPGRADES ---

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
    if (this.getLabLevel(id) < 5 && this.spendCredits(cost)) {
      this.data.cyberLab[id] = (this.data.cyberLab[id] || 0) + 1;
      this.unlockAchievement('tech_master');
      this.checkCollectorAchievement();
      this.save();
      return true;
    }
    return false;
  }

  checkCollectorAchievement() {
    const totalTech = Object.values(this.data.cyberLab).reduce((a, b) => a + b, 0);
    const totalCosmetics = (this.data.inventory.trails?.length || 0) + (this.data.inventory.themes?.length || 0);
    if (totalTech + totalCosmetics >= 6) {
      this.unlockAchievement('collector');
    }
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
      // Prevent duplicate reward claims
      const rewardKey = `quest_${questId}`;
      if (this.data.claimedRewards && this.data.claimedRewards.includes(rewardKey)) {
        q.claimed = true;
        this.save();
        return 0;
      }
      q.claimed = true;
      if (!this.data.claimedRewards) this.data.claimedRewards = [];
      this.data.claimedRewards.push(rewardKey);
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
      this.checkCollectorAchievement();
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

  // --- PLAYER PROFILE & STATS TRACKING ---

  getProfileStats() {
    const scores = this.data.highScores;
    const totalScore = Object.values(scores).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    const achievementsList = Object.values(this.data.achievements);
    const unlockedCount = achievementsList.filter(a => a.unlocked).length;
    const totalAch = achievementsList.length;

    // Player level progression curve based on score + credits + games
    const xp = (totalScore * 0.1) + this.getCredits() + (this.data.stats.gamesPlayed * 50);
    const playerLevel = Math.max(1, Math.floor(1 + Math.sqrt(xp / 120)));

    return {
      version: this.data.version,
      gamesPlayed: this.data.stats.gamesPlayed || 0,
      totalPlayTime: this.data.stats.totalPlayTime || 0,
      totalScore,
      highScores: { ...scores },
      playerLevel,
      neonCredits: this.getCredits(),
      achievementsUnlocked: unlockedCount,
      totalAchievements: totalAch,
      completionPercent: totalAch > 0 ? Math.round((unlockedCount / totalAch) * 100) : 0,
      stats: { ...this.data.stats }
    };
  }

  recordPlayTime(seconds) {
    if (typeof seconds === 'number' && seconds > 0) {
      this.data.stats.totalPlayTime = (this.data.stats.totalPlayTime || 0) + Math.round(seconds);
      this.save();
    }
  }

  recordGamePlayed(gameKey) {
    this.data.stats.gamesPlayed = (this.data.stats.gamesPlayed || 0) + 1;
    if (gameKey) {
      if (!Array.isArray(this.data.stats.playedGames)) this.data.stats.playedGames = [];
      if (!this.data.stats.playedGames.includes(gameKey)) {
        this.data.stats.playedGames.push(gameKey);
      }
      if (this.data.stats.playedGames.length >= 7) {
        this.unlockAchievement('arcade_beginner');
      }
    }
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

  recordPacmanGhostEaten(count = 1) {
    this.data.stats.pacmanGhostsEaten = (this.data.stats.pacmanGhostsEaten || 0) + count;
    if (this.data.stats.pacmanGhostsEaten >= 16) {
      this.unlockAchievement('pacman_ghostbuster');
    }
    this.save();
  }

  checkAchievements() {
    const scores = this.data.highScores;
    if (scores.neonDash >= 300) {
      this.unlockAchievement('gravity_champ');
    }
    let qualifyingCount = 0;
    for (const s of Object.values(scores)) {
      if (s >= 500) qualifyingCount++;
    }
    if (qualifyingCount >= 4) {
      this.unlockAchievement('score_centurion');
    }
    if (
      scores.cyberSurvivors >= 1000 &&
      scores.neonDash >= 1000 &&
      scores.quantumBreaker >= 1000 &&
      scores.astroPulse >= 1000 &&
      scores.neonDrift >= 1000 &&
      scores.hexaTron >= 1000 &&
      scores.cyberPacman >= 1000
    ) {
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
