// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Keys (tonic + mode), diatonic chords, key signatures and Roman-numeral
 * parsing including secondary functions ("V7/V") and inversion figures.
 *
 * Roman-numeral conventions:
 *  - Case sets the triad quality: "V" major, "v" minor; markers "°" (or "o")
 *    diminished, "ø" half-diminished, "+" augmented.
 *  - Suffixes: "7", "maj7", "9", "add9", "sus2", "sus4", "add6".
 *  - Inversion figures (classical): "6" / "65" first, "64" / "43" second,
 *    "42" / "2" third inversion. Added-sixth chords use "add6".
 *  - Roots are degrees of the key's own scale; "b" / "#" prefixes alter them.
 *    In minor (Aeolian) keys, diminished "vii" chords use the raised leading
 *    tone (as in harmonic minor); "VII" stays on the natural seventh.
 *  - "X/Y" tonicizes degree Y: it is X in the key whose tonic is Y's root
 *    (major if Y is uppercase, minor if lowercase).
 */

import { buildScale, resolveScaleName } from './scale.js';
import { transposePitch } from './interval.js';
import { toPitchName, formatPitchName, pitchClass, mod } from './pitch.js';
import { chordPitches, qualityFromSemitones } from './chord.js';

/**
 * @typedef {object} Key
 * @property {import('./pitch.js').PitchName} tonic
 * @property {string} mode canonical scale name (e.g. "ionian", "aeolian", "dorian")
 */

/**
 * @param {import('./pitch.js').PitchName | string} tonic
 * @param {string} [mode] scale name or alias, default "major"
 * @returns {Key}
 */
export function createKey(tonic, mode = 'major') {
  return { tonic: toPitchName(tonic), mode: resolveScaleName(mode) };
}

/**
 * Parses "C major", "f# minor", "D dorian", "Bb".
 * A lowercase tonic without a mode means minor.
 * @param {string} text
 * @returns {Key}
 */
export function parseKey(text) {
  const [tonicText, modeText] = text.trim().split(/\s+/);
  const lower = tonicText[0] === tonicText[0].toLowerCase();
  return createKey(tonicText[0].toUpperCase() + tonicText.slice(1), modeText ?? (lower ? 'minor' : 'major'));
}

/**
 * @param {Key} key
 * @returns {string} e.g. "D dorian"
 */
export function formatKey(key) {
  return `${formatPitchName(key.tonic)} ${key.mode}`;
}

/**
 * @param {Key} key
 * @returns {import('./scale.js').Scale}
 */
export function keyScale(key) {
  return buildScale(key.tonic, key.mode);
}

/**
 * Stacks diatonic thirds on a scale degree (heptatonic scales only).
 * @param {Key} key
 * @param {number} degree 1…7
 * @param {{ seventh?: boolean }} [options]
 * @returns {import('./chord.js').Chord}
 */
export function diatonicChord(key, degree, { seventh = false } = {}) {
  const scale = keyScale(key);
  if (scale.pitches.length !== 7) throw new RangeError('diatonicChord requires a heptatonic scale');
  const idx = degree - 1;
  const tones = [0, 2, 4, ...(seventh ? [6] : [])].map((o) => scale.pcs[(idx + o) % 7]);
  const semis = tones.map((pc) => mod(pc - tones[0], 12));
  const quality = qualityFromSemitones(semis);
  if (quality === undefined) throw new RangeError(`No chord quality for pattern ${semis}`);
  return { root: scale.pitches[idx], quality };
}

/** Mode → interval from the parent major tonic up to this mode's tonic. */
const MODE_OFFSET_FROM_PARENT = Object.freeze(
  /** @type {Record<string, string>} */ ({
    ionian: 'P1',
    dorian: 'M2',
    phrygian: 'M3',
    lydian: 'P4',
    mixolydian: 'P5',
    aeolian: 'M6',
    locrian: 'M7',
  }),
);

/** Position of the natural letters on the circle of fifths relative to C. */
const LETTER_FIFTHS = [0, 2, 4, -1, 1, 3, 5];

/**
 * Key signature for notation and MIDI export.
 * Non-diatonic scales borrow the signature of the closest diatonic mode
 * (minor third → Aeolian, otherwise Ionian).
 * @param {Key} key
 * @returns {{ fifths: number, minor: boolean }} fifths: sharps (>0) / flats (<0)
 */
export function keySignature(key) {
  const scale = keyScale(key);
  const hasMinorThird = scale.pcs.includes(mod(pitchClass(key.tonic) + 3, 12)) && !scale.pcs.includes(mod(pitchClass(key.tonic) + 4, 12));
  const mode = Object.hasOwn(MODE_OFFSET_FROM_PARENT, key.mode) ? key.mode : hasMinorThird ? 'aeolian' : 'ionian';
  const parent = transposePitch(key.tonic, MODE_OFFSET_FROM_PARENT[mode], -1);
  return { fifths: LETTER_FIFTHS[parent.step] + 7 * parent.alter, minor: hasMinorThird };
}

