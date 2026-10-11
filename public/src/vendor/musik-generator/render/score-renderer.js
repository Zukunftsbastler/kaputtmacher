// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Offline score renderer: instruments per track → mixer (role-based
 * defaults for level, pan, sends, ducking) → reverb/delay buses → master
 * glue compression → loudness normalization (BS.1770) → true-peak limiter.
 * Events are applied sample-accurately (blocks are split at event times).
 */

import { assertValidScore, scoreLengthBeats } from '../core/score.js';
import { TempoMap } from '../core/tempo-map.js';
import { createSynthContext, createInstrument, ROLE_DEFAULTS } from '../instruments/index.js';
import { Mixer } from '../dsp/mixer.js';
import { Reverb } from '../dsp/effects/reverb.js';
import { ConvolutionReverb } from '../dsp/effects/convolution.js';
import { BassEnhancer } from '../dsp/effects/bass-enhancer.js';
import { StereoDelay } from '../dsp/effects/delay.js';
import { Chorus } from '../dsp/effects/chorus.js';
import { Compressor, ParametricEq, Limiter, Saturator } from '../dsp/effects/dynamics.js';
import { measureLoudness } from '../analysis/loudness.js';
import { dbToGain } from '../dsp/util.js';

/**
 * @typedef {object} TrackMix
 * @property {number} [gainDb]
 * @property {number} [pan]
 * @property {Record<string, number>} [sends] "reverb" / "delay" levels
 * @property {boolean | import('../dsp/effects/chorus.js').ChorusParams} [chorus]
 * @property {{ source: string, amountDb?: number, attackMs?: number, releaseMs?: number }} [duck]
 * @property {import('../dsp/effects/dynamics.js').EqBand[]} [eq] insert EQ
 * @property {{ drive: number, mix?: number }} [saturator] insert saturation (2× oversampled)
 * @property {import('../dsp/effects/dynamics.js').CompressorParams} [compressor] insert compressor
 * @property {number} [loudness] offline only: normalize the track alone (after its inserts) to this
 *   integrated loudness in LUFS; gainDb is then an offset relative to it
 * @property {number} [relativeLoudness] offline only, preferred over `loudness`: place the track this many
 *   LU relative to the rest of the mix (measured before the master chain), like a mixing engineer would
 */

/** Bass chain: rumble filter, fundament, "string" presence, saturation, compression. */
const BASS_CHAIN = Object.freeze({
  eq: [
    { type: /** @type {const} */ ('highpass'), freq: 28, q: 0.7 },
    { type: /** @type {const} */ ('lowshelf'), freq: 90, q: 0.7, gainDb: 2.5 },
    { type: /** @type {const} */ ('peaking'), freq: 820, q: 1.1, gainDb: 3.5 },
  ],
  saturator: { drive: 1.8, mix: 0.35 },
  compressor: { thresholdDb: -24, ratio: 4, kneeDb: 6, attackMs: 8, releaseMs: 110 },
});

/** Mixing defaults per track role (an arranger's starting point, overridable). */
export const ROLE_MIX = Object.freeze(
  /** @type {Record<string, TrackMix>} */ ({
    bass: { gainDb: 0, sends: { reverb: 0.04 }, ...BASS_CHAIN, loudness: -18, relativeLoudness: 0 },
    sub: { gainDb: 0, sends: {}, eq: [{ type: 'highpass', freq: 25, q: 0.7 }], compressor: { thresholdDb: -24, ratio: 3, attackMs: 15, releaseMs: 150 }, loudness: -25, relativeLoudness: -12 },
    drone: { gainDb: 0, sends: { reverb: 0.15 }, eq: [{ type: 'highpass', freq: 25, q: 0.7 }], saturator: { drive: 1.5, mix: 0.3 }, loudness: -25, relativeLoudness: -10 },
    pad: { gainDb: -4, sends: { reverb: 0.35 }, chorus: { voices: 3, rate: 0.3, depthMs: 3, mix: 0.4 } },
    chords: { gainDb: -3, sends: { reverb: 0.22 }, chorus: { voices: 2, rate: 0.5, depthMs: 1.5, mix: 0.25 } },
    keys: { gainDb: -3, sends: { reverb: 0.22 }, chorus: { voices: 2, rate: 0.5, depthMs: 1.5, mix: 0.25 } },
    melody: { gainDb: -1, sends: { reverb: 0.2, delay: 0.1 } },
    lead: { gainDb: -2, sends: { reverb: 0.18, delay: 0.14 } },
    arp: { gainDb: -5, pan: 0.15, sends: { reverb: 0.22, delay: 0.16 } },
    pluck: { gainDb: -3, pan: -0.1, sends: { reverb: 0.25 } },
    drums: { gainDb: -1, sends: { reverb: 0.06 } },
    percussion: { gainDb: -2, sends: { reverb: 0.25 } },
    texture: { gainDb: -8, sends: {} },
    default: { gainDb: -3, sends: { reverb: 0.2 } },
  }),
);

