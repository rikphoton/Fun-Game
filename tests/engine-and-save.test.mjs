import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserMocks } from './helpers/browser-mocks.mjs';

const ls = installBrowserMocks();
const {
  storage,
  SAVE_VERSION,
  STORAGE_KEY_V4,
  STORAGE_BACKUP_KEY,
  STORAGE_KEY_LEGACY
} = await import('../src/engine/storage.js');
const { ParticleSystem } = await import('../src/engine/particles.js');
const { CyberSurvivorsGame } = await import('../src/games/cyberSurvivors.js');
const { NeonDashGame } = await import('../src/games/neonDash.js');
const { QuantumBreakerGame } = await import('../src/games/quantumBreaker.js');
const { AstroPulseGame } = await import('../src/games/astroPulse.js');
const { NeonDriftGame } = await import('../src/games/neonDrift.js');
const { HexaTronGame } = await import('../src/games/hexaTron.js');
const { CyberPacmanGame } = await import('../src/games/cyberPacman.js');

test('Storage is versioned and maintains rolling backup', () => {
  storage.saveHighScore('cyberSurvivors', 8888);
  assert.equal(storage.data.version, SAVE_VERSION);

  const primaryRaw = ls.getItem(STORAGE_KEY_V4);
  const backupRaw = ls.getItem(STORAGE_BACKUP_KEY);
  const legacyRaw = ls.getItem(STORAGE_KEY_LEGACY);

  assert.ok(primaryRaw, 'v4 primary storage should exist');
  assert.ok(backupRaw, 'v4 backup storage should exist');
  assert.ok(legacyRaw, 'legacy storage mirror should exist');

  const primary = JSON.parse(primaryRaw);
  const backup = JSON.parse(backupRaw);
  assert.equal(primary.version, 4);
  assert.equal(primary.highScores.cyberSurvivors, 8888);
  assert.equal(backup.highScores.cyberSurvivors, 8888);
});

test('Storage migrates legacy v3 data cleanly without data loss', () => {
  ls.clear();
  const legacyData = {
    highScores: { neonDash: 1250, astroPulse: 3400 },
    neonCredits: 750,
    cyberLab: { hull: 2, thrusters: 1 },
    stats: { gamesPlayed: 14 }
  };
  ls.setItem('neonpulse_arcade_v3', JSON.stringify(legacyData));

  // Reload storage to simulate fresh session load
  const loaded = storage.load();
  assert.equal(loaded.version, 4);
  assert.equal(loaded.highScores.neonDash, 1250);
  assert.equal(loaded.highScores.astroPulse, 3400);
  assert.equal(loaded.neonCredits, 750);
  assert.equal(loaded.cyberLab.hull, 2);
  assert.equal(loaded.stats.gamesPlayed, 14);
});

test('Storage recovers from backup when primary storage is corrupted', () => {
  storage.saveHighScore('neonDrift', 4200);
  // Simulate corrupt primary data (e.g. truncated write)
  ls.setItem(STORAGE_KEY_V4, '{corrupted_json:');

  const recovered = storage.load();
  assert.ok(recovered, 'Storage should recover from backup');
  assert.equal(recovered.highScores.neonDrift, 4200);
});

test('Storage sanitizes corrupt data types and bad inputs', () => {
  const badData = {
    highScores: { neonDash: 'not_a_number', astroPulse: -999, hexaTron: 1500 },
    neonCredits: -500,
    cyberLab: { hull: 999 },
    stats: { gamesPlayed: NaN }
  };
  const sanitized = storage.validateAndSanitize(badData);
  assert.equal(sanitized.highScores.neonDash, 0);
  assert.equal(sanitized.highScores.astroPulse, 0);
  assert.equal(sanitized.highScores.hexaTron, 1500);
  assert.equal(sanitized.neonCredits, 200, 'Credits should fall back to default');
  assert.equal(sanitized.cyberLab.hull, 5, 'Cyber lab should clamp to max tier');
  assert.equal(sanitized.stats.gamesPlayed, 0);
});

