// Multi-Track Procedural Synthesizer & Sound Engine
// Three procedural music tracks: Synthwave Sunset, Dark Cyberpunk, Chiptune Rush.

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    
    this.isMuted = false;
    this.sfxVolume = 0.6;
    this.bgmVolume = 0.35;
    
    this.bgmInterval = null;
    this.bgmStep = 0;
    this.bgmTempo = 126;
    this.bgmPlaying = false;
    this.currentTrack = 'synthwave';

    this.noiseBuffer = null;
    this.lastExplosionTime = 0;
  }

  init() {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
        this.bgmGain.connect(this.masterGain);

        // Pre-bake 1.5s noise buffer
        const sampleRate = this.ctx.sampleRate;
        const bufferSize = Math.floor(sampleRate * 1.5);
        this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      } catch (e) {
        console.warn('Web Audio init error:', e);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setSfxVolume(val) {
    this.sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  setBgmVolume(val) {
    this.bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this.bgmVolume, this.ctx.currentTime);
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 1.0, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // --- PROCEDURAL SOUND EFFECTS ---

  playLaser(type = 'normal') {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type === 'heavy' ? 'sawtooth' : 'triangle';
      const startFreq = type === 'heavy' ? 440 : (type === 'fast' ? 980 : 820);
      const endFreq = type === 'heavy' ? 80 : 120;
      const duration = type === 'heavy' ? 0.2 : 0.1;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {}
  }

  playSuperNova() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      // Massive rising sweep into bass crash
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.35);

      setTimeout(() => this.playExplosion(2.8), 100);
    } catch (e) {}
  }

  playExplosion(intensity = 1) {
    if (this.isMuted || !this.ctx || !this.noiseBuffer) return;
    try {
      const now = this.ctx.currentTime;
      if (now - this.lastExplosionTime < 0.04 && intensity <= 1) return;
      this.lastExplosionTime = now;

      const duration = Math.min(0.45, 0.25 * intensity);

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(intensity > 1.5 ? 400 : 700, now);
      filter.frequency.exponentialRampToValueAtTime(50, now + duration);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.4 * Math.min(1.2, intensity), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      const subOsc = this.ctx.createOscillator();
      const subGain = this.ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(120, now);
      subOsc.frequency.exponentialRampToValueAtTime(30, now + duration);

      subGain.gain.setValueAtTime(0.35, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      subOsc.connect(subGain);
      subGain.connect(this.sfxGain);

      whiteNoise.start(now);
      subOsc.start(now);
      whiteNoise.stop(now + duration);
      subOsc.stop(now + duration);
    } catch (e) {}
  }

  playGemPickup(combo = 1) {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];
      const freq = scale[Math.min(scale.length - 1, (combo - 1) % scale.length)];

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.4, now + 0.09);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  playJump() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.12);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  playAirDash() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(1100, now + 0.1);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  playHit() {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (e) {}
  }

  playBounce(pitchMultiplier = 1) {
    if (this.isMuted || !this.ctx) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const base = 300 * pitchMultiplier;
      osc.frequency.setValueAtTime(base, now);
      osc.frequency.exponentialRampToValueAtTime(base * 1.5, now + 0.07);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {}
  }

  playPowerup() {
    if (this.isMuted || !this.ctx) return;
    try {
      const notes = [440, 554.37, 659.25, 880];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.18, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.12);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.12);
      });
    } catch (e) {}
  }

  playLevelUp() {
    if (this.isMuted || !this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0.22, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
    } catch (e) {}
  }

  playGameOver() {
    if (this.isMuted || !this.ctx) return;
    try {
      const notes = [440, 415.3, 392, 349.23];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0.25, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.2);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.2);
      });
    } catch (e) {}
  }

  playVictory() {
    if (this.isMuted || !this.ctx) return;
    try {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(0.25, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.25);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.25);
      });
    } catch (e) {}
  }

  // --- MULTI-TRACK PROCEDURAL SYNTHWAVE / DARKSYNTH / CHIPTUNE BGM ---

  startBgm(track = null) {
    this.init();
    this.stopBgm();
    if (track) this.currentTrack = track;
    this.bgmPlaying = true;
    this.bgmStep = 0;

    let chords, bassNotes, tempo;

    if (this.currentTrack === 'darksynth') {
      tempo = 134;
      chords = [
        [146.83, 174.61, 220, 293.66], // Dm
        [130.81, 164.81, 196, 261.63], // Bb
        [164.81, 196, 246.94, 329.63], // Gm
        [110, 138.59, 164.81, 220]     // A
      ];
      bassNotes = [73.42, 65.41, 82.41, 55];
    } else if (this.currentTrack === 'chiptune') {
      tempo = 142;
      chords = [
        [261.63, 329.63, 392, 523.25], // C
        [220, 261.63, 329.63, 440],     // Am
        [174.61, 220, 261.63, 349.23],  // F
        [196, 246.94, 293.66, 392]      // G
      ];
      bassNotes = [130.81, 110, 87.31, 98];
    } else {
      // Synthwave Sunset
      tempo = 124;
      chords = [
        [220, 261.63, 329.63, 440],
        [174.61, 220, 261.63, 349.23],
        [261.63, 329.63, 392, 523.25],
        [196, 246.94, 293.66, 392]
      ];
      bassNotes = [110, 87.31, 130.81, 98];
    }

    const stepDuration = (60 / tempo) / 4;

    const tick = () => {
      if (!this.bgmPlaying || !this.ctx || document.hidden) return;
      const now = this.ctx.currentTime;
      const bar = Math.floor((this.bgmStep / 16) % 4);
      const stepInBar = this.bgmStep % 16;
      const currentChord = chords[bar];
      const currentBass = bassNotes[bar];

      // 1. Synthwave / Darksynth Bassline
      if (stepInBar % 2 === 0) {
        try {
          const bassOsc = this.ctx.createOscillator();
          const bassGain = this.ctx.createGain();
          bassOsc.type = this.currentTrack === 'chiptune' ? 'triangle' : 'sawtooth';
          bassOsc.frequency.setValueAtTime(currentBass * (stepInBar % 4 === 2 ? 1.5 : 1), now);

          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(this.currentTrack === 'darksynth' ? 600 : 380, now);
          filter.frequency.exponentialRampToValueAtTime(100, now + stepDuration * 1.3);

          bassGain.gain.setValueAtTime(0.18, now);
          bassGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.3);

          bassOsc.connect(filter);
          filter.connect(bassGain);
          bassGain.connect(this.bgmGain);

          bassOsc.start(now);
          bassOsc.stop(now + stepDuration * 1.3);
        } catch (e) {}
      }

      // 2. Arpeggiator Lead
      if (this.currentTrack === 'chiptune' || stepInBar % 2 === 1 || stepInBar % 4 === 0) {
        try {
          const arpNote = currentChord[stepInBar % currentChord.length];
          const leadOsc = this.ctx.createOscillator();
          const leadGain = this.ctx.createGain();
          leadOsc.type = this.currentTrack === 'chiptune' ? 'square' : 'triangle';
          leadOsc.frequency.setValueAtTime(arpNote * (this.currentTrack === 'chiptune' ? 2 : 1), now);

          leadGain.gain.setValueAtTime(0.05, now);
          leadGain.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 1.5);

          leadOsc.connect(leadGain);
          leadGain.connect(this.bgmGain);

          leadOsc.start(now);
          leadOsc.stop(now + stepDuration * 1.5);
        } catch (e) {}
      }

      // 3. Cyber Beat (Kick)
      if (stepInBar % 4 === 0) {
        try {
          const kickOsc = this.ctx.createOscillator();
          const kickGain = this.ctx.createGain();
          kickOsc.frequency.setValueAtTime(130, now);
          kickOsc.frequency.exponentialRampToValueAtTime(28, now + 0.08);
          kickGain.gain.setValueAtTime(0.24, now);
          kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          kickOsc.connect(kickGain);
          kickGain.connect(this.bgmGain);
          kickOsc.start(now);
          kickOsc.stop(now + 0.08);
        } catch (e) {}
      }

      // 4. Snare
      if ((stepInBar === 4 || stepInBar === 12) && this.noiseBuffer) {
        try {
          const snareSrc = this.ctx.createBufferSource();
          snareSrc.buffer = this.noiseBuffer;
          const snareGain = this.ctx.createGain();
          snareGain.gain.setValueAtTime(0.09, now);
          snareGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

          snareSrc.connect(snareGain);
          snareGain.connect(this.bgmGain);
          snareSrc.start(now);
          snareSrc.stop(now + 0.07);
        } catch (e) {}
      }

      this.bgmStep++;
    };

    this.bgmInterval = setInterval(tick, stepDuration * 1000);
  }

  stopBgm() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }
    this.bgmPlaying = false;
  }
}

export const sound = new SoundEngine();
