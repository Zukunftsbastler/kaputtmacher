// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Accompaniment figures from voiced harmony:
 *  - arpeggios (up, down, up-down, converge, random, pulse on root/fifth), at any rate
 *  - chord comping (sustain, stabs, off-beat skank, pompe chops on 2 and 4,
 *    broken chords, eighth-note pulse, swells)
 */

import { barLengthBeats } from '../core/meter-map.js';
import { swingTime } from './melody/melody.js';

/** @typedef {'up' | 'down' | 'updown' | 'converge' | 'random' | 'pulse'} ArpPattern */
/** @typedef {'sustain' | 'stabs' | 'offbeat' | 'pompe' | 'broken' | 'pulse8' | 'swell' | 'stride'} CompPattern */

/**
 * @param {import('./harmony/chord-utils.js').HarmonyEvent[]} harmony
 * @param {number[][]} voicings bass-first tuples (the bass is ignored)
 * @param {{ rng: import('../core/prng.js').Rng, pattern?: ArpPattern, rate?: number, octaves?: number, gate?: number,
 *           velocity?: number, swing?: number, transpose?: number }} options
 *   rate: note length in beats (0.25 = sixteenths); transpose in semitones
 * @returns {import('../core/score.js').NoteEvent[]}
 */
export function generateArpeggio(harmony, voicings, options) {
  const { rng } = options;
  const pattern = options.pattern ?? 'up';
  const rate = options.rate ?? 0.25;
  const octaves = options.octaves ?? 1;
  const gate = options.gate ?? 0.8;
  const vel = options.velocity ?? 0.65;
  const transpose = options.transpose ?? 0;
  const swing = options.swing ?? 0;
  /** @type {import('../core/score.js').NoteEvent[]} */
  const out = [];
  harmony.forEach((e, i) => {
    const upper = voicings[i].slice(1).map((p) => p + transpose);
    let pool = [];
    for (let o = 0; o < octaves; o++) for (const p of upper) pool.push(p + 12 * o);
    pool = [...new Set(pool)].sort((a, b) => a - b);
    /** @type {number[]} */
    let seq;
    switch (pattern) {
      case 'down':
        seq = pool.slice().reverse();
        break;
      case 'updown':
        seq = [...pool, ...pool.slice(1, -1).reverse()];
        break;
      case 'converge': {
        seq = [];
        for (let a = 0, b = pool.length - 1; a <= b; a++, b--) seq.push(pool[a], ...(a !== b ? [pool[b]] : []));
        break;
      }
      case 'pulse':
        seq = [pool[0], pool[0], pool[Math.min(2, pool.length - 1)], pool[0]];
        break;
      default:
        seq = pool;
    }
    for (let t = e.beat, k = 0; t < e.beat + e.dur - 1e-9; t += rate, k++) {
      const p = pattern === 'random' ? rng.pick(pool) : seq[k % seq.length];
      const t0 = swingTime(t, swing);
      const t1 = swingTime(t + rate * gate, swing);
      out.push({ t: t0, d: Math.max(0.05, t1 - t0), p, v: Math.min(1, vel + (k % 4 === 0 ? 0.1 : 0) + rng.normal(0, 0.03)) });
    }
  });
  return out;
}

/**
 * @param {import('./harmony/chord-utils.js').HarmonyEvent[]} harmony
 * @param {number[][]} voicings bass-first tuples (the bass is ignored)
 * @param {{ rng: import('../core/prng.js').Rng, pattern?: CompPattern, meter?: { num: number, den: number }, velocity?: number, swing?: number }} options
 * @returns {import('../core/score.js').NoteEvent[]}
 */
export function compChords(harmony, voicings, options) {
  const { rng } = options;
  const pattern = options.pattern ?? 'sustain';
  const meter = options.meter ?? { num: 4, den: 4 };
  const barLen = barLengthBeats(meter.num, meter.den);
  const vel = options.velocity ?? 0.6;
  const swing = options.swing ?? 0;
  /** @type {import('../core/score.js').NoteEvent[]} */
  const out = [];
  /**
   * @param {number[]} chord
   * @param {number} t
   * @param {number} d
   * @param {number} v
   */
  const hit = (chord, t, d, v) => {
    const t0 = swingTime(t, swing);
    const t1 = swingTime(t + d, swing);
    chord.forEach((p, k) => out.push({ t: t0 + k * 0.004, d: Math.max(0.05, t1 - t0), p, v: Math.min(1, v - 0.02 * k + rng.normal(0, 0.025)) }));
  };
  harmony.forEach((e, i) => {
    const chord = voicings[i].slice(1);
    const end = e.beat + e.dur;
    switch (pattern) {
      case 'stabs':
        for (let t = e.beat; t < end - 1e-9; t += barLen / 2) hit(chord, t, 0.35, vel + (t === e.beat ? 0.08 : 0));
        break;
      case 'offbeat':
        for (let t = e.beat + 0.5; t < end - 1e-9; t += 1) hit(chord, t, 0.3, vel);
        break;
      case 'pompe':
        // Gypsy-jazz rhythm guitar: short, dry chops on beats 2 and 4.
        for (let t = Math.ceil(e.beat); t < end - 1e-9; t += 1) if (Math.round(t) % 2 === 1) hit(chord, t, 0.18, vel + 0.1);
        break;
      case 'broken':
        for (let t = e.beat, k = 0; t < end - 1e-9; t += 0.5, k++) {
          const p = k % 2 === 0 ? [chord[0]] : chord.slice(1);
          hit(p, t, 0.9, vel - (k % 2 ? 0.08 : 0));
        }
        break;
      case 'pulse8':
        for (let t = e.beat, k = 0; t < end - 1e-9; t += 0.5, k++) hit(chord, t, 0.4, vel - (k % 2 ? 0.1 : 0));
        break;
      case 'swell':
        hit(chord, e.beat, e.dur * 0.98, vel * 0.8);
        break;
      case 'stride': {
        // Stride piano: left-hand bass on beats 1 and 3 (root, then fifth an octave below
        // the chord), chord in the middle register on 2 and 4.
        const root = voicings[i][0];
        let low = root;
        while (low > 43) low -= 12;
        while (low < 31) low += 12;
        for (let t = Math.ceil(e.beat - 1e-9); t < end - 1e-9; t += 1) {
          const beat = Math.round(t) % 4;
          if (beat % 2 === 0) hit([beat === 0 ? low : low + 7 > 45 ? low - 5 : low + 7], t, 0.85, vel + 0.12);
          else hit(chord, t, 0.42, vel - 0.04);
        }
        break;
      }
      default:
        hit(chord, e.beat, e.dur * 0.98, vel);
    }
  });
  return out;
}

