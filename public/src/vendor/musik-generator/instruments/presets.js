// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Instrument presets (pure data). All sounds are original designs; no
 * parameters are taken from commercial instruments' factory patches.
 * `gainDb` values are calibrated so presets sit at comparable loudness
 * (see tools/cli.js calibrate-presets).
 */

/** @typedef {import('./subtractive.js').SubtractivePreset | import('./fm.js').FmPreset | import('./pluck.js').PluckPreset | import('./drums.js').DrumKitPreset | import('./texture.js').TexturePreset | import('./modal.js').ModalPreset | import('./spectral.js').SpectralPreset | import('./granular.js').GranularPreset} EnginePreset */

/**
 * @typedef {EnginePreset & { id: string, label: string, category: string, demo: string, demoShift?: number, usage?: 'fx' }} Preset
 *   usage "fx": for stingers and sound effects only, not for parts inside songs;
 *   demoShift: transposition of the demo phrase in semitones (instrument range)
 */

/** General-MIDI-compatible drum map plus a few cinematic extras below note 35. */
export const DRUM_NOTES = Object.freeze({
  boom: 24,
  impact: 25,
  riser: 26,
  kick: 36,
  rim: 37,
  snare: 38,
  clap: 39,
  tomLow: 41,
  hatClosed: 42,
  hatPedal: 44,
  tomMid: 45,
  hatOpen: 46,
  tomHigh: 48,
  crash: 49,
  ride: 51,
  shaker: 70,
});

/** @param {number} n */
const k = (n) => String(n);


// ── Shared building blocks of the orchestral presets (Phase 7) ──────────

/** Vowel formants (Hz, gain dB, bandwidth Hz); low voices / high voices. After Peterson & Barney (1952). */
const VOWELS_LOW = Object.freeze({
  a: [[730, 16, 110], [1090, 12, 130], [2440, 8, 180]],
  o: [[570, 16, 100], [840, 12, 120], [2410, 6, 180]],
  u: [[300, 16, 90], [870, 10, 120], [2240, 4, 180]],
  e: [[530, 16, 100], [1840, 12, 150], [2480, 8, 200]],
  i: [[270, 15, 80], [2290, 12, 170], [3010, 8, 220]],
});
const VOWELS_HIGH = Object.freeze({
  a: [[850, 16, 120], [1220, 12, 140], [2810, 8, 200]],
  o: [[590, 16, 110], [920, 12, 130], [2710, 6, 200]],
  u: [[370, 16, 100], [950, 10, 130], [2670, 4, 200]],
  e: [[610, 16, 110], [2330, 12, 160], [2990, 8, 220]],
  i: [[310, 15, 90], [2790, 12, 180], [3310, 8, 240]],
});

/** Bowed strings: sawtooth-like source, violin/cello body regions by register, bowing comb. */
const STRING_SPECTRUM = Object.freeze({
  tilt: [-9, -6.5, -4.5],
  levelDb: [-14, -6, 0],
  formants: [[280, 4, 90], [500, 5, 180], [1150, 2, 500], [2600, 6, 1300]],
  formantsLow: [[110, 4, 50], [230, 5, 100], [650, 3, 350], [1500, 4, 900]],
  formantRange: [43, 67],
  bowPos: 1 / 9,
  highCutHz: 8000,
});
const STRING_ARTICULATIONS = Object.freeze({
  spiccato: { ampEnv: { a: 0.004, d: 0.14, s: 0, r: 0.07 }, noise: { attack: 0.45, attackDecay: 0.025 }, vibrato: 0 },
  staccato: { ampEnv: { a: 0.012, d: 0.2, s: 0.2, r: 0.1 }, noise: { attack: 0.3 }, length: 0.6 },
  tremolo: { tremolo: 13, noise: { level: 0.06 }, vibrato: 0.6 },
  ponticello: { spectrum: { bowPos: 1 / 28, fundamentalDb: -10, tilt: [-5, -3.5, -2] }, noise: { level: 0.06, freq: 5000 }, vibrato: 0.5 },
  colLegno: { ampEnv: { a: 0.001, d: 0.09, s: 0, r: 0.05 }, spectrum: { tilt: [-3, -2, -1.5], fundamentalDb: -12 }, noise: { level: 0, attack: 0.9, attackDecay: 0.03, freq: 3500 }, vibrato: 0 },
  pizzicato: { ampEnv: { a: 0.002, d: 0.5, s: 0, r: 0.2 }, spectrum: { tilt: [-14, -12, -10] }, noise: { level: 0, attack: 0.3, attackDecay: 0.01 }, vibrato: 0 },
  sordino: { spectrum: { highCutHz: 2600, tilt: [-11, -9, -7] }, noise: { level: 0.015 } },
});
/** @type {Omit<import('./spectral.js').SpectralPreset, 'engine'>} */
const STRING_SECTION = {
  spectrum: STRING_SPECTRUM,
  ampEnv: { a: 0.22, d: 0.4, s: 0.88, r: 0.55 },
  dynAttack: 0.18,
  vibrato: { rate: 5.4, depth: 13, delay: 0.35, fade: 0.5 },
  jitter: 4,
  shimmer: 0.05,
  noise: { level: 0.03, freq: 2600, q: 0.5, track: 0.3, attack: 0.12, attackDecay: 0.08 },
  ensemble: { voices: 6, detune: 9, spread: 0.85, onset: 0.03 },
  articulations: STRING_ARTICULATIONS,
  polyphony: 16,
};

const MEMBRANE = Object.freeze(
  /** @type {import('./modal.js').Mode[]} */ ([[1, 1, 0.9], [1.594, 0.55, 0.55], [2.136, 0.38, 0.42], [2.296, 0.33, 0.38], [2.653, 0.22, 0.3], [2.918, 0.16, 0.25], [3.156, 0.12, 0.2], [3.5, 0.08, 0.16]]),
);

