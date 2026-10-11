// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Stem pipeline: adaptive description ("mg-adaptive") → composed states,
 * bridges and stingers → rendered layer files per segment (body + tail) and an
 * "mg-stems" manifest. Two stages so a game can start early (render-on-load):
 * planStems() composes everything and returns the complete manifest plus
 * render jobs (cheap); each job then renders the files of one state, bridge or
 * stinger (expensive). Browser-compatible; no file system access here.
 */

import { TempoMap } from '../core/tempo-map.js';
import { createScore, scoreLengthBeats } from '../core/score.js';
import { VERSION } from '../version.js';
import { composeSong } from '../styles/song.js';
import { createRecipe } from '../styles/recipe.js';
import { renderScore, resolveTrackGains } from '../render/score-renderer.js';
import { ParametricEq } from '../dsp/effects/dynamics.js';
import { formatKey } from '../theory/key.js';
import { assertValidAdaptive, DEFAULT_LAYERS, layerOfRole } from '../adaptive/description.js';
import { assertValidManifest, STEMS_FORMAT, STEMS_VERSION, neighbours } from '../adaptive/manifest.js';
import { composeBridge } from './bridge.js';
import { composeStinger } from './stinger.js';
import { masterLinked } from './master.js';

/** @typedef {import('../adaptive/description.js').AdaptiveDescription} AdaptiveDescription */
/** @typedef {import('../adaptive/manifest.js').StemManifest} StemManifest */
/** @typedef {[Float32Array, Float32Array]} Stereo */

/**
 * @typedef {object} StemJob
 * @property {string} id "state:combat", "bridge:…", "stinger:…"
 * @property {string} label human-readable
 * @property {string | null} state state the job belongs to (null for stingers)
 * @property {string[]} files file names the job produces
 * @property {number} weight estimated audio seconds (for progress)
 * @property {() => Record<string, Float32Array[]>} run renders the files (1 or 2 channels)
 */

/**
 * @typedef {object} StemOptions
 * @property {number} [sampleRate] default 48000
 */

