// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Melodic profiles of style families (pure data): rhythm cells, contour
 * habits, interval tolerance, non-chord-tone vocabulary, range and form.
 * Styles (Phase 5) choose a profile and may override fields.
 *
 * Rhythm cells are groups of durations in beats (quarter notes) that fill one
 * or two beats; negative values are rests. Weights are relative.
 */

/**
 * @typedef {object} RhythmCell
 * @property {number[]} d durations in beats (negative = rest)
 * @property {number} w weight
 */

/**
 * @typedef {object} MelodyProfile
 * @property {string} id
 * @property {string} label
 * @property {RhythmCell[]} cells
 * @property {number[]} endings durations allowed for the last note of a motif
 * @property {Record<string, number>} steps contour step (scale steps) → weight
 * @property {number} maxLeap largest allowed leap in semitones
 * @property {number} chromatic probability weight of chromatic approach / blue notes (0 = diatonic only)
 * @property {number[]} blueNotes semitones above the tonic usable as blue notes (e.g. [3, 6, 10])
 * @property {number} swing delay of off-beat eighths in beats (0 = straight, 0.16 ≈ triplet swing)
 * @property {number} span preferred range in semitones
 * @property {number} center preferred centre (MIDI) for a lead in the middle register
 * @property {'period' | 'sentence' | 'phrase4' | 'loop' | 'callResponse'} form
 * @property {number} surprise 0…1 tolerance for leaps and unexpected tones
 * @property {number} motifBeats length of the basic idea in beats
 * @property {number} rests probability weight of a breathing rest at segment ends
 * @property {Partial<Record<'stepRatio' | 'leapRecovery' | 'strongChordTones' | 'nctResolved' | 'range' | 'climaxPosition', [number, number]>>} [targets]
 *   style-specific metric corridors (override the general ones in metrics.js)
 */

