// The tentacle: travelling below the ground, diving and surfacing (part of class Monster, see monster.js).

import { clamp, wrapDelta } from './math.js';
import { TYPE_FLAGS, F_TERRAIN } from './materials.js';
import { SEGS, SEG_LEN, MODEL_HEIGHT } from './species.js';
import { reachFor, locomotion } from './posing.js';

export class MonsterBurrow {
  // Ground under (x, z): the top of the earth at or below y0, not counting what is built on it; -1 if there is none
  // within reach below (the edge of an island in the sky).
  groundBelow(x, z, y0, depth = this.h * 2 + 8) {
    const w = this.g.world, ix = Math.floor(x), iz = Math.floor(z), top = Math.min(Math.floor(y0), w.sy - 1), lo = Math.max(0, top - Math.ceil(depth));
    for (let y = top; y >= lo; y--) { const t = w.get(ix, y, iz); if (t && TYPE_FLAGS[t] & F_TERRAIN) return y + 1; }
    return lo > 0 ? -1 : 0;
  }

  // The tentacle. Below the ground it travels fast and unseen (only a bulge of earth moves along), and under a building
  // it digs away at the foundations. Out of the ground it stays where it is and reaches out; the stick leans the whole arm,
  // and leaning on for a moment sends it down again to travel on.
  burrow(dt, mx, mz, aimX, aimZ) {
    const g = this.g, w = g.world, h = this.h, pose = this.pose, size = w.wrap ? w.sx : 0, input = Math.hypot(mx, mz);
    this.onGround = true; this.vy = 0; this.jumps = 0; this.speed = 0;
    this.diveCool -= dt;
    pose.emerge += ((this.under ? 0 : 1) - pose.emerge) * Math.min(1, dt * (this.under ? 10 : 7));
    if (!this.under && pose.emerge > 0.995) pose.emerge = 1;
    if (this.under && pose.emerge < 0.01) pose.emerge = 0;
    const gy = this.groundBelow(this.x, this.z, this.y + h * 0.3);
    if (gy >= 0 && gy < this.y) this.y = Math.max(gy, this.y - (h * 3 + 20) * dt); // the ground under it was blown away: it follows it down
    if (this.under) {
      if (input > 0.05) {
        const wet = w.under || (w.water && w.water.rects.some((q) => this.x >= q[0] && this.x < q[2] && this.z >= q[1] && this.z < q[3]));
        const v = (12 + h * 1.1) * (wet ? 2 : 1) * (this.sprint ? 1.5 : 1) * Math.min(1, input), dx = mx / input, dz = mz / input;
        // Below the ground every rise is just more earth to dig through: out of a crater, up a slope, under a hill.
        // Only where there is no ground at all (the edge of an island in the sky) it cannot go on.
        const nx = this.x + dx * v * dt, nz = this.z + dz * v * dt, ny = this.groundBelow(nx, nz, this.y + h * 3 + 40, h * 5 + 48);
        if (ny >= 0) { this.x = nx; this.z = nz; this.y += (ny - this.y) * Math.min(1, dt * 12); this.speed = v; }
        this.heading += Math.atan2(Math.sin(Math.atan2(dx, dz) - this.heading), Math.cos(Math.atan2(dx, dz) - this.heading)) * Math.min(1, dt * 8);
        pose.walk += dt * v * 0.4;
        if (g.rng() < 0.15) g.onBurrow(this);
        if ((this.rumbleT = (this.rumbleT ?? 0) - dt) <= 0) { this.rumbleT = 3 + g.rng() * 2; g.emote('rumble'); } // ズズズ over the moving ground, now and then
        this.mineT = 0;
      } else {
        if (pose.emote === 'rumble') pose.emote = null; // standing still below the ground: nothing shows where it is
        this.rumbleT = 0;
        // Waiting under a building: the building shakes and its foundations crumble, bit by bit.
        const st = w.structureAt(this.x, this.z);
        if (st && st.major && !st.done && (this.mineT += dt) > 0.8) { this.mineT = 0; g.onUndermine(this, st); }
      }
    } else {
      // The stick leans the arm; held over for a moment, the tentacle goes down to travel.
      const f = input > 0.05 ? (mx * Math.sin(this.heading) + mz * Math.cos(this.heading)) : 0, s = input > 0.05 ? (mx * Math.cos(this.heading) - mz * Math.sin(this.heading)) : 0;
      pose.leanF += (f - pose.leanF) * Math.min(1, dt * 5); pose.leanS += (s - pose.leanS) * Math.min(1, dt * 5);
      if (input > 0.75 && !g.tools.act) { if ((this.leanT += dt) > 0.35) this.dive(); } else this.leanT = 0;
      let dh = Math.atan2(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) - this.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      if (!g.tools.act && Math.hypot(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) > h * 0.3) this.heading += dh * Math.min(1, dt * 4);
    }
    if (w.wrap) { this.x = ((this.x % w.sx) + w.sx) % w.sx; this.z = ((this.z % w.sz) + w.sz) % w.sz; }
    else { this.x = clamp(this.x, 4, w.sx - 4); this.z = clamp(this.z, 4, w.sz - 4); }
    // The tip looks for the aim point: forwards and up from the root, as far as the arm reaches, with a soft delay.
    const k = MODEL_HEIGHT / h, L = SEGS * SEG_LEN, d = Math.hypot(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) * k;
    let f = d, u = (g.aim.y - this.y) * k;
    const len = Math.hypot(f, u) || 1, reach = Math.min(len, L * 0.78);
    f = (f / len) * reach * 0.85; u = Math.max(L * 0.35, (u / len) * reach);
    reachFor(pose, f, u, this.under ? 0 : 2);
    if (this.under) pose.ta.fill(0);
    for (let i = 0; i < SEGS; i++) pose.ts[i] *= 1 - Math.min(1, dt * 3);
    pose.leanF *= this.under ? 0 : 1;
    // Long without anything to do: a little tune, then a nap.
    this.quietT = input > 0.05 || g.tools.act ? 0 : this.quietT + dt;
    if (this.quietT > 9 && !pose.emote && !this.under) g.emote(this.quietT > 24 ? 'sleep' : 'note');
    locomotion(pose, 'tentacle');
  }

  // The big button of the tentacle: down into the ground, or up out of it. Coming up is a blow of its own: the ground bursts
  // open, and under a building the tentacle shoots up through its floors.
  dive() {
    if (this.diveCool > 0) return false;
    this.diveCool = 0.35;
    this.under = true; this.leanT = 0;
    this.g.onDive(this);
    return true;
  }

  surface() {
    if (this.diveCool > 0 || !this.under) return false;
    this.diveCool = 0.3;
    this.under = false; this.pose.squash = -0.8; this.pose.ta.fill(0);
    this.g.onSurface(this, this.g.time - this.eruptT > 1.4);
    this.eruptT = this.g.time;
    return true;
  }
}
