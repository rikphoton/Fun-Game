// Cyber Pinball: Kinetic Neon Flipper Physics with Multiball Frenzy
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';

export class CyberPinballGame {
  constructor(canvas, particleSystem, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particleSystem;
    this.callbacks = callbacks;

    this.width = 600;
    this.height = 750;

    this.reset();
  }

  setDimensions(width, height) {
    this.width = width;
    this.height = height;
    this.leftPivot = { x: this.width * 0.35, y: this.height - 90 };
    this.rightPivot = { x: this.width * 0.65, y: this.height - 90 };
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.multiplier = 1;
    this.creditsEarned = 0;

    const hullBonus = storage.getLabBonus ? storage.getLabBonus('hull') : 0;
    this.maxBalls = 3 + (hullBonus > 20 ? 1 : 0);
    this.ballsRemaining = this.maxBalls;
    this.isGameOver = false;
    this.multiballActive = false;

    this.leftFlipperAngle = 0.4;
    this.rightFlipperAngle = -0.4;
    this.flipperLength = 70;
    this.leftPivot = { x: this.width * 0.35, y: this.height - 90 };
    this.rightPivot = { x: this.width * 0.65, y: this.height - 90 };

    this.plungerPower = 0;
    this.isPlunging = false;

    this.bumpers = [
      { x: this.width * 0.35, y: this.height * 0.28, radius: 26, points: 150, color: '#ec4899', hitPulse: 0 },
      { x: this.width * 0.65, y: this.height * 0.28, radius: 26, points: 150, color: '#00f3ff', hitPulse: 0 },
      { x: this.width * 0.5, y: this.height * 0.42, radius: 30, points: 300, color: '#ffe600', hitPulse: 0 }
    ];

    const letters = ['C', 'Y', 'B', 'E', 'R'];
    const startX = this.width * 0.25;
    const spacing = 36;
    this.dropTargets = letters.map((letter, i) => ({
      letter,
      hit: false,
      x: startX + i * spacing,
      y: this.height * 0.16
    }));

    this.balls = [];
    this.keys = {};
    this.joystick = { x: 0, y: 0, active: false };
    this.touchActions = { left: false, right: false, plunge: false };
  }

  init() {
    this.reset();
    this.isRunning = true;
    sound.startBgm('cyberPinball');
    sound.announce('Cyber Pinball. Pull plunger to launch!');
    this.spawnBall();
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
    this.balls = [];
    this.bumpers = [];
    this.dropTargets = [];
  }

  spawnBall() {
    this.balls = [
      {
        x: this.width - 32,
        y: this.height - 130,
        vx: 0,
        vy: 0,
        radius: 9
      }
    ];
  }

  handleInput(keys, touchState) {
    if (keys) this.keys = keys;
    if (touchState) {
      if (touchState.joystick) this.joystick = touchState.joystick;
      if (touchState.touchActions) this.touchActions = touchState.touchActions;
    }
  }

  triggerMultiball() {
    this.multiballActive = true;
    this.multiplier = 3;
    sound.playPowerup();
    sound.announce('Multiball Frenzy!');
    this.creditsEarned += 25;

    this.balls.push(
      { x: this.width * 0.45, y: this.height * 0.35, vx: -180, vy: -300, radius: 9 },
      { x: this.width * 0.55, y: this.height * 0.35, vx: 180, vy: -300, radius: 9 }
    );

    this.dropTargets.forEach(t => (t.hit = false));
    if (this.particles && this.particles.burst) {
      this.particles.burst(this.width / 2, this.height * 0.3, 40, '#ffe600');
    }
  }

