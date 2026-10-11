// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Plucked strings by extended Karplus–Strong synthesis:
 * a noise/shaped excitation (pick position comb, velocity-dependent
 * brightness) circulates in a tuned delay loop with a one-zero loss filter,
 * a first-order all-pass for exact fractional tuning and a loop gain set
 * from the desired decay time. Note-off damps the string. An optional body
 * resonator (parallel band-passes) adds the instrument body.
 * Ref: Karplus & Strong, CMJ 7(2), 1983; Jaffe & Smith, "Extensions of the
 * Karplus–Strong Plucked-String Algorithm", CMJ 7(2), 1983.
 */

import { OnePole, Biquad, designBiquad, DcBlocker } from '../dsp/filters.js';
import { NoiseSource } from '../dsp/noise.js';
import { pitchToHz, dbToGain, clamp, centsToRatio } from '../dsp/util.js';
import { PolyInstrument, vary } from './voice-pool.js';

/**
 * @typedef {object} PluckPreset
 * @property {'pluck'} engine
 * @property {string} [id]
 * @property {number} [polyphony]
 * @property {number} decay T60 in seconds at C3 (higher notes decay faster)
 * @property {number} [brightness] 0…1: loop filter (1 = least high-frequency loss)
 * @property {number} [excitationTone] 0…1: excitation brightness
 * @property {number} [pickPosition] 0.05…0.5 (fraction of string length; 0.5 = middle, hollow)
 * @property {number} [softness] 0…1 blend of smooth (finger/harp) vs noise excitation
 * @property {number} [releaseDecay] T60 after note-off in seconds
 * @property {number} [pickNoise] level of a short attack click (pick/finger noise)
 * @property {number} [section] number of slightly detuned/offset strings per note (pizzicato section)
 * @property {[number, number, number][]} [body] resonances [Hz, Q, gainDb]
 * @property {number} [bodyMix] 0…1
 * @property {number} [velocity] amplitude velocity sensitivity
 * @property {number} [polarMix] level of the second polarization (0 = off); gives beating and life
 * @property {number} [polarDetune] cents between the two polarizations
 * @property {number} [glide] tension glide: start this many cents sharp at full velocity
 * @property {number} [glideTime] time constant of the glide in seconds
 * @property {number} [buzz] 0…1 fret/fingerboard buzz on loud plucks
 * @property {number} [releaseNoise] finger/palm noise when the note is damped
 * @property {number} [pickup] magnetic pickup position (fraction of the string from the bridge, 0 = off)
 * @property {number} [gainDb]
 */

/** @param {PluckPreset} p */
function withDefaults(p) {
  return {
    polyphony: 12,
    brightness: 0.5,
    excitationTone: 0.6,
    pickPosition: 0.18,
    softness: 0.2,
    releaseDecay: 0.25,
    pickNoise: 0.1,
    section: 1,
    body: [],
    bodyMix: 0.5,
    velocity: 0.7,
    polarMix: 0,
    polarDetune: 1.2,
    glide: 0,
    glideTime: 0.04,
    buzz: 0,
    releaseNoise: 0,
    pickup: 0,
    gainDb: 0,
    ...p,
  };
}

const MIN_FREQ = 25;

/**
 * @typedef {import('./voice-pool.js').NoteOptions & { delaySamples?: number, detuneCents?: number, pan?: number }} PluckNoteOptions
 *   per-string extras used by section playing
 */

