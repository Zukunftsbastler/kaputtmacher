// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Spelled pitches. A pitch name keeps its letter (step) and accidental
 * (alter), so C# and Db stay distinct even though they share a MIDI number.
 * Correct spelling matters for intervals, chord symbols and key signatures.
 * Octave numbering follows scientific pitch notation: C4 = MIDI 60.
 */

export const STEP_NAMES = /** @type {const} */ (['C', 'D', 'E', 'F', 'G', 'A', 'B']);

/** Semitones of the natural letters above C. */
export const STEP_SEMITONES = /** @type {const} */ ([0, 2, 4, 5, 7, 9, 11]);

/**
 * @typedef {object} PitchName pitch class with spelling
 * @property {number} step letter index 0…6 (C…B)
 * @property {number} alter accidental in semitones (-2…+2 typical)
 */

/**
 * @typedef {PitchName & { octave: number }} Note spelled pitch with octave
 */

/**
 * @param {number} n
 * @param {number} m
 */
export const mod = (n, m) => ((n % m) + m) % m;

const PITCH_NAME_RE = /^([A-Ga-g])(#{1,3}|b{1,3}|x|♯{1,2}|♭{1,2})?$/;
const NOTE_RE = /^([A-Ga-g])(#{1,3}|b{1,3}|x|♯{1,2}|♭{1,2})?(-?\d+)$/;

/**
 * @param {string | undefined} acc
 * @returns {number}
 */
function parseAccidental(acc) {
  if (!acc) return 0;
  if (acc === 'x') return 2;
  if (acc[0] === '#' || acc[0] === '♯') return acc.length;
  return -acc.length;
}

/**
 * @param {string} text e.g. "F#", "Bb", "Ebb", "Fx"
 * @returns {PitchName}
 */
export function parsePitchName(text) {
  const m = PITCH_NAME_RE.exec(text.trim());
  if (!m) throw new SyntaxError(`Invalid pitch name "${text}"`);
  return { step: STEP_NAMES.indexOf(/** @type {any} */ (m[1].toUpperCase())), alter: parseAccidental(m[2]) };
}

/**
 * @param {string} text e.g. "C#4", "Bb-1"
 * @returns {Note}
 */
export function parseNote(text) {
  const m = NOTE_RE.exec(text.trim());
  if (!m) throw new SyntaxError(`Invalid note "${text}"`);
  return {
    step: STEP_NAMES.indexOf(/** @type {any} */ (m[1].toUpperCase())),
    alter: parseAccidental(m[2]),
    octave: Number(m[3]),
  };
}

/**
 * Accepts either a pitch-name string or an object.
 * @param {PitchName | string} p
 * @returns {PitchName}
 */
export function toPitchName(p) {
  return typeof p === 'string' ? parsePitchName(p) : { step: p.step, alter: p.alter };
}

/**
 * @param {PitchName} p
 * @returns {string} e.g. "F#", "Bb", "C##"
 */
export function formatPitchName(p) {
  const acc = p.alter > 0 ? '#'.repeat(p.alter) : 'b'.repeat(-p.alter);
  return STEP_NAMES[p.step] + acc;
}

/**
 * @param {Note} n
 * @returns {string} e.g. "C#4"
 */
export function formatNote(n) {
  return formatPitchName(n) + n.octave;
}

/**
 * @param {PitchName} p
 * @returns {number} pitch class 0…11
 */
export function pitchClass(p) {
  return mod(STEP_SEMITONES[p.step] + p.alter, 12);
}

/**
 * @param {Note} n
 * @returns {number} MIDI number (B#3 = 60 = C4)
 */
export function noteToMidi(n) {
  return (n.octave + 1) * 12 + STEP_SEMITONES[n.step] + n.alter;
}

const SHARP_SPELLING = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];
const FLAT_SPELLING = [[0, 0], [1, -1], [1, 0], [2, -1], [2, 0], [3, 0], [4, -1], [4, 0], [5, -1], [5, 0], [6, -1], [6, 0]];

/**
 * Default spelling of a pitch class (no key context).
 * @param {number} pc
 * @param {boolean} [preferFlats]
 * @returns {PitchName}
 */
export function pitchClassToName(pc, preferFlats = false) {
  const [step, alter] = (preferFlats ? FLAT_SPELLING : SHARP_SPELLING)[mod(Math.round(pc), 12)];
  return { step, alter };
}

/**
 * @param {number} midi integer MIDI number
 * @param {boolean} [preferFlats]
 * @returns {Note}
 */
export function midiToNote(midi, preferFlats = false) {
  const m = Math.round(midi);
  const name = pitchClassToName(m, preferFlats);
  return { ...name, octave: Math.floor(m / 12) - 1 };
}

/**
 * Places a pitch name in the octave whose MIDI number is closest to `nearMidi`
 * (ties go upward).
 * @param {PitchName} p
 * @param {number} nearMidi
 * @returns {Note}
 */
export function placeNear(p, nearMidi) {
  const base = noteToMidi({ ...p, octave: -1 });
  const octave = Math.round((nearMidi - base) / 12) - 1;
  return { ...p, octave };
}

/**
 * Equal-tempered frequency.
 * @param {number} midi may be fractional
 * @param {number} [a4Hz]
 * @returns {number} Hz
 */
export function midiToFreq(midi, a4Hz = 440) {
  return a4Hz * 2 ** ((midi - 69) / 12);
}

/**
 * @param {number} freqHz > 0
 * @param {number} [a4Hz]
 * @returns {number} fractional MIDI number
 */
export function freqToMidi(freqHz, a4Hz = 440) {
  return 69 + 12 * Math.log2(freqHz / a4Hz);
}
