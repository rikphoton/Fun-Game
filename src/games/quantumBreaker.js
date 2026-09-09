// Quantum Breaker: Hyper-Kinetic Neon Brick Breaker - Ultra Optimized & Stutter-Free
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';

export class QuantumBreakerGame {
  constructor(canvas, particleSystem, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particleSystem;
    this.callbacks = callbacks;

    this.width = 800;
    this.height = 600;

    this.reset();
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.combo = 0;
    this.maxComboThisRun = 0;
    this.isExploding = false;

    // Paddle
    this.paddle = {
      x: this.width / 2,
      y: this.height - 40,
      width: 110,
      height: 14,
      speed: 550,
      color: '#00f3ff',
      hasLaser: false,
      laserTimer: 0,
      hasFireball: false,
      fireballTimer: 0,
      hasShield: false
    };

    this.balls = [];
    this.bricks = [];
    this.powerups = [];
    this.lasers = [];

    this.keys = {};
    this.pointerX = this.width / 2;

    this.initLevel(1);
    this.spawnInitialBall();
  }

  init() {
    this.reset();
    this.isRunning = true;
    sound.startBgm('synthwave');
  }

  spawnInitialBall() {
    this.balls = [
      {
        x: this.paddle.x,
        y: this.paddle.y - 15,
        vx: 180 * (Math.random() < 0.5 ? 1 : -1),
        vy: -320,
        radius: 7,
        color: '#ffffff',
        speed: 360
      }
    ];
  }

