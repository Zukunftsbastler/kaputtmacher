// Superstructures: what ties the separate buildings of a world together. Elevated railways between the towers
// of a city, sky bridges and superhighways in the neon megacity, lianas between the crowns of the jungle, rope
// bridges between tree houses, giant roller coasters from ride to ride, glass tubes under the sea and so on.
//
// For every style a world asks for (WORLDS in worldgen.js, `links`), the buildings that fit become the nodes of
// a network: the nearest pairs are joined first until everything that can be reached is connected (a spanning
// tree), then some extra links close loops. Every link starts and ends on the facade of its two buildings, at
// heights chosen within each building, so the network climbs and falls between levels; links between platforms
// (tree houses) use the platforms. A link is only built where its path is free: it never cuts through a third
// building or a hill, and it never crosses another link at the same height.
// Links are structures of their own (kind 'link'): they count, they show on the minimap, they can be destroyed,
// and they hang on the buildings they join (whatever is no longer connected to the ground falls).

import { T, isTerrain } from './materials.js';

const NEON = [T.NEON_RED, T.NEON_BLUE, T.NEON_GREEN, T.NEON_PINK, T.NEON_YELLOW];
const PAINT = [T.CAR_RED, T.CAR_BLUE, T.CAR_YELLOW, T.CAR_WHITE, T.STEEL_YELLOW];

