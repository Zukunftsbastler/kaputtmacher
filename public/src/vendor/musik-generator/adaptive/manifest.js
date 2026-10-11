// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Stem manifest "mg-stems" v1: describes pre-rendered adaptive music (states,
 * segments with bar grids, layers with parameter mappings, transitions,
 * stingers, hysteresis). Manifests are loaded from URLs at runtime, so they are
 * validated strictly; file names must be plain names (no paths), resolved
 * relative to the manifest. Depends only on core/ (used by the stem player).
 */

import { validate, assertValid } from '../core/validate.js';

export const STEMS_FORMAT = 'mg-stems';
export const STEMS_VERSION = 1;

/** Quantization points for state changes and stingers. */
export const QUANTIZE = Object.freeze(['immediate', 'nextBeat', 'nextBar', 'nextPhrase', 'segmentEnd']);

/**
 * @typedef {'immediate' | 'nextBeat' | 'nextBar' | 'nextPhrase' | 'segmentEnd'} Quantize
 *
 * @typedef {object} LayerSpec
 * @property {string} [param] parameter that controls the layer (e.g. "intensity"); none = always on
 * @property {number} [from] parameter value where the layer starts to fade in
 * @property {number} [to] parameter value where it is fully in (default from + 0.2)
 * @property {'fade' | 'switch'} [mode] continuous fade over [from, to] or on/off with hysteresis
 * @property {number} [hysteresis] switch mode: off only below from − hysteresis (default 0.05)
 * @property {number} [fadeSec] switch mode: fade time (default 1)
 *
 * @typedef {object} StemFile
 * @property {string} body file played for the segment's length
 * @property {string} [tail] decay after the segment end (played over the following music)
 *
 * @typedef {object} Segment
 * @property {number} bpm tempo at the start (informative)
 * @property {[number, number]} meter
 * @property {number} bars
 * @property {number[]} barStarts start time of every bar in seconds from the segment start
 * @property {number} beatsPerBar beats (pulses) per bar for nextBeat quantization
 * @property {number} [phraseBars] bars per phrase (default 4)
 * @property {number} durationSec body length
 * @property {number} tailSec tail length (0 = none)
 * @property {string} key e.g. "D dorian"
 * @property {Record<string, StemFile>} files per layer ("all" for bridges)
 *
 * @typedef {object} StateSpec
 * @property {string[]} segments
 * @property {'sequence' | 'shuffle'} [order]
 * @property {boolean} [loop] default true; false = play once, then go to `then`
 * @property {string} [then] state after a one-shot state
 * @property {number} [gainDb]
 *
 * @typedef {object} Transition
 * @property {string} from state or "*"
 * @property {string} to state or "*"
 * @property {Quantize} [at] default "nextBar"
 * @property {string} [via] bridge segment played between the states
 * @property {number} [fadeSec] fade-out of the old music (default 1; 0 at segmentEnd = tail only)
 * @property {number} [fadeInSec] fade-in of the new music (default 0)
 * @property {string} [stinger] stinger played at the change
 *
 * @typedef {object} Stinger
 * @property {number} durationSec
 * @property {Record<string, string>} byKey file per key name; "*" = any key
 * @property {number} [gainDb]
 * @property {number} [duckDb] music ducking while the stinger plays (default 0)
 *
 * @typedef {object} StemManifest
 * @property {'mg-stems'} format
 * @property {1} version
 * @property {string} engine
 * @property {string} [title]
 * @property {number} sampleRate
 * @property {number} channels
 * @property {string} initial
 * @property {Record<string, { default?: number, smoothingSec?: number }>} [params]
 * @property {Record<string, LayerSpec>} layers
 * @property {Record<string, StateSpec>} states
 * @property {Record<string, Segment>} segments
 * @property {Transition[]} [transitions]
 * @property {Record<string, Stinger>} [stingers]
 * @property {{ minStateSeconds?: number }} [hysteresis]
 * @property {{ totalBytes: number, mobilePeakBytes: number }} [ram] decoded size estimates
 * @property {Record<string, number>} [loudness] integrated LUFS per state (all layers on)
 */

const NAME = { type: /** @type {const} */ ('string'), pattern: /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,63}$/ };
const FILE = { type: /** @type {const} */ ('string'), pattern: /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,119}$/ };
const NUM = (/** @type {number} */ min, /** @type {number} */ max) => ({ type: /** @type {const} */ ('number'), min, max });
/** @param {import('../core/validate.js').Schema} schema */
const MAP = (schema, max = 256) => ({
  type: /** @type {const} */ ('object'),
  additional: schema,
  check: (/** @type {Record<string, unknown>} */ v, /** @type {string} */ path) => {
    const keys = Object.keys(v);
    /** @type {import('../core/validate.js').Issue[]} */
    const issues = [];
    if (keys.length > max) issues.push({ path, message: `must have <= ${max} entries` });
    for (const k of keys) if (!NAME.pattern.test(k)) issues.push({ path: `${path}.${k}`, message: 'invalid name' });
    return issues;
  },
});

