// NeonPulse Arcade - Hexa-Tron: Lightcycle Cyber Arena
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';
import { gamepad } from '../engine/gamepad.js';

export class HexaTronGame {
  constructor(canvas, particles, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particles;
    this.callbacks = callbacks;

    this.width = 800;
    this.height = 600;

    this.isRunning = false;
    this.isPaused = false;

    // Arena Bounds
    this.arena = {
      x: 30,
      y: 30,
      w: 740,
      h: 540
    };

    this.score = 0;
    this.round = 1;
    this.gameTime = 0;
    this.aliveOpponents = 3;

    // Player State
    this.player = null;
    this.opponents = [];
    this.pickups = [];
    this.pickupTimer = 0;

    // Controls
    this.keys = {};
    this.bindInputs();
  }

  bindInputs() {
    this.onKeyDown = (e) => {
      if (!this.isRunning) return;
      this.keys[e.code] = true;
      this.handlePlayerTurn(e.code);
      if (e.code === 'Space') {
        this.triggerPhaseJump();
      }
    };

    this.onKeyUp = (e) => {
      this.keys[e.code] = false;
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Touch Controls: swipe / tap quadrants
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.isRunning) return;
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      if (!this.player || !this.player.alive) return;

      const dx = px - this.player.x;
      const dy = py - this.player.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0 && this.player.dir !== 'left') this.player.nextDir = 'right';
        else if (dx < 0 && this.player.dir !== 'right') this.player.nextDir = 'left';
      } else {
        if (dy > 0 && this.player.dir !== 'up') this.player.nextDir = 'down';
        else if (dy < 0 && this.player.dir !== 'down') this.player.nextDir = 'up';
      }
    });
  }

  handlePlayerTurn(code) {
    if (!this.player || !this.player.alive) return;

    if ((code === 'ArrowUp' || code === 'KeyW') && this.player.dir !== 'down') {
      this.player.nextDir = 'up';
    } else if ((code === 'ArrowDown' || code === 'KeyS') && this.player.dir !== 'up') {
      this.player.nextDir = 'down';
    } else if ((code === 'ArrowLeft' || code === 'KeyA') && this.player.dir !== 'right') {
      this.player.nextDir = 'left';
    } else if ((code === 'ArrowRight' || code === 'KeyD') && this.player.dir !== 'left') {
      this.player.nextDir = 'right';
    }
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.score = 0;
    this.round = 1;
    this.gameTime = 0;
    this.pickups = [];
    this.pickupTimer = 0;

    sound.announce('Grid Activated. Lightcycle Duel!');
    this.initRound();
  }

  stop() {
    this.isRunning = false;
  }

  initRound() {
    const baseSpeed = 190 + Math.min(80, this.round * 15);

    // Player Cycle (Spawns bottom-center moving up)
    this.player = {
      id: 'player',
      name: 'OPERATIVE',
      x: this.arena.x + this.arena.w * 0.5,
      y: this.arena.y + this.arena.h * 0.85,
      dir: 'up',
      nextDir: 'up',
      speed: baseSpeed,
      color: '#00f3ff',
      trailColor: '#00f3ff',
      alive: true,
      trail: [],
      phaseJumpTimer: 0,
      nitroTimer: 0,
      jumpsRemaining: 2
    };

    // 3 AI Opponents
    this.opponents = [
      {
        id: 'ai1',
        name: 'PHANTOM',
        x: this.arena.x + this.arena.w * 0.5,
        y: this.arena.y + this.arena.h * 0.15,
        dir: 'down',
        nextDir: 'down',
        speed: baseSpeed * 0.98,
        color: '#ff0055',
        trailColor: '#ff0055',
        alive: true,
        trail: [],
        decisionTimer: 0
      },
      {
        id: 'ai2',
        name: 'STRIKER',
        x: this.arena.x + this.arena.w * 0.15,
        y: this.arena.y + this.arena.h * 0.5,
        dir: 'right',
        nextDir: 'right',
        speed: baseSpeed * 0.95,
        color: '#ffd700',
        trailColor: '#ffd700',
        alive: true,
        trail: [],
        decisionTimer: 0.1
      },
      {
        id: 'ai3',
        name: 'SHADOW',
        x: this.arena.x + this.arena.w * 0.85,
        y: this.arena.y + this.arena.h * 0.5,
        dir: 'left',
        nextDir: 'left',
        speed: baseSpeed * 0.96,
        color: '#a855f7',
        trailColor: '#a855f7',
        alive: true,
        trail: [],
        decisionTimer: 0.2
      }
    ];

    this.aliveOpponents = 3;
    this.updateHUD();
  }

  triggerPhaseJump() {
    if (!this.player || !this.player.alive) return;
    if (this.player.jumpsRemaining <= 0 || this.player.phaseJumpTimer > 0) return;

    this.player.jumpsRemaining--;
    this.player.phaseJumpTimer = 1.3;
    sound.play('powerup');
    sound.announce('Phase Jump!');
    gamepad.rumble(150, 0.3, 0.7);
    this.particles.shake(4);
    this.particles.addShockwave(this.player.x, this.player.y, '#00f3ff', 80, 0.3);
  }

  setTouchAction(action) {
    if (action === 'jump' || action === 'nitro') {
      this.triggerPhaseJump();
    }
  }

  update(dt) {
    if (!this.isRunning || this.isPaused) return;

    this.gameTime += dt;
    this.score += Math.floor(dt * 15);

    // Check Gamepad inputs
    const gp = gamepad.poll();
    if (gp.up && this.player.dir !== 'down') this.player.nextDir = 'up';
    if (gp.down && this.player.dir !== 'up') this.player.nextDir = 'down';
    if (gp.left && this.player.dir !== 'right') this.player.nextDir = 'left';
    if (gp.right && this.player.dir !== 'left') this.player.nextDir = 'right';
    if (gamepad.isJustPressed('action') || gamepad.isJustPressed('super')) {
      this.triggerPhaseJump();
    }

    // 1. Update Player Cycle
    if (this.player.alive) {
      this.updateCycle(this.player, dt);

      if (this.player.phaseJumpTimer > 0) {
        this.player.phaseJumpTimer -= dt;
      }
      if (this.player.nitroTimer > 0) {
        this.player.nitroTimer -= dt;
      }
    }

    // 2. Update AI Opponents
    for (const ai of this.opponents) {
      if (!ai.alive) continue;
      this.updateAICycle(ai, dt);
      this.updateCycle(ai, dt);
    }

    // 3. Spawning Pickups
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0 && this.pickups.length < 3) {
      this.pickupTimer = Math.random() * 5 + 4;
      this.spawnPickup();
    }

    // Pickups collision with player
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      if (this.player.alive) {
        const dx = this.player.x - p.x;
        const dy = this.player.y - p.y;
        if (dx * dx + dy * dy < 22 * 22) {
          this.collectPickup(p);
          this.pickups.splice(i, 1);
        }
      }
    }

    // 4. Check Round End (Victory or Defeat)
    if (!this.player.alive) {
      // Game Over
      this.handleGameOver();
      return;
    }

    const aliveCount = this.opponents.filter(o => o.alive).length;
    if (aliveCount === 0) {
      // Round Cleared!
      this.handleRoundVictory();
    }

    this.updateHUD();
  }

  updateCycle(cycle, dt) {
    // Commit nextDir
    cycle.dir = cycle.nextDir;

    const currentSpeed = cycle.nitroTimer > 0 ? cycle.speed * 1.4 : cycle.speed;
    let vx = 0;
    let vy = 0;

    if (cycle.dir === 'up') vy = -currentSpeed;
    else if (cycle.dir === 'down') vy = currentSpeed;
    else if (cycle.dir === 'left') vx = -currentSpeed;
    else if (cycle.dir === 'right') vx = currentSpeed;

    const prevX = cycle.x;
    const prevY = cycle.y;

    cycle.x += vx * dt;
    cycle.y += vy * dt;

    // Add trail segment
    if (cycle.phaseJumpTimer <= 0) {
      cycle.trail.push({ x: cycle.x, y: cycle.y, dir: cycle.dir });
    }

    // Particle exhaust trail
    if (Math.random() < 0.3) {
      this.particles.spawn(
        cycle.x,
        cycle.y,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        cycle.trailColor,
        Math.random() * 4 + 2,
        0.25
      );
    }

    // Wall Collision
    const margin = 6;
    if (
      cycle.x < this.arena.x + margin ||
      cycle.x > this.arena.x + this.arena.w - margin ||
      cycle.y < this.arena.y + margin ||
      cycle.y > this.arena.y + this.arena.h - margin
    ) {
      this.eliminateCycle(cycle, 'Wall Impact');
      return;
    }

    // Trail Collision Check (Unless in Phase Jump)
    if (cycle.phaseJumpTimer <= 0) {
      this.checkTrailCollision(cycle);
    }
  }

  checkTrailCollision(cycle) {
    // Gather all trails to test against
    const allCycles = [this.player, ...this.opponents];

    for (const other of allCycles) {
      const trail = other.trail;
      if (!trail || trail.length < 5) continue;

      // Skip the very last few points of our own trail so we don't hit ourselves instantly
      const checkLimit = other === cycle ? trail.length - 12 : trail.length;

      for (let i = 0; i < checkLimit; i += 2) {
        const pt = trail[i];
        const dx = cycle.x - pt.x;
        const dy = cycle.y - pt.y;
        if (dx * dx + dy * dy < 7 * 7) {
          this.eliminateCycle(cycle, `Trail of ${other.name}`);
          return;
        }
      }
    }
  }

  updateAICycle(ai, dt) {
    ai.decisionTimer -= dt;
    if (ai.decisionTimer > 0) return;

    ai.decisionTimer = 0.08 + Math.random() * 0.06;

    // Look ahead distance based on speed
    const lookAhead = 45;
    const canMove = (dir) => {
      let testX = ai.x;
      let testY = ai.y;
      if (dir === 'up') testY -= lookAhead;
      else if (dir === 'down') testY += lookAhead;
      else if (dir === 'left') testX -= lookAhead;
      else if (dir === 'right') testX += lookAhead;

      // Boundary check
      if (
        testX < this.arena.x + 12 ||
        testX > this.arena.x + this.arena.w - 12 ||
        testY < this.arena.y + 12 ||
        testY > this.arena.y + this.arena.h - 12
      ) {
        return false;
      }

      // Trail check
      const allCycles = [this.player, ...this.opponents];
      for (const other of allCycles) {
        for (let i = 0; i < other.trail.length; i += 3) {
          const pt = other.trail[i];
          const distSq = (testX - pt.x) ** 2 + (testY - pt.y) ** 2;
          if (distSq < 18 * 18) return false;
        }
      }

      return true;
    };

    // Current direction still safe?
    if (canMove(ai.dir) && Math.random() > 0.15) {
      return;
    }

    // Needs to turn! Determine valid perpendicular directions
    const options = [];
    if (ai.dir === 'up' || ai.dir === 'down') {
      if (canMove('left')) options.push('left');
      if (canMove('right')) options.push('right');
    } else {
      if (canMove('up')) options.push('up');
      if (canMove('down')) options.push('down');
    }

    if (options.length > 0) {
      // Pick best option (favor turning towards player for aggressive AI)
      if (ai.id === 'ai1' && this.player.alive && options.length > 1) {
        const dx = this.player.x - ai.x;
        const dy = this.player.y - ai.y;
        if (options.includes('left') && dx < 0) ai.nextDir = 'left';
        else if (options.includes('right') && dx > 0) ai.nextDir = 'right';
        else if (options.includes('up') && dy < 0) ai.nextDir = 'up';
        else if (options.includes('down') && dy > 0) ai.nextDir = 'down';
        else ai.nextDir = options[Math.floor(Math.random() * options.length)];
      } else {
        ai.nextDir = options[Math.floor(Math.random() * options.length)];
      }
    }
  }

  eliminateCycle(cycle, reason) {
    cycle.alive = false;
    sound.play('explosion');

    // Massive spark burst
    this.particles.shake(12);
    this.particles.explode(cycle.x, cycle.y, cycle.color, 45);
    this.particles.explode(cycle.x, cycle.y, '#ffffff', 20);

    if (cycle.id === 'player') {
      gamepad.rumble(400, 0.8, 1.0);
      sound.announce('Cycle Derezz! Mission Offline.');
    } else {
      sound.announce('Competitor Derezz!');
      gamepad.rumble(200, 0.5, 0.7);
      this.score += 500;
      storage.addCredits(15);
      this.aliveOpponents = Math.max(0, this.aliveOpponents - 1);
    }
  }

  spawnPickup() {
    const rx = this.arena.x + 60 + Math.random() * (this.arena.w - 120);
    const ry = this.arena.y + 60 + Math.random() * (this.arena.h - 120);
    const types = ['jump', 'nitro', 'emp'];
    const type = types[Math.floor(Math.random() * types.length)];

    this.pickups.push({
      x: rx,
      y: ry,
      type,
      icon: type === 'jump' ? '🌀' : (type === 'nitro' ? '⚡' : '💣')
    });
  }

  collectPickup(p) {
    sound.play('powerup');
    this.particles.explode(p.x, p.y, '#00f3ff', 15);

    if (p.type === 'jump') {
      this.player.jumpsRemaining = Math.min(4, this.player.jumpsRemaining + 1);
      sound.announce('Phase Jump Acquired');
    } else if (p.type === 'nitro') {
      this.player.nitroTimer = 4.0;
      sound.announce('Nitro Surge!');
    } else if (p.type === 'emp') {
      // Clear nearby trails
      this.particles.addShockwave(this.player.x, this.player.y, '#00f3ff', 160, 0.35);
      this.clearNearbyTrails(this.player.x, this.player.y, 160);
      sound.announce('EMP Trail Breaker!');
    }
  }

  clearNearbyTrails(x, y, radius) {
    const rSq = radius * radius;
    const allCycles = [this.player, ...this.opponents];
    for (const c of allCycles) {
      c.trail = c.trail.filter(pt => (pt.x - x) ** 2 + (pt.y - y) ** 2 > rSq);
    }
  }

  handleRoundVictory() {
    sound.play('victory');
    sound.announce('Grid Master! Round Cleared.');
    gamepad.rumble(300, 0.4, 0.8);

    const bonus = 1500;
    this.score += bonus;
    storage.addCredits(50);
    storage.unlockAchievement('grid_master');

    this.round++;
    this.initRound();
  }

  handleGameOver() {
    this.isRunning = false;
    sound.play('gameover');
    storage.saveHighScore('hexaTron', this.score);
    storage.recordGamePlayed();

    const creditsEarned = Math.floor(this.score / 60) + (this.round - 1) * 25;
    storage.addCredits(creditsEarned);

    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver({
        score: this.score,
        round: this.round,
        credits: creditsEarned
      });
    }
  }

  updateHUD() {
    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(
        this.score,
        this.round,
        this.aliveOpponents,
        this.player ? this.player.jumpsRemaining : 0
      );
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // 1. Dark Void Arena Background
    ctx.fillStyle = '#05060f';
    ctx.fillRect(0, 0, w, h);

    // 2. Glowing Neon Arena Bounds
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 12;
    ctx.strokeRect(this.arena.x, this.arena.y, this.arena.w, this.arena.h);
    ctx.shadowBlur = 0;

    // Arena Floor Tech Grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridStep = 40;
    for (let gx = this.arena.x; gx < this.arena.x + this.arena.w; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx, this.arena.y);
      ctx.lineTo(gx, this.arena.y + this.arena.h);
      ctx.stroke();
    }
    for (let gy = this.arena.y; gy < this.arena.y + this.arena.h; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(this.arena.x, gy);
      ctx.lineTo(this.arena.x + this.arena.w, gy);
      ctx.stroke();
    }

    // 3. Draw Pickups
    for (const p of this.pickups) {
      ctx.save();
      ctx.shadowColor = '#00f3ff';
      ctx.shadowBlur = 10;
      ctx.fillStyle = 'rgba(0, 240, 255, 0.2)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.icon, p.x, p.y);
      ctx.restore();
    }

    // 4. Draw Trails
    const allCycles = [this.player, ...this.opponents];
    for (const c of allCycles) {
      if (!c.trail || c.trail.length < 2) continue;

      ctx.save();
      ctx.strokeStyle = c.trailColor;
      ctx.lineWidth = 5;
      ctx.shadowColor = c.trailColor;
      ctx.shadowBlur = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(c.trail[0].x, c.trail[0].y);
      for (let i = 1; i < c.trail.length; i++) {
        ctx.lineTo(c.trail[i].x, c.trail[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 5. Draw Cycles
    for (const c of allCycles) {
      if (!c.alive) continue;
      this.drawLightcycle(ctx, c);
    }
  }

  drawLightcycle(ctx, c) {
    ctx.save();
    ctx.translate(c.x, c.y);

    let rot = 0;
    if (c.dir === 'right') rot = 0;
    else if (c.dir === 'down') rot = Math.PI / 2;
    else if (c.dir === 'left') rot = Math.PI;
    else if (c.dir === 'up') rot = -Math.PI / 2;

    ctx.rotate(rot);

    // Phase Jump Elevation Effect
    if (c.phaseJumpTimer > 0) {
      ctx.scale(1.3, 1.3);
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 18;
      ctx.globalAlpha = 0.85;
    }

    // Cycle Body
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(-14, -6, 28, 12);

    // Neon Canopy & Trim
    ctx.fillStyle = c.color;
    ctx.shadowColor = c.color;
    ctx.shadowBlur = 10;
    ctx.fillRect(-6, -4, 16, 8);

    // Wheels
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, -5, 6, 10);
    ctx.fillRect(-14, -5, 6, 10);

    ctx.restore();
  }
}
