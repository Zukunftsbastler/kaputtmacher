// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Chord progression generator.
 *  1. Harmonic rhythm: bars are split or merged according to the dialect.
 *  2. Skeleton: a beam search over the dialect vocabulary scores each step by
 *     function-transition weight × token weight × root-motion preference,
 *     closeness to a target tension curve, and repetition penalties. Gumbel
 *     noise from the seeded PRNG turns the search into deterministic sampling.
 *     The phrase starts on the tonic and ends in a cadence formula.
 *  3. Colour passes: secondary dominants, tritone substitution, passing
 *     diminished chords, modal interchange, chord extensions, pedal point.
 */

import { parseRoman, keyScale, keySignature, createKey } from '../../theory/key.js';
import { chordPitches, resolveQuality, formatChordSymbol } from '../../theory/chord.js';
import { transposePitch } from '../../theory/interval.js';
import { pitchClass, mod } from '../../theory/pitch.js';
import { getDialect, forModeEntry } from './dialects.js';
import { chordTension, archTension } from './tension.js';
import { romanLabel, simplifySpelling } from './chord-utils.js';
import { neoRiemann, isConsonantTriad } from './neo-riemann.js';
import { barLengthBeats } from '../../core/meter-map.js';

/**
 * @typedef {object} Token
 * @property {string} rn
 * @property {string} [q]
 * @property {import('./chord-utils.js').HarmonicFunction} fn
 * @property {number} w
 */

/**
 * @typedef {object} Realized
 * @property {import('../../theory/chord.js').Chord} chord
 * @property {import('../../theory/pitch.js').PitchName[]} tones
 * @property {import('../../theory/pitch.js').PitchName} bass
 * @property {string} roman
 * @property {string} rn numeral without quality (for secondary targets)
 * @property {import('./chord-utils.js').HarmonicFunction} fn
 * @property {number} w
 * @property {boolean} quartal
 */

