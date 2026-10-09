// Things in the world that answer back when they are destroyed, and act on each other:
// a broken hydrant shoots up a fountain for a while, water (fountains, water towers) gushes out,
// lamps, neon signs and traffic lights die in a shower of sparks. Water puts out fires nearby.

import { T } from './materials.js';
import { GRAVITY } from './particles.js';
import { wrapDelta } from './math.js';

const HYDRANT = 1, WATER = 2, LIGHT = 3;
// What a destroyed voxel sets off, by type. Looked up for every destroyed voxel, so it has to be cheap.
const REACT = new Uint8Array(256);
REACT[T.HYDRANT] = HYDRANT;
REACT[T.WATER] = WATER;
for (const t of [T.LAMP, T.HEADLIGHT, T.NEON_RED, T.NEON_BLUE, T.NEON_GREEN, T.NEON_PINK, T.NEON_YELLOW]) REACT[t] = LIGHT;

const MAX_JETS = 8;

export class Reactions {
  constructor(game) {
    this.g = game;
    this.jets = []; // water sources: { x, y, z, t, size, douse }
    this.zapT = 0;
  }

  clear() { this.jets.length = 0; }

  // Called for every original voxel that is destroyed.
  onVoxel(type, x, y, z) {
    const r = REACT[type];
    if (!r) return;
    if (r === HYDRANT) { this.g.stat('hydrants'); this.jet(x + 0.5, y, z + 0.5, 9 + this.g.rng() * 5, 1); } // a tall fountain for ten seconds or so
    else if (r === WATER) this.jet(x + 0.5, y, z + 0.5, 2.5, 0.6); // a short gush where the basin broke
    else if (this.g.time - this.zapT > 0.12) {
      this.zapT = this.g.time;
      this.g.stat('lamps');
      this.g.fx.sparks(x + 0.5, y + 0.5, z + 0.5, 22, 9, 0.6, 0.85, 1);
      this.g.audio.zap();
    }
  }

  jet(x, y, z, time, size) {
    const wrap = this.g.cam.wrap;
    // One source per spot: more water from the same place just keeps it running.
    for (const j of this.jets) if (Math.hypot(wrapDelta(j.x - x, wrap), wrapDelta(j.z - z, wrap)) < 5 && Math.abs(j.y - y) < 12) { j.t = Math.max(j.t, time); j.size = Math.max(j.size, size); return; }
    if (this.jets.length >= MAX_JETS) this.jets.shift();
    this.jets.push({ x, y, z, t: time, size, douse: 0 });
    this.g.fx.dust(x, y + 1, z, 2 * size, 0.8, 0.92, 1, 4);
  }

  update(dt) {
    const g = this.g, rnd = g.rng, u = g.world.unit;
    let loud = 0;
    for (let i = this.jets.length - 1; i >= 0; i--) {
      const j = this.jets[i];
      j.t -= dt;
      if (j.t <= 0) { this.jets.splice(i, 1); continue; }
      const k = Math.min(1, j.t / 1.5) * j.size, up = (48 + u * 10) * (0.5 + 0.5 * k); // the pressure drops towards the end
      for (let n = 0; n < (g.fx.thin < 0.7 ? 2 : 4); n++) {
        const a = rnd() * 6.283, s = (1 + rnd() * 5) * k, c = rnd() * 0.25;
        g.fx.add(j.x, j.y + 1, j.z, Math.cos(a) * s, up * (0.8 + rnd() * 0.3), Math.sin(a) * s, 1 + rnd() * 1.2 * j.size, 1.4, 1.5 + rnd() * 0.8, 0.55 + c, 0.8 + c * 0.6, 1, 0.9, 0, GRAVITY * 0.75, 0.2);
      }
      if (rnd() < 0.4) g.fx.add(j.x + (rnd() - 0.5) * 8, j.y + 1, j.z + (rnd() - 0.5) * 8, 0, 2, 0, 3 * j.size, 3, 1, 0.85, 0.94, 1, 0.35, 0, -1, 1); // mist at the foot
      // Water against fire: whatever burns close to the fountain goes out.
      if ((j.douse -= dt) <= 0) { j.douse = 0.3; g.fire.douse(j.x, j.y, j.z, 9 + 6 * j.size); }
      const d = Math.hypot(wrapDelta(j.x - g.eye[0], g.cam.wrap), j.y - g.eye[1], wrapDelta(j.z - g.eye[2], g.cam.wrap));
      loud = Math.max(loud, k * Math.max(0, 1 - d / 220));
    }
    this.level = loud; // for the hiss of the water
  }
}
