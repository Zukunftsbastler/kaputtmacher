// The tentacle's own moves (part of class Tools, see tools.js): reaching with the tip, whirling, squeezing and
// pulling over, ink, the ground wave and the five tentacles of the awakening.

import { clamp, wrapDelta } from './math.js';
import { GRAVITY, launch } from './particles.js';
import { eachShot } from './moves/kit.js';

export class ToolsTentacle {
  // The tentacle's tip, as drawn.
  tip() { return this.g.tipPos(this.o); }

  // Where a blow of the tentacle lands: the first solid thing on the way from high up its arm to the aimed spot, within reach.
  tipHit(act, reachMul) {
    const g = this.g, m = g.monster, B = this.base(), q = this.hp, size = g.world.wrap ? g.world.sx : 0, cy = m.y + B.H * 0.7, reach = B.H * reachMul + 2;
    let dx = wrapDelta(act.ax - m.x, size), dy = clamp(act.ay, m.y + 1, m.y + B.H * 2.3) - cy, dz = wrapDelta(act.az - m.z, size);
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;
    let t = B.H * 0.3;
    for (; t < reach; t += 0.5) {
      const x = m.x + dx * t, y = cy + dy * t, z = m.z + dz * t;
      if (g.world.get(Math.floor(x), Math.floor(y), Math.floor(z)) || g.bodies.solidAt(x, y, z)) break;
    }
    t = Math.min(t + 1, reach, dl);
    q[0] = m.x + dx * t; q[1] = cy + dy * t; q[2] = m.z + dz * t;
    const hl = Math.hypot(dx, dz) || 1;
    this.dx = dx / hl; this.dz = dz / hl;
    return q;
  }

  // Whirl: the arm comes round at full stretch, everything along it is hit, and it rises as it turns.
  whirl(act, v, b0, b1) {
    const g = this.g, m = g.monster, B = this.base(), o = this.opt;
    o.impulse = launch(B.H * 3 + 10); o.debris = 100; o.spare = true; o.blast = 0;
    let n = 0, hx = 0, hy = 0, hz = 0;
    for (let k = 1; k <= 4; k++) {
      const b = b0 + ((b1 - b0) * k) / 4, ang = act.heading + v.turn(1, b) * act.side, sx = Math.sin(ang), sz = Math.cos(ang), y = m.y + B.H * (0.25 + 0.8 * b);
      o.dx = sz * act.side; o.dz = -sx * act.side; // debris flies along the sweep
      g.lastHit.dx = o.dx; g.lastHit.dz = o.dz; g.lastHit.pop = launch(B.H * 0.4);
      for (const r of [0.55, 0.95, 1.35, 1.75]) {
        const x = m.x + sx * B.H * r, z = m.z + sz * B.H * r, c = g.destruction.sphere(x, y, z, B.R * 0.8, B.P * 1.4, o);
        g.actors.hitAir(x, y, z, B.R + 2);
        if (c) { n += c; hx = x; hy = y; hz = z; }
      }
    }
    o.spare = false;
    if (n && g.time - (act.fxT ?? -1) > 0.09) { act.fxT = g.time; g.impactFx(hx, hy, hz, B.R * 1.2, 0.6 + B.S * 0.07, true); }
  }

