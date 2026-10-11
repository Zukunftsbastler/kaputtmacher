// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Motifs and motivic development. A motif is a rhythm plus a contour in
 * scale steps relative to its first note (an "anchor"), so it can be placed
 * on any degree and in any key or mode. Development techniques follow the
 * classical toolbox (Ref: W. Caplin, "Classical Form", 1998;
 * A. Schoenberg, "Fundamentals of Musical Composition", for the general idea
 * of motive variation): repetition, sequence, inversion, retrograde,
 * augmentation, diminution, fragmentation, interval expansion, new endings.
 */

/**
 * @typedef {object} MotifNote
 * @property {number} t onset relative to the motif start, in beats
 * @property {number} d duration in beats
 * @property {number} deg scale steps relative to the anchor
 * @property {boolean} [rest]
 */

/**
 * @typedef {object} Motif
 * @property {MotifNote[]} notes
 * @property {number} length in beats
 */

/** @typedef {'repeat' | 'sequence' | 'invert' | 'retrograde' | 'augment' | 'diminish' | 'fragment' | 'expand' | 'newEnding' | 'new'} MotifOp */

/**
 * Fills `length` beats with rhythm cells; ends on a longer note.
 * @param {import('./profiles.js').MelodyProfile} profile
 * @param {number} length beats
 * @param {import('../../core/prng.js').Rng} rng
 * @param {{ density?: number }} [options] density 0…1 favours shorter cells
 * @returns {{ t: number, d: number, rest: boolean }[]}
 */
export function generateRhythm(profile, length, rng, { density = 0.5 } = {}) {
  /** @type {{ t: number, d: number, rest: boolean }[]} */
  const out = [];
  let t = 0;
  const ending = rng.pick(profile.endings.filter((e) => e <= length / 2) .concat([Math.min(...profile.endings)]));
  const body = length - ending;
  while (t < body - 1e-9) {
    const room = body - t;
    const fitting = profile.cells.filter((c) => c.d.reduce((a, b) => a + Math.abs(b), 0) <= room + 1e-9);
    if (fitting.length === 0) {
      out.push({ t, d: room, rest: false });
      t = body;
      break;
    }
    const weights = fitting.map((c) => {
      const mean = c.d.reduce((a, b) => a + Math.abs(b), 0) / c.d.length;
      const shortBias = mean < 1 ? 0.5 + density : 1.5 - density;
      // Never start a motif with a rest.
      const restAtStart = t === 0 && c.d[0] < 0 ? 0 : 1;
      return c.w * shortBias * restAtStart;
    });
    const cell = rng.weighted(fitting, weights.map((w) => Math.max(1e-6, w)));
    for (const d of cell.d) {
      out.push({ t, d: Math.abs(d), rest: d < 0 });
      t += Math.abs(d);
    }
  }
  out.push({ t: body, d: ending, rest: false });
  return out;
}

/**
 * Contour in scale steps following a shape, with leap recovery built in.
 * @param {import('./profiles.js').MelodyProfile} profile
 * @param {number} count number of sounding notes
 * @param {import('../../core/prng.js').Rng} rng
 * @param {'arch' | 'rise' | 'fall' | 'wave' | 'static'} [shape]
 * @returns {number[]}
 */
export function generateContour(profile, count, rng, shape) {
  const s = shape ?? rng.weighted(['arch', 'rise', 'fall', 'wave', 'static'], [3, 2, 1.5, 2, 0.5]);
  const steps = Object.entries(profile.steps).map(([k, w]) => [Number(k), w]);
  const degs = [0];
  let prevStep = 0;
  for (let i = 1; i < count; i++) {
    const x = i / Math.max(1, count - 1);
    const cur = degs[i - 1];
    const wantUp = s === 'rise' ? 1 : s === 'fall' ? -1 : s === 'arch' ? (x < 0.6 ? 1 : -1) : s === 'wave' ? (Math.sin(x * Math.PI * 2) >= 0 ? 1 : -1) : 0;
    const weights = steps.map(([st, w]) => {
      let ww = w;
      if (wantUp !== 0 && Math.sign(st) === wantUp) ww *= 1.8;
      // Gap fill: after a leap, prefer a step in the opposite direction.
      if (Math.abs(prevStep) >= 3) ww *= Math.sign(st) === -Math.sign(prevStep) && Math.abs(st) <= 2 ? 3 : 0.15;
      // Stay within about an octave and a half around the anchor.
      const next = cur + st;
      if (next > 7 || next < -5) ww *= 0.05;
      return ww;
    });
    const step = /** @type {number} */ (rng.weighted(steps.map(([st]) => st), weights));
    degs.push(cur + step);
    prevStep = step;
  }
  return degs;
}

