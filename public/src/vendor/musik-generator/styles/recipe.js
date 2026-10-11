// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Recipe format "mg-recipe" v1: a few hundred bytes that reproduce a whole
 * piece deterministically (same recipe + same major engine version = same
 * score). Recipes come from outside (games, files), so they are validated
 * strictly before use.
 */

import { validate, assertValid } from '../core/validate.js';
import { VERSION } from '../version.js';
import { STYLES } from './styles.js';
import { AXES } from './axes.js';

export const RECIPE_FORMAT = 'mg-recipe';
export const RECIPE_VERSION = 1;

/**
 * @typedef {object} Recipe
 * @property {'mg-recipe'} format
 * @property {1} version
 * @property {string} engine engine version that created it
 * @property {string} style
 * @property {number | string} seed
 * @property {string} [title]
 * @property {number} [minutes] target length (default 2.5)
 * @property {number} [bars] exact length in bars (overrides minutes)
 * @property {number} [bpm]
 * @property {{ tonic: string, mode: string }} [key]
 * @property {Partial<Record<import('./axes.js').Axis, number>>} [axes]
 * @property {number} [intensity] global intensity offset −0.5…0.5
 * @property {import('./styles.js').SectionSpec[]} [form] explicit form, used exactly as given
 *   (no scaling; overrides the style's templates and `bars`/`minutes`)
 * @property {boolean} [loop] the piece repeats: open ending, fill and crash across the seam
 * @property {number} [variety] 0…1: the seed also picks from the style's alternatives
 *   (instruments, patterns, profiles) and a wider tempo range; 0 = the style as designed
 * @property {[number, number, number][]} [motif] a hook of your own for the A sections:
 *   notes as [onset in beats, duration in beats, scale steps relative to the first note]
 */

export const SECTION_TYPES = Object.freeze(['intro', 'A', 'B', 'C', 'bridge', 'breakdown', 'climax', 'outro']);

const MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian', 'major', 'minor'];

/** @type {import('../core/validate.js').Schema} */
export const RECIPE_SCHEMA = {
  type: 'object',
  required: ['format', 'version', 'engine', 'style', 'seed'],
  properties: {
    format: { type: 'string', enum: [RECIPE_FORMAT] },
    version: { type: 'number', integer: true, min: RECIPE_VERSION, max: RECIPE_VERSION },
    engine: { type: 'string', pattern: /^\d+\.\d+\.\d+/, maxLength: 40 },
    style: { type: 'string', enum: Object.keys(STYLES) },
    seed: {
      type: 'any',
      check: (v, path) =>
        (typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 0xffffffff) || (typeof v === 'string' && v.length >= 1 && v.length <= 100)
          ? []
          : [{ path, message: 'must be an integer 0…2^32−1 or a string of 1–100 characters' }],
    },
    title: { type: 'string', maxLength: 200 },
    minutes: { type: 'number', min: 0.1, max: 20 },
    bars: { type: 'number', integer: true, min: 4, max: 2000 },
    bpm: { type: 'number', min: 30, max: 300 },
    key: {
      type: 'object',
      required: ['tonic', 'mode'],
      properties: { tonic: { type: 'string', pattern: /^[A-G](#|b)?$/ }, mode: { type: 'string', enum: MODES } },
    },
    axes: { type: 'object', properties: Object.fromEntries(AXES.map((a) => [a, { type: 'number', min: 0, max: 1 }])) },
    intensity: { type: 'number', min: -0.5, max: 0.5 },
    form: {
      type: 'array',
      minItems: 1,
      maxItems: 64,
      items: {
        type: 'array',
        minItems: 4,
        maxItems: 4,
        items: { type: 'any' },
        check: (v, path) => {
          const [type, label, bars, intensity] = v;
          const ok =
            SECTION_TYPES.includes(type) &&
            typeof label === 'string' && /^[A-Za-z0-9]{1,8}$/.test(label) &&
            Number.isInteger(bars) && bars >= 1 && bars <= 64 &&
            typeof intensity === 'number' && intensity >= 0 && intensity <= 1;
          return ok ? [] : [{ path, message: `must be [type (${SECTION_TYPES.join('|')}), label, bars 1…64, intensity 0…1]` }];
        },
      },
    },
    loop: { type: 'boolean' },
    variety: { type: 'number', min: 0, max: 1 },
    motif: {
      type: 'array',
      minItems: 2,
      maxItems: 32,
      items: {
        type: 'array',
        minItems: 3,
        maxItems: 3,
        items: { type: 'number', min: -24, max: 64 },
        check: (v, path) => (v[0] >= 0 && v[1] > 0 && Number.isInteger(v[2]) ? [] : [{ path, message: 'must be [onset >= 0, duration > 0, integer scale steps]' }]),
      },
    },
  },
};

/** @param {unknown} recipe */
export const validateRecipe = (recipe) => validate(recipe, RECIPE_SCHEMA);

/**
 * @param {unknown} recipe
 * @returns {asserts recipe is Recipe}
 */
export function assertValidRecipe(recipe) {
  assertValid(recipe, RECIPE_SCHEMA, 'recipe');
}

/**
 * Builds a valid recipe from a few fields.
 * @param {Omit<Recipe, 'format' | 'version' | 'engine'> & { engine?: string }} parts
 * @returns {Recipe}
 */
export function createRecipe(parts) {
  /** @type {Recipe} */
  const recipe = { format: RECIPE_FORMAT, version: RECIPE_VERSION, engine: VERSION, ...parts };
  assertValidRecipe(recipe);
  return recipe;
}

/**
 * Whether a recipe was made by a compatible engine (same major version).
 * @param {Recipe} recipe
 */
export function isCompatible(recipe) {
  return recipe.engine.split('.')[0] === VERSION.split('.')[0];
}
