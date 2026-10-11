// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Song composition from a recipe: style + character axes → tempo, key and
 * mode → form plan → material per section label (harmony, melody; repeated
 * labels reuse the motif with variation) → arrangement by intensity (pads,
 * comping, bass, melody, counter-melody, arpeggios, drums, drones, textures,
 * risers/booms/impacts) → tempo map and mix. Deterministic: the same recipe
 * gives the same score.
 */

import { Rng } from '../core/prng.js';
import { createScore } from '../core/score.js';
import { barLengthBeats } from '../core/meter-map.js';
import { createKey } from '../theory/key.js';
import { modeBrightness, MODE_BRIGHTNESS, resolveScaleName } from '../theory/scale.js';
import { formatPitchName, pitchClass, mod } from '../theory/pitch.js';
import { formatChordSymbol } from '../theory/chord.js';
import { DIALECTS, forMode } from '../compose/harmony/dialects.js';
import { generateHarmony } from '../compose/harmony/progression.js';
import { voiceProgression } from '../compose/harmony/voicing.js';
import { generateMelody } from '../compose/melody/melody.js';
import { MELODY_PROFILES } from '../compose/melody/profiles.js';
import { generateBassLine } from '../compose/bass.js';
import { generateCounterMelody } from '../compose/counterpoint.js';
import { generateArpeggio, compChords, generateRiffs } from '../compose/accompaniment.js';
import { generateTimpani } from '../compose/timpani.js';
import { ornamentFolk } from '../compose/melody/ornaments.js';
import { keyScale } from '../theory/key.js';
import { generateGroove } from '../compose/rhythm/groove.js';
import { DRUM_NOTES } from '../instruments/presets.js';
import { getStyle } from './styles.js';
import { resolveAxes, AXES, AXIS_LABELS } from './axes.js';
import { assertValidRecipe } from './recipe.js';
import { applyVariety } from './variety.js';

/** Mixer role of each additional part type (see ROLE_MIX in the renderer). */
const LAYER_MIX_ROLE = Object.freeze(
  /** @type {Record<string, string>} */ ({ pad: 'pad', chords: 'chords', counter: 'melody', double: 'melody', ostinato: 'arp', timpani: 'percussion', riffs: 'chords' }),
);

/** @typedef {import('../core/score.js').NoteEvent} NoteEvent */
/** @typedef {import('../compose/harmony/chord-utils.js').HarmonyEvent} HarmonyEvent */

/**
 * @typedef {object} SongSection
 * @property {string} type
 * @property {string} label
 * @property {number} bars
 * @property {number} beat start
 * @property {number} intensity 0…1
 * @property {number} occurrence how often this label appeared before
 * @property {string[]} roles active roles
 * @property {string[]} chords chord symbols
 */

/** @param {number} x */
const clamp01 = (x) => Math.min(1, Math.max(0, x));

/**
 * Diatonic modes the dialect has vocabulary for.
 * @param {import('../compose/harmony/dialects.js').Dialect} dialect
 */
function supportedModes(dialect) {
  return [...new Set(Object.keys(dialect.vocab).map((m) => (m === 'major' ? 'ionian' : m === 'minor' ? 'aeolian' : m)))].filter((m) =>
    /** @type {readonly string[]} */ (MODE_BRIGHTNESS).includes(m),
  );
}

/**
 * @param {import('./styles.js').Style} style
 * @param {import('./recipe.js').Recipe} recipe
 * @param {import('./axes.js').AxisEffects} fx
 * @param {Rng} rng
 * @param {import('../compose/harmony/dialects.js').Dialect} dialect
 */
