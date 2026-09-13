// Astro Pulse: Vertical Cyber Shmup / Space Shooter
import { sound } from '../engine/audio.js';
import { storage } from '../engine/storage.js';

export class AstroPulseGame {
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
    this.kills = 0;
    this.gameTime = 0;

    // Cyber Lab bonuses
    const hullBonus = storage.getLabBonus('hull');
    const thrusterBonus = 1 + storage.getLabBonus('thrusters');
    const startShield = storage.getLabBonus('shield');

    this.player = {
      x: this.width / 2,
      y: this.height - 70,
      width: 28,
      height: 32,
      speed: 380 * thrusterBonus,
      maxHp: 100 + hullBonus,
      hp: 100 + hullBonus,
      shieldHp: startShield ? 40 : 0,
      weaponLevel: 1,
      fireTimer: 0,
      fireRate: 0.14,
      hasMissiles: false,
      missileTimer: 0,
      missileCooldown: 1.2,
      invulnerableTimer: 0,
      color: '#00f3ff'
    };

    this.bullets = [];
    this.missiles = [];
    this.enemies = [];
    this.asteroids = [];
    this.powerups = [];
    this.stars = [];

    this.spawnTimer = 0;
    this.asteroidTimer = 0;
    this.bossSpawned = false;
    this.boss = null;

    this.keys = {};
    this.pointer = { x: this.width / 2, y: this.height - 70, active: false };

