// What the superstructures (links.js) do when they are damaged. Each style behaves like what it is made of:
//
//   rope     rope bridges, lianas, the ropes of the cable car: they only take tension. Cut through, burnt through or
//            torn off one of their anchors, each part swings down and hangs from the anchor it still has (a chain is
//            simulated and drawn as cubes for a few seconds, then laid back into the world as loose rubble where it
//            came to rest). A part without any anchor falls the same way. Cabins of a cable car drop.
//   beam     highways, railways, sky bridges, skywalks, conveyors, pipelines, catwalks, roller coasters: stiff. A
//            part that has lost its support stays as a cantilever while it is short enough for its material, and
//            breaks off at its last support when it is not. A span that has lost a pier comes down if it is now
//            too long. A deck that is mostly cut through snaps.
//   masonry  stone bridges, wall walks, aqueducts: stone takes no tension. Damage anywhere in a span between two
//            supports, a lost pier or a lost abutment brings the whole span down, in blocks; the piers stay.
//   glass    the tubes under the sea: a crack runs from the break through the whole tube and it bursts.
//
// Too heavy a creature standing on a superstructure breaks it under its feet (carry: the largest height of creature
// it bears), and then the rules above take over.
//
// The state of a link is read from the world: how much of each slice of its deck is left (against what was there
// when the world was built), whether its anchors (what surrounded each end in the buildings it hangs on) and its
// piers still stand. A link is looked at when something near it is destroyed, its anchors also every so often.
// The support search (destruction.js) lets load pass from a building into a superstructure but never back, so a
// building never hangs on its bridges: it falls, and the bridge loses an anchor.

import { T, RUBBLE, TYPE_RGBA } from './materials.js';
import { GRAVITY } from './particles.js';
import { FALL_GAIN } from './bodies.js';
import { STYLES } from './links.js';
import { wrapDelta, clamp } from './math.js';

// kind (see above), deck: the layers above the path that carry it, keep: share of a slice that must remain,
// cant: longest cantilever in voxels, span: longest span between two piers once a pier between them is lost,
// carry: largest creature (height in voxels) it bears.
const BEHAVE = {
  rope: { kind: 'rope', deck: [0, 2], keep: 0.5, carry: 8 },
  vine: { kind: 'rope', deck: [-1, 1], keep: 0.4, carry: 5 },
  cable: { kind: 'rope', deck: [0, 0], keep: 0.5, carry: 0 },
  highway: { kind: 'beam', deck: [-1, 2], keep: 0.3, cant: 24, span: 50, carry: 60 },
  rail: { kind: 'beam', deck: [-2, 0], keep: 0.3, cant: 16, span: 38, carry: 40 },
  skybridge: { kind: 'beam', deck: [0, 5], keep: 0.3, cant: 14, carry: 22 },
  skywalk: { kind: 'beam', deck: [0, 5], keep: 0.3, cant: 12, span: 34, carry: 18 },
  conveyor: { kind: 'beam', deck: [0, 4], keep: 0.3, cant: 10, span: 28, carry: 14 },
  pipe: { kind: 'beam', deck: [-1, 2], keep: 0.3, cant: 12, span: 24, carry: 14 },
  catwalk: { kind: 'beam', deck: [0, 2], keep: 0.4, cant: 7, carry: 10 },
  coaster: { kind: 'beam', deck: [-1, 0], keep: 0.4, cant: 6, span: 22, carry: 12 },
  arch: { kind: 'masonry', deck: [-1, 1], keep: 0.6, carry: 30 },
  stone: { kind: 'masonry', deck: [-1, 1], keep: 0.6, carry: 35 },
  aqueduct: { kind: 'masonry', deck: [-1, 1], keep: 0.6, carry: 30 },
  tube: { kind: 'glass', deck: [0, 6], keep: 0.5, carry: 16 },
};
// What a fallen rope looks like when it is laid back into the world, and drawn while it swings: [across, type, width].
const STRANDS = {
  rope: [[0, T.WOOD_LIGHT, 3], [-2, T.FABRIC_YELLOW, 0.5], [2, T.FABRIC_YELLOW, 0.5]],
  vine: [[-2, T.LEAF_DARK, 1], [0, T.LEAF, 1], [2, T.LEAF_DARK, 1]],
  cable: [[-3, T.STEEL_DARK, 0.6], [3, T.STEEL_DARK, 0.6]],
};
const CELL = 64; // grid for finding the links near a spot
const GAP = 2; // distance between the links of a swinging chain

