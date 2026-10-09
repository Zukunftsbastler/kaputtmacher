// Streets and what drives on them.
//
// Towns are built on a grid of lots (worldgen.js), so their street map is simple: one street along
// every lot border, in both directions. `Roads` knows where the streets and crossings are and moves a
// vehicle along them: it keeps to the right, decides at every crossing where to go next, swerves around
// parked cars and rubble and turns back when the street is blocked. The emergency vehicles in actors.js
// use it to find their way; `Traffic` adds ordinary cars and buses that just drive around, flee from
// the creature and can be flattened like everything else.

import { wrapDelta } from './math.js';
import { T } from './materials.js';

// The four directions a vehicle can leave a crossing in: [along x?, sign].
const WAYS = [[0, 1], [0, -1], [1, 1], [1, -1]];

export class Roads {
  // net: { pitch, n, width(i), closed(alongX, line, cell) } as written by the town generator.
  constructor(world) {
    this.w = world;
    this.net = world.roads ?? null;
  }

  get ok() { return !!this.net; }

  centre(line) { const n = this.net; return line * n.pitch + n.width(((line % n.n) + n.n) % n.n) / 2; }

  // Is the street leaving crossing (i, j) in direction (ax, dir) there at all? (The central park has none.)
  open(i, j, ax, dir) {
    const n = this.net, m = (k) => ((k % n.n) + n.n) % n.n;
    return ax === 0 ? !n.closed(true, m(j), m(dir > 0 ? i : i - 1)) : !n.closed(false, m(i), m(dir > 0 ? j : j - 1));
  }

  // Puts a vehicle on the street nearest to (x, z), heading towards (tx, tz) if given.
  join(v, x, z, tx = x, tz = z) {
    const n = this.net, P = n.pitch, S = this.w.sx;
    const i = Math.round((x - n.width(0) / 2) / P), j = Math.round((z - n.width(0) / 2) / P);
    const dx = Math.abs(x - this.centre(i)), dz = Math.abs(z - this.centre(j));
    // The nearer of the two streets around this spot.
    if (dz <= dx) { v.ax = 0; v.line = j; v.s = x; v.dir = wrapDelta(tx - x, S) >= 0 ? 1 : -1; }
    else { v.ax = 1; v.line = i; v.s = z; v.dir = wrapDelta(tz - z, S) >= 0 ? 1 : -1; }
    v.lane = 1; v.swerve = 0; v.wait = 0;
    this.place(v);
  }

  // A random spot on a street roughly `dist` away from (x, z). Fills v and returns false if none was found.
  spawn(v, x, z, dist, rnd) {
    const n = this.net, P = n.pitch, S = this.w.sx;
    for (let t = 0; t < 12; t++) {
      const a = rnd() * 6.283, px = x + Math.cos(a) * dist, pz = z + Math.sin(a) * dist;
      this.join(v, px, pz, x, z);
      // Not on a stretch that the park has swallowed.
      const cell = Math.floor((((v.s % S) + S) % S) / P), line = ((v.line % n.n) + n.n) % n.n;
      if (!n.closed(v.ax === 0, line, cell)) return true;
    }
    return false;
  }

