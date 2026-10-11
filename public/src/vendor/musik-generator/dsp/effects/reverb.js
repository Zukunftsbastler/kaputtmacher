// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Algorithmic stereo reverb: predelay → early reflections (multi-tap) →
 * input diffusion (series all-passes) → 8-line feedback delay network with
 * a Hadamard mixing matrix, per-line damping and slow delay modulation.
 * Line gains are set from the desired RT60 so decay time is calibrated.
 * Ref: Jot & Chaigne, "Digital Delay Networks for Designing Artificial
 * Reverberators", AES 1991; Schroeder 1962 (all-pass diffusion).
 * Covers small rooms up to cathedral-sized spaces (RT60 up to ~12 s).
 */

import { DelayLine } from '../delay-line.js';
import { OnePole } from '../filters.js';
import { flush, TWO_PI } from '../util.js';

/**
 * @typedef {object} ReverbParams
 * @property {number} [rt60] decay time in seconds (default 2.2)
 * @property {number} [size] room size 0.3…2 scales delay lengths (default 1)
 * @property {number} [damping] high-frequency damping cutoff in Hz (default 6000)
 * @property {number} [predelayMs] (default 20)
 * @property {number} [early] early-reflection level 0…1 (default 0.3)
 * @property {number} [width] stereo width 0…1 (default 1)
 * @property {number} [mix] wet level (default 1: use on a send bus)
 * @property {number} [modulation] delay modulation depth in samples (default 6)
 */

/** Base FDN line lengths in ms (mutually incommensurate). */
const LINE_MS = [31.3, 37.9, 41.1, 47.3, 53.9, 61.7, 67.1, 73.7];
/** Diffuser all-pass delays in ms and gain. */
const DIFFUSER_MS = [4.7, 3.6, 12.7, 9.3];
const DIFFUSER_GAIN = 0.65;
/** Early reflection taps: [ms, gain] for left and right. */
const EARLY_L = [[7.1, 0.8], [11.9, 0.62], [19.3, 0.5], [27.1, 0.38], [37.7, 0.28], [51.2, 0.2]];
const EARLY_R = [[8.3, 0.78], [13.7, 0.6], [21.1, 0.48], [29.9, 0.36], [41.3, 0.26], [55.7, 0.19]];
/** Output sign patterns (decorrelate L and R). */
const OUT_L = [1, -1, 1, 1, -1, 1, -1, -1];
const OUT_R = [1, 1, -1, 1, 1, -1, -1, 1];

/** In-place 8-point fast Walsh–Hadamard transform, normalized (orthogonal). */
function hadamard8(/** @type {Float64Array} */ v) {
  for (let h = 1; h < 8; h <<= 1) {
    for (let i = 0; i < 8; i += h << 1) {
      for (let j = i; j < i + h; j++) {
        const a = v[j];
        const b = v[j + h];
        v[j] = a + b;
        v[j + h] = a - b;
      }
    }
  }
  const s = 1 / Math.sqrt(8);
  for (let i = 0; i < 8; i++) v[i] *= s;
}

export class Reverb {
  /**
   * @param {number} sampleRate
   * @param {ReverbParams} [params]
   */
  constructor(sampleRate, params = {}) {
    this.sampleRate = sampleRate;
    const sr = sampleRate;
    this.predelay = new DelayLine(Math.ceil(0.25 * sr));
    this.diffusers = DIFFUSER_MS.map((ms) => ({ line: new DelayLine(Math.ceil((ms / 1000) * sr) + 2), d: Math.round((ms / 1000) * sr) }));
    this.lines = LINE_MS.map(() => new DelayLine(Math.ceil(0.075 * 2.1 * sr) + 64));
    this.dampers = LINE_MS.map(() => new OnePole(sr));
    this.lengths = new Float64Array(8);
    this.gains = new Float64Array(8);
    this.vec = new Float64Array(8);
    this.modPhase = 0;
    this.p = { rt60: 2.2, size: 1, damping: 6000, predelayMs: 20, early: 0.3, width: 1, mix: 1, modulation: 6 };
    this.set(params);
  }

