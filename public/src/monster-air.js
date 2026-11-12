// Flying (the aircraft, always on the move) and hovering (the helicopter): part of class Monster, see monster.js.

import { clamp, wrapDelta } from './math.js';
import { launch } from './particles.js';
import { locomotion } from './posing.js';

export class MonsterAir {
  // The aircraft is always moving: it turns with `steer`, climbs or dives with `pitchIn`,
  // skims over whatever is below it and ploughs through whatever is in front of it.
  flyPlane(dt, aimX, aimZ) {
    const g = this.g, w = g.world, h = this.h, pose = this.pose;
    // After a crash the aircraft is thrown round and climbs away; for that moment it does not answer the controls.
    this.bounce = Math.max(0, this.bounce - dt);
    if (this.bounce > 0) { g.camYaw += this.bounceDir * dt * 4.2; this.pitchIn = 1; pose.bank += (this.bounceDir * -1.1 - pose.bank) * Math.min(1, dt * 8); }
    const v = (42 + h * 1.3) * (this.sprint ? 1.7 : 1) * (this.bounce > 0 ? 0.55 : 1), fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    this.speed = v; this.onGround = false;
    this.x += fx * v * dt; this.z += fz * v * dt;
    // Never below the ground: an aircraft is no mole.
    this.y = clamp(this.y + this.pitchIn * (24 + h * 0.7) * dt, Math.max(3, w.spawn[1]) + h * 0.3 + 1, w.sy + 70);
    const floor = w.heightBelow(this.x, this.z, this.y) + h * 0.3 + 1;
    if (this.y < floor) this.y += (floor - this.y) * Math.min(1, dt * 8);
    // Nose first into something solid: a big hole in it (it may well come down), and the aircraft bounces off.
    // Flying on straight through a building is not possible.
    const nx = this.x + fx * h * 0.8, nz = this.z + fz * h * 0.8;
    if (w.get(Math.floor(nx), Math.floor(this.y), Math.floor(nz))) {
      if (this.bounce <= 0) {
        g.lastHit.dx = fx; g.lastHit.dz = fz;
        // A dent the size of the aircraft, no more: ramming is a mishap, not a weapon.
        g.destruction.sphere(nx + fx * h * 0.3, this.y, nz + fz * h * 0.3, h * 0.4 + 1.5, 4 + this.stage * 1.5, { dx: fx, dy: 0.1, dz: fz, impulse: launch(h * 1.5 + 8), debris: 50, spare: true });
        g.onCrash(this);
        this.bounce = 0.75;
        this.bounceDir = g.rng() < 0.5 ? 1 : -1;
      }
      this.x -= fx * v * dt * 1.6; this.z -= fz * v * dt * 1.6; // out of the wall again
    }
    if (w.wrap) { this.x = ((this.x % w.sx) + w.sx) % w.sx; this.z = ((this.z % w.sz) + w.sz) % w.sz; }
    else this.homing = this.x < 20 || this.z < 20 || this.x > w.sx - 20 || this.z > w.sz - 20; // islands end: turn back
    pose.bank += (this.steer * 0.75 - pose.bank) * Math.min(1, dt * 5);
    pose.climb += (-this.pitchIn * 0.4 - pose.climb) * Math.min(1, dt * 5);
    pose.air = 0; pose.walkAmp = 0;
    // The gear under the belly follows the aim point, all the way round and down.
    const size = w.wrap ? w.sx : 0, ax = wrapDelta(aimX - this.x, size), az = wrapDelta(aimZ - this.z, size);
    let dl = Math.atan2(ax, az) - this.heading - pose.look;
    dl = Math.atan2(Math.sin(dl), Math.cos(dl));
    pose.look += dl * Math.min(1, dt * 10);
    pose.aimPitch += (clamp(Math.atan2(this.y - g.aim.y, Math.hypot(ax, az)), -0.15, 1.4) - pose.aimPitch) * Math.min(1, dt * 10);
    locomotion(pose, 'jet');
  }