  // World position and facing from the vehicle's place on the network. Traffic keeps to the right.
  place(v) {
    const n = this.net, S = this.w.sx, rw = n.width(((v.line % n.n) + n.n) % n.n);
    const off = (rw / 4) * v.dir * v.lane * (v.ax === 0 ? 1 : -1), c = this.centre(v.line) + off;
    v.s = ((v.s % S) + S) % S;
    if (v.ax === 0) { v.x = v.s; v.z = ((c % S) + S) % S; } else { v.z = v.s; v.x = ((c % S) + S) % S; }
    v.want = v.ax === 0 ? (v.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : v.dir > 0 ? 0 : Math.PI;
  }

  // Moves a vehicle `step` voxels along its street. pick(options, i, j) chooses at a crossing among
  // the open ways [ax, dir, back]; u is the world's unit (for the size of a car).
  // Returns false while the vehicle has to wait for a blocked street.
  advance(v, step, dt, u, pick) {
    const w = this.w, n = this.net, P = n.pitch;
    // Something in the way? Look a car length ahead in the own lane, then in the other one.
    v.swerve -= dt;
    if (v.swerve <= 0 && v.lane < 0) v.lane = 1;
    if (this.blocked(v, u)) {
      v.lane = -v.lane;
      this.place(v);
      if (this.blocked(v, u)) {
        v.lane = -v.lane;
        this.place(v);
        if ((v.wait += dt) > 1.5) { v.wait = 0; v.dir = -v.dir; v.lane = 1; this.place(v); } // nothing to be done: turn round
        return false;
      }
      v.swerve = 2.5;
    }
    v.wait = 0;
    // The next crossing in the direction of travel.
    const k0 = Math.floor(v.s / P), c0 = this.centre(k0);
    const k = v.dir > 0 ? (v.s < c0 ? k0 : k0 + 1) : v.s > c0 ? k0 : k0 - 1, ck = this.centre(k);
    const left = (ck - v.s) * v.dir;
    if (step < left) v.s += v.dir * step;
    else {
      // At the crossing: which ways are open, and which one to take.
      const i = v.ax === 0 ? k : v.line, j = v.ax === 0 ? v.line : k, opts = [];
      for (const [ax, dir] of WAYS) if (this.open(i, j, ax, dir)) opts.push([ax, dir, ax === v.ax && dir === -v.dir]);
      const ahead = opts.filter((o) => !o[2]);
      const go = pick(ahead.length ? ahead : opts, i, j) ?? opts[0];
      if (!go) { v.dir = -v.dir; this.place(v); return false; }
      if (go[0] !== v.ax) { const here = this.centre(v.line); v.ax = go[0]; v.line = k; v.s = here; } else v.s = ck;
      v.dir = go[1];
      v.s += v.dir * (step - left + 0.01);
    }
    this.place(v);
    const gy = w.heightBelow(v.x, v.z, v.y + 1.6 * u);
    v.y += (gy - v.y) * Math.min(1, dt * 12);
    return true;
  }

  blocked(v, u) {
    const w = this.w, fx = v.ax === 0 ? v.dir : 0, fz = v.ax === 0 ? 0 : v.dir;
    const px = v.x + fx * 3.2 * u, pz = v.z + fz * 3.2 * u, y = Math.floor(v.y + 1.5 * u);
    return !!w.get(Math.floor(px), y, Math.floor(pz)) || w.heightBelow(px, pz, v.y + 4 * u) > v.y + 1.5 * u;
  }

  // For pick(): the way out of crossing (i, j) that leads closest to (tx, tz), or furthest from it.
  toward(opts, i, j, tx, tz, away = false) {
    const P = this.net.pitch, S = this.w.sx, cx = this.centre(i), cz = this.centre(j);
    let best = null, bd = away ? -1 : 1e9;
    for (const o of opts) {
      const d = Math.hypot(wrapDelta(tx - (cx + (o[0] === 0 ? o[1] * P : 0)), S), wrapDelta(tz - (cz + (o[0] === 1 ? o[1] * P : 0)), S));
      if (away ? d > bd : d < bd) { bd = d; best = o; }
    }
    return best;
  }
}

const PAINT = [[0.84, 0.19, 0.19], [0.04, 0.52, 0.89], [0.99, 0.8, 0.43], [0.96, 0.96, 0.98], [0, 0.72, 0.58], [0.18, 0.2, 0.21], [0.6, 0.35, 0.7], [0.9, 0.5, 0.15]];
const DEBRIS = [T.CAR_RED, T.CAR_BLUE, T.CAR_YELLOW, T.CAR_WHITE, T.CAR_GREEN, T.CAR_BLACK, T.CAR_BLUE, T.CAR_YELLOW];

export class Traffic {
  constructor(game) {
    this.g = game;
    this.cars = [];
    this.roads = null;
    this.want = 0;
    this.spawnT = 0;
  }

  // Called for every new world (and when "life" is switched). share: 0..1.3 from the detail level.
  reset(on) {
    const w = this.g.world;
    this.cars.length = 0;
    this.roads = new Roads(w);
    this.want = on && this.roads.ok && !w.quiet ? Math.round(26 * (w.roads.cars ?? 0.5) * this.g.quality.units) : 0;
    // The streets are busy from the first moment.
    for (let i = 0; i < this.want; i++) this.add(40 + this.g.rng() * 200);
  }

  add(dist) {
    const g = this.g, m = g.monster, rnd = g.rng, u = g.world.unit, k = (rnd() * PAINT.length) | 0;
    const c = { x: 0, y: 0, z: 0, yaw: 0, want: 0, ax: 0, dir: 1, line: 0, s: 0, lane: 1, swerve: 0, wait: 0, bus: rnd() < 0.12, k, speed: (8 + rnd() * 5) * u, fear: 0 };
    if (!this.roads.spawn(c, m.x, m.z, dist, rnd)) return;
    c.y = g.world.heightBelow(c.x, c.z, g.world.sy - 1);
    if (c.y > 16 + 8 * u) return; // on top of a ruin
    c.yaw = c.want;
    this.cars.push(c);
  }

