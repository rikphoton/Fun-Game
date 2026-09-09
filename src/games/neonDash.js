// Neon Dash: High-Speed Gravity Rhythm Runner - Ultra Optimized & Stutter-Free
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';

export class NeonDashGame {
  constructor(canvas, particleSystem, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particleSystem;
    this.callbacks = callbacks;

    this.width = 800;
    this.height = 600;

    this.floorY = 480;
    this.ceilY = 120;

    this.reset();
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.distance = 0;
    this.speed = 360;
    this.starsCollected = 0;
    this.multiplier = 1;

    this.player = {
      x: 140,
      y: this.floorY - 18,
      size: 26,
      vy: 0,
      gravityDir: 1, // 1 = down (floor), -1 = up (ceiling)
      onGround: true,
      color: '#00f3ff',
      angle: 0
    };

    this.obstacles = [];
    this.collectibles = [];
    this.backgroundBuildings = [];
    this.spawnTimer = 0;

    this.initBackground();
  }

  init() {
    this.reset();
    this.isRunning = true;
    sound.startBgm('dash');
  }

  initBackground() {
    this.backgroundBuildings = [];
    for (let x = 0; x < this.width + 200; x += 60) {
      this.backgroundBuildings.push({
        x,
        width: 40 + Math.random() * 35,
        height: 120 + Math.random() * 180,
        color: Math.random() < 0.5 ? '#15092a' : '#1f0d3d',
        windowColor: Math.random() < 0.5 ? '#ff0055' : '#00f3ff'
      });
    }
  }

  handleAction() {
    if (!this.isRunning || this.isPaused) return;

    // Invert Gravity
    this.player.gravityDir *= -1;
    this.player.onGround = false;
    this.player.vy = this.player.gravityDir * 320;

    sound.playJump();
    this.particles.burst(this.player.x, this.player.y, 8, {
      color: this.player.gravityDir === 1 ? '#00f3ff' : '#ff00aa',
      minSpeed: 40,
      maxSpeed: 120,
      life: 0.2
    });
  }

  handleKeyDown(code) {
    if (code === 'Space' || code === 'ArrowUp' || code === 'KeyW') {
      this.handleAction();
    }
  }

  handleKeyUp() {}

  handlePointerDown() {
    this.handleAction();
  }

  update(dt) {
    if (!this.isRunning || this.isPaused) return;

    // Progressive speed increase
    this.speed = Math.min(680, 360 + (this.distance / 120) * 16);
    this.distance += this.speed * dt * 0.1;
    this.score = Math.floor(this.distance + this.starsCollected * 50);
    this.callbacks.onScoreUpdate(this.score, Math.floor(this.distance), this.starsCollected);

    // 1. Gravity & Physics
    const gravityForce = 1800 * this.player.gravityDir;
    this.player.vy += gravityForce * dt;
    this.player.y += this.player.vy * dt;

    // Hard bounds clamping to prevent phasing / clipping
    const minY = this.ceilY + this.player.size / 2;
    const maxY = this.floorY - this.player.size / 2;

    if (this.player.gravityDir === 1 && this.player.y >= maxY) {
      this.player.y = maxY;
      this.player.vy = 0;
      if (!this.player.onGround) {
        this.player.onGround = true;
        this.particles.burst(this.player.x, this.floorY, 4, { color: '#00f3ff', life: 0.15 });
      }
    } else if (this.player.gravityDir === -1 && this.player.y <= minY) {
      this.player.y = minY;
      this.player.vy = 0;
      if (!this.player.onGround) {
        this.player.onGround = true;
        this.particles.burst(this.player.x, this.ceilY, 4, { color: '#ff00aa', life: 0.15 });
      }
    } else {
      this.player.onGround = false;
    }

    // Spin animation when airborne
    if (!this.player.onGround) {
      this.player.angle += this.player.gravityDir * 8 * dt;
    } else {
      this.player.angle = 0;
    }

    // 2. Parallax background
    for (let i = 0; i < this.backgroundBuildings.length; i++) {
      const b = this.backgroundBuildings[i];
      b.x -= this.speed * 0.25 * dt;
      if (b.x + b.width < 0) {
        b.x = this.width + 40;
        b.height = 100 + Math.random() * 200;
      }
    }

    // 3. Spawning Obstacles & Stars
    this.spawnTimer += dt;
    const currentInterval = Math.max(0.7, 1.4 - (this.distance / 1500) * 0.6);
    if (this.spawnTimer >= currentInterval) {
      this.spawnTimer = 0;
      this.spawnHazardWave();
    }

    // 4. Update Obstacles
    const pLeft = this.player.x - this.player.size / 2 + 5;
    const pRight = this.player.x + this.player.size / 2 - 5;
    const pTop = this.player.y - this.player.size / 2 + 5;
    const pBottom = this.player.y + this.player.size / 2 - 5;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed * dt;

      if (obs.type === 'spike') {
        if (
          pRight > obs.x &&
          pLeft < obs.x + obs.width &&
          ((obs.onCeiling && pTop < obs.y + obs.height) || (!obs.onCeiling && pBottom > obs.y))
        ) {
          this.gameOver();
          return;
        }
      } else if (obs.type === 'laser') {
        if (pRight > obs.x && pLeft < obs.x + obs.width && pBottom > obs.y && pTop < obs.y + obs.height) {
          this.gameOver();
          return;
        }
      }

      if (obs.x + (obs.width || 40) < -50) {
        this.obstacles.splice(i, 1);
      }
    }

