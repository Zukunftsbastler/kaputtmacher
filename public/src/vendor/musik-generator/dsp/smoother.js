// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * One-pole parameter smoother: parameter changes never jump (no zipper noise
 * or clicks). Settles exactly on the target once it is close enough.
 */

import { onePoleCoef } from './util.js';

export class Smoother {
  /**
   * @param {number} value initial value
   * @param {number} timeSec time constant
   * @param {number} sampleRate
   */
  constructor(value, timeSec, sampleRate) {
    this.value = value;
    this.target = value;
    this.sampleRate = sampleRate;
    this.coef = onePoleCoef(timeSec, sampleRate);
  }

  /** @param {number} timeSec */
  setTime(timeSec) {
    this.coef = onePoleCoef(timeSec, this.sampleRate);
  }

  /** @param {number} target */
  set(target) {
    this.target = target;
  }

  /** Jumps immediately (use only while silent). @param {number} value */
  jump(value) {
    this.value = value;
    this.target = value;
  }

  /** @returns {number} next smoothed value */
  next() {
    const d = this.target - this.value;
    if (d === 0) return this.value;
    if (d < 1e-7 && d > -1e-7) this.value = this.target;
    else this.value = this.target - d * this.coef;
    return this.value;
  }

  /**
   * Advances by n samples at once (for control-rate parameters).
   * @param {number} n
   * @returns {number}
   */
  advance(n) {
    const d = this.target - this.value;
    if (d === 0) return this.value;
    this.value = this.target - d * this.coef ** n;
    if (Math.abs(this.target - this.value) < 1e-7) this.value = this.target;
    return this.value;
  }
}
