// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Spectral modelling of sustained instruments (strings, winds, brass, choir,
 * organ): a harmonic source with a dynamic spectral envelope (tilt per
 * dynamic level, fixed body/bell resonances or vowel formants, odd/even
 * balance, bow-position comb, mutes), rendered from alias-free wavetables
 * built per note, dynamic level, vowel and articulation, and crossfaded
 * continuously as the playing dynamic changes. The sound comes alive through
 * what players do: section players with their own detune, vibrato and onset;
 * pitch jitter and amplitude shimmer; brass scoops and blooming brightness;
 * breath, bow and key noise; legato glides; articulations (spiccato,
 * tremolo, sul ponticello, col legno, staccato, accents, stopped brass) and
 * scat syllables with consonants and vowel glides.
 *
 * Refs: X. Serra & J. O. Smith, "Spectral Modeling Synthesis", CMJ 14(4), 1990
 * (deterministic + stochastic parts); J. C. Risset & M. V. Mathews, "Analysis
 * of musical-instrument tones", Physics Today 22(2), 1969 (brass brightness
 * grows with level); J. Meyer, Acoustics and the Performance of Music,
 * Springer 2009 (formant regions of orchestral instruments); G. E. Peterson &
 * H. L. Barney, JASA 24(2), 1952 (vowel formant frequencies).
 */

import { Adsr } from '../dsp/envelope.js';
import { NoiseSource } from '../dsp/noise.js';
import { Svf } from '../dsp/filters.js';
import { Fft } from '../dsp/fft.js';
import { CONTROL_INTERVAL, pitchToHz, dbToGain, t60Coef } from '../dsp/util.js';
import { PolyInstrument, vary } from './voice-pool.js';

const TABLE_SIZE = 2048;
const MAX_HARMONIC = TABLE_SIZE / 2 - 1;

/**
 * @typedef {[hz: number, gainDb: number, bandwidthHz: number]} Formant
 *
 * @typedef {object} SpectrumSpec
 * @property {number[]} tilt spectral slope in dB/octave per dynamic level (e.g. [-14, -9, -5])
 * @property {number[]} [levelDb] overall level per dynamic level (default [-12, -5, 0])
 * @property {Formant[]} [formants] fixed resonances (body, bell, bore)
 * @property {Formant[]} [formantsLow] resonances for the low register (interpolated by pitch, e.g. cello vs violin body)
 * @property {[number, number]} [formantRange] MIDI pitches where formantsLow → formants (default [48, 64])
 * @property {Record<string, Formant[]>} [vowels] vowel formants (low voices)
 * @property {Record<string, Formant[]>} [vowelsHigh] vowel formants of high voices (interpolated by pitch)
 * @property {{ db: number, belowHz: number }} [even] attenuation of even harmonics in dB (cylindrical bore)
 * @property {number} [bowPos] bowing point as fraction of the string (comb of weak harmonics)
 * @property {number} [fundamentalDb] boost/cut of the first harmonic
 * @property {number} [lowCutHz] smooth high-pass of the spectrum (mutes)
 * @property {number} [highCutHz] smooth low-pass (bell, body, mute)
 * @property {Record<number, number>} [harmonics] explicit amplitudes (organ stops), replaces tilt
 * @property {'sine' | 'random'} [phases] default "random" (smooth, ensemble-like); "sine" = peaky (brass)
 *
 * @typedef {object} NoiseSpec breath/bow/air noise
 * @property {number} level
 * @property {number} freq band centre (× note frequency when `track` is set)
 * @property {number} [q]
 * @property {number} [track] 0…1 how much the band follows the note pitch
 * @property {number} [attack] extra burst at the onset (chiff, bow bite, tonguing)
 * @property {number} [attackDecay] seconds
 *
 * @typedef {object} Articulation overrides for one articulation
 * @property {import('../dsp/envelope.js').AdsrParams} [ampEnv]
 * @property {Partial<SpectrumSpec>} [spectrum]
 * @property {Partial<NoiseSpec>} [noise]
 * @property {number} [velocity] velocity factor (accents)
 * @property {number} [tremolo] repeated bow strokes per second (unsynchronised players)
 * @property {number} [scoop] cents
 * @property {number} [vibrato] factor on vibrato depth
 * @property {number} [length] factor on the note duration (offline: staccato shortening)
 *
 * @typedef {{ consonant?: { level: number, freq: number, q?: number, decay: number }, vowels: string[], morph?: number }} Syllable
 *
 * @typedef {object} SpectralPreset
 * @property {'spectral'} engine
 * @property {string} [id]
 * @property {SpectrumSpec} spectrum
 * @property {number[]} [dynamics] dynamic value of each table level (default [0.2, 0.55, 1])
 * @property {import('../dsp/envelope.js').AdsrParams} ampEnv
 * @property {number} [dynAttack] lag of the brightness behind the amplitude (s; brass bloom)
 * @property {number} [dynVelocity] how strongly velocity sets the dynamic (default 0.8)
 * @property {{ rate: number, depth: number, delay?: number, fade?: number }} [vibrato] cents
 * @property {number} [jitter] slow random pitch deviation in cents
 * @property {number} [shimmer] slow random amplitude deviation (0…1)
 * @property {{ cents: number, time: number }} [scoop] pitch approach at the onset
 * @property {NoiseSpec} [noise]
 * @property {{ voices: number, detune: number, spread?: number, onset?: number }} [ensemble] section players
 * @property {boolean} [mono] monophonic legato with glide
 * @property {number} [glide] seconds
 * @property {string} [vowel] default vowel
 * @property {Syllable[]} [syllables] scat: one syllable per note (cycled with variation)
 * @property {string} [articulation] default articulation
 * @property {Record<string, Articulation>} [articulations]
 * @property {number} [polyphony]
 * @property {number} [gainDb]
 */

