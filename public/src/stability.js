// Structural stability: a building does not wait until its last voxel is cut through.
// For every storey (horizontal layer) of a building the game knows how much load-bearing
// strength it was built with and how much is left. When too little is left to carry what
// stands above, the storey gives way and the upper part comes down. How much is "too little"
// depends on the material: a wooden shed folds early, steel holds on to the last.
// Shoves (running into a building) and chain reactions make a building temporarily or permanently weaker.

import { TYPE_MAT, MATS, MAT, isTerrain } from './materials.js';

// Share of a storey's original strength that must remain, per material the building mostly consists of.
const TAU = { [MAT.LEAF]: 0.7, [MAT.FABRIC]: 0.7, [MAT.GLASS]: 0.6, [MAT.WOOD]: 0.62, [MAT.EXPLOSIVE]: 0.6, [MAT.SHEET]: 0.58, [MAT.BRICK]: 0.5, [MAT.CONCRETE]: 0.42, [MAT.STEEL]: 0.3 };
export const tauOf = (mat) => TAU[mat] ?? 0.5;
// Load-bearing strength and weight of one voxel, by type.
export const VOXEL_STRENGTH = new Float32Array(256), VOXEL_MASS = new Float32Array(256);
for (let t = 1; t < 128; t++) { VOXEL_STRENGTH[t] = Math.min(16, MATS[TYPE_MAT[t]].strength); VOXEL_MASS[t] = MATS[TYPE_MAT[t]].density; }

export class Stability {
  constructor(game) {
    this.g = game;
    this.failing = []; // structures that are about to give way
    this.shoved = [];
  }

  reset() { this.failing.length = 0; this.shoved.length = 0; }

  touch(st) {
    const w = this.g.world;
    if (st.S && !st.dirty) { st.dirty = true; w.touched.push(st); }
  }

  // Looks for the storey in most distress. Returns its height or -1 if the building still stands safely.
  weakest(st) {
    const { S, S0, M } = st;
    let above = 0, best = -1, worst = 0;
    for (let y = st.top; y >= st.y0; y--) {
      const load = above / st.M0; // share of the building's weight that rests on this storey
      above += M[y];
      if (S0[y] < 8 || load < 0.05) continue;
      const need = Math.min(0.97, st.tau * (0.75 + 0.5 * load) + st.shove + st.weak);
      const distress = need - Math.max(0, S[y]) / S0[y];
      if (distress > worst) { worst = distress; best = y; }
    }
    return best;
  }

  // Running into a building. bonus: how hard, relative to the building's mass (0..0.6).
  shove(st, dx, dz, bonus) {
    if (!st.S || st.failing) return;
    if (!st.shove) this.shoved.push(st);
    st.shove = Math.max(st.shove, bonus);
    st.dirX = dx; st.dirZ = dz;
    this.touch(st);
  }

  // Permanent weakening, used by chain reactions.
  weaken(st, amount) {
    if (!st.S) return;
    st.weak += amount;
    this.touch(st);
  }

  update(dt) {
    const g = this.g, w = g.world;
    for (let i = this.shoved.length - 1; i >= 0; i--) {
      const st = this.shoved[i];
      st.shove = Math.max(0, st.shove - dt * 1.2);
      if (!st.shove) this.shoved.splice(i, 1);
    }
    for (const st of w.touched) {
      st.dirty = false;
      if (st.failing || st.remaining < 20) continue;
      const y = this.weakest(st);
      if (y < 0) continue;
      // It will go: a moment of creaking and trickling dust first.
      st.failing = { y, t: 0.45 + g.rng() * 0.5 };
      this.failing.push(st);
      g.onCreak(st, y);
    }
    w.touched.length = 0;
    for (let i = this.failing.length - 1; i >= 0; i--) {
      const st = this.failing[i], f = st.failing;
      f.t -= dt;
      if (g.rng() < dt * 14) {
        const x = st.x0 + g.rng() * (st.x1 - st.x0), z = st.z0 + g.rng() * (st.z1 - st.z0);
        g.fx.dust(x, f.y, z, 2.5, 0.75, 0.73, 0.68, 1);
      }
      if (f.t > 0) continue;
      this.failing.splice(i, 1);
      st.failing = null;
      this.collapse(st, f.y);
    }
  }

  // The storey at height y gives way: it is crushed, and everything above loses its footing.
  collapse(st, y) {
    const g = this.g, w = g.world;
    // The building falls towards the side where the storey has lost the most (or the way it was shoved).
    let dx = st.dirX ?? 0, dz = st.dirZ ?? 0;
    if (!st.shove) {
      let cx = 0, cz = 0, n = 0;
      for (let z = st.z0; z <= st.z1; z++) for (let x = st.x0; x <= st.x1; x++) {
        if (w.footprint[x + w.sx * z] !== st.id) continue;
        const t = w.get(x, y, z);
        if (t && !isTerrain(t)) { cx += x; cz += z; n++; }
      }
      if (n) { dx = (st.x0 + st.x1) / 2 - cx / n; dz = (st.z0 + st.z1) / 2 - cz / n; }
      if (Math.hypot(dx, dz) < 0.3) { dx = g.lastHit.dx; dz = g.lastHit.dz; }
    }
    const l = Math.hypot(dx, dz) || 1;
    g.lastHit.dx = dx / l; g.lastHit.dz = dz / l; g.lastHit.pop = 0;
    for (let yy = Math.max(st.y0, y - 1); yy <= y + 1; yy++)
      for (let z = st.z0; z <= st.z1; z++) for (let x = st.x0; x <= st.x1; x++) {
        if (w.footprint[x + w.sx * z] !== st.id) continue;
        const t = w.get(x, yy, z);
        if (!t || isTerrain(t)) continue;
        w.set(x, yy, z, 0);
        g.destruction.addSeeds(x, yy, z);
        if (g.rng() < 0.12) g.debris.spawn(x + 0.5, yy + 0.5, z + 0.5, (g.rng() - 0.5) * 30, g.rng() * 14, (g.rng() - 0.5) * 30, t);
      }
    g.onStructureCollapse(st, y);
  }
}
