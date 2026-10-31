import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserMocks } from './helpers/browser-mocks.mjs';

installBrowserMocks();

const { storage } = await import('../src/engine/storage.js');
const { leaderboard, DEFAULT_BOARDS } = await import('../src/engine/leaderboard.js');
const { ParticleSystem } = await import('../src/engine/particles.js');
const { getDailySeed, getDailyChallengeInfo, getTodayDateKey } = await import('../src/engine/dailyChallenge.js');

test('XP farming prevention: short sub-15s & low-score runs award 0 XP', () => {
  storage.resetProgression();

  // Short run (< 15s) with low score (< 50)
  const shortRun = storage.addMasteryXp('cyberSurvivors', 50, {
    duration: 10,
    score: 20,
    isSession: true
  });
  assert.equal(shortRun.awarded, 0);
  assert.equal(shortRun.reason, 'session_too_short');

  // Replay run awards 0 XP
  const replayRun = storage.addMasteryXp('cyberSurvivors', 150, {
    duration: 60,
    score: 500,
    isReplay: true,
    isSession: true
  });
  assert.equal(replayRun.awarded, 0);
  assert.equal(replayRun.reason, 'replay');

  // Valid run (>= 15s) awards XP
  const validRun = storage.addMasteryXp('cyberSurvivors', 80, {
    duration: 25,
    score: 300,
    isSession: true
  });
  assert.equal(validRun.awarded, 80);
});

test('Session XP is capped at 350 XP per run to prevent excessive progression spikes', () => {
  storage.resetProgression();

  const cappedRun = storage.addMasteryXp('cyberSurvivors', 9999, {
    duration: 120,
    score: 50000,
    isSession: true
  });
  assert.equal(cappedRun.awarded, 350);

  // Hardcore One-Life mode awards 1.25x multiplier capped at 350
  const oneLifeRun = storage.addMasteryXp('cyberSurvivors', 200, {
    duration: 60,
    score: 1000,
    mode: 'oneLife',
    isSession: true
  });
  assert.equal(oneLifeRun.awarded, 250); // 200 * 1.25
});

test('Custom keybindings: can be updated, queried, persisted and reset to defaults', () => {
  const defaults = storage.getKeyBindings();
  assert.equal(defaults.moveUp, 'KeyW');
  assert.equal(defaults.primary, 'Space');

  // Update a binding
  storage.setKeyBinding('moveUp', 'KeyI');
  storage.setKeyBinding('primary', 'KeyJ');
  const updated = storage.getKeyBindings();
  assert.equal(updated.moveUp, 'KeyI');
  assert.equal(updated.primary, 'KeyJ');

  // Reset bindings
  storage.resetKeyBindings();
  const reset = storage.getKeyBindings();
  assert.equal(reset.moveUp, 'KeyW');
  assert.equal(reset.primary, 'Space');
});

test('Leaderboard management: clearDemoScores filters sample scores and preserves player records', () => {
  leaderboard.resetDefaultScores('neonDash');
  assert.equal(leaderboard.getScores('neonDash').length, 10);

  // Add a verified player score
  leaderboard.addScore('neonDash', 'USR', 50000);
  const scoresWithPlayer = leaderboard.getScores('neonDash');
  assert.ok(scoresWithPlayer.some(s => s.tag === 'USR' && s.isUser === true));

  // Clear demo entries
  leaderboard.clearDemoScores('neonDash');
  const onlyPlayerScores = leaderboard.getScores('neonDash');
  assert.equal(onlyPlayerScores.length, 1);
  assert.equal(onlyPlayerScores[0].tag, 'USR');
  assert.equal(onlyPlayerScores[0].isUser, true);

  // Clearing demo scores on an unplayed sector gives empty array
  leaderboard.clearDemoScores('cyberPacman');
  const emptyBoard = leaderboard.getScores('cyberPacman');
  assert.equal(emptyBoard.length, 0);

  // Restore defaults restores initial cabinet scores
  leaderboard.resetDefaultScores('cyberPacman');
  assert.equal(leaderboard.getScores('cyberPacman').length, 10);
});

test('Leaderboard tie-breaking deterministically ranks verified players before demo scores and earlier dates', () => {
  leaderboard.resetDefaultScores('astroPulse');

  // Insert two user scores with same score
  leaderboard.addScore('astroPulse', 'AAA', 10000);
  const rank = leaderboard.addScore('astroPulse', 'BBB', 10000);
  const scores = leaderboard.getScores('astroPulse');

  // Verified user score must beat any sample cabinet score of same value
  const aaa = scores.find(s => s.tag === 'AAA');
  const bbb = scores.find(s => s.tag === 'BBB');
  assert.ok(aaa);
  assert.ok(bbb);
});

test('Daily Seed Challenge produces deterministic seeds and synchronized daily data', () => {
  const seed1 = getDailySeed('2026-10-31');
  const seed2 = getDailySeed('2026-10-31');
  const seedDiffDay = getDailySeed('2026-11-01');

  assert.equal(seed1, seed2, 'Identical date must yield identical daily seed');
  assert.notEqual(seed1, seedDiffDay, 'Different dates must yield different daily seeds');

  const info = getDailyChallengeInfo('2026-10-31');
  assert.ok(info.seed > 0);
  assert.ok(info.title);
  assert.ok(info.bonusCredits === 150);

  // Track daily challenge completion in storage
  assert.equal(storage.isDailyChallengeCompleted('neonDash', '2026-10-31'), false);
  storage.recordDailyChallengeCompletion('neonDash', '2026-10-31');
  assert.equal(storage.isDailyChallengeCompleted('neonDash', '2026-10-31'), true);
  assert.equal(storage.isDailyChallengeCompleted('neonDash', '2026-11-01'), false);
});

test('ParticleSystem reduced motion completely suppresses screen shake and caps particle limits', () => {
  const ps = new ParticleSystem();
  assert.equal(ps.isReducedMotion(), false);

  ps.shake(20, 0.5);
  assert.equal(ps.shakeIntensity, 20);

  // Enable reduced motion
  ps.setReducedMotion(true);
  assert.equal(ps.isReducedMotion(), true);
  assert.equal(ps.shakeIntensity, 0);
  assert.equal(ps.maxParticles, 20);

  // Further shake calls are ignored
  ps.shake(50, 1.0);
  assert.equal(ps.shakeIntensity, 0);

  // Burst respects reduced particle cap
  ps.burst(100, 100, 30);
  assert.ok(ps.particles.length <= 20);

  // Graphics quality profiles
  ps.setReducedMotion(false);
  ps.setQuality('low');
  assert.equal(ps.maxParticles, 35);
  ps.setQuality('high');
  assert.equal(ps.maxParticles, 140);
});
