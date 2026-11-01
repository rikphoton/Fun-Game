import test from 'node:test';
import assert from 'node:assert/strict';

// Mock Web Audio API environment for robust node-based testing
class MockAudioParam {
  constructor(defaultValue = 1.0) {
    this.value = defaultValue;
  }
  setValueAtTime(val) { this.value = val; }
  setTargetAtTime(val) { this.value = val; }
  linearRampToValueAtTime(val) { this.value = val; }
  exponentialRampToValueAtTime(val) { this.value = val; }
}

class MockAudioNode {
  constructor() {
    this.connectedTo = [];
  }
  connect(dest) {
    this.connectedTo.push(dest);
    return dest;
  }
  disconnect() {
    this.connectedTo = [];
  }
}

class MockGainNode extends MockAudioNode {
  constructor(initialGain = 1.0) {
    super();
    this.gain = new MockAudioParam(initialGain);
  }
}

class MockOscillatorNode extends MockAudioNode {
  constructor() {
    super();
    this.frequency = new MockAudioParam(440);
    this.type = 'sine';
    this.started = false;
    this.stopped = false;
    this.onended = null;
  }
  start() { this.started = true; }
  stop() {
    this.stopped = true;
    if (this.onended) this.onended();
  }
}

class MockBiquadFilterNode extends MockAudioNode {
  constructor() {
    super();
    this.type = 'lowpass';
    this.frequency = new MockAudioParam(1000);
    this.Q = new MockAudioParam(1);
  }
}

class MockCompressorNode extends MockAudioNode {
  constructor() {
    super();
    this.threshold = new MockAudioParam(-3.0);
    this.knee = new MockAudioParam(6.0);
    this.ratio = new MockAudioParam(14.0);
    this.attack = new MockAudioParam(0.003);
    this.release = new MockAudioParam(0.12);
  }
}

class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.state = 'running';
    this.destination = new MockAudioNode();
  }
  createGain() { return new MockGainNode(); }
  createOscillator() { return new MockOscillatorNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createDynamicsCompressor() { return new MockCompressorNode(); }
  createBuffer(channels, length, rate) {
    return {
      channels,
      length,
      rate,
      getChannelData: () => new Float32Array(length)
    };
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      onended: null
    };
  }
  createStereoPanner() {
    return {
      pan: new MockAudioParam(0),
      connect: () => {},
      disconnect: () => {}
    };
  }
  suspend() { this.state = 'suspended'; return Promise.resolve(); }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

// Attach Mock Window & AudioContext for Node.js test environment
globalThis.window = {
  AudioContext: MockAudioContext,
  webkitAudioContext: MockAudioContext,
  addEventListener: () => {},
  removeEventListener: () => {}
};
globalThis.document = {
  hidden: false,
  addEventListener: () => {}
};

// Import sound engine
const { sound } = await import('../src/engine/audio.js');

test('Audio Engine: Architecture, Bus Routing & Initialization', () => {
  sound.init();

  assert.ok(sound.ctx, 'AudioContext must be created');
  assert.ok(sound.masterGain, 'Master gain bus must exist');
  assert.ok(sound.masterLimiter, 'Master limiter/compressor must exist');
  assert.ok(sound.bgmGain, 'BGM gain bus must exist');
  assert.ok(sound.sfxGain, 'SFX gain bus must exist');
  assert.ok(sound.uiGain, 'UI gain bus must exist');
  assert.ok(sound.ambientGain, 'Ambient gain bus must exist');
  assert.ok(sound.noiseBuffer, 'Noise buffer must be synthesized');

  // Verify bus connections: masterGain -> masterLimiter -> destination
  assert.ok(sound.masterGain.connectedTo.includes(sound.masterLimiter), 'Master gain must connect to limiter');
  assert.ok(sound.masterLimiter.connectedTo.includes(sound.ctx.destination), 'Limiter must connect to destination');

  // Verify sub-buses connect to master
  assert.ok(sound.sfxGain.connectedTo.includes(sound.masterGain), 'SFX bus must route to master');
  assert.ok(sound.uiGain.connectedTo.includes(sound.masterGain), 'UI bus must route to master');
  assert.ok(sound.ambientGain.connectedTo.includes(sound.masterGain), 'Ambient bus must route to master');
});

