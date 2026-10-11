// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * The language-neutral score format "mg-score" (version 1): the contract
 * between composition and synthesis. Time is in beats (quarter notes).
 * See docs/IMPLEMENTATION_PLAN.md, section "Datenformate".
 */

import { validate, assertValid } from './validate.js';

export const SCORE_FORMAT = 'mg-score';
export const SCORE_VERSION = 1;

/**
 * @typedef {object} NoteEvent
 * @property {number} t start in beats, >= 0
 * @property {number} d duration in beats, > 0
 * @property {number} p pitch as MIDI number (fractional = microtonal)
 * @property {number} v velocity 0…1
 * @property {string} [art] articulation, e.g. "legato", "staccato", "accent"
 */

/**
 * @typedef {object} Track
 * @property {string} id unique within the score
 * @property {string} [role] e.g. "bass", "pad", "melody", "drums"
 * @property {string} [instrument] instrument preset id
 * @property {number} [midiProgram] General MIDI program 0…127 (export only)
 * @property {number} [channel] MIDI channel 0…15 (export only)
 * @property {NoteEvent[]} events
 */

/**
 * @typedef {object} Score
 * @property {'mg-score'} format
 * @property {1} version
 * @property {Record<string, unknown> & { engine: string, title?: string, seed?: number | string, style?: string }} meta
 * @property {import('./tempo-map.js').TempoPoint[]} tempoMap
 * @property {import('./meter-map.js').MeterPoint[]} [meterMap]
 * @property {{ beat: number, tonic: string, mode: string }[]} [keyMap]
 * @property {({ beat: number, name: string } & Record<string, unknown>)[]} [sections]
 * @property {Track[]} tracks
 */

/** Generous upper bounds that keep untrusted input from exhausting memory. */
const MAX_TRACKS = 256;
const MAX_EVENTS_PER_TRACK = 200_000;
const MAX_MAP_POINTS = 10_000;

/** @type {import('./validate.js').Schema} */
const beatSchema = { type: 'number', min: 0 };

/**
 * @param {string} label
 * @returns {(points: { beat: number }[], path: string) => import('./validate.js').Issue[]}
 */
const sortedFromZero = (label) => (points, path) => {
  /** @type {import('./validate.js').Issue[]} */
  const issues = [];
  if (points.length > 0 && points[0].beat !== 0) issues.push({ path: `${path}[0].beat`, message: `${label} must start at beat 0` });
  for (let i = 1; i < points.length; i++) {
    if (!(points[i].beat > points[i - 1].beat)) {
      issues.push({ path: `${path}[${i}].beat`, message: `${label} beats must be strictly increasing` });
    }
  }
  return issues;
};

/** @type {import('./validate.js').Schema} */
export const SCORE_SCHEMA = {
  type: 'object',
  required: ['format', 'version', 'meta', 'tempoMap', 'tracks'],
  properties: {
    format: { type: 'string', enum: [SCORE_FORMAT] },
    version: { type: 'number', integer: true, min: SCORE_VERSION, max: SCORE_VERSION },
    meta: {
      type: 'object',
      required: ['engine'],
      properties: {
        engine: { type: 'string', pattern: /^\d+\.\d+\.\d+/ },
        title: { type: 'string', maxLength: 500 },
        seed: { type: 'any' },
        style: { type: 'string', maxLength: 200 },
      },
      additional: true,
    },
    tempoMap: {
      type: 'array',
      minItems: 1,
      maxItems: MAX_MAP_POINTS,
      items: {
        type: 'object',
        required: ['beat', 'bpm'],
        properties: {
          beat: beatSchema,
          bpm: { type: 'number', min: 1, max: 1000 },
          ramp: { type: 'string', enum: ['step', 'linear'] },
        },
      },
      check: sortedFromZero('tempoMap'),
    },
    meterMap: {
      type: 'array',
      minItems: 1,
      maxItems: MAX_MAP_POINTS,
      items: {
        type: 'object',
        required: ['beat', 'num', 'den'],
        properties: {
          beat: beatSchema,
          num: { type: 'number', integer: true, min: 1, max: 64 },
          den: { type: 'number', integer: true, min: 1, max: 64, check: (v, path) => ((v & (v - 1)) === 0 ? [] : [{ path, message: 'must be a power of two' }]) },
        },
      },
      check: sortedFromZero('meterMap'),
    },
    keyMap: {
      type: 'array',
      minItems: 1,
      maxItems: MAX_MAP_POINTS,
      items: {
        type: 'object',
        required: ['beat', 'tonic', 'mode'],
        properties: {
          beat: beatSchema,
          tonic: { type: 'string', pattern: /^[A-Ga-g](#{1,2}|b{1,2}|x)?$/ },
          mode: { type: 'string', pattern: /^[A-Za-z][A-Za-z0-9]*$/, maxLength: 64 },
        },
      },
      check: sortedFromZero('keyMap'),
    },
    sections: {
      type: 'array',
      maxItems: MAX_MAP_POINTS,
      items: {
        type: 'object',
        required: ['beat', 'name'],
        properties: { beat: beatSchema, name: { type: 'string', minLength: 1, maxLength: 200 } },
        additional: true,
      },
    },
    tracks: {
      type: 'array',
      maxItems: MAX_TRACKS,
      items: {
        type: 'object',
        required: ['id', 'events'],
        properties: {
          id: { type: 'string', minLength: 1, maxLength: 200 },
          role: { type: 'string', maxLength: 64 },
          instrument: { type: 'string', maxLength: 200 },
          midiProgram: { type: 'number', integer: true, min: 0, max: 127 },
          channel: { type: 'number', integer: true, min: 0, max: 15 },
          events: {
            type: 'array',
            maxItems: MAX_EVENTS_PER_TRACK,
            items: {
              type: 'object',
              required: ['t', 'd', 'p', 'v'],
              properties: {
                t: beatSchema,
                d: { type: 'number', exclusiveMin: 0 },
                p: { type: 'number', min: 0, max: 127 },
                v: { type: 'number', min: 0, max: 1 },
                art: { type: 'string', maxLength: 64 },
              },
            },
          },
        },
      },
      check: (tracks, path) => {
        /** @type {import('./validate.js').Issue[]} */
        const issues = [];
        const seen = new Set();
        tracks.forEach((/** @type {Track} */ track, /** @type {number} */ i) => {
          if (seen.has(track.id)) issues.push({ path: `${path}[${i}].id`, message: `duplicate track id "${track.id}"` });
          seen.add(track.id);
        });
        return issues;
      },
    },
  },
};

/**
 * @param {unknown} score
 * @returns {import('./validate.js').Issue[]} empty when valid
 */
export function validateScore(score) {
  return validate(score, SCORE_SCHEMA);
}

/**
 * @param {unknown} score
 * @returns {asserts score is Score}
 */
export function assertValidScore(score) {
  assertValid(score, SCORE_SCHEMA, 'score');
}

/**
 * Creates a score with format/version filled in and validates it.
 * @param {Omit<Score, 'format' | 'version'>} parts
 * @returns {Score}
 */
export function createScore(parts) {
  /** @type {Score} */
  const score = { format: SCORE_FORMAT, version: SCORE_VERSION, ...parts };
  assertValidScore(score);
  return score;
}

/**
 * @param {Score} score
 * @returns {number} end of the last note in beats
 */
export function scoreLengthBeats(score) {
  let end = 0;
  for (const track of score.tracks) for (const e of track.events) end = Math.max(end, e.t + e.d);
  return end;
}
