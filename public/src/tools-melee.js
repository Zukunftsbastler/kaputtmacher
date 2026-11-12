// What the body does (part of class Tools, see tools.js): blows, shock rings, sweeps of tail and arms, the breaker's
// chisel, cuts, and grabbing and throwing whatever comes loose.

import { isTerrain, TYPE_MAT, MAT, RUBBLE } from './materials.js';
import { clamp, wrapDelta } from './math.js';
import { GRAVITY, launch } from './particles.js';

export class ToolsMelee {
  // One blow. heavy adds the long hit stop and a pressure wave; debris overrides the number of flying cubes.
  blow(x, y, z, r, p, heavy, dx, dz, quietFx = false, debris = 0) {
    const g = this.g, o = this.opt, B = this.base();
    o.dx = dx; o.dz = dz; o.impulse = launch(B.H * (heavy ? 3 : 2) + 10); o.debris = debris || (heavy ? 160 : 80); o.spare = false; o.blast = heavy ? launch(B.H) : 0;
    g.lastHit.dx = dx; g.lastHit.dz = dz; g.lastHit.pop = launch(B.H * (heavy ? 0.5 : 0.15));
    const n = g.destruction.sphere(x, y, z, r, p, o);
    g.actors.hitAir(x, y, z, r + 2);
    if (n && !quietFx) g.impactFx(x, y, z, r * 1.2, (heavy ? 0.6 : 0.3) + B.S * 0.07, heavy);
    return n;
  }

