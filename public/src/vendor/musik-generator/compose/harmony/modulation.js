// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Modulation and key-path planning — the harmonic basis of adaptive
 * transitions (e.g. exploration in G major → combat in E minor).
 * Strategies:
 *  - pivot:      a chord diatonic in both keys, reinterpreted, then V7 → I
 *  - dominant:   approach the new tonic through its own ii–V7
 *  - commonTone: tonic triads share a tone (chromatic mediants, e.g. C → E, C → Ab)
 *  - modal:      same tonic, stepping through the brightness order of the modes;
 *                adjacent modes differ by exactly one pitch class, and the chord
 *                that introduces the new tone is placed first
 *  - chain:      distant keys via a shortest path of closely related keys
 */

import { createKey, keyScale, keySignature, diatonicChord, parseRoman } from '../../theory/key.js';
import { MODE_BRIGHTNESS } from '../../theory/scale.js';
import { chordPitches, formatChordSymbol } from '../../theory/chord.js';
import { pitchClass, mod } from '../../theory/pitch.js';
import { transposePitch } from '../../theory/interval.js';
import { chordTension } from './tension.js';
import { romanLabel, simplifySpelling } from './chord-utils.js';

/** @typedef {import('../../theory/key.js').Key} Key */
/** @typedef {import('./chord-utils.js').HarmonyEvent} HarmonyEvent */

const DIATONIC = /** @type {readonly string[]} */ (MODE_BRIGHTNESS);

/**
 * Circle-of-fifths distance between key signatures (parallel keys: 3).
 * @param {Key} a
 * @param {Key} b
 */
export function keyDistance(a, b) {
  const fa = keySignature(a).fifths;
  const fb = keySignature(b).fifths;
  const d = mod(fb - fa, 12);
  return Math.min(d, 12 - d);
}

/**
 * Closely related keys (one accidental apart, plus relative/parallel).
 * @param {Key} key major or minor key
 * @returns {Key[]}
 */
export function closelyRelatedKeys(key) {
  const minor = keySignature(key).minor;
  const degrees = minor ? [['III', 'major'], ['iv', 'minor'], ['v', 'minor'], ['VI', 'major'], ['VII', 'major']] : [['ii', 'minor'], ['iii', 'minor'], ['IV', 'major'], ['V', 'major'], ['vi', 'major']];
  const keys = degrees.map(([rn, mode]) => createKey(simplifySpelling(parseRoman(rn, key).root), rn === rn.toLowerCase() ? 'minor' : 'major'));
  keys.push(createKey(key.tonic, minor ? 'major' : 'minor'));
  return keys;
}

/**
 * Chords diatonic in both keys, with their function in each.
 * @param {Key} from
 * @param {Key} to
 * @returns {{ chord: import('../../theory/chord.js').Chord, fromRoman: string, toRoman: string, toDegree: number }[]}
 */
export function pivotChords(from, to) {
  const toPcs = keyScale(to).pcs;
  const out = [];
  if (keyScale(from).pcs.length !== 7 || toPcs.length !== 7) return [];
  for (let d = 1; d <= 7; d++) {
    const chord = diatonicChord(from, d);
    const pcs = chordPitches(chord).map(pitchClass);
    if (!pcs.every((pc) => toPcs.includes(pc))) continue;
    const toDegree = toPcs.indexOf(pitchClass(chord.root)) + 1;
    // Spell the pivot as the new key does (D#m, not Ebm, in F# major).
    const respelled = { ...chord, root: { ...keyScale(to).pitches[toDegree - 1] } };
    out.push({ chord: respelled, fromRoman: romanLabel(chord, from), toRoman: romanLabel(respelled, to), toDegree });
  }
  return out;
}

/**
 * Shortest path of keys between two keys through closely related keys (BFS).
 * @param {Key} from
 * @param {Key} to
 * @param {number} [maxSteps]
 * @returns {Key[]} including both ends
 */
export function keyPath(from, to, maxSteps = 6) {
  const id = (/** @type {Key} */ k) => `${pitchClass(k.tonic)}:${keySignature(k).minor ? 'm' : 'M'}`;
  const target = id(to);
  /** @type {Map<string, Key[]>} */
  const seen = new Map([[id(from), [from]]]);
  let frontier = [from];
  for (let step = 0; step < maxSteps && frontier.length > 0; step++) {
    /** @type {Key[]} */
    const next = [];
    for (const k of frontier) {
      for (const n of closelyRelatedKeys(k)) {
        const nid = id(n);
        if (seen.has(nid)) continue;
        const path = [.../** @type {Key[]} */ (seen.get(id(k))), n];
        if (nid === target) return [...path.slice(0, -1), to];
        seen.set(nid, path);
        next.push(n);
      }
    }
    frontier = next;
  }
  return [from, to];
}

/**
 * Mode sequence along the brightness order (same tonic).
 * @param {string} fromMode
 * @param {string} toMode
 */
export function modalPath(fromMode, toMode) {
  const a = DIATONIC.indexOf(fromMode);
  const b = DIATONIC.indexOf(toMode);
  if (a < 0 || b < 0) return [fromMode, toMode];
  const step = a < b ? 1 : -1;
  const out = [];
  for (let i = a; i !== b + step; i += step) out.push(DIATONIC[i]);
  return out;
}

/**
 * @param {import('../../theory/chord.js').Chord} chord
 * @param {Key} key
 * @param {string[]} tags
 * @param {import('./chord-utils.js').HarmonicFunction} fn
 * @returns {Omit<HarmonyEvent, 'beat' | 'dur'>}
 */
function ev(chord, key, tags, fn) {
  return { key, roman: romanLabel(chord, key), fn, chord, tones: chordPitches(chord), bass: chord.bass ?? chord.root, tension: chordTension(chord, key), tags };
}

