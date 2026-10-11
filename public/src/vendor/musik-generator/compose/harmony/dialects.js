// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Harmonic dialects: the harmony "grammar" of a style family as pure data.
 * Styles (Phase 5) pick a dialect and may override any field.
 *
 * Token syntax: "rn:quality@F*weight"
 *   rn       Roman numeral relative to the key's own scale (see theory/key.js), may
 *            include a secondary target ("V/ii") and an inversion figure ("ii6")
 *   quality  optional explicit chord quality ("m7", "maj9", "7b9", "6", "dq3" = diatonic quartal)
 *   F        harmonic function T | S | D | X (inferred when omitted)
 *   weight   relative frequency (default 1)
 * Cadence syntax: "token token token *weight".
 * All progressions here are generic textbook/idiomatic formulas (not protectable).
 */

/**
 * @typedef {object} Dialect
 * @property {string} id
 * @property {string} label
 * @property {Record<string, string[]>} vocab mode → tokens ("major" = ionian, "minor" = aeolian, or any mode name)
 * @property {Record<string, Record<string, string[]>>} cadences mode → cadence type → formulas
 * @property {string} defaultCadence
 * @property {Record<string, Record<string, number>>} fnWeights transition weights between functions
 * @property {Record<string, number>} rootMotion multiplier by root interval in semitones (mod 12)
 * @property {{ split: number, merge: number }} rhythm probability to split a bar in two / merge two bars
 * @property {{ secondary: number, tritoneSub: number, passingDim: number, borrowed: number, extensions: number, neoRiemann: number }} color
 * @property {Record<string, string[]>} extend quality → upgrades for the extension pass
 * @property {string} voicing default voicing style (see voicing.js)
 * @property {Partial<import('./voicing.js').VoiceLeadingRules>} rules voice-leading rule weights
 */

const FUNCTIONAL = {
  T: { T: 0.5, S: 1.3, D: 0.9, X: 0.3 },
  S: { T: 0.35, S: 0.6, D: 1.5, X: 0.2 },
  D: { T: 1.6, S: 0.15, D: 0.4, X: 0.2 },
  X: { T: 1, S: 0.8, D: 0.8, X: 0.3 },
};
const LOOSE = {
  T: { T: 0.8, S: 1.2, D: 1, X: 0.8 },
  S: { T: 0.9, S: 0.7, D: 1.1, X: 0.7 },
  D: { T: 1.3, S: 0.6, D: 0.5, X: 0.6 },
  X: { T: 1, S: 0.9, D: 0.8, X: 0.6 },
};
const MODAL = {
  T: { T: 0.4, S: 1, D: 0.6, X: 1.2 },
  S: { T: 1, S: 0.6, D: 0.5, X: 0.9 },
  D: { T: 1, S: 0.6, D: 0.3, X: 0.7 },
  X: { T: 1.2, S: 0.9, D: 0.5, X: 0.7 },
};
const JAZZ = {
  T: { T: 0.6, S: 1.6, D: 0.7, X: 0.5 },
  S: { T: 0.25, S: 0.5, D: 2.2, X: 0.3 },
  D: { T: 2, S: 0.6, D: 0.6, X: 0.3 },
  X: { T: 0.8, S: 1.2, D: 1, X: 0.3 },
};

/** Root motion in semitones mod 12 → multiplier (5 = up a fourth = down a fifth). */
const FIFTHS_DOWN = { 0: 0.2, 1: 0.7, 2: 1.1, 3: 1, 4: 1, 5: 1.7, 6: 0.4, 7: 0.9, 8: 1, 9: 1.05, 10: 1.1, 11: 0.7 };
const STEPWISE = { 0: 0.2, 1: 0.9, 2: 1.3, 3: 1.15, 4: 1.1, 5: 1, 6: 0.5, 7: 0.9, 8: 1.15, 9: 1.15, 10: 1.3, 11: 0.9 };
const JAZZ_MOTION = { 0: 0.2, 1: 1.1, 2: 1, 3: 0.9, 4: 0.8, 5: 2, 6: 0.5, 7: 0.7, 8: 0.9, 9: 1, 10: 1, 11: 1.2 };