class PluckVoice {
  /**
   * @param {ReturnType<typeof withDefaults>} p
   * @param {import('./context.js').SynthContext} ctx
   * @param {import('../core/prng.js').Rng} rng
   */
  constructor(p, ctx, rng) {
    const sr = ctx.sampleRate;
    this.p = p;
    this.sr = sr;
    this.rng = rng;
    this.noise = new NoiseSource(rng.fork('noise'));
    this.maxLen = Math.ceil(sr / MIN_FREQ) + 8;
    let size = 4;
    while (size < this.maxLen + 8) size <<= 1;
    this.mask = size - 1;
    // Two rings: the two polarizations of the string (horizontal / vertical motion).
    this.buf = new Float32Array(size);
    this.buf2 = new Float32Array(size);
    this.exc = new Float32Array(this.maxLen);
    this.w = 0;
    this.period = 100;
    this.period2 = 100;
    this.active = false;
    this.released = false;
    this.stealing = false;
    this.pitch = 60;
    this.age = 0;
    this.S = 0.5;
    this.zPrev = 0;
    this.zPrev2 = 0;
    this.rho = 0.99;
    this.rho2 = 0.99;
    this.releaseRho = 0.9;
    this.gain = 1;
    this.fade = 1;
    this.fadeStep = 0;
    this.silent = 0;
    this.envLevel = 0;
    this.delay = 0;
    this.click = 0;
    this.clickCoef = Math.exp(-1 / (0.002 * sr));
    this.clickHp = new OnePole(sr);
    this.clickHp.set(2500);
    this.squeak = 0;
    this.squeakCoef = Math.exp(-1 / (0.012 * sr));
    this.squeakBp = new Biquad(designBiquad('bandpass', 1400, 1.2, 0, sr));
    this.dc = new DcBlocker(sr);
    this.lowpass = new OnePole(sr);
    this.pan = 0;
    this.glide = 0;
    this.glideCoef = Math.exp(-1 / (Math.max(0.005, p.glideTime) * sr));
    this.buzzTh = 1;
  }

  level() {
    return this.envLevel * this.fade;
  }

  /**
   * @param {number} pitch
   * @param {number} velocity
   * @param {PluckNoteOptions} [extra]
   */
  noteOn(pitch, velocity, extra = {}) {
    const p = this.p;
    const sr = this.sr;
    this.active = true;
    this.released = false;
    this.stealing = false;
    this.pitch = pitch;
    const hz = Math.max(MIN_FREQ, pitchToHz(pitch + ((extra.detuneCents ?? 0) + vary(this.rng, 2)) / 100));
    // Loop filter: y = (1−S)·x[n] + S·x[n−1] (delay S); S = 0.5 is the classic averager (darkest).
    this.S = 0.5 - 0.45 * clamp(p.brightness, 0, 1);
    this.period = sr / hz;
    this.period2 = this.period / centsToRatio(p.polarDetune);
    // Decay: higher notes ring shorter (≈ 1/√f relative to C3).
    const t60 = p.decay * Math.sqrt(130.8 / hz) * (1 + vary(this.rng, 0.08));
    this.rho = 10 ** (-3 / (t60 * hz));
    this.rho2 = 10 ** (-3 / (t60 * 0.8 * hz));
    this.releaseRho = 10 ** (-3 / (Math.max(0.02, p.releaseDecay) * hz));
    // Tension glide: a hard pluck stretches the string, so it starts sharp and settles.
    this.glide = p.glide * (0.3 + 0.7 * velocity);
    this.buzzTh = p.buzz > 0 ? 0.85 - 0.45 * velocity : 2;

    // Excitation: blend of noise and a smooth triangular displacement, low-passed
    // by velocity, then a pick-position comb (removes harmonics at nodes).
    const len = Math.min(this.maxLen - 1, Math.round(this.period));
    const tone = clamp(p.excitationTone * (0.55 + 0.45 * velocity), 0.02, 1);
    this.lowpass.set(200 + tone * tone * 0.45 * sr);
    this.lowpass.reset();
    const soft = clamp(p.softness, 0, 1);
    for (let i = 0; i < len; i++) {
      const tri = 1 - Math.abs((2 * i) / len - 1); // 0 → 1 → 0
      const x = (1 - soft) * this.noise.white() + soft * (tri - 0.5) * 2;
      this.exc[i] = this.lowpass.lowpass(x);
    }
    const pickOffset = Math.max(1, Math.round(clamp(p.pickPosition, 0.02, 0.5) * len));
    let mean = 0;
    for (let i = len - 1; i >= 0; i--) {
      this.exc[i] -= i >= pickOffset ? this.exc[i - pickOffset] : 0;
      mean += this.exc[i];
    }
    mean /= len;
    let peak = 1e-9;
    for (let i = 0; i < len; i++) {
      this.exc[i] -= mean;
      peak = Math.max(peak, Math.abs(this.exc[i]));
    }
    // Load the rings so that reading `period` samples back starts the excitation.
    const m = this.mask;
    this.buf.fill(0);
    this.buf2.fill(0);
    for (let i = 0; i < len; i++) {
      const v = this.exc[i] / peak;
      this.buf[(this.w - len + i) & m] = v;
      this.buf2[(this.w - len + i) & m] = v * 0.8;
    }
    const sens = p.velocity;
    this.gain = (1 - sens + sens * velocity ** 1.4) * dbToGain(p.gainDb);
    this.zPrev = 0;
    this.zPrev2 = 0;
    this.fade = 1;
    this.fadeStep = 0;
    this.silent = 0;
    this.envLevel = 1;
    this.delay = extra.delaySamples ?? 0;
    this.click = p.pickNoise * (0.4 + 0.6 * velocity);
    this.squeak = 0;
    this.pan = extra.pan ?? 0;
  }

