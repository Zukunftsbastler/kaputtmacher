// Which chunk gets a new mesh when, and where it is computed.
//
// Meshing is the most expensive thing the game does: walking 32 voxels brings some 80 columns of chunks into the
// visible cap, and a collapse changes dozens at once. So it runs in two to three workers (mesh-worker.js). Each frame
// the chunks that wait for a mesh are sorted: changed by destruction ("hot", world.hot) before those that merely came
// into view, and the nearest first in both groups. Hot chunks right next to the focus are meshed here at once, within
// SYNC_MS, so that a blow shows its hole in the same picture; everything else is copied with its one-voxel border
// (padChunk) and sent to the least busy worker. Only one job per chunk is under way at a time; a chunk that changes
// again meanwhile stays in world.dirty and is sent again once the answer is in. Every job carries a ticket: an answer
// is used only if no newer mesh of that chunk has been made in the meantime.
//
// Falling fragments: small ones are meshed at once; a large one goes to a worker, and until its mesh is there the
// chunks it came out of are not meshed again either (they still show it where it stood), so that it never blinks.
// While a fragment changes shape, its old mesh is drawn until the new one has arrived.
//
// Without workers (an old browser, a stricter policy) everything is meshed here, within a budget per picture.

import { CS } from './world.js';
import { meshChunk, padChunk, meshVolume, PAD_SIZE } from './mesher.js';
import { TYPE_RGBA } from './materials.js';
import { wrapDelta } from './math.js';

const WORKER = './mesh-worker.js';
const NEAR = 56; // hot chunks closer than this to the focus (in voxels, horizontally) are meshed at once
const SYNC_MS = 2; // time per picture for meshing on the spot (at least one chunk is always done)
const COPY_MS = 4; // time per picture for copying chunks for the workers
const QUEUE = 48; // jobs waiting per worker at most
const BODY_SYNC = 24000; // fragments with up to this many cells (voxels of their box) are meshed at once
const HOLD_FRAMES = 6; // a fragment holds back the chunks it came from for at most this many pictures

export class MeshQueue {
  constructor(game) {
    this.g = game;
    this.workers = []; this.load = [];
    this.gen = 0; // bumped for every world: answers for an earlier one are dropped
    this.id = 0;
    this.ticket = new Map(); // chunk -> number of its newest mesh job
    this.flight = new Map(); // chunk -> number of its job under way in a worker
    this.bodyJobs = new Map(); // job number -> { body, version }
    this.answers = [];
    this.pads = [];
    this.pending = 0; // chunks in view that wait for a mesh (or are being meshed); for tests and ?perf=1
    const n = Math.max(1, Math.min(3, (navigator.hardwareConcurrency ?? 4) - 2));
    try {
      // Under the page's Trusted Types policy a worker address must come from a named policy; this one can only
      // ever produce the address of the meshing worker.
      const url = new URL(WORKER, import.meta.url), tt = globalThis.trustedTypes;
      const policy = tt?.createPolicy ? tt.createPolicy('kaputtmacher-mesh', { createScriptURL: () => url.href }) : null;
      for (let i = 0; i < n; i++) {
        const w = new Worker(policy ? policy.createScriptURL('') : url, { type: 'module' });
        w.onmessage = (e) => this.answers.push(e.data);
        w.onerror = (e) => { e.preventDefault?.(); this.fail(); };
        this.workers.push(w); this.load.push(0);
      }
    } catch {
      this.fail();
    }
  }

  // The workers cannot run: from now on everything is meshed here. Jobs under way are done again.
  fail() {
    for (const w of this.workers) w.terminate();
    this.workers = []; this.load = [];
    const w = this.g.world;
    if (w) for (const ci of this.flight.keys()) w.dirty.add(ci);
    this.flight.clear(); this.bodyJobs.clear();
    for (const e of this.g.bodyMeshes?.values() ?? []) e.waiting = -1;
  }

  // A new world: forget every job, tell the workers its colours (night worlds mark their glass, see Game.loadWorld).
  reset() {
    this.gen++;
    this.ticket.clear(); this.flight.clear(); this.bodyJobs.clear();
    this.load.fill(0);
    const rgba = TYPE_RGBA.slice();
    for (const w of this.workers) w.postMessage({ kind: 'rgba', rgba });
  }