/**
 * Insert effects of a track from its mix settings (chorus → EQ → saturation → compressor).
 * @param {TrackMix} mix
 * @param {number} sampleRate
 * @returns {{ process: (L: Float32Array, R: Float32Array, start: number, end: number) => void }[]}
 */
export function createTrackInserts(mix, sampleRate) {
  const fx = [];
  if (mix.chorus) fx.push(new Chorus(sampleRate, mix.chorus === true ? {} : mix.chorus));
  if (mix.eq?.length) fx.push(new ParametricEq(sampleRate, mix.eq));
  if (mix.saturator) fx.push(new Saturator(sampleRate, mix.saturator));
  if (mix.compressor) fx.push(new Compressor(sampleRate, mix.compressor));
  return fx;
}

/**
 * @typedef {object} RenderOptions
 * @property {number} [sampleRate] default 48000
 * @property {number | string} [seed] default: score.meta.seed or 0
 * @property {Record<string, TrackMix & { instrument?: string }>} [mix] per-track overrides by track id
 * @property {import('../dsp/effects/reverb.js').ReverbParams & { type?: 'hall' | 'cathedral' }} [reverb]
 *   "cathedral": convolution with a generated impulse response (dense, very long spaces)
 * @property {import('../dsp/effects/bass-enhancer.js').BassEnhancerParams} [bassEnhance] psychoacoustic
 *   bass on bass, sub and drone tracks (small speakers, e.g. phones)
 * @property {number} [delayBeats] tempo-synced delay time (default 0.75 = dotted eighth)
 * @property {number} [targetLufs] loudness target (default −18), null = no normalization
 * @property {number} [ceilingDb] true-peak ceiling (default −1)
 * @property {number} [tailSec] extra time after the last note (default 3)
 * @property {boolean} [raw] skip master chain, normalization and limiter (measurement passes, stems)
 * @property {Record<string, number>} [trackGainDb] fixed channel gains per track id (skips the
 *   track normalizer), e.g. from `resolveTrackGains` or a previous `stats.trackGainDb`
 * @property {string[]} [onlyTracks] render only these tracks; tracks that key their ducking are
 *   rendered silently (stem layers)
 */

/**
 * @typedef {object} RenderResult
 * @property {number} sampleRate
 * @property {Float32Array[]} channels [left, right]
 * @property {{ integratedLufs: number, truePeakDb: number, gainDb: number, durationSec: number, trackGainDb: Record<string, number> }} stats
 *   `trackGainDb`: effective channel gain per track after the track normalizer
 */

/**
 * Effective mix settings of a track: role defaults, then per-track overrides.
 * @param {import('../core/score.js').Track} track
 * @param {RenderOptions} options
 * @returns {TrackMix}
 */
function trackMixOf(track, options) {
  return { ...(ROLE_MIX[track.role ?? 'default'] ?? ROLE_MIX.default), ...(options.mix?.[track.id] ?? {}) };
}