const TOKEN_RE = /^([^:@*\s]+)(?::([^@*\s]+))?(?:@([TSDX]))?(?:\*([\d.]+))?$/;
const NUMERAL_RE = /^(b{1,2}|#{1,2})?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)/;

/**
 * Function of a Roman numeral when the token does not state one.
 * @param {string} rn
 * @returns {import('./chord-utils.js').HarmonicFunction}
 */
export function inferFunction(rn) {
  if (rn.includes('/')) return 'D';
  const m = NUMERAL_RE.exec(rn);
  if (!m) return 'X';
  if (m[1]) return 'X';
  const n = m[2].toUpperCase();
  if (n === 'I' || n === 'III' || n === 'VI') return 'T';
  if (n === 'II' || n === 'IV') return 'S';
  return 'D';
}

/**
 * @param {string} text "rn:quality@F*weight"
 * @returns {Token}
 */
export function parseToken(text) {
  const m = TOKEN_RE.exec(text.trim());
  if (!m) throw new SyntaxError(`Invalid harmony token "${text}"`);
  return { rn: m[1], q: m[2], fn: /** @type {any} */ (m[3]) ?? inferFunction(m[1]), w: m[4] ? Number(m[4]) : 1 };
}

/**
 * @param {string} text "tok tok tok *weight"
 * @returns {{ tokens: Token[], w: number }}
 */
export function parseCadence(text) {
  const parts = text.trim().split(/\s+/);
  let w = 1;
  if (parts[parts.length - 1].startsWith('*')) w = Number(/** @type {string} */ (parts.pop()).slice(1));
  return { tokens: parts.map(parseToken), w };
}

/**
 * Turns a token into a concrete chord in a key.
 * @param {Token} token
 * @param {import('../../theory/key.js').Key} key
 * @returns {Realized}
 */
export function realizeToken(token, key) {
  const rc = parseRoman(token.rn, key);
  /** @type {import('../../theory/chord.js').Chord} */
  const chord = { root: rc.root, quality: rc.quality };
  /** @type {import('../../theory/pitch.js').PitchName[]} */
  let tones;
  let quartal = false;
  if (token.q === 'dq3' || token.q === 'dq4') {
    // Diatonic quartal stack on the numeral's scale degree.
    const scale = keyScale(key);
    const m = NUMERAL_RE.exec(token.rn);
    const degree = m ? ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'].indexOf(m[2].toUpperCase()) : 0;
    const count = token.q === 'dq3' ? 3 : 4;
    tones = Array.from({ length: count }, (_, i) => scale.pitches[(degree + 3 * i) % scale.pitches.length]);
    chord.root = tones[0];
    chord.quality = count === 3 ? 'quartal' : 'quartal4';
    quartal = true;
  } else {
    if (token.q) chord.quality = resolveQuality(token.q);
    tones = chordPitches(chord);
  }
  let bass = chord.root;
  if (rc.inversion > 0) {
    bass = tones[Math.min(rc.inversion, tones.length - 1)];
    chord.bass = bass;
  }
  const m = NUMERAL_RE.exec(token.rn);
  return {
    chord,
    tones,
    bass,
    roman: token.q ? `${token.rn}:${token.q}` : token.rn,
    rn: token.rn.includes('/') ? token.rn : m ? m[0] : token.rn,
    fn: token.fn,
    w: token.w,
    quartal,
  };
}

/**
 * @param {Realized} r
 * @param {import('../../theory/key.js').Key} key
 * @param {number} beat
 * @param {number} dur
 * @param {string[]} tags
 * @returns {import('./chord-utils.js').HarmonyEvent & { rn: string, quartal: boolean }}
 */
function toEvent(r, key, beat, dur, tags) {
  const explicit = r.quartal ? r.tones.map(pitchClass) : undefined;
  return {
    beat,
    dur,
    key,
    roman: r.roman,
    rn: r.rn,
    fn: r.fn,
    chord: r.chord,
    tones: r.tones,
    bass: r.bass,
    tension: chordTension(r.chord, key, explicit),
    tags,
    quartal: r.quartal,
  };
}

/**
 * Harmonic rhythm: chord durations in beats for `bars` bars.
 * @param {number} bars
 * @param {{ num: number, den: number }} meter
 * @param {{ split: number, merge: number }} rhythm
 * @param {import('../../core/prng.js').Rng} rng
 */
function harmonicRhythm(bars, meter, rhythm, rng) {
  const len = barLengthBeats(meter.num, meter.den);
  const compound = meter.den === 8 && meter.num % 3 === 0;
  const first = compound ? len / 2 : Math.max(0.5, Math.round(len / 2 + 0.25));
  /** @type {number[]} */
  const slots = [];
  for (let bar = 0; bar < bars; ) {
    const last = bar === bars - 1;
    if (!last && bar < bars - 2 && rng.chance(rhythm.merge)) {
      slots.push(2 * len);
      bar += 2;
      continue;
    }
    if (!last && len >= 2 && rng.chance(rhythm.split)) slots.push(first, len - first);
    else slots.push(len);
    bar++;
  }
  return slots;
}

/**
 * Splits slots (from the end, excluding the final one) until there are at least `count`.
 * @param {number[]} slots
 * @param {number} count
 */
function ensureSlots(slots, count) {
  while (slots.length < count) {
    let idx = -1;
    for (let i = slots.length - 2; i >= 0; i--) {
      if (slots[i] >= 1 && (idx < 0 || slots[i] > slots[idx])) idx = i;
    }
    if (idx < 0) {
      if (slots[slots.length - 1] < 1) break;
      idx = slots.length - 1;
    }
    const d = slots[idx];
    const a = d >= 2 ? Math.round(d / 2) : d / 2;
    slots.splice(idx, 1, a, d - a);
  }
  return slots;
}

/** @param {import('../../core/prng.js').Rng} rng */
const gumbel = (rng) => -Math.log(-Math.log(Math.min(1 - 1e-12, Math.max(1e-12, rng.float()))));

/**
 * @typedef {object} ProgressionOptions
 * @property {import('../../theory/key.js').Key} key
 * @property {string | import('./dialects.js').Dialect} dialect
 * @property {number} bars
 * @property {import('../../core/prng.js').Rng} rng
 * @property {{ num: number, den: number }} [meter] default 4/4
 * @property {string} [cadence] cadence type (default: the dialect's)
 * @property {number} [startBeat]
 * @property {(x: number) => number} [tension] target tension 0…1 over the phrase position 0…1
 * @property {number} [tensionWeight] how strongly the curve is followed (default 1)
 * @property {number} [chromaticism] scales all colour probabilities (default 1)
 * @property {number} [extensions] overrides the dialect's extension probability
 * @property {'tonic' | 'dominant' | null} [pedal]
 * @property {boolean} [startOnTonic] default true; false continues an already established tonic
 *   (e.g. after a modulation) and avoids restating it on the first chord
 * @property {number} [beamWidth] default 10
 * @property {number} [temperature] randomness of the search (default 1)
 * @property {(chord: Realized, beat: number, dur: number) => number} [fit] extra score for a chord at an
 *   absolute beat position, e.g. how well it supports given melody notes (used by re-harmonization)
 */

/**
 * Generates one phrase of harmony.
 * @param {ProgressionOptions} options
 * @returns {(import('./chord-utils.js').HarmonyEvent & { rn: string, quartal: boolean })[]}
 */
export function generateProgression(options) {
  const d = getDialect(options.dialect);
  const { rng } = options;
  // Roman numerals are realized in the mode the vocabulary table was written for:
  // a Dorian request on a dialect with only major/minor tables uses its minor table in Aeolian.
  const [vocabTable, tableMode] = forModeEntry(d.vocab, options.key.mode);
  const key = tableMode === options.key.mode ? options.key : createKey(options.key.tonic, tableMode);
  const meter = options.meter ?? { num: 4, den: 4 };
  const startBeat = options.startBeat ?? 0;
  const target = options.tension ?? archTension;
  const tensionWeight = options.tensionWeight ?? 1;
  const temperature = options.temperature ?? 1;
  const beamWidth = options.beamWidth ?? 10;
  const chroma = options.chromaticism ?? 1;

  const vocab = vocabTable.map(parseToken).filter((t) => t.w > 0).map((t) => realizeToken(t, key));
  const [cadenceTable] = forModeEntry(d.cadences, key.mode);
  const cadenceType = options.cadence ?? d.defaultCadence;
  const formulas = (cadenceTable[cadenceType] ?? cadenceTable[Object.keys(cadenceTable)[0]]).map(parseCadence);
  const formula = rng.weighted(formulas, formulas.map((f) => f.w));
  const open = cadenceType === 'open';
  const cadence = formula.tokens.map((t) => realizeToken(t, key));

  const slots = ensureSlots(harmonicRhythm(options.bars, meter, d.rhythm, rng), cadence.length + 1 + (open ? 1 : 0));
  // Drop leading cadence chords if the phrase is too short for the whole formula.
  while (cadence.length > 1 && cadence.length + 1 > slots.length) cadence.shift();
  const total = slots.reduce((a, b) => a + b, 0);
  const n = slots.length;
  const freeEnd = n - cadence.length; // index of the first cadence slot

  // Opening tonic.
  const tonics = vocab.filter((v) => v.fn === 'T' && /^(I|i)$/.test(v.rn) && !v.chord.bass);
  const fallbackTonic = realizeToken(parseToken(keyIsMinor(key) ? 'i' : 'I'), key);
  const first = options.startOnTonic === false ? null : tonics.length > 0 ? rng.weighted(tonics, tonics.map((t) => t.w)) : fallbackTonic;

  /**
   * @param {Realized} a
   * @param {Realized} b
   */
  const transition = (a, b) => {
    const fw = d.fnWeights[a.fn]?.[b.fn] ?? 0.5;
    const motion = d.rootMotion[mod(pitchClass(b.chord.root) - pitchClass(a.chord.root), 12)] ?? 1;
    const same = formatChordSymbol(a.chord) === formatChordSymbol(b.chord);
    return Math.max(1e-6, fw * b.w * motion * (same ? 0.15 : 1));
  };
  /** @param {Realized} r */
  const tensionOf = (r) => chordTension(r.chord, key, r.quartal ? r.tones.map(pitchClass) : undefined);

  /** @param {Realized} prev */
  const candidatesAfter = (prev) => {
    const list = vocab.slice();
    if (d.color.neoRiemann > 0 && isConsonantTriad(prev.chord)) {
      for (const op of /** @type {const} */ (['P', 'R', 'L', 'N', 'S'])) {
        const chord = neoRiemann(prev.chord, op);
        list.push({ chord, tones: chordPitches(chord), bass: chord.root, roman: romanLabel(chord, key), rn: romanLabel(chord, key), fn: 'X', w: d.color.neoRiemann * chroma * 3 * (op === 'S' || op === 'N' ? 0.4 : 1), quartal: false });
      }
    }
    return list;
  };

  /** @typedef {{ seq: Realized[], score: number }} BeamState */
  /** @type {BeamState[]} */
  let beam = [{ seq: first ? [first] : [], score: 0 }];
  const startIdx = first ? 1 : 0;
  let beatPos = first ? slots[0] : 0;
  for (let i = startIdx; i < freeEnd; i++) {
    const mid = (beatPos + slots[i] / 2) / total;
    const t = target(mid);
    /** @type {BeamState[]} */
    const next = [];
    for (const state of beam) {
      const prev = state.seq[state.seq.length - 1];
      // Without an opening tonic the phrase continues an established tonic: avoid restating it.
      const options2 = prev ? candidatesAfter(prev) : vocab.filter((v) => !(/^(I|i)$/.test(v.rn) && v.fn === 'T'));
      for (const cand of options2) {
        let s = state.score;
        if (prev) s += Math.log(transition(prev, cand));
        else s += Math.log(cand.w);
        const dt = tensionOf(cand) - t;
        s -= tensionWeight * 8 * dt * dt;
        if (options.fit) s += options.fit(cand, startBeat + beatPos, slots[i]);
        const symbol = formatChordSymbol(cand.chord);
        const uses = state.seq.filter((r) => formatChordSymbol(r.chord) === symbol).length;
        s -= 1.0 * uses;
        // Discourage ping-pong (A – B – A) unless the dialect is built on it.
        const back2 = state.seq[state.seq.length - 2];
        if (back2 && formatChordSymbol(back2.chord) === symbol) s -= 0.4;
        s += temperature * 0.6 * gumbel(rng);
        next.push({ seq: [...state.seq, cand], score: s });
      }
    }
    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, beamWidth);
    beatPos += slots[i];
  }
  // Connection into the cadence (or back to the opening for loopable phrases).
  for (const state of beam) {
    const last = state.seq[state.seq.length - 1];
    if (last && cadence[0]) state.score += Math.log(transition(last, cadence[0]));
    if (open && first) state.score += 0.5 * Math.log(transition(cadence[cadence.length - 1], first));
  }
  beam.sort((a, b) => b.score - a.score);
  const skeleton = [...beam[0].seq, ...cadence];

  /** @type {(import('./chord-utils.js').HarmonyEvent & { rn: string, quartal: boolean })[]} */
  let events = [];
  let beat = startBeat;
  skeleton.forEach((r, i) => {
    const tags = i >= skeleton.length - cadence.length ? ['cadence'] : [];
    events.push(toEvent(r, key, beat, slots[i], tags));
    beat += slots[i];
  });

  events = colour(events, d, key, rng, chroma, options.extensions);
  if (options.pedal) applyPedal(events, key, options.pedal);
  return events;
}

