// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Linked mastering of stem layers. Glue compression, loudness normalization
 * and the true-peak limiter are gain-only processors, so they are computed on
 * the sum *as the player will play it* (each segment body plus the tail of
 * the segment before it, cyclically for loops) and applied as one gain curve
 * to every layer. With all layers on, the layers sum exactly to the mastered
 * mix; the curves of consecutive segments meet seamlessly at the boundaries
 * because each analysis is primed with the preceding segment.
 */

import { Compressor, Limiter } from '../dsp/effects/dynamics.js';
import { measureLoudness } from '../analysis/loudness.js';
import { dbToGain } from '../dsp/util.js';

/** Same glue as the offline renderer's master bus. */
export const GLUE = Object.freeze({ thresholdDb: -14, ratio: 1.8, kneeDb: 8, attackMs: 25, releaseMs: 220, detectorHighpassHz: 150 });

/**
 * @typedef {[Float32Array, Float32Array]} Stereo
 * @typedef {object} MasterSegment
 * @property {number} frames body length
 * @property {{ body: Stereo, tail: Stereo }[]} layers tails may be empty (length 0)
 */

/**
 * @param {MasterSegment[]} segments in playback order (modified in place)
 * @param {{ sampleRate: number, loop: boolean, targetLufs?: number, ceilingDb?: number }} options
 * @returns {{ integratedLufs: number, gainDb: number }} loudness of the mastered sum
 */
export function masterLinked(segments, { sampleRate, loop, targetLufs = -18, ceilingDb = -1 }) {
  const n = segments.length;
  const prev = (/** @type {number} */ k) => (k > 0 ? k - 1 : loop ? n - 1 : -1);
  const next = (/** @type {number} */ k) => (k < n - 1 ? k + 1 : loop ? 0 : -1);

  // Sums as heard: body_k + tail_(k−1).
  const tails = segments.map((s) => sumLayers(s.layers.map((l) => l.tail), maxLen(s.layers.map((l) => l.tail[0].length))));
  const heard = segments.map((s, k) => {
    const w = sumLayers(s.layers.map((l) => l.body), s.frames);
    const p = prev(k);
    if (p >= 0) addInto(w, tails[p]);
    return w;
  });

  // Glue compressor, primed with the preceding segment.
  const glue = heard.map((w, k) => {
    const comp = new Compressor(sampleRate, GLUE);
    const p = prev(k);
    if (p >= 0) runBlocks(comp, copy(heard[p]));
    comp.trace = new Float32Array(w[0].length);
    runBlocks(comp, copy(w));
    return comp.trace;
  });

  // Loudness normalization over the whole sequence.
  const total = heard.reduce((a, w) => a + w[0].length, 0);
  /** @type {Stereo} */
  const all = [new Float32Array(total), new Float32Array(total)];
  let at = 0;
  heard.forEach((w, k) => {
    for (let c = 0; c < 2; c++) for (let i = 0; i < w[c].length; i++) all[c][at + i] = w[c][i] * glue[k][i];
    at += w[0].length;
  });
  const pre = measureLoudness(all, sampleRate, { truePeak: false }).integratedLufs;
  const gainDb = Number.isFinite(pre) ? targetLufs - pre : 0;
  const gn = dbToGain(gainDb);

  // True-peak limiter: look-ahead into the next segment, primed with the previous one.
  const gains = heard.map((w, k) => {
    const lim = new Limiter(sampleRate, { ceilingDb });
    const lat = lim.latency;
    const p = prev(k);
    const q = next(k);
    const before = p >= 0 ? heard[p][0].length : 0;
    const len = before + w[0].length + lat;
    /** @type {Stereo} */
    const buf = [new Float32Array(len), new Float32Array(len)];
    const put = (/** @type {number} */ seg, /** @type {number} */ offset, /** @type {number} */ count) => {
      for (let c = 0; c < 2; c++) for (let i = 0; i < count; i++) buf[c][offset + i] = heard[seg][c][i] * glue[seg][i] * gn;
    };
    if (p >= 0) put(p, 0, before);
    put(k, before, w[0].length);
    if (q >= 0) put(q, before + w[0].length, Math.min(lat, heard[q][0].length));
    lim.trace = new Float32Array(len);
    runBlocks(lim, buf);
    const g = new Float32Array(w[0].length);
    for (let i = 0; i < g.length; i++) g[i] = glue[k][i] * gn * lim.trace[before + i + lat];
    return g;
  });

  // Apply: bodies with their own curve, tails with the curve of what they overlap.
  segments.forEach((s, k) => {
    const g = gains[k];
    for (const l of s.layers) for (let c = 0; c < 2; c++) for (let i = 0; i < s.frames; i++) l.body[c][i] *= g[i];
    const q = next(k);
    const gt = q >= 0 ? gains[q] : null;
    const last = g[g.length - 1];
    for (const l of s.layers) {
      for (let c = 0; c < 2; c++) {
        const t = l.tail[c];
        for (let i = 0; i < t.length; i++) t[i] *= gt ? gt[Math.min(i, gt.length - 1)] : last;
      }
    }
  });

  // Loudness as heard after mastering.
  at = 0;
  heard.forEach((w, k) => {
    for (let c = 0; c < 2; c++) for (let i = 0; i < w[c].length; i++) all[c][at + i] = w[c][i] * gains[k][i];
    at += w[0].length;
  });
  return { integratedLufs: measureLoudness(all, sampleRate, { truePeak: false }).integratedLufs, gainDb };
}

/** @param {number[]} lengths */
const maxLen = (lengths) => lengths.reduce((a, b) => Math.max(a, b), 0);

/**
 * @param {Stereo[]} parts
 * @param {number} length
 * @returns {Stereo}
 */
function sumLayers(parts, length) {
  /** @type {Stereo} */
  const out = [new Float32Array(length), new Float32Array(length)];
  for (const p of parts) addInto(out, p);
  return out;
}

/**
 * Adds src into dst from index 0 (up to the shorter length).
 * @param {Stereo} dst
 * @param {Stereo} src
 */
function addInto(dst, src) {
  for (let c = 0; c < 2; c++) {
    const n = Math.min(dst[c].length, src[c].length);
    for (let i = 0; i < n; i++) dst[c][i] += src[c][i];
  }
}

/** @param {Stereo} s @returns {Stereo} */
const copy = (s) => [new Float32Array(s[0]), new Float32Array(s[1])];

/**
 * @param {{ process: (L: Float32Array, R: Float32Array, start: number, end: number) => void }} fx
 * @param {Stereo} s
 */
function runBlocks(fx, s) {
  for (let i = 0; i < s[0].length; i += 128) fx.process(s[0], s[1], i, Math.min(s[0].length, i + 128));
}
