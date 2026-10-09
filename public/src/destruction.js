// Damage shapes and the support check: whatever is no longer connected to the ground
// is lifted out of the grid and handed to the rigid body system.

import { TYPE_MAT, TYPE_FLAGS, MATS, MAT, F_TERRAIN } from './materials.js';

const MAX_COMPONENT = 600000; // larger pieces are treated as still standing
const VISIT_BUDGET = 700000; // voxels the support search may touch per step
const NONE = {};

export class Destruction {
  constructor(game) {
    this.g = game;
    this.seeds = new Int32Array(1 << 15);
    this.nSeeds = 0;
    this.stack = new Int32Array(MAX_COMPONENT + 8);
    this.list = new Int32Array(MAX_COMPONENT + 8);
    this.touched = new Int32Array(1 << 16);
    this.nTouched = 0;
    this.matCount = new Int32Array(MATS.length);
  }

  // Marks are kept per chunk and only for chunks a search has actually touched, so a tall,
  // wide world does not need two bits for every voxel it could ever contain.
  reset(world) {
    const n = world.chunks.length;
    this.safe = new Array(n).fill(null); // bit: known to be connected to the ground
    this.seen = new Array(n).fill(null); // bit: visited by the running search
    this.nSeeds = 0;
  }

  // i: flat voxel index. Returns the chunk's bit field (creating it if asked) and leaves the bit position in this.bit.
  field(set, i, create) {
    const w = this.g.world, layer = w.sx * w.sz, y = (i / layer) | 0, rem = i - y * layer, z = (rem / w.sx) | 0, x = rem - z * w.sx;
    const ci = (x >> 5) + w.ncx * ((z >> 5) + w.ncz * (y >> 5));
    this.bit = (x & 31) | ((z & 31) << 5) | ((y & 31) << 10);
    return set[ci] ?? (create ? (set[ci] = new Uint8Array(4096)) : null);
  }
  has(set, i) { const f = this.field(set, i, false); return f !== null && (f[this.bit >> 3] & (1 << (this.bit & 7))) !== 0; }
  mark(set, i) { const f = this.field(set, i, true); f[this.bit >> 3] |= 1 << (this.bit & 7); }
  unmark(set, i) { const f = this.field(set, i, false); if (f) f[this.bit >> 3] &= ~(1 << (this.bit & 7)); }

  // Decides whether a voxel of the given material breaks under the given effective power.
  breaks(strength, eff) {
    if (eff >= strength) return true;
    const ratio = eff / strength;
    if (ratio < 0.35) return false;
    return this.g.rng() < ratio * ratio * ratio;
  }