// A style: how wide (hw: half width), where it needs room (clear: from y + lo to y + hi), how steep it may climb
// (slope: height per length), how far it may reach (range), how much it sags (sag: share of its length, sagMax),
// where it hangs on a building (at: share of the building's height; minH: buildings lower than that are left out;
// above: lowest height over the ground), piers (pier: spacing; 0 = none), and what each slice of it looks like.
// cross(g, put, t, f, k, link): draws one slice; put(s, dy, type) sets a voxel s across the path and dy above the deck.
const STYLES = {
  // Elevated railway on a concrete beam, with trains on it.
  rail: { hw: 2, clear: [-2, 6], slope: 0.12, range: [30, 230], at: [0.2, 0.6], minH: 30, above: 14, pier: 26, pierW: 2, pierT: T.CONCRETE,
    cross(g, put, t, f, k, L) {
      for (let s = -2; s <= 2; s++) put(s, -1, T.CONCRETE); for (let s = -1; s <= 1; s++) put(s, -2, T.CONCRETE_DARK);
      put(-1, 0, T.STEEL); put(1, 0, T.STEEL);
      const car = L.trains.find((a) => t >= a && t < a + 30);
      if (car !== undefined && ((t - car) % 10) < 9) { for (let s = -1; s <= 1; s++) for (let dy = 1; dy <= 4; dy++) put(s, dy, dy === 3 && s ? T.GLASS_DARK : L.paint); }
    } },
  // A glass tube between towers; in the neon city its floor edges glow.
  skybridge: { hw: 2, clear: [-1, 6], slope: 0.3, range: [10, 130], at: [0.25, 0.9], minH: 40, above: 20, pier: 0,
    cross(g, put, t, f, k, L) {
      const rib = (Math.round(t) % 6) === 0;
      for (let s = -2; s <= 2; s++) { put(s, 0, Math.abs(s) === 2 && L.neon ? L.neon : T.CONCRETE_DARK); put(s, 5, rib ? T.STEEL_DARK : T.GLASS); }
      for (let dy = 1; dy <= 4; dy++) { put(-2, dy, rib ? T.STEEL_DARK : T.GLASS); put(2, dy, rib ? T.STEEL_DARK : T.GLASS); }
    } },
  // A superhighway: thirteen voxels wide, crash barriers, lane markings, cars; in the neon city with glowing barriers.
  highway: { hw: 6, clear: [-2, 5], slope: 0.08, range: [70, 320], at: [0.3, 0.7], minH: 60, above: 24, pier: 34, pierW: 4, pierT: T.CONCRETE,
    cross(g, put, t, f, k, L) {
      for (let s = -6; s <= 6; s++) { put(s, 0, T.CONCRETE); put(s, -1, T.CONCRETE_DARK); }
      for (const s of [-6, 6]) { put(s, 1, T.CONCRETE_LIGHT); put(s, 2, L.neon ?? T.CONCRETE_LIGHT); }
      if ((Math.round(t) >> 2) & 1) put(0, 0, T.TILE_WHITE);
      for (const c of L.cars) if (t >= c.t && t < c.t + 6) for (let s = c.lane - 1; s <= c.lane + 1; s++) { put(s, 1, c.paint); if (t > c.t + 1 && t < c.t + 4.5) put(s, 2, T.GLASS_DARK); }
    } },
  // Lianas: three green strands sagging between two crowns, with tufts of leaves and vines hanging down.
  vine: { hw: 2, clear: [0, 1], slope: 0.5, range: [10, 90], at: [0.75, 0.95], minH: 18, above: 10, sag: 0.12, sagMax: 14, pier: 0,
    cross(g, put, t, f, k) {
      for (const s of [-2, 0, 2]) put(s, Math.round(Math.sin(t * 0.4 + s) * 0.6), (Math.round(t) + s) % 7 ? T.LEAF_DARK : T.LEAF);
      if (k % 9 === 4) { const s = ((k >> 3) % 3) - 1; for (let dy = 1; dy < 3 + (k % 5); dy++) put(s * 2, -dy, T.LEAF); }
    } },
  // A rope bridge: planks that sag in the middle, ropes at the sides on posts.
  rope: { hw: 2, clear: [0, 3], slope: 0.25, range: [16, 170], at: [0.4, 0.85], minH: 40, above: 16, sag: 0.08, sagMax: 9, pier: 0,
    cross(g, put, t) {
      for (let s = -1; s <= 1; s++) put(s, 0, (Math.round(t) & 1) ? T.WOOD : T.WOOD_LIGHT);
      for (const s of [-2, 2]) { put(s, 2, T.FABRIC_YELLOW); if ((Math.round(t * 2) % 8) === 0) { put(s, 0, T.WOOD_DARK); put(s, 1, T.WOOD_DARK); } }
    } },
  // A giant roller coaster from ride to ride: steep humps, two red rails on sleepers, lattice supports, a train.
  coaster: { hw: 1, clear: [-1, 3], slope: 0.6, range: [30, 220], at: [0.5, 1], minH: 14, above: 10, waves: 0.12, wavesMax: 22, pier: 14, pierW: 1, pierT: T.STEEL, lattice: true,
    cross(g, put, t, f, k, L) {
      put(-1, 0, T.STEEL_RED); put(1, 0, T.STEEL_RED);
      if ((Math.round(t) & 1) === 0) for (let s = -1; s <= 1; s++) put(s, -1, T.WOOD_DARK);
      if (t >= L.train && t < L.train + 16 && (Math.round(t) % 4) !== 3) for (let s = -1; s <= 1; s++) { put(s, 1, L.paint); put(s, 2, s ? L.paint : T.FABRIC_WHITE); }
    } },
  // Stone bridges with parapets and planters on tall piers: the hanging walkways of Babel.
  arch: { hw: 2, clear: [-1, 3], slope: 0.25, range: [20, 200], at: [0.3, 0.9], minH: 24, above: 14, pier: 18, pierW: 3, pierT: T.SANDSTONE,
    cross(g, put, t) {
      for (let s = -2; s <= 2; s++) { put(s, 0, T.SANDSTONE); put(s, -1, T.SANDSTONE); }
      for (const s of [-2, 2]) { put(s, 1, T.SANDSTONE); if ((Math.round(t) % 5) === 0) put(s, 2, (Math.round(t) % 10) ? T.LEAF : T.FLOWER_RED); }
    } },
  // Wall walks between castles: a stone deck with battlements on both sides, on piers.
  stone: { hw: 2, clear: [-1, 4], slope: 0.2, range: [30, 200], at: [0.3, 0.7], minH: 14, above: 10, pier: 16, pierW: 3, pierT: T.STONE,
    cross(g, put, t) {
      for (let s = -2; s <= 2; s++) { put(s, 0, T.STONE); put(s, -1, T.STONE); }
      for (const s of [-2, 2]) { put(s, 1, T.STONE); if (Math.round(t) & 1) put(s, 2, T.STONE); }
    } },
  // Glass tubes between the domes and modules under the sea.
  tube: { hw: 3, clear: [0, 6], slope: 0.3, range: [15, 160], at: [0.15, 0.6], minH: 8, above: 4, pier: 0,
    cross(g, put, t) {
      const rib = (Math.round(t) % 6) === 0;
      for (let s = -3; s <= 3; s++) for (let dy = 0; dy <= 6; dy++) { const d = Math.hypot(s, dy - 3); if (d > 2.4 && d <= 3.5) put(s, dy, dy === 0 ? T.STEEL : rib ? T.STEEL_DARK : T.GLASS); }
    } },
  // Pipelines between halls, tanks and chimneys, on steel frames.
  pipe: { hw: 3, clear: [-1, 2], slope: 0.1, range: [20, 170], at: [0.3, 0.7], minH: 10, above: 8, pier: 14, pierW: 1, pierT: T.STEEL,
    cross(g, put, t) {
      for (const [c, m] of [[-2, T.STEEL], [2, T.STEEL_RED]]) for (let s = c - 1; s <= c + 1; s++) for (let dy = 0; dy <= 2; dy++) if (s === c || dy === 1) put(s, dy, m);
      if ((Math.round(t) % 14) === 0) for (let s = -3; s <= 3; s++) put(s, -1, T.STEEL_DARK);
    } },
  // Covered conveyor bridges between silos, warehouses and cranes.
  conveyor: { hw: 2, clear: [-1, 5], slope: 0.25, range: [20, 190], at: [0.4, 0.9], minH: 15, above: 12, pier: 18, pierW: 2, pierT: T.STEEL,
    cross(g, put, t) {
      const post = (Math.round(t) % 3) === 0;
      for (let s = -2; s <= 2; s++) { put(s, 0, T.SHEET_GREY); put(s, 4, T.SHEET_GREY); }
      put(0, 1, T.CAR_BLACK);
      for (const s of [-2, 2]) for (let dy = 1; dy <= 3; dy++) if (post || dy === 3) put(s, dy, T.STEEL);
    } },
  // Glass skywalks at the airport: like the sky bridges, white instead of neon.
  skywalk: { hw: 2, clear: [-1, 6], slope: 0.2, range: [12, 160], at: [0.2, 0.8], minH: 14, above: 8, pier: 24, pierW: 2, pierT: T.CONCRETE_LIGHT,
    cross(g, put, t) {
      const rib = (Math.round(t) % 6) === 0;
      for (let s = -2; s <= 2; s++) { put(s, 0, T.CONCRETE_LIGHT); put(s, 5, T.SHEET_WHITE); }
      for (let dy = 1; dy <= 4; dy++) { put(-2, dy, rib ? T.SHEET_WHITE : T.GLASS); put(2, dy, rib ? T.SHEET_WHITE : T.GLASS); }
    } },
  // Steel catwalks: a grating with railings, between towers and gantries.
  catwalk: { hw: 1, clear: [0, 3], slope: 0.3, range: [16, 170], at: [0.35, 0.95], minH: 30, above: 16, pier: 0,
    cross(g, put, t) {
      for (let s = -1; s <= 1; s++) put(s, 0, T.STEEL_DARK);
      for (const s of [-1, 1]) { put(s, 2, T.STEEL); if (Math.round(t) % 3 === 0) put(s, 1, T.STEEL); }
    } },
  // Cable cars between tall buildings: two cables with cabins hanging from them.
  cable: { hw: 3, clear: [-8, 1], slope: 0.4, range: [40, 280], at: [0.6, 1], minH: 30, above: 20, sag: 0.04, sagMax: 10, pier: 0,
    cross(g, put, t, f, k, L) {
      put(-3, 0, T.STEEL_DARK); put(3, 0, T.STEEL_DARK);
      for (const c of L.cabins) if (t >= c.t && t < c.t + 5) { const s0 = c.side * 3; put(s0, -1, T.STEEL_DARK); for (let s = s0 - 2; s <= s0 + 2; s++) for (let dy = -7; dy <= -3; dy++) put(s, dy, dy === -5 ? T.GLASS : c.paint); }
    } },
};

