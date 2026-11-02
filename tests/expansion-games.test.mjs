import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EXPANSION_GAMES_METADATA,
  EXPANSION_GAME_KEYS,
  getGameMeta
} from '../src/engine/gamesRegistry.js';

import { CyberPinballGame } from '../src/games/cyberPinball.js';
import { VoxelTankSiegeGame } from '../src/games/voxelTankSiege.js';
import { SynthBladeGame } from '../src/games/synthBlade.js';
import { LaserMatrixGame } from '../src/games/laserMatrix.js';

function createMockCanvas(width = 800, height = 600) {
  return {
    width,
    height,
    getContext: () => ({
      fillRect: () => {},
      clearRect: () => {},
      beginPath: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      strokeRect: () => {},
      moveTo: () => {},
      lineTo: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      fillText: () => {}
    }),
    addEventListener: () => {},
    removeEventListener: () => {}
  };
}

function createMockParticles() {
  return {
    burst: () => {},
    shockwave: () => {},
    shake: () => {},
    clear: () => {}
  };
}

test('Expansion games registry contains all four new cabinets with valid metadata', () => {
  assert.equal(EXPANSION_GAME_KEYS.length, 4);
  const expectedKeys = ['cyberPinball', 'voxelTankSiege', 'synthBlade', 'laserMatrix'];
  assert.deepEqual([...EXPANSION_GAME_KEYS], expectedKeys);

  for (const key of EXPANSION_GAME_KEYS) {
    const meta = getGameMeta(key);
    assert.ok(meta, `Metadata for ${key} must exist`);
    assert.equal(meta.key, key);
    assert.ok(meta.title, 'Title must exist');
    assert.ok(meta.portraitDims && meta.portraitDims.width > 0 && meta.portraitDims.height > 0);
    assert.ok(meta.desktopDims && meta.desktopDims.width > 0 && meta.desktopDims.height > 0);
    assert.ok(meta.briefing && meta.briefing.objective);
    assert.ok(Array.isArray(meta.briefing.keyboard) && meta.briefing.keyboard.length > 0);
    assert.ok(Array.isArray(meta.briefing.mobile) && meta.briefing.mobile.length > 0);
  }
});

test('All four expansion games implement standardized lifecycle interface', () => {
  const canvas = createMockCanvas();
  const particles = createMockParticles();
  const callbacks = { onScoreUpdate: () => {}, onGameOver: () => {} };

  const games = [
    new CyberPinballGame(canvas, particles, callbacks),
    new VoxelTankSiegeGame(canvas, particles, callbacks),
    new SynthBladeGame(canvas, particles, callbacks),
    new LaserMatrixGame(canvas, particles, callbacks)
  ];

  for (const g of games) {
    assert.equal(typeof g.init, 'function');
    assert.equal(typeof g.start, 'function');
    assert.equal(typeof g.pause, 'function');
    assert.equal(typeof g.resume, 'function');
    assert.equal(typeof g.destroy, 'function');
    assert.equal(typeof g.update, 'function');
    assert.equal(typeof g.draw, 'function');
    assert.equal(typeof g.setDimensions, 'function');

    g.init();
    assert.equal(g.isRunning, true);
    g.pause();
    assert.equal(g.isPaused, true);
    g.resume();
    assert.equal(g.isPaused, false);
    g.destroy();
    assert.equal(g.isRunning, false);
  }
});

test('CyberPinball: Flipper angle resolution, bumper collision, and Multiball frenzy trigger', () => {
  const canvas = createMockCanvas(600, 750);
  const particles = createMockParticles();
  let latestScore = 0;
  const game = new CyberPinballGame(canvas, particles, {
    onScoreUpdate: (score) => { latestScore = score; },
    onGameOver: () => {}
  });

  game.init();
  assert.equal(game.balls.length, 1);
  assert.equal(game.dropTargets.length, 5);

  // Simulate flipper activation
  game.handleInput({ KeyA: true, KeyD: true }, {});
  game.update(0.05);
  assert.ok(game.leftFlipperAngle < 0.4);
  assert.ok(game.rightFlipperAngle > -0.4);

  // Directly hit all 5 C-Y-B-E-R drop targets
  game.dropTargets.forEach(t => { t.hit = true; });
  game.triggerMultiball();

  assert.equal(game.multiballActive, true);
  assert.equal(game.multiplier, 3);
  assert.equal(game.balls.length, 3, 'Multiball should spawn 2 extra balls (total 3)');
});