  // The helicopter hovers: it drifts where it is steered (mx/mz in the world, plus strafe), with inertia, and comes to a stop
  // when let go. Height works as under water: holding the jump button lifts it, let go it sinks back by itself until it sits
  // on the ground or a roof. What lies just ahead it rises over on its own. The nose turns towards the aim. Running into
  // something solid leaves a dent and throws it back. Sitting on a roof from stage 3 on, it is too heavy for it.
  hover(dt, mx, mz, aimX, aimZ) {
    const g = this.g, w = g.world, h = this.h, pose = this.pose, size = w.wrap ? w.sx : 0;
    this.bounce = Math.max(0, this.bounce - dt);
    const v = (18 + h * 0.9) * (this.sprint ? 1.6 : 1), k = Math.min(1, dt * 2.4);
    const want = Math.hypot(mx, mz) > 1 ? 1 / Math.hypot(mx, mz) : 1;
    if (this.bounce <= 0) { this.vx += (mx * want * v - this.vx) * k; this.vz += (mz * want * v - this.vz) * k; }
    const px = this.x, pz = this.z;
    this.x += this.vx * dt; this.z += this.vz * dt;
    // Height: up while the button is held, a slower sinking otherwise. The floor is the highest thing under the body and a little ahead.
    this.vy += ((this.liftIn > 0 ? 14 + h : -(5 + h * 0.45)) - this.vy) * Math.min(1, dt * 3);
    let floor = 0;
    const r = h * 0.3, ax = this.x + this.vx * 0.45, az = this.z + this.vz * 0.45;
    for (const [ox, oz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) floor = Math.max(floor, w.heightBelow(this.x + ox, this.z + oz, w.sy - 1), w.heightBelow(ax + ox, az + oz, w.sy - 1));
    this.y += this.vy * dt;
    if (this.y < floor) { this.y += Math.min(floor - this.y, (30 + h * 1.5) * dt); if (this.vy < 0) this.vy = 0; } // over what is ahead
    if (this.y > w.sy + 60) { this.y = w.sy + 60; this.vy = Math.min(0, this.vy); }
    this.onGround = this.y <= floor + 0.5;
    // Landed on a roof: from stage 3 the roof gives way under it, and it sinks floor by floor until it stands on something firm.
    if (this.onGround && this.stage >= 3 && (this.landT -= dt) <= 0) {
      const st = w.structureAt(this.x, this.z);
      if (st && st.major && floor > st.y0 + 2) {
        this.landT = 0.45;
        g.lastHit.dx = 0; g.lastHit.dz = 0;
        g.destruction.sphere(this.x, floor - 1, this.z, h * 0.32 + 1, 3 + this.stage * 1.3, { dx: 0, dy: -0.3, dz: 0, impulse: launch(h * 0.6 + 4), debris: 30 });
        g.shake(0.15);
      }
    }
    // Into a wall: a dent the size of the helicopter, a bump backwards, a moment of tumbling.
    const sp = Math.hypot(this.vx, this.vz);
    if (sp > 2 && this.bounce <= 0) {
      const fx = this.vx / sp, fz = this.vz / sp, nx = this.x + fx * h * 0.55, nz = this.z + fz * h * 0.55, ny = this.y + h * 0.35;
      if (w.get(Math.floor(nx), Math.floor(ny), Math.floor(nz)) || w.get(Math.floor(this.x + fx * h * 0.3), Math.floor(this.y + h * 0.6), Math.floor(this.z + fz * h * 0.3))) {
        g.lastHit.dx = fx; g.lastHit.dz = fz;
        g.destruction.sphere(nx, ny, nz, h * 0.3 + 1.2, 3 + this.stage * 1.4, { dx: fx, dy: 0.1, dz: fz, impulse: launch(h + 6), debris: 40, spare: true });
        g.onCrash(this);
        this.x = px - fx * 0.5; this.z = pz - fz * 0.5;
        this.vx = -fx * v * 0.5; this.vz = -fz * v * 0.5;
        this.bounce = 0.45; this.bounceDir = g.rng() < 0.5 ? 1 : -1;
      }
    }
    if (w.wrap) { this.x = ((this.x % w.sx) + w.sx) % w.sx; this.z = ((this.z % w.sz) + w.sz) % w.sz; }
    else { this.x = clamp(this.x, 4, w.sx - 4); this.z = clamp(this.z, 4, w.sz - 4); }
    this.speed = sp;
    // The nose turns towards the aim point; the body tilts into the drift (forwards: nose down) and wobbles after a bump.
    let dh = Math.atan2(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) - this.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    if (Math.hypot(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) > h * 0.5) this.heading += dh * Math.min(1, dt * 3);
    const fwd = (this.vx * Math.sin(this.heading) + this.vz * Math.cos(this.heading)) / v, side = (this.vx * Math.cos(this.heading) - this.vz * Math.sin(this.heading)) / v;
    pose.climb += (fwd * 0.28 - pose.climb) * Math.min(1, dt * 4);
    pose.bank += (side * 0.32 + (this.bounce > 0 ? this.bounceDir * Math.sin(this.bounce * 30) * 0.3 : 0) - pose.bank) * Math.min(1, dt * 5);
    pose.air = 0; pose.walkAmp = 0;
    let dl = Math.atan2(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) - this.heading - pose.look;
    dl = Math.atan2(Math.sin(dl), Math.cos(dl));
    pose.look += dl * Math.min(1, dt * 10);
    pose.aimPitch += (clamp(Math.atan2(this.y - g.aim.y, Math.hypot(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size))), -0.3, 1.3) - pose.aimPitch) * Math.min(1, dt * 10);
    // Rotor wash: low over the ground it blows dust about; from stage 3 the windows right under it burst.
    const gap = this.y - floor;
    if (gap < h * 1.6 && (this.washT -= dt) <= 0) {
      this.washT = 0.3;
      g.onWash(this, floor, 1 - gap / (h * 1.6));
    }
    locomotion(pose, 'chopper');
  }
}
