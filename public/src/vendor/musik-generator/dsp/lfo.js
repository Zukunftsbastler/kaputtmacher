// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Low-frequency oscillator with optional delayed onset and fade-in
 * (e.g. vibrato that sets in after the attack, as players do).
 */

import { TWO_PI } from './util.js';

const SHAPES = Object.freeze({ sine: 0, triangle: 1, square: 2, saw: 3, random: 4 });

/** @typedef {keyof typeof SHAPES} LfoShape */

export class Lfo {
  /**
   * @param {number} sampleRate
   * @param {{ shape?: LfoShape, rate?: number, delay?: number, fade?: number, phase?: number }} [options]
   * @param {import('../core/prng.js').Rng} [rng] required for the "random" shape
   */
  constructor(sampleRate, { shape = 'sine', rate = 5, delay = 0, fade = 0, phase = 0 } = {}, rng) {
    this.sampleRate = sampleRate;
    this.shape = SHAPES[shape];
    this.dt = rate / sampleRate;
    this.startPhase = phase;
    this.phase = phase;
    this.delaySamples = Math.round(delay * sampleRate);
    this.fadeSamples = Math.max(1, Math.round(fade * sampleRate));
    this.age = 0;
    this.rng = rng;
    this.held = 0;
  }

  /** @param {number} hz */
  setRate(hz) {
    this.dt = hz / this.sampleRate;
  }

  /** Restarts phase and onset delay (call on note-on). */
  reset() {
    this.phase = this.startPhase;
    this.age = 0;
  }

  /** @returns {number} next value in [-1, 1], scaled by the onset fade */
  next() {
    let y;
    const p = this.phase;
    switch (this.shape) {
      case 0:
        y = Math.sin(TWO_PI * p);
        break;
      case 1:
        y = p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
        break;
      case 2:
        y = p < 0.5 ? 1 : -1;
        break;
      case 3:
        y = 2 * p - 1;
        break;
      default:
        y = this.held;
    }
    let np = p + this.dt;
    if (np >= 1) {
      np -= 1;
      if (this.shape === 4 && this.rng) this.held = this.rng.float() * 2 - 1;
    }
    this.phase = np;
    const age = this.age++;
    if (age < this.delaySamples) return 0;
    const f = age - this.delaySamples;
    return f >= this.fadeSamples ? y : (y * f) / this.fadeSamples;
  }

  /**
   * Advances n samples in O(1) and returns the value there (control rate).
   * @param {number} n
   */
  advance(n) {
    let p = this.phase + this.dt * (n - 1);
    if (p >= 1) {
      p -= Math.floor(p);
      if (this.shape === 4 && this.rng) this.held = this.rng.float() * 2 - 1;
    }
    this.phase = p;
    this.age += n - 1;
    return this.next();
  }
}
