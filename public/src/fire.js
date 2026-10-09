// Fire, heat and smoke.
//
// Heat is what drives everything: flames, beams, explosions and burning neighbours put heat into
// voxels, and a voxel reacts once it has taken more than its material's flash point (materials.js).
// What happens then depends on the material:
//   wood, leaves, cloth  catch fire, glow as embers, pass heat on and end as charcoal or nothing
//   glass                bursts
//   explosives           go off
//   metal, brick, stone  never burn, but a flame thrower leaves them black with soot
//   the ground           is scorched
// Heat that is not renewed fades again, so a fire only spreads where enough of it burns close together:
// through a tree or a wooden house, slowly, but not across a street or up a concrete tower.
// Hot spots are free-standing sources of flames and smoke, e.g. the crater of an explosion.

import { EMBER, CHAR, SOOT, T, TYPE_MAT, TYPE_FLAGS, F_TERRAIN, MAT, FLASH, BURN, flammable } from './materials.js';

const MAX_SPOTS = 36, MAX_HOT = 4000;
const COOLING = 0.15; // heat a voxel loses per second
// Where a burning voxel sends its heat: sideways, and twice as often upwards.
const SPREAD = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, 1, 0], [0, -1, 0], [1, 1, 0], [-1, 1, 0], [0, 1, 1], [0, 1, -1]];

export class Fire {
  constructor(game) {
    this.g = game;
    this.resize(900);
    this.spots = [];
    this.hot = new Map(); // voxel index -> heat taken so far (below the flash point)
    this.coolT = 0;
    this.lit = 0; this.doused = 0; // counters for the achievements
  }

  // max: how many voxels may burn at once (depends on the detail setting).
  resize(max) {
    this.max = max;
    this.cx = new Int32Array(max); this.cy = new Int32Array(max); this.cz = new Int32Array(max);
    this.ct = new Float32Array(max); // seconds left to burn
    this.co = new Float32Array(max); // heat given off per spread attempt
    this.cc = new Float32Array(max); // chance of leaving charcoal
    this.cr = new Float32Array(max); // spread attempts per second
    this.n = 0;
  }

  clear() { this.n = 0; this.spots.length = 0; this.hot.clear(); }

  // Puts heat into one voxel. Returns true if the voxel reacted.
  heat(x, y, z, amount) {
    const g = this.g, w = g.world, t = w.get(x, y, z);
    if (!t || t >= 128) return false;
    const m = TYPE_MAT[t], flash = FLASH[m];
    if (!flash || (w.under && m !== MAT.EXPLOSIVE)) return false; // under water nothing burns or scorches; explosives still go off
    if (amount < flash) {
      const k = w.index(x, y, z), h = (this.hot.get(k) ?? 0) + amount;
      if (h < flash) {
        if (this.hot.size >= MAX_HOT) this.hot.clear();
        this.hot.set(k, h);
        return false;
      }
      this.hot.delete(k);
    }
    if (m === MAT.EXPLOSIVE) { g.queueExplosion(x + 0.5, y + 0.5, z + 0.5); return true; }
    if (flammable(t)) return this.ignite(x, y, z);
    if (TYPE_FLAGS[t] & F_TERRAIN) { if (t !== T.SCORCH) w.set(x, y, z, T.SCORCH); return true; }
    if (m === MAT.GLASS) {
      if (t === T.WATER) return false;
      w.set(x, y, z, 0);
      g.destruction.addSeeds(x, y, z);
      if (g.rng() < 0.3) g.debris.spawn(x + 0.5, y + 0.5, z + 0.5, (g.rng() - 0.5) * 12, 2 + g.rng() * 6, (g.rng() - 0.5) * 12, t);
      if (g.rng() < 0.1) g.audio.hit('glass', 0.3);
      return true;
    }
    w.set(x, y, z, SOOT);
    return true;
  }

  // Sets one voxel alight if it can burn, whatever its temperature.
  ignite(x, y, z) {
    const g = this.g, w = g.world, t = w.get(x, y, z);
    if (TYPE_MAT[t] === MAT.EXPLOSIVE && t < 128) { g.queueExplosion(x + 0.5, y + 0.5, z + 0.5); return false; }
    if (!flammable(t) || this.n >= this.max || w.under) return false;
    const b = BURN[TYPE_MAT[t]], i = this.n++;
    this.cx[i] = x; this.cy[i] = y; this.cz[i] = z;
    this.ct[i] = b[0] + g.rng() * b[1]; this.co[i] = b[2]; this.cc[i] = b[3]; this.cr[i] = b[4];
    w.set(x, y, z, EMBER);
    this.lit++;
    return true;
  }