test('Audio Engine: Volume Controls, Mute & Channel Toggles', () => {
  sound.init();

  // 1. Master Volume
  sound.setMasterVolume(0.5);
  assert.equal(sound.masterVolume, 0.5);
  sound.setMasterVolume(1.5); // Clamping test
  assert.equal(sound.masterVolume, 1.0);
  sound.setMasterVolume(-0.2);
  assert.equal(sound.masterVolume, 0.0);
  sound.setMasterVolume(0.8);

  // 2. BGM Volume & Mute
  sound.setBgmVolume(0.3);
  assert.equal(sound.bgmVolume, 0.3);
  sound.setMusicEnabled(false);
  assert.equal(sound.musicEnabled, false);
  sound.setMusicEnabled(true);
  assert.equal(sound.musicEnabled, true);

  // 3. SFX Volume
  sound.setSfxVolume(0.7);
  assert.equal(sound.sfxVolume, 0.7);
  sound.setSfxEnabled(false);
  assert.equal(sound.sfxEnabled, false);
  sound.setSfxEnabled(true);
  assert.equal(sound.sfxEnabled, true);

  // 4. Master Mute Toggle
  sound.setMute(false);
  assert.equal(sound.isMuted, false);
  sound.toggleMute();
  assert.equal(sound.isMuted, true);
  sound.toggleMute();
  assert.equal(sound.isMuted, false);

  // 5. Ambient & Haptics Toggles
  sound.setAmbientAudioEnabled(false);
  assert.equal(sound.ambientAudioEnabled, false);
  sound.setAmbientAudioEnabled(true);
  assert.equal(sound.ambientAudioEnabled, true);

  sound.setHapticsEnabled(false);
  assert.equal(sound.hapticsEnabled, false);
  sound.setHapticsEnabled(true);
  assert.equal(sound.hapticsEnabled, true);
});

test('Audio Engine: Polyphony Limiter & Voice Stealing', () => {
  sound.init();
  sound.activeVoices.clear();

  // Register voices up to MAX_POLYPHONY (28)
  for (let i = 0; i < 28; i++) {
    const osc = sound.ctx.createOscillator();
    sound.registerVoice(osc);
  }
  assert.equal(sound.activeVoices.size, 28);

  // Adding 29th voice should steal oldest without throwing
  const newOsc = sound.ctx.createOscillator();
  sound.registerVoice(newOsc);
  assert.equal(sound.activeVoices.size, 28);
  assert.ok(sound.activeVoices.has(newOsc));

  // Stopping a voice cleans it up from active set
  newOsc.stop();
  assert.equal(sound.activeVoices.has(newOsc), false);
  assert.equal(sound.activeVoices.size, 27);
});

test('Audio Engine: Repetitive Sound Throttling', () => {
  let count = 0;
  const inc = () => { count++; };

  // First call succeeds
  const res1 = sound.throttle('test_throttle', 50, inc);
  assert.equal(res1, true);
  assert.equal(count, 1);

  // Immediate second call within 50ms is throttled
  const res2 = sound.throttle('test_throttle', 50, inc);
  assert.equal(res2, false);
  assert.equal(count, 1);
});