/**
 * Channel gains per track after the track normalizer (`loudness` / `relativeLoudness`).
 * Tracks placed relative to the mix are measured against a pre-pass of all other tracks.
 * The analysis passes run at ≤ 24 kHz: loudness barely depends on the sample rate, the time does.
 * @param {import('../core/score.js').Score} score
 * @param {RenderOptions} [options]
 * @returns {Record<string, number>} gain in dB per track id
 */
export function resolveTrackGains(score, options = {}) {
  const sampleRate = options.sampleRate ?? 48000;
  const analysisRate = Math.min(sampleRate, 24000);
  const tempo = new TempoMap(score.tempoMap);
  const seed = options.seed ?? /** @type {number | string | undefined} */ (score.meta.seed) ?? 0;
  const relativeIds = score.tracks.filter((t) => trackMixOf(t, options).relativeLoudness !== undefined && t.events.length > 0).map((t) => t.id);
  let restLufs = -Infinity;
  if (relativeIds.length > 0) {
    const rest = score.tracks.filter((t) => !relativeIds.includes(t.id));
    if (rest.some((t) => t.events.length > 0)) {
      const pass = renderScore({ ...score, tracks: rest }, { ...options, onlyTracks: undefined, sampleRate: analysisRate, raw: true, tailSec: 0.5 });
      restLufs = measureLoudness(pass.channels, analysisRate, { truePeak: false }).integratedLufs;
    }
  }
  /** @type {Record<string, number>} */
  const gains = {};
  for (const track of score.tracks) {
    const mix = trackMixOf(track, options);
    let gainDb = mix.gainDb ?? 0;
    const target = mix.relativeLoudness !== undefined && Number.isFinite(restLufs) ? restLufs + mix.relativeLoudness : mix.loudness;
    if (target !== undefined && track.events.length > 0) {
      // Normalizer: render this track alone (identical random streams) and measure it.
      const presetId = options.mix?.[track.id]?.instrument ?? track.instrument ?? /** @type {Record<string, string>} */ (ROLE_DEFAULTS)[track.role ?? 'default'] ?? 'keys.epiano';
      const solo = soloLoudness(track, presetId, mix, analysisRate, seed, tempo);
      if (Number.isFinite(solo)) gainDb += target - solo;
    }
    gains[track.id] = gainDb;
  }
  return gains;
}

/**
 * Integrated loudness of one track rendered alone through its inserts.
 * @param {import('../core/score.js').Track} track
 * @param {string} presetId
 * @param {TrackMix} mix
 * @param {number} sampleRate
 * @param {number | string} seed
 * @param {TempoMap} tempo
 */
function soloLoudness(track, presetId, mix, sampleRate, seed, tempo) {
  const ctx = createSynthContext({ sampleRate, seed });
  const instrument = createInstrument(presetId, ctx, ctx.rng.fork(`track:${track.id}`));
  const inserts = createTrackInserts({ ...mix, chorus: undefined }, sampleRate);
  /** @type {{ at: number, on: boolean, pitch: number, vel: number, durSec: number }[]} */
  const events = [];
  for (const e of track.events) {
    const t0 = tempo.beatToSeconds(e.t);
    const t1 = tempo.beatToSeconds(e.t + e.d);
    const at0 = Math.round(t0 * sampleRate);
    events.push({ at: at0, on: true, pitch: e.p, vel: e.v, durSec: t1 - t0 }, { at: Math.max(at0 + 1, Math.round(t1 * sampleRate)), on: false, pitch: e.p, vel: 0, durSec: 0 });
  }
  events.sort((a, b) => a.at - b.at || Number(a.on) - Number(b.on));
  const frames = (events.at(-1)?.at ?? 0) + sampleRate;
  const L = new Float32Array(frames);
  const R = new Float32Array(frames);
  let ev = 0;
  for (let block = 0; block < frames; block += 128) {
    const n = Math.min(128, frames - block);
    let pos = block;
    while (pos < block + n) {
      while (ev < events.length && events[ev].at <= pos) {
        const e = events[ev++];
        if (e.on) instrument.noteOn(e.pitch, e.vel, { durationSec: e.durSec });
        else instrument.noteOff(e.pitch);
      }
      const next = ev < events.length ? Math.min(block + n, Math.max(pos + 1, events[ev].at)) : block + n;
      instrument.render(L, R, pos, next);
      pos = next;
    }
    for (const fx of inserts) fx.process(L, R, block, block + n);
  }
  return measureLoudness([L, R], sampleRate, { truePeak: false }).integratedLufs;
}

