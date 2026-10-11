// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Filters.
 *  - Biquad: transposed direct form II with the well-known RBJ design
 *    formulas (Ref: R. Bristow-Johnson, "Audio EQ Cookbook").
 *  - Svf: topology-preserving-transform state-variable filter; stable
 *    under fast modulation (Ref: V. Zavalishin, "The Art of VA Filter
 *    Design", ch. 4).
 *  - Ladder: 4-pole zero-delay-feedback cascade of TPT one-poles with a
 *    saturating input stage (same reference, ch. 5).
 *  - OnePole, DcBlocker: simple utility filters.
 */

import { flush, softClip } from './util.js';

/** @typedef {'lowpass' | 'highpass' | 'bandpass' | 'notch' | 'allpass' | 'peaking' | 'lowshelf' | 'highshelf'} BiquadType */

/** @typedef {{ b0: number, b1: number, b2: number, a1: number, a2: number }} BiquadCoefs */

/**
 * @param {BiquadType} type
 * @param {number} freq Hz
 * @param {number} q quality (shelves: 0.707 ≈ maximally flat)
 * @param {number} gainDb for peaking/shelves
 * @param {number} sampleRate
 * @returns {BiquadCoefs}
 */
export function designBiquad(type, freq, q, gainDb, sampleRate) {
  const f = Math.min(Math.max(freq, 1), sampleRate * 0.49);
  const w0 = (2 * Math.PI * f) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * Math.max(q, 1e-4));
  const A = 10 ** (gainDb / 40);
  let b0;
  let b1;
  let b2;
  let a0;
  let a1;
  let a2;
  switch (type) {
    case 'lowpass':
      b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'highpass':
      b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'bandpass':
      b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'notch':
      b0 = 1; b1 = -2 * cos; b2 = 1; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'allpass':
      b0 = 1 - alpha; b1 = -2 * cos; b2 = 1 + alpha; a0 = 1 + alpha; a1 = -2 * cos; a2 = 1 - alpha;
      break;
    case 'peaking':
      b0 = 1 + alpha * A; b1 = -2 * cos; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cos; a2 = 1 - alpha / A;
      break;
    case 'lowshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 - (A - 1) * cos + s);
      b1 = 2 * A * (A - 1 - (A + 1) * cos);
      b2 = A * (A + 1 - (A - 1) * cos - s);
      a0 = A + 1 + (A - 1) * cos + s;
      a1 = -2 * (A - 1 + (A + 1) * cos);
      a2 = A + 1 + (A - 1) * cos - s;
      break;
    }
    case 'highshelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      b0 = A * (A + 1 + (A - 1) * cos + s);
      b1 = -2 * A * (A - 1 + (A + 1) * cos);
      b2 = A * (A + 1 + (A - 1) * cos - s);
      a0 = A + 1 - (A - 1) * cos + s;
      a1 = 2 * (A - 1 - (A + 1) * cos);
      a2 = A + 1 - (A - 1) * cos - s;
      break;
    }
    default:
      throw new RangeError(`Unknown biquad type "${type}"`);
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/**
 * Magnitude response of biquad coefficients at a frequency (for tests/analysis).
 * @param {BiquadCoefs} c
 * @param {number} freq
 * @param {number} sampleRate
 */
export function biquadMagnitude(c, freq, sampleRate) {
  const w = (2 * Math.PI * freq) / sampleRate;
  const cr1 = Math.cos(w);
  const ci1 = -Math.sin(w);
  const cr2 = Math.cos(2 * w);
  const ci2 = -Math.sin(2 * w);
  const nr = c.b0 + c.b1 * cr1 + c.b2 * cr2;
  const ni = c.b1 * ci1 + c.b2 * ci2;
  const dr = 1 + c.a1 * cr1 + c.a2 * cr2;
  const di = c.a1 * ci1 + c.a2 * ci2;
  return Math.sqrt((nr * nr + ni * ni) / (dr * dr + di * di));
}

export class Biquad {
  /** @param {BiquadCoefs} [coefs] defaults to a pass-through */
  constructor(coefs = { b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 }) {
    this.b0 = coefs.b0;
    this.b1 = coefs.b1;
    this.b2 = coefs.b2;
    this.a1 = coefs.a1;
    this.a2 = coefs.a2;
    this.z1 = 0;
    this.z2 = 0;
  }

  /** @param {BiquadCoefs} c */
  setCoefs(c) {
    this.b0 = c.b0;
    this.b1 = c.b1;
    this.b2 = c.b2;
    this.a1 = c.a1;
    this.a2 = c.a2;
  }

  /**
   * @param {BiquadType} type
   * @param {number} freq
   * @param {number} q
   * @param {number} gainDb
   * @param {number} sampleRate
   */
  design(type, freq, q, gainDb, sampleRate) {
    this.setCoefs(designBiquad(type, freq, q, gainDb, sampleRate));
  }

  reset() {
    this.z1 = 0;
    this.z2 = 0;
  }

  /** @param {number} x */
  process(x) {
    const y = this.b0 * x + this.z1;
    this.z1 = flush(this.b1 * x - this.a1 * y + this.z2);
    this.z2 = flush(this.b2 * x - this.a2 * y);
    return y;
  }
}

