// Static voxel grid, stored in 32^3 chunks. A chunk that holds a single value everywhere
// (air, solid earth) is kept as one byte instead of an array. Every change goes through set().

import { T, TYPE_FLAGS, TYPE_MAT, MAT, F_TERRAIN, isCounted } from './materials.js';
import { VOXEL_STRENGTH, VOXEL_MASS, tauOf } from './stability.js';

export const CS = 32;
const CB = 5, CM = 31, CVOL = CS * CS * CS;

export class World {
  // sx/sy/sz must be multiples of 32; wrapping worlds need power-of-two sx/sz.
  constructor(sx, sy, sz, wrap) {
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.wrap = wrap;
    this.mx = sx - 1; this.mz = sz - 1;
    this.ncx = sx >> CB; this.ncy = sy >> CB; this.ncz = sz >> CB;
    const n = this.ncx * this.ncy * this.ncz;
    this.chunks = new Array(n).fill(null);
    this.uniform = new Uint8Array(n);
    this.dirty = new Set();
    this.touched = []; // buildings that lost voxels since the last stability check
    this.footprint = new Uint16Array(sx * sz); // column -> structure id
    this.structures = [{ id: 0, kind: 'misc', icon: '', total: 0, remaining: 0, done: true, counted: false }];
    this.total = 0; this.remaining = 0;
    this.generating = true;
    this.onDestroyed = null; // (type, x, y, z, structure|null)
    this.unit = 2; // voxels per metre
    this.monsterBase = 8; // height of a stage-1 monster in voxels
    this.spawn = [sx / 2, 0, sz / 2];
    this.sky = [[0.45, 0.68, 0.95], [0.82, 0.91, 0.98]];
  }

  get(x, y, z) {
    if (y < 0) return T.BEDROCK;
    if (y >= this.sy) return 0;
    if (this.wrap) { x &= this.mx; z &= this.mz; }
    else if (x < 0 || z < 0 || x >= this.sx || z >= this.sz) return 0;
    const ci = (x >> CB) + this.ncx * ((z >> CB) + this.ncz * (y >> CB));
    const c = this.chunks[ci];
    return c ? c[(x & CM) | ((z & CM) << CB) | ((y & CM) << (CB * 2))] : this.uniform[ci];
  }

  set(x, y, z, t) {
    if (y < 0 || y >= this.sy) return;
    if (this.wrap) { x &= this.mx; z &= this.mz; }
    else if (x < 0 || z < 0 || x >= this.sx || z >= this.sz) return;
    const cx = x >> CB, cy = y >> CB, cz = z >> CB;
    const ci = cx + this.ncx * (cz + this.ncz * cy);
    let c = this.chunks[ci];
    const li = (x & CM) | ((z & CM) << CB) | ((y & CM) << (CB * 2));
    const old = c ? c[li] : this.uniform[ci];
    if (old === t) return;
    if (!c) {
      c = this.chunks[ci] = new Uint8Array(CVOL);
      if (this.uniform[ci]) c.fill(this.uniform[ci]);
    }
    c[li] = t;
    if (this.generating) return;

    this.dirty.add(ci);
    const lx = x & CM, ly = y & CM, lz = z & CM;
    if (lx === 0) this.markChunk(cx - 1, cy, cz); else if (lx === CM) this.markChunk(cx + 1, cy, cz);
    if (ly === 0) this.markChunk(cx, cy - 1, cz); else if (ly === CM) this.markChunk(cx, cy + 1, cz);
    if (lz === 0) this.markChunk(cx, cy, cz - 1); else if (lz === CM) this.markChunk(cx, cy, cz + 1);

    if (old && old < 128) {
      let st = null;
      if (!(TYPE_FLAGS[old] & F_TERRAIN)) {
        st = this.structures[this.footprint[x + this.sx * z]];
        st.remaining--;
        if (st.counted) this.remaining--;
        if (st.S) { // keep the storey's load-bearing strength and weight up to date
          st.S[y] -= VOXEL_STRENGTH[old]; st.M[y] -= VOXEL_MASS[old];
          if (!st.dirty) { st.dirty = true; this.touched.push(st); }
        }
      }
      if (this.onDestroyed) this.onDestroyed(old, x, y, z, st);
    }
  }

