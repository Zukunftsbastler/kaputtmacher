// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Helpers shared by the harmony engine: chord-tone roles, spelling
 * normalization, Roman-numeral labels for arbitrary chords, and the
 * harmony event type.
 */

import { CHORD_QUALITIES, chordPitches } from '../../theory/chord.js';
import { parseInterval } from '../../theory/interval.js';
import { pitchClass, pitchClassToName, formatPitchName, STEP_SEMITONES, mod } from '../../theory/pitch.js';
import { keyScale } from '../../theory/key.js';

/**
 * @typedef {'T' | 'S' | 'D' | 'X'} HarmonicFunction
 *   tonic, subdominant (pre-dominant), dominant, other/coloristic
 */

/**
 * @typedef {object} HarmonyEvent
 * @property {number} beat start in beats
 * @property {number} dur duration in beats
 * @property {import('../../theory/key.js').Key} key local key
 * @property {string} roman Roman-numeral label in the local key
 * @property {HarmonicFunction} fn
 * @property {import('../../theory/chord.js').Chord} chord
 * @property {import('../../theory/pitch.js').PitchName[]} tones chord tones from the root upward
 * @property {import('../../theory/pitch.js').PitchName} bass
 * @property {number} tension 0…1 (tonal tension relative to the local tonic)
 * @property {string[]} tags e.g. "cadence", "secondary", "borrowed", "tritone-sub", "passing", "pedal", "pivot", "mediant"
 */

/**
 * @typedef {object} ChordRoles pitch classes by function within the chord (−1 = absent)
 * @property {number} root
 * @property {number} third third, or the suspended tone of sus chords
 * @property {number} fifth
 * @property {number} seventh seventh, or the sixth of 6 / m6 chords
 * @property {number[]} extensions 9ths, 11ths, 13ths
 */

/**
 * @param {import('../../theory/chord.js').Chord} chord
 * @returns {ChordRoles}
 */
export function chordRoles(chord) {
  const roles = { root: pitchClass(chord.root), third: -1, fifth: -1, seventh: -1, extensions: /** @type {number[]} */ ([]) };
  const intervals = (CHORD_QUALITIES[chord.quality] ?? []).map(parseInterval);
  const hasThird = intervals.some((iv) => iv.number === 3);
  const hasSeventh = intervals.some((iv) => iv.number === 7);
  for (const iv of intervals) {
    const pc = mod(roles.root + iv.semitones, 12);
    if (iv.number === 1) continue;
    if (iv.number === 3 || (!hasThird && (iv.number === 2 || iv.number === 4) && roles.third < 0)) roles.third = pc;
    else if (iv.number === 5) roles.fifth = pc;
    else if (iv.number === 7 || (iv.number === 6 && !hasSeventh)) roles.seventh = pc;
    else roles.extensions.push(pc);
  }
  return roles;
}

/**
 * Respells awkward accidentals (double sharps/flats, E#, B#, Cb, Fb) to the
 * simplest name, so long chromatic chains stay readable.
 * @param {import('../../theory/pitch.js').PitchName} p
 * @returns {import('../../theory/pitch.js').PitchName}
 */
export function simplifySpelling(p) {
  const pc = pitchClass(p);
  const whiteKeyWithAccidental = p.alter !== 0 && [0, 2, 4, 5, 7, 9, 11].includes(pc);
  if (Math.abs(p.alter) >= 2 || whiteKeyWithAccidental) return pitchClassToName(pc, p.alter < 0);
  return { step: p.step, alter: p.alter };
}

/**
 * @param {import('../../theory/chord.js').Chord} chord
 * @returns {import('../../theory/chord.js').Chord}
 */
export function simplifyChord(chord) {
  /** @type {import('../../theory/chord.js').Chord} */
  const out = { root: simplifySpelling(chord.root), quality: chord.quality };
  if (chord.bass) out.bass = simplifySpelling(chord.bass);
  return out;
}

const NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

/** Quality → Roman-numeral suffix (case is set separately). */
const SUFFIX = Object.freeze(
  /** @type {Record<string, string>} */ ({
    '': '',
    m: '',
    dim: '°',
    aug: '+',
    7: '7',
    m7: '7',
    maj7: 'maj7',
    mMaj7: 'maj7',
    m7b5: 'ø7',
    dim7: '°7',
  }),
);

/**
 * Roman-numeral label of any chord relative to a key (for display and analysis),
 * e.g. "bVI", "V7", "ii7", "#iv°7", "III:7#9". Inversions get figures (6, 64, 65, 43, 42).
 * @param {import('../../theory/chord.js').Chord} chord
 * @param {import('../../theory/key.js').Key} key
 */
export function romanLabel(chord, key) {
  const scale = keyScale(key);
  const n = scale.pitches.length;
  const degree = mod(chord.root.step - key.tonic.step, 7);
  let accidental = '';
  if (n === 7) {
    const scalePc = pitchClass(scale.pitches[degree]);
    const diff = mod(pitchClass(chord.root) - scalePc + 6, 12) - 6;
    accidental = diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff);
  } else {
    const diff = mod(pitchClass(chord.root) - pitchClass(key.tonic) - STEP_SEMITONES[degree] + 6, 12) - 6;
    accidental = diff > 0 ? '#'.repeat(diff) : 'b'.repeat(-diff);
  }
  const roles = chordRoles(chord);
  const minor = roles.third >= 0 && mod(roles.third - roles.root, 12) === 3;
  const numeral = minor || chord.quality === 'dim' || chord.quality === 'm7b5' || chord.quality === 'dim7' ? NUMERALS[degree].toLowerCase() : NUMERALS[degree];
  const suffix = Object.hasOwn(SUFFIX, chord.quality) ? SUFFIX[chord.quality] : `:${chord.quality}`;
  let figure = '';
  if (chord.bass) {
    const b = pitchClass(chord.bass);
    const seventh = roles.seventh >= 0;
    if (b === roles.third) figure = seventh ? '65' : '6';
    else if (b === roles.fifth) figure = seventh ? '43' : '64';
    else if (b === roles.seventh) figure = '42';
    else figure = `/${formatPitchName(chord.bass)}`;
    if (seventh && figure && !figure.startsWith('/')) return `${accidental}${numeral}${suffix.replace('7', '')}${figure}`;
  }
  return `${accidental}${numeral}${suffix}${figure}`;
}

/**
 * Chord tones from the root, and the bass note (slash bass or root).
 * @param {import('../../theory/chord.js').Chord} chord
 */
export function chordTonesAndBass(chord) {
  return { tones: chordPitches(chord), bass: chord.bass ?? chord.root };
}
