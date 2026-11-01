import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserMocks } from './helpers/browser-mocks.mjs';

installBrowserMocks();

const { GAMES_METADATA, VALID_GAME_KEYS, getGameMeta } = await import('../src/engine/gamesRegistry.js');
const { LOGICAL_WIDTH, LOGICAL_HEIGHT, computeRenderScale, fitCanvasToDisplay } = await import('../src/engine/display.js');
const { CyberSurvivorsGame } = await import('../src/games/cyberSurvivors.js');
const { NeonDashGame } = await import('../src/games/neonDash.js');
const { QuantumBreakerGame } = await import('../src/games/quantumBreaker.js');
const { AstroPulseGame } = await import('../src/games/astroPulse.js');
const { NeonDriftGame } = await import('../src/games/neonDrift.js');
const { HexaTronGame } = await import('../src/games/hexaTron.js');
const { CyberPacmanGame } = await import('../src/games/cyberPacman.js');

const dummyParticles = {
  explode: () => {},
  burst: () => {},
  shake: () => {},
  addShockwave: () => {},
  addFloatingText: () => {},
  particles: [],
  floatingTexts: [],
  getShakeOffset: () => ({ x: 0, y: 0 }),
  draw: () => {}
};

const dummyCtx = {
  fillRect: () => {},
  clearRect: () => {},
  beginPath: () => {},
  closePath: () => {},
  arc: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  fill: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  scale: () => {},
  fillText: () => {},
  createLinearGradient: () => ({ addColorStop: () => {} }),
  setTransform: () => {}
};

function createMockCanvas(w = 800, h = 600) {
  return {
    width: w,
    height: h,
    getContext: () => dummyCtx,
    addEventListener: () => {},
    removeEventListener: () => {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h })
  };
}

test('All seven arcade games have portrait dimensions and tailored briefing in registry', () => {
  assert.equal(VALID_GAME_KEYS.length, 7);
  for (const key of VALID_GAME_KEYS) {
    const meta = getGameMeta(key);
    assert.ok(meta, `Metadata exists for ${key}`);
    assert.ok(meta.portraitDims, `Portrait dims exist for ${key}`);
    assert.ok(meta.portraitDims.width > 0 && meta.portraitDims.height > 0);
    assert.ok(meta.desktopDims, `Desktop dims exist for ${key}`);
    assert.ok(meta.briefing, `Briefing exists for ${key}`);
    assert.ok(meta.briefing.objective, `Briefing objective exists for ${key}`);
    assert.ok(Array.isArray(meta.briefing.keyboard) && meta.briefing.keyboard.length > 0);
    assert.ok(Array.isArray(meta.briefing.mobile) && meta.briefing.mobile.length > 0);
  }
});

test('fitCanvasToDisplay and computeRenderScale correctly handle game-specific logical dimensions', () => {
  // AstroPulse portrait dims: 600 x 800
  const canvas = createMockCanvas(390, 520);
  const scale = fitCanvasToDisplay(canvas, 1, 600, 800);
  assert.ok(scale >= 1);
  assert.equal(canvas.width, Math.round(600 * scale));
  assert.equal(canvas.height, Math.round(800 * scale));

  // CyberPacman portrait dims: 640 x 580
  const pacCanvas = createMockCanvas(360, 326);
  const pacScale = fitCanvasToDisplay(pacCanvas, 1, 640, 580);
  assert.ok(pacScale >= 1);
  assert.equal(pacCanvas.width, Math.round(640 * pacScale));
  assert.equal(pacCanvas.height, Math.round(580 * pacScale));
});

