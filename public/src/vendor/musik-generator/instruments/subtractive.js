// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Subtractive ("virtual analog") synthesizer: alias-free wavetable
 * oscillators with unison/detune and stereo spread, sub oscillator, noise,
 * ladder or state-variable filter with envelope/key/velocity tracking,
 * delayed vibrato, analog-style drift and per-note variation.
 * Covers pads, string ensembles, basses, leads and synth plucks.
 */

import { WavetableOscillator } from '../dsp/wavetable.js';
import { Adsr } from '../dsp/envelope.js';
import { Lfo } from '../dsp/lfo.js';
import { Ladder, Svf, DcBlocker } from '../dsp/filters.js';
import { NoiseSource } from '../dsp/noise.js';
import { CONTROL_INTERVAL, pitchToHz, dbToGain, centsToRatio, clamp, softClip } from '../dsp/util.js';
import { PolyInstrument, vary } from './voice-pool.js';

/**
 * @typedef {object} OscSpec
 * @property {'sine' | 'saw' | 'square' | 'triangle' | 'pulse' | 'warm' | 'hollow' | 'organ' | 'vocal'} wave
 * @property {number} [level] default 1
 * @property {number} [octave] default 0
 * @property {number} [detune] cents, default 0
 * @property {number} [unison] voices, default 1
 * @property {number} [spread] total unison detune width in cents, default 20
 * @property {number} [stereo] unison stereo width 0…1, default 0.7
 * @property {number} [pw] pulse width for "pulse", default 0.5
 */

/**
 * @typedef {object} SubtractivePreset
 * @property {'subtractive'} engine
 * @property {string} [id]
 * @property {number} [polyphony]
 * @property {boolean} [mono]
 * @property {number} [glide] seconds (mono legato)
 * @property {OscSpec[]} osc
 * @property {{ level: number, octave?: number, wave?: 'sine' | 'square' | 'triangle' }} [sub]
 * @property {{ level: number, color?: 'white' | 'pink' }} [noise]
 * @property {{ type?: 'ladder' | 'svf', mode?: import('../dsp/filters.js').SvfMode, cutoff: number, resonance?: number,
 *              keyTrack?: number, envAmount?: number, velAmount?: number, drive?: number }} filter
 *   envAmount / velAmount in octaves
 * @property {import('../dsp/envelope.js').AdsrParams} ampEnv
 * @property {import('../dsp/envelope.js').AdsrParams} [filterEnv]
 * @property {{ amount: number, decay: number }} [pitchEnv] semitones, seconds (time constant)
 * @property {{ rate: number, depth: number, delay?: number, fade?: number }} [vibrato] depth in cents
 * @property {{ rate: number, depth: number }} [filterLfo] depth in octaves
 * @property {{ rate: number, depth: number }} [pwm] depth in pulse-width units
 * @property {number} [drift] slow random pitch drift in cents
 * @property {{ detune?: number, cutoff?: number, level?: number }} [variation] per-note random spread
 * @property {number} [velocity] velocity → amplitude sensitivity 0…1, default 0.7
 * @property {boolean} [phaseReset] restart oscillator phases on note-on (punchy basses)
 * @property {{ drive: number, asymmetry?: number }} [shaper] post-filter saturation per voice:
 *   drive 0 = off … 4 = strong; asymmetry 0…1 adds even harmonics (2nd = octave), which keep the
 *   pitch clear on small speakers that cannot reproduce the fundamental
 * @property {number} [gainDb]
 */

/** @param {SubtractivePreset} p */
function withDefaults(p) {
  return {
    polyphony: 12,
    mono: false,
    glide: 0.06,
    sub: { level: 0, octave: -1, wave: 'sine' },
    noise: { level: 0, color: 'white' },
    filterEnv: { a: 0.01, d: 0.3, s: 0.5, r: 0.3 },
    pitchEnv: { amount: 0, decay: 0.05 },
    vibrato: { rate: 5, depth: 0, delay: 0.3, fade: 0.4 },
    filterLfo: { rate: 0.2, depth: 0 },
    pwm: { rate: 0.3, depth: 0 },
    drift: 3,
    variation: { detune: 3, cutoff: 0.08, level: 0.05 },
    velocity: 0.7,
    phaseReset: false,
    shaper: { drive: 0, asymmetry: 0 },
    gainDb: 0,
    ...p,
    filter: { type: 'ladder', mode: 'lowpass', resonance: 0.1, keyTrack: 0.5, envAmount: 0, velAmount: 0.5, drive: 1, ...p.filter },
  };
}

/** @typedef {ReturnType<typeof withDefaults>} SubParams */