/** @type {Readonly<Record<string, MelodyProfile>>} */
export const MELODY_PROFILES = Object.freeze({
  lyrical: {
    id: 'lyrical',
    label: 'Lyrisch / klassisch',
    cells: [{ d: [1], w: 3 }, { d: [0.5, 0.5], w: 3 }, { d: [1.5, 0.5], w: 2 }, { d: [2], w: 1.2 }, { d: [0.75, 0.25], w: 0.8 }, { d: [3], w: 0.4 }],
    endings: [2, 3, 4],
    steps: { 1: 4, '-1': 4.4, 2: 1.4, '-2': 1.6, 3: 0.6, '-3': 0.5, 4: 0.35, '-4': 0.25, 0: 0.8 },
    maxLeap: 9,
    chromatic: 0,
    blueNotes: [],
    swing: 0,
    span: 14,
    center: 72,
    form: 'period',
    surprise: 0.3,
    motifBeats: 8,
    rests: 0.2,
  },
  pop: {
    id: 'pop',
    label: 'Pop / Song',
    cells: [{ d: [1], w: 2 }, { d: [0.5, 0.5], w: 3.5 }, { d: [1.5, 0.5], w: 1.6 }, { d: [0.5, 1, 0.5], w: 1.2 }, { d: [2], w: 1 }, { d: [0.75, 0.25], w: 0.6 }, { d: [-0.5, 0.5], w: 0.8 }],
    endings: [1.5, 2, 3],
    steps: { 1: 3.5, '-1': 3.8, 2: 1.6, '-2': 1.6, 3: 0.6, '-3': 0.5, 4: 0.4, '-4': 0.2, 0: 1.6 },
    maxLeap: 9,
    chromatic: 0,
    blueNotes: [],
    swing: 0,
    span: 12,
    center: 70,
    form: 'sentence',
    surprise: 0.35,
    motifBeats: 8,
    rests: 0.35,
  },
  arcade: {
    id: 'arcade',
    label: 'Arcade (zackig, synkopiert, eingängig)',
    // Sixteenth-note snap and syncopation; question-and-answer phrases so the hook sticks.
    cells: [
      { d: [0.25, 0.25, 0.5], w: 3 }, { d: [0.5, 0.5], w: 3 }, { d: [0.75, 0.25], w: 2 }, { d: [0.25, 0.5, 0.25], w: 2 },
      { d: [0.5, 0.25, 0.25], w: 1.5 }, { d: [1], w: 1.2 }, { d: [-0.5, 0.5], w: 1 }, { d: [0.25, 0.25, 0.25, 0.25], w: 1 },
    ],
    endings: [1, 1.5, 2],
    steps: { 1: 3, '-1': 3.2, 2: 2.2, '-2': 2.2, 3: 1, '-3': 1, 4: 0.8, '-4': 0.6, 7: 0.4, 0: 1.4 },
    maxLeap: 12,
    chromatic: 0.15,
    blueNotes: [],
    swing: 0,
    span: 16,
    center: 76,
    form: 'period',
    surprise: 0.45,
    motifBeats: 4,
    rests: 0.25,
    targets: { stepRatio: [0.2, 0.8], nctResolved: [0.6, 1] },
  },
  jig: {
    id: 'jig',
    label: 'Jig (6/8, Folk/Celtic)',
    // Dotted-quarter pulse: runs of three eighths, quarter–eighth lilt, held dotted quarters.
    cells: [{ d: [0.5, 0.5, 0.5], w: 9 }, { d: [1, 0.5], w: 3 }, { d: [1.5], w: 0.5 }, { d: [0.5, 1], w: 0.5 }],
    endings: [1.5],
    steps: { 1: 4, '-1': 4.2, 2: 2, '-2': 2.2, 3: 0.7, '-3': 0.8, 4: 0.4, '-4': 0.3, 0: 0.4 },
    maxLeap: 9,
    chromatic: 0,
    blueNotes: [],
    swing: 0,
    span: 14,
    center: 74,
    form: 'period',
    surprise: 0.25,
    motifBeats: 6,
    rests: 0.05,
  },
  folk: {
    id: 'folk',
    label: 'Folk / Fantasy',
    cells: [{ d: [1], w: 2 }, { d: [0.5, 0.5], w: 3 }, { d: [0.75, 0.25], w: 1.5 }, { d: [1.5, 0.5], w: 1.5 }, { d: [0.25, 0.25, 0.5], w: 0.8 }, { d: [2], w: 0.8 }],
    endings: [1.5, 2, 3],
    steps: { 1: 4, '-1': 4, 2: 1.6, '-2': 1.8, 3: 0.8, '-3': 0.7, 4: 0.5, '-4': 0.3, 0: 0.6 },
    maxLeap: 9,
    chromatic: 0,
    blueNotes: [],
    swing: 0,
    span: 14,
    center: 74,
    form: 'period',
    surprise: 0.3,
    motifBeats: 8,
    rests: 0.15,
  },
  cinematic: {
    id: 'cinematic',
    label: 'Filmisch / heroisch',
    cells: [{ d: [1.5, 0.5], w: 2.5 }, { d: [2], w: 2 }, { d: [1], w: 2 }, { d: [0.75, 0.25], w: 1.2 }, { d: [3], w: 0.8 }, { d: [0.5, 0.5], w: 1.2 }, { d: [4], w: 0.4 }],
    endings: [2, 3, 4],
    steps: { 1: 3, '-1': 3.5, 2: 1.5, '-2': 1.5, 3: 1.4, '-3': 0.8, 4: 1.3, '-4': 0.5, 7: 0.3, 0: 0.5 },
    maxLeap: 12,
    chromatic: 0,
    blueNotes: [],
    swing: 0,
    span: 16,
    center: 72,
    form: 'sentence',
    surprise: 0.4,
    motifBeats: 8,
    rests: 0.15,
  },
  jazz: {
    id: 'jazz',
    label: 'Jazz / Lo-Fi',
    cells: [{ d: [0.5, 0.5], w: 3 }, { d: [-0.5, 0.5], w: 1.5 }, { d: [0.5, 1, 0.5], w: 1.5 }, { d: [1], w: 1.5 }, { d: [1.5, 0.5], w: 1 }, { d: [0.5, 0.5, 0.5, 0.5], w: 1 }, { d: [-1], w: 0.5 }, { d: [2], w: 0.6 }],
    endings: [1, 1.5, 2],
    steps: { 1: 3.5, '-1': 4, 2: 1.8, '-2': 2, 3: 1, '-3': 0.8, 4: 0.5, '-4': 0.4, 0: 0.4 },
    maxLeap: 10,
    chromatic: 0.45,
    blueNotes: [3, 10],
    swing: 0.16,
    span: 14,
    center: 70,
    form: 'phrase4',
    surprise: 0.5,
    motifBeats: 4,
    rests: 0.45,
  },
  swing: {
    id: 'swing',
    label: 'Swing / Electro Swing',
    cells: [{ d: [0.5, 0.5], w: 3 }, { d: [0.5, 1, 0.5], w: 2 }, { d: [-0.5, 0.5], w: 1.5 }, { d: [1, 0.5, 0.5], w: 1.5 }, { d: [1], w: 1.2 }, { d: [0.5, 0.5, 1], w: 1.2 }, { d: [-1], w: 0.5 }],
    endings: [1, 1.5, 2],
    steps: { 1: 3.2, '-1': 3.8, 2: 2, '-2': 2, 3: 1, '-3': 0.9, 4: 0.6, '-4': 0.4, 0: 1.2 },
    maxLeap: 10,
    chromatic: 0.5,
    blueNotes: [3, 6, 10],
    swing: 0.16,
    span: 13,
    center: 72,
    form: 'callResponse',
    surprise: 0.5,
    motifBeats: 4,
    rests: 0.4,
  },
  chip: {
    id: 'chip',
    label: 'Chiptune',
    cells: [{ d: [0.5, 0.5], w: 3 }, { d: [0.25, 0.25, 0.5], w: 2 }, { d: [0.25, 0.25, 0.25, 0.25], w: 1.5 }, { d: [1], w: 1.5 }, { d: [0.75, 0.25], w: 1.2 }, { d: [1.5, 0.5], w: 1 }],
    endings: [1, 2],
    steps: { 1: 3, '-1': 3, 2: 2, '-2': 2, 3: 1.2, '-3': 1, 4: 1, '-4': 0.8, 7: 0.6, '-7': 0.4, 0: 1.2 },
    maxLeap: 12,
    chromatic: 0.1,
    blueNotes: [],
    swing: 0,
    span: 17,
    center: 76,
    form: 'sentence',
    surprise: 0.55,
    motifBeats: 4,
    rests: 0.2,
    // Chip melodies are arpeggio-driven: leaps are idiomatic.
    targets: { stepRatio: [0.2, 0.8], nctResolved: [0.6, 1] },
  },
  ambient: {
    id: 'ambient',
    label: 'Ambient (sparsam)',
    cells: [{ d: [2], w: 2 }, { d: [3], w: 1.5 }, { d: [-2], w: 1.5 }, { d: [1, 1], w: 1 }, { d: [4], w: 1 }, { d: [1.5, 0.5], w: 0.6 }, { d: [-1], w: 0.8 }],
    endings: [3, 4],
    steps: { 1: 3, '-1': 3.5, 2: 2, '-2': 2, 3: 1.2, '-3': 1, 4: 0.8, '-4': 0.6, 0: 0.4 },
    maxLeap: 9,
    chromatic: 0,
    blueNotes: [],
    swing: 0,
    span: 12,
    center: 76,
    form: 'loop',
    surprise: 0.25,
    motifBeats: 8,
    rests: 0.5,
    // Sparse, floating lines: few notes, narrow range is fine.
    targets: { range: [2, 16], climaxPosition: [0, 1] },
  },
  dark: {
    id: 'dark',
    label: 'Dunkel / unheimlich',
    cells: [{ d: [2], w: 2 }, { d: [1, 1], w: 1.5 }, { d: [-1], w: 1.2 }, { d: [1.5, 0.5], w: 1 }, { d: [3], w: 1 }, { d: [0.5, 0.5], w: 0.6 }],
    endings: [2, 3, 4],
    steps: { 1: 4, '-1': 4.5, 2: 0.9, '-2': 1, 3: 0.4, '-3': 0.4, 0: 1.2 },
    maxLeap: 7,
    chromatic: 0.35,
    blueNotes: [1, 6],
    swing: 0,
    span: 9,
    center: 64,
    form: 'phrase4',
    surprise: 0.6,
    motifBeats: 8,
    rests: 0.45,
  },
});

/**
 * @param {string | MelodyProfile} profile
 * @returns {MelodyProfile}
 */
export function getMelodyProfile(profile) {
  if (typeof profile !== 'string') return profile;
  if (!Object.hasOwn(MELODY_PROFILES, profile)) throw new RangeError(`Unknown melody profile "${profile}"`);
  return MELODY_PROFILES[profile];
}
