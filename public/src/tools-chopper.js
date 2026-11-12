// The helicopter's own gear (part of class Tools, see tools.js): the gun in its nose, the circling flight,
// the rotor saw, the winch with hook and wrecking ball, and the whirlwinds of the tornado.

import { isTerrain } from './materials.js';
import { clamp, wrapDelta } from './math.js';
import { GRAVITY, launch } from './particles.js';

export class ToolsChopper {
  // Where the gun under the helicopter's nose ends.
  nose() {
    const m = this.g.monster, o = this.at(this.o, 0.09, 0.42), yaw = this.turretYaw(), len = m.h * 0.26, c = Math.cos(m.pose.aimPitch);
    o[0] += Math.sin(yaw) * len * c; o[1] -= Math.sin(m.pose.aimPitch) * len; o[2] += Math.cos(yaw) * len * c;
    return o;
  }

  // Circling: the circle runs round the aimed spot at the helicopter's distance (not too close, not too far).
  circle(act) {
    const g = this.g, m = g.monster, B = this.base(), size = g.world.wrap ? g.world.sx : 0, dx = wrapDelta(m.x - act.ax, size), dz = wrapDelta(m.z - act.az, size);
    act.r = clamp(Math.hypot(dx, dz), B.H * 1.2 + 8, B.H * 4 + 30); act.a0 = Math.atan2(dx, dz);
    this.driven = true;
  }

  orbit(act, b) {
    const g = this.g, w = g.world, m = g.monster, size = w.wrap ? w.sx : 0, a = act.a0 + act.side * Math.PI * 2 * b;
    const nx = act.ax + Math.sin(a) * act.r, nz = act.az + Math.cos(a) * act.r;
    const x = m.x + wrapDelta(nx - m.x, size) * 0.2, z = m.z + wrapDelta(nz - m.z, size) * 0.2;
    if (!w.get(Math.floor(x), Math.floor(m.y + m.h * 0.4), Math.floor(z))) { m.x = x; m.z = z; } // a wall in the way: it waits there
    m.vx = 0; m.vz = 0;
    m.heading = Math.atan2(wrapDelta(act.ax - m.x, size), wrapDelta(act.az - m.z, size));
  }

  // Rotor saw: the blades sweep to and fro across what is in front, at the height of the aim, and the helicopter creeps on into the cut.
  saw(act, b0, b1) {
    const g = this.g, w = g.world, m = g.monster, B = this.base(), o = this.opt, reach = B.H * 1.0 + 4, fx = Math.sin(m.heading), fz = Math.cos(m.heading);
    const y = clamp(act.ay, m.y - B.H * 0.2, m.y + B.H * 0.6), step = B.H * 0.9 * (b1 - b0);
    if (!w.get(Math.floor(m.x + fx * B.H * 0.5), Math.floor(m.y + B.H * 0.35), Math.floor(m.z + fz * B.H * 0.5))) { m.x += fx * step; m.z += fz * step; }
    o.dx = 0; o.dz = 0; o.impulse = launch(reach * 0.3 + 4); o.debris = 8; o.spare = false; o.blast = 0; o.quiet = true;
    let n = 0;
    for (let k = 1; k <= 4; k++) { // a broad cut: two blades a little apart in height
      const b = b0 + ((b1 - b0) * k) / 4, a = m.heading + Math.sin(b * Math.PI * 7) * 0.95, sx = Math.sin(a), sz = Math.cos(a), yy = y - (k % 2) * B.H * 0.12;
      g.lastHit.dx = sx; g.lastHit.dz = sz;
      n += g.destruction.capsule(m.x + sx * B.H * 0.25, yy, m.z + sz * B.H * 0.25, m.x + sx * reach, yy, m.z + sz * reach, 1 + B.H * 0.04, B.P * 1.6, o);
    }
    o.quiet = false;
    if (n) { g.fx.sparks(m.x + fx * reach * 0.8, y, m.z + fz * reach * 0.8, 16, 4, 1, 0.85, 0.4); g.audio.sword(); }
  }

  // The winch. The hook goes down to the aimed spot (or as far as the rope reaches) and takes hold of what is there;
  // the load then hangs on the rope and swings along. Dropped, it falls with the swing it has and lands like a bomb.
  lowerHook(act) {
    const g = this.g, m = g.monster, B = this.base(), size = g.world.wrap ? g.world.sx : 0, ay = m.y + m.h * 0.1;
    const dx = wrapDelta(act.ax - m.x, size), dy = act.ay - ay, dz = wrapDelta(act.az - m.z, size), d = Math.hypot(dx, dy, dz) || 1, k = Math.min(1, (B.H * 3 + 20) / d);
    act.hx = m.x + dx * k; act.hy = ay + dy * k; act.hz = m.z + dz * k;
    this.hook = act;
    g.audio.whoosh();
  }