function chooseKey(style, recipe, fx, rng, dialect) {
  const tonic = recipe.key ? recipe.key.tonic : rng.pick(style.keys.tonics);
  let mode = resolveScaleName(recipe.key ? recipe.key.mode : rng.pick(style.keys.modes));
  const supported = supportedModes(dialect);
  const diatonic = /** @type {readonly string[]} */ (MODE_BRIGHTNESS).includes(mode);
  // Modes the dialect has no vocabulary for, and brightness shifts from the "pressure"
  // axis, both snap to the supported mode with the nearest brightness.
  const shift = recipe.key ? 0 : fx.brightnessShift; // an explicit key is not darkened further
  if (supported.length > 0 && diatonic && (!supported.includes(mode) || Math.abs(shift) > 0.05)) {
    const target = clamp01(modeBrightness(mode) + shift);
    mode = supported.reduce((best, m) => (Math.abs(modeBrightness(m) - target) < Math.abs(modeBrightness(best) - target) ? m : best), supported[0]);
  }
  return createKey(tonic, mode);
}

/**
 * Section plan scaled to the target length.
 * @param {import('./styles.js').Style} style
 * @param {import('./recipe.js').Recipe} recipe
 * @param {number} bpm
 * @param {number} barLen
 * @param {Rng} rng
 */
function planForm(style, recipe, bpm, barLen, rng) {
  const template = rng.pick(style.form.templates);
  if (recipe.form) {
    // Explicit form (e.g. loops for adaptive stems): used exactly as given.
    let beat = 0;
    return recipe.form.map(([type, label, bars, inten]) => {
      const s = { type, label, bars, beat, intensity: clamp01(inten + (recipe.intensity ?? 0)) };
      beat += bars * barLen;
      return s;
    });
  }
  const target = recipe.bars ?? Math.max(8, Math.round(((recipe.minutes ?? 2.5) * bpm) / barLen));
  let specs = template.slice();
  const sum = (/** @type {typeof specs} */ s) => s.reduce((a, t) => a + t[2], 0);
  // Sections stretch up to 1.5×; only much longer pieces repeat a core (everything
  // between intro and outro), taken from a randomly chosen template for variety.
  const coreOf = (/** @type {typeof template} */ t) => t.filter((s) => s[0] !== 'intro' && s[0] !== 'outro');
  while (sum(specs) * 1.5 < target && specs.length < 48 && coreOf(template).length > 0) {
    const core = coreOf(rng.pick(style.form.templates));
    const outroAt = specs.findIndex((t) => t[0] === 'outro');
    const at = outroAt < 0 ? specs.length : outroAt;
    specs = [...specs.slice(0, at), ...core, ...specs.slice(at)];
  }
  const f = target / sum(specs);
  const intensity = recipe.intensity ?? 0;
  let beat = 0;
  /** @type {{ type: string, label: string, bars: number, beat: number, intensity: number }[]} */
  const sections = specs.map(([type, label, bars, inten]) => {
    const b = Math.max(4, Math.round((bars * f) / 4) * 4);
    const s = { type, label, bars: b, beat, intensity: clamp01(inten + intensity) };
    return s;
  });
  // Sections sharing a label share their length (they share material).
  /** @type {Map<string, number>} */
  const labelBars = new Map();
  for (const sec of sections) {
    if (!labelBars.has(sec.label)) labelBars.set(sec.label, sec.bars);
    sec.bars = /** @type {number} */ (labelBars.get(sec.label));
  }
  // Rounding to whole phrases can miss the target: resize whole label groups by 4 bars.
  const totalBars = () => sections.reduce((a, x) => a + x.bars, 0);
  // Core labels first (intro/outro only when needed to hit the target exactly).
  const coreLabels = [...new Set(sections.filter((x) => x.type !== 'intro' && x.type !== 'outro').map((x) => x.label))];
  const labels = [...coreLabels, ...[...labelBars.keys()].filter((l) => !coreLabels.includes(l))];
  const count = (/** @type {string} */ l) => sections.filter((x) => x.label === l).length;
  for (let guard = 0; guard < 64; guard++) {
    const total = totalBars();
    const diff = target - total;
    // Pick the label whose resize brings the total closest to the target.
    let best = null;
    let bestErr = Math.abs(diff);
    for (const l of labels) {
      const step = 4 * count(l) * Math.sign(diff);
      const bars = /** @type {number} */ (labelBars.get(l)) + 4 * Math.sign(diff);
      if (bars < 4 || bars > 32) continue;
      const err = Math.abs(diff - step);
      if (err < bestErr - 1e-9) {
        bestErr = err;
        best = l;
      }
    }
    if (best === null || diff === 0) break;
    const nb = /** @type {number} */ (labelBars.get(best)) + 4 * Math.sign(diff);
    labelBars.set(best, nb);
    for (const x of sections) if (x.label === best) x.bars = nb;
  }
  // Still too long (all groups at their minimum): drop a one-off frame section.
  let rest = target - totalBars();
  while (rest <= -4) {
    const idx = sections.findIndex((x) => (x.type === 'intro' || x.type === 'outro' || x.type === 'breakdown') && count(x.label) === 1 && x.bars <= -rest);
    if (idx < 0) break;
    rest += sections[idx].bars;
    sections.splice(idx, 1);
  }
  // Very short targets (jingles, short loops): keep the opening sections that fit, then
  // pad the last one to the exact length.
  while (totalBars() > target && sections.length > 1) sections.pop();
  const gap = target - totalBars();
  if (gap > 0 && sections.length === 1) sections[0].bars += gap;
  else if (gap >= 4 && sections.length > 0) {
    // Sections sharing a label must keep sharing their length: pad a one-off section,
    // otherwise the last one becomes a section of its own.
    const extra = Math.floor(gap / 4) * 4;
    const single = [...sections].reverse().find((x) => count(x.label) === 1);
    if (single) single.bars += extra;
    else {
      const lastSec = sections[sections.length - 1];
      lastSec.bars += extra;
      lastSec.label = `${lastSec.label}2`;
    }
  }
  for (const s of sections) {
    s.beat = beat;
    beat += s.bars * barLen;
  }
  return sections;
}

