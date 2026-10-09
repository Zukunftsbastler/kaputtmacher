// Loose rubble cubes (simulated against the voxel grid) and purely visual effect particles.
// Both live in fixed pools so that play never allocates.

import { RUBBLE, TYPE_RGBA } from './materials.js';
import { wrapDelta } from './math.js';

export const GRAVITY = 85; // voxels per second squared; deliberately heavy so that rubble and wreckage slam down

// Launch speed needed to throw something `height` voxels up.
export const launch = (height) => Math.sqrt(2 * GRAVITY * height);

export class Debris {
  constructor(game, max) {
    this.g = game;
    this.max = max;
    this.limit = max; // lowered by the quality governor
    this.n = 0;
    this.px = new Float32Array(max); this.py = new Float32Array(max); this.pz = new Float32Array(max);
    this.vx = new Float32Array(max); this.vy = new Float32Array(max); this.vz = new Float32Array(max);
    this.ang = new Float32Array(max); this.spin = new Float32Array(max);
    this.life = new Float32Array(max);
    this.type = new Uint8Array(max);
  }

  clear() { this.n = 0; }

  spawn(x, y, z, vx, vy, vz, type) {
    let i;
    if (this.n < this.limit) i = this.n++;
    else i = (this.g.rng() * this.n) | 0; // pool full: replace a random old cube
    this.px[i] = x; this.py[i] = y; this.pz[i] = z;
    this.vx[i] = vx; this.vy[i] = vy; this.vz[i] = vz;
    this.ang[i] = this.g.rng() * 6.28;
    this.spin[i] = (this.g.rng() - 0.5) * 14;
    this.life[i] = 4 + this.g.rng() * 3.5;
    this.type[i] = type;
  }

  kill(i) {
    const l = --this.n;
    if (i === l) return;
    this.px[i] = this.px[l]; this.py[i] = this.py[l]; this.pz[i] = this.pz[l];
    this.vx[i] = this.vx[l]; this.vy[i] = this.vy[l]; this.vz[i] = this.vz[l];
    this.ang[i] = this.ang[l]; this.spin[i] = this.spin[l];
    this.life[i] = this.life[l]; this.type[i] = this.type[l];
  }

  // A cube that has come to rest becomes part of the static grid again, as rubble.
  settle(i) {
    const w = this.g.world;
    const x = Math.floor(this.px[i]), y = Math.floor(this.py[i]), z = Math.floor(this.pz[i]);
    if (y >= 0 && !w.get(x, y, z) && w.get(x, y - 1, z)) { w.set(x, y, z, this.type[i] | RUBBLE); this.g.sweeper.add(x, y, z); }
    this.kill(i);
  }

  update(dt) {
    const w = this.g.world;
    const { px, py, pz, vx, vy, vz } = this;
    for (let i = this.n - 1; i >= 0; i--) {
      vy[i] -= GRAVITY * dt;
      let nx = px[i] + vx[i] * dt, ny = py[i] + vy[i] * dt, nz = pz[i] + vz[i] * dt;
      let grounded = false;
      if (ny < -4) { this.kill(i); continue; }
      if (w.get(Math.floor(nx), Math.floor(ny), Math.floor(nz))) {
        const cx = Math.floor(px[i]), cy = Math.floor(py[i]), cz = Math.floor(pz[i]);
        if (w.get(cx, Math.floor(ny), cz)) {
          grounded = vy[i] < 0;
          vy[i] *= -0.3; vx[i] *= 0.7; vz[i] *= 0.7; ny = py[i];
          this.spin[i] *= 0.6;
        }
        if (w.get(Math.floor(nx), Math.floor(ny), cz)) { vx[i] *= -0.4; nx = px[i]; }
        if (w.get(Math.floor(nx), Math.floor(ny), Math.floor(nz))) { vz[i] *= -0.4; nz = pz[i]; }
      }
      px[i] = nx; py[i] = ny; pz[i] = nz;
      this.ang[i] += this.spin[i] * dt;
      this.life[i] -= dt;
      if (this.life[i] <= 0 || (grounded && vx[i] * vx[i] + vy[i] * vy[i] + vz[i] * vz[i] < 6)) this.settle(i);
    }
  }

