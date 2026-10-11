// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Musical styles as pure data. A style combines a harmonic dialect, a
 * melodic profile, a form template, an arrangement (roles with instruments,
 * entry thresholds and intensity-dependent patterns), a drum groove, a mix
 * and default values for the character axes.
 * See docs/guides/STYLE_AUTHORING.md for writing new styles.
 */

import { DRUM_NOTES as D } from '../instruments/presets.js';

/**
 * @typedef {[type: 'intro' | 'A' | 'B' | 'C' | 'bridge' | 'breakdown' | 'climax' | 'outro', label: string, bars: number, intensity: number]} SectionSpec
 *   label: sections with the same label share material (harmony, melodic motif)
 */

/**
 * @typedef {object} RoleSpec
 * @property {string} instrument preset id
 * @property {number} [minIntensity] role plays from this section intensity on (default 0)
 * @property {number} [velocity]
 * @property {string[]} [sections] labels the role is limited to
 */

/**
 * @typedef {RoleSpec & {
 *   id: string,
 *   type: 'pad' | 'chords' | 'counter' | 'double' | 'ostinato' | 'timpani' | 'riffs',
 *   maxIntensity?: number,
 *   voicing?: import('../compose/harmony/voicing.js').VoicingStyle,
 *   comp?: import('../compose/accompaniment.js').CompPattern,
 *   position?: 'below' | 'above',
 *   octave?: number,
 *   pattern?: import('../compose/accompaniment.js').ArpPattern,
 *   rate?: number,
 *   octaves?: number,
 *   transpose?: number,
 *   center?: number,
 *   art?: string,
 *   mixRole?: string,
 * }} LayerSpec additional part: track id, part type, instrument and type-specific options
 *   (double: octave = semitone offset; riffs: center = register; art = articulation of all notes)
 */

/**
 * @typedef {object} Style
 * @property {string} id
 * @property {string} label
 * @property {string} description
 * @property {[number, number]} tempo bpm range
 * @property {{ num: number, den: number }} meter
 * @property {{ tonics: string[], modes: string[] }} keys
 * @property {{ dialect: string, chromaticism?: number, phraseBars?: number }} harmony
 * @property {{ templates: SectionSpec[][], loop?: boolean, ritardando?: boolean }} form
 * @property {{
 *   pad?: RoleSpec & { voicing?: import('../compose/harmony/voicing.js').VoicingStyle },
 *   chords?: RoleSpec & { voicing?: import('../compose/harmony/voicing.js').VoicingStyle, comp?: import('../compose/accompaniment.js').CompPattern },
 *   bass?: RoleSpec & { patterns: [number, import('../compose/bass.js').BassPattern][], range?: [number, number] },
 *   melody?: RoleSpec & { profile: string, octave?: number, ornaments?: number },
 *   counter?: RoleSpec,
 *   arp?: RoleSpec & { pattern: import('../compose/accompaniment.js').ArpPattern, rate: number, octaves?: number, transpose?: number },
 *   drums?: RoleSpec & { groove: import('../compose/rhythm/groove.js').Groove },
 *   drone?: RoleSpec,
 *   texture?: RoleSpec,
 *   fx?: { instrument: string, riser?: boolean, impact?: boolean, boom?: boolean },
 *   layers?: LayerSpec[],
 * }} roles
 *   melody.ornaments: amount 0…1 of folk grace notes (cuts)
 * @property {{ roles?: Record<string, import('../render/score-renderer.js').TrackMix>, reverb?: import('../dsp/effects/reverb.js').ReverbParams, delayBeats?: number }} mix
 * @property {Record<string, number>} axes default character axes (impact, space, pressure, pulse, drive, density, depth, texture)
 * @property {Record<string, Record<string, any>[]>} [variants] alternatives per role (partial role specs: other
 *   instrument, pattern, comp, profile …) that a recipe's `variety` lets the seed choose from
 * @property {{ arp?: string, texture?: string, drone?: string, sub?: string, boom?: string }} [axisInstruments]
 *   instruments of the parts the axes add (ostinato, texture, pedal, sub-bass, booms); default: synth sounds
 */