  install(ci, data, quads) {
    const g = this.g, r = g.renderer, w = g.world;
    r.deleteMesh(g.chunkMeshes.get(ci));
    if (!quads) { g.chunkMeshes.delete(ci); return; }
    const gm = r.createMesh(data, quads);
    gm.x = (ci % w.ncx) * CS; gm.z = (Math.floor(ci / w.ncx) % w.ncz) * CS; gm.y = Math.floor(ci / (w.ncx * w.ncz)) * CS;
    g.chunkMeshes.set(ci, gm);
  }

  // What the workers have sent back since the last picture.
  collect() {
    const g = this.g;
    for (const a of this.answers) {
      if (a.gen !== this.gen) continue; // (load and pads were reset with the world)
      this.load[a.k]--;
      if (a.kind === 'chunk') {
        if (this.pads.length < 256) this.pads.push(a.pad);
        if (this.flight.get(a.ci) === a.id) this.flight.delete(a.ci);
        if (this.ticket.get(a.ci) === a.id && this.inReach(a.ci)) this.install(a.ci, a.data, a.quads);
      } else {
        const job = this.bodyJobs.get(a.id);
        this.bodyJobs.delete(a.id);
        const e = job && g.bodyMeshes.get(job.body);
        if (!e || job.body.dead || job.version !== e.waiting) continue;
        g.renderer.deleteMesh(e.mesh);
        e.mesh = a.quads ? g.renderer.createMesh(a.data, a.quads) : null;
        e.version = job.version; e.waiting = -1; e.hold = null;
      }
    }
    this.answers.length = 0;
  }

  // Horizontal distance² of a chunk from the focus, across the seam of a planet.
  dist2(ci) {
    const w = this.g.world, c = this.g.cam;
    const dx = wrapDelta((ci % w.ncx) * CS + 16 - c.focusX, c.wrap), dz = wrapDelta((Math.floor(ci / w.ncx) % w.ncz) * CS + 16 - c.focusZ, c.wrap);
    return dx * dx + dz * dz;
  }

  viewR() { const c = this.g.cam; return c.wrap ? Math.sqrt(c.cap2) + 40 : Infinity; }
  inReach(ci) { const R = this.viewR() + 70; return this.dist2(ci) <= R * R; }

  // Once per picture.
  update() {
    const g = this.g, w = g.world, dirty = w.dirty, hot = w.hot, c = g.cam;
    this.collect();
    // On a planet only the chunks inside the visible cap have a mesh at all; those that fall behind the horizon are released.
    const viewR = this.viewR(), view2 = viewR * viewR, drop2 = (viewR + 70) ** 2;
    if (c.wrap) for (const [ci, gm] of g.chunkMeshes) {
      const dx = wrapDelta(gm.x + 16 - c.focusX, c.wrap), dz = wrapDelta(gm.z + 16 - c.focusZ, c.wrap);
      if (dx * dx + dz * dz > drop2) { g.renderer.deleteMesh(gm); g.chunkMeshes.delete(ci); dirty.add(ci); }
    }
    const held = this.held();
    // The chunks that wait, in order: hot ones first, then the nearest.
    const list = [];
    for (const ci of dirty) {
      if (this.flight.has(ci) || (held && held.has(ci))) continue;
      const d2 = this.dist2(ci);
      if (d2 <= view2) list.push(ci, hot.has(ci) ? d2 : d2 + 1e12);
    }
    this.pending = list.length / 2 + this.flight.size;
    if (!list.length) return;
    const order = new Int32Array(list.length / 2);
    for (let i = 0; i < order.length; i++) order[i] = i * 2;
    order.sort((a, b) => list[a + 1] - list[b + 1]);
    const t0 = performance.now(), workers = this.workers.length, near2 = NEAR * NEAR, cap = QUEUE * workers;
    const budget = workers ? SYNC_MS : order.length > 150 ? 14 : 7;
    let local = 0, sent = 0, copyMs = 0;
    for (let k = 0; k < order.length; k++) {
      const ci = list[order[k]], key = list[order[k] + 1];
      const cx = ci % w.ncx, cz = Math.floor(ci / w.ncx) % w.ncz, cy = Math.floor(ci / (w.ncx * w.ncz));
      const inTime = local === 0 || performance.now() - t0 < budget;
      if (!workers && !inTime) break; // no workers and the budget is spent
      if (!workers || (key < near2 && inTime)) { // here and now
        const mesh = meshChunk(w, cx, cy, cz);
        this.ticket.set(ci, ++this.id);
        this.install(ci, mesh.data, mesh.quads);
        dirty.delete(ci); hot.delete(ci); local++;
        continue;
      }
      // To a worker, while there is room in their queues and time for copying.
      if (this.flight.size >= cap || copyMs > COPY_MS) break;
      const t = performance.now(), pad = this.pads.pop() ?? new Uint8Array(PAD_SIZE);
      dirty.delete(ci); hot.delete(ci);
      if (!padChunk(w, cx, cy, cz, pad)) { this.pads.push(pad); this.ticket.set(ci, ++this.id); this.install(ci, null, 0); continue; } // pure air
      let wk = 0;
      for (let i = 1; i < workers; i++) if (this.load[i] < this.load[wk]) wk = i;
      const id = ++this.id;
      this.ticket.set(ci, id); this.flight.set(ci, id); this.load[wk]++;
      this.workers[wk].postMessage({ kind: 'chunk', id, gen: this.gen, ci, k: wk, pad, maxRun: w.wrap ? 4 : 1024 }, [pad.buffer]);
      sent++;
      copyMs += performance.now() - t;
    }
    this.pending = Math.max(0, order.length - local - sent) + this.flight.size;
  }