// Connects the buildings of a world, one network per entry of `specs` ({ style, kinds, count, extra, neon, ... }).
// count: share of the fitting buildings that take part (0..1); extra: chance of a second link per pair beyond the tree.
export function linkUp(g, specs, G) {
  const w = g.w;
  for (const spec of specs) {
    const S = { ...STYLES[spec.style], ...spec };
    let nodes = w.structures.filter((st) => st.id && st.bx1 >= st.bx0 && !st.link && (S.kinds ? S.kinds.includes(st.kind) : st.major) && st.btop - st.by0 >= S.minH);
    nodes = nodes.sort(() => g.rnd() - 0.5).slice(0, Math.ceil(nodes.length * (S.count ?? 1)));
    const cx = (st) => (st.bx0 + st.bx1) / 2, cz = (st) => (st.bz0 + st.bz1) / 2, pairs = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(cx(nodes[i]) - cx(nodes[j]), cz(nodes[i]) - cz(nodes[j]));
      if (d >= S.range[0] && d <= S.range[1] * 1.3) pairs.push([d, i, j]);
    }
    pairs.sort((a, b) => a[0] - b[0]);
    const root = nodes.map((_, i) => i), find = (i) => (root[i] === i ? i : (root[i] = find(root[i]))), deg = new Uint8Array(nodes.length);
    let built = 0;
    const limit = S.limit ?? 80;
    for (const [, i, j] of pairs) { // the spanning tree: nearest pairs first, never two links into one group
      if (built >= limit) break;
      if (find(i) === find(j) || deg[i] >= 4 || deg[j] >= 4) continue;
      if (link(g, nodes[i], nodes[j], S, G)) { root[find(i)] = find(j); deg[i]++; deg[j]++; built++; }
    }
    for (const [, i, j] of pairs) { // and a few loops
      if (built >= limit) break;
      if (deg[i] >= 3 || deg[j] >= 3 || g.rnd() > (S.extra ?? 0.2)) continue;
      if (link(g, nodes[i], nodes[j], S, G)) { deg[i]++; deg[j]++; built++; }
    }
  }
}

