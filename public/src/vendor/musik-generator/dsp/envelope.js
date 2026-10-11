// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Envelopes with exponential ("analog") segments.
 * The attack approaches an overshoot target (1 + overshoot) so it is
 * convex like an RC charge curve; decay and release fall by 60 dB in their
 * nominal time. Retriggering starts from the current level (no clicks).
 */

import { t60Coef } from './util.js';

export const STAGE = Object.freeze({ idle: 0, attack: 1, decay: 2, sustain: 3, release: 4 });

/**
 * @typedef {object} AdsrParams
 * @property {number} a attack seconds
 * @property {number} d decay seconds (to −60 dB above sustain)
 * @property {number} s sustain level 0…1
 * @property {number} r release seconds (to −60 dB)
 * @property {number} [curve] attack overshoot (0.05 = very convex … 3 = nearly linear), default 0.3
 */

const IDLE_LEVEL = 1e-5;

export class Adsr {
  /**
   * @param {number} sampleRate
   * @param {AdsrParams} params
   */
  constructor(sampleRate, params) {
    this.sampleRate = sampleRate;
    this.stage = STAGE.idle;
    this.value = 0;
    this.attackCoef = 0;
    this.attackTarget = 1.3;
    this.decayCoef = 0;
    this.releaseCoef = 0;
    this.sustain = 0;
    this.set(params);
  }

  /** @param {AdsrParams} p */
  set(p) {
    const sr = this.sampleRate;
    const overshoot = p.curve ?? 0.3;
    this.attackTarget = 1 + overshoot;
    // Time constant so that the curve reaches 1.0 after `a` seconds.
    const tau = p.a / Math.log(this.attackTarget / overshoot);
    this.attackCoef = p.a <= 0 ? 0 : Math.exp(-1 / (tau * sr));
    this.decayCoef = t60Coef(p.d, sr);
    this.releaseCoef = t60Coef(p.r, sr);
    this.sustain = Math.min(1, Math.max(0, p.s));
  }

  /** Starts (or restarts) the attack from the current level. */
  gate() {
    this.stage = STAGE.attack;
  }

  release() {
    if (this.stage !== STAGE.idle) this.stage = STAGE.release;
  }

  /**
   * Overrides the release time once (e.g. fast release for voice stealing).
   * @param {number} seconds
   */
  forceRelease(seconds) {
    this.releaseCoef = t60Coef(seconds, this.sampleRate);
    this.release();
  }

  reset() {
    this.stage = STAGE.idle;
    this.value = 0;
  }

  get active() {
    return this.stage !== STAGE.idle;
  }

  next() {
    switch (this.stage) {
      case 1: {
        const v = this.attackTarget - (this.attackTarget - this.value) * this.attackCoef;
        if (v >= 1) {
          this.value = 1;
          this.stage = this.sustain >= 1 ? STAGE.sustain : STAGE.decay;
        } else this.value = v;
        break;
      }
      case 2: {
        const s = this.sustain;
        this.value = s + (this.value - s) * this.decayCoef;
        if (this.value - s < 1e-5) {
          this.value = s;
          this.stage = STAGE.sustain;
        }
        if (s === 0 && this.value < IDLE_LEVEL) this.reset();
        break;
      }
      case 3:
        if (this.sustain === 0) this.reset();
        break;
      case 4:
        this.value *= this.releaseCoef;
        if (this.value < IDLE_LEVEL) this.reset();
        break;
      default:
        break;
    }
    return this.value;
  }
}

/**
 * Exponential decay envelope for percussion: jumps to `level` (after a short
 * linear attack against clicks) and decays by 60 dB in `decaySec`.
 */
export class DecayEnvelope {
  /** @param {number} sampleRate */
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.value = 0;
    this.coef = 0;
    this.attackSamples = 0;
    this.attackStep = 0;
    this.peak = 0;
  }

  /**
   * @param {number} level peak level
   * @param {number} decaySec time to −60 dB
   * @param {number} [attackSec] linear attack (default 0.5 ms)
   */
  trigger(level, decaySec, attackSec = 0.0005) {
    this.peak = level;
    this.coef = t60Coef(decaySec, this.sampleRate);
    this.attackSamples = Math.max(1, Math.round(attackSec * this.sampleRate));
    this.attackStep = (level - this.value) / this.attackSamples;
  }

  /** @param {number} decaySec */
  setDecay(decaySec) {
    this.coef = t60Coef(decaySec, this.sampleRate);
  }

  get active() {
    return this.attackSamples > 0 || this.value > 1e-5;
  }

  next() {
    if (this.attackSamples > 0) {
      this.value += this.attackStep;
      this.attackSamples--;
    } else {
      this.value *= this.coef;
      if (this.value < 1e-6) this.value = 0;
    }
    return this.value;
  }
}
