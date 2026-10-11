// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Neo-Riemannian transformations of major/minor triads: parsimonious
 * voice-leading moves that create the chromatic "film music" colours
 * (Ref: R. Cohn, "Audacious Euphony", 2012).
 *  P  parallel        C ↔ c       (one voice moves a semitone)
 *  R  relative        C ↔ a       (one voice moves a whole tone)
 *  L  leading-tone    C ↔ e       (one voice moves a semitone)
 *  N  Nebenverwandt   C ↔ f       (= RLP)
 *  S  slide           C ↔ c#      (= LPR)
 *  H  hexatonic pole  C ↔ ab      (= LPL)
 * Every operation is an involution (applying it twice returns the triad).
 */

import { transposePitch } from '../../theory/interval.js';
import { simplifySpelling } from './chord-utils.js';

/** @typedef {'P' | 'R' | 'L' | 'N' | 'S' | 'H'} NeoRiemannOp */

export const NEO_RIEMANN_OPS = /** @type {const} */ (['P', 'R', 'L', 'N', 'S', 'H']);

/**
 * @param {import('../../theory/chord.js').Chord} chord
 * @returns {boolean}
 */
export const isConsonantTriad = (chord) => chord.quality === '' || chord.quality === 'm';

/**
 * @param {import('../../theory/chord.js').Chord} chord major or minor triad
 * @param {NeoRiemannOp} op
 * @returns {import('../../theory/chord.js').Chord}
 */
export function neoRiemann(chord, op) {
  if (!isConsonantTriad(chord)) throw new RangeError(`neoRiemann: ${op} needs a major or minor triad`);
  const major = chord.quality === '';
  const r = chord.root;
  /** @type {(iv: string, dir?: 1 | -1) => import('../../theory/pitch.js').PitchName} */
  const t = (iv, dir = 1) => simplifySpelling(transposePitch(r, iv, dir));
  switch (op) {
    case 'P':
      return { root: { ...r }, quality: major ? 'm' : '' };
    case 'R':
      return major ? { root: t('M6'), quality: 'm' } : { root: t('m3'), quality: '' };
    case 'L':
      return major ? { root: t('M3'), quality: 'm' } : { root: t('M3', -1), quality: '' };
    case 'N':
      return major ? { root: t('P4'), quality: 'm' } : { root: t('P4', -1), quality: '' };
    case 'S':
      return major ? { root: t('A1'), quality: 'm' } : { root: t('A1', -1), quality: '' };
    case 'H':
      return applyNeoRiemann(chord, 'LPL');
    default:
      throw new RangeError(`Unknown neo-Riemannian operation "${op}"`);
  }
}

/**
 * Applies a sequence of operations left to right, e.g. "PL" = P then L.
 * @param {import('../../theory/chord.js').Chord} chord
 * @param {string} ops
 */
export function applyNeoRiemann(chord, ops) {
  let c = chord;
  for (const op of ops) c = neoRiemann(c, /** @type {NeoRiemannOp} */ (op));
  return c;
}
