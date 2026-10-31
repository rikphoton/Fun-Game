// NeonPulse Arcade - Cyber Pacman: Retro Cyberpunk Maze Infiltrator
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';
import { gamepad } from '../engine/gamepad.js';

const TILE_SIZE = 22;
const GRID_COLS = 28;
const GRID_ROWS = 25;
const ORIGIN_X = 92; // (800 - 28 * 22) / 2 = 92
const ORIGIN_Y = 25; // (600 - 25 * 22) / 2 = 25

// Base 14-column symmetrical half-map:
// 1: Wall, 2: Dot (Data Bit), 3: Power Pellet (Overclock Core), 4: Ghost Gate, 5: Ghost House, 0: Empty/Walkable
const BASE_HALF_MAP = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], // 0: Top wall
  [1, 3, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1], // 1: Top corridor (power pellet at col 1)
  [1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1], // 2
  [1, 2, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 1], // 3
  [1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0], // 4: Cross junction
  [1, 2, 1, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1], // 5
  [1, 2, 2, 2, 1, 2, 2, 1, 2, 2, 2, 2, 2, 1], // 6
  [1, 1, 1, 2, 1, 1, 0, 1, 1, 1, 1, 1, 2, 1], // 7
  [0, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 1], // 8
  [1, 1, 1, 2, 1, 0, 1, 1, 4, 1, 0, 1, 2, 1], // 9: Ghost gate (col 8)
  [0, 0, 0, 2, 0, 0, 1, 5, 5, 1, 0, 0, 2, 0], // 10: Tunnel row & ghost house interior (cols 7 & 8)
  [1, 1, 1, 2, 1, 0, 1, 5, 5, 1, 0, 1, 2, 1], // 11: Ghost house inside
  [0, 0, 1, 2, 1, 0, 1, 1, 1, 1, 0, 1, 2, 1], // 12: House bottom wall
  [1, 1, 1, 2, 1, 0, 0, 0, 0, 0, 0, 1, 2, 1], // 13: Below house
  [1, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 0], // 14: Fruit spawn area
  [1, 2, 1, 1, 1, 2, 2, 1, 2, 2, 2, 1, 1, 1], // 15
  [1, 3, 2, 2, 1, 1, 2, 1, 2, 1, 1, 1, 2, 1], // 16: Bottom power pellet
  [1, 1, 1, 2, 1, 2, 2, 2, 2, 2, 2, 1, 2, 1], // 17
  [1, 2, 2, 2, 2, 2, 1, 1, 1, 1, 2, 2, 2, 0], // 18: Pacman spawn corridor (cols 13 & 14 are open 0,0)
  [1, 2, 1, 1, 1, 1, 1, 2, 2, 1, 1, 1, 2, 1], // 19
  [1, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 2, 2, 1], // 20
  [1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1], // 21
  [1, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 1], // 22
  [1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1], // 23
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]  // 24: Bottom wall
];

const FRUIT_TYPES = [
  { name: 'Neon Cherry', symbol: '🍒', pts: 100, color: '#ff0055' },
  { name: 'Cyber Strawberry', symbol: '🍓', pts: 300, color: '#ff007b' },
  { name: 'Plasma Orange', symbol: '🍊', pts: 500, color: '#ff9900' },
  { name: 'Quantum Key', symbol: '🔑', pts: 1000, color: '#00f3ff' },
  { name: 'Matrix Core', symbol: '💎', pts: 2000, color: '#a855f7' }
];

export class CyberPacmanGame {
  constructor(canvas, particles, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particles;
    this.callbacks = callbacks;

    this.width = 800;
    this.height = 600;

    this.isRunning = false;
    this.isPaused = false;

    this.score = 0;
    this.stage = 1;
    this.lives = 3;
    this.creditsEarned = 0;
    this.dotsEatenTotal = 0;
    this.ghostsEatenTotal = 0;

    // Grid State
    this.grid = [];
    this.totalDots = 0;
    this.dotsLeft = 0;

    // Player State
    this.player = {
      x: 0,
      y: 0,
      tileX: 13,
      tileY: 18,
      dir: 'none',
      nextDir: 'none',
      speed: 115,
      mouthAngle: 0.2,
      mouthTimer: 0,
      alive: true
    };

    // Ghosts
    this.ghosts = [];
    this.ghostCombo = 0;
    this.frightenedTimer = 0;
    this.waveTimer = 0;
    this.waveMode = 'scatter'; // 'scatter' or 'chase'

    // Super EMP ability (0 to 100%)
    this.superCharge = 0;

    // Fruit / Data Cache
    this.fruit = null;
    this.fruitTimer = 0;

    // State Timers
    this.stateTimer = 0; // ready delay, death delay, clear delay
    this.gameState = 'ready'; // 'ready', 'playing', 'dying', 'cleared', 'gameover'
    this.chompToggle = false;
    this.lastChompTime = 0;

    // Touch control helpers
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.keys = {};

    this.bindInputs();
  }

  buildGrid() {
    this.grid = [];
    this.totalDots = 0;

    for (let r = 0; r < GRID_ROWS; r++) {
      const half = BASE_HALF_MAP[r];
      const mirrored = [...half].reverse();
      const row = [...half, ...mirrored];
      this.grid.push(row);

      for (let c = 0; c < GRID_COLS; c++) {
        if (row[c] === 2 || row[c] === 3) {
          this.totalDots++;
        }
      }
    }
    this.dotsLeft = this.totalDots;
  }