/**
 * Plans a modulation as a short chord sequence ending on the new tonic.
 * @param {Key} from
 * @param {Key} to
 * @param {{ strategy?: 'auto' | 'pivot' | 'dominant' | 'commonTone' | 'modal' | 'chain', beatsPerChord?: number, startBeat?: number }} [options]
 * @returns {HarmonyEvent[]}
 */
export function planModulation(from, to, { strategy = 'auto', beatsPerChord = 2, startBeat = 0 } = {}) {
  const sameTonic = pitchClass(from.tonic) === pitchClass(to.tonic);
  let s = strategy;
  if (s === 'auto') {
    if (sameTonic && DIATONIC.includes(from.mode) && DIATONIC.includes(to.mode)) s = 'modal';
    else if (keyDistance(from, to) <= 2 && pivotChords(from, to).length > 0) s = 'pivot';
    else if (sharesTonicTone(from, to)) s = 'commonTone';
    else s = 'dominant'; // distant keys: a direct ii–V–I is clearer than a long chain
  }
  /** @type {Omit<HarmonyEvent, 'beat' | 'dur'>[]} */
  let seq = [];
  const toTonic = tonicChord(to);
  const toDominant = { root: simplifySpelling(transposePitch(to.tonic, 'P5')), quality: '7' };
  const toSupertonic = keySignature(to).minor
    ? { root: simplifySpelling(transposePitch(to.tonic, 'M2')), quality: 'm7b5' }
    : { root: simplifySpelling(transposePitch(to.tonic, 'M2')), quality: 'm7' };
  switch (s) {
    case 'pivot': {
      const pivots = pivotChords(from, to);
      // Prefer pivots that act as pre-dominants in the new key (major: ii, IV, vi;
      // minor: iv, VI); diminished pivots only as a last resort.
      const order = keySignature(to).minor ? { 4: 0, 6: 1, 2: 2, 1: 3, 3: 4, 5: 5, 7: 6 } : { 2: 0, 4: 1, 6: 2, 1: 3, 3: 4, 5: 5, 7: 6 };
      const rank = (/** @type {typeof pivots[number]} */ p) => (/** @type {Record<number, number>} */ (order)[p.toDegree] ?? 9) + (p.chord.quality === 'dim' ? 10 : 0);
      pivots.sort((a, b) => rank(a) - rank(b));
      const p = pivots[0];
      seq = [
        { ...ev(p.chord, to, ['pivot'], 'S'), roman: `${p.fromRoman} = ${p.toRoman}` },
        ev(toDominant, to, ['modulation'], 'D'),
        ev(toTonic, to, ['modulation', 'arrival'], 'T'),
      ];
      break;
    }
    case 'dominant':
      seq = [ev(toSupertonic, to, ['modulation'], 'S'), ev(toDominant, to, ['modulation'], 'D'), ev(toTonic, to, ['modulation', 'arrival'], 'T')];
      break;
    case 'commonTone':
      seq = [ev(tonicChord(from), from, ['common-tone'], 'T'), ev(toTonic, to, ['modulation', 'arrival', 'mediant'], 'T')];
      break;
    case 'modal': {
      const modes = modalPath(from.mode, to.mode);
      for (let i = 1; i < modes.length; i++) {
        const prevKey = createKey(from.tonic, modes[i - 1]);
        const key = createKey(from.tonic, modes[i]);
        const newPc = keyScale(key).pcs.find((pc) => !keyScale(prevKey).pcs.includes(pc));
        // A chord of the new mode that contains the new tone (not the tonic chord).
        let colour = null;
        for (const d of [4, 2, 7, 6, 3, 5]) {
          const c = diatonicChord(key, d);
          if (newPc !== undefined && chordPitches(c).map(pitchClass).includes(newPc) && c.quality !== 'dim') {
            colour = c;
            break;
          }
        }
        if (colour) seq.push(ev(colour, key, ['modal-shift'], 'X'));
        seq.push(ev(tonicChord(key), key, i === modes.length - 1 ? ['arrival'] : ['modal-shift'], 'T'));
      }
      break;
    }
    case 'chain': {
      const path = keyPath(from, to);
      for (let i = 1; i < path.length; i++) {
        const part = planModulation(path[i - 1], path[i], { strategy: keyDistance(path[i - 1], path[i]) <= 2 ? 'pivot' : 'dominant', beatsPerChord });
        // Intermediate keys: skip their arrival chord except for the final key.
        seq.push(...part.slice(0, i < path.length - 1 ? -1 : undefined));
      }
      break;
    }
    default:
      throw new RangeError(`Unknown modulation strategy "${s}"`);
  }
  return seq.map((e, i) => ({ ...e, beat: startBeat + i * beatsPerChord, dur: beatsPerChord }));
}

/** @param {Key} key */
function tonicChord(key) {
  const scale = keyScale(key);
  const tonicPc = pitchClass(key.tonic);
  const minor = scale.pcs.includes(mod(tonicPc + 3, 12)) && !scale.pcs.includes(mod(tonicPc + 4, 12));
  return { root: { ...key.tonic }, quality: minor ? 'm' : '' };
}

/**
 * @param {Key} a
 * @param {Key} b
 */
function sharesTonicTone(a, b) {
  const ta = chordPitches(tonicChord(a)).map(pitchClass);
  return chordPitches(tonicChord(b)).map(pitchClass).some((pc) => ta.includes(pc));
}

/**
 * Text form of a modulation plan.
 * @param {HarmonyEvent[]} events
 */
export function describeModulation(events) {
  return events.map((e) => `${formatChordSymbol(e.chord)} [${e.roman}]`).join(' → ');
}
