// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Modal synthesis: a struck object is a bank of damped resonators (its
 * vibration modes), excited by a short force pulse whose width depends on the
 * mallet/hammer hardness (soft and slow pulses excite fewer high modes).
 * Each mode is a complex one-pole rotation, which keeps frequencies exact and
 * stays stable at any decay. Covers mallets (marimba, vibraphone, celesta,
 * glockenspiel), bells, membranes (timpani, taiko, bodhrán; with the tension
 * pitch drop after the strike), and a piano approximation (stiff-string
 * inharmonicity, hammer spectrum, unison strings with beating and two-stage
 * decay, damper).
 *
 * Refs: J.-M. Adrien, "The missing link: modal synthesis", in De Poli et al.
 * (eds.), Representations of Musical Signals, MIT Press 1991; N. Fletcher &
 * T. Rossing, The Physics of Musical Instruments, 2nd ed., Springer 1998
 * (mode ratios of bars, membranes, bells; piano inharmonicity
 * f_n = n·f0·sqrt(1 + B·n²)).
 */

import { NoiseSource } from '../dsp/noise.js';
import { Svf } from '../dsp/filters.js';
import { CONTROL_INTERVAL, pitchToHz, centsToRatio, dbToGain, t60Coef } from '../dsp/util.js';
import { PolyInstrument, vary } from './voice-pool.js';

/**
 * @typedef {[ratio: number, amplitude: number, t60: number]} Mode
 *   frequency ratio to the note, linear amplitude, decay time (−60 dB) in seconds at C4
 *
 * @typedef {object} ModalTarget per-note settings of unpitched kits
 * @property {number} hz base frequency of the first mode
 * @property {Mode[]} [modes]
 * @property {number} [decay] factor on all decay times
 * @property {number} [gain] linear
 * @property {number} [hardness]
 * @property {number} [pitchDrop] semitones
 * @property {number} [noise]
 * @property {number} [pan]
 *
 * @typedef {object} ModalPreset
 * @property {'modal'} engine
 * @property {string} [id]
 * @property {Mode[]} [modes]
 * @property {{ inharmonicity?: number, partials?: number, t60?: number, slope?: number, strikePos?: number, unisonCents?: number }} [piano]
 *   piano partials instead of fixed modes (B at C4, partial count, fundamental T60 at C4, amplitude slope, hammer position, unison detune)
 * @property {number} [hardness] 0 (soft felt) … 1 (hard) at full velocity; default 0.5
 * @property {number} [hardnessVel] share of the hardness that depends on velocity (default 0.5)
 * @property {number} [decayKeyTrack] decay factor per octave above C4 (default 0.8)
 * @property {number} [highDamping] high modes decay faster: t60 · ratio^−highDamping (default 0.3)
 * @property {number} [release] T60 after note-off (damper); 0 = let ring (default 0)
 * @property {number} [noise] strike noise level (default 0)
 * @property {{ freq: number, q?: number, decay?: number }} [noiseBand]
 * @property {{ rate: number, depth: number }} [tremolo] amplitude tremolo (vibraphone motor)
 * @property {{ amount: number, decay: number }} [pitchDrop] semitones above the resting pitch at the strike, settling time
 * @property {Record<string, ModalTarget>} [noteMap] unpitched: MIDI note → drum
 * @property {number} [rollRate] strokes per second for the "roll" articulation (default 14)
 * @property {number} [stereo] spread of the modes across the stereo field (default 0.3)
 * @property {number} [polyphony]
 * @property {{ detune?: number, hardness?: number, level?: number }} [variation]
 * @property {number} [gainDb]
 */

const MAX_MODES = 64;

/**
 * Mallet/hammer contact as a smooth low-pass on the mode amplitudes: second-order
 * roll-off above about 1/contact-time (real contacts have no spectral zeros).
 * @param {number} u frequency × contact duration
 */
export function contactSpectrum(u) {
  return 1 / Math.sqrt(1 + u ** 4);
}

/** @param {ModalPreset} p */
function withDefaults(p) {
  return {
    hardness: 0.5,
    hardnessVel: 0.5,
    decayKeyTrack: 0.8,
    highDamping: 0.3,
    release: 0,
    noise: 0,
    noiseBand: { freq: 2000, q: 0.8, decay: 0.03 },
    rollRate: 14,
    stereo: 0.3,
    polyphony: 16,
    variation: { detune: 1, hardness: 0.05, level: 0.04 },
    gainDb: 0,
    ...p,
  };
}

