// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Sound-sculpture textures for held notes:
 *  - "grains": a cloud of short tone grains (Hann windows) scattered over
 *    the note's pitch set and the stereo field, sparse sparkle to dense haze;
 *  - "cluster": micropolyphony – many sine voices drifting slowly and
 *    independently within a narrow band around the note, so the texture
 *    beats and shimmers without a clear pitch line.
 * Both fade in and out with the note.
 *
 * Refs: C. Roads, Microsound, MIT Press 2001 (granular synthesis);
 * G. Ligeti's micropolyphony (e.g. "Atmosphères", 1961) as the aesthetic model
 * of dense, slowly moving clusters.
 */

import { dbToGain, onePoleCoef } from '../dsp/util.js';
import { OnePole } from '../dsp/filters.js';
import { PolyInstrument } from './voice-pool.js';
import { SINE_TABLE_SIZE } from './context.js';

/**
 * @typedef {object} GranularPreset
 * @property {'granular'} engine
 * @property {string} [id]
 * @property {'grains' | 'cluster'} mode
 * @property {number} [density] grains per second (grains)
 * @property {[number, number]} [grainSec] min/max grain length
 * @property {number[]} [pitches] semitone offsets the grains choose from (grains)
 * @property {number} [scatter] random detune of grains in cents
 * @property {number[]} [harmonics] relative amplitudes of harmonics 1… of each grain/voice
 * @property {number} [voices] cluster voices
 * @property {number} [width] cluster band ± semitones
 * @property {number} [drift] cluster drift speed in semitones per second
 * @property {number} [spread] stereo spread 0…1
 * @property {number} [lowpass] Hz
 * @property {number} [fadeIn] seconds
 * @property {number} [fadeOut] seconds
 * @property {number} [polyphony]
 * @property {number} [gainDb]
 */

const MAX_GRAINS = 48;
const MAX_CLUSTER = 24;

/** @param {GranularPreset} p */
function withDefaults(p) {
  return {
    density: 18,
    grainSec: /** @type {[number, number]} */ ([0.08, 0.35]),
    pitches: [0, 7, 12, 19, 24],
    scatter: 8,
    harmonics: [1, 0.3, 0.12],
    voices: 12,
    width: 1.5,
    drift: 0.25,
    spread: 0.9,
    lowpass: 9000,
    fadeIn: 1.5,
    fadeOut: 2.5,
    polyphony: 4,
    gainDb: 0,
    ...p,
  };
}

class GranularVoice {
  /**
   * @param {ReturnType<typeof withDefaults>} p
   * @param {import('./context.js').SynthContext} ctx
   * @param {import('../core/prng.js').Rng} rng
   */
  constructor(p, ctx, rng) {
    this.p = p;
    this.sr = ctx.sampleRate;
    this.sine = ctx.sine;
    this.rng = rng;
    this.active = false;
    this.released = false;
    this.stealing = false;
    this.pitch = 60;
    this.age = 0;
    const m = Math.max(MAX_GRAINS, MAX_CLUSTER);
    this.ph = new Float64Array(m);
    this.inc = new Float64Array(m);
    this.pos = new Float64Array(m);
    this.len = new Float64Array(m);
    this.gl = new Float64Array(m);
    this.gr = new Float64Array(m);
    this.on = new Uint8Array(m);
    // Cluster drift state (semitones) and its velocity.
    this.off = new Float64Array(m);
    this.vel = new Float64Array(m);
    this.amp = new Float64Array(m);
    this.ampTarget = new Float64Array(m);
    this.env = 0;
    this.target = 0;
    this.inCoef = onePoleCoef(p.fadeIn / 3, this.sr);
    // About −43 dB after fadeOut, silent (−80 dB) after 1.8 × fadeOut.
    this.outCoef = onePoleCoef(p.fadeOut / 5, this.sr);
    this.lpL = new OnePole(this.sr);
    this.lpR = new OnePole(this.sr);
    this.lpL.set(p.lowpass);
    this.lpR.set(p.lowpass);
    this.base = 261.6;
    this.gain = 1;
    this.ctrl = 0;
    this.hsum = p.harmonics.reduce((a, b) => a + Math.abs(b), 0) || 1;
  }

  level() {
    return this.env * this.gain;
  }

  /**
   * @param {number} pitch
   * @param {number} velocity
   */
  noteOn(pitch, velocity) {
    const p = this.p;
    this.active = true;
    this.released = false;
    this.stealing = false;
    this.pitch = pitch;
    this.base = 440 * 2 ** ((pitch - 69) / 12);
    this.target = 1;
    this.env = Math.min(this.env, 1);
    this.outCoef = onePoleCoef(p.fadeOut / 5, this.sr); // a steal may have shortened it
    this.gain = dbToGain(p.gainDb) * (0.4 + 0.6 * velocity);
    this.on.fill(0);
    if (p.mode === 'cluster') {
      const n = Math.min(MAX_CLUSTER, p.voices);
      for (let k = 0; k < n; k++) {
        this.on[k] = 1;
        this.off[k] = (this.rng.float() * 2 - 1) * p.width;
        this.vel[k] = 0;
        this.ph[k] = this.rng.float();
        this.amp[k] = 0.5;
        this.ampTarget[k] = 0.3 + 0.7 * this.rng.float();
        const pan = (this.rng.float() * 2 - 1) * p.spread;
        this.gl[k] = Math.sqrt(0.5 * (1 - pan));
        this.gr[k] = Math.sqrt(0.5 * (1 + pan));
      }
    }
  }

