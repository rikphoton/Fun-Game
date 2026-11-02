// Synth Blade: 4-Lane Rhythm Beat Slasher Synced to Procedural Synthwave Drops
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';

export class SynthBladeGame {
  constructor(canvas, particleSystem, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particleSystem;
    this.callbacks = callbacks;

    this.width = 600;
    this.height = 700;

    this.reset();
  }

  setDimensions(width, height) {
    this.width = width;
    this.height = height;
    this.laneWidth = Math.min(110, (this.width - 40) / 4);
    this.startX = (this.width - this.laneWidth * 4) / 2;
    this.hitLineY = this.height - 110;
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.multiplier = 1;
    this.feverMode = false;
    this.feverTimer = 0;
    this.creditsEarned = 0;
    this.isGameOver = false;

    const hullBonus = storage.getLabBonus ? storage.getLabBonus('hull') : 0;
    this.maxHealth = 100 + hullBonus;
    this.health = this.maxHealth;

    this.laneWidth = Math.min(110, (this.width - 40) / 4);
    this.startX = (this.width - this.laneWidth * 4) / 2;
    this.hitLineY = this.height - 110;
    this.noteSpeed = 380;

    this.notes = [];
    this.floatingRatings = [];
    this.spawnTimer = 0;
    this.beatStep = 0;

    this.lanePressed = [false, false, false, false];
    this.prevLanePressed = [false, false, false, false];
    this.keys = {};
    this.joystick = { x: 0, y: 0, active: false };
    this.touchLanes = [false, false, false, false];
  }

  init() {
    this.reset();
    this.isRunning = true;
    sound.startBgm('synthBlade');
    sound.announce('Synth Blade. Strike to the rhythm!');
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
    this.notes = [];
    this.floatingRatings = [];
  }

  handleInput(keys, touchState) {
    if (keys) this.keys = keys;
    if (touchState) {
      if (touchState.touchLanes) this.touchLanes = touchState.touchLanes;
      if (touchState.joystick) this.joystick = touchState.joystick;
    }
  }

  update(dt) {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    if (this.feverMode) {
      this.feverTimer -= dt;
      if (this.feverTimer <= 0) {
        this.feverMode = false;
        sound.announce('Fever Mode Complete');
      }
    }

    // 4 Lane inputs: [D/Left, F/Down, J/Up, K/Right]
    const currentKeys = [
      Boolean(this.keys['KeyD'] || this.keys['ArrowLeft'] || this.touchLanes[0] || (this.joystick.active && this.joystick.x < -0.4)),
      Boolean(this.keys['KeyF'] || this.keys['ArrowDown'] || this.touchLanes[1] || (this.joystick.active && this.joystick.y > 0.4)),
      Boolean(this.keys['KeyJ'] || this.keys['ArrowUp'] || this.touchLanes[2] || (this.joystick.active && this.joystick.y < -0.4)),
      Boolean(this.keys['KeyK'] || this.keys['ArrowRight'] || this.touchLanes[3] || (this.joystick.active && this.joystick.x > 0.4))
    ];

    for (let l = 0; l < 4; l++) {
      if (currentKeys[l] && !this.prevLanePressed[l]) {
        this.hitLane(l);
      }
      this.lanePressed[l] = currentKeys[l];
      this.prevLanePressed[l] = currentKeys[l];
    }

    // Spawn notes in sync with beat
    this.spawnTimer += dt;
    const beatInterval = 0.44;
    if (this.spawnTimer >= beatInterval) {
      this.spawnTimer = 0;
      this.beatStep++;

      const pattern = [0, 1, 2, 3, 1, 2, 0, 3, 2, 1, 3, 0];
      const lane = pattern[this.beatStep % pattern.length];
      this.notes.push({
        lane,
        y: -30,
        hit: false,
        missed: false
      });

      if (this.beatStep % 4 === 0 && Math.random() < 0.4) {
        const lane2 = (lane + 2) % 4;
        this.notes.push({ lane: lane2, y: -30, hit: false, missed: false });
      }
    }

    // Update notes
    for (let i = this.notes.length - 1; i >= 0; i--) {
      const n = this.notes[i];
      n.y += this.noteSpeed * dt;

      // Miss check
      if (!n.hit && !n.missed && n.y > this.hitLineY + 50) {
        n.missed = true;
        this.combo = 0;
        this.multiplier = 1;
        this.health -= 15;
        this.showRating('MISS', '#ef4444', this.startX + n.lane * this.laneWidth + this.laneWidth / 2);
        sound.playHit();

        if (this.health <= 0) {
          this.isGameOver = true;
          this.isRunning = false;
          sound.playGameOver();
          const pb = storage.getHighScore('synthBlade') || 0;
          const isRecord = this.score > pb;
          if (isRecord) storage.saveHighScore('synthBlade', this.score);
          this.creditsEarned += Math.floor(this.score / 250);
          storage.addCredits(this.creditsEarned);

          if (this.callbacks && this.callbacks.onGameOver) {
            this.callbacks.onGameOver({
              score: this.score,
              credits: this.creditsEarned,
              maxCombo: this.maxCombo,
              isRecord
            });
          }
        }
      }

      if (n.y > this.height + 40) {
        this.notes.splice(i, 1);
      }
    }

    // Update floating ratings
    for (let i = this.floatingRatings.length - 1; i >= 0; i--) {
      const r = this.floatingRatings[i];
      r.y -= 45 * dt;
      r.life -= dt;
      if (r.life <= 0) this.floatingRatings.splice(i, 1);
    }

    if (this.callbacks && this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(
        this.score,
        this.combo,
        Math.max(0, this.health),
        this.maxHealth
      );
    }
  }