// Where on a building a link at height y facing (dx, dz) attaches: walking in from outside the building towards its
// middle, the last free voxel before the first solid one. null if there is nothing there at that height.
function attach(w, st, y, dx, dz) {
  const mx = (st.bx0 + st.bx1) / 2, mz = (st.bz0 + st.bz1) / 2, r = Math.hypot(st.bx1 - st.bx0, st.bz1 - st.bz0) / 2 + 3;
  for (let d = r; d > 0; d -= 0.5) {
    const x = Math.round(mx + dx * d), z = Math.round(mz + dz * d);
    if (w.get(x, y, z) || w.get(x, y - 1, z)) return [Math.round(mx + dx * (d + 1)), Math.round(mz + dz * (d + 1))];
  }
  return null;
}

// A height on a building for a link: one of its platforms if it has them, else somewhere in the band S.at.
function heightOn(g, st, S, G, want) {
  const lo = Math.max(G + S.above, st.by0 + (st.btop - st.by0) * S.at[0]), hi = Math.min(st.btop - 2, st.by0 + (st.btop - st.by0) * S.at[1], S.top ? G + S.top : Infinity); // top: a ceiling over the ground (the railway stays low)
  if (st.levels) { const ok = st.levels.filter((y) => y >= lo - 30); if (ok.length) return want === undefined ? g.pick(ok) : ok.reduce((a, b) => (Math.abs(b - want) < Math.abs(a - want) ? b : a)); }
  if (hi < lo) return null;
  if (want === undefined) return Math.round(lo + g.rnd() * (hi - lo));
  return Math.round(Math.min(hi, Math.max(lo, want)));
}

