// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Melody generation over a given harmony.
 *  1. Phrases are read from the harmony (cadence tags). A form plan
 *     (sentence, period, short phrase, loop, call-and-response) turns the
 *     basic idea into segments: repetition, sequence, fragmentation,
 *     contrasting idea, new ending, cadential close.
 *  2. A beam search chooses every pitch. It balances fidelity to the motif
 *     (contour in scale steps from a segment anchor) against tonal rules:
 *     chord tones on strong beats, stepwise resolution of non-chord tones,
 *     gap-fill after leaps, avoided tritone/seventh leaps, a single climax
 *     in the later part of the phrase, cadence goals (tonic after authentic
 *     cadences, a tone of V on half cadences), range and register.
 *     Gumbel noise from the seeded PRNG makes the search a deterministic
 *     sampler; the profile's "surprise" loosens the rules.
 * Ref: Huron, "Sweet Anticipation" (2006) and Narmour (1990) for
 * expectation (small intervals, post-leap reversal); Caplin, "Classical
 * Form" (1998) for sentence/period; Aldwell/Schachter for non-chord tones.
 */

import { keyScale } from '../../theory/key.js';
import { pitchClass, mod } from '../../theory/pitch.js';
import { barLengthBeats } from '../../core/meter-map.js';
import { getMelodyProfile } from './profiles.js';
import { generateMotif, transformMotif } from './motif.js';

/** @typedef {import('../harmony/chord-utils.js').HarmonyEvent} HarmonyEvent */
/** @typedef {import('./motif.js').Motif} Motif */

/**
 * @typedef {object} Segment
 * @property {number} start beat
 * @property {Motif} motif
 * @property {string} op development technique used
 * @property {{ ref: number | null, offset: number }} anchor anchor relative to an earlier segment
 * @property {'lead' | 'response'} voice
 * @property {{ type: 'authentic' | 'half' | 'other', finalBeat: number, end: number } | null} cadence
 * @property {number} phrase index of the harmonic phrase
 */

/**
 * @typedef {import('../../core/score.js').NoteEvent & { role: 'chord' | 'nct' | 'chromatic', voice: 'lead' | 'response', seg: number }} MelodyNote
 */

/**
 * Phrases of a harmony, from its cadence tags.
 * @param {HarmonyEvent[]} harmony
 * @returns {{ start: number, end: number, cadence: 'authentic' | 'half' | 'other', finalBeat: number }[]}
 */
export function harmonyPhrases(harmony) {
  const out = [];
  let start = harmony[0].beat;
  harmony.forEach((e, i) => {
    const next = harmony[i + 1];
    const endsPhrase = e.tags.includes('cadence') && (!next || !next.tags.includes('cadence'));
    if (endsPhrase || !next) {
      const tonic = pitchClass(e.key.tonic);
      const root = pitchClass(e.chord.root);
      const cadence = root === tonic ? 'authentic' : root === mod(tonic + 7, 12) ? 'half' : 'other';
      out.push({ start, end: e.beat + e.dur, cadence, finalBeat: e.beat });
      start = e.beat + e.dur;
    }
  });
  return /** @type {any} */ (out);
}

/**
 * Builds the segment plan of a melody.
 * @param {ReturnType<typeof harmonyPhrases>} phrases
 * @param {import('./profiles.js').MelodyProfile} profile
 * @param {string} form
 * @param {Motif} basic
 * @param {import('../../core/prng.js').Rng} rng
 * @returns {Segment[]}
 */
