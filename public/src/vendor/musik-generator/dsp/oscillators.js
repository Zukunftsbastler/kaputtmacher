// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Band-limited "virtual analog" oscillators using PolyBLEP correction:
 * the naive waveform's discontinuities are smoothed with a 2-sample
 * polynomial residual, which removes most audible aliasing at low cost.
 * Ref: Välimäki & Huovilainen, "Antialiasing Oscillators in Subtractive
 * Synthesis", IEEE Signal Processing Magazine 24(2), 2007.
 * The triangle is obtained by leaky integration of the band-limited square.
 */

import { TWO_PI } from './util.js';

export const WAVE = Object.freeze({ sine: 0, saw: 1, square: 2, triangle: 3 });

/** @typedef {keyof typeof WAVE} WaveName */

/**
 * PolyBLEP residual for a unit step at phase 0.
 * @param {number} t phase 0…1
 * @param {number} dt phase increment per sample
 */
function polyBlep(t, dt) {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

export class BlepOscillator {
  /** @param {number} sampleRate */
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.phase = 0;
    this.dt = 0;
    this.wave = WAVE.saw;
    this.pulseWidth = 0.5;
    this.tri = -1;
  }

  /** @param {WaveName} name */
  setWave(name) {
    const w = WAVE[name];
    if (w === undefined) throw new RangeError(`Unknown wave "${name}"`);
    this.wave = w;
  }

  /** @param {number} hz */
  setFrequency(hz) {
    const dt = hz / this.sampleRate;
    this.dt = dt < 0 ? 0 : dt > 0.45 ? 0.45 : dt;
  }

  /** @param {number} pw 0.05…0.95 */
  setPulseWidth(pw) {
    this.pulseWidth = pw < 0.05 ? 0.05 : pw > 0.95 ? 0.95 : pw;
  }

  /** @param {number} phase 0…1 */
  reset(phase = 0) {
    this.phase = phase - Math.floor(phase);
    // Start the integrated triangle so that it has no DC offset.
    this.tri = this.phase < 0.5 ? -1 + 4 * this.phase : 3 - 4 * this.phase;
  }

  /** @returns {number} next sample in [-1, 1] (approximately) */
  next() {
    const t = this.phase;
    const dt = this.dt;
    let y;
    switch (this.wave) {
      case 0:
        y = Math.sin(TWO_PI * t);
        break;
      case 1:
        y = 2 * t - 1 - polyBlep(t, dt);
        break;
      default: {
        const pw = this.pulseWidth;
        let t2 = t - pw;
        if (t2 < 0) t2 += 1;
        y = (t < pw ? 1 : -1) + polyBlep(t, dt) - polyBlep(t2, dt);
        if (this.wave === 3) {
          // Leaky integration of the band-limited square → triangle.
          this.tri = 0.9995 * this.tri + 4 * dt * y;
          y = this.tri;
        }
      }
    }
    let p = t + dt;
    if (p >= 1) p -= 1;
    this.phase = p;
    return y;
  }
}
