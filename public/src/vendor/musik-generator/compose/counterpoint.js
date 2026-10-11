// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Counter-melodies against a given melody, after simplified species
 * counterpoint (Ref: J. J. Fux, "Gradus ad Parnassum", 1725, public domain):
 * imperfect consonances (thirds, sixths) preferred, perfect consonances
 * sparingly, no parallel fifths/octaves, dissonance only on weak beats and
 * resolved by step, contrary motion favoured. Rhythm modes:
 *  complementary  moves while the melody holds, rests on its activity
 *  note           note against note (shares the melody's onsets)
 *  sustained      one guide tone per chord (thirds and sevenths)
 */

import { keyScale } from '../theory/key.js';
import { pitchClass, mod } from '../theory/pitch.js';
import { barLengthBeats } from '../core/meter-map.js';
import { chordRoles } from './harmony/chord-utils.js';

/** @param {import('../core/prng.js').Rng} rng */
const gumbel = (rng) => -Math.log(-Math.log(Math.min(1 - 1e-12, Math.max(1e-12, rng.float()))));

/**
 * @typedef {object} CounterOptions
 * @property {import('../core/score.js').NoteEvent[]} melody
 * @property {import('./harmony/chord-utils.js').HarmonyEvent[]} harmony
 * @property {import('../core/prng.js').Rng} rng
 * @property {'complementary' | 'note' | 'sustained'} [rhythm] default "complementary"
 * @property {'below' | 'above'} [position] default "below"
 * @property {[number, number]} [range] MIDI range (default: below the melody)
 * @property {{ num: number, den: number }} [meter]
 * @property {number} [activity] 0…1 how much the complementary voice moves (default 0.6)
 */

/**
 * @param {CounterOptions} options
 * @returns {import('../core/score.js').NoteEvent[]}
 */
export function generateCounterMelody(options) {
  const { melody, harmony, rng } = options;
  const mode = options.rhythm ?? 'complementary';
  const below = (options.position ?? 'below') === 'below';
  const meter = options.meter ?? { num: 4, den: 4 };
  const barLen = barLengthBeats(meter.num, meter.den);
  const activity = options.activity ?? 0.6;
  const mel = melody.slice().sort((a, b) => a.t - b.t);
  if (mel.length === 0) return [];
  const melLo = Math.min(...mel.map((n) => n.p));
  const melHi = Math.max(...mel.map((n) => n.p));
  const [lo, hi] = options.range ?? (below ? [melLo - 17, melHi - 4] : [melLo + 3, melHi + 12]);
  const key = harmony[0].key;
  const scalePcs = keyScale(key).pcs;
  const start = harmony[0].beat;
  const end = harmony[harmony.length - 1].beat + harmony[harmony.length - 1].dur;

  const chordAt = (/** @type {number} */ t) => {
    let e = harmony[0];
    for (const h of harmony) if (h.beat <= t + 1e-6) e = h;
    return e;
  };
  /** Melody pitch sounding at time t (or the last one). */
  const melAt = (/** @type {number} */ t) => {
    let p = mel[0].p;
    for (const n of mel) if (n.t <= t + 1e-6) p = n.p;
    return p;
  };
  const strength = (/** @type {number} */ t) => {
    const pos = mod(t - start, barLen);
    if (pos < 1e-6) return 1;
    if (barLen >= 4 && Math.abs(pos - barLen / 2) < 1e-6) return 0.7;
    return Math.abs(pos - Math.round(pos)) < 1e-6 ? 0.4 : 0.15;
  };

  // 1. Rhythm.
  /** @type {number[]} */
  let onsets = [];
  if (mode === 'note') onsets = mel.map((n) => n.t);
  else if (mode === 'sustained') onsets = harmony.map((h) => h.beat);
  else {
    const melOnsets = new Set(mel.map((n) => Math.round(n.t * 4)));
    for (let t = start; t < end - 1e-9; t += 0.5) {
      const q = Math.round(t * 4);
      const chordChange = harmony.some((h) => Math.abs(h.beat - t) < 1e-6);
      const melodyMoves = melOnsets.has(q) || melOnsets.has(q + 2);
      // Move while the melody holds; anchor on chord changes.
      const p = chordChange ? 0.85 : melodyMoves ? 0.1 * activity : 0.75 * activity * (strength(t) >= 0.4 ? 1 : 0.6);
      if (rng.chance(p)) onsets.push(t);
    }
    if (onsets.length === 0 || onsets[0] > start) onsets.unshift(start);
  }
  onsets = [...new Set(onsets.map((t) => Math.round(t * 1000) / 1000))].sort((a, b) => a - b);

  // 2. Pitches by beam search.
  /** @type {number[]} */
  const cands = [];
  for (let m = lo; m <= hi; m++) if (scalePcs.includes(mod(m, 12))) cands.push(m);
  /** @typedef {{ ps: number[], ms: number[], nct: boolean[], score: number }} State */
  /** @type {State[]} */
  let beam = [{ ps: [], ms: [], nct: [], score: 0 }];
  for (const t of onsets) {
    const chord = chordAt(t);
    const roles = chordRoles(chord.chord);
    const cpcs = new Set(chord.tones.map(pitchClass));
    const m = melAt(t);
    const s = strength(t);
    /** @type {State[]} */
    const next = [];
    for (const st of beam) {
      const n = st.ps.length;
      const prev = n ? st.ps[n - 1] : null;
      const prevMel = n ? st.ms[n - 1] : null;
      for (const c of cands) {
        let cost = 0;
        const pc = mod(c, 12);
        const isChord = cpcs.has(pc);
        const vert = below ? m - c : c - m;
        if (vert < 3) cost += 6; // crossing or too close
        if (vert > 19) cost += 0.4 * (vert - 19);
        const ic = mod(vert, 12);
        const imperfect = ic === 3 || ic === 4 || ic === 8 || ic === 9;
        const perfect = ic === 0 || ic === 7;
        const dissonant = !imperfect && !perfect && !(ic === 5 && !below);
        if (imperfect) cost -= 0.6;
        else if (perfect) cost += 0.2;
        if (dissonant) cost += s >= 0.4 ? 3 : 0.6;
        if (mode === 'sustained' && roles.seventh >= 0) cost += pc === roles.third || pc === roles.seventh ? -0.8 : 0.4;
        if (isChord) cost -= 0.8 * s;
        else cost += 1.5 * s + 0.4;
        if (prev !== null && prevMel !== null) {
          const mv = c - prev;
          const mm = m - prevMel;
          const a = Math.abs(mv);
          cost += a === 0 ? 0.8 : a <= 2 ? 0 : a <= 4 ? 0.5 : a <= 7 ? 1.2 : 3;
          if (st.nct[n - 1] && !(a >= 1 && a <= 2 && isChord)) cost += 3;
          const prevIc = mod(below ? prevMel - prev : prev - prevMel, 12);
          if ((prevIc === 7 && ic === 7) || (prevIc === 0 && ic === 0)) if (mv !== 0 && Math.sign(mv) === Math.sign(mm)) cost += 5;
          if (mv !== 0 && mm !== 0) cost += Math.sign(mv) === -Math.sign(mm) ? -0.4 : 0.15;
        }
        cost -= 0.5 * gumbel(rng);
        next.push({ ps: [...st.ps, c], ms: [...st.ms, m], nct: [...st.nct, !isChord], score: st.score - cost });
      }
    }
    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, 20);
  }
  const best = beam[0];
  return onsets.map((t, i) => {
    const nextT = onsets[i + 1] ?? end;
    return { t, d: Math.max(0.1, (nextT - t) * 0.95), p: best.ps[i], v: 0.55 + 0.08 * strength(t) };
  });
}
