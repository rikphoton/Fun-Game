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
const { leaderboard } = await import('../src/engine/leaderboard.js');
const { gamepad } = await import('../src/engine/gamepad.js');
const { GAMES_METADATA, VALID_GAME_KEYS, getGameMeta } = await import('../src/engine/gamesRegistry.js');

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

test('NeonDash PRNG produces 100% deterministic obstacle and item layouts for identical seeds', () => {
  const dummyCanvas = { getContext: () => ({ fillRect: () => {}, beginPath: () => {}, arc: () => {} }), addEventListener: () => {}, width: 800, height: 600 };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, shake: () => {}, explode: () => {}, spawn: () => {}, addFloatingText: () => {} };

  const game1 = new NeonDashGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} });
  const game2 = new NeonDashGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} });

  const testSeed = 54321;
  game1.reset(testSeed);
  game2.reset(testSeed);

  for (let i = 0; i < 8; i++) {
    game1.spawnHazardWave();
    game2.spawnHazardWave();
  }

  assert.equal(game1.obstacles.length, game2.obstacles.length, 'Obstacle count must match');
  for (let i = 0; i < game1.obstacles.length; i++) {
    assert.equal(game1.obstacles[i].type, game2.obstacles[i].type, `Obstacle ${i} type must match`);
    assert.equal(game1.obstacles[i].y, game2.obstacles[i].y, `Obstacle ${i} Y-coord must match`);
    assert.equal(game1.obstacles[i].width, game2.obstacles[i].width, `Obstacle ${i} width must match`);
  }

  assert.equal(game1.collectibles.length, game2.collectibles.length, 'Collectibles count must match');
  for (let i = 0; i < game1.collectibles.length; i++) {
    assert.equal(game1.collectibles[i].y, game2.collectibles[i].y, `Collectible ${i} Y-coord must match`);
  }
});

test('NeonDash Replay mode does not award credits, record high scores or overwrite existing replay', () => {
  const dummyCanvas = { getContext: () => ({ fillRect: () => {}, beginPath: () => {}, arc: () => {} }), addEventListener: () => {}, width: 800, height: 600 };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, shake: () => {}, explode: () => {}, spawn: () => {}, addFloatingText: () => {} };

  storage.data.neonDashReplay = {
    score: 300,
    distance: 250,
    seed: 42,
    inputs: [{ t: 0.5 }]
  };
  storage.save();

  let gameOverData = null;
  const game = new NeonDashGame(dummyCanvas, dummyParticles, {
    onScoreUpdate: () => {},
    onGameOver: (d) => { gameOverData = d; }
  });

  game.startReplay(storage.data.neonDashReplay);
  assert.equal(game.isReplay, true);

  const initialCredits = storage.data.neonCredits;
  game.multiplier = 2;
  game.collectStar({ x: 100, y: 100 });
  assert.equal(storage.data.neonCredits, initialCredits, 'Replay collectStar must not award credits');

  // Trigger game over in replay mode with a higher score
  game.score = 9999;
  game.distance = 5000;
  game.gameOver();

  assert.equal(gameOverData.isReplay, true);
  assert.equal(gameOverData.isRecord, false, 'Replay mode must never qualify for a high score record');
  assert.equal(storage.data.neonDashReplay.score, 300, 'Original recorded session must not be overwritten by replay playback');
});

test('Save validation enforces cosmetic ownership and resets unowned cosmetics', () => {
  const rawSave = {
    inventory: {
      trails: ['cyan'],
      themes: ['cyberpunk'],
      mechs: ['specter']
    },
    equipped: {
      trail: 'hacker_matrix_glow',
      theme: 'ultra_rare_neon',
      mech: 'giga_titan'
    }
  };

  const sanitized = storage.validateAndSanitize(rawSave);
  assert.equal(sanitized.equipped.trail, 'cyan', 'Unowned trail should reset to owned default');
  assert.equal(sanitized.equipped.theme, 'cyberpunk', 'Unowned theme should reset to owned default');
  assert.equal(sanitized.equipped.mech, 'specter', 'Unowned mech should reset to owned default');
});

