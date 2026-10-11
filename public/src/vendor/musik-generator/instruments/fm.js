// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Four-operator FM (phase modulation) synthesizer with free routing,
 * per-operator envelopes, velocity sensitivity, keyboard level scaling and
 * operator feedback. Ref: J. Chowning, "The Synthesis of Complex Audio
 * Spectra by Means of Frequency Modulation", JAES 21(7), 1973.
 * Good for electric pianos, bells, mallets and punchy basses.
 */

import { Adsr } from '../dsp/envelope.js';
import { Lfo } from '../dsp/lfo.js';
import { CONTROL_INTERVAL, pitchToHz, centsToRatio, dbToGain } from '../dsp/util.js';
import { PolyInstrument, vary } from './voice-pool.js';
import { SINE_TABLE_SIZE } from './context.js';

const INV_TWO_PI = 1 / (2 * Math.PI);

/**
 * Table-lookup sine of a phase in cycles (any real value), linear interpolation.
 * About 3× cheaper than Math.sin; error < 1e-6, far below audibility.
 * @param {Float32Array} table
 * @param {number} cycles
 */
function tableSin(table, cycles) {
  const x = (cycles - Math.floor(cycles)) * SINE_TABLE_SIZE;
  const i = x | 0;
  return table[i] + (table[i + 1] - table[i]) * (x - i);
}

/**
 * @typedef {object} FmOperator
 * @property {number} ratio frequency ratio to the note (ignored when fixedHz is set)
 * @property {number} [fixedHz]
 * @property {number} [detune] cents
 * @property {number} level carriers: output amplitude; modulators: modulation index in radians
 * @property {import('../dsp/envelope.js').AdsrParams} env
 * @property {number} [velSens] 0…1 how strongly velocity scales the level
 * @property {number} [keyScale] level change in dB per octave above C4 (negative = tamer high notes)
 * @property {number} [feedback] self-modulation in radians
 */

/**
 * @typedef {object} FmPreset
 * @property {'fm'} engine
 * @property {string} [id]
 * @property {FmOperator[]} operators up to 4
 * @property {[number, number][]} routes [modulator, target] pairs; modulator index must be greater than target
 * @property {number[]} carriers operator indices summed to the output
 * @property {number} [polyphony]
 * @property {{ rate: number, depth: number, delay?: number }} [vibrato] cents
 * @property {{ amount: number, decay: number }} [pitchEnv] semitones, seconds
 * @property {number} [velocity] amplitude velocity sensitivity
 * @property {number} [stereoDetune] cents between left and right copies of carrier 0 (width)
 * @property {{ detune?: number, index?: number }} [variation]
 * @property {number} [gainDb]
 */

/** @param {FmPreset} p */
function withDefaults(p) {
  for (const [m, t] of p.routes) {
    if (!(m > t)) throw new RangeError(`FM route ${m}→${t}: modulator index must be greater than target`);
  }
  return {
    polyphony: 12,
    vibrato: { rate: 5, depth: 0, delay: 0.4 },
    pitchEnv: { amount: 0, decay: 0.02 },
    velocity: 0.75,
    stereoDetune: 0,
    variation: { detune: 2, index: 0.06 },
    gainDb: 0,
    ...p,
  };
}

class FmVoice {
  /**
   * @param {ReturnType<typeof withDefaults>} p
   * @param {import('./context.js').SynthContext} ctx
   * @param {import('../core/prng.js').Rng} rng
   */
  constructor(p, ctx, rng) {
    const sr = ctx.sampleRate;
    this.p = p;
    this.sr = sr;
    this.rng = rng;
    this.sine = ctx.sine;
    this.active = false;
    this.released = false;
    this.stealing = false;
    this.pitch = 60;
    this.age = 0;
    const n = p.operators.length;
    this.n = n;
    this.envs = p.operators.map((op) => new Adsr(sr, op.env));
    this.phase = new Float64Array(n);
    this.inc = new Float64Array(n);
    this.levels = new Float64Array(n);
    this.out = new Float64Array(n);
    this.fbPrev = new Float64Array(n);
    this.isCarrier = p.operators.map((_, i) => p.carriers.includes(i));
    /** modulators[t] = list of operator indices modulating operator t */
    this.modulators = p.operators.map((_, t) => p.routes.filter(([, tt]) => tt === t).map(([m]) => m));
    this.carrierEnvs = p.carriers.map((c) => this.envs[c]);
    this.vib = new Lfo(sr, { rate: p.vibrato.rate, delay: p.vibrato.delay ?? 0.4, fade: 0.3 });
    this.ctrl = 0;
    this.pEnv = 0;
    this.pEnvCoef = Math.exp(-CONTROL_INTERVAL / (Math.max(0.001, p.pitchEnv.decay) * sr));
    this.ratios = new Float64Array(n);
    this.amp = 1;
    this.varDetune = 0;
    this.outGain = dbToGain(p.gainDb) / Math.max(1, p.carriers.length);
    // Width: a second phase for carrier 0, slightly detuned, goes right.
    this.widePhase = 0;
    this.wideInc = 0;
    this.wideRatio = centsToRatio(p.stereoDetune);
  }