  // Heats a number of random voxels inside a sphere, e.g. around an explosion or where a flame lands.
  // Only voxels that touch air are picked: fire works on surfaces.
  heatSphere(cx, cy, cz, r, amount, tries) {
    const rnd = this.g.rng, w = this.g.world;
    for (let i = 0; i < tries; i++) {
      const a = rnd() * 6.283, e = rnd() * 2 - 1, d = r * Math.cbrt(rnd()), s = Math.sqrt(1 - e * e);
      const x = Math.floor(cx + Math.cos(a) * s * d), y = Math.floor(cy + e * d), z = Math.floor(cz + Math.sin(a) * s * d);
      if (!w.get(x, y, z)) continue;
      if (w.get(x, y + 1, z) && w.get(x + 1, y, z) && w.get(x - 1, y, z) && w.get(x, y, z + 1) && w.get(x, y, z - 1)) continue;
      this.heat(x, y, z, amount);
    }
  }

  // A hot spot burns for `time` seconds. flames = false gives a smoke column only.
  // pale = a cloud of light dust instead of dark smoke (collapsing masonry).
  spot(x, y, z, size, time, flames = true, pale = false) {
    if (!flames && !this.g.progress.settings.smoke) return;
    if (flames && this.g.world.under) { flames = false; pale = true; time = Math.min(time, 3); } // a cloud of silt instead of a fire
    if (this.spots.length >= MAX_SPOTS) this.spots.shift();
    this.spots.push({ x, y, z, size, t: time, flames, pale, heatT: 0 });
  }

  // Water: puts out what burns within the radius, at most `max` voxels per call. Returns how much went out.
  douse(x, y, z, r, max = 1e9) {
    const w = this.g.world, { cx, cy, cz } = this, r2 = r * r, size = w.wrap ? w.sx : 0, half = size / 2;
    let out = 0;
    for (let i = this.n - 1; i >= 0; i--) {
      let dx = cx[i] - x, dz = cz[i] - z;
      const dy = cy[i] - y;
      if (size) { if (dx > half) dx -= size; else if (dx < -half) dx += size; if (dz > half) dz -= size; else if (dz < -half) dz += size; }
      if (dx * dx + dy * dy * 0.25 + dz * dz > r2) continue;
      if (out >= max) break;
      if (w.get(cx[i], cy[i], cz[i]) === EMBER) w.set(cx[i], cy[i], cz[i], CHAR);
      this.drop(i);
      out++;
    }
    for (const s of this.spots) if (s.flames && (s.x - x) ** 2 + (s.z - z) ** 2 < r2) { s.flames = false; s.t = Math.min(s.t, 1.5); s.pale = true; out++; } // steam
    this.doused += out;
    return out;
  }

  drop(i) {
    const l = --this.n;
    this.cx[i] = this.cx[l]; this.cy[i] = this.cy[l]; this.cz[i] = this.cz[l]; this.ct[i] = this.ct[l]; this.co[i] = this.co[l]; this.cc[i] = this.cc[l]; this.cr[i] = this.cr[l];
  }

  // Something that burns, for the fire brigade: fills out[0..2] and returns false if nothing does.
  target(out) {
    if (this.n) { const i = (this.g.rng() * this.n) | 0; out[0] = this.cx[i]; out[1] = this.cy[i]; out[2] = this.cz[i]; return true; }
    for (const s of this.spots) if (s.flames) { out[0] = s.x; out[1] = s.y; out[2] = s.z; return true; }
    return false;
  }

  dustCloud(x, y, z, s) {
    const rnd = this.g.rng, c = 0.7 + rnd() * 0.12;
    this.g.fx.add(x + (rnd() - 0.5) * s * 2, y + rnd() * s, z + (rnd() - 0.5) * s * 2, (rnd() - 0.5) * 6, 2 + rnd() * 4, (rnd() - 0.5) * 6,
      s * (1 + rnd() * 0.8), s * 0.7 + 1, 2.6 + rnd() * 2.4, c, c * 0.97, c * 0.92, 0.42, 0, -1.5, 0.9);
  }

