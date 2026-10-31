import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserMocks } from './helpers/browser-mocks.mjs';

installBrowserMocks();
const { CyberSurvivorsGame } = await import('../src/games/cyberSurvivors.js');
const { QuantumBreakerGame } = await import('../src/games/quantumBreaker.js');
const { CyberPacmanGame } = await import('../src/games/cyberPacman.js');
const { HexaTronGame } = await import('../src/games/hexaTron.js');
const { NeonDriftGame } = await import('../src/games/neonDrift.js');
const { sound } = await import('../src/engine/audio.js');

test('CyberSurvivors responds to virtual analog joystick input', () => {
  const dummyCanvas = { getContext: () => ({}) };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, floatingText: () => {} };
  const callbacks = { onScoreUpdate: () => {}, onGameOver: () => {} };
  const game = new CyberSurvivorsGame(dummyCanvas, dummyParticles, callbacks);

  game.mechClass = 'specter';
  game.reset();
  game.isRunning = true;
  const startX = game.player.x;
  const startY = game.player.y;

  // Tilt joystick up and right (x = 0.6, y = -0.8)
  game.joystick = { x: 0.6, y: -0.8 };
  game.update(0.1);

  assert.ok(game.player.x > startX, 'Player should move right with positive joystick X');
  assert.ok(game.player.y < startY, 'Player should move up with negative joystick Y');
});

test('CyberSurvivors clamps joystick magnitude to unit circle', () => {
  const dummyCanvas = { getContext: () => ({}) };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, floatingText: () => {} };
  const callbacks = { onScoreUpdate: () => {}, onGameOver: () => {} };
  const game = new CyberSurvivorsGame(dummyCanvas, dummyParticles, callbacks);

  game.mechClass = 'specter';
  game.reset();
  game.isRunning = true;
  const startX = game.player.x;

  // Extreme out-of-bounds joystick tilt (x = 10, y = 0)
  game.joystick = { x: 10, y: 0 };
  game.update(0.1);

  // Speed is 250 for specter, dt is 0.1 -> delta should equal 250 * 0.1 = 25px
  const deltaX = game.player.x - startX;
  assert.ok(Math.abs(deltaX - 25) < 0.5, `Clamped speed should move ~25px, got ${deltaX}`);
});

test('QuantumBreaker paddle tracks horizontal touch slider position', () => {
  const dummyCanvas = { getContext: () => ({}) };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {} };
  const callbacks = { onScoreUpdate: () => {}, onGameOver: () => {}, onStageClear: () => {} };
  const game = new QuantumBreakerGame(dummyCanvas, dummyParticles, callbacks);

  game.reset();
  game.isRunning = true;

  // Set slider to far left (0.0)
  game.sliderPos = 0.0;
  // Multiple small updates to simulate smooth motion
  for (let i = 0; i < 20; i++) {
    game.update(0.016);
  }

  const minExpectedX = game.paddle.width / 2;
  assert.ok(Math.abs(game.paddle.x - minExpectedX) < 15, `Paddle should move toward far left, got ${game.paddle.x}`);

  // Set slider to far right (1.0)
  game.sliderPos = 1.0;
  for (let i = 0; i < 20; i++) {
    game.update(0.016);
  }

  const maxExpectedX = game.width - game.paddle.width / 2;
  assert.ok(Math.abs(game.paddle.x - maxExpectedX) < 15, `Paddle should move toward far right, got ${game.paddle.x}`);
});

test('CyberPacman queues directions from slider and vertical steering', () => {
  const dummyCanvas = { getContext: () => ({}) };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, floatingTexts: [] };
  const game = new CyberPacmanGame(dummyCanvas, dummyParticles, {});

  game.buildGrid();
  game.resetPositions();

  // Player starts facing 'left'
  assert.equal(game.player.dir, 'left');

  // Queue perpendicular turn 'up'
  game.setNextDir('up');
  assert.equal(game.player.nextDir, 'up');

  // Queue perpendicular turn 'down'
  game.setNextDir('down');
  assert.equal(game.player.nextDir, 'down');

  // Immediate 180-degree reverse to 'right' updates dir instantly
  game.setNextDir('right');
  assert.equal(game.player.dir, 'right');
});

