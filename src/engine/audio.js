// ============================================================================
// NeonPulse Arcade: Professional Audio & Sound Design Engine
// Multi-Bus Web Audio Synthesizer, Procedural BGM Sequencer & Voice Announcer
// ============================================================================

class SoundEngine {
  constructor() {
    this.ctx = null;

    // Bus Gain Nodes
    this.masterGain = null;
    this.masterLimiter = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.uiGain = null;
    this.ambientGain = null;

    // Volume Levels (0.0 to 1.0)
    this.masterVolume = 0.8;
    this.bgmVolume = 0.35;
    this.sfxVolume = 0.6;
    this.uiVolume = 0.7;
    this.ambientVolume = 0.4;

    // Channel Enable/Mute Flags
    this.isMuted = false;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.ambientAudioEnabled = true;
    this.hapticsEnabled = true;
    this.announcerEnabled = true;

    // Polyphony & Voice Prioritization Management
    this.MAX_POLYPHONY = 28;
    this.activeVoices = new Set();
    this.cooldowns = new Map();

    // Noise Buffers
    this.noiseBuffer = null;

    // BGM Sequencer State
    this.bgmInterval = null;
    this.bgmStep = 0;
    this.bgmPlaying = false;
    this.currentTrack = 'lobby';
    this.adaptiveLevel = 0; // 0 = standard, 1 = intense, 2 = boss encounter
    this.isBgmPaused = false;
    this.bgmFilter = null;

    // Procedural Continuous Synth Handles (Neon Drift engine, HexaTron cycle hum)
    this.engineSoundActive = false;
    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineFilter = null;
    this.engineGain = null;

    this.cycleHumActive = false;
    this.cycleOsc = null;
    this.cycleGain = null;

    // Anti-Spam Time Trackers
    this.lastAnnouncementTime = 0;
    this.lastExplosionTime = 0;
    this.lastHoverTime = 0;

    // Auto-unlock listener setup
    this.unlocked = false;
    this.setupAutoUnlock();
    this.setupVisibilityHandler();
  }

  // --- INITIALIZATION & BUS ROUTING ---

  init() {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        // 1. Master Dynamics Compressor / Transparent Limiter (prevents clipping & distortion)
        this.masterLimiter = this.ctx.createDynamicsCompressor();
        this.masterLimiter.threshold.setValueAtTime(-3.0, this.ctx.currentTime);
        this.masterLimiter.knee.setValueAtTime(6.0, this.ctx.currentTime);
        this.masterLimiter.ratio.setValueAtTime(14.0, this.ctx.currentTime);
        this.masterLimiter.attack.setValueAtTime(0.003, this.ctx.currentTime);
        this.masterLimiter.release.setValueAtTime(0.12, this.ctx.currentTime);
        this.masterLimiter.connect(this.ctx.destination);

        // 2. Master Gain Bus
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime);
        this.masterGain.connect(this.masterLimiter);

        // 3. Music (BGM) Bus
        this.bgmFilter = this.ctx.createBiquadFilter();
        this.bgmFilter.type = 'lowpass';
        this.bgmFilter.frequency.setValueAtTime(18000, this.ctx.currentTime);

        this.bgmGain = this.ctx.createGain();
        const effectiveBgm = (this.isMuted || !this.musicEnabled) ? 0 : this.bgmVolume;
        this.bgmGain.gain.setValueAtTime(effectiveBgm, this.ctx.currentTime);
        this.bgmGain.connect(this.bgmFilter);
        this.bgmFilter.connect(this.masterGain);

        // 4. SFX Bus
        this.sfxGain = this.ctx.createGain();
        const effectiveSfx = (this.isMuted || !this.sfxEnabled) ? 0 : this.sfxVolume;
        this.sfxGain.gain.setValueAtTime(effectiveSfx, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        // 5. UI Sound Bus
        this.uiGain = this.ctx.createGain();
        const effectiveUi = (this.isMuted || !this.sfxEnabled) ? 0 : this.uiVolume;
        this.uiGain.gain.setValueAtTime(effectiveUi, this.ctx.currentTime);
        this.uiGain.connect(this.masterGain);

        // 6. Ambient Bus
        this.ambientGain = this.ctx.createGain();
        const effectiveAmbient = (this.isMuted || !this.ambientAudioEnabled) ? 0 : this.ambientVolume;
        this.ambientGain.gain.setValueAtTime(effectiveAmbient, this.ctx.currentTime);
        this.ambientGain.connect(this.masterGain);

        // 7. Synthesize 1.5s High-Quality Noise Buffer
        const sampleRate = this.ctx.sampleRate;
        const bufferSize = Math.floor(sampleRate * 1.5);
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        this.unlocked = true;
      } catch (e) {
        console.warn('Web Audio init error:', e);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  setupAutoUnlock() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.init();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(ev => {
        window.removeEventListener(ev, unlock, true);
      });
    };