/** @type {Readonly<Record<string, Preset>>} */
export const PRESETS = Object.freeze({
  // ── Pads ───────────────────────────────────────────────────────────
  'pad.warm': {
    id: 'pad.warm', label: 'Warme Fläche', category: 'Pads', demo: 'chords', engine: 'subtractive',
    osc: [{ wave: 'warm', unison: 3, spread: 14, stereo: 0.8 }, { wave: 'triangle', octave: 1, level: 0.25 }],
    filter: { type: 'ladder', cutoff: 900, resonance: 0.15, keyTrack: 0.4, envAmount: 1.2, velAmount: 0.4 },
    filterEnv: { a: 1.2, d: 2, s: 0.4, r: 1.5 },
    ampEnv: { a: 0.9, d: 1.5, s: 0.85, r: 1.8 },
    filterLfo: { rate: 0.13, depth: 0.25 },
    drift: 4, gainDb: -13.5,
  },
  'pad.strings': {
    id: 'pad.strings', label: 'Streicher-Ensemble (Synth)', category: 'Pads', demo: 'chords', engine: 'subtractive',
    osc: [{ wave: 'saw', unison: 5, spread: 22, stereo: 0.9 }],
    filter: { type: 'svf', cutoff: 2400, resonance: 0.05, keyTrack: 0.6, envAmount: 0.6, velAmount: 0.6 },
    filterEnv: { a: 0.6, d: 1.5, s: 0.6, r: 1 },
    ampEnv: { a: 0.45, d: 0.5, s: 0.9, r: 0.9 },
    vibrato: { rate: 5.2, depth: 9, delay: 0.5, fade: 0.6 },
    drift: 3, gainDb: -16,
  },
  'pad.glass': {
    id: 'pad.glass', label: 'Gläserne Fläche', category: 'Pads', demo: 'chords', engine: 'subtractive',
    osc: [{ wave: 'vocal', unison: 2, spread: 8, stereo: 1 }, { wave: 'sine', octave: 1, level: 0.4 }],
    filter: { type: 'svf', cutoff: 4000, resonance: 0.1, keyTrack: 0.3 },
    ampEnv: { a: 1.5, d: 2, s: 0.7, r: 2.5 },
    filterLfo: { rate: 0.1, depth: 0.3 },
    drift: 2, gainDb: -11.6,
  },
  'keys.organ': {
    id: 'keys.organ', label: 'Orgel (einfach)', category: 'Tasten', demo: 'chords', engine: 'subtractive',
    osc: [{ wave: 'organ' }],
    filter: { type: 'svf', cutoff: 8000, keyTrack: 0.2 },
    ampEnv: { a: 0.01, d: 0.1, s: 1, r: 0.08 },
    vibrato: { rate: 6.5, depth: 5, delay: 0, fade: 0.1 },
    drift: 1, gainDb: -19.9,
  },

  // ── Bässe ──────────────────────────────────────────────────────────
  'bass.sub': {
    id: 'bass.sub', label: 'Sub-Bass', category: 'Bässe', demo: 'bass', engine: 'subtractive',
    mono: true, glide: 0.04, phaseReset: true,
    // Sine body plus asymmetric saturation: the 2nd harmonic (octave) makes the pitch
    // unambiguous on small speakers; a short pitch drop gives the attack its punch.
    osc: [{ wave: 'sine' }, { wave: 'sine', octave: 1, level: 0.22 }],
    filter: { type: 'ladder', cutoff: 700, resonance: 0.05, keyTrack: 0.5, envAmount: 1.4, velAmount: 0.8 },
    filterEnv: { a: 0.001, d: 0.22, s: 0.35, r: 0.12 },
    ampEnv: { a: 0.002, d: 0.6, s: 0.82, r: 0.14 },
    pitchEnv: { amount: 4, decay: 0.016 },
    shaper: { drive: 3, asymmetry: 0.85 },
    drift: 0.5, variation: { detune: 1, cutoff: 0.05, level: 0.03 }, gainDb: -21.3,
  },
  'bass.ladder': {
    id: 'bass.ladder', label: 'Synth-Bass (Ladder)', category: 'Bässe', demo: 'bass', engine: 'subtractive',
    mono: true, glide: 0.05, phaseReset: true,
    osc: [{ wave: 'saw' }, { wave: 'pulse', pw: 0.35, level: 0.6 }],
    sub: { level: 0.5, octave: -1, wave: 'sine' },
    filter: { type: 'ladder', cutoff: 220, resonance: 0.45, keyTrack: 0.4, envAmount: 3.2, velAmount: 0.8, drive: 2.4 },
    filterEnv: { a: 0.002, d: 0.28, s: 0.15, r: 0.15 },
    ampEnv: { a: 0.002, d: 0.4, s: 0.8, r: 0.1 },
    shaper: { drive: 2.2, asymmetry: 0.5 },
    gainDb: -7,
  },
  'bass.synthwave': {
    id: 'bass.synthwave', label: 'Synthwave-Bass', category: 'Bässe', demo: 'bass8', engine: 'subtractive',
    polyphony: 4, phaseReset: true,
    osc: [{ wave: 'saw', unison: 2, spread: 10, stereo: 0.2 }],
    sub: { level: 0.4, octave: -1, wave: 'square' },
    shaper: { drive: 2, asymmetry: 0.45 },
    filter: { type: 'ladder', cutoff: 400, resonance: 0.3, keyTrack: 0.3, envAmount: 2.5, velAmount: 0.6 },
    filterEnv: { a: 0.001, d: 0.18, s: 0.25, r: 0.1 },
    ampEnv: { a: 0.001, d: 0.25, s: 0.7, r: 0.08 },
    gainDb: -10.8,
  },
  'bass.fm': {
    id: 'bass.fm', label: 'FM-Bass', category: 'Bässe', demo: 'bass', engine: 'fm',
    polyphony: 4,
    operators: [
      { ratio: 1, level: 1, env: { a: 0.001, d: 0.8, s: 0.7, r: 0.1 }, velSens: 0.3 },
      { ratio: 1, level: 2.5, env: { a: 0.001, d: 0.25, s: 0.2, r: 0.1 }, velSens: 0.8, feedback: 0.3 },
    ],
    routes: [[1, 0]], carriers: [0], gainDb: -11.5,
  },

  // ── Leads ──────────────────────────────────────────────────────────
  'lead.saw': {
    id: 'lead.saw', label: 'Supersaw-Lead', category: 'Leads', demo: 'melody', engine: 'subtractive',
    polyphony: 8,
    osc: [{ wave: 'saw', unison: 7, spread: 35, stereo: 1 }],
    filter: { type: 'svf', cutoff: 5500, resonance: 0.1, keyTrack: 0.4, envAmount: 0.8 },
    filterEnv: { a: 0.01, d: 0.6, s: 0.6, r: 0.4 },
    ampEnv: { a: 0.01, d: 0.3, s: 0.85, r: 0.35 },
    vibrato: { rate: 5.5, depth: 12, delay: 0.35, fade: 0.4 },
    gainDb: -12,
  },
  'lead.square': {
    id: 'lead.square', label: 'Puls-Lead (PWM)', category: 'Leads', demo: 'melody', engine: 'subtractive',
    polyphony: 8,
    osc: [{ wave: 'pulse', pw: 0.5 }],
    pwm: { rate: 0.4, depth: 0.3 },
    filter: { type: 'svf', cutoff: 6000, keyTrack: 0.3 },
    ampEnv: { a: 0.005, d: 0.2, s: 0.8, r: 0.15 },
    vibrato: { rate: 5.8, depth: 15, delay: 0.25, fade: 0.3 },
    gainDb: -11.1,
  },
  'lead.soft': {
    id: 'lead.soft', label: 'Weiches Lead (flötenartig)', category: 'Leads', demo: 'melody', engine: 'subtractive',
    polyphony: 8,
    osc: [{ wave: 'triangle' }, { wave: 'sine', octave: 1, level: 0.25 }],
    noise: { level: 0.08, color: 'pink' },
    filter: { type: 'svf', cutoff: 3500, keyTrack: 0.8, velAmount: 0.8 },
    ampEnv: { a: 0.07, d: 0.3, s: 0.85, r: 0.25 },
    vibrato: { rate: 4.8, depth: 14, delay: 0.3, fade: 0.5 },
    gainDb: -11.3,
  },
  'pluck.synth': {
    id: 'pluck.synth', label: 'Synth-Pluck', category: 'Zupfen', demo: 'arp', engine: 'subtractive',
    osc: [{ wave: 'saw', unison: 2, spread: 10, stereo: 0.6 }, { wave: 'square', octave: 1, level: 0.3 }],
    filter: { type: 'ladder', cutoff: 300, resonance: 0.25, keyTrack: 0.5, envAmount: 4, velAmount: 1 },
    filterEnv: { a: 0.001, d: 0.35, s: 0, r: 0.3 },
    ampEnv: { a: 0.002, d: 0.9, s: 0, r: 0.3 },
    gainDb: 1.1,
  },

  // ── FM-Tasten und Glocken ───────────────────────────────────────────
  'keys.epiano': {
    id: 'keys.epiano', label: 'E-Piano (FM)', category: 'Tasten', demo: 'chords', engine: 'fm',
    operators: [
      { ratio: 1, level: 1, env: { a: 0.002, d: 3.2, s: 0, r: 0.6 }, velSens: 0.4, keyScale: -1 },
      { ratio: 1, level: 2.1, env: { a: 0.001, d: 1.2, s: 0.18, r: 0.5 }, velSens: 0.9, keyScale: -3 },
      { ratio: 1, detune: 6, level: 0.5, env: { a: 0.001, d: 1.0, s: 0, r: 0.4 }, velSens: 0.5, keyScale: -2 },
      { ratio: 14, level: 1.2, env: { a: 0.001, d: 0.09, s: 0, r: 0.1 }, velSens: 1, keyScale: -4 },
    ],
    routes: [[1, 0], [3, 2]], carriers: [0, 2], stereoDetune: 5, velocity: 0.8, gainDb: -6.1,
  },
  'keys.bell': {
    id: 'keys.bell', label: 'Glocke (FM, metallisch – nur Effekte)', category: 'Effekte', demo: 'bells', engine: 'fm', usage: 'fx',
    operators: [
      { ratio: 1, level: 1, env: { a: 0.002, d: 5, s: 0, r: 2.5 }, velSens: 0.3 },
      { ratio: 3.5, level: 2.2, env: { a: 0.001, d: 2.5, s: 0, r: 2 }, velSens: 0.7, keyScale: -2 },
      { ratio: 4.1, level: 0.3, env: { a: 0.001, d: 1.5, s: 0, r: 1 }, velSens: 0.5 },
      { ratio: 1.41, level: 1, env: { a: 0.001, d: 1.2, s: 0, r: 1 }, velSens: 0.6 },
    ],
    routes: [[1, 0], [3, 2]], carriers: [0, 2], stereoDetune: 3, gainDb: -3.2,
  },
  'keys.glass': {
    id: 'keys.glass', label: 'Glasglocke (melodisch)', category: 'Tasten', demo: 'bells', engine: 'fm',
    // Only harmonic ratios (1, 2, 4): a sweet, clearly pitched music-box/celesta colour.
    operators: [
      { ratio: 1, level: 1, env: { a: 0.002, d: 2.6, s: 0, r: 1.2 }, velSens: 0.4, keyScale: -1.5 },
      { ratio: 1, level: 0.55, env: { a: 0.001, d: 0.7, s: 0.05, r: 0.6 }, velSens: 0.8, keyScale: -3 },
      { ratio: 2, level: 0.22, env: { a: 0.001, d: 1.1, s: 0, r: 0.6 }, velSens: 0.6, keyScale: -2 },
      { ratio: 4, level: 0.5, env: { a: 0.001, d: 0.12, s: 0, r: 0.1 }, velSens: 1, keyScale: -4 },
    ],
    routes: [[1, 0], [3, 2]], carriers: [0, 2], stereoDetune: 2, velocity: 0.7, gainDb: 1.7,
  },
  'keys.mallet': {
    id: 'keys.mallet', label: 'Mallet (Marimba-artig, FM)', category: 'Tasten', demo: 'arp', engine: 'fm',
    operators: [
      { ratio: 1, level: 1, env: { a: 0.001, d: 0.7, s: 0, r: 0.3 }, velSens: 0.4, keyScale: -1.5 },
      { ratio: 4, level: 1.2, env: { a: 0.001, d: 0.12, s: 0, r: 0.1 }, velSens: 0.9, keyScale: -3 },
      { ratio: 10, level: 0.12, env: { a: 0.001, d: 0.05, s: 0, r: 0.05 }, velSens: 1 },
    ],
    routes: [[1, 0]], carriers: [0, 2], gainDb: -0.9,
  },

  // ── Gezupfte Saiten (Karplus–Strong) ────────────────────────────────
  'pluck.nylon': {
    id: 'pluck.nylon', label: 'Nylongitarre', category: 'Zupfen', demo: 'arp', engine: 'pluck',
    decay: 3.2, brightness: 0.45, excitationTone: 0.5, pickPosition: 0.2, softness: 0.35, releaseDecay: 0.3, pickNoise: 0.06,
    body: [[110, 2.5, 0], [230, 3, -3], [420, 4, -6]], bodyMix: 0.35, gainDb: -6.8,
  },
  'pluck.harp': {
    id: 'pluck.harp', label: 'Harfe', category: 'Zupfen', demo: 'arp', engine: 'pluck',
    decay: 4.5, brightness: 0.6, excitationTone: 0.45, pickPosition: 0.5, softness: 0.6, releaseDecay: 1.5, pickNoise: 0.02,
    body: [[180, 1.5, -4]], bodyMix: 0.25, gainDb: -9.2,
  },
  'pluck.pizzicato': {
    id: 'pluck.pizzicato', label: 'Pizzicato-Streicher', category: 'Zupfen', demo: 'pizz', engine: 'pluck',
    decay: 0.9, brightness: 0.3, excitationTone: 0.5, pickPosition: 0.25, softness: 0.5, releaseDecay: 0.2, pickNoise: 0.05,
    section: 3, body: [[280, 2, 0], [520, 3, -4]], bodyMix: 0.5, gainDb: -9.8,
  },
  'pluck.upright-bass': {
    id: 'pluck.upright-bass', label: 'Kontrabass (gezupft)', category: 'Bässe', demo: 'walking', engine: 'pluck',
    polyphony: 4,
    decay: 1.8, brightness: 0.3, excitationTone: 0.5, pickPosition: 0.28, softness: 0.55, releaseDecay: 0.15, pickNoise: 0.16,
    // Living string: two polarizations, a tension glide on hard plucks, fingerboard buzz, damping noise.
    polarMix: 0.55, polarDetune: 1.6, glide: 32, glideTime: 0.05, buzz: 0.35, releaseNoise: 0.3,
    body: [[62, 2.2, 0], [118, 2.5, -1], [240, 3, -4], [480, 3, -8]], bodyMix: 0.5, gainDb: -10.2,
  },
  'pluck.electric-bass': {
    id: 'pluck.electric-bass', label: 'E-Bass (Finger, Tonabnehmer)', category: 'Bässe', demo: 'bass', engine: 'pluck',
    polyphony: 4,
    decay: 2.4, brightness: 0.48, excitationTone: 0.62, pickPosition: 0.22, softness: 0.4, releaseDecay: 0.08, pickNoise: 0.18,
    polarMix: 0.45, polarDetune: 1.1, glide: 20, glideTime: 0.035, buzz: 0.25, releaseNoise: 0.25, pickup: 0.14,
    body: [[90, 1.4, -2], [800, 1.2, -6]], bodyMix: 0.3, gainDb: -9.4,
  },
  'pluck.gypsy-guitar': {
    id: 'pluck.gypsy-guitar', label: 'Gypsy-Jazz-Gitarre', category: 'Zupfen', demo: 'pompe', engine: 'pluck',
    // Selmer-style body: air resonance, wood modes and the bright, nasal 2–4 kHz region;
    // hard plectrum attack and the damping "chk" of the pompe chops.
    decay: 1.4, brightness: 0.72, excitationTone: 0.9, pickPosition: 0.1, softness: 0, releaseDecay: 0.06, pickNoise: 0.38,
    polarMix: 0.3, polarDetune: 0.8, releaseNoise: 0.4,
    body: [[115, 2, -3], [240, 3, 0], [520, 4, -1], [1250, 5, -3], [3100, 3, -5]], bodyMix: 0.55, gainDb: -7.5,
  },

  // ── Schlagzeug ─────────────────────────────────────────────────────
  'kit.electro': {
    id: 'kit.electro', label: 'Elektro-Kit', category: 'Schlagzeug', demo: 'beat', engine: 'drums',
    parts: {
      [k(36)]: { type: 'kick', startHz: 170, endHz: 48, pitchDecay: 0.035, decay: 0.55, click: 0.35, clickHz: 4000, drive: 1.6 },
      [k(37)]: { type: 'rim', toneHz: 1700, decay: 0.035, level: 0.5, pan: -0.15 },
      [k(38)]: { type: 'snare', toneHz: 190, toneDecay: 0.14, noise: 0.9, noiseDecay: 0.22, hpHz: 1400, bpHz: 5200, level: 0.8 },
      [k(39)]: { type: 'clap', bursts: 4, spacing: 0.0085, decay: 0.22, bpHz: 1300, q: 1.2, level: 0.75 },
      [k(41)]: { type: 'tom', startHz: 140, endHz: 90, pitchDecay: 0.06, decay: 0.45, noise: 0.1, noiseDecay: 0.08, pan: -0.3, level: 0.8 },
      [k(42)]: { type: 'hat', baseHz: 340, decay: 0.055, hpHz: 7000, bpHz: 9500, noise: 0.35, choke: 1, pan: 0.25, level: 0.5 },
      [k(44)]: { type: 'hat', baseHz: 340, decay: 0.08, hpHz: 6500, bpHz: 9000, noise: 0.3, choke: 1, pan: 0.25, level: 0.35 },
      [k(45)]: { type: 'tom', startHz: 165, endHz: 115, pitchDecay: 0.05, decay: 0.4, noise: 0.1, noiseDecay: 0.07, level: 0.8 },
      [k(46)]: { type: 'hat', baseHz: 340, decay: 0.45, hpHz: 6500, bpHz: 9000, noise: 0.4, choke: 1, pan: 0.25, level: 0.45 },
      [k(48)]: { type: 'tom', startHz: 210, endHz: 150, pitchDecay: 0.045, decay: 0.35, noise: 0.1, noiseDecay: 0.06, pan: 0.3, level: 0.8 },
      [k(49)]: { type: 'cymbal', baseHz: 410, decay: 1.9, hpHz: 4500, bpHz: 7500, noise: 0.6, pan: -0.35, level: 0.4 },
      [k(51)]: { type: 'cymbal', baseHz: 520, decay: 1.3, hpHz: 5500, bpHz: 9000, noise: 0.25, pan: 0.35, level: 0.3 },
      [k(70)]: { type: 'shaker', bpHz: 6500, decay: 0.09, attack: 0.012, pan: 0.4, level: 0.4 },
      [k(24)]: { type: 'kick', startHz: 90, endHz: 38, pitchDecay: 0.3, decay: 2.5, drive: 1.3 },
      [k(25)]: { type: 'impact', startHz: 70, endHz: 36, pitchDecay: 0.2, decay: 2.5, noise: 0.8, noiseDecay: 1.8, bpHz: 6000, drive: 1.4 },
      [k(26)]: { type: 'riser', startHz: 250, endHz: 8000, sweep: 24, q: 2.2, level: 0.6 },
    },
    gainDb: -9.3,
  },
  'kit.lofi': {
    id: 'kit.lofi', label: 'Lo-Fi-Kit', category: 'Schlagzeug', demo: 'beatSwing', engine: 'drums',
    tone: 6500,
    parts: {
      [k(36)]: { type: 'kick', startHz: 120, endHz: 52, pitchDecay: 0.04, decay: 0.38, click: 0.1, clickHz: 2500, drive: 1.2 },
      [k(37)]: { type: 'rim', toneHz: 1500, decay: 0.03, level: 0.45, pan: -0.1 },
      [k(38)]: { type: 'snare', toneHz: 180, toneDecay: 0.12, noise: 0.6, noiseDecay: 0.16, hpHz: 900, bpHz: 3000, level: 0.7 },
      [k(42)]: { type: 'hat', baseHz: 300, decay: 0.04, hpHz: 6000, bpHz: 8000, noise: 0.4, choke: 1, pan: 0.2, level: 0.35 },
      [k(46)]: { type: 'hat', baseHz: 300, decay: 0.3, hpHz: 6000, bpHz: 8000, noise: 0.4, choke: 1, pan: 0.2, level: 0.3 },
      [k(51)]: { type: 'cymbal', baseHz: 480, decay: 1.1, hpHz: 5000, bpHz: 7000, noise: 0.3, pan: 0.3, level: 0.25 },
      [k(70)]: { type: 'shaker', bpHz: 5500, decay: 0.07, attack: 0.01, pan: 0.35, level: 0.3 },
    },
    gainDb: -4.5,
  },
  'kit.hybrid': {
    id: 'kit.hybrid', label: 'Cinematic/Hybrid-Kit', category: 'Schlagzeug', demo: 'cinematic', engine: 'drums',
    parts: {
      [k(36)]: { type: 'kick', startHz: 120, endHz: 42, pitchDecay: 0.05, decay: 0.9, click: 0.2, clickHz: 3000, drive: 2 },
      [k(38)]: { type: 'snare', toneHz: 170, toneDecay: 0.25, noise: 0.9, noiseDecay: 0.5, hpHz: 1000, bpHz: 4000 },
      [k(41)]: { type: 'tom', startHz: 110, endHz: 70, pitchDecay: 0.08, decay: 1.0, noise: 0.25, noiseDecay: 0.12, pan: -0.35, drive: 1.5 },
      [k(45)]: { type: 'tom', startHz: 130, endHz: 85, pitchDecay: 0.07, decay: 0.9, noise: 0.25, noiseDecay: 0.1, drive: 1.5 },
      [k(48)]: { type: 'tom', startHz: 160, endHz: 105, pitchDecay: 0.06, decay: 0.8, noise: 0.25, noiseDecay: 0.1, pan: 0.35, drive: 1.5 },
      [k(49)]: { type: 'cymbal', baseHz: 380, decay: 3, hpHz: 4000, bpHz: 7000, noise: 0.7, level: 0.45 },
      [k(24)]: { type: 'kick', startHz: 85, endHz: 36, pitchDecay: 0.35, decay: 3.5, drive: 1.5 },
      [k(25)]: { type: 'impact', startHz: 70, endHz: 35, pitchDecay: 0.2, decay: 3, noise: 1, noiseDecay: 2.5, bpHz: 7000, drive: 1.5 },
      [k(26)]: { type: 'riser', startHz: 200, endHz: 9000, sweep: 24, q: 2.5, level: 0.7 },
    },
    gainDb: -13.9,
  },

  // ── Chiptune (8-Bit-Stil) ───────────────────────────────────────────
  'lead.chip': {
    id: 'lead.chip', label: 'Chip-Lead (Puls 25 %)', category: 'Leads', demo: 'melody', engine: 'subtractive',
    polyphony: 4, phaseReset: true,
    osc: [{ wave: 'pulse', pw: 0.25 }],
    filter: { type: 'svf', cutoff: 14000, keyTrack: 0 },
    ampEnv: { a: 0.001, d: 0.12, s: 0.8, r: 0.04, curve: 3 },
    vibrato: { rate: 6.2, depth: 22, delay: 0.18, fade: 0.08 },
    drift: 0, variation: { detune: 0, cutoff: 0, level: 0.02 }, velocity: 0.3, gainDb: -11.9,
  },
  'arp.chip': {
    id: 'arp.chip', label: 'Chip-Arpeggio (Puls 12,5 %)', category: 'Leads', demo: 'arp', engine: 'subtractive',
    polyphony: 6, phaseReset: true,
    osc: [{ wave: 'pulse', pw: 0.125 }],
    filter: { type: 'svf', cutoff: 12000, keyTrack: 0 },
    ampEnv: { a: 0.001, d: 0.09, s: 0.55, r: 0.03, curve: 3 },
    drift: 0, variation: { detune: 0, cutoff: 0, level: 0.02 }, velocity: 0.3, gainDb: -6.3,
  },
  'bass.chip': {
    id: 'bass.chip', label: 'Chip-Bass (4-Bit-Dreieck)', category: 'Bässe', demo: 'bass8', engine: 'subtractive',
    polyphony: 4, phaseReset: true,
    osc: [{ wave: 'tri4' }],
    filter: { type: 'svf', cutoff: 9000, keyTrack: 0 },
    ampEnv: { a: 0.001, d: 0.1, s: 1, r: 0.03, curve: 3 },
    drift: 0, variation: { detune: 0, cutoff: 0, level: 0 }, velocity: 0.2, gainDb: -13.1,
  },
  'kit.chip': {
    id: 'kit.chip', label: 'Chip-Drums (Rauschen)', category: 'Schlagzeug', demo: 'beat', engine: 'drums',
    tone: 9000,
    parts: {
      [k(36)]: { type: 'kick', startHz: 240, endHz: 55, pitchDecay: 0.018, decay: 0.16, click: 0, drive: 2.5 },
      [k(38)]: { type: 'snare', toneHz: 240, toneDecay: 0.04, noise: 1, noiseDecay: 0.11, hpHz: 900, bpHz: 4000, level: 0.8, lfsr: { hz: 14000 } },
      [k(39)]: { type: 'snare', toneHz: 400, toneDecay: 0.02, noise: 1, noiseDecay: 0.07, hpHz: 2000, bpHz: 6000, level: 0.6, lfsr: { hz: 9000, short: true } },
      [k(42)]: { type: 'shaker', bpHz: 9500, q: 0.8, decay: 0.03, attack: 0.001, choke: 1, level: 0.5, lfsr: { hz: 56000 } },
      [k(46)]: { type: 'shaker', bpHz: 8500, q: 0.8, decay: 0.18, attack: 0.001, choke: 1, level: 0.45, lfsr: { hz: 56000 } },
      [k(48)]: { type: 'tom', startHz: 330, endHz: 180, pitchDecay: 0.03, decay: 0.15, drive: 2, level: 0.7 },
      [k(45)]: { type: 'tom', startHz: 250, endHz: 130, pitchDecay: 0.03, decay: 0.17, drive: 2, level: 0.7 },
      [k(41)]: { type: 'tom', startHz: 180, endHz: 95, pitchDecay: 0.03, decay: 0.2, drive: 2, level: 0.7 },
      [k(49)]: { type: 'shaker', bpHz: 7000, q: 0.5, decay: 0.7, attack: 0.001, level: 0.45, lfsr: { hz: 28000 } },
    },
    gainDb: -7.9,
  },

  // ── Arcade (retro-futuristisch: knackig, trocken, präzise) ───────────
  'lead.arcade': {
    id: 'lead.arcade', label: 'Arcade-Lead (Puls + Säge, flink)', category: 'Leads', demo: 'melody', engine: 'subtractive',
    mono: true, glide: 0.018, phaseReset: true,
    osc: [{ wave: 'pulse', pw: 0.25 }, { wave: 'saw', level: 0.45, unison: 2, spread: 9, stereo: 0.5 }],
    filter: { type: 'svf', cutoff: 5200, resonance: 0.15, keyTrack: 0.4, envAmount: 1.2 },
    filterEnv: { a: 0.001, d: 0.12, s: 0.5, r: 0.08 },
    ampEnv: { a: 0.002, d: 0.14, s: 0.78, r: 0.06, curve: 2 },
    vibrato: { rate: 6.5, depth: 16, delay: 0.14, fade: 0.1 },
    drift: 0.5, velocity: 0.4, gainDb: -9.3,
  },
  'bass.arcade': {
    id: 'bass.arcade', label: 'Arcade-Bass (trocken, zackig)', category: 'Bässe', demo: 'bass8', engine: 'subtractive',
    mono: true, glide: 0, phaseReset: true,
    osc: [{ wave: 'square' }, { wave: 'saw', level: 0.5 }],
    sub: { level: 0.5, octave: -1, wave: 'sine' },
    filter: { type: 'ladder', cutoff: 420, resonance: 0.22, keyTrack: 0.4, envAmount: 3.2, velAmount: 0.7, drive: 1.8 },
    filterEnv: { a: 0.001, d: 0.09, s: 0.12, r: 0.05 },
    ampEnv: { a: 0.001, d: 0.16, s: 0.4, r: 0.04 },
    shaper: { drive: 2, asymmetry: 0.4 },
    drift: 0, variation: { detune: 0, cutoff: 0.03, level: 0.02 }, gainDb: -4.3,
  },
  'pluck.stab': {
    id: 'pluck.stab', label: 'Synth-Stab (kurze Akkordschläge)', category: 'Zupfen', demo: 'stabs', engine: 'subtractive',
    osc: [{ wave: 'saw', unison: 2, spread: 8, stereo: 0.7 }, { wave: 'pulse', pw: 0.3, octave: 1, level: 0.25 }],
    filter: { type: 'svf', cutoff: 1400, resonance: 0.2, keyTrack: 0.5, envAmount: 2.6, velAmount: 0.8 },
    filterEnv: { a: 0.001, d: 0.1, s: 0.1, r: 0.06 },
    ampEnv: { a: 0.001, d: 0.2, s: 0, r: 0.07 },
    gainDb: -3.6,
  },
  'kit.arcade': {
    id: 'kit.arcade', label: 'Arcade-Kit (knackig, trocken)', category: 'Schlagzeug', demo: 'beat', engine: 'drums',
    parts: {
      [k(36)]: { type: 'kick', startHz: 190, endHz: 52, pitchDecay: 0.022, decay: 0.24, click: 0.5, clickHz: 5000, drive: 1.8 },
      [k(37)]: { type: 'rim', toneHz: 1900, decay: 0.025, level: 0.5, pan: -0.15 },
      [k(38)]: { type: 'snare', toneHz: 220, toneDecay: 0.07, noise: 1, noiseDecay: 0.12, hpHz: 1800, bpHz: 5500, level: 0.85 },
      [k(39)]: { type: 'clap', bursts: 3, spacing: 0.007, decay: 0.12, bpHz: 1500, q: 1.3, level: 0.7 },
      [k(41)]: { type: 'tom', startHz: 170, endHz: 95, pitchDecay: 0.04, decay: 0.2, drive: 1.6, pan: -0.3, level: 0.75 },
      [k(42)]: { type: 'shaker', bpHz: 10000, q: 0.8, decay: 0.028, attack: 0.001, choke: 1, pan: 0.2, level: 0.5, lfsr: { hz: 60000 } },
      [k(44)]: { type: 'shaker', bpHz: 9000, q: 0.8, decay: 0.045, attack: 0.001, choke: 1, pan: 0.2, level: 0.35, lfsr: { hz: 60000 } },
      [k(45)]: { type: 'tom', startHz: 220, endHz: 125, pitchDecay: 0.035, decay: 0.18, drive: 1.6, level: 0.75 },
      [k(46)]: { type: 'hat', baseHz: 360, decay: 0.16, hpHz: 7000, bpHz: 9500, noise: 0.4, choke: 1, pan: 0.2, level: 0.42 },
      [k(48)]: { type: 'tom', startHz: 290, endHz: 170, pitchDecay: 0.03, decay: 0.16, drive: 1.6, pan: 0.3, level: 0.75 },
      [k(49)]: { type: 'cymbal', baseHz: 430, decay: 1, hpHz: 5000, bpHz: 8000, noise: 0.6, pan: -0.3, level: 0.38 },
      [k(51)]: { type: 'cymbal', baseHz: 540, decay: 0.6, hpHz: 6000, bpHz: 9500, noise: 0.25, pan: 0.3, level: 0.28 },
      [k(70)]: { type: 'shaker', bpHz: 7000, decay: 0.06, attack: 0.008, pan: 0.4, level: 0.35 },
      [k(24)]: { type: 'kick', startHz: 90, endHz: 38, pitchDecay: 0.25, decay: 1.6, drive: 1.3 },
      [k(25)]: { type: 'impact', startHz: 80, endHz: 40, pitchDecay: 0.15, decay: 1.2, noise: 0.8, noiseDecay: 0.8, bpHz: 6000, drive: 1.4 },
      [k(26)]: { type: 'riser', startHz: 300, endHz: 9000, sweep: 24, q: 2.2, level: 0.55 },
    },
    gainDb: -7.4,
  },

  // ── Texturen ───────────────────────────────────────────────────────
  'texture.vinyl': {
    id: 'texture.vinyl', label: 'Vinyl-Knistern', category: 'Texturen', demo: 'texture', engine: 'texture',
    crackle: 7, crackleLevel: 0.5, hiss: 0.015, rumble: 0.03, gainDb: -3.6,
  },

  // ── Streicher (Spektralmodell, Phase 7) ─────────────────────────────
  'strings.ensemble': {
    id: 'strings.ensemble', label: 'Streicherensemble (legato)', category: 'Streicher', demo: 'chords', engine: 'spectral',
    ...STRING_SECTION, gainDb: -12.3,
  },
  'strings.spiccato': {
    id: 'strings.spiccato', label: 'Streicher spiccato (Ostinato)', category: 'Streicher', demo: 'ostinato', engine: 'spectral',
    ...STRING_SECTION, articulation: 'spiccato', gainDb: 14.6,
  },
  'strings.tremolo': {
    id: 'strings.tremolo', label: 'Streicher tremolo', category: 'Streicher', demo: 'chords', engine: 'spectral',
    ...STRING_SECTION, articulation: 'tremolo', gainDb: -10.5,
  },
  'strings.ponticello': {
    id: 'strings.ponticello', label: 'Streicher sul ponticello', category: 'Streicher', demo: 'chords', engine: 'spectral',
    ...STRING_SECTION, articulation: 'ponticello', gainDb: -16.5,
  },
  'strings.basses': {
    id: 'strings.basses', label: 'Celli & Kontrabässe (arco)', category: 'Streicher', demo: 'bass', engine: 'spectral',
    ...STRING_SECTION,
    spectrum: { ...STRING_SPECTRUM, formants: [[110, 4, 50], [230, 5, 100], [650, 3, 350], [1500, 4, 900]], formantsLow: [[70, 4, 30], [150, 5, 70], [450, 3, 250], [1000, 3, 600]], formantRange: [28, 48], highCutHz: 5000 },
    ampEnv: { a: 0.08, d: 0.3, s: 0.85, r: 0.35 },
    ensemble: { voices: 4, detune: 6, spread: 0.5, onset: 0.02 },
    vibrato: { rate: 5, depth: 8, delay: 0.4, fade: 0.5 },
    gainDb: -4.8,
  },
  'strings.fiddle': {
    id: 'strings.fiddle', label: 'Fiddle (Solo-Geige, Folk)', category: 'Streicher', demo: 'jig', engine: 'spectral',
    ...STRING_SECTION,
    spectrum: { ...STRING_SPECTRUM, tilt: [-8, -5.5, -3.8], bowPos: 1 / 10 },
    ampEnv: { a: 0.035, d: 0.2, s: 0.85, r: 0.15 },
    dynAttack: 0.06,
    vibrato: { rate: 6, depth: 8, delay: 0.3, fade: 0.3 },
    jitter: 5,
    noise: { level: 0.05, freq: 2800, q: 0.5, track: 0.3, attack: 0.25, attackDecay: 0.03 },
    ensemble: { voices: 1, detune: 0 },
    mono: true, glide: 0.035, polyphony: 1, gainDb: -6.5,
  },

  // ── Holzbläser ────────────────────────────────────────────────────
  'wind.flute': {
    id: 'wind.flute', label: 'Flöte', category: 'Holzbläser', demo: 'melody', demoShift: 12, engine: 'spectral',
    spectrum: { tilt: [-20, -15, -10.5], fundamentalDb: 3, highCutHz: 6500 },
    ampEnv: { a: 0.05, d: 0.2, s: 0.9, r: 0.12 }, dynAttack: 0.08,
    vibrato: { rate: 5.2, depth: 14, delay: 0.25, fade: 0.4 }, jitter: 4,
    scoop: { cents: -15, time: 0.03 },
    noise: { level: 0.09, freq: 2500, q: 0.5, track: 0.6, attack: 0.35, attackDecay: 0.035 },
    mono: true, glide: 0.05, polyphony: 1, gainDb: -5,
  },
  'wind.whistle': {
    id: 'wind.whistle', label: 'Tin Whistle (Folk)', category: 'Holzbläser', demo: 'jig', demoShift: 12, engine: 'spectral',
    spectrum: { tilt: [-16, -12, -8], fundamentalDb: 2, highCutHz: 8000 },
    ampEnv: { a: 0.02, d: 0.15, s: 0.9, r: 0.06 }, dynAttack: 0.04,
    vibrato: { rate: 5.6, depth: 6, delay: 0.4, fade: 0.3 }, jitter: 5,
    noise: { level: 0.12, freq: 3200, q: 0.6, track: 0.6, attack: 0.5, attackDecay: 0.025 },
    mono: true, glide: 0.025, polyphony: 1, gainDb: -3.3,
  },
  'wind.clarinet': {
    id: 'wind.clarinet', label: 'Klarinette', category: 'Holzbläser', demo: 'melody', demoShift: -5, engine: 'spectral',
    spectrum: { tilt: [-11, -8, -5.5], even: { db: -24, belowHz: 1700 }, formants: [[1500, 3, 800]], highCutHz: 5000 },
    ampEnv: { a: 0.04, d: 0.2, s: 0.9, r: 0.1 }, dynAttack: 0.06,
    vibrato: { rate: 5.5, depth: 8, delay: 0.3, fade: 0.4 }, jitter: 3,
    scoop: { cents: -20, time: 0.04 },
    noise: { level: 0.02, freq: 2000, q: 0.6, attack: 0.15, attackDecay: 0.03 },
    mono: true, glide: 0.05, polyphony: 1, gainDb: -2.7,
  },
  'wind.oboe': {
    id: 'wind.oboe', label: 'Oboe', category: 'Holzbläser', demo: 'melody', engine: 'spectral',
    spectrum: { tilt: [-8, -6, -4], fundamentalDb: -9, formants: [[1150, 9, 450], [2900, 6, 900]], highCutHz: 7000 },
    ampEnv: { a: 0.035, d: 0.2, s: 0.9, r: 0.1 }, dynAttack: 0.05,
    vibrato: { rate: 5.6, depth: 11, delay: 0.25, fade: 0.4 }, jitter: 3,
    noise: { level: 0.015, freq: 3000, q: 0.6, attack: 0.12, attackDecay: 0.025 },
    mono: true, glide: 0.04, polyphony: 1, gainDb: -8.2,
  },

  // ── Blechbläser ───────────────────────────────────────────────────
  'brass.trumpet': {
    id: 'brass.trumpet', label: 'Trompete', category: 'Blechbläser', demo: 'melody', engine: 'spectral',
    spectrum: { tilt: [-15, -10, -5.5], levelDb: [-14, -6, 0], fundamentalDb: -3, formants: [[1250, 7, 1100], [2800, 3, 1500]], highCutHz: 7500, phases: 'sine' },
    ampEnv: { a: 0.03, d: 0.25, s: 0.85, r: 0.12 }, dynAttack: 0.09, dynVelocity: 0.9,
    vibrato: { rate: 5.5, depth: 10, delay: 0.4, fade: 0.4 }, jitter: 3,
    scoop: { cents: -40, time: 0.035 },
    noise: { level: 0.012, freq: 2500, q: 0.6, attack: 0.25, attackDecay: 0.02 },
    mono: true, glide: 0.04, polyphony: 1, gainDb: -4.7,
  },
  'brass.trumpet-muted': {
    id: 'brass.trumpet-muted', label: 'Trompete gestopft (Wah-Dämpfer)', category: 'Blechbläser', demo: 'melody', engine: 'spectral',
    spectrum: { tilt: [-7, -5, -3], formants: [[1800, 14, 700], [3600, 7, 1300]], lowCutHz: 650, highCutHz: 6500, phases: 'sine' },
    ampEnv: { a: 0.025, d: 0.2, s: 0.85, r: 0.1 }, dynAttack: 0.06,
    vibrato: { rate: 5.6, depth: 12, delay: 0.3, fade: 0.3 }, jitter: 4,
    scoop: { cents: -35, time: 0.04 },
    noise: { level: 0.02, freq: 4000, q: 0.7, attack: 0.2, attackDecay: 0.02 },
    mono: true, glide: 0.04, polyphony: 1, gainDb: -13.8,
  },
  'brass.horns': {
    id: 'brass.horns', label: 'Hörner (Satz)', category: 'Blechbläser', demo: 'chords', engine: 'spectral',
    spectrum: { tilt: [-17, -12.5, -7.5], formants: [[420, 9, 450], [1150, 3, 600]], highCutHz: 3800, phases: 'sine' },
    ampEnv: { a: 0.08, d: 0.4, s: 0.9, r: 0.35 }, dynAttack: 0.14, dynVelocity: 0.9,
    vibrato: { rate: 5, depth: 4, delay: 0.5, fade: 0.5 }, jitter: 3,
    scoop: { cents: -25, time: 0.05 },
    noise: { level: 0.008, freq: 1500, q: 0.6, attack: 0.15, attackDecay: 0.03 },
    ensemble: { voices: 4, detune: 6, spread: 0.6, onset: 0.025 },
    articulations: { stopped: { spectrum: { formants: [[1350, 12, 500], [3000, 6, 1000]], tilt: [-8, -6, -4], fundamentalDb: -8, highCutHz: 6000 } } },
    polyphony: 12, gainDb: -13.2,
  },
  'brass.trombone': {
    id: 'brass.trombone', label: 'Posaune', category: 'Blechbläser', demo: 'melody', demoShift: -12, engine: 'spectral',
    spectrum: { tilt: [-15, -10.5, -6], formants: [[560, 8, 600], [1500, 3, 800]], highCutHz: 5000, phases: 'sine' },
    ampEnv: { a: 0.045, d: 0.3, s: 0.85, r: 0.15 }, dynAttack: 0.1, dynVelocity: 0.9,
    vibrato: { rate: 5.2, depth: 6, delay: 0.45, fade: 0.4 }, jitter: 3,
    scoop: { cents: -30, time: 0.045 },
    noise: { level: 0.01, freq: 1800, q: 0.6, attack: 0.2, attackDecay: 0.025 },
    mono: true, glide: 0.12, polyphony: 1, gainDb: -6.2,
  },
  'brass.tuba': {
    id: 'brass.tuba', label: 'Tuba', category: 'Blechbläser', demo: 'bass', engine: 'spectral',
    spectrum: { tilt: [-19, -15, -10], formants: [[230, 8, 250], [700, 2, 400]], highCutHz: 1800, phases: 'sine' },
    ampEnv: { a: 0.06, d: 0.3, s: 0.85, r: 0.2 }, dynAttack: 0.1,
    vibrato: { rate: 4.8, depth: 4, delay: 0.5, fade: 0.5 }, jitter: 2,
    scoop: { cents: -20, time: 0.05 },
    noise: { level: 0.006, freq: 800, q: 0.6, attack: 0.12, attackDecay: 0.03 },
    mono: true, glide: 0.06, polyphony: 1, gainDb: -2.5,
  },
  'brass.section': {
    id: 'brass.section', label: 'Bläsersatz (Swing-Stabs)', category: 'Blechbläser', demo: 'stabs', engine: 'spectral',
    spectrum: { tilt: [-13, -8.5, -4.5], formants: [[1000, 6, 1000], [2600, 2, 1500]], highCutHz: 7000, phases: 'sine' },
    ampEnv: { a: 0.02, d: 0.3, s: 0.75, r: 0.12 }, dynAttack: 0.06, dynVelocity: 0.9,
    vibrato: { rate: 5.6, depth: 8, delay: 0.3, fade: 0.3 }, jitter: 4,
    scoop: { cents: -25, time: 0.03 },
    noise: { level: 0.012, freq: 2500, q: 0.6, attack: 0.2, attackDecay: 0.02 },
    ensemble: { voices: 3, detune: 7, spread: 0.7, onset: 0.012 },
    polyphony: 12, gainDb: -8.5,
  },

  // ── Saxophon ──────────────────────────────────────────────────────
  'sax.alto': {
    id: 'sax.alto', label: 'Altsaxophon', category: 'Holzbläser', demo: 'melody', engine: 'spectral',
    spectrum: { tilt: [-12, -8.5, -5], formants: [[650, 8, 450], [1750, 6, 900], [3100, 2, 1200]], highCutHz: 7000 },
    ampEnv: { a: 0.035, d: 0.25, s: 0.85, r: 0.12 }, dynAttack: 0.06,
    vibrato: { rate: 5.3, depth: 16, delay: 0.25, fade: 0.35 }, jitter: 5,
    scoop: { cents: -35, time: 0.05 },
    noise: { level: 0.04, freq: 3200, q: 0.6, attack: 0.2, attackDecay: 0.03 },
    mono: true, glide: 0.05, polyphony: 1, gainDb: -9.6,
  },
  'sax.tenor': {
    id: 'sax.tenor', label: 'Tenorsaxophon', category: 'Holzbläser', demo: 'melody', demoShift: -12, engine: 'spectral',
    spectrum: { tilt: [-13, -9.5, -5.5], formants: [[480, 9, 380], [1450, 6, 800], [2700, 2, 1100]], highCutHz: 6000 },
    ampEnv: { a: 0.035, d: 0.25, s: 0.85, r: 0.12 }, dynAttack: 0.06,
    vibrato: { rate: 5.2, depth: 15, delay: 0.25, fade: 0.35 }, jitter: 5,
    scoop: { cents: -35, time: 0.05 },
    noise: { level: 0.05, freq: 2600, q: 0.6, attack: 0.2, attackDecay: 0.03 },
    mono: true, glide: 0.05, polyphony: 1, gainDb: -8.6,
  },

  // ── Chor & Stimme ─────────────────────────────────────────────────
  'choir.aah': {
    id: 'choir.aah', label: 'Chor „Aah“', category: 'Chor & Stimme', demo: 'chords', engine: 'spectral',
    spectrum: { tilt: [-13, -11, -9], vowels: VOWELS_LOW, vowelsHigh: VOWELS_HIGH, formantRange: [50, 66], highCutHz: 7000 },
    vowel: 'a',
    ampEnv: { a: 0.35, d: 0.5, s: 0.9, r: 0.8 }, dynAttack: 0.2,
    vibrato: { rate: 5.2, depth: 22, delay: 0.4, fade: 0.6 }, jitter: 8, shimmer: 0.07,
    noise: { level: 0.02, freq: 5000, q: 0.5 },
    ensemble: { voices: 7, detune: 11, spread: 0.8, onset: 0.05 },
    polyphony: 12, gainDb: -8.6,
  },
  'choir.ooh': {
    id: 'choir.ooh', label: 'Chor „Ooh“', category: 'Chor & Stimme', demo: 'chords', engine: 'spectral',
    spectrum: { tilt: [-15, -13, -11], vowels: VOWELS_LOW, vowelsHigh: VOWELS_HIGH, formantRange: [50, 66], highCutHz: 5000 },
    vowel: 'u',
    ampEnv: { a: 0.4, d: 0.5, s: 0.9, r: 0.9 }, dynAttack: 0.2,
    vibrato: { rate: 5, depth: 18, delay: 0.45, fade: 0.6 }, jitter: 8, shimmer: 0.06,
    noise: { level: 0.015, freq: 4000, q: 0.5 },
    ensemble: { voices: 7, detune: 10, spread: 0.8, onset: 0.05 },
    polyphony: 12, gainDb: -16,
  },
  'voice.scat': {
    id: 'voice.scat', label: 'Scat-Stimme („doo-ba-dap“)', category: 'Chor & Stimme', demo: 'scat', engine: 'spectral',
    spectrum: { tilt: [-12, -10, -8], vowels: VOWELS_LOW, vowelsHigh: VOWELS_HIGH, formantRange: [52, 64], highCutHz: 7000 },
    vowel: 'u',
    syllables: [
      { consonant: { level: 0.35, freq: 350, q: 1.2, decay: 0.02 }, vowels: ['u'] },
      { consonant: { level: 0.45, freq: 250, q: 1, decay: 0.012 }, vowels: ['a'] },
      { consonant: { level: 0.35, freq: 350, q: 1.2, decay: 0.02 }, vowels: ['u', 'a'], morph: 0.12 },
      { consonant: { level: 0.4, freq: 300, q: 1.1, decay: 0.015 }, vowels: ['a', 'o'], morph: 0.1 },
      { consonant: { level: 0.3, freq: 2600, q: 0.8, decay: 0.03 }, vowels: ['i', 'a'], morph: 0.08 },
      { consonant: { level: 0.35, freq: 350, q: 1.2, decay: 0.02 }, vowels: ['e', 'i'], morph: 0.1 },
    ],
    ampEnv: { a: 0.02, d: 0.15, s: 0.75, r: 0.08 }, dynAttack: 0.04,
    vibrato: { rate: 5.5, depth: 18, delay: 0.2, fade: 0.25 }, jitter: 6,
    scoop: { cents: -40, time: 0.05 },
    noise: { level: 0.015, freq: 4500, q: 0.5 },
    mono: true, glide: 0.05, polyphony: 1, gainDb: -5.3,
  },

  // ── Orgel (additiv) ───────────────────────────────────────────────
  'keys.church-organ': {
    id: 'keys.church-organ', label: 'Kirchenorgel (Prinzipal + Mixtur)', category: 'Tasten', demo: 'chords', engine: 'spectral',
    spectrum: { tilt: [0, 0, 0], levelDb: [0, 0, 0], harmonics: { 1: 1, 2: 0.75, 3: 0.35, 4: 0.55, 6: 0.25, 8: 0.3, 10: 0.12, 12: 0.18, 16: 0.1 } },
    dynamics: [0, 0.5, 1],
    ampEnv: { a: 0.06, d: 0.1, s: 1, r: 0.35 },
    vibrato: { rate: 5, depth: 0 }, jitter: 1, shimmer: 0,
    noise: { level: 0.008, freq: 1500, q: 0.6, attack: 0.15, attackDecay: 0.05 },
    ensemble: { voices: 2, detune: 3, spread: 0.5 },
    polyphony: 16, gainDb: -13.7,
  },

  // ── Mallets & Glocken (Modalsynthese) ─────────────────────────────
  'mallet.marimba': {
    id: 'mallet.marimba', label: 'Marimba', category: 'Mallets & Glocken', demo: 'mallet', engine: 'modal',
    modes: [[1, 1, 1.6], [3.98, 0.3, 0.42], [9.9, 0.11, 0.13]],
    hardness: 0.35, hardnessVel: 0.5, decayKeyTrack: 0.62, highDamping: 0.2,
    noise: 0.06, noiseBand: { freq: 900, q: 0.7, decay: 0.012 }, stereo: 0.2, gainDb: 0.6,
  },
  'mallet.vibraphone': {
    id: 'mallet.vibraphone', label: 'Vibraphon (mit Motor)', category: 'Mallets & Glocken', demo: 'chords', engine: 'modal',
    modes: [[1, 1, 5.5], [4, 0.22, 1.6], [10, 0.06, 0.5]],
    hardness: 0.55, decayKeyTrack: 0.75, tremolo: { rate: 5.5, depth: 0.32 }, release: 0.3,
    noise: 0.03, noiseBand: { freq: 3000, q: 0.7, decay: 0.01 }, gainDb: -1.5,
  },
  'mallet.celesta': {
    id: 'mallet.celesta', label: 'Celesta', category: 'Mallets & Glocken', demo: 'bells', engine: 'modal',
    modes: [[1, 1, 1.8], [3, 0.1, 0.45], [5.4, 0.04, 0.2], [2.01, 0.06, 0.9]],
    hardness: 0.5, release: 0.5, noise: 0.02, noiseBand: { freq: 2500, q: 0.7, decay: 0.008 }, gainDb: 8.1,
  },
  'mallet.glockenspiel': {
    id: 'mallet.glockenspiel', label: 'Glockenspiel', category: 'Mallets & Glocken', demo: 'bells', engine: 'modal',
    modes: [[1, 1, 3.5], [2.71, 0.3, 1.4], [5.15, 0.16, 0.6], [8.43, 0.07, 0.3]],
    hardness: 0.85, decayKeyTrack: 0.85, noise: 0.04, noiseBand: { freq: 6000, q: 0.7, decay: 0.006 }, gainDb: 4.2,
  },
  'bells.church': {
    id: 'bells.church', label: 'Kirchenglocke', category: 'Mallets & Glocken', demo: 'bells', engine: 'modal',
    // Partials relative to the nominal (the perceived strike pitch): hum, prime, tierce, quint, nominal …
    modes: [[0.25, 0.45, 9], [0.5, 0.55, 6], [0.595, 0.65, 5], [0.75, 0.3, 3.5], [1, 1, 3.5], [1.25, 0.25, 2.2], [1.335, 0.2, 2], [1.5, 0.3, 1.8], [2, 0.25, 1.2], [2.53, 0.1, 0.8]],
    hardness: 0.8, highDamping: 0, decayKeyTrack: 0.85, release: 3, noise: 0.1, noiseBand: { freq: 2500, q: 0.8, decay: 0.02 },
    stereo: 0.4, polyphony: 8, gainDb: 0.5,
  },

  // ── Orchester-Schlagwerk (Membranen) ──────────────────────────────
  'perc.timpani': {
    id: 'perc.timpani', label: 'Pauken', category: 'Orchester-Schlagwerk', demo: 'timpani', engine: 'modal',
    // Air-loaded membrane: (1,1) principal, (2,1) fifth, (3,1) octave …; (0,1) a quickly damped thud.
    modes: [[1, 1, 2.6], [1.5, 0.55, 1.7], [1.99, 0.38, 1.3], [2.44, 0.22, 1], [2.98, 0.12, 0.75], [3.52, 0.06, 0.55], [0.6, 0.35, 0.18]],
    hardness: 0.38, hardnessVel: 0.6, decayKeyTrack: 0.9, highDamping: 0.1,
    pitchDrop: { amount: 0.25, decay: 0.08 }, noise: 0.3, noiseBand: { freq: 300, q: 0.6, decay: 0.025 },
    polyphony: 6, stereo: 0.15, gainDb: -4.4,
  },
  'perc.taiko': {
    id: 'perc.taiko', label: 'Taiko-Ensemble', category: 'Orchester-Schlagwerk', demo: 'taiko', engine: 'modal',
    modes: MEMBRANE,
    noteMap: {
      [k(36)]: { hz: 52, decay: 1.4, gain: 1.3, pitchDrop: 2.5, noise: 0.25 },
      [k(38)]: { hz: 120, decay: 0.6, hardness: 0.75, pitchDrop: 1.2, pan: 0.15 },
      [k(41)]: { hz: 78, decay: 1, pitchDrop: 2, pan: -0.3 },
      [k(45)]: { hz: 98, decay: 0.8, pitchDrop: 1.6, pan: 0.3 },
      [k(48)]: { hz: 230, decay: 0.3, hardness: 0.85, pitchDrop: 0.6, noise: 0.4, pan: 0.4 },
      [k(37)]: { hz: 700, modes: [[1, 1, 0.05], [2.4, 0.6, 0.03], [4.1, 0.4, 0.02]], hardness: 0.95, noise: 0.6, gain: 0.5, pan: -0.2 },
    },
    hardness: 0.6, noise: 0.25, noiseBand: { freq: 1100, q: 0.6, decay: 0.02 }, pitchDrop: { amount: 2, decay: 0.07 },
    stereo: 0.15, polyphony: 10, gainDb: -2.9,
  },
  'perc.bodhran': {
    id: 'perc.bodhran', label: 'Bodhrán (Rahmentrommel)', category: 'Orchester-Schlagwerk', demo: 'bodhran', engine: 'modal',
    modes: MEMBRANE.slice(0, 6),
    noteMap: {
      [k(36)]: { hz: 82, decay: 0.7, pitchDrop: 1.5 },
      [k(38)]: { hz: 150, decay: 0.22, hardness: 0.6 },
      [k(42)]: { hz: 210, decay: 0.12, gain: 0.6, hardness: 0.5 },
      [k(39)]: { hz: 330, decay: 0.08, gain: 0.5, noise: 0.5 },
    },
    hardness: 0.45, noise: 0.18, noiseBand: { freq: 1600, q: 0.6, decay: 0.015 }, pitchDrop: { amount: 1, decay: 0.05 },
    polyphony: 6, gainDb: 5.9,
  },

  // ── Klavier (Modalsynthese) ───────────────────────────────────────
  'keys.piano': {
    id: 'keys.piano', label: 'Klavier', category: 'Tasten', demo: 'stride', engine: 'modal',
    piano: { inharmonicity: 3.5e-4, partials: 40, t60: 10, slope: 0.85, strikePos: 1 / 8, unisonCents: 0.8 },
    hardness: 0.55, hardnessVel: 0.8, decayKeyTrack: 1, highDamping: 0, release: 0.35,
    noise: 0.08, noiseBand: { freq: 1200, q: 0.5, decay: 0.02 }, stereo: 0.15, polyphony: 24, gainDb: -3,
  },
  'keys.piano-honky': {
    id: 'keys.piano-honky', label: 'Saloon-Klavier (Ragtime/Stride)', category: 'Tasten', demo: 'stride', engine: 'modal',
    piano: { inharmonicity: 4.5e-4, partials: 36, t60: 6, slope: 0.75, strikePos: 1 / 9, unisonCents: 6 },
    hardness: 0.7, hardnessVel: 0.7, decayKeyTrack: 1, highDamping: 0, release: 0.25,
    noise: 0.12, noiseBand: { freq: 1500, q: 0.5, decay: 0.02 }, stereo: 0.15, polyphony: 24, gainDb: -1.2,
  },

  // ── Hybrid ───────────────────────────────────────────────────────
  'hybrid.braam': {
    id: 'hybrid.braam', label: 'Braam (Trailer-Blech, hybrid)', category: 'Hybrid', demo: 'braam', engine: 'subtractive',
    osc: [{ wave: 'saw', unison: 5, spread: 18, stereo: 0.9 }, { wave: 'square', octave: -1, level: 0.6 }],
    sub: { level: 0.6, octave: -1, wave: 'sine' },
    filter: { type: 'ladder', cutoff: 300, resonance: 0.25, keyTrack: 0.3, envAmount: 3.5, velAmount: 0.8, drive: 3 },
    filterEnv: { a: 0.25, d: 1.6, s: 0.35, r: 0.6 },
    ampEnv: { a: 0.12, d: 1.2, s: 0.75, r: 0.9 },
    shaper: { drive: 2.5, asymmetry: 0.3 },
    polyphony: 8, gainDb: -9,
  },

  // ── Texturen (granular) ──────────────────────────────────────────
  'texture.grains': {
    id: 'texture.grains', label: 'Kornwolke (granular)', category: 'Texturen', demo: 'texture', engine: 'granular',
    mode: 'grains', density: 22, grainSec: [0.06, 0.3], pitches: [0, 7, 12, 14, 19, 24], harmonics: [1, 0.25, 0.1],
    scatter: 10, spread: 0.95, lowpass: 8000, fadeIn: 2, fadeOut: 3, gainDb: -15.8,
  },
  'texture.cluster': {
    id: 'texture.cluster', label: 'Mikropolyphoner Cluster', category: 'Texturen', demo: 'texture', engine: 'granular',
    mode: 'cluster', voices: 16, width: 1.2, drift: 0.3, harmonics: [1, 0.15], spread: 1, lowpass: 5000, fadeIn: 3, fadeOut: 3, gainDb: -13.3,
  },
  'texture.shimmer': {
    id: 'texture.shimmer', label: 'Schimmer (Obertonkörner)', category: 'Texturen', demo: 'texture', engine: 'granular',
    mode: 'grains', density: 60, grainSec: [0.02, 0.08], pitches: [12, 19, 24, 28, 31, 36], harmonics: [1], scatter: 25,
    spread: 1, lowpass: 12000, fadeIn: 2, fadeOut: 3, gainDb: -17.9,
  },
});