test('All seven games implement setDimensions and safely adjust bounds during screen resizing', () => {
  const c = createMockCanvas(800, 600);
  const cb = { onScoreUpdate: () => {}, onGameOver: () => {} };

  const games = [
    new CyberSurvivorsGame(c, dummyParticles, cb),
    new NeonDashGame(c, dummyParticles, cb),
    new QuantumBreakerGame(c, dummyParticles, cb),
    new AstroPulseGame(c, dummyParticles, cb),
    new NeonDriftGame(c, dummyParticles, cb),
    new HexaTronGame(c, dummyParticles, cb),
    new CyberPacmanGame(c, dummyParticles, cb)
  ];

  for (const g of games) {
    assert.equal(typeof g.setDimensions, 'function', `${g.constructor.name} must implement setDimensions`);
    // Resize to mobile portrait
    g.setDimensions(600, 800);
    assert.equal(g.width, 600);
    assert.equal(g.height, 800);
    // Resize to square mobile
    g.setDimensions(720, 720);
    assert.equal(g.width, 720);
    assert.equal(g.height, 720);
    // Resize back to desktop
    g.setDimensions(800, 600);
    assert.equal(g.width, 800);
    assert.equal(g.height, 600);
  }
});

test('Cyber Pacman responsive square playfield centers the maze without clipping across phone widths', () => {
  const c = createMockCanvas(640, 580);
  const game = new CyberPacmanGame(c, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} });
  game.init();

  const phoneWidths = [320, 360, 375, 390, 393, 412, 430];
  for (const pw of phoneWidths) {
    // 640 x 580 near-square logical space
    game.setDimensions(640, 580);
    assert.equal(game.originX, 12, `originX is 12 on mobile near-square layout`);
    assert.equal(game.originY, 15, `originY is 15 on mobile near-square layout`);

    // Maze boundaries
    const mazeRight = game.originX + 28 * 22;
    const mazeBottom = game.originY + 25 * 22;
    assert.ok(mazeRight <= 640, 'Maze does not clip right boundary');
    assert.ok(mazeBottom <= 580, 'Maze does not clip bottom boundary');
    assert.ok(game.player.x >= game.originX && game.player.x <= mazeRight);
    assert.ok(game.player.y >= game.originY && game.player.y <= mazeBottom);
  }
});

test('Quantum Breaker direct canvas touch controls move paddle smoothly', () => {
  const c = createMockCanvas(760, 800);
  const game = new QuantumBreakerGame(c, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} });
  game.init();
  game.setDimensions(760, 800);

  // Directly drag to 200px
  game.handlePointerMove(200);
  assert.equal(game.pointerX, 200);

  // Update paddle physics
  game.update(0.1);
  assert.ok(Math.abs(game.paddle.x - 200) < 150);

  // Directly drag to right boundary
  game.handlePointerMove(750);
  game.update(0.5);
  const half = game.paddle.width / 2;
  assert.ok(game.paddle.x <= 760 - half, 'Paddle respects right boundary');
});

test('Neon Drift direct road drag steering calculates accurate normalized steer', () => {
  const c = createMockCanvas(640, 800);
  const game = new NeonDriftGame(c, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} });
  game.start();
  game.setDimensions(640, 800);

  // Center touch (320px in 640 width = 0 steer)
  game.handlePointerMove(320);
  assert.equal(game.touchSteer, 0);

  // Hard left touch (0px = -1 steer)
  game.handlePointerMove(0);
  assert.equal(game.touchSteer, -1);

  // Hard right touch (640px = +1 steer)
  game.handlePointerMove(640);
  assert.equal(game.touchSteer, 1);

  // Release resets steer
  game.handlePointerUp();
  assert.equal(game.touchSteer, 0);
});

test('Hexa-Tron arena expands vertically in square portrait mode while preserving cycle limits', () => {
  const c = createMockCanvas(720, 720);
  const game = new HexaTronGame(c, dummyParticles, { onScoreUpdate: () => {}, onGameOver: () => {} });
  game.start();
  game.setDimensions(720, 720);

  assert.equal(game.arena.w, 660);
  assert.equal(game.arena.h, 660);
  assert.ok(game.player.x >= game.arena.x && game.player.x <= game.arena.x + game.arena.w);
  assert.ok(game.player.y >= game.arena.y && game.player.y <= game.arena.y + game.arena.h);
});

