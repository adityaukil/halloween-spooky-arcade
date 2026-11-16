// Enhanced Spooky Web Audio API Synthesizer
// Zero external assets - 100% procedural sound synthesis

class SpookyAudioEngine {
  constructor() {
    this.ctx = null;
    this.sfxEnabled = true;
    this.ambientEnabled = false;
    this.ambientNodes = null;
    this.heartbeatTimer = null;
    this.masterGain = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.75;
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Toggle ambient creepy drone
  toggleAmbient(forceState) {
    this.ensureContext();
    if (!this.ctx) return false;

    if (forceState !== undefined) {
      this.ambientEnabled = forceState;
    } else {
      this.ambientEnabled = !this.ambientEnabled;
    }

    if (this.ambientEnabled) {
      this.startAmbient();
    } else {
      this.stopAmbient();
    }
    return this.ambientEnabled;
  }

  startAmbient() {
    this.stopAmbient();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const droneGain = this.ctx.createGain();
      droneGain.gain.setValueAtTime(0.001, now);
      droneGain.gain.exponentialRampToValueAtTime(0.22, now + 2.5);

      // Eerie resonance filter with slow eerie wind breathing
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(260, now);
      filter.Q.setValueAtTime(3.5, now);

      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.12, now); // slow howling breath
      lfoGain.gain.setValueAtTime(160, now);
      lfo.connect(filter.frequency);
      lfo.start();

      // Deep gothic organ drone: C#2 (69.3), E2 (82.4), G2 (98.0), Bb2 (116.5) - Diminished 7th chord!
      const freqs = [69.30, 82.41, 97.99, 116.54, 138.59];
      const oscs = [];

      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime((Math.random() - 0.5) * 15, now);

        const oscGain = this.ctx.createGain();
        oscGain.gain.setValueAtTime(0.09 / freqs.length, now);

        osc.connect(filter);
        osc.start();
        oscs.push(osc);
      });

      filter.connect(droneGain);
      droneGain.connect(this.masterGain);

      this.ambientNodes = { droneGain, filter, lfo, oscs };
      this.startHeartbeat();
    } catch (e) {
      console.warn('Audio ambient error:', e);
    }
  }

  stopAmbient() {
    this.stopHeartbeat();
    if (this.ambientNodes) {
      try {
        const now = this.ctx ? this.ctx.currentTime : 0;
        this.ambientNodes.droneGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
        setTimeout(() => {
          if (this.ambientNodes) {
            this.ambientNodes.oscs.forEach(o => { try { o.stop(); } catch(e){} });
            try { this.ambientNodes.lfo.stop(); } catch(e){}
            this.ambientNodes = null;
          }
        }, 700);
      } catch (e) {
        this.ambientNodes = null;
      }
    }
  }

  startHeartbeat() {
    this.stopHeartbeat();
    const beat = () => {
      if (!this.ambientEnabled) return;
      this.playHeartbeat();
      this.heartbeatTimer = setTimeout(beat, 1800 + Math.random() * 800);
    };
    this.heartbeatTimer = setTimeout(beat, 1000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  playHeartbeat() {
    if (!this.ctx || !this.sfxEnabled) return;
    const now = this.ctx.currentTime;
    [0, 0.22].forEach(delay => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, now + delay);
      osc.frequency.exponentialRampToValueAtTime(25, now + delay + 0.12);

      gain.gain.setValueAtTime(0.28, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.16);
    });
  }

  // Creaking Crypt Iron Gate Sound (Used when entering site / unsealing)
  playCreakingGate() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, now);
    osc.frequency.linearRampToValueAtTime(320, now + 0.4);
    osc.frequency.linearRampToValueAtTime(140, now + 0.9);
    osc.frequency.linearRampToValueAtTime(220, now + 1.4);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.55);
  }

  // Funeral Death Bell Strike (Ominous church bell)
  playFuneralBell() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;

    const now = this.ctx.currentTime;
    const freqs = [216, 432, 648, 864]; // Eerie bell overtones
    freqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);

      const vol = 0.25 / (idx + 1);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 3.1);
    });
  }

  // Thunder Clap & Lightning Rumble
  playThunder() {
    this.ensureContext();
    if (!this.ctx || !this.sfxEnabled) return;

    const now = this.ctx.currentTime;
    // White noise buffer for thunder crack
    const bufferSize = this.ctx.sampleRate * 1.5;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, now);
    filter.frequency.linearRampToValueAtTime(80, now + 1.2);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
    noise.stop(now + 1.55);
  }

  // Blade Slash (Pumpkin Slasher)
  playSlash() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1100 + Math.random() * 300, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Pumpkin Splat & Seeds squish
  playPumpkinSplat() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.22);

    gain.gain.setValueAtTime(0.42, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.23);
  }

  // Ghostly Wail / Spell cast
  playGhostWail() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.linearRampToValueAtTime(740, now + 0.18);
    osc.frequency.linearRampToValueAtTime(290, now + 0.4);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.43);
  }

  // Bone Rattle / Jump sound
  playBoneRattle() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    [0, 0.03, 0.06].forEach(delay => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(420 + Math.random() * 120, now + delay);
      gain.gain.setValueAtTime(0.18, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.035);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + delay);
      osc.stop(now + delay + 0.04);
    });
  }

  // Candy / Score Chime
  playCandyChime() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const notes = [783.99, 880.0, 1046.5, 1174.66];
    osc.frequency.setValueAtTime(notes[Math.floor(Math.random() * notes.length)], now);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  // Jump Scare / Game Over Stinger
  playScareStinger() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    // Dissonant devil's tritone chord
    const freqs = [103.83, 146.83, 207.65, 293.66];
    freqs.forEach(f => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.95);
    });
  }

  // Blood Moon Horn
  playBloodMoonRiser() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.linearRampToValueAtTime(140, now + 1.2);

    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.5);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 1.65);
  }

  // Explosion
  playExplosion() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(18, now + 0.45);

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.48);
  }
}

window.spookyAudio = new SpookyAudioEngine();
