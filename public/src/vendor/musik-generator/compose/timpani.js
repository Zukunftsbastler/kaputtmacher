// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Timpani part from the harmony, the way orchestrators use them: the root of
 * strong-beat chords (tonic and dominant above all) on phrase downbeats and
 * cadences, an answering stroke at higher intensity, and a crescendo roll
 * leading into the next section.
 */

import { barLengthBeats } from '../core/meter-map.js';
import { pitchClass } from '../theory/pitch.js';

/**
 * @param {{ harmony: import('./harmony/chord-utils.js').HarmonyEvent[], rng: import('../core/prng.js').Rng,
 *           intensity: number, meter?: { num: number, den: number }, rollAtEnd?: boolean, range?: [number, number],
 *           phraseBars?: number }} o
 * @returns {import('../core/score.js').NoteEvent[]}
 */
export function generateTimpani(o) {
  const { harmony, rng, intensity } = o;
  const meter = o.meter ?? { num: 4, den: 4 };
  const barLen = barLengthBeats(meter.num, meter.den);
  const [lo, hi] = o.range ?? [40, 55];
  const phrase = (o.phraseBars ?? 4) * barLen;
  if (harmony.length === 0) return [];
  const end = harmony[harmony.length - 1].beat + harmony[harmony.length - 1].dur;
  const place = (/** @type {number} */ pc) => {
    let p = lo + ((pc - lo) % 12 + 12) % 12;
    if (p > hi) p -= 12;
    return p;
  };
  /** @type {import('../core/score.js').NoteEvent[]} */
  const out = [];
  const tonic = pitchClass(harmony[0].key.tonic);
  for (const e of harmony) {
    const root = pitchClass(e.chord.bass ?? e.chord.root);
    // Timpani were tuned to tonic and dominant; other roots only at high intensity.
    const functional = root === tonic || root === (tonic + 7) % 12;
    if (!functional && intensity < 0.75) continue;
    const strong = Math.abs(e.beat % phrase) < 1e-6 || e.tags.includes('cadence') || Math.abs(e.beat % (2 * barLen)) < 1e-6;
    if (!strong && intensity < 0.6) continue;
    out.push({ t: e.beat, d: Math.min(e.dur, 2), p: place(root), v: Math.min(1, 0.55 + 0.4 * intensity + (strong ? 0.08 : 0)) });
    if (intensity >= 0.7 && e.dur >= barLen && rng.float() < 0.7) {
      out.push({ t: e.beat + barLen / 2 + (rng.float() < 0.5 ? 0.5 : 0), d: 0.5, p: place(root), v: 0.5 + 0.3 * intensity });
    }
  }
  if (o.rollAtEnd && end >= barLen) {
    const last = harmony[harmony.length - 1];
    out.push({ t: end - barLen, d: barLen, p: place(pitchClass(last.chord.bass ?? last.chord.root)), v: 0.45 + 0.4 * intensity, art: 'roll' });
  }
  return out.sort((a, b) => a.t - b.t).filter((e, i, all) => i === 0 || e.t > all[i - 1].t + 0.2 || e.art === 'roll');
}