  noteOff() {
    this.released = true;
    this.target = 0;
  }

  steal() {
    this.released = true;
    this.stealing = true;
    this.target = 0;
    this.outCoef = onePoleCoef(0.004, this.sr);
  }

  #spawn() {
    const p = this.p;
    for (let k = 0; k < MAX_GRAINS; k++) {
      if (this.on[k]) continue;
      const semis = p.pitches[Math.floor(this.rng.float() * p.pitches.length)] + ((this.rng.float() * 2 - 1) * p.scatter) / 100;
      this.inc[k] = (this.base * 2 ** (semis / 12)) / this.sr;
      this.ph[k] = this.rng.float();
      this.pos[k] = 0;
      this.len[k] = Math.round((p.grainSec[0] + this.rng.float() * (p.grainSec[1] - p.grainSec[0])) * this.sr);
      const pan = (this.rng.float() * 2 - 1) * p.spread;
      const a = (0.5 + 0.5 * this.rng.float()) / this.hsum;
      this.gl[k] = a * Math.sqrt(0.5 * (1 - pan));
      this.gr[k] = a * Math.sqrt(0.5 * (1 + pan));
      this.on[k] = 1;
      return;
    }
  }

  #control() {
    const p = this.p;
    if (p.mode !== 'cluster') return;
    const dt = 16 / this.sr;
    const n = Math.min(MAX_CLUSTER, p.voices);
    for (let k = 0; k < n; k++) {
      // Bounded random walk with inertia: slow, independent glissandi.
      this.vel[k] += (this.rng.float() * 2 - 1) * p.drift * dt * 4 - this.vel[k] * dt * 0.8;
      this.off[k] += this.vel[k] * dt;
      if (Math.abs(this.off[k]) > p.width) this.vel[k] -= Math.sign(this.off[k]) * p.drift * dt * 8;
      if (this.rng.float() < 0.004) this.ampTarget[k] = 0.2 + 0.8 * this.rng.float();
      this.amp[k] += (this.ampTarget[k] - this.amp[k]) * 0.01;
      this.inc[k] = (this.base * 2 ** (this.off[k] / 12)) / this.sr;
    }
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  render(L, R, start, end) {
    const p = this.p;
    const sine = this.sine;
    const N = SINE_TABLE_SIZE;
    const hs = p.harmonics;
    const cluster = p.mode === 'cluster';
    const count = cluster ? Math.min(MAX_CLUSTER, p.voices) : MAX_GRAINS;
    const spawnProb = p.density / this.sr;
    const norm = cluster ? 1 / Math.sqrt(count) / this.hsum : 1;
    for (let s = start; s < end; s++) {
      if (this.ctrl-- <= 0) {
        this.#control();
        this.ctrl = 15;
      }
      this.env = this.target + (this.env - this.target) * (this.target > this.env ? this.inCoef : this.outCoef);
      if (this.released && this.env < 1e-4) {
        this.active = false;
        this.stealing = false;
        return;
      }
      if (!cluster && !this.released && this.rng.float() < spawnProb) this.#spawn();
      let yl = 0;
      let yr = 0;
      for (let k = 0; k < count; k++) {
        if (!this.on[k]) continue;
        let ph = this.ph[k] + this.inc[k];
        if (ph >= 1) ph -= 1;
        this.ph[k] = ph;
        let y = 0;
        for (let h = 0; h < hs.length; h++) {
          const x = ((ph * (h + 1)) % 1) * N;
          y += sine[x | 0] * hs[h];
        }
        let w;
        if (cluster) w = this.amp[k] * norm;
        else {
          // Hann window over the grain.
          const u = this.pos[k] / this.len[k];
          w = 0.5 - 0.5 * sine[(((u + 0.25) % 1) * N) | 0];
          if (++this.pos[k] >= this.len[k]) this.on[k] = 0;
        }
        yl += y * w * this.gl[k];
        yr += y * w * this.gr[k];
      }
      const g = this.env * this.gain;
      L[s] += this.lpL.lowpass(yl) * g;
      R[s] += this.lpR.lowpass(yr) * g;
    }
  }
}

/**
 * @param {GranularPreset} preset
 * @param {import('./context.js').SynthContext} ctx
 * @param {import('../core/prng.js').Rng} rng
 */
export function createGranular(preset, ctx, rng) {
  const p = withDefaults(preset);
  return new PolyInstrument(p, (i) => new GranularVoice(p, ctx, rng.fork(`voice${i}`)), { polyphony: p.polyphony });
}
