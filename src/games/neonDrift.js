// NeonPulse Arcade - Neon Drift: Retro Cyber Highway Racer
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';

export class NeonDriftGame {
  constructor(canvas, particles, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particles;
    this.callbacks = callbacks;

    this.isRunning = false;
    this.isPaused = false;

    // Game State
    this.score = 0;
    this.distance = 0; // in meters
    this.speed = 0; // km/h
    this.baseSpeed = 160;
    this.maxNormalSpeed = 220;
    this.maxNitroSpeed = 340;
    this.acceleration = 120;
    this.deceleration = 80;

    // Player Car
    this.playerX = 0; // -1 (left shoulder) to +1 (right shoulder)
    this.playerY = 510;
    this.carWidth = 72;
    this.carHeight = 36;
    this.steerAngle = 0;
    this.hp = 100;
    this.maxHp = 100;

    // Nitro System
    this.nitro = 100;
    this.maxNitro = 100;
    this.isBoosting = false;

    // Drift System
    this.isDrifting = false;
    this.driftMultiplier = 1.0;
    this.driftScoreTimer = 0;

    // Road Projection & World
    this.horizonY = 220;
    this.roadSegments = [];
    this.trackPosition = 0;
    this.roadCurvature = 0;
    this.targetCurvature = 0;
    this.curveTimer = 0;

    // Traffic & Items
    this.traffic = [];
    this.trafficSpawnTimer = 0;
    this.pickups = [];
    this.pickupSpawnTimer = 0;

    // Floating Messages (e.g. NEAR MISS +150)
    this.floatingTexts = [];

    // Controls
    this.keys = {};
    this.touchSteer = 0;
    this.touchDrift = false;
    this.touchNitro = false;

    // Bind Event Listeners
    this.bindInputs();
  }

  bindInputs() {
    this.onKeyDown = (e) => {
      if (!this.isRunning) return;
      this.keys[e.code] = true;
      this.keys[e.key] = true;
    };

    this.onKeyUp = (e) => {
      this.keys[e.code] = false;
      this.keys[e.key] = false;
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);

    // Canvas Touch / Mouse controls
    this.onPointerDown = (e) => {
      if (!this.isRunning) return;
      this.updateTouchPosition(e);
    };

    this.onPointerMove = (e) => {
      if (!this.isRunning || e.buttons === 0) return;
      this.updateTouchPosition(e);
    };

    this.onPointerUp = () => {
      this.touchSteer = 0;
    };

    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
  }

  updateTouchPosition(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const clientX = (e.clientX - rect.left) * scaleX;
    // Map clientX (0 to 800) to playerX (-1.0 to 1.0)
    const norm = (clientX / this.canvas.width) * 2 - 1;
    this.touchSteer = Math.max(-1, Math.min(1, norm));
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.score = 0;
    this.distance = 0;
    this.speed = 100;
    this.playerX = 0;
    this.steerAngle = 0;
    this.hp = 100;
    this.maxHp = 100;
    this.nitro = 100;
    this.isBoosting = false;
    this.isDrifting = false;
    this.driftMultiplier = 1.0;
    this.traffic = [];
    this.pickups = [];
    this.floatingTexts = [];
    this.trackPosition = 0;
    this.roadCurvature = 0;
    this.targetCurvature = 0;
    this.curveTimer = 0;

    // Apply Cyber Lab Tech Tree upgrades
    const armorLvl = storage.getLabUpgradeLevel('armor');
    const batteryLvl = storage.getLabUpgradeLevel('battery');
    this.maxHp = 100 + armorLvl * 25;
    this.hp = this.maxHp;
    this.maxNitro = 100 + batteryLvl * 20;
    this.nitro = this.maxNitro;

    sound.announce('Ignition. Floor it!');
    this.updateHUD();
  }

  stop() {
    this.isRunning = false;
  }

  setTouchAction(action, active) {
    if (action === 'nitro') this.touchNitro = active;
    if (action === 'drift') this.touchDrift = active;
  }

