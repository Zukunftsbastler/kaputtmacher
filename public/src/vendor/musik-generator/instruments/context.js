// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Synth context: everything instruments share within one render or one
 * live session — sample rate, the seeded random stream and a resource cache
 * (wavetables are expensive to build, so each is built once per context).
 * There is deliberately no module-level state.
 */

import { Rng } from '../core/prng.js';
import { buildWavetableBank, SPECTRA } from '../dsp/wavetable.js';

/**
 * @typedef {object} SynthContext
 * @property {number} sampleRate
 * @property {Rng} rng root random stream (fork per instrument)
 * @property {(name: string) => import('../dsp/wavetable.js').WavetableBank} wavetable cached bank by spectrum name
 * @property {Float32Array} sine one sine cycle, SINE_TABLE_SIZE + 1 samples (guard point for interpolation)
 */

export const SINE_TABLE_SIZE = 4096;

/**
 * @param {{ sampleRate: number, seed?: number | string }} options
 * @returns {SynthContext}
 */
export function createSynthContext({ sampleRate, seed = 0 }) {
  /** @type {Map<string, import('../dsp/wavetable.js').WavetableBank>} */
  const banks = new Map();
  const sine = new Float32Array(SINE_TABLE_SIZE + 1);
  for (let i = 0; i <= SINE_TABLE_SIZE; i++) sine[i] = Math.sin((2 * Math.PI * i) / SINE_TABLE_SIZE);
  return {
    sampleRate,
    sine,
    rng: new Rng(seed, 'synth'),
    wavetable(name) {
      let bank = banks.get(name);
      if (!bank) {
        const spectrum = SPECTRA[name];
        if (!spectrum) throw new RangeError(`Unknown wavetable "${name}"`);
        bank = buildWavetableBank(spectrum, sampleRate);
        banks.set(name, bank);
      }
      return bank;
    },
  };
}
