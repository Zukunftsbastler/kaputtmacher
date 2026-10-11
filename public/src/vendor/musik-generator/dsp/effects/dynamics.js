// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Dynamics: parametric EQ, compressor (with external sidechain for
 * "pumping"), saturator and a look-ahead true-peak limiter.
 */

import { Biquad, designBiquad } from '../filters.js';
import { TruePeakDetector, Oversampler2x } from '../resampling.js';
import { dbToGain, onePoleCoef, softClip } from '../util.js';

/** @typedef {{ type: import('../filters.js').BiquadType, freq: number, q?: number, gainDb?: number }} EqBand */

export class ParametricEq {
  /**
   * @param {number} sampleRate
   * @param {EqBand[]} bands
   */
  constructor(sampleRate, bands = []) {
    this.sampleRate = sampleRate;
    /** @type {{ l: Biquad, r: Biquad }[]} */
    this.filters = [];
    this.setBands(bands);
  }

  /** @param {EqBand[]} bands */
  setBands(bands) {
    this.filters = bands.map((b) => {
      const c = designBiquad(b.type, b.freq, b.q ?? 0.707, b.gainDb ?? 0, this.sampleRate);
      return { l: new Biquad(c), r: new Biquad(c) };
    });
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  process(L, R, start, end) {
    for (const f of this.filters) {
      for (let i = start; i < end; i++) {
        L[i] = f.l.process(L[i]);
        R[i] = f.r.process(R[i]);
      }
    }
  }
}

/**
 * @typedef {object} CompressorParams
 * @property {number} [thresholdDb] default −18
 * @property {number} [ratio] default 3
 * @property {number} [kneeDb] soft knee width (default 6)
 * @property {number} [attackMs] default 10
 * @property {number} [releaseMs] default 150
 * @property {number} [makeupDb] default 0
 * @property {number} [mix] parallel compression 0…1 (default 1)
 * @property {number} [detectorHighpassHz] high-pass on the level detector (0 = off), so that
 *   bass energy does not pump the whole signal (sidechain filter)
 */

export class Compressor {
  /**
   * @param {number} sampleRate
   * @param {CompressorParams} [params]
   */
  constructor(sampleRate, params = {}) {
    this.sampleRate = sampleRate;
    this.envDb = -120;
    this.gainDb = 0;
    this.p = { thresholdDb: -18, ratio: 3, kneeDb: 6, attackMs: 10, releaseMs: 150, makeupDb: 0, mix: 1, detectorHighpassHz: 0 };
    this.hpL = 0;
    this.hpR = 0;
    this.hpXL = 0;
    this.hpXR = 0;
    this.set(params);
    /** most recent gain reduction in dB (for metering, ≤ 0) */
    this.reductionDb = 0;
    /**
     * Optional gain trace: when set, process() writes the linear gain applied at sample i
     * to trace[i] (linked mastering of stem layers).
     * @type {Float32Array | null}
     */
    this.trace = null;
  }

  /** @param {CompressorParams} params */
  set(params) {
    Object.assign(this.p, params);
    this.attack = onePoleCoef(this.p.attackMs / 1000, this.sampleRate);
    this.release = onePoleCoef(this.p.releaseMs / 1000, this.sampleRate);
    this.makeup = dbToGain(this.p.makeupDb);
    // One-pole high-pass coefficient for the detector (y = a·(y + x − x₋₁)).
    this.hpA = this.p.detectorHighpassHz > 0 ? 1 / (1 + (2 * Math.PI * this.p.detectorHighpassHz) / this.sampleRate) : 0;
  }

