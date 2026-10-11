// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Adaptive music controller: a pure state machine on an external clock
 * (seconds, e.g. AudioContext.currentTime). It decides *what* plays *when*
 * – segment sequencing, quantized state changes, bridges, fades, stingers,
 * hysteresis, smoothed parameters and layer gains – and returns actions that a
 * player executes (the stem player schedules them with Web Audio). No audio
 * APIs here, so the logic is fully testable offline. Depends only on core/.
 */

import { Rng } from '../core/prng.js';

/** @typedef {import('./manifest.js').StemManifest} StemManifest */
/** @typedef {import('./manifest.js').Quantize} Quantize */

/**
 * @typedef {{ type: 'play', id: number, segment: string, time: number, offset: number, fadeInSec: number }
 *   | { type: 'tail', id: number, segment: string, time: number }
 *   | { type: 'fade', id: number, time: number, durationSec: number }
 *   | { type: 'cancel', id: number }
 *   | { type: 'stinger', name: string, file: string, time: number, durationSec: number, gainDb: number, duckDb: number }
 *   | { type: 'state', from: string | null, to: string, time: number }} Action
 */

/**
 * @typedef {object} StateRequest
 * @property {Quantize} [at] overrides the transition rule
 * @property {string | null} [via] bridge segment, null = none (overrides the rule)
 * @property {number} [fadeSec]
 * @property {number} [fadeInSec]
 * @property {string | null} [stinger]
 * @property {boolean} [force] ignore the minimum time in the current state
 */

/**
 * @typedef {object} Instance
 * @property {number} id
 * @property {string} segment
 * @property {string} state state the music belongs to (the target state for bridges)
 * @property {'segment' | 'bridge'} kind
 * @property {number} start (virtual) start time of the segment's beginning
 * @property {number} end start + duration, or the cut time
 * @property {number} index position in the state's segment list
 * @property {number} played segments of this state played so far including this one
 * @property {boolean} cut ended early (fade) or its successor is decided
 * @property {boolean} tailed its tail is scheduled
 */

/** Minimum time between deciding and starting a sound (scheduling safety). */
const DEFAULT_LEAD = 0.06;
/** Fade used when music is cut without an explicit fade time. */
const CUT_FADE = 0.05;

export class AdaptiveController {
  /**
   * @param {StemManifest} manifest a validated manifest
   * @param {{ seed?: number | string, lead?: number }} [options]
   */
  constructor(manifest, { seed = 0, lead = DEFAULT_LEAD } = {}) {
    this.m = manifest;
    this.rng = new Rng(seed, 'adaptive');
    this.lead = lead;
    /** @type {Instance[]} */
    this.timeline = [];
    this.nextId = 1;
    /** @type {string | null} */
    this.state = null;
    this.enteredAt = 0;
    /** @type {{ to: string, opts: StateRequest } | null} */
    this.pending = null;
    this.running = false;
    /** start() was called and stop() was not (music may have ended after a one-shot) */
    this.started = false;
    /** @type {Map<string, { from: number, target: number, t0: number, tau: number }>} */
    this.paramState = new Map();
    for (const [name, p] of Object.entries(manifest.params ?? {})) {
      const v = p.default ?? 0;
      this.paramState.set(name, { from: v, target: v, t0: 0, tau: 0 });
    }
    /** @type {Map<string, boolean>} */
    this.switchOn = new Map();
    /** @type {{ instance: Instance, offset: number } | null} */
    this.paused = null;
  }

  get minStateSeconds() {
    return this.m.hysteresis?.minStateSeconds ?? 0;
  }