  initLevel(lvl) {
    this.level = lvl;
    this.bricks = [];

    const rows = 6;
    const cols = 10;
    const brickWidth = 68;
    const brickHeight = 22;
    const padding = 8;
    const offsetX = (this.width - (cols * (brickWidth + padding) - padding)) / 2;
    const offsetY = 70;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (lvl > 1 && (r + c) % 4 === 0 && Math.random() < 0.3) continue;

        let hp = 1;
        let color = '#00f3ff';
        let isExplosive = false;

        if (Math.random() < 0.12) {
          isExplosive = true;
          color = '#ff003c';
        } else if (r === 0 || r === 1) {
          hp = 3;
          color = '#ffe600';
        } else if (r === 2 || r === 3) {
          hp = 2;
          color = '#ff00aa';
        }

        this.bricks.push({
          x: offsetX + c * (brickWidth + padding),
          y: offsetY + r * (brickHeight + padding),
          width: brickWidth,
          height: brickHeight,
          hp,
          maxHp: hp,
          color,
          isExplosive
        });
      }
    }
  }

  handleKeyDown(code) {
    this.keys[code] = true;
    if (code === 'Space' && this.paddle.hasLaser) {
      this.fireLaser();
    }
  }

  handleKeyUp(code) {
    this.keys[code] = false;
  }

  handlePointerMove(x) {
    this.pointerX = x;
  }

  handlePointerDown() {
    if (this.paddle.hasLaser) {
      this.fireLaser();
    }
  }

  fireLaser() {
    this.lasers.push({
      x: this.paddle.x - this.paddle.width / 2 + 10,
      y: this.paddle.y - 10,
      vy: -600,
      width: 4,
      height: 16,
      color: '#ff0055'
    });
    this.lasers.push({
      x: this.paddle.x + this.paddle.width / 2 - 10,
      y: this.paddle.y - 10,
      vy: -600,
      width: 4,
      height: 16,
      color: '#ff0055'
    });
    sound.playLaser('fast');
  }

  update(dt) {
    if (!this.isRunning || this.isPaused) return;

    this.callbacks.onScoreUpdate(this.score, this.lives, this.combo, this.level);

    // 1. Paddle Movement
    let dx = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    if (dx !== 0) {
      this.paddle.x += dx * this.paddle.speed * dt;
    } else if (this.pointerX !== undefined) {
      this.paddle.x += (this.pointerX - this.paddle.x) * 16 * dt;
    }

    const halfWidth = this.paddle.width / 2;
    this.paddle.x = Math.max(halfWidth, Math.min(this.width - halfWidth, this.paddle.x));

    // Timed powerup buffs
    if (this.paddle.hasLaser) {
      this.paddle.laserTimer -= dt;
      if (this.paddle.laserTimer <= 0) this.paddle.hasLaser = false;
    }
    if (this.paddle.hasFireball) {
      this.paddle.fireballTimer -= dt;
      if (this.paddle.fireballTimer <= 0) this.paddle.hasFireball = false;
    }

    // 2. Update Lasers
    for (let i = this.lasers.length - 1; i >= 0; i--) {
      const l = this.lasers[i];
      l.y += l.vy * dt;

      for (let j = this.bricks.length - 1; j >= 0; j--) {
        const b = this.bricks[j];
        if (l.x > b.x && l.x < b.x + b.width && l.y > b.y && l.y < b.y + b.height) {
          this.hitBrick(b, j, true);
          this.lasers.splice(i, 1);
          break;
        }
      }

      if (l.y < -20) {
        this.lasers.splice(i, 1);
      }
    }

    // 3. Update Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += p.vy * dt;

      if (
        p.y + p.radius >= this.paddle.y - this.paddle.height / 2 &&
        p.y - p.radius <= this.paddle.y + this.paddle.height / 2 &&
        p.x >= this.paddle.x - this.paddle.width / 2 &&
        p.x <= this.paddle.x + this.paddle.width / 2
      ) {
        this.collectPowerup(p.type);
        this.powerups.splice(i, 1);
        continue;
      }

      if (p.y > this.height + 20) {
        this.powerups.splice(i, 1);
      }
    }

    // 4. Update Balls
    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // ANTI-STUCK: Ensure ball always has vertical movement!
      if (Math.abs(b.vy) < 80) {
        b.vy = (b.vy >= 0 ? 1 : -1) * 110;
      }

      // Walls bounce
      if (b.x - b.radius <= 0) {
        b.x = b.radius;
        b.vx = Math.abs(b.vx);
        sound.playBounce(1.1);
      } else if (b.x + b.radius >= this.width) {
        b.x = this.width - b.radius;
        b.vx = -Math.abs(b.vx);
        sound.playBounce(1.1);
      }

      if (b.y - b.radius <= 0) {
        b.y = b.radius;
        b.vy = Math.abs(b.vy);
        sound.playBounce(1.2);
      }

      // Paddle bounce
      const pTop = this.paddle.y - this.paddle.height / 2;
      const pBottom = this.paddle.y + this.paddle.height / 2;
      const pLeft = this.paddle.x - this.paddle.width / 2;
      const pRight = this.paddle.x + this.paddle.width / 2;

      if (b.y + b.radius >= pTop && b.y - b.radius <= pBottom && b.x >= pLeft && b.x <= pRight && b.vy > 0) {
        this.combo = 0;

        const hitOffset = (b.x - this.paddle.x) / (this.paddle.width / 2);
        const maxAngle = Math.PI * 0.38;
        const angle = hitOffset * maxAngle;
        const currentSpeed = Math.hypot(b.vx, b.vy);

        b.vx = Math.sin(angle) * currentSpeed;
        b.vy = -Math.cos(angle) * currentSpeed;
        b.y = pTop - b.radius;

        sound.playBounce(1.5);
        this.particles.burst(b.x, b.y, 6, { color: '#00f3ff', life: 0.2 });
      }

      // Bottom death
      if (b.y + b.radius >= this.height) {
        if (this.paddle.hasShield) {
          this.paddle.hasShield = false;
          b.vy = -Math.abs(b.vy);
          b.y = this.height - b.radius - 8;
          sound.playExplosion(1.2);
          this.particles.addShockwave(this.width / 2, this.height, '#00ffcc', 300, 0.3);
          this.particles.addFloatingText('SHIELD SAVED!', this.width / 2, this.height - 40, { color: '#00ffcc' });
        } else {
          this.balls.splice(i, 1);
          continue;
        }
      }

      // Brick collision
      for (let j = this.bricks.length - 1; j >= 0; j--) {
        const brk = this.bricks[j];
        if (
          b.x + b.radius > brk.x &&
          b.x - b.radius < brk.x + brk.width &&
          b.y + b.radius > brk.y &&
          b.y - b.radius < brk.y + brk.height
        ) {
          this.hitBrick(brk, j, false);

          if (!this.paddle.hasFireball) {
            const overlapLeft = (b.x + b.radius) - brk.x;
            const overlapRight = (brk.x + brk.width) - (b.x - b.radius);
            const overlapTop = (b.y + b.radius) - brk.y;
            const overlapBottom = (brk.y + brk.height) - (b.y - b.radius);

            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
            if (minOverlap === overlapLeft || minOverlap === overlapRight) {
              b.vx *= -1;
            } else {
              b.vy *= -1;
            }
          }
          break;
        }
      }
    }

    if (this.balls.length === 0) {
      this.lives--;
      this.combo = 0;
      sound.playHit();
      this.particles.shake(8, 0.25);

      if (this.lives <= 0) {
        this.gameOver();
      } else {
        this.spawnInitialBall();
      }
    }

    if (this.bricks.length === 0) {
      this.levelClear();
    }
  }

  hitBrick(brick, index, fromLaser = false, preventChain = false) {
    brick.hp--;
    this.combo++;
    if (this.combo > this.maxComboThisRun) {
      this.maxComboThisRun = this.combo;
      storage.recordCombo(this.maxComboThisRun);
    }

    const points = (100 * this.combo);
    this.score += points;

    if (brick.hp <= 0) {
      this.bricks.splice(index, 1);
      storage.recordBricksBroken(1);

      this.particles.burst(brick.x + brick.width / 2, brick.y + brick.height / 2, 8, {
        color: brick.color,
        life: 0.3
      });

      if (this.combo >= 4) {
        this.particles.addFloatingText(`${this.combo}x COMBO!`, brick.x + brick.width / 2, brick.y - 12, {
          color: '#ffe600',
          size: 15
        });
      }

      sound.playExplosion(brick.isExplosive ? 1.5 : 0.5);

      // Safe non-recursive detonation
      if (brick.isExplosive && !preventChain) {
        this.particles.shake(10, 0.25);
        this.detonateExplosion(brick.x + brick.width / 2, brick.y + brick.height / 2);
      }

      if (Math.random() < 0.18 && this.powerups.length < 5) {
        const types = ['multiball', 'laser', 'fireball', 'expand', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.powerups.push({
          x: brick.x + brick.width / 2,
          y: brick.y + brick.height / 2,
          vy: 140,
          radius: 12,
          type
        });
      }
    } else {
      sound.playBounce(1.3);
    }
  }

  // Safe non-recursive explosion detonation
  detonateExplosion(x, y) {
    if (this.isExploding) return;
    this.isExploding = true;

    this.particles.addShockwave(x, y, '#ff003c', 100, 0.25);
    const radiusSq = 85 * 85;
    const toHit = [];

    for (let j = 0; j < this.bricks.length; j++) {
      const b = this.bricks[j];
      const bx = b.x + b.width / 2;
      const by = b.y + b.height / 2;
      const dsq = (bx - x) * (bx - x) + (by - y) * (by - y);
      if (dsq < radiusSq) {
        toHit.push(b);
      }
    }

    for (const b of toHit) {
      const idx = this.bricks.indexOf(b);
      if (idx !== -1) {
        this.hitBrick(b, idx, true, true);
      }
    }

    this.isExploding = false;
  }

  collectPowerup(type) {
    sound.playPowerup();
    this.particles.burst(this.paddle.x, this.paddle.y, 14, { color: '#ffe600', life: 0.35 });

    if (type === 'multiball') {
      const currentCount = this.balls.length;
      for (let i = 0; i < currentCount && this.balls.length < 8; i++) {
        const b = this.balls[i];
        this.balls.push({
          x: b.x,
          y: b.y,
          vx: b.vx * 0.8 + 100,
          vy: b.vy * 0.9,
          radius: b.radius,
          color: b.color,
          speed: b.speed
        });
      }
      this.particles.addFloatingText('MULTI-BALL!', this.paddle.x, this.paddle.y - 25, { color: '#00f3ff' });
    } else if (type === 'laser') {
      this.paddle.hasLaser = true;
      this.paddle.laserTimer = 10;
      this.particles.addFloatingText('TWIN LASERS!', this.paddle.x, this.paddle.y - 25, { color: '#ff0055' });
    } else if (type === 'fireball') {
      this.paddle.hasFireball = true;
      this.paddle.fireballTimer = 8;
      this.particles.addFloatingText('FIREBALL!', this.paddle.x, this.paddle.y - 25, { color: '#ff5500' });
    } else if (type === 'expand') {
      this.paddle.width = Math.min(200, this.paddle.width + 30);
      this.particles.addFloatingText('PADDLE EXPAND!', this.paddle.x, this.paddle.y - 25, { color: '#00ff88' });
    } else if (type === 'shield') {
      this.paddle.hasShield = true;
      this.particles.addFloatingText('SAFETY SHIELD!', this.paddle.x, this.paddle.y - 25, { color: '#00ffcc' });
    }
  }

  levelClear() {
    sound.playLevelUp();
    this.score += 2000;
    this.particles.shake(6, 0.3);
    this.particles.addFloatingText('LEVEL COMPLETE! +2000', this.width / 2, this.height / 2, {
      color: '#ffe600',
      size: 24,
      duration: 1.5
    });
    this.initLevel(this.level + 1);
    this.spawnInitialBall();
  }

  gameOver() {
    this.isRunning = false;
    sound.stopBgm();
    sound.playGameOver();

    const isRecord = storage.saveHighScore('quantumBreaker', this.score);
    storage.recordGamePlayed();

    this.callbacks.onGameOver({
      score: this.score,
      level: this.level,
      maxCombo: this.maxComboThisRun,
      isRecord
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Grid
    ctx.strokeStyle = 'rgba(255, 0, 170, 0.07)';
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }

    // Safety Shield
    if (this.paddle.hasShield) {
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, this.height - 4);
      ctx.lineTo(this.width, this.height - 4);
      ctx.stroke();
    }

    // 2. Render Bricks
    for (let i = 0; i < this.bricks.length; i++) {
      const b = this.bricks[i];
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.width, b.height);

      if (b.isExplosive) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', b.x + b.width / 2, b.y + b.height / 2);
      } else if (b.hp > 1) {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(b.x + 3, b.y + 3, b.width - 6, 3);
      }
    }

    // 3. Render Powerups
    for (let i = 0; i < this.powerups.length; i++) {
      const p = this.powerups[i];
      ctx.fillStyle = p.type === 'multiball' ? '#00f3ff' : p.type === 'laser' ? '#ff0055' : '#ffe600';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = p.type === 'multiball' ? '✨' : p.type === 'laser' ? '🔫' : p.type === 'fireball' ? '🔥' : '⭐';
      ctx.fillText(icon, p.x, p.y);
    }

    // 4. Render Lasers
    for (let i = 0; i < this.lasers.length; i++) {
      const l = this.lasers[i];
      ctx.fillStyle = l.color;
      ctx.fillRect(l.x - l.width / 2, l.y, l.width, l.height);
    }

    // 5. Render Balls
    for (let i = 0; i < this.balls.length; i++) {
      const b = this.balls[i];
      ctx.fillStyle = this.paddle.hasFireball ? '#ff3300' : b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Render Paddle
    if (this.isRunning) {
      ctx.fillStyle = this.paddle.color;
      const px = this.paddle.x - this.paddle.width / 2;
      const py = this.paddle.y - this.paddle.height / 2;
      ctx.beginPath();
      ctx.roundRect(px, py, this.paddle.width, this.paddle.height, [6]);
      ctx.fill();

      if (this.paddle.hasLaser) {
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(px, py - 5, 7, 5);
        ctx.fillRect(px + this.paddle.width - 7, py - 5, 7, 5);
      }
    }
  }
}
