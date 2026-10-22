// Things in the world that answer back when they are destroyed, and act on each other:
// a broken hydrant shoots up a fountain for a while, water (fountains, water towers) gushes out,
// lamps, neon signs and traffic lights die in a shower of sparks. Water puts out fires nearby.
// A volcano wakes when the idol hidden inside it is broken or when it is torn open far enough: it erupts.

import { T } from './materials.js';
import { GRAVITY } from './particles.js';
import { wrapDelta } from './math.js';

const HYDRANT = 1, WATER = 2, LIGHT = 3, BALLOON = 4, SECRET = 5, AMMO = 6;
const BALLOON_RGB = { [T.BALLOON_RED]: [1, 0.3, 0.37], [T.BALLOON_BLUE]: [0.3, 0.64, 1], [T.BALLOON_YELLOW]: [1, 0.85, 0.3] };
// What a destroyed voxel sets off, by type. Looked up for every destroyed voxel, so it has to be cheap.
const REACT = new Uint8Array(256);
REACT[T.HYDRANT] = HYDRANT;
REACT[T.WATER] = WATER;
REACT[T.SECRET] = SECRET;
for (const t of [T.BARREL, T.TANK, T.GAS]) REACT[t] = AMMO; // only matters inside an ammunition depot (fortress Titan)
for (const t of [T.BALLOON_RED, T.BALLOON_BLUE, T.BALLOON_YELLOW]) REACT[t] = BALLOON;
for (const t of [T.LAMP, T.HEADLIGHT, T.NEON_RED, T.NEON_BLUE, T.NEON_GREEN, T.NEON_PINK, T.NEON_YELLOW]) REACT[t] = LIGHT;

const MAX_JETS = 8;

export class Reactions {
  constructor(game) {
    this.g = game;
    this.jets = []; // water sources: { x, y, z, t, size, douse }
    this.zapT = 0;
    this.blast = null; // an ammunition depot going up: { d: depot, t: seconds since, n: blasts so far }
    this.eruptions = []; // volcanoes erupting: { v: vent, t: seconds since it woke, next: time of the next lava bomb }
    this.bombs = []; // lava bombs in flight
    this.volcT = 0;
  }

  clear() { this.jets.length = 0; this.blast = null; this.eruptions.length = 0; this.bombs.length = 0; }

  // Called for every original voxel that is destroyed.
  onVoxel(type, x, y, z) {
    const r = REACT[type];
    if (!r) return;
    if (r === AMMO) { // the first explosive voxel lost inside a depot sets the whole depot off
      if (this.blast) return;
      for (const d of this.g.world.depots ?? []) if (!d.blown && x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1 && y >= d.y0 && y < d.y1) { d.blown = true; this.blast = { d, t: 0, n: 0 }; this.g.shake(0.6); }
      return;
    }
    if (r === HYDRANT) { this.g.stat('hydrants'); this.jet(x + 0.5, y, z + 0.5, 9 + this.g.rng() * 5, 1); } // a tall fountain for ten seconds or so
    else if (r === SECRET) { // a hidden find: a shower of gold and a chime
      const g = this.g;
      if (g.time - (this.secretT ?? -9) < 0.5) return; // one find, even if it has several golden voxels
      this.secretT = g.time;
      g.stat('eggs');
      g.fx.sparks(x + 0.5, y + 0.5, z + 0.5, 30, 40, 1, 0.85, 0.3);
      g.fx.firework(x + 0.5, y + 6, z + 0.5, 14);
      g.audio.achieve();
      g.addPower(400 * g.monster.stage ** 2); // worth looking for
      const wrap = g.cam.wrap;
      for (const v of g.world.vents ?? []) if (Math.hypot(wrapDelta(x - v[0], wrap), wrapDelta(z - v[2], wrap)) < v[4]) this.wake(v); // the idol of the volcano
    } else if (r === BALLOON) { // set free: it drifts up and away
      const c = BALLOON_RGB[type], rnd = this.g.rng;
      this.g.fx.add(x + 0.5, y + 0.5, z + 0.5, (rnd() - 0.5) * 5, 5 + rnd() * 4, (rnd() - 0.5) * 5, 1.6, 0, 6 + rnd() * 4, c[0], c[1], c[2], 1, 0, -3, 0.1);
    } else if (r === WATER) this.jet(x + 0.5, y, z + 0.5, 2.5, 0.6); // a short gush where the basin broke
    else if (this.g.time - this.zapT > 0.12) {
      this.zapT = this.g.time;
      this.g.stat('lamps');
      this.g.fx.sparks(x + 0.5, y + 0.5, z + 0.5, 22, 9, 0.6, 0.85, 1);
      this.g.audio.zap();
    }
  }