const EXTEND_POP = { '': ['add9', 'sus2', 'sus4', '6'], m: ['m7', 'madd9'], 7: ['9', '7sus4'] };
const EXTEND_JAZZ = { maj7: ['maj9', '69'], 6: ['69'], m7: ['m9', 'm11'], m6: ['m69'], 7: ['9', '13', '7b9'], m7b5: ['m7b5'] };
const EXTEND_CINEMA = { '': ['add9', 'sus2', 'sus4'], m: ['madd9', 'm7'], 7: ['7sus4'] };

/** @type {Readonly<Record<string, Dialect>>} */
export const DIALECTS = Object.freeze({
  classical: {
    id: 'classical',
    label: 'Klassisch-funktional (strenger Satz)',
    vocab: {
      major: ['I@T*3', 'I6@T*1', 'ii@S*2', 'ii6@S*2', 'IV@S*2.5', 'V@D*3', 'V7@D*2.5', 'vi@T*1.8', 'iii@T*0.4', 'vii°6@D*0.6', 'IV6@S*0.5'],
      minor: ['i@T*3', 'i6@T*1', 'ii°6@S*1.5', 'iv@S*2.5', 'iv6@S*0.6', 'V@D*3', 'V7@D*2.5', 'VI@T*1.5', 'III@T*0.8', 'vii°7@D*1', 'VII@X*0.4'],
    },
    cadences: {
      major: {
        authentic: ['IV V7 I *2', 'ii6 V7 I *3', 'I64 V7 I *2', 'ii65 V I *1'],
        half: ['IV V *2', 'ii6 V *2', 'vi V *1', 'I V *1'],
        plagal: ['IV I'],
        deceptive: ['IV V7 vi', 'ii6 V7 vi'],
      },
      minor: {
        authentic: ['iv V7 i *2', 'ii°6 V7 i *3', 'i64 V7 i *2'],
        half: ['iv V *2', 'iv6 V *2'],
        plagal: ['iv i'],
        deceptive: ['iv V7 VI', 'ii°6 V7 VI'],
      },
    },
    defaultCadence: 'authentic',
    fnWeights: FUNCTIONAL,
    rootMotion: FIFTHS_DOWN,
    rhythm: { split: 0.2, merge: 0 },
    color: { secondary: 0.18, tritoneSub: 0, passingDim: 0, borrowed: 0.04, extensions: 0.12, neoRiemann: 0 },
    extend: { 7: ['7'] },
    voicing: 'classical',
    rules: { parallelPerfect: 80, hiddenOuter: 8, crossing: 60, overlap: 20, seventhResolution: 25, leadingTone: 25 },
  },

  pop: {
    id: 'pop',
    label: 'Pop',
    vocab: {
      major: ['I@T*3', 'IV@S*3', 'V@D*2.5', 'vi@T*2.5', 'ii@S*1', 'iii@T*0.5', 'bVII@X*0.6', 'Vsus4@D*0.5', 'IV:add9@S*0.6', 'I6@T*0.4'],
      minor: ['i@T*3', 'VI@T*2.5', 'III@T*2', 'VII@D*2.5', 'iv@S*2', 'v@D*1', 'V@D*0.7'],
    },
    cadences: {
      major: { authentic: ['IV V I *2', 'ii V I'], plagal: ['IV I *2', 'iv I'], half: ['IV V *2', 'vi V'], open: ['vi IV', 'IV V'], deceptive: ['IV V vi'] },
      minor: { authentic: ['VI VII i *2', 'iv V i'], plagal: ['iv i'], half: ['VI V', 'iv V'], open: ['VI VII', 'III VII'] },
    },
    defaultCadence: 'authentic',
    fnWeights: LOOSE,
    rootMotion: FIFTHS_DOWN,
    rhythm: { split: 0.25, merge: 0 },
    color: { secondary: 0.06, tritoneSub: 0, passingDim: 0, borrowed: 0.1, extensions: 0.2, neoRiemann: 0 },
    extend: EXTEND_POP,
    voicing: 'pop',
    rules: { parallelPerfect: 0, hiddenOuter: 0 },
  },

  modal: {
    id: 'modal',
    label: 'Modal (Folk, Erkundung)',
    vocab: {
      ionian: ['I@T*3', 'IV@S*2', 'V@D*1.5', 'vi@T*1.5', 'ii@S*1.2', 'iii@X*0.6'],
      dorian: ['i@T*3', 'IV@S*2.5', 'VII@X*2', 'III@X*1.5', 'v@D*1.2', 'ii@S*0.8'],
      phrygian: ['i@T*3', 'II@X*2.5', 'vii@X*1.5', 'iv@S*1.5', 'III@X*1.2', 'VI@X*1'],
      lydian: ['I@T*3', 'II@X*2.5', 'vii@X*1', 'V@D*1.2', 'iii@X*1', 'vi@T*1'],
      mixolydian: ['I@T*3', 'VII@X*2.5', 'IV@S*2', 'v@D*1.2', 'ii@S*1', 'vi@T*0.8'],
      aeolian: ['i@T*3', 'VI@X*2.2', 'VII@X*2', 'iv@S*2', 'v@D*1.2', 'III@X*1.5'],
    },
    cadences: {
      ionian: { modal: ['IV I', 'ii I', 'V I'], open: ['IV V'] },
      dorian: { modal: ['IV i *2', 'VII i *2', 'v i'], open: ['IV VII'] },
      phrygian: { modal: ['II i *3', 'vii i', 'iv i'], open: ['II III'] },
      lydian: { modal: ['II I *3', 'vii I', 'V I'], open: ['II iii'] },
      mixolydian: { modal: ['VII I *3', 'IV I', 'v I'], open: ['VII IV'] },
      aeolian: { modal: ['VII i *2', 'VI VII i *2', 'iv i'], open: ['VI VII'] },
    },
    defaultCadence: 'modal',
    fnWeights: MODAL,
    rootMotion: STEPWISE,
    rhythm: { split: 0.1, merge: 0.35 },
    color: { secondary: 0, tritoneSub: 0, passingDim: 0, borrowed: 0, extensions: 0.35, neoRiemann: 0 },
    // add9 keeps the third (the modal colour tone of e.g. Dorian IV); sus chords are rarer.
    extend: { '': ['add9', 'add9', 'add9', 'sus2'], m: ['madd9', 'm7'] },
    voicing: 'spread',
    rules: { parallelPerfect: 2, hiddenOuter: 0 },
  },

  jazz: {
    id: 'jazz',
    label: 'Jazz (Lo-Fi, Lounge)',
    vocab: {
      major: [
        'I:maj7@T*3', 'I:6@T*1', 'ii:m7@S*3', 'ii:m9@S*1', 'iii:m7@T*1', 'vi:m7@T*2', 'IV:maj7@S*1.5', 'IV:7@S*0.4',
        'V:7@D*3', 'V:9@D*1', 'V:13@D*1', 'V:7b9@D*0.5', 'VI:7@D*1', 'II:7@D*0.8', 'III:7@D*0.4', '#iv:m7b5@S*0.4', 'bVII:7@X*0.3',
      ],
      minor: ['i:m6@T*2', 'i:m7@T*1.5', 'ii:m7b5@S*3', 'V:7b9@D*3', 'V:7@D*1.5', 'iv:m7@S*1.5', 'iv:m6@S*1', 'VI:maj7@T*1', 'III:maj7@T*0.7', 'VII:7@X*0.5'],
    },
    cadences: {
      major: {
        authentic: ['ii:m7 V:7 I:maj7 *3', 'ii:m9 V:13 I:69 *2', 'ii:m7 bII:7 I:maj7 *1', 'iii:m7 VI:7 ii:m7 V:7 I:maj7 *1'],
        half: ['vi:m7 ii:m7 V:7 *2', 'ii:m7 V:7'],
        plagal: ['IV:maj7 iv:m6 I:maj7'],
        open: ['vi:m7 ii:m7 V:7'],
      },
      minor: {
        authentic: ['ii:m7b5 V:7b9 i:m6 *3', 'iv:m7 V:7 i:m7', 'ii:m7b5 bII:7 i:m7'],
        half: ['ii:m7b5 V:7b9 *2', 'iv:m7 V:7'],
        open: ['VI:maj7 ii:m7b5 V:7b9'],
      },
    },
    defaultCadence: 'authentic',
    fnWeights: JAZZ,
    rootMotion: JAZZ_MOTION,
    rhythm: { split: 0.45, merge: 0 },
    color: { secondary: 0.15, tritoneSub: 0.25, passingDim: 0.15, borrowed: 0.08, extensions: 0.35, neoRiemann: 0 },
    extend: EXTEND_JAZZ,
    voicing: 'jazz',
    rules: { parallelPerfect: 2, hiddenOuter: 0, seventhResolution: 8 },
  },

  swing: {
    id: 'swing',
    label: 'Swing / Electro Swing',
    vocab: {
      major: ['I:6@T*3', 'vi:m7@T*2', 'ii:m7@S*2.5', 'V:7@D*3', 'VI:7@D*1.5', 'II:7@D*1', 'IV:6@S*1', 'iv:m6@S*0.6', '#i:dim7@X*0.6', 'III:7@D*0.5'],
      minor: ['i:m6@T*3', 'iv:m6@S*2', 'V:7@D*3', 'V:7b9@D*1', 'ii:m7b5@S*1.5', 'VI:7@X*1.2', 'bII:7@D*0.4', 'III:maj7@T*0.6'],
    },
    cadences: {
      major: { authentic: ['ii:m7 V:7 I:6 *3', 'IV:6 #iv:dim7 I:6 V:7 I:6'], half: ['VI:7 II:7 V:7', 'ii:m7 V:7'], open: ['vi:m7 ii:m7 V:7'] },
      minor: { authentic: ['iv:m6 V:7 i:m6 *3', 'ii:m7b5 V:7b9 i:m6 *2'], half: ['iv:m6 V:7', 'VI:7 V:7'], open: ['iv:m6 V:7'] },
    },
    defaultCadence: 'authentic',
    fnWeights: JAZZ,
    rootMotion: JAZZ_MOTION,
    rhythm: { split: 0.5, merge: 0 },
    color: { secondary: 0.2, tritoneSub: 0.1, passingDim: 0.25, borrowed: 0.1, extensions: 0.15, neoRiemann: 0 },
    extend: { 7: ['9', '13'], 6: ['69'], m6: ['m69'] },
    voicing: 'drop2',
    rules: { parallelPerfect: 2, hiddenOuter: 0 },
  },

  cinematic: {
    id: 'cinematic',
    label: 'Filmisch (Orchester, episch)',
    vocab: {
      major: ['I@T*3', 'IV@S*2', 'V@D*1.8', 'vi@T*2', 'bVI@X*1.2', 'bVII@X*1', 'III@X*0.6', 'bIII@X*0.6', 'iv@S*0.8', 'ii@S*0.8', 'I:sus2@T*0.6'],
      minor: ['i@T*3', 'VI@T*2.5', 'III@X*1.5', 'VII@X*2', 'iv@S*2', 'IV@S*0.8', 'V@D*1.5', 'bII@X*0.4', 'i:sus2@T*0.6', 'VI:add9@T*0.8', '#III@X*0.4', 'v@D*0.8'],
    },
    cadences: {
      major: { authentic: ['IV V I *2', 'bVI bVII I *2'], plagal: ['IV I', 'iv I *2'], half: ['vi V', 'IV V'], mediant: ['bVI I', 'III I'] },
      minor: {
        authentic: ['iv V i *2', 'VI V i'],
        epic: ['VI VII i *3'],
        plagal: ['iv i', 'IV i'],
        picardy: ['iv V I'],
        half: ['VI V', 'iv V'],
      },
    },
    defaultCadence: 'authentic',
    fnWeights: LOOSE,
    rootMotion: { ...STEPWISE, 4: 1.25, 8: 1.3, 3: 1.2, 9: 1.2 },
    rhythm: { split: 0.12, merge: 0.2 },
    color: { secondary: 0.06, tritoneSub: 0, passingDim: 0, borrowed: 0.12, extensions: 0.2, neoRiemann: 0.25 },
    extend: EXTEND_CINEMA,
    voicing: 'spread',
    rules: { parallelPerfect: 8, hiddenOuter: 0 },
  },

  dark: {
    id: 'dark',
    label: 'Dunkel (Horror, Spannung)',
    vocab: {
      minor: ['i@T*3', 'bII@X*1.5', 'iv@S*2', 'v@D*1', 'VI@X*1.5', 'vii°7@D*1.2', 'ii:m7b5@S*1', 'i:mMaj7@T*0.8', 'III:aug@X*0.6', '#iv:dim7@X*0.5', 'bv@X*0.6'],
      phrygian: ['i@T*3', 'II@X*2', 'iv@S*1.5', 'vii@X*1', 'i:mMaj7@T*0.7', '#iv:dim7@X*0.5', 'bv@X*0.6'],
    },
    cadences: {
      minor: { dark: ['bII i *2', 'iv i', 'vii°7 i *2', 'bv i'], open: ['bII i:mMaj7', 'VI bII'] },
      phrygian: { dark: ['II i *2', 'bv i'], open: ['II i:mMaj7'] },
    },
    defaultCadence: 'dark',
    fnWeights: MODAL,
    rootMotion: { 0: 0.2, 1: 1.4, 2: 0.9, 3: 1.1, 4: 0.9, 5: 0.7, 6: 1.3, 7: 0.6, 8: 1, 9: 1.1, 10: 0.9, 11: 1.4 },
    rhythm: { split: 0.08, merge: 0.4 },
    color: { secondary: 0, tritoneSub: 0, passingDim: 0, borrowed: 0, extensions: 0.25, neoRiemann: 0.3 },
    extend: { m: ['madd9', 'mMaj7'], '': ['sus4'] },
    voicing: 'spread',
    rules: { parallelPerfect: 2, hiddenOuter: 0 },
  },

  chip: {
    id: 'chip',
    label: 'Chiptune (8-Bit-Pop)',
    vocab: {
      major: ['I@T*3', 'IV@S*2.5', 'V@D*2.5', 'vi@T*2', 'ii@S*1', 'iii@T*0.6', 'bVI@X*0.6', 'bVII@X*0.6'],
      minor: ['i@T*3', 'VI@T*2', 'VII@D*2', 'iv@S*2', 'V@D*1.5', 'III@T*1'],
    },
    cadences: {
      major: { authentic: ['IV V I *2', 'bVI bVII I *2', 'ii V I'], half: ['IV V'], open: ['IV V'] },
      minor: { authentic: ['iv V i', 'VI VII i *2'], half: ['VI V'], open: ['VI VII'] },
    },
    defaultCadence: 'authentic',
    fnWeights: LOOSE,
    rootMotion: FIFTHS_DOWN,
    rhythm: { split: 0.45, merge: 0 },
    color: { secondary: 0.1, tritoneSub: 0, passingDim: 0, borrowed: 0.05, extensions: 0, neoRiemann: 0 },
    extend: {},
    voicing: 'pop',
    rules: { parallelPerfect: 0, hiddenOuter: 0 },
  },

  ambient: {
    id: 'ambient',
    label: 'Ambient (Flächen, schwebend)',
    vocab: {
      ionian: ['I:maj7@T*2', 'I:add9@T*2', 'IV:maj7@S*2', 'vi:m9@T*1.5', 'ii:m7@S*1', 'V:sus4@D*0.8', 'iii:m7@X*0.8'],
      lydian: ['I:maj7@T*2', 'I:add9@T*2', 'II:add9@X*2.5', 'vii:m7@X*1', 'iii:m7@X*1', 'V:maj7@D*0.8'],
      dorian: ['i:m9@T*2', 'i:m7@T*1.5', 'IV:add9@S*2.5', 'VII:maj7@X*1.5', 'III:maj7@X*1.2', 'v:m7@D*0.8'],
      aeolian: ['i:madd9@T*2', 'VI:maj7@X*2', 'VII:add9@X*1.5', 'iv:m9@S*1.5', 'III:maj7@X*1'],
    },
    cadences: {
      ionian: { open: ['IV:maj7 I:maj7', 'ii:m7 I:add9'] },
      lydian: { open: ['II:add9 I:maj7 *2', 'vii:m7 I:add9'] },
      dorian: { open: ['IV:add9 i:m9 *2', 'VII:maj7 i:m7'] },
      aeolian: { open: ['VII:add9 i:madd9', 'VI:maj7 i:madd9'] },
    },
    defaultCadence: 'open',
    fnWeights: MODAL,
    rootMotion: STEPWISE,
    rhythm: { split: 0, merge: 0.6 },
    color: { secondary: 0, tritoneSub: 0, passingDim: 0, borrowed: 0, extensions: 0.1, neoRiemann: 0.1 },
    extend: { maj7: ['maj9'], m7: ['m9'], add9: ['add9'] },
    voicing: 'spread',
    rules: { parallelPerfect: 0, hiddenOuter: 0, motion: 1.5 },
  },

  quartal: {
    id: 'quartal',
    label: 'Quartenharmonik (modern, schwebend)',
    vocab: {
      dorian: ['i:dq4@T*3', 'IV:dq4@S*2', 'VII:dq4@X*2', 'III:dq4@X*1.5', 'v:dq4@D*1', 'ii:dq4@S*1'],
      ionian: ['I:dq4@T*3', 'ii:dq4@S*2', 'IV:dq4@S*2', 'V:dq4@D*1.5', 'vi:dq4@T*1.5'],
      aeolian: ['i:dq4@T*3', 'iv:dq4@S*2', 'VI:dq4@X*2', 'VII:dq4@X*2', 'III:dq4@X*1'],
    },
    cadences: {
      dorian: { open: ['IV:dq4 i:dq4', 'VII:dq4 i:dq4'] },
      ionian: { open: ['ii:dq4 I:dq4', 'IV:dq4 I:dq4'] },
      aeolian: { open: ['VII:dq4 i:dq4', 'iv:dq4 i:dq4'] },
    },
    defaultCadence: 'open',
    fnWeights: MODAL,
    rootMotion: STEPWISE,
    rhythm: { split: 0.1, merge: 0.4 },
    color: { secondary: 0, tritoneSub: 0, passingDim: 0, borrowed: 0, extensions: 0, neoRiemann: 0 },
    extend: {},
    voicing: 'quartal',
    rules: { parallelPerfect: 0, hiddenOuter: 0 },
  },
});