test('VoxelTankSiege: Shell ricochet physics, barricades destruction, and energy mines', () => {
  const canvas = createMockCanvas(800, 600);
  const particles = createMockParticles();
  const game = new VoxelTankSiegeGame(canvas, particles, {
    onScoreUpdate: () => {},
    onGameOver: () => {}
  });

  game.init();
  assert.ok(game.player.hp > 0);
  assert.equal(game.barricades.length, 5);
  assert.ok(game.enemies.length >= 2);

  // Test firing cannon
  game.handleInput({ Space: true }, {});
  game.update(0.01);
  assert.equal(game.shells.length, 1, 'Cannon shell should be spawned on Space');
  assert.equal(game.shells[0].bounces, 2, 'Shell starts with 2 ricochets');

  // Test deploying mine
  game.handleInput({ ShiftLeft: true }, {});
  game.update(0.01);
  assert.equal(game.mines.length, 1, 'Mine should be placed');
  assert.equal(game.mineCharges, 2, 'Mine charge should be decremented');

  // Test shell bounce off wall
  const shell = game.shells[0];
  shell.x = 10; // Left wall boundary
  shell.vx = -400;
  game.update(0.01);
  assert.ok(shell.vx > 0, 'Shell should invert horizontal velocity on wall bounce');
  assert.equal(shell.bounces, 1, 'Bounces should decrement');
});

test('SynthBlade: 4-lane beat notes, precision hit evaluation, combo, and Fever Mode', () => {
  const canvas = createMockCanvas(600, 700);
  const particles = createMockParticles();
  let currentScore = 0;
  let currentCombo = 0;
  const game = new SynthBladeGame(canvas, particles, {
    onScoreUpdate: (score, combo) => {
      currentScore = score;
      currentCombo = combo;
    },
    onGameOver: () => {}
  });

  game.init();
  assert.equal(game.notes.length, 0);

  // Advance time to spawn notes
  game.update(0.5);
  assert.ok(game.notes.length >= 1, 'Beat notes should spawn after interval');

  // Align first note exactly with hit line for PERFECT hit
  const note = game.notes[0];
  note.y = game.hitLineY;
  const lane = note.lane;

  const keyMap = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'];
  const input = {};
  input[keyMap[lane]] = true;

  game.handleInput(input, {});
  game.update(0.01);

  assert.equal(note.hit, true, 'Note should be registered as hit');
  assert.ok(game.score >= 200, 'Score should increase by at least 200 pts for PERFECT');
  assert.equal(game.combo, 1);

  // Advance combo to 20 to verify Fever Mode trigger
  game.combo = 19;
  note.hit = false;
  note.y = game.hitLineY;
  game.prevLanePressed[lane] = false;
  game.hitLane(lane);

  assert.equal(game.feverMode, true, 'Fever Mode should activate at 20 combo');
  assert.ok(game.feverTimer > 0);
});

test('LaserMatrix: Real-time mirror ray-casting, core illumination, and puzzle solve', () => {
  const canvas = createMockCanvas(700, 650);
  const particles = createMockParticles();
  let solved = false;
  const game = new LaserMatrixGame(canvas, particles, {
    onScoreUpdate: () => {},
    onGameOver: (data) => { if (data.won) solved = true; }
  });

  game.init();
  assert.equal(game.level, 1);
  assert.equal(game.mirrors.length, 2);
  assert.equal(game.targets.length, 1);

  // On Level 1, verify laser calculates segments
  assert.ok(game.laserSegments.length >= 2, 'Laser should calculate ray reflection segments');
  assert.equal(game.targets[0].powered, true, 'Stage 1 starting layout powers target core');

  // Verify mirror rotation on click
  const mirror = game.mirrors[0];
  const initialAngle = mirror.angle;
  const mx = game.offsetX + mirror.col * game.cellSize + game.cellSize / 2;
  const my = game.offsetY + mirror.row * game.cellSize + game.cellSize / 2;

  game.onCanvasClick(mx, my);
  assert.notEqual(mirror.angle, initialAngle, 'Mirror angle should rotate 45 degrees');
});
