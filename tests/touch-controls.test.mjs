import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserMocks } from './helpers/browser-mocks.mjs';

installBrowserMocks();
const { CyberSurvivorsGame } = await import('../src/games/cyberSurvivors.js');
const { QuantumBreakerGame } = await import('../src/games/quantumBreaker.js');
const { CyberPacmanGame } = await import('../src/games/cyberPacman.js');

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
  assert.equal(game.player.nextDir, 'none');

  game.setNextDir('left');
  assert.equal(game.player.nextDir, 'left');

  game.setNextDir('up');
  assert.equal(game.player.nextDir, 'up');

  game.setNextDir('right');
  assert.equal(game.player.nextDir, 'right');

  game.setNextDir('down');
  assert.equal(game.player.nextDir, 'down');
});
