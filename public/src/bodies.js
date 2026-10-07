// Rigid fragments: groups of voxels that fell out of the grid. They tumble, hit the world,
// break further on impact and are written back into the grid as rubble once they rest.

import { quat, wrapDelta, clamp } from './math.js';
import { TYPE_MAT, MATS, MAT, RUBBLE } from './materials.js';
import { GRAVITY, launch } from './particles.js';

const MIN_SAMPLES = 70, MAX_SAMPLES = 300; // collision probe points per body, more for big ones
const MAX_BODIES = 36;
const MIN_BODY = 5; // smaller groups become loose cubes straight away

const tmp = [0, 0, 0], tmp2 = [0, 0, 0];
let cells = new Int32Array(4 * 4096); // scratch: x, y, z, type
let label = new Uint8Array(1 << 16), order = new Int32Array(1 << 16);
const MAX_HITS = 5, hits = new Float32Array(MAX_HITS * 4);

export class Body {
  constructor(sx, sy, sz) {
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.vox = new Uint8Array(sx * sy * sz);
    this.pos = [0, 0, 0]; // world position of the centre of mass
    this.com = [0, 0, 0]; // centre of mass in local voxel coordinates
    this.q = [0, 0, 0, 1];
    this.v = [0, 0, 0];
    this.w = [0, 0, 0];
    this.count = 0; this.mass = 1; this.invMass = 1; this.invI = 1; this.radius = 1;
    this.samples = new Int16Array(0);
    this.rest = 0; this.age = 0; this.cooldown = 0;
    this.dirty = false; this.dead = false; this.kinematic = false; this.thrown = false;
    this.version = 0; // bumped whenever the voxels change, so the renderer rebuilds the mesh
  }
}

export class Bodies {
  constructor(game) {
    this.g = game;
    this.list = [];
    this.hitOpt = { dx: 0, dy: 0.2, dz: 0, impulse: 0, debris: 24, spare: true };
  }

  clear() {
    for (const b of this.list) b.dead = true;
    this.list.length = 0;
  }

  // Recomputes mass, centre of mass and probe points. Returns false if the body is empty.
  finalize(b) {
    const { sx, sy, sz, vox } = b;
    let n = 0, mass = 0, cx = 0, cy = 0, cz = 0, surface = 0;
    const tally = (b.tally ??= new Int32Array(MATS.length)).fill(0); // voxels per material, for the collapse sounds
    for (let y = 0, i = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++, i++) {
      const t = vox[i];
      if (!t) continue;
      const m = MATS[TYPE_MAT[t]].density;
      tally[TYPE_MAT[t]]++;
      n++; mass += m; cx += (x + 0.5) * m; cy += (y + 0.5) * m; cz += (z + 0.5) * m;
      if (this.isSurface(b, x, y, z, i)) surface++;
    }
    if (!n) return false;
    const old0 = b.com[0], old1 = b.com[1], old2 = b.com[2];
    b.count = n; b.mass = mass; b.invMass = 1 / mass;
    b.com[0] = cx / mass; b.com[1] = cy / mass; b.com[2] = cz / mass;
    if (b.version) {
      // Voxels were removed: keep the remaining ones where they are in the world.
      quat.rotate(b.q, b.com[0] - old0, b.com[1] - old1, b.com[2] - old2, tmp);
      b.pos[0] += tmp[0]; b.pos[1] += tmp[1]; b.pos[2] += tmp[2];
    }
    b.invI = 14 / (mass * (sx * sx + sy * sy + sz * sz));
    b.radius = Math.hypot(Math.max(b.com[0], sx - b.com[0]), Math.max(b.com[1], sy - b.com[1]), Math.max(b.com[2], sz - b.com[2]));
    const stride = Math.ceil(surface / clamp(surface / 8, MIN_SAMPLES, MAX_SAMPLES));
    b.samples = new Int16Array(Math.ceil(surface / stride) * 3);
    let k = 0, s = 0;
    for (let y = 0, i = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++, i++) {
      if (!vox[i] || !this.isSurface(b, x, y, z, i)) continue;
      if (k++ % stride === 0) { b.samples[s++] = x; b.samples[s++] = y; b.samples[s++] = z; }
    }
    b.version++;
    return true;
  }