test('Audio Engine: All 7 Games BGM Tracks, Transitions & Adaptive Intensity', () => {
  sound.init();

  const gameTracks = [
    'cyberSurvivors',
    'neonDash',
    'quantumBreaker',
    'astroPulse',
    'neonDrift',
    'hexaTron',
    'cyberPacman',
    'lobby'
  ];

  for (const track of gameTracks) {
    sound.startBgm(track, { fadeTime: 0.05 });
    assert.equal(sound.currentTrack, track);
    assert.equal(sound.bgmPlaying, true);
    assert.ok(sound.bgmInterval !== null);

    // Test adaptive intensity
    sound.setAdaptiveIntensity(2); // Boss battle mode
    assert.equal(sound.adaptiveLevel, 2);

    sound.setAdaptiveIntensity(0); // Standard mode
    assert.equal(sound.adaptiveLevel, 0);

    // Test pause and resume
    sound.pauseBgm();
    assert.equal(sound.isBgmPaused, true);

    sound.resumeBgm();
    assert.equal(sound.isBgmPaused, false);
  }

  sound.stopBgm({ fadeTime: 0.05 });
  assert.equal(sound.bgmPlaying, false);
  assert.equal(sound.bgmInterval, null);
});

test('Audio Engine: Procedural Real-Time Synthesizers (Engine & Cycle Hum)', () => {
  sound.init();

  // Neon Drift procedural engine
  sound.startEngineSound();
  assert.equal(sound.engineSoundActive, true);

  sound.updateEngineSound(0.5, true, false);
  assert.equal(sound.engineSoundActive, true);

  sound.stopEngineSound();

  // Hexa-Tron cycle hum
  sound.startCycleHum();
  assert.equal(sound.cycleHumActive, true);

  sound.stopCycleHum();
  assert.equal(sound.cycleHumActive, false);
});

test('Audio Engine: Global Interface and Game Sound Trigger API', () => {
  sound.init();

  // Interface sounds
  assert.doesNotThrow(() => sound.playMenuOpen());
  assert.doesNotThrow(() => sound.playButtonHover());
  assert.doesNotThrow(() => sound.playButtonClick());
  assert.doesNotThrow(() => sound.playGameSelect());
  assert.doesNotThrow(() => sound.playBriefingOpen());
  assert.doesNotThrow(() => sound.playMissionStart());
  assert.doesNotThrow(() => sound.playPause());
  assert.doesNotThrow(() => sound.playResume());
  assert.doesNotThrow(() => sound.playGameExit());
  assert.doesNotThrow(() => sound.playSettingsInteract());
  assert.doesNotThrow(() => sound.playAchievement());
  assert.doesNotThrow(() => sound.playNewRecord());
  assert.doesNotThrow(() => sound.playLevelComplete());

  // Game specific sounds
  assert.doesNotThrow(() => sound.playLaser('heavy', -0.5));
  assert.doesNotThrow(() => sound.playExplosion(1.5, 0.5));
  assert.doesNotThrow(() => sound.playShieldSpark());
  assert.doesNotThrow(() => sound.playHealthPickup());
  assert.doesNotThrow(() => sound.playJump());
  assert.doesNotThrow(() => sound.playGravityFlip());
  assert.doesNotThrow(() => sound.playAirDash());
  assert.doesNotThrow(() => sound.playFootstep());
  assert.doesNotThrow(() => sound.playLanding());
  assert.doesNotThrow(() => sound.playNearMiss());
  assert.doesNotThrow(() => sound.playBallLaunch());
  assert.doesNotThrow(() => sound.playPaddleBounce(0.3));
  assert.doesNotThrow(() => sound.playBrickImpact('explosive'));
  assert.doesNotThrow(() => sound.playBrickDestroy(true));
  assert.doesNotThrow(() => sound.playBallLost());
  assert.doesNotThrow(() => sound.playNitroBoost());
  assert.doesNotThrow(() => sound.playTireSkid(1.0));
  assert.doesNotThrow(() => sound.playDirectionTurn());
  assert.doesNotThrow(() => sound.playPhaseJump());
  assert.doesNotThrow(() => sound.playChomp(true));
  assert.doesNotThrow(() => sound.playGhostEaten(3));
  assert.doesNotThrow(() => sound.playPacmanDeath());
});