  // Chunks held back by fragments whose first mesh is still on its way (see the top of this file).
  held() {
    let set = null;
    for (const e of this.g.bodyMeshes.values()) {
      if (!e.hold || e.mesh) continue;
      if (++e.holdT > HOLD_FRAMES) { e.hold = null; continue; }
      set ??= new Set();
      for (const ci of e.hold) set.add(ci);
    }
    return set;
  }

  // The mesh to draw for a falling fragment: made now if it is small, else asked from a worker. Until a worker's
  // answer is in, the previous shape is drawn (or nothing yet, while its chunks still show it where it stood).
  bodyMesh(b) {
    const g = this.g, r = g.renderer;
    let e = g.bodyMeshes.get(b);
    if (e && e.version === b.version) return e.mesh;
    if (!e) { e = { mesh: null, version: -1, waiting: -1, hold: null, holdT: 0 }; g.bodyMeshes.set(b, e); }
    if (!this.workers.length || b.sx * b.sy * b.sz <= BODY_SYNC) {
      const m = meshVolume(b.vox, b.sx, b.sy, b.sz);
      r.deleteMesh(e.mesh);
      e.mesh = m.quads ? r.createMesh(m.data, m.quads) : null;
      e.version = b.version; e.waiting = -1; e.hold = null;
      return e.mesh;
    }
    if (e.waiting !== b.version) {
      let wk = 0;
      for (let i = 1; i < this.workers.length; i++) if (this.load[i] < this.load[wk]) wk = i;
      const id = ++this.id;
      this.bodyJobs.set(id, { body: b, version: b.version });
      this.load[wk]++;
      this.workers[wk].postMessage({ kind: 'body', id, gen: this.gen, k: wk, vox: b.vox, sx: b.sx, sy: b.sy, sz: b.sz });
      e.waiting = b.version;
      if (!e.mesh && b.home) e.hold = this.chunksOf(b.home), e.holdT = 0;
    }
    return e.mesh;
  }

  // The chunks a box of the world (x0, y0, z0, x1, y1, z1, unwrapped) touches.
  chunksOf(box) {
    const w = this.g.world, out = [];
    const c0 = Math.floor(box[0] / CS) - 1, c1 = Math.floor(box[3] / CS) + 1, y0 = Math.max(0, Math.floor(box[1] / CS) - 1), y1 = Math.min(w.ncy - 1, Math.floor(box[4] / CS) + 1);
    const z0 = Math.floor(box[2] / CS) - 1, z1 = Math.floor(box[5] / CS) + 1;
    for (let cy = y0; cy <= y1; cy++) for (let cz = z0; cz <= z1; cz++) for (let cx = c0; cx <= c1; cx++) {
      const x = w.wrap ? ((cx % w.ncx) + w.ncx) % w.ncx : cx, z = w.wrap ? ((cz % w.ncz) + w.ncz) % w.ncz : cz;
      if (x >= 0 && z >= 0 && x < w.ncx && z < w.ncz) out.push(x + w.ncx * (z + w.ncz * cy));
    }
    return out;
  }
}
