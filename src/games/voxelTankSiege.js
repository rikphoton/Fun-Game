// Voxel Tank Siege: Tactical Arena Combat with Ricocheting Plasma Shells & Destructible Neon Barricades
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';

export class VoxelTankSiegeGame {
  constructor(canvas, particleSystem, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particleSystem;
    this.callbacks = callbacks;

    this.width = 800;
    this.height = 600;

    this.reset();
  }

  setDimensions(width, height) {
    this.width = width;
    this.height = height;
    if (this.player) {
      this.player.x = Math.max(40, Math.min(this.width - 40, this.player.x));
      this.player.y = Math.max(40, Math.min(this.height - 40, this.player.y));
    }
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.multiplier = 1;
    this.wave = 1;
    this.isGameOver = false;
    this.creditsEarned = 0;

    const hullBonus = storage.getLabBonus ? storage.getLabBonus('hull') : 0;
    const thrusterBonus = 1 + (storage.getLabBonus ? storage.getLabBonus('thrusters') : 0);

    const maxHp = 100 + hullBonus;
    this.player = {
      x: 100,
      y: this.height / 2,
      angle: 0,
      turretAngle: 0,
      hp: maxHp,
      maxHp,
      speed: 200 * thrusterBonus,
      color: '#14b8a6'
    };

    this.mineCharges = 3;
    this.fireCooldown = 0;

    this.enemies = [];
    this.shells = [];
    this.barricades = [];
    this.mines = [];
    this.keys = {};
    this.joystick = { x: 0, y: 0, active: false };
    this.pointerTarget = null;
    this.touchActions = { fire: false, mine: false };

    this.buildArena();
    this.spawnWave();
  }

  buildArena() {
    this.barricades = [
      { x: this.width * 0.3, y: this.height * 0.22, w: 22, h: 110, hp: 60, maxHp: 60 },
      { x: this.width * 0.3, y: this.height * 0.62, w: 22, h: 110, hp: 60, maxHp: 60 },
      { x: this.width * 0.5 - 55, y: this.height * 0.5 - 11, w: 110, h: 22, hp: 70, maxHp: 70 },
      { x: this.width * 0.7, y: this.height * 0.22, w: 22, h: 110, hp: 60, maxHp: 60 },
      { x: this.width * 0.7, y: this.height * 0.62, w: 22, h: 110, hp: 60, maxHp: 60 }
    ];
  }

  spawnWave() {
    this.enemies = [];
    const count = Math.min(6, 2 + this.wave);
    for (let i = 0; i < count; i++) {
      this.enemies.push({
        x: this.width - 90,
        y: 80 + (i * (this.height - 160)) / Math.max(1, count - 1),
        angle: Math.PI,
        turretAngle: Math.PI,
        hp: 40 + this.wave * 12,
        maxHp: 40 + this.wave * 12,
        speed: 75 + Math.min(40, this.wave * 5),
        color: '#f43f5e',
        fireTimer: Math.random() * 2
      });
    }
  }

  init() {
    this.reset();
    this.isRunning = true;
    sound.startBgm('voxelTankSiege');
    sound.announce('Voxel Tank Siege. Destroy enemy tanks!');
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
    this.enemies = [];
    this.shells = [];
    this.barricades = [];
    this.mines = [];
  }

  handleInput(keys, touchState) {
    if (keys) this.keys = keys;
    if (touchState) {
      if (touchState.joystick) this.joystick = touchState.joystick;
      if (touchState.touchActions) this.touchActions = touchState.touchActions;
      if (touchState.pointerTarget) this.pointerTarget = touchState.pointerTarget;
    }
  }

  update(dt) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    if (this.fireCooldown > 0) this.fireCooldown -= dt;

    // Player Drive Controls
    let dx = 0;
    let dy = 0;

    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;

    if (this.joystick && this.joystick.active) {
      dx = this.joystick.x;
      dy = this.joystick.y;
    }

    const len = Math.hypot(dx, dy);
    if (len > 0.15) {
      const ndx = dx / len;
      const ndy = dy / len;
      this.player.angle = Math.atan2(ndy, ndx);
      this.player.x += ndx * this.player.speed * dt;
      this.player.y += ndy * this.player.speed * dt;
    }

    this.player.x = Math.max(30, Math.min(this.width - 30, this.player.x));
    this.player.y = Math.max(30, Math.min(this.height - 30, this.player.y));

    // Turret Aiming
    if (this.pointerTarget) {
      this.player.turretAngle = Math.atan2(this.pointerTarget.y - this.player.y, this.pointerTarget.x - this.player.x);
    } else if (len > 0.15) {
      this.player.turretAngle = this.player.angle;
    }

    // Fire Cannon
    const fireRequested = Boolean(this.keys['Space'] || this.touchActions.fire);
    if (fireRequested && this.fireCooldown <= 0) {
      this.fireCooldown = 0.28;
      sound.playLaser('fast');
      this.shells.push({
        x: this.player.x + Math.cos(this.player.turretAngle) * 22,
        y: this.player.y + Math.sin(this.player.turretAngle) * 22,
        vx: Math.cos(this.player.turretAngle) * 460,
        vy: Math.sin(this.player.turretAngle) * 460,
        bounces: 2,
        isEnemy: false
      });
    }

    // Deploy Mine
    const mineRequested = Boolean(this.keys['ShiftLeft'] || this.keys['KeyE'] || this.touchActions.mine);
    if (mineRequested && this.mineCharges > 0) {
      this.mineCharges--;
      this.mines.push({ x: this.player.x, y: this.player.y, timer: 1.6 });
      sound.playHit();
      if (this.keys['ShiftLeft']) this.keys['ShiftLeft'] = false;
      if (this.touchActions) this.touchActions.mine = false;
    }