    ['click', 'touchstart', 'pointerdown', 'keydown'].forEach(ev => {
      window.addEventListener(ev, unlock, { capture: true, once: true });
    });
  }

  setupVisibilityHandler() {
    if (typeof document === 'undefined') return;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.suspend();
      } else {
        this.resume();
      }
    });
  }

  // --- VOLUME & CHANNEL CONTROLS ---

  setMasterVolume(val) {
    this.masterVolume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
  }

  setBgmVolume(val) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx) {
      const target = (!this.musicEnabled || this.isMuted) ? 0 : this.bgmVolume;
      this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      const target = (!this.sfxEnabled || this.isMuted) ? 0 : this.sfxVolume;
      this.sfxGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
    if (this.uiGain && this.ctx) {
      const targetUi = (!this.sfxEnabled || this.isMuted) ? 0 : this.sfxVolume * 0.9;
      this.uiGain.gain.setTargetAtTime(targetUi, this.ctx.currentTime, 0.02);
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = !!enabled;
    this.setBgmVolume(this.bgmVolume);
    if (!this.musicEnabled) {
      this.stopBgm({ fadeTime: 0.1 });
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = !!enabled;
    this.setSfxVolume(this.sfxVolume);
  }

  setAmbientAudioEnabled(enabled) {
    this.ambientAudioEnabled = !!enabled;
    if (this.ambientGain && this.ctx) {
      const target = (this.ambientAudioEnabled && !this.isMuted) ? this.ambientVolume : 0;
      this.ambientGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.02);
    }
  }

  setHapticsEnabled(enabled) {
    this.hapticsEnabled = !!enabled;
  }

  setAnnouncerEnabled(enabled) {
    this.announcerEnabled = !!enabled;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.02);
    }
    if (this.isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    return this.isMuted;
  }

  setMute(muted) {
    this.isMuted = !!muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : this.masterVolume, this.ctx.currentTime, 0.02);
    }
    if (this.isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  suspend() {
    try {
      if (this.ctx && this.ctx.state === 'running') {
        this.ctx.suspend().catch(() => {});
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (e) {}
  }

  resume() {
    try {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {}
  }

  // --- HAPTIC VIBRATION FEEDBACK ---

  vibrate(pattern) {
    if (!this.hapticsEnabled || typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
    try {
      navigator.vibrate(pattern);
    } catch (e) {}
  }

  // --- POLYPHONY & COOLDOWN HELPERS ---

  throttle(key, intervalMs, fn) {
    const now = Date.now();
    const last = this.cooldowns.get(key) || 0;
    if (now - last < intervalMs) return false;
    this.cooldowns.set(key, now);
    fn();
    return true;
  }

  registerVoice(sourceNode) {
    if (!sourceNode) return;
    if (this.activeVoices.size >= this.MAX_POLYPHONY) {
      // Steal oldest voice
      const oldest = this.activeVoices.values().next().value;
      if (oldest) {
        try { oldest.stop(); } catch (e) {}
        this.activeVoices.delete(oldest);
      }
    }

    this.activeVoices.add(sourceNode);
    sourceNode.onended = () => {
      this.activeVoices.delete(sourceNode);
    };
  }

  createPanner(pan = 0) {
    if (!this.ctx) return null;
    try {
      if (typeof this.ctx.createStereoPanner === 'function') {
        const panner = this.ctx.createStereoPanner();
        panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
        return panner;
      }
    } catch (e) {}
    return null;
  }

  // --- ARCADE VOICE ANNOUNCER ---

  announce(text) {
    if (this.isMuted || !this.announcerEnabled) return;
    try {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      const now = Date.now();
      if (now - this.lastAnnouncementTime < 1600) return;
      this.lastAnnouncementTime = now;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.15;
      utterance.pitch = 0.94;
      utterance.volume = (this.sfxVolume * this.masterVolume);

      const voices = window.speechSynthesis.getVoices();
      const enVoice = voices.find(v => v.lang && v.lang.startsWith('en'));
      if (enVoice) utterance.voice = enVoice;

      window.speechSynthesis.speak(utterance);
    } catch (e) {}
  }

  // --- PHASE 2: GLOBAL INTERFACE & ARCADE SOUNDS ---

  playMenuOpen() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.uiGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.14);
      this.registerVoice(osc);
    } catch (e) {}
  }

  playButtonHover() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    this.throttle('btn_hover', 40, () => {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, now);
        osc.frequency.exponentialRampToValueAtTime(1800, now + 0.015);

        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.015);

        osc.connect(gain);
        gain.connect(this.uiGain || this.masterGain);
        osc.start(now);
        osc.stop(now + 0.015);
        this.registerVoice(osc);
      } catch (e) {}
    });
  }

  playButtonClick() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.04);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(gain);
      gain.connect(this.uiGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.045);
      this.registerVoice(osc);
      this.vibrate(12);
    } catch (e) {}
  }

  playGameSelect() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [659.25, 987.77].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.04;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.25, t + 0.06);

        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);

        osc.connect(gain);
        gain.connect(this.uiGain || this.masterGain);
        osc.start(t);
        osc.stop(t + 0.07);
        this.registerVoice(osc);
      });
      this.vibrate(15);
    } catch (e) {}
  }

  playBriefingOpen() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.15);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(440, now);
      filter.frequency.exponentialRampToValueAtTime(1200, now + 0.15);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.uiGain || this.masterGain);

      osc.start(now);
      osc.stop(now + 0.16);
      this.registerVoice(osc);
    } catch (e) {}
  }

  playMissionStart() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [330, 440, 660, 880].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.05;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.15, t + 0.09);

        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);

        osc.connect(gain);
        gain.connect(this.uiGain || this.masterGain);
        osc.start(t);
        osc.stop(t + 0.11);
        this.registerVoice(osc);
      });
      this.vibrate([20, 30, 40]);
    } catch (e) {}
  }

  playPause() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(220, now + 0.12);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.uiGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
      this.registerVoice(osc);
    } catch (e) {}
  }

  playResume() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(720, now + 0.1);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.uiGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.1);
      this.registerVoice(osc);
    } catch (e) {}
  }

  playGameExit() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.18);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(this.uiGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.18);
      this.registerVoice(osc);
    } catch (e) {}
  }

  playSettingsInteract() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    this.throttle('settings_tick', 35, () => {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2200, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

        osc.connect(gain);
        gain.connect(this.uiGain || this.masterGain);
        osc.start(now);
        osc.stop(now + 0.012);
        this.registerVoice(osc);
      } catch (e) {}
    });
  }

  playAchievement() {
    this.playVictory();
  }

  playNewRecord() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.07;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, t + 0.18);

        gain.gain.setValueAtTime(0.24, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

        osc.connect(gain);
        gain.connect(this.uiGain || this.masterGain);
        osc.start(t);
        osc.stop(t + 0.22);
        this.registerVoice(osc);
      });
      this.vibrate([30, 40, 50, 40, 60]);
    } catch (e) {}
  }

  playLevelComplete() {
    this.playLevelUp();
  }

  // --- PHASE 3: GAME-SPECIFIC AUDIO & REUSABLE SOUND GENERATION ---

  // 1. Generic & Standard Presets (Preserves backward compatibility)

  playLaser(type = 'normal', panX = 0) {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type === 'heavy' ? 'sawtooth' : (type === 'blizzard' ? 'square' : 'triangle');
      const startFreq = type === 'heavy' ? 440 : (type === 'fast' ? 1080 : 820);
      const endFreq = type === 'heavy' ? 65 : 120;
      const duration = type === 'heavy' ? 0.2 : 0.085;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const panner = this.createPanner(panX);
      if (panner) {
        osc.connect(gain);
        gain.connect(panner);
        panner.connect(this.sfxGain || this.masterGain);
      } else {
        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
      }

      osc.start(now);
      osc.stop(now + duration);
      this.registerVoice(osc);
    } catch (e) {}
  }

  playExplosion(intensity = 1, panX = 0) {
    if (this.isMuted || !this.sfxEnabled || !this.ctx || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      if (now - this.lastExplosionTime < 0.035 && intensity <= 1) return;
      this.lastExplosionTime = now;

      const duration = Math.min(0.48, 0.22 * Math.max(0.6, intensity));

      // 1. Noise Transient
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(intensity > 1.4 ? 480 : 750, now);
      filter.frequency.exponentialRampToValueAtTime(45, now + duration);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35 * Math.min(1.2, intensity), now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      // 2. Sub-Bass Punch
      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(intensity > 1.5 ? 90 : 120, now);
      subOsc.frequency.exponentialRampToValueAtTime(28, now + duration);

      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      const panner = this.createPanner(panX);
      if (panner) {
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(panner);

        subOsc.connect(subGain);
        subGain.connect(panner);
        panner.connect(this.sfxGain || this.masterGain);
      } else {
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.sfxGain || this.masterGain);

        subOsc.connect(subGain);
        subGain.connect(this.sfxGain || this.masterGain);
      }

      noise.start(now);
      subOsc.start(now);
      noise.stop(now + duration);
      subOsc.stop(now + duration);
      this.registerVoice(noise);
      this.registerVoice(subOsc);

      if (intensity > 1.2) {
        this.vibrate(Math.min(60, Math.round(intensity * 25)));
      }
    } catch (e) {}
  }

  playHit() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    this.throttle('player_hit', 40, () => {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.08);

        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(now);
        osc.stop(now + 0.08);
        this.registerVoice(osc);
        this.vibrate(25);
      } catch (e) {}
    });
  }

  playBounce(pitchMultiplier = 1) {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    this.throttle('bounce', 35, () => {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const base = 280 * pitchMultiplier;
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 1.45, now + 0.06);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(now);
        osc.stop(now + 0.06);
        this.registerVoice(osc);
      } catch (e) {}
    });
  }

  playGemPickup(combo = 1) {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    this.throttle('gem_pickup', 35, () => {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.5];
        const freq = scale[Math.min(scale.length - 1, (combo - 1) % scale.length)];

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.35, now + 0.08);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(now);
        osc.stop(now + 0.09);
        this.registerVoice(osc);
      } catch (e) {}
    });
  }

  playPowerup() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.05;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(t);
        osc.stop(t + 0.12);
        this.registerVoice(osc);
      });
      this.vibrate(25);
    } catch (e) {}
  }

  playSuperNova() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.22);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.32);
      this.registerVoice(osc);

      setTimeout(() => this.playExplosion(2.6), 110);
      this.vibrate([40, 30, 70]);
    } catch (e) {}
  }

  playMissile() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(820, now + 0.15);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
      this.registerVoice(osc);
    } catch (e) {}
  }

  playWarning() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(660, now + 0.1);
      osc.frequency.setValueAtTime(880, now + 0.2);

      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.34);
      this.registerVoice(osc);
      this.vibrate([30, 40, 30]);
    } catch (e) {}
  }

  playLevelUp() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.06;
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(t);
        osc.stop(t + 0.18);
        this.registerVoice(osc);
      });
      this.vibrate([20, 30, 50]);
    } catch (e) {}
  }

  playGameOver() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const notes = [440, 415.3, 392, 349.23];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.11;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(t);
        osc.stop(t + 0.18);
        this.registerVoice(osc);
      });
      this.vibrate([40, 50, 80]);
    } catch (e) {}
  }

  playVictory() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.07;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(t);
        osc.stop(t + 0.22);
        this.registerVoice(osc);
      });
      this.vibrate([25, 35, 45]);
    } catch (e) {}
  }

  // --- CYBER SURVIVORS SPECIFICS ---

  playShieldSpark() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    this.throttle('shield_spark', 40, () => {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(now);
        osc.stop(now + 0.035);
        this.registerVoice(osc);
      } catch (e) {}
    });
  }

  playHealthPickup() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      [587.33, 739.99].forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.04;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(t);
        osc.stop(t + 0.1);
        this.registerVoice(osc);
      });
    } catch (e) {}
  }

  // --- NEON DASH SPECIFICS ---

  playJump() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.11);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.11);
      this.registerVoice(osc);
      this.vibrate(15);
    } catch (e) {}
  }

  playGravityFlip() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(850, now + 0.09);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.095);
      this.registerVoice(osc);
      this.vibrate(18);
    } catch (e) {}
  }

  playAirDash() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(1150, now + 0.09);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.095);
      this.registerVoice(osc);
      this.vibrate(20);
    } catch (e) {}
  }

  playFootstep() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    this.throttle('footstep', 110, () => {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.03);

        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(now);
        osc.stop(now + 0.035);
        this.registerVoice(osc);
      } catch (e) {}
    });
  }

  playLanding() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.065);
      this.registerVoice(osc);
    } catch (e) {}
  }

  playNearMiss() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1300, now);
      osc.frequency.exponentialRampToValueAtTime(650, now + 0.12);

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.12);
      this.registerVoice(osc);
      this.vibrate(15);
    } catch (e) {}
  }

  // --- QUANTUM BREAKER SPECIFICS ---

  playBallLaunch() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.09);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.095);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.095);
      this.registerVoice(osc);
    } catch (e) {}
  }

  playBrickImpact(type = 'standard') {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    this.throttle('brick_hit', 30, () => {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        let baseFreq = 480;
        let oscType = 'triangle';

        if (type === 'tough') {
          baseFreq = 260;
          oscType = 'sawtooth';
        } else if (type === 'explosive') {
          baseFreq = 720;
          oscType = 'square';
        } else if (type === 'glass') {
          baseFreq = 880;
          oscType = 'sine';
        }

        osc.type = oscType;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + 0.05);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(now);
        osc.stop(now + 0.055);
        this.registerVoice(osc);
      } catch (e) {}
    });
  }

  playBrickDestroy(isSpecial = false) {
    this.playExplosion(isSpecial ? 1.4 : 0.65);
  }

  playBallLost() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.22);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.22);
      this.registerVoice(osc);
      this.vibrate(30);
    } catch (e) {}
  }

  playPaddleBounce(offsetFactor = 0) {
    this.playBounce(1.2 + Math.abs(offsetFactor) * 0.4);
  }

  playLaserPaddle() {
    this.playLaser('fast');
  }

  playBombDetonate() {
    this.playExplosion(1.8);
  }

  playPowerupExpire() {
    this.playBallLost();
  }

  playExtraLife() {
    this.playPowerup();
  }

  playCycleCrash() {
    this.playExplosion(1.6);
  }

  playEmpSurge() {
    this.playSuperNova();
  }

  // --- NEON DRIFT PROCEDURAL REAL-TIME ENGINE SYNTHESIS ---

  startEngineSound() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx || this.engineSoundActive) return;
    try {
      const now = this.ctx.currentTime;

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc2 = this.ctx.createOscillator();
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.setValueAtTime(55, now);

      this.engineOsc2.type = 'sine';
      this.engineOsc2.frequency.setValueAtTime(27.5, now);

      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.setValueAtTime(250, now);

      this.engineGain.gain.setValueAtTime(0.12, now);

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain || this.masterGain);

      this.engineOsc1.start(now);
      this.engineOsc2.start(now);
      this.engineSoundActive = true;
    } catch (e) {}
  }

  updateEngineSound(speedRatio = 0, isAccelerating = false, isDrifting = false) {
    if (!this.engineSoundActive || !this.ctx) {
      if (speedRatio > 0.05 && !this.engineSoundActive) {
        this.startEngineSound();
      }
      return;
    }

    try {
      const now = this.ctx.currentTime;
      const baseFreq = 50 + (speedRatio * 180);
      const targetFilter = 200 + (speedRatio * 900) + (isAccelerating ? 300 : 0);
      const targetVolume = (this.isMuted || !this.sfxEnabled) ? 0 : (0.10 + speedRatio * 0.12);

      this.engineOsc1.frequency.setTargetAtTime(baseFreq, now, 0.05);
      this.engineOsc2.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.05);
      this.engineFilter.frequency.setTargetAtTime(targetFilter, now, 0.06);
      this.engineGain.gain.setTargetAtTime(targetVolume, now, 0.05);

      if (isDrifting) {
        this.playTireSkid(0.6);
      }
    } catch (e) {}
  }

  stopEngineSound() {
    if (!this.engineSoundActive || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0.0001, now, 0.04);
      }
      setTimeout(() => {
        try {
          if (this.engineOsc1) { this.engineOsc1.stop(); this.engineOsc1.disconnect(); }
          if (this.engineOsc2) { this.engineOsc2.stop(); this.engineOsc2.disconnect(); }
        } catch (e) {}
        this.engineSoundActive = false;
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineFilter = null;
        this.engineGain = null;
      }, 50);
    } catch (e) {
      this.engineSoundActive = false;
    }
  }

  playNitroBoost() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.25);

      gain.gain.setValueAtTime(0.28, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
      this.registerVoice(osc);
      this.vibrate([20, 30, 40]);
    } catch (e) {}
  }

  playTireSkid(intensity = 1) {
    if (this.isMuted || !this.sfxEnabled || !this.ctx || !this.noiseBuffer) return;
    this.throttle('tire_skid', 65, () => {
      try {
        const now = this.ctx.currentTime;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.noiseBuffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, now);
        filter.Q.setValueAtTime(3.5, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.14 * Math.min(1.2, intensity), now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);

        noise.start(now);
        noise.stop(now + 0.1);
        this.registerVoice(noise);
      } catch (e) {}
    });
  }

  // --- HEXA-TRON PROCEDURAL CYCLE HUM & SOUNDS ---

  startCycleHum() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx || this.cycleHumActive) return;
    try {
      const now = this.ctx.currentTime;
      this.cycleOsc = this.ctx.createOscillator();
      this.cycleGain = this.ctx.createGain();
      this.cycleOsc.type = 'sawtooth';
      this.cycleOsc.frequency.setValueAtTime(80, now);

      this.cycleGain.gain.setValueAtTime(0.08, now);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, now);

      this.cycleOsc.connect(filter);
      filter.connect(this.cycleGain);
      this.cycleGain.connect(this.sfxGain || this.masterGain);

      this.cycleOsc.start(now);
      this.cycleHumActive = true;
    } catch (e) {}
  }

  stopCycleHum() {
    if (!this.cycleHumActive) return;
    try {
      if (this.cycleOsc) {
        this.cycleOsc.stop();
        this.cycleOsc.disconnect();
      }
    } catch (e) {}
    this.cycleHumActive = false;
    this.cycleOsc = null;
    this.cycleGain = null;
  }

  playDirectionTurn() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.025);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.03);
      this.registerVoice(osc);
      this.vibrate(10);
    } catch (e) {}
  }

  playPhaseJump() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(950, now + 0.06);
      osc.frequency.linearRampToValueAtTime(300, now + 0.12);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

      osc.connect(gain);
      gain.connect(this.sfxGain || this.masterGain);
      osc.start(now);
      osc.stop(now + 0.13);
      this.registerVoice(osc);
      this.vibrate(20);
    } catch (e) {}
  }

  // --- CYBER PACMAN SPECIFICS ---

  playChomp(high = false) {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    this.throttle('pacman_chomp', 65, () => {
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        const startFreq = high ? 460 : 330;
        const endFreq = high ? 330 : 460;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.05);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(now);
        osc.stop(now + 0.055);
        this.registerVoice(osc);
      } catch (e) {}
    });
  }

  playGhostEaten(streak = 1) {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const baseFreq = 440 * Math.pow(1.26, Math.min(4, streak - 1));
      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.035;
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.2, t + 0.07);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(t);
        osc.stop(t + 0.075);
        this.registerVoice(osc);
      });
      this.vibrate(30);
    } catch (e) {}
  }

  playPacmanDeath() {
    if (this.isMuted || !this.sfxEnabled || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const steps = 11;
      for (let i = 0; i < steps; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + (i * 0.045);
        const freq = 600 - (i * 45);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(Math.max(60, freq), t);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

        osc.connect(gain);
        gain.connect(this.sfxGain || this.masterGain);
        osc.start(t);
        osc.stop(t + 0.04);
        this.registerVoice(osc);
      }
      this.vibrate([40, 40, 60]);
    } catch (e) {}
  }

  // --- GENERIC DISPATCHER (PRESERVES EXISTING play(name, ...args) CALLS) ---

  play(name, ...args) {
    if (!name || this.isMuted) return;
    const key = String(name).toLowerCase();
    const map = {
      laser: () => this.playLaser(...args),
      explosion: () => this.playExplosion(...args),
      powerup: () => this.playPowerup(...args),
      pickup: () => this.playGemPickup(...args),
      gem: () => this.playGemPickup(...args),
      gameover: () => this.playGameOver(...args),
      victory: () => this.playVictory(...args),
      hit: () => this.playHit(...args),
      warning: () => this.playWarning(...args),
      supernova: () => this.playSuperNova(...args),
      bomb: () => this.playSuperNova(...args),
      missile: () => this.playMissile(...args),
      jump: () => this.playJump(...args),
      dash: () => this.playAirDash(...args),
      airdash: () => this.playAirDash(...args),
      bounce: () => this.playBounce(...args),
      chomp: () => this.playChomp(...args),
      ghost: () => this.playGhostEaten(...args),
      levelup: () => this.playLevelUp(...args),
      click: () => this.playButtonClick(...args),
      hover: () => this.playButtonHover(...args),
      menu: () => this.playMenuOpen(...args),
      pause: () => this.playPause(...args),
      resume: () => this.playResume(...args)
    };

    if (map[key]) {
      map[key]();
    } else {
      const methodName = 'play' + key.charAt(0).toUpperCase() + key.slice(1);
      if (typeof this[methodName] === 'function') {
        this[methodName](...args);
      }
    }
  }

  // --- PHASE 4: ADAPTIVE PROCEDURAL BACKGROUND MUSIC (BGM) SYSTEM ---

  startBgm(track = 'lobby', { fadeTime = 0.4, adaptiveLevel = 0 } = {}) {
    this.init();
    if (!this.musicEnabled || this.isMuted) {
      this.currentTrack = track || this.currentTrack;
      return;
    }

    if (this.currentTrack === track && this.bgmPlaying && !this.isBgmPaused) {
      this.setAdaptiveIntensity(adaptiveLevel);
      return;
    }

    this.stopBgm({ fadeTime: 0.15 });

    if (track) this.currentTrack = track;
    this.adaptiveLevel = adaptiveLevel;
    this.bgmPlaying = true;
    this.isBgmPaused = false;
    this.bgmStep = 0;

    // Reset BGM filter cutoff to normal
    if (this.bgmFilter && this.ctx) {
      this.bgmFilter.frequency.setTargetAtTime(18000, this.ctx.currentTime, 0.1);
    }

    // Smooth fade-in
    if (this.bgmGain && this.ctx) {
      const targetVol = this.bgmVolume;
      this.bgmGain.gain.setValueAtTime(0.0001, this.ctx.currentTime);
      this.bgmGain.gain.exponentialRampToValueAtTime(Math.max(0.001, targetVol), this.ctx.currentTime + fadeTime);
    }

    // Track Presets
    let chords, bassNotes, tempo;

    switch (this.currentTrack) {
      case 'cyberSurvivors':
      case 'darksynth':
        tempo = 132;
        chords = [
          [146.83, 174.61, 220, 293.66],
          [130.81, 164.81, 196, 261.63],
          [164.81, 196, 246.94, 329.63],
          [110, 138.59, 164.81, 220]
        ];
        bassNotes = [73.42, 65.41, 82.41, 55];
        break;

      case 'neonDash':
        tempo = 142;
        chords = [
          [261.63, 329.63, 392, 523.25],
          [293.66, 349.23, 440, 587.33],
          [220, 261.63, 329.63, 440],
          [196, 246.94, 293.66, 392]
        ];
        bassNotes = [130.81, 146.83, 110, 98];
        break;

      case 'quantumBreaker':
        tempo = 126;
        chords = [
          [220, 261.63, 329.63, 440],
          [261.63, 329.63, 392, 523.25],
          [174.61, 220, 261.63, 349.23],
          [196, 246.94, 293.66, 392]
        ];
        bassNotes = [110, 130.81, 87.31, 98];
        break;

      case 'astroPulse':
        tempo = 128;
        chords = [
          [174.61, 220, 261.63, 329.63],
          [196, 246.94, 293.66, 392],
          [146.83, 174.61, 220, 293.66],
          [130.81, 164.81, 196, 261.63]
        ];
        bassNotes = [87.31, 98, 73.42, 65.41];
        break;

      case 'neonDrift':
        tempo = 136;
        chords = [
          [293.66, 349.23, 440, 587.33],
          [261.63, 329.63, 392, 523.25],
          [220, 261.63, 329.63, 440],
          [246.94, 293.66, 370, 493.88]
        ];
        bassNotes = [146.83, 130.81, 110, 123.47];
        break;

      case 'hexaTron':
        tempo = 134;
        chords = [
          [110, 146.83, 164.81, 220],
          [98, 130.81, 146.83, 196],
          [110, 146.83, 174.61, 220],
          [87.31, 116.54, 130.81, 174.61]
        ];
        bassNotes = [55, 49, 55, 43.65];
        break;

      case 'cyberPacman':
      case 'chiptune':
        tempo = 130;
        chords = [
          [261.63, 329.63, 392, 523.25],
          [220, 261.63, 329.63, 440],
          [174.61, 220, 261.63, 349.23],
          [196, 246.94, 293.66, 392]
        ];
        bassNotes = [130.81, 110, 87.31, 98];
        break;

      case 'lobby':
      case 'synthwave':
      default:
        tempo = 118;
        chords = [
          [220, 261.63, 329.63, 440],
          [174.61, 220, 261.63, 349.23],
          [261.63, 329.63, 392, 523.25],
          [196, 246.94, 293.66, 392]
        ];
        bassNotes = [110, 87.31, 130.81, 98];
        break;
    }

    const stepDuration = (60 / tempo) / 4;

    const tick = () => {
      if (!this.bgmPlaying || !this.ctx || this.isBgmPaused) return;
      if (typeof document !== 'undefined' && document.hidden) return;

      const now = this.ctx.currentTime;
      const bar = Math.floor((this.bgmStep / 16) % 4);
      const stepInBar = this.bgmStep % 16;
      const currentChord = chords[bar];
      const currentBass = bassNotes[bar];

      // 1. Bassline (8th notes)
      if (stepInBar % 2 === 0) {
        try {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = (this.currentTrack === 'cyberPacman' || this.currentTrack === 'chiptune') ? 'triangle' : 'sawtooth';
          bassOsc.frequency.setValueAtTime(currentBass * (stepInBar % 4 === 2 ? 1.5 : 1), now);

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(this.adaptiveLevel > 0 ? 550 : 380, now);
          filter.frequency.exponentialRampToValueAtTime(90, now + stepDuration * 1.3);

          bassGain.gain.setValueAtTime(0.18, now);
          bassGain.gain.exponentialRampToValueAtTime(0.0001, now + stepDuration * 1.3);

          bassOsc.connect(filter);
          filter.connect(bassGain);
          bassGain.connect(this.bgmGain);

          bassOsc.start(now);
          bassOsc.stop(now + stepDuration * 1.3);
          this.registerVoice(bassOsc);
        } catch (e) {}
      }

      // 2. Arpeggiator Lead
      if (stepInBar % 2 === 1 || stepInBar % 4 === 0 || this.adaptiveLevel > 0) {
        try {
          const arpNote = currentChord[stepInBar % currentChord.length];
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          leadOsc.type = (this.currentTrack === 'cyberPacman' || this.currentTrack === 'chiptune') ? 'square' : 'triangle';
          leadOsc.frequency.setValueAtTime(arpNote * (this.adaptiveLevel >= 2 ? 2 : 1), now);

          leadGain.gain.setValueAtTime(0.045, now);
          leadGain.gain.exponentialRampToValueAtTime(0.0001, now + stepDuration * 1.4);

          leadOsc.connect(leadGain);
          leadGain.connect(this.bgmGain);

          leadOsc.start(now);
          leadOsc.stop(now + stepDuration * 1.4);
          this.registerVoice(leadOsc);
        } catch (e) {}
      }

      // 3. Kick Drum (4-on-the-floor beat)
      if (stepInBar % 4 === 0 || (this.adaptiveLevel >= 2 && stepInBar % 2 === 0)) {
        try {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.frequency.setValueAtTime(130, now);
          kickOsc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

          kickGain.gain.setValueAtTime(this.adaptiveLevel >= 2 ? 0.28 : 0.22, now);
          kickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

          kickOsc.connect(kickGain);
          kickGain.connect(this.bgmGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.08);
          this.registerVoice(kickOsc);
        } catch (e) {}
      }

      // 4. Snare / Cyber Clap (beats 2 & 4)
      if ((stepInBar === 4 || stepInBar === 12) && this.noiseBuffer) {
        try {
          const snareSrc = this.ctx.createBufferSource();
          snareSrc.buffer = this.noiseBuffer;
          const snareGain = this.ctx.createGain();
          snareGain.gain.setValueAtTime(0.09, now);
          snareGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

          snareSrc.connect(snareGain);
          snareGain.connect(this.bgmGain);
          snareSrc.start(now);
          snareSrc.stop(now + 0.07);
          this.registerVoice(snareSrc);
        } catch (e) {}
      }

      this.bgmStep++;
    };

    this.bgmInterval = setInterval(tick, stepDuration * 1000);
    if (this.bgmInterval && typeof this.bgmInterval.unref === 'function') {
      this.bgmInterval.unref();
    }
  }

  stopBgm({ fadeTime = 0.3 } = {}) {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }

    if (this.bgmGain && this.ctx && fadeTime > 0) {
      try {
        this.bgmGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, fadeTime * 0.5);
      } catch (e) {}
    }

    this.bgmPlaying = false;
    this.isBgmPaused = false;
  }

  pauseBgm() {
    if (!this.bgmPlaying || this.isBgmPaused) return;
    this.isBgmPaused = true;
    if (this.bgmFilter && this.ctx) {
      // Classic underwater / paused low-pass filter effect
      this.bgmFilter.frequency.setTargetAtTime(450, this.ctx.currentTime, 0.08);
    }
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setTargetAtTime(this.bgmVolume * 0.25, this.ctx.currentTime, 0.08);
    }
  }

  resumeBgm() {
    if (!this.bgmPlaying || !this.isBgmPaused) return;
    this.isBgmPaused = false;
    if (this.bgmFilter && this.ctx) {
      this.bgmFilter.frequency.setTargetAtTime(18000, this.ctx.currentTime, 0.15);
    }
    if (this.bgmGain && this.ctx) {
      const target = (this.isMuted || !this.musicEnabled) ? 0 : this.bgmVolume;
      this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.15);
    }
  }

  setAdaptiveIntensity(level = 0) {
    this.adaptiveLevel = Math.max(0, Math.min(2, level));
  }
}

export const sound = new SoundEngine();
