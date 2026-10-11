// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Deterministic noise sources driven by the seeded PRNG.
 * Pink noise uses the Voss–McCartney idea: several white-noise rows that are
 * updated at octave-spaced rates (row r changes every 2^r samples) and summed,
 * which approximates a −3 dB/octave spectrum.
 */

/** Number of octave rows for pink noise. */
const PINK_ROWS = 14;

export class NoiseSource {
  /** @param {import('../core/prng.js').Rng} rng */
  constructor(rng) {
    this.rng = rng;
    this.rows = new Float64Array(PINK_ROWS);
    this.rowSum = 0;
    this.counter = 0;
    this.brownState = 0;
    this.lfsrReg = 1;
    this.lfsrPhase = 0;
  }

  /** @returns {number} uniform white noise in [-1, 1) */
  white() {
    return this.rng.float() * 2 - 1;
  }

  /** @returns {number} pink noise, roughly in [-1, 1] */
  pink() {
    this.counter = (this.counter + 1) & 0xffff;
    const c = this.counter;
    if (c !== 0) {
      // Index of the lowest set bit selects the row to refresh.
      const row = 31 - Math.clz32(c & -c);
      if (row < PINK_ROWS) {
        const w = this.white();
        this.rowSum += w - this.rows[row];
        this.rows[row] = w;
      }
    }
    return ((this.rowSum + this.white()) / (PINK_ROWS + 1)) * 2.5;
  }

  /** @returns {number} brown (−6 dB/octave) noise, roughly in [-1, 1] */
  brown() {
    this.brownState = 0.996 * this.brownState + 0.06 * this.white();
    return this.brownState * 2;
  }

  /**
   * Console-style noise: a 15-bit linear-feedback shift register clocked at
   * `clocksPerSample`; feedback from bit 1 (long, 32767-step) or bit 6 (short,
   * 93-step "metallic" loop), output ±1 held between clocks (8-bit sound chips).
   * @param {number} clocksPerSample
   * @param {boolean} [short]
   */
  lfsr(clocksPerSample, short = false) {
    this.lfsrPhase += clocksPerSample;
    while (this.lfsrPhase >= 1) {
      this.lfsrPhase -= 1;
      const r = this.lfsrReg;
      const bit = (r ^ (r >> (short ? 6 : 1))) & 1;
      this.lfsrReg = (r >> 1) | (bit << 14);
    }
    return this.lfsrReg & 1 ? -1 : 1;
  }
}
