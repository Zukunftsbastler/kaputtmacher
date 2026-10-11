// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/** Instrument layer: engines, presets and the factory. */

import { createSubtractive } from './subtractive.js';
import { createFm } from './fm.js';
import { createPluck } from './pluck.js';
import { createDrumKit } from './drums.js';
import { createTexture } from './texture.js';
import { createModal } from './modal.js';
import { createSpectral } from './spectral.js';
import { createGranular } from './granular.js';
import { PRESETS, DRUM_NOTES } from './presets.js';

export { createSynthContext } from './context.js';
export { PRESETS, DRUM_NOTES };

/** Default preset per score track role. */
export const ROLE_DEFAULTS = Object.freeze({
  bass: 'bass.ladder',
  pad: 'pad.warm',
  chords: 'keys.epiano',
  keys: 'keys.epiano',
  melody: 'lead.soft',
  lead: 'lead.saw',
  arp: 'pluck.synth',
  pluck: 'pluck.nylon',
  drums: 'kit.electro',
  percussion: 'kit.hybrid',
  texture: 'texture.vinyl',
});

/**
 * @param {string} id
 * @returns {import('./presets.js').Preset}
 */
export function getPreset(id) {
  if (!Object.hasOwn(PRESETS, id)) throw new RangeError(`Unknown instrument preset "${id}"`);
  return PRESETS[id];
}

/** @returns {{ id: string, label: string, category: string, engine: string }[]} */
export function listPresets() {
  return Object.values(PRESETS).map(({ id, label, category, engine }) => ({ id, label, category, engine }));
}

/**
 * Creates a playable instrument.
 * @param {string | import('./presets.js').EnginePreset} preset preset id or preset object
 * @param {import('./context.js').SynthContext} ctx
 * @param {import('../core/prng.js').Rng} [rng] defaults to a fork of the context stream named after the preset
 * @returns {import('./voice-pool.js').Instrument}
 */
export function createInstrument(preset, ctx, rng) {
  const p = typeof preset === 'string' ? getPreset(preset) : preset;
  const stream = rng ?? ctx.rng.fork(p.id ?? p.engine);
  switch (p.engine) {
    case 'subtractive':
      return createSubtractive(p, ctx, stream);
    case 'fm':
      return createFm(p, ctx, stream);
    case 'pluck':
      return createPluck(p, ctx, stream);
    case 'drums':
      return createDrumKit(p, ctx, stream);
    case 'texture':
      return createTexture(p, ctx, stream);
    case 'modal':
      return createModal(p, ctx, stream);
    case 'spectral':
      return createSpectral(p, ctx, stream);
    case 'granular':
      return createGranular(p, ctx, stream);
    default:
      throw new RangeError(`Unknown instrument engine "${/** @type {any} */ (p).engine}"`);
  }
}
