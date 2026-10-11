// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/** Small numeric helpers shared by all DSP code. */

export const TWO_PI = 2 * Math.PI;

/** Default processing block size (matches the AudioWorklet render quantum). */
export const BLOCK_SIZE = 128;

/** Samples between control-rate updates (filter coefficients, pitch modulation). */
export const CONTROL_INTERVAL = 16;

/** @param {number} db */
export const dbToGain = (db) => 10 ** (db / 20);

/** @param {number} gain */
export const gainToDb = (gain) => 20 * Math.log10(Math.max(gain, 1e-12));

/**
 * @param {number} x
 * @param {number} lo
 * @param {number} hi
 */
export const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);

/**
 * Flushes tiny values to zero. Recursive filters and feedback loops decay
 * into denormal numbers, which are very slow on many CPUs.
 * @param {number} x
 */
export const flush = (x) => (x > -1e-15 && x < 1e-15 ? 0 : x);

/**
 * Equal-tempered frequency of a (fractional) MIDI pitch.
 * @param {number} pitch
 */
export const pitchToHz = (pitch) => 440 * 2 ** ((pitch - 69) / 12);

/** @param {number} cents */
export const centsToRatio = (cents) => 2 ** (cents / 1200);

/**
 * Coefficient of a one-pole smoother with time constant `seconds`
 * (≈ 63 % of a step after `seconds`).
 * @param {number} seconds
 * @param {number} sampleRate
 */
export const onePoleCoef = (seconds, sampleRate) => (seconds <= 0 ? 0 : Math.exp(-1 / (seconds * sampleRate)));

/**
 * Coefficient that decays by 60 dB in `seconds` (per-sample multiplier).
 * @param {number} seconds
 * @param {number} sampleRate
 */
export const t60Coef = (seconds, sampleRate) => (seconds <= 0 ? 0 : Math.exp(-6.907755278982137 / (seconds * sampleRate)));

/**
 * Cheap tanh-like soft clipper (rational approximation, exact ±1 at |x| >= 3).
 * @param {number} x
 */
export function softClip(x) {
  if (x <= -3) return -1;
  if (x >= 3) return 1;
  const x2 = x * x;
  return (x * (27 + x2)) / (27 + 9 * x2);
}

/**
 * Constant-power pan gains for a mono source.
 * @param {number} pan -1 (left) … +1 (right)
 * @returns {[number, number]} [left, right], each 1/√2 at the centre
 */
export function panGains(pan) {
  const angle = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
  return [Math.cos(angle), Math.sin(angle)];
}