  // A volcano wakes (world.vents: x, top, z, crater radius, radius, ground, structure id, idol id): the mountain
  // rumbles for two seconds, then its top blows off and it throws lava bombs all around for ten.
  wake(v) {
    if (v.woke !== undefined) return;
    v.woke = this.g.time;
    this.eruptions.push({ v, t: 0, next: 0, blown: false });
    this.g.audio.rumble(1); this.g.audio.groan(1);
  }

  // One lava bomb from the crater: it flies in an arc to a spot up to three radii away and explodes where it lands.
  bomb(v) {
    const g = this.g, rnd = g.rng, w = g.world, a = rnd() * 6.283, d = v[4] * (0.4 + rnd() * 2.6), T = 1.8 + rnd() * 1.8;
    const x0 = v[0] + Math.cos(a) * v[3] * 0.5 * rnd(), z0 = v[2] + Math.sin(a) * v[3] * 0.5 * rnd(), y0 = v[1] + 2;
    const tx = x0 + Math.cos(a) * d, tz = z0 + Math.sin(a) * d, ty = w.heightBelow(tx, tz, w.sy - 1);
    this.bombs.push({ x: x0, y: y0, z: z0, vx: (tx - x0) / T, vz: (tz - z0) / T, vy: (ty - y0 + 0.5 * GRAVITY * T * T) / T, t: T, r: 2.5 + rnd() * 3.5 });
  }

