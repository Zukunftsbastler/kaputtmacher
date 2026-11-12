// The game's camera, aiming, meshing and drawing (part of class Game, see main.js).

import { m4, clamp, wrapDelta } from './math.js';
import { partMatrix, locomotion, MODEL_HEIGHT, GEAR, SEGS, specOf, EMOTE_LOOK, EMOTE_TIME } from './monster.js';

const FOV = (55 * Math.PI) / 180;
const v3 = [0, 0, 0], mat = m4.create(), base = m4.create(), tipBase = m4.create(), tipMat = m4.create();

export class GameView {
  // World position of the tentacle's tip, as it is drawn right now.
  tipPos(out) {
    const m = this.monster, part = this.model.parts.find((q) => q.name === 'seg' + (SEGS - 1));
    if (!part) { out[0] = m.x; out[1] = m.y + m.h; out[2] = m.z; return out; }
    this.monsterBase(tipBase, m.x, m.y, m.z, m.heading, m.h, m.pose);
    partMatrix(tipMat, tipBase, this.model, part, m.pose);
    m4.transformPoint(tipMat, 0, this.model.tipY, 0, out);
    out[0] += this.cam.focusX; out[2] += this.cam.focusZ;
    return out;
  }

  updateCamera(dt) {
    const c = this.cam, m = this.monster, cv = this.canvas;
    const drag = this.input.takeDrag(v3);
    this.camYaw -= drag[0] * 0.005;
    if (this.fly) this.flyPitch = clamp(this.flyPitch - drag[1] * 0.004, -1.4, 0.6);
    else this.pitchOffset = clamp(this.pitchOffset + drag[1] * 0.004, -0.6, 0.9);
    // A small monster between tall buildings looks ahead and up at them; a giant looks down on its planet.
    const tallness = clamp(m.h / (this.world.sy * 0.45), 0, 1);
    this.camPitch = clamp((this.world.wrap ? 0.2 + 0.5 * tallness : 0.52) + this.pitchOffset + (this.idle ? 0.14 * Math.sin(this.time * 0.053) : 0), 0.02, 1.25);

    let tx = 0, ty, tz = 0, dist = 0;
    // camOffset: an extra turn of the view only (used by the test pages to look at the creature from the side).
    const yaw = this.camYaw + (this.camOffset ?? 0), pitch = this.fly ? this.flyPitch : -this.camPitch, cp = Math.cos(pitch);
    c.fwd[0] = Math.sin(yaw) * cp; c.fwd[1] = Math.sin(pitch); c.fwd[2] = Math.cos(yaw) * cp;
    if (this.fly) { c.focusX = this.flyPos[0]; c.focusZ = this.flyPos[2]; ty = this.flyPos[1]; }
    // On an upright phone the picture is narrow, so the camera steps back to keep the surroundings in view.
    const narrow = clamp(1.2 * cv.clientHeight / Math.max(1, cv.clientWidth), 1, 2.2);
    const look = specOf(this.progress.species).cam ?? [1.3, 3.4];
    if (!this.fly) { c.focusX = m.x; c.focusZ = m.z; ty = m.y + m.h * look[0]; dist = (m.h * look[1] + 12) * narrow; }
    // Idle mode has a camera of its own: it slowly breathes in and out between a close view and a wide one.
    if (this.idle && !this.fly) dist *= 1.25 + 0.4 * Math.sin(this.time * 0.08);
    c.eye[0] = tx - c.fwd[0] * dist; c.eye[1] = ty - c.fwd[1] * dist; c.eye[2] = tz - c.fwd[2] * dist;
    const fl = Math.hypot(c.fwd[0], c.fwd[2]) || 1;
    c.right[0] = -c.fwd[2] / fl; c.right[1] = 0; c.right[2] = c.fwd[0] / fl;
    c.up[0] = c.right[1] * c.fwd[2] - c.right[2] * c.fwd[1]; c.up[1] = c.right[2] * c.fwd[0] - c.right[0] * c.fwd[2]; c.up[2] = c.right[0] * c.fwd[1] - c.right[1] * c.fwd[0];
    this.aspect = cv.clientWidth / Math.max(1, cv.clientHeight);
    m4.perspective(this.proj, FOV, this.aspect, 0.5 + dist * 0.02, 5000);
    m4.lookAt(this.view, c.eye[0], c.eye[1], c.eye[2], c.eye[0] + c.fwd[0], c.eye[1] + c.fwd[1], c.eye[2] + c.fwd[2]);
    m4.mul(c.vp, this.proj, this.view);
    // The shaking camera only shakes the picture (drawVp). Aiming and projecting use the steady camera, so that a
    // tremor never moves where a blow lands: the simulation stays reproducible (Math.random is allowed here only).
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.8);
    if (this.shakeAmt > 0.01) {
      const k = this.shakeAmt * (2 + dist * 0.02), ex = c.eye[0] + (Math.random() - 0.5) * k, ey = c.eye[1] + (Math.random() - 0.5) * k, ez = c.eye[2] + (Math.random() - 0.5) * k;
      m4.lookAt(this.shakeView, ex, ey, ez, ex + c.fwd[0], ey + c.fwd[1], ez + c.fwd[2]);
      m4.mul(c.drawVp, this.proj, this.shakeView);
    } else c.drawVp.set(c.vp);
    c.fogDist = Math.max(this.world.wrap ? Math.sqrt(c.cap2) * 2.2 : 1400, dist * 4);
    c.horizon = Math.tan(-pitch) / Math.tan(FOV / 2) - (this.world.wrap ? 0.25 : 0.05);
    this.eye[0] = c.focusX + c.eye[0]; this.eye[1] = c.eye[1]; this.eye[2] = c.focusZ + c.eye[2];
  }

  // Finds what the pointer is on. The screen shows the bent world, so the ray is marched in
  // screen space and every sample is straightened before the voxel lookup.
  pick() {
    const c = this.cam, w = this.world, cv = this.canvas, aim = this.aim;
    const nx = (this.input.aimX / cv.clientWidth) * 2 - 1, ny = 1 - (this.input.aimY / cv.clientHeight) * 2;
    const th = Math.tan(FOV / 2);
    let dx = c.fwd[0] + c.right[0] * nx * th * this.aspect + c.up[0] * ny * th;
    let dy = c.fwd[1] + c.right[1] * nx * th * this.aspect + c.up[1] * ny * th;
    let dz = c.fwd[2] + c.right[2] * nx * th * this.aspect + c.up[2] * ny * th;
    const l = Math.hypot(dx, dy, dz);
    dx /= l; dy /= l; dz /= l;
    aim.hit = false;
    const check = this.bodies.list.length > 0;
    // Walls between the camera and the creature that the see-through window has cut away are not there for aiming:
    // the player aims at what can be seen, and the blow goes there.
    const hole = this.hole, through = hole && Math.hypot(this.input.aimX - hole.x, this.input.aimY - hole.y) < hole.r * 0.85;
    let x = 0, y = 0, z = 0, hitT = 1100;
    for (let t = 2; t < 1100; t += t < 300 ? 0.6 : 1.5) {
      hitT = t;
      const vx = c.eye[0] + dx * t, vz = c.eye[2] + dz * t;
      x = c.focusX + vx; z = c.focusZ + vz;
      y = c.eye[1] + dy * t + (vx * vx + vz * vz) * c.curv;
      if (y < 0) { aim.hit = true; break; }
      if (through && t < hole.dist && y > hole.y0) continue;
      if (y < w.sy && (w.get(Math.floor(x), Math.floor(y), Math.floor(z)) || (check && this.bodies.solidAt(x, y, z)))) { aim.hit = true; break; }
      if (t > 320 && !c.curv && dy >= 0) break;
    }
    aim.x = x; aim.y = y; aim.z = z;
    // Things that fly (or swim) can be aimed at as well: whatever is close to the pointer's ray and in front of
    // the wall behind it becomes the target. Rockets follow it, beams and shots go straight there.
    aim.lock = null;
    let best = hitT;
    for (const list of [this.actors.helis, this.actors.jets, this.traffic.swimmers]) for (const o of list) {
      if (o.state !== 'fly') continue;
      const rx = wrapDelta(o.x - c.focusX, c.wrap) - c.eye[0], rz = wrapDelta(o.z - c.focusZ, c.wrap) - c.eye[2];
      const fx = rx + c.eye[0], fz = rz + c.eye[2], ry = o.y - (fx * fx + fz * fz) * c.curv - c.eye[1];
      const along = rx * dx + ry * dy + rz * dz;
      if (along < 4 || along > best) continue;
      const off2 = rx * rx + ry * ry + rz * rz - along * along, reach = w.unit * 5 + along * 0.035; // generous: they move
      if (off2 < reach * reach) { best = along; aim.lock = o; aim.x = o.x; aim.y = o.y; aim.z = o.z; aim.hit = true; }
    }
  }

  // World point -> screen pixels. Returns false if it is behind the camera.
  project(x, y, z, out) {
    const c = this.cam;
    const rx = wrapDelta(x - c.focusX, c.wrap), rz = wrapDelta(z - c.focusZ, c.wrap);
    const w = m4.transformPoint(c.vp, rx, y - (rx * rx + rz * rz) * c.curv, rz, out);
    if (w <= 0.1) return false;
    out[0] = (out[0] / w * 0.5 + 0.5) * this.canvas.clientWidth;
    out[1] = (0.5 - out[1] / w * 0.5) * this.canvas.clientHeight;
    return true;
  }

  // New meshes for changed chunks and for chunks that came into view (meshing.js).
  remesh() { this.meshQueue.update(); }


  // Placement of the whole creature: position, facing, whole-body pitch, squash, and the pose's hop and lunge.
  monsterBase(out, x, y, z, heading, h, pose) {
    const c = this.cam, s = h / MODEL_HEIGHT, q = pose.squash;
    m4.translation(out, wrapDelta(x - c.focusX, c.wrap), y, wrapDelta(z - c.focusZ, c.wrap));
    m4.rotateY(out, heading + pose.spin);
    if (pose.pitch) m4.rotateX(out, pose.pitch);
    if (pose.flip) { m4.translate(out, 0, h * 0.5, 0); m4.rotateX(out, pose.flip); m4.translate(out, 0, -h * 0.5, 0); } // somersault around the body's middle
    m4.scale(out, s * (1 + q * 0.15), s * (1 - q * 0.2), s * (1 + q * 0.15));
    m4.translate(out, 0, pose.hop, pose.fwd);
    return out;
  }

  drawMonster(b, pose, alpha, tint) {
    if (this.world.night) this.renderer.setNight(0.45); // the creature stays easy to see in the dark
    // Aircraft and excavator show only the gear that belongs to the selected move (GEAR in monster.js).
    const set = GEAR[this.model.species], gear = set ? set[this.tool] ?? '' : null, hidden = pose.emerge < 0.03; // the tentacle below the ground: only its bulge
    for (let i = 0; i < this.model.parts.length; i++) {
      const part = this.model.parts[i];
      if (part.emote || ((part.seg || part.name === 'mound') && hidden)) continue; // below the ground nothing of it shows
      if (gear === null || !part.chain.some((n) => n !== gear && Object.values(set).includes(n))) this.renderer.drawMesh(this.modelMeshes[i], partMatrix(mat, b, this.model, part, pose), alpha, tint);
    }
    // The tentacle's emoticon pops up above the tip (below the ground: above where it travels), turned to the camera.
    // It swells in, moves the way its kind of mark moves in a comic, and shrinks away.
    if (pose.emote && alpha === 1 && (!hidden || pose.emote === 'rumble')) {
      const i = this.model.parts.findIndex((q) => q.emote === pose.emote), t = pose.emoteT, k = Math.min(1, t / 0.18), end = Math.min(1, (EMOTE_TIME - t) / 0.2);
      const look = EMOTE_LOOK[pose.emote] ?? { anim: 'pop', size: 1 }, h = this.monster.h;
      if (i >= 0 && end > 0) {
        let pop = Math.min(k * 1.25, 1 + (1 - k) * 0.25) * end, ox = 0, oy = 0, roll = 0;
        const a = look.anim;
        if (a === 'throb') pop *= 1 + 0.18 * Math.max(0, Math.sin(t * 16)); // the vein throbs
        else if (a === 'slide') { ox = 0.35; oy = -0.25 * t; } // the drop runs down the side
        else if (a === 'bubble') pop *= 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 3.2)); // the bubble swells and shrinks with the breath
        else if (a === 'spin') roll = t * 5;
        else if (a === 'twinkle') { pop *= 1 + 0.12 * Math.sin(t * 22); roll = Math.sin(t * 3) * 0.2; }
        else if (a === 'sway') { roll = Math.sin(t * 6) * 0.35; ox = Math.sin(t * 3) * 0.1; }
        else if (a === 'shake') { ox = (Math.random() - 0.5) * 0.05; oy = (Math.random() - 0.5) * 0.05; roll = -0.18; } // lettering that trembles with the noise
        else oy = 0.04 * Math.sin(t * 7);
        const s = (h / MODEL_HEIGHT) * 2.1 * pop * look.size, yaw = this.camYaw + Math.PI;
        if (hidden) { v3[0] = this.monster.x; v3[1] = this.monster.y + h * 0.1; v3[2] = this.monster.z; } else this.tipPos(v3);
        const rx = -Math.cos(this.camYaw) * ox * h, rz = Math.sin(this.camYaw) * ox * h; // sideways in the picture
        m4.translation(mat, wrapDelta(v3[0] + rx - this.cam.focusX, this.cam.wrap), v3[1] + h * (0.5 + oy), wrapDelta(v3[2] + rz - this.cam.focusZ, this.cam.wrap));
        m4.rotateY(mat, yaw);
        if (roll) m4.rotateZ(mat, roll);
        m4.scale(mat, s, s, s);
        this.renderer.drawMesh(this.modelMeshes[i], mat, 1, null);
      }
    }
    if (this.world.night) this.renderer.setNight(1);
  }

  render() {
    const r = this.renderer, c = this.cam, m = this.monster;
    r.resize();
    r.begin(c);
    r.setNight(this.world.night ? 1 : 0);

    // Keep the monster and a good stretch of its surroundings visible behind tall buildings:
    // the window is more than two body lengths wide in every direction.
    const mDist = Math.hypot(c.eye[0], c.eye[1] - (m.y + m.h * 0.6), c.eye[2]);
    if (!this.fly && this.project(m.x, m.y + m.h * 0.55, m.z, v3)) {
      const k = this.canvas.width / this.canvas.clientWidth;
      const rad = ((m.h * 2.3 + 8) / mDist) * (this.canvas.height / 2 / Math.tan(FOV / 2));
      r.setHole(v3[0] * k, (this.canvas.clientHeight - v3[1]) * k, rad, mDist - m.h * 0.5, m.y + m.h * 0.3);
      // Remembered for aiming: what the window hides must not catch the pointer either.
      this.hole = { x: v3[0], y: v3[1], r: rad / k, dist: mDist - m.h * 0.5, y0: m.y + m.h * 0.3 };
    } else { r.setHole(0, 0, 0, 0, 0); this.hole = null; }

    // Static world. Chunks behind the camera or beyond the planet's visible cap are skipped.
    // A chunk is also skipped when it lies outside the cone the camera can see (with a generous margin
    // for its own size and for the way the planet's curvature shears it).
    const lim = Math.sqrt(c.cap2) + 24, cone = Math.tan(FOV / 2) * Math.hypot(1, this.aspect);
    this.drawn = 0;
    for (const gm of this.chunkMeshes.values()) {
      const dx = wrapDelta(gm.x + 16 - c.focusX, c.wrap), dz = wrapDelta(gm.z + 16 - c.focusZ, c.wrap);
      if (dx * dx + dz * dz > lim * lim) continue;
      const cy = gm.y + 16 - (dx * dx + dz * dz) * c.curv;
      const vx = dx - c.eye[0], vy = cy - c.eye[1], vz = dz - c.eye[2], along = vx * c.fwd[0] + vy * c.fwd[1] + vz * c.fwd[2];
      if (along < -30) continue;
      const side = Math.max(0, along) * cone + 66;
      if (vx * vx + vy * vy + vz * vz - along * along > side * side) continue;
      this.drawn++;
      r.drawMesh(gm, m4.translation(mat, dx - 16, gm.y, dz - 16), 1, null, gm.x, gm.y, gm.z);
    }

    // Falling fragments.
    for (const [b, e] of this.bodyMeshes) if (b.dead) { r.deleteMesh(e.mesh); this.bodyMeshes.delete(b); }
    for (const b of this.bodies.list) {
      const mesh = this.meshQueue.bodyMesh(b);
      if (!mesh) continue; // a large one on its way from a worker (its chunks still show it where it stood)
      m4.fromQuatPos(mat, b.q, wrapDelta(b.pos[0] - c.focusX, c.wrap), b.pos[1], wrapDelta(b.pos[2] - c.focusZ, c.wrap));
      m4.translate(mat, -b.com[0], -b.com[1], -b.com[2]);
      r.drawMesh(mesh, mat);
    }

    r.setHole(0, 0, 0, 0, 0);
    this.monsterBase(base, m.x, m.y, m.z, m.heading, m.h, m.pose);
    // A golden shimmer shows the moment in which the third press turns the jump into a ground pound.
    const tint = m.grow > 0 ? [1, 1, 0.8, m.grow * 0.7] : m.poundReady() ? [1, 0.85, 0.2, 0.3 + 0.2 * Math.sin(this.last * 0.03)] : this.absorb > 0.03 ? [1, 0.88, 0.35, this.absorb * 0.45] : null;
    this.drawMonster(base, m.pose, 1, tint);

    let o = this.debris.write(this.cubeBuf, 0);
    o = this.tools.write(this.cubeBuf, o, this.time);
    o = this.actors.write(this.cubeBuf, o, this.cubeBuf.length);
    o = this.traffic.write(this.cubeBuf, o, this.cubeBuf.length);
    o = this.spans.write(this.cubeBuf, o, this.cubeBuf.length);
    r.drawCubes(this.cubeBuf, o / 12);

    this.drawGhost();

    // Water last of the solid things, so that whatever stands in it shows through.
    for (let i = 0; i < this.waterTiles.length; i += 2) {
      const dx = wrapDelta(this.waterTiles[i] + 8 - c.focusX, c.wrap), dz = wrapDelta(this.waterTiles[i + 1] + 8 - c.focusZ, c.wrap);
      if (dx * dx + dz * dz < lim * lim) r.drawMesh(this.waterMesh, m4.translation(mat, dx - 8, this.world.water.level - 1, dz - 8), 0.6, this.world.water.tint ?? null, this.waterTiles[i], this.world.water.level - 1, this.waterTiles[i + 1]);
    }

    let n = this.fx.write(this.billBuf);
    const bb = this.billBuf;
    for (const ray of this.tools.rays) { // beams: chains of glowing dots with a bright end
      // The dots are lined up straight in the picture. The planet's bend, which the shader applies to
      // everything, is added to each dot beforehand, so that it cancels out and the beam stays straight.
      const ax = wrapDelta(ray.ax - c.focusX, c.wrap), az = wrapDelta(ray.az - c.focusZ, c.wrap), bx = wrapDelta(ray.bx - c.focusX, c.wrap), bz = wrapDelta(ray.bz - c.focusZ, c.wrap);
      const ay = ray.ay - (ax * ax + az * az) * c.curv, by = ray.by - (bx * bx + bz * bz) * c.curv;
      const len = Math.hypot(bx - ax, by - ay, bz - az), cnt = Math.min(140, Math.ceil(len / Math.max(1.2, ray.w * 1.1)));
      for (let i = 0; i <= cnt && n < bb.length / 9 - 1; i++, n++) {
        const t = i / cnt, q = n * 9, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        bb[q] = c.focusX + x; bb[q + 1] = ay + (by - ay) * t + (x * x + z * z) * c.curv; bb[q + 2] = c.focusZ + z;
        bb[q + 3] = i === cnt ? ray.w * 3 : ray.w * 1.4; bb[q + 4] = ray.r; bb[q + 5] = ray.g; bb[q + 6] = ray.b; bb[q + 7] = 0.95; bb[q + 8] = 0.5;
      }
    }
    n = this.actors.writeLights(bb, n);
    r.drawBillboards(bb, n);

    const st = this.activeSt;
    if (st && this.time - this.activeT < 2.5 && this.project((st.x0 + st.x1) / 2, st.top + 5, (st.z0 + st.z1) / 2, v3)) this.hud.showBuilding(st, v3[0], clamp(v3[1], 150, 1e4));
    else this.hud.showBuilding(null);
  }

  // Show, don't tell: a see-through twin of the creature performs the action that is being introduced.
  drawGhost() {
    const id = this.hud.hintId, m = this.monster, species = this.progress.species;
    if (!id || this.fly || ['worlds', 'next'].includes(id) || specOf(species).ghost === false || this.idle) return; // no twin for the aircraft, the helicopter and the tentacle
    const g = this.ghost, p = g.pose, dt = 1 / 60;
    g.t += dt;
    p.time += dt;
    p.walkAmp = 0; p.squash = 0; p.roar = 0; p.air = 0; p.look = 0;
    let ahead = 0, lift = 0;
    if (id === 'move') { ahead = ((g.t % 2.4) / 2.4) * m.h * 3; p.walk += dt * 9; p.walkAmp = 1; }
    else if (id === 'stomp') { const t = (g.t % 1.3) / 1.3; lift = Math.sin(t * Math.PI) * m.h * 1.6; p.air = 1; p.squash = t < 0.08 ? 1 : 0; }
    else if (id === 'roar') { p.roar = g.t % 2 < 1.2 ? 1 - (g.t % 2) / 1.2 : 0; }
    locomotion(p, species);
    // Light and heavy attack: the ghost plays the selected move, with a pause in between.
    if (id === 'light' || id === 'heavy') g.len = this.tools.poseFor(species, this.tool, id === 'heavy', p, g.t % (g.len + 0.6));
    const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw), side = m.h * 1.1;
    const x = m.x + fz * side + fx * ahead, z = m.z - fx * side + fz * ahead;
    this.monsterBase(base, x, this.world.heightBelow(x, z, m.y + m.h) + lift, z, this.camYaw, m.h, p);
    this.drawMonster(base, p, 0.4, [1, 1, 1, 0.55]);
  }
}