  hitLane(lane) {
    let closestNote = null;
    let minDist = 80;

    for (const n of this.notes) {
      if (n.lane === lane && !n.hit && !n.missed) {
        const dist = Math.abs(n.y - this.hitLineY);
        if (dist < minDist) {
          minDist = dist;
          closestNote = n;
        }
      }
    }

    const noteX = this.startX + lane * this.laneWidth + this.laneWidth / 2;

    if (closestNote) {
      closestNote.hit = true;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.health = Math.min(this.maxHealth, this.health + 3);

      if (this.combo >= 20 && !this.feverMode) {
        this.feverMode = true;
        this.feverTimer = 10;
        sound.playPowerup();
        sound.announce('Fever Mode! 4x Multiplier!');
        if (this.particles && this.particles.burst) {
          this.particles.burst(noteX, this.hitLineY, 30, '#facc15');
        }
      }

      if (minDist < 18) {
        // PERFECT!
        this.multiplier = Math.min(4, Math.floor(this.combo / 5) + 1);
        const pts = 200 * (this.feverMode ? 2 : 1) * this.multiplier;
        this.score += pts;
        this.showRating('PERFECT +200', '#22c55e', noteX);
        sound.playCombo(this.multiplier);
        if (this.particles && this.particles.burst) {
          this.particles.burst(noteX, this.hitLineY, 16, '#22c55e');
        }
      } else {
        // GREAT!
        this.multiplier = Math.min(3, Math.floor(this.combo / 6) + 1);
        const pts = 100 * (this.feverMode ? 2 : 1) * this.multiplier;
        this.score += pts;
        this.showRating('GREAT +100', '#38bdf8', noteX);
        sound.playLaser('fast');
        if (this.particles && this.particles.burst) {
          this.particles.burst(noteX, this.hitLineY, 10, '#38bdf8');
        }
      }
      this.creditsEarned += 1;
    } else {
      if (this.particles && this.particles.burst) {
        this.particles.burst(noteX, this.hitLineY, 3, '#64748b');
      }
    }
  }

  showRating(text, color, x) {
    this.floatingRatings.push({
      text,
      color,
      x,
      y: this.hitLineY - 30,
      life: 0.6
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.fillStyle = '#060913';
    ctx.fillRect(0, 0, this.width, this.height);

    const laneColors = ['#00f3ff', '#ec4899', '#ffe600', '#10b981'];

    // Render 4 Lanes
    for (let i = 0; i < 4; i++) {
      const lx = this.startX + i * this.laneWidth;

      ctx.fillStyle = this.lanePressed[i] ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.4)';
      ctx.fillRect(lx, 0, this.laneWidth, this.height);

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, this.height);
      ctx.stroke();

      ctx.fillStyle = '#64748b';
      ctx.font = 'bold 16px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      const keyLabels = ['D', 'F', 'J', 'K'];
      ctx.fillText(keyLabels[i], lx + this.laneWidth / 2, this.height - 30);
    }

    // Outer lane border
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.strokeRect(this.startX, 0, this.laneWidth * 4, this.height);

    // Hit Line Target
    ctx.strokeStyle = this.feverMode ? '#facc15' : '#a855f7';
    ctx.lineWidth = 4;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(this.startX, this.hitLineY);
    ctx.lineTo(this.startX + this.laneWidth * 4, this.hitLineY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Render Notes
    for (const n of this.notes) {
      if (n.hit) continue;
      const nx = this.startX + n.lane * this.laneWidth + 8;
      const nw = this.laneWidth - 16;
      const color = laneColors[n.lane];

      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillRect(nx, n.y - 10, nw, 20);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(nx + 6, n.y - 4, nw - 12, 8);
    }
    ctx.shadowBlur = 0;

    // Render Floating Evaluation Ratings
    for (const r of this.floatingRatings) {
      ctx.fillStyle = r.color;
      ctx.font = 'bold 18px Orbitron, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(r.text, r.x, r.y);
    }
  }
}
