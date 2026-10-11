// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Voicing and voice leading.
 * For every chord all admissible voicings within the voice ranges are
 * enumerated (sorted pitch tuples, so voices never cross within a chord).
 * A static cost rates each voicing (coverage of essential tones, doubling,
 * spacing, low-interval limits, style shape, register), a transition cost
 * rates each connection (motion, leaps, parallel perfect intervals, hidden
 * fifths/octaves, overlap, resolution of sevenths and leading tones).
 * Dynamic programming (Viterbi over the best K voicings per chord) then
 * finds the globally best path through the whole progression.
 * Ref (rules): Aldwell/Schachter/Cadwallader, "Harmony and Voice Leading";
 * Huron, "Voice Leading: The Science behind a Musical Art" (2016);
 * Tymoczko, "A Geometry of Music" (2011) for minimal-motion voice leading.
 */

import { pitchClass, mod } from '../../theory/pitch.js';
import { keyScale } from '../../theory/key.js';
import { chordRoles } from './chord-utils.js';

/**
 * @typedef {object} VoiceLeadingRules weights of the cost terms
 * @property {number} motion        per semitone of voice movement
 * @property {number} leap          per semitone beyond a fourth (upper voices)
 * @property {number} parallelPerfect parallel fifths/octaves between any two voices
 * @property {number} hiddenOuter   direct fifths/octaves in the outer voices with a leap in the top voice
 * @property {number} crossing      a voice moving past the previous position of its neighbour (overlap)
 * @property {number} overlap
 * @property {number} spacing       per semitone beyond an octave between adjacent upper voices
 * @property {number} lowInterval   per semitone below the low-interval limit
 * @property {number} missingTone   essential tone (third, seventh) missing
 * @property {number} doubledLeadingTone
 * @property {number} seventhResolution chord seventh not resolving down by step
 * @property {number} leadingTone   leading tone in an outer voice not rising to the tonic
 * @property {number} register      per semitone the top voice strays from its centre
 * @property {number} shape         style-specific shape preferences
 */

/** @type {VoiceLeadingRules} */
const DEFAULT_RULES = {
  motion: 1,
  leap: 1.5,
  parallelPerfect: 40,
  hiddenOuter: 4,
  crossing: 40,
  overlap: 12,
  spacing: 4,
  lowInterval: 6,
  missingTone: 60,
  doubledLeadingTone: 15,
  seventhResolution: 15,
  leadingTone: 15,
  register: 0.15,
  shape: 6,
};

/**
 * @typedef {'classical' | 'pop' | 'jazz' | 'drop2' | 'spread' | 'quartal' | 'pad'} VoicingStyle
 */

/** Voice ranges per style: [bass, …upper voices] as MIDI [low, high]. */
const STYLES = Object.freeze(
  /** @type {Record<VoicingStyle, { ranges: [number, number][], center: number, rootless?: boolean }>} */ ({
    classical: { ranges: [[40, 62], [48, 67], [55, 74], [60, 81]], center: 72 },
    pop: { ranges: [[36, 55], [52, 76], [52, 76], [52, 76]], center: 69 },
    pad: { ranges: [[36, 52], [53, 77], [53, 77], [53, 77]], center: 70 },
    jazz: { ranges: [[33, 52], [50, 74], [50, 74], [50, 74], [50, 74]], center: 67, rootless: true },
    drop2: { ranges: [[33, 52], [48, 79], [48, 79], [48, 79], [48, 79]], center: 72 },
    spread: { ranges: [[28, 45], [40, 57], [55, 79], [55, 79], [55, 79]], center: 74 },
    quartal: { ranges: [[33, 50], [50, 77], [50, 77], [50, 77], [50, 77]], center: 70 },
  }),
);

/**
 * Lowest allowed interval above a note (classical "low interval limits"):
 * close intervals in the bass register sound muddy.
 * @param {number} midi lower note
 */
function lowIntervalLimit(midi) {
  if (midi < 36) return 12;
  if (midi < 41) return 7;
  if (midi < 46) return 5;
  if (midi < 50) return 4;
  if (midi < 55) return 3;
  return 1;
}

/**
 * @typedef {object} VoicingContext per-event information used by the cost functions
 * @property {number[]} pcs chord pitch classes
 * @property {number} bassPc
 * @property {import('./chord-utils.js').ChordRoles} roles
 * @property {number} leadingTonePc key leading tone (raised 7th in minor)
 * @property {number} tonicPc
 * @property {boolean} dominant event has dominant function
 */

