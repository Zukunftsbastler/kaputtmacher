// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Convolution reverb with algorithmically generated impulse responses for
 * very large, dense spaces (cathedral). No recorded IRs: the response is
 * synthesized from seeded noise with a frequency-dependent decay (stone
 * halls keep the lows longest, air absorbs the highs), a diffuse build-up,
 * sparse early reflections and independent left/right tails.
 *
 * Convolution is two-stage uniformly partitioned (overlap-save in the
 * frequency domain): a short block for the head of the response and a long
 * block for the tail, which keeps 8–12 s responses affordable. The output has
 * no latency: the head block's delay is taken out of the response itself, so
 * the first head block of the IR is skipped – it lies inside the predelay as
 * long as the predelay is at least HEAD_BLOCK samples (10.7 ms at 48 kHz).
 *
 * Refs: W. G. Gardner, "Efficient convolution without input-output delay",
 * JAES 43(3), 1995 (partitioned convolution); M. R. Schroeder, "Natural
 * sounding artificial reverberation", JAES 10(3), 1962 (exponentially
 * decaying noise as a model of late reverberation).
 */

import { Fft } from '../fft.js';
import { Biquad, designBiquad } from '../filters.js';
import { Rng } from '../../core/prng.js';

/**
 * @typedef {object} ConvolutionParams
 * @property {number} [rt60] mid-band decay time (default 6)
 * @property {number} [size] 0.3…2: early reflection spread and build-up (default 1.6)
 * @property {number} [damping] Hz; lower = darker tail (default 5000)
 * @property {number} [predelayMs] (default 35)
 * @property {number} [early] early reflection level (default 0.35)
 * @property {number | string} [seed] IR seed (default "cathedral")
 */

/**
 * Synthesizes a stereo impulse response.
 * @param {number} sampleRate
 * @param {ConvolutionParams} [params]
 * @returns {[Float32Array, Float32Array]}
 */
export function generateRoomIR(sampleRate, { rt60 = 6, size = 1.6, damping = 5000, predelayMs = 35, early = 0.35, seed = 'cathedral' } = {}) {
  const sr = sampleRate;
  const length = Math.round(Math.min(14, rt60 * 1.25 + 0.2) * sr);
  const pre = Math.round((predelayMs / 1000) * sr);
  const hiRatio = Math.min(1, Math.max(0.2, damping / 9000));
  // Bands: [filter type, frequency, RT60 factor].
  const bands = /** @type {const} */ ([
    ['lowpass', 300, 1.25],
    ['bandpass', 900, 1],
    ['bandpass', 2600, 0.75],
    ['highpass', 6000, 0.45 * hiRatio + 0.1],
  ]);
  /** @type {[Float32Array, Float32Array]} */
  const out = [new Float32Array(length), new Float32Array(length)];
  for (let c = 0; c < 2; c++) {
    const rng = new Rng(seed).fork(`ir:${c}`);
    const noise = new Float32Array(length);
    for (let i = 0; i < length; i++) noise[i] = (rng.float() + rng.float() + rng.float() - 1.5) * 1.15;
    const ir = out[c];
    for (const [type, hz, factor] of bands) {
      const f = new Biquad(designBiquad(type, hz, type === 'bandpass' ? 0.9 : 0.707, 0, sr));
      const k = 6.907755 / (rt60 * factor * sr);
      for (let i = pre; i < length; i++) ir[i] += f.process(noise[i - pre]) * Math.exp(-k * (i - pre));
    }
    // Diffuse build-up: density grows during the first tens of milliseconds.
    const build = 0.015 * size * sr;
    for (let i = pre; i < length; i++) ir[i] *= 1 - Math.exp(-(i - pre) / build);
    // Sparse early reflections (smeared over a few samples), different per side.
    for (let n = 0; n < 16; n++) {
      const at = pre + Math.round((0.004 + 0.07 * size * ((n + rng.float()) / 16) ** 1.4) * sr);
      const g = early * (1 - n / 18) * (rng.float() < 0.5 ? -1 : 1) * 0.6;
      for (let j = 0; j < 4 && at + j < length; j++) ir[at + j] += g * (1 - j / 4);
    }
    // Fade the very end.
    const fade = Math.round(0.15 * sr);
    for (let i = 0; i < fade; i++) ir[length - 1 - i] *= i / fade;
  }
  // Energy normalization: a unit send gives a tail of comparable loudness to the FDN reverb.
  let e = 0;
  for (const ch of out) for (const x of ch) e += x * x;
  const g = Math.sqrt((0.9 * sr * Math.sqrt(rt60 / 6)) / Math.max(1e-12, e)) * 0.0052;
  for (const ch of out) for (let i = 0; i < ch.length; i++) ch[i] *= g;
  return out;
}

/**
 * One uniformly partitioned overlap-save convolver: block B, FFT 2B, stereo IR,
 * mono input. Latency: B samples.
 */
