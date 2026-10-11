// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Stem player: plays pre-rendered adaptive stems ("mg-stems") with native Web
 * Audio nodes – no AudioWorklet, no DSP, minimal CPU. The AdaptiveController
 * decides what plays when; this module schedules it sample-accurately on the
 * AudioContext clock, fades layers, plays stingers, ducks, emits callbacks
 * and handles loading, memory and the page/app lifecycle (hidden tabs, iOS
 * unlock and interruptions). Depends only on adaptive/ and core/.
 *
 * Network access: only fetch() of the manifest and stem files from URLs the
 * game passes in.
 */

import { assertValidManifest, filesOf, residentFiles } from '../adaptive/manifest.js';
import { AdaptiveController } from '../adaptive/controller.js';
import { decodeWav } from '../core/wav-decode.js';

/** @typedef {import('../adaptive/manifest.js').StemManifest} StemManifest */
/** @typedef {import('../adaptive/controller.js').Action} Action */
/** @typedef {import('../adaptive/controller.js').StateRequest} StateRequest */

/**
 * @typedef {object} StemPlayerOptions
 * @property {BaseAudioContext} audioContext
 * @property {StemManifest | string} manifest manifest object or URL
 * @property {string} [baseUrl] where stem files live (default: next to the manifest URL)
 * @property {Record<string, AudioBuffer | { sampleRate: number, channels: Float32Array[] }>} [buffers]
 *   already available audio (render-on-load); missing files are loaded from baseUrl
 * @property {(file: string) => Promise<AudioBuffer>} [load] custom loader
 * @property {'desktop' | 'mobile' | 'auto'} [profile] mobile: only the current state and its
 *   neighbours stay in memory (default "auto")
 * @property {AudioNode} [destination] default: audioContext.destination
 * @property {number} [volume] 0…1 (default 1)
 * @property {number | string} [seed] for shuffled segment order
 * @property {boolean} [pauseWhenHidden] pause while the page is hidden (default true)
 * @property {'playback' | 'ambient' | null} [audioSession] iOS 17+: "playback" also plays with the
 *   silent switch on, "ambient" respects it; null leaves the browser default (default null)
 * @property {boolean} [limiter] safety limiter on the output (default true); stems are already
 *   mastered, it only catches stingers on top of loud music
 * @property {'auto' | 'manual'} [tick] "manual": no internal timer, the host calls tick()
 *   regularly (e.g. from its game loop, at least every 100 ms); default "auto"
 */

const TICK_MS = 25;

export class StemPlayer {
  /**
   * Use createStemPlayer(); the constructor does not load anything.
   * @param {StemPlayerOptions & { manifest: StemManifest }} options
   */
  constructor(options) {
    const ctx = options.audioContext;
    this.ctx = ctx;
    /** @type {StemManifest} */
    this.manifest = structuredClone(options.manifest);
    this.baseUrl = options.baseUrl ?? '';
    this.customLoad = options.load ?? null;
    this.profile = options.profile === 'auto' || options.profile === undefined ? detectProfile() : options.profile;
    this.controller = new AdaptiveController(this.manifest, { seed: options.seed ?? 0 });
    this.pauseWhenHidden = options.pauseWhenHidden ?? true;
    this.audioSession = options.audioSession ?? null;
    this.manualTick = options.tick === 'manual';

    // Graph: layers → duck → master volume → safety limiter → destination; stingers bypass the duck.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -1.5;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.12;
    this.limiter.connect(options.destination ?? ctx.destination);
    this.volumeNode = ctx.createGain();
    this.volumeNode.gain.value = options.volume ?? 1;
    this.volumeNode.connect(options.limiter === false ? options.destination ?? ctx.destination : this.limiter);
    this.duckNode = ctx.createGain();
    this.duckNode.connect(this.volumeNode);
    this.stingerBus = ctx.createGain();
    this.stingerBus.connect(this.volumeNode);
    /** @type {Map<string, GainNode>} */
    this.layerNodes = new Map();
    for (const name of [...Object.keys(this.manifest.layers), 'all']) {
      const g = ctx.createGain();
      g.gain.value = name === 'all' ? 1 : 0;
      g.connect(this.duckNode);
      this.layerNodes.set(name, g);
    }

    /** @type {Map<string, AudioBuffer>} */
    this.buffers = new Map();
    /** @type {Map<string, Promise<AudioBuffer>>} */
    this.loading = new Map();
    for (const [file, b] of Object.entries(options.buffers ?? {})) this.addBuffer(file, b);

    /** @type {Map<number, { body: { src: AudioBufferSourceNode, fade: GainNode }[], tails: { src: AudioBufferSourceNode, fade: GainNode }[], live: number }>} */
    this.voices = new Map();
    /** @type {Map<string, Set<(data: any) => void>>} */
    this.listeners = new Map();
    this.lastEventTime = -Infinity;
    /** @type {ReturnType<typeof setInterval> | null} */
    this.timer = null;
    this.hiddenPause = false;
    this.disposed = false;
    this.#installLifecycle();
  }

