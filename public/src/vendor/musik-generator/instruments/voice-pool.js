// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Polyphonic voice management shared by all instrument engines.
 *
 * Click-free voice stealing: the pool holds a few spare voices beyond the
 * polyphony limit. When the limit is reached, the victim gets a very fast
 * release (≈ 4 ms) while the new note starts on a spare voice, so no voice is
 * ever cut off abruptly. Mono mode plays legato with glide.
 */

/**
 * @typedef {object} NoteOptions
 * @property {string} [articulation] e.g. "staccato", "legato", "accent"
 * @property {number} [durationSec] known note length (offline rendering, risers)
 */

/**
 * @typedef {object} Voice
 * @property {boolean} active
 * @property {boolean} released note-off received (or stealing)
 * @property {boolean} stealing fast release in progress
 * @property {number} pitch
 * @property {number} age start order (higher = newer)
 * @property {(pitch: number, velocity: number, options: NoteOptions) => void} noteOn
 * @property {() => void} noteOff
 * @property {() => void} steal fast release
 * @property {(pitch: number, velocity: number) => void} [legato] mono glide to a new pitch
 * @property {() => number} level current amplitude estimate (for steal decisions)
 * @property {(L: Float32Array, R: Float32Array, start: number, end: number) => void} render adds into L/R
 */

/**
 * @typedef {object} Instrument
 * @property {object} preset
 * @property {(pitch: number, velocity: number, options?: NoteOptions) => void} noteOn
 * @property {(pitch: number) => void} noteOff
 * @property {() => void} allNotesOff
 * @property {(L: Float32Array, R: Float32Array, start: number, end: number) => void} render adds into L/R
 * @property {() => number} activeVoices
 */

/** @implements {Instrument} */
export class PolyInstrument {
  /**
   * @param {object} preset
   * @param {(index: number) => Voice} createVoice
   * @param {{ polyphony?: number, mono?: boolean, spare?: number,
   *           post?: { process: (L: Float32Array, R: Float32Array, start: number, end: number) => void } | null }} [options]
   */
  constructor(preset, createVoice, { polyphony = 12, mono = false, spare = 4, post = null } = {}) {
    this.preset = preset;
    this.polyphony = mono ? 1 : polyphony;
    this.mono = mono;
    this.voices = Array.from({ length: this.polyphony + spare }, (_, i) => createVoice(i));
    this.post = post;
    this.counter = 0;
    /** @type {Voice | null} */
    this.monoVoice = null;
    /** @type {number[]} held pitches in mono mode (last-note priority) */
    this.held = [];
  }

  /**
   * @param {number} pitch
   * @param {number} velocity 0…1
   * @param {NoteOptions} [options]
   */
  noteOn(pitch, velocity, options = {}) {
    if (this.mono) {
      this.held = this.held.filter((p) => p !== pitch);
      this.held.push(pitch);
      const v = this.monoVoice;
      if (v && v.active && !v.released && v.legato) {
        v.legato(pitch, velocity);
        return;
      }
      if (v && v.active) v.steal();
    }
    let sounding = 0;
    /** @type {Voice | null} */
    let free = null;
    for (const v of this.voices) {
      if (!v.active) free ??= v;
      else if (!v.stealing) sounding++;
    }
    if (sounding >= this.polyphony) {
      // Prefer released voices (quietest first), otherwise the oldest note.
      /** @type {Voice | null} */
      let victim = null;
      for (const v of this.voices) {
        if (!v.active || v.stealing) continue;
        if (!victim) victim = v;
        else if (v.released !== victim.released) {
          if (v.released) victim = v;
        } else if (v.released ? v.level() < victim.level() : v.age < victim.age) victim = v;
      }
      victim?.steal();
    }
    if (!free) {
      // All spares busy (extremely dense input): reuse the quietest voice.
      free = this.voices.reduce((a, b) => (b.level() < a.level() ? b : a));
    }
    free.age = ++this.counter;
    free.noteOn(pitch, velocity, options);
    if (this.mono) this.monoVoice = free;
  }

  /** @param {number} pitch */
  noteOff(pitch) {
    if (this.mono) {
      this.held = this.held.filter((p) => p !== pitch);
      const v = this.monoVoice;
      if (v && v.active && !v.released) {
        // Return to the previously held note, or release.
        if (this.held.length > 0 && v.legato) v.legato(this.held[this.held.length - 1], 0.7);
        else if (this.held.length === 0) v.noteOff();
      }
      return;
    }
    for (const v of this.voices) if (v.active && !v.released && v.pitch === pitch) v.noteOff();
  }

  allNotesOff() {
    this.held = [];
    for (const v of this.voices) if (v.active) v.noteOff();
  }

  activeVoices() {
    let n = 0;
    for (const v of this.voices) if (v.active) n++;
    return n;
  }

  /**
   * @param {Float32Array} L
   * @param {Float32Array} R
   * @param {number} start
   * @param {number} end
   */
  render(L, R, start, end) {
    for (const v of this.voices) if (v.active) v.render(L, R, start, end);
    if (this.post) this.post.process(L, R, start, end);
  }
}

/**
 * Per-note random variation ("round robin" replacement): small, bounded,
 * deterministic deviations so repeated notes never sound identical.
 * @param {import('../core/prng.js').Rng} rng
 * @param {number} amount scale (cents, octaves, ratio …)
 */
export const vary = (rng, amount) => (amount > 0 ? rng.normal(0, amount / 2) : 0);