  markChunk(cx, cy, cz) {
    if (cy < 0 || cy >= this.ncy) return;
    if (this.wrap) { cx = (cx + this.ncx) % this.ncx; cz = (cz + this.ncz) % this.ncz; }
    else if (cx < 0 || cz < 0 || cx >= this.ncx || cz >= this.ncz) return;
    this.dirty.add(cx + this.ncx * (cz + this.ncz * cy));
  }

  // Flat voxel index, used by the support search.
  index(x, y, z) {
    if (this.wrap) { x &= this.mx; z &= this.mz; }
    return x + this.sx * (z + this.sz * y);
  }

  // Y of the first free cell above the highest solid voxel at or below y0.
  heightBelow(x, z, y0) {
    x = Math.floor(x); z = Math.floor(z);
    for (let y = Math.min(Math.floor(y0), this.sy - 1); y >= 0; y--) if (this.get(x, y, z)) return y + 1;
    return 0;
  }

  // Generation helpers -------------------------------------------------------

  addStructure(kind, icon, counted = true, grabbable = false) {
    const st = { id: this.structures.length, kind, icon, total: 0, remaining: 0, done: false, counted, grabbable,
      x0: 1e9, z0: 1e9, x1: -1e9, z1: -1e9, top: 0, y0: 1e9,
      // Stability (buildings only): strength S and mass M per storey, S0 as built, tau = share that must remain.
      S: null, S0: null, M: null, M0: 0, tau: 0.5, shove: 0, weak: 0, failing: null, dirty: false, gen: 0, fell: false };
    this.structures.push(st);
    return st;
  }

  // Ends generation: counts every structure, collapses single-value chunks, marks everything for meshing.
  finalize() {
    const fp = this.footprint, sts = this.structures;
    for (let ci = 0; ci < this.chunks.length; ci++) {
      const c = this.chunks[ci];
      if (!c) { if (this.uniform[ci]) this.dirty.add(ci); continue; }
      const first = c[0];
      let same = true;
      const cx = ci % this.ncx, cz = Math.floor(ci / this.ncx) % this.ncz, cy = Math.floor(ci / (this.ncx * this.ncz));
      for (let li = 0; li < CVOL; li++) {
        const t = c[li];
        if (t !== first) same = false;
        if (!isCounted(t)) continue;
        const x = (cx << CB) + (li & CM), z = (cz << CB) + ((li >> CB) & CM), y = (cy << CB) + (li >> (CB * 2));
        const st = sts[fp[x + this.sx * z]];
        st.total++;
        if (st.id) {
          if (x < st.x0) st.x0 = x; if (x > st.x1) st.x1 = x;
          if (z < st.z0) st.z0 = z; if (z > st.z1) st.z1 = z;
          if (y > st.top) st.top = y;
          if (y < st.y0) st.y0 = y;
          if (st.major) {
            if (!st.S) { st.S = new Float32Array(this.sy); st.M = new Float32Array(this.sy); st.matW = new Float32Array(16); }
            st.S[y] += VOXEL_STRENGTH[t]; st.M[y] += VOXEL_MASS[t];
            if (TYPE_MAT[t] !== MAT.GLASS) st.matW[TYPE_MAT[t]] += VOXEL_STRENGTH[t];
          }
        }
      }
      if (same) { this.chunks[ci] = null; this.uniform[ci] = first; }
      if (!same || first) this.dirty.add(ci);
    }
    this.total = 0;
    for (const st of sts) {
      st.remaining = st.total;
      if (st.counted) this.total += st.total;
      if (!st.total) st.done = true;
      if (st.S) {
        st.S0 = st.S.slice();
        st.M0 = st.M.reduce((a, b) => a + b, 0) || 1;
        // The material that carries most of the building decides how early it gives way.
        let best = 0;
        for (let m = 1; m < st.matW.length; m++) if (st.matW[m] > st.matW[best]) best = m;
        st.tau = tauOf(best);
      }
    }
    this.remaining = this.total;
    this.generating = false;
  }

  memoryBytes() {
    let n = this.footprint.byteLength + this.uniform.byteLength;
    for (const c of this.chunks) if (c) n += CVOL;
    return n;
  }
}
