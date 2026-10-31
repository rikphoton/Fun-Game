import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserMocks } from './helpers/browser-mocks.mjs';

installBrowserMocks();
const { CyberPacmanGame } = await import('../src/games/cyberPacman.js');

test('CyberPacman initializes with a 28x25 symmetrical maze with 248 total pellets', () => {
  const dummyCanvas = { getContext: () => ({}) };
  const dummyParticles = { shockwaves: [], floatingTexts: [], burst: () => {}, shake: () => {} };
  const game = new CyberPacmanGame(dummyCanvas, dummyParticles, {});
  game.buildGrid();

  assert.equal(game.grid.length, 25);
  for (const row of game.grid) {
    assert.equal(row.length, 28);
  }
  assert.equal(game.totalDots, 248);
  assert.equal(game.dotsLeft, 248);
});

test('CyberPacman ghost targets correctly identify personalities', () => {
  const dummyCanvas = { getContext: () => ({}) };
  const dummyParticles = { shockwaves: [], floatingTexts: [], burst: () => {}, shake: () => {} };
  const game = new CyberPacmanGame(dummyCanvas, dummyParticles, {});
  game.buildGrid();
  game.resetPositions();

  game.player.tileX = 10;
  game.player.tileY = 15;
  game.player.dir = 'up';

  const blinky = game.ghosts.find(g => g.id === 'blinky');
  const pinky = game.ghosts.find(g => g.id === 'pinky');
  const inky = game.ghosts.find(g => g.id === 'inky');
  const clyde = game.ghosts.find(g => g.id === 'clyde');

  blinky.mode = 'chase';
  pinky.mode = 'chase';
  inky.mode = 'chase';
  clyde.mode = 'chase';

  game.updateGhostTarget(blinky);
  assert.equal(blinky.targetX, 10);
  assert.equal(blinky.targetY, 15);

  game.updateGhostTarget(pinky);
  // Pinky aims 4 tiles ahead in dir 'up' -> tileY - 4 = 11
  assert.equal(pinky.targetX, 10);
  assert.equal(pinky.targetY, 11);

  // Clyde when close (dist <= 8 tiles) retreats to home corner (0, 24)
  game.updateGhostTarget(clyde);
  assert.equal(clyde.targetX, 0);
  assert.equal(clyde.targetY, 24);

  // Clyde when far (dist > 8 tiles) targets player directly
  game.player.tileX = 1;
  game.player.tileY = 1;
  game.updateGhostTarget(clyde);
  assert.equal(clyde.targetX, 1);
  assert.equal(clyde.targetY, 1);
});

test('CyberPacman direction logic allows instant 180-degree reversal', () => {
  const dummyCanvas = { getContext: () => ({}) };
  const dummyParticles = { shockwaves: [], floatingTexts: [], burst: () => {}, shake: () => {} };
  const game = new CyberPacmanGame(dummyCanvas, dummyParticles, {});

  game.player.dir = 'left';
  game.setNextDir('right');
  assert.equal(game.player.dir, 'right');

  game.player.dir = 'up';
  game.setNextDir('down');
  assert.equal(game.player.dir, 'down');
});

test('CyberPacman super EMP stuns active ghosts and resets charge', () => {
  const dummyCanvas = { getContext: () => ({}) };
  const dummyParticles = { shockwaves: [], floatingTexts: [], burst: () => {}, shake: () => {} };
  const game = new CyberPacmanGame(dummyCanvas, dummyParticles, {});
  game.buildGrid();
  game.resetPositions();
  game.gameState = 'playing';
  game.isRunning = true;

  game.superCharge = 50;
  game.triggerSuperAbility();
  assert.equal(game.superCharge, 50); // Not ready yet

  game.superCharge = 100;
  game.triggerSuperAbility();
  assert.equal(game.superCharge, 0);

  const blinky = game.ghosts.find(g => g.id === 'blinky');
  assert.equal(blinky.isStunned, true);
  assert.ok(blinky.stunTimer > 0);
});
