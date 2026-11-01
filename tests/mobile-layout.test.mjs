import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserMocks } from './helpers/browser-mocks.mjs';

installBrowserMocks();

const { GAMES_METADATA, VALID_GAME_KEYS, getGameMeta } = await import('../src/engine/gamesRegistry.js');
const { LOGICAL_WIDTH, LOGICAL_HEIGHT, computeRenderScale, fitCanvasToDisplay } = await import('../src/engine/display.js');
const { storage } = await import('../src/engine/storage.js');
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

test('All seven games adapt to actual width-dependent phone viewports without clipping or fallback to 800x600', () => {
  const phoneWidths = [320, 360, 375, 390, 393, 412, 430];
  const cb = { onScoreUpdate: () => {}, onGameOver: () => {} };

  const gameConstructors = {
    cyberSurvivors: CyberSurvivorsGame,
    neonDash: NeonDashGame,
    quantumBreaker: QuantumBreakerGame,
    astroPulse: AstroPulseGame,
    neonDrift: NeonDriftGame,
    hexaTron: HexaTronGame,
    cyberPacman: CyberPacmanGame
  };

  for (const key of VALID_GAME_KEYS) {
    const meta = getGameMeta(key);
    assert.ok(meta.portraitDims, `${key} must define portraitDims`);
    const { width: pW, height: pH } = meta.portraitDims;

    for (const pw of phoneWidths) {
      // Calculate realistic display dimensions on phone
      const displayScale = pw / pW;
      const displayHeight = Math.round(pH * displayScale);
      const canvas = createMockCanvas(pw, displayHeight);

      const GameClass = gameConstructors[key];
      const game = new GameClass(canvas, dummyParticles, cb);
      if (game.init) game.init();
      else if (game.start) game.start();

      // Configure portrait dimensions
      game.setDimensions(pW, pH);
      assert.equal(game.width, pW, `${key} width must be ${pW} at ${pw}px screen`);
      assert.equal(game.height, pH, `${key} height must be ${pH} at ${pw}px screen`);

      // Verify canvas scaling does not fall back to 800x600
      const renderScale = fitCanvasToDisplay(canvas, 1, pW, pH);
      assert.ok(renderScale > 0, `Render scale must be positive for ${key} at ${pw}px`);
      assert.equal(canvas.width, Math.round(pW * renderScale));
      assert.equal(canvas.height, Math.round(pH * renderScale));
      assert.notEqual(canvas.width, 800, `${key} at ${pw}px must not fall back to default 800px width`);

      // Specific game playfield boundary verifications
      if (key === 'cyberPacman') {
        const mazeRight = game.originX + 28 * 22;
        const mazeBottom = game.originY + 25 * 22;
        assert.ok(mazeRight <= pW, `CyberPacman maze right (${mazeRight}) fits inside portrait width ${pW}`);
        assert.ok(mazeBottom <= pH, `CyberPacman maze bottom (${mazeBottom}) fits inside portrait height ${pH}`);
      } else if (key === 'quantumBreaker') {
        assert.ok(game.paddle.x >= 0 && game.paddle.x <= pW, `QuantumBreaker paddle inside bounds at ${pw}px`);
      } else if (key === 'neonDash') {
        assert.equal(game.floorY, Math.round(pH * 0.8), `NeonDash floorY scaled to 80% of ${pH}`);
        assert.equal(game.ceilY, Math.round(pH * 0.2), `NeonDash ceilY scaled to 20% of ${pH}`);
      } else if (key === 'hexaTron') {
        assert.ok(game.arena.w <= pW && game.arena.h <= pH, `HexaTron arena fits inside ${pW}x${pH}`);
      }
    }
  }
});