function planSegments(phrases, profile, form, basic, rng) {
  /** @type {Segment[]} */
  const segs = [];
  const M = basic.length;
  /** @type {Motif | null} */
  let contrasting = null;
  let biIndex = -1;
  phrases.forEach((ph, k) => {
    const len = ph.end - ph.start;
    const n = Math.max(1, Math.round(len / M));
    const segLen = len / n;
    const fit = (/** @type {Motif} */ m) => (Math.abs(m.length - segLen) < 1e-9 ? m : scaleMotif(m, segLen));
    const cadence = { type: ph.cadence, finalBeat: ph.finalBeat, end: ph.end };
    for (let i = 0; i < n; i++) {
      const start = ph.start + i * segLen;
      const last = i === n - 1;
      /** @type {Segment} */
      let seg;
      const base = { start, voice: /** @type {'lead' | 'response'} */ ('lead'), cadence: last ? cadence : null, phrase: k };
      if (form === 'period' && phrases.length >= 2) {
        const antecedent = k % 2 === 0;
        if (i === 0) {
          seg = { ...base, motif: fit(basic), op: antecedent ? 'basic idea' : 'basic idea (repeat)', anchor: antecedent || biIndex < 0 ? { ref: null, offset: 0 } : { ref: biIndex, offset: 0 } };
          if (antecedent && k === 0) biIndex = segs.length;
        } else if (last) {
          if (antecedent || !contrasting) contrasting = transformMotif(basic, 'new', { rng, profile });
          seg = { ...base, motif: fit(antecedent ? contrasting : transformMotif(contrasting, 'newEnding', { rng, profile })), op: antecedent ? 'contrasting idea' : 'contrasting idea, new ending', anchor: { ref: null, offset: 0 } };
        } else {
          seg = { ...base, motif: fit(basic), op: 'sequence', anchor: { ref: segs.length - 1, offset: rng.pick([1, -1, 2]) } };
        }
      } else if (form === 'sentence') {
        if (i === 0) {
          seg = { ...base, motif: fit(basic), op: 'basic idea', anchor: k === 0 || biIndex < 0 ? { ref: null, offset: 0 } : { ref: biIndex, offset: 0 } };
          if (k === 0) biIndex = segs.length;
        } else if (last) {
          seg = { ...base, motif: fit(transformMotif(basic, 'newEnding', { rng, profile })), op: 'cadential idea', anchor: { ref: null, offset: 0 } };
        } else if (i === 1) {
          const off = rng.weighted([0, 1, 2, -1], [1, 2, 1, 1]);
          seg = { ...base, motif: fit(basic), op: off === 0 ? 'repetition' : `sequence ${off > 0 ? '+' : ''}${off}`, anchor: { ref: segs.length - 1, offset: off } };
        } else {
          seg = { ...base, motif: fit(transformMotif(basic, 'fragment', { steps: rng.pick([1, -1]) })), op: 'fragmentation', anchor: { ref: segs.length - 1, offset: rng.pick([1, 2, -1]) } };
        }
      } else if (form === 'callResponse') {
        // Calls and responses alternate; the lead always closes the phrase with the cadence.
        const call = i % 2 === 0 || last;
        if (call) {
          const first = biIndex < 0;
          seg = { ...base, motif: fit(last ? transformMotif(basic, 'newEnding', { rng, profile }) : basic), op: first ? 'call' : last ? 'call (cadential)' : 'call (varied)', anchor: first ? { ref: null, offset: 0 } : { ref: biIndex, offset: rng.weighted([0, 1, -1, 2], [2, 1, 1, 0.5]) } };
          if (first) biIndex = segs.length;
        } else {
          contrasting = contrasting ?? transformMotif(basic, 'new', { rng, profile });
          seg = { ...base, voice: 'response', motif: fit(i > 1 ? transformMotif(contrasting, 'repeat') : contrasting), op: 'response', anchor: { ref: null, offset: 0 } };
        }
      } else if (form === 'loop') {
        seg = i === 0 && k === 0
          ? { ...base, motif: fit(basic), op: 'basic idea', anchor: { ref: null, offset: 0 } }
          : { ...base, motif: fit(last ? transformMotif(basic, 'newEnding', { rng, profile }) : basic), op: last ? 'variation (return)' : 'sequence', anchor: { ref: segs.length - 1, offset: last ? 0 : rng.pick([1, -1, 2, -2]) } };
        if (i === 0 && k === 0) biIndex = segs.length;
      } else {
        // phrase4: idea and response alternate; one response motif per phrase,
        // varied at the cadence; later phrases vary the idea.
        if (i % 2 === 0) {
          const firstIdea = k === 0 && i === 0;
          const motif = firstIdea ? basic : transformMotif(basic, i === 0 ? rng.pick(['repeat', 'newEnding']) : 'repeat', { rng, profile });
          seg = { ...base, motif: fit(last ? transformMotif(motif, 'newEnding', { rng, profile }) : motif), op: firstIdea ? 'basic idea' : 'idea (varied)', anchor: firstIdea || biIndex < 0 ? { ref: null, offset: 0 } : { ref: biIndex, offset: i === 0 ? rng.pick([0, 1, -1]) : rng.pick([1, -1, 2]) } };
          if (firstIdea) biIndex = segs.length;
        } else {
          if (i === 1 || !contrasting) contrasting = transformMotif(basic, 'new', { rng, profile });
          const motif = last ? transformMotif(contrasting, 'newEnding', { rng, profile }) : contrasting;
          seg = { ...base, motif: fit(motif), op: last ? 'response (cadential)' : 'response', anchor: { ref: null, offset: 0 } };
        }
      }
      segs.push(seg);
    }
  });
  return segs;
}

