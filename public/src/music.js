// Music that follows the game. Everything is synthesised; there are no audio files.
//
// It is composed, not rolled with dice: one theme of sixteen bars (form A A B A), written out as scale
// degrees over a fixed chord progression, with the strong beats on chord tones, a sequence in the
// answer, a contrasting middle part and a proper cadence. The style is electro swing: swung eighths,
// walking bass, off-beat stabs, a four-on-the-floor kick when things get going.
//
// What changes while playing is the arrangement:
//   intensity (0..1) comes from how much is being destroyed and from the alarm level. It adds layers
//   (pad -> bass and hats -> drums and lead -> stabs, shaker, the theme in thirds -> wobble bass and fills),
//   raises the tempo and the volume. When the alarm ebbs away, the music calms down again.
//   the theme wanders through the instruments from section to section (bells, lead, brass), so it is
//   heard again and again in a different colour.
//   every world has its own key, mode (major or minor) and lead sound; the theme stays the same.

const MINOR = [0, 2, 3, 5, 7, 8, 10], MAJOR = [0, 2, 4, 5, 7, 9, 11];
// Chords per half bar, as scale degrees of their roots (0 = tonic, 4 = dominant ...).
const PROG = {
  minor: { A: [0, 0, 0, 0, 3, 3, 4, 4, 0, 0, 5, 5, 3, 3, 4, 0], B: [5, 5, 5, 5, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4] },
  major: { A: [0, 0, 5, 5, 3, 3, 4, 4, 0, 0, 5, 5, 3, 3, 4, 0], B: [3, 3, 3, 3, 0, 0, 0, 0, 1, 1, 1, 1, 4, 4, 4, 4] },
};
// The theme: per bar a list of [step (sixteenths), scale degree, length]. Degree 7 is the tonic an octave up.
const THEME = {
  A: [
    [[0, 4, 2], [3, 4, 1], [4, 5, 2], [6, 4, 2], [8, 2, 3], [12, 0, 2], [14, 2, 2]], // the motif: 5 5 6 5 3 1 3
    [[0, 4, 3], [4, 7, 5], [10, 6, 1], [11, 5, 1], [12, 4, 4]], // up to the tonic and back to the fifth
    [[0, 5, 2], [3, 5, 1], [4, 6, 2], [6, 5, 2], [8, 3, 3], [12, 7, 2], [14, 5, 2]], // the motif again, one step higher (sequence)
    [[0, 4, 3], [4, 6, 2], [6, 8, 2], [8, 6, 3], [12, 4, 4]], // half close on the dominant
    [[0, 4, 2], [3, 4, 1], [4, 5, 2], [6, 4, 2], [8, 2, 3], [12, 0, 2], [14, 2, 2]], // the motif returns
    [[0, 5, 3], [4, 7, 5], [10, 6, 1], [11, 5, 1], [12, 2, 4]],
    [[0, 7, 2], [2, 6, 2], [4, 5, 2], [6, 4, 2], [8, 3, 3], [12, 2, 2], [14, 1, 2]], // a run down the scale
    [[0, 4, 2], [3, 4, 1], [4, 6, 2], [6, 8, 2], [8, 7, 7]], // leading note, then home: full close
  ],
  B: [
    [[0, 7, 4], [4, 9, 4], [8, 12, 6], [14, 11, 2]], // the middle part: long notes, higher up
    [[0, 12, 3], [4, 11, 2], [6, 9, 2], [8, 7, 7]],
    [[0, 9, 4], [4, 11, 4], [8, 13, 6], [14, 11, 2]],
    [[0, 11, 3], [4, 9, 2], [6, 8, 2], [8, 9, 7]],
    [[0, 10, 4], [4, 12, 4], [8, 14, 6], [14, 12, 2]],
    [[0, 12, 3], [4, 10, 2], [6, 9, 2], [8, 10, 7]],
    [[0, 11, 2], [2, 11, 2], [4, 13, 2], [6, 11, 2], [8, 8, 4], [12, 6, 4]],
    [[0, 4, 2], [3, 4, 1], [4, 5, 2], [6, 4, 2], [8, 6, 3], [12, 4, 4]], // back towards the motif
  ],
};
const FORM = ['A', 'A', 'B', 'A'];
// Key (semitones above D), mode and lead sound per world.
const MOODS = {
  skyline: [0, 'minor', 'square'], city: [0, 'minor', 'square'], factory: [-2, 'minor', 'sawtooth'], harbour: [-4, 'minor', 'sawtooth'], airport: [2, 'minor', 'square'],
  spaceport: [3, 'minor', 'sawtooth'], giants: [-5, 'minor', 'sawtooth'], castle: [-2, 'minor', 'triangle'], reef: [-3, 'minor', 'sine'], random: [1, 'minor', 'square'],
  blocks: [3, 'major', 'triangle'], toyland: [5, 'major', 'triangle'], funfair: [7, 'major', 'square'], garden: [3, 'major', 'triangle'], house: [0, 'major', 'triangle'],
  village: [-2, 'major', 'triangle'], park: [-4, 'major', 'sine'], winter: [5, 'major', 'sine'],
};

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.volume = 0.6;
    this.intensity = 0.1; // smoothed 0..1
    this.swell = 0; // short rise in volume when something breaks
    this.step = 0; // sixteenth notes since the start
    this.next = 0; // audio time of the next step
    this.mood = MOODS.skyline;
  }

  setWorld(id) { this.mood = MOODS[id] ?? MOODS.random; }
  setVolume(v) { this.volume = v; }

  // Called every frame. target: 0..1 how much is going on; bump: something has just been destroyed (0..1).
  update(dt, target, bump) {
    const a = this.audio, ctx = a.ctx;
    this.intensity += (target - this.intensity) * Math.min(1, dt / (target > this.intensity ? 1.5 : 7)); // quick to rise, slow to settle
    this.swell = Math.max(this.swell * (1 - dt * 1.5), bump);
    if (!ctx || ctx.state !== 'running') return;
    if (!this.bus) {
      this.bus = ctx.createGain();
      this.bus.gain.value = 0;
      this.bus.connect(a.master);
      this.next = ctx.currentTime + 0.1;
    }
    this.bus.gain.setTargetAtTime(this.volume * (0.3 + 0.3 * this.intensity + 0.2 * this.swell), ctx.currentTime, 0.25);
    if (this.volume <= 0) { this.next = ctx.currentTime + 0.1; return; }
    if (this.next < ctx.currentTime - 0.3) this.next = ctx.currentTime + 0.05; // the tab was asleep: do not catch up
    const bpm = 98 + 40 * this.intensity, beat = 60 / bpm, swing = 0.62 - 0.08 * this.intensity; // faster means straighter
    while (this.next < ctx.currentTime + 0.18) {
      const pos = this.step & 3, beatStart = this.next;
      // Swing: the second eighth of every beat comes late; the sixteenths in between follow.
      const offs = [0, swing * 0.5, swing, swing + (1 - swing) * 0.5];
      for (let k = pos; k < 4; k++) this.play(this.step + k - pos, beatStart + offs[k] * beat, beat);
      this.step += 4 - pos;
      this.next = beatStart + beat;
    }
  }

  // Frequency of a scale degree. raised: sharpen the seventh (leading note of the dominant in minor).
  freq(degree, octave, raised = false) {
    const [key, mode] = this.mood, scale = mode === 'minor' ? MINOR : MAJOR, d = ((degree % 7) + 7) % 7;
    const semi = scale[d] + 12 * Math.floor(degree / 7) + (raised && mode === 'minor' && d === 6 ? 1 : 0);
    return 146.83 * 2 ** ((key + semi) / 12 + octave);
  }

  tone(type, f, t, dur, vol, cutoff = 0, slide = 0) {
    const ctx = this.audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = o;
    if (cutoff) { const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(cutoff, t); lp.Q.value = 4; o.connect(lp); out = lp; }
    out.connect(g).connect(this.bus);
    o.start(t); o.stop(t + dur + 0.02);
  }

  hit(t, dur, freq, vol, type = 'highpass') {
    const ctx = this.audio.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.audio.noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // Everything that sounds on one sixteenth.
  play(step, t, beat) {
    const I = this.intensity, s16 = beat / 4, inBar = step & 15, bar = (step >> 4) & 7, section = (step >> 7) & 3, round = step >> 9;
    const part = FORM[section], mode = this.mood[1], half = bar * 2 + (inBar >> 3);
    const root = PROG[mode][part][half], dominant = root === 4, chord = [root, root + 2, root + 4];
    const nextRoot = PROG[mode][FORM[(section + (half === 15 ? 1 : 0)) & 3]][(half + 1) & 15];

    // Pad: the chord, softly, once per half bar. Always there.
    if ((inBar & 7) === 0) for (const d of chord) this.tone('triangle', this.freq(d, 1, dominant), t, beat * 2.1, 0.035 + 0.02 * (1 - I), 900);

    // Bass from the second layer on: a walking line (root, fifth, octave, and a step into the next chord).
    if (I > 0.15 && (inBar & 1) === 0) {
      const e = (inBar >> 1) & 3;
      if (I > 0.85) { // wobble bass: the root, growling through a filter that opens and closes
        if (e !== 3 || half !== 15) this.tone('sawtooth', this.freq(root, -1, false), t, s16 * 1.9, 0.2, 180 + 900 * (e & 1 ? 1 : 0.25));
      } else {
        const walk = e === 3 && nextRoot !== root ? this.freq(nextRoot, -1) * 0.944 : this.freq([root, root + 4, root + 7, root + 4][e], -1, dominant);
        if (e !== 1 || I > 0.3) this.tone('triangle', walk, t, s16 * 1.7, 0.2, 500);
      }
    }

    // Drums.
    if (I > 0.15 && (inBar & 1) === 0) this.hit(t, 0.03 + 0.03 * ((inBar >> 1) & 1), 7000, 0.035 + 0.04 * I); // swung hats
    if (I > 0.6 && (inBar & 1)) this.hit(t, 0.02, 9000, 0.02 + 0.02 * I); // shaker
    if (I > 0.35 && (inBar === 0 || inBar === 8 || (I > 0.6 && (inBar & 3) === 0))) this.tone('sine', 150, t, 0.22, 0.5, 0, 0.3); // kick: two, then four on the floor
    if (I > 0.35 && (inBar === 4 || inBar === 12)) { this.hit(t, 0.14, 1800, 0.22, 'bandpass'); this.tone('triangle', 190, t, 0.08, 0.1, 0, 0.6); } // snare on two and four
    if (I > 0.5 && bar === 7 && inBar >= 12) this.hit(t, 0.06, 2200, 0.12 + 0.04 * (inBar - 12), 'bandpass'); // fill into the next section

    // Stabs: the chord on the off-beats (the "Charleston" rhythm).
    if (I > 0.6 && (inBar === 0 || inBar === 6 || inBar === 8 || inBar === 14)) for (const d of chord) this.tone('sawtooth', this.freq(d + 7, 0, dominant), t, s16 * 1.2, 0.045, 1600 + 1400 * I);

    // The theme. Quiet moments: bells, and only in every other section. Otherwise it wanders through the instruments.
    if (I < 0.35 && (section & 1)) return;
    const voice = I < 0.35 ? 'bell' : ['lead', 'bell', 'brass', 'lead'][(section + round) & 3];
    for (const n of THEME[part][bar]) {
      if (n[0] !== inBar) continue;
      const raised = dominant, dur = n[2] * s16 * 0.92;
      if (voice === 'bell') { const f = this.freq(n[1], part === 'B' ? 1 : 2, raised); this.tone('sine', f, t, dur + 0.25, 0.1); this.tone('sine', Math.min(4000, f * 2), t, 0.12, 0.03); } // the middle part lies high already
      else if (voice === 'brass') { this.tone('sawtooth', this.freq(n[1], 1, raised), t, dur, 0.09, 2200); this.tone('sawtooth', this.freq(n[1], 1, raised) * 1.006, t, dur, 0.06, 2200); }
      else this.tone(this.mood[2], this.freq(n[1], 1, raised), t, dur, this.mood[2] === 'sine' ? 0.14 : 0.075, 2600);
      // From the fourth layer on a second voice joins a third below (a sixth above would cross the bass less, but thirds sound sweeter).
      if (I > 0.6 && voice !== 'bell') this.tone('triangle', this.freq(n[1] - 2, 1, raised), t, dur, 0.05, 1800);
    }
  }
}