/**
 * @typedef {object} ComposedSong
 * @property {import('../core/score.js').Score} score
 * @property {import('../render/score-renderer.js').RenderOptions} render options for renderScore (mix, reverb, delay)
 * @property {SongSection[]} sections
 * @property {string[]} lines human-readable description
 * @property {import('../theory/key.js').Key} key
 * @property {number} bpm
 * @property {import('./axes.js').AxisEffects} axes
 */

/**
 * @param {import('./recipe.js').Recipe} recipe
 * @returns {ComposedSong}
 */
export function composeSong(recipe) {
  assertValidRecipe(recipe);
  const rng = new Rng(recipe.seed, `song:${recipe.style}`);
  const varied = applyVariety(getStyle(recipe.style), recipe.variety ?? 0, rng.fork('variety'));
  const style = varied.style;
  const fx = resolveAxes(style.axes, recipe.axes);
  // A hook supplied by the recipe becomes the basic idea of the A sections.
  /** @type {import('../compose/melody/motif.js').Motif | null} */
  const ownMotif = recipe.motif
    ? { notes: recipe.motif.map(([t, d, deg]) => ({ t, d, deg })), length: Math.max(1, Math.ceil(Math.max(...recipe.motif.map(([t, d]) => t + d)) - 1e-9)) }
    : null;
  const meter = style.meter;
  const barLen = barLengthBeats(meter.num, meter.den);
  const baseDialect = DIALECTS[style.harmony.dialect];
  const dialect = {
    ...baseDialect,
    rhythm: {
      split: clamp01(baseDialect.rhythm.split + fx.splitBoost),
      merge: clamp01(baseDialect.rhythm.merge + fx.mergeBoost),
    },
  };
  const bpm = recipe.bpm ?? Math.round((style.tempo[0] + rng.fork('tempo').float() * (style.tempo[1] - style.tempo[0])) * fx.tempoFactor);
  const key = chooseKey(style, recipe, fx, rng.fork('key'), dialect);
  const sections = planForm(style, recipe, bpm, barLen, rng.fork('form'));
  const roles = style.roles;
  const melodyProfile = roles.melody ? MELODY_PROFILES[roles.melody.profile] : null;
  const swing = melodyProfile?.swing ?? 0;
  const cadences = forMode(dialect.cadences, key.mode);
  const hasHalf = Object.hasOwn(cadences, 'half');
  const phraseBars = style.harmony.phraseBars ?? 4;
  const looping = recipe.loop ?? style.form.loop ?? false;

  /** @type {Map<string, { harmony: HarmonyEvent[], melody: ReturnType<typeof generateMelody> | null, voicings: Map<string, number[][]> }>} */
  const material = new Map();
  /** @type {Map<string, ReturnType<typeof generateMelody>>} */
  const firstMelody = new Map();
  /** @type {Map<string, number>} */
  const occurrences = new Map();

  /** @type {Record<string, NoteEvent[]>} */
  const parts = {};
  /** @type {Record<string, string>} */
  const instruments = {};
  /** @type {Record<string, string>} */
  const trackRoles = {};
  /**
   * @param {string} id
   * @param {string} instrument
   * @param {string} role
   * @param {NoteEvent[]} events
   */
  const add = (id, instrument, role, events) => {
    (parts[id] ??= []).push(...events);
    instruments[id] = instrument;
    trackRoles[id] = role;
  };
  /**
   * @param {NoteEvent[]} events
   * @param {number} offset
   * @param {number} scale velocity factor
   */
  const shift = (events, offset, scale = 1) => events.map((e) => ({ ...e, t: e.t + offset, v: Math.min(1, Math.max(0.05, e.v * scale)) }));
  /** @param {{ minIntensity?: number } | undefined} role @param {number} intensity */
  const active = (role, intensity) => !!role && intensity >= (role.minIntensity ?? 0) + fx.thresholdShift - 1e-9;

  /** @type {SongSection[]} */
  const plan = [];
  sections.forEach((sec, si) => {
    const occ = occurrences.get(sec.label) ?? 0;
    occurrences.set(sec.label, occ + 1);
    const matKey = `${sec.label}:${sec.bars}`;
    const isEdge = sec.type === 'intro' || sec.type === 'outro' || sec.type === 'breakdown';
    const last = si === sections.length - 1;

    // Material (harmony; melody motif per label).
    let mat = material.get(matKey);
    if (!mat) {
      const n = Math.max(1, Math.round(sec.bars / phraseBars));
      const phrases = Array.from({ length: n }, (_, i) => {
        const bars = i === n - 1 ? sec.bars - phraseBars * (n - 1) : phraseBars;
        let cadence = i < n - 1 && hasHalf ? 'half' : undefined;
        if (i === n - 1 && looping && last && Object.hasOwn(cadences, 'open')) cadence = 'open';
        return { bars, cadence, pedal: /** @type {'tonic' | null} */ (fx.pedal && isEdge ? 'tonic' : null) };
      });
      const harmony = generateHarmony({ key, dialect, phrases, rng: rng.fork(`harmony:${matKey}`), meter, chromaticism: (style.harmony.chromaticism ?? 1) * fx.chromaticism });
      mat = { harmony, melody: null, voicings: new Map() };
      material.set(matKey, mat);
    }
    const harmony = mat.harmony;
    const vScale = 0.78 + 0.3 * sec.intensity;
    const off = sec.beat;
    /** @param {import('../compose/harmony/voicing.js').VoicingStyle} vs */
    const voiced = (vs) => {
      const m = /** @type {NonNullable<typeof mat>} */ (mat);
      let v = m.voicings.get(vs);
      if (!v) {
        v = voiceProgression(harmony, { style: vs, rules: dialect.rules });
        m.voicings.set(vs, v);
      }
      return v;
    };
    /** @type {string[]} */
    const on = [];

    if (roles.pad && active(roles.pad, sec.intensity)) {
      const v = voiced(roles.pad.voicing ?? 'pad');
      add('pad', roles.pad.instrument, 'pad', shift(compChords(harmony, v, { rng: rng.fork(`pad${si}`), pattern: 'sustain', velocity: roles.pad.velocity ?? 0.5 }), off, vScale));
      on.push('pad');
    }
    if (roles.chords && active(roles.chords, sec.intensity)) {
      const v = voiced(roles.chords.voicing ?? 'pop');
      add('chords', roles.chords.instrument, 'chords', shift(compChords(harmony, v, { rng: rng.fork(`comp${si}`), pattern: roles.chords.comp ?? 'sustain', velocity: roles.chords.velocity ?? 0.55, swing, meter }), off, vScale));
      on.push('chords');
    }
    let bassLine = /** @type {NoteEvent[]} */ ([]);
    if (roles.bass && active(roles.bass, sec.intensity)) {
      let pattern = roles.bass.patterns.filter(([th]) => sec.intensity >= th + fx.thresholdShift - 1e-9).at(-1)?.[1] ?? roles.bass.patterns[0][1];
      if (fx.bassForce && sec.intensity >= 0.4) pattern = fx.bassForce;
      if (sec.type === 'breakdown') pattern = 'root';
      bassLine = generateBassLine({ harmony, rng: rng.fork(`bass${si}`), pattern, range: roles.bass.range, swing, meter, velocity: roles.bass.velocity ?? 0.75 });
      add('bass', roles.bass.instrument, 'bass', shift(bassLine, off, vScale));
      on.push(`bass (${pattern})`);
    }
    if (fx.subLayer && sec.intensity >= 0.35 && (bassLine.length > 0 || roles.drone)) {
      const sub = bassLine.length > 0 ? bassLine.map((e) => ({ ...e, p: e.p >= 36 ? e.p - 12 : e.p })) : [];
      if (sub.length) {
        add('sub', style.axisInstruments?.sub ?? 'bass.sub', 'sub', shift(sub, off, 0.8 * vScale));
        on.push('sub');
      }
    }

    // Melody (and its variation on repeated labels).
    const melodyAllowed = roles.melody && !isEdge && (!roles.melody.sections || roles.melody.sections.includes(sec.label)) && active(roles.melody, sec.intensity) && !(fx.melodySparse && occ === 0 && sec.label === 'A');
    /** @type {NoteEvent[]} */
    let melodyNotes = [];
    if (melodyAllowed && roles.melody) {
      const first = firstMelody.get(sec.label);
      const mel =
        occ === 0 || !first
          ? generateMelody({ harmony, rng: rng.fork(`melody:${sec.label}`), profile: roles.melody.profile, meter, density: fx.melodyDensity, ...(ownMotif && sec.label === 'A' ? { motif: ownMotif, fidelity: 4 } : {}) })
          : generateMelody({ harmony, rng: rng.fork(`melody:${sec.label}:${occ}`), profile: roles.melody.profile, meter, motif: first.motif, density: fx.melodyDensity });
      if (!first) firstMelody.set(sec.label, mel);
      const oct = roles.melody.octave ?? 0;
      melodyNotes = mel.notes.map(({ t, d, p, v, art }) => (art ? { t, d, p: p + oct, v, art } : { t, d, p: p + oct, v }));
      if (roles.melody.ornaments) melodyNotes = ornamentFolk(melodyNotes, keyScale(harmony[0].key).pcs, rng.fork(`orn${si}`), { amount: roles.melody.ornaments });
      add('melody', roles.melody.instrument, 'melody', shift(melodyNotes, off, vScale));
      if (mel.response.length) add('response', roles.counter?.instrument ?? 'keys.mallet', 'melody', shift(mel.response.map(({ t, d, p, v }) => ({ t, d, p: p + oct, v })), off, vScale * 0.9));
      if (fx.octaveDouble && sec.intensity >= 0.6) add('melodyLow', roles.melody.instrument, 'melody', shift(melodyNotes.map((e) => ({ ...e, p: e.p - 12 })), off, 0.7 * vScale));
      on.push(occ === 0 ? 'melody' : `melody (variation ${occ})`);
      if (roles.counter && active(roles.counter, sec.intensity)) {
        const counter = generateCounterMelody({ melody: melodyNotes, harmony, rng: rng.fork(`counter${si}`), meter });
        add('counter', roles.counter.instrument, 'pluck', shift(counter, off, vScale));
        on.push('counter');
      }
    }

    // Additional parts (orchestral and band styles): second pads and comping, counter-lines,
    // melody doublings, ostinati, timpani, brass riffs.
    for (const layer of roles.layers ?? []) {
      if (!active(layer, sec.intensity) || sec.intensity > (layer.maxIntensity ?? 1) + 1e-9) continue;
      if (layer.sections && !layer.sections.includes(sec.label)) continue;
      const lrng = rng.fork(`${layer.id}${si}`);
      /** @type {NoteEvent[]} */
      let ev = [];
      switch (layer.type) {
        case 'pad':
          ev = compChords(harmony, voiced(layer.voicing ?? 'pad'), { rng: lrng, pattern: 'sustain', velocity: layer.velocity ?? 0.5 });
          break;
        case 'chords':
          ev = compChords(harmony, voiced(layer.voicing ?? 'pop'), { rng: lrng, pattern: layer.comp ?? 'sustain', velocity: layer.velocity ?? 0.55, swing, meter });
          break;
        case 'counter':
          if (melodyNotes.length) ev = generateCounterMelody({ melody: melodyNotes, harmony, rng: lrng, meter, position: layer.position ?? 'below' });
          break;
        case 'double':
          ev = melodyNotes.map((e) => ({ ...e, p: e.p + (layer.octave ?? -12), v: e.v * (layer.velocity ?? 0.8) }));
          break;
        case 'ostinato':
          ev = generateArpeggio(harmony, voiced('pop'), { rng: lrng, pattern: layer.pattern ?? 'pulse', rate: layer.rate ?? 0.5, octaves: layer.octaves ?? 1, velocity: layer.velocity ?? 0.6, transpose: layer.transpose, swing });
          break;
        case 'timpani': {
          const next = sections[si + 1];
          ev = generateTimpani({ harmony, rng: lrng, intensity: sec.intensity, meter, rollAtEnd: !!next && next.intensity > sec.intensity + 0.1, phraseBars });
          break;
        }
        case 'riffs':
          ev = generateRiffs(harmony, voiced(layer.voicing ?? 'jazz'), { rng: lrng, swing, meter, velocity: layer.velocity ?? 0.75, density: sec.intensity, center: layer.center });
          break;
        default:
      }
      if (layer.art) ev = ev.map((e) => ({ ...e, art: layer.art }));
      if (ev.length) {
        add(layer.id, layer.instrument, layer.mixRole ?? LAYER_MIX_ROLE[layer.type], shift(ev, off, vScale));
        on.push(layer.id);
      }
    }

    const arpRole = roles.arp ?? (fx.arpForce ? { instrument: style.axisInstruments?.arp ?? 'pluck.synth', pattern: /** @type {const} */ (style.axisInstruments?.arp ? 'pulse' : 'up'), rate: 0.25, octaves: style.axisInstruments?.arp ? 1 : 2, minIntensity: 0.35, velocity: 0.5 } : null);
    if (arpRole && active(arpRole, sec.intensity)) {
      const v = voiced('pop');
      add('arp', arpRole.instrument, 'arp', shift(generateArpeggio(harmony, v, { rng: rng.fork(`arp${si}`), pattern: arpRole.pattern, rate: arpRole.rate, octaves: arpRole.octaves, velocity: arpRole.velocity, transpose: /** @type {any} */ (arpRole).transpose, swing }), off, vScale));
      on.push('arp');
    }

    // Pulse axis on styles with their own arpeggio: an extra motoric ostinato in the
    // style's instrument (e.g. spiccato strings next to the harp).
    if (fx.arpForce && roles.arp && style.axisInstruments?.arp && style.axisInstruments.arp !== roles.arp.instrument && sec.intensity >= 0.35) {
      add('ostinato', style.axisInstruments.arp, 'arp', shift(generateArpeggio(harmony, voiced('pop'), { rng: rng.fork(`ost${si}`), pattern: 'pulse', rate: 0.25, octaves: 1, velocity: 0.55, swing }), off, vScale));
      on.push('ostinato');
    }

    if (roles.drums && active(roles.drums, sec.intensity) && sec.type !== 'breakdown') {
      const next = sections[si + 1] ?? (recipe.loop ? sections[0] : undefined);
      const groove = generateGroove({
        groove: roles.drums.groove,
        rng: rng.fork(`drums${si}`),
        startBeat: 0,
        bars: sec.bars,
        intensity: sec.intensity,
        syncopation: fx.syncopation,
        bpm,
        meter,
        crash: (si > 0 || !!recipe.loop) && sec.intensity >= 0.5,
        fillAtEnd: !!next && next.type !== 'breakdown',
      });
      add('drums', roles.drums.instrument, 'drums', shift(groove, off, vScale));
      on.push('drums');
    }

    if ((roles.drone && active(roles.drone, sec.intensity)) || (fx.droneForce && !roles.drone)) {
      const tonicPc = pitchClass(key.tonic);
      const p = 36 + mod(tonicPc - 36, 12) + (mod(tonicPc - 36, 12) > 7 ? -12 : 0);
      /** @type {NoteEvent[]} */
      const drone = [];
      for (let b = 0; b < sec.bars; b += 4) drone.push({ t: b * barLen, d: Math.min(4, sec.bars - b) * barLen, p, v: roles.drone?.velocity ?? 0.5 });
      add('drone', roles.drone?.instrument ?? style.axisInstruments?.drone ?? 'bass.sub', 'drone', shift(drone, off, vScale));
      on.push('drone');
    }

    const textureRole = roles.texture ?? (fx.textureForce ? { instrument: style.axisInstruments?.texture ?? 'pad.glass' } : null);
    if (textureRole && active(textureRole, sec.intensity)) {
      const len = sec.bars * barLen;
      const tonicPc = pitchClass(key.tonic);
      const notes = textureRole.instrument === 'texture.vinyl' ? [60] : [72 + tonicPc, 74 + tonicPc];
      add('texture', textureRole.instrument, 'texture', notes.map((p) => ({ t: off, d: len, p, v: 0.5 })));
      on.push('texture');
    }

    // FX: riser into rising sections, boom/impact on strong section starts.
    const fxRole = roles.fx ?? (fx.boom ? { instrument: style.axisInstruments?.boom ?? 'kit.hybrid', boom: true } : null);
    if (fxRole && si > 0) {
      const prev = sections[si - 1];
      /** @type {NoteEvent[]} */
      const hits = [];
      const rise = sec.intensity - prev.intensity;
      if (fxRole.riser && rise >= 0.15) {
        const len = (rise >= 0.3 ? 2 : 1) * barLen;
        hits.push({ t: off - len, d: len, p: DRUM_NOTES.riser, v: 0.6 + 0.3 * sec.intensity });
      }
      if ((fxRole.boom || fx.boom) && sec.intensity >= 0.6) hits.push({ t: off, d: 2, p: DRUM_NOTES.boom, v: 0.7 + 0.3 * sec.intensity });
      if ((fxRole.impact || fx.impactHits) && sec.intensity >= 0.8) hits.push({ t: off, d: 2, p: DRUM_NOTES.impact, v: 0.9 });
      if (hits.length) {
        add('fx', fxRole.instrument, 'percussion', hits);
        on.push('fx');
      }
    }

    plan.push({ type: sec.type, label: sec.label, bars: sec.bars, beat: sec.beat, intensity: sec.intensity, occurrence: occ, roles: on, chords: harmony.map((h) => formatChordSymbol(h.chord)) });
  });

  // Tempo map: optional accelerando into the last core section, ritardando in the outro.
  const totalBeats = sections.reduce((a, s) => a + s.bars * barLen, 0);
  /** @type {import('../core/tempo-map.js').TempoPoint[]} */
  const tempoMap = [{ beat: 0, bpm }];
  let endBpm = bpm;
  const coreLast = [...sections].reverse().find((s) => s.type !== 'outro');
  if (fx.accelerate && !recipe.loop && coreLast && coreLast.beat > 0) {
    endBpm = Math.round(bpm * 1.06);
    tempoMap.push({ beat: coreLast.beat, bpm }, { beat: coreLast.beat + coreLast.bars * barLen, bpm: endBpm, ramp: 'linear' });
  }
  const outro = sections.at(-1);
  if (style.form.ritardando && !recipe.loop && outro && outro.type === 'outro') {
    if (tempoMap.at(-1)?.beat !== outro.beat) tempoMap.push({ beat: outro.beat, bpm: endBpm });
    tempoMap.push({ beat: totalBeats, bpm: Math.round(endBpm * 0.88), ramp: 'linear' });
  }
  const uniqueTempo = tempoMap.filter((p, i) => i === 0 || p.beat > tempoMap[i - 1].beat);

  /** @type {import('../core/score.js').Track[]} */
  const tracks = Object.keys(parts).map((id) => ({
    id,
    role: trackRoles[id],
    instrument: instruments[id],
    events: parts[id].filter((e) => e.t >= 0 && e.t < totalBeats + 16).sort((a, b) => a.t - b.t),
  }));

  // Mix: style defaults scaled by the axes.
  /** @type {Record<string, import('../render/score-renderer.js').TrackMix>} */
  const mix = {};
  for (const id of Object.keys(parts)) {
    const base = style.mix.roles?.[id] ?? style.mix.roles?.[trackRoles[id]] ?? {};
    /** @type {import('../render/score-renderer.js').TrackMix} */
    const m = { ...base };
    if (base.sends) m.sends = Object.fromEntries(Object.entries(base.sends).map(([k, v]) => [k, Math.min(1, v * fx.sendScale)]));
    if (id === 'drums' || id === 'fx') m.gainDb = (base.gainDb ?? 0) + fx.drumsGainDb;
    if (id === 'melodyLow') m.gainDb = (style.mix.roles?.melody?.gainDb ?? -2) - 5;
    mix[id] = m;
  }
  const reverb = { ...style.mix.reverb };
  reverb.rt60 = Math.min(12, Math.max(0.3, fx.reverbFloor, (reverb.rt60 ?? 2.2) * fx.reverbScale));
  // Cathedral-sized spaces: convolution with a generated, dense impulse response.
  if (fx.reverbFloor > 0 || reverb.rt60 >= 4.5) /** @type {any} */ (reverb).type = 'cathedral';
  reverb.size = Math.min(2, Math.max(0.3, (reverb.size ?? 1) + fx.sizeShift));

  const score = createScore({
    meta: { engine: recipe.engine, title: recipe.title ?? `${style.label} (${recipe.seed})`, seed: recipe.seed, style: style.id },
    tempoMap: uniqueTempo,
    meterMap: [{ beat: 0, num: meter.num, den: meter.den }],
    keyMap: [{ beat: 0, tonic: formatPitchName(key.tonic), mode: key.mode }],
    sections: plan.map((p) => ({ beat: p.beat, name: `${p.type}:${p.label}`, intensity: p.intensity })),
    tracks,
  });

  const lines = [
    `${style.label} · ${formatPitchName(key.tonic)} ${key.mode} · ${bpm} BPM${endBpm !== bpm ? ` → ${endBpm}` : ''} · ${sections.reduce((a, s) => a + s.bars, 0)} Takte`,
    `Achsen: ${AXES.map((a) => `${AXIS_LABELS[a]} ${fx.values[a].toFixed(2)}`).join(', ')}`,
    ...(varied.chosen.length ? [`Varianten: ${varied.chosen.join(' · ')}`] : []),
    ...plan.map((p) => `Takt ${String(p.beat / barLen + 1).padStart(3)}  ${(`${p.type} ${p.label}`).padEnd(12)} ${String(p.bars).padStart(2)} T.  Intensität ${p.intensity.toFixed(2)}  [${p.roles.join(', ')}]  ${p.chords.slice(0, 8).join(' ')}${p.chords.length > 8 ? ' …' : ''}`),
  ];

  return { score, render: { mix, reverb, delayBeats: style.mix.delayBeats }, sections: plan, lines, key, bpm, axes: fx };
}