test('Save export and import works reliably with validation', () => {
  storage.saveHighScore('hexaTron', 2200);
  const exported = storage.exportSaveData();
  assert.ok(typeof exported === 'string');

  const parsedExport = JSON.parse(exported);
  assert.equal(parsedExport.app, 'NeonPulseArcade');
  assert.equal(parsedExport.version, 4);

  // Modify local state
  storage.resetAll();
  assert.equal(storage.getHighScore('hexaTron'), 0);

  // Import back
  const result = storage.importSaveData(exported);
  assert.equal(result.success, true);
  assert.equal(storage.getHighScore('hexaTron'), 2200);

  // Invalid import rejection
  const badResult = storage.importSaveData('invalid_raw_text');
  assert.equal(badResult.success, false);
});

test('Separate reset functions reset only their targeted domain', () => {
  storage.resetAll();
  storage.saveHighScore('neonDash', 999);
  storage.saveHighScore('astroPulse', 5555);
  storage.addCredits(500);

  // 1. Reset single game score
  storage.resetGameScores('neonDash');
  assert.equal(storage.getHighScore('neonDash'), 0);
  assert.equal(storage.getHighScore('astroPulse'), 5555);

  // 2. Reset progression
  storage.resetProgression();
  assert.equal(storage.data.cyberLab.hull, 0);
  assert.equal(storage.data.stats.enemiesKilled, 0);
  // High scores and credits should remain intact
  assert.equal(storage.getHighScore('astroPulse'), 5555);

  // 3. Reset settings
  storage.setSetting('sfxVolume', 0.1);
  storage.resetSettings();
  assert.equal(storage.getSetting('sfxVolume'), 0.6);
});

test('Player profile statistics and cross-game progression are accurate', () => {
  storage.resetAll();
  storage.saveHighScore('cyberSurvivors', 1200);
  storage.saveHighScore('neonDash', 800);
  storage.recordPlayTime(120);

  const profile = storage.getProfileStats();
  assert.equal(profile.totalScore, 2000);
  assert.equal(profile.totalPlayTime, 120);
  assert.ok(profile.playerLevel >= 1);
  assert.ok(profile.totalAchievements > 0);

  // Play all 7 games to earn arcade_beginner
  const allGames = [
    'cyberSurvivors', 'neonDash', 'quantumBreaker',
    'astroPulse', 'neonDrift', 'hexaTron', 'cyberPacman'
  ];
  for (const g of allGames) {
    storage.recordGamePlayed(g);
  }
  assert.equal(storage.data.achievements.arcade_beginner.unlocked, true);
});

test('ParticleSystem object pooling recycles particle objects', () => {
  const ps = new ParticleSystem();
  assert.equal(ps.particles.length, 0);
  assert.equal(ps.particlePool.length, 0);

  // Spawn 15 particles
  ps.burst(100, 100, 15);
  assert.equal(ps.particles.length, 15);

  // Simulate time passage until all particles die
  ps.update(2.0);
  assert.equal(ps.particles.length, 0);
  assert.equal(ps.particlePool.length, 15, 'Dead particles should return to pool');

  // Spawn again - should reuse pool without growing memory
  ps.burst(100, 100, 10);
  assert.equal(ps.particles.length, 10);
  assert.equal(ps.particlePool.length, 5, '10 particles should be acquired from pool');

  // Clear recycles active particles
  ps.clear();
  assert.equal(ps.particles.length, 0);
  assert.equal(ps.particlePool.length, 15);
});

test('All seven games implement standardized lifecycle interface', () => {
  const dummyCanvas = { getContext: () => ({ fillRect: () => {}, beginPath: () => {}, arc: () => {} }), addEventListener: () => {}, width: 800, height: 600 };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, shake: () => {}, explode: () => {}, spawn: () => {} };
  const callbacks = { onScoreUpdate: () => {}, onGameOver: () => {} };

  const games = [
    new CyberSurvivorsGame(dummyCanvas, dummyParticles, callbacks),
    new NeonDashGame(dummyCanvas, dummyParticles, callbacks),
    new QuantumBreakerGame(dummyCanvas, dummyParticles, callbacks),
    new AstroPulseGame(dummyCanvas, dummyParticles, callbacks),
    new NeonDriftGame(dummyCanvas, dummyParticles, callbacks),
    new HexaTronGame(dummyCanvas, dummyParticles, callbacks),
    new CyberPacmanGame(dummyCanvas, dummyParticles, callbacks)
  ];

  for (const game of games) {
    assert.equal(typeof game.init, 'function', `${game.constructor.name} should implement init()`);
    assert.equal(typeof game.start, 'function', `${game.constructor.name} should implement start()`);
    assert.equal(typeof game.pause, 'function', `${game.constructor.name} should implement pause()`);
    assert.equal(typeof game.resume, 'function', `${game.constructor.name} should implement resume()`);
    assert.equal(typeof game.destroy, 'function', `${game.constructor.name} should implement destroy()`);
    assert.equal(typeof game.update, 'function', `${game.constructor.name} should implement update()`);
    assert.equal(typeof game.draw, 'function', `${game.constructor.name} should implement draw()`);

    // Verify pause/resume/destroy state transitions
    game.pause();
    assert.equal(game.isPaused, true);
    game.resume();
    assert.equal(game.isPaused, false);
    game.destroy();
    assert.equal(game.isRunning, false);
  }
});