// Height of a link's deck at t (the same curve links.js built it along).
export function yAt(sp, t) {
  const f = clamp(t, 0, sp.L) / sp.L;
  let y = sp.ya + (sp.yb - sp.ya) * f - Math.sin(Math.PI * f) * sp.sag;
  if (sp.wave) y += Math.sin(Math.PI * f * sp.humps * 2) * sp.wave * Math.sin(Math.PI * f);
  return Math.max(sp.floor, Math.round(y));
}

export class Spans {
  constructor(game) {
    this.g = game;
    this.list = []; // one entry per link: { st, sp, S, B, mine, base, anchors, piers, ... }
    this.grid = new Map();
    this.queue = []; // links to look at
    this.timed = []; // breaks that come a moment after the creaking: { at, k, t0, t1, mode, x, y, z }
    this.chains = []; // ropes swinging down
    this.byEnd = new Map(); // building id -> [[entry, end]]
    this.sweep = 0;
  }

  reset(world) {
    this.list.length = 0; this.queue.length = 0; this.timed.length = 0; this.chains.length = 0;
    this.grid.clear(); this.byEnd.clear();
    for (const st of world.structures) {
      const sp = st.span, B = sp && BEHAVE[sp.style];
      if (!B || !sp.types) continue;
      const k = { st, sp, S: STYLES[sp.style], B, mine: new Uint8Array(256), base: new Uint8Array(Math.floor(sp.L) + 1), anchors: [[], []], piers: [], dirty: false, due: 0, busy: 0, gone: false, failed: false, load: 0, breaks: 0 };
      for (const t of sp.types) k.mine[t] = 1;
      for (let t = 1; t < k.base.length - 1; t++) k.base[t] = Math.min(255, this.count(k, t));
      for (let e = 0; e < 2; e++) k.anchors[e] = this.anchorVoxels(k, e);
      for (const [t, px, pz, gy, top] of sp.piers) k.piers.push(this.pierVoxels(k, t, px, pz, gy, top));
      let lo = 1e9, hi = 0;
      for (let t = 0; t <= sp.L; t += 8) { const y = yAt(sp, t); lo = Math.min(lo, y); hi = Math.max(hi, y); }
      k.lo = sp.piers.length ? 0 : lo + k.S.clear[0] - 3; k.hi = hi + k.S.clear[1] + 3;
      for (let t = 0; t <= sp.L + 8; t += 8) this.cellOf(sp.x + sp.ux * Math.min(t, sp.L), sp.z + sp.uz * Math.min(t, sp.L), true)?.add(k);
      st.spanRef = k;
      st.ends.forEach((id, e) => { if (!this.byEnd.has(id)) this.byEnd.set(id, []); this.byEnd.get(id).push([k, e]); });
      this.list.push(k);
    }
  }

  cellOf(x, z, make) {
    const w = this.g.world;
    if (w.wrap) { x = ((Math.floor(x) % w.sx) + w.sx) % w.sx; z = ((Math.floor(z) % w.sz) + w.sz) % w.sz; }
    const key = Math.floor(x / CELL) + 4096 * Math.floor(z / CELL);
    let c = this.grid.get(key);
    if (!c && make) this.grid.set(key, (c = new Set()));
    return c;
  }

  // Voxels of the link itself in the deck layers of the slice at t.
  count(k, t) {
    const { sp, S, B, mine } = k, w = this.g.world, x = sp.x + sp.ux * t, z = sp.z + sp.uz * t, y = yAt(sp, t);
    let n = 0;
    for (let s = -S.hw; s <= S.hw; s++) {
      const px = Math.round(x + sp.nx * s), pz = Math.round(z + sp.nz * s);
      for (let dy = B.deck[0]; dy <= B.deck[1]; dy++) if (mine[w.get(px, y + dy, pz)] && w.isLink(px, y + dy, pz)) n++;
    }
    return n;
  }