  update(dt) {
    const g = this.g, w = g.world, m = g.monster, u = w.unit, S = w.sx, rnd = g.rng, roads = this.roads;
    if (!this.want && !this.cars.length) return;
    if ((this.spawnT -= dt) <= 0 && this.cars.length < this.want) { this.spawnT = 0.7; this.add(190 + rnd() * 60); }
    const scare = m.h * 2.2 + 18 * u;
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i];
      const dx = wrapDelta(c.x - m.x, S), dz = wrapDelta(c.z - m.z, S), d = Math.hypot(dx, dz);
      if (d > 330) { this.cars.splice(i, 1); continue; } // left behind: another one will turn up ahead
      if (d < m.h * 0.28 + 2 * u && Math.abs(m.y - c.y) < m.h * 0.5 + 2 && m.h > 5 * u) { this.wreck(i); continue; }
      // Close to the creature the driver steps on it and takes every turn that leads away.
      c.fear = d < scare && !g.fly ? 1 : Math.max(0, c.fear - dt * 0.4);
      const pick = c.fear > 0.5 ? (o, ci, cj) => roads.toward(o, ci, cj, m.x, m.z, true)
        : (o) => { const straight = o.find((q) => q[0] === c.ax); return straight && rnd() < 0.6 ? straight : o[(rnd() * o.length) | 0]; };
      roads.advance(c, c.speed * (1 + c.fear) * dt, dt, u, pick);
      let turn = c.want - c.yaw;
      turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      c.yaw += turn * Math.min(1, dt * 5);
    }
  }

  wreck(i) {
    const g = this.g, c = this.cars[i], u = g.world.unit, rnd = g.rng;
    for (let k = 0; k < (c.bus ? 14 : 8); k++) g.debris.spawn(c.x + (rnd() - 0.5) * 3 * u, c.y + 1 + rnd() * 2 * u, c.z + (rnd() - 0.5) * 3 * u, (rnd() - 0.5) * 26, 10 + rnd() * 18, (rnd() - 0.5) * 26, k % 4 ? DEBRIS[c.k] : T.TIRE);
    g.fx.dust(c.x, c.y + u, c.z, 2 * u, 0.6, 0.6, 0.62, 5);
    g.audio.hit('metal', 0.8);
    if (rnd() < 0.25) g.queueExplosion(c.x, c.y + u, c.z); // one in four goes up
    g.stat('cars');
    this.cars.splice(i, 1);
  }

  // Any damage near a car destroys it.
  hit(x, y, z, r) {
    const g = this.g, S = g.world.wrap ? g.world.sx : 0, reach = r + g.world.unit * 2;
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const c = this.cars[i], dx = wrapDelta(c.x - x, S), dy = c.y + 1 - y, dz = wrapDelta(c.z - z, S);
      if (dx * dx + dy * dy + dz * dz < reach * reach) this.wreck(i);
    }
  }

  // Cubes per car: body, cabin, four wheels (pos3, scale3, yaw, tumble, rgba). Returns the new write offset.
  write(out, o, max) {
    const g = this.g, cam = g.cam, far = cam.wrap ? cam.cap2 : 1e12, hs = g.world.unit * 1.15, GLASS = [0.25, 0.4, 0.55], DARK = [0.15, 0.15, 0.17];
    for (const c of this.cars) {
      if (o + 84 > max) break;
      const fx = wrapDelta(c.x - cam.focusX, cam.wrap), fz = wrapDelta(c.z - cam.focusZ, cam.wrap);
      if (fx * fx + fz * fz > far) continue;
      const cs = Math.cos(c.yaw), sn = Math.sin(c.yaw), p = c.bus ? PAINT[2] : PAINT[c.k], L = c.bus ? 7 : 3.9;
      const cube = (fwd, up, side, sx, sy, sz, col) => {
        out[o++] = c.x + sn * fwd * hs + cs * side * hs; out[o++] = c.y + up * hs; out[o++] = c.z + cs * fwd * hs - sn * side * hs;
        out[o++] = sx * hs; out[o++] = sy * hs; out[o++] = sz * hs; out[o++] = c.yaw; out[o++] = 0;
        out[o++] = col[0]; out[o++] = col[1]; out[o++] = col[2]; out[o++] = 0;
      };
      if (c.bus) { cube(0, 1.2, 0, 2, 1.7, L, p); cube(0, 1.55, 0, 2.04, 0.6, L - 0.8, GLASS); }
      else { cube(0, 0.72, 0, 1.7, 0.75, L, p); cube(-0.2, 1.4, 0, 1.5, 0.65, L * 0.5, GLASS); }
      for (const s of [-0.85, 0.85]) for (const f of [-L * 0.32, L * 0.32]) cube(f, 0.3, s, 0.28, 0.6, 0.6, DARK);
    }
    return o;
  }
}
