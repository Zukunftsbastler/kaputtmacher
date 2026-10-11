// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Drum grooves: probabilistic step patterns per drum part, chosen by
 * intensity, with syncopation control, fills at phrase ends, crashes on
 * section starts, swing and humanized micro-timing ("feel": each part can be
 * pushed or laid back by a few milliseconds).
 *
 * Pattern characters (one per grid step):
 *   x hit · X accent · o ghost note · ? optional hit (probability rises with
 *   syncopation) · . rest. "E(k,n,r)" expands to a Euclidean rhythm.
 * Medium syncopation maximizes the urge to move (Ref: Witek et al., PLOS ONE
 * 9(4), 2014), so "?" cells are filled most densely around syncopation 0.5–0.7.
 */

import { expandPattern } from './euclid.js';
import { barLengthBeats } from '../../core/meter-map.js';
import { swingTime } from '../melody/melody.js';

/**
 * @typedef {object} GrooveLayer
 * @property {string} part name (for documentation and variation)
 * @property {number} note MIDI note in the kit
 * @property {[number, number]} [intensity] active range (default [0, 1])
 * @property {string[]} patterns one or more alternatives (chosen per section)
 * @property {number} [velocity] base velocity (default 0.85)
 * @property {number} [pushMs] timing offset: negative = ahead, positive = laid back
 */

/**
 * @typedef {object} Groove
 * @property {number} [grid] steps per bar (default 16)
 * @property {number} [swing] delay of the off-beat eighth in beats (0…0.25), the same swing as melodies and bass
 * @property {{ timingMs?: number, velocity?: number }} [humanize]
 * @property {GrooveLayer[]} layers
 * @property {{ note: number, pattern: string, velocity?: number }[][]} [fills] alternatives; each a set of parts for the last half bar
 * @property {number} [fillEvery] bars between fills (default 4); the last bar of a section always gets one
 * @property {{ note: number, velocity?: number }} [crash] hit on every section start
 */

/**
 * @typedef {object} GrooveOptions
 * @property {Groove} groove
 * @property {import('../../core/prng.js').Rng} rng
 * @property {number} startBeat
 * @property {number} bars
 * @property {number} intensity 0…1
 * @property {number} [syncopation] 0…1 (default 0.5)
 * @property {number} [bpm] for millisecond timing offsets (default 120)
 * @property {{ num: number, den: number }} [meter]
 * @property {boolean} [crash] crash on the first beat (default true)
 * @property {boolean} [fillAtEnd] fill in the last bar (default true)
 */

/**
 * @param {GrooveOptions} o
 * @returns {import('../../core/score.js').NoteEvent[]}
 */
export function generateGroove(o) {
  const g = o.groove;
  const grid = g.grid ?? 16;
  const meter = o.meter ?? { num: 4, den: 4 };
  const barLen = barLengthBeats(meter.num, meter.den);
  const step = barLen / grid;
  const swing = g.swing ?? 0;
  const bpm = o.bpm ?? 120;
  const msToBeats = (/** @type {number} */ ms) => (ms / 1000) * (bpm / 60);
  const timing = g.humanize?.timingMs ?? 6;
  const velVar = g.humanize?.velocity ?? 0.06;
  const sync = o.syncopation ?? 0.5;
  // Optional cells: filled most at medium-to-high syncopation (inverted-U preference).
  const maybe = 0.15 + 0.7 * Math.max(0, 1 - Math.abs(sync - 0.65) / 0.65);
  const rng = o.rng;
  /** @type {import('../../core/score.js').NoteEvent[]} */
  const out = [];

  const active = g.layers.filter((l) => o.intensity >= (l.intensity?.[0] ?? 0) - 1e-9 && o.intensity <= (l.intensity?.[1] ?? 1) + 1e-9);
  // Pattern per layer for this section; occasional variation every 4 bars.
  const chosen = active.map((l) => ({ layer: l, pattern: expandPattern(rng.pick(l.patterns)) }));
  const fillEvery = g.fillEvery ?? 4;

  for (let bar = 0; bar < o.bars; bar++) {
    const barStart = o.startBeat + bar * barLen;
    const isFillBar = g.fills && g.fills.length > 0 && ((bar + 1) % fillEvery === 0 || (bar === o.bars - 1 && o.fillAtEnd !== false));
    const fill = isFillBar && g.fills ? rng.pick(g.fills).map((f) => ({ ...f, pattern: expandPattern(f.pattern) })) : null;
    const fillFrom = grid / 2;
    if (bar > 0 && bar % 4 === 0 && rng.chance(0.25)) {
      for (const c of chosen) c.pattern = expandPattern(rng.pick(c.layer.patterns));
    }
    for (const { layer, pattern } of chosen) {
      for (let s = 0; s < grid; s++) {
        // During a fill, the kit's regular snare/tom layers make room.
        if (fill && s >= fillFrom && fill.some((f) => f.note === layer.note || layer.part === 'snare' || layer.part.startsWith('tom'))) continue;
        const c = pattern[s % pattern.length];
        if (!emit(c)) continue;
        push(barStart, s, layer.note, c, layer.velocity ?? 0.85, layer.pushMs ?? 0);
      }
    }
    if (fill) {
      for (const f of fill) {
        for (let s = fillFrom; s < grid; s++) {
          const c = f.pattern[(s - fillFrom) % f.pattern.length];
          if (emit(c)) push(barStart, s, f.note, c, (f.velocity ?? 0.85) * (0.8 + (0.25 * (s - fillFrom)) / (grid - fillFrom)), 0);
        }
      }
    }
  }
  if (g.crash && o.crash !== false) out.push({ t: o.startBeat, d: 1, p: g.crash.note, v: g.crash.velocity ?? 0.85 });
  out.sort((a, b) => a.t - b.t || a.p - b.p);
  return out;

  /** @param {string} c */
  function emit(c) {
    if (c === 'x' || c === 'X' || c === 'o') return true;
    if (c === '?') return rng.chance(maybe);
    return false;
  }

  /**
   * @param {number} barStart
   * @param {number} s
   * @param {number} note
   * @param {string} c
   * @param {number} base
   * @param {number} pushMs
   */
  function push(barStart, s, note, c, base, pushMs) {
    const t = Math.max(barStart - 0.02, swingTime(barStart + s * step, swing) + msToBeats(pushMs + rng.normal(0, timing / 2)));
    const accent = c === 'X' ? 1.12 : c === 'o' ? 0.5 : c === '?' ? 0.75 : 1;
    const beatAccent = s % (grid / 4) === 0 ? 1.04 : 1;
    const v = Math.min(1, Math.max(0.1, base * accent * beatAccent * (1 + rng.normal(0, velVar))));
    out.push({ t: Math.max(0, t), d: step, p: note, v });
  }
}