  // Is (px, py, pz) part of the link's own room (its path, as wide and as high as it was kept free)?
  inside(k, px, py, pz) {
    const { sp, S } = k, rx = px - sp.x, rz = pz - sp.z, t = rx * sp.ux + rz * sp.uz, s = rx * sp.nx + rz * sp.nz;
    if (t < -1.6 || t > sp.L + 1.6 || Math.abs(s) > S.hw + 0.5) return false;
    const dy = py - yAt(sp, t);
    return dy >= S.clear[0] && dy <= S.clear[1];
  }

  // What the end of a link holds on to: the solid voxels around its last few slices that are not part of it.
  anchorVoxels(k, e) {
    const { sp, S } = k, w = this.g.world, out = [], seen = new Set();
    for (let i = 0; i <= 3.5 && out.length < 80; i += 0.5) {
      const t = e ? sp.L - 0.5 + i : 0.5 - i, x = sp.x + sp.ux * t, z = sp.z + sp.uz * t, y = yAt(sp, t);
      for (let s = -S.hw - 1; s <= S.hw + 1; s++) for (let dy = S.clear[0] - 1; dy <= S.clear[1] + 1; dy++) {
        const px = Math.round(x + sp.nx * s), pz = Math.round(z + sp.nz * s), py = y + dy, v = w.get(px, py, pz), key = w.index(px, py, pz);
        if (!v || v >= RUBBLE || seen.has(key) || this.inside(k, px, py, pz) || w.isLink(px, py, pz)) continue;
        seen.add(key); out.push(px, py, pz);
      }
    }
    return out;
  }

  // A pier: what it stands on, and its voxels in rows from the bottom up.
  pierVoxels(k, t, px, pz, gy, top) {
    const w = this.g.world, rows = [];
    for (let y = gy + 1; y <= top; y += 2) {
      const row = [];
      for (let b = -2; b <= 2; b++) for (let a = -2; a <= 2; a++) if (k.mine[w.get(px + a, y, pz + b)] && w.isLink(px + a, y, pz + b)) row.push(px + a, y, pz + b);
      if (row.length) rows.push(row);
    }
    return { t, foot: [px, gy, pz], rows, ok: true };
  }

  holds(k, e) {
    const a = k.anchors[e], w = this.g.world;
    if (!a.length) return true; // nothing to go by
    let n = 0;
    for (let i = 0; i < a.length; i += 3) { const v = w.get(a[i], a[i + 1], a[i + 2]); if (v && v < RUBBLE) n++; }
    return n * 3 >= Math.max(3, a.length * 0.2);
  }

  pierHolds(p) {
    const w = this.g.world;
    if (!w.get(p.foot[0], p.foot[1], p.foot[2])) return false; // what it stood on is gone
    for (const row of p.rows) {
      let any = false;
      for (let i = 0; i < row.length && !any; i += 3) { const v = w.get(row[i], row[i + 1], row[i + 2]); if (v && v < RUBBLE) any = true; }
      if (!any) return false; // cut through
    }
    return true;
  }

  // Something was destroyed around (x, y, z): the links there are looked at in a moment.
  note(x, y, z, r) {
    if (!this.list.length) return;
    const R = r + 4;
    for (let cz = Math.floor((z - R) / CELL); cz <= Math.floor((z + R) / CELL); cz++)
      for (let cx = Math.floor((x - R) / CELL); cx <= Math.floor((x + R) / CELL); cx++) {
        const c = this.cellOf(cx * CELL, cz * CELL, false);
        if (c) for (const k of c) if (y + r >= k.lo && y - r <= k.hi) this.mark(k);
      }
  }

  // A voxel of a structure was destroyed (main.onDestroyed).
  touch(st) { if (st.spanRef) this.mark(st.spanRef); }

