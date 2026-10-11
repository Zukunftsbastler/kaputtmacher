// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Time signatures over time and conversion between bars and beats.
 * Beats are always quarter notes; a bar of num/den lasts num · 4 / den beats
 * (4/4 → 4, 6/8 → 3, 7/8 → 3.5). Meter changes must fall on bar lines.
 */

/**
 * @typedef {object} MeterPoint
 * @property {number} beat position of the change (quarter notes)
 * @property {number} num numerator, integer >= 1
 * @property {number} den denominator, power of two (1…64)
 */

/**
 * @param {number} num
 * @param {number} den
 * @returns {number} bar length in quarter-note beats
 */
export function barLengthBeats(num, den) {
  return (num * 4) / den;
}

export class MeterMap {
  /** @type {readonly MeterPoint[]} */
  #points;
  /** @type {number[]} bar index at each point */
  #barAt;

  /**
   * @param {readonly MeterPoint[]} [points] defaults to 4/4 throughout
   */
  constructor(points = [{ beat: 0, num: 4, den: 4 }]) {
    if (points.length === 0 || points[0].beat !== 0) throw new RangeError('MeterMap: first point must be at beat 0');
    this.#points = points.map((p, i) => {
      if (!Number.isInteger(p.num) || p.num < 1) throw new RangeError(`MeterMap: invalid numerator at point ${i}`);
      if (![1, 2, 4, 8, 16, 32, 64].includes(p.den)) throw new RangeError(`MeterMap: invalid denominator at point ${i}`);
      return { beat: p.beat, num: p.num, den: p.den };
    });
    this.#barAt = [0];
    for (let i = 1; i < this.#points.length; i++) {
      const prev = this.#points[i - 1];
      const bars = (this.#points[i].beat - prev.beat) / barLengthBeats(prev.num, prev.den);
      if (!(bars > 0) || Math.abs(bars - Math.round(bars)) > 1e-9) {
        throw new RangeError(`MeterMap: change at beat ${this.#points[i].beat} is not on a bar line`);
      }
      this.#barAt.push(this.#barAt[i - 1] + Math.round(bars));
    }
  }

  /** @returns {readonly MeterPoint[]} */
  get points() {
    return this.#points;
  }

  /**
   * @param {number} beat
   * @returns {MeterPoint} meter in effect at `beat`
   */
  meterAt(beat) {
    let i = this.#points.length - 1;
    while (i > 0 && this.#points[i].beat > beat) i--;
    return this.#points[i];
  }

  /**
   * @param {number} bar zero-based bar index
   * @returns {number} beat at the start of that bar
   */
  barToBeat(bar) {
    let i = this.#barAt.length - 1;
    while (i > 0 && this.#barAt[i] > bar) i--;
    const p = this.#points[i];
    return p.beat + (bar - this.#barAt[i]) * barLengthBeats(p.num, p.den);
  }

  /**
   * @param {number} beat
   * @returns {{ bar: number, beatInBar: number }} zero-based bar and offset in beats
   */
  beatToBar(beat) {
    let i = this.#points.length - 1;
    while (i > 0 && this.#points[i].beat > beat) i--;
    const p = this.#points[i];
    const len = barLengthBeats(p.num, p.den);
    const rel = beat - p.beat;
    const barsIn = Math.floor(rel / len + 1e-9);
    return { bar: this.#barAt[i] + barsIn, beatInBar: rel - barsIn * len };
  }
}