/** @type {Readonly<Record<string, Style>>} */
export const STYLES = Object.freeze({
  ambient: {
    id: 'ambient',
    label: 'Ambient / Erkundung',
    description: 'Schwebende Flächen, modale Harmonik, sparsame Glockenmelodie, viel Raum.',
    tempo: [64, 80],
    meter: { num: 4, den: 4 },
    keys: { tonics: ['F', 'D', 'A', 'E', 'C', 'G'], modes: ['lydian', 'ionian', 'dorian'] },
    harmony: { dialect: 'ambient', phraseBars: 8 },
    form: {
      templates: [
        [['intro', 'I', 4, 0.25], ['A', 'A', 8, 0.45], ['B', 'B', 8, 0.6], ['A', 'A', 8, 0.55], ['B', 'B', 8, 0.7], ['outro', 'O', 4, 0.3]],
        [['intro', 'I', 4, 0.2], ['A', 'A', 8, 0.4], ['A', 'A', 8, 0.55], ['B', 'B', 8, 0.65], ['A', 'A', 8, 0.5], ['outro', 'O', 4, 0.25]],
      ],
      loop: true,
      ritardando: true,
    },
    roles: {
      pad: { instrument: 'pad.glass', voicing: 'spread', velocity: 0.5 },
      chords: { instrument: 'pad.warm', voicing: 'pad', comp: 'swell', minIntensity: 0.5, velocity: 0.35 },
      bass: { instrument: 'bass.sub', patterns: [[0, 'root']], minIntensity: 0.35, velocity: 0.5, range: [33, 50] },
      melody: { instrument: 'keys.glass', profile: 'ambient', minIntensity: 0.3, sections: ['A', 'B'], octave: 0 },
      arp: { instrument: 'pluck.harp', pattern: 'updown', rate: 0.5, octaves: 2, minIntensity: 0.5, velocity: 0.42 },
      drums: {
        instrument: 'kit.lofi',
        minIntensity: 0.62,
        groove: {
          grid: 16,
          humanize: { timingMs: 8, velocity: 0.08 },
          layers: [
            { part: 'kick', note: D.kick, patterns: ['x.......x.......', 'x..........x....'], velocity: 0.5 },
            { part: 'shaker', note: D.shaker, patterns: ['o.o?o.o?o.o?o.o?'], velocity: 0.45 },
            { part: 'rim', note: D.rim, patterns: ['....x.......x...', '....x.........x.'], velocity: 0.4 },
          ],
        },
      },
    },
    variants: { pad: [{ instrument: 'choir.ooh' }, { instrument: 'strings.ensemble' }, { instrument: 'pad.warm' }], melody: [{ instrument: 'mallet.vibraphone' }, { instrument: 'mallet.celesta' }, { instrument: 'wind.flute' }, { instrument: 'keys.epiano' }], arp: [{ instrument: 'keys.glass' }, { instrument: 'mallet.marimba' }], chords: [{ instrument: 'keys.epiano' }] },
    mix: {
      roles: {
        melody: { gainDb: -2, sends: { reverb: 0.45, delay: 0.25 } },
        pad: { gainDb: -3, sends: { reverb: 0.5 } },
        chords: { gainDb: -8, sends: { reverb: 0.5 } },
        arp: { gainDb: -7, sends: { reverb: 0.45, delay: 0.2 } },
        bass: { sends: { reverb: 0.1 } },
        drums: { gainDb: -8, sends: { reverb: 0.25 } },
      },
      reverb: { rt60: 4.5, size: 1.6, damping: 5000, predelayMs: 40 },
      delayBeats: 1.5,
    },
    axes: { impact: 0.1, space: 0.8, pressure: 0.2, pulse: 0.2, drive: 0.2, density: 0.35, depth: 0.3, texture: 0.5 },
  },

  synthwave: {
    id: 'synthwave',
    label: 'Synthwave',
    description: 'Achtel-Oktavbass, Four-on-the-Floor, Arpeggios, Supersaw-Lead, Moll mit 80er-Hall.',
    tempo: [96, 118],
    meter: { num: 4, den: 4 },
    keys: { tonics: ['A', 'E', 'F#', 'C', 'D', 'B'], modes: ['aeolian'] },
    harmony: { dialect: 'pop', phraseBars: 4 },
    form: {
      templates: [
        [['intro', 'I', 8, 0.3], ['A', 'A', 16, 0.55], ['B', 'B', 16, 0.8], ['A', 'A', 16, 0.65], ['B', 'B', 16, 0.95], ['outro', 'O', 8, 0.35]],
        [['intro', 'I', 8, 0.35], ['A', 'A', 16, 0.6], ['A', 'A', 8, 0.7], ['B', 'B', 16, 0.9], ['breakdown', 'C', 8, 0.4], ['B', 'B', 16, 1], ['outro', 'O', 8, 0.3]],
      ],
    },
    roles: {
      pad: { instrument: 'pad.strings', voicing: 'spread', velocity: 0.5 },
      bass: { instrument: 'bass.synthwave', patterns: [[0, 'root'], [0.4, 'octave8']] },
      melody: { instrument: 'lead.saw', profile: 'pop', minIntensity: 0.5, sections: ['A', 'B'] },
      counter: { instrument: 'lead.soft', minIntensity: 0.9 },
      arp: { instrument: 'pluck.synth', pattern: 'up', rate: 0.25, octaves: 2, minIntensity: 0.35, velocity: 0.55 },
      drums: {
        instrument: 'kit.electro',
        minIntensity: 0.15,
        groove: {
          grid: 16,
          humanize: { timingMs: 3, velocity: 0.04 },
          layers: [
            { part: 'kick', note: D.kick, intensity: [0.3, 1], patterns: ['x...x...x...x...'], velocity: 0.95 },
            { part: 'kick', note: D.kick, intensity: [0, 0.3], patterns: ['x.......x.......'], velocity: 0.8 },
            { part: 'snare', note: D.snare, intensity: [0.35, 1], patterns: ['....x.......x...'], velocity: 0.9 },
            { part: 'clap', note: D.clap, intensity: [0.7, 1], patterns: ['....x.......x...'], velocity: 0.55 },
            { part: 'hat', note: D.hatClosed, intensity: [0.3, 0.6], patterns: ['..x...x...x...x.'], velocity: 0.6 },
            { part: 'hat', note: D.hatClosed, intensity: [0.6, 1], patterns: ['x.x.x.x.x.x.x.x.', 'xoxoxoxoxoxoxoxo'], velocity: 0.55 },
            { part: 'openhat', note: D.hatOpen, intensity: [0.5, 1], patterns: ['..............x.', '......x.......x.'], velocity: 0.5 },
          ],
          fills: [
            [{ note: D.tomHigh, pattern: 'x.x.....' }, { note: D.tomMid, pattern: '....x.x.' }, { note: D.tomLow, pattern: '......xx' }],
            [{ note: D.snare, pattern: 'x.x.xxxx' }],
          ],
          fillEvery: 8,
          crash: { note: D.crash, velocity: 0.8 },
        },
      },
      fx: { instrument: 'kit.electro', riser: true },
    },
    variants: { melody: [{ instrument: 'lead.square' }, { instrument: 'lead.arcade' }, { instrument: 'sax.alto' }], bass: [{ instrument: 'bass.ladder' }, { instrument: 'bass.fm' }, { instrument: 'bass.arcade' }], arp: [{ instrument: 'arp.chip' }, { instrument: 'pluck.stab' }, { pattern: 'updown' }], pad: [{ instrument: 'pad.warm' }, { instrument: 'pad.glass' }] },
    mix: {
      roles: {
        pad: { gainDb: -6, duck: { source: 'drums', amountDb: 6, releaseMs: 220 } },
        bass: { duck: { source: 'drums', amountDb: 3, releaseMs: 140 } },
        arp: { gainDb: -7, duck: { source: 'drums', amountDb: 4, releaseMs: 160 }, sends: { reverb: 0.25, delay: 0.2 } },
        melody: { gainDb: -2, sends: { reverb: 0.25, delay: 0.18 } },
        drums: { gainDb: -1, sends: { reverb: 0.12 } },
      },
      reverb: { rt60: 2.8, size: 1.2, damping: 6500, predelayMs: 20 },
      delayBeats: 0.75,
    },
    axes: { impact: 0.5, space: 0.55, pressure: 0.4, pulse: 0.7, drive: 0.6, density: 0.6, depth: 0.5, texture: 0.2 },
  },

  chiptune: {
    id: 'chiptune',
    label: 'Chiptune',
    description: 'Puls-Melodie, Dreieck-Bass, Arpeggio-Akkorde, Rausch-Drums, schnelle 8-Bit-Energie.',
    tempo: [128, 156],
    meter: { num: 4, den: 4 },
    keys: { tonics: ['C', 'G', 'D', 'F', 'A', 'E'], modes: ['ionian', 'ionian', 'aeolian'] },
    harmony: { dialect: 'chip', phraseBars: 4 },
    form: {
      templates: [
        [['A', 'A', 8, 0.6], ['B', 'B', 8, 0.75], ['A', 'A', 8, 0.7], ['C', 'C', 8, 0.85], ['A', 'A', 8, 0.8], ['B', 'B', 8, 0.9]],
        [['intro', 'I', 4, 0.45], ['A', 'A', 8, 0.65], ['A', 'A', 8, 0.75], ['B', 'B', 8, 0.85], ['A', 'A', 8, 0.8], ['outro', 'O', 4, 0.5]],
      ],
      loop: true,
    },
    roles: {
      bass: { instrument: 'bass.chip', patterns: [[0, 'root'], [0.5, 'octave8']], range: [36, 55] },
      melody: { instrument: 'lead.chip', profile: 'chip', minIntensity: 0.4, sections: ['A', 'B', 'C'] },
      arp: { instrument: 'arp.chip', pattern: 'up', rate: 0.125, octaves: 1, minIntensity: 0.3, velocity: 0.5, transpose: 12 },
      drums: {
        instrument: 'kit.chip',
        minIntensity: 0.3,
        groove: {
          grid: 16,
          humanize: { timingMs: 0, velocity: 0 },
          layers: [
            { part: 'kick', note: D.kick, patterns: ['x.......x.......', 'x.....x.x.......'], velocity: 0.9 },
            { part: 'snare', note: D.snare, patterns: ['....x.......x...'], velocity: 0.85 },
            { part: 'hat', note: D.hatClosed, intensity: [0.55, 1], patterns: ['x.x.x.x.x.x.x.x.', 'x.xxx.x.x.xxx.x.'], velocity: 0.55 },
          ],
          fills: [[{ note: D.snare, pattern: 'x.x.xxxx' }], [{ note: D.tomHigh, pattern: 'xx......' }, { note: D.tomMid, pattern: '..xx....' }, { note: D.tomLow, pattern: '....xxxx' }]],
          fillEvery: 8,
          crash: { note: D.crash, velocity: 0.7 },
        },
      },
    },
    variants: { melody: [{ instrument: 'lead.arcade' }, { instrument: 'lead.square' }, { profile: 'arcade' }], bass: [{ instrument: 'bass.arcade' }], arp: [{ pattern: 'updown' }, { pattern: 'converge' }], drums: [{ instrument: 'kit.arcade' }] },
    mix: {
      roles: {
        melody: { gainDb: -3, sends: { reverb: 0.06, delay: 0.08 } },
        arp: { gainDb: -9, sends: { reverb: 0.05 } },
        bass: { sends: {} },
        drums: { gainDb: -3, sends: { reverb: 0.04 } },
      },
      reverb: { rt60: 0.8, size: 0.5, damping: 8000, predelayMs: 5 },
      delayBeats: 0.75,
    },
    axes: { impact: 0.4, space: 0.15, pressure: 0.2, pulse: 0.7, drive: 0.7, density: 0.6, depth: 0.2, texture: 0 },
  },

  lofi: {
    id: 'lofi',
    label: 'Lo-Fi / Chill',
    description: 'Jazz-Akkorde auf dem E-Piano, Swing-Beat, gezupfter Bass, Vinyl-Knistern.',
    tempo: [70, 88],
    meter: { num: 4, den: 4 },
    keys: { tonics: ['F', 'Eb', 'Bb', 'D', 'G', 'C'], modes: ['ionian', 'aeolian'] },
    harmony: { dialect: 'jazz', phraseBars: 4 },
    form: {
      templates: [
        [['intro', 'I', 4, 0.3], ['A', 'A', 8, 0.55], ['A', 'A', 8, 0.65], ['B', 'B', 8, 0.7], ['A', 'A', 8, 0.6], ['outro', 'O', 4, 0.3]],
        [['intro', 'I', 4, 0.25], ['A', 'A', 8, 0.5], ['B', 'B', 8, 0.65], ['A', 'A', 8, 0.6], ['B', 'B', 8, 0.7], ['outro', 'O', 4, 0.3]],
      ],
      loop: true,
      ritardando: true,
    },
    roles: {
      chords: { instrument: 'keys.epiano', voicing: 'jazz', comp: 'sustain', velocity: 0.55 },
      bass: { instrument: 'pluck.upright-bass', patterns: [[0, 'root'], [0.45, 'rootFifth'], [0.68, 'walking']] },
      melody: { instrument: 'keys.mallet', profile: 'jazz', minIntensity: 0.5, sections: ['A', 'B'] },
      drums: {
        instrument: 'kit.lofi',
        minIntensity: 0.1,
        groove: {
          grid: 16,
          swing: 0.16,
          humanize: { timingMs: 9, velocity: 0.08 },
          layers: [
            { part: 'kick', note: D.kick, patterns: ['x.....x...x.....', 'x......x..x..x..', 'x.....x.x.......'], velocity: 0.8 },
            { part: 'snare', note: D.snare, intensity: [0.25, 1], patterns: ['....x.......x...', '....x..o....x...'], velocity: 0.75, pushMs: 14 },
            { part: 'hat', note: D.hatClosed, patterns: ['x.x.x.x.x.x.x.x.', 'x?x.x?x.x?x.x?x.'], velocity: 0.45 },
            { part: 'rim', note: D.rim, intensity: [0.6, 1], patterns: ['..........x.....', '.......x........'], velocity: 0.4 },
            { part: 'shaker', note: D.shaker, intensity: [0.65, 1], patterns: ['o.o.o.o.o.o.o.o.'], velocity: 0.35 },
          ],
          fills: [[{ note: D.snare, pattern: 'x..o.x.x' }]],
          fillEvery: 8,
        },
      },
      texture: { instrument: 'texture.vinyl' },
    },
    variants: { chords: [{ instrument: 'keys.piano' }, { instrument: 'mallet.vibraphone' }, { instrument: 'pluck.nylon', comp: 'broken' }], melody: [{ instrument: 'keys.epiano' }, { instrument: 'sax.tenor' }, { instrument: 'wind.flute' }, { instrument: 'pluck.nylon' }, { instrument: 'mallet.vibraphone' }], bass: [{ instrument: 'pluck.electric-bass' }, { instrument: 'bass.sub' }] },
    mix: {
      roles: {
        chords: { gainDb: -2, sends: { reverb: 0.2 }, chorus: { voices: 1, rate: 0.45, depthMs: 0.9, delayMs: 6, mix: 1 } },
        bass: { sends: { reverb: 0.05 } },
        melody: { gainDb: -3, sends: { reverb: 0.25, delay: 0.12 } },
        drums: { gainDb: -2, sends: { reverb: 0.08 } },
        texture: { gainDb: -4 },
      },
      reverb: { rt60: 1.6, size: 0.8, damping: 4000, predelayMs: 15 },
      delayBeats: 0.75,
    },
    axes: { impact: 0.25, space: 0.4, pressure: 0.3, pulse: 0.4, drive: 0.3, density: 0.45, depth: 0.4, texture: 0.7 },
  },

  horror: {
    id: 'horror',
    label: 'Dunkel / Horror',
    description: 'Tiefe Drones, gläserne Flächen, Spieluhr-Melodie, seltene dumpfe Schläge, riesiger Hall.',
    tempo: [56, 70],
    meter: { num: 4, den: 4 },
    keys: { tonics: ['E', 'C#', 'D', 'F', 'G#'], modes: ['aeolian', 'phrygian'] },
    harmony: { dialect: 'dark', phraseBars: 4 },
    form: {
      templates: [
        [['A', 'A', 8, 0.35], ['B', 'B', 8, 0.55], ['A', 'A', 8, 0.45], ['C', 'C', 8, 0.8], ['outro', 'O', 4, 0.25]],
        [['intro', 'I', 4, 0.2], ['A', 'A', 8, 0.4], ['C', 'C', 8, 0.7], ['A', 'A', 8, 0.5], ['C', 'C', 8, 0.85], ['outro', 'O', 4, 0.2]],
      ],
    },
    roles: {
      pad: { instrument: 'pad.glass', voicing: 'spread', velocity: 0.42 },
      drone: { instrument: 'bass.sub', velocity: 0.55 },
      melody: { instrument: 'keys.glass', profile: 'dark', minIntensity: 0.3, sections: ['A', 'C'], octave: 12 },
      counter: { instrument: 'lead.soft', minIntensity: 0.75 },
      drums: {
        instrument: 'kit.hybrid',
        minIntensity: 0.5,
        groove: {
          grid: 16,
          humanize: { timingMs: 15, velocity: 0.12 },
          layers: [
            { part: 'tomLow', note: D.tomLow, patterns: ['x...............', 'x.......?.......', '?...........x...'], velocity: 0.7 },
            { part: 'kick', note: D.kick, intensity: [0.7, 1], patterns: ['x.......x.......', 'x..........?....'], velocity: 0.6 },
          ],
        },
      },
      fx: { instrument: 'kit.hybrid', riser: true, boom: true, impact: true },
    },
    variants: { pad: [{ instrument: 'strings.ponticello' }, { instrument: 'choir.ooh' }], melody: [{ instrument: 'mallet.celesta' }, { instrument: 'bells.church' }, { instrument: 'keys.piano' }], counter: [{ instrument: 'strings.tremolo' }] },
    mix: {
      roles: {
        pad: { gainDb: -3, sends: { reverb: 0.55 } },
        drone: { sends: { reverb: 0.15 } },
        melody: { gainDb: -5, sends: { reverb: 0.55, delay: 0.3 } },
        counter: { gainDb: -10, sends: { reverb: 0.5 } },
        drums: { gainDb: -4, sends: { reverb: 0.4 } },
        fx: { gainDb: -3, sends: { reverb: 0.5 } },
      },
      reverb: { rt60: 6.5, size: 1.9, damping: 4500, predelayMs: 50 },
      delayBeats: 1.5,
    },
    axes: { impact: 0.5, space: 0.85, pressure: 0.85, pulse: 0.3, drive: 0.2, density: 0.35, depth: 0.7, texture: 0.6 },
  },

  action: {
    id: 'action',
    label: 'Kampf / Action (Hybrid)',
    description: 'Treibendes Pizzicato-Ostinato, Taiko-artige Trommeln, Ladder-Bass, Supersaw-Thema, Riser und Impacts.',
    tempo: [132, 152],
    meter: { num: 4, den: 4 },
    keys: { tonics: ['D', 'C', 'E', 'G', 'A', 'B'], modes: ['aeolian'] },
    harmony: { dialect: 'cinematic', phraseBars: 4 },
    form: {
      templates: [
        [['intro', 'I', 8, 0.45], ['A', 'A', 16, 0.7], ['B', 'B', 16, 0.85], ['breakdown', 'C', 8, 0.4], ['B', 'B', 16, 1], ['outro', 'O', 4, 0.5]],
        [['intro', 'I', 8, 0.5], ['A', 'A', 16, 0.7], ['A', 'A', 16, 0.8], ['B', 'B', 16, 0.95], ['outro', 'O', 8, 0.5]],
      ],
    },
    roles: {
      pad: { instrument: 'pad.strings', voicing: 'spread', velocity: 0.5 },
      bass: { instrument: 'bass.ladder', patterns: [[0, 'root'], [0.4, 'dotted'], [0.75, 'octave8']] },
      melody: { instrument: 'lead.saw', profile: 'cinematic', minIntensity: 0.55, sections: ['A', 'B'] },
      counter: { instrument: 'pad.strings', minIntensity: 0.8 },
      arp: { instrument: 'pluck.pizzicato', pattern: 'pulse', rate: 0.25, octaves: 1, minIntensity: 0.3, velocity: 0.6 },
      drums: {
        instrument: 'kit.hybrid',
        minIntensity: 0.25,
        groove: {
          grid: 16,
          humanize: { timingMs: 4, velocity: 0.06 },
          layers: [
            { part: 'tomLow', note: D.tomLow, intensity: [0.25, 1], patterns: ['x..x..x...x.x...', 'x..x..x.x..x..x.'], velocity: 0.85 },
            { part: 'tomMid', note: D.tomMid, intensity: [0.6, 1], patterns: ['......x.......x.', '...x......x....x'], velocity: 0.7 },
            { part: 'kick', note: D.kick, intensity: [0.5, 1], patterns: ['x...x...x...x...', 'x..x..x.x..x..x.'], velocity: 0.9 },
            { part: 'snare', note: D.snare, intensity: [0.65, 1], patterns: ['....x.......x...'], velocity: 0.8 },
          ],
          fills: [[{ note: D.tomHigh, pattern: 'x.x.x.x.' }, { note: D.tomMid, pattern: '.x.x.x.x' }], [{ note: D.tomLow, pattern: 'xxxxxxxx' }]],
          fillEvery: 4,
          crash: { note: D.crash, velocity: 0.85 },
        },
      },
      fx: { instrument: 'kit.hybrid', riser: true, impact: true, boom: true },
    },
    variants: { melody: [{ instrument: 'lead.arcade' }, { instrument: 'brass.horns' }, { instrument: 'lead.square' }], pad: [{ instrument: 'strings.tremolo' }, { instrument: 'pad.warm' }], arp: [{ instrument: 'strings.spiccato' }, { instrument: 'pluck.synth' }], bass: [{ instrument: 'bass.synthwave' }, { instrument: 'bass.fm' }], drums: [{ instrument: 'perc.taiko' }] },
    mix: {
      roles: {
        pad: { gainDb: -6, duck: { source: 'drums', amountDb: 3, releaseMs: 180 } },
        bass: {},
        arp: { gainDb: -4, sends: { reverb: 0.15 } },
        melody: { gainDb: -2, sends: { reverb: 0.22, delay: 0.1 } },
        drums: { gainDb: 0, sends: { reverb: 0.15 } },
        fx: { gainDb: -2, sends: { reverb: 0.3 } },
      },
      reverb: { rt60: 2.6, size: 1.3, damping: 6000, predelayMs: 20 },
      delayBeats: 0.75,
    },
    axes: { impact: 0.8, space: 0.5, pressure: 0.55, pulse: 0.8, drive: 0.8, density: 0.7, depth: 0.6, texture: 0.2 },
  },
  fantasy: {
    id: 'fantasy',
    label: 'Fantasy-Orchestral',
    description: 'Streicher, Hörner, Holzbläser, Harfe, Chor und Pauken; Mediantik und weite Bögen, Leitmotiv in den Hörnern.',
    tempo: [72, 96],
    meter: { num: 4, den: 4 },
    keys: { tonics: ['D', 'F', 'C', 'G', 'Bb', 'E'], modes: ['ionian', 'aeolian', 'dorian', 'lydian'] },
    harmony: { dialect: 'cinematic', chromaticism: 1.2, phraseBars: 4 },
    form: {
      templates: [
        [['intro', 'I', 8, 0.3], ['A', 'A', 16, 0.55], ['B', 'B', 16, 0.8], ['breakdown', 'C', 8, 0.4], ['B', 'B', 16, 0.95], ['outro', 'O', 8, 0.3]],
        [['intro', 'I', 4, 0.35], ['A', 'A', 16, 0.6], ['A', 'A', 16, 0.7], ['B', 'B', 16, 0.9], ['outro', 'O', 8, 0.35]],
      ],
      ritardando: true,
    },
    roles: {
      pad: { instrument: 'strings.ensemble', voicing: 'spread', velocity: 0.5 },
      bass: { instrument: 'strings.basses', patterns: [[0, 'root'], [0.5, 'rootFifth'], [0.85, 'dotted']], range: [31, 50], velocity: 0.7 },
      melody: { instrument: 'brass.horns', profile: 'cinematic', minIntensity: 0.5, sections: ['A', 'B'] },
      counter: { instrument: 'wind.clarinet', minIntensity: 0.65 },
      arp: { instrument: 'pluck.harp', pattern: 'updown', rate: 0.25, octaves: 2, minIntensity: 0.2, velocity: 0.45 },
      drums: {
        instrument: 'perc.taiko',
        minIntensity: 0.8,
        groove: {
          grid: 16,
          humanize: { timingMs: 6, velocity: 0.07 },
          layers: [
            { part: 'kick', note: D.kick, intensity: [0.8, 1], patterns: ['x.......x.......', 'x.......x..x....'], velocity: 0.9 },
            { part: 'tomMid', note: D.tomMid, intensity: [0.85, 1], patterns: ['....x.......x...'], velocity: 0.7 },
          ],
          fills: [[{ note: D.tomLow, pattern: 'x.x.x.xx' }]],
          fillEvery: 8,
        },
      },
      fx: { instrument: 'kit.hybrid', impact: true, boom: true },
      layers: [
        { id: 'choir', type: 'pad', instrument: 'choir.aah', minIntensity: 0.7, voicing: 'spread', velocity: 0.45 },
        { id: 'flute', type: 'double', instrument: 'wind.flute', octave: 12, minIntensity: 0.8, velocity: 0.75 },
        { id: 'timpani', type: 'timpani', instrument: 'perc.timpani', minIntensity: 0.55 },
        { id: 'celesta', type: 'counter', instrument: 'mallet.celesta', position: 'above', minIntensity: 0.4, maxIntensity: 0.65 },
      ],
    },
    axisInstruments: { arp: 'strings.spiccato', texture: 'texture.cluster', drone: 'strings.basses' },
    variants: { melody: [{ instrument: 'wind.oboe' }, { instrument: 'strings.fiddle' }, { instrument: 'wind.flute' }, { instrument: 'brass.trumpet' }], counter: [{ instrument: 'wind.oboe' }, { instrument: 'wind.flute' }], arp: [{ instrument: 'pluck.nylon' }, { instrument: 'mallet.celesta' }], pad: [{ instrument: 'choir.ooh' }] },
    mix: {
      roles: {
        pad: { gainDb: -3, chorus: false, sends: { reverb: 0.35 } },
        bass: { eq: [{ type: 'highpass', freq: 30, q: 0.7 }], saturator: undefined, compressor: { thresholdDb: -26, ratio: 2, attackMs: 20, releaseMs: 200 }, relativeLoudness: -5, sends: { reverb: 0.2 } },
        melody: { gainDb: -1, sends: { reverb: 0.3 } },
        counter: { gainDb: -5, pan: -0.25, sends: { reverb: 0.3 } },
        arp: { gainDb: -7, pan: 0.3, sends: { reverb: 0.35 } },
        choir: { gainDb: -6, chorus: false, sends: { reverb: 0.45 } },
        flute: { gainDb: -5, pan: 0.2, sends: { reverb: 0.3 } },
        timpani: { gainDb: -3, sends: { reverb: 0.3 } },
        celesta: { gainDb: -8, pan: 0.35, sends: { reverb: 0.4 } },
        drums: { gainDb: -2, sends: { reverb: 0.35 } },
        fx: { gainDb: -4, sends: { reverb: 0.4 } },
      },
      reverb: { rt60: 3.2, size: 1.6, damping: 5500, predelayMs: 30 },
      delayBeats: 0.75,
    },
    axes: { impact: 0.55, space: 0.7, pressure: 0.4, pulse: 0.4, drive: 0.45, density: 0.6, depth: 0.5, texture: 0.3 },
  },
  actionOrchestral: {
    id: 'actionOrchestral',
    label: 'Kampf / Action (orchestral)',
    description: 'Spiccato-Ostinato der Streicher, Taiko und Pauken, Hörner-Thema, Blechbläser-Hits, Chor in der Steigerung.',
    tempo: [138, 160],
    meter: { num: 4, den: 4 },
    keys: { tonics: ['D', 'C', 'E', 'G', 'A', 'B'], modes: ['aeolian', 'phrygian'] },
    harmony: { dialect: 'cinematic', phraseBars: 4 },
    form: {
      templates: [
        [['intro', 'I', 8, 0.45], ['A', 'A', 16, 0.7], ['B', 'B', 16, 0.85], ['breakdown', 'C', 8, 0.45], ['B', 'B', 16, 1], ['outro', 'O', 4, 0.55]],
        [['intro', 'I', 4, 0.5], ['A', 'A', 16, 0.75], ['A', 'A', 16, 0.85], ['B', 'B', 16, 1], ['outro', 'O', 8, 0.5]],
      ],
    },
    roles: {
      pad: { instrument: 'strings.tremolo', voicing: 'spread', velocity: 0.5 },
      bass: { instrument: 'strings.basses', patterns: [[0, 'root'], [0.45, 'dotted'], [0.75, 'octave8']], range: [28, 47], velocity: 0.75 },
      melody: { instrument: 'brass.horns', profile: 'cinematic', minIntensity: 0.55, sections: ['A', 'B'] },
      counter: { instrument: 'brass.trumpet', minIntensity: 0.85 },
      arp: { instrument: 'strings.spiccato', pattern: 'pulse', rate: 0.25, octaves: 1, minIntensity: 0.2, velocity: 0.65 },
      drums: {
        instrument: 'perc.taiko',
        minIntensity: 0.3,
        groove: {
          grid: 16,
          humanize: { timingMs: 4, velocity: 0.06 },
          layers: [
            { part: 'kick', note: D.kick, intensity: [0.3, 1], patterns: ['x.......x.......', 'x.....x.x.......'], velocity: 0.95 },
            { part: 'tomLow', note: D.tomLow, intensity: [0.45, 1], patterns: ['x..x..x...x.x...', 'x..x..x.x..x..x.'], velocity: 0.8 },
            { part: 'tomMid', note: D.tomMid, intensity: [0.6, 1], patterns: ['......x.......x.', '...x......x....x'], velocity: 0.7 },
            { part: 'tomHigh', note: D.tomHigh, intensity: [0.75, 1], patterns: ['..x.x.x...x.x.x.', 'x?x?x?x?x?x?x?x?'], velocity: 0.55 },
            { part: 'rim', note: D.rim, intensity: [0.5, 1], patterns: ['x...x...x...x...'], velocity: 0.6 },
          ],
          fills: [[{ note: D.tomHigh, pattern: 'x.x.x.x.' }, { note: D.tomMid, pattern: '.x.x.x.x' }], [{ note: D.kick, pattern: 'x.x.xxxx' }]],
          fillEvery: 4,
        },
      },
      fx: { instrument: 'kit.hybrid', riser: true, impact: true, boom: true },
      layers: [
        { id: 'choir', type: 'pad', instrument: 'choir.aah', minIntensity: 0.85, voicing: 'spread', velocity: 0.5 },
        { id: 'brass', type: 'chords', instrument: 'brass.section', comp: 'stabs', voicing: 'spread', minIntensity: 0.75, velocity: 0.7 },
        { id: 'timpani', type: 'timpani', instrument: 'perc.timpani', minIntensity: 0.5 },
        { id: 'braam', type: 'pad', instrument: 'hybrid.braam', minIntensity: 0.95, voicing: 'spread', velocity: 0.55 },
      ],
    },
    axisInstruments: { arp: 'strings.spiccato', texture: 'texture.cluster', drone: 'brass.tuba' },
    variants: { melody: [{ instrument: 'brass.trumpet' }, { instrument: 'strings.ensemble' }], pad: [{ instrument: 'strings.ensemble' }], counter: [{ instrument: 'wind.oboe' }] },
    mix: {
      roles: {
        pad: { gainDb: -7, chorus: false, sends: { reverb: 0.3 } },
        bass: { eq: [{ type: 'highpass', freq: 28, q: 0.7 }, { type: 'peaking', freq: 900, q: 1, gainDb: 2 }], saturator: undefined, relativeLoudness: -4, sends: { reverb: 0.15 } },
        melody: { gainDb: -1, sends: { reverb: 0.25 } },
        counter: { gainDb: -4, pan: 0.2, sends: { reverb: 0.25, delay: 0.05 } },
        arp: { gainDb: -3, sends: { reverb: 0.18 } },
        choir: { gainDb: -6, chorus: false, sends: { reverb: 0.4 } },
        brass: { gainDb: -5, sends: { reverb: 0.25 } },
        timpani: { gainDb: -2, sends: { reverb: 0.25 } },
        braam: { gainDb: -8, chorus: false, sends: { reverb: 0.3 } },
        drums: { gainDb: 0, sends: { reverb: 0.22 } },
        fx: { gainDb: -2, sends: { reverb: 0.3 } },
      },
      reverb: { rt60: 2.8, size: 1.5, damping: 6000, predelayMs: 22 },
      delayBeats: 0.75,
    },
    axes: { impact: 0.85, space: 0.55, pressure: 0.6, pulse: 0.85, drive: 0.85, density: 0.75, depth: 0.6, texture: 0.25 },
  },
  folk: {
    id: 'folk',
    label: 'Folk / Celtic',
    description: 'Jig im 6/8: Fiddle mit Verzierungen, Tin Whistle, Harfe, Gitarre und Bodhrán; dorisch und mixolydisch, AABB-Form.',
    tempo: [160, 180],
    meter: { num: 6, den: 8 },
    keys: { tonics: ['D', 'G', 'A', 'E'], modes: ['dorian', 'mixolydian', 'ionian', 'aeolian'] },
    harmony: { dialect: 'modal', phraseBars: 4 },
    form: {
      templates: [
        [['intro', 'I', 4, 0.4], ['A', 'A', 8, 0.65], ['A', 'A', 8, 0.75], ['B', 'B', 8, 0.85], ['B', 'B', 8, 0.95], ['outro', 'O', 4, 0.5]],
        [['A', 'A', 8, 0.6], ['A', 'A', 8, 0.7], ['B', 'B', 8, 0.8], ['B', 'B', 8, 0.9], ['A', 'A', 8, 0.95], ['outro', 'O', 4, 0.45]],
      ],
    },
    roles: {
      chords: { instrument: 'pluck.nylon', voicing: 'pop', comp: 'pulse8', velocity: 0.5 },
      bass: { instrument: 'pluck.upright-bass', patterns: [[0, 'root'], [0.6, 'rootFifth']], minIntensity: 0.5, velocity: 0.7 },
      melody: { instrument: 'strings.fiddle', profile: 'jig', ornaments: 0.45, sections: ['A', 'B'] },
      arp: { instrument: 'pluck.harp', pattern: 'up', rate: 0.5, octaves: 2, minIntensity: 0.3, velocity: 0.45 },
      drums: {
        instrument: 'perc.bodhran',
        minIntensity: 0.45,
        groove: {
          grid: 6,
          humanize: { timingMs: 6, velocity: 0.08 },
          layers: [
            { part: 'kick', note: D.kick, intensity: [0.45, 1], patterns: ['x.....', 'x..x..'], velocity: 0.85 },
            { part: 'snare', note: D.snare, intensity: [0.45, 1], patterns: ['...x..', '.x..x.'], velocity: 0.7 },
            { part: 'hatClosed', note: D.hatClosed, intensity: [0.6, 1], patterns: ['.xx.xx', '.x?.x?'], velocity: 0.5 },
          ],
          fills: [[{ note: D.snare, pattern: 'xxx' }, { note: D.kick, pattern: '...' }]],
          fillEvery: 8,
        },
      },
      layers: [{ id: 'whistle', type: 'double', instrument: 'wind.whistle', octave: 12, minIntensity: 0.8, velocity: 0.7, sections: ['B'] }],
    },
    axisInstruments: { arp: 'strings.spiccato', texture: 'texture.grains', drone: 'strings.basses' },
    variants: { melody: [{ instrument: 'wind.whistle' }, { instrument: 'wind.flute' }, { instrument: 'wind.clarinet' }], chords: [{ instrument: 'pluck.harp' }, { instrument: 'pluck.gypsy-guitar' }, { comp: 'broken' }], arp: [{ instrument: 'pluck.nylon' }, { instrument: 'mallet.celesta' }] },
    mix: {
      roles: {
        melody: { gainDb: -1, sends: { reverb: 0.18 } },
        chords: { gainDb: -6, pan: -0.3, sends: { reverb: 0.15 } },
        arp: { gainDb: -8, pan: 0.3, sends: { reverb: 0.25 } },
        bass: { relativeLoudness: -4, sends: { reverb: 0.06 } },
        whistle: { gainDb: -6, pan: 0.15, sends: { reverb: 0.2 } },
        drums: { gainDb: -3, sends: { reverb: 0.12 } },
      },
      reverb: { rt60: 1.4, size: 0.8, damping: 6500, predelayMs: 14 },
      delayBeats: 1.5,
    },
    axes: { impact: 0.4, space: 0.35, pressure: 0.3, pulse: 0.6, drive: 0.65, density: 0.55, depth: 0.3, texture: 0.2 },
  },
  electroswing: {
    id: 'electroswing',
    label: 'Electro Swing (fröhlich)',
    description: 'Swing-Shuffle über Four-on-the-Floor: Stride-Klavier, Kontrabass, Gypsy-Gitarre, Bläser-Riffs, Klarinette, gestopfte Trompete, Scat, Vinyl und Sidechain-Pumpen.',
    tempo: [118, 132],
    meter: { num: 4, den: 4 },
    keys: { tonics: ['C', 'F', 'G', 'Bb', 'D', 'Eb'], modes: ['ionian', 'ionian', 'aeolian'] },
    harmony: { dialect: 'swing', phraseBars: 4 },
    form: {
      templates: [
        [['intro', 'I', 8, 0.35], ['A', 'A', 16, 0.75], ['B', 'B', 16, 0.85], ['breakdown', 'C', 8, 0.45], ['A', 'A', 16, 0.95], ['outro', 'O', 8, 0.4]],
        [['intro', 'I', 4, 0.4], ['A', 'A', 16, 0.7], ['A', 'A', 16, 0.8], ['B', 'B', 16, 0.9], ['A', 'A', 16, 1], ['outro', 'O', 4, 0.45]],
      ],
    },
    roles: {
      chords: { instrument: 'keys.piano-honky', voicing: 'jazz', comp: 'stride', velocity: 0.55 },
      bass: { instrument: 'pluck.upright-bass', patterns: [[0, 'root'], [0.4, 'walking']], velocity: 0.8 },
      melody: { instrument: 'wind.clarinet', profile: 'swing', minIntensity: 0.5, sections: ['A', 'B'] },
      counter: { instrument: 'brass.trumpet-muted', minIntensity: 0.7 },
      drums: {
        instrument: 'kit.electro',
        minIntensity: 0.4,
        groove: {
          grid: 16,
          swing: 0.16,
          humanize: { timingMs: 4, velocity: 0.06 },
          layers: [
            { part: 'kick', note: D.kick, intensity: [0.4, 1], patterns: ['x...x...x...x...'], velocity: 0.95 },
            { part: 'clap', note: D.clap, intensity: [0.5, 1], patterns: ['....x.......x...'], velocity: 0.8 },
            { part: 'hat', note: D.hatClosed, intensity: [0.4, 1], patterns: ['x.x.x.x.x.x.x.x.', 'x.x?x.x.x.x?x.x.'], velocity: 0.55 },
            { part: 'openHat', note: D.hatOpen, intensity: [0.7, 1], patterns: ['..x...x...x...x.'], velocity: 0.45 },
          ],
          fills: [[{ note: D.snare, pattern: 'x.x.xxxx' }]],
          fillEvery: 8,
          crash: { note: D.crash, velocity: 0.7 },
        },
      },
      texture: { instrument: 'texture.vinyl' },
      layers: [
        { id: 'brass', type: 'riffs', instrument: 'brass.section', voicing: 'jazz', minIntensity: 0.6, velocity: 0.8, center: 65 },
        { id: 'guitar', type: 'chords', instrument: 'pluck.gypsy-guitar', comp: 'pompe', voicing: 'jazz', minIntensity: 0.4, velocity: 0.6 },
        { id: 'scat', type: 'counter', instrument: 'voice.scat', position: 'above', minIntensity: 0.85, sections: ['B'] },
      ],
    },
    axisInstruments: { arp: 'mallet.vibraphone', texture: 'texture.vinyl', drone: 'brass.tuba' },
    variants: { melody: [{ instrument: 'sax.alto' }, { instrument: 'brass.trumpet' }, { instrument: 'mallet.vibraphone' }], counter: [{ instrument: 'wind.clarinet' }, { instrument: 'sax.tenor' }], chords: [{ instrument: 'keys.piano' }, { instrument: 'keys.epiano', comp: 'offbeat' }], bass: [{ instrument: 'pluck.electric-bass' }] },
    mix: {
      roles: {
        chords: { gainDb: -3, sends: { reverb: 0.12 }, duck: { source: 'drums', amountDb: 3, releaseMs: 160 } },
        bass: { duck: { source: 'drums', amountDb: 4, releaseMs: 140 } },
        melody: { gainDb: -1, sends: { reverb: 0.2, delay: 0.08 } },
        counter: { gainDb: -4, pan: 0.25, sends: { reverb: 0.2 } },
        brass: { gainDb: -3, sends: { reverb: 0.18 }, duck: { source: 'drums', amountDb: 2, releaseMs: 150 } },
        guitar: { gainDb: -7, pan: -0.3, sends: { reverb: 0.1 } },
        scat: { gainDb: -4, pan: -0.15, sends: { reverb: 0.2, delay: 0.1 } },
        drums: { gainDb: -1, sends: { reverb: 0.06 } },
        texture: { gainDb: -6 },
      },
      reverb: { rt60: 1.6, size: 1, damping: 6500, predelayMs: 16 },
      delayBeats: 0.75,
    },
    axes: { impact: 0.6, space: 0.35, pressure: 0.2, pulse: 0.7, drive: 0.75, density: 0.65, depth: 0.5, texture: 0.4 },
  },
  arcade: {
    id: 'arcade',
    label: 'Arcade (retro-futuristisch)',
    description: 'Zackige Puls-Leads, trockener Synth-Bass, flinke Chip-Arpeggios, knackige Drums: 80er/90er-Spielhalle mit modernem Punch.',
    tempo: [124, 150],
    meter: { num: 4, den: 4 },
    keys: { tonics: ['D', 'E', 'G', 'A', 'C', 'F'], modes: ['ionian', 'mixolydian', 'ionian', 'dorian'] },
    harmony: { dialect: 'chip', chromaticism: 1.3, phraseBars: 4 },
    form: {
      templates: [
        [['intro', 'I', 4, 0.45], ['A', 'A', 8, 0.65], ['A', 'A', 8, 0.75], ['B', 'B', 8, 0.9], ['A', 'A', 8, 0.85], ['C', 'C', 8, 1], ['A', 'A', 8, 0.9], ['outro', 'O', 4, 0.5]],
        [['A', 'A', 8, 0.6], ['B', 'B', 8, 0.8], ['A', 'A', 8, 0.75], ['breakdown', 'C', 4, 0.4], ['B', 'B', 8, 0.95], ['A', 'A', 8, 1]],
      ],
      loop: true,
    },
    roles: {
      bass: { instrument: 'bass.arcade', patterns: [[0, 'root'], [0.4, 'syncopated'], [0.7, 'octave8']], range: [33, 52], velocity: 0.8 },
      chords: { instrument: 'pluck.stab', voicing: 'pop', comp: 'offbeat', minIntensity: 0.5, velocity: 0.5 },
      melody: { instrument: 'lead.arcade', profile: 'arcade', minIntensity: 0.45, sections: ['A', 'B', 'C'] },
      counter: { instrument: 'lead.chip', minIntensity: 0.9 },
      arp: { instrument: 'arp.chip', pattern: 'up', rate: 0.125, octaves: 1, minIntensity: 0.3, velocity: 0.45, transpose: 12 },
      drums: {
        instrument: 'kit.arcade',
        minIntensity: 0.3,
        groove: {
          grid: 16,
          humanize: { timingMs: 1, velocity: 0.03 },
          layers: [
            { part: 'kick', note: D.kick, intensity: [0.3, 0.7], patterns: ['x.......x.......', 'x.....x.x.......'], velocity: 0.95 },
            { part: 'kick4', note: D.kick, intensity: [0.7, 1], patterns: ['x...x...x...x...', 'x...x..xx...x.x.'], velocity: 0.95 },
            { part: 'snare', note: D.snare, patterns: ['....x.......x...'], velocity: 0.85 },
            { part: 'clap', note: D.clap, intensity: [0.75, 1], patterns: ['....x.......x..x'], velocity: 0.6 },
            { part: 'hat', note: D.hatClosed, intensity: [0.45, 1], patterns: ['x.x.x.x.x.x.x.x.', 'xxx.xxx.xxx.xxx.', 'x.xxx.xxx.xxx.xx'], velocity: 0.55 },
            { part: 'openHat', note: D.hatOpen, intensity: [0.8, 1], patterns: ['..x...x...x...x.'], velocity: 0.45 },
          ],
          fills: [[{ note: D.snare, pattern: 'x.x.xxxx' }], [{ note: D.tomHigh, pattern: 'xx......' }, { note: D.tomMid, pattern: '..xx....' }, { note: D.tomLow, pattern: '....xx..' }, { note: D.snare, pattern: '......xx' }]],
          fillEvery: 4,
          crash: { note: D.crash, velocity: 0.7 },
        },
      },
      fx: { instrument: 'kit.arcade', riser: true, impact: true },
    },
    variants: {
      melody: [{ instrument: 'lead.chip' }, { instrument: 'lead.square' }, { instrument: 'lead.saw' }, { instrument: 'keys.mallet' }, { profile: 'chip' }],
      bass: [{ instrument: 'bass.chip' }, { instrument: 'bass.synthwave' }, { instrument: 'bass.fm' }, { patterns: [[0, 'root'], [0.4, 'octave8'], [0.8, 'arpeggio']] }],
      chords: [{ comp: 'stabs' }, { instrument: 'keys.epiano', comp: 'offbeat' }, { instrument: 'pluck.synth', comp: 'pulse8' }],
      arp: [{ pattern: 'updown' }, { instrument: 'pluck.synth', rate: 0.25, pattern: 'converge' }, { instrument: 'mallet.marimba', rate: 0.25 }],
      drums: [{ instrument: 'kit.chip' }, { instrument: 'kit.electro' }],
    },
    mix: {
      roles: {
        melody: { gainDb: -2, sends: { reverb: 0.08, delay: 0.1 } },
        counter: { gainDb: -7, pan: 0.25, sends: { reverb: 0.06 } },
        chords: { gainDb: -7, pan: 0.2, sends: { reverb: 0.06 } },
        arp: { gainDb: -10, pan: -0.25, sends: { reverb: 0.05 } },
        bass: { sends: {}, duck: { source: 'drums', amountDb: 2, releaseMs: 90 } },
        drums: { gainDb: -1, sends: { reverb: 0.03 } },
        fx: { gainDb: -6, sends: { reverb: 0.15 } },
      },
      reverb: { rt60: 0.7, size: 0.5, damping: 8000, predelayMs: 5 },
      delayBeats: 0.75,
    },
    axes: { impact: 0.55, space: 0.15, pressure: 0.15, pulse: 0.8, drive: 0.8, density: 0.65, depth: 0.35, texture: 0 },
  },
});

/**
 * @param {string} id
 * @returns {Style}
 */
export function getStyle(id) {
  if (!Object.hasOwn(STYLES, id)) throw new RangeError(`Unknown style "${id}"`);
  return STYLES[id];
}
