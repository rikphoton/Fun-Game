// Laser Matrix: Optical Quantum Puzzle with 2D Ray-Traced Laser Deflection & Mirror Rotation
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';

export class LaserMatrixGame {
  constructor(canvas, particleSystem, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particleSystem;
    this.callbacks = callbacks;

    this.width = 700;
    this.height = 650;

    this.reset();
  }

  setDimensions(width, height) {
    this.width = width;
    this.height = height;
    this.loadLevel(this.level);
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.multiplier = 1;
    this.level = 1;
    this.maxLevel = 5;
    this.isGameOver = false;
    this.isVictory = false;
    this.creditsEarned = 0;

    this.gridCols = 8;
    this.gridRows = 8;
    this.cellSize = 60;
    this.offsetX = 50;
    this.offsetY = 50;

    this.mirrors = [];
    this.targets = [];
    this.laserSegments = [];
    this.keys = {};
    this.pointerClick = null;

    this.loadLevel(this.level);
  }

  loadLevel(lvl) {
    this.cellSize = Math.min(64, Math.floor((this.height - 120) / this.gridRows));
    this.offsetX = Math.floor((this.width - this.gridCols * this.cellSize) / 2);
    this.offsetY = Math.floor((this.height - this.gridRows * this.cellSize) / 2);

    this.emitter = { col: 0, row: 2 + (lvl % 3), dirX: 1, dirY: 0 };
    this.mirrors = [];
    this.targets = [];

    if (lvl === 1) {
      this.mirrors = [
        { col: 3, row: this.emitter.row, angle: Math.PI / 4 },
        { col: 3, row: this.emitter.row + 3, angle: -Math.PI / 4 }
      ];
      this.targets = [{ col: 6, row: this.emitter.row + 3, powered: false }];
    } else if (lvl === 2) {
      this.mirrors = [
        { col: 2, row: this.emitter.row, angle: Math.PI / 4 },
        { col: 2, row: 1, angle: -Math.PI / 4 },
        { col: 5, row: 1, angle: Math.PI / 4 }
      ];
      this.targets = [{ col: 5, row: 6, powered: false }];
    } else if (lvl === 3) {
      this.mirrors = [
        { col: 2, row: this.emitter.row, angle: 0 },
        { col: 4, row: this.emitter.row - 1, angle: Math.PI / 4 },
        { col: 4, row: this.emitter.row + 2, angle: -Math.PI / 4 },
        { col: 6, row: this.emitter.row + 2, angle: Math.PI / 4 }
      ];
      this.targets = [
        { col: 6, row: 1, powered: false },
        { col: 7, row: this.emitter.row + 2, powered: false }
      ];
    } else if (lvl === 4) {
      this.mirrors = [
        { col: 2, row: this.emitter.row, angle: -Math.PI / 4 },
        { col: 2, row: 5, angle: Math.PI / 4 },
        { col: 5, row: 5, angle: -Math.PI / 4 },
        { col: 5, row: 2, angle: Math.PI / 4 },
        { col: 7, row: 2, angle: -Math.PI / 4 }
      ];
      this.targets = [
        { col: 5, row: 6, powered: false },
        { col: 7, row: 6, powered: false }
      ];
    } else {
      this.mirrors = [
        { col: 1, row: this.emitter.row, angle: Math.PI / 4 },
        { col: 1, row: 0, angle: -Math.PI / 4 },
        { col: 4, row: 0, angle: Math.PI / 4 },
        { col: 4, row: 4, angle: -Math.PI / 4 },
        { col: 6, row: 4, angle: Math.PI / 4 },
        { col: 6, row: 1, angle: -Math.PI / 4 }
      ];
      this.targets = [
        { col: 6, row: 7, powered: false },
        { col: 7, row: 1, powered: false },
        { col: 3, row: 4, powered: false }
      ];
    }

    this.calculateLaser();
  }

  init() {
    this.reset();
    this.isRunning = true;
    sound.startBgm('laserMatrix');
    sound.announce('Laser Matrix. Rotate mirrors to power target cores!');
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
  }

  pause() {
    this.isPaused = true;
    if (sound.pauseBgm) sound.pauseBgm();
  }