/**
 * Swing-band riff cells: [beat in the bar, duration, accent]. "Call" bars and lighter
 * "response" bars alternate (call and response between sections of the band).
 */
const RIFF_CALLS = [
  [[1.5, 0.4, 1], [3, 0.3, 0.9]],
  [[0, 0.3, 1], [0.5, 0.3, 0.8], [2.5, 1.2, 1]],
  [[0.5, 0.3, 0.9], [1.5, 0.3, 0.9], [2.5, 0.3, 0.9], [3.5, 0.5, 1]],
  [[0, 0.6, 1], [1.5, 0.4, 0.95]],
  [[0, 1.4, 1], [2.5, 0.3, 0.85], [3.5, 0.4, 1]],
];
const RIFF_RESPONSES = [[[3.5, 0.4, 0.9]], [[2.5, 0.3, 0.8], [3, 0.3, 0.85]], [], [[1.5, 0.3, 0.8]]];

/**
 * Brass section riffs (stabs, punches, call and response) over a harmony: block
 * chords from the voicing (smooth voice leading comes from the voicing), swung,
 * one riff per two bars, repeated with variation.
 * @param {import('./harmony/chord-utils.js').HarmonyEvent[]} harmony
 * @param {number[][]} voicings bass-first tuples (the bass is ignored)
 * @param {{ rng: import('../core/prng.js').Rng, swing?: number, meter?: { num: number, den: number }, velocity?: number, density?: number, center?: number }} options
 * @returns {import('../core/score.js').NoteEvent[]}
 */
export function generateRiffs(harmony, voicings, options) {
  const { rng } = options;
  const swing = options.swing ?? 0;
  const meter = options.meter ?? { num: 4, den: 4 };
  const barLen = barLengthBeats(meter.num, meter.den);
  const vel = options.velocity ?? 0.75;
  const density = options.density ?? 0.6;
  const center = options.center ?? 67;
  if (harmony.length === 0) return [];
  const end = harmony[harmony.length - 1].beat + harmony[harmony.length - 1].dur;
  /** @type {import('../core/score.js').NoteEvent[]} */
  const out = [];
  let call = RIFF_CALLS[Math.floor(rng.float() * RIFF_CALLS.length)];
  for (let bar = 0, start = 0; start < end - 1e-9; bar++, start += barLen) {
    if (bar % 4 === 0 && rng.float() < 0.5) call = RIFF_CALLS[Math.floor(rng.float() * RIFF_CALLS.length)];
    const cells = bar % 2 === 0 ? call : rng.float() < density ? RIFF_RESPONSES[Math.floor(rng.float() * RIFF_RESPONSES.length)] : [];
    for (const [beat, dur, accent] of cells) {
      if (beat >= barLen) continue;
      const t = start + beat;
      const i = harmony.findIndex((e) => t >= e.beat - 1e-9 && t < e.beat + e.dur - 1e-9);
      if (i < 0) continue;
      // The upper structure (top four voices) moved into the section's register around
      // `center`; stray notes folded back by octaves.
      let chord = voicings[i].slice(1).slice(-4);
      const mid = chord.reduce((a, b) => a + b, 0) / chord.length;
      const shift = Math.round((center - mid) / 12) * 12;
      chord = chord.map((p) => {
        let q = p + shift;
        while (q > center + 14) q -= 12;
        while (q < center - 14) q += 12;
        return q;
      });
      chord = [...new Set(chord)].sort((a, b) => a - b);
      const t0 = swingTime(t, swing);
      const t1 = swingTime(t + dur, swing);
      chord.forEach((p, k) => out.push({ t: t0 + k * 0.003, d: Math.max(0.08, t1 - t0), p, v: Math.min(1, vel * accent - 0.02 * k + rng.normal(0, 0.02)) }));
    }
  }
  return out;
}