  // Removes voxels in a sphere. Options: dx/dy/dz (push direction), impulse, debris (max flying cubes),
  // blast (pushes loose things outwards), quiet (no dust or sound), spare (go easy on the ground),
  // worldOnly (leave falling fragments alone).
  sphere(cx, cy, cz, r, power, o = NONE) {
    const g = this.g, w = g.world, rnd = g.rng;
    if (g.actors.units.length) g.actors.hit(cx, cy, cz, r); // police cars and fire engines in the way
    const x0 = Math.floor(cx - r), x1 = Math.ceil(cx + r), z0 = Math.floor(cz - r), z1 = Math.ceil(cz + r);
    const y0 = Math.max(0, Math.floor(cy - r)), y1 = Math.min(w.sy - 1, Math.ceil(cy + r));
    const r2 = r * r, imp = o.impulse ?? 16; // launch speed of the flying cubes
    const pDebris = Math.min(1, (o.debris ?? 40) / (1.2 * r * r * r + 1));
    const mc = this.matCount.fill(0);
    let removed = 0;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      for (let z = z0; z <= z1; z++) {
        const dz = z + 0.5 - cz, dyz = dy * dy + dz * dz;
        if (dyz > r2) continue;
        for (let x = x0; x <= x1; x++) {
          const dx = x + 0.5 - cx, d2 = dx * dx + dyz;
          if (d2 > r2) continue;
          const t = w.get(x, y, z);
          if (!t) continue;
          const m = TYPE_MAT[t], mat = MATS[m];
          const d = Math.sqrt(d2);
          const eff = power * (1 - (0.6 * d) / r);
          if (o.spare && TYPE_FLAGS[t] & F_TERRAIN) continue; // falling pieces crumble themselves, they do not dig
          if (!this.breaks(mat.strength, eff)) continue;
          w.set(x, y, z, 0);
          removed++;
          mc[m]++;
          this.addSeeds(x, y, z);
          if (m === MAT.EXPLOSIVE) g.queueExplosion(x + 0.5, y + 0.5, z + 0.5);
          if (rnd() < pDebris * mat.debris) {
            // A fountain: mostly up, spreading outwards and along the direction of the hit.
            const k = (imp * 0.45 * rnd()) / (d + 0.5), push = imp * 0.5 * rnd();
            g.debris.spawn(x + 0.5, y + 0.5, z + 0.5,
              dx * k + (o.dx ?? 0) * push, imp * (0.3 + 0.7 * rnd()) + (o.dy ?? 0) * push, dz * k + (o.dz ?? 0) * push, t);
          }
        }
      }
    }
    if (!o.worldOnly) removed += g.bodies.damageSphere(cx, cy, cz, r, power, o, mc);
    if (o.blast) {
      g.debris.blast(cx, cy, cz, r * 2.2, o.blast);
      g.actors.blast(cx, cy, cz, r * 2.5, o.blast);
    }
    if (removed && !o.quiet) {
      let best = 0;
      for (let m = 1; m < mc.length; m++) if (mc[m] > mc[best]) best = m;
      g.onDamage(cx, cy, cz, r, removed, best);
    }
    return removed;
  }

  // Thin cut or beam between two points, as a chain of small spheres.
  capsule(ax, ay, az, bx, by, bz, r, power, o = NONE) {
    const len = Math.hypot(bx - ax, by - ay, bz - az), steps = Math.max(1, Math.ceil(len / Math.max(0.8, r * 0.9)));
    let removed = 0;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      removed += this.sphere(ax + (bx - ax) * t, ay + (by - ay) * t, az + (bz - az) * t, r, power, o);
    }
    return removed;
  }

  // Remembers the solid neighbours of a removed voxel; they may have lost their support.
  addSeeds(x, y, z) {
    const w = this.g.world;
    if (this.nSeeds + 6 > this.seeds.length) {
      const n = new Int32Array(this.seeds.length * 2);
      n.set(this.seeds);
      this.seeds = n;
    }
    if (w.get(x, y + 1, z)) this.seeds[this.nSeeds++] = w.index(x, y + 1, z);
    if (w.get(x + 1, y, z)) this.seeds[this.nSeeds++] = w.index(x + 1, y, z);
    if (w.get(x - 1, y, z)) this.seeds[this.nSeeds++] = w.index(x - 1, y, z);
    if (w.get(x, y, z + 1)) this.seeds[this.nSeeds++] = w.index(x, y, z + 1);
    if (w.get(x, y, z - 1)) this.seeds[this.nSeeds++] = w.index(x, y, z - 1);
    if (y > 0 && w.get(x, y - 1, z)) this.seeds[this.nSeeds++] = w.index(x, y - 1, z);
  }

  touch(i) {
    if (this.nTouched >= this.touched.length) {
      const n = new Int32Array(this.touched.length * 2);
      n.set(this.touched);
      this.touched = n;
    }
    this.touched[this.nTouched++] = i;
  }

  // Runs once per simulation step. Depth-first search that prefers going down, so standing
  // structures are confirmed after a few hundred voxels; only real islands are walked completely.
  flush() {
    if (!this.nSeeds) return;
    const g = this.g, w = g.world, sx = w.sx, sz = w.sz, layer = sx * sz;
    const { safe, seen, stack, list } = this;
    let budget = VISIT_BUDGET, s = 0;
    for (; s < this.nSeeds && budget > 0; s++) {
      const seed = this.seeds[s];
      if (this.has(safe, seed)) continue;
      let y = (seed / layer) | 0, rem = seed - y * layer, z = (rem / sx) | 0, x = rem - z * sx;
      const t0 = w.get(x, y, z);
      if (!t0 || TYPE_FLAGS[t0] & F_TERRAIN) continue;
      let sp = 0, n = 0, supported = false;
      stack[sp++] = seed; list[n++] = seed;
      this.mark(seen, seed);
      search: while (sp) {
        const j = stack[--sp];
        y = (j / layer) | 0; rem = j - y * layer; z = (rem / sx) | 0; x = rem - z * sx;
        // Down is pushed last, so it is explored first.
        for (let k = 0; k < 6; k++) {
          let nx = x, ny = y, nz = z;
          if (k === 0) ny++; else if (k === 1) nx++; else if (k === 2) nx--; else if (k === 3) nz++; else if (k === 4) nz--; else ny--;
          if (ny < 0) { supported = true; break search; }
          const nt = w.get(nx, ny, nz);
          if (!nt) continue;
          const ni = w.index(nx, ny, nz);
          if (TYPE_FLAGS[nt] & F_TERRAIN || n >= MAX_COMPONENT || this.has(safe, ni)) { supported = true; break search; }
          if (this.has(seen, ni)) continue;
          this.mark(seen, ni);
          list[n++] = ni; stack[sp++] = ni;
        }
      }
      budget -= n;
      for (let k = 0; k < n; k++) this.unmark(seen, list[k]);
      if (supported) {
        for (let k = 0; k < n; k++) { this.mark(safe, list[k]); this.touch(list[k]); }
      } else g.bodies.detach(list, n);
    }
    for (let k = 0; k < this.nTouched; k++) this.unmark(safe, this.touched[k]);
    this.nTouched = 0;
    // Seeds that did not fit into this step's budget are checked in the next one.
    this.seeds.copyWithin(0, s, this.nSeeds);
    this.nSeeds -= s;
  }
}