/** @param {import('../../theory/key.js').Key} key */
function keyIsMinor(key) {
  return keySignature(key).minor;
}

/**
 * Colour passes on a phrase.
 * @param {(import('./chord-utils.js').HarmonyEvent & { rn: string, quartal: boolean })[]} events
 * @param {import('./dialects.js').Dialect} d
 * @param {import('../../theory/key.js').Key} key
 * @param {import('../../core/prng.js').Rng} rng
 * @param {number} chroma
 * @param {number} [extensions]
 */
function colour(events, d, key, rng, chroma, extensions) {
  const c = d.color;
  let ev = events.slice();
  const remake = (/** @type {typeof ev[number]} */ e, /** @type {import('../../theory/chord.js').Chord} */ chord, /** @type {string} */ tag) => {
    /** @type {import('../../theory/chord.js').Chord} */
    const ch = { ...chord };
    const tones = chordPitches(ch);
    return { ...e, chord: ch, tones, bass: ch.bass ?? ch.root, roman: romanLabel(ch, key), tension: chordTension(ch, key), tags: [...e.tags, tag] };
  };

  // Modal interchange (major keys): borrow from the parallel minor.
  if (c.borrowed > 0 && !keyIsMinor(key)) {
    const swaps = /** @type {Record<string, string>} */ ({ IV: 'iv', vi: 'bVI', ii: 'ii:m7b5' });
    ev = ev.map((e, i) => {
      if (i === 0 || i === ev.length - 1 || e.quartal || !Object.hasOwn(swaps, e.rn) || !rng.chance(c.borrowed * chroma)) return e;
      const r = realizeToken(parseToken(swaps[e.rn]), key);
      return { ...toEvent(r, key, e.beat, e.dur, [...e.tags, 'borrowed']), fn: e.fn };
    });
  }

  // Secondary dominants before non-tonic major/minor chords.
  if (c.secondary > 0) {
    /** @type {typeof ev} */
    const out = [];
    ev.forEach((e, i) => {
      const prev = out[out.length - 1];
      const m = NUMERAL_RE.exec(e.rn);
      const target = m ? m[0] : '';
      const triadLike = ['', 'm', '7', 'm7', 'maj7', '6', 'm6', 'add9', 'madd9', '9', 'm9'].includes(e.chord.quality);
      const ok =
        i > 0 && prev && target && !/^(I|i)$/.test(target) && !e.rn.includes('/') && triadLike && !e.quartal &&
        !prev.tags.includes('cadence') && !prev.tags.includes('secondary') && rng.chance(c.secondary * chroma);
      if (ok) {
        const useDim = d.voicing === 'classical' && rng.chance(0.3);
        const r = realizeToken(parseToken(`${useDim ? 'vii°7' : 'V7'}/${target}@D`), key);
        if (prev.dur >= 2) {
          const half = prev.dur / 2;
          out[out.length - 1] = { ...prev, dur: half };
          out.push(toEvent(r, key, prev.beat + half, half, ['secondary']));
        } else if (out.length > 1 && prev.fn !== 'D') {
          out[out.length - 1] = toEvent(r, key, prev.beat, prev.dur, ['secondary']);
        }
      }
      out.push(e);
    });
    ev = out;
  }

  // Tritone substitution of dominant sevenths resolving down a fifth.
  if (c.tritoneSub > 0) {
    // From the end, so that a substituted chord always resolves to an unsubstituted target
    // (bII7 → I a semitone down).
    for (let i = ev.length - 2; i >= 0; i--) {
      const e = ev[i];
      const next = ev[i + 1];
      const dominant = ['7', '9', '13', '7b9'].includes(e.chord.quality);
      if (!dominant || next.tags.includes('tritone-sub') || mod(pitchClass(next.chord.root) - pitchClass(e.chord.root), 12) !== 5 || !rng.chance(c.tritoneSub * chroma)) continue;
      ev[i] = remake(e, { root: simplifySpelling(transposePitch(e.chord.root, 'd5')), quality: e.chord.quality === '7b9' ? '7' : e.chord.quality }, 'tritone-sub');
    }
  }

  // Passing diminished chords between roots a whole tone apart (I → #i°7 → ii).
  if (c.passingDim > 0) {
    /** @type {typeof ev} */
    const out = [];
    ev.forEach((e, i) => {
      const next = ev[i + 1];
      if (next && e.dur >= 2 && !e.tags.includes('cadence') && mod(pitchClass(next.chord.root) - pitchClass(e.chord.root), 12) === 2 && rng.chance(c.passingDim * chroma)) {
        const half = e.dur / 2;
        out.push({ ...e, dur: half });
        const chord = { root: transposePitch(e.chord.root, 'A1'), quality: 'dim7' };
        out.push({ ...remake(e, chord, 'passing'), beat: e.beat + half, dur: half, fn: 'X', tags: ['passing'] });
      } else out.push(e);
    });
    ev = out;
  }

  // Extensions: richer chord qualities that keep the function.
  const pExt = extensions ?? c.extensions;
  if (pExt > 0) {
    ev = ev.map((e) => {
      const ups = d.extend[e.chord.quality];
      if (e.quartal || !ups || ups.length === 0 || !rng.chance(pExt)) return e;
      const q = rng.pick(ups);
      if (q === e.chord.quality) return e;
      return remake(e, { root: e.chord.root, quality: resolveQuality(q), ...(e.chord.bass ? { bass: e.chord.bass } : {}) }, 'extended');
    });
  }
  return ev;
}

