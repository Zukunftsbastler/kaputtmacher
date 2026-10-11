// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Block-based stereo mixer: channels (one per instrument/track) with gain,
 * constant-power balance, insert effects, sends and optional sidechain
 * ducking; send-return buses (reverb, delay) and a master chain.
 * All buffers are allocated up front; process() allocates nothing.
 */

import { dbToGain, clamp, onePoleCoef } from './util.js';

/**
 * @typedef {object} Effect
 * @property {(L: Float32Array, R: Float32Array, start: number, end: number) => void} process
 */

/**
 * @typedef {object} ChannelOptions
 * @property {number} [gainDb]
 * @property {number} [pan] -1…1 balance
 * @property {Record<string, number>} [sends] bus id → send level (linear)
 * @property {Effect[]} [inserts] processed in order before the fader
 * @property {{ source: string, amountDb?: number, attackMs?: number, releaseMs?: number }} [duck]
 *   sidechain ducking keyed from another channel's pre-fader signal; the source
 *   channel must be added before this one
 */

export class MixerChannel {
  /**
   * @param {string} id
   * @param {number} blockSize
   * @param {number} sampleRate
   * @param {ChannelOptions} options
   */
  constructor(id, blockSize, sampleRate, options) {
    this.id = id;
    this.L = new Float32Array(blockSize);
    this.R = new Float32Array(blockSize);
    this.inserts = options.inserts ?? [];
    /** @type {[string, number][]} */
    this.sendSpec = Object.entries(options.sends ?? {});
    /** @type {{ L: Float32Array, R: Float32Array, level: number }[]} resolved by the mixer */
    this.sends = [];
    this.gain = dbToGain(options.gainDb ?? 0);
    this.setPan(options.pan ?? 0);
    this.duck = options.duck ?? null;
    // Sidechain ducking: an envelope follower on the key signal pulls the
    // channel gain down by up to amountDb ("pumping").
    this.duckFloor = this.duck ? dbToGain(-(this.duck.amountDb ?? 6)) : 1;
    this.duckAttack = onePoleCoef((this.duck?.attackMs ?? 3) / 1000, sampleRate);
    this.duckRelease = onePoleCoef((this.duck?.releaseMs ?? 180) / 1000, sampleRate);
    this.duckEnv = 0;
    this.muted = false;
  }

  /** @param {number} pan -1…1 */
  setPan(pan) {
    // Balance law: centre = unity on both sides, hard left = left only (+3 dB).
    const p = clamp(pan, -1, 1);
    const angle = ((p + 1) * Math.PI) / 4;
    this.gainL = Math.cos(angle) * Math.SQRT2;
    this.gainR = Math.sin(angle) * Math.SQRT2;
  }

  /** @param {number} db */
  setGainDb(db) {
    this.gain = dbToGain(db);
  }

  clear() {
    this.L.fill(0);
    this.R.fill(0);
  }
}

export class Mixer {
  /**
   * @param {number} sampleRate
   * @param {{ blockSize?: number, master?: Effect[] }} [options]
   */
  constructor(sampleRate, { blockSize = 128, master = [] } = {}) {
    this.sampleRate = sampleRate;
    this.blockSize = blockSize;
    /** @type {MixerChannel[]} */
    this.channels = [];
    /** @type {Map<string, MixerChannel>} */
    this.byId = new Map();
    /** @type {{ id: string, effects: Effect[], L: Float32Array, R: Float32Array, gain: number, asleep: boolean }[]} */
    this.buses = [];
    this.master = master;
    this.masterGain = 1;
    this.mixL = new Float32Array(blockSize);
    this.mixR = new Float32Array(blockSize);
  }

  /**
   * @param {string} id
   * @param {Effect[]} effects
   * @param {{ gainDb?: number }} [options]
   */
  addBus(id, effects, { gainDb = 0 } = {}) {
    this.buses.push({ id, effects, L: new Float32Array(this.blockSize), R: new Float32Array(this.blockSize), gain: dbToGain(gainDb), asleep: true });
  }