/** @type {import('../core/validate.js').Schema} */
export const MANIFEST_SCHEMA = {
  type: 'object',
  required: ['format', 'version', 'engine', 'sampleRate', 'channels', 'initial', 'layers', 'states', 'segments'],
  properties: {
    format: { type: 'string', enum: [STEMS_FORMAT] },
    version: { type: 'number', integer: true, min: STEMS_VERSION, max: STEMS_VERSION },
    engine: { type: 'string', pattern: /^\d+\.\d+\.\d+/, maxLength: 40 },
    title: { type: 'string', maxLength: 200 },
    sampleRate: { type: 'number', integer: true, min: 8000, max: 192000 },
    channels: { type: 'number', integer: true, min: 1, max: 2 },
    initial: NAME,
    params: MAP({ type: 'object', properties: { default: NUM(0, 1), smoothingSec: NUM(0, 60) } }, 16),
    layers: MAP(
      {
        type: 'object',
        properties: {
          param: NAME,
          from: NUM(0, 1),
          to: NUM(0, 1),
          mode: { type: 'string', enum: ['fade', 'switch'] },
          hysteresis: NUM(0, 0.5),
          fadeSec: NUM(0, 30),
        },
      },
      16,
    ),
    states: MAP(
      {
        type: 'object',
        required: ['segments'],
        properties: {
          segments: { type: 'array', items: NAME, minItems: 1, maxItems: 64 },
          order: { type: 'string', enum: ['sequence', 'shuffle'] },
          loop: { type: 'boolean' },
          then: NAME,
          gainDb: NUM(-60, 12),
        },
      },
      64,
    ),
    segments: MAP(
      {
        type: 'object',
        required: ['bpm', 'meter', 'bars', 'barStarts', 'beatsPerBar', 'durationSec', 'tailSec', 'key', 'files'],
        properties: {
          bpm: NUM(20, 400),
          meter: { type: 'array', items: { type: 'number', integer: true, min: 1, max: 32 }, minItems: 2, maxItems: 2 },
          bars: { type: 'number', integer: true, min: 1, max: 256 },
          barStarts: { type: 'array', items: NUM(0, 3600), minItems: 1, maxItems: 256 },
          beatsPerBar: { type: 'number', integer: true, min: 1, max: 32 },
          phraseBars: { type: 'number', integer: true, min: 1, max: 64 },
          durationSec: NUM(0.05, 3600),
          tailSec: NUM(0, 60),
          key: { type: 'string', maxLength: 40 },
          files: MAP({ type: 'object', required: ['body'], properties: { body: FILE, tail: FILE } }, 16),
        },
      },
      1024,
    ),
    transitions: {
      type: 'array',
      maxItems: 1024,
      items: {
        type: 'object',
        required: ['from', 'to'],
        properties: {
          from: { type: 'string', pattern: /^(\*|[A-Za-z0-9_-][A-Za-z0-9._-]{0,63})$/ },
          to: { type: 'string', pattern: /^(\*|[A-Za-z0-9_-][A-Za-z0-9._-]{0,63})$/ },
          at: { type: 'string', enum: QUANTIZE },
          via: NAME,
          fadeSec: NUM(0, 30),
          fadeInSec: NUM(0, 30),
          stinger: NAME,
        },
      },
    },
    stingers: MAP(
      {
        type: 'object',
        required: ['durationSec', 'byKey'],
        properties: {
          durationSec: NUM(0.01, 120),
          byKey: { type: 'object', additional: FILE },
          gainDb: NUM(-60, 12),
          duckDb: NUM(0, 60),
        },
      },
      64,
    ),
    hysteresis: { type: 'object', properties: { minStateSeconds: NUM(0, 600) } },
    ram: { type: 'object', properties: { totalBytes: NUM(0, 1e12), mobilePeakBytes: NUM(0, 1e12) } },
    loudness: { type: 'object', additional: { type: 'number' } },
  },
  check: (/** @type {StemManifest} */ m, path) => crossCheck(m, path),
};

/**
 * Reference checks across the manifest (names that must exist, consistent bar grids).
 * @param {StemManifest} m
 * @param {string} path
 */