/**
 * @param {import('../core/score.js').Score} score
 * @param {RenderOptions} [options]
 * @returns {RenderResult}
 */
export function renderScore(score, options = {}) {
  assertValidScore(score);
  const sampleRate = options.sampleRate ?? 48000;
  const blockSize = 128;
  const tempo = new TempoMap(score.tempoMap);
  const seed = options.seed ?? /** @type {number | string | undefined} */ (score.meta.seed) ?? 0;
  const ctx = createSynthContext({ sampleRate, seed });

  const mixer = new Mixer(sampleRate, { blockSize });
  const rv = { rt60: 2.2, size: 1, damping: 6500, predelayMs: 18, ...options.reverb };
  mixer.addBus('reverb', [rv.type === 'cathedral' ? new ConvolutionReverb(sampleRate, { ...rv, predelayMs: Math.max(rv.predelayMs, 25) }) : new Reverb(sampleRate, rv)]);
  const delaySec = (60 / tempo.bpmAt(0)) * (options.delayBeats ?? 0.75);
  mixer.addBus('delay', [new StereoDelay(sampleRate, { timeSec: delaySec, feedback: 0.32, highCut: 4500, lowCut: 250 })], { gainDb: -3 });
  if (!options.raw) mixer.setMaster([
    new ParametricEq(sampleRate, [{ type: 'highpass', freq: 25, q: 0.7 }]),
    new Compressor(sampleRate, { thresholdDb: -14, ratio: 1.8, kneeDb: 8, attackMs: 25, releaseMs: 220, detectorHighpassHz: 150 }),
  ]);

  // Channels: sources of ducking must exist before their targets.
  const tracks = score.tracks.slice().sort((a, b) => {
    const da = options.mix?.[a.id]?.duck ? 1 : 0;
    const db = options.mix?.[b.id]?.duck ? 1 : 0;
    return da - db;
  });
  const mixOf = (/** @type {import('../core/score.js').Track} */ track) => trackMixOf(track, options);
  const gains = options.trackGainDb ?? (options.raw ? null : resolveTrackGains(score, options));
  // Stem layers: the selected tracks plus (muted) the sources of their sidechains.
  const only = options.onlyTracks ? new Set(options.onlyTracks) : null;
  const keySources = new Set(only ? score.tracks.filter((t) => only.has(t.id)).map((t) => mixOf(t).duck?.source).filter((x) => x !== undefined) : []);
  const used = only ? tracks.filter((t) => only.has(t.id) || keySources.has(t.id)) : tracks;
  /** @type {Record<string, number>} */
  const trackGainDb = {};
  const instruments = used.map((track) => {
    const role = track.role ?? 'default';
    const override = options.mix?.[track.id] ?? {};
    const mix = mixOf(track);
    const presetId = override.instrument ?? track.instrument ?? /** @type {Record<string, string>} */ (ROLE_DEFAULTS)[role] ?? 'keys.epiano';
    const instrument = createInstrument(presetId, ctx, ctx.rng.fork(`track:${track.id}`));
    const gainDb = gains?.[track.id] ?? mix.gainDb ?? 0;
    const channel = mixer.addChannel(track.id, {
      gainDb,
      pan: mix.pan,
      sends: mix.sends,
      inserts: [...createTrackInserts(mix, sampleRate), ...(options.bassEnhance && ['bass', 'sub', 'drone'].includes(role) ? [new BassEnhancer(sampleRate, options.bassEnhance)] : [])],
      duck: mix.duck,
    });
    if (only && !only.has(track.id)) channel.muted = true;
    trackGainDb[track.id] = gainDb;
    return { track, instrument, channel };
  });

  // Event list in samples; note-offs sort before note-ons at the same sample.
  /** @type {{ at: number, on: boolean, inst: number, pitch: number, vel: number, durSec: number, art?: string }[]} */
  const events = [];
  instruments.forEach(({ track }, inst) => {
    for (const e of track.events) {
      const t0 = tempo.beatToSeconds(e.t);
      const t1 = tempo.beatToSeconds(e.t + e.d);
      const at0 = Math.round(t0 * sampleRate);
      const at1 = Math.max(at0 + 1, Math.round(t1 * sampleRate));
      events.push({ at: at0, on: true, inst, pitch: e.p, vel: e.v, durSec: t1 - t0, art: e.art });
      events.push({ at: at1, on: false, inst, pitch: e.p, vel: 0, durSec: 0 });
    }
  });
  events.sort((a, b) => a.at - b.at || Number(a.on) - Number(b.on));

  const endSec = tempo.beatToSeconds(scoreLengthBeats(score)) + (options.tailSec ?? 3);
  const frames = Math.ceil(endSec * sampleRate);
  const outL = new Float32Array(frames);
  const outR = new Float32Array(frames);

  let ev = 0;
  for (let block = 0; block < frames; block += blockSize) {
    const n = Math.min(blockSize, frames - block);
    mixer.beginBlock();
    let pos = 0;
    while (pos < n) {
      while (ev < events.length && events[ev].at <= block + pos) {
        const e = events[ev++];
        const { instrument } = instruments[e.inst];
        if (e.on) instrument.noteOn(e.pitch, e.vel, { durationSec: e.durSec, articulation: e.art });
        else instrument.noteOff(e.pitch);
      }
      const next = ev < events.length ? Math.min(n, events[ev].at - block) : n;
      const segEnd = Math.max(next, pos + 1);
      for (const { instrument, channel } of instruments) instrument.render(channel.L, channel.R, pos, segEnd);
      pos = segEnd;
    }
    mixer.process(outL, outR, n, block);
  }
  if (options.raw) {
    return { sampleRate, channels: [outL, outR], stats: { integratedLufs: Number.NaN, truePeakDb: Number.NaN, gainDb: 0, durationSec: frames / sampleRate, trackGainDb } };
  }

  // Loudness normalization, then the true-peak limiter (latency-compensated).
  const target = options.targetLufs === undefined ? -18 : options.targetLufs;
  let gainDb = 0;
  if (target !== null) {
    const pre = measureLoudness([outL, outR], sampleRate, { truePeak: false }).integratedLufs;
    if (Number.isFinite(pre)) gainDb = target - pre;
  }
  const g = dbToGain(gainDb);
  const limiter = new Limiter(sampleRate, { ceilingDb: options.ceilingDb ?? -1 });
  const lat = limiter.latency;
  const bufL = new Float32Array(frames + lat);
  const bufR = new Float32Array(frames + lat);
  for (let i = 0; i < frames; i++) {
    bufL[i] = outL[i] * g;
    bufR[i] = outR[i] * g;
  }
  for (let s = 0; s < bufL.length; s += blockSize) limiter.process(bufL, bufR, s, Math.min(bufL.length, s + blockSize));
  const L = bufL.subarray(lat);
  const R = bufR.subarray(lat);
  // Gentle fade over the last 200 ms so the reverb tail never ends abruptly.
  const fade = Math.min(frames, Math.round(0.2 * sampleRate));
  for (let i = 0; i < fade; i++) {
    const f = i / fade;
    L[frames - 1 - i] *= f;
    R[frames - 1 - i] *= f;
  }
  const finalL = new Float32Array(L);
  const finalR = new Float32Array(R);
  const post = measureLoudness([finalL, finalR], sampleRate);
  return {
    sampleRate,
    channels: [finalL, finalR],
    stats: { integratedLufs: post.integratedLufs, truePeakDb: post.truePeakDb, gainDb, durationSec: frames / sampleRate, trackGainDb },
  };
}