  resume() {
    this.isPaused = false;
    if (sound.resumeBgm) sound.resumeBgm();
  }

  destroy() {
    this.isRunning = false;
    this.mirrors = [];
    this.targets = [];
    this.laserSegments = [];
  }

  handleInput(keys, touchState) {
    if (keys) this.keys = keys;
    if (touchState && touchState.pointerClick) {
      this.pointerClick = touchState.pointerClick;
    }
  }

  onCanvasClick(x, y) {
    const clickCol = Math.floor((x - this.offsetX) / this.cellSize);
    const clickRow = Math.floor((y - this.offsetY) / this.cellSize);

    const clickedMirror = this.mirrors.find(m => m.col === clickCol && m.row === clickRow);
    if (clickedMirror) {
      clickedMirror.angle = (clickedMirror.angle + Math.PI / 4) % (Math.PI * 2);
      sound.playLaser('fast');
      if (this.particles && this.particles.burst) {
        this.particles.burst(
          this.offsetX + clickCol * this.cellSize + this.cellSize / 2,
          this.offsetY + clickRow * this.cellSize + this.cellSize / 2,
          12,
          '#00f3ff'
        );
      }
      this.calculateLaser();
    }
  }

  update(dt) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    if (this.pointerClick) {
      this.onCanvasClick(this.pointerClick.x, this.pointerClick.y);
      this.pointerClick = null;
    }

    // Check Victory condition
    const allPowered = this.targets.length > 0 && this.targets.every(t => t.powered);
    if (allPowered) {
      sound.playPowerup();
      this.score += 1500 * this.level;
      this.creditsEarned += 25 * this.level;

      if (this.level < this.maxLevel) {
        this.level++;
        sound.announce(`Matrix Stage ${this.level}`);
        this.loadLevel(this.level);
      } else {
        this.isVictory = true;
        this.isGameOver = true;
        this.isRunning = false;
        sound.playVictory();
        sound.announce('Quantum Matrix Solved! Total Victory!');
        const pb = storage.getHighScore('laserMatrix') || 0;
        const isRecord = this.score > pb;
        if (isRecord) storage.saveHighScore('laserMatrix', this.score);
        storage.addCredits(this.creditsEarned);

        if (this.callbacks && this.callbacks.onGameOver) {
          this.callbacks.onGameOver({
            score: this.score,
            credits: this.creditsEarned,
            level: this.level,
            won: true,
            isRecord
          });
        }
      }
    }

