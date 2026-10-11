// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Stereo feedback delay (optionally ping-pong) with filtered feedback,
 * so repeats get darker and thinner like analog/tape echoes. Delay time is
 * smoothed, so tempo changes glide instead of clicking.
 */

import { DelayLine } from '../delay-line.js';
import { OnePole } from '../filters.js';
import { Smoother } from '../smoother.js';
import { softClip } from '../util.js';

/**
 * @typedef {object} DelayParams
 * @property {number} [timeSec] delay time (default 0.375)
 * @property {number} [feedback] 0…0.95 (default 0.35)
 * @property {number} [mix] wet level 0…1 (default 1: use on a send bus)
 * @property {boolean} [pingPong] alternate repeats left/right (default true)
 * @property {number} [highCut] Hz in the feedback path (default 5000)
 * @property {number} [lowCut] Hz in the feedback path (default 150)
 */

export class StereoDelay {
  /**
   * @param {number} sampleRate
   * @param {DelayParams} [params]
   */
  constructor(sampleRate, params = {}) {
    this.sampleRate = sampleRate;
    this.lineL = new DelayLine(Math.ceil(4 * sampleRate));
    this.lineR = new DelayLine(Math.ceil(4 * sampleRate));
    this.lpL = new OnePole(sampleRate);
    this.lpR = new OnePole(sampleRate);
    this.hpL = new OnePole(sampleRate);
    this.hpR = new OnePole(sampleRate);
    this.time = new Smoother(0.375 * sampleRate, 0.08, sampleRate);
    this.feedback = 0.35;
    this.mix = 1;
    this.pingPong = true;
    this.set({ timeSec: 0.375, feedback: 0.35, mix: 1, pingPong: true, highCut: 5000, lowCut: 150, ...params }, true);
  }

  /**
   * @param {DelayParams} p
   * @param {boolean} [immediate]
   */
  set(p, immediate = false) {
    if (p.timeSec !== undefined) {
      const samples = Math.min(this.lineL.maxDelay - 4, Math.max(1, p.timeSec * this.sampleRate));
      if (immediate) this.time.jump(samples);
      else this.time.set(samples);
    }
    if (p.feedback !== undefined) this.feedback = Math.min(0.95, Math.max(0, p.feedback));
    if (p.mix !== undefined) this.mix = p.mix;
    if (p.pingPong !== undefined) this.pingPong = p.pingPong;
    if (p.highCut !== undefined) {
      this.lpL.set(p.highCut);
      this.lpR.set(p.highCut);
    }
    if (p.lowCut !== undefined) {
      this.hpL.set(p.lowCut);
      this.hpR.set(p.lowCut);
    }
  }

  /**
   * In-place stereo processing. With mix = 1 the output is pure wet (send bus);
   * with mix < 1 it is input + mix · wet (insert).
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  process(L, R, start, end) {
    const fb = this.feedback;
    const mix = this.mix;
    const dryGain = mix >= 1 ? 0 : 1;
    for (let i = start; i < end; i++) {
      const d = this.time.next();
      const wl = this.lineL.readLinear(d);
      const wr = this.lineR.readLinear(d);
      const fl = this.hpL.highpass(this.lpL.lowpass(wl)) * fb;
      const fr = this.hpR.highpass(this.lpR.lowpass(wr)) * fb;
      const inL = L[i];
      const inR = R[i];
      if (this.pingPong) {
        // Mono input enters the left line; repeats cross over each pass.
        this.lineL.write(softClip(0.5 * (inL + inR) + fr));
        this.lineR.write(softClip(fl));
      } else {
        this.lineL.write(softClip(inL + fl));
        this.lineR.write(softClip(inR + fr));
      }
      L[i] = inL * dryGain + wl * mix;
      R[i] = inR * dryGain + wr * mix;
    }
  }
}