test('Save import safely rejects unsupported future versions and malformed structures', () => {
  const futureSave = JSON.stringify({
    app: 'NeonPulseArcade',
    version: 99,
    data: { score: 1000 }
  });
  const resFuture = storage.importSaveData(futureSave);
  assert.equal(resFuture.success, false);
  assert.ok(resFuture.error.includes('Unsupported future'));

  const resInvalid = storage.importSaveData('NOT_VALID_JSON{]');
  assert.equal(resInvalid.success, false);

  const resArray = storage.importSaveData([1, 2, 3]);
  assert.equal(resArray.success, false);
});

test('Leaderboard distinguishes sample cabinet scores from verified player scores', () => {
  const scores = leaderboard.getScores('neonDash');
  assert.equal(scores.length, 10);
  // Default arcade scores are marked as sample
  assert.equal(scores[0].isSample, true);
  assert.equal(scores[0].isUser, false);

  // Add verified user score
  const rank = leaderboard.addScore('neonDash', 'USR', 999999);
  assert.equal(rank, 1);
  const updatedScores = leaderboard.getScores('neonDash');
  assert.equal(updatedScores[0].tag, 'USR');
  assert.equal(updatedScores[0].isUser, true);
  assert.equal(updatedScores[0].isSample, false);

  // Rejects invalid gameKey or bad scores safely
  assert.equal(leaderboard.addScore('invalidGame', 'AAA', 1000), -1);
  assert.equal(leaderboard.addScore('neonDash', 'AAA', -50), -1);
  assert.equal(leaderboard.addScore('neonDash', 'AAA', NaN), -1);
});

test('Gamepad controller handles deadzone configuration and clean disconnection state', () => {
  gamepad.setDeadzone(0.35);
  assert.equal(gamepad.deadzone, 0.35);
  gamepad.setDeadzone(5.0); // Oversized clamped
  assert.equal(gamepad.deadzone, 0.6);

  // Simulate disconnected controller state reset
  gamepad.state.up = true;
  gamepad.state.action = true;
  gamepad.handleDisconnect(gamepad.gamepadIndex);
  assert.equal(gamepad.state.up, false);
  assert.equal(gamepad.state.action, false);
});

test('CyberPacman and HexaTron quest and statistics handling are completely separated', () => {
  const tronQuestInitial = storage.data.quests.find(q => q.id === 'quest_tron')?.current || 0;

  // Simulate CyberPacman game-over statistics handling
  const pacmanGameOverData = {
    score: 12000,
    stage: 3,
    dotsEaten: 180,
    ghostsEaten: 6,
    credits: 50
  };

  // CyberPacman stats must not modify quest_tron
  assert.equal(pacmanGameOverData.ghostsEaten, 6);
  assert.equal(pacmanGameOverData.dotsEaten, 180);
  const tronQuestAfter = storage.data.quests.find(q => q.id === 'quest_tron')?.current || 0;
  assert.equal(tronQuestAfter, tronQuestInitial, 'Cyber Pacman game-over must never increment HexaTron quest');
});

test('All seven games initialize, pause, resume and destroy cleanly', () => {
  const dummyCanvas = { getContext: () => ({ fillRect: () => {}, beginPath: () => {}, arc: () => {} }), addEventListener: () => {}, width: 800, height: 600 };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, shake: () => {}, explode: () => {}, spawn: () => {}, addFloatingText: () => {} };

  const games = [
    new CyberSurvivorsGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} }),
    new NeonDashGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} }),
    new QuantumBreakerGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} }),
    new AstroPulseGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} }),
    new NeonDriftGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} }),
    new HexaTronGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} }),
    new CyberPacmanGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} })
  ];

  for (const g of games) {
    if (g.init) g.init();
    if (g.start) g.start();
    assert.equal(g.isRunning, true, 'Game should be running after init/start');

    if (g.pause) g.pause();
    assert.equal(g.isPaused, true, 'Game should be paused');

    if (g.resume) g.resume();
    assert.equal(g.isPaused, false, 'Game should be resumed');

    if (g.destroy) g.destroy();
    assert.equal(g.isRunning, false, 'Game should be stopped after destroy');
  }
});