    if (this.callbacks && this.callbacks.onScoreUpdate) {
      const poweredCount = this.targets.filter(t => t.powered).length;
      this.callbacks.onScoreUpdate(
        this.score,
        this.level,
        poweredCount,
        this.targets.length
      );
    }
  }

  calculateLaser() {
    this.laserSegments = [];
    this.targets.forEach(t => (t.powered = false));

    let curX = this.offsetX + this.emitter.col * this.cellSize + this.cellSize / 2;
    let curY = this.offsetY + this.emitter.row * this.cellSize + this.cellSize / 2;
    let dirX = this.emitter.dirX;
    let dirY = this.emitter.dirY;

    const maxSteps = 16;
    for (let step = 0; step < maxSteps; step++) {
      let nextX = curX;
      let nextY = curY;

      let hitMirror = null;
      let hitTarget = null;
      let stepDistance = 9999;

      if (dirX > 0) stepDistance = Math.min(stepDistance, (this.offsetX + this.gridCols * this.cellSize - curX));
      if (dirX < 0) stepDistance = Math.min(stepDistance, (curX - this.offsetX));
      if (dirY > 0) stepDistance = Math.min(stepDistance, (this.offsetY + this.gridRows * this.cellSize - curY));
      if (dirY < 0) stepDistance = Math.min(stepDistance, (curY - this.offsetY));

      for (const m of this.mirrors) {
        const mx = this.offsetX + m.col * this.cellSize + this.cellSize / 2;
        const my = this.offsetY + m.row * this.cellSize + this.cellSize / 2;
        const toMx = mx - curX;
        const toMy = my - curY;

        if (dirX !== 0 && Math.sign(toMx) === dirX && Math.abs(toMy) < 4 && Math.abs(toMx) < stepDistance && Math.abs(toMx) > 4) {
          stepDistance = Math.abs(toMx);
          hitMirror = m;
        } else if (dirY !== 0 && Math.sign(toMy) === dirY && Math.abs(toMx) < 4 && Math.abs(toMy) < stepDistance && Math.abs(toMy) > 4) {
          stepDistance = Math.abs(toMy);
          hitMirror = m;
        }
      }

      for (const t of this.targets) {
        const tx = this.offsetX + t.col * this.cellSize + this.cellSize / 2;
        const ty = this.offsetY + t.row * this.cellSize + this.cellSize / 2;
        const toTx = tx - curX;
        const toTy = ty - curY;

        if (dirX !== 0 && Math.sign(toTx) === dirX && Math.abs(toTy) < 4 && Math.abs(toTx) <= stepDistance) {
          stepDistance = Math.abs(toTx);
          hitTarget = t;
          hitMirror = null;
        } else if (dirY !== 0 && Math.sign(toTy) === dirY && Math.abs(toTx) < 4 && Math.abs(toTy) <= stepDistance) {
          stepDistance = Math.abs(toTy);
          hitTarget = t;
          hitMirror = null;
        }
      }

      nextX = curX + dirX * stepDistance;
      nextY = curY + dirY * stepDistance;

      this.laserSegments.push({ x1: curX, y1: curY, x2: nextX, y2: nextY });

      if (hitTarget) {
        hitTarget.powered = true;
        if (this.particles && this.particles.burst) {
          this.particles.burst(nextX, nextY, 6, '#10b981');
        }
        break;
      }

      if (hitMirror) {
        if (Math.abs(Math.sin(hitMirror.angle)) > 0.5) {
          const temp = dirX;
          dirX = dirY;
          dirY = temp;
        } else {
          const temp = dirX;
          dirX = -dirY;
          dirY = -temp;
        }
        curX = nextX;
        curY = nextY;
      } else {
        break;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, this.width, this.height);

    // Matrix Grid
    ctx.strokeStyle = 'rgba(2, 132, 199, 0.15)';
    ctx.lineWidth = 1;
    for (let r = 0; r <= this.gridRows; r++) {
      const y = this.offsetY + r * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.offsetX, y);
      ctx.lineTo(this.offsetX + this.gridCols * this.cellSize, y);
      ctx.stroke();
    }
    for (let c = 0; c <= this.gridCols; c++) {
      const x = this.offsetX + c * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, this.offsetY);
      ctx.lineTo(x, this.offsetY + this.gridRows * this.cellSize);
      ctx.stroke();
    }

    // Outer grid border
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#0284c7';
    ctx.shadowBlur = 8;
    ctx.strokeRect(this.offsetX, this.offsetY, this.gridCols * this.cellSize, this.gridRows * this.cellSize);
    ctx.shadowBlur = 0;

    // Laser Emitter
    const ex = this.offsetX + this.emitter.col * this.cellSize + this.cellSize / 2;
    const ey = this.offsetY + this.emitter.row * this.cellSize + this.cellSize / 2;
    ctx.fillStyle = '#06b6d4';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.fillRect(ex - 12, ey - 12, 24, 24);
    ctx.shadowBlur = 0;

    // Mirrors
    for (const m of this.mirrors) {
      const mx = this.offsetX + m.col * this.cellSize + this.cellSize / 2;
      const my = this.offsetY + m.row * this.cellSize + this.cellSize / 2;

      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(m.angle);

      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 0, this.cellSize * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4;
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(-this.cellSize * 0.3, 0);
      ctx.lineTo(this.cellSize * 0.3, 0);
      ctx.stroke();

      ctx.restore();
    }
    ctx.shadowBlur = 0;

    // Targets
    for (const t of this.targets) {
      const tx = this.offsetX + t.col * this.cellSize + this.cellSize / 2;
      const ty = this.offsetY + t.row * this.cellSize + this.cellSize / 2;

      ctx.fillStyle = t.powered ? '#10b981' : '#f43f5e';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = t.powered ? 14 : 6;
      ctx.beginPath();
      ctx.arc(tx, ty, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Laser Beams
    ctx.strokeStyle = '#38bdf8';
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 12;
    ctx.lineWidth = 3;
    for (const seg of this.laserSegments) {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }
}