  isSurface(b, x, y, z, i) {
    const { sx, sy, sz, vox } = b;
    return x === 0 || y === 0 || z === 0 || x === sx - 1 || y === sy - 1 || z === sz - 1 ||
      !vox[i - 1] || !vox[i + 1] || !vox[i - sx] || !vox[i + sx] || !vox[i - sx * sz] || !vox[i + sx * sz];
  }

  // Builds a body from n cells (x, y, z, type) in the scratch buffer, in unwrapped world coordinates.
  fromCells(n) {
    let x0 = 1e9, y0 = 1e9, z0 = 1e9, x1 = -1e9, y1 = -1e9, z1 = -1e9;
    for (let i = 0; i < n * 4; i += 4) {
      const x = cells[i], y = cells[i + 1], z = cells[i + 2];
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (z < z0) z0 = z; if (z > z1) z1 = z;
    }
    const b = new Body(x1 - x0 + 1, y1 - y0 + 1, z1 - z0 + 1);
    for (let i = 0; i < n * 4; i += 4)
      b.vox[cells[i] - x0 + b.sx * (cells[i + 2] - z0 + b.sz * (cells[i + 1] - y0))] = cells[i + 3];
    this.finalize(b);
    b.pos[0] = x0 + b.com[0]; b.pos[1] = y0 + b.com[1]; b.pos[2] = z0 + b.com[2];
    this.list.push(b);
    return b;
  }

  reserve(n) {
    if (cells.length < n * 4) cells = new Int32Array(n * 4 * 2);
    return cells;
  }

  // Called by the support check with flat world indices of an unsupported group.
  detach(list, n) {
    const g = this.g, w = g.world, sx = w.sx, layer = sx * w.sz, size = w.wrap ? sx : 0;
    this.reserve(n);
    let fx = 0, fz = 0;
    for (let k = 0; k < n; k++) {
      const i = list[k], y = (i / layer) | 0, rem = i - y * layer, z = (rem / sx) | 0, x = rem - z * sx;
      if (k === 0) { fx = x; fz = z; }
      const o = k * 4;
      // Unwrap around the first voxel so a piece that straddles the world seam stays in one piece.
      cells[o] = fx + wrapDelta(x - fx, size); cells[o + 1] = y; cells[o + 2] = fz + wrapDelta(z - fz, size);
      cells[o + 3] = w.get(x, y, z);
      w.set(x, y, z, 0);
    }
    const hit = g.lastHit;
    if (n < MIN_BODY) {
      for (let o = 0; o < n * 4; o += 4)
        g.debris.spawn(cells[o] + 0.5, cells[o + 1] + 0.5, cells[o + 2] + 0.5, hit.dx * 6, hit.pop * g.rng() + 6, hit.dz * 6, cells[o + 3]);
      return;
    }
    const b = this.fromCells(n);
    const rnd = g.rng;
    // A gentle nudge away from the last hit makes pieces topple instead of dropping dead straight.
    // Tall pieces get just enough of a shove to tip over like a tower of blocks:
    // the speed that lifts the centre of mass over the edge of the base.
    let vk = 2, wk = 0.25;
    if (b.sy > 1.4 * Math.max(b.sx, b.sz)) {
      const base = Math.min(b.sx, b.sz), lift = 0.5 * Math.hypot(base, b.sy) - 0.5 * b.sy;
      vk = 1.25 * Math.sqrt(1.5 * GRAVITY * lift) + 1;
      wk = vk / (b.sy * 0.5);
    }
    const hl = Math.hypot(hit.dx, hit.dz) || 1, hx = hit.dx / hl, hz = hit.dz / hl;
    b.w[0] = hz * wk + (rnd() - 0.5) * 0.1; b.w[1] = (rnd() - 0.5) * 0.1; b.w[2] = -hx * wk + (rnd() - 0.5) * 0.1;
    // Explosions and stomps toss loosened pieces into the air; the bigger the piece, the smaller the hop.
    b.v[0] = hx * vk; b.v[1] = hit.pop * (0.5 + 0.5 * rnd()) * Math.min(1, Math.sqrt(3000 / n)); b.v[2] = hz * vk;
    if (n > 600) g.onCollapse(b);
  }