/** File name part of a key: "F# dorian" → "Fs-dorian". */
const keyFileName = (/** @type {string} */ key) => key.replace(/#/g, 's').replace(/\s+/g, '-');

/**
 * Composes all states, bridges and stingers and plans the render jobs.
 * @param {AdaptiveDescription} description
 * @param {StemOptions} [options]
 * @returns {{ manifest: StemManifest, jobs: StemJob[] }}
 */
export function planStems(description, { sampleRate = 48000 } = {}) {
  assertValidAdaptive(description);
  const layers = description.layers ?? DEFAULT_LAYERS;
  const params = { ...(description.params ?? {}) };
  for (const l of Object.values(layers)) if (l.param !== undefined && !params[l.param]) params[l.param] = { default: 0.5, smoothingSec: 1.5 };

  /** @type {StemManifest} */
  const manifest = {
    format: STEMS_FORMAT,
    version: STEMS_VERSION,
    engine: VERSION,
    title: description.title ?? 'Adaptive music',
    sampleRate,
    channels: 2,
    initial: description.initial,
    params,
    layers: Object.fromEntries(Object.entries(layers).map(([name, { roles, mono, ...rest }]) => [name, rest])),
    states: {},
    segments: {},
    transitions: [],
    stingers: {},
    hysteresis: { minStateSeconds: description.hysteresis?.minStateSeconds ?? 4 },
  };
  /** @type {StemJob[]} */
  const jobs = [];
  /** @type {Map<string, import('../styles/song.js').ComposedSong>} */
  const songs = new Map();
  /** @type {Record<string, number>} file name → samples over all channels (RAM estimate) */
  const frames = {};

  // States.
  for (const [name, st] of Object.entries(description.states)) {
    const loop = st.loop !== false;
    const recipe = createRecipe({
      style: st.style,
      seed: st.seed ?? `${description.seed}:${name}`,
      ...(st.key ? { key: st.key } : {}),
      ...(st.bpm ? { bpm: st.bpm } : {}),
      ...(st.axes ? { axes: st.axes } : {}),
      ...(st.variety !== undefined ? { variety: st.variety } : {}),
      ...(st.motif ? { motif: st.motif } : {}),
      ...(st.intensity !== undefined ? { intensity: st.intensity } : {}),
      form: st.form,
      loop,
      title: `${description.title ?? 'Adaptive'} – ${name}`,
    });
    const song = composeSong(recipe);
    songs.set(name, song);
    const tempo = new TempoMap(song.score.tempoMap);
    const meter = song.score.meterMap?.[0] ?? { num: 4, den: 4 };
    const barLen = (meter.num * 4) / meter.den;
    const rt60 = song.render.reverb?.rt60 ?? 2.2;
    /** @type {{ name: string, start: number, end: number, frames: number, tailFrames: number, layerTracks: Map<string, string[]> }[]} */
    const plan = [];
    song.sections.forEach((sec, i) => {
      const seg = `${name}.${i + 1}${sec.label}`;
      const start = sec.beat;
      const end = sec.beat + sec.bars * barLen;
      const t0 = tempo.beatToSeconds(start);
      const bodyFrames = Math.round((tempo.beatToSeconds(end) - t0) * sampleRate);
      const durationSec = bodyFrames / sampleRate;
      const barStarts = Array.from({ length: sec.bars }, (_, b) => tempo.beatToSeconds(start + b * barLen) - t0);
      // Layers present in this section and how far its notes ring past the end.
      /** @type {Map<string, string[]>} */
      const layerTracks = new Map();
      let overhang = 0;
      for (const track of song.score.tracks) {
        const notes = track.events.filter((e) => e.t >= start - 1e-9 && e.t < end - 1e-9);
        if (notes.length === 0) continue;
        const layer = layerOfRole(layers, track.role ?? 'default');
        layerTracks.set(layer, [...(layerTracks.get(layer) ?? []), track.id]);
        for (const e of notes) overhang = Math.max(overhang, e.t + e.d - end);
      }
      const overhangSec = tempo.beatToSeconds(end + overhang) - tempo.beatToSeconds(end);
      const tailSec = Math.min(durationSec, Math.max(1, overhangSec + 0.6, rt60 * 0.9 + 0.3));
      const tailFrames = Math.round(tailSec * sampleRate);
      /** @type {Record<string, import('../adaptive/manifest.js').StemFile>} */
      const files = {};
      for (const layer of Object.keys(layers)) {
        if (!layerTracks.has(layer)) continue;
        files[layer] = { body: `${seg}.${layer}.wav`, tail: `${seg}.${layer}.tail.wav` };
        const ch = layers[layer].mono ? 1 : 2;
        frames[files[layer].body] = bodyFrames * ch;
        frames[/** @type {string} */ (files[layer].tail)] = tailFrames * ch;
      }
      manifest.segments[seg] = {
        bpm: Math.round(tempo.bpmAt(start) * 100) / 100,
        meter: [meter.num, meter.den],
        bars: sec.bars,
        barStarts: barStarts.map((t) => Math.round(t * 1e6) / 1e6),
        beatsPerBar: meter.num,
        phraseBars: 4,
        durationSec,
        tailSec: tailFrames / sampleRate,
        key: formatKey(song.key),
        files,
      };
      plan.push({ name: seg, start, end, frames: bodyFrames, tailFrames, layerTracks });
    });
    manifest.states[name] = {
      segments: plan.map((p) => p.name),
      order: st.order ?? 'sequence',
      loop,
      ...(st.then !== undefined ? { then: st.then } : {}),
    };
    jobs.push({
      id: `state:${name}`,
      label: `Zustand „${name}“`,
      state: name,
      files: plan.flatMap((p) => Object.values(manifest.segments[p.name].files).flatMap((f) => [f.body, /** @type {string} */ (f.tail)])),
      weight: plan.reduce((a, p) => a + ((p.frames + p.tailFrames) / sampleRate) * p.layerTracks.size, 0),
      run: () => renderState(song, plan, { sampleRate, loop, targetLufs: st.loudness ?? -18, manifest, layers }),
    });
  }

  // Transitions and bridges.
  for (const t of description.transitions ?? []) {
    /** @type {import('../adaptive/manifest.js').Transition} */
    const rule = { from: t.from, to: t.to };
    if (t.at) rule.at = t.at;
    if (t.fadeSec !== undefined) rule.fadeSec = t.fadeSec;
    if (t.fadeInSec !== undefined) rule.fadeInSec = t.fadeInSec;
    if (t.stinger) rule.stinger = t.stinger;
    if (t.via === 'bridge') {
      const from = /** @type {import('../styles/song.js').ComposedSong} */ (songs.get(t.from));
      const to = /** @type {import('../styles/song.js').ComposedSong} */ (songs.get(t.to));
      const name = `bridge.${t.from}-${t.to}`;
      const bridge = composeBridge(from, to, { bars: t.bars ?? 1, title: name });
      const tempo = new TempoMap(bridge.score.tempoMap);
      const meter = bridge.score.meterMap?.[0] ?? { num: 4, den: 4 };
      const barLen = (meter.num * 4) / meter.den;
      const bars = t.bars ?? 1;
      const bodyFrames = Math.round(tempo.beatToSeconds(bars * barLen) * sampleRate);
      const tailSec = 2.5;
      const totalFrames = Math.ceil((tempo.beatToSeconds(scoreLengthBeats(bridge.score)) + tailSec) * sampleRate);
      const tailFrames = Math.max(0, totalFrames - bodyFrames);
      const files = { all: { body: `${name}.all.wav`, tail: `${name}.all.tail.wav` } };
      frames[files.all.body] = bodyFrames * 2;
      frames[files.all.tail] = tailFrames * 2;
      manifest.segments[name] = {
        bpm: Math.round(tempo.bpmAt(0) * 100) / 100,
        meter: [meter.num, meter.den],
        bars,
        barStarts: Array.from({ length: bars }, (_, b) => Math.round(tempo.beatToSeconds(b * barLen) * 1e6) / 1e6),
        beatsPerBar: meter.num,
        durationSec: bodyFrames / sampleRate,
        tailSec: tailFrames / sampleRate,
        key: formatKey(to.key),
        files,
      };
      rule.via = name;
      const target = (description.states[t.to].loudness ?? -18) - 1;
      jobs.push({
        id: `bridge:${name}`,
        label: `Brücke ${t.from} → ${t.to}`,
        state: t.to,
        files: [files.all.body, files.all.tail],
        weight: totalFrames / sampleRate,
        run: () => {
          const r = renderScore(bridge.score, { ...bridge.render, sampleRate, targetLufs: target, tailSec });
          const [body, tail] = split(r.channels, bodyFrames, tailFrames);
          return { [files.all.body]: body, [files.all.tail]: trimSilence(tail, sampleRate) };
        },
      });
    }
    /** @type {import('../adaptive/manifest.js').Transition[]} */ (manifest.transitions).push(rule);
  }

  // Stingers: one file per key used by the states.
  /** @type {Map<string, { key: import('../theory/key.js').Key, bpm: number }>} */
  const keys = new Map();
  for (const song of songs.values()) if (!keys.has(formatKey(song.key))) keys.set(formatKey(song.key), { key: song.key, bpm: song.bpm });
  for (const [name, spec] of Object.entries(description.stingers ?? {})) {
    /** @type {Record<string, string>} */
    const byKey = {};
    let maxFrames = 0;
    for (const [keyName, { key, bpm }] of keys) {
      const file = `stinger.${name}.${keyFileName(keyName)}.wav`;
      const stinger = composeStinger(/** @type {any} */ (spec.kind), key, { bpm });
      const tempo = new TempoMap(stinger.score.tempoMap);
      const tailSec = stinger.render.tailSec ?? 2;
      const n = Math.ceil((tempo.beatToSeconds(scoreLengthBeats(stinger.score)) + tailSec) * sampleRate);
      frames[file] = n * 2;
      maxFrames = Math.max(maxFrames, n);
      byKey[keyName] = file;
      jobs.push({
        id: `stinger:${name}:${keyName}`,
        label: `Stinger „${name}“ (${keyName})`,
        state: null,
        files: [file],
        weight: n / sampleRate,
        run: () => {
          const r = renderScore(stinger.score, { ...stinger.render, sampleRate, targetLufs: -17 });
          return { [file]: /** @type {Stereo} */ ([r.channels[0], r.channels[1]]) };
        },
      });
    }
    /** @type {Record<string, import('../adaptive/manifest.js').Stinger>} */ (manifest.stingers)[name] = {
      durationSec: maxFrames / sampleRate,
      byKey,
      ...(spec.gainDb !== undefined ? { gainDb: spec.gainDb } : {}),
      ...(spec.duckDb !== undefined ? { duckDb: spec.duckDb } : {}),
    };
  }

  manifest.ram = ramEstimate(manifest, frames);
  // Initial state first, so a render-on-load player can start as early as possible.
  jobs.sort((a, b) => rank(a, manifest) - rank(b, manifest));
  assertValidManifest(manifest);
  return { manifest, jobs };
}

/**
 * Renders everything: planStems() plus all jobs.
 * @param {AdaptiveDescription} description
 * @param {StemOptions & { onProgress?: (fraction: number, label: string) => void }} [options]
 * @returns {{ manifest: StemManifest, files: Record<string, Float32Array[]> }}
 */
export function renderStems(description, options = {}) {
  const { manifest, jobs } = planStems(description, options);
  const total = jobs.reduce((a, j) => a + j.weight, 0) || 1;
  let done = 0;
  /** @type {Record<string, Float32Array[]>} */
  const files = {};
  for (const job of jobs) {
    options.onProgress?.(done / total, job.label);
    Object.assign(files, job.run());
    done += job.weight;
  }
  options.onProgress?.(1, 'fertig');
  // Measured memory (tails are trimmed after rendering, so the plan was an upper bound).
  /** @type {Record<string, number>} */
  const frames = {};
  for (const [f, ch] of Object.entries(files)) frames[f] = ch[0].length * ch.length;
  manifest.ram = ramEstimate(manifest, frames);
  return { manifest, files };
}

/**
 * @param {StemJob} job
 * @param {StemManifest} m
 */
function rank(job, m) {
  if (job.state === m.initial) return 0;
  if (job.state === null) return 2;
  return 1;
}

/**
 * Renders all layers of all segments of a state and masters them linked.
 * @param {import('../styles/song.js').ComposedSong} song
 * @param {{ name: string, start: number, end: number, frames: number, tailFrames: number, layerTracks: Map<string, string[]> }[]} plan
 * @param {{ sampleRate: number, loop: boolean, targetLufs: number, manifest: StemManifest, layers: Record<string, import('../adaptive/description.js').AdaptiveLayer> }} options
 * @returns {Record<string, Float32Array[]>}
 */
function renderState(song, plan, { sampleRate, loop, targetLufs, manifest, layers: layerSpecs }) {
  const gains = resolveTrackGains(song.score, { ...song.render, sampleRate });
  const tempo = new TempoMap(song.score.tempoMap);
  /** @type {Record<string, Float32Array[]>} */
  const files = {};
  /** @type {import('./master.js').MasterSegment[]} */
  const segments = [];
  for (const p of plan) {
    const sub = sectionScore(song.score, tempo, p.start, p.end);
    const tailSec = p.tailFrames / sampleRate + 0.25;
    /** @type {{ body: Stereo, tail: Stereo }[]} */
    const layers = [];
    for (const [layer, ids] of p.layerTracks) {
      const r = renderScore(sub, { ...song.render, sampleRate, raw: true, trackGainDb: gains, onlyTracks: ids, tailSec });
      // Master high-pass of the renderer (linear, so per layer is the same as on the sum).
      const eq = new ParametricEq(sampleRate, [{ type: 'highpass', freq: 25, q: 0.7 }]);
      const n = p.frames + p.tailFrames;
      /** @type {Stereo} */
      const full = [new Float32Array(n), new Float32Array(n)];
      for (let c = 0; c < 2; c++) full[c].set(r.channels[c].subarray(0, Math.min(n, r.channels[c].length)));
      for (let i = 0; i < n; i += 128) eq.process(full[0], full[1], i, Math.min(n, i + 128));
      const [body, tail] = split(full, p.frames, p.tailFrames);
      layers.push({ body, tail });
      const f = manifest.segments[p.name].files[layer];
      files[f.body] = body;
      files[/** @type {string} */ (f.tail)] = tail;
    }
    segments.push({ frames: p.frames, layers });
  }
  const { integratedLufs } = masterLinked(segments, { sampleRate, loop, targetLufs });
  // Tails end where they have decayed (saves memory; the manifest keeps the upper bound).
  for (const p of plan) {
    for (const [layer, f] of Object.entries(manifest.segments[p.name].files)) {
      if (f.tail) files[f.tail] = trimSilence(/** @type {Stereo} */ (files[f.tail]), sampleRate);
      // Mono layers (e.g. bass): half the memory, the content is centred anyway.
      if (layerSpecs[layer]?.mono) for (const name of [f.body, f.tail ?? '']) if (files[name]) files[name] = [toMono(/** @type {Stereo} */ (files[name]))];
    }
  }
  (manifest.loudness ??= {})[plan[0].name.split('.')[0]] = Math.round(integratedLufs * 10) / 10;
  return files;
}

/**
 * The notes starting in [start, end) as a score of their own (time shifted to 0).
 * @param {import('../core/score.js').Score} score
 * @param {TempoMap} tempo
 * @param {number} start
 * @param {number} end
 */
function sectionScore(score, tempo, start, end) {
  const tempoMap = [{ beat: 0, bpm: tempo.bpmAt(start) }, ...score.tempoMap.filter((p) => p.beat > start && p.beat < end).map((p) => ({ ...p, beat: p.beat - start }))];
  return createScore({
    meta: { ...score.meta },
    tempoMap,
    ...(score.meterMap ? { meterMap: [{ ...score.meterMap[0], beat: 0 }] } : {}),
    ...(score.keyMap ? { keyMap: [{ ...score.keyMap[0], beat: 0 }] } : {}),
    tracks: score.tracks.map((t) => ({ ...t, events: t.events.filter((e) => e.t >= start - 1e-9 && e.t < end - 1e-9).map((e) => ({ ...e, t: Math.max(0, e.t - start) })) })),
  });
}

/**
 * @param {Stereo} s
 * @returns {Float32Array}
 */
function toMono([L, R]) {
  const out = new Float32Array(L.length);
  for (let i = 0; i < L.length; i++) out[i] = 0.5 * (L[i] + R[i]);
  return out;
}

/**
 * Cuts trailing near-silence (below −70 dBFS) off a tail, with a short fade.
 * @param {Stereo} s
 * @param {number} sampleRate
 * @returns {Stereo}
 */
function trimSilence(s, sampleRate) {
  const floor = 10 ** (-70 / 20);
  let end = s[0].length;
  while (end > 0 && Math.abs(s[0][end - 1]) < floor && Math.abs(s[1][end - 1]) < floor) end--;
  end = Math.min(s[0].length, end + Math.round(0.01 * sampleRate));
  if (end >= s[0].length) return s;
  /** @type {Stereo} */
  const out = [s[0].slice(0, end), s[1].slice(0, end)];
  const fade = Math.min(end, Math.round(0.01 * sampleRate));
  for (let c = 0; c < 2; c++) for (let i = 0; i < fade; i++) out[c][end - 1 - i] *= i / fade;
  return out;
}

/**
 * Splits a render into body and tail (zero-padded); the tail fades out over its last 30 %.
 * @param {Float32Array[]} channels
 * @param {number} bodyFrames
 * @param {number} tailFrames
 * @returns {[Stereo, Stereo]}
 */
function split(channels, bodyFrames, tailFrames) {
  /** @type {Stereo} */
  const body = [new Float32Array(bodyFrames), new Float32Array(bodyFrames)];
  /** @type {Stereo} */
  const tail = [new Float32Array(tailFrames), new Float32Array(tailFrames)];
  for (let c = 0; c < 2; c++) {
    const src = channels[c];
    body[c].set(src.subarray(0, Math.min(bodyFrames, src.length)));
    if (src.length > bodyFrames) tail[c].set(src.subarray(bodyFrames, Math.min(src.length, bodyFrames + tailFrames)));
    const fade = Math.floor(tailFrames * 0.3);
    for (let i = 0; i < fade; i++) tail[c][tailFrames - 1 - i] *= i / fade;
  }
  return [body, tail];
}

/**
 * Decoded memory (Float32 AudioBuffers): everything, and the peak of the mobile profile
 * (current state plus everything reachable from it, bridges and stingers).
 * @param {StemManifest} m
 * @param {Record<string, number>} frames
 */
function ramEstimate(m, frames) {
  const bytes = (/** @type {string} */ f) => (frames[f] ?? 0) * 4;
  const segmentBytes = (/** @type {string} */ s) => Object.values(m.segments[s].files).reduce((a, f) => a + bytes(f.body) + (f.tail ? bytes(f.tail) : 0), 0);
  const stateBytes = (/** @type {string} */ s) => m.states[s].segments.reduce((a, seg) => a + segmentBytes(seg), 0);
  const stingerBytes = Object.values(m.stingers ?? {}).reduce((a, s) => a + Object.values(s.byKey).reduce((b, f) => b + bytes(f), 0), 0);
  const totalBytes = Object.keys(frames).reduce((a, f) => a + bytes(f), 0);
  let mobilePeakBytes = 0;
  for (const s of Object.keys(m.states)) {
    const reach = new Set(neighbours(m, s));
    reach.add(s);
    let sum = stingerBytes;
    for (const r of reach) sum += stateBytes(r);
    for (const t of m.transitions ?? []) if (t.via && (t.from === s || t.from === '*')) sum += segmentBytes(t.via);
    mobilePeakBytes = Math.max(mobilePeakBytes, sum);
  }
  return { totalBytes, mobilePeakBytes };
}