  // A ring of blows around a point: the shock that runs through the ground.
  shock(x, y, z, radius, r, p, count, quiet = false) {
    const g = this.g, o = this.opt, B = this.base();
    o.impulse = launch(B.H * 2 + 6); o.debris = 24; o.spare = false; o.blast = launch(B.H * 0.8);
    g.lastHit.pop = launch(B.H * 0.35);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 6.283 + radius;
      o.dx = Math.cos(a); o.dz = Math.sin(a);
      g.lastHit.dx = o.dx; g.lastHit.dz = o.dz;
      g.destruction.sphere(x + o.dx * radius, y + r * 0.3, z + o.dz * radius, r, p, o);
    }
    g.fx.dust(x, y + 1, z, radius * 0.8, 0.78, 0.74, 0.66, quiet ? 4 : 10);
    if (!quiet) { g.shake(0.5 + B.S * 0.08); g.audio.boom(0.4 + B.S * 0.06); }
  }

  // Where a blow lands: the first solid thing between the body and the aimed spot, within reach.
  // low = aimed at the ground in front rather than at chest height.
  reachHit(act, up, reachMul, low = false) {
    const g = this.g, m = g.monster, B = this.base(), cy = m.y + B.H * up, reach = B.H * reachMul + 2, q = this.hp;
    let dx = act.ax - m.x, dy = clamp(act.ay, m.y + B.H * (low ? 0.02 : 0.1), m.y + B.H * (low ? 0.5 : 1.15)) - cy, dz = act.az - m.z;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;
    let t = B.H * 0.2;
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

  // Dino tail: while the body turns, the tail hits everything along its length in the half circle in front.
  tailSweep(act, v, b0, b1, reaches, rMul, pMul, heavy) {
    const g = this.g, m = g.monster, B = this.base(), o = this.opt;
    const y = clamp(act.ay, m.y + B.H * 0.18, m.y + B.H * 0.7);
    o.impulse = launch(B.H * (heavy ? 3.2 : 2.2) + 10); o.debris = heavy ? 120 : 60; o.spare = true; o.blast = 0;
    let n = 0, hx = 0, hz = 0;
    for (let k = 1; k <= 4; k++) {
      const b = b0 + ((b1 - b0) * k) / 4, ang = act.heading + v.spin(1, b, 0) * act.side + Math.PI;
      const off = Math.atan2(Math.sin(ang - act.heading), Math.cos(ang - act.heading));
      if (Math.abs(off) > 1.5) continue;
      const sx = Math.sin(ang), sz = Math.cos(ang);
      o.dx = sz * act.side; o.dz = -sx * act.side; // debris flies along the sweep
      g.lastHit.dx = o.dx; g.lastHit.dz = o.dz; g.lastHit.pop = launch(B.H * (heavy ? 0.5 : 0.2));
      for (const r of reaches) {
        const c = g.destruction.sphere(m.x + sx * B.H * r, y, m.z + sz * B.H * r, B.R * rMul * 0.85, B.P * pMul, o);
        g.actors.hitAir(m.x + sx * B.H * r, y, m.z + sz * B.H * r, B.R * rMul + 2);
        if (c) { n += c; hx = m.x + sx * B.H * r; hz = m.z + sz * B.H * r; }
      }
    }
    o.spare = false;
    if (n && g.time - (act.fxT ?? -1) > 0.09) { act.fxT = g.time; g.impactFx(hx, y, hz, B.R * rMul * 1.3, (heavy ? 0.6 : 0.3) + B.S * 0.07, heavy); }
  }

  // Excavator: the arm sweeps round with the upper carriage; everything along it in the arc is hit.
  armSweep(act, v, b0, b1, reaches, rMul, pMul, heavy) {
    const g = this.g, m = g.monster, B = this.base(), o = this.opt, size = g.world.wrap ? g.world.sx : 0;
    const y = clamp(act.ay, m.y + B.H * 0.15, m.y + B.H * 0.9), aimYaw = Math.atan2(wrapDelta(act.ax - m.x, size), wrapDelta(act.az - m.z, size));
    o.impulse = launch(B.H * (heavy ? 3 : 2) + 10); o.debris = heavy ? 120 : 60; o.spare = true; o.blast = 0;
    let n = 0, hx = 0, hz = 0;
    for (let k = 1; k <= 4; k++) {
      const b = b0 + ((b1 - b0) * k) / 4, ang = aimYaw + v.turn(1, b, 0) * act.side, sx = Math.sin(ang), sz = Math.cos(ang);
      o.dx = sz * act.side; o.dz = -sx * act.side; // debris flies along the swing
      g.lastHit.dx = o.dx; g.lastHit.dz = o.dz; g.lastHit.pop = launch(B.H * (heavy ? 0.45 : 0.2));
      for (const r of reaches) {
        const x = m.x + sx * B.H * r, z = m.z + sz * B.H * r, c = g.destruction.sphere(x, y, z, B.R * rMul * 0.8, B.P * pMul, o);
        g.actors.hitAir(x, y, z, B.R * rMul + 2);
        if (c) { n += c; hx = x; hz = z; }
      }
    }
    o.spare = false;
    if (n && g.time - (act.fxT ?? -1) > 0.09) { act.fxT = g.time; g.impactFx(hx, y, hz, B.R * rMul * 1.2, (heavy ? 0.6 : 0.3) + B.S * 0.07, heavy); }
  }

  // Excavator: one blow of the hydraulic breaker. The face it hits crumbles, and the chisel drives a hole deep into
  // the building in the direction of the target. rMul: width, pMul: force (a breaker gets through concrete early),
  // depth: voxels beyond the contact point. crack: the blow also sends cracks through the wall around it.
  // shaken: how much every blow weakens the whole building for good (stability.js): a breaker shakes a building to
  // its foundations, so after a long hammering it may come down on its own.
  chisel(act, rMul, pMul, depth, crack = false, shaken = 0) {
    const g = this.g, B = this.base(), q = this.reachHit(act, 0.4, 1.25), o = this.opt;
    o.dx = this.dx; o.dz = this.dz; o.impulse = launch(B.H + 6); o.debris = 14; o.spare = false; o.blast = 0;
    g.lastHit.dx = this.dx; g.lastHit.dz = this.dz;
    const d = depth + B.H * 0.3;
    let n = g.destruction.sphere(q[0], q[1], q[2], B.R * 0.55 * rMul, B.P * pMul * 0.8, o);
    n += g.destruction.capsule(q[0], q[1], q[2], q[0] + this.dx * d, q[1], q[2] + this.dz * d, 0.8 + B.R * 0.35 * rMul, B.P * pMul, o);
    if (crack) this.shock(q[0] + this.dx * d * 0.5, q[1] - B.R * 0.3, q[2] + this.dz * d * 0.5, B.H * 0.18, B.R * 0.45, B.P * 0.9, 5, true);
    const st = shaken && g.world.structureAt(q[0] + this.dx * 2, q[2] + this.dz * 2);
    if (st && st.major && n) g.stability.weaken(st, shaken);
    if (n) { g.fx.sparks(q[0], q[1], q[2], 10, 5, 1, 0.9, 0.6); g.fx.dust(q[0], q[1], q[2], 1.5 + B.R * 0.3, 0.78, 0.76, 0.71, 1); g.audio.hit('metal', 0.2); g.audio.hit('stone', 0.15); }
  }

  // Robot blade: cuts along the line from the body out to full reach, between two angles.
  // The blade is the robot's first move: what it cuts through grows with the stage (glass and brick at first, steel later).
  cut(act, a1, a0, lift, b) {
    const g = this.g, m = g.monster, B = this.base(), reach = B.H * 1.5 + 5;
    const y = clamp(act.ay, m.y + B.H * 0.15, m.y + B.H) + B.H * lift, o = this.opt;
    o.dx = 0; o.dz = 0; o.impulse = launch(reach * 0.25 + 4); o.debris = 6; o.spare = false; o.blast = 0; o.quiet = true;
    let n = 0;
    for (let k = 1; k <= 3; k++) {
      const a = a0 + ((a1 - a0) * k) / 3, sx = Math.sin(a), sz = Math.cos(a);
      g.lastHit.dx = sx; g.lastHit.dz = sz;
      n += g.destruction.capsule(m.x + sx * 2, y, m.z + sz * 2, m.x + sx * reach, y + Math.sin(b * 6) * reach * 0.06, m.z + sz * reach, 0.9, B.P * 1.25, o);
      this.rays.push({ ax: m.x + sx * B.H * 0.3, ay: y, az: m.z + sz * B.H * 0.3, bx: m.x + sx * reach, by: y, bz: m.z + sz * reach, w: 0.7 + B.H * 0.01, r: 0.3, g: 0.9, b: 1, life: 0.08 });
    }
    o.quiet = false;
    if (n) { g.fx.sparks(m.x + Math.sin(a1) * reach * 0.7, y, m.z + Math.cos(a1) * reach * 0.7, 14, 3, 0.4, 0.9, 1); g.audio.sword(); }
  }

  // Picks something up to throw. In this order: an object close by that can be lifted whole (a car, a tree,
  // a garden gnome; how big it may be depends on the creature), otherwise a lump torn out of whatever the
  // hand reaches (a piece of a building), and if there is nothing at all, a lump of the ground underfoot.
  // The creature never comes away empty-handed.
  // cx/cz: where to look round for an object (default: the creature itself; the helicopter's hook looks where it is lowered).
  grab(x, y, z, r, cx, cz) {
    const g = this.g, w = g.world, m = g.monster, hooked = cx !== undefined;
    if (this.held) return;
    const fits = (st) => st && st.grabbable && st.remaining > 3 && Math.max(st.x1 - st.x0, st.z1 - st.z0, st.top - (st.y0 ?? 0)) < r * 5 + 6;
    // Look around for an object: the nearest one within a good arm's length.
    let obj = null, best = 1e9, ox = 0, oz = 0, last = 0;
    const R = Math.ceil(m.h * (hooked ? 0.5 : 1.3) + 6), mx = Math.floor(hooked ? cx : m.x), mz = Math.floor(hooked ? cz : m.z);
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const d = dx * dx + dz * dz;
      if (d >= best || d > R * R) continue;
      const cx = w.wrap ? (mx + dx) & w.mx : mx + dx, cz = w.wrap ? (mz + dz) & w.mz : mz + dz;
      if (cx < 0 || cz < 0 || cx >= w.sx || cz >= w.sz) continue;
      const id = w.footprint[cx + w.sx * cz];
      if (!id || id === last) continue;
      last = id;
      if (!fits(w.structures[id])) { last = id; continue; }
      best = d; obj = w.structures[id]; ox = mx + dx; oz = mz + dz; last = 0;
    }
    let n = 0, cells;
    if (obj) {
      // Small things come up whole.
      const st = obj, ax = ox, az = oz, span = Math.max(st.x1 - st.x0, st.z1 - st.z0) + 2;
      x = ox + 0.5; z = oz + 0.5;
      if (!hooked) m.faceTo(x, z);
      cells = g.bodies.reserve((span * 2 + 1) ** 2 * (st.top + 1));
      for (let dz = -span; dz <= span; dz++) for (let dx = -span; dx <= span; dx++) {
        const cx = w.wrap ? (ax + dx) & w.mx : ax + dx, cz = w.wrap ? (az + dz) & w.mz : az + dz;
        if (cx < 0 || cz < 0 || cx >= w.sx || cz >= w.sz || w.footprint[cx + w.sx * cz] !== st.id) continue;
        for (let yy = 0; yy <= st.top; yy++) {
          const t = w.get(cx, yy, cz);
          if (!t || isTerrain(t)) continue;
          cells[n * 4] = ax + dx; cells[n * 4 + 1] = yy; cells[n * 4 + 2] = az + dz; cells[n * 4 + 3] = t;
          n++;
          w.set(cx, yy, cz, 0);
        }
      }
    }
    // A lump out of a sphere. solidOnly: only if there is something built there (not just ground).
    const lump = (px, py, pz, solidOnly) => {
      const ax = Math.floor(px), ay = Math.floor(py), az = Math.floor(pz), ri = Math.ceil(r);
      if (solidOnly) {
        let built = 0;
        for (let dy = -ri; dy <= ri && built < 3; dy += 2) for (let dz = -ri; dz <= ri && built < 3; dz += 2) for (let dx = -ri; dx <= ri; dx += 2) { const t = w.get(ax + dx, ay + dy, az + dz); if (t && !isTerrain(t)) built++; }
        if (built < 3) return 0;
      }
      cells = g.bodies.reserve((2 * ri + 1) ** 3);
      let k = 0;
      for (let dy = -ri; dy <= ri; dy++) for (let dz = -ri; dz <= ri; dz++) for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dy * dy + dz * dz > r * r) continue;
        const t = w.get(ax + dx, ay + dy, az + dz);
        if (!t || TYPE_MAT[t] === MAT.BEDROCK || ay + dy < 1) continue;
        cells[k * 4] = ax + dx; cells[k * 4 + 1] = ay + dy; cells[k * 4 + 2] = az + dz; cells[k * 4 + 3] = isTerrain(t) ? t | RUBBLE : t;
        k++;
        w.set(ax + dx, ay + dy, az + dz, 0);
        g.destruction.addSeeds(ax + dx, ay + dy, az + dz);
      }
      return k;
    };
    if (n < 3) n = lump(x, y, z, true); // a piece of the building within reach
    if (n < 3) { // nothing built: a lump of the ground in front of the feet
      const o = this.at(this.hp, 0, 0.55);
      if (hooked) { x = cx; z = cz; y = w.heightBelow(x, z, w.sy - 1) - r * 0.35; }
      else { x = o[0]; z = o[2]; y = w.heightBelow(x, z, m.y + m.h * 0.5) - r * 0.35; }
      n = lump(x, y, z, false);
    }
    if (n < 3) return;
    const b = g.bodies.fromCells(n);
    b.kinematic = true;
    this.held = b;
    g.audio.hit('earth', 0.6);
    g.fx.dust(x, y, z, r * 0.7, 0.6, 0.5, 0.4, 5);
  }

  // Throws the held lump at the aimed spot. mult = how much faster than a normal throw; hard = it lands like a bomb.
  release(mult, hard) {
    const g = this.g, b = this.held, B = this.base(), aim = g.aim;
    this.held = null;
    if (!b || b.dead) return;
    b.kinematic = false; b.thrown = true; b.age = 0;
    const dx = aim.x - b.pos[0], dy = aim.y - b.pos[1], dz = aim.z - b.pos[2], dist = Math.hypot(dx, dz);
    const tf = clamp(dist / ((38 + B.H * 1.2) * mult), 0.25, 2.4);
    b.v[0] = dx / tf; b.v[1] = dy / tf + 0.5 * GRAVITY * tf; b.v[2] = dz / tf;
    b.w[0] = (g.rng() - 0.5) * 4; b.w[1] = (g.rng() - 0.5) * 4; b.w[2] = (g.rng() - 0.5) * 4;
    b.hard = hard;
    g.audio.whoosh();
  }
}
