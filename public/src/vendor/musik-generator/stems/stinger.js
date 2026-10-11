// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Stingers: short musical one-shots for game events, composed per key so they
 * fit whatever music is playing. The metallic FM bell is meant for exactly
 * this (D-040).
 *  - rise: upward arpeggio over two octaves into a held tonic chord (discovery, level-up)
 *  - shimmer: high glass arpeggio with bell sparkle (pickup, secret)
 *  - hit: impact, boom and a low tonic stab (alarm, enemy appears)
 *  - fall: descending scale figure over a dark low chord (failure, loss)
 */

import { createScore } from '../core/score.js';
import { VERSION } from '../version.js';
import { keyScale } from '../theory/key.js';
import { pitchClass, formatPitchName } from '../theory/pitch.js';
import { DRUM_NOTES } from '../instruments/index.js';

/**
 * @param {'rise' | 'shimmer' | 'hit' | 'fall'} kind
 * @param {import('../theory/key.js').Key} key
 * @param {{ bpm?: number }} [options]
 * @returns {{ score: import('../core/score.js').Score, render: import('../render/score-renderer.js').RenderOptions }}
 */
export function composeStinger(kind, key, { bpm = 110 } = {}) {
  const scale = keyScale(key);
  const tonic = pitchClass(key.tonic);
  const pcs = scale.pcs;
  // Scale degrees (0-based) as MIDI pitches from a base octave.
  const degree = (/** @type {number} */ d, /** @type {number} */ base) => {
    const oct = Math.floor(d / pcs.length);
    const pc = pcs[((d % pcs.length) + pcs.length) % pcs.length];
    return base + 12 * oct + ((pc - tonic + 12) % 12);
  };
  const root = (/** @type {number} */ octaveC) => octaveC + tonic; // e.g. 48 → tonic in octave 3
  const triad = (/** @type {number} */ base) => [0, 2, 4].map((d) => degree(d, base));
  /** @type {import('../core/score.js').Track[]} */
  let tracks;
  switch (kind) {
    case 'rise': {
      const arp = [0, 2, 4, 7, 9, 11, 14].map((d, i) => ({ t: i * 0.25, d: 0.5, p: degree(d, root(60)), v: 0.55 + 0.05 * i }));
      const end = 7 * 0.25;
      tracks = [
        { id: 'arp', role: 'arp', instrument: 'keys.glass', events: arp },
        { id: 'bell', role: 'fx', instrument: 'keys.bell', events: [{ t: end, d: 2, p: degree(14, root(60)), v: 0.6 }] },
        { id: 'pad', role: 'pad', instrument: 'pad.glass', events: triad(root(48)).map((p) => ({ t: end, d: 2.5, p, v: 0.6 })) },
      ];
      break;
    }
    case 'shimmer': {
      const notes = [7, 9, 11, 14, 11, 14, 16, 18];
      tracks = [
        { id: 'glass', role: 'arp', instrument: 'keys.glass', events: notes.map((d, i) => ({ t: i * 0.125, d: 0.6, p: degree(d, root(60)), v: 0.5 + 0.04 * i })) },
        { id: 'bell', role: 'fx', instrument: 'keys.bell', events: [{ t: 0, d: 2, p: degree(14, root(60)), v: 0.45 }, { t: 1, d: 2, p: degree(18, root(60)), v: 0.4 }] },
      ];
      break;
    }
    case 'hit': {
      tracks = [
        { id: 'fx', role: 'percussion', instrument: 'kit.hybrid', events: [{ t: 0, d: 2, p: DRUM_NOTES.impact, v: 1 }, { t: 0, d: 2, p: DRUM_NOTES.boom, v: 0.9 }] },
        { id: 'bass', role: 'bass', instrument: 'bass.ladder', events: [{ t: 0, d: 1.5, p: root(24) < 28 ? root(36) : root(24), v: 0.9 }] },
        { id: 'stab', role: 'chords', instrument: 'pad.strings', events: triad(root(48)).map((p) => ({ t: 0, d: 1.2, p, v: 0.8 })) },
      ];
      break;
    }
    case 'fall': {
      const notes = [7, 6, 5, 4, 3, 2, 1, 0];
      tracks = [
        { id: 'lead', role: 'lead', instrument: 'lead.soft', events: notes.map((d, i) => ({ t: i * 0.25, d: 0.3, p: degree(d, root(60)), v: 0.7 - 0.03 * i })) },
        { id: 'pad', role: 'pad', instrument: 'pad.warm', events: [0, 2, 4].map((d) => ({ t: 0, d: 2.5, p: degree(d, root(36)), v: 0.5 })) },
        { id: 'fx', role: 'percussion', instrument: 'kit.hybrid', events: [{ t: 2, d: 2, p: DRUM_NOTES.boom, v: 0.7 }] },
      ];
      break;
    }
    default:
      throw new RangeError(`Unknown stinger kind "${kind}"`);
  }
  const score = createScore({
    meta: { engine: VERSION, title: `Stinger ${kind}`, seed: `stinger-${kind}` },
    tempoMap: [{ beat: 0, bpm }],
    keyMap: [{ beat: 0, tonic: formatPitchName(key.tonic), mode: key.mode }],
    tracks,
  });
  return { score, render: { reverb: { rt60: 2.4, size: 1.1 }, tailSec: 2 } };
}
