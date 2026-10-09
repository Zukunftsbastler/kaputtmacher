// All sound is synthesised with the Web Audio API; there are no audio files.

export class Audio {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.last = {}; // per-sound throttle
    this.laserT = 0;
  }

  // Browsers only allow audio after a user gesture; call this from the first click or key press.
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    const len = ctx.sampleRate, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
    // Continuous laser hum, silent until needed.
    this.laserOsc = ctx.createOscillator();
    this.laserOsc.type = 'sawtooth';
    this.laserOsc.frequency.value = 180;
    this.laserGain = ctx.createGain();
    this.laserGain.gain.value = 0;
    const lf = ctx.createBiquadFilter();
    lf.type = 'bandpass'; lf.frequency.value = 1400; lf.Q.value = 2;
    this.laserOsc.connect(lf).connect(this.laserGain).connect(this.master);
    this.laserOsc.start();
    // Continuous fire crackle, silent until something burns.
    const fire = ctx.createBufferSource(), ff = ctx.createBiquadFilter();
    fire.buffer = buf; fire.loop = true;
    ff.type = 'bandpass'; ff.frequency.value = 900; ff.Q.value = 0.6;
    this.fireGain = ctx.createGain();
    this.fireGain.gain.value = 0;
    fire.connect(ff).connect(this.fireGain).connect(this.master);
    fire.start();
    // Helicopter: low noise chopped by the rotor.
    const heli = ctx.createBufferSource(), hf = ctx.createBiquadFilter(), chop = ctx.createGain(), lfo = ctx.createOscillator(), depth = ctx.createGain();
    heli.buffer = buf; heli.loop = true;
    hf.type = 'lowpass'; hf.frequency.value = 420;
    lfo.type = 'square'; lfo.frequency.value = 13; depth.gain.value = 0.5; chop.gain.value = 0.5;
    lfo.connect(depth).connect(chop.gain);
    this.heliGain = ctx.createGain();
    this.heliGain.gain.value = 0;
    heli.connect(hf).connect(chop).connect(this.heliGain).connect(this.master);
    heli.start(); lfo.start();
  }

  // Water under pressure: level 0..1.
  hiss(level) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (!this.hissGain) {
      const src = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter();
      src.buffer = this.noiseBuf; src.loop = true;
      f.type = 'highpass'; f.frequency.value = 2200;
      this.hissGain = this.ctx.createGain();
      this.hissGain.gain.value = 0;
      src.connect(f).connect(this.hissGain).connect(this.master);
      src.start();
    }
    this.hissGain.gain.setTargetAtTime(level * 0.2, this.ctx.currentTime, 0.2);
  }

  // Sirens of police cars and fire engines: a two-tone horn, level 0..1 by distance.
  siren(level) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    if (!this.sirenGain) {
      const ctx = this.ctx, osc = ctx.createOscillator(), lfo = ctx.createOscillator(), depth = ctx.createGain(), f = ctx.createBiquadFilter();
      osc.type = 'triangle'; osc.frequency.value = 560;
      lfo.type = 'square'; lfo.frequency.value = 1.1; depth.gain.value = 110;
      lfo.connect(depth).connect(osc.frequency);
      f.type = 'lowpass'; f.frequency.value = 1800;
      this.sirenGain = ctx.createGain();
      this.sirenGain.gain.value = 0;
      osc.connect(f).connect(this.sirenGain).connect(this.master);
      osc.start(); lfo.start();
    }
    this.sirenGain.gain.setTargetAtTime(level * level * 0.07, this.ctx.currentTime, 0.4);
  }

  // A fighter jet passes overhead.
  flyby() {
    if (!this.ok('flyby', 1.5)) return;
    this.noise(2.2, 500, 0.8, 0.5, 'bandpass', 5);
    this.noise(1.6, 2400, 1, 0.18, 'bandpass', 0.3);
  }

  // A burst from a helicopter's gun: a quick rattle.
  burst() {
    if (!this.ok('burst', 0.5)) return;
    for (let i = 0; i < 5; i++) this.tone('square', 220, 120, 0.04, 0.07, i * 0.07);
  }

  // An achievement: two bright notes and a sparkle on top.
  achieve() {
    if (!this.ok('achieve', 0.4)) return;
    [784, 1175, 1568].forEach((f, i) => this.tone('sine', f, f, 0.3, 0.16, i * 0.1));
    this.tone('triangle', 2349, 2349, 0.4, 0.07, 0.3);
  }

  // Power arrives at the creature: a soft, rising blip.
  absorb() {
    if (this.ok('absorb', 0.06)) this.tone('sine', 520 + Math.random() * 200, 1250, 0.09, 0.07);
  }

  // A lamp or neon sign shorting out.
  zap() {
    if (!this.ok('zap', 0.1)) return;
    this.tone('square', 1800 + Math.random() * 900, 140, 0.09, 0.1);
    this.noise(0.08, 5000, 2, 0.12, 'highpass');
  }

  // level 0..1: how close the nearest helicopter is.
  heli(level) {
    if (this.ctx && this.ctx.state === 'running') this.heliGain.gain.setTargetAtTime(level * 0.35, this.ctx.currentTime, 0.4);
  }

  // level 0..1: how much is burning. Adds irregular pops on top of the steady roar.
  fire(level) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.fireGain.gain.setTargetAtTime(level * 0.22, this.ctx.currentTime, 0.3);
    if (level > 0.02 && Math.random() < level * 0.25 && this.ok('pop', 0.05)) this.noise(0.03 + Math.random() * 0.04, 2500 + Math.random() * 2500, 2, 0.08 + level * 0.12, 'bandpass');
  }

  // Concrete snapping: a sharp crack followed by a short gritty tail.
  crack(size) {
    if (!this.ok('crack', 0.12)) return;
    const s = Math.min(1, size);
    this.noise(0.05, 3200, 0.7, 0.5 + s * 0.3, 'highpass');
    this.noise(0.35 + s * 0.3, 1100 - s * 500, 1.2, 0.35 + s * 0.3, 'bandpass', 0.35);
    this.tone('square', 90 - s * 30, 45, 0.12, 0.3);
  }

  // Steel bending: a slow, wavering groan with a metallic ring.
  groan(size) {
    if (!this.ok('groan', 0.6)) return;
    const ctx = this.ctx, t = ctx.currentTime, s = Math.min(1, size), dur = 0.9 + s * 1.1, base = 150 - s * 80;
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sawtooth'; o2.type = 'square';
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * (0.6 + Math.random() * 0.25), t + dur * 0.6);
    o.frequency.linearRampToValueAtTime(base * (0.9 + Math.random() * 0.4), t + dur);
    o2.frequency.setValueAtTime(base * 2.97, t);
    o2.frequency.linearRampToValueAtTime(base * 2.1, t + dur);
    lfo.frequency.value = 5 + Math.random() * 6; lg.gain.value = base * 0.08;
    lfo.connect(lg).connect(o.frequency);
    f.type = 'bandpass'; f.Q.value = 9;
    f.frequency.setValueAtTime(500, t);
    f.frequency.linearRampToValueAtTime(900 + Math.random() * 500, t + dur);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.5 + s * 0.3, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f); o2.connect(f); f.connect(g).connect(this.master);
    for (const n of [o, o2, lfo]) { n.start(t); n.stop(t + dur + 0.1); }
  }

  // Masonry coming down: many short gritty bursts over about a second, on a low thud.
  crumble(size) {
    if (!this.ok('crumble', 0.18)) return;
    const s = Math.min(1, size), n = 5 + Math.round(s * 9);
    for (let i = 0; i < n; i++) setTimeout(() => this.ctx.state === 'running' && this.noise(0.08 + Math.random() * 0.12, 500 + Math.random() * 1400, 0.9, 0.12 + s * 0.25, 'bandpass', 0.5), i * (40 + Math.random() * 60));
    this.noise(0.5 + s * 0.8, 500, 0.6, 0.4 + s * 0.4, 'lowpass', 0.15);
    this.tone('sine', 85 - s * 35, 30, 0.35 + s * 0.4, 0.5 + s * 0.3);
  }

  // A whole facade of glass going: a shower of tinkles.
  glassfall(size) {
    if (!this.ok('glassfall', 0.25)) return;
    const s = Math.min(1, size), n = 6 + Math.round(s * 12);
    this.noise(0.5 + s * 0.5, 6000, 0.8, 0.2 + s * 0.2, 'highpass');
    for (let i = 0; i < n; i++) this.tone('sine', 2500 + Math.random() * 4500, 2000 + Math.random() * 3000, 0.05 + Math.random() * 0.12, 0.09, i * 0.04 + Math.random() * 0.05);
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  ok(key, gap) {
    if (!this.ctx || this.ctx.state !== 'running') return false;
    const t = this.ctx.currentTime;
    if (t - (this.last[key] ?? -1) < gap) return false;
    this.last[key] = t;
    return true;
  }

  noise(dur, freq, q, vol, type = 'lowpass', sweep = 1) {
    const ctx = this.ctx, t = ctx.currentTime, src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.6 + Math.random() * 0.8;
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(30, freq * sweep), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 0.5, dur + 0.05);
  }

  tone(type, f0, f1, dur, vol, delay = 0) {
    const ctx = this.ctx, t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // Breaking sound by material family; size 0..1 scales loudness and depth.
  hit(family, size) {
    if (!this.ok('hit' + family, 0.05)) return;
    const s = Math.min(1, size), v = 0.15 + s * 0.5;
    switch (family) {
      case 'glass':
        this.noise(0.25, 5000, 1, v * 0.5, 'highpass');
        for (let i = 0; i < 3; i++) this.tone('sine', 2200 + Math.random() * 3000, 1800 + Math.random() * 2000, 0.12 + Math.random() * 0.15, v * 0.25, i * 0.03);
        break;
      case 'wood':
        this.noise(0.14 + s * 0.15, 900, 3, v, 'bandpass', 0.5);
        this.tone('triangle', 240 - s * 80, 90, 0.1, v * 0.6);
        break;
      case 'metal':
        this.noise(0.15, 3000, 2, v * 0.5, 'bandpass');
        this.tone('square', 520 - s * 200, 500 - s * 200, 0.3 + s * 0.3, v * 0.2);
        this.tone('sine', 1310 - s * 400, 1290 - s * 400, 0.4, v * 0.2);
        break;
      case 'leaf':
        this.noise(0.25, 3500, 0.7, v * 0.4, 'highpass');
        break;
      case 'earth':
        this.noise(0.25 + s * 0.2, 400, 0.8, v * 0.8, 'lowpass', 0.4);
        break;
      default: // stone, brick, concrete
        this.noise(0.25 + s * 0.4, 1400 - s * 700, 0.8, v, 'lowpass', 0.3);
        this.tone('sine', 110 - s * 50, 40, 0.2 + s * 0.2, v * 0.8);
    }
  }

  boom(size) {
    if (!this.ok('boom', 0.06)) return;
    const s = Math.min(1.5, size);
    this.noise(0.5 + s * 0.9, 900, 0.6, 0.5 + s * 0.4, 'lowpass', 0.08);
    this.tone('sine', 120, 28, 0.5 + s * 0.6, 0.8);
  }

  rumble(size) {
    if (!this.ok('rumble', 0.25)) return;
    this.noise(1.2 + size, 220, 0.7, 0.5, 'lowpass', 0.3);
    this.tone('sine', 60, 30, 1 + size, 0.5);
  }

  step(size) {
    if (!this.ok('step', 0.12)) return;
    const s = Math.min(1, size);
    this.tone('sine', 110 - s * 60, 38, 0.12 + s * 0.2, 0.25 + s * 0.5);
    if (s > 0.3) this.noise(0.2, 300, 0.8, s * 0.3, 'lowpass', 0.4);
  }

  whoosh() {
    if (!this.ok('whoosh', 0.1)) return;
    this.noise(0.18, 600, 1.5, 0.25, 'bandpass', 4);
  }

  sword() {
    if (!this.ok('sword', 0.1)) return;
    this.tone('sawtooth', 180, 620, 0.25, 0.18);
    this.noise(0.25, 2500, 4, 0.2, 'bandpass', 2);
  }

  rocket() {
    if (!this.ok('rocket', 0.1)) return;
    this.noise(0.8, 700, 1, 0.4, 'bandpass', 3);
  }

  laser() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.laserGain.gain.cancelScheduledValues(t);
    this.laserGain.gain.setTargetAtTime(0.16, t, 0.02);
    this.laserGain.gain.setTargetAtTime(0, t + 0.08, 0.05);
    this.laserOsc.frequency.setValueAtTime(170 + Math.random() * 30, t);
  }

  tick() {
    if (this.ok('tick', 0.05)) this.tone('square', 1500, 1400, 0.04, 0.12);
  }

  roar(stage) {
    if (!this.ok('roar', 0.5)) return;
    const base = Math.max(45, 190 - stage * 15), ctx = this.ctx, t = ctx.currentTime, dur = 1 + stage * 0.07;
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base * 0.8, t);
    o.frequency.linearRampToValueAtTime(base * 1.3, t + 0.25);
    o.frequency.exponentialRampToValueAtTime(base * 0.5, t + dur);
    lfo.frequency.value = 28; lg.gain.value = base * 0.25;
    lfo.connect(lg).connect(o.frequency);
    f.type = 'lowpass'; f.frequency.value = 900 + stage * 60; f.Q.value = 4;
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f).connect(g).connect(this.master);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
    this.noise(dur, 700, 1, 0.3, 'bandpass', 0.6);
  }

  scream() {
    if (!this.ok('scream', 0.4)) return;
    const f = 700 + Math.random() * 500;
    this.tone('triangle', f, f * 1.5, 0.25, 0.05);
  }

  orb() {
    if (this.ok('orb', 0.07)) this.tone('sine', 900 + Math.random() * 600, 1600, 0.08, 0.05);
  }

  // Rising arpeggio: a building is completely destroyed.
  fanfare() {
    if (!this.ok('fanfare', 0.3)) return;
    [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.22, i * 0.09));
  }

  // The monster grows: deep swell plus a bright chord.
  grow() {
    if (!this.ok('grow', 0.5)) return;
    this.tone('sawtooth', 60, 240, 0.9, 0.3);
    [392, 523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('square', f, f, 0.3, 0.1, 0.3 + i * 0.08));
  }

  win() {
    if (!this.ok('win', 1)) return;
    [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.3, 0.2, i * 0.16));
  }

  click() {
    if (this.ok('click', 0.03)) this.tone('sine', 660, 880, 0.06, 0.12);
  }
}
