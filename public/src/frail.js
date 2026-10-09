// What stands on too little falls over.
//
// The support search in destruction.js only asks whether a piece still touches the ground somewhere.
// That is not enough for slender things: a clump of trees hangs on one last trunk, half a Ferris wheel
// on one leg, a stretch of roller coaster on a single post. This module looks at such a piece as a
// whole after it has been damaged: how heavy it is, where its centre of gravity lies and what its
// footing is made of. If the centre of gravity hangs too far outside the footing, or the footing is
// far too weak for the weight, the footing breaks and the piece tips over in that direction.
// How much overhang a footing can take depends on its material: steel holds more than a wooden trunk.
// (Nothing bends: the piece falls as it is.)
//
// Large buildings are left alone: the search gives up after BUDGET voxels, and for them
// stability.js keeps the books storey by storey.

import { isTerrain } from './materials.js';
import { VOXEL_STRENGTH, VOXEL_MASS } from './stability.js';

const BUDGET = 45000; // biggest piece that is examined, in voxels
const MAX_BASE = 500; // a footing bigger than this does not simply snap
const CRUSH = 160; // weight a footing carries per unit of its strength
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]];

export class Frail {
  constructor(game) {
    this.g = game;
    this.queue = [];
    this.wait = 0;
    this.stack = new Int32Array(BUDGET * 3 + 64);
    this.base = new Int32Array(MAX_BASE * 3);
    this.fell = 0;
  }

  clear() { this.queue.length = 0; }

  // Something was damaged around (x, y, z): have a look at what is left standing there.
  note(x, y, z, r) {
    if (this.queue.length >= 10) return;
    for (const q of this.queue) if (Math.abs(q[0] - x) + Math.abs(q[1] - y) + Math.abs(q[2] - z) < 6) return;
    this.queue.push([x, y, z, r, this.g.time + 0.4]); // a moment later, when the loose parts have come away
  }

  update() {
    if (!this.queue.length || --this.wait > 0 || this.queue[0][4] > this.g.time) return;
    this.wait = 5; // at most one examination every few steps
    const [x, y, z, r] = this.queue.shift(), w = this.g.world, rr = Math.ceil(r) + 2;
    // Start from a few built voxels at the edge of the damage.
    for (const [dx, dy, dz] of [[rr, 0, 0], [-rr, 0, 0], [0, 0, rr], [0, 0, -rr], [0, rr, 0], [0, -rr, 0]]) {
      const sx = Math.floor(x + dx), sy = Math.floor(y + dy), sz = Math.floor(z + dz), t = w.get(sx, sy, sz);
      if (t && t < 128 && !isTerrain(t) && this.examine(sx, sy, sz)) return;
    }
  }

  // Flood-fills the piece that contains (x, y, z). Returns true if it was brought down.
  examine(x, y, z) {
    const g = this.g, w = g.world, st = this.stack, seen = new Set();
    let n = 0, top = 0, mass = 0, mx = 0, mz = 0, nb = 0, sb = 0, bx = 0, bz = 0;
    st[0] = x; st[1] = y; st[2] = z; top = 3;
    seen.add(w.index(x, y, z));
    while (top) {
      top -= 3;
      const cx = st[top], cy = st[top + 1], cz = st[top + 2], t = w.get(cx, cy, cz), m = VOXEL_MASS[t] || 0.5;
      if (++n > BUDGET) return false; // a real building
      mass += m; mx += cx * m; mz += cz * m;
      // Footing: what stands directly on the ground or on rubble.
      const below = w.get(cx, cy - 1, cz);
      if (below && (isTerrain(below) || below >= 128)) {
        if (nb >= MAX_BASE) return false;
        this.base[nb * 3] = cx; this.base[nb * 3 + 1] = cy; this.base[nb * 3 + 2] = cz; nb++;
        sb += VOXEL_STRENGTH[t] || 1; bx += cx; bz += cz;
      }
      for (const d of DIRS) {
        const ax = cx + d[0], ay = cy + d[1], az = cz + d[2], a = w.get(ax, ay, az);
        if (!a || a >= 128 || isTerrain(a)) continue;
        const k = w.index(ax, ay, az);
        if (seen.has(k)) continue;
        seen.add(k);
        st[top] = ax; st[top + 1] = ay; st[top + 2] = az; top += 3;
      }
    }
    if (!nb || n < 12) return false; // hanging free (the support search deals with that) or a crumb
    // Centre of gravity against the footing. The world may wrap, but a piece this small does not span the seam
    // in a way that matters: coordinates were collected unwrapped from the starting point.
    const cgx = mx / mass, cgz = mz / mass, fx = bx / nb, fz = bz / nb;
    let rb = 0;
    for (let i = 0; i < nb; i++) rb = Math.max(rb, Math.hypot(this.base[i * 3] - fx, this.base[i * 3 + 2] - fz));
    const off = Math.hypot(cgx - fx, cgz - fz), grip = 1.5 + 0.12 * Math.sqrt(sb); // strong footings forgive more overhang
    if (off <= rb + grip && mass <= sb * CRUSH) return false;
    // It goes: the footing breaks, and the piece tips towards its centre of gravity.
    g.lastHit.dx = off > 0.01 ? (cgx - fx) / off : g.lastHit.dx; g.lastHit.dz = off > 0.01 ? (cgz - fz) / off : g.lastHit.dz;
    for (let i = 0; i < nb; i++) {
      const px = this.base[i * 3], py = this.base[i * 3 + 1], pz = this.base[i * 3 + 2];
      w.set(px, py, pz, 0);
      g.destruction.addSeeds(px, py, pz);
    }
    g.audio.crack(Math.min(1, n / 4000));
    g.fx.dust(fx, this.base[1], fz, Math.min(6, rb + 2), 0.75, 0.72, 0.66, 5);
    this.fell++;
    return true;
  }
}