class SubtractiveVoice {
  /**
   * @param {SubParams} p
   * @param {import('./context.js').SynthContext} ctx
   * @param {import('../core/prng.js').Rng} rng
   */
  constructor(p, ctx, rng) {
    const sr = ctx.sampleRate;
    this.p = p;
    this.sr = sr;
    this.rng = rng;
    this.active = false;
    this.released = false;
    this.stealing = false;
    this.pitch = 60;
    this.targetPitch = 60;
    this.age = 0;
    this.velocity = 0;

    /** @type {{ osc: WavetableOscillator, ratio: number, gainL: number, gainR: number, pulse: boolean, pw: number }[]} */
    this.oscs = [];
    let norm = 0;
    for (const spec of p.osc) {
      const n = Math.max(1, spec.unison ?? 1);
      const level = spec.level ?? 1;
      const spread = spec.spread ?? 20;
      const stereo = spec.stereo ?? 0.7;
      const isPulse = spec.wave === 'pulse';
      const bank = ctx.wavetable(isPulse ? 'saw' : spec.wave);
      for (let u = 0; u < n; u++) {
        const pos = n > 1 ? u / (n - 1) - 0.5 : 0; // −0.5 … 0.5
        const cents = (spec.detune ?? 0) + pos * spread;
        const pan = clamp(2 * pos * stereo, -1, 1);
        // Unison voices are summed at 1/√n so thick patches keep their level.
        const g = level / Math.sqrt(n);
        this.oscs.push({
          osc: new WavetableOscillator(bank, sr),
          ratio: 2 ** (spec.octave ?? 0) * centsToRatio(cents),
          gainL: g * (1 - Math.max(0, pan)),
          gainR: g * (1 + Math.min(0, pan)),
          pulse: isPulse,
          pw: spec.pw ?? 0.5,
        });
      }
      norm += level;
    }
    if (p.sub.level > 0) {
      this.oscs.push({
        osc: new WavetableOscillator(ctx.wavetable(p.sub.wave ?? 'sine'), sr),
        ratio: 2 ** (p.sub.octave ?? -1),
        gainL: p.sub.level,
        gainR: p.sub.level,
        pulse: false,
        pw: 0.5,
      });
      norm += p.sub.level;
    }
    this.stereo = this.oscs.some((o) => o.gainL !== o.gainR);
    this.noise = new NoiseSource(rng.fork('noise'));
    this.noiseLevel = p.noise.level;
    this.pinkNoise = p.noise.color === 'pink';
    this.normGain = 1 / Math.max(1, norm + p.noise.level);
    this.presetGain = dbToGain(p.gainDb);
    // Saturator: y = (clip(d·x + b) − clip(b)) · k, with k so that x = 1 maps to about 1.
    this.shDrive = p.shaper.drive;
    this.shBias = (p.shaper.asymmetry ?? 0) * 0.6;
    this.shOffset = softClip(this.shBias);
    this.shNorm = this.shDrive > 0 ? 1 / (softClip(this.shDrive + this.shBias) - this.shOffset) : 1;
    // Asymmetric shaping adds a level-dependent DC component; remove it per voice.
    this.dcL = new DcBlocker(sr);
    this.dcR = new DcBlocker(sr);

    const makeFilter = () => (p.filter.type === 'svf' ? new Svf(sr) : new Ladder(sr));
    this.filterL = makeFilter();
    this.filterR = makeFilter();
    if (this.filterL instanceof Svf && this.filterR instanceof Svf) {
      this.filterL.setMode(p.filter.mode ?? 'lowpass');
      this.filterR.setMode(p.filter.mode ?? 'lowpass');
    } else if (this.filterL instanceof Ladder && this.filterR instanceof Ladder) {
      this.filterL.setDrive(p.filter.drive ?? 1);
      this.filterR.setDrive(p.filter.drive ?? 1);
    }

    this.ampEnv = new Adsr(sr, p.ampEnv);
    this.filtEnv = new Adsr(sr, p.filterEnv);
    this.vib = new Lfo(sr, { rate: p.vibrato.rate, delay: p.vibrato.delay ?? 0.3, fade: p.vibrato.fade ?? 0.4 });
    this.fLfo = new Lfo(sr, { rate: p.filterLfo.rate, shape: 'triangle' });
    this.pwmLfo = new Lfo(sr, { rate: p.pwm.rate, shape: 'triangle' });
    this.driftLfo = new Lfo(sr, { rate: 0.7, shape: 'random' }, rng.fork('drift'));
    this.drift = 0;
    this.glideCoef = Math.exp(-CONTROL_INTERVAL / (Math.max(0.001, p.glide) * sr));
    this.pEnv = 0;
    this.pEnvCoef = Math.exp(-CONTROL_INTERVAL / (Math.max(0.001, p.pitchEnv.decay) * sr));
    this.ctrl = 0;
    this.fenv = 0;
    this.pwNow = 0.5;
    this.varDetune = 0;
    this.varCutoff = 0;
    this.amp = 1;
  }

  level() {
    return this.ampEnv.value * this.amp;
  }