test('NeonDash records inputs and supports automated replay playback', () => {
  const dummyCanvas = { getContext: () => ({ fillRect: () => {}, beginPath: () => {}, arc: () => {} }), addEventListener: () => {}, width: 800, height: 600 };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, shake: () => {}, explode: () => {}, spawn: () => {}, addFloatingText: () => {} };
  let gameOverPayload = null;
  const game = new NeonDashGame(dummyCanvas, dummyParticles, {
    onScoreUpdate: () => {},
    onGameOver: (p) => { gameOverPayload = p; }
  });

  game.reset();
  game.isRunning = true;
  assert.equal(game.recording.inputs.length, 0);

  // Jump at gameTime = 0.5s
  game.gameTime = 0.5;
  game.handleAction();
  assert.equal(game.recording.inputs.length, 1);
  assert.equal(game.recording.inputs[0].t, 0.5);

  // Trigger game over to save replay
  game.gameOver();
  assert.ok(gameOverPayload.hasReplay, 'Game over should indicate replay is available');

  // Start replay
  const replayStarted = game.startReplay(game.recording);
  assert.equal(replayStarted, true);
  assert.equal(game.isReplay, true);
  assert.equal(game.replayInputs.length, 1);
});

test('CyberSurvivors offers and activates weapon evolutions', () => {
  const dummyCanvas = { getContext: () => ({ fillRect: () => {}, beginPath: () => {}, arc: () => {} }), addEventListener: () => {}, width: 800, height: 600 };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, shake: () => {}, explode: () => {}, spawn: () => {}, addFloatingText: () => {} };
  let offeredChoices = [];
  const game = new CyberSurvivorsGame(dummyCanvas, dummyParticles, {
    onScoreUpdate: () => {},
    onGameOver: () => {},
    onLevelUpChoice: (choices) => { offeredChoices = choices; }
  });

  game.reset();
  game.isRunning = true;

  // Set levels to satisfy Tachyon evolution prerequisite
  game.player.blasterLevel = 3;
  game.player.orbsCount = 2;

  game.presentUpgradeChoices();
  const hasTachyon = offeredChoices.some(c => c.id === 'evo_tachyon');
  assert.ok(hasTachyon, 'Tachyon Matrix evolution should be offered when prerequisites are met');

  // Apply Tachyon evolution
  game.applyUpgrade('evo_tachyon');
  assert.equal(game.player.evolvedTachyon, true);
  assert.ok(game.player.blasterLevel >= 5);
});

test('QuantumBreaker Stage 6 generates Quantum Core Boss encounter', () => {
  const dummyCanvas = { getContext: () => ({ fillRect: () => {}, beginPath: () => {}, arc: () => {} }), addEventListener: () => {}, width: 800, height: 600 };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, shake: () => {}, explode: () => {}, spawn: () => {}, addFloatingText: () => {} };
  const game = new QuantumBreakerGame(dummyCanvas, dummyParticles, {
    onScoreUpdate: () => {},
    onGameOver: () => {}
  });

  game.reset();
  assert.equal(game.maxStages, 6);

  game.initStage(6);
  assert.equal(game.stage, 6);
  const bossBrick = game.bricks.find(b => b.isBoss);
  assert.ok(bossBrick, 'Quantum Core boss brick should exist in stage 6');
  assert.ok(bossBrick.hp >= 40, 'Boss brick should have high health');
});