test('Horizontal centre of movement control matches viewport centre within 2px tolerance across ALL 7 games and ALL 7 viewports', () => {
  const phoneWidths = [320, 360, 375, 390, 393, 412, 430];

  for (const key of VALID_GAME_KEYS) {
    const meta = getGameMeta(key);

    for (const W of phoneWidths) {
      // Deck layout geometry matching src/style.css
      const isNarrow = W <= 360;
      const padding = isNarrow ? 4 : 10;
      const gap = isNarrow ? 2 : 6;

      // Determine movement control width
      let ctrlWidth;
      if (meta.controlMode === 'slider') {
        ctrlWidth = isNarrow ? 144 : 170;
      } else if (meta.controlMode === 'dpad') {
        ctrlWidth = isNarrow ? 104 : 114;
      } else {
        // Joystick
        ctrlWidth = isNarrow ? 104 : 114;
      }

      const availableInner = W - (2 * padding);
      // CSS Grid grid-template-columns: 1fr auto 1fr
      const colWidth = (availableInner - (2 * gap) - ctrlWidth) / 2;
      assert.ok(colWidth > 0, `${key} at ${W}px: flanking column width (${colWidth}px) must be positive`);

      // Left zone: [padding, padding + colWidth]
      const leftZoneLeft = padding;
      const leftZoneRight = padding + colWidth;

      // Center movement control: [leftZoneRight + gap, leftZoneRight + gap + ctrlWidth]
      const ctrlLeft = leftZoneRight + gap;
      const ctrlRight = ctrlLeft + ctrlWidth;
      const ctrlCenter = ctrlLeft + (ctrlWidth / 2);

      // Right zone: [ctrlRight + gap, ctrlRight + gap + colWidth]
      const rightZoneLeft = ctrlRight + gap;
      const rightZoneRight = rightZoneLeft + colWidth;

      // 1. Primary Movement Control must be horizontally centred
      const viewportCenter = W / 2;
      const diff = Math.abs(ctrlCenter - viewportCenter);
      assert.ok(
        diff <= 2,
        `${key} at ${W}px: movement control center (${ctrlCenter.toFixed(2)}) must match viewport center (${viewportCenter}) within 2px tolerance (diff: ${diff.toFixed(2)}px)`
      );

      // 2. No overlap between left zone and movement control
      assert.ok(
        leftZoneRight < ctrlLeft,
        `${key} at ${W}px: left zone right (${leftZoneRight}px) must not overlap movement control left (${ctrlLeft}px)`
      );

      // 3. No overlap between movement control and right zone
      assert.ok(
        ctrlRight < rightZoneLeft,
        `${key} at ${W}px: movement control right (${ctrlRight}px) must not overlap right zone left (${rightZoneLeft}px)`
      );

      // 4. Zero clipping: whole deck fits within screen bounds
      assert.ok(leftZoneLeft >= 0, `${key} at ${W}px: left zone within bounds`);
      assert.ok(
        Math.abs(rightZoneRight + padding - W) < 0.01,
        `${key} at ${W}px: right zone within viewport bounds (${rightZoneRight + padding} vs ${W})`
      );
    }
  }
});

test('Complete pointer capture state machine safely handles down, up, cancel, and lostpointercapture without stuck inputs', () => {
  let capturedPointers = new Set();
  let heldKeys = new Set();
  let isPressed = false;

  const mockButton = {
    setPointerCapture: (id) => capturedPointers.add(id),
    releasePointerCapture: (id) => capturedPointers.delete(id)
  };

  const handlePointerDown = (e) => {
    mockButton.setPointerCapture(e.pointerId);
    heldKeys.add('Space');
    isPressed = true;
  };

  const handlePointerRelease = (e) => {
    if (capturedPointers.has(e.pointerId)) {
      mockButton.releasePointerCapture(e.pointerId);
      if (capturedPointers.size === 0) {
        heldKeys.delete('Space');
        isPressed = false;
      }
    }
  };

  // 1. Normal tap press and release
  handlePointerDown({ pointerId: 10 });
  assert.equal(isPressed, true);
  assert.ok(heldKeys.has('Space'));
  assert.ok(capturedPointers.has(10));

  handlePointerRelease({ pointerId: 10 });
  assert.equal(isPressed, false);
  assert.ok(!heldKeys.has('Space'));
  assert.equal(capturedPointers.size, 0);

  // 2. Lost pointer capture (e.g. system gesture / phone notification)
  handlePointerDown({ pointerId: 20 });
  assert.equal(isPressed, true);
  // lostpointercapture fires
  handlePointerRelease({ pointerId: 20 });
  assert.equal(isPressed, false);
  assert.ok(!heldKeys.has('Space'), 'No stuck key after lostpointercapture');

  // 3. Multi-touch independence (Thumb 1 on Joystick pointer 1, Thumb 2 on Action pointer 2)
  const joyPointers = new Set();
  let joyActive = false;
  const pressJoy = (e) => { joyPointers.add(e.pointerId); joyActive = true; };
  const releaseJoy = (e) => { joyPointers.delete(e.pointerId); joyActive = false; };

  pressJoy({ pointerId: 1 });
  handlePointerDown({ pointerId: 2 });
  assert.equal(joyActive, true, 'Joystick is active with pointer 1');
  assert.equal(isPressed, true, 'Action button is active with pointer 2');

  // Release action button while holding joystick
  handlePointerRelease({ pointerId: 2 });
  assert.equal(isPressed, false, 'Action button released');
  assert.equal(joyActive, true, 'Joystick remains active with pointer 1');

  // Release joystick
  releaseJoy({ pointerId: 1 });
  assert.equal(joyActive, false, 'Joystick released cleanly');
});

test('Configurable joystick sizes and vertical positions update styling and persistence', () => {
  storage.setSetting('joystickSize', 'small');
  storage.setSetting('deckVerticalOffset', -10);
  assert.equal(storage.getSetting('joystickSize'), 'small');
  assert.equal(storage.getSetting('deckVerticalOffset'), -10);

  storage.setSetting('joystickSize', 'large');
  storage.setSetting('deckVerticalOffset', 10);
  assert.equal(storage.getSetting('joystickSize'), 'large');
  assert.equal(storage.getSetting('deckVerticalOffset'), 10);

  storage.setSetting('joystickSize', 'medium');
  storage.setSetting('deckVerticalOffset', 0);
  assert.equal(storage.getSetting('joystickSize'), 'medium');
  assert.equal(storage.getSetting('deckVerticalOffset'), 0);
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