/**
 * @param {import('./profiles.js').MelodyProfile} profile
 * @param {import('../../core/prng.js').Rng} rng
 * @param {{ length?: number, density?: number, shape?: 'arch' | 'rise' | 'fall' | 'wave' | 'static' }} [options]
 * @returns {Motif}
 */
export function generateMotif(profile, rng, { length, density, shape } = {}) {
  const len = length ?? profile.motifBeats;
  const rhythm = generateRhythm(profile, len, rng, { density });
  const sounding = rhythm.filter((r) => !r.rest).length;
  const contour = generateContour(profile, sounding, rng, shape);
  let k = 0;
  return {
    length: len,
    notes: rhythm.map((r) => (r.rest ? { t: r.t, d: r.d, deg: contour[Math.max(0, k - 1)], rest: true } : { t: r.t, d: r.d, deg: contour[k++] })),
  };
}

/**
 * @param {Motif} m
 * @param {(n: MotifNote) => MotifNote} fn
 * @returns {Motif}
 */
const mapNotes = (m, fn) => ({ length: m.length, notes: m.notes.map(fn) });

/**
 * Applies a development technique. Lengths: augment doubles the motif;
 * diminish and fragment keep the original length by repeating.
 * @param {Motif} motif
 * @param {MotifOp} op
 * @param {{ steps?: number, rng?: import('../../core/prng.js').Rng, profile?: import('./profiles.js').MelodyProfile }} [options]
 *   steps: sequence interval in scale steps; rng/profile for newEnding and new
 * @returns {Motif}
 */
export function transformMotif(motif, op, { steps = 1, rng, profile } = {}) {
  switch (op) {
    case 'repeat':
      return mapNotes(motif, (n) => ({ ...n }));
    case 'sequence':
      return mapNotes(motif, (n) => ({ ...n, deg: n.deg + steps }));
    case 'invert':
      return mapNotes(motif, (n) => ({ ...n, deg: -n.deg }));
    case 'retrograde': {
      const L = motif.length;
      const notes = motif.notes.map((n) => ({ ...n, t: L - n.t - n.d })).reverse();
      const first = notes.find((n) => !n.rest)?.deg ?? 0;
      return { length: L, notes: notes.map((n) => ({ ...n, deg: n.deg - first })) };
    }
    case 'augment':
      return { length: motif.length * 2, notes: motif.notes.map((n) => ({ ...n, t: n.t * 2, d: n.d * 2 })) };
    case 'diminish': {
      const half = motif.notes.map((n) => ({ ...n, t: n.t / 2, d: n.d / 2 }));
      return { length: motif.length, notes: [...half, ...half.map((n) => ({ ...n, t: n.t + motif.length / 2 }))] };
    }
    case 'fragment': {
      const half = motif.length / 2;
      const head = motif.notes.filter((n) => n.t < half - 1e-9).map((n) => ({ ...n, d: Math.min(n.d, half - n.t) }));
      return { length: motif.length, notes: [...head, ...head.map((n) => ({ ...n, t: n.t + half, deg: n.deg + steps }))] };
    }
    case 'expand':
      return mapNotes(motif, (n) => ({ ...n, deg: Math.round(n.deg * 1.5) }));
    case 'newEnding': {
      if (!rng || !profile) throw new RangeError('transformMotif newEnding needs rng and profile');
      const cut = motif.length * 0.5;
      const keep = motif.notes.filter((n) => n.t < cut - 1e-9).map((n) => ({ ...n, d: Math.min(n.d, cut - n.t) }));
      const tail = generateMotif(profile, rng, { length: motif.length - cut });
      const lastDeg = keep.filter((n) => !n.rest).at(-1)?.deg ?? 0;
      const offset = lastDeg + (rng.chance(0.5) ? 1 : -1) - (tail.notes[0]?.deg ?? 0);
      return { length: motif.length, notes: [...keep, ...tail.notes.map((n) => ({ ...n, t: n.t + cut, deg: n.deg + offset }))] };
    }
    case 'new':
      if (!rng || !profile) throw new RangeError('transformMotif new needs rng and profile');
      return generateMotif(profile, rng, { length: motif.length });
    default:
      throw new RangeError(`Unknown motif operation "${op}"`);
  }
}
