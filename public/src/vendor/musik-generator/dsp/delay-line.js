// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/** Circular delay buffer with integer, linear and cubic (Hermite) reads. */

export class DelayLine {
  /** @param {number} maxDelaySamples */
  constructor(maxDelaySamples) {
    let size = 4;
    while (size < maxDelaySamples + 4) size <<= 1;
    this.buffer = new Float32Array(size);
    this.mask = size - 1;
    this.pos = 0;
  }

  get maxDelay() {
    return this.mask - 3;
  }

  clear() {
    this.buffer.fill(0);
  }

  /** @param {number} x */
  write(x) {
    this.pos = (this.pos + 1) & this.mask;
    this.buffer[this.pos] = x;
  }

  /**
   * Sample written `delay` writes ago (0 = most recent).
   * @param {number} delay integer
   */
  tap(delay) {
    return this.buffer[(this.pos - delay) & this.mask];
  }

  /** @param {number} delay fractional, >= 0 */
  readLinear(delay) {
    const i = Math.floor(delay);
    const f = delay - i;
    const a = this.buffer[(this.pos - i) & this.mask];
    const b = this.buffer[(this.pos - i - 1) & this.mask];
    return a + (b - a) * f;
  }

  /**
   * Cubic Hermite interpolation: smoother for modulated delays (chorus, reverb).
   * @param {number} delay fractional, >= 1
   */
  readCubic(delay) {
    const i = Math.floor(delay);
    const f = delay - i;
    const m = this.mask;
    const b = this.buffer;
    const xm1 = b[(this.pos - i + 1) & m];
    const x0 = b[(this.pos - i) & m];
    const x1 = b[(this.pos - i - 1) & m];
    const x2 = b[(this.pos - i - 2) & m];
    const c1 = 0.5 * (x1 - xm1);
    const c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2;
    const c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
    return ((c3 * f + c2) * f + c1) * f + x0;
  }
}