  init() {
    this.isRunning = true;
    this.isPaused = false;
    this.score = 0;
    this.stage = 1;
    this.lives = 3;
    this.creditsEarned = 0;
    this.dotsEatenTotal = 0;
    this.ghostsEatenTotal = 0;
    this.superCharge = 0;

    // Cyber Lab Thruster upgrade bonus
    const thrusterLvl = storage.getLabLevel ? storage.getLabLevel('thrusters') : 0;
    this.player.speed = 115 * (1 + thrusterLvl * 0.08);

    storage.recordGamePlayed();
    this.startStage(1);
    sound.startBgm('synthwave');
    sound.announce('Grid Infiltrator Online');
  }

  startStage(stageNumber) {
    this.stage = stageNumber;
    this.buildGrid();
    this.resetPositions();
    this.fruit = null;
    this.fruitTimer = 0;
    this.frightenedTimer = 0;
    this.waveTimer = 0;
    this.waveMode = 'scatter';
    this.gameState = 'ready';
    this.stateTimer = 1.8; // 1.8s "READY!" countdown
    this.updateHUD();
  }

  resetPositions() {
    // Pacman Start (Row 18, Col 13 - open corridor facing left)
    const startTileX = 13;
    const startTileY = 18;
    this.player.x = ORIGIN_X + startTileX * TILE_SIZE + TILE_SIZE / 2;
    this.player.y = ORIGIN_Y + startTileY * TILE_SIZE + TILE_SIZE / 2;
    this.player.tileX = startTileX;
    this.player.tileY = startTileY;
    this.player.dir = 'left';
    this.player.nextDir = 'none';
    this.player.alive = true;

    // Ghosts setup: Blinky, Pinky, Inky, Clyde
    const baseSpeed = Math.min(130, 95 + this.stage * 4);

    this.ghosts = [
      {
        id: 'blinky',
        name: 'RedLine',
        color: '#ff0055',
        aura: 'rgba(255, 0, 85, 0.4)',
        x: ORIGIN_X + 8 * TILE_SIZE + TILE_SIZE / 2,
        y: ORIGIN_Y + 8 * TILE_SIZE + TILE_SIZE / 2, // Outside gate in corridor
        dir: 'left',
        mode: 'scatter',
        targetX: 25,
        targetY: 0,
        homeX: 25,
        homeY: 0,
        speed: baseSpeed,
        inHouse: false,
        exitTimer: 0,
        isStunned: false,
        stunTimer: 0
      },
      {
        id: 'pinky',
        name: 'Valkyrie',
        color: '#ff71ce',
        aura: 'rgba(255, 113, 206, 0.4)',
        x: ORIGIN_X + 8 * TILE_SIZE + TILE_SIZE / 2,
        y: ORIGIN_Y + 10 * TILE_SIZE + TILE_SIZE / 2, // Inside house
        dir: 'up',
        mode: 'house',
        targetX: 2,
        targetY: 0,
        homeX: 2,
        homeY: 0,
        speed: baseSpeed * 0.95,
        inHouse: true,
        exitTimer: 0.8,
        isStunned: false,
        stunTimer: 0
      },
      {
        id: 'inky',
        name: 'Glitch',
        color: '#00f3ff',
        aura: 'rgba(0, 243, 255, 0.4)',
        x: ORIGIN_X + 7 * TILE_SIZE + TILE_SIZE / 2,
        y: ORIGIN_Y + 10 * TILE_SIZE + TILE_SIZE / 2, // Inside house left
        dir: 'up',
        mode: 'house',
        targetX: 27,
        targetY: 24,
        homeX: 27,
        homeY: 24,
        speed: baseSpeed * 0.9,
        inHouse: true,
        exitTimer: 2.5,
        isStunned: false,
        stunTimer: 0
      },
      {
        id: 'clyde',
        name: 'Chaos',
        color: '#ff9900',
        aura: 'rgba(255, 153, 0, 0.4)',
        x: ORIGIN_X + 8 * TILE_SIZE + TILE_SIZE / 2,
        y: ORIGIN_Y + 11 * TILE_SIZE + TILE_SIZE / 2, // Inside house lower
        dir: 'up',
        mode: 'house',
        targetX: 0,
        targetY: 24,
        homeX: 0,
        homeY: 24,
        speed: baseSpeed * 0.85,
        inHouse: true,
        exitTimer: 4.5,
        isStunned: false,
        stunTimer: 0
      }
    ];

    for (const ghost of this.ghosts) {
      ghost.baseY = ghost.y;
    }
  }