const ROMAN_VALUES = /** @type {const} */ (['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']);
const ROMAN_RE = /^(b{1,2}|#{1,2})?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(°|o|ø|\+)?(maj7|M7|add9|add6|sus2|sus4|7|9)?(65|64|43|42|6|2)?$/;

/**
 * @typedef {import('./chord.js').Chord & { inversion: number }} RomanChord
 */

/**
 * Root of a (possibly altered) numeral in a key.
 * @param {Key} key
 * @param {string | undefined} accidental
 * @param {string} numeral
 * @param {string | undefined} marker
 * @returns {import('./pitch.js').PitchName}
 */
function numeralRoot(key, accidental, numeral, marker) {
  const scale = keyScale(key);
  if (scale.pitches.length !== 7) throw new RangeError('Roman numerals require a heptatonic key scale');
  const degree = ROMAN_VALUES.indexOf(/** @type {any} */ (numeral.toUpperCase()));
  const root = scale.pitches[degree];
  const leadingToneInMinor = degree === 6 && key.mode === 'aeolian' && (marker === '°' || marker === 'o' || marker === 'ø');
  let alter = accidental ? (accidental[0] === '#' ? accidental.length : -accidental.length) : 0;
  if (leadingToneInMinor && !accidental) alter = 1;
  return { step: root.step, alter: root.alter + alter };
}

/**
 * @param {boolean} upper
 * @param {string | undefined} marker
 * @param {string | undefined} suffix
 * @returns {string} chord quality
 */
function numeralQuality(upper, marker, suffix) {
  if (marker === '°' || marker === 'o') return suffix === '7' ? 'dim7' : 'dim';
  if (marker === 'ø') return 'm7b5';
  if (marker === '+') return suffix === '7' ? 'aug7' : 'aug';
  switch (suffix) {
    case undefined:
      return upper ? '' : 'm';
    case '7':
      return upper ? '7' : 'm7';
    case 'maj7':
    case 'M7':
      return upper ? 'maj7' : 'mMaj7';
    case '9':
      return upper ? '9' : 'm9';
    case 'add9':
      return upper ? 'add9' : 'madd9';
    case 'add6':
      return upper ? '6' : 'm6';
    case 'sus2':
    case 'sus4':
      return suffix;
    default:
      throw new SyntaxError(`Unsupported numeral suffix "${suffix}"`);
  }
}

/** Triad quality → seventh-chord quality implied by seventh-chord figures. */
const TRIAD_TO_SEVENTH = Object.freeze(/** @type {Record<string, string>} */ ({ '': '7', m: 'm7', dim: 'dim7', aug: 'aug7' }));

/** Figured-bass inversion → index of the chord member in the bass. */
const FIGURE_INVERSION = Object.freeze(/** @type {Record<string, number>} */ ({ 6: 1, 65: 1, 64: 2, 43: 2, 42: 3, 2: 3 }));

/**
 * Parses a Roman numeral (e.g. "V7", "ii6", "bVII", "viiø7", "V7/V", "iv64") in a key.
 * @param {string} roman
 * @param {Key} key
 * @returns {RomanChord}
 */
export function parseRoman(roman, key) {
  const [main, target] = roman.trim().split('/');
  let context = key;
  if (target !== undefined) {
    const t = ROMAN_RE.exec(target);
    if (!t) throw new SyntaxError(`Invalid secondary target "${target}"`);
    const targetRoot = numeralRoot(key, t[1], t[2], t[3]);
    context = createKey(targetRoot, t[2] === t[2].toUpperCase() ? 'major' : 'minor');
  }
  const m = ROMAN_RE.exec(main);
  if (!m) throw new SyntaxError(`Invalid Roman numeral "${roman}"`);
  const [, accidental, numeral, marker, suffix, figure] = m;
  const root = numeralRoot(context, accidental, numeral, marker);
  let quality = numeralQuality(numeral === numeral.toUpperCase(), marker, suffix);
  // Figures 65/43/42/2 always denote seventh chords ("V65" = V7 in first inversion).
  if (figure && figure !== '6' && figure !== '64' && Object.hasOwn(TRIAD_TO_SEVENTH, quality)) {
    quality = TRIAD_TO_SEVENTH[quality];
  }
  const inversion = figure ? FIGURE_INVERSION[figure] : 0;
  /** @type {RomanChord} */
  const chord = { root, quality, inversion };
  if (inversion > 0) {
    const tones = chordPitches(chord);
    if (inversion >= tones.length) throw new RangeError(`"${roman}": inversion ${inversion} needs a seventh chord`);
    chord.bass = tones[inversion];
  }
  return chord;
}

/**
 * Degree (0-based) of a pitch class within the key scale, or -1.
 * @param {Key} key
 * @param {number} pc
 */
export function keyDegreeOf(key, pc) {
  return keyScale(key).pcs.indexOf(mod(pc, 12));
}
