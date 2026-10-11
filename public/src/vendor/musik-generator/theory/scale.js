// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Scales and modes, defined by spelled intervals so every degree gets the
 * right letter. Includes the "brightness" ordering of the diatonic modes
 * (Lydian brightest … Locrian darkest), used to map the valence parameter.
 */

import { parseInterval, transposeNote } from './interval.js';
import { toPitchName, pitchClass, noteToMidi, mod } from './pitch.js';

/** @type {Readonly<Record<string, readonly string[]>>} */
export const SCALES = Object.freeze({
  // Diatonic modes
  ionian: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'M7'],
  dorian: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'm7'],
  phrygian: ['P1', 'm2', 'm3', 'P4', 'P5', 'm6', 'm7'],
  lydian: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'M7'],
  mixolydian: ['P1', 'M2', 'M3', 'P4', 'P5', 'M6', 'm7'],
  aeolian: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'm7'],
  locrian: ['P1', 'm2', 'm3', 'P4', 'd5', 'm6', 'm7'],
  // Minor variants and their modes
  harmonicMinor: ['P1', 'M2', 'm3', 'P4', 'P5', 'm6', 'M7'],
  melodicMinor: ['P1', 'M2', 'm3', 'P4', 'P5', 'M6', 'M7'],
  phrygianDominant: ['P1', 'm2', 'M3', 'P4', 'P5', 'm6', 'm7'],
  lydianDominant: ['P1', 'M2', 'M3', 'A4', 'P5', 'M6', 'm7'],
  altered: ['P1', 'm2', 'A2', 'M3', 'd5', 'm6', 'm7'],
  locrianNat2: ['P1', 'M2', 'm3', 'P4', 'd5', 'm6', 'm7'],
  // Pentatonic, blues, symmetric
  majorPentatonic: ['P1', 'M2', 'M3', 'P5', 'M6'],
  minorPentatonic: ['P1', 'm3', 'P4', 'P5', 'm7'],
  blues: ['P1', 'm3', 'P4', 'd5', 'P5', 'm7'],
  majorBlues: ['P1', 'M2', 'm3', 'M3', 'P5', 'M6'],
  wholeTone: ['P1', 'M2', 'M3', 'A4', 'A5', 'm7'],
  diminishedWH: ['P1', 'M2', 'm3', 'P4', 'd5', 'm6', 'M6', 'M7'],
  diminishedHW: ['P1', 'm2', 'A2', 'M3', 'A4', 'P5', 'M6', 'm7'],
  chromatic: ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'A4', 'P5', 'm6', 'M6', 'm7', 'M7'],
});

/** @type {Readonly<Record<string, string>>} */
export const SCALE_ALIASES = Object.freeze({
  major: 'ionian',
  minor: 'aeolian',
  naturalMinor: 'aeolian',
  superlocrian: 'altered',
});

/** Diatonic modes from brightest to darkest. */
export const MODE_BRIGHTNESS = /** @type {const} */ ([
  'lydian',
  'ionian',
  'mixolydian',
  'dorian',
  'aeolian',
  'phrygian',
  'locrian',
]);

/**
 * @param {string} name scale name or alias
 * @returns {string} canonical name
 */
export function resolveScaleName(name) {
  const canonical = SCALE_ALIASES[name] ?? name;
  if (!Object.hasOwn(SCALES, canonical)) throw new RangeError(`Unknown scale "${name}"`);
  return canonical;
}

/**
 * Maps brightness 0…1 to a diatonic mode (1 = Lydian, 0 = Phrygian;
 * Locrian only when explicitly included, as it is rarely usable as a tonic mode).
 * @param {number} brightness
 * @param {{ includeLocrian?: boolean }} [options]
 * @returns {string}
 */
export function modeForBrightness(brightness, { includeLocrian = false } = {}) {
  const modes = includeLocrian ? MODE_BRIGHTNESS : MODE_BRIGHTNESS.slice(0, 6);
  const b = Math.min(1, Math.max(0, brightness));
  return modes[Math.round((1 - b) * (modes.length - 1))];
}

/**
 * @param {string} mode diatonic mode name
 * @returns {number} brightness 0…1 (Locrian = 0, Lydian = 1)
 */
export function modeBrightness(mode) {
  const i = MODE_BRIGHTNESS.indexOf(/** @type {any} */ (resolveScaleName(mode)));
  if (i < 0) throw new RangeError(`"${mode}" is not a diatonic mode`);
  return 1 - i / (MODE_BRIGHTNESS.length - 1);
}

/**
 * @typedef {object} Scale
 * @property {import('./pitch.js').PitchName} tonic
 * @property {string} name canonical scale name
 * @property {import('./interval.js').Interval[]} intervals
 * @property {import('./pitch.js').PitchName[]} pitches spelled degrees
 * @property {number[]} pcs pitch classes of the degrees
 */

/**
 * @param {import('./pitch.js').PitchName | string} tonic
 * @param {string} name scale name or alias
 * @returns {Scale}
 */
export function buildScale(tonic, name) {
  const t = toPitchName(tonic);
  const canonical = resolveScaleName(name);
  const intervals = SCALES[canonical].map(parseInterval);
  const pitches = intervals.map((iv) => {
    const n = transposeNote({ ...t, octave: 4 }, iv);
    return { step: n.step, alter: n.alter };
  });
  return { tonic: t, name: canonical, intervals, pitches, pcs: pitches.map(pitchClass) };
}

/**
 * Spelled note of a scale degree; degrees wrap into neighbouring octaves.
 * @param {Scale} scale
 * @param {number} degree 0-based (0 = tonic, 7 = tonic an octave up in a heptatonic scale, -1 = below)
 * @param {number} [tonicOctave] octave of degree 0
 * @returns {import('./pitch.js').Note}
 */
export function scaleDegreeNote(scale, degree, tonicOctave = 4) {
  const n = scale.intervals.length;
  const idx = mod(degree, n);
  const oct = Math.floor(degree / n);
  const note = transposeNote({ ...scale.tonic, octave: tonicOctave }, scale.intervals[idx]);
  return { ...note, octave: note.octave + oct };
}

/**
 * @param {Scale} scale
 * @param {number} pc pitch class
 */
export function scaleContains(scale, pc) {
  return scale.pcs.includes(mod(pc, 12));
}

/**
 * All MIDI numbers of the scale within [low, high], ascending.
 * @param {Scale} scale
 * @param {number} low
 * @param {number} high
 * @returns {number[]}
 */
export function scaleMidiRange(scale, low, high) {
  /** @type {number[]} */
  const out = [];
  for (let m = Math.ceil(low); m <= high; m++) if (scale.pcs.includes(mod(m, 12))) out.push(m);
  return out;
}

/**
 * @param {Scale} scale
 * @param {number} degree
 * @param {number} [tonicOctave]
 * @returns {number} MIDI number of a scale degree
 */
export function scaleDegreeMidi(scale, degree, tonicOctave = 4) {
  return noteToMidi(scaleDegreeNote(scale, degree, tonicOctave));
}