  // A building gives way (stability.js): the links that hang on it above the failing storey are looked at.
  collapsed(st, y) {
    for (const [k, e] of this.byEnd.get(st.id) ?? []) if ((e ? k.sp.yb : k.sp.ya) > y - 4) this.mark(k);
  }

  mark(k) {
    if (k.gone || k.dirty) return;
    k.dirty = true; k.due = this.g.time + 0.15;
    this.queue.push(k);
  }

  update(dt) {
    const g = this.g;
    if (!this.list.length) return;
    // Anchors can go without anything near the link being hit (a tower falls from below): a few links per step.
    for (let i = 0; i < 6; i++) {
      const k = this.list[this.sweep++ % this.list.length];
      if (!k.gone && !k.dirty && !(this.holds(k, 0) && this.holds(k, 1))) this.mark(k);
    }
    for (let i = 0, budget = 3; i < this.queue.length && budget > 0;) {
      const k = this.queue[i];
      if (k.due > g.time || k.busy > g.time) { i++; continue; }
      this.queue.splice(i, 1);
      k.dirty = false;
      if (k.gone) continue;
      budget--;
      this.check(k);
    }
    for (let i = this.timed.length - 1; i >= 0; i--) {
      const b = this.timed[i];
      if (b.at > g.time) { if (b.mode !== 'shatter' && g.rng() < dt * 10) g.fx.dust(b.x, b.y, b.z, 1.5, 0.75, 0.73, 0.68, 1); continue; } // dust trickles from the crack
      this.timed.splice(i, 1);
      this.carve(b.k, b.t0, b.t1, b.mode);
      this.mark(b.k); // and what is left is looked at again
      if (b.mode !== 'quiet' && b.mode !== 'deepquiet') this.letGo(b.k);
    }
    for (let i = this.chains.length - 1; i >= 0; i--) if (this.swing(this.chains[i], dt)) { this.lay(this.chains[i]); this.chains.splice(i, 1); }
    this.weigh(dt);
  }

  // Looks at a link and sets off whatever its material does when it has lost too much.
  check(k) {
    const { sp, B } = k, n = Math.floor(sp.L), state = new Uint8Array(n + 1);
    let any = false, broken = false;
    for (let t = 1; t < n; t++) {
      const b = k.base[t];
      if (!b) { state[t] = 2; continue; }
      const c = this.count(k, t);
      state[t] = c >= b * B.keep ? 2 : c ? 1 : 0;
      if (c) any = true;
      if (state[t] < 2) broken = true;
    }
    if (!any) { k.gone = true; return; }
    const holdA = this.holds(k, 0), holdB = this.holds(k, 1);
    let piersOk = true;
    for (const p of k.piers) { p.ok = this.pierHolds(p); if (!p.ok) piersOk = false; }
    if (!broken && holdA && holdB && piersOk) return;
    if (!k.failed) { k.failed = true; this.g.stat('spans'); }
    // What is left of a slice that is mostly cut through snaps now.
    for (let t = 1; t < n; t++) if (state[t] === 1) { this.carve(k, t - 0.5, t + 0.5, 'snap'); state[t] = 0; }
    const segs = [];
    for (let t = 1; t < n;) {
      if (!state[t]) { t++; continue; }
      let e = t;
      while (e + 1 < n && state[e + 1]) e++;
      segs.push([t, e]);
      t = e + 1;
    }
    const A = (s0) => s0 === 1, Bend = (s1) => s1 === n - 1;
    if (B.kind === 'glass') return this.shatter(k, segs, holdA, holdB, n);
    if (B.kind === 'masonry') return this.masonry(k, state, holdA, holdB, n);
    for (const [s0, s1] of segs) {
      // An end that has lost its anchor lets go of whatever is left of the building there.
      if (A(s0) && !holdA) this.carve(k, -1.5, 1, 'snap');
      if (Bend(s1) && !holdB) this.carve(k, sp.L - 1, sp.L + 1.5, 'snap');
      if (B.kind === 'rope') {
        const pa = A(s0) && holdA, pb = Bend(s1) && holdB;
        if (!(pa && pb)) this.dangle(k, s0, s1, pa ? 0 : pb ? 1 : -1, n);
        continue;
      }
      // beam: the supports of this piece, then its cantilevers and spans
      const sup = [];
      if (A(s0) && holdA) sup.push(0);
      for (const p of k.piers) if (p.ok && p.t >= s0 - 1 && p.t <= s1 + 1) sup.push(p.t);
      if (Bend(s1) && holdB) sup.push(sp.L);
      if (!sup.length) continue; // it hangs on nothing: the support search lets it fall
      const left = sup[0] - (A(s0) ? 0 : s0), right = (Bend(s1) ? sp.L : s1) - sup[sup.length - 1];
      if (left > B.cant) this.breakAt(k, sup[0] - 1.5, sup[0] - 0.5);
      if (right > B.cant) this.breakAt(k, sup[sup.length - 1] + 0.5, sup[sup.length - 1] + 1.5);
      if (B.span) for (let i = 0; i + 1 < sup.length; i++) {
        const a = sup[i], b = sup[i + 1];
        if (b - a > B.span && k.piers.some((p) => !p.ok && p.t > a && p.t < b)) { this.breakAt(k, a + 0.5, a + 1.5); this.breakAt(k, b - 1.5, b - 0.5); }
      }
    }
    if (B.kind === 'rope') k.gone = true;
  }