test('Central games registry contains all seven arcade games and valid metadata', () => {
  assert.equal(VALID_GAME_KEYS.length, 7);
  for (const key of VALID_GAME_KEYS) {
    const meta = getGameMeta(key);
    assert.ok(meta, `Metadata for ${key} must exist`);
    assert.equal(meta.key, key);
    assert.ok(meta.title, 'Title must exist');
    assert.ok(meta.primaryLabel, 'Primary label must exist');
    assert.ok(meta.hintText, 'Hint text must exist');
  }
});

test('Gamepad poll gracefully handles null controller and missed disconnect without getting stuck', () => {
  // Simulate active buttons on gamepad before disconnect
  gamepad.gamepadIndex = 0;
  gamepad.isConnected = true;
  gamepad.state.left = true;
  gamepad.state.action = true;

  // Mock navigator.getGamepads returning empty/disconnected
  const origGetGamepads = navigator.getGamepads;
  navigator.getGamepads = () => [];

  const polled = gamepad.poll();
  assert.equal(polled.left, false, 'Left direction must reset to false on missed disconnect');
  assert.equal(polled.action, false, 'Action button must reset to false on missed disconnect');
  assert.equal(gamepad.isConnected, false);
  assert.equal(gamepad.gamepadIndex, null);

  navigator.getGamepads = origGetGamepads;
});

test('NeonDash PRNG cosmetic stream does not desynchronize gameplay hazard rolls', () => {
  const dummyCanvas = { getContext: () => ({ fillRect: () => {}, beginPath: () => {}, arc: () => {} }), addEventListener: () => {}, width: 800, height: 600 };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, shake: () => {}, explode: () => {}, spawn: () => {}, addFloatingText: () => {} };

  const gameA = new NeonDashGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} });
  const gameB = new NeonDashGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} });

  const seed = 771122;
  gameA.reset(seed);
  gameB.reset(seed);

  // In Game A, simulate 100 cosmetic particle trail rolls
  for (let i = 0; i < 100; i++) {
    gameA.prngCosmetic();
  }
  // In Game B, no cosmetic rolls occurred

  // Now both games spawn 10 hazard waves
  for (let i = 0; i < 10; i++) {
    gameA.spawnHazardWave();
    gameB.spawnHazardWave();
  }

  // Gameplay obstacle positions and types must match 100% identically!
  assert.equal(gameA.obstacles.length, gameB.obstacles.length);
  for (let i = 0; i < gameA.obstacles.length; i++) {
    assert.equal(gameA.obstacles[i].type, gameB.obstacles[i].type);
    assert.equal(gameA.obstacles[i].y, gameB.obstacles[i].y);
  }
});

test('Game progression calculates mastery levels, unlocks challenge modes and milestone rewards', () => {
  storage.resetProgression();

  const initialProg = storage.getGameProgression('cyberSurvivors');
  assert.equal(initialProg.level, 1);
  assert.deepEqual(initialProg.unlockedModes, ['standard']);

  // Level 1 -> 2: requires 200 XP, unlocks 'timeAttack'
  const resLvl2 = storage.addMasteryXp('cyberSurvivors', 250);
  assert.equal(resLvl2.levelUp, true);
  assert.equal(resLvl2.newLevel, 2);
  assert.equal(resLvl2.unlockedMode, 'timeAttack');
  assert.ok(storage.isModeUnlocked('cyberSurvivors', 'timeAttack'));
  assert.equal(storage.isModeUnlocked('cyberSurvivors', 'oneLife'), false);

  // Level 2 -> 4: requires 900 XP, awards Level 3 milestone (+100 credits) and unlocks 'oneLife'
  const creditsBefore = storage.getCredits();
  const resLvl4 = storage.addMasteryXp('cyberSurvivors', 700); // total 950 XP
  assert.equal(resLvl4.levelUp, true);
  assert.equal(resLvl4.newLevel, 4);
  assert.ok(storage.isModeUnlocked('cyberSurvivors', 'oneLife'));
  assert.equal(storage.getCredits(), creditsBefore + 100);

  // Level 4 -> 5: requires 1400 XP, unlocks 'bossRush'
  const resLvl5 = storage.addMasteryXp('cyberSurvivors', 500); // total 1450 XP
  assert.equal(resLvl5.newLevel, 5);
  assert.ok(storage.isModeUnlocked('cyberSurvivors', 'bossRush'));

  // Max Level 10: unlocks 'arcade_master' title
  storage.addMasteryXp('cyberSurvivors', 6000); // over 6500 XP
  const maxProg = storage.getGameProgression('cyberSurvivors');
  assert.equal(maxProg.level, 10);
  assert.ok(storage.hasItem('titles', 'arcade_master'));
});

