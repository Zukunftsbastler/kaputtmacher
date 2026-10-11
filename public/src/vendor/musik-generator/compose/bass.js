// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Bass lines over a harmony. Patterns:
 *  root        one note per chord (re-struck every bar)
 *  rootFifth   root, then the fifth at mid-chord
 *  octave8     driving eighths alternating root and upper octave (synthwave, disco)
 *  arpeggio    eighth-note chord arpeggio
 *  walking     quarter notes: chord tone on the beat, passing tones, chromatic or
 *              diatonic approach into the next chord (jazz, swing)
 *  pompe       short notes on beats 1 and 3, root and fifth alternating (gypsy jazz)
 *  pedal8      tonic eighths under changing chords (tension, ostinato)
 *  syncopated  root on 1, anticipations on the "and" (pop, funk)
 *  dotted      dotted-quarter drive (cinematic ostinato)
 * The register follows the previous note (closest octave within the range).
 */

import { keyScale } from '../theory/key.js';
import { pitchClass, mod } from '../theory/pitch.js';
import { barLengthBeats } from '../core/meter-map.js';
import { chordRoles } from './harmony/chord-utils.js';
import { swingTime } from './melody/melody.js';

/** @typedef {'root' | 'rootFifth' | 'octave8' | 'arpeggio' | 'walking' | 'pompe' | 'pedal8' | 'syncopated' | 'dotted'} BassPattern */

export const BASS_PATTERNS = /** @type {const} */ (['root', 'rootFifth', 'octave8', 'arpeggio', 'walking', 'pompe', 'pedal8', 'syncopated', 'dotted']);

/**
 * MIDI note of a pitch class closest to `near` within [lo, hi].
 * @param {number} pc
 * @param {number} near
 * @param {number} lo
 * @param {number} hi
 */
function place(pc, near, lo, hi) {
  let best = -1;
  for (let m = lo; m <= hi; m++) if (mod(m, 12) === pc && (best < 0 || Math.abs(m - near) < Math.abs(best - near))) best = m;
  return best < 0 ? lo + mod(pc - lo, 12) : best;
}

/**
 * @typedef {object} BassOptions
 * @property {import('./harmony/chord-utils.js').HarmonyEvent[]} harmony
 * @property {import('../core/prng.js').Rng} rng
 * @property {BassPattern} [pattern] default "root"
 * @property {{ num: number, den: number }} [meter]
 * @property {[number, number]} [range] default [28, 52] (E1–E3)
 * @property {number} [swing] off-beat delay in beats
 * @property {number} [velocity] base velocity (default 0.75)
 */

/**
 * @param {BassOptions} options
 * @returns {import('../core/score.js').NoteEvent[]}
 */