  // Masonry: every span between two supports that is no longer whole comes down; the supports stay.
  masonry(k, state, holdA, holdB, n) {
    const { sp } = k, sup = [{ t: 0, ok: holdA }, ...k.piers, { t: sp.L, ok: holdB }];
    for (let i = 0; i + 1 < sup.length; i++) {
      const a = sup[i].t, b = sup[i + 1].t;
      let whole = sup[i].ok && sup[i + 1].ok, rest = false;
      // (two slices next to each support are left out: that is where the neighbouring span broke away)
      for (let t = Math.max(1, Math.ceil(a) + 2); t <= Math.min(n - 1, Math.floor(b) - 2); t++) { if (state[t] < 2) whole = false; else rest = true; }
      if (whole || !rest) continue;
      // An arcade breaks down to the ground beside its pillars (a pillar is three voxels thick), a bridge on piers
      // at the deck; inside the span cracks, so that it falls in blocks.
      const delay = 0.25 + this.g.rng() * 0.3, d = k.S.arcade ? 1 : 0, mode = k.S.arcade ? 'deep' : 'break';
      this.breakAt(k, a + 0.5 + d, a + 1.5 + d, mode, delay);
      this.breakAt(k, b - 1.5 - d, b - 0.5 - d, mode, delay);
      for (let t = a + 7; t < b - 5; t += 6 + this.g.rng() * 3) this.breakAt(k, t, t + 0.5, k.S.arcade ? 'deepquiet' : 'quiet', delay);
    }
  }

  // Glass: a crack runs from where it broke along the whole tube, and the tube bursts.
  shatter(k, segs, holdA, holdB, n) {
    const { sp } = k;
    let from = !holdA ? 0 : !holdB ? sp.L : 0;
    for (let t = 1; t < n; t++) if (!segs.some(([a, b]) => t >= a && t <= b)) { from = t; break; }
    const now = this.g.time;
    for (let t = -1; t <= sp.L + 1; t += 1) this.timed.push({ at: now + Math.abs(t - from) / 70, k, t0: t - 0.5, t1: t + 0.5, mode: 'shatter', x: 0, y: 0, z: 0 });
    this.g.audio.glassfall(1);
    k.gone = true;
  }

  // A beam breaks between t0 and t1 a moment from now; until then it creaks and trickles dust.
  breakAt(k, t0, t1, mode = 'break', delay = 0.35 + this.g.rng() * 0.6) {
    const g = this.g, sp = k.sp, t = (t0 + t1) / 2;
    if (this.timed.some((b) => b.k === k && Math.abs(b.t0 - t0) < 1) || ++k.breaks > 16) return; // (a piece that something else holds up is not broken again and again)
    this.timed.push({ at: g.time + delay, k, t0, t1, mode, x: sp.x + sp.ux * t, y: yAt(sp, t), z: sp.z + sp.uz * t });
    k.busy = Math.max(k.busy, g.time + delay + 0.05);
    if (mode === 'break') { g.audio.crack(0.5); if (k.B.kind !== 'masonry') g.audio.groan(0.5); }
  }