/**
 * Modes of a piano note: stiff-string partials with a hammer spectrum and unison pairs.
 * @param {NonNullable<ModalPreset['piano']>} piano
 * @param {number} pitch
 * @param {number} hardness 0…1
 * @param {import('../core/prng.js').Rng} rng
 * @returns {Mode[]}
 */
function pianoModes(piano, pitch, hardness, rng) {
  const B0 = piano.inharmonicity ?? 3.5e-4;
  // Inharmonicity grows towards the treble and slightly into the wound bass.
  const B = pitch >= 60 ? B0 * 2 ** ((pitch - 60) / 16) : B0 * 2 ** ((60 - pitch) / 30);
  const n = Math.max(4, Math.round((piano.partials ?? 40) * Math.min(1, 2 ** (-(pitch - 48) / 30))));
  const t1 = (piano.t60 ?? 10) * 2 ** (-(pitch - 60) / 16);
  const strike = piano.strikePos ?? 1 / 8;
  // Louder = harder hammer = more high partials.
  const cutoff = 3 + 22 * hardness * hardness;
  const slope = piano.slope ?? 0.9;
  const unison = piano.unisonCents ?? 0.9;
  /** @type {Mode[]} */
  const modes = [];
  for (let k = 1; k <= n; k++) {
    const ratio = k * Math.sqrt(1 + B * k * k);
    const comb = Math.abs(Math.sin(Math.PI * k * strike)) + 0.08;
    const amp = (comb / k ** slope) / (1 + (k / cutoff) ** 3);
    if (amp < 2e-4) continue;
    const t60 = t1 / (1 + 0.18 * (k - 1));
    if (k <= 8) {
      // Two strings per partial, slightly detuned: beating and the two-stage decay
      // (fast "prompt" sound, slow "aftersound").
      const d = unison * (0.7 + 0.6 * rng.float());
      modes.push([ratio * centsToRatio(d), amp * 0.55, t60 * 0.45], [ratio * centsToRatio(-d), amp * 0.45, t60 * 1.4]);
    } else modes.push([ratio, amp, t60 * 0.8]);
  }
  return modes;
}

class ModalVoice {
  /**
   * @param {ReturnType<typeof withDefaults>} p
   * @param {import('./context.js').SynthContext} ctx
   * @param {import('../core/prng.js').Rng} rng
   */
  constructor(p, ctx, rng) {
    this.p = p;
    this.sr = ctx.sampleRate;
    this.rng = rng;
    this.active = false;
    this.released = false;
    this.stealing = false;
    this.pitch = 60;
    this.age = 0;
    this.n = 0;
    this.re = new Float64Array(MAX_MODES);
    this.im = new Float64Array(MAX_MODES);
    this.cs = new Float64Array(MAX_MODES);
    this.sn = new Float64Array(MAX_MODES);
    this.w = new Float64Array(MAX_MODES); // rad/sample at rest
    this.r = new Float64Array(MAX_MODES);
    this.rRelease = new Float64Array(MAX_MODES);
    this.amp = new Float64Array(MAX_MODES);
    this.panL = new Float64Array(MAX_MODES);
    this.panR = new Float64Array(MAX_MODES);
    this.noise = new NoiseSource(rng.fork('noise'));
    this.noiseFilter = new Svf(this.sr);
    this.noiseFilter.setMode('bandpass');
    this.noiseEnv = 0;
    this.noiseCoef = 0;
    this.noiseLevel = 0;
    // Exciter: one impulse per stroke (the contact shapes the mode amplitudes).
    this.pulseLen = 0;
    this.pulsePos = 0;
    this.pulseGain = 0;
    this.baseGain = 0;
    this.ctrl = 0;
    this.drop = 0;
    this.dropCoef = 0;
    this.dropAmount = 0;
    this.tremPhase = 0;
    this.tremInc = 0;
    this.tremDepth = 0;
    this.out = 1;
    this.energy = 0;
    this.samples = 0;
    // Roll articulation.
    this.rollLeft = 0;
    this.rollNext = 0;
    this.velocity = 0.8;
    this.hardness = 0.5;
  }