/**
 * Stretches or compresses a motif to a new length (proportionally).
 * @param {Motif} m
 * @param {number} length
 * @returns {Motif}
 */
function scaleMotif(m, length) {
  const f = length / m.length;
  return { length, notes: m.notes.map((n) => ({ ...n, t: n.t * f, d: n.d * f })) };
}

/**
 * Swing timing: maps straight off-beat eighths to a later position.
 * @param {number} t beats
 * @param {number} s swing delay of the off-beat in beats (0…0.25)
 */
export function swingTime(t, s) {
  if (s === 0) return t;
  const b = Math.floor(t + 1e-9);
  const f = t - b;
  return f <= 0.5 ? b + (f * (0.5 + s)) / 0.5 : b + 0.5 + s + ((f - 0.5) * (0.5 - s)) / 0.5;
}

/** @param {import('../../core/prng.js').Rng} rng */
const gumbel = (rng) => -Math.log(-Math.log(Math.min(1 - 1e-12, Math.max(1e-12, rng.float()))));

/**
 * @typedef {object} MelodyOptions
 * @property {HarmonyEvent[]} harmony
 * @property {import('../../core/prng.js').Rng} rng
 * @property {string | import('./profiles.js').MelodyProfile} [profile] default "pop"
 * @property {'period' | 'sentence' | 'phrase4' | 'loop' | 'callResponse'} [form] default: the profile's
 * @property {{ num: number, den: number }} [meter] default 4/4
 * @property {[number, number]} [range] MIDI range of the lead (default from the profile)
 * @property {Motif} [motif] reuse a given basic idea (themes)
 * @property {number} [surprise] 0…1 overrides the profile
 * @property {number} [fidelity] weight of staying on the motif's contour (default 1; higher for given hooks)
 * @property {number} [density] 0…1 rhythm density
 * @property {number} [beamWidth] default 24
 */

/**
 * @typedef {object} MelodyResult
 * @property {MelodyNote[]} notes lead voice
 * @property {MelodyNote[]} response response voice (call-and-response forms), else empty
 * @property {Motif} motif the basic idea
 * @property {{ start: number, op: string, voice: string, phrase: number }[]} plan
 */

/**
 * @param {MelodyOptions} options
 * @returns {MelodyResult}
 */
