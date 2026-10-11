// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Folk ornamentation (Irish/Scottish fiddle and whistle practice): "cuts" –
 * a very short grace note above the main note that articulates it – on longer
 * notes in strong positions, and occasional "taps" from below. The main note
 * keeps its onset; the grace steals a few hundredths of a beat from it.
 * Ref: B. Breathnach, Folk Music and Dances of Ireland, Mercier 1971 (ornaments).
 */

import { mod } from '../../theory/pitch.js';

/**
 * @param {import('../../core/score.js').NoteEvent[]} notes
 * @param {number[]} scalePcs pitch classes of the mode
 * @param {import('../../core/prng.js').Rng} rng
 * @param {{ amount?: number, graceBeats?: number }} [options] amount 0…1 (default 0.4)
 * @returns {import('../../core/score.js').NoteEvent[]}
 */
export function ornamentFolk(notes, scalePcs, rng, { amount = 0.4, graceBeats = 0.06 } = {}) {
  /** @type {import('../../core/score.js').NoteEvent[]} */
  const out = [];
  /** Next scale tone above (dir 1) or below (dir −1). */
  const step = (/** @type {number} */ p, /** @type {number} */ dir) => {
    for (let q = p + dir; Math.abs(q - p) <= 3; q += dir) if (scalePcs.includes(mod(q, 12))) return q;
    return p + 2 * dir;
  };
  for (const n of notes) {
    const onBeat = Math.abs(n.t - Math.round(n.t)) < 0.02;
    const long = n.d >= 0.7;
    if ((long || onBeat) && n.d > 3 * graceBeats && rng.float() < amount * (long ? 1 : 0.5)) {
      const grace = rng.float() < 0.8 ? step(n.p, 1) : step(n.p, -1);
      out.push({ t: n.t, d: graceBeats, p: grace, v: Math.max(0.05, n.v * 0.7) });
      out.push({ ...n, t: n.t + graceBeats, d: n.d - graceBeats });
    } else out.push(n);
  }
  return out;
}
