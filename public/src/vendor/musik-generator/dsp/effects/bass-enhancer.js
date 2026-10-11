// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Psychoacoustic bass for small speakers ("virtual bass"): phone and tablet
 * speakers cannot reproduce the lowest octave, but the ear reconstructs a
 * missing fundamental from its harmonics. The low band is extracted,
 * normalized by its envelope, passed through a mild nonlinearity (full-wave
 * rectification for even, a soft cubic for odd harmonics), band-limited to
 * the range small speakers can play and added back with the low band's
 * envelope, so the effect scales with the bass and adds no noise in silence.
 *
 * Ref: E. Larsen & R. M. Aarts, Audio Bandwidth Extension, Wiley 2004,
 * ch. 6 (low-frequency psychoacoustic bass enhancement; missing fundamental).
 */

import { Biquad, designBiquad } from '../filters.js';
import { onePoleCoef } from '../util.js';

/**
 * @typedef {object} BassEnhancerParams
 * @property {number} [amount] level of the generated harmonics relative to the low band (default 0.6)
 * @property {number} [cutoffHz] upper edge of the bass that is "translated" (default 120)
 */

export class BassEnhancer {
  /**
   * @param {number} sampleRate
   * @param {BassEnhancerParams} [params]
   */
  constructor(sampleRate, { amount = 0.6, cutoffHz = 120 } = {}) {
    this.amount = amount;
    this.lp1 = new Biquad(designBiquad('lowpass', cutoffHz, 0.707, 0, sampleRate));
    this.lp2 = new Biquad(designBiquad('lowpass', cutoffHz, 0.707, 0, sampleRate));
    this.hp = new Biquad(designBiquad('highpass', cutoffHz * 1.2, 0.707, 0, sampleRate));
    this.hp2 = new Biquad(designBiquad('highpass', cutoffHz * 1.2, 0.707, 0, sampleRate));
    this.top = new Biquad(designBiquad('lowpass', cutoffHz * 4.5, 0.707, 0, sampleRate));
    this.env = 0;
    this.att = onePoleCoef(0.004, sampleRate);
    this.rel = onePoleCoef(0.08, sampleRate);
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  process(L, R, start, end) {
    const a = this.amount;
    for (let i = start; i < end; i++) {
      const low = this.lp2.process(this.lp1.process(0.5 * (L[i] + R[i])));
      const m = Math.abs(low);
      this.env = m > this.env ? m + (this.env - m) * this.att : m + (this.env - m) * this.rel;
      if (this.env < 1e-6) {
        this.top.process(this.hp2.process(this.hp.process(0)));
        continue;
      }
      const n = Math.max(-1, Math.min(1, low / (this.env * 1.2)));
      // Even (rectifier) and odd (soft cubic) harmonics of the normalized bass.
      const h = 0.65 * (Math.abs(n) - 0.6366) + 0.35 * (n - (n * n * n) / 3);
      const y = this.top.process(this.hp2.process(this.hp.process(h))) * this.env * a;
      L[i] += y;
      R[i] += y;
    }
  }
}