    // Update Mines
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.timer -= dt;
      if (m.timer <= 0) {
        this.mines.splice(i, 1);
        sound.playExplosion(2.0);
        if (this.particles && this.particles.burst) {
          this.particles.burst(m.x, m.y, 35, '#14b8a6');
        }
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.hypot(e.x - m.x, e.y - m.y) < 100) {
            e.hp -= 90;
            if (e.hp <= 0) this.killEnemy(j);
          }
        }
      }
    }

    // Update Shells (ricochets)
    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;

      let bounced = false;
      if (s.x < 15 || s.x > this.width - 15) {
        s.vx = -s.vx;
        bounced = true;
      }
      if (s.y < 15 || s.y > this.height - 15) {
        s.vy = -s.vy;
        bounced = true;
      }

      // Barricade collision
      for (let j = this.barricades.length - 1; j >= 0; j--) {
        const b = this.barricades[j];
        if (s.x > b.x && s.x < b.x + b.w && s.y > b.y && s.y < b.y + b.h) {
          b.hp -= 20;
          bounced = true;
          s.vx = -s.vx;
          if (b.hp <= 0) {
            this.barricades.splice(j, 1);
            sound.playExplosion(1.2);
            if (this.particles && this.particles.burst) {
              this.particles.burst(b.x + b.w / 2, b.y + b.h / 2, 18, '#64748b');
            }
          }
          break;
        }
      }

      if (bounced) {
        s.bounces--;
        sound.playPaddleBounce(0.2);
        if (s.bounces < 0) {
          this.shells.splice(i, 1);
          continue;
        }
      }

      // Hit Player
      if (s.isEnemy && Math.hypot(s.x - this.player.x, s.y - this.player.y) < 18) {
        this.player.hp -= 25;
        this.shells.splice(i, 1);
        sound.playHit();
        if (this.particles && this.particles.burst) {
          this.particles.burst(this.player.x, this.player.y, 14, '#ef4444');
        }
        if (this.player.hp <= 0) {
          this.isGameOver = true;
          this.isRunning = false;
          sound.playGameOver();
          const pb = storage.getHighScore('voxelTankSiege') || 0;
          const isRecord = this.score > pb;
          if (isRecord) storage.saveHighScore('voxelTankSiege', this.score);
          this.creditsEarned += Math.floor(this.score / 200);
          storage.addCredits(this.creditsEarned);

          if (this.callbacks && this.callbacks.onGameOver) {
            this.callbacks.onGameOver({
              score: this.score,
              credits: this.creditsEarned,
              wave: this.wave,
              isRecord
            });
          }
        }
        continue;
      }

      // Hit Enemies
      if (!s.isEnemy) {
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.hypot(s.x - e.x, s.y - e.y) < 22) {
            e.hp -= 40;
            this.shells.splice(i, 1);
            sound.playHit();
            if (this.particles && this.particles.burst) {
              this.particles.burst(e.x, e.y, 10, '#14b8a6');
            }
            if (e.hp <= 0) this.killEnemy(j);
            break;
          }
        }
      }
    }

    // Update Enemies AI
    for (const e of this.enemies) {
      const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
      e.turretAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);

      if (dist > 180) {
        e.x += Math.cos(e.turretAngle) * e.speed * dt;
        e.y += Math.sin(e.turretAngle) * e.speed * dt;
      }

      e.fireTimer += dt;
      if (e.fireTimer >= 2.2 + Math.random() * 0.8) {
        e.fireTimer = 0;
        this.shells.push({
          x: e.x + Math.cos(e.turretAngle) * 20,
          y: e.y + Math.sin(e.turretAngle) * 20,
          vx: Math.cos(e.turretAngle) * 360,
          vy: Math.sin(e.turretAngle) * 360,
          bounces: 1,
          isEnemy: true
        });
        sound.playLaser('alien');
      }
    }

    // Check Wave Clear
    if (this.enemies.length === 0) {
      this.wave++;
      this.score += 1500 * this.multiplier;
      this.mineCharges = Math.min(5, this.mineCharges + 2);
      sound.playPowerup();
      sound.announce(`Wave ${this.wave}!`);
      this.spawnWave();
    }

    if (this.callbacks && this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(
        this.score,
        this.wave,
        Math.max(0, this.player.hp),
        this.player.maxHp
      );
    }
  }

  killEnemy(index) {
    const e = this.enemies[index];
    this.enemies.splice(index, 1);
    this.score += 350 * this.multiplier;
    this.creditsEarned += 8;
    sound.playExplosion(1.4);
    if (this.particles && this.particles.burst) {
      this.particles.burst(e.x, e.y, 25, e.color);
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Arena backdrop
    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, this.width, this.height);

    // Neon wall border
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#14b8a6';
    ctx.shadowBlur = 8;
    ctx.strokeRect(10, 10, this.width - 20, this.height - 20);
    ctx.shadowBlur = 0;

    // Render Barricades
    for (const b of this.barricades) {
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }

    // Render Mines
    for (const m of this.mines) {
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Render Shells
    for (const s of this.shells) {
      ctx.fillStyle = s.isEnemy ? '#ef4444' : '#14b8a6';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Render Enemies
    for (const e of this.enemies) {
      this.renderTank(ctx, e);
    }

    // Render Player
    if (!this.isGameOver) {
      this.renderTank(ctx, this.player);
    }
  }

  renderTank(ctx, t) {
    ctx.save();
    ctx.translate(t.x, t.y);

    // Chassis
    ctx.rotate(t.angle);
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(-16, -12, 32, 24);

    // Treads
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-18, -15, 36, 4);
    ctx.fillRect(-18, 11, 36, 4);

    // Turret (independent rotation)
    ctx.rotate(t.turretAngle - t.angle);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -3, 20, 6);
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