  // Links that end on this one (a sky bridge on a highway) let go of it when it breaks.
  letGo(k) {
    for (const [j, e] of this.byEnd.get(k.st.id) ?? []) if (!j.gone) { this.carve(j, e ? j.sp.L - 1 : -1.5, e ? j.sp.L + 1.5 : 1, 'snap'); this.mark(j); }
  }

  // Removes what is left of the link between t0 and t1 (only its own voxels). mode: 'snap' and 'break' throw some
  // pieces and dust, 'shatter' throws glass, 'quiet' and 'lift' nothing ('lift' is a rope taken out to swing);
  // 'deep' and 'deepquiet' also cut whatever of the link stands below down to the ground (an arcade).
  carve(k, t0, t1, mode) {
    const g = this.g, w = g.world, { sp, S } = k, hw = S.hw + 1, rnd = g.rng, deep = mode === 'deep' || mode === 'deepquiet';
    let n = 0, cx = 0, cy = 0, cz = 0;
    if (deep) mode = mode === 'deep' ? 'break' : 'quiet';
    g.gainScale = mode === 'lift' ? FALL_GAIN : 0.5;
    for (let t = t0; t <= t1 + 1e-6; t += 0.5) {
      const x = sp.x + sp.ux * t, z = sp.z + sp.uz * t, y = yAt(sp, t);
      for (let s = -hw; s <= hw; s++) {
        const px = Math.round(x + sp.nx * s), pz = Math.round(z + sp.nz * s);
        for (let dy = deep ? 1 - y : S.clear[0] - 1; dy <= S.clear[1] + 1; dy++) {
          const v = w.get(px, y + dy, pz);
          if (!v || !k.mine[v] || !w.isLink(px, y + dy, pz)) continue; // only its own voxels, never the building it passes
          w.set(px, y + dy, pz, 0);
          g.destruction.addSeeds(px, y + dy, pz);
          n++; cx = px; cy = y + dy; cz = pz;
          if ((mode === 'snap' || mode === 'break') && rnd() < 0.25) g.debris.spawn(px + 0.5, y + dy + 0.5, pz + 0.5, (rnd() - 0.5) * 10, rnd() * 6, (rnd() - 0.5) * 10, v);
          else if (mode === 'shatter' && rnd() < 0.5) g.debris.spawn(px + 0.5, y + dy + 0.5, pz + 0.5, (rnd() - 0.5) * 16, 4 + rnd() * 10, (rnd() - 0.5) * 16, v);
        }
      }
    }
    g.gainScale = 1;
    if (!n || mode === 'quiet' || mode === 'lift') return n;
    if (mode === 'shatter') g.fx.sparks(cx, cy, cz, 6, 6, 0.8, 0.95, 1);
    else { g.fx.dust(cx, cy, cz, 2 + S.hw, 0.76, 0.74, 0.7, 3); g.audio.hit(k.B.kind === 'rope' ? 'wood' : k.B.kind === 'masonry' ? 'stone' : 'metal', 0.4); }
    return n;
  }

  // Rope: the piece from s0 to s1 comes out of the world and swings as a chain from the end it still hangs on
  // (pin 0: the start, 1: the end, -1: none, it just falls). Cable car cabins fall off.
  dangle(k, s0, s1, pin, n) {
    const g = this.g, { sp } = k;
    const from = pin === 0 ? 0.5 : s0 === 1 ? -1.5 : s0 - 0.5, to = pin === 1 ? sp.L - 0.5 : s1 === n - 1 ? sp.L + 1.5 : s1 + 0.5;
    if (sp.style === 'cable') this.dropCabins(k, from, to);
    this.carve(k, from, to, 'lift');
    const nodes = [], start = pin === 1 ? to : from, end = pin === 1 ? from : to, steps = Math.max(2, Math.round(Math.abs(end - start) / GAP));
    for (let i = 0; i <= steps; i++) { const t = start + ((end - start) * i) / steps; nodes.push(t, yAt(sp, t), t, yAt(sp, t)); }
    this.chains.push({ k, pin: pin >= 0, nodes: new Float32Array(nodes), rest: Math.abs(end - start) / steps, age: 0, calm: 0 });
    g.audio.hit(sp.style === 'cable' ? 'metal' : 'wood', 0.7);
  }