/**
 * @param {string | Dialect} dialect
 * @returns {Dialect}
 */
export function getDialect(dialect) {
  if (typeof dialect !== 'string') return dialect;
  if (!Object.hasOwn(DIALECTS, dialect)) throw new RangeError(`Unknown harmonic dialect "${dialect}"`);
  return DIALECTS[dialect];
}

/** Mode names that share vocabulary tables. */
const MODE_FALLBACK = Object.freeze(
  /** @type {Record<string, string[]>} */ ({
    ionian: ['ionian', 'major'],
    aeolian: ['aeolian', 'minor'],
    harmonicMinor: ['minor', 'aeolian'],
    melodicMinor: ['minor', 'aeolian', 'dorian'],
    dorian: ['dorian', 'minor', 'aeolian'],
    phrygian: ['phrygian', 'minor', 'aeolian'],
    lydian: ['lydian', 'major', 'ionian'],
    mixolydian: ['mixolydian', 'major', 'ionian'],
    locrian: ['phrygian', 'minor', 'aeolian'],
  }),
);

/**
 * Like forMode, but also returns the mode the table was written for
 * ("major" → ionian, "minor" → aeolian), so Roman numerals can be realized
 * in that mode even when the requested mode falls back to it.
 * @template T
 * @param {Record<string, T>} table
 * @param {string} mode
 * @returns {[T, string]}
 */
export function forModeEntry(table, mode) {
  for (const m of MODE_FALLBACK[mode] ?? [mode]) if (Object.hasOwn(table, m)) return [table[m], m === 'major' ? 'ionian' : m === 'minor' ? 'aeolian' : m];
  const first = Object.keys(table)[0];
  return [table[first], first === 'major' ? 'ionian' : first === 'minor' ? 'aeolian' : first];
}

/**
 * Picks the table of a dialect that fits a mode (exact mode, then major/minor family).
 * @template T
 * @param {Record<string, T>} table
 * @param {string} mode
 * @returns {T}
 */
export function forMode(table, mode) {
  for (const m of MODE_FALLBACK[mode] ?? [mode]) if (Object.hasOwn(table, m)) return table[m];
  const first = Object.keys(table)[0];
  return table[first];
}
