// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Noise textures that run while a note is held: vinyl crackle (random
 * impulses), hiss and rumble — the "patina" layer of lo-fi and nostalgic
 * styles. Fades in on note-on and out on note-off.
 */

import { NoiseSource } from '../dsp/noise.js';
import { OnePole, Svf } from '../dsp/filters.js';
import { dbToGain, onePoleCoef } from '../dsp/util.js';
import { PolyInstrument } from './voice-pool.js';

/**
 * @typedef {object} TexturePreset
 * @property {'texture'} engine
 * @property {string} [id]
 * @property {number} [crackle] clicks per second (default 6)
 * @property {number} [crackleLevel] default 0.5
 * @property {number} [hiss] hiss level (default 0.02)
 * @property {number} [hissTone] hiss low-pass in Hz (default 9000)
 * @property {number} [rumble] low-frequency rumble level (default 0.03)
 * @property {number} [fadeIn] seconds (default 0.6)
 * @property {number} [fadeOut] seconds (default 1.2)
 * @property {number} [gainDb]
 */

class TextureVoice {
  /**
   * @param {Required<TexturePreset>} p
   * @param {import('./context.js').SynthContext} ctx
   * @param {import('../core/prng.js').Rng} rng
   */
  constructor(p, ctx, rng) {
    const sr = ctx.sampleRate;
    this.p = p;
    this.sr = sr;
    this.rng = rng;
    this.nl = new NoiseSource(rng.fork('l'));
    this.nr = new NoiseSource(rng.fork('r'));
    this.hissL = new OnePole(sr);
    this.hissR = new OnePole(sr);
    this.hissL.set(p.hissTone);
    this.hissR.set(p.hissTone);
    this.rumble = new OnePole(sr);
    this.rumble.set(45);
    this.clickHp = new Svf(sr);
    this.clickHp.setMode('highpass');
    this.clickHp.set(1800, 0.7);
    this.clickProb = p.crackle / sr;
    this.click = 0;
    this.clickPan = 0;
    this.clickCoef = 0;
    this.env = 0;
    this.target = 0;
    this.inCoef = onePoleCoef(p.fadeIn / 3, sr);
    this.outCoef = onePoleCoef(p.fadeOut / 3, sr);
    this.gain = dbToGain(p.gainDb);
    this.active = false;
    this.released = false;
    this.stealing = false;
    this.pitch = 0;
    this.age = 0;
  }

  level() {
    return this.env;
  }

  /** @param {number} pitch */
  noteOn(pitch) {
    this.active = true;
    this.released = false;
    this.stealing = false;
    this.pitch = pitch;
    this.target = 1;
  }

  noteOff() {
    this.released = true;
    this.target = 0;
  }

  steal() {
    this.noteOff();
    this.stealing = true;
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  render(L, R, start, end) {
    const p = this.p;
    const rng = this.rng;
    for (let i = start; i < end; i++) {
      this.env = this.target + (this.env - this.target) * (this.target > this.env ? this.inCoef : this.outCoef);
      if (rng.float() < this.clickProb) {
        // Click strength is heavily skewed: mostly faint ticks, rare loud pops.
        const r = rng.float();
        this.click = r * r * r * p.crackleLevel * 2;
        this.clickPan = rng.float() * 1.4 - 0.7;
        this.clickCoef = Math.exp(-1 / ((0.0004 + 0.002 * rng.float()) * this.sr));
      }
      let cl = 0;
      let cr = 0;
      if (this.click > 1e-5) {
        const c = this.clickHp.process(this.nl.white()) * this.click;
        this.click *= this.clickCoef;
        cl = c * (1 - Math.max(0, this.clickPan));
        cr = c * (1 + Math.min(0, this.clickPan));
      }
      const rum = this.rumble.lowpass(this.nl.brown()) * p.rumble * 4;
      const hl = this.hissL.lowpass(this.nl.pink()) * p.hiss;
      const hr = this.hissR.lowpass(this.nr.pink()) * p.hiss;
      const g = this.env * this.gain;
      L[i] += (cl + hl + rum) * g;
      R[i] += (cr + hr + rum) * g;
      if (this.target === 0 && this.env < 1e-4) {
        this.active = false;
        this.stealing = false;
        break;
      }
    }
  }
}

/**
 * @param {TexturePreset} preset
 * @param {import('./context.js').SynthContext} ctx
 * @param {import('../core/prng.js').Rng} rng
 */
export function createTexture(preset, ctx, rng) {
  /** @type {Required<TexturePreset>} */
  const p = {
    id: 'texture',
    crackle: 6,
    crackleLevel: 0.5,
    hiss: 0.02,
    hissTone: 9000,
    rumble: 0.03,
    fadeIn: 0.6,
    fadeOut: 1.2,
    gainDb: 0,
    ...preset,
  };
  return new PolyInstrument(p, (i) => new TextureVoice(p, ctx, rng.fork(`voice${i}`)), { polyphony: 1, spare: 1 });
}
