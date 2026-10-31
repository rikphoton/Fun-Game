// Cyber Survivors: Arena Roguelite with Mech Classes, Ultimate Super Abilities & Custom Trails
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';

export class CyberSurvivorsGame {
  constructor(canvas, particleSystem, callbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = particleSystem;
    this.callbacks = callbacks; // { onGameOver, onScoreUpdate, onLevelUpChoice }

    this.width = 800;
    this.height = 600;
    this.mechClass = 'specter';

    this.reset();
  }

  setMechClass(mech) {
    this.mechClass = mech;
  }

  reset(customSeed = null) {
    this.isRunning = false;
    this.joystick = { x: 0, y: 0 };
    this.isPaused = false;
    this.gameTime = 0;
    this.score = 0;
    this.kills = 0;

    // Seeded PRNG for reproducible daily challenges & replays
    if (customSeed !== null && customSeed !== undefined) {
      this.seed = Number(customSeed) >>> 0;
      this._seedState = this.seed;
      this.prng = () => {
        let t = (this._seedState += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    } else {
      this.seed = null;
      this.prng = Math.random;
    }

    // Super Meter (0 to 100%)
    this.superCharge = 0;
    this.superMax = 100;
    this.superReady = false;

    // Base Player Stats
    let speed = 210;
    let maxHp = 100;
    let blasterLevel = 1;
    let orbsCount = 0;
    let lightningLevel = 0;
    let color = '#00f3ff';

    if (this.mechClass === 'specter') {
      speed = 250;
      orbsCount = 2;
      color = '#00f3ff';
    } else if (this.mechClass === 'vanguard') {
      maxHp = 150;
      blasterLevel = 2;
      speed = 190;
      color = '#ffe600';
    } else if (this.mechClass === 'stormweaver') {
      lightningLevel = 1;
      speed = 220;
      color = '#a855f7';
    }

    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      radius: 14,
      color,
      maxHp,
      hp: maxHp,
      speed,
      level: 1,
      xp: 0,
      xpToNextLevel: 15,
      invulnerableTimer: 0,
      magnetRange: 95,

      // Weapons
      blasterLevel,
      blasterCooldown: this.mechClass === 'stormweaver' ? 0.3 : 0.35,
      blasterTimer: 0,

      orbsCount,
      orbsAngle: 0,
      orbsSpeed: 3.2,
      orbsDamage: 26,

      lightningLevel,
      lightningTimer: 0,
      lightningCooldown: 2.5,

      frostLevel: 0,
      frostTimer: 0,
      frostCooldown: 3.5,

      railgunLevel: 0,
      railgunTimer: 0,
      railgunCooldown: 2.2,

      shieldActive: false,
      shieldLevel: 0,
      shieldTimer: 0,
      shieldCooldown: 6.0,
      shieldMaxHp: 40,
      shieldHp: 0
    };

    this.enemies = [];
    this.bullets = [];
    this.gems = [];
    this.pickups = [];
    this.railgunBeams = [];

    this.spawnTimer = 0;
    this.spawnInterval = 1.0;
    this.bossSpawned = false;

    this.keys = {};
    this.pointer = { x: this.width / 2, y: this.height / 2, active: false };
  }

  init(mechClass = 'specter', customSeed = null) {
    this.mechClass = mechClass;
    this.reset(customSeed);
    this.isRunning = true;
    sound.startBgm(storage.getSetting('bgmTrack') || 'synthwave');
  }

  start(mechClass, customSeed = null) {
    this.init(mechClass, customSeed);
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  destroy() {
    this.isRunning = false;
  }

  triggerSuperAbility() {
    if (this.superCharge < this.superMax || !this.isRunning || this.isPaused) return;

    this.superCharge = 0;
    this.superReady = false;

    sound.playSuperNova();
    this.particles.shake(18, 0.5);
    this.particles.addShockwave(this.player.x, this.player.y, '#ffe600', 450, 0.45);
    this.particles.addFloatingText('⚡ SUPER NOVA EMP! ⚡', this.player.x, this.player.y - 35, {
      color: '#ffe600',
      size: 24,
      duration: 1.5
    });

    // Clear enemy bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (this.bullets[i].isEnemy) {
        this.bullets.splice(i, 1);
      }
    }

    // Freeze and damage all enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.frozenTimer = 2.0; // Stun
      this.hitEnemy(e, i, 250);
    }
  }

  handleKeyDown(code) {
    this.keys[code] = true;
    if (code === 'Space') {
      this.triggerSuperAbility();
    }
  }

  handleKeyUp(code) {
    this.keys[code] = false;
  }

  handlePointerMove(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
  }

  handlePointerDown(x, y) {
    this.pointer.x = x;
    this.pointer.y = y;
    this.pointer.active = true;
  }

  handlePointerUp() {
    this.pointer.active = false;
  }

  update(dt) {
    if (!this.isRunning || this.isPaused) return;

    this.gameTime += dt;
    this.score = Math.floor(this.gameTime * 25 + this.kills * 40);

    for (let i = this.railgunBeams.length - 1; i >= 0; i--) {
      this.railgunBeams[i].life -= dt;
      if (this.railgunBeams[i].life <= 0) {
        this.railgunBeams.splice(i, 1);
      }
    }

    // Report super charge %
    this.callbacks.onScoreUpdate(
      this.score,
      this.player.level,
      this.player.hp,
      this.player.maxHp,
      Math.floor((this.superCharge / this.superMax) * 100)
    );

    this.spawnInterval = Math.max(0.24, 1.1 - (this.gameTime / 90) * 0.7);

    // 1. Movement
    let dx = 0;
    let dy = 0;
    if (this.joystick && (this.joystick.x !== 0 || this.joystick.y !== 0)) {
      dx = this.joystick.x;
      dy = this.joystick.y;
    } else {
      if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
      if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
      if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
      if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    }

    if (this.pointer.active && (!this.joystick || (this.joystick.x === 0 && this.joystick.y === 0))) {
      const pdx = this.pointer.x - this.player.x;
      const pdy = this.pointer.y - this.player.y;
      const dsq = pdx * pdx + pdy * pdy;
      if (dsq > 144) {
        const dist = Math.sqrt(dsq);
        dx = pdx / dist;
        dy = pdy / dist;
      }
    }

    const joyMag = Math.hypot(dx, dy);
    if (joyMag > 1) {
      dx /= joyMag;
      dy /= joyMag;
    }

    this.player.x += dx * this.player.speed * dt;
    this.player.y += dy * this.player.speed * dt;

    // Boundaries
    const margin = this.player.radius + 4;
    this.player.x = Math.max(margin, Math.min(this.width - margin, this.player.x));
    this.player.y = Math.max(margin, Math.min(this.height - margin, this.player.y));

    // Custom Particle Trail from Armory
    if (dx !== 0 || dy !== 0) {
      if (Math.random() < 0.35) {
        const equippedTrail = storage.getEquipped('trail') || 'cyan';
        let trailColor = '#00f3ff';
        if (equippedTrail === 'rainbow') {
          const colors = ['#ff0055', '#ffe600', '#00ff88', '#00f3ff', '#a855f7'];
          trailColor = colors[Math.floor(Math.random() * colors.length)];
        } else if (equippedTrail === 'gold') {
          trailColor = '#ffe600';
        } else if (equippedTrail === 'neon_pink') {
          trailColor = '#ff007b';
        }

        if (this.particles && Array.isArray(this.particles.particles)) {
          this.particles.particles.push({
            x: this.player.x - dx * 10,
            y: this.player.y - dy * 10,
            vx: -dx * 30 + (Math.random() * 16 - 8),
            vy: -dy * 30 + (Math.random() * 16 - 8),
            size: 3,
            color: trailColor,
            maxLife: 0.22,
            life: 0.22,
            friction: 0.9
          });
        }
      }
    }

    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }

    // Shield Recharge
    if (this.player.shieldLevel > 0 && this.player.shieldHp < this.player.shieldMaxHp) {
      this.player.shieldTimer += dt;
      if (this.player.shieldTimer >= this.player.shieldCooldown) {
        this.player.shieldHp = this.player.shieldMaxHp;
        this.player.shieldTimer = 0;
        this.particles.addShockwave(this.player.x, this.player.y, '#00ffcc', 30, 0.2);
        sound.playPowerup();
      }
    }

    // Weapons
    this.updateWeapons(dt);

    // Spawning
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval && this.enemies.length < 50) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    if (this.gameTime >= 60 && !this.bossSpawned) {
      this.bossSpawned = true;
      this.spawnBoss();
      this.particles.shake(10, 0.4);
      this.particles.addFloatingText('⚠️ DREADNOUGHT ARRIVAL ⚠️', this.width / 2, 100, { color: '#ff0055', size: 22 });
    }

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      // Frozen state from EMP
      if (e.frozenTimer > 0) {
        e.frozenTimer -= dt;
        continue;
      }

      const edx = this.player.x - e.x;
      const edy = this.player.y - e.y;
      const dsq = edx * edx + edy * edy;

      if (dsq > 0) {
        const dist = Math.sqrt(dsq);
        let moveAngle = Math.atan2(edy, edx);

        // Advanced AI: Pincer flanking for rushers, cloaking dash for phantoms
        if (e.type === 'rusher') {
          // Arc around player's flanks
          const flankOffset = Math.sin(this.gameTime * 2.5 + i) * 0.45;
          moveAngle += flankOffset;
        } else if (e.type === 'phantom') {
          // Stealth cloaking & burst dash when within range
          if (dist < 180) {
            e.isDashing = true;
            e.alpha = 1.0;
            e.currentSpeed = e.speed * 1.5;
          } else {
            e.isDashing = false;
            e.alpha = 0.25 + 0.25 * Math.sin(this.gameTime * 3);
            e.currentSpeed = e.speed;
          }
        }

        const effectiveSpeed = e.currentSpeed || e.speed;
        e.x += Math.cos(moveAngle) * effectiveSpeed * dt;
        e.y += Math.sin(moveAngle) * effectiveSpeed * dt;

        if (e.isBoss) {
          e.shootTimer = (e.shootTimer || 0) + dt;
          e.shieldCycle = (e.shieldCycle || 0) + dt;

          const isEnraged = e.hp < (e.maxHp * 0.5);
          // Phase 2 Enraged Vulnerability Cycle: 3.5s shielded, 2.5s vulnerable
          if (isEnraged) {
            const cyclePos = e.shieldCycle % 6.0;
            e.isVulnerable = cyclePos >= 3.5;
          } else {
            e.isVulnerable = true;
          }

          // Telegraphing attack 1s prior to blast
          e.isTelegraphing = (e.shootTimer >= 2.0 && e.shootTimer < 3.0);
          e.telegraphAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);

          if (e.shootTimer >= 3.0) {
            e.shootTimer = 0;
            e.isTelegraphing = false;
            this.bossRingAttack(e);
          }
        }

        const hitDist = this.player.radius + e.radius;
        if (dsq < hitDist * hitDist) {
          const dmg = (e.damage || 15) * (this.player.damageTakenMultiplier || 1.0);
          this.hitPlayer(dmg);
        }
      }
    }

    // Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.isEnemy) {
        const edx = b.x - this.player.x;
        const edy = b.y - this.player.y;
        const hitDist = this.player.radius + b.radius;
        if (edx * edx + edy * edy < hitDist * hitDist) {
          this.hitPlayer(b.damage);
          this.bullets.splice(i, 1);
          continue;
        }
      } else {
        let bulletHit = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const bdx = b.x - e.x;
          const bdy = b.y - e.y;
          const hitDist = b.radius + e.radius;
          if (bdx * bdx + bdy * bdy < hitDist * hitDist) {
            this.hitEnemy(e, j, b.damage);
            b.pierce = (b.pierce || 1) - 1;
            if (b.pierce <= 0) {
              bulletHit = true;
              break;
            }
          }
        }
        if (bulletHit) {
          this.bullets.splice(i, 1);
          continue;
        }
      }

      if (b.life <= 0 || b.x < -20 || b.x > this.width + 20 || b.y < -20 || b.y > this.height + 20) {
        this.bullets.splice(i, 1);
      }
    }

    // Orbital Orbs
    if (this.player.orbsCount > 0) {
      this.player.orbsAngle += this.player.orbsSpeed * dt;
      const orbDist = 55;
      for (let k = 0; k < this.player.orbsCount; k++) {
        const angle = this.player.orbsAngle + (k * (Math.PI * 2 / this.player.orbsCount));
        const ox = this.player.x + Math.cos(angle) * orbDist;
        const oy = this.player.y + Math.sin(angle) * orbDist;

        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const odx = ox - e.x;
          const ody = oy - e.y;
          const hitDist = 12 + e.radius;
          if (odx * odx + ody * ody < hitDist * hitDist) {
            e.orbHitCooldown = (e.orbHitCooldown || 0) - dt;
            if (e.orbHitCooldown <= 0) {
              this.hitEnemy(e, j, this.player.orbsDamage);
              e.orbHitCooldown = 0.25;
            }
          }
        }
      }
    }

    // Gems & Magnet
    const magnetSq = this.player.magnetRange * this.player.magnetRange;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const gdx = this.player.x - g.x;
      const gdy = this.player.y - g.y;
      const dsq = gdx * gdx + gdy * gdy;

      if (dsq < magnetSq) {
        const dist = Math.sqrt(dsq);
        const pullSpeed = (1 - dist / this.player.magnetRange) * 380 + 140;
        g.x += (gdx / dist) * pullSpeed * dt;
        g.y += (gdy / dist) * pullSpeed * dt;
      }

      const hitDist = this.player.radius + g.radius;
      if (dsq < hitDist * hitDist) {
        const gemVal = g.value;
        this.gems.splice(i, 1);
        this.collectGem(gemVal);
        if (this.isPaused) break;
      }
    }

    // Pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      const pdx = this.player.x - p.x;
      const pdy = this.player.y - p.y;
      const hitDist = this.player.radius + p.radius;
      if (pdx * pdx + pdy * pdy < hitDist * hitDist) {
        this.collectPickup(p);
        this.pickups.splice(i, 1);
      }
    }
  }

  updateWeapons(dt) {
    this.player.blasterTimer += dt;
    if (this.player.blasterTimer >= this.player.blasterCooldown) {
      this.player.blasterTimer = 0;
      this.fireBlaster();
    }

    if (this.player.lightningLevel > 0) {
      this.player.lightningTimer += dt;
      if (this.player.lightningTimer >= this.player.lightningCooldown) {
        this.player.lightningTimer = 0;
        this.castChainLightning();
      }
    }

    if (this.player.frostLevel > 0) {
      this.player.frostTimer += dt;
      if (this.player.frostTimer >= this.player.frostCooldown) {
        this.player.frostTimer = 0;
        this.castFrostNova();
      }
    }

    if (this.player.railgunLevel > 0) {
      this.player.railgunTimer += dt;
      if (this.player.railgunTimer >= this.player.railgunCooldown) {
        this.player.railgunTimer = 0;
        this.fireRailgun();
      }
    }
  }

  castFrostNova() {
    const frostRadius = 130 + this.player.frostLevel * 30;
    const damage = 35 + this.player.frostLevel * 22;

    this.particles.addShockwave(this.player.x, this.player.y, '#00f0ff', frostRadius, 0.35);
    sound.playPowerup();

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      if (dx * dx + dy * dy < frostRadius * frostRadius) {
        e.frozenTimer = 3.2; // Freeze enemies in solid ice!
        this.hitEnemy(e, i, damage);
        this.particles.burst(e.x, e.y, 6, { color: '#00f0ff', minSpeed: 20, maxSpeed: 60, life: 0.25 });
      }
    }
  }

  fireRailgun() {
    if (this.enemies.length === 0) return;

    let target = this.enemies[0];
    for (let i = 1; i < this.enemies.length; i++) {
      if (this.enemies[i].hp > target.hp) target = this.enemies[i];
    }

    const angle = Math.atan2(target.y - this.player.y, target.x - this.player.x);
    const endX = this.player.x + Math.cos(angle) * 900;
    const endY = this.player.y + Math.sin(angle) * 900;

    this.railgunBeams.push({
      x1: this.player.x,
      y1: this.player.y,
      x2: endX,
      y2: endY,
      life: 0.18,
      maxLife: 0.18
    });

    const damage = 95 + this.player.railgunLevel * 50;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const px = e.x - this.player.x;
      const py = e.y - this.player.y;
      const proj = px * Math.cos(angle) + py * Math.sin(angle);
      if (proj > 0) {
        const perpDist = Math.abs(-px * Math.sin(angle) + py * Math.cos(angle));
        if (perpDist < e.radius + 18) {
          this.hitEnemy(e, i, damage);
          this.particles.burst(e.x, e.y, 8, { color: '#ff007f', minSpeed: 40, maxSpeed: 120, life: 0.2 });
        }
      }
    }

    this.particles.shake(5, 0.16);
    sound.playLaser('heavy');
  }

  fireBlaster() {
    if (this.enemies.length === 0) return;

    let target = null;
    let minDsq = Infinity;
    const px = this.player.x;
    const py = this.player.y;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const dx = e.x - px;
      const dy = e.y - py;
      const dsq = dx * dx + dy * dy;
      if (dsq < minDsq) {
        minDsq = dsq;
        target = e;
      }
    }

    if (!target) return;

    const dx = target.x - px;
    const dy = target.y - py;
    const baseAngle = Math.atan2(dy, dx);
    const speed = 480;
    const numShots = Math.min(5, this.player.blasterLevel);

    for (let i = 0; i < numShots; i++) {
      const spread = (i - (numShots - 1) / 2) * 0.16;
      const angle = baseAngle + spread;
      const isTachyon = !!this.player.evolvedTachyon;
      this.bullets.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * (isTachyon ? speed * 1.25 : speed),
        vy: Math.sin(angle) * (isTachyon ? speed * 1.25 : speed),
        radius: isTachyon ? 6 : 4,
        color: isTachyon ? '#00f0ff' : this.player.color,
        damage: isTachyon ? 55 + (this.player.blasterLevel * 5) : 30 + (this.player.blasterLevel * 4),
        pierce: isTachyon ? 4 : (this.player.blasterLevel >= 4 ? 2 : 1),
        life: 1.6,
        isEnemy: false
      });
    }

    sound.playLaser(this.player.evolvedTachyon ? 'heavy' : 'normal');
  }

  castChainLightning() {
    if (this.enemies.length === 0) return;
    const isBlizzard = !!this.player.evolvedBlizzard;
    const count = Math.min(this.enemies.length, isBlizzard ? 8 : (2 + this.player.lightningLevel * 2));

    for (let i = 0; i < count; i++) {
      const target = this.enemies[i];
      this.particles.particles.push({
        x: target.x,
        y: target.y,
        vx: 0,
        vy: 0,
        size: isBlizzard ? 8 : 5,
        color: isBlizzard ? '#00f0ff' : '#ffe600',
        maxLife: 0.18,
        life: 0.18,
        shape: 'spark'
      });
      if (isBlizzard) {
        target.frozenTimer = 2.5; // Arctic freeze
      }
      this.hitEnemy(target, i, 45 + this.player.lightningLevel * 15);
    }

    this.particles.shake(isBlizzard ? 7 : 4, 0.15);
    sound.playLaser('heavy');
  }

  bossRingAttack(boss) {
    const isEnraged = boss.hp < (boss.maxHp * 0.5);
    const bulletsCount = isEnraged ? 16 : 10;
    const speed = isEnraged ? 210 : 160;
    for (let i = 0; i < bulletsCount; i++) {
      const angle = (i * Math.PI * 2) / bulletsCount + (isEnraged ? Math.sin(this.gameTime * 2) * 0.3 : 0);
      this.bullets.push({
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: isEnraged ? 7 : 6,
        color: isEnraged ? '#ff003c' : '#ff0055',
        damage: isEnraged ? 22 : 16,
        life: 3.2,
        isEnemy: true
      });
    }
    sound.playLaser('heavy');
    if (isEnraged) {
      this.particles.shake(6, 0.25);
    }
  }

  spawnEnemy() {
    let x, y;
    if (Math.random() < 0.5) {
      x = Math.random() < 0.5 ? -20 : this.width + 20;
      y = Math.random() * this.height;
    } else {
      x = Math.random() * this.width;
      y = Math.random() < 0.5 ? -20 : this.height + 20;
    }

    const typeRoll = Math.random();
    let type = 'scout';
    let hp = 30 + Math.floor(this.gameTime * 0.6);
    let speed = 95 + Math.random() * 35;
    let radius = 10;
    let color = '#ff0055';
    let damage = 12;

    if (typeRoll > 0.88 && this.gameTime > 25) {
      type = 'brute';
      hp = 110 + Math.floor(this.gameTime * 1.4);
      speed = 60;
      radius = 16;
      color = '#ffe600';
      damage = 22;
    } else if (typeRoll > 0.72 && this.gameTime > 15) {
      type = 'phantom';
      hp = 35 + Math.floor(this.gameTime * 0.4);
      speed = 135;
      radius = 9;
      color = '#a855f7';
      damage = 14;
    } else if (typeRoll > 0.58 && this.gameTime > 20) {
      type = 'bomber';
      hp = 26;
      speed = 150;
      radius = 11;
      color = '#ff3333';
      damage = 24;
    } else if (typeRoll > 0.42 && this.gameTime > 10) {
      type = 'rusher';
      hp = 22;
      speed = 165;
      radius = 8;
      color = '#ff00aa';
      damage = 10;
    }

    this.enemies.push({ x, y, type, hp, maxHp: hp, speed, radius, color, damage, frozenTimer: 0 });
  }

  spawnBoss() {
    // Mega Dreadnought with escort drones
    this.enemies.push({
      x: this.width / 2,
      y: -60,
      type: 'boss',
      isBoss: true,
      name: 'Mega Dreadnought',
      hp: 2500,
      maxHp: 2500,
      speed: 38,
      radius: 42,
      color: '#ff003c',
      damage: 35,
      shootTimer: 0,
      frozenTimer: 0
    });

    // Spawn 4 escort drones
    for (let i = 0; i < 4; i++) {
      const ang = (i * Math.PI) / 2;
      this.enemies.push({
        x: this.width / 2 + Math.cos(ang) * 60,
        y: -60 + Math.sin(ang) * 60,
        type: 'rusher',
        hp: 40,
        maxHp: 40,
        speed: 130,
        radius: 9,
        color: '#ffe600',
        damage: 15,
        frozenTimer: 0
      });
    }
  }

  hitEnemy(enemy, index, damage) {
    let actualDamage = damage;
    if (enemy.isBoss) {
      if (enemy.isVulnerable === false) {
        actualDamage *= 0.3; // Deflected by shield
        this.particles.burst(enemy.x, enemy.y, 4, { color: '#00f0ff', life: 0.15 });
      } else if (enemy.hp < (enemy.maxHp * 0.5)) {
        actualDamage *= 1.4; // Critical weak point hit!
      }
    }

    enemy.hp -= actualDamage;
    this.particles.addFloatingText(`-${Math.floor(actualDamage)}`, enemy.x, enemy.y - 10, {
      color: enemy.isBoss && !enemy.isVulnerable ? '#00f0ff' : '#fff',
      size: actualDamage > damage ? 15 : 13,
      duration: 0.35
    });

    if (enemy.hp <= 0) {
      this.kills++;
      storage.recordEnemiesKilled(1);

      // Nanite Siphon heal on kill
      if (this.player.hasVampiricSiphon && Math.random() < 0.15) {
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 2);
        this.particles.addFloatingText('+2', this.player.x, this.player.y - 15, { color: '#00ff88', size: 12 });
      }

      // Charge super meter
      this.superCharge = Math.min(this.superMax, this.superCharge + (enemy.isBoss ? 50 : (enemy.type === 'brute' ? 8 : 3)));
      if (this.superCharge >= this.superMax && !this.superReady) {
        this.superReady = true;
        this.particles.addFloatingText('SUPER READY! [SPACE]', this.player.x, this.player.y - 30, {
          color: '#ffe600',
          size: 18
        });
      }

      this.particles.burst(enemy.x, enemy.y, enemy.isBoss ? 32 : 8, {
        color: enemy.color,
        minSpeed: 40,
        maxSpeed: enemy.isBoss ? 280 : 140,
        life: 0.4
      });

      sound.playExplosion(enemy.isBoss ? 2.2 : 0.6);
      if (enemy.isBoss) {
        this.particles.shake(14, 0.5);
        this.particles.addFloatingText('DREADNOUGHT ANNIHILATED! +2500', this.width / 2, 200, { color: '#00ffcc', size: 26 });
        this.score += 2500;
        storage.addCredits(150); // Massive credit bonus
        storage.unlockAchievement('dreadnought_slayer');
        sound.announce('Mega Dreadnought Destroyed!');
      } else if (enemy.type === 'bomber') {
        this.particles.addShockwave(enemy.x, enemy.y, '#ff3333', 60, 0.25);
        const pDist = Math.hypot(this.player.x - enemy.x, this.player.y - enemy.y);
        if (pDist < 60) this.hitPlayer(12);
      }

      // Drop Gem
      if (this.gems.length < 90) {
        this.gems.push({
          x: enemy.x,
          y: enemy.y,
          radius: enemy.isBoss ? 10 : 5,
          value: enemy.isBoss ? 80 : (enemy.type === 'brute' ? 5 : 2),
          color: enemy.isBoss ? '#ffe600' : (enemy.type === 'brute' ? '#a200ff' : '#00ffcc')
        });
      }

      // Pickups: Health, Bomb, or Magnet!
      if (Math.random() < 0.08 && this.pickups.length < 5) {
        const roll = Math.random();
        let pType = 'health';
        if (roll < 0.4) pType = 'health';
        else if (roll < 0.7) pType = 'bomb';
        else pType = 'magnet';

        this.pickups.push({
          x: enemy.x,
          y: enemy.y,
          type: pType,
          radius: 10
        });
      }

      this.enemies.splice(index, 1);
    } else {
      sound.playHit();
    }
  }

  collectGem(value) {
    this.player.xp += value;
    storage.addCredits(1); // 1 Neon Credit per XP gem!
    sound.playGemPickup(this.player.level);

    if (this.player.xp >= this.player.xpToNextLevel) {
      this.levelUp();
    }
  }

  collectPickup(p) {
    if (p.type === 'health') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
      this.particles.addFloatingText('+35 HP', this.player.x, this.player.y - 20, { color: '#00ff88', size: 18 });
      sound.playPowerup();
    } else if (p.type === 'bomb') {
      this.particles.shake(12, 0.35);
      this.particles.addShockwave(this.player.x, this.player.y, '#ffe600', 300, 0.35);
      sound.playExplosion(1.8);

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        this.enemies[i].hp -= 180;
        if (this.enemies[i].hp <= 0) {
          this.hitEnemy(this.enemies[i], i, 0);
        }
      }
    } else if (p.type === 'magnet') {
      sound.playPowerup();
      this.particles.addShockwave(this.player.x, this.player.y, '#00f0ff', 400, 0.4);
      this.particles.addFloatingText('GEM MAGNET! 🧲', this.player.x, this.player.y - 25, { color: '#00f0ff', size: 20 });
      for (const g of this.gems) {
        g.x = this.player.x;
        g.y = this.player.y;
      }
    }
  }

  levelUp() {
    this.player.level++;
    this.player.xp -= this.player.xpToNextLevel;
    this.player.xpToNextLevel = Math.floor(this.player.xpToNextLevel * 1.4 + 10);
    storage.recordSurvivorLevel(this.player.level);
    storage.addCredits(10); // 10 Credits per level

    sound.playLevelUp();
    this.particles.burst(this.player.x, this.player.y, 20, {
      colors: ['#ffe600', '#00f3ff', '#ff00aa'],
      life: 0.5
    });

    this.isPaused = true;
    this.keys = {};
    this.pointer.active = false;
    this.presentUpgradeChoices();
  }

  presentUpgradeChoices() {
    const allUpgrades = [
      { id: 'blaster', title: `Laser Volley (Lvl ${this.player.blasterLevel} → ${this.player.blasterLevel + 1})`, desc: 'Add +1 laser bolt & increase firing speed. [⚡ Synergy with Orbs]', icon: '⚡' },
      { id: 'frost', title: `Frost Nova (Lvl ${this.player.frostLevel || 0} → ${(this.player.frostLevel || 0) + 1})`, desc: 'Periodic blast freezing & shattering drones. [❄️ Synergy with Lightning]', icon: '❄️' },
      { id: 'railgun', title: `Plasma Railgun (Lvl ${this.player.railgunLevel || 0} → ${(this.player.railgunLevel || 0) + 1})`, desc: 'Devastating piercing laser beam cutting through swarms.', icon: '☄️' },
      { id: 'orbs', title: `Orbital Plasma (Lvl ${this.player.orbsCount} → ${Math.min(6, this.player.orbsCount + 1)})`, desc: 'Add spinning plasma shield orb around player. [🪐 Synergy with Blaster]', icon: '🪐' },
      { id: 'lightning', title: `Chain Lightning (Lvl ${this.player.lightningLevel} → ${this.player.lightningLevel + 1})`, desc: 'Call down storm arcs frying swarms. [🌩️ Synergy with Frost]', icon: '🌩️' },
      { id: 'shield', title: `Energy Barrier (Lvl ${this.player.shieldLevel} → ${this.player.shieldLevel + 1})`, desc: 'Absorbs damage and auto-recharges over time.', icon: '🛡️' },
      { id: 'speed', title: 'Thruster Boost', desc: 'Increase movement speed by +20%.', icon: '🚀' },
      { id: 'magnet', title: 'Quantum Magnet', desc: 'Expand gem attraction range by +50%.', icon: '🧲' },
      { id: 'heal', title: 'Emergency Repair', desc: 'Instantly restore +50 HP and increase Max HP by +25.', icon: '❤️' },
      { id: 'heavy_plating', title: 'Heavy Plating [Trade-Off]', desc: 'Trade-off: +50 Max HP and heal to full, but -12% Movement Speed.', icon: '🛡️⚖️', isTradeOff: true },
      { id: 'overclock', title: 'Core Overclock [Trade-Off]', desc: 'Trade-off: +35% Weapons Fire Rate, but +15% Damage Taken.', icon: '⚡⚖️', isTradeOff: true },
      { id: 'vampiric_siphon', title: 'Nanite Siphon [Trade-Off]', desc: 'Trade-off: Defeated drones have 15% chance to heal 2 HP, but -15 Max HP.', icon: '🩸⚖️', isTradeOff: true }
    ];

    // Check weapon evolution prerequisites
    if (this.player.blasterLevel >= 2 && this.player.orbsCount >= 2 && !this.player.evolvedTachyon) {
      allUpgrades.unshift({
        id: 'evo_tachyon',
        title: '⭐ EVOLVE: Tachyon Matrix',
        desc: 'Fusion of Laser & Orbs: Piercing Tachyon beams and orbital plasma overdrive',
        icon: '🌟',
        isEvolution: true
      });
    }

    if (this.player.lightningLevel >= 2 && this.player.frostLevel >= 1 && !this.player.evolvedBlizzard) {
      allUpgrades.unshift({
        id: 'evo_blizzard',
        title: '⭐ EVOLVE: Blizzard Storm',
        desc: 'Fusion of Storm & Frost: Chained arctic lightning that permanently freezes swarms',
        icon: '⚡❄️',
        isEvolution: true
      });
    }

    const evolutions = allUpgrades.filter(u => u.isEvolution);
    const standard = allUpgrades.filter(u => !u.isEvolution).sort(() => Math.random() - 0.5);
    const choices = [...evolutions, ...standard].slice(0, 3);

    this.callbacks.onLevelUpChoice(choices, (chosenUpgradeId) => {
      this.applyUpgrade(chosenUpgradeId);
      this.isPaused = false;
      if (this.player.xp >= this.player.xpToNextLevel) {
        setTimeout(() => {
          if (this.isRunning) this.levelUp();
        }, 50);
      }
    });
  }

  applyUpgrade(id) {
    if (id === 'evo_tachyon') {
      this.player.evolvedTachyon = true;
      this.player.blasterLevel += 2;
      this.player.orbsCount = Math.min(6, this.player.orbsCount + 2);
      this.player.orbsSpeed *= 1.4;
      this.particles.shake(10, 0.3);
      sound.announce('Tachyon Matrix Activated!');
    } else if (id === 'evo_blizzard') {
      this.player.evolvedBlizzard = true;
      this.player.lightningLevel += 2;
      this.player.frostLevel += 2;
      this.particles.shake(10, 0.3);
      sound.announce('Blizzard Storm Online!');
    } else if (id === 'blaster') {
      this.player.blasterLevel++;
      this.player.blasterCooldown = Math.max(0.16, this.player.blasterCooldown * 0.88);
    } else if (id === 'frost') {
      this.player.frostLevel = (this.player.frostLevel || 0) + 1;
      this.player.frostCooldown = Math.max(1.8, 3.5 - this.player.frostLevel * 0.4);
    } else if (id === 'railgun') {
      this.player.railgunLevel = (this.player.railgunLevel || 0) + 1;
      this.player.railgunCooldown = Math.max(1.2, 2.4 - this.player.railgunLevel * 0.3);
    } else if (id === 'orbs') {
      this.player.orbsCount = Math.min(6, this.player.orbsCount + 1);
    } else if (id === 'lightning') {
      this.player.lightningLevel++;
      this.player.lightningCooldown = Math.max(1.2, this.player.lightningCooldown * 0.85);
    } else if (id === 'shield') {
      this.player.shieldLevel++;
      this.player.shieldHp = this.player.shieldMaxHp;
      this.player.shieldActive = true;
    } else if (id === 'speed') {
      this.player.speed *= 1.2;
    } else if (id === 'magnet') {
      this.player.magnetRange *= 1.5;
    } else if (id === 'heal') {
      this.player.maxHp += 25;
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
    } else if (id === 'heavy_plating') {
      this.player.maxHp += 50;
      this.player.hp = this.player.maxHp;
      this.player.speed *= 0.88;
      this.particles.addFloatingText('+50 HP / -12% SPEED', this.player.x, this.player.y - 25, { color: '#00ff88', size: 16 });
    } else if (id === 'overclock') {
      this.player.blasterCooldown *= 0.65;
      this.player.lightningCooldown *= 0.65;
      this.player.damageTakenMultiplier = (this.player.damageTakenMultiplier || 1.0) * 1.15;
      this.particles.addFloatingText('FIRE RATE +35% / DMG TAKEN +15%', this.player.x, this.player.y - 25, { color: '#ffe600', size: 16 });
    } else if (id === 'vampiric_siphon') {
      this.player.hasVampiricSiphon = true;
      this.player.maxHp = Math.max(30, this.player.maxHp - 15);
      this.player.hp = Math.min(this.player.hp, this.player.maxHp);
      this.particles.addFloatingText('NANITE SIPHON ON / -15 MAX HP', this.player.x, this.player.y - 25, { color: '#ff007f', size: 16 });
    }
  }

  hitPlayer(damage) {
    if (this.player.invulnerableTimer > 0) return;

    if (this.player.shieldHp > 0) {
      this.player.shieldHp -= damage;
      this.particles.shake(4, 0.15);
      sound.playHit();
      if (this.player.shieldHp <= 0) {
        this.player.shieldHp = 0;
        this.particles.addShockwave(this.player.x, this.player.y, '#00ffcc', 35, 0.2);
      }
      return;
    }

    this.player.hp -= damage;
    this.player.invulnerableTimer = 0.4;
    this.particles.shake(7, 0.2);
    sound.playHit();

    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.gameOver();
    }
  }

  gameOver() {
    this.isRunning = false;
    sound.stopBgm();
    sound.playGameOver();

    this.particles.burst(this.player.x, this.player.y, 25, {
      colors: ['#00f3ff', '#ff0055', '#ffe600'],
      maxSpeed: 220,
      life: 0.6
    });

    const isRecord = storage.saveHighScore('cyberSurvivors', this.score);
    storage.recordGamePlayed();

    this.callbacks.onGameOver({
      score: this.score,
      time: Math.floor(this.gameTime),
      kills: this.kills,
      level: this.player.level,
      isRecord
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Grid
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // 2. Gems
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Pickups
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      ctx.fillStyle = p.type === 'health' ? '#00ff88' : (p.type === 'bomb' ? '#ffe600' : '#00f0ff');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = p.type === 'health' ? '+' : (p.type === 'bomb' ? '💣' : '🧲');
      ctx.fillText(icon, p.x, p.y);
    }

    // 4. Bullets
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Railgun Laser Beams
    for (let i = 0; i < this.railgunBeams.length; i++) {
      const b = this.railgunBeams[i];
      const alpha = Math.max(0, b.life / b.maxLife);
      ctx.save();
      ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
      ctx.lineWidth = 6 * alpha;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2 * alpha;
      ctx.beginPath();
      ctx.moveTo(b.x1, b.y1);
      ctx.lineTo(b.x2, b.y2);
      ctx.stroke();
      ctx.restore();
    }

    // 5. Enemies
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      ctx.save();
      if (e.type === 'phantom') {
        ctx.globalAlpha = typeof e.alpha === 'number' ? e.alpha : 1.0;
      }
      ctx.fillStyle = e.frozenTimer > 0 ? '#00f3ff' : e.color;

      if (e.isBoss) {
        // Telegraphing warning line
        if (e.isTelegraphing) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 0, 85, 0.6)';
          ctx.lineWidth = 2 + Math.sin(Date.now() / 60) * 1.5;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(e.x, e.y);
          ctx.lineTo(this.player.x, this.player.y);
          ctx.stroke();
          ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Boss Shield / Vulnerability Indicator
        if (e.isVulnerable === false) {
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius + 8, 0, Math.PI * 2);
          ctx.stroke();
        } else if (e.hp < (e.maxHp * 0.5)) {
          ctx.strokeStyle = '#ff003c';
          ctx.lineWidth = 2 + Math.sin(Date.now() / 80) * 1.5;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius + 6, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Pulsing core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius * 0.35 + Math.sin(Date.now() / 120) * 2, 0, Math.PI * 2);
        ctx.fill();

        // Boss Health Bar & Title
        const barWidth = 160;
        const hpPercent = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(e.x - barWidth / 2, e.y - e.radius - 22, barWidth, 8);
        ctx.fillStyle = e.hp < (e.maxHp * 0.5) ? '#ff003c' : '#ffaa00';
        ctx.fillRect(e.x - barWidth / 2, e.y - e.radius - 22, barWidth * hpPercent, 8);
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1;
        ctx.strokeRect(e.x - barWidth / 2, e.y - e.radius - 22, barWidth, 8);

        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        const phaseText = e.hp < (e.maxHp * 0.5) ? (e.isVulnerable ? '⚡ WEAK POINT EXPOSED!' : '🛡️ SHIELD RECHARGING') : 'PHASE 1: ASSAULT';
        ctx.fillText(`MEGA DREADNOUGHT • ${phaseText}`, e.x, e.y - e.radius - 26);
      } else if (e.type === 'brute') {
        ctx.fillRect(e.x - e.radius, e.y - e.radius, e.radius * 2, e.radius * 2);
      } else {
        ctx.beginPath();
        const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
        ctx.moveTo(e.x + Math.cos(angle) * e.radius * 1.3, e.y + Math.sin(angle) * e.radius * 1.3);
        ctx.lineTo(e.x + Math.cos(angle + 2.4) * e.radius, e.y + Math.sin(angle + 2.4) * e.radius);
        ctx.lineTo(e.x + Math.cos(angle - 2.4) * e.radius, e.y + Math.sin(angle - 2.4) * e.radius);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    // 6. Player
    ctx.save();
    if (this.player.invulnerableTimer > 0 && Math.floor(Date.now() / 70) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Glowing Super Aura when Ready
    if (this.superReady) {
      ctx.strokeStyle = '#ffe600';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius + 10 + Math.sin(Date.now() / 150) * 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Body Shape based on Mech Class
    ctx.fillStyle = this.player.color;
    if (this.mechClass === 'vanguard') {
      // Hexagonal armored titan
      ctx.beginPath();
      for (let s = 0; s < 6; s++) {
        const ang = (s * Math.PI) / 3;
        const hx = this.player.x + Math.cos(ang) * (this.player.radius + 2);
        const hy = this.player.y + Math.sin(ang) * (this.player.radius + 2);
        if (s === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();
      ctx.fill();
    } else if (this.mechClass === 'stormweaver') {
      // Diamond technomancer
      ctx.beginPath();
      ctx.moveTo(this.player.x, this.player.y - this.player.radius - 2);
      ctx.lineTo(this.player.x + this.player.radius + 2, this.player.y);
      ctx.lineTo(this.player.x, this.player.y + this.player.radius + 2);
      ctx.lineTo(this.player.x - this.player.radius - 2, this.player.y);
      ctx.closePath();
      ctx.fill();
    } else {
      // Specter circle
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // Shield
    if (this.player.shieldHp > 0) {
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, this.player.radius + 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();

    // Orbital Orbs
    if (this.player.orbsCount > 0) {
      const orbDist = 55;
      for (let k = 0; k < this.player.orbsCount; k++) {
        const angle = this.player.orbsAngle + (k * (Math.PI * 2 / this.player.orbsCount));
        const ox = this.player.x + Math.cos(angle) * orbDist;
        const oy = this.player.y + Math.sin(angle) * orbDist;

        ctx.fillStyle = this.player.color;
        ctx.beginPath();
        ctx.arc(ox, oy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