  flame(x, y, z, s) {
    const rnd = this.g.rng;
    if (this.g.world.under) { this.g.fx.add(x, y, z, (rnd() - 0.5) * 2, 5 + rnd() * 5, (rnd() - 0.5) * 2, 0.4 + rnd() * 0.5, 0.1, 1.5, 0.85, 0.95, 1, 0.5, 0, 0, 0); return; } // bubbles
    this.g.fx.add(x + (rnd() - 0.5) * s, y + rnd() * s * 0.5, z + (rnd() - 0.5) * s, (rnd() - 0.5) * 3, 5 + rnd() * 7 + s, (rnd() - 0.5) * 3,
      s * (0.8 + rnd() * 0.8), -s * 1.2, 0.45 + rnd() * 0.5, 1, 0.45 + rnd() * 0.4, 0.08, 0.95, 1, -10, 1);
  }

  smoke(x, y, z, s) {
    if (!this.g.progress.settings.smoke) return;
    const rnd = this.g.rng, c = 0.1 + rnd() * 0.16;
    this.g.fx.add(x + (rnd() - 0.5) * s, y + s * 0.5, z + (rnd() - 0.5) * s, (rnd() - 0.5) * 3 + 1.5, 7 + rnd() * 6, (rnd() - 0.5) * 3,
      s * (0.9 + rnd() * 0.6), s * 0.9 + 1.2, 2.4 + rnd() * 2.6, c, c, c + 0.02, 0.42, 0, -5, 0.5);
  }

  update(dt) {
    const g = this.g, w = g.world, rnd = g.rng, { cx, cy, cz, ct } = this;
    const spread = g.progress.settings.fireSpread, thin = g.fx.thin;
    for (let i = this.n - 1; i >= 0; i--) {
      const x = cx[i], y = cy[i], z = cz[i];
      if (w.get(x, y, z) !== EMBER) { this.drop(i); continue; } // knocked away in the meantime
      ct[i] -= dt;
      if (rnd() < dt * 2.2 * thin) this.flame(x + 0.5, y + 1, z + 0.5, 1.3);
      if (rnd() < dt * 0.5 * thin) this.smoke(x + 0.5, y + 1.5, z + 0.5, 1.6);
      if (spread && rnd() < dt * this.cr[i]) {
        const s = SPREAD[(rnd() * SPREAD.length) | 0];
        this.heat(x + s[0], y + s[1], z + s[2], this.co[i]);
      }
      if (ct[i] > 0) continue;
      // Burnt out: a charred rest stays, or the voxel is gone and whatever it carried may fall.
      if (rnd() < this.cc[i]) w.set(x, y, z, CHAR);
      else { w.set(x, y, z, 0); g.destruction.addSeeds(x, y, z); }
      this.drop(i);
    }
    // Heat that is not renewed fades.
    if ((this.coolT += dt) >= 1) {
      this.coolT = 0;
      for (const [k, h] of this.hot) { if (h <= COOLING) this.hot.delete(k); else this.hot.set(k, h - COOLING); }
    }
    for (let i = this.spots.length - 1; i >= 0; i--) {
      const s = this.spots[i];
      s.t -= dt;
      if (s.t <= 0) { this.spots.splice(i, 1); continue; }
      // A hot spot sinks until it rests on something.
      if (s.y > 1 && !w.get(Math.floor(s.x), Math.floor(s.y - 1), Math.floor(s.z))) s.y -= 30 * dt;
      const fade = Math.min(1, s.t / 2);
      if (s.flames && rnd() < dt * 14 * fade * thin) this.flame(s.x, s.y, s.z, s.size * (0.5 + 0.5 * fade));
      if (rnd() < dt * 5 * thin) { if (s.pale) this.dustCloud(s.x, s.y, s.z, s.size * 0.8 + 0.6); else this.smoke(s.x, s.y + s.size * 0.5, s.z, s.size * 0.8 + 0.6); }
      // Flames blacken what they stand on and light what can burn next to them.
      if (s.flames && (s.heatT -= dt) <= 0) { s.heatT = 0.4; this.heatSphere(s.x, s.y, s.z, s.size + 1.5, 1.6, 3); }
    }
  }

  // 0..1: how much is burning, for the crackling sound (and for the fire brigade).
  level() {
    let flames = 0;
    for (const s of this.spots) if (s.flames) flames++;
    return Math.min(1, (this.n + flames * 12) / 160);
  }
}