  level() {
    return Math.sqrt(this.energy) * this.out;
  }

  /**
   * @param {number} pitch
   * @param {number} velocity
   * @param {import('./voice-pool.js').NoteOptions} [options]
   */
  noteOn(pitch, velocity, options = {}) {
    const p = this.p;
    const sr = this.sr;
    this.active = true;
    this.released = false;
    this.stealing = false;
    this.pitch = pitch;
    this.velocity = velocity;
    const target = p.noteMap ? p.noteMap[String(pitch)] ?? null : null;
    const baseHz = target ? target.hz : pitchToHz(pitch + vary(this.rng, p.variation.detune ?? 0) / 100);
    const hv = p.hardnessVel;
    this.hardness = Math.min(1, Math.max(0, (target?.hardness ?? p.hardness) * (1 - hv + hv * velocity) + vary(this.rng, p.variation.hardness ?? 0)));
    const octaves = target ? 0 : (pitch - 60) / 12;
    const decayScale = (target?.decay ?? 1) * p.decayKeyTrack ** octaves;
    /** @type {Mode[]} */
    const modes = p.piano ? pianoModes(p.piano, pitch, this.hardness, this.rng) : target?.modes ?? p.modes ?? [[1, 1, 1]];
    // Contact time: about 2.7 ms (soft felt) … 0.2 ms (hard). Each mode receives an
    // impulse; the contact shapes the mode amplitudes.
    const width = 0.0025 * (1 - this.hardness) ** 1.5 + 0.0002;
    this.pulseLen = 1;
    this.pulsePos = 0;
    let n = 0;
    const releaseT = p.release;
    for (const [ratio, amplitude, t60] of modes) {
      if (n >= MAX_MODES) break;
      const hz = baseHz * ratio;
      if (hz >= sr * 0.45 || hz < 15) continue;
      const pulse = contactSpectrum(hz * width);
      const a = amplitude * pulse;
      if (a < 1e-5) continue;
      const tm = Math.max(0.01, t60 * decayScale * Math.max(1, ratio) ** -p.highDamping);
      const w = (2 * Math.PI * hz) / sr;
      this.w[n] = w;
      this.cs[n] = Math.cos(w);
      this.sn[n] = Math.sin(w);
      this.r[n] = t60Coef(tm, sr);
      this.rRelease[n] = releaseT > 0 ? t60Coef(Math.min(tm, releaseT * Math.max(1, ratio) ** -0.3), sr) : this.r[n];
      this.amp[n] = a;
      // Alternate modes left/right around the note's position.
      const pan = Math.max(-1, Math.min(1, (target?.pan ?? 0) + p.stereo * (n % 2 === 0 ? 0.5 : -0.5) * Math.min(1, n / 3)));
      this.panL[n] = Math.sqrt(0.5 * (1 - pan));
      this.panR[n] = Math.sqrt(0.5 * (1 + pan));
      this.re[n] = 0;
      this.im[n] = 0;
      n++;
    }
    this.n = n;
    const level = 1 + vary(this.rng, p.variation.level ?? 0);
    this.baseGain = (target?.gain ?? 1) * level * (0.2 + 0.8 * velocity ** 1.4) * 0.4;
    this.pulseGain = this.baseGain;
    this.noiseLevel = (target?.noise ?? p.noise) * (0.3 + 0.7 * velocity) * (0.5 + this.hardness);
    this.noiseFilter.set(p.noiseBand.freq * (target ? target.hz / 100 : 1) ** 0.3, p.noiseBand.q ?? 0.8);
    this.noiseEnv = 1;
    this.noiseCoef = t60Coef(p.noiseBand.decay ?? 0.03, sr);
    const drop = target?.pitchDrop ?? p.pitchDrop?.amount ?? 0;
    this.dropAmount = drop * (0.4 + 0.6 * velocity);
    this.drop = 1;
    this.dropCoef = Math.exp(-CONTROL_INTERVAL / (Math.max(0.005, p.pitchDrop?.decay ?? 0.06) * sr));
    this.ctrl = 0;
    if (p.tremolo) {
      this.tremInc = p.tremolo.rate / sr;
      this.tremDepth = p.tremolo.depth;
      this.tremPhase = this.rng.float();
    } else this.tremDepth = 0;
    this.out = dbToGain(p.gainDb);
    this.energy = 1;
    this.samples = 0;
    this.rollLeft = options.articulation === 'roll' ? Math.round((options.durationSec ?? 1) * sr) : 0;
    this.rollNext = Math.round(sr / p.rollRate);
  }

