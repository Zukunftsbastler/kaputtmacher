// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Seeded pseudo-random number generator with independent, named sub-streams.
 *
 * Generator: xoshiro128** (Ref: Blackman & Vigna, "Scrambled Linear
 * Pseudorandom Number Generators", ACM TOMS 2021 / arXiv 2018).
 * Seeding and stream derivation use a 32-bit avalanche mix.
 *
 * Everything is 32-bit integer arithmetic (Math.imul, shifts, xor), so a
 * sequence is bit-identical in every JavaScript engine and can be ported
 * exactly to other languages. Floating-point transcendental functions are
 * deliberately avoided (their last bits differ between engines).
 */

/**
 * FNV-1a 32-bit hash over the UTF-16 code units of a string.
 * @param {string} text
 * @returns {number} unsigned 32-bit hash
 */
export function hashString(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * 32-bit avalanche mix: every input bit affects every output bit.
 * @param {number} x
 * @returns {number} unsigned 32-bit value
 */
function mix32(x) {
  let z = x >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b);
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35);
  return (z ^ (z >>> 16)) >>> 0;
}

/**
 * @param {number} x
 * @param {number} k
 */
const rotl = (x, k) => (x << k) | (x >>> (32 - k));

/**
 * Normalizes a user-facing seed (integer or string) to an unsigned 32-bit value.
 * Integers in [0, 2^32) are used as-is; anything else is hashed via its string form.
 * @param {number | string} seed
 * @returns {number}
 */
export function normalizeSeed(seed) {
  if (typeof seed === 'number' && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff) {
    return seed >>> 0;
  }
  return hashString(String(seed));
}

export class Rng {
  /** @type {Uint32Array} */
  #s = new Uint32Array(4);
  /** @type {number} */
  #seed;
  /** @type {string} */
  #path;

  /**
   * @param {number | string} seed integer in [0, 2^32) or any string
   * @param {string} [path] diagnostic name of the stream (set by fork)
   */
  constructor(seed, path = 'root') {
    this.#seed = normalizeSeed(seed);
    this.#path = path;
    let x = this.#seed;
    for (let i = 0; i < 4; i++) {
      x = (x + 0x9e3779b9) >>> 0;
      this.#s[i] = mix32(x);
    }
    // xoshiro must never have an all-zero state.
    if ((this.#s[0] | this.#s[1] | this.#s[2] | this.#s[3]) === 0) this.#s[0] = 1;
  }

  /**
   * Creates a generator from a raw xoshiro128** state (for verification
   * against reference test vectors and cross-language ports).
   * @param {readonly number[]} state four 32-bit words, not all zero
   * @returns {Rng}
   */
  static fromState(state) {
    if (state.length !== 4 || state.every((w) => (w >>> 0) === 0)) throw new RangeError('Rng.fromState: need 4 words, not all zero');
    const rng = new Rng(0, 'state');
    for (let i = 0; i < 4; i++) rng.#s[i] = state[i] >>> 0;
    return rng;
  }

  /** Normalized 32-bit seed of this stream. */
  get seed() {
    return this.#seed;
  }

  /** Diagnostic path, e.g. "root/melody/motif". */
  get path() {
    return this.#path;
  }

  /**
   * Derives an independent sub-stream. The child depends only on this stream's
   * seed and the name, never on how many numbers were drawn so far, so changing
   * one subsystem (e.g. drums) does not alter another (e.g. melody).
   * @param {string} name
   * @returns {Rng}
   */
  fork(name) {
    const childSeed = mix32(this.#seed ^ Math.imul(hashString(name), 0x9e3779b1));
    return new Rng(childSeed, `${this.#path}/${name}`);
  }

  /** @returns {number} next unsigned 32-bit integer */
  next() {
    const s = this.#s;
    const result = Math.imul(rotl(Math.imul(s[1], 5), 7), 9) >>> 0;
    const t = s[1] << 9;
    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = rotl(s[3], 11);
    return result;
  }

  /** @returns {number} uniform float in [0, 1) with 32-bit resolution */
  float() {
    return this.next() / 4294967296;
  }

  /**
   * @param {number} min
   * @param {number} max
   * @returns {number} uniform float in [min, max)
   */
  range(min, max) {
    return min + this.float() * (max - min);
  }

  /**
   * Unbiased integer in [min, max] (both inclusive), via rejection sampling.
   * @param {number} min integer
   * @param {number} max integer, max >= min, max - min < 2^32
   * @returns {number}
   */
  int(min, max) {
    if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
      throw new RangeError(`Rng.int: invalid bounds [${min}, ${max}]`);
    }
    const span = max - min + 1;
    if (span > 4294967296) throw new RangeError('Rng.int: span exceeds 2^32');
    const limit = Math.floor(4294967296 / span) * span;
    let r = this.next();
    while (r >= limit) r = this.next();
    return min + (r % span);
  }

  /**
   * @param {number} p probability in [0, 1]
   * @returns {boolean}
   */
  chance(p) {
    return this.float() < p;
  }

  /**
   * @template T
   * @param {readonly T[]} items non-empty
   * @returns {T}
   */
  pick(items) {
    if (items.length === 0) throw new RangeError('Rng.pick: empty array');
    return items[this.int(0, items.length - 1)];
  }

  /**
   * @param {readonly number[]} weights non-negative, sum > 0
   * @returns {number} chosen index
   */
  weightedIndex(weights) {
    let total = 0;
    for (const w of weights) {
      if (!(w >= 0) || !Number.isFinite(w)) throw new RangeError(`Rng.weightedIndex: invalid weight ${w}`);
      total += w;
    }
    if (total <= 0) throw new RangeError('Rng.weightedIndex: weights sum to zero');
    let r = this.float() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    // Floating-point remainder: fall back to the last positive weight.
    for (let i = weights.length - 1; i >= 0; i--) if (weights[i] > 0) return i;
    return weights.length - 1;
  }

  /**
   * @template T
   * @param {readonly T[]} items
   * @param {readonly number[]} weights same length as items
   * @returns {T}
   */
  weighted(items, weights) {
    if (items.length !== weights.length) throw new RangeError('Rng.weighted: length mismatch');
    return items[this.weightedIndex(weights)];
  }

  /**
   * Fisher–Yates shuffle; returns a new array.
   * @template T
   * @param {readonly T[]} items
   * @returns {T[]}
   */
  shuffle(items) {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
    return out;
  }

  /**
   * Approximately normal value via the Irwin–Hall sum of 12 uniforms.
   * Uses only addition, so it stays bit-identical across engines; the result
   * is naturally bounded to mean ± 6·sd, which suits musical variation.
   * @param {number} [mean]
   * @param {number} [sd]
   * @returns {number}
   */
  normal(mean = 0, sd = 1) {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += this.float();
    return mean + (sum - 6) * sd;
  }
}