  // Squeeze: a ring cut round the gripped spot, tightening with every squeeze (k: ring size).
  squeeze(act, k) {
    const g = this.g, B = this.base(), o = this.opt, rr = (B.H * 0.2 + 2) * k, t = 0.7 + B.H * 0.04;
    o.impulse = launch(B.H * 0.6 + 4); o.debris = 20; o.spare = false; o.blast = 0; o.quiet = true;
    let n = 0;
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * 6.283, a1 = ((i + 1) / 10) * 6.283;
      o.dx = Math.cos(a0); o.dz = Math.sin(a0); g.lastHit.dx = -o.dx; g.lastHit.dz = -o.dz;
      n += g.destruction.capsule(act.wx + Math.cos(a0) * rr, act.wy, act.wz + Math.sin(a0) * rr, act.wx + Math.cos(a1) * rr, act.wy, act.wz + Math.sin(a1) * rr, t, B.P * 1.15, o);
    }
    o.quiet = false;
    if (n) { g.fx.dust(act.wx, act.wy, act.wz, rr, 0.78, 0.74, 0.68, 4); g.audio.crumble(0.3); g.shake(0.15); }
  }

  // Pull over: a grip high up on the building and a mighty tug towards the tentacle (the same reckoning as a shove,
  // only far stronger): whatever is not very solid goes over.
  pullOver(act) {
    const g = this.g, w = g.world, m = g.monster, B = this.base(), size = w.wrap ? w.sx : 0, st = w.structureAt(act.ax, act.az), q = this.tipHit(act, 2.3);
    let gx = q[0], gz = q[2], gy = q[1];
    if (st && st.major) { // as high up as it reaches: along a level line from the root towards the aim, the first thing solid
      const hy = Math.min(st.top - 2, m.y + B.H * 2.2), ax = wrapDelta(act.ax - m.x, size), az = wrapDelta(act.az - m.z, size), al = Math.hypot(ax, az) || 1;
      for (let t = B.H * 0.3; t < B.H * 2.6 + 4; t += 0.7) {
        const x = m.x + (ax / al) * t, z = m.z + (az / al) * t;
        if (g.world.get(Math.floor(x), Math.floor(hy), Math.floor(z))) { gx = x; gy = hy; gz = z; break; }
      }
    }
    const dx = wrapDelta(m.x - gx, size), dz = wrapDelta(m.z - gz, size), d = Math.hypot(dx, dz) || 1;
    this.blow(gx, gy, gz, B.R * 0.9, B.P * 1.2, true, dx / d, dz / d);
    g.onShove(m, gx - (dx / d) * 2, gz - (dz / d) * 2, dx / d, dz / d, 5);
    g.audio.groan(0.6); g.shake(0.3);
  }

  // Ink: dark splashes where the jet hits, and the ink bomb.
  inkSplash(x, y, z, size, n) {
    const g = this.g, r = g.rng;
    for (let i = 0; i < n; i++) g.fx.add(x, y, z, (r() - 0.5) * 14, r() * 10, (r() - 0.5) * 14, size, size * 0.4, 0.9, 0.2, 0.1, 0.3, 0.9, 0, 40, 0.5);
  }

  inkBomb(o, aim, radius, power, cloud) {
    const d = Math.hypot(aim.x - o[0], aim.z - o[2]), tf = clamp(d / 60, 0.7, 2.2);
    this.proj.push({ kind: 'mortar', ink: true, cloud: Math.min(cloud, 48), x: o[0], y: o[1], z: o[2], vx: (aim.x - o[0]) / tf, vy: (aim.y - o[1]) / tf + 0.5 * GRAVITY * tf, vz: (aim.z - o[2]) / tf, r: 1.2 + this.g.monster.stage * 0.2, radius, power, life: 8, grav: GRAVITY });
    this.g.audio.whoosh();
  }

  // The ink bomb bursts: a huge dark cloud in which glass, leaves and cloth fall apart.
  inkBurst(p) {
    const g = this.g, o = this.opt, r = g.rng;
    o.dx = 0; o.dz = 0; o.impulse = launch(12); o.debris = 60; o.spare = true; o.blast = 0; o.quiet = true;
    g.lastHit.dx = 0; g.lastHit.dz = 0;
    g.destruction.sphere(p.x, p.y, p.z, p.cloud, 1.7, o);
    o.quiet = false; o.spare = false;
    for (let i = 0; i < 60 * g.fx.thin + 10; i++) {
      const a = r() * 6.283, e = (r() - 0.3) * 1.4, s = p.cloud * (0.4 + r() * 0.8);
      g.fx.add(p.x, p.y, p.z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s * 0.6, Math.sin(a) * Math.cos(e) * s, 2 + p.cloud * 0.1, p.cloud * 0.08, 2.2, 0.18, 0.1, 0.28, 0.85, 0, 0, 1.5);
    }
    g.audio.boom(0.5);
  }

  // Ground wave: one blow after another through the earth, from the root to the aimed spot.
  groundWave(act) {
    const g = this.g, m = g.monster, B = this.base(), size = g.world.wrap ? g.world.sx : 0, x0 = m.x, z0 = m.z;
    const dx = wrapDelta(act.ax - x0, size), dz = wrapDelta(act.az - z0, size), d = Math.hypot(dx, dz) || 1, len = Math.min(d, B.H * 4 + 20), ux = dx / d, uz = dz / d;
    for (let i = 1; i <= 7; i++) {
      const s = (len * i) / 7;
      this.later(i * 0.08, () => {
        const x = x0 + ux * s, z = z0 + uz * s, gy = this.terrainBelow(x, z);
        this.shock(x, gy, z, B.H * 0.16, B.R * 0.5, B.P * 0.95, 4, i % 3 !== 0);
        g.fx.dust(x, gy + 1, z, B.H * 0.3, 0.6, 0.5, 0.4, 4);
      });
    }
    g.audio.boom(0.5); g.shake(0.4);
  }

  // The awakening of the deep: five tentacles burst out of the ground in a ring round the target, coil round it,
  // squeeze, and drag it down into the earth (its foundations go, and it sinks into its own rubble).
  kraken(act) {
    const g = this.g, w = g.world, B = this.base(), st = w.structureAt(act.ax, act.az), big = st && st.major && !st.done ? st : null;
    const cx = big ? (big.x0 + big.x1) / 2 + 0.5 : act.ax, cz = big ? (big.z0 + big.z1) / 2 + 0.5 : act.az;
    const r = big ? Math.min(Math.max(big.x1 - big.x0, big.z1 - big.z0) * 0.55 + 2, B.H * 1.5) : B.H * 0.4 + 6, gy = big ? big.y0 : this.terrainBelow(cx, cz);
    const top = big ? Math.min(big.top, gy + B.H * 3) : gy + B.H * 1.6;
    this.krakens.push({ cx, cz, gy, r, h: Math.max(B.H * 0.8, top - gy + 3), w: B.H * 0.2 + 1, t: 0, life: act.S, a0: g.rng() * 6.283, st: big });
    g.audio.boom(0.9); g.shake(0.8);
  }

  krakenTick(act, b0, b1) {
    const K = this.krakens[this.krakens.length - 1], g = this.g, B = this.base(), o = this.opt;
    if (!K) return;
    eachShot(b0, b1, 18, (k) => {
      const u = k / 18;
      o.impulse = launch(B.H * 1.2 + 8); o.debris = 40; o.spare = false; o.blast = 0; o.quiet = k % 3 !== 0;
      for (let i = 0; i < 5; i++) {
        const a = K.a0 + (i / 5) * 6.283, ca = Math.cos(a), sa = Math.sin(a), bx = K.cx + ca * K.r, bz = K.cz + sa * K.r;
        o.dx = -ca; o.dz = -sa; g.lastHit.dx = -ca; g.lastHit.dz = -sa;
        if (u < 0.25) g.destruction.sphere(bx, K.gy + 1, bz, B.R * 0.7, B.P * 1.2, o); // bursting out of the ground
        else if (u < 0.6) { const y = K.gy + K.h * (0.25 + 0.6 * ((u - 0.25) / 0.35)); g.destruction.capsule(bx, y, bz, K.cx + ca * K.r * 0.3, y, K.cz + sa * K.r * 0.3, B.R * 0.45, B.P * 1.3, o); } // coiling round, squeezing in
        else { o.dy = -0.6; g.destruction.sphere(K.cx + ca * K.r * 0.55, K.gy + 1 + B.R * 0.5, K.cz + sa * K.r * 0.55, B.R * 1.05, B.P * 1.6, o); o.dy = 0.15; } // down: the foundations go
      }
      o.quiet = false;
      if (K.st && u >= 0.6) { g.stability.weaken(K.st, 0.15 * clamp((0.3 * g.monster.h ** 3) / Math.max(200, K.st.remaining), 0.1, 1)); g.onShove(g.monster, K.cx, K.cz, 0, 0, 2); }
      g.shake(0.2);
    });
  }
}