  noteOff() {
    this.released = true;
    this.rho = this.releaseRho;
    this.rho2 = this.releaseRho;
    // Finger or palm touching the string to stop it.
    this.squeak = this.p.releaseNoise * Math.min(1, this.envLevel * 2);
  }

  steal() {
    this.released = true;
    this.stealing = true;
    this.fadeStep = 1 / (0.004 * this.sr);
  }

  /**
   * Hermite read `d` samples back from the write position (d ≥ 2).
   * @param {Float32Array} b
   * @param {number} d
   */
  read(b, d) {
    const m = this.mask;
    const i = Math.floor(d);
    const f = d - i;
    const base = this.w - i;
    const xm1 = b[(base + 1) & m];
    const x0 = b[base & m];
    const x1 = b[(base - 1) & m];
    const x2 = b[(base - 2) & m];
    const c1 = 0.5 * (x1 - xm1);
    const c2 = xm1 - 2.5 * x0 + 2 * x1 - 0.5 * x2;
    const c3 = 0.5 * (x2 - xm1) + 1.5 * (x0 - x1);
    return ((c3 * f + c2) * f + c1) * f + x0;
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  render(L, R, start, end) {
    const p = this.p;
    const S = this.S;
    const m = this.mask;
    const polar = p.polarMix;
    const buzz = p.buzz;
    const th = this.buzzTh;
    const pickup = p.pickup;
    const gl = this.gain * (1 - Math.max(0, this.pan));
    const gr = this.gain * (1 + Math.min(0, this.pan));
    for (let i = start; i < end; i++) {
      if (this.delay > 0) {
        this.delay--;
        continue;
      }
      const ratio = this.glide > 0.01 ? 2 ** (this.glide / 1200) : 1;
      this.glide *= this.glideCoef;
      const d1 = Math.max(2, this.period / ratio - S);
      const z = this.read(this.buf, d1);
      const lf = (1 - S) * z + S * this.zPrev;
      this.zPrev = z;
      let y = lf * this.rho;
      // Fret / fingerboard buzz: large displacements are clipped on one side.
      if (y > th) y = th + (y - th) * (1 - buzz);
      this.buf[this.w & m] = y;
      let out = z;
      if (polar > 0) {
        const z2 = this.read(this.buf2, Math.max(2, this.period2 / ratio - S));
        const lf2 = (1 - S) * z2 + S * this.zPrev2;
        this.zPrev2 = z2;
        this.buf2[this.w & m] = lf2 * this.rho2;
        out += polar * z2;
      }
      // Magnetic pickup: the string seen from a point near the bridge (comb filter).
      if (pickup > 0) out -= this.read(this.buf, Math.max(2, d1 * (1 - pickup)));
      this.w = (this.w + 1) & m;

      out = this.dc.process(out);
      if (this.click > 1e-4) {
        out += this.clickHp.highpass(this.noise.white()) * this.click;
        this.click *= this.clickCoef;
      }
      if (this.squeak > 1e-4) {
        out += this.squeakBp.process(this.noise.white()) * this.squeak;
        this.squeak *= this.squeakCoef;
      }
      if (this.fadeStep > 0) {
        this.fade -= this.fadeStep;
        if (this.fade <= 0) {
          this.fade = 0;
          this.active = false;
          this.stealing = false;
          break;
        }
      }
      out *= this.fade;
      L[i] += out * gl;
      R[i] += out * gr;
      // Track the level to end the voice once the string is silent.
      const a = z < 0 ? -z : z;
      this.envLevel = Math.max(a, this.envLevel * 0.9995);
      if (this.envLevel < 2e-5 && this.squeak < 1e-4) {
        if (++this.silent > 512) {
          this.active = false;
          break;
        }
      } else this.silent = 0;
    }
  }
}

/** Parallel band-pass body resonator mixed with the dry string. */
class Body {
  /**
   * @param {[number, number, number][]} resonances
   * @param {number} mix
   * @param {number} sampleRate
   */
  constructor(resonances, mix, sampleRate) {
    this.mix = mix;
    this.bands = resonances.map(([hz, q, gainDb]) => {
      const c = designBiquad('bandpass', hz, q, 0, sampleRate);
      return { l: new Biquad(c), r: new Biquad(c), g: dbToGain(gainDb) };
    });
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  process(L, R, start, end) {
    const m = this.mix;
    for (let i = start; i < end; i++) {
      let bl = 0;
      let br = 0;
      for (const b of this.bands) {
        bl += b.l.process(L[i]) * b.g;
        br += b.r.process(R[i]) * b.g;
      }
      L[i] = L[i] * (1 - 0.5 * m) + bl * m;
      R[i] = R[i] * (1 - 0.5 * m) + br * m;
    }
  }
}

/** Plays `section` strings per note, slightly detuned and spread in time. */
class PluckInstrument extends PolyInstrument {
  /**
   * @param {ReturnType<typeof withDefaults>} preset
   * @param {(index: number) => PluckVoice} createVoice
   * @param {ConstructorParameters<typeof PolyInstrument>[2]} options
   * @param {number} sampleRate
   */
  constructor(preset, createVoice, options, sampleRate) {
    super(preset, createVoice, options);
    this.section = preset.section;
    this.sampleRate = sampleRate;
  }

