// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Spelled intervals: a generic size (number of letter steps: 1 = unison,
 * 3 = third, 9 = ninth) plus an exact semitone count. Transposing by an
 * interval therefore yields the correct letter (E + M3 = G#, not Ab).
 * Names: P (perfect), M (major), m (minor), A/AA (augmented), d/dd (diminished).
 */

import { STEP_SEMITONES, mod } from './pitch.js';

/**
 * @typedef {object} Interval
 * @property {number} number generic size, >= 1
 * @property {number} semitones
 */

const INTERVAL_RE = /^(P|M|m|A{1,3}|d{1,3})(\d+)$/;

/**
 * @param {number} number generic size >= 1
 * @returns {boolean} true for unisons, fourths, fifths and their octaves
 */
const isPerfectClass = (number) => [0, 3, 4].includes((number - 1) % 7);

/**
 * Semitones of the perfect/major interval of this generic size.
 * @param {number} number
 */
function baseSemitones(number) {
  const simple = (number - 1) % 7;
  return STEP_SEMITONES[simple] + 12 * Math.floor((number - 1) / 7);
}

/**
 * @param {string} name e.g. "M3", "P5", "m7", "A4", "d5", "M9"
 * @returns {Interval}
 */
export function parseInterval(name) {
  const m = INTERVAL_RE.exec(name);
  if (!m) throw new SyntaxError(`Invalid interval "${name}"`);
  const number = Number(m[2]);
  if (number < 1) throw new SyntaxError(`Invalid interval "${name}"`);
  const q = m[1];
  const perfect = isPerfectClass(number);
  let offset;
  if (q === 'P') {
    if (!perfect) throw new SyntaxError(`"${name}": only unisons, fourths, fifths, octaves can be perfect`);
    offset = 0;
  } else if (q === 'M' || q === 'm') {
    if (perfect) throw new SyntaxError(`"${name}": perfect-class intervals cannot be major/minor`);
    offset = q === 'M' ? 0 : -1;
  } else if (q[0] === 'A') {
    offset = q.length;
  } else {
    offset = perfect ? -q.length : -1 - q.length;
  }
  return { number, semitones: baseSemitones(number) + offset };
}

/**
 * @param {Interval} iv
 * @returns {string}
 */
export function formatInterval(iv) {
  const offset = iv.semitones - baseSemitones(iv.number);
  if (isPerfectClass(iv.number)) {
    if (offset === 0) return `P${iv.number}`;
    return (offset > 0 ? 'A'.repeat(offset) : 'd'.repeat(-offset)) + iv.number;
  }
  if (offset === 0) return `M${iv.number}`;
  if (offset === -1) return `m${iv.number}`;
  return (offset > 0 ? 'A'.repeat(offset) : 'd'.repeat(-offset - 1)) + iv.number;
}

/**
 * Accepts either an interval name or an object.
 * @param {Interval | string} iv
 * @returns {Interval}
 */
export const toInterval = (iv) => (typeof iv === 'string' ? parseInterval(iv) : iv);

/**
 * Transposes a spelled note (with octave) by an interval.
 * @param {import('./pitch.js').Note} note
 * @param {Interval | string} interval
 * @param {1 | -1} [direction] 1 = up, -1 = down
 * @returns {import('./pitch.js').Note}
 */
export function transposeNote(note, interval, direction = 1) {
  const iv = toInterval(interval);
  const stepsAbs = note.octave * 7 + note.step + direction * (iv.number - 1);
  const step = mod(stepsAbs, 7);
  const octave = Math.floor(stepsAbs / 7);
  const sourceSemis = note.octave * 12 + STEP_SEMITONES[note.step] + note.alter;
  const targetSemis = sourceSemis + direction * iv.semitones;
  const naturalSemis = octave * 12 + STEP_SEMITONES[step];
  return { step, alter: targetSemis - naturalSemis, octave };
}

/**
 * Transposes a pitch name (no octave) by an interval.
 * @param {import('./pitch.js').PitchName} pitch
 * @param {Interval | string} interval
 * @param {1 | -1} [direction]
 * @returns {import('./pitch.js').PitchName}
 */
export function transposePitch(pitch, interval, direction = 1) {
  const { step, alter } = transposeNote({ ...pitch, octave: 4 }, interval, direction);
  return { step, alter };
}

/**
 * Upward interval from `a` to `b` (b must not be below a).
 * @param {import('./pitch.js').Note} a
 * @param {import('./pitch.js').Note} b
 * @returns {Interval}
 */
export function intervalBetween(a, b) {
  const steps = b.octave * 7 + b.step - (a.octave * 7 + a.step);
  const semis = b.octave * 12 + STEP_SEMITONES[b.step] + b.alter - (a.octave * 12 + STEP_SEMITONES[a.step] + a.alter);
  if (steps < 0) throw new RangeError('intervalBetween: b is below a');
  return { number: steps + 1, semitones: semis };
}