  // The cabins under a cut cable: every group of cabin voxels becomes a falling piece.
  dropCabins(k, t0, t1) {
    const g = this.g, w = g.world, { sp, S } = k;
    let group = [];
    const flush = () => { if (group.length) g.bodies.detach(group, group.length); group = []; };
    for (let t = t0; t <= t1; t += 0.5) {
      const x = sp.x + sp.ux * t, z = sp.z + sp.uz * t, y = yAt(sp, t);
      let found = false;
      for (let s = -S.hw - 1; s <= S.hw + 1; s++) for (let dy = S.clear[0] - 1; dy <= -1; dy++) {
        const px = Math.round(x + sp.nx * s), pz = Math.round(z + sp.nz * s), v = w.get(px, y + dy, pz);
        if (!v || !k.mine[v] || !w.isLink(px, y + dy, pz)) continue;
        const i = w.index(px, y + dy, pz);
        if (!group.includes(i)) group.push(i);
        found = true;
      }
      if (!found) flush(); // a gap between two cabins
    }
    flush();
  }

  // One step of a swinging chain, in the vertical plane of its link (q along the link, y up). Returns true when it
  // has come to rest (or swung long enough).
  swing(c, dt) {
    const { k, nodes: p, rest } = c, { sp } = k, w = this.g.world, N = p.length >> 2, h = Math.min(dt, 1 / 30), g2 = GRAVITY * w.grav * 0.8 * h * h;
    let moved = 0;
    for (let i = c.pin ? 1 : 0; i < N; i++) { // Verlet: keep going, a little damped, and fall
      const o = i * 4, vq = (p[o] - p[o + 2]) * 0.985, vy = (p[o + 1] - p[o + 3]) * 0.985;
      p[o + 2] = p[o]; p[o + 3] = p[o + 1];
      p[o] += vq; p[o + 1] += vy - g2;
    }
    for (let it = 0; it < 12; it++) for (let i = 0; i + 1 < N; i++) { // the links keep their length
      const a = i * 4, b = a + 4, dq = p[b] - p[a], dy = p[b + 1] - p[a + 1], d = Math.hypot(dq, dy) || 1e-6, f = (d - rest) / d;
      if (c.pin && i === 0) { p[b] -= dq * f; p[b + 1] -= dy * f; } else { p[a] += dq * f * 0.5; p[a + 1] += dy * f * 0.5; p[b] -= dq * f * 0.5; p[b + 1] -= dy * f * 0.5; }
    }
    for (let i = c.pin ? 1 : 0; i < N; i++) { // nothing goes through walls or the ground: back to where it was
      const o = i * 4, x = sp.x + sp.ux * p[o], z = sp.z + sp.uz * p[o];
      if (p[o + 1] < 1 || w.get(Math.floor(x), Math.floor(p[o + 1]), Math.floor(z))) { p[o] = p[o + 2]; p[o + 1] = Math.max(1, p[o + 3]); }
      moved = Math.max(moved, Math.abs(p[o] - p[o + 2]) + Math.abs(p[o + 1] - p[o + 3]));
    }
    c.age += dt;
    c.calm = moved < 0.03 ? c.calm + dt : 0;
    return c.calm > 0.6 || c.age > 7;
  }