  /**
   * @param {number} pitch
   * @param {number} velocity
   */
  noteOn(pitch, velocity) {
    const p = this.p;
    const rng = this.rng;
    this.active = true;
    this.released = false;
    this.stealing = false;
    this.pitch = pitch;
    this.targetPitch = pitch;
    this.velocity = velocity;
    this.varDetune = vary(rng, p.variation.detune ?? 0);
    this.varCutoff = vary(rng, p.variation.cutoff ?? 0);
    const sens = p.velocity;
    this.amp = (1 - sens + sens * velocity ** 1.5) * (1 + vary(rng, p.variation.level ?? 0));
    for (const o of this.oscs) o.osc.reset(p.phaseReset ? 0 : rng.float());
    this.ampEnv.set(p.ampEnv);
    this.ampEnv.gate();
    this.filtEnv.gate();
    this.vib.reset();
    this.pEnv = 1;
    this.ctrl = 0;
    this.filterL.reset();
    this.filterR.reset();
    this.dcL.reset();
    this.dcR.reset();
  }

  /**
   * @param {number} pitch
   * @param {number} velocity
   */
  legato(pitch, velocity) {
    this.targetPitch = pitch;
    this.velocity = Math.max(this.velocity * 0.8, velocity);
  }

  noteOff() {
    this.released = true;
    this.ampEnv.release();
    this.filtEnv.release();
  }

  steal() {
    this.released = true;
    this.stealing = true;
    this.ampEnv.forceRelease(0.004);
  }

  #control() {
    const p = this.p;
    const n = CONTROL_INTERVAL;
    this.pitch = this.targetPitch + (this.pitch - this.targetPitch) * this.glideCoef;
    const vib = this.vib.advance(n) * p.vibrato.depth;
    this.drift += (this.driftLfo.advance(n) - this.drift) * 0.01;
    this.pEnv *= this.pEnvCoef;
    const cents = vib + this.drift * p.drift + this.varDetune + this.pEnv * p.pitchEnv.amount * 100;
    const hz = pitchToHz(this.pitch + cents / 100);
    for (const o of this.oscs) o.osc.setFrequency(hz * o.ratio);
    this.pwNow = p.pwm.depth > 0 ? this.pwmLfo.advance(n) * p.pwm.depth : 0;
    const f = p.filter;
    const oct =
      ((f.keyTrack ?? 0.5) * (this.pitch - 60)) / 12 +
      (f.envAmount ?? 0) * this.fenv +
      (f.velAmount ?? 0) * (this.velocity - 0.7) +
      this.fLfo.advance(n) * p.filterLfo.depth +
      this.varCutoff;
    const cutoff = clamp(f.cutoff * 2 ** oct, 20, 20000);
    if (this.filterL instanceof Ladder && this.filterR instanceof Ladder) {
      this.filterL.set(cutoff, f.resonance ?? 0);
      this.filterR.set(cutoff, f.resonance ?? 0);
    } else if (this.filterL instanceof Svf && this.filterR instanceof Svf) {
      const q = 0.5 + 12 * (f.resonance ?? 0);
      this.filterL.set(cutoff, q);
      this.filterR.set(cutoff, q);
    }
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  render(L, R, start, end) {
    const oscs = this.oscs;
    const no = oscs.length;
    const stereo = this.stereo;
    const gain = this.normGain * this.amp;
    const out = this.presetGain;
    const drive = this.shDrive;
    const bias = this.shBias;
    const offset = this.shOffset;
    const norm = this.shNorm;
    for (let i = start; i < end; i++) {
      if (this.ctrl-- <= 0) {
        this.#control();
        this.ctrl = CONTROL_INTERVAL - 1;
      }
      this.fenv = this.filtEnv.next();
      const env = this.ampEnv.next();
      let l = 0;
      let r = 0;
      for (let k = 0; k < no; k++) {
        const o = oscs[k];
        const y = o.pulse ? o.osc.nextPulse(clamp(o.pw + this.pwNow, 0.05, 0.95)) : o.osc.next();
        l += y * o.gainL;
        r += y * o.gainR;
      }
      if (this.noiseLevel > 0) {
        const nz = (this.pinkNoise ? this.noise.pink() : this.noise.white()) * this.noiseLevel;
        l += nz;
        r += nz;
      }
      const g = env * gain;
      if (stereo) {
        let yl = this.filterL.process(l) * g;
        let yr = this.filterR.process(r) * g;
        if (drive > 0) {
          yl = this.dcL.process((softClip(drive * yl + bias) - offset) * norm);
          yr = this.dcR.process((softClip(drive * yr + bias) - offset) * norm);
        }
        L[i] += yl * out;
        R[i] += yr * out;
      } else {
        let y = this.filterL.process(l) * g;
        if (drive > 0) y = this.dcL.process((softClip(drive * y + bias) - offset) * norm);
        L[i] += y * out;
        R[i] += y * out;
      }
      if (!this.ampEnv.active) {
        this.active = false;
        this.stealing = false;
        break;
      }
    }
  }
}

/**
 * @param {SubtractivePreset} preset
 * @param {import('./context.js').SynthContext} ctx
 * @param {import('../core/prng.js').Rng} rng
 */
export function createSubtractive(preset, ctx, rng) {
  const p = withDefaults(preset);
  return new PolyInstrument(p, (i) => new SubtractiveVoice(p, ctx, rng.fork(`voice${i}`)), {
    polyphony: p.polyphony,
    mono: p.mono,
  });
}