  resolveFlipperCollision(ball, pivot, len, angle, isLeft) {
    const tipX = pivot.x + Math.cos(angle) * (isLeft ? len : -len);
    const tipY = pivot.y + Math.sin(angle) * len;

    const dx = tipX - pivot.x;
    const dy = tipY - pivot.y;
    const l2 = dx * dx + dy * dy;
    let t = ((ball.x - pivot.x) * dx + (ball.y - pivot.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = pivot.x + t * dx;
    const projY = pivot.y + t * dy;
    const dist = Math.hypot(ball.x - projX, ball.y - projY);

    if (dist < ball.radius + 8) {
      const nx = -(tipY - pivot.y);
      const ny = tipX - pivot.x;
      const nlen = Math.hypot(nx, ny);
      const unx = (nx / nlen) * (isLeft ? -1 : 1);
      const uny = (ny / nlen) * (isLeft ? -1 : 1);

      ball.vx = unx * 600;
      ball.vy = uny * 600;
      sound.playFlipper();
      if (this.particles && this.particles.burst) {
        this.particles.burst(projX, projY, 8, '#ec4899');
      }
    }
  }

  update(dt) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    // Flipper inputs
    const leftActive = Boolean(
      this.keys['KeyA'] ||
      this.keys['ArrowLeft'] ||
      (this.joystick && this.joystick.active && this.joystick.x < -0.3) ||
      this.touchActions.left
    );

    const rightActive = Boolean(
      this.keys['KeyD'] ||
      this.keys['ArrowRight'] ||
      (this.joystick && this.joystick.active && this.joystick.x > 0.3) ||
      this.touchActions.right
    );

    const targetLeft = leftActive ? -0.55 : 0.4;
    const targetRight = rightActive ? 0.55 : -0.4;

    const prevLeft = this.leftFlipperAngle;
    this.leftFlipperAngle += (targetLeft - this.leftFlipperAngle) * 25 * dt;
    this.rightFlipperAngle += (targetRight - this.rightFlipperAngle) * 25 * dt;

    if (leftActive && Math.abs(prevLeft - targetLeft) > 0.2) {
      sound.playFlipper();
    }

    // Plunger charging
    const plungeActive = Boolean(
      this.keys['Space'] ||
      this.keys['ArrowDown'] ||
      (this.joystick && this.joystick.active && this.joystick.y > 0.4) ||
      this.touchActions.plunge
    );

    if (plungeActive) {
      this.isPlunging = true;
      this.plungerPower = Math.min(100, this.plungerPower + 220 * dt);
    } else if (this.isPlunging) {
      this.isPlunging = false;
      for (const b of this.balls) {
        if (b.x > this.width - 50 && b.y > this.height - 220) {
          b.vy = -Math.max(480, this.plungerPower * 9.5);
          sound.playLaser('fast');
        }
      }
      this.plungerPower = 0;
    }

    // Bumpers hitpulse animation
    for (const bm of this.bumpers) {
      if (bm.hitPulse > 0) bm.hitPulse -= dt * 4;
    }

    // Physics constants
    const gravity = 800;

    for (let i = this.balls.length - 1; i >= 0; i--) {
      const b = this.balls[i];
      b.vy += gravity * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      // Table walls
      const leftWall = 20;
      const rightWall = this.width - 20;
      const topWall = 30;

      if (b.y < topWall + b.radius) {
        b.y = topWall + b.radius;
        b.vy = Math.abs(b.vy) * 0.75;
        b.vx += (Math.random() - 0.5) * 80;
        sound.playPaddleBounce(0.3);
      }
      if (b.x < leftWall + b.radius) {
        b.x = leftWall + b.radius;
        b.vx = Math.abs(b.vx) * 0.75;
        sound.playPaddleBounce(0.1);
      }
      if (b.x > rightWall - b.radius) {
        b.x = rightWall - b.radius;
        b.vx = -Math.abs(b.vx) * 0.75;
        sound.playPaddleBounce(-0.1);
      }

      // Bumpers collision
      for (const bm of this.bumpers) {
        const dist = Math.hypot(b.x - bm.x, b.y - bm.y);
        if (dist < b.radius + bm.radius) {
          bm.hitPulse = 1;
          const nx = (b.x - bm.x) / dist;
          const ny = (b.y - bm.y) / dist;
          const impulse = 540;
          b.vx = nx * impulse;
          b.vy = ny * impulse;

          this.score += bm.points * this.multiplier;
          sound.playCombo(this.multiplier);
          if (this.particles && this.particles.burst) {
            this.particles.burst(bm.x, bm.y, 14, bm.color);
          }
        }
      }

      // Drop targets collision
      for (const t of this.dropTargets) {
        if (!t.hit && Math.hypot(b.x - t.x, b.y - t.y) < 20) {
          t.hit = true;
          b.vy = -b.vy * 0.7;
          this.score += 500 * this.multiplier;
          sound.playHit();
          if (this.particles && this.particles.burst) {
            this.particles.burst(t.x, t.y, 10, '#f59e0b');
          }

          if (this.dropTargets.every(target => target.hit)) {
            this.triggerMultiball();
          }
        }
      }

      // Flipper collisions
      this.resolveFlipperCollision(b, this.leftPivot, this.flipperLength, this.leftFlipperAngle, true);
      this.resolveFlipperCollision(b, this.rightPivot, this.flipperLength, this.rightFlipperAngle, false);

      // Ball drain
      if (b.y > this.height + 40) {
        this.balls.splice(i, 1);
      }
    }

    // Check ball drain
    if (this.balls.length === 0) {
      this.ballsRemaining--;
      this.multiballActive = false;
      this.multiplier = 1;
      sound.playBallLost();

      if (this.ballsRemaining <= 0) {
        this.isGameOver = true;
        this.isRunning = false;
        const pb = storage.getHighScore('cyberPinball') || 0;
        const isRecord = this.score > pb;
        if (isRecord) storage.saveHighScore('cyberPinball', this.score);
        this.creditsEarned += Math.floor(this.score / 200);
        storage.addCredits(this.creditsEarned);

        if (this.callbacks && this.callbacks.onGameOver) {
          this.callbacks.onGameOver({
            score: this.score,
            credits: this.creditsEarned,
            isRecord,
            multiball: this.multiballActive
          });
        }
      } else {
        this.spawnBall();
      }
    }

    if (this.callbacks && this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(
        this.score,
        this.ballsRemaining,
        this.multiplier,
        this.multiballActive ? 'MULTIBALL 3X' : 'STANDARD'
      );
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // Playfield table
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, this.width, this.height);

    // Outer neon rim
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 10;
    ctx.strokeRect(16, 20, this.width - 32, this.height - 40);

    // Shooter lane divider
    ctx.beginPath();
    ctx.moveTo(this.width - 48, 120);
    ctx.lineTo(this.width - 48, this.height - 20);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Bumpers
    for (const bm of this.bumpers) {
      ctx.fillStyle = bm.color;
      ctx.shadowColor = bm.color;
      ctx.shadowBlur = 14 + bm.hitPulse * 16;
      ctx.beginPath();
      ctx.arc(bm.x, bm.y, bm.radius + bm.hitPulse * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bm.x, bm.y, bm.radius * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // Draw Drop Targets
    for (const t of this.dropTargets) {
      ctx.fillStyle = t.hit ? '#334155' : '#f59e0b';
      ctx.shadowColor = t.hit ? 'transparent' : '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.fillRect(t.x - 12, t.y - 12, 24, 24);

      ctx.fillStyle = t.hit ? '#64748b' : '#000000';
      ctx.font = 'bold 14px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.letter, t.x, t.y);
    }
    ctx.shadowBlur = 0;

    // Draw Flippers
    this.renderFlipper(ctx, this.leftPivot, this.flipperLength, this.leftFlipperAngle, true);
    this.renderFlipper(ctx, this.rightPivot, this.flipperLength, this.rightFlipperAngle, false);

    // Draw Balls
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 12;
    for (const b of this.balls) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  renderFlipper(ctx, pivot, len, angle, isLeft) {
    const tipX = pivot.x + Math.cos(angle) * (isLeft ? len : -len);
    const tipY = pivot.y + Math.sin(angle) * len;

    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#ec4899';
    ctx.shadowBlur = 10;

    ctx.beginPath();
    ctx.moveTo(pivot.x, pivot.y);
    ctx.lineTo(tipX, tipY);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }
}
