// Music that follows the game. Everything is synthesised; there are no audio files.
//
// It is composed, not rolled with dice: one theme of sixteen bars (form A A B A), written out as scale
// degrees over a fixed chord progression, with the strong beats on chord tones, a sequence in the
// answer, a contrasting middle part and a proper cadence. The style is electro swing: swung eighths,
// walking bass, off-beat stabs, a four-on-the-floor kick when things get going.
//
// What changes while playing is the arrangement:
//   intensity (0..1) comes from how much is being destroyed and from the alarm level. It adds layers
//   (beat and bass -> four-on-the-floor kick and the lead -> stabs, open hats, sixteenths, the theme in
//   thirds -> wobble bass, fills and a crash), raises the tempo and the volume. When the alarm ebbs
//   away, the music calms down again.
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
// Key (semitones above D), mode and lead sound per world. Most worlds are in minor: it sounds less like a nursery rhyme.
const MOODS = {
  skyline: [0, 'minor', 'sawtooth'], city: [0, 'minor', 'sawtooth'], factory: [-2, 'minor', 'sawtooth'], harbour: [-4, 'minor', 'sawtooth'], airport: [2, 'minor', 'square'],
  spaceport: [3, 'minor', 'sawtooth'], giants: [-5, 'minor', 'sawtooth'], castle: [-2, 'minor', 'square'], reef: [-3, 'minor', 'square'], random: [1, 'minor', 'sawtooth'],
  house: [0, 'minor', 'square'], village: [-2, 'minor', 'square'], park: [-4, 'minor', 'square'], winter: [5, 'minor', 'square'],
  blocks: [3, 'major', 'square'], toyland: [5, 'major', 'square'], funfair: [7, 'major', 'sawtooth'], garden: [3, 'major', 'square'],
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
      this.bus = ctx.createGain(); // everything
      this.bus.gain.value = 0;
      this.bus.connect(a.master);
      this.pump = ctx.createGain(); // bass, chords and melody: ducked by every kick
      this.pump.connect(this.bus);
      this.next = ctx.currentTime + 0.1;
    }
    this.bus.gain.setTargetAtTime(this.volume * (0.42 + 0.3 * this.intensity + 0.2 * this.swell), ctx.currentTime, 0.25);
    if (this.volume <= 0) { this.next = ctx.currentTime + 0.1; return; }
    if (this.next < ctx.currentTime - 0.3) this.next = ctx.currentTime + 0.05; // the tab was asleep: do not catch up
    const bpm = 108 + 32 * this.intensity, beat = 60 / bpm, swing = 0.6 - 0.07 * this.intensity; // faster means straighter
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

  // A note. cutoff: low-pass filter (0 = none), sweep: the filter closes to this share over the note. dry: straight to the output, not ducked.
  tone(type, f, t, dur, vol, cutoff = 0, slide = 0, sweep = 0, dry = false) {
    const ctx = this.audio.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let out = o;
    if (cutoff) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(cutoff, t); lp.Q.value = 6;
      if (sweep) lp.frequency.exponentialRampToValueAtTime(Math.max(60, cutoff * sweep), t + dur);
      o.connect(lp); out = lp;
    }
    out.connect(g).connect(dry ? this.bus : this.pump);
    o.start(t); o.stop(t + dur + 0.02);
  }

  // A burst of noise: hats, snare, clap, crash.
  hit(t, dur, freq, vol, type = 'highpass') {
    const ctx = this.audio.ctx, s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = this.audio.noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  // Kick drum: a sine that drops from a thump to a boom, a click on top, and everything else ducks out of its way.
  kick(t, beat, vol) {
    this.tone('sine', 165, t, 0.3, vol, 0, 0.27, 0, true);
    this.hit(t, 0.012, 3000, vol * 0.25, 'bandpass');
    const g = this.pump.gain;
    g.setValueAtTime(0.4, t); g.linearRampToValueAtTime(1, t + beat * 0.5);
  }

  // Snare with a clap layered on it.
  snare(t, vol) {
    this.hit(t, 0.16, 1900, vol, 'bandpass'); this.hit(t, 0.1, 5500, vol * 0.5);
    this.hit(t + 0.012, 0.05, 1200, vol * 0.6, 'bandpass'); // the second hand of the clap
    this.tone('triangle', 210, t, 0.09, vol * 0.5, 0, 0.6, 0, true);
  }

  // Everything that sounds on one sixteenth.
  play(step, t, beat) {
    const I = this.intensity, s16 = beat / 4, inBar = step & 15, bar = (step >> 4) & 7, section = (step >> 7) & 3, round = step >> 9;
    const part = FORM[section], mode = this.mood[1], half = bar * 2 + (inBar >> 3);
    const root = PROG[mode][part][half], dominant = root === 4, chord = [root, root + 2, root + 4];
    const nextRoot = PROG[mode][FORM[(section + (half === 15 ? 1 : 0)) & 3]][(half + 1) & 15];
    const e = (inBar >> 1) & 7, onBeat = (inBar & 3) === 0, eighth = (inBar & 1) === 0;

    // Drums. They are there from the first bar; more of them come in as things heat up.
    if (inBar === 0 || inBar === 8 || (I > 0.35 && onBeat) || (I > 0.75 && inBar === 14)) this.kick(t, beat, 0.75 + 0.2 * I); // two to the bar, then four on the floor
    if (inBar === 4 || inBar === 12) this.snare(t, 0.26 + 0.14 * I); // the back-beat on two and four
    if (I > 0.55 && (inBar === 7 || inBar === 15)) this.hit(t, 0.05, 1900, 0.07, 'bandpass'); // ghost notes
    if (eighth) this.hit(t, 0.035, 8000, (e & 1 ? 0.1 : 0.06) + 0.05 * I); // swung hats, the off-beat louder
    if (I > 0.45 && (inBar & 3) === 2) this.hit(t, 0.16, 6500, 0.07 + 0.05 * I); // open hat between the kicks
    if (I > 0.6 && !eighth) this.hit(t, 0.02, 9500, 0.035 + 0.03 * I); // sixteenths
    if (I > 0.3 && (bar & 3) === 3 && inBar >= 12) this.snare(t, 0.1 + 0.05 * (inBar - 12)); // a fill every four bars
    if (I > 0.5 && bar === 0 && inBar === 0) this.hit(t, 1.2, 5000, 0.16); // crash into a new section

    // Chords: a soft pad in quiet moments, and from the third layer on brass stabs on the off-beats (the "Charleston" rhythm).
    if ((inBar & 7) === 0 && I < 0.6) for (const d of chord) this.tone('sawtooth', this.freq(d, 1, dominant), t, beat * 2.1, 0.025, 700);
    if (I > 0.45 && (inBar === 3 || inBar === 6 || inBar === 11 || inBar === 14)) for (const d of chord) this.tone('sawtooth', this.freq(d + 7, 0, dominant), t, s16 * 1.3, 0.05, 1400 + 1800 * I, 0, 0.4);

    // Bass: a fat saw an octave and two below, always there.
    if (eighth) {
      if (I > 0.8) { // wobble: the root, growling through a filter that opens and closes
        if (e !== 7 || half !== 15) { this.tone('sawtooth', this.freq(root, -1), t, s16 * 1.9, 0.22, e & 1 ? 1400 : 320, 0, 0.3); this.tone('sine', this.freq(root, -2), t, s16 * 1.9, 0.25); }
      } else if (I > 0.4) { // bouncing between the root and its octave, with a step into the next chord
        const f = e === 7 && nextRoot !== root ? this.freq(nextRoot, -1) * 0.944 : this.freq(root + (e & 1 ? 7 : 0), -1);
        this.tone('sawtooth', f, t, s16 * 1.6, 0.2, 650, 0, 0.5); this.tone('sine', f / 2, t, s16 * 1.6, 0.2);
      } else { // a walking line: root, fifth, octave, fifth
        const f = e === 7 && nextRoot !== root ? this.freq(nextRoot, -1) * 0.944 : this.freq([root, root + 4, root + 7, root + 4][e & 3], -1, dominant);
        if ((e & 1) === 0 || I > 0.2) this.tone('sawtooth', f, t, s16 * 1.7, 0.17, 480, 0, 0.6);
      }
    }

    // The theme. In quiet moments it rests every other section; otherwise it wanders through the instruments.
    if (I < 0.3 && (section & 1)) return;
    const voice = I < 0.3 ? 'pluck' : ['lead', 'brass', 'pluck', 'lead'][(section + round) & 3];
    for (const n of THEME[part][bar]) {
      if (n[0] !== inBar) continue;
      const raised = dominant, dur = n[2] * s16 * 0.92, f = this.freq(n[1], 1, raised);
      if (voice === 'pluck') { this.tone('square', f, t, Math.min(dur, 0.22) + 0.08, 0.07, 3000, 0, 0.15); this.tone('sine', f * 2, t, 0.1, 0.03); } // short and bright
      else if (voice === 'brass') { this.tone('sawtooth', f, t, dur, 0.085, 2400, 0, 0.5); this.tone('sawtooth', f * 1.007, t, dur, 0.06, 2400, 0, 0.5); this.tone('sawtooth', f / 2, t, dur, 0.04, 1200); } // a section of three
      else { this.tone(this.mood[2], f, t, dur, 0.075, 1800 + 2200 * I, 0, 0.45); this.tone(this.mood[2], f * 0.994, t, dur, 0.045, 1800 + 2200 * I, 0, 0.45); } // two voices slightly apart
      // From the fourth layer on a second voice joins a third below.
      if (I > 0.6) this.tone('sawtooth', this.freq(n[1] - 2, 1, raised), t, dur, 0.04, 1800);
    }
  }
}
