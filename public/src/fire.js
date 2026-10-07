// Fire and smoke. Burnable voxels (wood, leaves, fabric) catch fire, glow as embers, pass the fire on to
// their neighbours and end as charcoal or nothing. Hot spots are free-standing sources of flames and
// smoke for things that cannot burn themselves, like the crater of an explosion in a concrete tower.

import { EMBER, CHAR, TYPE_MAT, MAT, flammable } from './materials.js';

const MAX_CELLS = 900, MAX_SPOTS = 36;
// Where fire tries to spread: sideways, and twice as often upwards.
const SPREAD = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, 1, 0], [0, -1, 0], [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1]];

export class Fire {
  constructor(game) {
    this.g = game;
    this.cx = new Int32Array(MAX_CELLS); this.cy = new Int32Array(MAX_CELLS); this.cz = new Int32Array(MAX_CELLS);
    this.ct = new Float32Array(MAX_CELLS); // seconds left to burn
    this.n = 0;
    this.spots = [];
  }

  clear() { this.n = 0; this.spots.length = 0; }

  // Sets one voxel alight if it can burn. Explosive voxels go off instead.
  ignite(x, y, z) {
    const g = this.g, w = g.world, t = w.get(x, y, z);
    if (TYPE_MAT[t] === MAT.EXPLOSIVE) { g.queueExplosion(x + 0.5, y + 0.5, z + 0.5); return false; }
    if (!flammable(t) || this.n >= MAX_CELLS) return false;
    const m = TYPE_MAT[t], i = this.n++;
    this.cx[i] = x; this.cy[i] = y; this.cz[i] = z;
    this.ct[i] = m === MAT.WOOD ? 3 + g.rng() * 3.5 : 1.2 + g.rng() * 1.6;
    w.set(x, y, z, EMBER);
    return true;
  }

  // Tries a number of random voxels inside a sphere, e.g. around an explosion.
  igniteSphere(cx, cy, cz, r, tries) {
    const rnd = this.g.rng;
    for (let i = 0; i < tries; i++) {
      const a = rnd() * 6.283, e = rnd() * 2 - 1, d = r * Math.cbrt(rnd()), s = Math.sqrt(1 - e * e);
      this.ignite(Math.floor(cx + Math.cos(a) * s * d), Math.floor(cy + e * d), Math.floor(cz + Math.sin(a) * s * d));
    }
  }

  // A hot spot burns for `time` seconds. flames = false gives a smoke column only.
  spot(x, y, z, size, time, flames = true) {
    if (this.spots.length >= MAX_SPOTS) this.spots.shift();
    this.spots.push({ x, y, z, size, t: time, flames });
  }

  flame(x, y, z, s) {
    const rnd = this.g.rng;
    this.g.fx.add(x + (rnd() - 0.5) * s, y + rnd() * s * 0.5, z + (rnd() - 0.5) * s, (rnd() - 0.5) * 3, 5 + rnd() * 7 + s, (rnd() - 0.5) * 3,
      s * (0.8 + rnd() * 0.8), -s * 1.2, 0.45 + rnd() * 0.5, 1, 0.45 + rnd() * 0.4, 0.08, 0.95, 1, -10, 1);
  }

  smoke(x, y, z, s) {
    const rnd = this.g.rng, c = 0.1 + rnd() * 0.16;
    this.g.fx.add(x + (rnd() - 0.5) * s, y + s * 0.5, z + (rnd() - 0.5) * s, (rnd() - 0.5) * 3 + 1.5, 7 + rnd() * 6, (rnd() - 0.5) * 3,
      s * (0.9 + rnd() * 0.6), s * 0.9 + 1.2, 2.4 + rnd() * 2.6, c, c, c + 0.02, 0.42, 0, -5, 0.5);
  }

  update(dt) {
    const g = this.g, w = g.world, rnd = g.rng, { cx, cy, cz, ct } = this;
    for (let i = this.n - 1; i >= 0; i--) {
      const x = cx[i], y = cy[i], z = cz[i];
      let out = w.get(x, y, z) !== EMBER; // knocked away in the meantime
      if (!out) {
        ct[i] -= dt;
        if (rnd() < dt * 2.2) this.flame(x + 0.5, y + 1, z + 0.5, 1.3);
        if (rnd() < dt * 0.5) this.smoke(x + 0.5, y + 1.5, z + 0.5, 1.6);
        if (rnd() < dt * 1.5) {
          const s = SPREAD[(rnd() * SPREAD.length) | 0];
          this.ignite(x + s[0], y + s[1], z + s[2]);
        }
        if (ct[i] <= 0) {
          // Burnt out: sometimes a charred stump stays, otherwise the voxel is gone and whatever it carried may fall.
          if (rnd() < 0.3) w.set(x, y, z, CHAR);
          else { w.set(x, y, z, 0); g.destruction.addSeeds(x, y, z); }
          out = true;
        }
      }
      if (out) {
        const l = --this.n;
        cx[i] = cx[l]; cy[i] = cy[l]; cz[i] = cz[l]; ct[i] = ct[l];
      }
    }
    for (let i = this.spots.length - 1; i >= 0; i--) {
      const s = this.spots[i];
      s.t -= dt;
      if (s.t <= 0) { this.spots.splice(i, 1); continue; }
      // A hot spot sinks until it rests on something.
      if (s.y > 1 && !w.get(Math.floor(s.x), Math.floor(s.y - 1), Math.floor(s.z))) s.y -= 30 * dt;
      const fade = Math.min(1, s.t / 2);
      if (s.flames && rnd() < dt * 14 * fade) this.flame(s.x, s.y, s.z, s.size * (0.5 + 0.5 * fade));
      if (rnd() < dt * 5) this.smoke(s.x, s.y + s.size * 0.5, s.z, s.size * 0.8 + 0.6);
    }
  }

  // 0..1: how much is burning, for the crackling sound.
  level() {
    return Math.min(1, (this.n + this.spots.length * 12) / 160);
  }
}
