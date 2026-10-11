// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Windowed-sinc FIR designs for oversampling.
 *  - Oversampler2x: half-band up/down-sampling around a nonlinearity, so
 *    saturation harmonics above Nyquist do not fold back.
 *  - TruePeakDetector: 4× polyphase interpolation to estimate inter-sample
 *    peaks (as recommended by ITU-R BS.1770 for true-peak metering).
 */

/**
 * @param {number} x
 */
const sinc = (x) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

/**
 * Blackman-windowed sinc low-pass taps.
 * @param {number} taps odd length
 * @param {number} cutoff normalized to the (upsampled) Nyquist, 0…1
 */
function windowedSinc(taps, cutoff) {
  const h = new Float64Array(taps);
  const c = (taps - 1) / 2;
  let sum = 0;
  for (let n = 0; n < taps; n++) {
    const w = 0.42 - 0.5 * Math.cos((2 * Math.PI * n) / (taps - 1)) + 0.08 * Math.cos((4 * Math.PI * n) / (taps - 1));
    h[n] = cutoff * sinc(cutoff * (n - c)) * w;
    sum += h[n];
  }
  for (let n = 0; n < taps; n++) h[n] /= sum;
  return h;
}

export class Oversampler2x {
  /** @param {number} [taps] odd FIR length (default 31) */
  constructor(taps = 31) {
    this.h = windowedSinc(taps, 0.5);
    this.taps = taps;
    this.even = this.h.filter((_, i) => i % 2 === 0);
    this.odd = this.h.filter((_, i) => i % 2 === 1);
    this.upHist = new Float64Array(this.even.length);
    this.downHist = new Float64Array(taps);
    this.upPos = 0;
    this.downPos = 0;
    /** latency in base-rate samples */
    this.latency = (taps - 1) / 2;
  }

  /**
   * Processes one sample through fn at twice the sample rate.
   * @param {number} x
   * @param {(v: number) => number} fn nonlinearity
   * @returns {number}
   */
  process(x, fn) {
    const n = this.upHist.length;
    this.upPos = (this.upPos + 1) % n;
    this.upHist[this.upPos] = x;
    // Polyphase interpolation (gain 2 compensates for zero stuffing).
    let y0 = 0;
    let y1 = 0;
    for (let j = 0; j < n; j++) {
      const v = this.upHist[(this.upPos - j + n) % n];
      y0 += this.even[j] * v;
      if (j < this.odd.length) y1 += this.odd[j] * v;
    }
    const z0 = fn(2 * y0);
    const z1 = fn(2 * y1);
    // Decimation filter: push both oversampled values, output one.
    const m = this.taps;
    this.downPos = (this.downPos + 1) % m;
    this.downHist[this.downPos] = z0;
    this.downPos = (this.downPos + 1) % m;
    this.downHist[this.downPos] = z1;
    let out = 0;
    for (let j = 0; j < m; j++) out += this.h[j] * this.downHist[(this.downPos - j + m) % m];
    return out;
  }
}

export class TruePeakDetector {
  constructor() {
    const factor = 4;
    const taps = 48;
    // Design at 4× with cutoff at the original Nyquist; split into 4 phases.
    const proto = windowedSinc(taps + 1, 1 / factor);
    /** @type {Float64Array[]} */
    this.phases = [];
    for (let p = 0; p < factor; p++) {
      const ph = new Float64Array(taps / factor);
      for (let j = 0; j < ph.length; j++) ph[j] = proto[p + j * factor] * factor;
      this.phases.push(ph);
    }
    this.hist = new Float64Array(taps / factor);
    this.pos = 0;
    /** latency in samples (centre of the interpolator) */
    this.latency = taps / factor / 2;
  }

  reset() {
    this.hist.fill(0);
  }

  /**
   * @param {number} x
   * @returns {number} max |value| of the 4 interpolated sub-samples
   */
  process(x) {
    const n = this.hist.length;
    this.pos = (this.pos + 1) % n;
    this.hist[this.pos] = x;
    let peak = 0;
    for (let p = 0; p < this.phases.length; p++) {
      const h = this.phases[p];
      let y = 0;
      for (let j = 0; j < n; j++) y += h[j] * this.hist[(this.pos - j + n) % n];
      const a = y < 0 ? -y : y;
      if (a > peak) peak = a;
    }
    return peak;
  }
}