  /**
   * Starts the music.
   * @param {number} now
   * @param {{ state?: string, fadeInSec?: number }} [options]
   * @returns {Action[]}
   */
  start(now, { state = this.m.initial, fadeInSec = 0 } = {}) {
    this.#assertState(state);
    if (this.running) return [];
    this.running = true;
    this.started = true;
    this.pending = null;
    this.paused = null;
    const t = now + this.lead;
    /** @type {Action[]} */
    const actions = [{ type: 'state', from: null, to: state, time: t }];
    this.state = state;
    this.enteredAt = t;
    const inst = this.#push(this.#firstSegment(state), state, 'segment', t, 0, 1);
    actions.push(this.#play(inst, fadeInSec));
    return actions;
  }

  /**
   * Fades everything out and stops scheduling.
   * @param {number} now
   * @param {number} [fadeSec]
   * @returns {Action[]}
   */
  stop(now, fadeSec = CUT_FADE) {
    const actions = this.#cutAt(now + this.lead, Math.max(CUT_FADE, fadeSec));
    this.running = false;
    this.started = false;
    this.pending = null;
    this.paused = null;
    return actions;
  }

  /**
   * Stops playback, remembering the position for resume().
   * @param {number} now
   * @returns {Action[]}
   */
  pause(now) {
    if (!this.running) return [];
    const t = now + this.lead;
    const cur = this.#instanceAt(t);
    this.paused = cur ? { instance: cur, offset: Math.max(0, t - cur.start) } : null;
    const actions = this.#cutAt(t, CUT_FADE);
    this.running = false;
    return actions;
  }

  /**
   * Continues after pause() from the remembered position.
   * @param {number} now
   * @returns {Action[]}
   */
  resume(now) {
    if (this.running || !this.started || this.state === null) return [];
    if (!this.paused) return this.start(now, { state: this.state, fadeInSec: 0.15 }); // state changed while paused
    const { instance, offset } = this.paused;
    this.paused = null;
    this.running = true;
    const t = now + this.lead;
    const inst = this.#push(instance.segment, instance.state, instance.kind, t - offset, instance.index, instance.played);
    this.enteredAt = t;
    return [{ type: 'play', id: inst.id, segment: inst.segment, time: t, offset, fadeInSec: 0.15 }];
  }

  /**
   * Requests a state change. Quantization, bridge, fades and stinger come from the
   * manifest's transition rules (overridable). Within the minimum time in a state the
   * request is deferred; a newer request replaces it (no flutter).
   * @param {string} to
   * @param {number} now
   * @param {StateRequest} [opts]
   * @returns {Action[]}
   */
  requestState(to, now, opts = {}) {
    this.#assertState(to);
    if (!this.running) {
      if (this.started && !this.paused && to !== this.state) {
        // The music ended (one-shot without follow-up): start the new state.
        this.running = false;
        return this.start(now, { state: to });
      }
      // Not playing (yet, or paused): just choose the state to (re)start with.
      if (to !== this.state) this.paused = null;
      this.state = to;
      return [];
    }
    if (to === this.state) {
      this.pending = null;
      return [];
    }
    if (!opts.force && now + this.lead < this.enteredAt + this.minStateSeconds) {
      this.pending = { to, opts };
      return [];
    }
    this.pending = null;
    return this.#transition(to, now, opts);
  }

  /**
   * Advances the schedule: continues segments up to `now + horizon`, runs deferred
   * requests and one-shot follow-ups. Call regularly (e.g. every 25–100 ms).
   * @param {number} now
   * @param {number} [horizon] look-ahead in seconds
   * @returns {Action[]}
   */
  update(now, horizon = 0.3) {
    if (!this.running) return [];
    /** @type {Action[]} */
    const actions = [];
    if (this.pending && now + this.lead >= this.enteredAt + this.minStateSeconds) {
      const { to, opts } = this.pending;
      this.pending = null;
      if (to !== this.state) actions.push(...this.#transition(to, now, opts));
    }
    for (let guard = 0; guard < 64; guard++) {
      const last = this.#last();
      if (!last || last.cut || last.end > now + horizon) break;
      const next = this.#successor(last);
      if (!next) {
        // One-shot without follow-up: the music ends with its tail.
        actions.push(...this.#tail(last, last.end));
        last.cut = true;
        this.running = false;
        break;
      }
      actions.push(...this.#tail(last, last.end));
      if (next.state !== this.state && last.kind !== 'bridge') {
        actions.push({ type: 'state', from: this.state, to: next.state, time: last.end });
        this.state = next.state;
        this.enteredAt = last.end;
      }
      const inst = this.#push(next.segment, next.state, 'segment', last.end, next.index, next.played);
      actions.push(this.#play(inst, 0));
    }
    // Forget instances that ended long ago.
    while (this.timeline.length > 4 && this.timeline[0].end + 60 < now) this.timeline.shift();
    return actions;
  }

  /**
   * Plans a stinger at a quantized time in the key of the music playing then.
   * @param {string} name
   * @param {number} now
   * @param {{ at?: Quantize, gainDb?: number }} [opts]
   * @returns {Action[]}
   */
  stinger(name, now, { at = 'nextBeat', gainDb = 0 } = {}) {
    const s = this.m.stingers?.[name];
    if (!s) throw new RangeError(`Unknown stinger "${name}"`);
    const time = this.running ? this.boundary(at, now) : now + this.lead;
    const key = this.keyAt(time);
    const file = (key !== null ? s.byKey[key] : undefined) ?? s.byKey['*'] ?? Object.values(s.byKey)[0];
    return [{ type: 'stinger', name, file, time, durationSec: s.durationSec, gainDb: (s.gainDb ?? 0) + gainDb, duckDb: s.duckDb ?? 0 }];
  }

  /**
   * Sets parameter targets; values approach them exponentially.
   * @param {Record<string, number>} values
   * @param {number} now
   * @param {number} [smoothingSec] default: per-parameter setting from the manifest (1 s)
   */
  setParams(values, now, smoothingSec) {
    for (const [name, raw] of Object.entries(values)) {
      if (typeof raw !== 'number' || !Number.isFinite(raw)) throw new TypeError(`Parameter "${name}" must be a finite number`);
      const target = Math.min(1, Math.max(0, raw));
      const tau = smoothingSec ?? this.m.params?.[name]?.smoothingSec ?? 1;
      this.paramState.set(name, { from: this.paramAt(name, now), target, t0: now, tau });
    }
  }

  /**
   * Smoothed parameter value at time t.
   * @param {string} name
   * @param {number} t
   */
  paramAt(name, t) {
    const p = this.paramState.get(name);
    if (!p) return this.m.params?.[name]?.default ?? 0;
    if (p.tau <= 0 || t <= p.t0) return t <= p.t0 && p.tau > 0 ? p.from : p.target;
    return p.target + (p.from - p.target) * Math.exp(-(t - p.t0) / p.tau);
  }

  /**
   * Target gain (0…1) and ramp time per layer at time t. Switch-mode layers keep
   * their on/off state between calls (hysteresis), so call with increasing t.
   * @param {number} t
   * @returns {Record<string, { gain: number, rampSec: number }>}
   */
  layerGains(t) {
    /** @type {Record<string, { gain: number, rampSec: number }>} */
    const out = {};
    for (const [name, spec] of Object.entries(this.m.layers)) {
      if (spec.param === undefined) {
        out[name] = { gain: 1, rampSec: 0.05 };
        continue;
      }
      const v = this.paramAt(spec.param, t);
      const from = spec.from ?? 0;
      if (spec.mode === 'switch') {
        const was = this.switchOn.get(name) ?? v >= from;
        const on = was ? v >= from - (spec.hysteresis ?? 0.05) : v >= from;
        this.switchOn.set(name, on);
        out[name] = { gain: on ? 1 : 0, rampSec: spec.fadeSec ?? 1 };
      } else {
        const to = Math.max(from + 1e-6, spec.to ?? from + 0.2);
        const x = Math.min(1, Math.max(0, (v - from) / (to - from)));
        out[name] = { gain: x * x * (3 - 2 * x), rampSec: 0.05 };
      }
    }
    return out;
  }

  /**
   * Next quantization point after now (+ scheduling lead) in the music that plays then.
   * @param {Quantize} at
   * @param {number} now
   */
  boundary(at, now) {
    const t = now + this.lead;
    const cur = this.#instanceAt(t);
    if (!cur || at === 'immediate') return t;
    if (at === 'segmentEnd') return cur.end;
    const seg = this.m.segments[cur.segment];
    const bars = seg.barStarts.map((b) => cur.start + b);
    if (at === 'nextBar' || at === 'nextPhrase') {
      const every = at === 'nextPhrase' ? seg.phraseBars ?? 4 : 1;
      for (let i = 0; i < bars.length; i++) if (i % every === 0 && bars[i] >= t - 1e-9 && bars[i] < cur.end) return bars[i];
      return cur.end;
    }
    // nextBeat: bars divided evenly into beats.
    for (let i = 0; i < bars.length; i++) {
      const barEnd = i + 1 < bars.length ? bars[i + 1] : cur.start + seg.durationSec;
      const beat = (barEnd - bars[i]) / seg.beatsPerBar;
      for (let k = 0; k < seg.beatsPerBar; k++) {
        const bt = bars[i] + k * beat;
        if (bt >= t - 1e-9 && bt < cur.end) return bt;
      }
    }
    return cur.end;
  }

  /**
   * Bars that start in [t0, t1), for callbacks.
   * @param {number} t0
   * @param {number} t1
   * @returns {{ time: number, bar: number, segment: string, state: string, kind: 'segment' | 'bridge' }[]}
   */
  barsBetween(t0, t1) {
    const out = [];
    for (const inst of this.timeline) {
      if (inst.end <= t0 || inst.start >= t1) continue;
      const seg = this.m.segments[inst.segment];
      seg.barStarts.forEach((b, bar) => {
        const time = inst.start + b;
        if (time >= t0 && time < t1 && time < inst.end - 1e-9) out.push({ time, bar, segment: inst.segment, state: inst.state, kind: inst.kind });
      });
    }
    return out.sort((a, b) => a.time - b.time);
  }

  /**
   * Key of the music at time t ("D dorian"), null when silent.
   * @param {number} t
   */
  keyAt(t) {
    const inst = this.#instanceAt(t);
    return inst ? this.m.segments[inst.segment].key : null;
  }

  // ── internals ──────────────────────────────────────────────────────────

  /** @param {string} name */
  #assertState(name) {
    if (!Object.hasOwn(this.m.states, name)) throw new RangeError(`Unknown state "${name}"`);
  }

  #last() {
    return this.timeline.at(-1);
  }

  /** @param {number} t */
  #instanceAt(t) {
    for (let i = this.timeline.length - 1; i >= 0; i--) {
      const inst = this.timeline[i];
      if (inst.start <= t + 1e-9 && t < inst.end - 1e-9) return inst;
    }
    // Between instances (e.g. right at a boundary): the one starting next.
    return this.timeline.find((inst) => inst.start >= t && !inst.cut) ?? null;
  }

  /**
   * Tail action of an instance ending at `time` (once per instance).
   * @param {Instance} inst
   * @param {number} time
   * @returns {Action[]}
   */
  #tail(inst, time) {
    if (inst.tailed || !this.#hasTail(inst.segment)) return [];
    inst.tailed = true;
    return [{ type: 'tail', id: inst.id, segment: inst.segment, time }];
  }

  /** @param {string} segment */
  #hasTail(segment) {
    return Object.values(this.m.segments[segment].files).some((f) => f.tail !== undefined) && this.m.segments[segment].tailSec > 0;
  }

  /** @param {string} state */
  #firstSegment(state) {
    const st = this.m.states[state];
    return st.order === 'shuffle' ? this.rng.pick(st.segments) : st.segments[0];
  }