  level() {
    let m = 0;
    for (const e of this.carrierEnvs) m = Math.max(m, e.value);
    return m * this.amp;
  }

  /**
   * @param {number} pitch
   * @param {number} velocity
   */
  noteOn(pitch, velocity) {
    const p = this.p;
    this.active = true;
    this.released = false;
    this.stealing = false;
    this.pitch = pitch;
    this.varDetune = vary(this.rng, p.variation.detune ?? 0);
    const indexVar = 1 + vary(this.rng, p.variation.index ?? 0);
    const octavesAboveC4 = (pitch - 60) / 12;
    p.operators.forEach((op, i) => {
      const vs = op.velSens ?? 0.5;
      const velScale = 1 - vs + vs * velocity;
      const keyScale = dbToGain((op.keyScale ?? 0) * Math.max(0, octavesAboveC4));
      this.levels[i] = op.level * velScale * keyScale * (this.isCarrier[i] ? 1 : indexVar);
      this.ratios[i] = op.fixedHz ? 0 : op.ratio * centsToRatio(op.detune ?? 0);
      this.phase[i] = 0;
      this.out[i] = 0;
      this.fbPrev[i] = 0;
      this.envs[i].set(op.env);
      this.envs[i].gate();
    });
    this.widePhase = 0.25;
    this.amp = 1 - p.velocity + p.velocity * velocity ** 1.3;
    this.vib.reset();
    this.pEnv = 1;
    this.ctrl = 0;
  }

  noteOff() {
    this.released = true;
    for (const e of this.envs) e.release();
  }

  steal() {
    this.released = true;
    this.stealing = true;
    for (const e of this.carrierEnvs) e.forceRelease(0.004);
  }

  #control() {
    const p = this.p;
    const vib = this.vib.advance(CONTROL_INTERVAL) * p.vibrato.depth;
    this.pEnv *= this.pEnvCoef;
    const hz = pitchToHz(this.pitch + (vib + this.varDetune + this.pEnv * p.pitchEnv.amount * 100) / 100);
    for (let i = 0; i < this.n; i++) {
      const op = p.operators[i];
      this.inc[i] = (op.fixedHz ?? hz * this.ratios[i]) / this.sr;
    }
    this.wideInc = this.inc[p.carriers[0]] * this.wideRatio;
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  render(L, R, start, end) {
    const p = this.p;
    const n = this.n;
    const ops = p.operators;
    const gain = this.outGain * this.amp;
    const wide = p.stereoDetune !== 0;
    const c0 = p.carriers[0];
    for (let s = start; s < end; s++) {
      if (this.ctrl-- <= 0) {
        this.#control();
        this.ctrl = CONTROL_INTERVAL - 1;
      }
      let sum = 0;
      let wideOut = 0;
      // Modulators have higher indices, so compute from the last operator down.
      for (let i = n - 1; i >= 0; i--) {
        let pm = 0;
        const mods = this.modulators[i];
        for (let k = 0; k < mods.length; k++) pm += this.out[mods[k]];
        const fb = ops[i].feedback ?? 0;
        if (fb !== 0) pm += fb * 0.5 * (this.out[i] + this.fbPrev[i]);
        const env = this.envs[i].next();
        const ph = this.phase[i];
        const y = tableSin(this.sine, ph + pm * INV_TWO_PI) * env * this.levels[i];
        this.fbPrev[i] = this.out[i];
        this.out[i] = y;
        let np = ph + this.inc[i];
        if (np >= 1) np -= 1;
        this.phase[i] = np;
        if (this.isCarrier[i]) {
          sum += y;
          if (wide && i === c0) {
            wideOut = tableSin(this.sine, this.widePhase + pm * INV_TWO_PI) * env * this.levels[i];
            this.widePhase += this.wideInc;
            if (this.widePhase >= 1) this.widePhase -= 1;
          }
        }
      }
      if (wide) {
        L[s] += sum * gain;
        R[s] += (sum - this.out[c0] + wideOut) * gain;
      } else {
        L[s] += sum * gain;
        R[s] += sum * gain;
      }
      let alive = false;
      for (const e of this.carrierEnvs) if (e.active) alive = true;
      if (!alive) {
        this.active = false;
        this.stealing = false;
        break;
      }
    }
  }
}

/**
 * @param {FmPreset} preset
 * @param {import('./context.js').SynthContext} ctx
 * @param {import('../core/prng.js').Rng} rng
 */
export function createFm(preset, ctx, rng) {
  const p = withDefaults(preset);
  return new PolyInstrument(p, (i) => new FmVoice(p, ctx, rng.fork(`voice${i}`)), { polyphony: p.polyphony });
}