  bindInputs() {
    window.addEventListener('keydown', (e) => {
      if (!this.isRunning) return;
      this.handleKeyDown(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKeyUp(e.code);
    });
  }

  handleKeyDown(code) {
    if (this.gameState !== 'playing' && this.gameState !== 'ready') return;

    if (code === 'ArrowUp' || code === 'KeyW') {
      this.setNextDir('up');
    } else if (code === 'ArrowDown' || code === 'KeyS') {
      this.setNextDir('down');
    } else if (code === 'ArrowLeft' || code === 'KeyA') {
      this.setNextDir('left');
    } else if (code === 'ArrowRight' || code === 'KeyD') {
      this.setNextDir('right');
    } else if (code === 'Space') {
      this.triggerSuperAbility();
    }
  }

  handleKeyUp(_code) {}

  setNextDir(dir) {
    this.player.nextDir = dir;
    // Immediate 180 reverse check or start moving from stop
    if (this.isOppositeDir(this.player.dir, dir)) {
      this.player.dir = dir;
      this.player.nextDir = 'none';
    } else if (this.player.dir === 'none') {
      const curTileX = Math.floor((this.player.x - ORIGIN_X) / TILE_SIZE);
      const curTileY = Math.floor((this.player.y - ORIGIN_Y) / TILE_SIZE);
      const targetTile = this.getAdjacentTile(curTileX, curTileY, dir);
      if (this.isWalkableForPlayer(targetTile.col, targetTile.row)) {
        this.player.dir = dir;
        this.player.nextDir = 'none';
      }
    }
  }

  isOppositeDir(d1, d2) {
    return (
      (d1 === 'left' && d2 === 'right') ||
      (d1 === 'right' && d2 === 'left') ||
      (d1 === 'up' && d2 === 'down') ||
      (d1 === 'down' && d2 === 'up')
    );
  }

  handlePointerDown(x, y) {
    if (!this.isRunning) return;
    this.touchStartX = x;
    this.touchStartY = y;

    // If tapped far enough from player, steer immediately
    const dx = x - this.player.x;
    const dy = y - this.player.y;
    if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.setNextDir(dx > 0 ? 'right' : 'left');
      } else {
        this.setNextDir(dy > 0 ? 'down' : 'up');
      }
    }
  }

  handlePointerMove(x, y) {
    if (!this.isRunning) return;
    const dx = x - this.touchStartX;
    const dy = y - this.touchStartY;
    const minSwipe = 20;

    if (Math.abs(dx) > minSwipe || Math.abs(dy) > minSwipe) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.setNextDir(dx > 0 ? 'right' : 'left');
      } else {
        this.setNextDir(dy > 0 ? 'down' : 'up');
      }
      this.touchStartX = x;
      this.touchStartY = y;
    }
  }

  handlePointerUp() {}

  triggerSuperAbility() {
    if (!this.isRunning || this.gameState !== 'playing') return;
    if (this.superCharge < 100) return;

    this.superCharge = 0;
    sound.playSuperNova();
    sound.announce('EMP Discharged!');

    this.particles.shake(12, 0.35);
    this.particles.burst(this.player.x, this.player.y, 30, {
      color: '#00f3ff',
      colors: ['#00f3ff', '#ffe600', '#ffffff'],
      maxSpeed: 280,
      life: 0.7
    });

    // Stun all non-eaten ghosts for 4.5 seconds
    for (const ghost of this.ghosts) {
      if (ghost.mode !== 'eaten') {
        ghost.isStunned = true;
        ghost.stunTimer = 4.5;
      }
    }

    this.updateHUD();
  }

  update(dt) {
    if (!this.isRunning || this.isPaused) return;

    if (this.gameState === 'ready') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.gameState = 'playing';
      }
      return;
    }

    if (this.gameState === 'dying') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.lives--;
        if (this.lives <= 0) {
          this.gameOver();
        } else {
          this.resetPositions();
          this.gameState = 'ready';
          this.stateTimer = 1.2;
          this.updateHUD();
        }
      }
      return;
    }

    if (this.gameState === 'cleared') {
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.startStage(this.stage + 1);
      }
      return;
    }

    if (this.gameState !== 'playing') return;

    // Timers
    this.updateTimers(dt);

    // Player Update
    this.updatePlayer(dt);

    // Ghosts Update
    this.updateGhosts(dt);

    // Collisions
    this.checkCollisions();

    // Fruit Update
    this.updateFruit(dt);

    // Continuous HUD sync
    this.updateHUD();
  }

  updateTimers(dt) {
    // Frightened mode timer
    if (this.frightenedTimer > 0) {
      this.frightenedTimer -= dt;
      if (this.frightenedTimer <= 0) {
        this.frightenedTimer = 0;
        for (const ghost of this.ghosts) {
          if (ghost.mode === 'frightened') {
            ghost.mode = this.waveMode;
          }
        }
      }
    } else {
      // Wave mode switching: Scatter <-> Chase
      this.waveTimer += dt;
      const cycle = this.waveTimer % 27;
      const newMode = cycle < 7 ? 'scatter' : 'chase';
      if (newMode !== this.waveMode) {
        this.waveMode = newMode;
        for (const ghost of this.ghosts) {
          if (ghost.mode === 'scatter' || ghost.mode === 'chase') {
            ghost.mode = this.waveMode;
            // Reverse direction on wave switch
            ghost.dir = this.getOppositeDir(ghost.dir);
          }
        }
      }
    }
  }

  getOppositeDir(d) {
    if (d === 'left') return 'right';
    if (d === 'right') return 'left';
    if (d === 'up') return 'down';
    if (d === 'down') return 'up';
    return 'none';
  }

  updatePlayer(dt) {
    if (!this.player.alive) return;

    // Mouth animation
    this.player.mouthTimer += dt;
    this.player.mouthAngle = Math.abs(Math.sin(this.player.mouthTimer * 14)) * 0.45 + 0.05;

    // Movement calculation
    const moveDist = this.player.speed * dt;

    // Handle turns and grid alignment
    this.processPlayerMovement(moveDist);

    // Check tunnel wrap
    const minX = ORIGIN_X - TILE_SIZE / 2;
    const maxX = ORIGIN_X + GRID_COLS * TILE_SIZE + TILE_SIZE / 2;
    if (this.player.x < minX) this.player.x = maxX;
    else if (this.player.x > maxX) this.player.x = minX;

    // Calculate current tile
    this.player.tileX = Math.floor((this.player.x - ORIGIN_X) / TILE_SIZE);
    this.player.tileY = Math.floor((this.player.y - ORIGIN_Y) / TILE_SIZE);

    // Eat dots
    this.checkTileEating();
  }

  processPlayerMovement(moveDist) {
    const curTileX = Math.floor((this.player.x - ORIGIN_X) / TILE_SIZE);
    const curTileY = Math.floor((this.player.y - ORIGIN_Y) / TILE_SIZE);
    const centerX = ORIGIN_X + curTileX * TILE_SIZE + TILE_SIZE / 2;
    const centerY = ORIGIN_Y + curTileY * TILE_SIZE + TILE_SIZE / 2;

    const distToCenterX = Math.abs(this.player.x - centerX);
    const distToCenterY = Math.abs(this.player.y - centerY);
    const TURN_THRESHOLD = Math.max(9, moveDist + 1);

    // If stopped at wall, take any walkable queued direction immediately
    if (this.player.dir === 'none') {
      if (this.player.nextDir !== 'none') {
        const nextTile = this.getAdjacentTile(curTileX, curTileY, this.player.nextDir);
        if (this.isWalkableForPlayer(nextTile.col, nextTile.row)) {
          this.player.x = centerX;
          this.player.y = centerY;
          this.player.dir = this.player.nextDir;
          this.player.nextDir = 'none';
        }
      }
      return;
    }

    // Check if queued direction can be taken at intersection
    if (this.player.nextDir !== 'none' && this.player.nextDir !== this.player.dir) {
      const isPerpendicular =
        (this.player.dir === 'left' || this.player.dir === 'right') &&
        (this.player.nextDir === 'up' || this.player.nextDir === 'down') ||
        (this.player.dir === 'up' || this.player.dir === 'down') &&
        (this.player.nextDir === 'left' || this.player.nextDir === 'right');

      if (isPerpendicular) {
        if (distToCenterX <= TURN_THRESHOLD && distToCenterY <= TURN_THRESHOLD) {
          const nextTile = this.getAdjacentTile(curTileX, curTileY, this.player.nextDir);
          if (this.isWalkableForPlayer(nextTile.col, nextTile.row)) {
            // Snap to center and switch direction
            this.player.x = centerX;
            this.player.y = centerY;
            this.player.dir = this.player.nextDir;
            this.player.nextDir = 'none';
          }
        }
      }
    }

    // Check obstacle ahead
    const checkAheadDist = moveDist + 1;
    let nextX = this.player.x;
    let nextY = this.player.y;

    if (this.player.dir === 'left') nextX -= moveDist;
    else if (this.player.dir === 'right') nextX += moveDist;
    else if (this.player.dir === 'up') nextY -= moveDist;
    else if (this.player.dir === 'down') nextY += moveDist;

    // Check if moving forward hits a wall tile
    const aheadTile = this.getAdjacentTile(curTileX, curTileY, this.player.dir);
    const isAheadWall = !this.isWalkableForPlayer(aheadTile.col, aheadTile.row);

    if (isAheadWall) {
      if (this.player.dir === 'left' && nextX < centerX) {
        this.player.x = centerX;
        this.player.dir = 'none';
        return;
      }
      if (this.player.dir === 'right' && nextX > centerX) {
        this.player.x = centerX;
        this.player.dir = 'none';
        return;
      }
      if (this.player.dir === 'up' && nextY < centerY) {
        this.player.y = centerY;
        this.player.dir = 'none';
        return;
      }
      if (this.player.dir === 'down' && nextY > centerY) {
        this.player.y = centerY;
        this.player.dir = 'none';
        return;
      }
    }

    this.player.x = nextX;
    this.player.y = nextY;
  }

  getAdjacentTile(col, row, dir) {
    if (dir === 'left') return { col: col - 1, row };
    if (dir === 'right') return { col: col + 1, row };
    if (dir === 'up') return { col, row: row - 1 };
    if (dir === 'down') return { col, row: row + 1 };
    return { col, row };
  }

  isWalkableForPlayer(col, row) {
    // Tunnel row wrapping allowance
    if (row === 10 && (col < 0 || col >= GRID_COLS)) return true;
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    const tile = this.grid[row][col];
    // 1: wall, 4: ghost door, 5: house interior
    return tile !== 1 && tile !== 4 && tile !== 5;
  }

  checkTileEating() {
    const col = this.player.tileX;
    const row = this.player.tileY;
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return;

    const tile = this.grid[row][col];

    // Regular Dot
    if (tile === 2) {
      this.grid[row][col] = 0;
      this.score += 10;
      this.dotsLeft--;
      this.dotsEatenTotal++;
      this.superCharge = Math.min(100, this.superCharge + 0.6);

      // Sound chomp
      const now = performance.now();
      if (now - this.lastChompTime > 110) {
        sound.playChomp(this.chompToggle);
        this.chompToggle = !this.chompToggle;
        this.lastChompTime = now;
      }

      // Small particle spark
      this.particles.burst(this.player.x, this.player.y, 2, {
        color: '#ffe600',
        maxSpeed: 40,
        life: 0.2
      });

      // Neon credits earn
      if (this.dotsEatenTotal % 15 === 0) {
        this.creditsEarned++;
        storage.addCredits(1);
      }

      this.checkFruitSpawn();

      if (this.dotsLeft <= 0) {
        this.stageClear();
      }
    } else if (tile === 3) {
      // Overclock Core / Power Pellet
      this.grid[row][col] = 0;
      this.score += 50;
      this.dotsLeft--;
      this.dotsEatenTotal++;
      this.superCharge = Math.min(100, this.superCharge + 8);

      sound.playWarning();
      sound.announce('Overclock Surge!');

      this.particles.shake(6, 0.25);
      this.particles.burst(this.player.x, this.player.y, 20, {
        color: '#ff007b',
        colors: ['#ff007b', '#ffe600', '#00f3ff'],
        maxSpeed: 160,
        life: 0.5
      });

      // Trigger Frightened Mode on ghosts
      this.frightenedTimer = Math.max(4, 9 - this.stage * 0.5);
      this.ghostCombo = 0;

      for (const ghost of this.ghosts) {
        if (ghost.mode !== 'eaten' && !ghost.inHouse) {
          ghost.mode = 'frightened';
          ghost.dir = this.getOppositeDir(ghost.dir);
        }
      }

      if (this.dotsLeft <= 0) {
        this.stageClear();
      }
    }
  }

  checkFruitSpawn() {
    const dotsEaten = this.totalDots - this.dotsLeft;
    if ((dotsEaten === 60 || dotsEaten === 140) && !this.fruit) {
      const fruitIndex = Math.min(FRUIT_TYPES.length - 1, this.stage - 1);
      const fruitData = FRUIT_TYPES[fruitIndex];
      this.fruit = {
        ...fruitData,
        x: ORIGIN_X + 13.5 * TILE_SIZE + TILE_SIZE / 2,
        y: ORIGIN_Y + 14 * TILE_SIZE + TILE_SIZE / 2,
        life: 10
      };
      sound.playGemPickup(2);
    }
  }

  updateFruit(dt) {
    if (!this.fruit) return;
    this.fruit.life -= dt;
    if (this.fruit.life <= 0) {
      this.fruit = null;
      return;
    }

    // Check collision with player
    const dist = Math.hypot(this.player.x - this.fruit.x, this.player.y - this.fruit.y);
    if (dist < 16) {
      this.score += this.fruit.pts;
      this.creditsEarned += 25;
      storage.addCredits(25);

      sound.playGemPickup(5);
      this.particles.burst(this.fruit.x, this.fruit.y, 18, {
        color: this.fruit.color,
        maxSpeed: 180,
        life: 0.6
      });

      // Floating score text
      this.particles.floatingTexts.push({
        text: `+${this.fruit.pts}`,
        x: this.fruit.x,
        y: this.fruit.y - 12,
        color: this.fruit.color,
        vy: -40,
        life: 1.2
      });

      this.fruit = null;
    }
  }

  updateGhosts(dt) {
    for (const ghost of this.ghosts) {
      // Stunned timer
      if (ghost.isStunned) {
        ghost.stunTimer -= dt;
        if (ghost.stunTimer <= 0) {
          ghost.isStunned = false;
        } else {
          continue; // Frozen in place while stunned
        }
      }

      // House exit timing
      if (ghost.inHouse) {
        ghost.exitTimer -= dt;
        if (ghost.exitTimer <= 0) {
          // Move towards gate
          const gateX = ORIGIN_X + 8 * TILE_SIZE + TILE_SIZE / 2;
          const gateY = ORIGIN_Y + 8 * TILE_SIZE + TILE_SIZE / 2;
          ghost.x = gateX;
          ghost.y = gateY;
          ghost.inHouse = false;
          ghost.mode = this.frightenedTimer > 0 ? 'frightened' : this.waveMode;
          ghost.dir = (ghost.id === 'pinky' || ghost.id === 'clyde') ? 'right' : 'left';
        } else {
          // Bob up and down around base position in house
          ghost.y = (ghost.baseY || ghost.y) + Math.sin(performance.now() * 0.006) * 3;
          continue;
        }
      }

      // Ghost speed
      let currentSpeed = ghost.speed;
      if (ghost.mode === 'frightened') {
        currentSpeed = ghost.speed * 0.62;
      } else if (ghost.mode === 'eaten') {
        currentSpeed = ghost.speed * 2.2;
      }

      const moveDist = currentSpeed * dt;
      this.processGhostMovement(ghost, moveDist);

      // Tunnel wrap
      const minX = ORIGIN_X - TILE_SIZE / 2;
      const maxX = ORIGIN_X + GRID_COLS * TILE_SIZE + TILE_SIZE / 2;
      if (ghost.x < minX) ghost.x = maxX;
      else if (ghost.x > maxX) ghost.x = minX;
    }
  }

  processGhostMovement(ghost, moveDist) {
    const curTileX = Math.floor((ghost.x - ORIGIN_X) / TILE_SIZE);
    const curTileY = Math.floor((ghost.y - ORIGIN_Y) / TILE_SIZE);
    const centerX = ORIGIN_X + curTileX * TILE_SIZE + TILE_SIZE / 2;
    const centerY = ORIGIN_Y + curTileY * TILE_SIZE + TILE_SIZE / 2;

    let reachedCenter = false;
    if (ghost.dir === 'left' && ghost.x >= centerX && (ghost.x - moveDist) <= centerX) {
      reachedCenter = true;
    } else if (ghost.dir === 'right' && ghost.x <= centerX && (ghost.x + moveDist) >= centerX) {
      reachedCenter = true;
    } else if (ghost.dir === 'up' && ghost.y >= centerY && (ghost.y - moveDist) <= centerY) {
      reachedCenter = true;
    } else if (ghost.dir === 'down' && ghost.y <= centerY && (ghost.y + moveDist) >= centerY) {
      reachedCenter = true;
    }

    // Check intersection turn decision when crossing center
    if (reachedCenter) {
      // Snap to tile center
      ghost.x = centerX;
      ghost.y = centerY;

      // Choose next direction at intersection
      this.chooseGhostNextDir(ghost, curTileX, curTileY);
    }

    // Safety: if facing an unwalkable tile, snap and choose direction immediately
    const aheadTile = this.getAdjacentTile(curTileX, curTileY, ghost.dir);
    if (!this.isWalkableForGhost(aheadTile.col, aheadTile.row, ghost)) {
      if (
        (ghost.dir === 'left' && ghost.x <= centerX) ||
        (ghost.dir === 'right' && ghost.x >= centerX) ||
        (ghost.dir === 'up' && ghost.y <= centerY) ||
        (ghost.dir === 'down' && ghost.y >= centerY)
      ) {
        ghost.x = centerX;
        ghost.y = centerY;
        this.chooseGhostNextDir(ghost, curTileX, curTileY);
      }
    }

    // Move forward in current direction
    if (ghost.dir === 'left') ghost.x -= moveDist;
    else if (ghost.dir === 'right') ghost.x += moveDist;
    else if (ghost.dir === 'up') ghost.y -= moveDist;
    else if (ghost.dir === 'down') ghost.y += moveDist;

    // If eaten ghost reaches house door, enter and respawn
    if (ghost.mode === 'eaten') {
      const houseDoorX = ORIGIN_X + 8 * TILE_SIZE + TILE_SIZE / 2;
      const houseDoorY = ORIGIN_Y + 9 * TILE_SIZE + TILE_SIZE / 2;
      if (Math.hypot(ghost.x - houseDoorX, ghost.y - houseDoorY) < 14) {
        ghost.mode = this.frightenedTimer > 0 ? 'frightened' : this.waveMode;
        ghost.dir = 'up';
      }
    }
  }

  chooseGhostNextDir(ghost, col, row) {
    // Determine ghost target tile
    this.updateGhostTarget(ghost);

    const possibleDirs = ['up', 'left', 'down', 'right'];
    const validTurns = [];
    const opposite = this.getOppositeDir(ghost.dir);

    for (const dir of possibleDirs) {
      if (dir === opposite && ghost.mode !== 'frightened') continue; // No 180 reverse unless trapped

      const nextTile = this.getAdjacentTile(col, row, dir);
      if (this.isWalkableForGhost(nextTile.col, nextTile.row, ghost)) {
        const distSq =
          Math.pow(nextTile.col - ghost.targetX, 2) + Math.pow(nextTile.row - ghost.targetY, 2);
        validTurns.push({ dir, distSq });
      }
    }

    if (validTurns.length === 0) {
      ghost.dir = opposite;
      return;
    }

    if (ghost.mode === 'frightened') {
      // Pick random valid turn
      const pick = validTurns[Math.floor(Math.random() * validTurns.length)];
      ghost.dir = pick.dir;
    } else {
      // Pick turn with shortest distance to target
      validTurns.sort((a, b) => a.distSq - b.distSq);
      ghost.dir = validTurns[0].dir;
    }
  }

  isWalkableForGhost(col, row, ghost) {
    if (row === 10 && (col < 0 || col >= GRID_COLS)) return true; // Tunnel
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    const tile = this.grid[row][col];

    if (tile === 1) return false; // Wall
    if (tile === 4) return ghost.mode === 'eaten' || ghost.inHouse; // Gate
    if (tile === 5) return ghost.mode === 'eaten' || ghost.inHouse; // Inside house

    return true;
  }

  updateGhostTarget(ghost) {
    if (ghost.mode === 'eaten') {
      ghost.targetX = 8;
      ghost.targetY = 9;
      return;
    }

    if (ghost.mode === 'scatter') {
      ghost.targetX = ghost.homeX;
      ghost.targetY = ghost.homeY;
      return;
    }

    if (ghost.mode === 'chase') {
      const px = this.player.tileX;
      const py = this.player.tileY;

      if (ghost.id === 'blinky') {
        ghost.targetX = px;
        ghost.targetY = py;
      } else if (ghost.id === 'pinky') {
        // 4 tiles ahead of player
        let tx = px;
        let ty = py;
        if (this.player.dir === 'left') tx -= 4;
        else if (this.player.dir === 'right') tx += 4;
        else if (this.player.dir === 'up') ty -= 4;
        else if (this.player.dir === 'down') ty += 4;
        ghost.targetX = tx;
        ghost.targetY = ty;
      } else if (ghost.id === 'inky') {
        // Blinky vector doubled
        const blinky = this.ghosts.find(g => g.id === 'blinky') || ghost;
        const bCol = Math.floor((blinky.x - ORIGIN_X) / TILE_SIZE);
        const bRow = Math.floor((blinky.y - ORIGIN_Y) / TILE_SIZE);

        let aheadX = px;
        let aheadY = py;
        if (this.player.dir === 'left') aheadX -= 2;
        else if (this.player.dir === 'right') aheadX += 2;
        else if (this.player.dir === 'up') aheadY -= 2;
        else if (this.player.dir === 'down') aheadY += 2;

        ghost.targetX = aheadX + (aheadX - bCol);
        ghost.targetY = aheadY + (aheadY - bRow);
      } else if (ghost.id === 'clyde') {
        const curCol = Math.floor((ghost.x - ORIGIN_X) / TILE_SIZE);
        const curRow = Math.floor((ghost.y - ORIGIN_Y) / TILE_SIZE);
        const dist = Math.hypot(curCol - px, curRow - py);

        if (dist > 8) {
          ghost.targetX = px;
          ghost.targetY = py;
        } else {
          ghost.targetX = ghost.homeX;
          ghost.targetY = ghost.homeY;
        }
      }
    }
  }

  checkCollisions() {
    for (const ghost of this.ghosts) {
      if (ghost.inHouse || ghost.mode === 'eaten') continue;

      const dist = Math.hypot(this.player.x - ghost.x, this.player.y - ghost.y);
      if (dist < 18) {
        if (ghost.isStunned) continue; // Ghost is stunned, no danger

        if (ghost.mode === 'frightened') {
          // Ghost eaten!
          ghost.mode = 'eaten';
          this.ghostCombo++;
          this.ghostsEatenTotal++;

          const pts = 200 * Math.pow(2, this.ghostCombo - 1);
          this.score += pts;
          this.creditsEarned += 10;
          storage.addCredits(10);
          this.superCharge = Math.min(100, this.superCharge + 12);

          sound.playGhostEaten();
          this.particles.burst(ghost.x, ghost.y, 16, {
            color: '#00f3ff',
            colors: ['#00f3ff', '#ffffff', '#ffe600'],
            maxSpeed: 200,
            life: 0.5
          });

          this.particles.floatingTexts.push({
            text: `+${pts}`,
            x: ghost.x,
            y: ghost.y - 10,
            color: '#00f3ff',
            vy: -35,
            life: 1.0
          });
        } else {
          // Pacman touched normal ghost: lose life!
          this.playerHit();
          break;
        }
      }
    }
  }

  playerHit() {
    this.gameState = 'dying';
    this.stateTimer = 1.4;
    sound.playExplosion();
    this.particles.shake(14, 0.4);

    this.particles.burst(this.player.x, this.player.y, 25, {
      color: '#ffe600',
      colors: ['#ffe600', '#ff0055', '#ffffff'],
      maxSpeed: 220,
      life: 0.8
    });
  }

  stageClear() {
    this.gameState = 'cleared';
    this.stateTimer = 2.0;
    this.score += 1000 * this.stage;
    this.creditsEarned += 50;
    storage.addCredits(50);

    sound.playVictory();
    sound.announce('Grid Cleared!');

    this.particles.burst(400, 300, 40, {
      color: '#00f3ff',
      colors: ['#00f3ff', '#ff007b', '#ffe600'],
      maxSpeed: 300,
      life: 1.2
    });
  }

  gameOver() {
    this.gameState = 'gameover';
    this.isRunning = false;

    const isRecord = storage.saveHighScore('cyberPacman', this.score);
    sound.playGameOver();

    if (this.callbacks && this.callbacks.onGameOver) {
      this.callbacks.onGameOver({
        score: this.score,
        stage: this.stage,
        dotsEaten: this.dotsEatenTotal,
        ghostsEaten: this.ghostsEatenTotal,
        credits: this.creditsEarned,
        isRecord
      });
    }
  }

  updateHUD() {
    if (this.callbacks && this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(
        this.score,
        this.lives,
        this.stage,
        this.dotsLeft,
        this.totalDots,
        Math.round(this.superCharge)
      );
    }
  }

  draw() {
    const ctx = this.ctx;

    // Dark cyberpunk background
    ctx.fillStyle = '#050711';
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // Draw Maze Walls & Pellets
    this.drawMaze(ctx);

    // Draw Fruit
    this.drawFruit(ctx);

    // Draw Pacman
    if (this.player.alive && this.gameState !== 'dying') {
      this.drawPlayer(ctx);
    }

    // Draw Ghosts
    for (const ghost of this.ghosts) {
      this.drawGhost(ctx, ghost);
    }

    // Draw Side Cyber Displays
    this.drawSideHUD(ctx);

    // Overlay banners
    this.drawOverlays(ctx);
  }

  drawMaze(ctx) {
    const wallColor = '#00f3ff';
    const gateColor = '#ff007b';

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const tile = this.grid[r][c];
        const x = ORIGIN_X + c * TILE_SIZE;
        const y = ORIGIN_Y + r * TILE_SIZE;

        if (tile === 1) {
          // Wall tile
          ctx.fillStyle = '#0b1126';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

          // Glowing border lines
          ctx.strokeStyle = wallColor;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
        } else if (tile === 4) {
          // Ghost gate: pulsing energy beam
          const alpha = 0.5 + Math.sin(performance.now() * 0.01) * 0.3;
          ctx.strokeStyle = `rgba(255, 0, 123, ${alpha})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x, y + TILE_SIZE / 2);
          ctx.lineTo(x + TILE_SIZE, y + TILE_SIZE / 2);
          ctx.stroke();
        } else if (tile === 2) {
          // Data Bit (small glowing dot)
          ctx.fillStyle = '#ffe600';
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 3) {
          // Power Core (pulsing large pellet)
          const pulse = 4.5 + Math.sin(performance.now() * 0.008) * 2;
          ctx.fillStyle = '#ff007b';
          ctx.shadowColor = '#ff007b';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Inner white core
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y + TILE_SIZE / 2, pulse * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  drawFruit(ctx) {
    if (!this.fruit) return;

    ctx.save();
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const bob = Math.sin(performance.now() * 0.006) * 3;
    ctx.fillText(this.fruit.symbol, this.fruit.x, this.fruit.y + bob);

    ctx.restore();
  }

  drawPlayer(ctx) {
    ctx.save();
    ctx.translate(this.player.x, this.player.y);

    // Rotation based on direction
    let rot = 0;
    if (this.player.dir === 'right') rot = 0;
    else if (this.player.dir === 'down') rot = Math.PI / 2;
    else if (this.player.dir === 'left') rot = Math.PI;
    else if (this.player.dir === 'up') rot = -Math.PI / 2;

    ctx.rotate(rot);

    // Glowing aura if Super is ready
    if (this.superCharge >= 100) {
      const pulse = 14 + Math.sin(performance.now() * 0.01) * 3;
      ctx.fillStyle = 'rgba(0, 243, 255, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, pulse, 0, Math.PI * 2);
      ctx.fill();
    }

    // Yellow Pacman Cyber Body
    const radius = 9.5;
    const mouth = this.player.mouthAngle;

    ctx.fillStyle = '#ffe600';
    ctx.shadowColor = '#ffe600';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.arc(0, 0, radius, mouth, Math.PI * 2 - mouth);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Cyber eye / visor
    ctx.fillStyle = '#0a0e1a';
    ctx.beginPath();
    ctx.arc(1, -5, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00f3ff';
    ctx.beginPath();
    ctx.arc(1.5, -5, 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawGhost(ctx, ghost) {
    ctx.save();
    ctx.translate(ghost.x, ghost.y);

    const radius = 9;

    if (ghost.mode === 'eaten') {
      // Eyes only returning to ghost house
      this.drawGhostEyes(ctx, ghost.dir);
      ctx.restore();
      return;
    }

    let bodyColor = ghost.color;
    if (ghost.mode === 'frightened') {
      // Blinking white in the last 2 seconds
      if (this.frightenedTimer < 2 && Math.floor(performance.now() / 150) % 2 === 0) {
        bodyColor = '#ffffff';
      } else {
        bodyColor = '#1f44ff';
      }
    }

    // Stunned electrical vibration
    if (ghost.isStunned) {
      ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
    }

    // Ghost Body Dome + Scalloped Skirt
    ctx.fillStyle = bodyColor;
    ctx.shadowColor = bodyColor;
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(0, -2, radius, Math.PI, 0, false);
    ctx.lineTo(radius, radius - 2);

    // Animated bottom tentacles
    const tentacleW = (radius * 2) / 3;
    const wave = Math.sin(performance.now() * 0.015) * 2;

    ctx.lineTo(radius - tentacleW * 0.5, radius - 4 + wave);
    ctx.lineTo(radius - tentacleW, radius - 2);
    ctx.lineTo(radius - tentacleW * 1.5, radius - 4 - wave);
    ctx.lineTo(-radius + tentacleW, radius - 2);
    ctx.lineTo(-radius + tentacleW * 0.5, radius - 4 + wave);
    ctx.lineTo(-radius, radius - 2);

    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Eyes
    if (ghost.mode === 'frightened') {
      // Frightened face (small glowing dots)
      ctx.fillStyle = '#ffe600';
      ctx.fillRect(-4, -4, 2, 2);
      ctx.fillRect(2, -4, 2, 2);

      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-5, 2);
      ctx.lineTo(-2, 0);
      ctx.lineTo(0, 2);
      ctx.lineTo(2, 0);
      ctx.lineTo(5, 2);
      ctx.stroke();
    } else {
      this.drawGhostEyes(ctx, ghost.dir);
    }

    // Stunned electric spark arcs
    if (ghost.isStunned) {
      ctx.strokeStyle = '#00f3ff';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 12 + Math.random() * 6;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawGhostEyes(ctx, dir) {
    let lookX = 0;
    let lookY = 0;
    if (dir === 'left') lookX = -2;
    else if (dir === 'right') lookX = 2;
    else if (dir === 'up') lookY = -2;
    else if (dir === 'down') lookY = 2;

    // White eye sclera
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4, -3, 3.5, 0, Math.PI * 2);
    ctx.arc(4, -3, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Cyan pupils looking in direction
    ctx.fillStyle = '#0033cc';
    ctx.beginPath();
    ctx.arc(-4 + lookX, -3 + lookY, 1.8, 0, Math.PI * 2);
    ctx.arc(4 + lookX, -3 + lookY, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }

  drawSideHUD(ctx) {
    ctx.save();
    ctx.font = '10px "Share Tech Mono", monospace';
    ctx.textAlign = 'left';

    // Left Margin (Telemetry / Drones Status)
    ctx.fillStyle = '#00f3ff';
    ctx.fillText('SECTOR 2099', 14, 60);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('DRONE AI:', 14, 80);

    const droneList = [
      { name: 'REDLINE', color: '#ff0055' },
      { name: 'VALKYRIE', color: '#ff71ce' },
      { name: 'GLITCH', color: '#00f3ff' },
      { name: 'CHAOS', color: '#ff9900' }
    ];

    droneList.forEach((d, idx) => {
      ctx.fillStyle = d.color;
      ctx.fillText(`• ${d.name}`, 14, 100 + idx * 18);
    });

    // Right Margin (Bounties & Status)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffe600';
    ctx.fillText('DATA TARGET', 786, 60);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText(`TOTAL: ${this.totalDots}`, 786, 80);
    ctx.fillText(`REMAIN: ${this.dotsLeft}`, 786, 98);

    if (this.fruit) {
      ctx.fillStyle = this.fruit.color;
      ctx.fillText(`${this.fruit.symbol} +${this.fruit.pts}`, 786, 130);
    }

    ctx.restore();
  }

  drawOverlays(ctx) {
    if (this.gameState === 'ready') {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 28px "Outfit", sans-serif';
      ctx.fillStyle = '#ffe600';
      ctx.shadowColor = '#ffe600';
      ctx.shadowBlur = 15;
      ctx.fillText('INITIALIZING SECTOR...', 400, 316);
      ctx.restore();
    } else if (this.gameState === 'cleared') {
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '900 32px "Outfit", sans-serif';
      ctx.fillStyle = '#00f3ff';
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 20;
      ctx.fillText('SECTOR SECURED! +1,000 PTS', 400, 316);
      ctx.restore();
    }
  }
}