  hookGrab(act) {
    const g = this.g, m = g.monster, B = this.base();
    this.hook = null;
    this.grab(act.hx, act.hy, act.hz, clamp(B.H * 0.3, 2.5, 15), act.hx, act.hz);
    const b = this.held;
    if (!b) return;
    this.rope = { x: b.pos[0], y: b.pos[1], z: b.pos[2], px: b.pos[0], py: b.pos[1], pz: b.pos[2], vx: 0, vy: 0, vz: 0, len: Math.max(m.h * 0.5, Math.hypot(b.pos[0] - m.x, b.pos[1] - m.y, b.pos[2] - m.z)), want: B.H * 0.8 + b.radius, r: Math.max(1, b.radius * 0.8), ball: false, hitT: 0 };
    g.audio.crack(0.5);
  }

  dropLoad() {
    const g = this.g, b = this.held, R = this.rope;
    this.held = null;
    if (b && !b.dead) {
      b.kinematic = false; b.thrown = true; b.age = 0; b.hard = true;
      if (R) { b.v[0] = R.vx; b.v[1] = R.vy; b.v[2] = R.vz; }
      b.w[0] = (g.rng() - 0.5) * 3; b.w[1] = (g.rng() - 0.5) * 3; b.w[2] = (g.rng() - 0.5) * 3;
    }
    if (R && !R.ball) this.rope = null;
    g.audio.whoosh();
  }

  lowerBall() {
    const m = this.g.monster, B = this.base(), y = m.y + m.h * 0.1;
    this.rope = { x: m.x, y, z: m.z, px: m.x, py: y, pz: m.z, vx: 0, vy: 0, vz: 0, len: m.h * 0.3, want: B.H * 1.25 + 2, r: B.H * 0.2 + 1, ball: true, hitT: 0 };
    this.g.audio.hit('metal', 0.6);
  }

  // Put away whatever hangs on the winch (when another move is chosen).
  stow() {
    if (this.held && this.g.progress.species === 'chopper') this.dropLoad();
    this.rope = null; this.hook = null;
  }

  // The rope's end swings like a pendulum under the helicopter (Verlet, with the rope as a limit, not a rod). What hangs
  // on it smashes into whatever it meets, the harder the faster it goes; what does not give way stops it.
  updateRope(dt) {
    const g = this.g, w = g.world, m = g.monster, R = this.rope, size = w.wrap ? w.sx : 0;
    if (!R) return;
    if (this.held?.dead) { this.held = null; if (!R.ball) { this.rope = null; return; } }
    const ax = m.x, ay = m.y + m.h * 0.1, az = m.z, damp = 1 - Math.min(1, dt * 0.5);
    const reel = (6 + m.h * 0.3) * dt; R.len += clamp(R.want - R.len, -reel, reel); // the winch reels slowly: hauling up is no blow
    const nx = R.x + (R.x - R.px) * damp, ny = R.y + (R.y - R.py) * damp - GRAVITY * 0.7 * dt * dt, nz = R.z + (R.z - R.pz) * damp;
    R.px = R.x; R.py = R.y; R.pz = R.z; R.x = nx; R.y = ny; R.z = nz;
    const dx = wrapDelta(R.x - ax, size), dy = R.y - ay, dz = wrapDelta(R.z - az, size), d = Math.hypot(dx, dy, dz) || 1;
    if (d > R.len) { R.x = ax + (dx / d) * R.len; R.y = ay + (dy / d) * R.len; R.z = az + (dz / d) * R.len; }
    if (size) { R.px = R.x - wrapDelta(R.x - R.px, size); R.pz = R.z - wrapDelta(R.z - R.pz, size); }
    R.vx = (R.x - R.px) / dt; R.vy = (R.y - R.py) / dt; R.vz = (R.z - R.pz) / dt;
    R.hitT -= dt;
    // Only a swing does damage: hanging still against a wall (or dragged slowly along it) it just scrapes.
    const r = R.r, solid = (x, y, z) => w.get(Math.floor(x), Math.floor(y), Math.floor(z)), B0 = this.base(), fast = Math.hypot(R.vx, R.vy, R.vz) > 8 + B0.H * 0.15;
    if (R.hitT <= 0 && fast && (solid(R.x, R.y, R.z) || solid(R.x + r * 0.8, R.y, R.z) || solid(R.x - r * 0.8, R.y, R.z) || solid(R.x, R.y - r * 0.8, R.z) || solid(R.x, R.y, R.z + r * 0.8) || solid(R.x, R.y, R.z - r * 0.8))) {
      R.hitT = 0.2;
      const B = this.base(), sp = Math.hypot(R.vx, R.vy, R.vz), k = clamp((sp - 8 - B.H * 0.15) / (14 + B.H * 0.6) + 0.3, 0.3, 2), inv = 1 / (sp || 1), o = this.opt;
      o.dx = R.vx * inv; o.dz = R.vz * inv; o.impulse = launch(sp * 0.5 + 6); o.debris = 50; o.spare = true; o.blast = 0; // buildings, not the ground
      g.lastHit.dx = o.dx; g.lastHit.dz = o.dz; g.lastHit.pop = 0;
      const n = g.destruction.sphere(R.x + o.dx * r * 0.5, R.y, R.z + o.dz * r * 0.5, r * 1.25, B.P * k * (R.ball ? 1.3 : 0.7), o);
      o.spare = false;
      g.actors.hitAir(R.x, R.y, R.z, r + 2);
      if (n) { g.impactFx(R.x, R.y, R.z, r * 1.4, 0.3 + k * 0.25, k > 1.2); g.audio.hit('metal', Math.min(1, 0.3 + k * 0.3)); }
      const keep = n ? 0.6 : -0.3; // through what gave way, a bounce off what did not
      R.px = R.x - (R.x - R.px) * keep; R.py = R.y - (R.y - R.py) * keep; R.pz = R.z - (R.z - R.pz) * keep;
    }
    if (solid(R.x, R.y, R.z)) { R.px = R.x; R.pz = R.z; R.y += 1.5; R.py = R.y; } // stuck in something: it comes to rest on top
    if (this.held && !this.held.dead) { this.held.pos[0] = R.x; this.held.pos[1] = R.y; this.held.pos[2] = R.z; }
  }

