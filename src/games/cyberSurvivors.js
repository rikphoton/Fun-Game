// Cyber Survivors: Arena Roguelite / Bullet Heaven - Ultra Optimized & Stutter-Free
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';

export class CyberSurvivorsGame {
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
    this.gameTime = 0;
    this.score = 0;
    this.kills = 0;

    // Player Stats
    this.player = {
      x: this.width / 2,
      y: this.height / 2,
      vx: 0,
      vy: 0,
      radius: 14,
      color: '#00f3ff',
      maxHp: 100,
      hp: 100,
      speed: 210,
      level: 1,
      xp: 0,
      xpToNextLevel: 15,
      invulnerableTimer: 0,
      magnetRange: 95,

      // Weapons & Upgrades
      blasterLevel: 1,
      blasterCooldown: 0.35,
      blasterTimer: 0,

      orbsCount: 0,
      orbsAngle: 0,
      orbsSpeed: 3.2,
      orbsDamage: 24,

      lightningLevel: 0,
      lightningTimer: 0,
      lightningCooldown: 2.8,

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

    this.spawnTimer = 0;
    this.spawnInterval = 1.0;
    this.bossSpawned = false;

    // Input state
    this.keys = {};
    this.pointer = { x: this.width / 2, y: this.height / 2, active: false };
  }

  init() {
    this.reset();
    this.isRunning = true;
    sound.startBgm('synthwave');
  }

  handleKeyDown(code) {
    this.keys[code] = true;
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
    this.callbacks.onScoreUpdate(this.score, this.player.level, this.player.hp, this.player.maxHp);

    // Dynamic difficulty scaling
    this.spawnInterval = Math.max(0.24, 1.1 - (this.gameTime / 90) * 0.7);

    // 1. Player Movement
    let dx = 0;
    let dy = 0;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

    // Mouse / Touch Follow
    if (this.pointer.active) {
      const pdx = this.pointer.x - this.player.x;
      const pdy = this.pointer.y - this.player.y;
      const dsq = pdx * pdx + pdy * pdy;
      if (dsq > 144) {
        const dist = Math.sqrt(dsq);
        dx = pdx / dist;
        dy = pdy / dist;
      }
    }

    if (dx !== 0 && dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    this.player.x += dx * this.player.speed * dt;
    this.player.y += dy * this.player.speed * dt;

    // Boundaries
    const margin = this.player.radius + 4;
    this.player.x = Math.max(margin, Math.min(this.width - margin, this.player.x));
    this.player.y = Math.max(margin, Math.min(this.height - margin, this.player.y));

    // Invulnerability timer
    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }

    // Shield Recharge
    if (this.player.shieldLevel > 0) {
      if (this.player.shieldHp < this.player.shieldMaxHp) {
        this.player.shieldTimer += dt;
        if (this.player.shieldTimer >= this.player.shieldCooldown) {
          this.player.shieldHp = this.player.shieldMaxHp;
          this.player.shieldTimer = 0;
          this.particles.addShockwave(this.player.x, this.player.y, '#00ffcc', 30, 0.2);
          sound.playPowerup();
        }
      }
    }

    // 2. Weapons Automation
    this.updateWeapons(dt);

    // 3. Spawning Enemies (Max 50 on screen to avoid CPU spikes)
    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval && this.enemies.length < 50) {
      this.spawnTimer = 0;
      this.spawnEnemy();
    }

    // Boss spawn at 60s
    if (this.gameTime >= 60 && !this.bossSpawned) {
      this.bossSpawned = true;
      this.spawnBoss();
      this.particles.shake(10, 0.4);
      this.particles.addFloatingText('⚠️ DREADNOUGHT ARRIVAL ⚠️', this.width / 2, 100, { color: '#ff0055', size: 22 });
    }

    // 4. Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const edx = this.player.x - e.x;
      const edy = this.player.y - e.y;
      const dsq = edx * edx + edy * edy;