const SVF_MODES = Object.freeze({ lowpass: 0, bandpass: 1, highpass: 2, notch: 3, peak: 4 });

/** @typedef {keyof typeof SVF_MODES} SvfMode */

export class Svf {
  /** @param {number} sampleRate */
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.s1 = 0;
    this.s2 = 0;
    this.g = 0;
    this.k = 2;
    this.h = 1;
    this.mode = 0;
    this.set(1000, 0.707);
  }

  /** @param {SvfMode} mode */
  setMode(mode) {
    const m = SVF_MODES[mode];
    if (m === undefined) throw new RangeError(`Unknown SVF mode "${mode}"`);
    this.mode = m;
  }

  /**
   * @param {number} cutoff Hz
   * @param {number} q 0.5 … 30
   */
  set(cutoff, q) {
    const fc = Math.min(Math.max(cutoff, 10), this.sampleRate * 0.49);
    this.g = Math.tan((Math.PI * fc) / this.sampleRate);
    this.k = 1 / Math.max(q, 0.05);
    this.h = 1 / (1 + this.g * (this.g + this.k));
  }

  reset() {
    this.s1 = 0;
    this.s2 = 0;
  }

  /** @param {number} x */
  process(x) {
    const g = this.g;
    const hp = (x - (this.k + g) * this.s1 - this.s2) * this.h;
    const v1 = g * hp;
    const bp = v1 + this.s1;
    this.s1 = flush(bp + v1);
    const v2 = g * bp;
    const lp = v2 + this.s2;
    this.s2 = flush(lp + v2);
    switch (this.mode) {
      case 0:
        return lp;
      case 1:
        return bp;
      case 2:
        return hp;
      case 3:
        return lp + hp;
      default:
        return lp - hp;
    }
  }
}

export class Ladder {
  /** @param {number} sampleRate */
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.s1 = 0;
    this.s2 = 0;
    this.s3 = 0;
    this.s4 = 0;
    this.G = 0;
    this.beta = 1;
    this.k = 0;
    this.drive = 1;
    this.set(1000, 0);
  }

  /**
   * @param {number} cutoff Hz
   * @param {number} resonance 0…1 (≈1 = self-oscillation)
   */
  set(cutoff, resonance) {
    const fc = Math.min(Math.max(cutoff, 10), this.sampleRate * 0.45);
    const g = Math.tan((Math.PI * fc) / this.sampleRate);
    this.G = g / (1 + g);
    this.beta = 1 / (1 + g);
    this.k = 4 * Math.min(Math.max(resonance, 0), 1.02);
  }

  /** @param {number} drive input gain into the saturating stage (1 = clean-ish) */
  setDrive(drive) {
    this.drive = drive;
  }

  reset() {
    this.s1 = this.s2 = this.s3 = this.s4 = 0;
  }

  /** @param {number} x */
  process(x) {
    const G = this.G;
    const b = this.beta;
    // Zero-delay-feedback solution for the stage-4 output.
    const sigma = G * G * G * b * this.s1 + G * G * b * this.s2 + G * b * this.s3 + b * this.s4;
    const G4 = G * G * G * G;
    // Passband gain compensation keeps the level steady when resonance rises.
    const input = x * (1 + 0.5 * this.k);
    const y4 = (G4 * input + sigma) / (1 + this.k * G4);
    const u = softClip((input - this.k * y4) * this.drive) / this.drive;
    let v = (u - this.s1) * G;
    const y1 = v + this.s1;
    this.s1 = flush(y1 + v);
    v = (y1 - this.s2) * G;
    const y2 = v + this.s2;
    this.s2 = flush(y2 + v);
    v = (y2 - this.s3) * G;
    const y3 = v + this.s3;
    this.s3 = flush(y3 + v);
    v = (y3 - this.s4) * G;
    const y = v + this.s4;
    this.s4 = flush(y + v);
    return y;
  }
}

/** TPT one-pole low-/high-pass. */
export class OnePole {
  /** @param {number} sampleRate */
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.s = 0;
    this.G = 0;
    this.set(1000);
  }

  /** @param {number} cutoff Hz */
  set(cutoff) {
    const fc = Math.min(Math.max(cutoff, 1), this.sampleRate * 0.49);
    const g = Math.tan((Math.PI * fc) / this.sampleRate);
    this.G = g / (1 + g);
  }

  reset() {
    this.s = 0;
  }

  /** @param {number} x @returns {number} low-pass output */
  lowpass(x) {
    const v = (x - this.s) * this.G;
    const y = v + this.s;
    this.s = flush(y + v);
    return y;
  }

  /** @param {number} x @returns {number} high-pass output */
  highpass(x) {
    return x - this.lowpass(x);
  }
}

/** First-order DC blocker (high-pass at ≈ 5–10 Hz). */
export class DcBlocker {
  /** @param {number} sampleRate */
  constructor(sampleRate) {
    this.r = Math.exp((-2 * Math.PI * 7) / sampleRate);
    this.x1 = 0;
    this.y1 = 0;
  }

  reset() {
    this.x1 = 0;
    this.y1 = 0;
  }

  /** @param {number} x */
  process(x) {
    const y = x - this.x1 + this.r * this.y1;
    this.x1 = x;
    this.y1 = flush(y);
    return y;
  }
}