class PartitionedStage {
  /**
   * @param {[Float32Array, Float32Array]} ir
   * @param {number} B block size (power of two)
   */
  constructor(ir, B) {
    const N = 2 * B;
    this.B = B;
    this.N = N;
    this.half = B + 1;
    this.fft = new Fft(N);
    this.P = Math.max(1, Math.ceil(Math.max(ir[0].length, ir[1].length) / B));
    const re = new Float64Array(N);
    const im = new Float64Array(N);
    /** IR spectra per partition: [L.re, L.im, R.re, R.im] (half spectra). */
    this.H = [];
    for (let p = 0; p < this.P; p++) {
      const parts = [];
      for (const ch of ir) {
        re.fill(0);
        im.fill(0);
        for (let i = 0; i < B; i++) re[i] = ch[p * B + i] ?? 0;
        this.fft.forward(re, im);
        parts.push(Float32Array.from(re.subarray(0, this.half)), Float32Array.from(im.subarray(0, this.half)));
      }
      this.H.push(parts);
    }
    // Frequency-domain delay line of input spectra.
    this.X = Array.from({ length: this.P }, () => [new Float32Array(this.half), new Float32Array(this.half)]);
    this.head = 0;
    this.inBuf = new Float64Array(N);
    this.fill = 0;
    this.outL = new Float32Array(B);
    this.outR = new Float32Array(B);
    this.re = re;
    this.im = im;
    this.yr = new Float64Array(this.half);
    this.yi = new Float64Array(this.half);
    this.zr = new Float64Array(this.half);
    this.zi = new Float64Array(this.half);
  }

  /**
   * Feeds one input sample, returns the output sample of the same position (delayed by B).
   * @param {number} x
   * @param {Float32Array} o two-element output [L, R]
   */
  tick(x, o) {
    const B = this.B;
    o[0] = this.outL[this.fill];
    o[1] = this.outR[this.fill];
    this.inBuf[B + this.fill] = x;
    if (++this.fill === B) {
      this.fill = 0;
      this.#block();
    }
  }

  #block() {
    const { B, N, half, re, im } = this;
    re.set(this.inBuf);
    im.fill(0);
    // Slide the input window.
    this.inBuf.copyWithin(0, B);
    this.fft.forward(re, im);
    this.head = (this.head + this.P - 1) % this.P;
    const xh = this.X[this.head];
    xh[0].set(re.subarray(0, half));
    xh[1].set(im.subarray(0, half));
    const { yr, yi, zr, zi } = this;
    yr.fill(0);
    yi.fill(0);
    zr.fill(0);
    zi.fill(0);
    for (let p = 0; p < this.P; p++) {
      const [xr, xi] = this.X[(this.head + p) % this.P];
      const [lr, li, rr, ri] = this.H[p];
      for (let k = 0; k < half; k++) {
        const a = xr[k];
        const b = xi[k];
        yr[k] += a * lr[k] - b * li[k];
        yi[k] += a * li[k] + b * lr[k];
        zr[k] += a * rr[k] - b * ri[k];
        zi[k] += a * ri[k] + b * rr[k];
      }
    }
    // Both real outputs in one inverse FFT: W = Y_L + i·Y_R.
    for (let k = 0; k < half; k++) {
      re[k] = yr[k] - zi[k];
      im[k] = yi[k] + zr[k];
    }
    for (let k = 1; k < B; k++) {
      // Conjugate-symmetric parts of Y_L and Y_R at N − k.
      re[N - k] = yr[k] + zi[k];
      im[N - k] = -yi[k] + zr[k];
    }
    this.fft.inverse(re, im);
    for (let i = 0; i < B; i++) {
      this.outL[i] = re[B + i];
      this.outR[i] = im[B + i];
    }
  }
}

const HEAD_BLOCK = 512;
const HEAD_PARTS = 32;
const TAIL_BLOCK = 8192;

export class ConvolutionReverb {
  /**
   * @param {number} sampleRate
   * @param {ConvolutionParams & { ir?: [Float32Array, Float32Array] }} [params]
   */
  constructor(sampleRate, params = {}) {
    const ir = params.ir ?? generateRoomIR(sampleRate, params);
    /** IR samples skipped at the start (must lie within the predelay) */
    this.skipped = HEAD_BLOCK;
    const L = HEAD_BLOCK;
    const headLen = HEAD_PARTS * HEAD_BLOCK;
    const cut = (/** @type {Float32Array} */ ch, /** @type {number} */ a, /** @type {number} */ b) => ch.subarray(Math.min(ch.length, a), Math.min(ch.length, b));
    // Shift by the head latency: h'[n] = h[n + L].
    /** @type {[Float32Array, Float32Array]} */
    const head = [cut(ir[0], L, L + headLen), cut(ir[1], L, L + headLen)];
    this.headStage = new PartitionedStage(head, HEAD_BLOCK);
    const tailStart = L + headLen;
    if (ir[0].length > tailStart) {
      // The tail stage delays by its block; leading zeros put h[tailStart] at lag tailStart.
      const pad = tailStart - TAIL_BLOCK;
      const mk = (/** @type {Float32Array} */ ch) => {
        const t = cut(ch, tailStart, ch.length);
        const g = new Float32Array(pad + t.length);
        g.set(t, pad);
        return g;
      };
      this.tailStage = new PartitionedStage([mk(ir[0]), mk(ir[1])], TAIL_BLOCK);
    } else this.tailStage = null;
    this.o = new Float32Array(2);
    this.o2 = new Float32Array(2);
  }

  /**
   * Replaces L/R (the send signal) with the wet reverb.
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  process(L, R, start, end) {
    const o = this.o;
    const o2 = this.o2;
    for (let i = start; i < end; i++) {
      const x = 0.5 * (L[i] + R[i]);
      this.headStage.tick(x, o);
      let l = o[0];
      let r = o[1];
      if (this.tailStage) {
        this.tailStage.tick(x, o2);
        l += o2[0];
        r += o2[1];
      }
      L[i] = l;
      R[i] = r;
    }
  }
}
