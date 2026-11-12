// What flies or shines from the creature (part of class Tools, see tools.js): beams that run straight in the picture,
// fire, rockets, shells, bombs, mines and strikes from the sky.

import { clamp, wrapDelta } from './math.js';
import { GRAVITY, launch } from './particles.js';

export class ToolsRanged {
  // The planet is drawn bent, so a line that is straight in the world looks curved on screen like a jet of
  // water. Beams therefore run straight in the picture instead: the march goes through "picture space"
  // (positions as drawn), and every sample is converted back to the world for the voxel test.
  // toPicture/toWorld do the two conversions; on flat islands they change nothing.
  toPicture(out, x, y, z) {
    const c = this.g.cam, rx = wrapDelta(x - c.focusX, c.wrap), rz = wrapDelta(z - c.focusZ, c.wrap);
    out[0] = rx; out[1] = y - (rx * rx + rz * rz) * c.curv; out[2] = rz;
    return out;
  }

  toWorld(out, vx, vy, vz) {
    const c = this.g.cam;
    out[0] = c.focusX + vx; out[1] = vy + (vx * vx + vz * vz) * c.curv; out[2] = c.focusZ + vz;
    return out;
  }

  // Marches from o towards the target along a line that is straight on screen. Afterwards `hit` holds the
  // world position of the first solid thing (helicopters included) or of the end of the range, hitSolid
  // tells which, and rdx/rdy/rdz is the beam's direction in the world at that point.
  trace(o, tx, ty, tz, max) {
    const g = this.g, a = this.toPicture(this.pa, o[0], o[1], o[2]), b = this.toPicture(this.pb, tx, ty, tz), p = this.hit;
    let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    this.pdx = dx; this.pdy = dy; this.pdz = dz;
    this.hitSolid = false;
    let t = 2;
    for (let i = 0; t < max; t += 0.7, i++) {
      this.toWorld(p, a[0] + dx * t, a[1] + dy * t, a[2] + dz * t);
      if (p[1] < 0 || p[1] > g.world.sy + 60) break;
      if (g.world.get(Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2])) || g.bodies.solidAt(p[0], p[1], p[2])) { this.hitSolid = true; break; }
      if (i % 6 === 0 && g.actors.hitAir(p[0], p[1], p[2], 4)) { this.hitSolid = true; break; }
    }
    this.hitT = t;
    this.toWorld(p, a[0] + dx * t, a[1] + dy * t, a[2] + dz * t);
    const q = this.toWorld(this.deep, a[0] + dx * (t + 1), a[1] + dy * (t + 1), a[2] + dz * (t + 1));
    const l = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) || 1;
    this.rdx = (q[0] - p[0]) / l; this.rdy = (q[1] - p[1]) / l; this.rdz = (q[2] - p[2]) / l;
    return t;
  }

  // World position `depth` further along the last traced beam: how deep it burns in.
  beyond(depth) {
    const a = this.pa, t = this.hitT + depth;
    return this.toWorld(this.deep, a[0] + this.pdx * t, a[1] + this.pdy * t, a[2] + this.pdz * t);
  }

  // A short laser pulse: a flash of light and a small, deep hole.
  bolt(o, aim, radius, depth, r, gr, b) {
    const g = this.g, opt = this.opt;
    this.trace(o, aim.x, aim.y, aim.z, 520);
    const bx = this.hit[0], by = this.hit[1], bz = this.hit[2];
    this.rays.push({ ax: o[0], ay: o[1], az: o[2], bx, by, bz, w: radius * 0.9, r, g: gr, b, life: 0.07 });
    if (!this.hitSolid) return;
    opt.dx = this.rdx; opt.dz = this.rdz; opt.impulse = launch(8); opt.debris = 8; opt.spare = false; opt.blast = 0;
    g.lastHit.dx = this.rdx; g.lastHit.dz = this.rdz;
    const e = this.beyond(depth);
    g.destruction.capsule(bx, by, bz, e[0], e[1], e[2], radius, 60, opt);
    g.fx.sparks(bx, by, bz, 16, 4, r, gr, b);
    if (g.rng() < 0.4) g.fire.heatSphere(bx + this.rdx * 2, by + this.rdy * 2, bz + this.rdz * 2, radius + 2.5, 2, 5);
  }

  // A continuous beam for one simulation step: burns deeper every step, sets fire, leaves glowing spots.
  ray(o, aim, radius, depth, r, gr, b, burn, dt) {
    const g = this.g, opt = this.opt;
    this.trace(o, aim.x, aim.y, aim.z, 560);
    const bx = this.hit[0], by = this.hit[1], bz = this.hit[2];
    this.rays.push({ ax: o[0], ay: o[1], az: o[2], bx, by, bz, w: radius, r, g: gr, b, life: dt * 1.6 });
    g.audio.laser();
    if (!this.hitSolid) return;
    opt.dx = this.rdx; opt.dz = this.rdz; opt.impulse = launch(10 + radius * 3); opt.debris = 6; opt.spare = false; opt.blast = 0; opt.quiet = true;
    g.lastHit.dx = this.rdx; g.lastHit.dz = this.rdz;
    const e = this.beyond(depth);
    g.destruction.capsule(bx, by, bz, e[0], e[1], e[2], radius, 70, opt);
    opt.quiet = false;
    if (g.rng() < 0.6) g.fx.sparks(bx, by, bz, 18, 3, r, gr, b);
    if (burn && g.rng() < 0.35) g.fire.heatSphere(bx + this.rdx * 2, by + this.rdy * 2, bz + this.rdz * 2, radius + 3, 3.5, 6);
    if (burn && g.rng() < 0.05) g.fire.spot(bx, by, bz, radius + 0.5, 2 + g.rng() * 3);
  }

  // A stream of fire: sets alight what can burn and chars the rest a little.
  flame(ox, oy, oz, range, spread, rays, power) {
    const g = this.g, aim = g.aim, r = g.rng;
    let dx = aim.x - ox, dy = aim.y - oy, dz = aim.z - oz;
    const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    for (let k = 0; k < rays; k++) {
      const rx = dx + (r() - 0.5) * spread, ry = dy + (r() - 0.5) * spread, rz = dz + (r() - 0.5) * spread;
      for (let t = 2; t < range; t += 1.5) {
        const x = ox + rx * t, y = oy + ry * t, z = oz + rz * t;
        if (r() < 0.25) g.fire.flame(x, y, z, 1 + t * 0.06);
        if (!g.world.get(Math.floor(x), Math.floor(y), Math.floor(z))) continue;
        g.fire.heatSphere(x, y, z, 3.5, 3.2, 8); // lights what can burn at once; stone and metal turn black if the flame stays on them
        if (r() < 0.25) g.destruction.sphere(x, y, z, 2 + power * 0.3, power, { quiet: true, debris: 3 });
        if (r() < 0.03) g.fire.spot(x, y, z, 1.5, 3 + r() * 3);
        break;
      }
    }
  }

  rocket(o, aim, radius, power, speed, arc = false, size = 1) {
    let dx = aim.x - o[0], dy = aim.y - o[1], dz = aim.z - o[2];
    const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    if (arc) dy += 0.35; // salvo rockets climb first, then come down on the target
    this.proj.push({ kind: 'rocket', x: o[0], y: o[1], z: o[2], vx: dx * speed, vy: dy * speed, vz: dz * speed, r: (0.8 + this.g.monster.stage * 0.15) * size, radius, power, life: 7, grav: 0, lock: this.g.aim.lock ?? null, tx: aim.x, ty: aim.y, tz: aim.z, homing: arc });
    this.g.audio.rocket();
  }

  // A shell from a barrel. blast > 0: explodes once it has punched through `pierce` obstacles.
  shell(o, aim, r, power, pierce, blast, speed, spread) {
    const rnd = this.g.rng;
    let dx = aim.x - o[0], dy = aim.y - o[1], dz = aim.z - o[2];
    const d = Math.hypot(dx, dy, dz) || 1;
    dx = dx / d + (rnd() - 0.5) * spread; dy = dy / d + (rnd() - 0.5) * spread + d * 0.0004; dz = dz / d + (rnd() - 0.5) * spread;
    this.proj.push({ kind: 'ball', x: o[0], y: o[1], z: o[2], vx: dx * speed, vy: dy * speed, vz: dz * speed, r, power, pierce, blast, life: 5, grav: 22 });
  }

  // A bomb from the aircraft: it keeps the aircraft's forward speed and falls. scatter spreads a stick sideways;
  // fire = fire bomb; size scales the bomb itself.
  bomb(radius, power, scatter, fire = false, size = 1) {
    const g = this.g, m = g.monster, r = g.rng, fx = Math.sin(m.heading), fz = Math.cos(m.heading), v = m.speed * 0.85;
    this.proj.push({ kind: 'mortar', x: m.x, y: m.y - m.h * 0.25, z: m.z, vx: fx * v + fz * (r() - 0.5) * 30 * scatter, vy: -10, vz: fz * v - fx * (r() - 0.5) * 30 * scatter,
      r: (0.9 + m.stage * 0.15) * size, radius, power, life: 12, grav: GRAVITY, fire });
    g.audio.whoosh();
  }

  // A shell on a high arc that explodes where it comes down.
  lob(o, aim, radius, power) {
    const d = Math.hypot(aim.x - o[0], aim.z - o[2]), tf = clamp(d / 60, 0.9, 2.6);
    this.proj.push({ kind: 'mortar', x: o[0], y: o[1], z: o[2], vx: (aim.x - o[0]) / tf, vy: (aim.y - o[1]) / tf + 0.5 * GRAVITY * tf, vz: (aim.z - o[2]) / tf, r: 0.9 + this.g.monster.stage * 0.15, radius, power, life: 8, grav: GRAVITY });
  }

  mine(o, aim, radius, power, fuse) {
    const d = Math.hypot(aim.x - o[0], aim.z - o[2]), tf = clamp(d / 50, 0.4, 1.8);
    this.proj.push({ kind: 'dynamite', x: o[0], y: o[1], z: o[2], vx: (aim.x - o[0]) / tf, vy: (aim.y - o[1]) / tf + 0.5 * GRAVITY * tf, vz: (aim.z - o[2]) / tf, r: 0.8 + this.g.monster.stage * 0.12, radius, power, stuck: false, fuse, life: 9, grav: GRAVITY });
  }

  // Marks a spot; a moment later a column of light comes down on it from the sky.
  skyStrike(x, y, z, radius, blast, power) {
    this.marks.push({ x, y, z, radius, blast, power, t: 0.9 });
    this.g.audio.tick();
  }
}