    // 5. Update Collectibles
    for (let i = this.collectibles.length - 1; i >= 0; i--) {
      const c = this.collectibles[i];
      c.x -= this.speed * dt;

      const cdx = this.player.x - c.x;
      const cdy = this.player.y - c.y;
      const hitDist = this.player.size / 2 + c.radius;

      if (cdx * cdx + cdy * cdy < hitDist * hitDist) {
        this.collectStar(c);
        this.collectibles.splice(i, 1);
        continue;
      }

      if (c.x < -30) {
        this.collectibles.splice(i, 1);
      }
    }
  }

  spawnHazardWave() {
    const roll = Math.random();

    if (roll < 0.45) {
      const onCeiling = Math.random() < 0.5;
      const width = 28;
      const height = 36;
      this.obstacles.push({
        type: 'spike',
        x: this.width + 30,
        y: onCeiling ? this.ceilY : this.floorY - height,
        width,
        height,
        onCeiling,
        color: onCeiling ? '#ff0055' : '#ffe600'
      });
    } else if (roll < 0.75) {
      const onCeiling = Math.random() < 0.5;
      this.obstacles.push({
        type: 'spike',
        x: this.width + 30,
        y: onCeiling ? this.ceilY : this.floorY - 36,
        width: 28,
        height: 36,
        onCeiling,
        color: '#ff0055'
      });
      this.obstacles.push({
        type: 'spike',
        x: this.width + 120,
        y: !onCeiling ? this.ceilY : this.floorY - 36,
        width: 28,
        height: 36,
        onCeiling: !onCeiling,
        color: '#ff0055'
      });
    } else {
      this.obstacles.push({
        type: 'laser',
        x: this.width + 30,
        y: this.height / 2 - 45,
        width: 18,
        height: 90,
        color: '#ff003c'
      });
    }

    if (Math.random() < 0.65) {
      const starY = Math.random() < 0.5 ? this.floorY - 50 : this.ceilY + 50;
      this.collectibles.push({
        x: this.width + 75,
        y: starY,
        radius: 8,
        color: '#ffe600'
      });
    }
  }

  collectStar(c) {
    this.starsCollected++;
    sound.playGemPickup(this.starsCollected);
    this.particles.burst(c.x, c.y, 8, { color: '#ffe600', life: 0.3 });
    this.particles.addFloatingText('+50', c.x, c.y - 10, { color: '#ffe600', size: 15 });
  }

  gameOver() {
    this.isRunning = false;
    sound.stopBgm();
    sound.playExplosion(1.8);

    this.particles.shake(14, 0.35);
    this.particles.burst(this.player.x, this.player.y, 25, {
      colors: ['#00f3ff', '#ff0055', '#ffe600', '#ffffff'],
      maxSpeed: 220,
      life: 0.5
    });

    const isRecord = storage.saveHighScore('neonDash', this.score);
    storage.recordGamePlayed();

    this.callbacks.onGameOver({
      score: this.score,
      distance: Math.floor(this.distance),
      stars: this.starsCollected,
      isRecord
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Neon Cyber City Backdrop
    for (let i = 0; i < this.backgroundBuildings.length; i++) {
      const b = this.backgroundBuildings[i];
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, this.height - b.height, b.width, b.height);

      ctx.fillStyle = b.windowColor;
      ctx.globalAlpha = 0.3;
      for (let wy = this.height - b.height + 15; wy < this.height - 20; wy += 24) {
        ctx.fillRect(b.x + 8, wy, b.width - 16, 4);
      }
      ctx.globalAlpha = 1.0;
    }

    // 2. Floor & Ceiling Rails
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, this.floorY);
    ctx.lineTo(this.width, this.floorY);
    ctx.stroke();

    ctx.strokeStyle = '#ff00aa';
    ctx.beginPath();
    ctx.moveTo(0, this.ceilY);
    ctx.lineTo(this.width, this.ceilY);
    ctx.stroke();

    // 3. Collectibles
    for (let i = 0; i < this.collectibles.length; i++) {
      const c = this.collectibles[i];
      ctx.fillStyle = c.color;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Obstacles
    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      ctx.fillStyle = obs.color;

      if (obs.type === 'spike') {
        ctx.beginPath();
        if (obs.onCeiling) {
          ctx.moveTo(obs.x, obs.y);
          ctx.lineTo(obs.x + obs.width, obs.y);
          ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height);
        } else {
          ctx.moveTo(obs.x, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width, obs.y + obs.height);
          ctx.lineTo(obs.x + obs.width / 2, obs.y);
        }
        ctx.closePath();
        ctx.fill();
      } else if (obs.type === 'laser') {
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(obs.x + 4, obs.y, obs.width - 8, obs.height);
      }
    }

    // 5. Player
    if (this.isRunning) {
      ctx.save();
      ctx.translate(this.player.x, this.player.y);
      ctx.rotate(this.player.angle);

      ctx.fillStyle = this.player.gravityDir === 1 ? '#00f3ff' : '#ff00aa';
      ctx.fillRect(-this.player.size / 2, -this.player.size / 2, this.player.size, this.player.size);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-this.player.size / 4, -this.player.size / 4, this.player.size / 2, this.player.size / 2);

      ctx.restore();
    }
  }
}