  // Whirlwinds. x/z: where it forms, tx/tz: where it goes (the tornado follows the aim point), r: width, h: height,
  // rr and p: the blows it deals as it turns. Loose cubes, cars and people are carried up in a spiral.
  vortex(x, z, tx, tz, life, r, h, rr, p, big) {
    this.vortices.push({ x, z, tx, tz, t: 0, life, r, h, rr, p, big, tick: 0 });
    this.g.audio.whoosh();
  }

  updateVortices(dt) {
    const g = this.g, w = g.world, size = w.wrap ? w.sx : 0, o = this.opt, rnd = g.rng;
    for (let i = this.vortices.length - 1; i >= 0; i--) {
      const v = this.vortices[i];
      v.t += dt;
      const grow = Math.max(0.05, Math.min(1, v.t / 0.6, (v.life - v.t) / 0.5));
      if (v.big) { v.tx = g.aim.x; v.tz = g.aim.z; }
      const dx = wrapDelta(v.tx - v.x, size), dz = wrapDelta(v.tz - v.z, size), d = Math.hypot(dx, dz), sp = (v.big ? 14 + v.r * 0.6 : v.r * 3 + 20) * dt;
      if (d > 1) { v.x += (dx / d) * Math.min(d, sp); v.z += (dz / d) * Math.min(d, sp); }
      if (w.wrap) { v.x = ((v.x % w.sx) + w.sx) % w.sx; v.z = ((v.z % w.sz) + w.sz) % w.sz; }
      if (v.gy === undefined || rnd() < 0.1) v.gy = this.terrainBelow(v.x, v.z);
      // The funnel: dust spiralling up, wider at the top.
      for (let k = 0; k < (v.big ? 26 : 10) * g.fx.thin + 2; k++) {
        const hh = rnd() * v.h, rad = v.r * (0.2 + 0.8 * hh / v.h) * grow, a = rnd() * 6.283, sh = 0.5 + rnd() * 0.25;
        g.fx.add(v.x + Math.cos(a) * rad, v.gy + hh, v.z + Math.sin(a) * rad, -Math.sin(a) * rad * 5, v.h * 0.3, Math.cos(a) * rad * 5, 1.5 + v.r * 0.14, v.r * 0.06, 1, sh, sh * 0.97, sh * 0.92, 0.8, 0, 0, 1);
      }
      if ((v.tick -= dt) <= 0) {
        v.tick = 0.1;
        const n = v.big ? 4 : 3;
        o.impulse = launch(v.h * 0.5 + 10); o.debris = 30; o.spare = false; o.blast = 0; o.quiet = true; o.dy = 0.9;
        for (let k = 0; k < n; k++) {
          const ang = v.t * 7 + k * 2.1, rk = v.r * (0.35 + (0.65 * k) / n) * grow, px = v.x + Math.cos(ang) * rk, pz = v.z + Math.sin(ang) * rk, py = v.gy + v.h * ((k + 0.5) / n) * 0.9;
          o.dx = -Math.sin(ang); o.dz = Math.cos(ang); g.lastHit.dx = o.dx; g.lastHit.dz = o.dz; g.lastHit.pop = launch(v.h * 0.3);
          g.destruction.sphere(px, py, pz, v.rr * grow, v.p, o);
        }
        o.dy = 0.15; o.quiet = false;
        g.debris.swirl(v.x, v.z, v.r * 1.6, 6 + v.r * 0.6, 12 + v.h * 0.12); // loose cubes are drawn in and carried up
        if (rnd() < 0.3) g.audio.crumble(0.2);
      }
      if (v.t >= v.life) {
        if (v.big) { // the end: everything it carried is thrown out in a ring
          const B = this.base();
          this.shock(v.x, v.gy, v.z, v.r * 1.4, B.R * 0.8, B.P * 0.8, 12);
          g.debris.blast(v.x, v.gy, v.z, v.r * 3, launch(B.H * 2));
        }
        this.vortices.splice(i, 1);
      }
    }
  }

  // Top of the ground (not of what is built on it) at (x, z).
  terrainBelow(x, z) {
    const w = this.g.world, ix = Math.floor(x), iz = Math.floor(z);
    for (let y = w.sy - 1; y >= 0; y--) { const t = w.get(ix, y, iz); if (t && isTerrain(t)) return y + 1; }
    return 0;
  }
}