/**
 * @param {import('./chord-utils.js').HarmonyEvent} e
 * @returns {VoicingContext}
 */
function contextOf(e) {
  const scale = keyScale(e.key);
  const tonicPc = pitchClass(e.key.tonic);
  const roles = chordRoles(e.chord);
  return {
    pcs: [...new Set(e.tones.map(pitchClass))],
    bassPc: pitchClass(e.bass),
    roles,
    leadingTonePc: mod(tonicPc - 1, 12),
    tonicPc,
    dominant: e.fn === 'D' || (scale.pcs.length === 7 && roles.root === mod(tonicPc + 7, 12) && roles.third === mod(tonicPc - 1, 12)),
  };
}

/**
 * Enumerates candidate voicings (ascending MIDI tuples, bass first).
 * @param {VoicingContext} c
 * @param {{ ranges: [number, number][], rootless?: boolean }} style
 * @param {boolean} quartal
 * @returns {number[][]}
 */
function enumerate(c, style, quartal) {
  const [bassRange, ...upperRanges] = style.ranges;
  const allowed = style.rootless && !quartal ? c.pcs.filter((pc) => pc !== c.roles.root || c.pcs.length <= 3) : c.pcs;
  /** @type {number[][]} */
  const out = [];
  const basses = [];
  for (let m = bassRange[0]; m <= bassRange[1]; m++) if (mod(m, 12) === c.bassPc) basses.push(m);
  const U = upperRanges.length;
  /** @type {number[]} */
  const cur = [];
  /** @param {number} v @param {number} min */
  const rec = (v, min) => {
    if (v === U) {
      out.push(cur.slice());
      return;
    }
    const [lo, hi] = upperRanges[v];
    for (let m = Math.max(lo, min); m <= hi; m++) {
      if (!allowed.includes(mod(m, 12))) continue;
      if (v > 0 && m - cur[v - 1] > 12) break; // adjacent upper voices within an octave
      cur.push(m);
      rec(v + 1, m + 1);
      cur.pop();
    }
  };
  /** @type {number[][]} */
  const result = [];
  rec(0, 0);
  for (const b of basses) for (const u of out) if (u[0] > b && u[0] - b <= 24) result.push([b, ...u]);
  return result;
}

/**
 * @param {number[]} v voicing (bass first)
 * @param {VoicingContext} c
 * @param {VoicingStyle} styleName
 * @param {VoiceLeadingRules} r
 * @param {number} center
 * @param {boolean} quartal
 */
function staticCost(v, c, styleName, r, center, quartal) {
  let cost = 0;
  const pcs = v.map((m) => mod(m, 12));
  const upper = pcs.slice(1);
  const has = (/** @type {number} */ pc) => pc >= 0 && pcs.includes(pc);
  const hasUpper = (/** @type {number} */ pc) => pc >= 0 && upper.includes(pc);
  const { roles } = c;
  const rootless = styleName === 'jazz';
  if (quartal) {
    for (const pc of c.pcs) if (!has(pc)) cost += r.missingTone;
  } else {
    if (roles.third >= 0 && !has(roles.third)) cost += r.missingTone;
    if (roles.seventh >= 0 && !has(roles.seventh)) cost += r.missingTone * 0.6;
    if (!rootless && !has(roles.root)) cost += r.missingTone;
    if (roles.fifth >= 0 && !has(roles.fifth)) cost += 2;
    for (const x of roles.extensions) if (!hasUpper(x)) cost += rootless || styleName === 'drop2' ? 6 : 1;
    if (rootless && hasUpper(roles.root)) cost += 4;
  }
  // Doubling.
  const count = (/** @type {number} */ pc) => pcs.filter((p) => p === pc).length;
  if (c.dominant && count(c.leadingTonePc) > 1) cost += r.doubledLeadingTone;
  if (roles.seventh >= 0 && count(roles.seventh) > 1) cost += r.doubledLeadingTone;
  if (styleName === 'classical' && roles.third >= 0 && count(roles.third) > 1 && roles.seventh < 0) cost += 3;
  // Spacing and low-interval limits.
  for (let i = 1; i < v.length - 1; i++) {
    const gap = v[i + 1] - v[i];
    if (gap > 12) cost += r.spacing * (gap - 12);
  }
  for (let i = 0; i < v.length - 1; i++) {
    const lim = lowIntervalLimit(v[i]);
    const iv = v[i + 1] - v[i];
    if (iv < lim) cost += r.lowInterval * (lim - iv);
  }
  // Style shape.
  const top = v[v.length - 1];
  const span = top - v[1];
  switch (styleName) {
    case 'pop':
    case 'pad':
      if (span > 12) cost += r.shape * 0.5 * (span - 12);
      break;
    case 'drop2':
      if (span < 10 || span > 19) cost += r.shape * 0.5 * Math.min(Math.abs(span - 10), Math.abs(span - 19));
      break;
    case 'spread': {
      const lowGap = v[1] - v[0];
      if (lowGap !== 7 && lowGap !== 12 && lowGap !== 19) cost += r.shape;
      if (top - v[2] > 12) cost += r.shape * 0.5 * (top - v[2] - 12);
      break;
    }
    case 'quartal':
      for (let i = 1; i < v.length - 1; i++) {
        const iv = v[i + 1] - v[i];
        if (iv !== 5 && iv !== 6) cost += r.shape * 0.5;
      }
      break;
    default:
      break;
  }
  cost += r.register * Math.abs(top - center);
  return cost;
}