const DEFAULT_ARTICULATIONS = Object.freeze(
  /** @type {Record<string, Articulation>} */ ({
    staccato: { ampEnv: { a: 0.01, d: 0.18, s: 0, r: 0.08 }, length: 0.5 },
    accent: { velocity: 1.25 },
    marcato: { velocity: 1.3, ampEnv: { a: 0.008, d: 0.4, s: 0.6, r: 0.25 } },
    legato: {},
  }),
);

/** Deterministic pseudo-random phase per harmonic (identical for all tables of an instrument). */
const phaseOf = (/** @type {number} */ h) => {
  let x = Math.imul(h + 1, 0x9e3779b1) >>> 0;
  x ^= x >>> 15;
  x = Math.imul(x, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  return (x / 4294967296) * 2 * Math.PI;
};

/**
 * Linear amplitude factor of a set of resonances at frequency f.
 * @param {Formant[]} formants
 * @param {number} f
 */
function formantGain(formants, f) {
  let g = 1;
  for (const [fc, db, bw] of formants) {
    const x = (f - fc) / (bw / 2);
    g *= 1 + (dbToGain(db) - 1) / (1 + x * x);
  }
  return g;
}

/**
 * @param {Formant[]} a
 * @param {Formant[]} b
 * @param {number} t 0 → a, 1 → b
 * @returns {Formant[]}
 */
function lerpFormants(a, b, t) {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return a.map((fa, i) => {
    const fb = b[i] ?? fa;
    return [fa[0] + (fb[0] - fa[0]) * t, fa[1] + (fb[1] - fa[1]) * t, fa[2] + (fb[2] - fa[2]) * t];
  });
}

/**
 * Wavetable cache of one instrument: one table per (articulation, vowel, pitch, level).
 */
class TableCache {
  /**
   * @param {ReturnType<typeof withDefaults>} p
   * @param {number} sampleRate
   */
  constructor(p, sampleRate) {
    this.p = p;
    this.sr = sampleRate;
    this.fft = new Fft(TABLE_SIZE);
    /** @type {Map<string, Float32Array>} */
    this.tables = new Map();
    this.re = new Float64Array(TABLE_SIZE);
    this.im = new Float64Array(TABLE_SIZE);
  }

  /**
   * @param {string} art
   * @param {string} vowel
   * @param {number} pitch integer MIDI pitch
   * @param {number} level index into p.dynamics
   */
  get(art, vowel, pitch, level) {
    const key = `${art}|${vowel}|${pitch}|${level}`;
    let t = this.tables.get(key);
    if (!t) {
      t = this.#build(art, vowel, pitch, level);
      this.tables.set(key, t);
    }
    return t;
  }

  /**
   * @param {string} art
   * @param {string} vowel
   * @param {number} pitch
   * @param {number} level
   */
  #build(art, vowel, pitch, level) {
    const p = this.p;
    const spec = { ...p.spectrum, ...(p.articulations[art]?.spectrum ?? {}) };
    const f0 = pitchToHz(pitch);
    // Leave room for vibrato, scoops and glides up to a whole tone.
    const harmonics = Math.max(1, Math.min(MAX_HARMONIC, Math.floor((this.sr * 0.46) / (f0 * 1.13))));
    const tilt = spec.tilt[Math.min(level, spec.tilt.length - 1)];
    const levelDb = (spec.levelDb ?? [-12, -5, 0])[Math.min(level, (spec.levelDb ?? [0, 0, 0]).length - 1)];
    // Pitch-dependent resonances: body registers and voice types.
    const [lo, hi] = spec.formantRange ?? [48, 64];
    const reg = Math.min(1, Math.max(0, (pitch - lo) / (hi - lo)));
    let formants = spec.formants ?? [];
    if (spec.formantsLow) formants = lerpFormants(spec.formantsLow, formants, reg);
    if (spec.vowels) {
      const v = spec.vowels[vowel] ?? Object.values(spec.vowels)[0];
      const vh = spec.vowelsHigh?.[vowel];
      formants = [...formants, ...(vh ? lerpFormants(v, vh, reg) : v)];
    }
    const re = this.re;
    const im = this.im;
    re.fill(0);
    im.fill(0);
    const half = TABLE_SIZE / 2;
    const random = (spec.phases ?? 'random') === 'random';
    for (let h = 1; h <= harmonics; h++) {
      const f = h * f0;
      let a = spec.harmonics ? spec.harmonics[h] ?? 0 : h ** (tilt / 6.0206);
      if (a === 0) continue;
      if (formants.length) a *= formantGain(formants, f);
      if (spec.even && h % 2 === 0 && f < spec.even.belowHz) a *= dbToGain(spec.even.db);
      if (h === 1 && spec.fundamentalDb) a *= dbToGain(spec.fundamentalDb);
      if (spec.bowPos && h >= 1 / (2 * spec.bowPos)) a *= 0.3 + 0.7 * Math.sqrt(Math.abs(Math.sin(Math.PI * h * spec.bowPos)));
      if (spec.lowCutHz) a *= 1 / Math.sqrt(1 + (spec.lowCutHz / f) ** 4);
      if (spec.highCutHz) a *= 1 / Math.sqrt(1 + (f / spec.highCutHz) ** 4);
      // Fade out the top harmonics so table switches never click.
      if (h > harmonics * 0.85) a *= (harmonics - h + 1) / (harmonics * 0.15 + 1);
      const phi = random ? phaseOf(h) : 0;
      re[h] = a * half * Math.sin(phi);
      im[h] = -a * half * Math.cos(phi);
      re[TABLE_SIZE - h] = re[h];
      im[TABLE_SIZE - h] = -im[h];
    }
    this.fft.inverse(re, im);
    const table = new Float32Array(TABLE_SIZE + 1);
    const g = dbToGain(levelDb) * 0.25;
    for (let i = 0; i < TABLE_SIZE; i++) table[i] = re[i] * g;
    table[TABLE_SIZE] = table[0];
    return table;
  }
}