  erupt(dt) {
    const g = this.g, rnd = g.rng, thin = g.fx.thin;
    for (let i = this.eruptions.length - 1; i >= 0; i--) {
      const e = this.eruptions[i], v = e.v, [x, top, z, crater] = v;
      e.t += dt;
      if (e.t < 2.2) { // the rumbling before
        g.shake(0.08 + e.t * 0.08);
        if (rnd() < 0.5) g.fx.add(x + (rnd() - 0.5) * crater * 2, top, z + (rnd() - 0.5) * crater * 2, 0, 8 + rnd() * 6, 0, 6 + rnd() * 5, 4, 4, 0.3, 0.27, 0.26, 0.8, 0, 0, 0.2);
        continue;
      }
      if (!e.blown) { // the top blows off
        e.blown = true;
        g.stat('eruptions');
        g.explode(x, top - 3, z, Math.min(30, crater * 1.4 + 5), 45);
        for (let k = 0; k < 5; k++) g.fx.explosion(x + (rnd() - 0.5) * crater * 2, top + rnd() * 14, z + (rnd() - 0.5) * crater * 2, crater * 0.6 + 3);
        g.shake(1.4); g.slowT = Math.max(g.slowT ?? 0, 0.8); g.audio.boom(1.6);
      }
      if (e.t < 13) {
        while (e.next <= e.t) { e.next += 0.08 + rnd() * 0.06; this.bomb(v); }
        for (let n = 0; n < 3 * thin; n++) { // a fountain of glowing lava, and the ash column
          g.fx.add(x + (rnd() - 0.5) * crater, top, z + (rnd() - 0.5) * crater, (rnd() - 0.5) * 18, 40 + rnd() * 50, (rnd() - 0.5) * 18, 2.5 + rnd() * 3, 0, 1.5 + rnd(), 1, 0.4 + rnd() * 0.3, 0.08, 1, 1, GRAVITY * 0.5, 0.05);
          g.fx.add(x + (rnd() - 0.5) * crater, top + 4, z + (rnd() - 0.5) * crater, (rnd() - 0.5) * 6, 18 + rnd() * 22, (rnd() - 0.5) * 6, 9 + rnd() * 9, 6, 7 + rnd() * 5, 0.2, 0.18, 0.18, 0.85, 0, 0, 0.3);
        }
        g.shake(0.12);
      } else if (e.t > 16) this.eruptions.splice(i, 1);
    }
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const b = this.bombs[i], h = Math.min(dt, b.t);
      b.x += b.vx * h; b.z += b.vz * h; b.y += b.vy * h - 0.5 * GRAVITY * h * h; b.vy -= GRAVITY * h; b.t -= h;
      g.fx.add(b.x, b.y, b.z, 0, 0, 0, b.r * 1.4, 0, 0.06, 1, 0.5, 0.12, 1, 1); // the glowing bomb
      if (rnd() < 0.7 * thin) g.fx.add(b.x, b.y, b.z, 0, 2, 0, b.r * 0.6, 3, 1.4, 0.25, 0.22, 0.2, 0.6, 0, 0, 0.5); // its trail of smoke
      if (b.t <= 0 || (b.vy < 0 && g.world.get(Math.floor(b.x), Math.floor(b.y), Math.floor(b.z)))) { this.bombs.splice(i, 1); g.explode(b.x, b.y, b.z, b.r, 26); }
    }
  }

  jet(x, y, z, time, size) {
    if (this.g.world.under) return; // no fountains under water
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
    // The depot goes up: a rolling series of blasts through the bunker, then one enormous explosion and slow motion.
    const b = this.blast;
    if (b && (b.t += dt) > b.n * 0.22) {
      const d = b.d, cx = (d.x0 + d.x1) / 2, cz = (d.z0 + d.z1) / 2, size = Math.max(d.x1 - d.x0, d.z1 - d.z0);
      if (b.n < 7) g.explode(d.x0 + rnd() * (d.x1 - d.x0), d.y0 + 4, d.z0 + rnd() * (d.z1 - d.z0), 9 + b.n * 2, 30);
      else {
        g.explode(cx, d.y0 + 6, cz, Math.min(48, size * 0.6), 40);
        for (let k = 0; k < 6; k++) g.fx.explosion(cx + (rnd() - 0.5) * size, d.y0 + 10 + rnd() * size * 0.6, cz + (rnd() - 0.5) * size, size * 0.25);
        g.shake(1.6); g.slowT = Math.max(g.slowT ?? 0, 1.4); g.audio.boom(1.5);
        this.blast = null;
      }
      if (this.blast) b.n++;
    }
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
      if ((j.douse -= dt) <= 0) { j.douse = 0.3; g.fire.douse(j.x, j.y, j.z, 5 + 3 * j.size, 8); }
      const d = Math.hypot(wrapDelta(j.x - g.eye[0], g.cam.wrap), j.y - g.eye[1], wrapDelta(j.z - g.eye[2], g.cam.wrap));
      loud = Math.max(loud, k * Math.max(0, 1 - d / 220));
    }
    this.level = loud; // for the hiss of the water
    // A volcano torn open far enough wakes by itself (looked at once a second).
    if ((this.volcT -= dt) <= 0) {
      this.volcT = 1;
      for (const v of g.world.vents ?? []) { const st = g.world.structures[v[6]]; if (v.woke === undefined && st && st.remaining < st.total * 0.7) this.wake(v); }
    }
    if (this.eruptions.length || this.bombs.length) this.erupt(dt);
    // Volcanoes smoke (world.vents: x, y, z, radius of the crater) as long as their crater is still there, and for
    // two minutes after an eruption.
    for (const v of g.world.vents ?? []) {
      const awake = v.woke !== undefined && g.time - v.woke < 120;
      if (rnd() > dt * (awake ? 14 : 6) * g.fx.thin || (!awake && !g.world.get(v[0], v[1] - 7, v[2]))) continue; // no lava left in the crater: no smoke
      const wrap = g.cam.wrap, d = Math.hypot(wrapDelta(v[0] - g.eye[0], wrap), wrapDelta(v[2] - g.eye[2], wrap));
      if (d > 900) continue;
      const a = rnd() * 6.283, r = rnd() * v[3];
      g.fx.add(v[0] + Math.cos(a) * r, v[1], v[2] + Math.sin(a) * r, (rnd() - 0.5) * 3, 6 + rnd() * 5, (rnd() - 0.5) * 3, 6 + rnd() * 6, 4, 6 + rnd() * 4, 0.32, 0.29, 0.28, 0.75, 0, 0, 0.1);
      if (rnd() < 0.3) g.fx.add(v[0] + Math.cos(a) * r * 0.5, v[1] - 3, v[2] + Math.sin(a) * r * 0.5, 0, 4, 0, 3, 2, 1, 1, 0.45, 0.1, 0.8, 1); // a glow from the lava
    }
  }
}