/**
 * @param {number[]} a previous voicing
 * @param {number[]} b next voicing
 * @param {VoicingContext} ca
 * @param {VoicingContext} cb
 * @param {VoiceLeadingRules} r
 */
function transitionCost(a, b, ca, cb, r) {
  let cost = 0;
  const n = a.length;
  for (let i = 0; i < n; i++) {
    const d = Math.abs(b[i] - a[i]);
    cost += r.motion * (i === 0 ? 0.4 : 1) * d;
    if (i > 0 && d > 5) cost += r.leap * (d - 5);
    if (i > 0 && d > 12) cost += r.leap * 4 * (d - 12);
  }
  // Parallel perfect fifths / octaves (incl. unisons and compound intervals).
  if (r.parallelPerfect > 0) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const before = mod(a[j] - a[i], 12);
        const after = mod(b[j] - b[i], 12);
        if ((before === 7 && after === 7) || (before === 0 && after === 0)) {
          const mi = b[i] - a[i];
          const mj = b[j] - a[j];
          if (mi !== 0 && Math.sign(mi) === Math.sign(mj)) cost += r.parallelPerfect;
        }
      }
    }
  }
  // Hidden (direct) fifths/octaves in the outer voices with a leap in the top voice.
  if (r.hiddenOuter > 0) {
    const lo0 = a[0];
    const lo1 = b[0];
    const hi0 = a[n - 1];
    const hi1 = b[n - 1];
    const iv = mod(hi1 - lo1, 12);
    if ((iv === 0 || iv === 7) && Math.sign(hi1 - hi0) === Math.sign(lo1 - lo0) && hi1 !== hi0 && Math.abs(hi1 - hi0) > 2) cost += r.hiddenOuter;
  }
  // Overlap: a voice moving beyond the previous note of its neighbour.
  for (let i = 0; i < n - 1; i++) {
    if (b[i] > a[i + 1] || b[i + 1] < a[i]) cost += r.overlap;
  }
  // Tendency tones of the previous chord.
  for (let i = 0; i < n; i++) {
    const pc = mod(a[i], 12);
    const step = b[i] - a[i];
    if (ca.roles.seventh >= 0 && pc === ca.roles.seventh && ca.roles.seventh !== mod(ca.roles.root + 9, 12)) {
      const resolves = step === -1 || step === -2;
      const held = step === 0 && cb.pcs.includes(pc);
      if (!resolves && !held) cost += r.seventhResolution;
    }
    if (ca.dominant && pc === ca.leadingTonePc && cb.roles.root === cb.tonicPc) {
      const outer = i === 0 || i === n - 1;
      if (step !== 1) cost += r.leadingTone * (outer ? 1 : 0.35);
    }
  }
  return cost;
}

/**
 * @typedef {object} VoicingOptions
 * @property {VoicingStyle} [style] default: "pop"
 * @property {[number, number][]} [ranges] override voice ranges (bass first)
 * @property {Partial<VoiceLeadingRules>} [rules]
 * @property {number} [center] target MIDI of the top voice
 * @property {number} [beam] candidates kept per chord (default 60)
 */

/**
 * Voices a progression with globally optimized voice leading.
 * @param {import('./chord-utils.js').HarmonyEvent[]} events
 * @param {VoicingOptions} [options]
 * @returns {number[][]} one ascending MIDI tuple (bass first) per event
 */