  /** @param {ReverbParams} params */
  set(params) {
    Object.assign(this.p, params);
    const sr = this.sampleRate;
    const size = Math.min(2, Math.max(0.3, this.p.size));
    for (let i = 0; i < 8; i++) {
      this.lengths[i] = Math.round((LINE_MS[i] / 1000) * size * sr);
      // Gain per pass so that the loop decays by 60 dB in rt60 seconds.
      this.gains[i] = 10 ** ((-3 * this.lengths[i]) / (Math.max(0.1, this.p.rt60) * sr));
      this.dampers[i].set(this.p.damping);
    }
    this.predelaySamples = Math.max(1, Math.round((Math.min(120, this.p.predelayMs) / 1000) * sr));
    this.earlyL = EARLY_L.map(([ms, g]) => [Math.round((ms / 1000) * size * sr), g]);
    this.earlyR = EARLY_R.map(([ms, g]) => [Math.round((ms / 1000) * size * sr), g]);
    this.modDt = 0.13 / sr;
  }

  clear() {
    this.predelay.clear();
    for (const d of this.diffusers) d.line.clear();
    for (const l of this.lines) l.clear();
    for (const d of this.dampers) d.reset();
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  process(L, R, start, end) {
    const { early, width, mix, modulation } = this.p;
    const v = this.vec;
    const dryGain = mix >= 1 ? 0 : 1;
    const wMid = 0.5 * (1 + width);
    const wSide = 0.5 * (1 - width);
    const earlyL = this.earlyL;
    const earlyR = this.earlyR;
    for (let i = start; i < end; i++) {
      const input = 0.5 * (L[i] + R[i]);
      this.predelay.write(input);
      const pre = this.predelay.tap(this.predelaySamples);

      // Early reflections straight from the predelay line.
      let el = 0;
      let er = 0;
      for (let t = 0; t < earlyL.length; t++) {
        el += this.predelay.tap(this.predelaySamples + earlyL[t][0]) * earlyL[t][1];
        er += this.predelay.tap(this.predelaySamples + earlyR[t][0]) * earlyR[t][1];
      }

      // Series all-pass diffusion smears the input into a dense wavefront.
      let x = pre;
      for (let k = 0; k < this.diffusers.length; k++) {
        const dfs = this.diffusers[k];
        const delayed = dfs.line.tap(dfs.d);
        const w = x + DIFFUSER_GAIN * delayed;
        dfs.line.write(w);
        x = delayed - DIFFUSER_GAIN * w;
      }

      // FDN: read, damp, attenuate, mix, feed back.
      const mod = Math.sin(TWO_PI * this.modPhase) * modulation;
      this.modPhase += this.modDt;
      if (this.modPhase >= 1) this.modPhase -= 1;
      let outL = 0;
      let outR = 0;
      for (let k = 0; k < 8; k++) {
        const d = this.lengths[k] + (k < 4 ? (k % 2 === 0 ? mod : -mod) : 0);
        const y = k < 4 ? this.lines[k].readCubic(d) : this.lines[k].tap(this.lengths[k]);
        const damped = this.dampers[k].lowpass(y) * this.gains[k];
        v[k] = damped;
        outL += y * OUT_L[k];
        outR += y * OUT_R[k];
      }
      hadamard8(v);
      for (let k = 0; k < 8; k++) this.lines[k].write(flush(v[k] + x * (k % 2 === 0 ? 0.5 : -0.5)));

      const wl = (outL * 0.35 + el * early) * mix;
      const wr = (outR * 0.35 + er * early) * mix;
      L[i] = L[i] * dryGain + wMid * wl + wSide * wr;
      R[i] = R[i] * dryGain + wMid * wr + wSide * wl;
    }
  }
}