    this.initStarfield();
  }

  init() {
    this.reset();
    this.isRunning = true;
    sound.startBgm('darksynth');
    sound.announce('Astro Pulse Initiated!');
  }

  initStarfield() {
    this.stars = [];
    for (let i = 0; i < 70; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: Math.random() < 0.7 ? 1.5 : 2.5,
        speed: 80 + Math.random() * 220,
        color: Math.random() < 0.5 ? '#00f3ff' : '#ffffff'
      });
    }
  }

  handleKeyDown(code) {
    this.keys[code] = true;
    if (code === 'Space') {
      this.triggerBomb();
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

  triggerBomb() {
    // Clear enemy bullets & hit all enemies
    this.particles.shake(14, 0.4);
    this.particles.addShockwave(this.player.x, this.player.y, '#00ffcc', 400, 0.4);
    sound.playExplosion(2.2);

    for (let i = this.bullets.length - 1; i >= 0; i--) {
      if (this.bullets[i].isEnemy) this.bullets.splice(i, 1);
    }
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.hitEnemy(this.enemies[i], i, 160);
    }
  }

  update(dt) {
    if (!this.isRunning || this.isPaused) return;

    this.gameTime += dt;
    this.score = Math.floor(this.gameTime * 20 + this.kills * 45);
    storage.recordShmupScore(this.score);

    this.callbacks.onScoreUpdate(this.score, this.player.weaponLevel, this.player.hp, this.player.maxHp);

    // 1. Starfield Scroll
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.y += s.speed * dt;
      if (s.y > this.height) {
        s.y = 0;
        s.x = Math.random() * this.width;
      }
    }

    // 2. Player Movement
    let dx = 0;
    let dy = 0;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;
    if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;

    if (this.pointer.active) {
      const pdx = this.pointer.x - this.player.x;
      const pdy = this.pointer.y - this.player.y;
      const dsq = pdx * pdx + pdy * pdy;
      if (dsq > 64) {
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
    this.player.x = Math.max(20, Math.min(this.width - 20, this.player.x));
    this.player.y = Math.max(50, Math.min(this.height - 25, this.player.y));

    if (this.player.invulnerableTimer > 0) {
      this.player.invulnerableTimer -= dt;
    }

    // Player Engine Thruster Trail
    if (Math.random() < 0.5) {
      const equippedTrail = storage.getEquipped('trail') || 'cyan';
      let trailColor = '#00f3ff';
      if (equippedTrail === 'rainbow') {
        const colors = ['#ff0055', '#ffe600', '#00ff88', '#00f3ff', '#a855f7'];
        trailColor = colors[Math.floor(Math.random() * colors.length)];
      } else if (equippedTrail === 'gold') trailColor = '#ffe600';
      else if (equippedTrail === 'neon_pink') trailColor = '#ff007b';

      this.particles.particles.push({
        x: this.player.x + (Math.random() * 8 - 4),
        y: this.player.y + 14,
        vx: (Math.random() * 10 - 5),
        vy: 120 + Math.random() * 60,
        size: 3,
        color: trailColor,
        maxLife: 0.18,
        life: 0.18,
        friction: 0.95
      });
    }

    // 3. Auto Weapons
    this.player.fireTimer += dt;
    if (this.player.fireTimer >= this.player.fireRate) {
      this.player.fireTimer = 0;
      this.firePrimaryWeapons();
    }

    // Seeking Missiles
    if (this.player.hasMissiles) {
      this.player.missileTimer += dt;
      if (this.player.missileTimer >= this.player.missileCooldown) {
        this.player.missileTimer = 0;
        this.fireMissiles();
      }
    }

    // 4. Spawning Waves & Asteroids
    this.spawnTimer += dt;
    const interval = Math.max(0.6, 1.4 - (this.gameTime / 90) * 0.7);
    if (this.spawnTimer >= interval && this.enemies.length < 25) {
      this.spawnTimer = 0;
      this.spawnEnemyWave();
    }

    this.asteroidTimer += dt;
    if (this.asteroidTimer >= 3.2 && this.asteroids.length < 6) {
      this.asteroidTimer = 0;
      this.spawnAsteroid();
    }

    // Mothership Boss Encounter at 1000 score
    if (this.score >= 1000 && !this.bossSpawned) {
      this.bossSpawned = true;
      this.spawnMothership();
      sound.playWarning();
      sound.announce('Warning! Mothership Detected!');
      this.particles.shake(14, 0.5);
      this.particles.addFloatingText('⚠️ MOTHERSHIP DETECTED ⚠️', this.width / 2, 120, {
        color: '#ff0055',
        size: 24,
        duration: 2.0
      });
    }

    // 5. Update Bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;

      if (b.isEnemy) {
        // Hit player
        const pdx = b.x - this.player.x;
        const pdy = b.y - this.player.y;
        if (pdx * pdx + pdy * pdy < 144) {
          this.hitPlayer(b.damage);
          this.bullets.splice(i, 1);
          continue;
        }
      } else {
        // Hit enemies
        let hit = false;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const edx = b.x - e.x;
          const edy = b.y - e.y;
          const hitDist = b.radius + e.radius;
          if (edx * edx + edy * edy < hitDist * hitDist) {
            this.hitEnemy(e, j, b.damage);
            hit = true;
            break;
          }
        }
        if (hit) {
          this.bullets.splice(i, 1);
          continue;
        }

        // Hit Asteroids
        for (let j = this.asteroids.length - 1; j >= 0; j--) {
          const a = this.asteroids[j];
          const adx = b.x - a.x;
          const ady = b.y - a.y;
          const hitDist = b.radius + a.radius;
          if (adx * adx + ady * ady < hitDist * hitDist) {
            this.hitAsteroid(a, j, b.damage);
            hit = true;
            break;
          }
        }
        if (hit) {
          this.bullets.splice(i, 1);
          continue;
        }
      }

      if (b.y < -30 || b.y > this.height + 30 || b.x < -30 || b.x > this.width + 30) {
        this.bullets.splice(i, 1);
      }
    }

    // 6. Update Seeking Missiles
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];
      // Target nearest enemy
      let nearest = null;
      let minDsq = Infinity;
      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        const edx = e.x - m.x;
        const edy = e.y - m.y;
        const dsq = edx * edx + edy * edy;
        if (dsq < minDsq) {
          minDsq = dsq;
          nearest = e;
        }
      }

      if (nearest) {
        const targetAngle = Math.atan2(nearest.y - m.y, nearest.x - m.x);
        m.angle += (targetAngle - m.angle) * 8 * dt;
        m.vx = Math.cos(m.angle) * m.speed;
        m.vy = Math.sin(m.angle) * m.speed;
      }

      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.life -= dt;

      // Hit enemy check
      let hit = false;
      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const e = this.enemies[j];
        const dist = Math.hypot(m.x - e.x, m.y - e.y);
        if (dist < 10 + e.radius) {
          this.hitEnemy(e, j, 65);
          hit = true;
          break;
        }
      }

      if (hit || m.life <= 0) {
        this.particles.burst(m.x, m.y, 8, { color: '#ffe600', life: 0.25 });
        this.missiles.splice(i, 1);
      }
    }

    // 7. Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // Enemy firing
      if (e.canShoot) {
        e.shootTimer = (e.shootTimer || 0) + dt;
        if (e.shootTimer >= e.shootInterval) {
          e.shootTimer = 0;
          this.enemyFire(e);
        }
      }

      // Check collision with player
      const pdx = e.x - this.player.x;
      const pdy = e.y - this.player.y;
      if (pdx * pdx + pdy * pdy < (e.radius + 12) * (e.radius + 12)) {
        this.hitPlayer(25);
        this.hitEnemy(e, i, 90);
        continue;
      }

      if (e.y > this.height + 50) {
        this.enemies.splice(i, 1);
      }
    }

    // 8. Update Asteroids
    for (let i = this.asteroids.length - 1; i >= 0; i--) {
      const a = this.asteroids[i];
      a.y += a.speed * dt;
      a.x += a.vx * dt;
      a.angle += a.spin * dt;

      const pdx = a.x - this.player.x;
      const pdy = a.y - this.player.y;
      if (pdx * pdx + pdy * pdy < (a.radius + 12) * (a.radius + 12)) {
        this.hitPlayer(30);
        this.hitAsteroid(a, i, 100);
        continue;
      }

      if (a.y > this.height + 60) {
        this.asteroids.splice(i, 1);
      }
    }

    // 9. Update Powerups
    for (let i = this.powerups.length - 1; i >= 0; i--) {
      const p = this.powerups[i];
      p.y += 110 * dt;

      const pdx = p.x - this.player.x;
      const pdy = p.y - this.player.y;
      if (pdx * pdx + pdy * pdy < 400) {
        this.collectPowerup(p.type);
        this.powerups.splice(i, 1);
        continue;
      }

      if (p.y > this.height + 30) {
        this.powerups.splice(i, 1);
      }
    }
  }

  firePrimaryWeapons() {
    const px = this.player.x;
    const py = this.player.y - 12;
    const speed = 650;
    const lvl = this.player.weaponLevel;

    if (lvl === 1) {
      this.bullets.push({ x: px - 8, y: py, vx: 0, vy: -speed, radius: 3.5, color: '#00f3ff', damage: 25, isEnemy: false });
      this.bullets.push({ x: px + 8, y: py, vx: 0, vy: -speed, radius: 3.5, color: '#00f3ff', damage: 25, isEnemy: false });
    } else if (lvl === 2) {
      this.bullets.push({ x: px, y: py - 4, vx: 0, vy: -speed, radius: 4, color: '#00f3ff', damage: 28, isEnemy: false });
      this.bullets.push({ x: px - 12, y: py, vx: -60, vy: -speed, radius: 3.5, color: '#00f3ff', damage: 24, isEnemy: false });
      this.bullets.push({ x: px + 12, y: py, vx: 60, vy: -speed, radius: 3.5, color: '#00f3ff', damage: 24, isEnemy: false });
    } else if (lvl >= 3) {
      // 5-Way Plasma Volley
      for (let s = -2; s <= 2; s++) {
        this.bullets.push({
          x: px + s * 7,
          y: py,
          vx: s * 85,
          vy: -speed,
          radius: 4,
          color: '#ffe600',
          damage: 26,
          isEnemy: false
        });
      }
    }

    sound.playLaser('fast');
  }

  fireMissiles() {
    this.missiles.push({
      x: this.player.x - 16,
      y: this.player.y,
      vx: -120,
      vy: -200,
      angle: -Math.PI / 2,
      speed: 420,
      life: 2.2
    });
    this.missiles.push({
      x: this.player.x + 16,
      y: this.player.y,
      vx: 120,
      vy: -200,
      angle: -Math.PI / 2,
      speed: 420,
      life: 2.2
    });
    sound.playMissile();
  }

  enemyFire(e) {
    if (e.isMothership) {
      // Radial ring from boss
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI * 2) / 8 + Math.sin(this.gameTime);
        this.bullets.push({
          x: e.x,
          y: e.y + 20,
          vx: Math.cos(angle) * 160,
          vy: Math.sin(angle) * 160,
          radius: 5,
          color: '#ff003c',
          damage: 18,
          isEnemy: true
        });
      }
      sound.playLaser('heavy');
    } else {
      this.bullets.push({
        x: e.x,
        y: e.y + 12,
        vx: 0,
        vy: 260,
        radius: 4,
        color: '#ff0055',
        damage: 15,
        isEnemy: true
      });
    }
  }

  spawnEnemyWave() {
    const roll = Math.random();
    if (roll < 0.6) {
      // 3 V-Formation Scouts
      const startX = 100 + Math.random() * (this.width - 200);
      for (let i = -1; i <= 1; i++) {
        this.enemies.push({
          x: startX + i * 40,
          y: -30 - Math.abs(i) * 25,
          vx: Math.sin(startX) * 40,
          vy: 140,
          radius: 12,
          hp: 30,
          maxHp: 30,
          color: '#ff0055',
          canShoot: true,
          shootInterval: 2.0,
          shootTimer: Math.random() * 1.5
        });
      }
    } else {
      // Heavy Cruiser
      this.enemies.push({
        x: 100 + Math.random() * (this.width - 200),
        y: -40,
        vx: (Math.random() * 2 - 1) * 50,
        vy: 75,
        radius: 20,
        hp: 120,
        maxHp: 120,
        color: '#ffe600',
        canShoot: true,
        shootInterval: 1.5,
        shootTimer: 0.5
      });
    }
  }

  spawnAsteroid() {
    this.asteroids.push({
      x: 50 + Math.random() * (this.width - 100),
      y: -50,
      vx: (Math.random() * 2 - 1) * 30,
      speed: 80 + Math.random() * 60,
      radius: 24,
      hp: 60,
      angle: 0,
      spin: (Math.random() * 2 - 1) * 2
    });
  }

  spawnMothership() {
    const boss = {
      x: this.width / 2,
      y: -80,
      vx: 60,
      vy: 25,
      radius: 48,
      hp: 1400,
      maxHp: 1400,
      color: '#ff003c',
      canShoot: true,
      shootInterval: 2.2,
      shootTimer: 0,
      isMothership: true
    };
    this.enemies.push(boss);
    this.boss = boss;
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
      storage.addCredits(enemy.isMothership ? 50 : 2);

      this.particles.burst(enemy.x, enemy.y, enemy.isMothership ? 30 : 10, {
        color: enemy.color,
        minSpeed: 50,
        maxSpeed: enemy.isMothership ? 280 : 160,
        life: 0.4
      });

      sound.playExplosion(enemy.isMothership ? 2.5 : 0.7);

      if (enemy.isMothership) {
        this.particles.shake(16, 0.5);
        this.particles.addFloatingText('MOTHERSHIP DESTROYED! +2500', this.width / 2, 200, {
          color: '#00ffcc',
          size: 24
        });
        this.score += 2500;
        sound.announce('Mothership Destroyed!');
        storage.recordShmupBossKill();
      }

      // Powerup Drop Chance
      if (Math.random() < 0.22 && this.powerups.length < 4) {
        const types = ['weapon', 'missile', 'shield', 'health'];
        const type = types[Math.floor(Math.random() * types.length)];
        this.powerups.push({
          x: enemy.x,
          y: enemy.y,
          type,
          radius: 12
        });
      }

      this.enemies.splice(index, 1);
    } else {
      sound.playHit();
    }
  }

  hitAsteroid(asteroid, index, damage) {
    asteroid.hp -= damage;
    if (asteroid.hp <= 0) {
      this.asteroids.splice(index, 1);
      this.particles.burst(asteroid.x, asteroid.y, 8, { color: '#8888aa', life: 0.3 });
      sound.playExplosion(0.6);
      this.score += 50;
    } else {
      sound.playBounce(1.2);
    }
  }

  collectPowerup(type) {
    sound.playPowerup();
    this.particles.burst(this.player.x, this.player.y, 14, { color: '#ffe600', life: 0.3 });

    if (type === 'weapon') {
      this.player.weaponLevel = Math.min(3, this.player.weaponLevel + 1);
      this.particles.addFloatingText('WEAPON UPGRADE!', this.player.x, this.player.y - 25, { color: '#00f3ff' });
    } else if (type === 'missile') {
      this.player.hasMissiles = true;
      this.particles.addFloatingText('HOMING MISSILES!', this.player.x, this.player.y - 25, { color: '#ff00aa' });
    } else if (type === 'shield') {
      this.player.shieldHp = 50;
      this.particles.addFloatingText('ENERGY SHIELD!', this.player.x, this.player.y - 25, { color: '#00ffcc' });
    } else if (type === 'health') {
      this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
      this.particles.addFloatingText('+35 HP', this.player.x, this.player.y - 25, { color: '#00ff88' });
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

    const isRecord = storage.saveHighScore('astroPulse', this.score);
    storage.recordGamePlayed();

    this.callbacks.onGameOver({
      score: this.score,
      kills: this.kills,
      time: Math.floor(this.gameTime),
      isRecord
    });
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    // 1. Starfield
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      ctx.fillStyle = s.color;
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }

    // 2. Asteroids
    for (let i = 0; i < this.asteroids.length; i++) {
      const a = this.asteroids[i];
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.angle);
      ctx.fillStyle = '#6b7280';
      ctx.beginPath();
      for (let v = 0; v < 8; v++) {
        const ang = (v * Math.PI * 2) / 8;
        const rad = a.radius * (0.8 + Math.sin(v * 3) * 0.2);
        const vx = Math.cos(ang) * rad;
        const vy = Math.sin(ang) * rad;
        if (v === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 3. Bullets
    for (let i = 0; i < this.bullets.length; i++) {
      const b = this.bullets[i];
      ctx.fillStyle = b.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Missiles
    for (let i = 0; i < this.missiles.length; i++) {
      const m = this.missiles[i];
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.angle);
      ctx.fillStyle = '#ffe600';
      ctx.fillRect(-6, -2, 12, 4);
      ctx.restore();
    }

    // 5. Powerups
    for (let i = 0; i < this.powerups.length; i++) {
      const p = this.powerups[i];
      ctx.fillStyle = p.type === 'weapon' ? '#00f3ff' : p.type === 'missile' ? '#ff00aa' : '#ffe600';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const icon = p.type === 'weapon' ? 'P' : p.type === 'missile' ? 'M' : p.type === 'shield' ? 'S' : '+';
      ctx.fillText(icon, p.x, p.y);
    }

    // 6. Enemies
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      ctx.fillStyle = e.color;

      if (e.isMothership) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Boss Health Bar
        const barWidth = 140;
        const hpPercent = Math.max(0, e.hp / e.maxHp);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(e.x - barWidth / 2, e.y - e.radius - 16, barWidth, 6);
        ctx.fillStyle = '#ff003c';
        ctx.fillRect(e.x - barWidth / 2, e.y - e.radius - 16, barWidth * hpPercent, 6);
      } else {
        // Starfighter triangle
        ctx.beginPath();
        ctx.moveTo(e.x, e.y + e.radius);
        ctx.lineTo(e.x - e.radius, e.y - e.radius);
        ctx.lineTo(e.x + e.radius, e.y - e.radius);
        ctx.closePath();
        ctx.fill();
      }
    }

    // 7. Player Ship
    ctx.save();
    if (this.player.invulnerableTimer > 0 && Math.floor(Date.now() / 70) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Futuristic Fighter Jet Shape
    ctx.fillStyle = this.player.color;
    ctx.beginPath();
    ctx.moveTo(this.player.x, this.player.y - 16);
    ctx.lineTo(this.player.x - 14, this.player.y + 14);
    ctx.lineTo(this.player.x - 4, this.player.y + 8);
    ctx.lineTo(this.player.x + 4, this.player.y + 8);
    ctx.lineTo(this.player.x + 14, this.player.y + 14);
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.player.x, this.player.y - 4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Shield Bubble
    if (this.player.shieldHp > 0) {
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.player.x, this.player.y, 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}
