// Ultra-High Performance 2D particle FX & screen shake system (60fps guaranteed)

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.maxParticles = 120; // Hard cap to prevent lag spikes
  }

  shake(intensity = 8, duration = 0.25) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
  }

  update(dt) {
    // Screen shake damping
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }

    // Precalculate dampening factor
    const decay = Math.max(0.7, 1 - 4 * dt);

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= decay;
      p.vy *= decay;
      if (p.gravity) p.vy += p.gravity * dt;
      if (p.spin) p.rotation = (p.rotation || 0) + p.spin * dt;
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.floatingTexts.splice(i, 1);
        continue;
      }
      t.y += t.vy * dt;
      t.x += t.vx * dt;
      t.vy *= 0.95;
    }

    // Update shockwaves
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.life -= dt;
      if (sw.life <= 0) {
        this.shockwaves.splice(i, 1);
        continue;
      }
      sw.radius += sw.speed * dt;
    }
  }

  getShakeOffset() {
    if (this.shakeDuration <= 0 || this.shakeIntensity <= 0) {
      return { x: 0, y: 0 };
    }
    const currentForce = this.shakeIntensity * Math.min(1, this.shakeDuration / 0.25);
    return {
      x: (Math.random() * 2 - 1) * currentForce,
      y: (Math.random() * 2 - 1) * currentForce
    };
  }

  burst(x, y, count = 12, options = {}) {
    const {
      color = '#00f3ff',
      colors = null,
      minSpeed = 40,
      maxSpeed = 200,
      minSize = 2,
      maxSize = 4.5,
      life = 0.4,
      gravity = 0,
      shape = 'circle'
    } = options;

    const actualCount = Math.min(18, count);

    for (let i = 0; i < actualCount; i++) {
      if (this.particles.length >= this.maxParticles) {
        this.particles.shift(); // Drop oldest particle if limit reached
      }

      const angle = Math.random() * Math.PI * 2;
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      const chosenColor = colors ? colors[Math.floor(Math.random() * colors.length)] : color;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: minSize + Math.random() * (maxSize - minSize),
        maxLife: life * (0.8 + Math.random() * 0.4),
        life: life * (0.8 + Math.random() * 0.4),
        color: chosenColor,
        gravity,
        shape,
        rotation: Math.random() * Math.PI,
        spin: (Math.random() * 2 - 1) * 6
      });
    }
  }

  spawn(x, y, vx = 0, vy = 0, color = '#00f0ff', size = 3, life = 0.4) {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push({
      x,
      y,
      vx,
      vy,
      size,
      maxLife: life,
      life,
      color,
      shape: 'circle',
      gravity: 0
    });
  }

  explode(x, y, color = '#ff007f', count = 20) {
    this.burst(x, y, count, { color, minSpeed: 60, maxSpeed: 250, minSize: 2, maxSize: 5, life: 0.5 });
  }

  addShockwave(x, y, color = '#00f3ff', maxRadius = 70, duration = 0.25) {
    if (this.shockwaves.length > 5) this.shockwaves.shift();
    this.shockwaves.push({
      x,
      y,
      radius: 5,
      maxRadius,
      speed: (maxRadius - 5) / duration,
      life: duration,
      maxLife: duration,
      color
    });
  }

  addFloatingText(text, x, y, options = {}) {
    if (this.floatingTexts.length > 8) this.floatingTexts.shift();
    const {
      color = '#ffe600',
      size = 16,
      duration = 0.7,
      vy = -50,
      vx = (Math.random() * 2 - 1) * 15
    } = options;

    this.floatingTexts.push({
      text,
      x,
      y,
      vx,
      vy,
      color,
      size,
      life: duration,
      maxLife: duration
    });
  }

  draw(ctx) {
    ctx.save();

    // 1. Shockwaves
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      const alpha = Math.max(0, sw.life / sw.maxLife);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = sw.color;
      ctx.globalAlpha = alpha * 0.6;
      ctx.lineWidth = 2.5 * alpha;
      ctx.stroke();
    }

    // 2. Fast Particle Render (NO shadowBlur in loop to maintain 60 FPS!)
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation || 0);
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 3. Floating Texts
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const t = this.floatingTexts[i];
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.font = `bold ${t.size}px "Outfit", "Segoe UI", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t.text, t.x, t.y);
    }

    ctx.restore();
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.shockwaves = [];
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
  }
}