  update(dt) {
    if (!this.isRunning || this.isPaused) return;

    // 1. Controls & Acceleration
    const wantsNitro = this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['Space'] || this.touchNitro;
    const wantsDrift = this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touchDrift;

    let targetSpeed = this.baseSpeed + Math.min(60, this.distance / 100);

    if (wantsNitro && this.nitro > 0) {
      this.isBoosting = true;
      targetSpeed = this.maxNitroSpeed;
      this.nitro = Math.max(0, this.nitro - dt * 28);
      this.particles.shake(2);

      // Nitro exhaust flames
      const trail = storage.getEquipped('trail') || 'cyan';
      const flameColor = trail === 'pink' ? '#ff007f' : trail === 'gold' ? '#ffd700' : '#00f0ff';
      this.particles.spawn(
        400 + this.playerX * 280 - 18,
        this.playerY + 28,
        (Math.random() - 0.5) * 40,
        150 + Math.random() * 80,
        flameColor,
        Math.random() * 5 + 4,
        0.3
      );
      this.particles.spawn(
        400 + this.playerX * 280 + 18,
        this.playerY + 28,
        (Math.random() - 0.5) * 40,
        150 + Math.random() * 80,
        flameColor,
        Math.random() * 5 + 4,
        0.3
      );
    } else {
      this.isBoosting = false;
      if (this.nitro < this.maxNitro) {
        // Slow nitro passive recharge
        this.nitro = Math.min(this.maxNitro, this.nitro + dt * 4);
      }
    }

    // Accelerate / Decelerate
    if (this.speed < targetSpeed) {
      this.speed = Math.min(targetSpeed, this.speed + this.acceleration * dt);
    } else {
      this.speed = Math.max(targetSpeed, this.speed - this.deceleration * dt);
    }

    // 2. Steering & Drifting
    let steerDir = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) steerDir -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) steerDir += 1;
    if (this.touchSteer !== 0) steerDir = this.touchSteer;

    this.isDrifting = wantsDrift && Math.abs(steerDir) > 0.2;

    const steerSpeed = (this.isDrifting ? 1.8 : 1.3) * (this.speed / 200);
    this.playerX += steerDir * steerSpeed * dt;

    // Road boundaries (-1.15 to +1.15)
    if (this.playerX < -1.05) {
      this.playerX = -1.05;
      this.speed = Math.max(100, this.speed - dt * 160); // Shoulder grass drag
      this.particles.shake(1.5);
    } else if (this.playerX > 1.05) {
      this.playerX = 1.05;
      this.speed = Math.max(100, this.speed - dt * 160);
      this.particles.shake(1.5);
    }

    // Car visual tilt
    const targetAngle = steerDir * (this.isDrifting ? 0.35 : 0.18);
    this.steerAngle += (targetAngle - this.steerAngle) * dt * 10;

    // Drift smoke & scoring
    if (this.isDrifting) {
      this.driftMultiplier = Math.min(4.0, this.driftMultiplier + dt * 0.8);
      this.score += Math.floor(dt * 80 * this.driftMultiplier);

      const carPx = 400 + this.playerX * 280;
      this.particles.spawn(
        carPx - 22,
        this.playerY + 22,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 30,
        'rgba(255, 255, 255, 0.4)',
        Math.random() * 6 + 3,
        0.4
      );
      this.particles.spawn(
        carPx + 22,
        this.playerY + 22,
        (Math.random() - 0.5) * 60,
        (Math.random() - 0.5) * 30,
        'rgba(255, 255, 255, 0.4)',
        Math.random() * 6 + 3,
        0.4
      );
    } else {
      this.driftMultiplier = Math.max(1.0, this.driftMultiplier - dt * 2);
    }

    // 3. Road Movement & Curves
    const speedRatio = this.speed / 100;
    this.trackPosition += speedRatio * dt * 80;
    this.distance += speedRatio * dt * 18;
    this.score += Math.floor(speedRatio * dt * 25);

    this.curveTimer -= dt;
    if (this.curveTimer <= 0) {
      this.curveTimer = Math.random() * 4 + 3;
      this.targetCurvature = (Math.random() - 0.5) * 1.8;
    }
    this.roadCurvature += (this.targetCurvature - this.roadCurvature) * dt * 0.8;
    this.playerX -= this.roadCurvature * dt * 0.4 * speedRatio; // Curve centripetal push

    // 4. Traffic Spawning & Movement
    this.trafficSpawnTimer -= dt;
    const spawnRate = Math.max(0.6, 1.8 - (this.distance / 2000));
    if (this.trafficSpawnTimer <= 0) {
      this.trafficSpawnTimer = spawnRate;
      this.spawnTrafficCar();
    }

    // Update Traffic
    for (let i = this.traffic.length - 1; i >= 0; i--) {
      const car = this.traffic[i];
      // Move relative to player speed
      const relSpeed = this.speed - car.speed;
      car.z -= relSpeed * dt * 1.8;

      // Collision check with player
      if (car.z > 0 && car.z < 28 && !car.passed) {
        const lateralDist = Math.abs(car.lane - this.playerX);
        if (lateralDist < 0.28) {
          // Crash!
          this.handleCrash(car);
          this.traffic.splice(i, 1);
          continue;
        } else if (lateralDist < 0.52 && !car.nearMissTriggered) {
          // NEAR MISS!
          car.nearMissTriggered = true;
          this.handleNearMiss(car);
        }
      }

      if (car.z <= 0) {
        car.passed = true;
      }

      // Remove far behind or far ahead
      if (car.z < -30 || car.z > 1200) {
        this.traffic.splice(i, 1);
      }
    }

    // 5. Pickups Spawning & Movement
    this.pickupSpawnTimer -= dt;
    if (this.pickupSpawnTimer <= 0) {
      this.pickupSpawnTimer = Math.random() * 4 + 3;
      this.spawnPickup();
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.z -= this.speed * dt * 1.8;

      if (p.z > 0 && p.z < 35) {
        const lateralDist = Math.abs(p.lane - this.playerX);
        if (lateralDist < 0.32) {
          this.collectPickup(p);
          this.pickups.splice(i, 1);
          continue;
        }
      }

      if (p.z < -20) {
        this.pickups.splice(i, 1);
      }
    }

    // 6. Floating Texts Update
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= dt * 45;
      ft.life -= dt;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Check achievement: Speed Demon
    if (this.speed >= 250) {
      storage.unlockAchievement('speed_demon');
    }

    this.updateHUD();
  }

  spawnTrafficCar() {
    const lanes = [-0.7, 0, 0.7];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const types = [
      { name: 'sedan', speed: Math.random() * 30 + 80, color: '#ffe600' },
      { name: 'police', speed: Math.random() * 20 + 110, color: '#ff007f' },
      { name: 'truck', speed: Math.random() * 20 + 60, color: '#00f0ff' }
    ];
    const chosen = types[Math.floor(Math.random() * types.length)];

    this.traffic.push({
      lane,
      z: 750 + Math.random() * 200,
      speed: chosen.speed,
      color: chosen.color,
      type: chosen.name,
      passed: false,
      nearMissTriggered: false
    });
  }

  spawnPickup() {
    const lanes = [-0.7, 0, 0.7];
    const lane = lanes[Math.floor(Math.random() * lanes.length)];
    const isNitro = Math.random() > 0.4;

    this.pickups.push({
      lane,
      z: 800,
      type: isNitro ? 'nitro' : 'credits',
      icon: isNitro ? '⚡' : '💎'
    });
  }

  collectPickup(p) {
    if (p.type === 'nitro') {
      this.nitro = Math.min(this.maxNitro, this.nitro + 45);
      sound.play('powerup');
      this.addFloatingText('+NITRO BOOST', 400 + this.playerX * 280, this.playerY - 20, '#00f0ff');
    } else {
      const creds = 15;
      storage.addCredits(creds);
      sound.play('pickup');
      this.score += 250;
      this.addFloatingText(`+${creds} CREDITS`, 400 + this.playerX * 280, this.playerY - 20, '#ffd700');
    }
  }

  handleNearMiss(car) {
    sound.play('laser');
    const pts = Math.floor(150 * (this.speed / 150));
    this.score += pts;
    storage.addCredits(2);
    this.particles.shake(3);
    this.addFloatingText(`NEAR MISS! +${pts}`, 400 + this.playerX * 280, this.playerY - 30, '#ffd700');
    sound.announce('Nice drift!');
  }

  handleCrash(car) {
    sound.play('explosion');
    this.particles.shake(12);
    this.speed = Math.max(40, this.speed * 0.4);

    const dmg = car.type === 'truck' ? 40 : 25;
    this.hp = Math.max(0, this.hp - dmg);

    // Spawn collision sparks
    const carPx = 400 + this.playerX * 280;
    this.particles.explode(carPx, this.playerY, '#ff007f', 35);
    this.particles.explode(carPx, this.playerY, '#ffd700', 20);

    this.addFloatingText(`CRASH! -${dmg} HP`, carPx, this.playerY - 40, '#ff0055');

    if (this.hp <= 0) {
      this.triggerGameOver();
    }
  }

  triggerGameOver() {
    this.isRunning = false;
    sound.play('gameover');
    sound.announce('System offline. Totaled.');

    const distMeters = Math.floor(this.distance);
    const creditsEarned = Math.floor(this.score / 60) + Math.floor(distMeters / 50);
    storage.addCredits(creditsEarned);
    storage.saveHighScore('neonDrift', this.score);

    // Achievements
    if (distMeters >= 3000) {
      storage.unlockAchievement('highway_legend');
    }

    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver({
        score: this.score,
        distance: distMeters,
        credits: creditsEarned
      });
    }
  }

  addFloatingText(text, x, y, color) {
    this.floatingTexts.push({
      text,
      x,
      y,
      color,
      life: 0.85
    });
  }

  updateHUD() {
    if (this.callbacks.onScoreUpdate) {
      this.callbacks.onScoreUpdate(
        this.score,
        Math.floor(this.distance),
        Math.round(this.speed),
        Math.round((this.nitro / this.maxNitro) * 100),
        Math.round(this.hp),
        this.maxHp
      );
    }
  }

  draw() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;

    // 1. Clear background
    ctx.fillStyle = '#060714';
    ctx.fillRect(0, 0, w, h);

    // 2. Horizon Skyline & Neon Sun
    this.drawHorizon(ctx, w, h);

    // 3. Pseudo-3D Perspective Road
    this.drawRoad(ctx, w, h);

    // 4. Traffic & Pickups
    this.drawWorldEntities(ctx, w, h);

    // 5. Player Supercar
    this.drawPlayerCar(ctx);

    // 6. Floating Callout Texts
    this.drawFloatingTexts(ctx);

    // 7. Nitro Speed Blur Overlay
    if (this.isBoosting) {
      this.drawNitroSpeedLines(ctx, w, h);
    }
  }

  drawHorizon(ctx, w, h) {
    const horizY = this.horizonY;

    // Dark sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizY);
    skyGrad.addColorStop(0, '#04040d');
    skyGrad.addColorStop(0.7, '#160829');
    skyGrad.addColorStop(1, '#3d0c4e');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, horizY);

    // Retro Neon Synth Sun
    const sunX = w / 2 + this.roadCurvature * 60;
    const sunY = horizY - 30;
    const sunR = 75;

    const sunGrad = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, sunR);
    sunGrad.addColorStop(0, '#fffa80');
    sunGrad.addColorStop(0.4, '#ff007f');
    sunGrad.addColorStop(1, 'rgba(255, 0, 128, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, Math.PI, 0, false);
    ctx.fill();

    // Sun horizontal blind stripes
    ctx.fillStyle = '#160829';
    for (let i = 0; i < 6; i++) {
      const stripeY = sunY - 45 + i * 9;
      const stripeH = 2 + i * 0.8;
      ctx.fillRect(sunX - sunR, stripeY, sunR * 2, stripeH);
    }

    // Tokyo 2099 Cyber Skyline Silhouettes
    ctx.fillStyle = '#0d0b1f';
    const cityOffset = (this.trackPosition * 0.15) % 160;
    for (let x = -80; x < w + 80; x += 40) {
      const buildingH = 30 + ((Math.sin(x * 12.3) + 1) * 35);
      ctx.fillRect(x - cityOffset, horizY - buildingH, 36, buildingH);

      // Building neon window grids
      ctx.fillStyle = Math.sin(x) > 0 ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255, 0, 128, 0.4)';
      ctx.fillRect(x - cityOffset + 6, horizY - buildingH + 8, 4, 4);
      ctx.fillRect(x - cityOffset + 18, horizY - buildingH + 16, 4, 4);
      ctx.fillStyle = '#0d0b1f';
    }

    // Horizon glowing boundary line
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, horizY);
    ctx.lineTo(w, horizY);
    ctx.stroke();
  }

  drawRoad(ctx, w, h) {
    const horizY = this.horizonY;
    const roadH = h - horizY;
    const slices = 80;

    for (let i = slices; i >= 0; i--) {
      const p1 = i / slices;
      const p2 = (i + 1) / slices;

      const y1 = horizY + Math.pow(p1, 2.2) * roadH;
      const y2 = horizY + Math.pow(p2, 2.2) * roadH;

      // Perspective widths
      const roadW1 = 50 + Math.pow(p1, 2.2) * 680;
      const roadW2 = 50 + Math.pow(p2, 2.2) * 680;

      // Center offsets based on road curvature
      const curveX1 = (w / 2) + Math.pow(1 - p1, 1.8) * this.roadCurvature * 180;
      const curveX2 = (w / 2) + Math.pow(1 - p2, 1.8) * this.roadCurvature * 180;

      // Segment stripe color (alternating every 4 track units)
      const isAlt = Math.floor((this.trackPosition + i * 2) / 4) % 2 === 0;

      // Ground / Grass on shoulders
      ctx.fillStyle = isAlt ? '#0b0c1c' : '#080916';
      ctx.fillRect(0, y1, w, y2 - y1 + 1);

      // Cyber Road Asphalt
      ctx.fillStyle = isAlt ? '#16192e' : '#111324';
      ctx.beginPath();
      ctx.moveTo(curveX1 - roadW1 / 2, y1);
      ctx.lineTo(curveX1 + roadW1 / 2, y1);
      ctx.lineTo(curveX2 + roadW2 / 2, y2);
      ctx.lineTo(curveX2 - roadW2 / 2, y2);
      ctx.closePath();
      ctx.fill();

      // Glowing Neon Curbs (Cyan & Magenta)
      const curbW1 = roadW1 * 0.05;
      const curbW2 = roadW2 * 0.05;

      // Left curb
      ctx.fillStyle = isAlt ? '#00f0ff' : '#ff007f';
      ctx.beginPath();
      ctx.moveTo(curveX1 - roadW1 / 2, y1);
      ctx.lineTo(curveX1 - roadW1 / 2 + curbW1, y1);
      ctx.lineTo(curveX2 - roadW2 / 2 + curbW2, y2);
      ctx.lineTo(curveX2 - roadW2 / 2, y2);
      ctx.closePath();
      ctx.fill();

      // Right curb
      ctx.fillStyle = isAlt ? '#ff007f' : '#00f0ff';
      ctx.beginPath();
      ctx.moveTo(curveX1 + roadW1 / 2 - curbW1, y1);
      ctx.lineTo(curveX1 + roadW1 / 2, y1);
      ctx.lineTo(curveX2 + roadW2 / 2, y2);
      ctx.lineTo(curveX2 + roadW2 / 2 - curbW2, y2);
      ctx.closePath();
      ctx.fill();

      // Lane divider dashes
      if (isAlt) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const laneOffset1 = roadW1 * 0.28;
        const laneOffset2 = roadW2 * 0.28;
        const dashW1 = Math.max(1.5, roadW1 * 0.012);
        const dashW2 = Math.max(1.5, roadW2 * 0.012);

        // Left divider
        ctx.beginPath();
        ctx.moveTo(curveX1 - laneOffset1 - dashW1 / 2, y1);
        ctx.lineTo(curveX1 - laneOffset1 + dashW1 / 2, y1);
        ctx.lineTo(curveX2 - laneOffset2 + dashW2 / 2, y2);
        ctx.lineTo(curveX2 - laneOffset2 - dashW2 / 2, y2);
        ctx.fill();

        // Right divider
        ctx.beginPath();
        ctx.moveTo(curveX1 + laneOffset1 - dashW1 / 2, y1);
        ctx.lineTo(curveX1 + laneOffset1 + dashW1 / 2, y1);
        ctx.lineTo(curveX2 + laneOffset2 + dashW2 / 2, y2);
        ctx.lineTo(curveX2 + laneOffset2 - dashW2 / 2, y2);
        ctx.fill();
      }
    }
  }

  projectZ(z, lane) {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const horizY = this.horizonY;
    const roadH = h - horizY;

    // Normalizing z (0 = closest at y=510, 800 = horizon at y=horizY)
    const normP = Math.max(0, Math.min(1, 1 - (z / 800)));
    const y = horizY + Math.pow(normP, 2.2) * roadH;

    const roadW = 50 + Math.pow(normP, 2.2) * 680;
    const curveX = (w / 2) + Math.pow(1 - normP, 1.8) * this.roadCurvature * 180;
    const x = curveX + lane * (roadW * 0.42);
    const scale = Math.pow(normP, 1.8);

    return { x, y, scale };
  }

  drawWorldEntities(ctx, w, h) {
    // Combine traffic and pickups, sort back-to-front by z
    const entities = [
      ...this.traffic.map(t => ({ ...t, isCar: true })),
      ...this.pickups.map(p => ({ ...p, isPickup: true }))
    ].sort((a, b) => b.z - a.z);

    for (const ent of entities) {
      if (ent.z <= 0 || ent.z > 800) continue;
      const proj = this.projectZ(ent.z, ent.lane);

      if (ent.isCar) {
        this.drawTrafficCar(ctx, proj.x, proj.y, proj.scale, ent);
      } else if (ent.isPickup) {
        this.drawPickup(ctx, proj.x, proj.y, proj.scale, ent);
      }
    }
  }

  drawTrafficCar(ctx, x, y, scale, car) {
    const carW = 68 * scale;
    const carH = 32 * scale;
    if (carW < 4) return;

    ctx.save();
    ctx.translate(x, y);

    // Car shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.ellipse(0, carH * 0.45, carW * 0.55, carH * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Car Body
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-carW / 2, -carH / 2, carW, carH, 6 * scale);
    ctx.fill();

    // Cabin Roof
    ctx.fillStyle = '#0a0a14';
    ctx.beginPath();
    ctx.roundRect(-carW * 0.35, -carH * 0.45, carW * 0.7, carH * 0.6, 4 * scale);
    ctx.fill();

    // Rear Lights
    ctx.fillStyle = '#ff0033';
    ctx.fillRect(-carW * 0.42, carH * 0.15, carW * 0.2, carH * 0.22);
    ctx.fillRect(carW * 0.22, carH * 0.15, carW * 0.2, carH * 0.22);

    ctx.restore();
  }

  drawPickup(ctx, x, y, scale, p) {
    const size = 32 * scale;
    if (size < 4) return;

    ctx.save();
    ctx.translate(x, y);

    const glowColor = p.type === 'nitro' ? '#00f0ff' : '#ffd700';
    ctx.fillStyle = glowColor;
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 10 * scale;

    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${Math.max(8, Math.floor(18 * scale))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000';
    ctx.fillText(p.icon, 0, 0);

    ctx.restore();
  }

  drawPlayerCar(ctx) {
    const x = 400 + this.playerX * 280;
    const y = this.playerY;
    const w = this.carWidth;
    const h = this.carHeight;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(this.steerAngle);

    // Car Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.ellipse(0, h * 0.45, w * 0.6, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    // Headlight Beams illuminating the road
    const beamGrad = ctx.createLinearGradient(0, 0, 0, -180);
    beamGrad.addColorStop(0, 'rgba(0, 240, 255, 0.35)');
    beamGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-w * 0.35, -h * 0.2);
    ctx.lineTo(-w * 0.9, -170);
    ctx.lineTo(w * 0.9, -170);
    ctx.lineTo(w * 0.35, -h * 0.2);
    ctx.closePath();
    ctx.fill();

    // Lower Chassis
    ctx.fillStyle = '#0d0d1a';
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 8);
    ctx.fill();

    // Sleek Sports Body Panel
    const trail = storage.getEquipped('trail') || 'cyan';
    const bodyColor = trail === 'pink' ? '#ff007f' : trail === 'gold' ? '#ffd700' : '#00f0ff';
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.roundRect(-w * 0.46, -h * 0.38, w * 0.92, h * 0.72, 6);
    ctx.fill();

    // Aerodynamic Cockpit Glass
    ctx.fillStyle = '#06060f';
    ctx.beginPath();
    ctx.roundRect(-w * 0.32, -h * 0.38, w * 0.64, h * 0.5, 4);
    ctx.fill();

    // Neon Cyber Rear Light Bar
    ctx.fillStyle = '#ff0055';
    ctx.shadowColor = '#ff0055';
    ctx.shadowBlur = 12;
    ctx.fillRect(-w * 0.4, h * 0.2, w * 0.8, 5);

    // Twin Exhaust Ports
    ctx.fillStyle = '#222';
    ctx.fillRect(-w * 0.28, h * 0.32, 8, 4);
    ctx.fillRect(w * 0.28 - 8, h * 0.32, 8, 4);

    ctx.restore();
  }

  drawFloatingTexts(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Outfit", sans-serif';

    for (const ft of this.floatingTexts) {
      ctx.fillStyle = ft.color;
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = Math.max(0, ft.life / 0.85);
      ctx.fillText(ft.text, ft.x, ft.y);
    }
    ctx.restore();
  }

  drawNitroSpeedLines(ctx, w, h) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;

    for (let i = 0; i < 16; i++) {
      const sx = Math.random() * w;
      const sy = this.horizonY + Math.random() * (h - this.horizonY);
      const len = 30 + Math.random() * 60;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + (sx - w / 2) * 0.15, sy + len);
      ctx.stroke();
    }
    ctx.restore();
  }
}
