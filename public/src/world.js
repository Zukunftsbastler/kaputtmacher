// Static voxel grid, stored in 32^3 chunks. A chunk that holds a single value everywhere
// (air, solid earth) is kept as one byte instead of an array. Every change goes through set().

import { T, TYPE_FLAGS, TYPE_MAT, MAT, F_TERRAIN, isCounted } from './materials.js';
import { VOXEL_STRENGTH, VOXEL_MASS, tauOf } from './stability.js';

export const CS = 32;
const CB = 5, CM = 31, CVOL = CS * CS * CS;
// The twenty neighbours that share only an edge or a corner with a voxel, as x, y, z triples (for World.weld).
const DIAG = [];
for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let d = -1; d <= 1; d++) if (Math.abs(a) + Math.abs(b) + Math.abs(d) >= 2) DIAG.push(a, b, d);
// A neighbour of a voxel during weld: inner is its index in chunk c when it lies away from the chunk's border, else -1.
const faces = (a, b, c, d, e, f) => (a ? 1 : 0) + (b ? 1 : 0) + (c ? 1 : 0) + (d ? 1 : 0) + (e ? 1 : 0) + (f ? 1 : 0);
const nb = (w, c, inner, x, y, z, a, b, d) => (inner >= 0 ? c[inner + a + (d << CB) + (b << (CB * 2))] : w.get(x + a, y + b, z + d));

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
    this.builtList = new Int32Array(1 << 20); this.builtN = 0; // where something was built, while the world is generated (for weld)
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
    // Rules of nature that differ from world to world.
    this.grav = 1; // gravity relative to the usual one
    this.under = false; // the whole world lies under water: things sink slowly, nothing burns, the creature swims
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
    if (this.generating) { if (t && !(TYPE_FLAGS[t] & F_TERRAIN) && (!old || TYPE_FLAGS[old] & F_TERRAIN)) this.noteBuilt((x | 0) + this.sx * ((z | 0) + this.sz * (y | 0))); return; } // (builders may pass fractions; the grid cuts them off)

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
        if (st.S && !this.isLink(x, y, z)) { // keep the storey's load-bearing strength and weight up to date
          st.S[y] -= VOXEL_STRENGTH[old]; st.M[y] -= VOXEL_MASS[old];
          if (!st.dirty) { st.dirty = true; this.touched.push(st); }
        }
      }
      if (this.onDestroyed) this.onDestroyed(old, x, y, z, st);
    }
  }

  thin(x, y, z) {
    return faces(this.get(x + 1, y, z), this.get(x - 1, y, z), this.get(x, y + 1, z), this.get(x, y - 1, z), this.get(x, y, z + 1), this.get(x, y, z - 1)) < 4;
  }

  noteBuilt(i) {
    if (this.builtN === this.builtList.length) { const l = new Int32Array(this.builtN * 2); l.set(this.builtList); this.builtList = l; }
    this.builtList[this.builtN++] = i;
  }

  markChunk(cx, cy, cz) {
    if (cy < 0 || cy >= this.ncy) return;
    if (this.wrap) { cx = (cx + this.ncx) % this.ncx; cz = (cz + this.ncz) % this.ncz; }
    else if (cx < 0 || cz < 0 || cx >= this.ncx || cz >= this.ncz) return;
    this.dirty.add(cx + this.ncx * (cz + this.ncz * cy));
  }

  // The building or prop that owns the column at (x, z), or null for open ground.
  structureAt(x, z) {
    x = Math.floor(x); z = Math.floor(z);
    if (this.wrap) { x &= this.mx; z &= this.mz; } else if (x < 0 || z < 0 || x >= this.sx || z >= this.sz) return null;
    const id = this.footprint[x + this.sx * z];
    return id ? this.structures[id] : null;
  }

  // Is (x, y, z) part of a superstructure? (x and z inside the world or wrapped.)
  isLink(x, y, z) {
    if (this.wrap) { x &= this.mx; z &= this.mz; } else if (x < 0 || z < 0 || x >= this.sx || z >= this.sz) return false;
    for (let i = this.linkHead[x + this.sx * z]; i >= 0; i = this.linkNext[i]) if (y >= this.linkLo[i] && y <= this.linkHi[i]) return true;
    return false;
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
    this.weld();
    const fp = this.footprint, sts = this.structures;
    // Where the superstructures are: per column a chain of height ranges (links.js notes them in linkCols while it
    // builds). Load passes from a building into a superstructure, never back: a bridge does not hold up the tower it
    // hangs on (destruction.js, frail.js).
    const n = [...(this.linkCols?.values() ?? [])].reduce((a, r) => a + r.length / 2, 0);
    this.linkHead = new Int32Array(this.sx * this.sz).fill(-1);
    this.linkNext = new Int32Array(n); this.linkLo = new Int16Array(n); this.linkHi = new Int16Array(n);
    let k = 0;
    for (const [c, r] of this.linkCols ?? []) for (let i = 0; i < r.length; i += 2, k++) { this.linkLo[k] = r[i]; this.linkHi[k] = r[i + 1]; this.linkNext[k] = this.linkHead[c]; this.linkHead[c] = k; }
    this.linkCols = null;
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
          if (st.major && !st.link && !st.rock && !this.isLink(x, y, z)) { // superstructures have no storeys (spans.js decides how they fail), nor has living rock (it does not give way storey by storey), and a bridge passing over a building is no part of its storeys
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

  // Thin parts drawn on a slant (spokes, chains, struts, booms, rings) touch their neighbours only along an edge or
  // at a corner. The support search (destruction.js) walks through faces only: when what holds such a part goes, only
  // its first voxel is looked at, and the rest stays hanging in the air. So wherever two voxels touch only
  // diagonally, the cell (or the two cells) between them is filled at the height of the lower one, with the type of
  // the built one: what looks joined is joined. Runs once, before the world is counted.
  weld() {
    const fills = [], S2 = CB * 2, list = this.builtList, layer = this.sx * this.sz;
    for (let k = 0; k < this.builtN; k++) {
      const i = list[k], y = (i / layer) | 0, r = i - y * layer, z = (r / this.sx) | 0, x = r - z * this.sx;
      const ci = (x >> CB) + this.ncx * ((z >> CB) + this.ncz * (y >> CB)), c = this.chunks[ci], li = (x & CM) | ((z & CM) << CB) | ((y & CM) << S2), t = c[li];
      if (!t || TYPE_FLAGS[t] & F_TERRAIN) continue;
      const lx = x & CM, ly = y & CM, lz = z & CM;
      // Neighbours straight from the chunk away from its border, through get() at the border (see nb).
      const inner = lx > 0 && lx < CM && ly > 0 && ly < CM && lz > 0 && lz < CM ? li : -1;
      const px = nb(this, c, inner, x, y, z, 1, 0, 0), nx = nb(this, c, inner, x, y, z, -1, 0, 0), py = nb(this, c, inner, x, y, z, 0, 1, 0);
      const ny = nb(this, c, inner, x, y, z, 0, -1, 0), pz = nb(this, c, inner, x, y, z, 0, 0, 1), nz = nb(this, c, inner, x, y, z, 0, 0, -1);
      if (faces(px, nx, py, ny, pz, nz) >= 4) continue; // in a wall or inside: a thin part touching it diagonally looks after itself
      for (let q = 0; q < DIAG.length; q += 3) {
        const a = DIAG[q], b = DIAG[q + 1], d = DIAG[q + 2];
        // The cells between are faces of this voxel: where one of them is solid, the pair is joined already.
        const ca = a > 0 ? px : a < 0 ? nx : 0, cb = b > 0 ? py : b < 0 ? ny : 0, cd = d > 0 ? pz : d < 0 ? nz : 0;
        const corner = a !== 0 && b !== 0 && d !== 0;
        if (!corner && (ca || cb || cd)) continue;
        const u = nb(this, c, inner, x, y, z, a, b, d);
        if (!u || (!(TYPE_FLAGS[u] & F_TERRAIN) && a * 9 + b * 3 + d < 0 && this.thin(x + a, y + b, z + d))) continue; // a pair of thin voxels is looked at once
        if (!corner) { if (b < 0) fills.push(x, y + b, z, t, i); else fills.push(a ? x + a : x, y, a ? z : z + d, t, i); continue; }
        if (ca || cb || cd) { // at a corner: a path over two cells
          const cab = nb(this, c, inner, x, y, z, a, b, 0), cad = nb(this, c, inner, x, y, z, a, 0, d), cbd = nb(this, c, inner, x, y, z, 0, b, d);
          if ((ca && (cab || cad)) || (cb && (cab || cbd)) || (cd && (cad || cbd))) continue;
        }
        if (b < 0) fills.push(x, y + b, z, t, i, x + a, y + b, z, t, i); else fills.push(x + a, y, z, t, i, x + a, y, z + d, t, i);
      }
    }
    // A fill next to a superstructure's voxel belongs to the superstructure as well (links.js noted its voxels in linkCols).
    const cols = this.linkCols, colOf = (x, z) => (x & this.mx) + this.sx * (z & this.mz), inLink = (x, y, z) => { const r = cols?.get(colOf(x, z)); if (r) for (let k = 0; k < r.length; k += 2) if (y >= r[k] && y <= r[k + 1]) return true; return false; };
    let n = 0;
    for (let k = 0; k < fills.length; k += 5) {
      const x = fills[k], y = fills[k + 1], z = fills[k + 2], src = fills[k + 4];
      if (this.get(x, y, z)) continue;
      this.set(x, y, z, fills[k + 3]); n++;
      if (!cols) continue;
      const sy = (src / layer) | 0, sr = src - sy * layer, sz = (sr / this.sx) | 0;
      if (inLink(sr - sz * this.sx, sy, sz)) { const c = colOf(x, z), r = cols.get(c); if (r) r.push(y, y); else cols.set(c, [y, y]); }
    }
    this.welded = n;
    this.builtList = null;
  }

  memoryBytes() {
    let n = this.footprint.byteLength + this.uniform.byteLength;
    for (const c of this.chunks) if (c) n += CVOL;
    return n;
  }
}
