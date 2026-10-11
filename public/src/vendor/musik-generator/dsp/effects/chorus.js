// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Chorus / ensemble / wobble from modulated short delays.
 *  - chorus: 2–3 voices, slow sine modulation, stereo spread.
 *  - ensemble: adds a faster modulation component per voice for the lush
 *    "string machine" sound.
 *  - wobble (mix = 1, one voice): pure pitch wobble, e.g. tape flutter for lo-fi.
 */

import { DelayLine } from '../delay-line.js';
import { TWO_PI } from '../util.js';

/**
 * @typedef {object} ChorusParams
 * @property {number} [voices] 1…3 (default 3)
 * @property {number} [rate] Hz (default 0.4)
 * @property {number} [depthMs] modulation depth (default 2.5)
 * @property {number} [delayMs] base delay (default 12)
 * @property {number} [mix] 0…1 (default 0.5)
 * @property {number} [fastRate] Hz of the ensemble component (default 0 = off)
 * @property {number} [fastDepthMs] (default 0.3)
 * @property {number} [spread] stereo spread 0…1 (default 1)
 */

export class Chorus {
  /**
   * @param {number} sampleRate
   * @param {ChorusParams} [params]
   */
  constructor(sampleRate, params = {}) {
    this.sampleRate = sampleRate;
    this.lineL = new DelayLine(Math.ceil(0.06 * sampleRate));
    this.lineR = new DelayLine(Math.ceil(0.06 * sampleRate));
    this.phase = 0;
    this.fastPhase = 0;
    this.p = { voices: 3, rate: 0.4, depthMs: 2.5, delayMs: 12, mix: 0.5, fastRate: 0, fastDepthMs: 0.3, spread: 1 };
    this.set(params);
  }

  /** @param {ChorusParams} params */
  set(params) {
    Object.assign(this.p, params);
    const sr = this.sampleRate;
    this.voices = Math.max(1, Math.min(3, Math.round(this.p.voices)));
    this.dt = this.p.rate / sr;
    this.fastDt = this.p.fastRate / sr;
    this.base = (this.p.delayMs / 1000) * sr;
    this.depth = (this.p.depthMs / 1000) * sr;
    this.fastDepth = (this.p.fastDepthMs / 1000) * sr;
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  process(L, R, start, end) {
    const { mix, spread } = this.p;
    const n = this.voices;
    const dry = 1 - mix * (n === 1 && mix >= 1 ? 1 : 0.5);
    const wetGain = mix / n;
    for (let i = start; i < end; i++) {
      this.lineL.write(L[i]);
      this.lineR.write(R[i]);
      let wl = 0;
      let wr = 0;
      for (let v = 0; v < n; v++) {
        const off = v / n;
        const slow = Math.sin(TWO_PI * (this.phase + off));
        const fast = this.fastDt > 0 ? Math.sin(TWO_PI * (this.fastPhase + off * 1.37)) : 0;
        const dl = this.base + this.depth * (0.5 + 0.5 * slow) + this.fastDepth * fast;
        // The right channel reads the modulation in opposite phase for width.
        const slowR = Math.sin(TWO_PI * (this.phase + off + 0.5 * spread));
        const dr = this.base + this.depth * (0.5 + 0.5 * slowR) - this.fastDepth * fast;
        wl += this.lineL.readCubic(dl);
        wr += this.lineR.readCubic(dr);
      }
      this.phase += this.dt;
      if (this.phase >= 1) this.phase -= 1;
      this.fastPhase += this.fastDt;
      if (this.fastPhase >= 1) this.fastPhase -= 1;
      L[i] = L[i] * dry + wl * wetGain;
      R[i] = R[i] * dry + wr * wetGain;
    }
  }
}