  /**
   * @param {string} segment
   * @param {string} state
   * @param {'segment' | 'bridge'} kind
   * @param {number} start
   * @param {number} index
   * @param {number} played
   */
  #push(segment, state, kind, start, index, played) {
    const seg = this.m.segments[segment];
    /** @type {Instance} */
    const inst = { id: this.nextId++, segment, state, kind, start, end: start + seg.durationSec, index, played, cut: false, tailed: false };
    this.timeline.push(inst);
    return inst;
  }

  /**
   * @param {Instance} inst
   * @param {number} fadeInSec
   * @returns {Action}
   */
  #play(inst, fadeInSec) {
    return { type: 'play', id: inst.id, segment: inst.segment, time: inst.start, offset: 0, fadeInSec };
  }

  /**
   * The segment following an instance (sequencing, one-shot follow-ups, bridge targets).
   * @param {Instance} last
   * @returns {{ segment: string, state: string, index: number, played: number } | null}
   */
  #successor(last) {
    if (last.kind === 'bridge') {
      const segment = this.#firstSegment(last.state);
      return { segment, state: last.state, index: this.m.states[last.state].segments.indexOf(segment), played: 1 };
    }
    const st = this.m.states[last.state];
    const n = st.segments.length;
    if (st.loop === false && last.played >= n) {
      if (st.then === undefined) return null;
      const segment = this.#firstSegment(st.then);
      return { segment, state: st.then, index: this.m.states[st.then].segments.indexOf(segment), played: 1 };
    }
    if (st.order === 'shuffle' && n > 1) {
      const others = st.segments.filter((s) => s !== last.segment);
      const segment = this.rng.pick(others);
      return { segment, state: last.state, index: st.segments.indexOf(segment), played: last.played + 1 };
    }
    const index = (last.index + 1) % n;
    return { segment: st.segments[index], state: last.state, index, played: last.played + 1 };
  }

  /**
   * Ends everything from time t on: cancels scheduled instances, fades the one playing.
   * @param {number} t
   * @param {number} fadeSec
   * @returns {Action[]}
   */
  #cutAt(t, fadeSec) {
    /** @type {Action[]} */
    const actions = [];
    for (const inst of this.timeline) {
      if (inst.cut && inst.end <= t) continue;
      if (inst.start >= t - 1e-9) {
        actions.push({ type: 'cancel', id: inst.id });
        inst.cut = true;
        inst.end = inst.start;
      } else if (inst.end > t + 1e-9) {
        actions.push({ type: 'fade', id: inst.id, time: t, durationSec: fadeSec });
        inst.cut = true;
        inst.end = t;
      }
    }
    this.timeline = this.timeline.filter((inst) => inst.end > inst.start);
    return actions;
  }

  /**
   * @param {string} from
   * @param {string} to
   */
  #rule(from, to) {
    const rules = this.m.transitions ?? [];
    return (
      rules.find((r) => r.from === from && r.to === to) ??
      rules.find((r) => r.from === from && r.to === '*') ??
      rules.find((r) => r.from === '*' && r.to === to) ??
      rules.find((r) => r.from === '*' && r.to === '*') ??
      null
    );
  }

  /**
   * @param {string} to
   * @param {number} now
   * @param {StateRequest} opts
   * @returns {Action[]}
   */
  #transition(to, now, opts) {
    const from = /** @type {string} */ (this.state);
    const rule = this.#rule(from, to);
    const at = opts.at ?? rule?.at ?? 'nextBar';
    const via = opts.via === undefined ? rule?.via : opts.via ?? undefined;
    const fadeSec = opts.fadeSec ?? rule?.fadeSec ?? (at === 'segmentEnd' ? 0 : 1);
    const fadeInSec = opts.fadeInSec ?? rule?.fadeInSec ?? 0;
    const stinger = opts.stinger === undefined ? rule?.stinger : opts.stinger ?? undefined;
    const T = this.boundary(at, now);
    /** @type {Action[]} */
    const actions = [];
    // At a segment boundary the old music ends naturally (with its tail), otherwise it fades.
    const cur = this.#instanceAt(T - 1e-6);
    const atEnd = !cur || Math.abs(cur.end - T) < 1e-6;
    actions.push(...this.#cutAt(T, Math.max(CUT_FADE, fadeSec)));
    if (atEnd && cur && !cur.cut) {
      actions.push(...this.#tail(cur, T));
      cur.cut = true; // its successor is decided here
    }
    actions.push({ type: 'state', from, to, time: T });
    this.state = to;
    if (via) {
      const bridge = this.#push(via, to, 'bridge', T, 0, 0);
      actions.push(this.#play(bridge, 0));
      this.enteredAt = T;
    } else {
      const inst = this.#push(this.#firstSegment(to), to, 'segment', T, 0, 1);
      actions.push(this.#play(inst, fadeInSec));
      this.enteredAt = T;
    }
    // A stinger leads into the new music, so it uses the new key.
    if (stinger) actions.push(...this.stinger(stinger, T - this.lead, { at: 'immediate' }));
    return actions;
  }
}