/**
 * Pedal point: the bass holds the tonic or dominant under changing chords.
 * @param {import('./chord-utils.js').HarmonyEvent[]} events
 * @param {import('../../theory/key.js').Key} key
 * @param {'tonic' | 'dominant'} pedal
 */
function applyPedal(events, key, pedal) {
  const scale = keyScale(key);
  const p = pedal === 'tonic' ? key.tonic : scale.pitches[4];
  for (const e of events) {
    e.bass = { ...p };
    if (pitchClass(p) !== pitchClass(e.chord.root)) e.chord = { ...e.chord, bass: { ...p } };
    e.tags = [...e.tags, 'pedal'];
  }
}

/**
 * Several phrases in sequence (e.g. antecedent with half cadence + consequent
 * with authentic cadence).
 * @param {Omit<ProgressionOptions, 'bars' | 'cadence'> & { phrases: { bars: number, cadence?: string, pedal?: 'tonic' | 'dominant' | null }[] }} options
 */
export function generateHarmony(options) {
  /** @type {ReturnType<typeof generateProgression>} */
  const out = [];
  let beat = options.startBeat ?? 0;
  options.phrases.forEach((ph, i) => {
    const events = generateProgression({ ...options, bars: ph.bars, cadence: ph.cadence, pedal: ph.pedal ?? options.pedal, startBeat: beat, rng: options.rng.fork(`phrase${i}`) });
    out.push(...events);
    const last = events[events.length - 1];
    beat = last.beat + last.dur;
  });
  return out;
}

/**
 * Compact text form, e.g. "| C | Am F | G7 | C |" with Roman numerals.
 * @param {import('./chord-utils.js').HarmonyEvent[]} events
 */
export function describeProgression(events) {
  return events.map((e) => `${formatChordSymbol(e.chord)} (${e.roman})`).join(' – ');
}