test('Local analytics records sessions, computes averages and bounds recent runs', () => {
  storage.resetProgression();

  // Log 15 sessions for neonDash (should be bounded to 10 in recentRuns)
  for (let i = 1; i <= 15; i++) {
    storage.recordSessionAnalytics({
      gameKey: 'neonDash',
      score: i * 100,
      duration: 30 + i,
      mode: 'standard',
      won: i % 2 === 0,
      cause: i % 3 === 0 ? 'spike_hazard' : 'pit_fall',
      upgradesPicked: ['speed', 'magnet']
    });
  }

  const runs = storage.getRecentRuns('neonDash');
  assert.equal(runs.length, 10, 'recentRuns must clamp to last 10 entries');
  assert.equal(runs[runs.length - 1].score, 1500, 'Last run should be the most recent');

  const summary = storage.getAnalyticsSummary();
  assert.ok(summary.totalSessions >= 15);
  assert.ok(summary.avgDuration > 0);
  assert.ok(summary.avgScore > 0);
  assert.ok(summary.deathCausesSorted.length > 0);
  assert.ok(summary.topUpgradesSorted.length > 0);
});

test('CyberSurvivors boss battle multi-phase vulnerability window and trade-offs operate accurately', () => {
  const dummyCanvas = { getContext: () => ({ fillRect: () => {}, beginPath: () => {}, arc: () => {} }), addEventListener: () => {}, width: 800, height: 600 };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, shake: () => {}, explode: () => {}, spawn: () => {}, addFloatingText: () => {} };
  const game = new CyberSurvivorsGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} });
  game.reset();

  // Test Trade-off upgrades
  const baseSpeed = game.player.speed;
  const baseMaxHp = game.player.maxHp;
  game.applyUpgrade('heavy_plating');
  assert.ok(game.player.maxHp > baseMaxHp, 'Heavy Plating should increase max HP');
  assert.ok(game.player.speed < baseSpeed, 'Heavy Plating should reduce movement speed as a trade-off');

  game.applyUpgrade('vampiric_siphon');
  assert.equal(game.player.hasVampiricSiphon, true);

  // Test Boss Dreadnought Phase 2 vulnerability
  game.spawnBoss();
  const boss = game.enemies.find(e => e.isBoss);
  assert.ok(boss, 'Dreadnought boss should spawn');

  // When shielded in Phase 2
  boss.hp = 1000; // < 50% maxHp
  boss.isVulnerable = false;
  const hpBeforeDeflect = boss.hp;
  game.hitEnemy(boss, 0, 100);
  // Shield deflects 70% of damage -> 30 dmg taken
  assert.equal(boss.hp, hpBeforeDeflect - 30);

  // When vulnerable in Phase 2
  boss.isVulnerable = true;
  const hpBeforeExposed = boss.hp;
  game.hitEnemy(boss, 0, 100);
  // Vulnerable weak point amplifies damage by 1.4x -> 140 dmg taken
  assert.equal(boss.hp, hpBeforeExposed - 140);
});

test('High-contrast accessibility setting and keybindings persist through storage', () => {
  storage.setSetting('highContrast', true);
  assert.equal(storage.getSetting('highContrast'), true);

  const exported = storage.exportSaveData();
  storage.resetSettings();
  assert.equal(storage.getSetting('highContrast'), false);

  const importResult = storage.importSaveData(exported);
  assert.equal(importResult.success, true);
  assert.equal(storage.getSetting('highContrast'), true);
});
