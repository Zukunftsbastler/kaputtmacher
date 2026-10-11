// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Iterative radix-2 complex FFT (decimation in time) with precomputed
 * twiddle factors and bit-reversal table. Used for wavetable synthesis and
 * spectral analysis. Not used in real-time audio paths.
 */

export class Fft {
  /** @param {number} size power of two >= 2 */
  constructor(size) {
    if (!Number.isInteger(size) || size < 2 || (size & (size - 1)) !== 0) throw new RangeError('Fft: size must be a power of two');
    this.size = size;
    this.cos = new Float64Array(size / 2);
    this.sin = new Float64Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      this.cos[i] = Math.cos((2 * Math.PI * i) / size);
      this.sin[i] = Math.sin((2 * Math.PI * i) / size);
    }
    this.rev = new Uint32Array(size);
    const bits = Math.log2(size);
    for (let i = 0; i < size; i++) {
      let r = 0;
      for (let b = 0; b < bits; b++) r |= ((i >> b) & 1) << (bits - 1 - b);
      this.rev[i] = r;
    }
  }

  /**
   * @param {Float64Array} re
   * @param {Float64Array} im
   * @param {boolean} inverse
   */
  #transform(re, im, inverse) {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      const j = this.rev[i];
      if (j > i) {
        let t = re[i];
        re[i] = re[j];
        re[j] = t;
        t = im[i];
        im[i] = im[j];
        im[j] = t;
      }
    }
    const sign = inverse ? 1 : -1;
    for (let len = 2; len <= n; len <<= 1) {
      const half = len >> 1;
      const step = n / len;
      for (let start = 0; start < n; start += len) {
        for (let k = 0; k < half; k++) {
          const wr = this.cos[k * step];
          const wi = sign * this.sin[k * step];
          const a = start + k;
          const b = a + half;
          const xr = re[b] * wr - im[b] * wi;
          const xi = re[b] * wi + im[b] * wr;
          re[b] = re[a] - xr;
          im[b] = im[a] - xi;
          re[a] += xr;
          im[a] += xi;
        }
      }
    }
  }

  /** In-place forward transform. @param {Float64Array} re @param {Float64Array} im */
  forward(re, im) {
    this.#transform(re, im, false);
  }

  /** In-place inverse transform, scaled by 1/n. @param {Float64Array} re @param {Float64Array} im */
  inverse(re, im) {
    this.#transform(re, im, true);
    const s = 1 / this.size;
    for (let i = 0; i < this.size; i++) {
      re[i] *= s;
      im[i] *= s;
    }
  }
}