  noteOff() {
    this.released = true;
    if (this.p.release > 0) this.r.set(this.rRelease.subarray(0, this.n));
    this.rollLeft = 0;
  }

  steal() {
    this.released = true;
    this.stealing = true;
    this.rollLeft = 0;
    const r = t60Coef(0.03, this.sr);
    for (let i = 0; i < this.n; i++) this.r[i] = Math.min(this.r[i], r);
  }

  #control() {
    // Membrane tension drop: modes start sharp and settle.
    if (this.dropAmount !== 0 && this.drop > 1e-3) {
      this.drop *= this.dropCoef;
      const f = 2 ** ((this.dropAmount * this.drop) / 12);
      for (let i = 0; i < this.n; i++) {
        const w = this.w[i] * f;
        this.cs[i] = Math.cos(w);
        this.sn[i] = Math.sin(w);
      }
    }
    let e = 0;
    for (let i = 0; i < this.n; i++) e += this.re[i] * this.re[i] + this.im[i] * this.im[i];
    this.energy = e;
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  render(L, R, start, end) {
    const n = this.n;
    const { re, im, cs, sn, r, panL, panR } = this;
    const amp = this.amp;
    const out = this.out;
    for (let s = start; s < end; s++) {
      if (this.ctrl-- <= 0) {
        this.#control();
        this.ctrl = CONTROL_INTERVAL - 1;
        if (this.samples > this.pulseLen + 64 && this.energy < 1e-10 && this.noiseEnv < 1e-5 && this.rollLeft <= 0) {
          this.active = false;
          this.stealing = false;
          return;
        }
      }
      // Excitation (and repeated strokes of a roll).
      let x = 0;
      if (this.pulsePos < this.pulseLen) {
        x = this.pulseGain;
        this.pulsePos++;
      }
      if (this.rollLeft > 0) {
        this.rollLeft--;
        if (--this.rollNext <= 0) {
          this.pulsePos = 0;
          this.noiseEnv = Math.max(this.noiseEnv, 0.6);
          // Uneven strokes: ±15 % velocity, ±20 % timing.
          this.pulseGain = this.baseGain * (0.55 + 0.3 * this.rng.float());
          this.rollNext = Math.round((this.sr / this.p.rollRate) * (0.8 + 0.4 * this.rng.float()));
        }
      }
      let yl = 0;
      let yr = 0;
      for (let i = 0; i < n; i++) {
        const a = re[i];
        const b = im[i];
        const ri = r[i];
        re[i] = ri * (cs[i] * a - sn[i] * b) + x * amp[i];
        const y = ri * (sn[i] * a + cs[i] * b);
        im[i] = y;
        yl += y * panL[i];
        yr += y * panR[i];
      }
      if (this.noiseEnv > 1e-5) {
        const nz = this.noiseFilter.process(this.noise.white()) * this.noiseEnv * this.noiseLevel;
        this.noiseEnv *= this.noiseCoef;
        yl += nz;
        yr += nz;
      }
      let g = out;
      if (this.tremDepth > 0) {
        this.tremPhase += this.tremInc;
        if (this.tremPhase >= 1) this.tremPhase -= 1;
        g *= 1 - this.tremDepth * 0.5 * (1 - Math.cos(2 * Math.PI * this.tremPhase));
      }
      L[s] += yl * g;
      R[s] += yr * g;
      this.samples++;
    }
  }
}

/**
 * @param {ModalPreset} preset
 * @param {import('./context.js').SynthContext} ctx
 * @param {import('../core/prng.js').Rng} rng
 */
export function createModal(preset, ctx, rng) {
  const p = withDefaults(preset);
  return new PolyInstrument(p, (i) => new ModalVoice(p, ctx, rng.fork(`voice${i}`)), { polyphony: p.polyphony });
}
