// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Character axes (REQUIREMENTS 3.3): eight combinable dimensions, 0…1 each,
 * that modify any style. A style defines its own default values; a recipe
 * (or later the game at runtime) moves them. Effects are derived from the
 * difference to the style default (so the default reproduces the style as
 * designed) plus a few absolute thresholds for structural changes.
 *
 *  impact   Wucht        louder, harder drums; booms/impacts; octave doublings
 *  space    Raum         longer, bigger reverb; more send; slower harmony (cathedral)
 *  pressure Druck        darker mode, slower tempo, more chromaticism, pedal points
 *  pulse    Puls         ostinato bass (pedal/octave eighths), arpeggios
 *  drive    Vorwärtsdrang faster tempo, syncopation, fuller grooves, accelerando
 *  density  Dichte       roles enter earlier/later, busier/sparser melody
 *  depth    Tiefe        sub-bass layer, booms
 *  texture  Textur       noise/drone layers, melody recedes
 */

export const AXES = /** @type {const} */ (['impact', 'space', 'pressure', 'pulse', 'drive', 'density', 'depth', 'texture']);

/** @typedef {typeof AXES[number]} Axis */

export const AXIS_LABELS = Object.freeze(
  /** @type {Record<Axis, string>} */ ({
    impact: 'Wucht',
    space: 'Raum',
    pressure: 'Druck',
    pulse: 'Puls',
    drive: 'Vorwärtsdrang',
    density: 'Dichte',
    depth: 'Tiefe',
    texture: 'Textur',
  }),
);

/** @param {number} x */
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * @typedef {object} AxisEffects
 * @property {Record<Axis, number>} values resolved axis values
 * @property {number} tempoFactor
 * @property {boolean} accelerate accelerando in the last section
 * @property {number} brightnessShift change of mode brightness (−1…1)
 * @property {number} syncopation 0…1 for drum grooves
 * @property {number} reverbScale factor on RT60
 * @property {number} reverbFloor minimum RT60 in seconds (cathedral-sized spaces at high values)
 * @property {number} sizeShift change of reverb size
 * @property {number} sendScale factor on reverb/delay sends
 * @property {number} thresholdShift added to role entry thresholds
 * @property {number} melodyDensity 0…1 rhythm density of melodies
 * @property {number} drumsGainDb
 * @property {boolean} boom boom hits on section starts
 * @property {boolean} impactHits impact hits on high-intensity section starts
 * @property {boolean} octaveDouble melody doubled an octave below
 * @property {boolean} subLayer sub-bass doubling of the bass line
 * @property {import('../compose/bass.js').BassPattern | null} bassForce
 * @property {boolean} arpForce
 * @property {boolean} textureForce
 * @property {boolean} droneForce
 * @property {boolean} melodySparse melody only from the second half on
 * @property {number} chromaticism factor on harmonic colour
 * @property {number} mergeBoost added to the harmonic-rhythm merge probability
 * @property {number} splitBoost added to the harmonic-rhythm split probability
 * @property {boolean} pedal tonic pedal in intro/breakdown/outro
 */

/**
 * @param {Record<string, number>} defaults the style's axis defaults
 * @param {Partial<Record<Axis, number>>} [overrides]
 * @returns {AxisEffects}
 */
export function resolveAxes(defaults, overrides = {}) {
  /** @type {Record<Axis, number>} */
  const v = /** @type {any} */ ({});
  /** @type {Record<Axis, number>} */
  const d = /** @type {any} */ ({});
  for (const a of AXES) {
    const base = clamp01(defaults[a] ?? 0.5);
    v[a] = clamp01(overrides[a] ?? base);
    d[a] = v[a] - base;
  }
  return {
    values: v,
    tempoFactor: Math.min(1.35, Math.max(0.75, 1 + 0.25 * d.drive - 0.15 * d.pressure)),
    accelerate: v.drive >= 0.85,
    brightnessShift: -0.7 * d.pressure,
    syncopation: clamp01(0.3 + 0.6 * v.drive),
    reverbScale: 2 ** (1.6 * d.space),
    reverbFloor: v.space >= 0.85 ? 5 + 20 * (v.space - 0.85) : 0,
    sizeShift: 0.8 * d.space,
    sendScale: 2 ** (1.5 * d.space),
    thresholdShift: -0.5 * d.density,
    melodyDensity: Math.min(0.95, Math.max(0.1, 0.5 + 0.8 * d.density)),
    drumsGainDb: 8 * d.impact,
    boom: v.impact >= 0.65 || v.depth >= 0.8,
    impactHits: v.impact >= 0.7,
    octaveDouble: v.impact >= 0.85,
    subLayer: v.depth >= 0.65,
    bassForce: v.pulse >= 0.85 ? (v.pressure >= 0.6 ? 'pedal8' : 'octave8') : null,
    arpForce: v.pulse >= 0.75,
    textureForce: v.texture >= 0.75,
    droneForce: v.pressure >= 0.8 || v.texture >= 0.85,
    melodySparse: v.texture >= 0.85,
    chromaticism: Math.max(0, 1 + d.pressure),
    mergeBoost: 0.4 * d.space,
    splitBoost: 0.3 * d.drive,
    pedal: v.pressure >= 0.8,
  };
}
