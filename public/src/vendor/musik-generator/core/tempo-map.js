// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Conversion between musical time (beats = quarter notes) and seconds,
 * with step changes and linear tempo ramps.
 *
 * A point `{ beat, bpm, ramp: 'linear' }` means: the tempo moves linearly
 * (per beat) from the previous point's bpm to this bpm between the two points.
 * `ramp: 'step'` (default) means: the new tempo starts exactly at `beat`.
 * After the last point the tempo stays constant.
 *
 * For a linear ramp bpm(b) = b0 + k·(b − beat0) with k = (b1 − b0) / L,
 * the elapsed time is ∫ 60 / bpm(b) db = (60 / k) · ln(bpm(b) / b0),
 * which is inverted in closed form.
 */

/**
 * @typedef {object} TempoPoint
 * @property {number} beat position in quarter notes, >= 0
 * @property {number} bpm quarter notes per minute, > 0
 * @property {'step' | 'linear'} [ramp] how the tempo reaches this point
 */

/** Relative bpm difference below which a ramp is treated as constant. */
const FLAT_EPSILON = 1e-9;

export class TempoMap {
  /** @type {readonly Required<TempoPoint>[]} */
  #points;
  /** @type {Float64Array} seconds at each point */
  #secondsAt;

  /**
   * @param {readonly TempoPoint[]} points sorted by beat, first at beat 0
   */
  constructor(points) {
    if (points.length === 0) throw new RangeError('TempoMap: at least one point required');
    if (points[0].beat !== 0) throw new RangeError('TempoMap: first point must be at beat 0');
    this.#points = points.map((p, i) => {
      if (!(p.bpm > 0) || !Number.isFinite(p.bpm)) throw new RangeError(`TempoMap: invalid bpm at point ${i}`);
      if (i > 0 && !(p.beat > points[i - 1].beat)) {
        throw new RangeError(`TempoMap: beats must be strictly increasing (point ${i})`);
      }
      return { beat: p.beat, bpm: p.bpm, ramp: p.ramp ?? 'step' };
    });
    this.#secondsAt = new Float64Array(this.#points.length);
    for (let i = 1; i < this.#points.length; i++) {
      this.#secondsAt[i] = this.#secondsAt[i - 1] + this.#segmentSeconds(i, this.#points[i].beat);
    }
  }

  /** @returns {readonly Required<TempoPoint>[]} */
  get points() {
    return this.#points;
  }

  /**
   * Index of the segment containing `beat`: segment i spans [points[i-1], points[i]).
   * Returns points.length for beats after the last point.
   * @param {number} beat
   */
  #segmentIndex(beat) {
    const pts = this.#points;
    let lo = 1;
    let hi = pts.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pts[mid].beat <= beat) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /**
   * Seconds elapsed from points[i-1] to `beat` inside segment i.
   * @param {number} i segment index (1..length-1)
   * @param {number} beat
   */
  #segmentSeconds(i, beat) {
    const a = this.#points[i - 1];
    const b = this.#points[i];
    const dBeat = beat - a.beat;
    if (b.ramp !== 'linear' || Math.abs(b.bpm - a.bpm) <= FLAT_EPSILON * a.bpm) return (60 * dBeat) / a.bpm;
    const k = (b.bpm - a.bpm) / (b.beat - a.beat);
    return (60 / k) * Math.log((a.bpm + k * dBeat) / a.bpm);
  }

  /**
   * @param {number} beat
   * @returns {number} tempo at `beat` in bpm
   */
  bpmAt(beat) {
    const i = this.#segmentIndex(beat);
    const pts = this.#points;
    if (i >= pts.length) return pts[pts.length - 1].bpm;
    const a = pts[i - 1];
    const b = pts[i];
    if (b.ramp !== 'linear') return a.bpm;
    return a.bpm + ((b.bpm - a.bpm) * (beat - a.beat)) / (b.beat - a.beat);
  }

  /**
   * @param {number} beat >= 0
   * @returns {number} seconds from the start
   */
  beatToSeconds(beat) {
    if (beat <= 0) return (60 * beat) / this.#points[0].bpm;
    const pts = this.#points;
    const i = this.#segmentIndex(beat);
    if (i >= pts.length) {
      const last = pts[pts.length - 1];
      return this.#secondsAt[pts.length - 1] + (60 * (beat - last.beat)) / last.bpm;
    }
    return this.#secondsAt[i - 1] + this.#segmentSeconds(i, beat);
  }

  /**
   * @param {number} seconds >= 0
   * @returns {number} beat position
   */
  secondsToBeat(seconds) {
    const pts = this.#points;
    if (seconds <= 0) return (seconds * pts[0].bpm) / 60;
    // Find the last point whose time is <= seconds.
    let lo = 0;
    let hi = pts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.#secondsAt[mid] <= seconds) lo = mid;
      else hi = mid - 1;
    }
    const a = pts[lo];
    const dt = seconds - this.#secondsAt[lo];
    const b = pts[lo + 1];
    if (!b || b.ramp !== 'linear' || Math.abs(b.bpm - a.bpm) <= FLAT_EPSILON * a.bpm) {
      return a.beat + (dt * a.bpm) / 60;
    }
    const k = (b.bpm - a.bpm) / (b.beat - a.beat);
    const bpm = a.bpm * Math.exp((dt * k) / 60);
    return a.beat + (bpm - a.bpm) / k;
  }
}