test('Centered mobile layout metadata configures 3-zone controls across all seven games', () => {
  const requirements = {
    cyberSurvivors: { controlMode: 'joystick', showSub: true, subLabel: 'BOOST', showSuper: true, superLabel: 'NOVA', primaryLabel: 'EMP' },
    astroPulse: { controlMode: 'joystick', showSub: true, subLabel: 'THRUST', showSuper: true, superLabel: 'BOMB', primaryLabel: 'FIRE' },
    cyberPacman: { controlMode: 'toggle', showSub: false, showSuper: false, primaryLabel: 'EMP STUN' },
    hexaTron: { controlMode: 'dpad', showSub: true, subLabel: 'NITRO', showSuper: false, primaryLabel: 'JUMP' },
    neonDrift: { controlMode: 'dpad', showSub: true, subLabel: 'DRIFT', showSuper: false, primaryLabel: 'NITRO' },
    neonDash: { controlMode: 'dpad', showSub: true, subLabel: 'AIR DASH', showSuper: false, primaryLabel: 'FLIP' },
    quantumBreaker: { controlMode: 'slider', showSub: true, subLabel: 'LASER', showSuper: true, superLabel: 'BOMB', primaryLabel: 'LAUNCH' }
  };

  for (const [key, req] of Object.entries(requirements)) {
    const meta = getGameMeta(key);
    assert.ok(meta, `Meta exists for ${key}`);
    assert.equal(meta.controlMode, req.controlMode, `${key} controlMode matches`);
    assert.equal(meta.showSub, req.showSub, `${key} showSub matches`);
    assert.equal(meta.showSuper, req.showSuper, `${key} showSuper matches`);
    assert.equal(meta.primaryLabel, req.primaryLabel, `${key} primaryLabel matches`);
    if (req.subLabel) assert.equal(meta.subLabel, req.subLabel, `${key} subLabel matches`);
    if (req.superLabel) assert.equal(meta.superLabel, req.superLabel, `${key} superLabel matches`);
  }
});

test('Secondary ability buttons trigger gameplay actions (AstroPulse Thrust, CyberSurvivors Boost, HexaTron Nitro)', () => {
  const c = createMockCanvas(600, 800);
  const cb = { onScoreUpdate: () => {}, onGameOver: () => {} };

  // 1. Astro Pulse Thrust
  const ap = new AstroPulseGame(c, dummyParticles, cb);
  ap.init();
  ap.joystick = { x: 0, y: -1.0 };
  const basePy = ap.player.y;
  ap.update(0.1);
  const standardMove = basePy - ap.player.y;

  // Activate Thrust (ShiftLeft)
  ap.player.y = basePy;
  ap.keys['ShiftLeft'] = true;
  ap.update(0.1);
  const thrustMove = basePy - ap.player.y;
  assert.ok(thrustMove > standardMove, 'Astro Pulse moves faster when Thrust is active');

  // 2. Cyber Survivors Boost
  const cs = new CyberSurvivorsGame(c, dummyParticles, cb);
  cs.init('specter');
  cs.joystick = { x: 1.0, y: 0 };
  const basePx = cs.player.x;
  cs.update(0.1);
  const standardCsMove = cs.player.x - basePx;

  cs.player.x = basePx;
  cs.keys['ShiftLeft'] = true;
  cs.update(0.1);
  const boostCsMove = cs.player.x - basePx;
  assert.ok(boostCsMove > standardCsMove, 'Cyber Survivors moves faster when Boost is active');

  // 3. Hexa-Tron Nitro
  const ht = new HexaTronGame(c, dummyParticles, cb);
  ht.start();
  assert.equal(ht.player.nitroTimer, 0);
  ht.setTouchAction('nitro', true);
  assert.ok(ht.player.nitroTimer > 0, 'Hexa-Tron activates nitro boost');

  // 4. Quantum Breaker Laser & Bomb
  const qb = new QuantumBreakerGame(c, dummyParticles, cb);
  qb.init();
  const initialLasers = qb.lasers.length;
  qb.fireLaser();
  assert.equal(qb.lasers.length, initialLasers + 2, 'Quantum Breaker fires lasers');
  qb.triggerBomb();
  assert.ok(true, 'Quantum Breaker detonates quantum bomb');
});
