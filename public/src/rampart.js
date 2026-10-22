// The shield of fortress Titan: over each of its two square walls (world.ramparts: centre, half side, ground,
// height, thickness) a shield rises into the sky. The creature cannot jump, climb or fly over a wall; where it
// tries, the shield flashes and throws it back. It has to break through: where the wall in front of it is gone over
// its width and up to its height (or the wall's whole height, for a creature taller than the wall), it passes. The
// steel gate is the weak point: once it is down, a creature that fits under the arch of the gatehouse walks in.
// Above every stretch of wall that still stands, the shield shimmers near the creature.

import { wrapDelta } from './math.js';
import { RUBBLE, TYPE_FLAGS, F_TERRAIN } from './materials.js';

export class Ramparts {
  constructor(game) {
    this.g = game;
    this.rings = [];
    this.zapT = 0;
  }

  reset(world) { this.rings = world.ramparts ?? []; }

  // Is the wall of ring r open where the creature m stands (just across the line)? Looks at a block as wide as the
  // creature, through the whole thickness (towers and gatehouses included), up to the creature's height, layer by
  // layer across the thickness: every layer must be at least half gone (a steel gate one voxel thick blocks the way as well
  // as the whole wall). Loose rubble does not count.
  open(r, m) {
    const w = this.g.world, size = w.wrap ? w.sx : 0, dx = wrapDelta(m.x - r.c, size), dz = wrapDelta(m.z - r.c, size);
    const xSide = Math.abs(dx) >= Math.abs(dz), s = Math.sign(xSide ? dx : dz) || 1, p = Math.round(xSide ? dz : dx);
    const hw = Math.max(2, Math.round(m.h * 0.22)), th = (r.thick >> 1) + 4, top = r.G + Math.min(r.h + 2, Math.max(4, Math.round(m.h * 0.8)));
    const all = (2 * hw + 1) * (top - r.G);
    for (let k = -th; k <= th; k++) {
      let solid = 0;
      for (let q = p - hw; q <= p + hw; q++) {
        const x = xSide ? r.c + s * (r.a + k) : r.c + q, z = xSide ? r.c + q : r.c + s * (r.a + k);
        for (let y = r.G + 1; y <= top; y++) { const t = w.get(x, y, z); if (t && t < RUBBLE && !(TYPE_FLAGS[t] & F_TERRAIN)) solid++; }
      }
      if (solid >= all * 0.5) return false;
    }
    return true;
  }

  // After the creature has moved from (px, pz): if it went across a wall that still stands, it is put back.
  limit(m, px, pz) {
    const g = this.g, size = g.world.wrap ? g.world.sx : 0;
    for (const r of this.rings) {
      const d0 = Math.max(Math.abs(wrapDelta(px - r.c, size)), Math.abs(wrapDelta(pz - r.c, size)));
      const d1 = Math.max(Math.abs(wrapDelta(m.x - r.c, size)), Math.abs(wrapDelta(m.z - r.c, size)));
      if ((d0 >= r.a) === (d1 >= r.a) || this.open(r, m)) continue;
      const cx = m.x, cz = m.z;
      m.x = px; m.z = pz; m.leaping = null; m.kick = null;
      this.zap(cx, m.y + m.h * 0.5, cz, m.h);
      return true;
    }
    return false;
  }

  // The shield flashes where the creature ran into it.
  zap(x, y, z, h) {
    const g = this.g, rnd = g.rng;
    for (let i = 0; i < 26; i++) {
      const a = rnd() * 6.283, r = rnd() * h * 0.6;
      g.fx.add(x + Math.cos(a) * r * 0.3, y + Math.sin(a) * r, z + Math.cos(a + 1) * r * 0.3, (rnd() - 0.5) * 10, (rnd() - 0.5) * 10, (rnd() - 0.5) * 10, 1 + rnd() * h * 0.08, h * 0.05, 0.5 + rnd() * 0.3, 0.45, 0.85, 1, 0.9, 1);
    }
    if (g.time - this.zapT > 0.25) { this.zapT = g.time; g.audio.zap(); g.shake(0.15); g.fx.sparks(x, y, z, 16, 8, 0.5, 0.85, 1); }
  }

  // The shimmer above the walls near the creature: light rising from where the wall still stands.
  update() {
    const g = this.g, w = g.world, m = g.monster, rnd = g.rng, size = w.wrap ? w.sx : 0;
    if (!this.rings.length) return;
    for (const r of this.rings) {
      const dx = wrapDelta(m.x - r.c, size), dz = wrapDelta(m.z - r.c, size), d = Math.max(Math.abs(dx), Math.abs(dz));
      if (Math.abs(d - r.a) > 160) continue;
      const xSide = Math.abs(dx) >= Math.abs(dz), s = Math.sign(xSide ? dx : dz) || 1, p = xSide ? dz : dx;
      for (let n = 0; n < 8 * g.fx.thin; n++) {
        const q = Math.max(-r.a, Math.min(r.a, p + (rnd() - 0.5) * 220)), x = xSide ? r.c + s * r.a : r.c + q, z = xSide ? r.c + q : r.c + s * r.a;
        if (!w.get(Math.round(x), r.G + r.h - 3, Math.round(z))) continue; // broken there: no shield
        g.fx.add(x, r.G + r.h + 3 + rnd() * rnd() * 90, z, 0, 8 + rnd() * 8, 0, 0.35 + rnd() * 0.35, 0, 0.9 + rnd() * 0.6, 0.25, 0.65, 1, 0.45, 1); // thin sparks rising in the plane of the wall
      }
    }
  }
}