// Builds one link from building a to building b, if there is room for it. Returns true if it was built.
function link(g, a, b, S, G) {
  const w = g.w, ax0 = (a.bx0 + a.bx1) / 2, az0 = (a.bz0 + a.bz1) / 2, bx0 = (b.bx0 + b.bx1) / 2, bz0 = (b.bz0 + b.bz1) / 2;
  let dx = bx0 - ax0, dz = bz0 - az0;
  const D = Math.hypot(dx, dz) || 1;
  dx /= D; dz /= D;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ya = heightOn(g, a, S, G);
    if (ya === null) return false;
    const yb = heightOn(g, b, S, G, ya + (g.rnd() * 2 - 1) * D * S.slope);
    if (yb === null) return false;
    const pa = attach(w, a, ya, dx, dz), pb = attach(w, b, yb, -dx, -dz);
    if (!pa || !pb) continue;
    const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    if (L < Math.max(4, S.range[0] * 0.3) || L > S.range[1] || Math.abs(yb - ya) > L * S.slope + 2) continue;
    const ux = (pb[0] - pa[0]) / L, uz = (pb[1] - pa[1]) / L, nx = -uz, nz = ux;
    const sag = S.sag ? Math.min(S.sagMax, L * S.sag) : 0, wave = S.waves ? Math.min(S.wavesMax, L * S.waves) : 0, humps = 1 + Math.floor(L / 70);
    const yAt = (t) => {
      const f = t / L;
      let y = ya + (yb - ya) * f - Math.sin(Math.PI * f) * sag;
      if (wave) y += Math.sin(Math.PI * f * humps * 2) * wave * Math.sin(Math.PI * f); // humps that fade towards both ends
      return Math.max(G + 4, Math.round(y));
    };
    // Room: nothing solid along the way except the two buildings themselves.
    let free = true;
    for (let t = 1; t < L - 1 && free; t += 1.5) {
      const x = pa[0] + ux * t, z = pa[1] + uz * t, y = yAt(t);
      for (const s of [-S.hw, 0, S.hw]) {
        const px = Math.round(x + nx * s), pz = Math.round(z + nz * s), own = w.footprint[(px & w.mx) + w.sx * (pz & w.mz)];
        for (let dy = S.clear[0]; dy <= S.clear[1]; dy++) {
          const v = w.get(px, y + dy, pz);
          if (v && (isTerrain(v) || (own !== a.id && own !== b.id))) { free = false; break; }
        }
        if (!free) break;
      }
    }
    if (!free) continue;
    // Build it. A link is a structure of its own; it is marked major afterwards, so that it never takes over the
    // footprint of the buildings it touches.
    const st = g.begin('link', S.icon ?? '🌉', { major: false });
    st.link = true;
    const look = { neon: S.neon ? g.pick(NEON) : null, paint: g.pick(S.paints ?? PAINT), trains: [], cars: [], cabins: [], train: L * (0.3 + g.rnd() * 0.4) };
    if (L > 50) for (let t = 10 + g.rnd() * 20; t < L - 40; t += 60 + g.rnd() * 60) look.trains.push(t);
    for (let t = 8 + g.rnd() * 10; t < L - 8; t += 18 + g.rnd() * 25) look.cars.push({ t, lane: g.chance(0.5) ? -3 : 3, paint: g.pick(PAINT) });
    for (let t = 12 + g.rnd() * 10; t < L - 12; t += 30 + g.rnd() * 20) look.cabins.push({ t, side: g.chance(0.5) ? -1 : 1, paint: g.pick(PAINT) });
    let k = 0, nextPier = S.pier ? S.pier * 0.5 : Infinity;
    for (let t = -1.5; t <= L + 1.5; t += 0.5, k++) { // half a step, so that diagonal links have no gaps; the ends reach into the facades
      const x = pa[0] + ux * t, z = pa[1] + uz * t, y = yAt(Math.min(L, Math.max(0, t)));
      const put = (s, dy, ty) => g.set(Math.round(x + nx * s), y + dy, Math.round(z + nz * s), ty);
      S.cross(g, put, t, t / L, k, look);
      if (t >= nextPier && t < L - 4) { // a pier down to the ground, unless it would land on a street
        const px = Math.round(x), pz = Math.round(z);
        let gy = y - 3;
        while (gy > 1 && !w.get(px, gy, pz)) gy--;
        const ground = w.get(px, gy, pz);
        if (ground === T.ROAD || ground === T.ROADLINE || !isTerrain(ground)) { nextPier = t + 3; continue; }
        const pw = S.pierW;
        for (let yy = gy + 1; yy < y - 2; yy++) {
          if (S.lattice) { g.set(px + Math.round(nx), yy, pz + Math.round(nz), S.pierT); g.set(px - Math.round(nx), yy, pz - Math.round(nz), S.pierT); if (yy % 5 === 0) put(0, yy - y, S.pierT); }
          else g.box(px - (pw >> 1), yy, pz - (pw >> 1), pw, 1, pw, S.pierT);
        }
        nextPier = t + S.pier;
      }
    }
    g.end();
    st.major = true;
    return true;
  }
  return false;
}