  /**
   * @param {string} id
   * @param {ChannelOptions} [options]
   * @returns {MixerChannel}
   */
  addChannel(id, options = {}) {
    if (this.byId.has(id)) throw new RangeError(`Mixer: duplicate channel "${id}"`);
    const ch = new MixerChannel(id, this.blockSize, this.sampleRate, options);
    for (const [busId, level] of ch.sendSpec) {
      const bus = this.buses.find((b) => b.id === busId);
      if (!bus) throw new RangeError(`Mixer: unknown bus "${busId}"`);
      if (level > 0) ch.sends.push({ L: bus.L, R: bus.R, level });
    }
    this.channels.push(ch);
    this.byId.set(id, ch);
    return ch;
  }

  /** @param {string} id */
  channel(id) {
    const ch = this.byId.get(id);
    if (!ch) throw new RangeError(`Mixer: unknown channel "${id}"`);
    return ch;
  }

  /** @param {Effect[]} effects */
  setMaster(effects) {
    this.master = effects;
  }

  /** Clears all channel buffers; call before instruments render the next block. */
  beginBlock() {
    for (const ch of this.channels) ch.clear();
  }

  /**
   * Mixes the current block (instruments have rendered into channel buffers).
   * @param {Float32Array} outL
   * @param {Float32Array} outR
   * @param {number} n frames (≤ blockSize)
   * @param {number} [offset] write offset into the output arrays
   */
  process(outL, outR, n, offset = 0) {
    for (const bus of this.buses) {
      bus.L.fill(0, 0, n);
      bus.R.fill(0, 0, n);
    }
    const mixL = this.mixL;
    const mixR = this.mixR;
    mixL.fill(0, 0, n);
    mixR.fill(0, 0, n);

    for (const ch of this.channels) {
      for (const fx of ch.inserts) fx.process(ch.L, ch.R, 0, n);
    }
    for (const ch of this.channels) {
      if (ch.muted) continue;
      if (ch.duck) {
        const src = this.byId.get(ch.duck.source);
        if (src) {
          const floor = ch.duckFloor;
          for (let i = 0; i < n; i++) {
            const k = Math.max(Math.abs(src.L[i]), Math.abs(src.R[i]));
            ch.duckEnv = k > ch.duckEnv ? k + (ch.duckEnv - k) * ch.duckAttack : k + (ch.duckEnv - k) * ch.duckRelease;
            // Full ducking from a key level of about −12 dBFS upwards.
            const amount = Math.min(1, ch.duckEnv * 4);
            const g = 1 - (1 - floor) * amount;
            ch.L[i] *= g;
            ch.R[i] *= g;
          }
        }
      }
      const gl = ch.gain * ch.gainL;
      const gr = ch.gain * ch.gainR;
      for (let i = 0; i < n; i++) {
        const l = ch.L[i] * gl;
        const r = ch.R[i] * gr;
        mixL[i] += l;
        mixR[i] += r;
      }
      for (const send of ch.sends) {
        const lv = send.level;
        for (let i = 0; i < n; i++) {
          send.L[i] += ch.L[i] * gl * lv;
          send.R[i] += ch.R[i] * gr * lv;
        }
      }
    }
    for (const bus of this.buses) {
      // A bus sleeps while its input is silent and its own output has decayed below −120 dB
      // (e.g. reverb of a stem layer that is not playing): exact enough, much cheaper.
      let input = 0;
      for (let i = 0; i < n; i++) input = Math.max(input, Math.abs(bus.L[i]), Math.abs(bus.R[i]));
      if (input === 0 && bus.asleep) continue;
      for (const fx of bus.effects) fx.process(bus.L, bus.R, 0, n);
      let output = 0;
      for (let i = 0; i < n; i++) output = Math.max(output, Math.abs(bus.L[i]), Math.abs(bus.R[i]));
      bus.asleep = input === 0 && output < 1e-6;
      for (let i = 0; i < n; i++) {
        mixL[i] += bus.L[i] * bus.gain;
        mixR[i] += bus.R[i] * bus.gain;
      }
    }
    if (this.masterGain !== 1) {
      for (let i = 0; i < n; i++) {
        mixL[i] *= this.masterGain;
        mixR[i] *= this.masterGain;
      }
    }
    for (const fx of this.master) fx.process(mixL, mixR, 0, n);
    for (let i = 0; i < n; i++) {
      outL[offset + i] = mixL[i];
      outR[offset + i] = mixR[i];
    }
  }
}
