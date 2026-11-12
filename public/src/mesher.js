// Turns a voxel volume into quads: only faces next to air, with per-corner ambient occlusion.
// Neighbouring faces of the same voxel type and evenly lit are merged into one large rectangle
// (greedy meshing), so a plain wall costs a handful of quads instead of one per voxel.
// Every quad is one record of QUAD_BYTES = 16 bytes, drawn as an instance of four corners (renderer.js):
//   int16 x, y, z   the corner with the lowest u and v, already on the face's plane
//   uint8 w, h      extent along the face's u and v axes (FACES), 1..255
//   uint16 meta     face 0..5 | ao of corner 0..3 << 3, 5, 7, 9 (0 = darkest, 3 = open)
//   2 bytes unused, uint8 r, g, b, emissive
// The vertex shader builds the four corners from this; the slight shade difference between neighbouring voxels is
// added by the fragment shader. (Before November 2026 every quad was four vertices of 12 bytes: three times as much.)
// The module touches nothing but its own buffers, so it also runs in the meshing workers (mesh-worker.js).

import { TYPE_RGBA, T } from './materials.js';

export const QUAD_BYTES = 16;
const MAX_EXTENT = 255; // w and h are bytes
let cap = 1 << 14; // quads
let buf = new ArrayBuffer(cap * QUAD_BYTES);
let i16 = new Int16Array(buf);
let u16 = new Uint16Array(buf);
let u8 = new Uint8Array(buf);
let mask = new Int32Array(34 * 34);

function grow() {
  cap *= 2;
  const nb = new ArrayBuffer(cap * QUAD_BYTES);
  new Uint8Array(nb).set(u8);
  buf = nb; i16 = new Int16Array(buf); u16 = new Uint16Array(buf); u8 = new Uint8Array(buf);
}

// Per face: normal n, tangents u and v with u x v = n.
const FACES = [
  [1, 0, 0, 0, 1, 0, 0, 0, 1],
  [-1, 0, 0, 0, 0, 1, 0, 1, 0],
  [0, 1, 0, 0, 0, 1, 1, 0, 0],
  [0, -1, 0, 1, 0, 0, 0, 0, 1],
  [0, 0, 1, 1, 0, 0, 0, 1, 0],
  [0, 0, -1, 0, 1, 0, 1, 0, 0],
];
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; // corner order of the ao bits (the vertex shader knows it too)
const MERGE = 1 << 16; // mask flag: all four corners equally lit, so the face may be merged

// pad: volume with a one-voxel border, dimensions (sx+2, sy+2, sz+2), index (x+1) + px*((z+1) + pz*(y+1)).
// ox/oy/oz are added to the emitted positions. maxRun limits how far a merged face may extend horizontally:
// on a planet the picture is bent between vertices, and long flat faces would gape against their short neighbours.
export function meshPadded(pad, sx, sy, sz, ox = 0, oy = 0, oz = 0, rgba = TYPE_RGBA, maxRun = 1024) {
  const px = sx + 2, pz = sz + 2, sl = px * pz;
  const dims = [sx, sy, sz], strideOf = [1, sl, px]; // pad index step per x, y, z
  const origin = [ox, oy, oz], pos = [0, 0, 0];
  let nq = 0;
  for (let f = 0; f < 6; f++) {
    const F = FACES[f];
    const na = F[0] ? 0 : F[1] ? 1 : 2, ua = F[3] ? 0 : F[4] ? 1 : 2, va = F[6] ? 0 : F[7] ? 1 : 2;
    const sn = dims[na], su = dims[ua], sv = dims[va];
    const dn = (F[0] + F[1] + F[2]) * strideOf[na], du = strideOf[ua], dv = strideOf[va];
    if (mask.length < su * sv) mask = new Int32Array(su * sv);
    const maxW = Math.min(MAX_EXTENT, ua === 1 ? su : maxRun), maxT = Math.min(MAX_EXTENT, va === 1 ? sv : maxRun);
    for (let s = 0; s < sn; s++) {
      // Collect the visible faces of this slice.
      let any = false;
      const base = 1 + px + sl + s * strideOf[na];
      for (let j = 0; j < sv; j++) {
        let p = base + j * dv;
        for (let i = 0; i < su; i++, p += du) {
          const t = pad[p];
          if (!t || pad[p + dn]) { mask[i + j * su] = 0; continue; }
          const q = p + dn;
          let key = t, first = 0, same = true;
          for (let c = 0; c < 4; c++) {
            const a = CORNERS[c][0] * du, b = CORNERS[c][1] * dv;
            const s1 = pad[q + a] ? 1 : 0, s2 = pad[q + b] ? 1 : 0;
            const ao = s1 && s2 ? 0 : 3 - s1 - s2 - (pad[q + a + b] ? 1 : 0);
            if (c === 0) first = ao; else if (ao !== first) same = false;
            key |= ao << (8 + c * 2);
          }
          mask[i + j * su] = same ? key | MERGE : key;
          any = true;
        }
      }
      if (!any) continue;
      // Grow rectangles over equal neighbours.
      for (let j = 0; j < sv; j++) for (let i = 0; i < su; i++) {
        const k = mask[i + j * su];
        if (!k) continue;
        let w = 1, h = 1;
        if (k & MERGE) {
          while (i + w < su && w < maxW && mask[i + w + j * su] === k) w++;
          tall: for (; j + h < sv && h < maxT; h++) for (let q = 0; q < w; q++) if (mask[i + q + (j + h) * su] !== k) break tall;
          for (let b = 0; b < h; b++) for (let a = 0; a < w; a++) mask[i + a + (j + b) * su] = 0;
        }
        if (nq + 1 > cap) grow();
        const t = k & 255, o = nq * 8, b = nq * QUAD_BYTES; // o: in 16-bit words
        pos[na] = s + (dn > 0 ? 1 : 0); pos[ua] = i; pos[va] = j;
        i16[o] = pos[0] + origin[0]; i16[o + 1] = pos[1] + origin[1]; i16[o + 2] = pos[2] + origin[2];
        u8[b + 6] = w; u8[b + 7] = h;
        u16[o + 4] = f | (((k >> 8) & 255) << 3); // the four corners' ao, two bits each, in corner order
        u8[b + 12] = rgba[t * 4]; u8[b + 13] = rgba[t * 4 + 1]; u8[b + 14] = rgba[t * 4 + 2]; u8[b + 15] = rgba[t * 4 + 3];
        nq++;
      }
    }
  }
  return { data: buf.slice(0, nq * QUAD_BYTES), quads: nq };
}

