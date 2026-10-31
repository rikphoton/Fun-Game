// NeonPulse Arcade - Daily Seed Challenge System
// Provides deterministic daily challenges across games with seeded generation
import { localDateString } from './compat.js';

const FEATURED_GAMES = ['neonDash', 'cyberSurvivors', 'quantumBreaker', 'astroPulse'];

export function getTodayDateKey() {
  return localDateString();
}

export function getDailySeed(dateKey = getTodayDateKey()) {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = ((hash << 5) - hash) + dateKey.charCodeAt(i);
    hash |= 0;
  }
  return (Math.abs(hash) % 899999) + 100000;
}

export function getDailyFeaturedGame(dateKey = getTodayDateKey()) {
  const seed = getDailySeed(dateKey);
  const index = seed % FEATURED_GAMES.length;
  return FEATURED_GAMES[index];
}

export function getDailyChallengeInfo(dateKey = getTodayDateKey()) {
  const seed = getDailySeed(dateKey);
  const gameKey = getDailyFeaturedGame(dateKey);

  const gameTitles = {
    neonDash: 'Sub-Light Corridor Sprint',
    cyberSurvivors: 'Swarm Sector Gauntlet',
    quantumBreaker: 'Quantum Core Demolition',
    astroPulse: 'Starfleet Deep Space Intercept'
  };

  const gameDescriptions = {
    neonDash: 'Navigate the daily procedural obstacle matrix. Fixed seed ensures identical hazard layout for all operatives worldwide.',
    cyberSurvivors: 'Defend against daily wave formations. Enemy spawn timing and boss emergence angles are synchronized globally.',
    quantumBreaker: 'Demolish today’s calibrated quantum brick matrix. Ball ricochet angles and drop mechanics are deterministic.',
    astroPulse: 'Intercept the daily armada. Enemy flight vectors and Mothership telegraph attack phases follow today’s flight plan.'
  };

  return {
    dateKey,
    seed,
    gameKey,
    title: gameTitles[gameKey] || 'Daily Seed Challenge',
    description: gameDescriptions[gameKey] || 'Compete on today’s synchronized procedural seed.',
    bonusCredits: 150,
    bonusXp: 100
  };
}
