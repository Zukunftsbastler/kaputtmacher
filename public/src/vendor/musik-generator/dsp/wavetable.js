// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Mip-mapped wavetables built from harmonic spectra. Each level holds only the
 * harmonics that stay below Nyquist for its frequency range, so playback is
 * alias-free by construction. Tables are synthesized once with an inverse FFT.
 */

import { Fft } from './fft.js';

/** @type {Float64Array | null} */
let tri4Cache = null;

/**
 * Sine-series coefficients of a 4-bit stepped triangle (32 steps per cycle, as in
 * 8-bit console sound chips): the staircase adds the characteristic buzz, built
 * here band-limited from its Fourier series instead of as aliasing steps.
 */
function tri4Coefficients() {
  const n = 4096;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    // Odd-symmetric triangle through zero at t = 0, quantized to 16 levels (mid-rise).
    const t = i / n;
    const tri = t < 0.25 ? 4 * t : t < 0.75 ? 2 - 4 * t : 4 * t - 4;
    re[i] = (Math.floor(tri * 8) + 0.5) / 8;
  }
  new Fft(n).forward(re, im);
  const out = new Float64Array(n / 2);
  for (let k = 1; k < n / 2; k++) out[k - 1] = (-2 * im[k]) / n;
  return out;
}

/**
 * Harmonic amplitude spectra (index k = harmonic k+1).
 * @type {Readonly<Record<string, (k: number) => number>>}
 */
export const SPECTRA = Object.freeze({
  sine: (k) => (k === 0 ? 1 : 0),
  saw: (k) => 1 / (k + 1),
  square: (k) => ((k + 1) % 2 === 1 ? 1 / (k + 1) : 0),
  triangle: (k) => ((k + 1) % 2 === 1 ? (k % 4 === 0 ? 1 : -1) / ((k + 1) * (k + 1)) : 0),
  /** Saw with a gentle high-frequency roll-off: warmer pads. */
  warm: (k) => 1 / (k + 1) ** 1.45,
  /** Odd-dominant, slightly nasal: reeds, chip-like leads. */
  hollow: (k) => ((k + 1) % 2 === 1 ? 1 / (k + 1) : 0.25 / (k + 1) ** 1.5),
  /** Drawbar-organ-like: fundamental plus a few octave/fifth partials. */
  organ: (k) => ({ 0: 1, 1: 0.6, 2: 0.35, 3: 0.45, 5: 0.2, 7: 0.25, 11: 0.08, 15: 0.06 })[k] ?? 0,
  /** Soft, vowel-like: strong 2nd–4th harmonics, fast roll-off. */
  vocal: (k) => [0.8, 1, 0.7, 0.45, 0.2, 0.12, 0.06, 0.04][k] ?? 0,
  /** 4-bit stepped triangle (8-bit console bass). */
  tri4: (k) => (tri4Cache ??= tri4Coefficients())[k] ?? 0,
});

/** @typedef {{ size: number, minFreq: number, levels: Float32Array[], maxFreqs: number[] }} WavetableBank */

/**
 * @param {(k: number) => number} spectrum harmonic index → amplitude
 * @param {number} sampleRate
 * @param {{ size?: number, minFreq?: number }} [options]
 * @returns {WavetableBank}
 */
export function buildWavetableBank(spectrum, sampleRate, { size = 2048, minFreq = 20 } = {}) {
  const fft = new Fft(size);
  /** @type {Float32Array[]} */
  const levels = [];
  /** @type {number[]} */
  const maxFreqs = [];
  let norm = 0;
  for (let level = 0; ; level++) {
    const maxFreq = minFreq * 2 ** (level + 1);
    const harmonics = Math.min(size / 2 - 1, Math.floor(sampleRate / 2 / maxFreq));
    if (harmonics < 1) break;
    const re = new Float64Array(size);
    const im = new Float64Array(size);
    for (let k = 0; k < harmonics; k++) {
      const a = spectrum(k);
      // Sine phase: x(t) = Σ a·sin(2π(k+1)t)  ⇔  X[k+1] = -i·a·n/2, X[n-k-1] = +i·a·n/2
      im[k + 1] = (-a * size) / 2;
      im[size - k - 1] = (a * size) / 2;
    }
    fft.inverse(re, im);
    const table = new Float32Array(size + 1);
    let peak = 0;
    for (let i = 0; i < size; i++) {
      table[i] = re[i];
      peak = Math.max(peak, Math.abs(re[i]));
    }
    if (level === 0) norm = peak > 0 ? 1 / peak : 1;
    for (let i = 0; i < size; i++) table[i] *= norm;
    table[size] = table[0]; // guard sample for interpolation
    levels.push(table);
    maxFreqs.push(maxFreq);
  }
  return { size, minFreq, levels, maxFreqs };
}

export class WavetableOscillator {
  /**
   * @param {WavetableBank} bank
   * @param {number} sampleRate
   */
  constructor(bank, sampleRate) {
    this.bank = bank;
    this.sampleRate = sampleRate;
    this.phase = 0;
    this.dt = 0;
    this.table = bank.levels[0];
  }

  /** @param {number} hz */
  setFrequency(hz) {
    this.dt = Math.min(0.45, Math.max(0, hz / this.sampleRate));
    const { maxFreqs, levels } = this.bank;
    let level = 0;
    while (level < levels.length - 1 && hz > maxFreqs[level]) level++;
    this.table = levels[level];
  }

  /** @param {number} phase */
  reset(phase = 0) {
    this.phase = phase - Math.floor(phase);
  }

  next() {
    const pos = this.phase * this.bank.size;
    const i = pos | 0;
    const frac = pos - i;
    const t = this.table;
    const y = t[i] + (t[i + 1] - t[i]) * frac;
    let p = this.phase + this.dt;
    if (p >= 1) p -= 1;
    this.phase = p;
    return y;
  }

  /**
   * Alias-free pulse wave with variable width from a saw table:
   * pulse(φ) = saw(φ) − saw(φ + width), which has zero mean for every width.
   * @param {number} width 0.02…0.98
   */
  nextPulse(width) {
    const size = this.bank.size;
    const t = this.table;
    let p2 = this.phase + width;
    if (p2 >= 1) p2 -= 1;
    const pos1 = this.phase * size;
    const i1 = pos1 | 0;
    const pos2 = p2 * size;
    const i2 = pos2 | 0;
    const y = t[i1] + (t[i1 + 1] - t[i1]) * (pos1 - i1) - (t[i2] + (t[i2 + 1] - t[i2]) * (pos2 - i2));
    let p = this.phase + this.dt;
    if (p >= 1) p -= 1;
    this.phase = p;
    return 0.5 * y;
  }
}
