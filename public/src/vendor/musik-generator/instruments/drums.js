// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Synthesized drum kits. Each kit maps MIDI notes to parametric drum parts;
 * one universal drum voice renders any part type:
 *  - kick / tom / boom: sine with exponential pitch drop, click transient, drive
 *  - snare: pitched body + high-passed noise ("snappy")
 *  - clap: several short noise bursts followed by a band-passed tail
 *  - hat / cymbal: cluster of inharmonic band-limited squares + noise, band- and high-passed
 *  - shaker, rim
 *  - impact: cinematic hit (sub boom + darkening noise burst)
 *  - riser: tension sweep over the note's duration (noise band + rising saw)
 * Choke groups let a closed hi-hat cut an open one. Every hit varies slightly.
 */

import { BlepOscillator } from '../dsp/oscillators.js';
import { DecayEnvelope } from '../dsp/envelope.js';
import { Svf, OnePole } from '../dsp/filters.js';
import { NoiseSource } from '../dsp/noise.js';
import { TWO_PI, dbToGain, softClip, pitchToHz, clamp } from '../dsp/util.js';
import { PolyInstrument, vary } from './voice-pool.js';

const TYPE = Object.freeze({ kick: 0, snare: 1, clap: 2, hat: 3, tom: 4, cymbal: 5, shaker: 6, rim: 7, impact: 8, riser: 9 });

/**
 * @typedef {object} DrumPart
 * @property {keyof typeof TYPE} type
 * @property {number} [level] linear gain (default 1)
 * @property {number} [pan] -1…1
 * @property {number} [choke] choke group id
 * @property {number} [startHz] kick/tom/impact pitch at the hit
 * @property {number} [endHz] kick/tom/impact resting pitch; riser end band frequency
 * @property {number} [pitchDecay] seconds (time constant of the pitch drop)
 * @property {number} [decay] T60 of the main amplitude envelope
 * @property {number} [click] transient level
 * @property {number} [clickHz]
 * @property {number} [drive] saturation (1 = clean)
 * @property {number} [toneHz] snare/rim body pitch
 * @property {number} [toneDecay]
 * @property {number} [noise] noise level (snare snappy, tom, cymbal)
 * @property {number} [noiseDecay]
 * @property {number} [hpHz] high-pass
 * @property {number} [bpHz] band-pass centre
 * @property {number} [q]
 * @property {number} [baseHz] hat/cymbal oscillator cluster base
 * @property {number} [bursts] clap bursts
 * @property {number} [spacing] clap burst spacing in seconds
 * @property {number} [attack] shaker attack in seconds
 * @property {number} [sweep] riser saw sweep in semitones
 * @property {{ hz: number, short?: boolean }} [lfsr] 8-bit-style shift-register noise instead of white noise (clock rate in Hz)
 */

/**
 * @typedef {object} DrumKitPreset
 * @property {'drums'} engine
 * @property {string} [id]
 * @property {Record<string, DrumPart>} parts MIDI note number → part
 * @property {number} [polyphony]
 * @property {number} [tone] kit low-pass in Hz (lo-fi darkness), 0 = off
 * @property {number} [gainDb]
 */

/** Inharmonic ratios for the metallic oscillator cluster (own choice). */
const METAL_RATIOS = [1, 1.3973, 1.6489, 1.9031, 2.4562, 2.8817];

class DrumVoice {
  /**
   * @param {Required<Pick<DrumKitPreset, 'parts'>> & DrumKitPreset} kit
   * @param {import('./context.js').SynthContext} ctx
   * @param {import('../core/prng.js').Rng} rng
   */
  constructor(kit, ctx, rng) {
    const sr = ctx.sampleRate;
    this.kit = kit;
    this.sr = sr;
    this.rng = rng;
    this.noise = new NoiseSource(rng.fork('noise'));
    this.lfsrRate = 0;
    this.lfsrShort = false;
    this.amp = new DecayEnvelope(sr);
    this.env2 = new DecayEnvelope(sr);
    this.f1 = new Svf(sr);
    this.f2 = new Svf(sr);
    this.lp = new OnePole(sr);
    this.metal = METAL_RATIOS.map(() => {
      const o = new BlepOscillator(sr);
      o.setWave('square');
      return o;
    });
    this.saw = new BlepOscillator(sr);
    this.saw.setWave('saw');
    this.active = false;
    this.released = false;
    this.stealing = false;
    this.pitch = 0;
    this.age = 0;
    this.type = 0;
    /** @type {DrumPart} */
    this.part = { type: 'kick' };
    this.phase = 0;
    this.pitchEnv = 0;
    this.pitchCoef = 0;
    this.startHz = 0;
    this.endHz = 0;
    this.gain = 1;
    this.gl = 1;
    this.gr = 1;
    this.click = 0;
    this.clickCoef = 0;
    this.t = 0;
    this.dur = 0;
    this.burstsLeft = 0;
    this.nextBurst = 0;
    this.fade = 1;
    this.fadeStep = 0;
    this.drive = 1;
    this.driveNorm = 1;
  }

