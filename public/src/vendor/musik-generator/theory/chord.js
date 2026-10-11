// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Chords: qualities as spelled interval stacks, chord-symbol parsing and
 * formatting, and simple close-position voicing. (Voice leading proper is
 * part of the harmony engine in Phase 3.)
 */

import { parseInterval, transposePitch, transposeNote } from './interval.js';
import { toPitchName, formatPitchName, pitchClass, noteToMidi, placeNear, mod } from './pitch.js';

/**
 * Chord qualities keyed by their canonical symbol suffix.
 * @type {Readonly<Record<string, readonly string[]>>}
 */
export const CHORD_QUALITIES = Object.freeze({
  '': ['P1', 'M3', 'P5'],
  m: ['P1', 'm3', 'P5'],
  dim: ['P1', 'm3', 'd5'],
  aug: ['P1', 'M3', 'A5'],
  sus2: ['P1', 'M2', 'P5'],
  sus4: ['P1', 'P4', 'P5'],
  5: ['P1', 'P5'],
  6: ['P1', 'M3', 'P5', 'M6'],
  m6: ['P1', 'm3', 'P5', 'M6'],
  7: ['P1', 'M3', 'P5', 'm7'],
  maj7: ['P1', 'M3', 'P5', 'M7'],
  m7: ['P1', 'm3', 'P5', 'm7'],
  mMaj7: ['P1', 'm3', 'P5', 'M7'],
  m7b5: ['P1', 'm3', 'd5', 'm7'],
  dim7: ['P1', 'm3', 'd5', 'd7'],
  aug7: ['P1', 'M3', 'A5', 'm7'],
  augMaj7: ['P1', 'M3', 'A5', 'M7'],
  '7sus4': ['P1', 'P4', 'P5', 'm7'],
  add9: ['P1', 'M3', 'P5', 'M9'],
  madd9: ['P1', 'm3', 'P5', 'M9'],
  69: ['P1', 'M3', 'P5', 'M6', 'M9'],
  m69: ['P1', 'm3', 'P5', 'M6', 'M9'],
  9: ['P1', 'M3', 'P5', 'm7', 'M9'],
  maj9: ['P1', 'M3', 'P5', 'M7', 'M9'],
  m9: ['P1', 'm3', 'P5', 'm7', 'M9'],
  '7b9': ['P1', 'M3', 'P5', 'm7', 'm9'],
  '7#9': ['P1', 'M3', 'P5', 'm7', 'A9'],
  '7#11': ['P1', 'M3', 'P5', 'm7', 'A11'],
  '7b13': ['P1', 'M3', 'P5', 'm7', 'm13'],
  '7alt': ['P1', 'M3', 'm7', 'm9', 'A9', 'm13'],
  'maj7#11': ['P1', 'M3', 'P5', 'M7', 'A11'],
  11: ['P1', 'P5', 'm7', 'M9', 'P11'],
  m11: ['P1', 'm3', 'P5', 'm7', 'M9', 'P11'],
  13: ['P1', 'M3', 'P5', 'm7', 'M9', 'M13'],
  maj13: ['P1', 'M3', 'P5', 'M7', 'M9', 'M13'],
  m13: ['P1', 'm3', 'P5', 'm7', 'M9', 'M13'],
  quartal: ['P1', 'P4', 'm7'],
  quartal4: ['P1', 'P4', 'm7', 'm10'],
});

/** Alternative spellings of quality suffixes. */
const QUALITY_ALIASES = Object.freeze(
  /** @type {Record<string, string>} */ ({
    M: '',
    maj: '',
    min: 'm',
    '-': 'm',
    '°': 'dim',
    o: 'dim',
    '+': 'aug',
    sus: 'sus4',
    M7: 'maj7',
    Δ: 'maj7',
    Δ7: 'maj7',
    ma7: 'maj7',
    '-7': 'm7',
    min7: 'm7',
    ø: 'm7b5',
    ø7: 'm7b5',
    'm7-5': 'm7b5',
    '°7': 'dim7',
    o7: 'dim7',
    '+7': 'aug7',
    '7#5': 'aug7',
    mM7: 'mMaj7',
    'm(maj7)': 'mMaj7',
    '6/9': '69',
    M9: 'maj9',
    '-9': 'm9',
    M13: 'maj13',
  }),
);

