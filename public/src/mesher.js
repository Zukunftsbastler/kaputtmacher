// Turns a voxel volume into quads: only faces next to air, with per-corner ambient occlusion.
// Neighbouring faces of the same voxel type and evenly lit are merged into one large rectangle
// (greedy meshing), so a plain wall costs a handful of quads instead of one per voxel.
// Vertex layout (12 bytes): int16 x, y, z, packed (face 0..5 | ao << 3 | corner << 5), then uint8 r, g, b, emissive.
// The slight shade difference between neighbouring voxels is added by the fragment shader.

import { TYPE_RGBA } from './materials.js';

let cap = 1 << 16; // vertices
let buf = new ArrayBuffer(cap * 12);
let i16 = new Int16Array(buf);
let u8 = new Uint8Array(buf);
let mask = new Int32Array(34 * 34);

function grow() {
  cap *= 2;
  const nb = new ArrayBuffer(cap * 12);
  new Uint8Array(nb).set(u8);
  buf = nb; i16 = new Int16Array(buf); u8 = new Uint8Array(buf);
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
const CORNERS = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
const MERGE = 1 << 16; // mask flag: all four corners equally lit, so the face may be merged

// pad: volume with a one-voxel border, dimensions (sx+2, sy+2, sz+2), index (x+1) + px*((z+1) + pz*(y+1)).
// ox/oy/oz are added to the emitted positions. maxRun limits how far a merged face may extend horizontally:
// on a planet the picture is bent between vertices, and long flat faces would gape against their short neighbours.
export function meshPadded(pad, sx, sy, sz, ox = 0, oy = 0, oz = 0, rgba = TYPE_RGBA, maxRun = 1024) {
  const px = sx + 2, pz = sz + 2, sl = px * pz;
  const dims = [sx, sy, sz], strideOf = [1, sl, px]; // pad index step per x, y, z
  const origin = [ox, oy, oz], pos = [0, 0, 0];
  let nv = 0;
  for (let f = 0; f < 6; f++) {
    const F = FACES[f];
    const na = F[0] ? 0 : F[1] ? 1 : 2, ua = F[3] ? 0 : F[4] ? 1 : 2, va = F[6] ? 0 : F[7] ? 1 : 2;
    const sn = dims[na], su = dims[ua], sv = dims[va];
    const dn = (F[0] + F[1] + F[2]) * strideOf[na], du = strideOf[ua], dv = strideOf[va];
    if (mask.length < su * sv) mask = new Int32Array(su * sv);
    const maxW = ua === 1 ? su : maxRun, maxT = va === 1 ? sv : maxRun;
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
        if (nv + 4 > cap) grow();
        const t = k & 255, a0 = (k >> 8) & 3, a1 = (k >> 10) & 3, a2 = (k >> 12) & 3, a3 = (k >> 14) & 3;
        // Start at corner 1 when that gives the smoother AO diagonal.
        const start = a0 + a2 < a1 + a3 ? 1 : 0;
        pos[na] = s + (dn > 0 ? 1 : 0);
        for (let n = 0; n < 4; n++) {
          const c = (n + start) & 3, o = nv * 6;
          pos[ua] = i + (CORNERS[c][0] > 0 ? w : 0);
          pos[va] = j + (CORNERS[c][1] > 0 ? h : 0);
          i16[o] = pos[0] + origin[0]; i16[o + 1] = pos[1] + origin[1]; i16[o + 2] = pos[2] + origin[2];
          i16[o + 3] = f | (((k >> (8 + c * 2)) & 3) << 3) | (c << 5);
          const b8 = nv * 12 + 8;
          u8[b8] = rgba[t * 4]; u8[b8 + 1] = rgba[t * 4 + 1]; u8[b8 + 2] = rgba[t * 4 + 2]; u8[b8 + 3] = rgba[t * 4 + 3];
          nv++;
        }
      }
    }
  }
  return { data: buf.slice(0, nv * 12), quads: nv >> 2 };
}

const chunkPad = new Uint8Array(34 * 34 * 34);

export function meshChunk(world, cx, cy, cz) {
  // A chunk of pure air has no faces of its own.
  const ci = cx + world.ncx * (cz + world.ncz * cy);
  if (!world.chunks[ci] && !world.uniform[ci]) return { data: null, quads: 0 };
  const x0 = cx * 32, y0 = cy * 32, z0 = cz * 32, chunk = world.chunks[ci], fill = world.uniform[ci];
  // The chunk's own voxels are copied row by row; only the one-voxel border comes from the neighbours.
  for (let y = -1; y <= 32; y++)
    for (let z = -1; z <= 32; z++) {
      const p = 34 * (z + 1 + 34 * (y + 1));
      if (y < 0 || y > 31 || z < 0 || z > 31) { for (let x = -1; x <= 32; x++) chunkPad[p + x + 1] = world.get(x0 + x, y0 + y, z0 + z); continue; }
      chunkPad[p] = world.get(x0 - 1, y0 + y, z0 + z);
      if (chunk) chunkPad.set(chunk.subarray((z << 5) | (y << 10), ((z << 5) | (y << 10)) + 32), p + 1);
      else chunkPad.fill(fill, p + 1, p + 33);
      chunkPad[p + 33] = world.get(x0 + 32, y0 + y, z0 + z);
    }
  return meshPadded(chunkPad, 32, 32, 32, 0, 0, 0, TYPE_RGBA, world.wrap ? 4 : 1024);
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