  /**
   * Static curve: gain change in dB for an input level in dB.
   * @param {number} levelDb
   */
  gainFor(levelDb) {
    const { thresholdDb: t, ratio: r, kneeDb: w } = this.p;
    const over = levelDb - t;
    if (2 * over <= -w) return 0;
    if (w > 0 && 2 * Math.abs(over) < w) {
      const x = over + w / 2;
      return ((1 / r - 1) * x * x) / (2 * w);
    }
    return over * (1 / r - 1);
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   * @param {Float32Array} [keyL] optional sidechain signal (e.g. the kick)
   * @param {Float32Array} [keyR]
   */
  process(L, R, start, end, keyL, keyR) {
    const kl = keyL ?? L;
    const kr = keyR ?? keyL ?? R;
    const { mix } = this.p;
    const hpA = this.hpA;
    for (let i = start; i < end; i++) {
      let xl = kl[i];
      let xr = kr[i];
      if (hpA > 0) {
        this.hpL = hpA * (this.hpL + xl - this.hpXL);
        this.hpR = hpA * (this.hpR + xr - this.hpXR);
        this.hpXL = xl;
        this.hpXR = xr;
        xl = this.hpL;
        xr = this.hpR;
      }
      const a = Math.max(Math.abs(xl), Math.abs(xr));
      const levelDb = a > 1e-6 ? 20 * Math.log10(a) : -120;
      // Peak-ish level detector with separate attack/release.
      this.envDb = levelDb > this.envDb ? levelDb + (this.envDb - levelDb) * this.attack : levelDb + (this.envDb - levelDb) * this.release;
      const target = this.gainFor(this.envDb);
      this.gainDb = target;
      const g = 10 ** (this.gainDb / 20) * this.makeup;
      const wet = mix * g + (1 - mix);
      if (this.trace) this.trace[i] = wet;
      L[i] *= wet;
      R[i] *= wet;
    }
    this.reductionDb = this.gainDb;
  }
}

export class Saturator {
  /**
   * @param {number} sampleRate
   * @param {{ drive?: number, mix?: number, oversample?: boolean }} [params]
   *   drive: input gain into the soft clipper (1 = subtle, 4 = obvious)
   */
  constructor(sampleRate, { drive = 1.5, mix = 1, oversample = true } = {}) {
    this.sampleRate = sampleRate;
    this.drive = drive;
    this.mix = mix;
    this.oversample = oversample;
    this.osL = new Oversampler2x();
    this.osR = new Oversampler2x();
    const d = drive;
    this.shape = (/** @type {number} */ x) => softClip(x * d) / softClip(d);
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  process(L, R, start, end) {
    const m = this.mix;
    const f = this.shape;
    for (let i = start; i < end; i++) {
      const yl = this.oversample ? this.osL.process(L[i], f) : f(L[i]);
      const yr = this.oversample ? this.osR.process(R[i], f) : f(R[i]);
      L[i] = L[i] * (1 - m) + yl * m;
      R[i] = R[i] * (1 - m) + yr * m;
    }
  }
}

/**
 * Look-ahead brick-wall limiter on true (inter-sample) peaks.
 * The required gain per sample is turned into a smooth gain curve by a
 * sliding minimum followed by a moving average of the same window; with the
 * signal delayed by window − 1 samples (plus the peak detector's latency) the
 * gain at every output sample is at most the gain that sample required, so
 * true peaks stay at or below the ceiling without hard clipping.
 */
export class Limiter {
  /**
   * @param {number} sampleRate
   * @param {{ ceilingDb?: number, lookaheadMs?: number, releaseMs?: number }} [params]
   */
  constructor(sampleRate, { ceilingDb = -1, lookaheadMs = 5, releaseMs = 120 } = {}) {
    this.sampleRate = sampleRate;
    this.ceiling = dbToGain(ceilingDb);
    this.window = Math.max(2, Math.round((lookaheadMs / 1000) * sampleRate));
    this.releaseCoef = onePoleCoef(releaseMs / 1000, sampleRate);
    const W = this.window;
    this.tpL = new TruePeakDetector();
    this.tpR = new TruePeakDetector();
    // The peak estimate for a sample arrives tpL.latency samples late, so the
    // audio is held back by that much in addition to the look-ahead window.
    /** total latency in samples */
    this.latency = W - 1 + this.tpL.latency;
    this.delayL = new Float32Array(this.latency);
    this.delayR = new Float32Array(this.latency);
    this.delayPos = 0;
    // Monotonic deque for the sliding minimum (ring buffers of capacity W).
    this.dqVal = new Float64Array(W);
    this.dqIdx = new Float64Array(W);
    this.dqHead = 0;
    this.dqLen = 0;
    this.boxBuf = new Float64Array(W);
    this.boxSum = W;
    this.boxBuf.fill(1);
    this.boxPos = 0;
    this.n = 0;
    this.rel = 1;
    /** lowest gain applied in the last call (for metering) */
    this.minGain = 1;
    /**
     * Optional gain trace: when set, process() writes the gain applied to output sample i
     * (which is input sample i − latency) to trace[i].
     * @type {Float32Array | null}
     */
    this.trace = null;
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  process(L, R, start, end) {
    const W = this.window;
    const ceil = this.ceiling;
    let minGain = 1;
    for (let i = start; i < end; i++) {
      const xl = L[i];
      const xr = R[i];
      // The 4× interpolator also reproduces the (delayed) original samples.
      const peak = Math.max(this.tpL.process(xl), this.tpR.process(xr));
      const req = peak > ceil ? ceil / peak : 1;

      // Sliding minimum over the last W required gains.
      const n = this.n++;
      while (this.dqLen > 0 && this.dqVal[(this.dqHead + this.dqLen - 1) % W] >= req) this.dqLen--;
      this.dqVal[(this.dqHead + this.dqLen) % W] = req;
      this.dqIdx[(this.dqHead + this.dqLen) % W] = n;
      this.dqLen++;
      while (this.dqIdx[this.dqHead] <= n - W) {
        this.dqHead = (this.dqHead + 1) % W;
        this.dqLen--;
      }
      const m = this.dqVal[this.dqHead];
      // Release: recover smoothly, never above the sliding minimum.
      this.rel = Math.min(m, 1 - (1 - this.rel) * this.releaseCoef);

      // Moving average of the same window → smooth gain that is still safe.
      this.boxSum += this.rel - this.boxBuf[this.boxPos];
      this.boxBuf[this.boxPos] = this.rel;
      this.boxPos = (this.boxPos + 1) % W;
      const g = this.boxSum / W;
      if (g < minGain) minGain = g;
      if (this.trace) this.trace[i] = g;

      // Delay line (read before write → delay of `latency` samples).
      const dl = this.delayL[this.delayPos];
      const dr = this.delayR[this.delayPos];
      this.delayL[this.delayPos] = xl;
      this.delayR[this.delayPos] = xr;
      this.delayPos = (this.delayPos + 1) % this.latency;
      let yl = dl * g;
      let yr = dr * g;
      // Numerical safety net (the curve already keeps true peaks below the ceiling).
      if (yl > ceil) yl = ceil;
      else if (yl < -ceil) yl = -ceil;
      if (yr > ceil) yr = ceil;
      else if (yr < -ceil) yr = -ceil;
      L[i] = yl;
      R[i] = yr;
    }
    this.minGain = minGain;
  }
}
