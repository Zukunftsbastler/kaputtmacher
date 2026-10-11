// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Bridges between adaptive states: a short modulation (harmonic path from
 * Phase 3) from the old key towards the new one, ending on the new dominant
 * so the target state's first downbeat resolves it. The tempo ramps from the
 * old to the new tempo; a riser and a snare build lead into the change.
 */

import { createScore } from '../core/score.js';
import { VERSION } from '../version.js';
import { planModulation } from '../compose/harmony/modulation.js';
import { voiceProgression, voicingTracks } from '../compose/harmony/voicing.js';
import { formatPitchName } from '../theory/pitch.js';
import { DRUM_NOTES } from '../instruments/index.js';

/** @typedef {import('../styles/song.js').ComposedSong} ComposedSong */

/**
 * @param {ComposedSong} from
 * @param {ComposedSong} to
 * @param {{ bars?: number, title?: string }} [options]
 * @returns {{ score: import('../core/score.js').Score, render: import('../render/score-renderer.js').RenderOptions }}
 */
export function composeBridge(from, to, { bars = 1, title = 'Bridge' } = {}) {
  const meter = to.score.meterMap?.[0] ?? { num: 4, den: 4 };
  const barLen = (meter.num * 4) / meter.den;
  const total = bars * barLen;
  // Chords of the modulation without the arrival (the new state starts on its tonic),
  // always ending on the new dominant; at most two chords per bar.
  let path = planModulation(from.key, to.key, { beatsPerChord: 1 }).filter((e) => !e.tags.includes('arrival'));
  if (path.at(-1)?.fn !== 'D') {
    const dominant = planModulation(from.key, to.key, { strategy: 'dominant', beatsPerChord: 1 }).find((e) => e.fn === 'D');
    if (dominant) path = [...path, dominant];
  }
  const chords = path.slice(-Math.max(1, bars * 2));
  const dur = total / chords.length;
  const harmony = chords.map((e, i) => ({ ...e, beat: i * dur, dur }));
  const voicings = voiceProgression(harmony, { style: 'pad' });
  const instrumentOf = (/** @type {string[]} */ roles, /** @type {string} */ fallback) =>
    to.score.tracks.find((t) => roles.includes(t.role ?? '') && t.instrument)?.instrument ?? fallback;
  const [pad, bass] = voicingTracks(harmony, voicings, {
    chordInstrument: instrumentOf(['pad', 'chords'], 'pad.strings'),
    bassInstrument: instrumentOf(['bass'], 'bass.sub'),
    velocity: 0.6,
  });
  // Snare build: eighths, then sixteenths in the last half, rising velocity; riser on top.
  /** @type {import('../core/score.js').NoteEvent[]} */
  const drums = [];
  for (let t = 0; t < total - 1e-9; ) {
    const step = t < total / 2 ? 0.5 : 0.25;
    drums.push({ t, d: 0.1, p: DRUM_NOTES.snare, v: 0.35 + 0.55 * (t / total) });
    t += step;
  }
  const fx = [{ t: 0, d: total, p: DRUM_NOTES.riser, v: 0.8 }];
  const score = createScore({
    meta: { engine: VERSION, title, seed: `${from.score.meta.seed}>${to.score.meta.seed}` },
    tempoMap:
      from.bpm === to.bpm
        ? [{ beat: 0, bpm: from.bpm }]
        : [
            { beat: 0, bpm: from.bpm },
            { beat: total, bpm: to.bpm, ramp: 'linear' },
          ],
    meterMap: [{ beat: 0, num: meter.num, den: meter.den }],
    keyMap: [{ beat: 0, tonic: formatPitchName(to.key.tonic), mode: to.key.mode }],
    tracks: [
      { ...pad, id: 'pad', role: 'pad' },
      { ...bass, id: 'bass', role: 'bass' },
      { id: 'drums', role: 'drums', instrument: instrumentOf(['drums'], 'kit.hybrid'), events: drums },
      { id: 'fx', role: 'percussion', instrument: 'kit.hybrid', events: fx },
    ],
  });
  return { score, render: { reverb: to.render.reverb, delayBeats: to.render.delayBeats } };
}
