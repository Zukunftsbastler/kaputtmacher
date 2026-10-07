// Small math toolkit: scalars, seeded random, 4x4 matrices (column-major), quaternions [x,y,z,w].

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

// Deterministic generator (mulberry32) so worlds and simulation are reproducible.
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Position hash in [0,1), used for per-voxel shade variation.
export function hash3(x, y, z) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(z, 1274126177)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Shortest signed distance from b to a on a ring of the given size.
export function wrapDelta(d, size) {
  if (!size) return d;
  d %= size;
  if (d > size / 2) d -= size;
  else if (d < -size / 2) d += size;
  return d;
}

export const m4 = {
  create() {
    const m = new Float32Array(16);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },
  identity(m) {
    m.fill(0);
    m[0] = m[5] = m[10] = m[15] = 1;
    return m;
  },
  copy(out, a) {
    out.set(a);
    return out;
  },
  perspective(out, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    out.fill(0);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) / (near - far);
    out[11] = -1;
    out[14] = (2 * far * near) / (near - far);
    return out;
  },
  lookAt(out, ex, ey, ez, tx, ty, tz) {
    let zx = ex - tx, zy = ey - ty, zz = ez - tz;
    let l = Math.hypot(zx, zy, zz) || 1;
    zx /= l; zy /= l; zz /= l;
    // x = up(0,1,0) cross z
    let xx = zz, xy = 0, xz = -zx;
    l = Math.hypot(xx, xz) || 1;
    xx /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * ex + xy * ey + xz * ez);
    out[13] = -(yx * ex + yy * ey + yz * ez);
    out[14] = -(zx * ex + zy * ey + zz * ez);
    out[15] = 1;
    return out;
  },
  mul(out, a, b) {
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      T[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      T[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      T[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      T[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
    out.set(T);
    return out;
  },
  translation(out, x, y, z) {
    m4.identity(out);
    out[12] = x; out[13] = y; out[14] = z;
    return out;
  },
  // The helpers below post-multiply: out = out * M.
  translate(out, x, y, z) {
    out[12] += out[0] * x + out[4] * y + out[8] * z;
    out[13] += out[1] * x + out[5] * y + out[9] * z;
    out[14] += out[2] * x + out[6] * y + out[10] * z;
    return out;
  },
  scale(out, x, y, z) {
    for (let i = 0; i < 3; i++) {
      out[i] *= x; out[4 + i] *= y; out[8 + i] *= z;
    }
    return out;
  },
  rotateX(out, a) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 3; i++) {
      const y = out[4 + i], z = out[8 + i];
      out[4 + i] = y * c + z * s;
      out[8 + i] = z * c - y * s;
    }
    return out;
  },
  rotateY(out, a) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 3; i++) {
      const x = out[i], z = out[8 + i];
      out[i] = x * c - z * s;
      out[8 + i] = x * s + z * c;
    }
    return out;
  },
  rotateZ(out, a) {
    const c = Math.cos(a), s = Math.sin(a);
    for (let i = 0; i < 3; i++) {
      const x = out[i], y = out[4 + i];
      out[i] = x * c + y * s;
      out[4 + i] = y * c - x * s;
    }
    return out;
  },
  // out = translation(p) * rotation(q)
  fromQuatPos(out, q, px, py, pz) {
    const x = q[0], y = q[1], z = q[2], w = q[3];
    out[0] = 1 - 2 * (y * y + z * z); out[1] = 2 * (x * y + z * w); out[2] = 2 * (x * z - y * w); out[3] = 0;
    out[4] = 2 * (x * y - z * w); out[5] = 1 - 2 * (x * x + z * z); out[6] = 2 * (y * z + x * w); out[7] = 0;
    out[8] = 2 * (x * z + y * w); out[9] = 2 * (y * z - x * w); out[10] = 1 - 2 * (x * x + y * y); out[11] = 0;
    out[12] = px; out[13] = py; out[14] = pz; out[15] = 1;
    return out;
  },
  // Transforms a point; returns clip-space w (for screen projection).
  transformPoint(m, x, y, z, out) {
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    return m[3] * x + m[7] * y + m[11] * z + m[15];
  },
};
const T = new Float32Array(16);

export const quat = {
  rotate(q, x, y, z, out) {
    const qx = q[0], qy = q[1], qz = q[2], qw = q[3];
    const tx = 2 * (qy * z - qz * y), ty = 2 * (qz * x - qx * z), tz = 2 * (qx * y - qy * x);
    out[0] = x + qw * tx + (qy * tz - qz * ty);
    out[1] = y + qw * ty + (qz * tx - qx * tz);
    out[2] = z + qw * tz + (qx * ty - qy * tx);
    return out;
  },
  // Rotates by the inverse of q.
  unrotate(q, x, y, z, out) {
    INV[0] = -q[0]; INV[1] = -q[1]; INV[2] = -q[2]; INV[3] = q[3];
    return quat.rotate(INV, x, y, z, out);
  },
  integrate(q, wx, wy, wz, dt) {
    const x = q[0], y = q[1], z = q[2], w = q[3], h = dt * 0.5;
    q[0] += h * (wx * w + wy * z - wz * y);
    q[1] += h * (wy * w + wz * x - wx * z);
    q[2] += h * (wz * w + wx * y - wy * x);
    q[3] += h * (-wx * x - wy * y - wz * z);
    const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    q[0] /= l; q[1] /= l; q[2] /= l; q[3] /= l;
  },
};
const INV = [0, 0, 0, 1];