  /** Current (or next) state. */
  get state() {
    return this.controller.state;
  }

  get playing() {
    return this.controller.running;
  }

  /**
   * Subscribes to an event: "state" { from, to, time }, "bar" { bar, segment, state, time },
   * "stinger" { name, time }, "load" { loaded, total }, "error" Error, "ended".
   * `time` is on the AudioContext clock (events fire up to ~30 ms early).
   * @param {string} event
   * @param {(data: any) => void} fn
   * @returns {() => void} unsubscribe
   */
  on(event, fn) {
    let set = this.listeners.get(event);
    if (!set) this.listeners.set(event, (set = new Set()));
    set.add(fn);
    return () => set?.delete(fn);
  }

  /**
   * Adds decoded audio (or raw channels) for a file name.
   * @param {string} file
   * @param {AudioBuffer | { sampleRate: number, channels: Float32Array[] }} data
   */
  addBuffer(file, data) {
    let buffer;
    if ('getChannelData' in data) buffer = data;
    else {
      buffer = this.ctx.createBuffer(data.channels.length, data.channels[0].length, data.sampleRate);
      data.channels.forEach((ch, c) => buffer.copyToChannel(ch, c));
    }
    this.buffers.set(file, buffer);
    this.#syncDurations(file, buffer);
  }

  /**
   * Loads all files of the given states (plus bridges leaving them and all stingers).
   * @param {string[]} states
   */
  async preload(states) {
    const files = new Set();
    for (const s of states) for (const f of residentFiles(this.manifest, s)) files.add(f);
    for (const s of states) for (const f of filesOf(this.manifest, { segments: this.manifest.states[s].segments })) files.add(f);
    await this.#loadFiles([...files]);
  }

  /**
   * Starts the music (initial state unless given). Resolves when the first notes are scheduled.
   * @param {{ state?: string, fadeInSec?: number }} [options]
   */
  async start({ state = this.controller.state ?? this.manifest.initial, fadeInSec = 0 } = {}) {
    await this.#ensureState(state);
    this.#unlock();
    this.#exec(this.controller.start(this.ctx.currentTime, { state, fadeInSec }));
    this.#startTimer();
    this.#tick();
  }

  /**
   * Changes the state at the next quantization point of the transition rule.
   * Resolves when the change is scheduled (after loading, if needed).
   * @param {string} name
   * @param {StateRequest} [options]
   */
  async setState(name, options = {}) {
    await this.#ensureState(name);
    if (this.disposed) return;
    this.#exec(this.controller.requestState(name, this.ctx.currentTime, options));
    this.#tick();
  }

  /**
   * Sets game parameters (e.g. intensity 0…1); layers follow smoothly.
   * @param {Record<string, number>} values
   * @param {{ smoothing?: number }} [options] smoothing time constant in seconds
   */
  setParams(values, { smoothing } = {}) {
    this.controller.setParams(values, this.ctx.currentTime, smoothing);
    this.#applyLayers(0);
  }

  /**
   * Plays a stinger in the key of the music, quantized (default: next beat).
   * @param {string} name
   * @param {{ at?: import('../adaptive/manifest.js').Quantize, gainDb?: number }} [options]
   */
  stinger(name, options = {}) {
    this.#exec(this.controller.stinger(name, this.ctx.currentTime, options));
  }