      if (dsq > 0) {
        const dist = Math.sqrt(dsq);
        e.x += (edx / dist) * e.speed * dt;
        e.y += (edy / dist) * e.speed * dt;

        // Boss attacks
        if (e.isBoss) {
          e.shootTimer = (e.shootTimer || 0) + dt;
          if (e.shootTimer >= 3.0) {
            e.shootTimer = 0;
            this.bossRingAttack(e);
          }
        }

        // Check collision with player
        const hitDist = this.player.radius + e.radius;
        if (dsq < hitDist * hitDist) {
          this.hitPlayer(e.damage || 15);
        }
      }
    }

    // 5. Update Bullets
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

    // 6. Orbital Orbs Collision
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

    // 7. Update Gems & Pickups
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
        if (this.isPaused) {
          // If level-up occurred, pause processing remaining gems this frame
          break;
        }
      }
    }

    // Update Pickups (health, bomb)
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
    // 1. Primary Blaster
    this.player.blasterTimer += dt;
    if (this.player.blasterTimer >= this.player.blasterCooldown) {
      this.player.blasterTimer = 0;
      this.fireBlaster();
    }

    // 2. Chain Lightning
    if (this.player.lightningLevel > 0) {
      this.player.lightningTimer += dt;
      if (this.player.lightningTimer >= this.player.lightningCooldown) {
        this.player.lightningTimer = 0;
        this.castChainLightning();
      }
    }
  }

  // ULTRA-FAST O(N) Targeting without Array Sorting or Math.hypot allocations!
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
      this.bullets.push({
        x: px,
        y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4,
        color: '#00f3ff',
        damage: 30 + (this.player.blasterLevel * 4),
        pierce: this.player.blasterLevel >= 4 ? 2 : 1,
        life: 1.6,
        isEnemy: false
      });
    }

    sound.playLaser('normal');
  }

  castChainLightning() {
    if (this.enemies.length === 0) return;
    const count = Math.min(this.enemies.length, 2 + this.player.lightningLevel * 2);

    for (let i = 0; i < count; i++) {
      const target = this.enemies[i];
      this.particles.particles.push({
        x: target.x,
        y: target.y,
        vx: 0,
        vy: 0,
        size: 5,
        color: '#ffe600',
        maxLife: 0.15,
        life: 0.15,
        shape: 'spark'
      });
      this.hitEnemy(target, i, 45 + this.player.lightningLevel * 15);
    }

    this.particles.shake(4, 0.15);
    sound.playLaser('heavy');
  }

  bossRingAttack(boss) {
    const bulletsCount = 10;
    const speed = 160;
    for (let i = 0; i < bulletsCount; i++) {
      const angle = (i * Math.PI * 2) / bulletsCount;
      this.bullets.push({
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 6,
        color: '#ff0055',
        damage: 16,
        life: 3.0,
        isEnemy: true
      });
    }
    sound.playLaser('heavy');
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

    if (typeRoll > 0.85 && this.gameTime > 25) {
      type = 'brute';
      hp = 110 + Math.floor(this.gameTime * 1.4);
      speed = 60;
      radius = 16;
      color = '#ffe600';
      damage = 22;
    } else if (typeRoll > 0.65 && this.gameTime > 15) {
      type = 'rusher';
      hp = 22;
      speed = 165;
      radius = 8;
      color = '#ff00aa';
      damage = 10;
    }

    this.enemies.push({ x, y, type, hp, maxHp: hp, speed, radius, color, damage });
  }

  spawnBoss() {
    this.enemies.push({
      x: this.width / 2,
      y: -50,
      type: 'boss',
      isBoss: true,
      hp: 1000,
      maxHp: 1000,
      speed: 40,
      radius: 32,
      color: '#ff003c',
      damage: 30,
      shootTimer: 0
    });
  }

  hitEnemy(enemy, index, damage) {
    enemy.hp -= damage;
    this.particles.addFloatingText(`-${Math.floor(damage)}`, enemy.x, enemy.y - 10, {
      color: '#fff',
      size: 13,
      duration: 0.35
    });

    if (enemy.hp <= 0) {
      this.kills++;
      storage.recordEnemiesKilled(1);

      this.particles.burst(enemy.x, enemy.y, enemy.isBoss ? 24 : 8, {
        color: enemy.color,
        minSpeed: 40,
        maxSpeed: enemy.isBoss ? 260 : 140,
        life: 0.35
      });

      sound.playExplosion(enemy.isBoss ? 2.0 : 0.6);
      if (enemy.isBoss) {
        this.particles.shake(10, 0.4);
        this.particles.addFloatingText('BOSS DESTROYED! +1000', this.width / 2, 200, { color: '#00ffcc', size: 24 });
        this.score += 1000;
      }

      // Drop Gem
      if (this.gems.length < 80) {
        this.gems.push({
          x: enemy.x,
          y: enemy.y,
          radius: enemy.isBoss ? 8 : 5,
          value: enemy.isBoss ? 45 : (enemy.type === 'brute' ? 5 : 2),
          color: enemy.isBoss ? '#ffe600' : (enemy.type === 'brute' ? '#a200ff' : '#00ffcc')
        });
      }

      if (Math.random() < 0.04 && this.pickups.length < 4) {
        this.pickups.push({
          x: enemy.x,
          y: enemy.y,
          type: Math.random() < 0.6 ? 'health' : 'bomb',
          radius: 9
        });
      }

      this.enemies.splice(index, 1);
    } else {
      sound.playHit();
    }
  }

  collectGem(value) {
    this.player.xp += value;
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

      // Hit visible enemies safely
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        this.enemies[i].hp -= 180;
        if (this.enemies[i].hp <= 0) {
          this.hitEnemy(this.enemies[i], i, 0);
        }
      }
    }
  }

  levelUp() {
    this.player.level++;
    this.player.xp -= this.player.xpToNextLevel;
    this.player.xpToNextLevel = Math.floor(this.player.xpToNextLevel * 1.4 + 10);
    storage.recordSurvivorLevel(this.player.level);

    sound.playLevelUp();
    this.particles.burst(this.player.x, this.player.y, 20, {
      colors: ['#ffe600', '#00f3ff', '#ff00aa'],
      life: 0.5
    });

    // Pause cleanly
    this.isPaused = true;
    this.keys = {}; // Clear input sticking
    this.pointer.active = false;
    this.presentUpgradeChoices();
  }

  presentUpgradeChoices() {
    const allUpgrades = [
      { id: 'blaster', title: 'Laser Volley', desc: 'Add +1 laser bolt & increase firing speed', icon: '⚡' },
      { id: 'orbs', title: 'Orbital Plasma', desc: 'Add spinning plasma shield orb around player', icon: '🪐' },
      { id: 'lightning', title: 'Chain Lightning', desc: 'Call down storm arcs that fry groups of drones', icon: '🌩️' },
      { id: 'shield', title: 'Energy Barrier', desc: 'Absorbs 40 damage and auto-recharges over time', icon: '🛡️' },
      { id: 'speed', title: 'Thruster Boost', desc: 'Increase movement speed by +20%', icon: '🚀' },
      { id: 'magnet', title: 'Quantum Magnet', desc: 'Expand gem attraction range by +50%', icon: '🧲' },
      { id: 'heal', title: 'Emergency Repair', desc: 'Instantly restore +50 HP and increase Max HP', icon: '❤️' }
    ];

    const shuffled = [...allUpgrades].sort(() => Math.random() - 0.5).slice(0, 3);
    this.callbacks.onLevelUpChoice(shuffled, (chosenUpgradeId) => {
      this.applyUpgrade(chosenUpgradeId);
      this.isPaused = false;
      // If remaining XP is enough for another level, queue it next frame
      if (this.player.xp >= this.player.xpToNextLevel) {
        setTimeout(() => {
          if (this.isRunning) this.levelUp();
        }, 50);
      }
    });
  }

  applyUpgrade(id) {
    if (id === 'blaster') {
      this.player.blasterLevel++;
      this.player.blasterCooldown = Math.max(0.16, this.player.blasterCooldown * 0.88);
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

    // 1. Cyber Grid Arena
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

    // 2. Render Gems
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      ctx.fillStyle = g.color;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Render Pickups
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      ctx.fillStyle = p.type === 'health' ? '#00ff88' : '#ffe600';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type === 'health' ? '+' : '💣', p.x, p.y);
    }

    // 4. Render Bullets
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Render Enemies
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      ctx.fillStyle = e.color;

      if (e.isBoss) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Boss Health Bar
        const barWidth = 120;
        const hpPercent = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(e.x - barWidth / 2, e.y - e.radius - 14, barWidth, 5);
        ctx.fillStyle = '#ff003c';
        ctx.fillRect(e.x - barWidth / 2, e.y - e.radius - 14, barWidth * hpPercent, 5);
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
    }

    // 6. Render Player
    ctx.save();
    if (this.player.invulnerableTimer > 0 && Math.floor(Date.now() / 70) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Player Body
    ctx.fillStyle = this.player.color;
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Player Core
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

        ctx.fillStyle = '#00f3ff';
        ctx.beginPath();
        ctx.arc(ox, oy, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}
