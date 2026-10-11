// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Adaptive music description "mg-adaptive" v1: what a game wants – states
 * (each a style recipe with an explicit loop form), layers by track role with
 * parameter mappings, transition rules (quantization, bridges, fades,
 * stingers), stingers and hysteresis. The stem pipeline (src/stems/) turns it
 * into rendered segments plus an "mg-stems" manifest; the live engine (Phase 8)
 * will read the same description.
 */

import { validate, assertValid } from '../core/validate.js';
import { VERSION } from '../version.js';
import { STYLES } from '../styles/styles.js';
import { AXES } from '../styles/axes.js';
import { RECIPE_SCHEMA } from '../styles/recipe.js';
import { QUANTIZE } from './manifest.js';

export const ADAPTIVE_FORMAT = 'mg-adaptive';
export const ADAPTIVE_VERSION = 1;

/** Stinger figures the pipeline can compose. */
export const STINGER_KINDS = Object.freeze(['rise', 'hit', 'shimmer', 'fall']);

/**
 * Default layer split by track role. Roles not listed go to the first layer.
 * `intensity` brings in rhythm and melody; base and bass are always on.
 * @type {Readonly<Record<string, AdaptiveLayer>>}
 */
export const DEFAULT_LAYERS = Object.freeze({
  base: { roles: ['pad', 'chords', 'keys', 'drone', 'texture', 'default'] },
  bass: { roles: ['bass', 'sub'], mono: true },
  rhythm: { roles: ['drums', 'percussion'], param: 'intensity', from: 0.25, to: 0.45 },
  melody: { roles: ['melody', 'lead', 'counter', 'arp', 'pluck'], param: 'intensity', from: 0.5, to: 0.7 },
});

/**
 * @typedef {object} AdaptiveLayer
 * @property {string[]} roles track roles rendered into this layer
 * @property {string} [param]
 * @property {number} [from]
 * @property {number} [to]
 * @property {'fade' | 'switch'} [mode]
 * @property {number} [hysteresis]
 * @property {number} [fadeSec]
 * @property {boolean} [mono] render the layer in mono (half the memory; for centred content like bass)
 *
 * @typedef {object} AdaptiveState
 * @property {string} style
 * @property {number | string} [seed] default: description seed + state name
 * @property {{ tonic: string, mode: string }} [key]
 * @property {number} [bpm]
 * @property {Partial<Record<import('../styles/axes.js').Axis, number>>} [axes]
 * @property {import('../styles/styles.js').SectionSpec[]} form one segment per section
 * @property {number} [variety] 0…1, see recipe.variety
 * @property {[number, number, number][]} [motif] own hook, see recipe.motif
 * @property {number} [intensity] recipe intensity offset
 * @property {boolean} [loop] default true
 * @property {string} [then] follow-up state of a one-shot (loop: false)
 * @property {'sequence' | 'shuffle'} [order]
 * @property {number} [loudness] integrated loudness with all layers on (default −18 LUFS)
 *
 * @typedef {object} AdaptiveTransition
 * @property {string} from state or "*"
 * @property {string} to state or "*"
 * @property {import('./manifest.js').Quantize} [at]
 * @property {'bridge' | 'none'} [via] bridge: a composed modulation with tempo ramp
 * @property {number} [bars] bridge length (default 1)
 * @property {number} [fadeSec]
 * @property {number} [fadeInSec]
 * @property {string} [stinger]
 *
 * @typedef {object} AdaptiveDescription
 * @property {'mg-adaptive'} format
 * @property {1} version
 * @property {string} engine
 * @property {string} [title]
 * @property {number | string} seed
 * @property {string} initial
 * @property {Record<string, { default?: number, smoothingSec?: number }>} [params]
 * @property {Record<string, AdaptiveLayer>} [layers] default DEFAULT_LAYERS
 * @property {Record<string, AdaptiveState>} states
 * @property {AdaptiveTransition[]} [transitions]
 * @property {Record<string, { kind: string, style?: string, gainDb?: number, duckDb?: number }>} [stingers]
 * @property {{ minStateSeconds?: number }} [hysteresis]
 */

const NAME = { type: /** @type {const} */ ('string'), pattern: /^[A-Za-z0-9_-][A-Za-z0-9_-]{0,31}$/ };
const NUM = (/** @type {number} */ min, /** @type {number} */ max) => ({ type: /** @type {const} */ ('number'), min, max });
/** @param {import('../core/validate.js').Schema} schema @param {number} max */
const MAP = (schema, max) => ({
  type: /** @type {const} */ ('object'),
  additional: schema,
  check: (/** @type {Record<string, unknown>} */ v, /** @type {string} */ path) => {
    /** @type {import('../core/validate.js').Issue[]} */
    const issues = [];
    if (Object.keys(v).length > max) issues.push({ path, message: `must have <= ${max} entries` });
    for (const k of Object.keys(v)) if (!NAME.pattern.test(k)) issues.push({ path: `${path}.${k}`, message: 'invalid name (letters, digits, _ and -, max. 32)' });
    return issues;
  },
});
const recipeProps = /** @type {Record<string, import('../core/validate.js').Schema>} */ (/** @type {any} */ (RECIPE_SCHEMA).properties);
const STATE_REF = { type: /** @type {const} */ ('string'), pattern: /^(\*|[A-Za-z0-9_-][A-Za-z0-9_-]{0,31})$/ };