  // Pushes loose cubes away from an explosion.
  blast(cx, cy, cz, radius, strength) {
    const size = this.g.world.wrap ? this.g.world.sx : 0, r2 = radius * radius;
    for (let i = 0; i < this.n; i++) {
      const dx = wrapDelta(this.px[i] - cx, size), dy = this.py[i] - cy, dz = wrapDelta(this.pz[i] - cz, size);
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 > r2 || d2 < 0.01) continue;
      const d = Math.sqrt(d2), k = (strength * (1 - d / radius)) / d;
      this.vx[i] += dx * k; this.vy[i] += dy * k + strength * 0.3; this.vz[i] += dz * k;
    }
  }

  // Writes instances (pos3, scale3, yaw, tumble, rgba) and returns the new write offset.
  write(out, o) {
    for (let i = 0; i < this.n; i++) {
      const t = this.type[i] * 4;
      out[o++] = this.px[i]; out[o++] = this.py[i]; out[o++] = this.pz[i];
      out[o++] = 0.9; out[o++] = 0.9; out[o++] = 0.9;
      out[o++] = this.ang[i]; out[o++] = this.ang[i] * 0.7;
      out[o++] = TYPE_RGBA[t] / 255; out[o++] = TYPE_RGBA[t + 1] / 255; out[o++] = TYPE_RGBA[t + 2] / 255;
      out[o++] = TYPE_RGBA[t + 3] / 255;
    }
    return o;
  }
}

// Visual particles: dust, sparks, flashes, smoke, power orbs. Stride: pos3 vel3 size grow life max r g b a add grav drag home.
const FS = 18;

export class Fx {
  constructor(game, max) {
    this.g = game;
    this.max = max;
    this.limit = max;
    this.thin = 1; // share of the ambient effects (dust, smoke, spray) that is actually produced; set by the detail level
    this.arrived = 0; // power orbs that have reached the creature since this was last read
    this.n = 0;
    this.d = new Float32Array(max * FS);
  }

  clear() { this.n = 0; }

  add(x, y, z, vx, vy, vz, size, grow, life, r, g, b, a, additive = 0, gravity = 0, drag = 0, home = 0) {
    if (this.n >= this.limit) return;
    const d = this.d, o = this.n++ * FS;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = vx; d[o + 4] = vy; d[o + 5] = vz;
    d[o + 6] = size; d[o + 7] = grow; d[o + 8] = life; d[o + 9] = life;
    d[o + 10] = r; d[o + 11] = g; d[o + 12] = b; d[o + 13] = a;
    d[o + 14] = additive; d[o + 15] = gravity; d[o + 16] = drag; d[o + 17] = home;
  }

  dust(x, y, z, radius, r, g, b, count) {
    const rnd = this.g.rng;
    count = Math.ceil(count * this.thin);
    for (let i = 0; i < count; i++) {
      const a = rnd() * 6.28, s = radius * (0.5 + rnd());
      this.add(x + Math.cos(a) * radius * rnd(), y + (rnd() - 0.3) * radius, z + Math.sin(a) * radius * rnd(),
        Math.cos(a) * s, 1 + rnd() * radius * 0.6, Math.sin(a) * s,
        radius * (0.6 + rnd() * 0.6), radius * 1.2, 0.8 + rnd() * 0.9, r, g, b, 0.5, 0, -1, 1.8);
    }
  }

  sparks(x, y, z, speed, count, r = 1, g = 0.8, b = 0.3) {
    const rnd = this.g.rng;
    for (let i = 0; i < count; i++) {
      const a = rnd() * 6.28, e = rnd() * 2 - 0.6, s = speed * (0.4 + rnd());
      this.add(x, y, z, Math.cos(a) * s, e * s, Math.sin(a) * s, 0.5 + rnd() * 0.5, -0.4, 0.35 + rnd() * 0.5, r, g, b, 1, 1, GRAVITY * 0.6, 0.5);
    }
  }

  explosion(x, y, z, radius) {
    const rnd = this.g.rng;
    this.add(x, y, z, 0, 0, 0, radius * 1.6, radius * 8, 0.22, 1, 0.95, 0.7, 1, 1);
    for (let i = 0; i < 14; i++) {
      const a = rnd() * 6.28, e = rnd() * 1.6 - 0.3, s = radius * (0.8 + rnd() * 1.6);
      this.add(x, y, z, Math.cos(a) * s, e * s, Math.sin(a) * s, radius * 0.5, radius * 0.9, 0.35 + rnd() * 0.35, 1, 0.55 + rnd() * 0.3, 0.15, 0.9, 1, 0, 2.5);
    }
    for (let i = 0; i < 12; i++) {
      const a = rnd() * 6.28, s = radius * (0.3 + rnd());
      this.add(x, y + radius * 0.3, z, Math.cos(a) * s, radius * (0.4 + rnd()), Math.sin(a) * s, radius * 0.7, radius * 0.8, 1.4 + rnd() * 1.4, 0.2, 0.2, 0.2, 0.55, 0, -2, 1.2);
    }
    this.sparks(x, y, z, radius * 4, 16);
  }