  // The chain comes to rest: it is laid into the world as loose rubble, strand by strand, without gaps.
  lay(c) {
    const g = this.g, w = g.world, { k, nodes: p } = c, { sp } = k, N = p.length >> 2, strands = STRANDS[sp.style] ?? STRANDS.rope;
    for (const [s, type, width] of strands) {
      const half = width >= 3 ? 1 : 0;
      let lx = null, ly = 0, lz = 0;
      const put = (x, y, z) => {
        for (let a = -half; a <= half; a++) {
          const px = Math.round(x + sp.nx * a), pz = Math.round(z + sp.nz * a);
          if (!w.get(px, y, pz)) { w.set(px, y, pz, (a ? T.WOOD : type) | RUBBLE); g.destruction.addSeeds(px, y - 1, pz); }
        }
      };
      for (let i = 0; i + 1 < N; i++) {
        const a = i * 4, b = a + 4, len = Math.hypot(p[b] - p[a], p[b + 1] - p[a + 1]), m = Math.max(1, Math.ceil(len * 2));
        for (let j = 0; j <= m; j++) {
          const q = p[a] + ((p[b] - p[a]) * j) / m, x = Math.round(sp.x + sp.ux * q + sp.nx * s), y = Math.round(p[a + 1] + ((p[b + 1] - p[a + 1]) * j) / m), z = Math.round(sp.z + sp.uz * q + sp.nz * s);
          if (lx !== null) { // step one axis at a time, so that the strand hangs together face to face
            while (lx !== x) { lx += Math.sign(x - lx); put(lx, ly, lz); }
            while (lz !== z) { lz += Math.sign(z - lz); put(lx, ly, lz); }
            while (ly !== y) { ly += Math.sign(y - ly); put(lx, ly, lz); }
          } else put(x, y, z);
          lx = x; ly = y; lz = z;
        }
      }
    }
  }

  // A creature too heavy for what it stands on breaks it under its feet.
  weigh(dt) {
    const g = this.g, m = g.monster, w = g.world, size = w.wrap ? w.sx : 0;
    if (!m.onGround) return;
    const c = this.cellOf(m.x, m.z, false);
    if (!c) return;
    for (const k of c) {
      const { sp, S, B } = k;
      if (k.gone || k.busy > g.time || m.h <= B.carry) continue;
      const rx = wrapDelta(m.x - sp.x, size), rz = wrapDelta(m.z - sp.z, size), t = rx * sp.ux + rz * sp.uz, s = rx * sp.nx + rz * sp.nz;
      if (t < 2 || t > sp.L - 2 || Math.abs(s) > S.hw + 1 + m.h * 0.2) continue;
      const dy = m.y - yAt(sp, t);
      if (dy < B.deck[0] - 1 || dy > B.deck[1] + 3) continue;
      if ((k.load += dt) < 0.3) { if (k.load <= dt) { g.audio.crack(0.4); if (B.kind === 'rope') g.audio.hit('wood', 0.5); } continue; }
      k.load = 0;
      this.carve(k, t - 1.5, t + 1.5, 'snap');
      this.mark(k);
    }
  }

  // The swinging chains as cubes.
  write(out, o, max) {
    for (const c of this.chains) {
      const { k, nodes: p } = c, { sp } = k, N = p.length >> 2, yaw = Math.atan2(sp.ux, sp.uz), strands = STRANDS[sp.style] ?? STRANDS.rope;
      for (let i = 0; i + 1 < N; i++) {
        if (o + 12 * strands.length > max) return o;
        const a = i * 4, b = a + 4, dq = p[b] - p[a], dy = p[b + 1] - p[a + 1], len = Math.hypot(dq, dy), q = (p[a] + p[b]) / 2, y = (p[a + 1] + p[b + 1]) / 2;
        const x = sp.x + sp.ux * q, z = sp.z + sp.uz * q, pitch = Math.atan2(-dy, dq);
        for (const [s, type, width] of strands) {
          out[o++] = x + sp.nx * s; out[o++] = y + 0.5; out[o++] = z + sp.nz * s;
          out[o++] = width; out[o++] = width >= 3 ? 1 : width; out[o++] = len + 0.4;
          out[o++] = yaw; out[o++] = pitch;
          out[o++] = TYPE_RGBA[type * 4] / 255; out[o++] = TYPE_RGBA[type * 4 + 1] / 255; out[o++] = TYPE_RGBA[type * 4 + 2] / 255; out[o++] = 0;
        }
      }
    }
    return o;
  }
}
