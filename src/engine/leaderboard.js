// NeonPulse Arcade - Local Hall of Fame (scores are stored in this browser only)
import { sound } from './audio.js';
import { localDateString } from './compat.js';

const STORAGE_KEY_LB = 'neonpulse_leaderboards_v1';

// Legendary Default High Scores across all arcade games
const DEFAULT_BOARDS = {
  cyberSurvivors: [
    { tag: 'NEO', score: 32400, date: '2026-09-10' },
    { tag: 'RIK', score: 28950, date: '2026-09-11' },
    { tag: 'ACE', score: 24600, date: '2026-09-09' },
    { tag: 'CYB', score: 19800, date: '2026-09-08' },
    { tag: 'VAL', score: 16500, date: '2026-09-07' },
    { tag: 'ZED', score: 13200, date: '2026-09-06' },
    { tag: 'KAI', score: 10400, date: '2026-09-05' },
    { tag: 'GHO', score: 8750,  date: '2026-09-04' },
    { tag: 'VEX', score: 6200,  date: '2026-09-03' },
    { tag: 'ION', score: 4500,  date: '2026-09-02' }
  ],
  neonDash: [
    { tag: 'RIK', score: 4850, date: '2026-09-12' },
    { tag: 'DSH', score: 4200, date: '2026-09-10' },
    { tag: 'SPD', score: 3600, date: '2026-09-09' },
    { tag: 'FLY', score: 3100, date: '2026-09-08' },
    { tag: 'RUN', score: 2650, date: '2026-09-07' },
    { tag: 'AIR', score: 2200, date: '2026-09-06' },
    { tag: 'JET', score: 1800, date: '2026-09-05' },
    { tag: 'ZOZ', score: 1450, date: '2026-09-04' },
    { tag: 'NXT', score: 1100, date: '2026-09-03' },
    { tag: 'GLD', score: 850,  date: '2026-09-02' }
  ],
  quantumBreaker: [
    { tag: 'BRK', score: 54000, date: '2026-09-11' },
    { tag: 'RIK', score: 46500, date: '2026-09-12' },
    { tag: 'CMB', score: 39000, date: '2026-09-10' },
    { tag: 'MAX', score: 32000, date: '2026-09-09' },
    { tag: 'GEM', score: 26500, date: '2026-09-08' },
    { tag: 'ARC', score: 21000, date: '2026-09-07' },
    { tag: 'PWR', score: 17500, date: '2026-09-06' },
    { tag: 'HIT', score: 14000, date: '2026-09-05' },
    { tag: 'RAY', score: 11500, date: '2026-09-04' },
    { tag: 'ORB', score: 8000,  date: '2026-09-03' }
  ],
  astroPulse: [
    { tag: 'ACE', score: 18500, date: '2026-09-12' },
    { tag: 'RIK', score: 15200, date: '2026-09-11' },
    { tag: 'SHM', score: 12800, date: '2026-09-10' },
    { tag: 'PIL', score: 10400, date: '2026-09-09' },
    { tag: 'BOM', score: 8700,  date: '2026-09-08' },
    { tag: 'MIS', score: 6900,  date: '2026-09-07' },
    { tag: 'STR', score: 5400,  date: '2026-09-06' },
    { tag: 'LAS', score: 4100,  date: '2026-09-05' },
    { tag: 'WNG', score: 3200,  date: '2026-09-04' },
    { tag: 'TOP', score: 2100,  date: '2026-09-03' }
  ],
  neonDrift: [
    { tag: 'DRF', score: 26500, date: '2026-09-13' },
    { tag: 'RIK', score: 22800, date: '2026-09-13' },
    { tag: 'NIT', score: 18900, date: '2026-09-12' },
    { tag: 'SPD', score: 15400, date: '2026-09-11' },
    { tag: 'TOY', score: 12600, date: '2026-09-10' },
    { tag: 'LNE', score: 10200, date: '2026-09-09' },
    { tag: 'SMK', score: 8100,  date: '2026-09-08' },
    { tag: 'V8X', score: 6400,  date: '2026-09-07' },
    { tag: 'CRS', score: 4900,  date: '2026-09-06' },
    { tag: 'GAS', score: 3500,  date: '2026-09-05' }
  ],
  hexaTron: [
    { tag: 'TRN', score: 16800, date: '2026-09-13' },
    { tag: 'RIK', score: 14200, date: '2026-09-13' },
    { tag: 'HEX', score: 11900, date: '2026-09-12' },
    { tag: 'RED', score: 9800,  date: '2026-09-11' },
    { tag: 'CYA', score: 8200,  date: '2026-09-10' },
    { tag: 'GLD', score: 6700,  date: '2026-09-09' },
    { tag: 'VIO', score: 5300,  date: '2026-09-08' },
    { tag: 'LGT', score: 4100,  date: '2026-09-07' },
    { tag: 'WAL', score: 3200,  date: '2026-09-06' },
    { tag: 'BYT', score: 2100,  date: '2026-09-05' }
  ],
  cyberPacman: [
    { tag: 'PAC', score: 28500, date: '2026-09-14' },
    { tag: 'RIK', score: 24200, date: '2026-09-14' },
    { tag: 'NEO', score: 20600, date: '2026-09-13' },
    { tag: 'GHO', score: 17400, date: '2026-09-12' },
    { tag: 'DOT', score: 14100, date: '2026-09-11' },
    { tag: 'PWR', score: 11500, date: '2026-09-10' },
    { tag: 'BIT', score: 9200,  date: '2026-09-09' },
    { tag: 'WAK', score: 7300,  date: '2026-09-08' },
    { tag: 'EMP', score: 5600,  date: '2026-09-07' },
    { tag: 'ARC', score: 3800,  date: '2026-09-06' }
  ]
};

