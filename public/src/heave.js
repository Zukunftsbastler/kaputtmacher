// The ground over the travelling tentacle. While it moves below, the real voxels above it are pushed up in a dome
// that runs along with it: earth, paving, and whatever small thing stands on them (trees, lamps, benches, fences).
// Up to stage 2 the dome sinks back behind it, like a wave through the ground. From stage 3 the tentacle is big
// enough to leave the earth up there for good, over a hollow it has pushed out below.
// Heaving is not destroying. What breaks is what would break for real: about one in ten of the paving stones that are
// pushed up cracks, and about one in ten of the voxels of what stands on the ground is shaken loose. Soft ground
// (grass, earth, sand) only heaves. Big buildings are too heavy to lift: under them the floor cracks here and there, nothing more.
// When the tentacle stands still below the ground, nothing at all shows where it is.

import { TYPE_FLAGS, F_TERRAIN, TYPE_MAT, MAT, T } from './materials.js';
import { launch } from './particles.js';

const STEP = 0.08; // seconds between updates of the dome
const PAVING = new Set([T.ROAD, T.ROADLINE, T.SIDEWALK]);
const TALL = 48; // what stands taller than this on a column is not lifted

export class Heave {
  constructor(game) {
    this.g = game;
    this.reset();
  }

  reset() {
    this.cols = new Map(); // column index -> { x, z, base, lift, want, perm, seen }
    this.raised = new Set(); // columns pushed up for good: a second pass does not push them higher
    this.t = 0;
    this.pass = 0; // counts the updates: a column under a building cracks at most once per pass over it
  }

  update(dt) {
    const g = this.g, m = g.monster;
    if (g.progress.species !== 'tentacle') { if (this.cols.size) this.settle(true); return; }
    if ((this.t += dt) < STEP) return;
    this.t = 0;
    this.pass++;
    const moving = m.under && m.speed > 0.5;
    if (moving) this.push(m);
    this.settle(false);
  }

  // The dome under the moving tentacle, a little ahead of it: the column heights it wants this step.
  push(m) {
    const g = this.g, w = g.world, h = m.h, R = Math.max(1.6, h * 0.45), A = Math.max(1, Math.round(h * 0.12)), perm = m.stage >= 3;
    const fx = Math.sin(m.heading), fz = Math.cos(m.heading), cx = m.x + fx * R * 0.4, cz = m.z + fz * R * 0.4, ri = Math.ceil(R);
    for (let dz = -ri; dz <= ri; dz++) for (let dx = -ri; dx <= ri; dx++) {
      const d2 = (dx * dx + dz * dz) / (R * R);
      if (d2 > 1) continue;
      let x = Math.floor(cx + dx), z = Math.floor(cz + dz);
      if (w.wrap) { x &= w.mx; z &= w.mz; } else if (x < 0 || z < 0 || x >= w.sx || z >= w.sz) continue;
      const key = x + w.sx * z, want = Math.round(A * (1 - d2));
      let c = this.cols.get(key);
      if (!c && this.raised.has(key)) continue;
      if (!c) {
        const st = w.structures[w.footprint[key]];
        if (st && (st.major || st.S || st.link)) { this.crack(st, x, z, m); continue; } // too heavy to lift
        const top = this.groundTop(x, z, m.y + h + 20);
        if (top < 0) continue;
        c = { x, z, base: Math.max(1, top - A - 1), lift: 0, want: 0, perm, seen: 0 };
        this.cols.set(key, c);
      }
      c.want = Math.max(c.want, want);
      c.seen = this.pass;
      if (perm) c.perm = true;
    }
  }

  // Lifts and lowers the columns towards what they want. A temporary lift sinks back once the dome has passed;
  // a lasting one stays where it got to. all: the tentacle is gone (another creature): only the lasting lifts stay.
  settle(all) {
    for (const [key, c] of this.cols) {
      const inDome = !all && c.seen === this.pass;
      const target = inDome ? (c.perm ? Math.max(c.lift, c.want) : c.want) : c.perm ? c.lift : 0;
      if (target !== c.lift) this.shift(c, target - c.lift);
      if (!inDome) {
        this.cols.delete(key);
        if (c.perm && c.lift) { this.raised.add(key); if (this.raised.size > 300000) this.raised.clear(); }
      }
      c.want = 0;
    }
  }