  /**
   * Lowers the music (not the stingers), e.g. under dialogue.
   * @param {number} [level] gain while ducked (default 0.5)
   * @param {{ attack?: number, hold?: number, release?: number }} [options] hold = Infinity until unduck()
   */
  duck(level = 0.5, { attack = 0.1, hold = 1, release = 0.8 } = {}) {
    const g = this.duckNode.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.setTargetAtTime(Math.max(0, Math.min(1, level)), now, Math.max(0.005, attack / 3));
    if (Number.isFinite(hold)) g.setTargetAtTime(1, now + attack + hold, Math.max(0.005, release / 3));
  }

  /** @param {{ release?: number }} [options] */
  unduck({ release = 0.8 } = {}) {
    const g = this.duckNode.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.setTargetAtTime(1, now, Math.max(0.005, release / 3));
  }

  /**
   * @param {number} volume 0…1
   * @param {{ rampSec?: number }} [options]
   */
  setVolume(volume, { rampSec = 0.1 } = {}) {
    const g = this.volumeNode.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + Math.max(0.005, rampSec));
  }

  /** Pauses the music (keeps the position); the AudioContext keeps running for SFX. */
  pause() {
    this.#exec(this.controller.pause(this.ctx.currentTime));
  }

  /** Continues after pause(). */
  resume() {
    this.#exec(this.controller.resume(this.ctx.currentTime));
    this.#tick();
  }

  /**
   * Fades out and stops.
   * @param {number} [sec]
   */
  fadeOut(sec = 2) {
    this.#exec(this.controller.stop(this.ctx.currentTime, sec));
  }

  stop() {
    this.fadeOut(0.05);
  }

  /** Stops everything and releases nodes, buffers, timers and listeners. */
  dispose() {
    this.stop();
    this.disposed = true;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.#removeLifecycle();
    for (const id of [...this.voices.keys()]) this.#killVoice(id, 0);
    this.buffers.clear();
    this.limiter.disconnect();
    this.volumeNode.disconnect();
    this.listeners.clear();
  }

  // ── internals ──────────────────────────────────────────────────────────

  /**
   * Reports an error to "error" listeners (used for background loading).
   * @param {unknown} err
   */
  reportError(err) {
    this.#emit('error', err);
  }

  /** @param {string} event @param {any} data */
  #emit(event, data) {
    for (const fn of this.listeners.get(event) ?? []) {
      try {
        fn(data);
      } catch (err) {
        if (event !== 'error') this.#emit('error', err);
      }
    }
  }

  #startTimer() {
    if (!this.manualTick && this.timer === null && !this.disposed) this.timer = setInterval(() => this.#tick(), TICK_MS);
  }

  /**
   * Advances scheduling, layer fades and callbacks (only needed with `tick: 'manual'`).
   * @param {number} [horizonSec] how far ahead to schedule (default 0.3 s; longer for offline rendering)
   */
  tick(horizonSec) {
    this.#tick(horizonSec);
  }

  /** @param {number} [horizonSec] */
  #tick(horizonSec) {
    if (this.disposed) return;
    const now = this.ctx.currentTime;
    const hidden = typeof document !== 'undefined' && document.hidden;
    this.#exec(this.controller.update(now, horizonSec ?? (hidden ? 1.5 : 0.3)));
    this.#applyLayers(0.03);
    // Bar callbacks shortly before they sound (with the exact time attached).
    const until = now + 0.03;
    for (const b of this.controller.barsBetween(Math.max(this.lastEventTime, now - 0.2), until)) this.#emit('bar', b);
    this.lastEventTime = until;
  }

  /** @param {number} ahead */
  #applyLayers(ahead) {
    const now = this.ctx.currentTime;
    for (const [name, { gain, rampSec }] of Object.entries(this.controller.layerGains(now + ahead))) {
      const node = this.layerNodes.get(name);
      if (node) node.gain.setTargetAtTime(gain, now, Math.max(0.01, rampSec / 3));
    }
  }

  /** @param {Action[]} actions */
  #exec(actions) {
    for (const a of actions) {
      switch (a.type) {
        case 'play':
          this.#play(a.id, a.segment, a.time, a.offset, a.fadeInSec);
          break;
        case 'tail':
          this.#tail(a.id, a.segment, a.time);
          break;
        case 'fade':
          this.#fade(a.id, a.time, a.durationSec);
          break;
        case 'cancel':
          this.#killVoice(a.id, 0);
          break;
        case 'stinger':
          this.#playStinger(a);
          break;
        case 'state':
          this.#emit('state', { from: a.from, to: a.to, time: a.time });
          if (this.profile === 'mobile') this.#manageMemory(a.to);
          break;
        default:
      }
    }
  }

  /**
   * @param {AudioBuffer} buffer
   * @param {string} layer
   * @param {number} time
   * @param {number} offset
   * @param {number} fadeInSec
   */
  #source(buffer, layer, time, offset, fadeInSec) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const fade = ctx.createGain();
    if (fadeInSec > 0) {
      fade.gain.setValueAtTime(0, time);
      fade.gain.linearRampToValueAtTime(1, time + fadeInSec);
    }
    src.connect(fade);
    fade.connect(/** @type {GainNode} */ (this.layerNodes.get(layer) ?? this.layerNodes.get('all')));
    // Late (e.g. after a stalled tab): start now, at the position the music has reached.
    src.start(Math.max(time, ctx.currentTime), Math.max(0, offset + Math.max(0, ctx.currentTime - time)));
    return { src, fade };
  }

  /**
   * @param {number} id
   * @param {{ src: AudioBufferSourceNode, fade: GainNode }} v
   * @param {'body' | 'tails'} part
   */
  #attach(id, v, part) {
    const voice = this.#voice(id);
    voice[part].push(v);
    voice.live++;
    v.src.onended = () => {
      if (--voice.live > 0 || this.voices.get(id) !== voice) return;
      this.#killVoice(id, 0);
      if (this.voices.size === 0 && !this.controller.running && this.controller.started) this.#emit('ended', {});
    };
  }

  /**
   * @param {number} id @param {string} segment @param {number} time @param {number} offset @param {number} fadeInSec
   */
  #play(id, segment, time, offset, fadeInSec) {
    for (const [layer, f] of Object.entries(this.manifest.segments[segment].files)) {
      const buffer = this.buffers.get(f.body);
      if (!buffer) {
        this.#emit('error', new Error(`Stem not loaded: ${f.body}`));
        continue;
      }
      if (offset >= buffer.duration) continue;
      this.#attach(id, this.#source(buffer, layer, time, offset, fadeInSec), 'body');
    }
  }

  /** @param {number} id @param {string} segment @param {number} time */
  #tail(id, segment, time) {
    for (const [layer, f] of Object.entries(this.manifest.segments[segment].files)) {
      const buffer = f.tail ? this.buffers.get(f.tail) : undefined;
      if (!buffer) continue;
      this.#attach(id, this.#source(buffer, layer, time, 0, 0), 'tails');
    }
  }

  /** @param {number} id @param {number} time @param {number} durationSec */
  #fade(id, time, durationSec) {
    const voice = this.voices.get(id);
    if (!voice) return;
    const t = Math.max(time, this.ctx.currentTime);
    for (const { src, fade } of voice.body) {
      fade.gain.cancelScheduledValues(t);
      fade.gain.setValueAtTime(fade.gain.value, t);
      fade.gain.linearRampToValueAtTime(0, t + durationSec);
      safeStop(src, t + durationSec + 0.02);
    }
    // Its tail belonged to the natural end, which no longer happens.
    for (const { src } of voice.tails) safeStop(src, t);
  }

  /** @param {number} id @param {number} when */
  #killVoice(id, when) {
    const voice = this.voices.get(id);
    if (!voice) return;
    for (const { src, fade } of [...voice.body, ...voice.tails]) {
      safeStop(src, when);
      src.disconnect();
      fade.disconnect();
    }
    this.voices.delete(id);
  }

  /** @param {number} id */
  #voice(id) {
    let v = this.voices.get(id);
    if (!v) this.voices.set(id, (v = { body: [], tails: [], live: 0 }));
    return v;
  }

  /** @param {Extract<Action, { type: 'stinger' }>} a */
  #playStinger(a) {
    const buffer = this.buffers.get(a.file);
    if (!buffer) {
      this.#emit('error', new Error(`Stinger not loaded: ${a.file}`));
      return;
    }
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    g.gain.value = 10 ** (a.gainDb / 20);
    src.connect(g);
    g.connect(this.stingerBus);
    const t = Math.max(a.time, ctx.currentTime);
    src.start(t);
    src.onended = () => {
      src.disconnect();
      g.disconnect();
    };
    if (a.duckDb > 0) {
      const d = this.duckNode.gain;
      d.setTargetAtTime(10 ** (-a.duckDb / 20), t, 0.03);
      d.setTargetAtTime(1, t + a.durationSec * 0.6, 0.3);
    }
    this.#emit('stinger', { name: a.name, time: t });
  }

  /** @param {string} state */
  async #ensureState(state) {
    if (!Object.hasOwn(this.manifest.states, state)) throw new RangeError(`Unknown state "${state}"`);
    const files = filesOf(this.manifest, { segments: this.manifest.states[state].segments });
    for (const t of this.manifest.transitions ?? []) {
      if (t.via && t.to === state && (t.from === this.controller.state || t.from === '*')) files.push(...filesOf(this.manifest, { segments: [t.via] }));
    }
    await this.#loadFiles(files);
    // Neighbours and stingers in the background.
    this.#loadFiles(residentFiles(this.manifest, state)).catch((err) => this.reportError(err));
  }

  /** @param {string[]} files */
  async #loadFiles(files) {
    const missing = files.filter((f) => !this.buffers.has(f));
    if (missing.length === 0) return;
    let loaded = 0;
    await Promise.all(
      missing.map(async (f) => {
        let p = this.loading.get(f);
        if (!p) {
          p = this.#loadOne(f);
          this.loading.set(f, p);
        }
        try {
          const buffer = await p;
          if (!this.buffers.has(f)) {
            this.buffers.set(f, buffer);
            this.#syncDurations(f, buffer);
          }
        } finally {
          this.loading.delete(f);
        }
        loaded++;
        this.#emit('load', { loaded, total: missing.length, file: f });
      }),
    );
  }

  /** @param {string} file */
  async #loadOne(file) {
    if (this.customLoad) return this.customLoad(file);
    const res = await fetch(new URL(file, this.baseUrl || undefined));
    if (!res.ok) throw new Error(`Loading ${file} failed: HTTP ${res.status}`);
    const bytes = await res.arrayBuffer();
    // WAV keeps its own rate (decodeAudioData would resample to the context rate and use
    // more memory); compressed formats go through the browser decoder.
    if (/\.wav$/i.test(file)) {
      const { sampleRate, channels } = decodeWav(new Uint8Array(bytes));
      const buffer = this.ctx.createBuffer(channels.length, Math.max(1, channels[0].length), sampleRate);
      channels.forEach((ch, c) => buffer.copyToChannel(ch, c));
      return buffer;
    }
    return this.ctx.decodeAudioData(bytes);
  }

  /**
   * Decoding may resample to the context rate; segment lengths follow the actual buffers so
   * consecutive segments meet sample-exactly.
   * @param {string} file
   * @param {AudioBuffer} buffer
   */
  #syncDurations(file, buffer) {
    for (const seg of Object.values(this.manifest.segments)) {
      if (Object.values(seg.files).some((f) => f.body === file)) seg.durationSec = buffer.duration;
    }
  }

  /**
   * Mobile profile: keep only what the current state can reach.
   * @param {string} state
   */
  #manageMemory(state) {
    const keep = new Set(residentFiles(this.manifest, state));
    for (const f of filesOf(this.manifest, { segments: this.manifest.states[state].segments })) keep.add(f);
    // Music still sounding (fading out) keeps its buffers through its source nodes.
    for (const f of [...this.buffers.keys()]) if (!keep.has(f)) this.buffers.delete(f);
    this.#loadFiles([...keep]).catch((err) => this.reportError(err));
  }

  // Lifecycle: hidden pages, iOS unlock, interruptions.

  #onVisibility = () => {
    if (!this.pauseWhenHidden || typeof document === 'undefined') return;
    if (document.hidden && this.controller.running) {
      this.hiddenPause = true;
      this.pause();
    } else if (!document.hidden && this.hiddenPause) {
      this.hiddenPause = false;
      this.#unlock();
      this.resume();
    }
  };

  #onGesture = () => {
    const ctx = /** @type {AudioContext} */ (this.ctx);
    if (typeof ctx.resume === 'function' && ctx.state !== 'running' && ctx.state !== 'closed') {
      ctx.resume().catch(() => {});
    }
    if (ctx.state === 'running') this.#removeGestureListeners();
  };

  #onStateChange = () => {
    // iOS reports "interrupted" (calls, Siri) or "suspended"; resume on the next gesture.
    if (this.ctx.state !== 'running' && this.ctx.state !== 'closed') this.#addGestureListeners();
  };

  #installLifecycle() {
    if (typeof document !== 'undefined') document.addEventListener('visibilitychange', this.#onVisibility);
    this.ctx.addEventListener?.('statechange', this.#onStateChange);
  }

  #removeLifecycle() {
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', this.#onVisibility);
    this.ctx.removeEventListener?.('statechange', this.#onStateChange);
    this.#removeGestureListeners();
  }

  #addGestureListeners() {
    if (typeof window === 'undefined') return;
    for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) window.addEventListener(ev, this.#onGesture, { capture: true });
  }

  #removeGestureListeners() {
    if (typeof window === 'undefined') return;
    for (const ev of ['pointerdown', 'touchend', 'keydown', 'click']) window.removeEventListener(ev, this.#onGesture, { capture: true });
  }

  /** Tries to run the context now and otherwise on the next user gesture. */
  #unlock() {
    const nav = /** @type {any} */ (typeof navigator !== 'undefined' ? navigator : null);
    if (this.audioSession && nav?.audioSession) {
      try {
        nav.audioSession.type = this.audioSession;
      } catch {
        // not supported: keep the default
      }
    }
    if (this.ctx.state !== 'running') {
      this.#onGesture();
      this.#addGestureListeners();
    }
  }
}