class LeaderboardManager {
  constructor() {
    this.boards = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_LB);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_BOARDS,
          ...parsed
        };
      }
    } catch (e) {
      console.warn('Failed to load local leaderboards:', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_BOARDS));
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY_LB, JSON.stringify(this.boards));
    } catch (e) {
      console.warn('Failed to save leaderboards:', e);
    }
  }

  getScores(gameKey) {
    const list = this.boards[gameKey] || DEFAULT_BOARDS[gameKey] || [];
    return list.slice(0, 10).map((entry, index) => ({
      rank: index + 1,
      tag: (entry.tag || 'ARC').substring(0, 3).toUpperCase(),
      score: Math.floor(entry.score || 0),
      date: entry.date || '2026-09-01',
      isUser: Boolean(entry.isUser),
      isSample: entry.isSample !== undefined ? entry.isSample : !entry.isUser
    }));
  }

  isHighScore(gameKey, score) {
    if (typeof score !== 'number' || !Number.isFinite(score) || score <= 0) return false;
    const scores = this.getScores(gameKey);
    if (scores.length < 10) return true;
    return score > scores[scores.length - 1].score;
  }

  getRankForScore(gameKey, score) {
    const scores = this.getScores(gameKey);
    let rank = 1;
    for (const item of scores) {
      if (score <= item.score) rank++;
    }
    return Math.min(10, rank);
  }

  addScore(gameKey, tag, score) {
    const VALID_GAMES = ['cyberSurvivors', 'neonDash', 'quantumBreaker', 'astroPulse', 'neonDrift', 'hexaTron', 'cyberPacman'];
    if (!VALID_GAMES.includes(gameKey)) return -1;

    const numScore = Math.floor(Number(score));
    if (!Number.isFinite(numScore) || numScore <= 0 || numScore > 99999999) return -1;

    let cleanTag = (String(tag || 'PIL').replace(/[^a-zA-Z0-9]/g, '')).substring(0, 3).toUpperCase();
    if (!cleanTag) cleanTag = 'PIL';
    const today = localDateString();

    if (!this.boards[gameKey]) {
      this.boards[gameKey] = [...(DEFAULT_BOARDS[gameKey] || [])];
    }

    const newEntry = {
      tag: cleanTag,
      score: numScore,
      date: today,
      isUser: true,
      isSample: false
    };

    this.boards[gameKey].push(newEntry);
    // Sort: highest score first; ties favor verified player entries over sample cabinet scores
    this.boards[gameKey].sort((a, b) => (b.score - a.score) || ((b.isUser ? 1 : 0) - (a.isUser ? 1 : 0)));
    this.boards[gameKey] = this.boards[gameKey].slice(0, 10);

    this.save();
    sound.announce('Score saved to Hall of Fame!');

    return this.boards[gameKey].findIndex(e => e === newEntry) + 1;
  }
}

export const leaderboard = new LeaderboardManager();