export const PAD_SIZE = 34 * 34 * 34;
const chunkPad = new Uint8Array(PAD_SIZE);

// A chunk on the spot (the meshing workers get the copy of padChunk instead).
export function meshChunk(world, cx, cy, cz) {
  if (!padChunk(world, cx, cy, cz, chunkPad)) return { data: null, quads: 0 };
  return meshPadded(chunkPad, 32, 32, 32, 0, 0, 0, TYPE_RGBA, world.wrap ? 4 : 1024);
}

// Copies a chunk with a one-voxel border from its neighbours into pad (PAD_SIZE bytes, index (x+1) + 34*((z+1) + 34*(y+1))).
// Returns false for a chunk of pure air, which has no faces of its own. The chunk and the six faces of the border are
// copied straight from the chunk arrays; only the edges and corners of the border go through world.get.
export function padChunk(world, cx, cy, cz, pad) {
  const ci = cx + world.ncx * (cz + world.ncz * cy);
  if (!world.chunks[ci] && !world.uniform[ci]) return false;
  const chunk = world.chunks[ci], fill = world.uniform[ci];
  for (let y = 0; y < 32; y++)
    for (let z = 0; z < 32; z++) {
      const p = 34 * (z + 1 + 34 * (y + 1)) + 1;
      if (chunk) pad.set(chunk.subarray((z << 5) | (y << 10), ((z << 5) | (y << 10)) + 32), p);
      else pad.fill(fill, p, p + 32);
    }
  // A neighbouring chunk: its array (or null) in nb.c and its single value in nb.v. Below the world is bedrock.
  const nb = { c: null, v: 0 };
  const near = (dx, dy, dz) => {
    let x = cx + dx, z = cz + dz;
    const y = cy + dy;
    nb.c = null; nb.v = 0;
    if (y < 0) { nb.v = T.BEDROCK; return; }
    if (y >= world.ncy) return;
    if (world.wrap) { x = (x + world.ncx) % world.ncx; z = (z + world.ncz) % world.ncz; }
    else if (x < 0 || z < 0 || x >= world.ncx || z >= world.ncz) return;
    const i = x + world.ncx * (z + world.ncz * y);
    nb.c = world.chunks[i]; nb.v = world.uniform[i];
  };
  const at = (x, y, z) => 1 + x + 34 * (z + 1 + 34 * (y + 1));
  for (const side of [-1, 1]) {
    const o = side < 0 ? 31 : 0, e = side < 0 ? -1 : 32; // the neighbour's layer next to this chunk, and where it goes in the pad
    near(side, 0, 0);
    for (let y = 0; y < 32; y++) for (let z = 0; z < 32; z++) pad[at(e, y, z)] = nb.c ? nb.c[o | (z << 5) | (y << 10)] : nb.v;
    near(0, 0, side);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) pad[at(x, y, e)] = nb.c ? nb.c[x | (o << 5) | (y << 10)] : nb.v;
    near(0, side, 0);
    for (let z = 0; z < 32; z++) for (let x = 0; x < 32; x++) pad[at(x, e, z)] = nb.c ? nb.c[x | (z << 5) | (o << 10)] : nb.v;
  }
  const x0 = cx * 32, y0 = cy * 32, z0 = cz * 32;
  for (let y = -1; y <= 32; y++)
    for (let z = -1; z <= 32; z++) {
      const oy = y < 0 || y > 31, oz = z < 0 || z > 31;
      if (oy && oz) { for (let x = -1; x <= 32; x++) pad[at(x, y, z)] = world.get(x0 + x, y0 + y, z0 + z); continue; }
      if (oy || oz) { pad[at(-1, y, z)] = world.get(x0 - 1, y0 + y, z0 + z); pad[at(32, y, z)] = world.get(x0 + 32, y0 + y, z0 + z); }
    }
  return true;
}

// Meshes a free-standing volume (rigid fragment or monster part). vox index: x + sx*(z + sz*y).
export function meshVolume(vox, sx, sy, sz, ox = 0, oy = 0, oz = 0, rgba = TYPE_RGBA) {
  const px = sx + 2, pz = sz + 2;
  const pad = new Uint8Array(px * pz * (sy + 2));
  for (let y = 0; y < sy; y++)
    for (let z = 0; z < sz; z++) {
      const src = sx * (z + sz * y);
      pad.set(vox.subarray(src, src + sx), 1 + px * (z + 1 + pz * (y + 1)));
    }
  return meshPadded(pad, sx, sy, sz, ox, oy, oz, rgba);
}