export function generateBassLine(options) {
  const { harmony, rng } = options;
  const pattern = options.pattern ?? 'root';
  const meter = options.meter ?? { num: 4, den: 4 };
  const barLen = barLengthBeats(meter.num, meter.den);
  const [lo, hi] = options.range ?? [28, 52];
  const swing = options.swing ?? 0;
  const vel = options.velocity ?? 0.75;
  const key = harmony[0].key;
  const scalePcs = keyScale(key).pcs;
  /** @type {import('../core/score.js').NoteEvent[]} */
  const out = [];
  let prev = lo + 7;
  /** @param {number} t @param {number} d @param {number} p @param {number} v */
  const add = (t, d, p, v) => {
    const t0 = swingTime(t, swing);
    const t1 = swingTime(t + d, swing);
    out.push({ t: t0, d: Math.max(0.05, t1 - t0), p, v: Math.min(1, v) });
    prev = p;
  };
  const accent = (/** @type {number} */ t) => (mod(t, barLen) < 1e-6 ? 0.08 : 0);

  harmony.forEach((e, i) => {
    const roles = chordRoles(e.chord);
    const bassPc = pitchClass(e.bass);
    const rootPc = roles.root;
    const fifthPc = roles.fifth >= 0 ? roles.fifth : mod(rootPc + 7, 12);
    const tones = [...new Set(e.tones.map(pitchClass))];
    const next = harmony[i + 1];
    const end = e.beat + e.dur;
    const bass = place(bassPc, prev, lo, hi);
    switch (pattern) {
      case 'root':
        for (let t = e.beat; t < end - 1e-9; t += barLen) add(t, Math.min(barLen, end - t) * 0.95, t === e.beat ? bass : place(bassPc, prev, lo, hi), vel + accent(t));
        break;
      case 'rootFifth': {
        add(e.beat, Math.min(e.dur / 2, barLen / 2) * 0.9, bass, vel + accent(e.beat));
        for (let t = e.beat + Math.min(e.dur / 2, barLen / 2); t < end - 1e-9; t += barLen / 2) {
          const fifth = place(fifthPc, bass + 7 > hi ? bass - 5 : bass + 7, lo, hi);
          add(t, Math.min(barLen / 2, end - t) * 0.9, Math.round((t - e.beat) / (barLen / 2)) % 2 === 1 ? fifth : bass, vel - 0.08 + accent(t));
        }
        break;
      }
      case 'octave8':
        for (let t = e.beat, k = 0; t < end - 1e-9; t += 0.5, k++) {
          const p = k % 2 === 1 && bass + 12 <= hi + 12 ? bass + 12 : bass;
          add(t, 0.42, p, vel - (k % 2 ? 0.1 : 0) + accent(t));
          prev = bass;
        }
        break;
      case 'arpeggio': {
        const up = tones.map((pc) => place(pc, bass + 4, bass, bass + 12)).sort((a, b) => a - b);
        const seq = [bass, ...up.filter((p) => p !== bass), bass + 12].filter((p) => p <= hi + 7);
        for (let t = e.beat, k = 0; t < end - 1e-9; t += 0.5, k++) add(t, 0.45, seq[k % seq.length], vel - 0.05 + accent(t));
        prev = bass;
        break;
      }
      case 'pedal8': {
        const tonic = place(pitchClass(key.tonic), prev, lo, hi);
        for (let t = e.beat, k = 0; t < end - 1e-9; t += 0.5, k++) add(t, 0.4, tonic, vel - (k % 2 ? 0.12 : 0) + accent(t));
        break;
      }
      case 'syncopated': {
        const shape = [[0, 1.4, 0], [1.5, 0.45, 12], [2.5, 0.45, 7], [3.5, 0.45, 0]];
        for (let bar = e.beat; bar < end - 1e-9; bar += barLen) {
          for (const [off, d, iv] of shape) {
            if (bar + off >= end - 1e-9 || off >= barLen) continue;
            const pc = iv === 7 ? fifthPc : bassPc;
            const p = iv === 12 && bass + 12 <= hi + 12 ? bass + 12 : place(pc, bass, lo, hi);
            add(bar + off, d, p, vel - (off ? 0.1 : 0) + accent(bar + off));
            prev = bass;
          }
        }
        break;
      }
      case 'dotted': {
        for (let t = e.beat, k = 0; t < end - 1e-9; k++) {
          const d = k % 2 === 0 ? 1.5 : 0.5;
          add(t, Math.min(d, end - t) * 0.85, k % 4 === 3 ? place(fifthPc, bass, lo, hi) : bass, vel - (k % 2 ? 0.1 : 0) + accent(t));
          prev = bass;
          t += d;
        }
        break;
      }
      case 'pompe': {
        for (let t = e.beat, k = 0; t < end - 1e-9; t += barLen / 2, k++) {
          const p = k % 2 === 0 ? bass : place(fifthPc, bass - 5, lo, hi);
          add(t, 0.5, p, vel + accent(t));
          prev = bass;
        }
        break;
      }
      case 'walking': {
        const beats = Math.max(1, Math.round(e.dur));
        const targetPc = next ? pitchClass(next.bass) : bassPc;
        const notes = [bass];
        // The target must be where the next chord will actually place its bass note.
        const target = place(targetPc, bass, lo, hi);
        if (beats >= 2) {
          // Approach into the next chord: chromatic from below/above, diatonic step, or its dominant.
          const approaches = [target - 1, target + 1, nearestScale(target, -1, scalePcs), nearestScale(target, 1, scalePcs), target + 7 <= hi ? target + 7 : target - 5];
          const approach = rng.weighted(approaches, [2, 1.5, 1.5, 1, 0.7]);
          const middle = [];
          for (let k = 1; k < beats - 1; k++) {
            const from = middle[middle.length - 1] ?? bass;
            const aim = bass + ((approach - bass) * (k + 0.5)) / (beats - 1);
            // Chord tones first, then scale tones; never repeat the previous note.
            const pool = [];
            for (let m = from - 7; m <= from + 7; m++) {
              if (m === from || m < lo || m > hi + 3) continue;
              const pc = mod(m, 12);
              if (tones.includes(pc)) pool.push({ m, w: 3 / (1 + Math.abs(m - aim)) });
              else if (scalePcs.includes(pc)) pool.push({ m, w: 1.2 / (1 + Math.abs(m - aim)) });
            }
            middle.push(pool.length ? rng.weighted(pool.map((x) => x.m), pool.map((x) => x.w)) : from + 2);
          }
          // Never repeat the note before the approach; switch to the other side of the target.
          const before = middle.length > 0 ? middle[middle.length - 1] : bass;
          const finalApproach = approach === before ? (approach === target - 1 ? target + 1 : target - 1) : approach;
          notes.push(...middle, finalApproach);
        }
        notes.slice(0, beats).forEach((p, k) => add(e.beat + k, 0.9, p, vel - (k % 2 ? 0.08 : 0) + accent(e.beat + k)));
        for (let t = e.beat + beats; t < end - 1e-9; t++) add(t, 0.9, bass, vel - 0.05);
        prev = notes[Math.min(notes.length, beats) - 1];
        break;
      }
      default:
        throw new RangeError(`Unknown bass pattern "${pattern}"`);
    }
  });
  return out;
}

/**
 * Nearest scale tone below (dir −1) or above (dir +1) a note.
 * @param {number} m
 * @param {1 | -1} dir
 * @param {number[]} scalePcs
 */
function nearestScale(m, dir, scalePcs) {
  for (let k = 1; k <= 3; k++) if (scalePcs.includes(mod(m + dir * k, 12))) return m + dir * k;
  return m + dir;
}