/** @param {SpectralPreset} p */
function withDefaults(p) {
  return {
    dynamics: [0.2, 0.55, 1],
    dynAttack: 0.05,
    dynVelocity: 0.8,
    vibrato: { rate: 5.5, depth: 0, delay: 0.3, fade: 0.4 },
    jitter: 3,
    shimmer: 0.04,
    scoop: { cents: 0, time: 0.05 },
    noise: { level: 0, freq: 3000, q: 0.7, track: 0, attack: 0, attackDecay: 0.04 },
    ensemble: { voices: 1, detune: 0, spread: 0, onset: 0 },
    mono: false,
    glide: 0.06,
    vowel: 'a',
    articulation: '',
    polyphony: 12,
    gainDb: 0,
    ...p,
    articulations: { ...DEFAULT_ARTICULATIONS, ...(p.articulations ?? {}) },
  };
}

const MAX_PLAYERS = 8;

class SpectralVoice {
  /**
   * @param {ReturnType<typeof withDefaults>} p
   * @param {TableCache} cache
   * @param {import('./context.js').SynthContext} ctx
   * @param {import('../core/prng.js').Rng} rng
   */
  constructor(p, cache, ctx, rng) {
    this.p = p;
    this.cache = cache;
    this.sr = ctx.sampleRate;
    this.rng = rng;
    this.active = false;
    this.released = false;
    this.stealing = false;
    this.pitch = 60;
    this.age = 0;
    this.env = new Adsr(this.sr, p.ampEnv);
    this.noise = new NoiseSource(rng.fork('noise'));
    this.noiseFilter = new Svf(this.sr);
    this.noiseFilter.setMode('bandpass');
    this.consonantFilter = new Svf(this.sr);
    this.consonantFilter.setMode('bandpass');
    const n = Math.min(MAX_PLAYERS, Math.max(1, p.ensemble.voices));
    this.players = n;
    this.phase = new Float64Array(n);
    this.inc = new Float64Array(n);
    this.detune = new Float64Array(n);
    this.vibPhase = new Float64Array(n);
    this.vibRate = new Float64Array(n);
    this.jit = new Float64Array(n);
    this.jitTarget = new Float64Array(n);
    this.gL = new Float64Array(n);
    this.gR = new Float64Array(n);
    this.onset = new Float64Array(n);
    this.og = new Float64Array(n);
    this.trem = new Float64Array(n);
    this.tremInc = new Float64Array(n);
    /** @type {Float32Array[]} tables [vowelA lo, vowelA hi, vowelB lo, vowelB hi] */
    this.tabs = [];
    // The crossfade of the current tables (dynamic, vowel), rebuilt only when it changes audibly.
    this.blend = new Float32Array(TABLE_SIZE + 1);
    this.blendMix = -1;
    this.blendMorph = -1;
    /** @type {Float32Array[] | null} */
    this.blendTabs = null;
    this.tremGain = new Float64Array(n);
    this.mix = 0; // dynamic crossfade between lo and hi table
    this.morph = 0; // vowel A → B
    this.morphInc = 0;
    this.dyn = 0;
    this.dynTarget = 0;
    this.dynCoef = 0;
    this.velocity = 0.8;
    this.art = '';
    this.artSpec = /** @type {Articulation} */ ({});
    this.ctrl = 0;
    this.age2 = 0;
    this.notePitch = 60;
    this.glideFrom = 60;
    this.glideLeft = 0;
    this.glideTotal = 1;
    this.scoopCents = 0;
    this.scoopCoef = 0;
    this.noiseLevel = 0;
    this.noiseBurst = 0;
    this.noiseBurstCoef = 0;
    this.cons = 0;
    this.consCoef = 0;
    this.consLevel = 0;
    this.shim = 1;
    this.shimTarget = 1;
    this.tremRate = 0;
    this.out = 1;
    this.tablePitch = -1;
    this.vowelA = 'a';
    this.vowelB = 'a';
    this.syllable = 0;
    this.lengthLeft = -1;
  }