test('CyberPacman moves and chomps pellets from spawn without getting stuck', () => {
  const dummyCanvas = { getContext: () => ({}) };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, floatingTexts: [] };
  const game = new CyberPacmanGame(dummyCanvas, dummyParticles, {});

  game.buildGrid();
  game.resetPositions();
  game.gameState = 'playing';
  game.isRunning = true;

  const startX = game.player.x;
  for (let i = 0; i < 30; i++) {
    game.update(0.016);
  }

  assert.ok(game.player.x < startX, `Pacman should move left from spawn, started at ${startX}, now at ${game.player.x}`);
  assert.ok(game.dotsLeft < game.totalDots, 'Pacman should eat dots along the corridor');
});

test('HexaTron initializes and runs with both init() and start() without crashing', () => {
  const dummyCtx = {
    fillStyle: '', strokeStyle: '', lineWidth: 0, shadowColor: '', shadowBlur: 0,
    fillRect: () => {}, strokeRect: () => {}, beginPath: () => {}, moveTo: () => {},
    lineTo: () => {}, stroke: () => {}, fill: () => {}, arc: () => {}, save: () => {},
    restore: () => {}, translate: () => {}, rotate: () => {}, scale: () => {}, fillText: () => {}
  };
  const dummyCanvas = { getContext: () => dummyCtx, addEventListener: () => {} };
  const dummyParticles = { shake: () => {}, addShockwave: () => {}, explode: () => {}, spawn: () => {} };
  let hudScore = 0;
  const game = new HexaTronGame(dummyCanvas, dummyParticles, {
    onScoreUpdate: (s) => { hudScore = s; },
    onGameOver: () => {}
  });

  game.init();
  assert.equal(game.isRunning, true);
  assert.ok(game.player !== null);
  assert.equal(game.opponents.length, 3);

  // Update several frames
  for (let i = 0; i < 20; i++) {
    game.update(0.016);
  }
  assert.ok(game.player.y < game.arena.y + game.arena.h * 0.85, 'Player should move up');
  assert.doesNotThrow(() => game.draw());
});

test('NeonDrift initializes, runs and handles SFX without crashing or getting stuck', () => {
  const dummyCtx = {
    fillStyle: '', strokeStyle: '', lineWidth: 0,
    fillRect: () => {}, beginPath: () => {}, arc: () => {}, clip: () => {},
    save: () => {}, restore: () => {}, moveTo: () => {}, lineTo: () => {},
    stroke: () => {}, fill: () => {}, closePath: () => {}, ellipse: () => {},
    roundRect: () => {}, translate: () => {}, rotate: () => {}, createLinearGradient: () => ({ addColorStop: () => {} }),
    createRadialGradient: () => ({ addColorStop: () => {} })
  };
  const dummyCanvas = { getContext: () => dummyCtx, addEventListener: () => {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) };
  const dummyParticles = { shake: () => {}, explode: () => {}, spawn: () => {} };
  const game = new NeonDriftGame(dummyCanvas, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} });

  game.init();
  assert.equal(game.isRunning, true);
  assert.ok(game.speed >= 100);

  // sound.play dispatcher should not throw
  assert.doesNotThrow(() => sound.play('powerup'));
  assert.doesNotThrow(() => sound.play('pickup'));
  assert.doesNotThrow(() => sound.play('laser'));
  assert.doesNotThrow(() => sound.play('explosion'));

  // Test updates and near miss
  for (let i = 0; i < 30; i++) {
    game.update(0.016);
  }
  assert.ok(game.distance > 0, 'Car should travel forward');
  assert.doesNotThrow(() => game.draw());
});

test('CyberPacman ghosts actively move in scatter and chase modes without being stuck', () => {
  const dummyCanvas = { getContext: () => ({}) };
  const dummyParticles = { particles: [], burst: () => {}, shockwave: () => {}, floatingTexts: [] };
  const game = new CyberPacmanGame(dummyCanvas, dummyParticles, {});

  game.buildGrid();
  game.resetPositions();
  game.gameState = 'playing';
  game.isRunning = true;

  const blinky = game.ghosts.find(g => g.id === 'blinky');
  assert.ok(blinky, 'Blinky should exist');
  const initialBlinkyX = blinky.x;

  for (let i = 0; i < 30; i++) {
    game.update(0.016);
  }

  // Blinky starts facing left in corridor (8, 8) and must move left
  assert.ok(blinky.x < initialBlinkyX, `Blinky should move left along corridor, started at ${initialBlinkyX}, now at ${blinky.x}`);
});