/** @type {import('../core/validate.js').Schema} */
export const ADAPTIVE_SCHEMA = {
  type: 'object',
  required: ['format', 'version', 'engine', 'seed', 'initial', 'states'],
  properties: {
    format: { type: 'string', enum: [ADAPTIVE_FORMAT] },
    version: { type: 'number', integer: true, min: ADAPTIVE_VERSION, max: ADAPTIVE_VERSION },
    engine: { type: 'string', pattern: /^\d+\.\d+\.\d+/, maxLength: 40 },
    title: { type: 'string', maxLength: 200 },
    seed: recipeProps.seed,
    initial: NAME,
    params: MAP({ type: 'object', properties: { default: NUM(0, 1), smoothingSec: NUM(0, 60) } }, 16),
    layers: MAP(
      {
        type: 'object',
        required: ['roles'],
        properties: {
          roles: { type: 'array', items: { type: 'string', maxLength: 32 }, minItems: 1, maxItems: 32 },
          param: NAME,
          from: NUM(0, 1),
          to: NUM(0, 1),
          mode: { type: 'string', enum: ['fade', 'switch'] },
          hysteresis: NUM(0, 0.5),
          fadeSec: NUM(0, 30),
          mono: { type: 'boolean' },
        },
      },
      12,
    ),
    states: MAP(
      {
        type: 'object',
        required: ['style', 'form'],
        properties: {
          style: { type: 'string', enum: Object.keys(STYLES) },
          seed: recipeProps.seed,
          key: recipeProps.key,
          bpm: recipeProps.bpm,
          axes: { type: 'object', properties: Object.fromEntries(AXES.map((a) => [a, NUM(0, 1)])) },
          form: recipeProps.form,
          variety: recipeProps.variety,
          motif: recipeProps.motif,
          intensity: recipeProps.intensity,
          loop: { type: 'boolean' },
          then: NAME,
          order: { type: 'string', enum: ['sequence', 'shuffle'] },
          loudness: NUM(-40, -8),
        },
      },
      32,
    ),
    transitions: {
      type: 'array',
      maxItems: 256,
      items: {
        type: 'object',
        required: ['from', 'to'],
        properties: {
          from: STATE_REF,
          to: STATE_REF,
          at: { type: 'string', enum: QUANTIZE },
          via: { type: 'string', enum: ['bridge', 'none'] },
          bars: { type: 'number', integer: true, min: 1, max: 4 },
          fadeSec: NUM(0, 30),
          fadeInSec: NUM(0, 30),
          stinger: NAME,
        },
      },
    },
    stingers: MAP(
      {
        type: 'object',
        required: ['kind'],
        properties: { kind: { type: 'string', enum: STINGER_KINDS }, style: { type: 'string', enum: Object.keys(STYLES) }, gainDb: NUM(-40, 12), duckDb: NUM(0, 40) },
      },
      16,
    ),
    hysteresis: { type: 'object', properties: { minStateSeconds: NUM(0, 600) } },
  },
  check: (/** @type {AdaptiveDescription} */ d, path) => {
    /** @type {import('../core/validate.js').Issue[]} */
    const issues = [];
    const states = Object.keys(d.states);
    if (!states.includes(d.initial)) issues.push({ path: `${path}.initial`, message: 'unknown state' });
    for (const [name, st] of Object.entries(d.states)) {
      if (st.then !== undefined && !states.includes(st.then)) issues.push({ path: `${path}.states.${name}.then`, message: 'unknown state' });
      if (st.loop !== false && st.then !== undefined) issues.push({ path: `${path}.states.${name}.then`, message: 'only for one-shot states (loop: false)' });
    }
    (d.transitions ?? []).forEach((t, i) => {
      for (const k of /** @type {const} */ (['from', 'to'])) {
        if (t[k] !== '*' && !states.includes(t[k])) issues.push({ path: `${path}.transitions[${i}].${k}`, message: 'unknown state' });
      }
      if (t.stinger !== undefined && !Object.hasOwn(d.stingers ?? {}, t.stinger)) issues.push({ path: `${path}.transitions[${i}].stinger`, message: 'unknown stinger' });
      if (t.via === 'bridge' && (t.from === '*' || t.to === '*')) issues.push({ path: `${path}.transitions[${i}].via`, message: 'bridges need concrete states' });
    });
    for (const [name, layer] of Object.entries(d.layers ?? {})) {
      if (layer.param !== undefined && layer.from === undefined) issues.push({ path: `${path}.layers.${name}.from`, message: 'is required with param' });
    }
    return issues;
  },
};

/** @param {unknown} description */
export const validateAdaptive = (description) => validate(description, ADAPTIVE_SCHEMA);

/**
 * @param {unknown} description
 * @returns {asserts description is AdaptiveDescription}
 */
export function assertValidAdaptive(description) {
  assertValid(description, ADAPTIVE_SCHEMA, 'adaptive description');
}

/**
 * Builds a valid description from a few fields.
 * @param {Omit<AdaptiveDescription, 'format' | 'version' | 'engine'> & { engine?: string }} parts
 * @returns {AdaptiveDescription}
 */
export function createAdaptive(parts) {
  /** @type {AdaptiveDescription} */
  const d = { format: ADAPTIVE_FORMAT, version: ADAPTIVE_VERSION, engine: VERSION, ...parts };
  assertValidAdaptive(d);
  return d;
}

/**
 * Layer of a track role under a layer set (first layer as fallback).
 * @param {Record<string, AdaptiveLayer>} layers
 * @param {string} role
 */
export function layerOfRole(layers, role) {
  const names = Object.keys(layers);
  return names.find((n) => layers[n].roles.includes(role)) ?? names[0];
}