export function generateMelody(options) {
  const profile = getMelodyProfile(options.profile ?? 'pop');
  const { harmony, rng } = options;
  if (harmony.length === 0) throw new RangeError('generateMelody: empty harmony');
  const meter = options.meter ?? { num: 4, den: 4 };
  const barLen = barLengthBeats(meter.num, meter.den);
  const surprise = options.surprise ?? profile.surprise;
  const fidelity = options.fidelity ?? 1;
  const form = options.form ?? profile.form;
  const key = harmony[0].key;
  const scale = keyScale(key);
  const tonicPc = pitchClass(key.tonic);
  const lo = options.range?.[0] ?? Math.round(profile.center - profile.span / 2 - 2);
  const hi = options.range?.[1] ?? Math.round(profile.center + profile.span / 2 + 2);
  const center = (lo + hi) / 2;

  const phrases = harmonyPhrases(harmony);
  const minPhrase = Math.min(...phrases.map((p) => p.end - p.start));
  const motifLen = Math.min(options.motif?.length ?? profile.motifBeats, Math.max(barLen, minPhrase / 2));
  const basic = options.motif ?? generateMotif(profile, rng.fork('motif'), { length: motifLen, density: options.density });
  const segs = planSegments(phrases, profile, form, basic, rng.fork('plan'));

  // Flatten segments into note slots; the cadential note is placed on the final chord.
  const melStart = phrases[0].start;
  const melEnd = phrases[phrases.length - 1].end;
  /** @type {{ t: number, d: number, rel: number, rest: boolean, seg: number, first: boolean, phraseEnd: boolean, cadence: Segment['cadence'], x: number, gx: number, voice: 'lead' | 'response' }[]} */
  const slots = [];
  segs.forEach((seg, si) => {
    const sounding = seg.motif.notes.filter((n) => !n.rest);
    const d0 = sounding[0]?.deg ?? 0;
    let notes = seg.motif.notes.map((n) => ({ ...n, t: seg.start + n.t }));
    if (seg.cadence) {
      // The last sounding note lands on the final chord and lasts (almost) to the end.
      const fb = seg.cadence.finalBeat;
      const breath = seg.cadence.end - fb >= 2 ? 0.5 : 0;
      notes = notes.filter((n) => n.t < fb - 1e-9);
      // Notes before the final chord lead into it; the segment may also start on it.
      if (notes.length > 0) {
        const tail = notes[notes.length - 1];
        tail.d = Math.max(0.25, fb - tail.t);
      }
      notes.push({ t: Math.max(fb, seg.start), d: seg.cadence.end - Math.max(fb, seg.start) - breath, deg: Number.NaN, rest: false });
    }
    const ph = phrases[seg.phrase];
    let first = true;
    notes.forEach((n, ni) => {
      const isLast = ni === notes.length - 1 && seg.cadence !== null;
      slots.push({
        t: n.t,
        d: n.d,
        rel: n.deg - d0,
        rest: !!n.rest,
        seg: si,
        first: !n.rest && first,
        phraseEnd: isLast,
        cadence: isLast ? seg.cadence : null,
        x: (n.t - ph.start) / (ph.end - ph.start),
        gx: (n.t - melStart) / (melEnd - melStart),
        voice: seg.voice,
      });
      if (!n.rest) first = false;
    });
  });

  // Pitch material.
  const allowChroma = profile.chromatic > 0;
  /** @type {number[]} */
  const cands = [];
  for (let m = lo; m <= hi; m++) if (scale.pcs.includes(mod(m, 12)) || allowChroma) cands.push(m);
  /** @type {number[]} */
  const diatonic = [];
  for (let m = lo - 36; m <= hi + 36; m++) if (scale.pcs.includes(mod(m, 12))) diatonic.push(m);
  /** @param {number} m @returns {number} scale index (x.5 for chromatic notes) */
  const idxOf = (m) => {
    let lo2 = 0;
    let hi2 = diatonic.length - 1;
    while (lo2 < hi2) {
      const mid = (lo2 + hi2 + 1) >> 1;
      if (diatonic[mid] <= m) lo2 = mid;
      else hi2 = mid - 1;
    }
    return diatonic[lo2] === m ? lo2 : lo2 + 0.5;
  };
  /** @param {number} beat */
  const chordAt = (beat) => {
    let e = harmony[0];
    for (const h of harmony) {
      if (h.beat <= beat + 1e-9) e = h;
      else break;
    }
    return e;
  };
  const chordPcsCache = new Map(harmony.map((h) => [h, new Set(h.tones.map(pitchClass))]));
  /** @param {number} t */
  const strength = (t) => {
    const pos = mod(t, barLen);
    if (pos < 1e-6) return 1;
    if (barLen >= 4 && Math.abs(pos - barLen / 2) < 1e-6) return 0.7;
    if (Math.abs(pos - Math.round(pos)) < 1e-6) return 0.4;
    return 0.15;
  };
  const blue = new Set(profile.blueNotes.map((b) => mod(tonicPc + b, 12)));
  const leapScale = 1.3 - surprise;

  /** @typedef {{ midis: number[], idx: number[], roles: ('chord' | 'nct' | 'chromatic')[], anchors: number[], max: number, maxSet: boolean, lastIv: number, lastMove: number, run: number, score: number }} State */
  /** @type {State[]} */
  let beam = [{ midis: [], idx: [], roles: [], anchors: [], max: -1, maxSet: false, lastIv: 0, lastMove: 0, run: 0, score: 0 }];
  const width = options.beamWidth ?? 24;
  const sounding = slots.filter((s) => !s.rest);
  let restBefore = false;
  for (let j = 0; j < slots.length; j++) {
    const slot = slots[j];
    if (slot.rest) {
      restBefore = true;
      continue;
    }
    const chord = chordAt(slot.t);
    const cpcs = /** @type {Set<number>} */ (chordPcsCache.get(chord));
    const s = strength(slot.t);
    const voiceShift = slot.voice === 'response' ? -5 : 0;
    /** @type {State[]} */
    const next = [];
    for (const st of beam) {
      const n = st.midis.length;
      const prev = n > 0 ? st.midis[n - 1] : null;
      for (const c0 of cands) {
        const c = c0 + voiceShift;
        const pc = mod(c, 12);
        const diat = scale.pcs.includes(pc);
        const isChord = cpcs.has(pc);
        const isBlue = blue.has(pc);
        if (!diat && !isBlue && profile.chromatic <= 0) continue;
        const ci = idxOf(c);
        let cost = 0;
        // 1. Motif fidelity / anchor.
        let anchors = st.anchors;
        if (slot.first) {
          const rule = segs[slot.seg].anchor;
          const anchorIdx = Number.isNaN(slot.rel) ? ci : ci - slot.rel;
          // A lone cadential goal note (rel NaN) is free; other segment starts follow their anchor rule.
          if (!Number.isNaN(slot.rel) && rule.ref !== null && st.anchors[rule.ref] !== undefined) cost += 1.6 * Math.abs(anchorIdx - (st.anchors[rule.ref] + rule.offset));
          anchors = st.anchors.slice();
          anchors[slot.seg] = anchorIdx;
        } else if (!Number.isNaN(slot.rel)) {
          // (The cadential goal note has no contour target: rel is NaN.)
          const a = st.anchors[slot.seg];
          const dev = Math.abs(ci - (a + slot.rel));
          cost += fidelity * (dev <= 1 ? 1.2 * dev : 1.2 + 2.2 * (dev - 1));
        }
        // 2. Harmony and metre.
        /** @type {'chord' | 'nct' | 'chromatic'} */
        const role = isChord ? 'chord' : diat ? 'nct' : 'chromatic';
        const longNote = 1 + Math.min(2, slot.d / 2);
        if (isChord) cost -= 1.0 * s;
        else if (role === 'nct') cost += (2.4 * s + 0.1) * longNote;
        else cost += (isBlue ? 1.2 : 2.5) * (1.2 - profile.chromatic) + 2 * s * longNote;
        // 3. Resolution of the previous non-chord tone.
        if (prev !== null) {
          const pr = st.roles[n - 1];
          const dist = Math.abs(c - prev);
          if (pr === 'nct' && !(dist >= 1 && dist <= 2 && isChord)) cost += 4;
          if (pr === 'chromatic' && !(dist === 1 || (blue.has(mod(prev, 12)) && dist <= 2))) cost += 5;
        }
        // 4. Intervals, gap-fill, runs.
        let iv = 0;
        let run = 0;
        if (prev !== null) {
          iv = c - prev;
          const a = Math.abs(iv);
          const restart = slot.first || restBefore ? 0.5 : 1;
          let ivCost = a === 0 ? 0.4 : a <= 2 ? 0 : a <= 4 ? 0.75 : a <= 7 ? 1.5 : a <= 9 ? 2.6 : 3.8;
          if (a === 6) ivCost += 1.5;
          if (a === 10 || a === 11) ivCost += 2.5;
          if (a > profile.maxLeap) ivCost += 8;
          cost += ivCost * leapScale * restart;
          if (a === 0 && st.lastIv === 0 && n > 1) cost += 1;
          // Gap fill: the next movement after a leap (repeated notes in between do not count)
          // should turn back by a small interval.
          if (a > 0 && Math.abs(st.lastMove) >= 5 && (Math.sign(iv) === Math.sign(st.lastMove) || a > 4)) cost += 2.2 * (1 - 0.5 * surprise);
          run = a > 0 && a <= 2 && Math.sign(iv) === Math.sign(st.lastIv) ? st.run + 1 : 0;
          if (run > 5) cost += 0.5;
        }
        // 5. Range and register.
        if (c < lo + voiceShift) cost += 3 * (lo + voiceShift - c);
        if (c > hi + voiceShift) cost += 3 * (c - hi - voiceShift);
        cost += 0.03 * Math.abs(c - center - voiceShift);
        // 6. Climax: one highest note of the whole melody, preferably at 45–85 % of its length.
        let max = st.max;
        let maxSet = st.maxSet;
        if (slot.voice === 'lead') {
          const gx = slot.gx;
          if (n === 0) cost += c > center ? 0.25 * (c - center) : 0; // start in the lower/middle register
          // Register dramaturgy: the upper limit opens up towards the climax zone.
          const cap = center + (hi - lo) * (0.1 + 0.4 * Math.min(1, gx / 0.65));
          if (gx < 0.85 && c > cap) cost += 0.3 * (c - cap);
          if (c > max) {
            // (The cadential goal note is exempt from the late-climax penalty.)
            if (n > 0) cost += gx < 0.45 ? 0.5 * (c - max) : gx <= 0.85 ? -0.8 : slot.phraseEnd ? 0 : 1.5;
            max = c;
            maxSet = gx >= 0.45;
          } else if (c === max) cost += maxSet ? 1.0 : 0.4;
        }
        // 7. Cadence goals.
        if (slot.phraseEnd && slot.cadence) {
          if (slot.cadence.type === 'authentic') cost += pc === tonicPc ? -1 : isChord ? 4.5 : 7;
          else cost += isChord ? (pc === mod(tonicPc + 2, 12) || pc === mod(tonicPc + 11, 12) ? -0.6 : 0) : 5;
          if (prev !== null && Math.abs(c - prev) <= 2) cost -= 0.5;
        }
        cost -= (0.4 + 0.6 * surprise) * 0.7 * gumbel(rng);
        next.push({
          midis: [...st.midis, c],
          idx: [...st.idx, ci],
          roles: [...st.roles, role],
          anchors,
          max,
          maxSet,
          lastIv: prev === null ? 0 : iv,
          lastMove: prev !== null && iv !== 0 ? iv : st.lastMove,
          run,
          score: st.score - cost,
        });
      }
    }
    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, width);
    restBefore = false;
  }
  const best = beam[0];

  // Performance details: legato, phrase dynamics, swing.
  /** @type {MelodyNote[]} */
  const lead = [];
  /** @type {MelodyNote[]} */
  const response = [];
  sounding.forEach((slot, i) => {
    const p = best.midis[i];
    const nextSlot = sounding[i + 1];
    const legato = nextSlot && Math.abs(nextSlot.t - (slot.t + slot.d)) < 1e-6 && Math.abs(best.midis[i + 1] - p) <= 2 && nextSlot.voice === slot.voice;
    const t0 = swingTime(slot.t, profile.swing);
    const t1 = swingTime(slot.t + slot.d, profile.swing);
    const dyn = 0.62 + 0.12 * Math.sin(Math.PI * Math.min(1, Math.max(0, slot.x))) + 0.08 * strength(slot.t) + (p === best.max && slot.voice === 'lead' ? 0.06 : 0) - (slot.voice === 'response' ? 0.05 : 0);
    /** @type {MelodyNote} */
    const note = { t: t0, d: Math.max(0.05, (t1 - t0) * (legato ? 1 : 0.9)), p, v: Math.min(1, Math.max(0.3, dyn)), role: best.roles[i], voice: slot.voice, seg: slot.seg };
    if (legato) note.art = 'legato';
    (slot.voice === 'response' ? response : lead).push(note);
  });
  return { notes: lead, response, motif: basic, plan: segs.map((s) => ({ start: s.start, op: s.op, voice: s.voice, phrase: s.phrase })) };
}

/**
 * Converts melody notes to a score track (drops analysis fields).
 * @param {MelodyNote[]} notes
 * @param {{ id?: string, role?: string, instrument?: string }} [options]
 * @returns {import('../../core/score.js').Track}
 */
export function melodyTrack(notes, { id = 'melody', role = 'melody', instrument } = {}) {
  /** @type {import('../../core/score.js').Track} */
  const track = { id, role, events: notes.map(({ t, d, p, v, art }) => (art ? { t, d, p, v, art } : { t, d, p, v })) };
  if (instrument) track.instrument = instrument;
  return track;
}
