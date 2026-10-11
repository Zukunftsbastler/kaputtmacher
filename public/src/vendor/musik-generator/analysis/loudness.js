// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Loudness and true-peak measurement following ITU-R BS.1770-4 / EBU R128:
 * K-weighting (shelf + high-pass), 400 ms blocks with 75 % overlap,
 * absolute gate −70 LUFS, relative gate −10 LU. True peak via 4× oversampling.
 *
 * The K-weighting coefficients for 48 kHz are those published in BS.1770.
 * For other sample rates the same filters are re-discretized: the 48 kHz
 * biquad is mapped to its analog prototype and back via the bilinear
 * transform at the new rate (z⁻¹ substitution by a first-order rational map).
 */

import { Biquad } from '../dsp/filters.js';
import { TruePeakDetector } from '../dsp/resampling.js';

/** BS.1770 stage 1 (high-shelf "head effect") and stage 2 (RLB high-pass) at 48 kHz. */
const K48 = Object.freeze({
  shelf: { b: [1.53512485958697, -2.69169618940638, 1.19839281085285], a: [1, -1.69065929318241, 0.73248077421585] },
  highpass: { b: [1, -2, 1], a: [1, -1.99004745483398, 0.99007225036621] },
});

/**
 * @param {number[]} p coefficients of a polynomial in v
 * @param {number[]} q
 */
function polyMul(p, q) {
  const out = new Array(p.length + q.length - 1).fill(0);
  for (let i = 0; i < p.length; i++) for (let j = 0; j < q.length; j++) out[i + j] += p[i] * q[j];
  return out;
}

/**
 * Re-discretizes a 48 kHz biquad at another sample rate via the bilinear map
 * u = ((1−r) + (1+r)v) / ((1+r) + (1−r)v), r = fs2/fs1, u = z₁⁻¹, v = z₂⁻¹.
 * @param {{ b: number[], a: number[] }} f
 * @param {number} fromRate
 * @param {number} toRate
 * @returns {import('../dsp/filters.js').BiquadCoefs}
 */
function remapBiquad(f, fromRate, toRate) {
  const r = toRate / fromRate;
  const N = [1 - r, 1 + r];
  const D = [1 + r, 1 - r];
  const D2 = polyMul(D, D);
  const ND = polyMul(N, D);
  const N2 = polyMul(N, N);
  const map = (/** @type {number[]} */ c) => [0, 1, 2].map((k) => c[0] * D2[k] + c[1] * ND[k] + c[2] * N2[k]);
  const b = map(f.b);
  const a = map(f.a);
  return { b0: b[0] / a[0], b1: b[1] / a[0], b2: b[2] / a[0], a1: a[1] / a[0], a2: a[2] / a[0] };
}

/**
 * @param {number} sampleRate
 * @returns {[Biquad, Biquad]}
 */
export function createKWeighting(sampleRate) {
  return [
    new Biquad(remapBiquad(K48.shelf, 48000, sampleRate)),
    new Biquad(remapBiquad(K48.highpass, 48000, sampleRate)),
  ];
}

/**
 * @typedef {object} LoudnessResult
 * @property {number} integratedLufs gated integrated loudness (−Infinity for silence)
 * @property {number} truePeakDb maximum true peak in dBTP
 * @property {number} samplePeakDb maximum sample peak in dBFS
 */

/**
 * @param {Float32Array[]} channels mono or stereo (more channels weighted 1.0 each)
 * @param {number} sampleRate
 * @param {{ truePeak?: boolean }} [options] truePeak: false skips the (4× oversampled) true-peak
 *   measurement when only the loudness is needed; truePeakDb is then NaN
 * @returns {LoudnessResult}
 */
export function measureLoudness(channels, sampleRate, { truePeak: withTruePeak = true } = {}) {
  const frames = channels[0].length;
  const block = Math.round(0.4 * sampleRate);
  const hop = Math.round(0.1 * sampleRate);
  const hops = Math.floor(frames / hop);
  // Mean square of K-weighted signal per 100 ms hop, summed over channels.
  const hopEnergy = new Float64Array(hops);
  let truePeak = 0;
  let samplePeak = 0;
  for (const ch of channels) {
    const [k1, k2] = createKWeighting(sampleRate);
    const tp = new TruePeakDetector();
    for (let i = 0; i < frames; i++) {
      const x = ch[i];
      const y = k2.process(k1.process(x));
      const h = Math.floor(i / hop);
      if (h < hops) hopEnergy[h] += y * y;
      if (withTruePeak) {
        const p = tp.process(x);
        if (p > truePeak) truePeak = p;
      }
      const a = Math.abs(x);
      if (a > samplePeak) samplePeak = a;
    }
    // Flush the interpolator so the last samples are included.
    if (withTruePeak) for (let i = 0; i < 2 * tp.latency; i++) truePeak = Math.max(truePeak, tp.process(0));
  }
  const perBlock = block / hop;
  /** @type {number[]} */
  const blocks = [];
  for (let start = 0; start + perBlock <= hops; start++) {
    let e = 0;
    for (let j = 0; j < perBlock; j++) e += hopEnergy[start + j];
    blocks.push(e / block);
  }
  const lufs = (/** @type {number} */ z) => -0.691 + 10 * Math.log10(z);
  const absGated = blocks.filter((z) => lufs(z) > -70);
  let integrated = -Infinity;
  if (absGated.length > 0) {
    const mean = absGated.reduce((s, z) => s + z, 0) / absGated.length;
    const relThreshold = lufs(mean) - 10;
    const gated = absGated.filter((z) => lufs(z) > relThreshold);
    integrated = lufs(gated.reduce((s, z) => s + z, 0) / gated.length);
  }
  const db = (/** @type {number} */ x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  return { integratedLufs: integrated, truePeakDb: withTruePeak ? db(truePeak) : Number.NaN, samplePeakDb: db(samplePeak) };
}