function crossCheck(m, path) {
  /** @type {import('../core/validate.js').Issue[]} */
  const issues = [];
  const has = (/** @type {object} */ obj, /** @type {string} */ k) => Object.hasOwn(obj, k);
  if (!has(m.states, m.initial)) issues.push({ path: `${path}.initial`, message: 'unknown state' });
  for (const [name, st] of Object.entries(m.states)) {
    st.segments.forEach((s, i) => {
      if (!has(m.segments, s)) issues.push({ path: `${path}.states.${name}.segments[${i}]`, message: 'unknown segment' });
    });
    if (st.then !== undefined && !has(m.states, st.then)) issues.push({ path: `${path}.states.${name}.then`, message: 'unknown state' });
  }
  for (const [name, seg] of Object.entries(m.segments)) {
    const p = `${path}.segments.${name}`;
    if (seg.barStarts.length !== seg.bars) issues.push({ path: `${p}.barStarts`, message: 'must have one entry per bar' });
    if (seg.barStarts[0] !== 0) issues.push({ path: `${p}.barStarts[0]`, message: 'must be 0' });
    for (let i = 1; i < seg.barStarts.length; i++) {
      if (!(seg.barStarts[i] > seg.barStarts[i - 1])) issues.push({ path: `${p}.barStarts[${i}]`, message: 'must increase' });
    }
    if (seg.barStarts.at(-1) >= seg.durationSec) issues.push({ path: `${p}.durationSec`, message: 'must be after the last bar start' });
    for (const layer of Object.keys(seg.files)) {
      if (layer !== 'all' && !has(m.layers, layer)) issues.push({ path: `${p}.files.${layer}`, message: 'unknown layer' });
    }
  }
  (m.transitions ?? []).forEach((t, i) => {
    const p = `${path}.transitions[${i}]`;
    if (t.from !== '*' && !has(m.states, t.from)) issues.push({ path: `${p}.from`, message: 'unknown state' });
    if (t.to !== '*' && !has(m.states, t.to)) issues.push({ path: `${p}.to`, message: 'unknown state' });
    if (t.via !== undefined && !has(m.segments, t.via)) issues.push({ path: `${p}.via`, message: 'unknown segment' });
    if (t.stinger !== undefined && !has(m.stingers ?? {}, t.stinger)) issues.push({ path: `${p}.stinger`, message: 'unknown stinger' });
  });
  for (const [name, layer] of Object.entries(m.layers)) {
    if (layer.param !== undefined && layer.from === undefined) issues.push({ path: `${path}.layers.${name}.from`, message: 'is required with param' });
  }
  return issues;
}

/** @param {unknown} manifest */
export const validateManifest = (manifest) => validate(manifest, MANIFEST_SCHEMA);

/**
 * @param {unknown} manifest
 * @returns {asserts manifest is StemManifest}
 */
export function assertValidManifest(manifest) {
  assertValid(manifest, MANIFEST_SCHEMA, 'stem manifest');
}

/**
 * All file names a set of segments and stingers needs.
 * @param {StemManifest} m
 * @param {{ segments?: Iterable<string>, stingers?: Iterable<string> }} which
 * @returns {string[]}
 */
export function filesOf(m, { segments = [], stingers = [] }) {
  /** @type {Set<string>} */
  const out = new Set();
  for (const s of segments) {
    for (const f of Object.values(m.segments[s]?.files ?? {})) {
      out.add(f.body);
      if (f.tail) out.add(f.tail);
    }
  }
  for (const s of stingers) for (const f of Object.values(m.stingers?.[s]?.byKey ?? {})) out.add(f);
  return [...out];
}

/**
 * States reachable from a state in one step: targets of matching transition rules and the
 * follow-up of a one-shot. (Any state can still be requested; others load on demand.)
 * @param {StemManifest} m
 * @param {string} s
 * @returns {string[]}
 */
export function neighbours(m, s) {
  const out = new Set(m.states[s].then !== undefined ? [/** @type {string} */ (m.states[s].then)] : []);
  for (const t of m.transitions ?? []) {
    if (t.from !== s && t.from !== '*') continue;
    if (t.to === '*') Object.keys(m.states).forEach((x) => out.add(x));
    else out.add(t.to);
  }
  out.delete(s);
  return [...out];
}

/**
 * Files to keep loaded around a state on memory-constrained devices: the state, its
 * neighbours, bridges leaving it and all stingers.
 * @param {StemManifest} m
 * @param {string} s
 */
export function residentFiles(m, s) {
  const states = [s, ...neighbours(m, s)];
  const segments = states.flatMap((x) => m.states[x].segments);
  for (const t of m.transitions ?? []) if (t.via && (t.from === s || t.from === '*')) segments.push(t.via);
  return filesOf(m, { segments, stingers: Object.keys(m.stingers ?? {}) });
}
