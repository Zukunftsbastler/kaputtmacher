// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Euclidean rhythms: k onsets distributed as evenly as possible over n steps.
 * Many traditional rhythms are of this form, e.g. E(3,8) = tresillo,
 * E(5,8) = cinquillo (Ref: G. Toussaint, "The Euclidean Algorithm Generates
 * Traditional Musical Rhythms", BRIDGES 2005), computed with Bjorklund's
 * pairing algorithm as described there.
 */

/**
 * @param {number} k onsets (0…n)
 * @param {number} n steps (≥ 1)
 * @param {number} [rotation] steps to rotate left
 * @returns {boolean[]}
 */
export function euclidean(k, n, rotation = 0) {
  if (!Number.isInteger(k) || !Number.isInteger(n) || n < 1 || k < 0 || k > n) throw new RangeError(`euclidean: invalid E(${k},${n})`);
  // Bjorklund's algorithm: repeatedly pair the onset groups with the remainder groups.
  /** @type {boolean[][]} */
  let a = Array.from({ length: k }, () => [true]);
  /** @type {boolean[][]} */
  let b = Array.from({ length: n - k }, () => [false]);
  while (b.length > 1 && a.length > 0) {
    const m = Math.min(a.length, b.length);
    const paired = Array.from({ length: m }, (_, i) => [...a[i], ...b[i]]);
    const rest = a.length > m ? a.slice(m) : b.slice(m);
    a = paired;
    b = rest;
  }
  const out = [...a.flat(), ...b.flat()];
  const r = ((rotation % n) + n) % n;
  return [...out.slice(r), ...out.slice(0, r)];
}

/**
 * Pattern string ("x..x..x.") of a Euclidean rhythm.
 * @param {number} k
 * @param {number} n
 * @param {number} [rotation]
 */
export function euclideanPattern(k, n, rotation = 0) {
  return euclidean(k, n, rotation).map((b) => (b ? 'x' : '.')).join('');
}

/**
 * Expands "E(k,n,r)" tokens inside a pattern string, e.g. "E(3,8)E(3,8)".
 * @param {string} pattern
 */
export function expandPattern(pattern) {
  return pattern.replace(/E\((\d+),(\d+)(?:,(-?\d+))?\)/g, (_, k, n, r) => euclideanPattern(Number(k), Number(n), Number(r ?? 0)));
}