/**
 * @typedef {object} Chord
 * @property {import('./pitch.js').PitchName} root
 * @property {string} quality canonical key of CHORD_QUALITIES
 * @property {import('./pitch.js').PitchName} [bass] slash-chord bass (if not the root)
 */

/**
 * @param {string} suffix
 * @returns {string} canonical quality
 */
export function resolveQuality(suffix) {
  const q = Object.hasOwn(QUALITY_ALIASES, suffix) ? QUALITY_ALIASES[suffix] : suffix;
  if (!Object.hasOwn(CHORD_QUALITIES, q)) throw new RangeError(`Unknown chord quality "${suffix}"`);
  return q;
}

const SYMBOL_RE = /^([A-G](?:#{1,2}|b{1,2}|x)?)(.*?)(?:\/([A-G](?:#{1,2}|b{1,2}|x)?))?$/;

/**
 * Parses chord symbols such as "C", "F#m7b5", "Bb7#9", "Ebmaj7/G", "Dsus4".
 * @param {string} symbol
 * @returns {Chord}
 */
export function parseChordSymbol(symbol) {
  const text = symbol.trim();
  // "6/9" contains a slash that is not a bass note; protect it before splitting.
  const m = SYMBOL_RE.exec(text.replace('6/9', '69'));
  if (!m) throw new SyntaxError(`Invalid chord symbol "${symbol}"`);
  /** @type {Chord} */
  const chord = { root: toPitchName(m[1]), quality: resolveQuality(m[2]) };
  if (m[3]) chord.bass = toPitchName(m[3]);
  return chord;
}

/**
 * @param {Chord} chord
 * @returns {string}
 */
export function formatChordSymbol(chord) {
  const base = formatPitchName(chord.root) + chord.quality;
  return chord.bass ? `${base}/${formatPitchName(chord.bass)}` : base;
}

/**
 * @param {Chord} chord
 * @returns {import('./interval.js').Interval[]}
 */
export function chordIntervals(chord) {
  return CHORD_QUALITIES[chord.quality].map(parseInterval);
}

/**
 * Spelled chord tones from the root upward (the slash bass is not included).
 * @param {Chord} chord
 * @returns {import('./pitch.js').PitchName[]}
 */
export function chordPitches(chord) {
  return CHORD_QUALITIES[chord.quality].map((iv) => transposePitch(chord.root, iv));
}

/**
 * @param {Chord} chord
 * @returns {number[]} pitch classes (root first, slash bass appended if foreign)
 */
export function chordPcs(chord) {
  const pcs = chordPitches(chord).map(pitchClass);
  if (chord.bass) {
    const b = pitchClass(chord.bass);
    if (!pcs.includes(b)) pcs.push(b);
  }
  return pcs;
}

/**
 * Close-position voicing as ascending MIDI numbers.
 * @param {Chord} chord
 * @param {{ rootNear?: number, inversion?: number }} [options]
 *   rootNear: MIDI number the root is placed closest to (default 60);
 *   inversion: how many lowest tones move up an octave
 * @returns {number[]}
 */
export function voiceClose(chord, { rootNear = 60, inversion = 0 } = {}) {
  const rootNote = placeNear(chord.root, rootNear);
  let midi = CHORD_QUALITIES[chord.quality].map((iv) => noteToMidi(transposeNote(rootNote, iv)));
  for (let i = 0; i < mod(inversion, midi.length); i++) {
    const lowest = /** @type {number} */ (midi.shift());
    midi.push(lowest + 12);
  }
  if (chord.bass) {
    const bassPc = pitchClass(chord.bass);
    midi = midi.filter((m) => mod(m, 12) !== bassPc);
    let bass = midi[0] - mod(midi[0] - bassPc, 12);
    if (bass === midi[0]) bass -= 12;
    midi.unshift(bass);
  }
  return midi;
}

/** Reverse lookup: semitone pattern (above the root) → quality. */
const QUALITY_BY_PATTERN = (() => {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const [q, ivs] of Object.entries(CHORD_QUALITIES)) {
    const key = ivs.map((iv) => parseInterval(iv).semitones).join(',');
    if (!map.has(key)) map.set(key, q);
  }
  return map;
})();

/**
 * Finds the quality whose interval stack matches the given semitones
 * above the root (e.g. [0, 4, 7, 10] → "7").
 * @param {readonly number[]} semitones
 * @returns {string | undefined}
 */
export function qualityFromSemitones(semitones) {
  return QUALITY_BY_PATTERN.get(semitones.join(','));
}