  toWorld(b, lx, ly, lz, out) {
    quat.rotate(b.q, lx - b.com[0], ly - b.com[1], lz - b.com[2], out);
    out[0] += b.pos[0]; out[1] += b.pos[1]; out[2] += b.pos[2];
    return out;
  }

  remove(b) {
    b.dead = true;
    const i = this.list.indexOf(b);
    if (i >= 0) this.list.splice(i, 1);
  }

  update(dt) {
    const g = this.g, w = g.world;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      if (!b.kinematic) this.step(b, dt);
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const b = this.list[i];
      if (b.dead) continue;
      if (b.dirty) { b.dirty = false; this.resplit(b); continue; }
      if (b.kinematic) continue;
      if (b.pos[1] < -40 || (!w.wrap && (b.pos[0] < -60 || b.pos[2] < -60 || b.pos[0] > w.sx + 60 || b.pos[2] > w.sz + 60))) { this.remove(b); continue; }
      // Small bits do not get to rattle around for long.
      if (b.rest > 0.4 || b.age > (b.count < 60 ? 2.5 : b.count < 600 ? 7 : 14)) this.bake(b);
    }
    // Too many pieces at once: the smallest ones stop being simulated.
    while (this.list.length > MAX_BODIES) {
      let small = null;
      for (const b of this.list) if (!b.kinematic && (!small || b.count < small.count)) small = b;
      if (!small) break;
      if (small.count < 400) this.toDebris(small); else this.bake(small);
    }
  }

  step(b, dt) {
    const g = this.g, w = g.world, p = tmp;
    const { pos, v, q, samples } = b, av = b.w;
    b.age += dt;
    b.cooldown -= dt;
    const sub = clamp(Math.ceil((Math.hypot(v[0], v[1], v[2]) * dt) / 0.8), 1, 4), h = dt / sub;
    let contacts = 0, hitSpeed = 0, nHits = 0;
    for (let s = 0; s < sub; s++) {
      v[1] -= GRAVITY * h;
      pos[0] += v[0] * h; pos[1] += v[1] * h; pos[2] += v[2] * h;
      quat.integrate(q, av[0], av[1], av[2], h);
      let pushX = 0, pushY = 0, pushZ = 0;
      for (let k = 0; k < samples.length; k += 3) {
        this.toWorld(b, samples[k] + 0.5, samples[k + 1] + 0.5, samples[k + 2] + 0.5, p);
        const cx = Math.floor(p[0]), cy = Math.floor(p[1]), cz = Math.floor(p[2]);
        if (!w.get(cx, cy, cz)) continue;
        // Contact normal: points towards the free neighbours of the touched cell.
        let nx = (w.get(cx + 1, cy, cz) ? 0 : 1) - (w.get(cx - 1, cy, cz) ? 0 : 1);
        let ny = (w.get(cx, cy + 1, cz) ? 0 : 1) - (w.get(cx, cy - 1, cz) ? 0 : 1);
        let nz = (w.get(cx, cy, cz + 1) ? 0 : 1) - (w.get(cx, cy, cz - 1) ? 0 : 1);
        let nl = Math.hypot(nx, ny, nz);
        if (nl < 0.5) { nx = 0; ny = 1; nz = 0; nl = 1; }
        nx /= nl; ny /= nl; nz /= nl;
        contacts++;
        pushX += nx; pushY += ny; pushZ += nz;
        const rx = p[0] - pos[0], ry = p[1] - pos[1], rz = p[2] - pos[2];
        const vx = v[0] + av[1] * rz - av[2] * ry, vy = v[1] + av[2] * rx - av[0] * rz, vz = v[2] + av[0] * ry - av[1] * rx;
        const vn = vx * nx + vy * ny + vz * nz;
        if (vn >= 0) continue;
        if (-vn > 7) {
          if (-vn > hitSpeed) hitSpeed = -vn;
          // Remember up to MAX_HITS hard contacts, spread over the whole contact area.
          const slot = nHits < MAX_HITS ? nHits : (g.rng() * (nHits + 1)) | 0;
          if (slot < MAX_HITS) { hits[slot * 4] = p[0]; hits[slot * 4 + 1] = p[1]; hits[slot * 4 + 2] = p[2]; hits[slot * 4 + 3] = -vn; }
          nHits++;
        }
        const cnx = ry * nz - rz * ny, cny = rz * nx - rx * nz, cnz = rx * ny - ry * nx;
        const j = (-1.05 * vn) / (b.invMass + b.invI * (cnx * cnx + cny * cny + cnz * cnz));
        v[0] += nx * j * b.invMass; v[1] += ny * j * b.invMass; v[2] += nz * j * b.invMass;
        av[0] += cnx * j * b.invI; av[1] += cny * j * b.invI; av[2] += cnz * j * b.invI;
        // Friction against the sliding direction.
        const tx = vx - nx * vn, ty = vy - ny * vn, tz = vz - nz * vn, tl = Math.hypot(tx, ty, tz);
        if (tl > 1e-3) {
          const ux = tx / tl, uy = ty / tl, uz = tz / tl;
          const ctx = ry * uz - rz * uy, cty = rz * ux - rx * uz, ctz = rx * uy - ry * ux;
          const jt = Math.min(0.6 * j, tl / (b.invMass + b.invI * (ctx * ctx + cty * cty + ctz * ctz)));
          v[0] -= ux * jt * b.invMass; v[1] -= uy * jt * b.invMass; v[2] -= uz * jt * b.invMass;
          av[0] -= ctx * jt * b.invI; av[1] -= cty * jt * b.invI; av[2] -= ctz * jt * b.invI;
        }
      }
      if (contacts) {
        const pl = Math.hypot(pushX, pushY, pushZ) || 1, amt = Math.min(0.3, 0.05 * contacts) / pl;
        pos[0] += pushX * amt; pos[1] += pushY * amt; pos[2] += pushZ * amt;
        v[0] *= 0.99; v[2] *= 0.99;
        av[0] *= 0.975; av[1] *= 0.975; av[2] *= 0.975;
      }
    }
    if (w.wrap) { pos[0] = ((pos[0] % w.sx) + w.sx) % w.sx; pos[2] = ((pos[2] % w.sz) + w.sz) % w.sz; }

    if (nHits && b.cooldown <= 0) {
      // Every hard contact works like a new hit on both the world and the fragment itself.
      const sp = Math.hypot(v[0], v[1], v[2]) || 1, size = Math.cbrt(b.mass), opt = this.hitOpt;
      b.cooldown = 0.06;
      g.lastHit.dx = v[0] / sp; g.lastHit.dz = v[2] / sp;
      opt.dx = v[0] / sp; opt.dz = v[2] / sp; opt.impulse = Math.min(hitSpeed * 0.9, launch(60)); opt.spare = !b.thrown;
      for (let k = 0; k < Math.min(nHits, MAX_HITS); k++) {
        const hs = hits[k * 4 + 3];
        const radius = clamp(size * 0.3 * Math.min(1.6, hs / 14), 1.3, 13);
        const power = clamp(hs * 0.5 * (b.thrown ? 2.4 : 1) + size * 0.12, 2, 34);
        g.destruction.sphere(hits[k * 4], hits[k * 4 + 1], hits[k * 4 + 2], radius, power, opt);
      }
      g.onImpact(hits[0], hits[1], hits[2], b, hitSpeed);
      if (b.hard) { b.hard = false; g.explode(hits[0], hits[1], hits[2], clamp(size * 0.3, 4, 14), 14); }
      v[0] *= 0.8; v[1] *= 0.8; v[2] *= 0.8;
    }
    const slow = v[0] * v[0] + v[1] * v[1] + v[2] * v[2] < 2.5 && av[0] * av[0] + av[1] * av[1] + av[2] * av[2] < 1;
    b.rest = contacts && slow ? b.rest + dt : 0;
  }

  // Carves a sphere out of every fragment it touches. Returns the number of removed voxels.
  damageSphere(cx, cy, cz, r, power, o, mc) {
    const g = this.g, size = g.world.wrap ? g.world.sx : 0, des = g.destruction, c = tmp2;
    let removed = 0;
    for (const b of this.list) {
      if (b.kinematic) continue;
      const dx = wrapDelta(cx - b.pos[0], size), dy = cy - b.pos[1], dz = wrapDelta(cz - b.pos[2], size);
      const lim = r + b.radius;
      if (dx * dx + dy * dy + dz * dz > lim * lim) continue;
      quat.unrotate(b.q, dx, dy, dz, c);
      const lx = c[0] + b.com[0], ly = c[1] + b.com[1], lz = c[2] + b.com[2];
      const x0 = Math.max(0, Math.floor(lx - r)), x1 = Math.min(b.sx - 1, Math.ceil(lx + r));
      const y0 = Math.max(0, Math.floor(ly - r)), y1 = Math.min(b.sy - 1, Math.ceil(ly + r));
      const z0 = Math.max(0, Math.floor(lz - r)), z1 = Math.min(b.sz - 1, Math.ceil(lz + r));
      let hit = 0;
      for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const i = x + b.sx * (z + b.sz * y), t = b.vox[i];
        if (!t) continue;
        const d = Math.hypot(x + 0.5 - lx, y + 0.5 - ly, z + 0.5 - lz);
        if (d > r) continue;
        const m = TYPE_MAT[t];
        if (!des.breaks(MATS[m].strength, power * (1 - (0.6 * d) / r))) continue;
        b.vox[i] = 0;
        hit++;
        mc[m]++;
        if (m === MAT.EXPLOSIVE) g.queueExplosion(cx, cy, cz);
        if (g.rng() < 0.12) {
          this.toWorld(b, x + 0.5, y + 0.5, z + 0.5, tmp);
          g.debris.spawn(tmp[0], tmp[1], tmp[2], b.v[0] + (g.rng() - 0.5) * 8, b.v[1] + g.rng() * 6, b.v[2] + (g.rng() - 0.5) * 8, t);
        }
      }
      if (hit) { b.dirty = true; removed += hit; }
    }
    return removed;
  }

  // After damage: split into connected pieces. Each piece keeps its place and motion.
  resplit(b) {
    const { sx, sy, sz, vox } = b, vol = vox.length, g = this.g;
    if (label.length < vol) { label = new Uint8Array(vol * 2); order = new Int32Array(vol * 2); }
    label.fill(0, 0, vol);
    const comps = [];
    let q = 0;
    for (let i0 = 0; i0 < vol; i0++) {
      if (!vox[i0] || label[i0]) continue;
      const start = q;
      let head = q;
      order[q++] = i0; label[i0] = 1;
      while (head < q) {
        const i = order[head++], y = (i / (sx * sz)) | 0, rem = i - y * sx * sz, z = (rem / sx) | 0, x = rem - z * sx;
        if (x > 0 && vox[i - 1] && !label[i - 1]) { label[i - 1] = 1; order[q++] = i - 1; }
        if (x < sx - 1 && vox[i + 1] && !label[i + 1]) { label[i + 1] = 1; order[q++] = i + 1; }
        if (z > 0 && vox[i - sx] && !label[i - sx]) { label[i - sx] = 1; order[q++] = i - sx; }
        if (z < sz - 1 && vox[i + sx] && !label[i + sx]) { label[i + sx] = 1; order[q++] = i + sx; }
        if (y > 0 && vox[i - sx * sz] && !label[i - sx * sz]) { label[i - sx * sz] = 1; order[q++] = i - sx * sz; }
        if (y < sy - 1 && vox[i + sx * sz] && !label[i + sx * sz]) { label[i + sx * sz] = 1; order[q++] = i + sx * sz; }
      }
      comps.push(start, q - start);
    }
    if (comps.length === 2 && comps[1] >= MIN_BODY) { this.finalize(b); return; }
    this.remove(b);
    for (let c = 0; c < comps.length; c += 2) {
      const start = comps[c], n = comps[c + 1];
      if (n < MIN_BODY) {
        for (let k = start; k < start + n; k++) this.spill(b, order[k]);
        continue;
      }
      this.reserve(n);
      for (let k = 0; k < n; k++) {
        const i = order[start + k], y = (i / (sx * sz)) | 0, rem = i - y * sx * sz, z = (rem / sx) | 0;
        cells[k * 4] = rem - z * sx; cells[k * 4 + 1] = y; cells[k * 4 + 2] = z; cells[k * 4 + 3] = vox[i];
      }
      const nb = this.fromCells(n);
      // fromCells left nb.pos in the old body's local grid; move it into the world.
      this.toWorld(b, nb.pos[0], nb.pos[1], nb.pos[2], tmp);
      const rx = tmp[0] - b.pos[0], ry = tmp[1] - b.pos[1], rz = tmp[2] - b.pos[2];
      nb.pos[0] = tmp[0]; nb.pos[1] = tmp[1]; nb.pos[2] = tmp[2];
      nb.q[0] = b.q[0]; nb.q[1] = b.q[1]; nb.q[2] = b.q[2]; nb.q[3] = b.q[3];
      nb.v[0] = b.v[0] + b.w[1] * rz - b.w[2] * ry; nb.v[1] = b.v[1] + b.w[2] * rx - b.w[0] * rz; nb.v[2] = b.v[2] + b.w[0] * ry - b.w[1] * rx;
      nb.w[0] = b.w[0]; nb.w[1] = b.w[1]; nb.w[2] = b.w[2];
      nb.age = b.age * 0.5; nb.thrown = b.thrown; nb.cooldown = 0.05;
    }
  }

  // Turns one voxel of a body into a loose cube.
  spill(b, i) {
    const y = (i / (b.sx * b.sz)) | 0, rem = i - y * b.sx * b.sz, z = (rem / b.sx) | 0, x = rem - z * b.sx, r = this.g.rng;
    this.toWorld(b, x + 0.5, y + 0.5, z + 0.5, tmp);
    this.g.debris.spawn(tmp[0], tmp[1], tmp[2], b.v[0] + (r() - 0.5) * 5, b.v[1] + r() * 3, b.v[2] + (r() - 0.5) * 5, b.vox[i]);
  }

  toDebris(b) {
    const p = Math.min(1, 160 / b.count);
    for (let i = 0; i < b.vox.length; i++) if (b.vox[i] && this.g.rng() < p) this.spill(b, i);
    this.remove(b);
  }

  // Writes a resting body back into the static grid as rubble.
  bake(b) {
    const w = this.g.world, { sx, sy, sz, vox } = b, small = b.count < 60; // small wreckage is tidied away later
    for (let y = 0, i = 0; y < sy; y++) for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++, i++) {
      if (!vox[i]) continue;
      this.toWorld(b, x + 0.5, y + 0.5, z + 0.5, tmp);
      const wx = Math.floor(tmp[0]), wy = Math.floor(tmp[1]), wz = Math.floor(tmp[2]);
      if (wy >= 0 && !w.get(wx, wy, wz)) { w.set(wx, wy, wz, vox[i] | RUBBLE); if (small) this.g.sweeper.add(wx, wy, wz); }
    }
    this.remove(b);
  }

  // Returns the fragment that is solid at a world point, or null.
  solidAt(x, y, z) {
    const size = this.g.world.wrap ? this.g.world.sx : 0, c = tmp2;
    for (const b of this.list) {
      if (b.kinematic) continue;
      const dx = wrapDelta(x - b.pos[0], size), dy = y - b.pos[1], dz = wrapDelta(z - b.pos[2], size);
      if (dx * dx + dy * dy + dz * dz > b.radius * b.radius) continue;
      quat.unrotate(b.q, dx, dy, dz, c);
      const lx = Math.floor(c[0] + b.com[0]), ly = Math.floor(c[1] + b.com[1]), lz = Math.floor(c[2] + b.com[2]);
      if (lx < 0 || ly < 0 || lz < 0 || lx >= b.sx || ly >= b.sy || lz >= b.sz) continue;
      if (b.vox[lx + b.sx * (lz + b.sz * ly)]) return b;
    }
    return null;
  }
}