  /**
   * @param {number} pitch
   * @param {number} velocity
   * @param {import('./voice-pool.js').NoteOptions} [options]
   */
  noteOn(pitch, velocity, options = {}) {
    const n = this.section;
    if (n <= 1) {
      super.noteOn(pitch, velocity, options);
      return;
    }
    for (let k = 0; k < n; k++) {
      const pos = k / (n - 1) - 0.5;
      /** @type {PluckNoteOptions} */
      const extra = { ...options, detuneCents: pos * 10, delaySamples: Math.round(k * 0.009 * this.sampleRate), pan: pos * 0.8 };
      super.noteOn(pitch, velocity * (k === 0 ? 1 : 0.85), extra);
    }
  }
}

/**
 * @param {PluckPreset} preset
 * @param {import('./context.js').SynthContext} ctx
 * @param {import('../core/prng.js').Rng} rng
 */
export function createPluck(preset, ctx, rng) {
  const p = withDefaults(preset);
  const body = p.body.length > 0 ? new Body(p.body, p.bodyMix, ctx.sampleRate) : null;
  return new PluckInstrument(
    p,
    (i) => new PluckVoice(p, ctx, rng.fork(`voice${i}`)),
    { polyphony: p.polyphony * p.section, post: body },
    ctx.sampleRate,
  );
}