  levelEstimate() {
    return this.env.value * this.out;
  }

  /**
   * @param {number} pitch
   * @param {number} velocity
   * @param {import('./voice-pool.js').NoteOptions} [options]
   */
  noteOn(pitch, velocity, options = {}) {
    const p = this.p;
    const sr = this.sr;
    this.active = true;
    this.released = false;
    this.stealing = false;
    this.pitch = pitch;
    this.notePitch = pitch;
    this.glideLeft = 0;
    this.art = options.articulation && p.articulations[options.articulation] ? options.articulation : p.articulation;
    this.artSpec = p.articulations[this.art] ?? {};
    const a = this.artSpec;
    this.velocity = Math.min(1, velocity * (a.velocity ?? 1));
    this.env.set(a.ampEnv ?? p.ampEnv);
    this.env.gate();
    const ens = p.ensemble;
    for (let k = 0; k < this.players; k++) {
      // Players spread evenly around the pitch and across the stereo field.
      const pos = this.players === 1 ? 0 : (k / (this.players - 1)) * 2 - 1;
      this.detune[k] = pos * ens.detune * 0.5 + vary(this.rng, ens.detune * 0.3);
      const pan = pos * (ens.spread ?? 0);
      this.gL[k] = Math.sqrt(0.5 * (1 - pan));
      this.gR[k] = Math.sqrt(0.5 * (1 + pan));
      this.phase[k] = this.rng.float();
      this.vibPhase[k] = this.rng.float();
      this.vibRate[k] = (p.vibrato.rate * (1 + vary(this.rng, 0.12))) / sr;
      this.jit[k] = vary(this.rng, p.jitter);
      this.jitTarget[k] = this.jit[k];
      this.onset[k] = k === 0 ? 0 : Math.round(this.rng.float() * (ens.onset ?? 0) * sr);
      this.og[k] = this.onset[k] > 0 ? 0 : 1;
      // Section tremolo: players start nearly together and drift apart slowly.
      this.trem[k] = 0.15 * this.rng.float();
      this.tremInc[k] = ((a.tremolo ?? 0) * (0.96 + 0.08 * this.rng.float())) / sr;
    }
    this.tremRate = a.tremolo ?? 0;
    const dv = p.dynVelocity;
    this.dynTarget = Math.min(1, 1 - dv + dv * this.velocity);
    this.dyn = this.dynTarget * 0.4;
    this.dynCoef = Math.exp(-CONTROL_INTERVAL / (Math.max(0.005, p.dynAttack) * sr));
    const scoop = a.scoop ?? p.scoop.cents;
    this.scoopCents = scoop * (0.5 + 0.5 * this.velocity) * (1 + vary(this.rng, 0.3));
    this.scoopCoef = Math.exp(-CONTROL_INTERVAL / (Math.max(0.005, p.scoop.time) * sr));
    const noise = { ...p.noise, ...(a.noise ?? {}) };
    this.noiseLevel = noise.level;
    this.noiseBurst = noise.attack ?? 0;
    this.noiseBurstCoef = t60Coef(noise.attackDecay ?? 0.04, sr);
    const nf = noise.freq * (noise.track ? pitchToHz(pitch) / 261.6 : 1) ** (noise.track ?? 0);
    this.noiseFilter.set(nf, noise.q ?? 0.7);
    // Scat syllable: consonant burst and vowel glide.
    this.vowelA = p.vowel;
    this.vowelB = p.vowel;
    this.morph = 0;
    this.morphInc = 0;
    this.cons = 0;
    if (p.syllables?.length) {
      const syl = p.syllables[(this.syllable + (this.rng.float() < 0.35 ? 1 + Math.floor(this.rng.float() * (p.syllables.length - 1)) : 0)) % p.syllables.length];
      this.syllable++;
      this.vowelA = syl.vowels[0];
      this.vowelB = syl.vowels[syl.vowels.length - 1];
      this.morphInc = syl.vowels.length > 1 ? CONTROL_INTERVAL / ((syl.morph ?? 0.15) * sr) : 0;
      if (syl.consonant) {
        this.cons = 1;
        this.consLevel = syl.consonant.level;
        this.consCoef = t60Coef(syl.consonant.decay, sr);
        this.consonantFilter.set(syl.consonant.freq, syl.consonant.q ?? 1);
      }
    }
    this.tablePitch = -1;
    this.blendMix = -1;
    this.shim = 1;
    this.shimTarget = 1;
    this.out = dbToGain(p.gainDb) / Math.sqrt(this.players);
    this.lengthLeft = a.length && options.durationSec ? Math.round(options.durationSec * a.length * sr) : -1;
    this.ctrl = 0;
    this.age2 = 0;
  }

