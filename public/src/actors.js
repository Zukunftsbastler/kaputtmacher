// Life in the world: little people who stroll around, run from the monster and tumble when
// something blows up next to them. They never come to harm. Helicopters arrive once the destruction
// is under way and circle the creature; they do not shoot, but they can be knocked out of the sky.
// Later "the world fights back" units can build on the same code.

import { wrapDelta } from './math.js';
import { GRAVITY } from './particles.js';

const SHIRTS = [[0.9, 0.25, 0.25], [0.2, 0.5, 0.9], [0.95, 0.8, 0.2], [0.3, 0.75, 0.4], [0.9, 0.5, 0.75], [0.95, 0.95, 0.95], [0.5, 0.3, 0.7]];
const SKINS = [[1, 0.82, 0.66], [0.85, 0.62, 0.45], [0.55, 0.38, 0.26]];

export class Actors {
  constructor(game) {
    this.g = game;
    this.list = [];
    this.screamT = 0;
    this.helis = [];
    this.heliT = 3; // seconds until the next helicopter may arrive
    this.heliOn = true;
  }

  // Scatters `count` people over free ground.
  populate(count) {
    const g = this.g, w = g.world, rnd = g.rng;
    this.list.length = 0;
    this.helis.length = 0; this.heliT = 3; this.heliOn = count > 0 || !g.world.people;
    for (let i = 0, tries = 0; i < count && tries < count * 8; tries++) {
      const x = rnd() * w.sx, z = rnd() * w.sz, y = w.heightBelow(x, z, w.sy - 1);
      if (y > 16 || w.structures[w.footprint[Math.floor(x) + w.sx * Math.floor(z)]].id) continue; // not on roofs
      this.list.push({ x, y, z, vx: 0, vy: 0, vz: 0, dir: rnd() * 6.28, state: 'walk', t: rnd() * 5, phase: rnd() * 6, spin: 0,
        shirt: SHIRTS[(rnd() * SHIRTS.length) | 0], skin: SKINS[(rnd() * SKINS.length) | 0] });
      i++;
    }
  }