/**
 * @param {AudioBufferSourceNode} src
 * @param {number} when
 */
function safeStop(src, when) {
  try {
    src.stop(when);
  } catch {
    // never started or already stopped
  }
}

/** Mobile when the device reports little memory or is a phone/tablet. */
export function detectProfile() {
  const nav = /** @type {any} */ (typeof navigator !== 'undefined' ? navigator : null);
  if (!nav) return 'desktop';
  if (nav.userAgentData?.mobile) return 'mobile';
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) return 'mobile';
  const ua = String(nav.userAgent ?? '');
  // iPadOS reports a desktop Safari user agent; touch support gives it away.
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints ?? 0) > 1)) return 'mobile';
  return 'desktop';
}

/**
 * Creates a stem player: loads and validates the manifest, loads the initial state
 * (the rest follows in the background) and returns the ready player. Call start()
 * after a user gesture (browsers start audio only then).
 * @param {StemPlayerOptions} options
 * @returns {Promise<StemPlayer>}
 */
export async function createStemPlayer(options) {
  let manifest = options.manifest;
  let baseUrl = options.baseUrl;
  if (typeof manifest === 'string') {
    const url = new URL(manifest, typeof location !== 'undefined' ? location.href : undefined);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Loading the manifest failed: HTTP ${res.status}`);
    manifest = /** @type {StemManifest} */ (await res.json());
    baseUrl ??= new URL('.', url).href;
  }
  assertValidManifest(manifest);
  const player = new StemPlayer({ ...options, manifest, ...(baseUrl !== undefined ? { baseUrl } : {}) });
  const initial = manifest.initial;
  await player.preload([initial]);
  if (player.profile === 'desktop') {
    player.preload(Object.keys(manifest.states)).catch((err) => player.reportError(err));
  }
  return player;
}
