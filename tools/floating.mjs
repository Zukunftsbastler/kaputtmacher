// Development only: finds what floats in a freshly generated world – built voxels that are not joined face to face
// with the ground, the way the support search (destruction.js) sees it. They do not fall at the start (nothing
// looks at them), but they hang in the air once their surroundings are destroyed.
// usage: node --experimental-default-type=module tools/floating.mjs [world ...]
const { WORLDS } = await import('../public/src/worldgen.js');
const { TYPE_FLAGS, F_TERRAIN, T } = await import('../public/src/materials.js');
const names = Object.fromEntries(Object.entries(T).map(([k, v]) => [v, k]));

export function floating(w) {
  const sx = w.sx, sz = w.sz, layer = sx * sz, seen = new Uint8Array(Math.ceil((layer * w.sy) / 8)), stack = [];
  const built = (t) => t && !(TYPE_FLAGS[t] & F_TERRAIN);
  const mark = (i) => { if (seen[i >> 3] & (1 << (i & 7))) return false; seen[i >> 3] |= 1 << (i & 7); return true; };
  const N = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  // Start from every built voxel that touches the ground.
  for (let ci = 0; ci < w.chunks.length; ci++) {
    const c = w.chunks[ci];
    if (!c) continue;
    const bx = (ci % w.ncx) << 5, bz = (Math.floor(ci / w.ncx) % w.ncz) << 5, by = Math.floor(ci / (w.ncx * w.ncz)) << 5;
    for (let li = 0; li < 32768; li++) {
      if (!built(c[li])) continue;
      const x = bx + (li & 31), z = bz + ((li >> 5) & 31), y = by + (li >> 10);
      if (N.some(([a, b, d]) => y + b < 0 || TYPE_FLAGS[w.get(x + a, y + b, z + d)] & F_TERRAIN) && mark(w.index(x, y, z))) stack.push(x, y, z);
    }
  }
  while (stack.length) {
    const z = stack.pop(), y = stack.pop(), x = stack.pop();
    for (const [a, b, d] of N) if (built(w.get(x + a, y + b, z + d)) && mark(w.index(x + a, y + b, z + d))) stack.push(x + a, y + b, z + d);
  }
  const by = {}, samples = {};
  let n = 0;
  for (let ci = 0; ci < w.chunks.length; ci++) {
    const c = w.chunks[ci];
    if (!c) continue;
    const bx = (ci % w.ncx) << 5, bz = (Math.floor(ci / w.ncx) % w.ncz) << 5, b0 = Math.floor(ci / (w.ncx * w.ncz)) << 5;
    for (let li = 0; li < 32768; li++) {
      if (!built(c[li])) continue;
      const x = bx + (li & 31), z = bz + ((li >> 5) & 31), y = b0 + (li >> 10), i = w.index(x, y, z);
      if (seen[i >> 3] & (1 << (i & 7))) continue;
      n++;
      const st = w.structures[w.footprint[(x & w.mx) + sx * (z & w.mz)]], k = st.kind + ':' + names[c[li]];
      by[k] = (by[k] ?? 0) + 1;
      (samples[st.kind] ??= []).push([x - st.x0, y - st.y0, z - st.z0, names[c[li]], st.id]);
    }
  }
  return { n, by, samples };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ids = process.argv.slice(2);
  for (const [i, def] of WORLDS.entries()) {
    if (ids.length && !ids.includes(def.id)) continue;
    const w = def.make(1000 + (def.seed ?? i) * 77, { planet: 512, tall: 512 }, {});
    w.finalize();
    const { n, by, samples } = floating(w);
    console.log(def.id.padEnd(9), String(n).padStart(6), Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => k + '=' + v).join(' '));
    if (process.env.KIND) { const sm = samples[process.env.KIND] ?? [], id = sm[0]?.[4], st = w.structures[id]; console.log('  size', st && [st.x1 - st.x0, st.top - st.y0, st.z1 - st.z0], sm.filter((p) => p[4] === id).filter((p, i, a) => i % Math.max(1, Math.floor(a.length / 30)) === 0).slice(0, 30).map((p) => p.slice(0, 4).join(',')).join(' ')); }
  }
}