  update(dt) {
    const g = this.g, w = g.world, m = g.monster, size = w.wrap ? w.sx : 0, u = w.unit;
    const fear = m.h * 3 + 14 * u, walk = 1.3 * u, run = 4.2 * u;
    let fleeing = 0;
    for (const a of this.list) {
      a.t -= dt;
      if (a.state === 'fly') {
        a.vy -= GRAVITY * dt;
        a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
        a.spin += dt * 9;
        const gy = w.heightBelow(a.x, a.z, a.y + 2);
        if (a.y <= gy && a.vy < 0) { a.y = gy; a.state = 'down'; a.t = 1 + g.rng(); }
        continue;
      }
      if (a.state === 'down') {
        if (a.t <= 0) { a.state = 'walk'; a.spin = 0; }
        continue;
      }
      const dx = wrapDelta(a.x - m.x, size), dz = wrapDelta(a.z - m.z, size), d = Math.hypot(dx, dz);
      const scared = !g.fly && d < fear;
      if (scared) { a.dir = Math.atan2(dx, dz) + Math.sin(a.phase + a.t) * 0.5; fleeing++; }
      else if (a.t <= 0) { a.dir += (g.rng() - 0.5) * 2.5; a.t = 2 + g.rng() * 4; }
      a.run = scared;
      const sp = scared ? run : walk, nx = a.x + Math.sin(a.dir) * sp * dt, nz = a.z + Math.cos(a.dir) * sp * dt;
      // Walls taller than a step turn the walker around.
      const gy = w.heightBelow(nx, nz, a.y + 1.2 * u);
      if (w.get(Math.floor(nx), Math.floor(a.y + 1.2 * u), Math.floor(nz)) || (!w.wrap && (nx < 2 || nz < 2 || nx > w.sx - 2 || nz > w.sz - 2))) {
        a.dir += 1.6 + g.rng();
        // Buried under rubble: climb out.
        if (w.get(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z))) a.y = w.heightBelow(a.x, a.z, w.sy - 1);
      } else {
        a.x = nx; a.z = nz;
        if (gy < a.y - 3 * u) { a.state = 'fly'; a.vx = 0; a.vz = 0; a.vy = 0; } else a.y = gy;
      }
      if (w.wrap) { a.x = ((a.x % w.sx) + w.sx) % w.sx; a.z = ((a.z % w.sz) + w.sz) % w.sz; }
      a.phase += dt * sp * 2.2 / u;
    }
    this.screamT -= dt;
    if (fleeing > 2 && this.screamT <= 0) { this.screamT = 1.2 + g.rng() * 2; g.audio.scream(); }
    this.updateHelis(dt);
  }

  // The more is being destroyed (g.heat, 0..1), the more helicopters circle: up to four.
  updateHelis(dt) {
    const g = this.g, w = g.world, m = g.monster, size = w.wrap ? w.sx : 0, rnd = g.rng;
    const want = this.heliOn && g.progress.settings.life && g.heat > 0.02 ? Math.min(4, 1 + Math.floor(g.heat * 4)) : 0;
    this.heliT -= dt;
    if (this.helis.length < want && this.heliT <= 0) {
      const a = rnd() * 6.283, d = 300;
      this.helis.push({ x: m.x + Math.cos(a) * d, y: m.y + m.h * 1.6 + 70, z: m.z + Math.sin(a) * d, vx: 0, vy: 0, vz: 0, ang: a, yaw: 0, rotor: 0, spin: 0, state: 'fly', slot: this.helis.length,
        body: rnd() < 0.5 ? [0.95, 0.95, 0.97] : [0.15, 0.25, 0.55], blink: rnd() * 6 });
      this.heliT = 3.5;
    }
    for (let i = this.helis.length - 1; i >= 0; i--) {
      const h = this.helis[i];
      h.rotor += dt * 34; h.blink += dt;
      if (h.state === 'fall') { // hit: spins down and blows up where it lands
        h.vy -= GRAVITY * 0.7 * dt; h.spin += dt * 11;
        h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt;
        if (rnd() < 0.6) g.fire.smoke(h.x, h.y, h.z, 2);
        if (h.y < 1 || w.get(Math.floor(h.x), Math.floor(h.y), Math.floor(h.z))) {
          g.explode(h.x, h.y + 1, h.z, 5 + w.unit * 1.5, 14);
          this.helis.splice(i, 1);
          this.heliT = 6;
        }
        continue;
      }
      // Circle at a respectful distance, a little above the creature's head. With nothing left to watch they leave.
      const leaving = i >= want, R = leaving ? 520 : m.h * 2.8 + 60 + h.slot * 16, alt = m.y + m.h * 1.35 + 34 + h.slot * 11;
      h.ang += (dt * 34) / R * (h.slot & 1 ? -1 : 1);
      const tx = m.x + Math.cos(h.ang) * R, tz = m.z + Math.sin(h.ang) * R;
      const dx = wrapDelta(tx - h.x, size), dy = alt - h.y, dz = wrapDelta(tz - h.z, size), k = Math.min(1, dt * 1.1);
      const lim = 70 * dt, mv = Math.hypot(dx, dz) * k, f = mv > lim ? lim / mv : 1;
      h.vx = (dx * k * f) / dt; h.vz = (dz * k * f) / dt;
      h.x += dx * k * f; h.y += dy * Math.min(1, dt * 0.9); h.z += dz * k * f;
      if (Math.hypot(h.vx, h.vz) > 2) { let d = Math.atan2(h.vx, h.vz) - h.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); h.yaw += d * Math.min(1, dt * 3); }
      if (w.wrap) { h.x = ((h.x % w.sx) + w.sx) % w.sx; h.z = ((h.z % w.sz) + w.sz) % w.sz; }
      if (leaving && Math.hypot(wrapDelta(h.x - m.x, size), wrapDelta(h.z - m.z, size)) > 420) this.helis.splice(i, 1);
    }
  }

  // Anything that hits near a helicopter brings it down. Returns true if one was hit.
  hitAir(x, y, z, r) {
    if (!this.helis.length) return false;
    const g = this.g, size = g.world.wrap ? g.world.sx : 0, reach = r + g.world.unit * 3;
    for (const h of this.helis) {
      if (h.state !== 'fly') continue;
      const dx = wrapDelta(h.x - x, size), dy = h.y - y, dz = wrapDelta(h.z - z, size);
      if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
      h.state = 'fall';
      h.vy = 6; h.vx += (g.rng() - 0.5) * 30; h.vz += (g.rng() - 0.5) * 30;
      g.fx.explosion(h.x, h.y, h.z, 3);
      g.audio.boom(0.35);
      return true;
    }
    return false;
  }

  // 0..1: how close the nearest helicopter is, for its sound.
  heliLevel() {
    const g = this.g, size = g.world.wrap ? g.world.sx : 0;
    let best = 0;
    for (const h of this.helis) best = Math.max(best, 1 - Math.hypot(wrapDelta(h.x - g.eye[0], size), h.y - g.eye[1], wrapDelta(h.z - g.eye[2], size)) / 260);
    return best;
  }

  // Searchlights: a faint chain of light from each helicopter down to the creature. Returns the new billboard count.
  writeLights(bb, n) {
    const g = this.g, m = g.monster, size = g.world.wrap ? g.world.sx : 0;
    for (const h of this.helis) {
      if (h.state !== 'fly') continue;
      const dx = wrapDelta(m.x - h.x, size), dy = m.y + m.h * 0.5 - h.y, dz = wrapDelta(m.z - h.z, size);
      for (let k = 1; k <= 9 && n < bb.length / 9 - 1; k++, n++) {
        const t = k / 10, q = n * 9;
        bb[q] = h.x + dx * t; bb[q + 1] = h.y + dy * t; bb[q + 2] = h.z + dz * t; bb[q + 3] = 1.5 + t * (m.h * 0.25 + 4);
        bb[q + 4] = 1; bb[q + 5] = 0.97; bb[q + 6] = 0.8; bb[q + 7] = 0.07; bb[q + 8] = 1;
      }
    }
    return n;
  }

  // Explosions send people flying; they land, lie around for a moment and get up again.
  blast(cx, cy, cz, radius, strength) {
    const size = this.g.world.wrap ? this.g.world.sx : 0;
    for (const a of this.list) {
      const dx = wrapDelta(a.x - cx, size), dy = a.y + 1 - cy, dz = wrapDelta(a.z - cz, size), d = Math.hypot(dx, dy, dz);
      if (d > radius) continue;
      const k = (strength * (1 - d / radius) + 4) / (d + 0.5);
      a.state = 'fly';
      a.vx = dx * k; a.vz = dz * k; a.vy = strength * 0.6 + 8;
    }
  }

  // Three to five cubes per person (pos3, scale3, yaw, tumble, rgba); returns the new write offset.
  write(out, o, max) {
    const g = this.g, c = g.cam, u = g.world.unit, s = u * 0.45, far = c.wrap ? c.cap2 : 1e12;
    for (const a of this.list) {
      if (o + 60 > max) break;
      const fx = wrapDelta(a.x - c.focusX, c.wrap), fz = wrapDelta(a.z - c.focusZ, c.wrap);
      if (fx * fx + fz * fz > far) continue; // beyond the horizon
      const down = a.state === 'down', tumble = a.state === 'fly' ? a.spin : down ? 1.57 : 0;
      const bob = a.state === 'walk' ? Math.abs(Math.sin(a.phase)) * 0.15 * u : 0, y = a.y + bob + (down ? s * 0.4 : 0);
      const cube = (ox, oy, oz, sx, sy, sz, c) => {
        // Offsets are rotated around the feet only for the lying/tumbling pose.
        const ct = Math.cos(tumble), sn = Math.sin(tumble), ry = oy * ct - oz * sn, rz = oy * sn + oz * ct;
        const cs = Math.cos(a.dir), ss = Math.sin(a.dir);
        out[o++] = a.x + ox * cs + rz * ss; out[o++] = y + ry; out[o++] = a.z - ox * ss + rz * cs;
        out[o++] = sx; out[o++] = sy; out[o++] = sz; out[o++] = a.dir; out[o++] = tumble;
        out[o++] = c[0]; out[o++] = c[1]; out[o++] = c[2]; out[o++] = 0;
      };
      cube(0, s * 0.8, 0, s * 0.9, s * 1.6, s * 0.6, [0.2, 0.22, 0.35]);
      cube(0, s * 2.3, 0, s * 1.1, s * 1.5, s * 0.7, a.shirt);
      cube(0, s * 3.5, 0, s * 0.8, s * 0.8, s * 0.8, a.skin);
      if (a.run || a.state === 'fly') { // arms up
        cube(-s * 0.8, s * 3.3, 0, s * 0.3, s * 1.4, s * 0.3, a.skin);
        cube(s * 0.8, s * 3.3, 0, s * 0.3, s * 1.4, s * 0.3, a.skin);
      }
    }
    // Helicopters: fuselage, cockpit, tail boom, fin, skids and two rotor blades.
    const hs = u * 1.5;
    for (const h of this.helis) {
      if (o + 110 > max) break;
      const cs = Math.cos(h.yaw + h.spin), sn = Math.sin(h.yaw + h.spin), yaw = h.yaw + h.spin, fall = h.state === 'fall';
      const cube = (fwd, up, side, sx, sy, sz, c, em = 0, rot = yaw) => {
        out[o++] = h.x + sn * fwd * hs + cs * side * hs; out[o++] = h.y + up * hs; out[o++] = h.z + cs * fwd * hs - sn * side * hs;
        out[o++] = sx * hs; out[o++] = sy * hs; out[o++] = sz * hs; out[o++] = rot; out[o++] = 0;
        out[o++] = c[0]; out[o++] = c[1]; out[o++] = c[2]; out[o++] = em;
      };
      cube(0, 0, 0, 1.5, 1.5, 3.2, h.body);
      cube(1.5, 0.1, 0, 1.3, 1.1, 1.2, [0.35, 0.7, 0.9]);
      cube(-3, 0.3, 0, 0.4, 0.4, 3.4, h.body);
      cube(-4.6, 0.9, 0, 0.3, 1.4, 0.8, [0.85, 0.2, 0.2]);
      cube(0, -1.1, 0.6, 0.2, 0.2, 2.6, [0.2, 0.2, 0.22]); cube(0, -1.1, -0.6, 0.2, 0.2, 2.6, [0.2, 0.2, 0.22]);
      cube(0, 1, 0, 0.3, 0.5, 0.3, [0.2, 0.2, 0.22]);
      cube(0, 1.3, 0, 0.35, 0.1, 7, [0.15, 0.15, 0.17], 0, h.rotor * (fall ? 0.4 : 1)); cube(0, 1.3, 0, 7, 0.1, 0.35, [0.15, 0.15, 0.17], 0, h.rotor * (fall ? 0.4 : 1));
      if (Math.floor(h.blink * 3) % 2) cube(-4.6, 1.8, 0, 0.3, 0.3, 0.3, [1, 0.2, 0.2], 1);
    }
    return o;
  }
}
