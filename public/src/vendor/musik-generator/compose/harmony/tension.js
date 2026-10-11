// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Tonal tension after a simplified version of Lerdahl's Tonal Pitch Space
 * (Ref: F. Lerdahl, "Tonal Pitch Space", 2001, ch. 2): the distance of a
 * chord from the tonic triad is δ = j + k, where
 *   j = root distance on the circle of fifths (diatonic circle for diatonic
 *       roots, chromatic circle otherwise),
 *   k = number of pitch classes in the chord's basic space (root, root+fifth,
 *       triad, diatonic collection) that are not in the tonic's basic space.
 * This reproduces Lerdahl's values (I→V = 5, I→IV = 5, I→vi = 7, I→ii = 8).
 * Surface dissonance (sevenths, extensions, altered triads) is added on top.
 */

import { keyScale } from '../../theory/key.js';
import { pitchClass, mod } from '../../theory/pitch.js';
import { chordRoles } from './chord-utils.js';

/** Normalization: δ of very remote chords lies around 14. */
const MAX_TENSION = 14;

/**
 * Basic-space levels of a chord within a key.
 * @param {import('../../theory/chord.js').Chord} chord
 * @param {number[]} diatonic key pitch classes
 * @param {number[]} [explicitTones] for chords given by explicit tones
 */
function basicSpace(chord, diatonic, explicitTones) {
  const r = chordRoles(chord);
  const fifth = r.fifth >= 0 ? r.fifth : r.root;
  // Level c is the triad only; sevenths and extensions count as surface dissonance,
  // but non-diatonic ones still enlarge the diatonic level d.
  const triad = explicitTones ?? [r.root, r.third, r.fifth].filter((pc) => pc >= 0);
  const all = explicitTones ?? [r.root, r.third, r.fifth, r.seventh, ...r.extensions].filter((pc) => pc >= 0);
  return [new Set([r.root]), new Set([r.root, fifth]), new Set(triad), new Set([...diatonic, ...all])];
}

/**
 * Circle-of-fifths distance of a root from the tonic.
 * @param {number} rootPc
 * @param {import('../../theory/key.js').Key} key
 */
function rootDistance(rootPc, key) {
  const scale = keyScale(key);
  const tonicPc = pitchClass(key.tonic);
  if (scale.pcs.length === 7 && scale.pcs.includes(rootPc)) {
    // Diatonic circle: degrees ordered by fifths (1 5 2 6 3 7 4).
    const order = [0, 4, 1, 5, 2, 6, 3].map((d) => scale.pcs[d]);
    const a = order.indexOf(tonicPc);
    const b = order.indexOf(rootPc);
    const d = Math.abs(a - b);
    return Math.min(d, 7 - d);
  }
  const steps = mod((rootPc - tonicPc) * 7, 12);
  return Math.min(steps, 12 - steps);
}

/**
 * Lerdahl-style chord distance δ from the tonic triad of `key`.
 * @param {import('../../theory/chord.js').Chord} chord
 * @param {import('../../theory/key.js').Key} key
 * @param {number[]} [explicitTones]
 */
export function distanceFromTonic(chord, key, explicitTones) {
  const scale = keyScale(key);
  const tonicPc = pitchClass(key.tonic);
  const third = scale.pcs.find((pc) => mod(pc - tonicPc, 12) === 3 || mod(pc - tonicPc, 12) === 4) ?? mod(tonicPc + 4, 12);
  const fifth = scale.pcs.find((pc) => mod(pc - tonicPc, 12) === 7) ?? mod(tonicPc + 7, 12);
  const tonic = [new Set([tonicPc]), new Set([tonicPc, fifth]), new Set([tonicPc, third, fifth]), new Set(scale.pcs)];
  const space = basicSpace(chord, scale.pcs, explicitTones);
  let k = 0;
  for (let level = 0; level < 4; level++) for (const pc of space[level]) if (!tonic[level].has(pc)) k++;
  return rootDistance(pitchClass(chord.root), key) + k;
}

/**
 * Surface dissonance of a chord quality (added to the tonal distance).
 * @param {import('../../theory/chord.js').Chord} chord
 */
export function surfaceDissonance(chord) {
  const r = chordRoles(chord);
  let d = 0;
  if (r.seventh >= 0) d += 1;
  d += 0.5 * r.extensions.length;
  if (r.third >= 0 && r.fifth >= 0) {
    const fifthIv = mod(r.fifth - r.root, 12);
    if (fifthIv !== 7) d += 1; // diminished or augmented fifth
  }
  if (/sus/.test(chord.quality)) d += 0.5;
  if (chord.bass && r.fifth === pitchClass(chord.bass) && r.seventh < 0) d += 0.5; // 6/4 position
  return d;
}

/**
 * Tension 0…1 of a chord in a key.
 * @param {import('../../theory/chord.js').Chord} chord
 * @param {import('../../theory/key.js').Key} key
 * @param {number[]} [explicitTones]
 */
export function chordTension(chord, key, explicitTones) {
  return Math.min(1, (distanceFromTonic(chord, key, explicitTones) + surfaceDissonance(chord)) / MAX_TENSION);
}

/**
 * Default phrase tension curve: starts relaxed, rises to a peak at about
 * 70 % of the phrase and resolves at the cadence.
 * @param {number} x position in the phrase 0…1
 */
export function archTension(x) {
  const peak = 0.7;
  return x <= peak ? 0.1 + 0.45 * (x / peak) ** 1.3 : 0.55 - 0.45 * ((x - peak) / (1 - peak)) ** 0.8;
}