export function voiceProgression(events, options = {}) {
  const styleName = options.style ?? 'pop';
  const base = STYLES[styleName];
  if (!base) throw new RangeError(`Unknown voicing style "${styleName}"`);
  const style = { ...base, ranges: options.ranges ?? base.ranges };
  const rules = { ...DEFAULT_RULES, ...options.rules };
  const center = options.center ?? base.center;
  const K = options.beam ?? 60;
  if (events.length === 0) return [];

  /** @type {{ v: number[], s: number }[][]} */
  const layers = [];
  const contexts = events.map(contextOf);
  events.forEach((e, idx) => {
    const quartal = /** @type {any} */ (e).quartal === true || e.chord.quality.startsWith('quartal');
    let cands = enumerate(contexts[idx], style, quartal);
    if (cands.length === 0) {
      // Fallback: relax ranges by an octave on both sides.
      const wide = { ...style, ranges: style.ranges.map(([lo, hi]) => /** @type {[number, number]} */ ([lo - 12, hi + 12])) };
      cands = enumerate(contexts[idx], wide, quartal);
    }
    if (cands.length === 0) throw new RangeError(`voiceProgression: no voicing for chord at beat ${e.beat}`);
    const scored = cands.map((v) => ({ v, s: staticCost(v, contexts[idx], styleName, rules, center, quartal) }));
    scored.sort((a, b) => a.s - b.s);
    layers.push(scored.slice(0, K));
  });

  // Viterbi over the candidate layers.
  /** @type {number[][]} */
  const dp = [layers[0].map((c) => c.s)];
  /** @type {number[][]} */
  const back = [layers[0].map(() => -1)];
  for (let t = 1; t < layers.length; t++) {
    const row = [];
    const bp = [];
    for (const cand of layers[t]) {
      let best = Infinity;
      let arg = 0;
      for (let p = 0; p < layers[t - 1].length; p++) {
        const v = dp[t - 1][p] + transitionCost(layers[t - 1][p].v, cand.v, contexts[t - 1], contexts[t], rules);
        if (v < best) {
          best = v;
          arg = p;
        }
      }
      row.push(best + cand.s);
      bp.push(arg);
    }
    dp.push(row);
    back.push(bp);
  }
  let idx = dp[dp.length - 1].indexOf(Math.min(...dp[dp.length - 1]));
  /** @type {number[][]} */
  const path = [];
  for (let t = layers.length - 1; t >= 0; t--) {
    path.unshift(layers[t][idx].v);
    idx = back[t][idx];
  }
  return path;
}

/**
 * Converts voiced harmony into score tracks (bass and chord voices).
 * @param {import('./chord-utils.js').HarmonyEvent[]} events
 * @param {number[][]} voicings
 * @param {{ chordId?: string, bassId?: string, chordInstrument?: string, bassInstrument?: string, velocity?: number,
 *           chordRole?: string, bassRole?: string, legato?: number }} [options] legato: fraction of the duration (default 0.98)
 * @returns {import('../../core/score.js').Track[]}
 */
export function voicingTracks(events, voicings, options = {}) {
  const v = options.velocity ?? 0.65;
  const legato = options.legato ?? 0.98;
  /** @type {import('../../core/score.js').NoteEvent[]} */
  const chordEvents = [];
  /** @type {import('../../core/score.js').NoteEvent[]} */
  const bassEvents = [];
  events.forEach((e, i) => {
    const [b, ...upper] = voicings[i];
    const accent = i === 0 || e.tags.includes('cadence') ? 0.05 : 0;
    bassEvents.push({ t: e.beat, d: e.dur * legato, p: b, v: Math.min(1, v + 0.1 + accent) });
    upper.forEach((p, k) => chordEvents.push({ t: e.beat + k * 0.006, d: e.dur * legato, p, v: Math.min(1, v + accent - 0.02 * k) }));
  });
  /** @type {import('../../core/score.js').Track} */
  const chordTrack = { id: options.chordId ?? 'chords', role: options.chordRole ?? 'pad', events: chordEvents };
  /** @type {import('../../core/score.js').Track} */
  const bassTrack = { id: options.bassId ?? 'bass', role: options.bassRole ?? 'bass', events: bassEvents };
  if (options.chordInstrument) chordTrack.instrument = options.chordInstrument;
  if (options.bassInstrument) bassTrack.instrument = options.bassInstrument;
  return [chordTrack, bassTrack];
}

export { DEFAULT_RULES, STYLES as VOICING_STYLES };