  /**
   * Mono legato: glide to a new pitch without a new attack.
   * @param {number} pitch
   * @param {number} velocity
   */
  legato(pitch, velocity) {
    this.glideFrom = this.currentPitch();
    this.notePitch = pitch;
    this.pitch = pitch;
    this.glideLeft = Math.max(1, Math.round(this.p.glide * this.sr));
    this.glideTotal = this.glideLeft;
    const dv = this.p.dynVelocity;
    this.dynTarget = Math.min(1, 1 - dv + dv * velocity);
    // A small bow change / tongue on the new note.
    this.noiseBurst = Math.max(this.noiseBurst, (this.p.noise.attack ?? 0) * 0.3);
  }

  currentPitch() {
    if (this.glideLeft <= 0) return this.notePitch;
    const t = 1 - this.glideLeft / this.glideTotal;
    const s = t * t * (3 - 2 * t);
    return this.glideFrom + (this.notePitch - this.glideFrom) * s;
  }

  noteOff() {
    this.released = true;
    this.env.release();
  }

  steal() {
    this.released = true;
    this.stealing = true;
    this.env.forceRelease(0.004);
  }

  #tables() {
    const p = this.p;
    const pitch = Math.round(this.currentPitch());
    const levels = p.dynamics.length;
    // Dynamic → pair of table levels and crossfade.
    let i = 0;
    while (i < levels - 2 && this.dyn > p.dynamics[i + 1]) i++;
    const lo = p.dynamics[i];
    const hi = p.dynamics[Math.min(levels - 1, i + 1)];
    this.mix = hi > lo ? Math.min(1, Math.max(0, (this.dyn - lo) / (hi - lo))) : 0;
    const key = pitch * 16 + i;
    if (key !== this.tablePitch) {
      this.tablePitch = key;
      const c = this.cache;
      const j = Math.min(levels - 1, i + 1);
      this.tabs = [c.get(this.art, this.vowelA, pitch, i), c.get(this.art, this.vowelA, pitch, j)];
      if (this.vowelB !== this.vowelA) this.tabs.push(c.get(this.art, this.vowelB, pitch, i), c.get(this.art, this.vowelB, pitch, j));
    }
  }

  /** Rebuilds the blended table when the crossfade moved by more than 1/32. */
  #blendTables() {
    const [a0, a1, b0, b1] = this.tabs;
    const mix = Math.round(this.mix * 32) / 32;
    const morph = b0 ? Math.round(this.morph * 32) / 32 : 0;
    if (mix === this.blendMix && morph === this.blendMorph && this.blendTabs === this.tabs) return;
    this.blendMix = mix;
    this.blendMorph = morph;
    this.blendTabs = this.tabs;
    const out = this.blend;
    for (let i = 0; i <= TABLE_SIZE; i++) {
      let y = a0[i] + (a1[i] - a0[i]) * mix;
      if (morph > 0) {
        const yb = b0[i] + (b1[i] - b0[i]) * mix;
        y += (yb - y) * morph;
      }
      out[i] = y;
    }
  }

  #control() {
    const p = this.p;
    const sr = this.sr;
    // Dynamic (brightness) follows the envelope with a lag (bloom).
    const sus = (this.artSpec.ampEnv ?? p.ampEnv).s;
    const target = this.dynTarget * (0.35 + 0.65 * Math.min(1, this.env.value / Math.max(0.05, sus || 1)));
    this.dyn = target + (this.dyn - target) * this.dynCoef;
    if (this.glideLeft > 0) this.glideLeft = Math.max(0, this.glideLeft - CONTROL_INTERVAL);
    this.#tables();
    if (this.morphInc > 0 && this.morph < 1) this.morph = Math.min(1, this.morph + this.morphInc);
    this.#blendTables();
    this.scoopCents *= this.scoopCoef;
    // Shimmer and jitter: slow random walks.
    if (this.rng.float() < 0.02) this.shimTarget = 1 + vary(this.rng, p.shimmer);
    this.shim += (this.shimTarget - this.shim) * 0.02;
    const t = this.age2 / sr;
    const vib = p.vibrato;
    const onsetVib = vib.depth * (this.artSpec.vibrato ?? 1) * Math.min(1, Math.max(0, (t - (vib.delay ?? 0.3)) / Math.max(0.01, vib.fade ?? 0.4)));
    const baseInc = pitchToHz(this.currentPitch() + this.scoopCents / 100) / sr;
    for (let k = 0; k < this.players; k++) {
      if (this.rng.float() < 0.03) this.jitTarget[k] = vary(this.rng, p.jitter);
      this.jit[k] += (this.jitTarget[k] - this.jit[k]) * 0.05;
      this.vibPhase[k] += this.vibRate[k] * CONTROL_INTERVAL;
      if (this.vibPhase[k] >= 1) this.vibPhase[k] -= 1;
      const cents = this.detune[k] + this.jit[k] + onsetVib * Math.sin(2 * Math.PI * this.vibPhase[k]);
      // 2^(cents/1200) by its series (|cents| < 100: error < 0.05 cent).
      const x = cents * 5.776226504666211e-4;
      this.inc[k] = baseInc * (1 + x * (1 + x * (0.5 + x / 6)));
      if (this.tremRate > 0) {
        // Bowed tremolo: each player's own stroke rate, strokes with a soft dip.
        let tp = this.trem[k] + this.tremInc[k] * CONTROL_INTERVAL;
        if (tp >= 1) {
          tp -= 1;
          // Each stroke starts with a little bow noise.
          this.noiseBurst = Math.max(this.noiseBurst, 0.08 / this.players);
        }
        this.trem[k] = tp;
        this.tremGain[k] = 0.12 + 0.88 * Math.sin(Math.PI * tp) ** 0.6;
      } else this.tremGain[k] = 1;
    }
    this.age2 += CONTROL_INTERVAL;
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  render(L, R, start, end) {
    const N = TABLE_SIZE;
    const n = this.players;
    for (let s = start; s < end; s++) {
      if (this.ctrl-- <= 0) {
        this.#control();
        this.ctrl = CONTROL_INTERVAL - 1;
      }
      if (this.lengthLeft >= 0 && this.lengthLeft-- === 0 && !this.released) this.noteOff();
      const env = this.env.next();
      if (!this.env.active) {
        this.active = false;
        this.stealing = false;
        return;
      }
      const tab = this.blend;
      let yl = 0;
      let yr = 0;
      for (let k = 0; k < n; k++) {
        if (this.onset[k] > 0) {
          this.onset[k]--;
          continue;
        }
        if (this.og[k] < 1) this.og[k] = Math.min(1, this.og[k] + 0.002);
        let ph = this.phase[k] + this.inc[k];
        if (ph >= 1) ph -= 1;
        this.phase[k] = ph;
        const x = ph * N;
        const i = x | 0;
        const y = tab[i] + (tab[i + 1] - tab[i]) * (x - i);
        const g = this.og[k] * this.tremGain[k];
        yl += y * g * this.gL[k];
        yr += y * g * this.gR[k];
      }
      const amp = env * this.shim * this.out;
      yl *= amp;
      yr *= amp;
      // Breath / bow noise follows the envelope; onset bursts (chiff, bite, consonants).
      if (this.noiseLevel > 0 || this.noiseBurst > 1e-4 || this.cons > 1e-4) {
        const w = this.noise.white();
        let nz = 0;
        if (this.noiseLevel > 0 || this.noiseBurst > 1e-4) {
          nz += this.noiseFilter.process(w) * (this.noiseLevel * env * (0.5 + 0.5 * this.velocity) + this.noiseBurst) * this.out * Math.sqrt(n);
          this.noiseBurst *= this.noiseBurstCoef;
        }
        if (this.cons > 1e-4) {
          nz += this.consonantFilter.process(w) * this.cons * this.consLevel * this.out;
          this.cons *= this.consCoef;
        }
        yl += nz;
        yr += nz;
      }
      L[s] += yl;
      R[s] += yr;
    }
  }
}

/**
 * @param {SpectralPreset} preset
 * @param {import('./context.js').SynthContext} ctx
 * @param {import('../core/prng.js').Rng} rng
 */
export function createSpectral(preset, ctx, rng) {
  const p = withDefaults(preset);
  const cache = new TableCache(p, ctx.sampleRate);
  return new PolyInstrument(
    p,
    (i) => {
      const v = new SpectralVoice(p, cache, ctx, rng.fork(`voice${i}`));
      return Object.assign(v, { level: () => v.levelEstimate(), legato: p.mono ? v.legato.bind(v) : undefined });
    },
    { polyphony: p.polyphony, mono: p.mono },
  );
}