  level() {
    return Math.max(this.amp.value, this.env2.value) * this.fade;
  }

  /**
   * @param {number} pitch MIDI note (selects the part)
   * @param {number} velocity
   * @param {import('./voice-pool.js').NoteOptions} options
   */
  /** Noise sample: white, or shift-register noise for chip kits. */
  #nz() {
    return this.lfsrRate > 0 ? this.noise.lfsr(this.lfsrRate, this.lfsrShort) : this.noise.white();
  }

  noteOn(pitch, velocity, options) {
    const part = this.kit.parts[String(Math.round(pitch))];
    if (!part) return;
    const sr = this.sr;
    const rng = this.rng;
    this.part = part;
    this.type = TYPE[part.type];
    this.lfsrRate = part.lfsr ? part.lfsr.hz / sr : 0;
    this.lfsrShort = !!part.lfsr?.short;
    this.active = true;
    this.released = false;
    this.stealing = false;
    this.pitch = pitch;
    this.t = 0;
    this.fade = 1;
    this.fadeStep = 0;
    const vel = clamp(velocity, 0, 1);
    const tune = 1 + vary(rng, 0.012);
    const dec = (/** @type {number} */ d) => d * (1 + vary(rng, 0.06)) * (0.75 + 0.25 * vel);
    this.gain = (part.level ?? 1) * vel ** 1.25;
    const pan = part.pan ?? 0;
    this.gl = 1 - Math.max(0, pan);
    this.gr = 1 + Math.min(0, pan);
    this.drive = part.drive ?? 1;
    this.driveNorm = 1 / softClip(this.drive);
    this.phase = 0;
    this.click = 0;
    switch (this.type) {
      case TYPE.kick:
      case TYPE.tom:
      case TYPE.impact: {
        this.startHz = (part.startHz ?? 160) * tune;
        this.endHz = (part.endHz ?? 50) * tune;
        this.pitchEnv = 1;
        this.pitchCoef = Math.exp(-1 / ((part.pitchDecay ?? 0.04) * sr));
        this.amp.trigger(1, dec(part.decay ?? 0.5), 0.0008);
        this.click = (part.click ?? 0) * vel;
        this.clickCoef = Math.exp(-1 / (0.0025 * sr));
        this.f1.setMode('bandpass');
        this.f1.set(part.clickHz ?? 3500, 0.8);
        if (part.noise) {
          this.env2.trigger(part.noise, dec(part.noiseDecay ?? 0.2), 0.0005);
          this.f2.setMode('lowpass');
          this.f2.set(part.bpHz ?? 6000, 0.6);
        } else this.env2.trigger(0, 0.01);
        this.lp.set(part.hpHz ?? 8000);
        break;
      }
      case TYPE.snare:
        this.startHz = (part.toneHz ?? 190) * 1.5 * tune;
        this.endHz = (part.toneHz ?? 190) * tune;
        this.pitchEnv = 1;
        this.pitchCoef = Math.exp(-1 / (0.015 * sr));
        this.amp.trigger(1, dec(part.toneDecay ?? 0.15), 0.0005);
        this.env2.trigger(part.noise ?? 0.8, dec(part.noiseDecay ?? 0.22), 0.0005);
        this.f1.setMode('highpass');
        this.f1.set((part.hpHz ?? 1500) * (0.8 + 0.4 * vel), 0.7);
        this.f2.setMode('peak');
        this.f2.set(part.bpHz ?? 5000, 0.9);
        break;
      case TYPE.clap:
        this.burstsLeft = Math.max(0, (part.bursts ?? 4) - 1);
        this.nextBurst = Math.round((part.spacing ?? 0.009) * sr);
        this.env2.trigger(1, 0.012, 0.0003);
        this.amp.trigger(0, 0.01);
        this.f1.setMode('bandpass');
        this.f1.set((part.bpHz ?? 1200) * tune, part.q ?? 1.4);
        break;
      case TYPE.hat:
      case TYPE.cymbal: {
        const base = (part.baseHz ?? 330) * tune;
        this.metal.forEach((o, k) => {
          o.setFrequency(base * METAL_RATIOS[k]);
          o.reset(rng.float());
        });
        this.amp.trigger(1, dec(part.decay ?? 0.06), this.type === TYPE.cymbal ? 0.002 : 0.0004);
        this.env2.trigger(part.noise ?? 0.3, dec(part.decay ?? 0.06) * 0.8, 0.0004);
        this.f1.setMode('bandpass');
        this.f1.set((part.bpHz ?? 9000) * (0.9 + 0.2 * vel), part.q ?? 0.9);
        this.f2.setMode('highpass');
        this.f2.set(part.hpHz ?? 6500, 0.7);
        break;
      }
      case TYPE.shaker:
        this.amp.trigger(1, dec(part.decay ?? 0.09), part.attack ?? 0.012);
        this.f1.setMode('bandpass');
        this.f1.set(part.bpHz ?? 6500, part.q ?? 1.5);
        this.env2.trigger(0, 0.01);
        break;
      case TYPE.rim:
        this.startHz = (part.toneHz ?? 1700) * tune;
        this.endHz = this.startHz;
        this.pitchEnv = 0;
        this.amp.trigger(1, dec(part.decay ?? 0.035), 0.0002);
        this.env2.trigger(0.5, 0.02, 0.0002);
        this.f1.setMode('bandpass');
        this.f1.set(part.bpHz ?? 2500, 2);
        break;
      case TYPE.riser: {
        this.dur = Math.max(0.25, options.durationSec ?? 4);
        this.startHz = part.startHz ?? 250;
        this.endHz = part.endHz ?? 9000;
        this.saw.setFrequency(pitchToHz(pitch));
        this.saw.reset(0);
        this.f1.setMode('bandpass');
        this.f1.set(this.startHz, part.q ?? 2);
        this.amp.trigger(0, 1);
        this.env2.trigger(0, 1);
        break;
      }
      default:
        this.active = false;
    }
  }

  noteOff() {
    this.released = true;
  }

  steal() {
    this.released = true;
    this.stealing = true;
    this.fadeStep = 1 / (0.004 * this.sr);
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  render(L, R, start, end) {
    const sr = this.sr;
    const type = this.type;
    const part = this.part;
    for (let i = start; i < end; i++) {
      let y = 0;
      switch (type) {
        case TYPE.kick:
        case TYPE.tom:
        case TYPE.impact: {
          const hz = this.endHz + (this.startHz - this.endHz) * this.pitchEnv;
          this.pitchEnv *= this.pitchCoef;
          this.phase += hz / sr;
          if (this.phase >= 1) this.phase -= 1;
          y = Math.sin(TWO_PI * this.phase) * this.amp.next();
          if (this.click > 1e-4) {
            y += this.f1.process(this.#nz()) * this.click * 3;
            this.click *= this.clickCoef;
          }
          const n2 = this.env2.next();
          if (n2 > 0) {
            if (type === TYPE.impact) {
              // Darkening burst: the low-pass closes as the noise decays.
              this.f2.set(150 + (part.bpHz ?? 6000) * n2, 0.6);
            }
            y += this.f2.process(this.#nz()) * n2;
          }
          if (this.drive !== 1) y = softClip(y * this.drive) * this.driveNorm;
          break;
        }
        case TYPE.snare: {
          const hz = this.endHz + (this.startHz - this.endHz) * this.pitchEnv;
          this.pitchEnv *= this.pitchCoef;
          this.phase += hz / sr;
          if (this.phase >= 1) this.phase -= 1;
          const body = Math.sin(TWO_PI * this.phase) * this.amp.next();
          const nz = this.f2.process(this.f1.process(this.#nz())) * this.env2.next();
          y = body * 0.8 + nz;
          break;
        }
        case TYPE.clap: {
          if (this.burstsLeft > 0 && --this.nextBurst <= 0) {
            this.burstsLeft--;
            if (this.burstsLeft === 0) this.env2.trigger(1, part.decay ?? 0.2, 0.0003);
            else this.env2.trigger(0.9, 0.012, 0.0003);
            this.nextBurst = Math.round((part.spacing ?? 0.009) * sr);
          }
          y = this.f1.process(this.#nz()) * this.env2.next() * 2;
          break;
        }
        case TYPE.hat:
        case TYPE.cymbal: {
          let m = 0;
          for (let k = 0; k < 6; k++) m += this.metal[k].next();
          const metal = this.f1.process(m / 6) * this.amp.next();
          const nz = this.#nz() * this.env2.next();
          y = this.f2.process(metal + nz * 0.5) * 1.5;
          break;
        }
        case TYPE.shaker:
          y = this.f1.process(this.#nz()) * this.amp.next() * 1.5;
          break;
        case TYPE.rim: {
          this.phase += this.startHz / sr;
          if (this.phase >= 1) this.phase -= 1;
          y = Math.sin(TWO_PI * this.phase) * this.amp.next() * 0.6 + this.f1.process(this.#nz()) * this.env2.next();
          break;
        }
        case TYPE.riser: {
          // Rises over the note's duration, then fades out in 30 ms.
          const x = this.t / (this.dur * sr);
          if (x < 1 && (this.t & 15) === 0) {
            this.f1.set(this.startHz * (this.endHz / this.startHz) ** x, part.q ?? 2);
            this.saw.setFrequency(pitchToHz(this.pitch + (part.sweep ?? 24) * x));
          }
          const a = x < 1 ? x * x : 1;
          y = (this.f1.process(this.#nz()) * 1.4 + this.saw.next() * 0.25) * a;
          if (x >= 1 && this.fadeStep === 0) this.fadeStep = 1 / (0.03 * sr);
          break;
        }
        default:
          break;
      }
      this.t++;
      if (this.fadeStep > 0) {
        this.fade -= this.fadeStep;
        if (this.fade <= 0) {
          this.active = false;
          this.stealing = false;
          break;
        }
        y *= this.fade;
      }
      const g = this.gain;
      L[i] += y * g * this.gl;
      R[i] += y * g * this.gr;
      if (type !== TYPE.riser && this.t > 64 && !this.amp.active && !this.env2.active && this.burstsLeft === 0 && this.click < 1e-4) {
        this.active = false;
        break;
      }
    }
  }
}

class DrumKit extends PolyInstrument {
  /**
   * @param {number} pitch
   * @param {number} velocity
   * @param {import('./voice-pool.js').NoteOptions} [options]
   */
  noteOn(pitch, velocity, options = {}) {
    const kit = /** @type {DrumKitPreset} */ (this.preset);
    const part = kit.parts[String(Math.round(pitch))];
    if (!part) return;
    if (part.choke !== undefined) {
      for (const v of this.voices) {
        const dv = /** @type {DrumVoice} */ (/** @type {unknown} */ (v));
        if (v.active && !v.stealing && dv.part.choke === part.choke) v.steal();
      }
    }
    super.noteOn(pitch, velocity, options);
  }

  /** Drum hits ring out regardless of note-off (except risers, which time themselves). */
  noteOff() {}
}

/** Stereo low-pass for darker kits (lo-fi). */
class KitTone {
  /**
   * @param {number} hz
   * @param {number} sampleRate
   */
  constructor(hz, sampleRate) {
    this.l = new OnePole(sampleRate);
    this.r = new OnePole(sampleRate);
    this.l.set(hz);
    this.r.set(hz);
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  process(L, R, start, end) {
    for (let i = start; i < end; i++) {
      L[i] = this.l.lowpass(L[i]);
      R[i] = this.r.lowpass(R[i]);
    }
  }
}

/**
 * @param {DrumKitPreset} preset
 * @param {import('./context.js').SynthContext} ctx
 * @param {import('../core/prng.js').Rng} rng
 */
export function createDrumKit(preset, ctx, rng) {
  const gain = dbToGain(preset.gainDb ?? 0);
  const parts = Object.fromEntries(Object.entries(preset.parts).map(([k, part]) => [k, { ...part, level: (part.level ?? 1) * gain }]));
  const kit = { polyphony: 16, ...preset, parts };
  const post = kit.tone ? new KitTone(kit.tone, ctx.sampleRate) : null;
  return new DrumKit(kit, (i) => new DrumVoice(kit, ctx, rng.fork(`voice${i}`)), { polyphony: kit.polyphony, post });
}