  // Power made visible: a glowing ball bursts out of what was destroyed, hangs for a moment and then
  // flies into the creature. size: scales with the creature, so the balls stay visible next to a giant.
  // burst: how hard it is thrown out (a finished building throws its power far).
  orb(x, y, z, size, burst = 1) {
    const rnd = this.g.rng, a = rnd() * 6.283, s = (8 + rnd() * 14) * burst * (0.5 + size * 0.5);
    const vx = Math.cos(a) * s, vy = (12 + rnd() * 18) * burst * (0.5 + size * 0.5), vz = Math.sin(a) * s, life = 2.2 + rnd() * 0.5;
    this.add(x, y, z, vx, vy, vz, 1.5 * size, 0, life, 1, 0.92, 0.45, 1, 1, 0, 0, 1); // bright core: counts when it arrives
    this.add(x, y, z, vx, vy, vz, 4 * size, 0, life, 1, 0.7, 0.15, 0.35, 1, 0, 0, 2); // soft halo around it
  }

  firework(x, y, z, size) {
    const rnd = this.g.rng, r = 0.4 + rnd() * 0.6, g = 0.4 + rnd() * 0.6, b = 0.4 + rnd() * 0.6;
    for (let i = 0; i < 46; i++) {
      const a = rnd() * 6.28, e = Math.acos(rnd() * 2 - 1), s = size * (0.7 + rnd() * 0.5);
      this.add(x, y, z, Math.cos(a) * Math.sin(e) * s, Math.cos(e) * s, Math.sin(a) * Math.sin(e) * s,
        size * 0.045, 0, 1.2 + rnd() * 0.8, r, g, b, 1, 0.7, GRAVITY * 0.25, 1.2);
    }
  }

  // hx, hy, hz: where homing particles fly to. hr: how close counts as arrived.
  update(dt, hx, hy, hz, hr = 3) {
    const d = this.d, size = this.g.world.wrap ? this.g.world.sx : 0;
    for (let i = this.n - 1; i >= 0; i--) {
      const o = i * FS;
      d[o + 8] -= dt;
      let dead = d[o + 8] <= 0;
      if (d[o + 17] && !dead) {
        // Homing: after a short moment of flying free, steer towards the target, faster the older the orb is.
        const age = Math.max(0, d[o + 9] - d[o + 8] - 0.35);
        const dx = wrapDelta(hx - d[o], size), dy = hy - d[o + 1], dz = wrapDelta(hz - d[o + 2], size);
        const dist = Math.hypot(dx, dy, dz);
        if (dist < hr) { dead = true; if (d[o + 17] === 1) this.arrived++; }
        else {
          const k = Math.min(1, age * 2.5), sp = 30 + age * 300 + dist * age;
          d[o + 3] += ((dx / dist) * sp - d[o + 3]) * k; d[o + 4] += ((dy / dist) * sp - d[o + 4]) * k; d[o + 5] += ((dz / dist) * sp - d[o + 5]) * k;
        }
      }
      if (dead) {
        const l = --this.n;
        if (i !== l) d.copyWithin(o, l * FS, l * FS + FS);
        continue;
      }
      const drag = Math.max(0, 1 - d[o + 16] * dt);
      d[o + 3] *= drag; d[o + 5] *= drag;
      d[o + 4] = d[o + 4] * drag - d[o + 15] * dt;
      d[o] += d[o + 3] * dt; d[o + 1] += d[o + 4] * dt; d[o + 2] += d[o + 5] * dt;
      d[o + 6] = Math.max(0.05, d[o + 6] + d[o + 7] * dt);
    }
  }

  // Writes billboards (pos3, size, r, g, b, alpha, additive) and returns the count.
  write(out) {
    const d = this.d;
    let o = 0;
    for (let i = 0; i < this.n; i++) {
      const s = i * FS, f = d[s + 8] / d[s + 9];
      out[o++] = d[s]; out[o++] = d[s + 1]; out[o++] = d[s + 2]; out[o++] = d[s + 6];
      out[o++] = d[s + 10]; out[o++] = d[s + 11]; out[o++] = d[s + 12];
      out[o++] = d[s + 13] * (d[s + 17] ? 1 : Math.min(1, f * 1.6));
      out[o++] = d[s + 14];
    }
    return this.n;
  }
}