  // Top of the ground in a column (the highest earth voxel at or below y0), -1 if there is none close enough.
  groundTop(x, z, y0) {
    const w = this.g.world;
    for (let y = Math.min(w.sy - 1, Math.floor(y0)), lo = Math.max(0, y - 60 - this.g.monster.h * 1.5); y >= lo; y--) { const t = w.get(x, y, z); if (t && TYPE_FLAGS[t & 127] & F_TERRAIN) return y; }
    return -1;
  }

  // Moves a column by dy: the crust from the base up to the top of whatever stands on it. Where something stands on
  // the ground (a tree, a lamp) the column rises by one voxel at most, so that it stays joined to its neighbours.
  shift(c, dy) {
    const g = this.g, w = g.world, x = c.x, z = c.z, y0 = c.base + c.lift;
    let top = y0, built = false;
    while (w.get(x, top + 1, z) && top - y0 < TALL) { top++; const t = w.get(x, top, z); if (t < 128 && !(TYPE_FLAGS[t] & F_TERRAIN)) built = true; }
    if (top - y0 >= TALL) { c.perm = false; return; } // something tall stands here: leave it be
    if (dy > 0) {
      if (built) dy = Math.min(dy, 1 - c.lift);
      for (let y = top + 1; y <= top + dy; y++) if (w.get(x, y, z)) { dy = y - top - 1; break; } // room above, or less of a lift
      if (dy <= 0) return;
    }
    w.shiftColumn(x, z, y0, top, dy);
    c.lift += dy;
    if (dy > 0) this.shake(x, y0 + dy, z, top + dy);
    if (built) { const d = g.destruction; d.seed(x, top + dy, z); d.addSeeds(x, top + dy, z); d.addSeeds(x, top, z); } // did anything lose its hold?
  }

  // What was pushed up: about one in ten paving stones cracks, about one in ten voxels of what stands on the
  // ground is shaken loose; earth, grass and sand only heave. A little dust in any case.
  shake(x, y0, z, y1) {
    const g = this.g, w = g.world, rnd = g.rng, m = g.monster;
    let k = 0;
    for (let y = y0; y <= y1; y++) {
      const t = w.get(x, y, z);
      if (!t || t >= 128) continue;
      const ground = TYPE_FLAGS[t] & F_TERRAIN, surface = !w.get(x, y + 1, z);
      if (ground ? PAVING.has(t) && surface && rnd() < 0.1 : rnd() < 0.1) { this.breakAt(x, y, z, ground); k++; }
    }
    if (rnd() < 0.15) g.fx.dust(x + 0.5, y1 + 1, z + 0.5, 0.6 + m.h * 0.04, 0.62, 0.52, 0.4, 1);
    return k;
  }

  breakAt(x, y, z, ground) {
    const g = this.g, m = g.monster;
    g.lastHit.dx = 0; g.lastHit.dz = 0; g.lastHit.pop = launch(m.h * 0.3 + 2);
    g.destruction.sphere(x + 0.5, y + 0.5, z + 0.5, 0.75, 60, { dx: 0, dy: 1, dz: 0, impulse: launch(m.h * 0.4 + 3), debris: 2, quiet: true });
    if (ground && g.rng() < 0.3) g.audio.crumble(0.08);
  }

  // Under a building: it is too heavy to lift, but here and there its floor cracks as the tentacle passes below.
  crack(st, x, z, m) {
    const g = this.g, w = g.world, key = x + w.sx * z;
    if (this.cracked?.get(key) === this.pass - 1 || g.rng() > 0.1) { (this.cracked ??= new Map()).set(key, this.pass); return; }
    (this.cracked ??= new Map()).set(key, this.pass);
    if (this.cracked.size > 4096) this.cracked.clear();
    const y = Math.max(st.y0 ?? 0, this.groundTop(x, z, m.y + m.h) + 1);
    const t = w.get(x, y, z);
    if (t && t < 128 && TYPE_MAT[t] !== MAT.BEDROCK && !(TYPE_FLAGS[t] & F_TERRAIN)) this.breakAt(x, y, z, false);
  }
}
