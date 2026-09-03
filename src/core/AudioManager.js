// Web Audio API Synthesizer for Retro-Modern Orchestral RPG Audio & Sound FX

class AudioManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.bgmNode = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.currentTrack = null;
    this.bgmInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.8;
      
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.35;
      
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.6;
      
      this.bgmGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 0.8;
    }
    return this.isMuted;
  }

  // SOUND FX GENERATORS
  playSlash() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // White noise swoosh
    const bufferSize = this.ctx.sampleRate * 0.15;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.15);
    filter.Q.value = 3;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    
    noise.start(now);
  }

  playHitImpact(isCrit = false) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = isCrit ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 350 : 200, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
    
    gain.gain.setValueAtTime(isCrit ? 0.8 : 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    
    osc.start(now);
    osc.stop(now + 0.2);
  }

  playMagicCast(type = 'fire') {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    if (type === 'fire') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
    } else if (type === 'ice') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.25);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.2);
    }

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  playDodge() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.25);
    
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playBossRoar() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 1.2);
    
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 1.2);
  }

  playChestOpen() {
    if (!this.ctx || this.isMuted) return;
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      const now = this.ctx.currentTime + idx * 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  playJump() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(360, now + 0.15);
    
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  playLand() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(120, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
    
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  // DYNAMIC PEACEFUL BACKGROUND MUSIC SYNTH
  playBGM(track = 'town') {
    if (!this.ctx) return;
    if (this.currentTrack === track && this.bgmInterval) return;
    this.currentTrack = track;
    
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval);
      this.bgmInterval = null;
    }

    let step = 0;
    // Relaxing peaceful acoustic harp/lute chords (Cmaj7, Am9, Fmaj7, G6)
    const peacefulTownChords = [
      [261.63, 329.63, 392.00, 493.88], // Cmaj7
      [220.00, 261.63, 329.63, 440.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
      [196.00, 246.94, 293.66, 392.00]  // G6
    ];

    const dungeonChords = [
      [146.83, 174.61, 220.00], // Dm
      [130.81, 164.81, 196.00], // C
      [116.54, 146.83, 174.61], // Bb
      [110.00, 138.59, 164.81]  // A
    ];

    const isTown = track === 'town';
    const chords = isTown ? peacefulTownChords : dungeonChords;
    const speed = isTown ? 1200 : 450; // Slow, relaxing 1.2s per bar for peaceful town

    this.bgmInterval = setInterval(() => {
      if (this.isMuted || !this.ctx) return;
      const chord = chords[step % chords.length];
      const now = this.ctx.currentTime;
      
      // Soft gentle warm pad
      chord.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = isTown ? 'sine' : 'sawtooth';
        osc.frequency.setValueAtTime(freq * (isTown ? 0.5 : 0.5), now);
        
        const noteVol = (idx === 0 ? 0.08 : 0.04) * (isTown ? 0.8 : 0.7);
        gain.gain.setValueAtTime(noteVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (speed / 1000) * 1.8);
        
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(now);
        osc.stop(now + (speed / 1000) * 1.8);
      });

      // Relaxing acoustic harp arpeggio note
      if (isTown) {
        const harpNote = chord[(step * 2) % chord.length] * 1.5;
        const harpOsc = this.ctx.createOscillator();
        const harpGain = this.ctx.createGain();
        harpOsc.type = 'triangle';
        harpOsc.frequency.setValueAtTime(harpNote, now + 0.15);
        
        harpGain.gain.setValueAtTime(0.06, now + 0.15);
        harpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        
        harpOsc.connect(harpGain);
        harpGain.connect(this.bgmGain);
        harpOsc.start(now + 0.15);
        harpOsc.stop(now + 0.95);
      }

      step++;
    }, speed);
  }
}

export const audioManager = new AudioManager();
