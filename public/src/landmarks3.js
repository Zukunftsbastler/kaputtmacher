// The home turfs of the five creatures: worlds built for what each of them does best, all of them tall
// (well over 180 voxels) and full of weak points from which a collapse spreads.
//   dino     the primeval necropolis: mammoth trees with tree-house villages and rope bridges, giant skeletons
//   gorilla  Babel: ziggurats with pillared halls, a tower of Babel, aqueducts and hanging gardens
//   robot    the neon megacity by night: towers with giant billboards, highways on stilts, arcologies
//   tank     fortress Titan (fortress.js; flak towers and bunkers come from here)
//   jet      the cloud shipyard: floating islands held by levitation beams and cables, moored airships, a cable car
// Builders follow the lot rules of landmarks.js: (g, x0, G, z0, L, kit, H). Big plots follow BIG in landmarks2.js.

import { T } from './materials.js';
import { line } from './landmarks.js';
import { skyscraper } from './citykit.js';
import { pine } from './landmarks2.js';

const NEON = [T.NEON_RED, T.NEON_BLUE, T.NEON_GREEN, T.NEON_PINK, T.NEON_YELLOW];

// Primeval necropolis -------------------------------------------------------------------

// A mammoth tree: a trunk far taller than any house, platforms with huts at three heights, ladders between
// them and a crown of huge leaf balls. Cutting through the trunk brings the whole village down.
// Returns where its platforms are, for the rope bridges.
function mammoth(g, cx, G, cz, H, size = 1) {
  const R = Math.round((5 + g.rnd() * 2) * size), top = Math.min(H - G - 34, Math.round((150 + g.rnd() * 50) * size)), levels = [];
  const st = g.begin('mammoth', '🌲', { major: true });
  g.cyl(cx, cz, R + 3, G, 5, T.TRUNK); g.cyl(cx, cz, R + 1, G + 5, 7, T.TRUNK); // root flare
  for (let y = 12; y < top; y += 6) g.cyl(cx, cz, R, G + y, Math.min(6, top - y), (y / 6) & 1 ? T.TRUNK : T.WOOD_DARK); // bark in bands
  for (const f of [0.42, 0.62, 0.8]) {
    const y = G + Math.round(top * f), rr = R + 9;
    levels.push(y);
    for (let z = -rr; z <= rr; z++) for (let x = -rr; x <= rr; x++) { const d = Math.hypot(x, z); if (d <= rr && d > R - 1) g.set(cx + x, y, cz + z, d > rr - 1 ? T.WOOD_DARK : T.WOOD); } // platform ring
    for (let a = 0; a < 4; a++) { const dx = Math.round(Math.cos(a * 1.571 + 0.4) * rr), dz = Math.round(Math.sin(a * 1.571 + 0.4) * rr); line(g, cx + Math.round(dx * R / rr), y - 8, cz + Math.round(dz * R / rr), cx + dx, y - 1, cz + dz, T.WOOD_DARK); } // struts
    for (let a = 0; a < 6.28; a += 0.25) g.set(Math.round(cx + Math.cos(a) * rr), y + 1, Math.round(cz + Math.sin(a) * rr), T.WOOD_LIGHT); // railing
    for (let k = 0; k < 3; k++) { // huts
      const a = k * 2.1 + g.rnd(), hx = Math.round(cx + Math.cos(a) * (R + 4)) - 2, hz = Math.round(cz + Math.sin(a) * (R + 4)) - 2;
      g.box(hx, y + 1, hz, 5, 4, 5, T.WOOD_LIGHT); g.box(hx + 2, y + 1, hz + 4, 1, 3, 1, 0);
      for (let s = 0; s < 3; s++) g.box(hx - 1 + s, y + 5 + s, hz - 1 + s, 7 - 2 * s, 1, 7 - 2 * s, s & 1 ? T.LEAF_DARK : T.LEAF);
    }
  }
  for (let y = 12; y < levels[2]; y++) g.set(cx + R, G + y, cz, y & 1 ? T.WOOD_LIGHT : T.WOOD_DARK); // ladder up the trunk
  for (let k = 0; k < 6; k++) { // crown
    const a = k * 1.05 + g.rnd(), d = R + 6 + g.rnd() * 6, bx = Math.round(cx + Math.cos(a) * d), bz = Math.round(cz + Math.sin(a) * d), by = G + top - 6 + Math.round(g.rnd() * 14);
    line(g, cx, by - 10, cz, bx, by, bz, T.TRUNK, 2);
    g.ball(bx, by + 4, bz, 9 + Math.round(g.rnd() * 4 * size), [T.LEAF_DARK, T.LEAF, T.LEAF_DARK]);
  }
  g.ball(cx, G + top + 8, cz, 12 + Math.round(3 * size), [T.LEAF_DARK, T.LEAF]);
  st.levels = levels; // the platforms: rope bridges between trees start and end there (links.js)
  g.end();
  return { cx, cz, R: R + 9, levels };
}

// A rope bridge between two platforms: planks that sag in the middle, ropes at the sides.
function ropeBridge(g, a, b, ya, yb) {
  const dx = b.cx - a.cx, dz = b.cz - a.cz, d = Math.hypot(dx, dz), ux = dx / d, uz = dz / d, px = -uz, pz = ux;
  const x0 = a.cx + ux * a.R, z0 = a.cz + uz * a.R, len = d - a.R - b.R;
  g.begin('bridge', '🌉', { major: true });
  for (let t = 0; t <= len; t += 0.5) {
    const f = t / len, y = Math.round(ya + (yb - ya) * f - Math.sin(Math.PI * f) * Math.min(8, len * 0.08));
    for (let s = -1; s <= 1; s++) g.set(Math.round(x0 + ux * t + px * s), y, Math.round(z0 + uz * t + pz * s), (Math.round(t) & 1) ? T.WOOD : T.WOOD_LIGHT);
    for (const s of [-2, 2]) { // posts every few steps, a rope along the top
      const bx = Math.round(x0 + ux * t + px * s), bz = Math.round(z0 + uz * t + pz * s);
      if (Math.round(t * 2) % 8 === 0) g.box(bx, y, bz, 1, 3, 1, T.WOOD_DARK); else g.set(bx, y, bz, T.WOOD);
      g.set(bx, y + 2, bz, T.FABRIC_YELLOW);
    }
  }
  g.end();
}

// Giant skeletons and the ruins of a temple: the necropolis between the trees.
function fossil(g, x0, G, z0, L) {
  const cz = z0 + (L >> 1), sy = G + 14 + g.int(0, 6), x1 = x0 + 4, x2 = x0 + L - 6;
  g.begin('skeleton', '🦴', { major: true });
  line(g, x1, sy, cz, x2, sy + 4, cz, T.TILE_WHITE, 2); // spine
  for (let x = x1 + 6; x < x2 - 8; x += 4) for (const s of [-1, 1]) { // ribs
    for (let a = 0; a <= 3.0; a += 0.12) g.set(x, Math.round(sy + 1 - Math.sin(a) * 0 - (1 - Math.cos(a)) * 6), Math.round(cz + s * Math.sin(a) * 9), T.TILE_WHITE);
  }
  for (const x of [x1 + 6, x2 - 12]) for (const s of [-1, 1]) line(g, x, sy, cz, x + 2, G, cz + s * 6, T.TILE_WHITE, 2); // legs
  g.box(x2, sy - 2, cz - 4, 9, 8, 8, T.TILE_WHITE); g.box(x2 + 2, sy - 1, cz - 3, 3, 3, 1, 0); g.box(x2 + 2, sy - 1, cz + 3, 3, 3, 1, 0); // skull with eye holes
  g.box(x2 + 1, sy - 5, cz - 3, 8, 2, 6, T.TILE_WHITE); for (let i = 0; i < 8; i += 2) g.set(x2 + 1 + i, sy - 3, cz - 3, T.TILE_WHITE); // jaw and teeth
  g.end();
  g.begin('ruin', '🏛️', { major: true });
  for (let i = 0; i < 6; i++) { const px = x0 + 6 + i * 8, pz = z0 + 6, ph = g.int(6, 22); g.box(px, G, pz, 3, ph, 3, T.STONE); if (ph > 14) g.box(px - 1, G + ph, pz - 1, 5, 2, 5, T.STONE); }
  g.box(x0 + 5, G + 22, z0 + 5, 18, 2, 5, T.STONE); // a lintel still lying on three columns
  g.box(x0 + 20, G, z0 + L - 12, 8, 3, 5, T.GRANITE); g.set(x0 + 23, G + 3, z0 + L - 10, T.SECRET); // altar
  g.end();
}

// Plants of the primeval forest (the world's kit.tree): tall jungle trees with flat crowns, tree ferns and cycads.
export function jungle(g, x, y, z, scale = 1) {
  const st = g.begin('tree', '🌴', { grabbable: true }), k = g.rnd();
  if (k < 0.5) { // jungle tree: a slender trunk with buttress roots, an umbrella of leaves, a few hanging vines
    const th = Math.round((18 + g.rnd() * 14) * scale), cr = Math.round((6 + g.rnd() * 3) * scale);
    for (const [a, b] of [[-1, 0], [2, 0], [0, -1], [0, 2]]) g.box(x + a, y, z + b, 1, 3 + g.int(0, 2), 1, T.TRUNK);
    g.box(x, y, z, 2, th, 2, T.TRUNK);
    for (let l = 0; l < 3; l++) { // the crown in flat layers, widest in the middle
      const r = cr - Math.abs(l - 1) * 2;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dz * dz <= r * r + g.rnd() * r) g.set(x + dx, y + th + l, z + dz, l === 2 ? T.LEAF_LIGHT : T.LEAF_DARK);
    }
    for (let v = 0; v < 4; v++) { const a = g.rnd() * 6.28, d = cr * 0.8; const vx = Math.round(x + Math.cos(a) * d), vz = Math.round(z + Math.sin(a) * d); for (let i = 1; i < 4 + g.int(0, 6); i++) g.set(vx, y + th - i, vz, T.LEAF); }
  } else if (k < 0.82) { // tree fern: a scaly stem and a rosette of arching fronds
    const th = Math.round((7 + g.rnd() * 6) * scale), fl = Math.round((6 + g.rnd() * 3) * scale);
    g.box(x, y, z, 1, th, 1, T.WOOD_DARK);
    for (let a = 0; a < 6.28; a += 0.8) for (let i = 1; i <= fl; i++) g.set(Math.round(x + Math.cos(a) * i), y + th + Math.round(1.5 * Math.sin((i / fl) * 2.2)), Math.round(z + Math.sin(a) * i), i === fl ? T.LEAF : T.FERN);
  } else { // cycad: a thick, short stem and stiff fronds, close to the ground
    g.box(x, y, z, 2, 3, 2, T.TRUNK);
    for (let a = 0; a < 6.28; a += 0.7) line(g, x, y + 3, z, Math.round(x + Math.cos(a) * 5 * scale), y + 6, Math.round(z + Math.sin(a) * 5 * scale), T.PALM);
  }
  g.end();
  return st;
}

// A grove of giant ferns between boulders, with a fallen trunk overgrown with moss.
function fernery(g, x0, G, z0, L) {
  g.begin('ferns', '🌿', { major: true });
  for (let k = 0; k < 7; k++) {
    const cx = x0 + g.int(6, L - 7), cz = z0 + g.int(6, L - 7), fl = g.int(7, 12);
    for (let a = 0; a < 6.28; a += 0.45) for (let i = 1; i <= fl; i++) g.set(Math.round(cx + Math.cos(a) * i * 0.9), G + Math.round(i * 1.4 - (i * i) / fl), Math.round(cz + Math.sin(a) * i * 0.9), i > fl - 2 ? T.LEAF : T.FERN);
  }
  g.end();
  g.begin('rocks', '🪨', { major: true });
  for (let k = 0; k < 3; k++) g.ball(x0 + g.int(8, L - 9), G + 2, z0 + g.int(8, L - 9), g.int(3, 6), [T.STONE, T.GRANITE, T.BASALT]);
  const lz = z0 + g.int(10, L - 10);
  g.box(x0 + 4, G, lz, L - 14, 3, 3, T.TRUNK); g.box(x0 + 4, G + 3, lz, L - 14, 1, 3, T.LEAF_DARK);
  g.end();
}

// A dinosaur nest: a ring of torn-off branches with giant eggs in it, and old bones around.
function nest(g, x0, G, z0, L) {
  const cx = x0 + (L >> 1), cz = z0 + (L >> 1);
  g.begin('nest', '🥚', { major: true });
  for (let a = 0; a < 6.28; a += 0.08) for (let h = 0; h < 4; h++) { const r = 13 - h * 0.6 + g.rnd() * 1.5; g.set(Math.round(cx + Math.cos(a) * r), G + h, Math.round(cz + Math.sin(a) * r), g.chance(0.5) ? T.WOOD_DARK : T.TRUNK); }
  for (let z = -11; z <= 11; z++) for (let x = -11; x <= 11; x++) if (x * x + z * z < 121) g.set(cx + x, G, cz + z, T.LEAF_AUTUMN); // a bed of leaves
  for (let k = 0; k < 6; k++) { // the eggs, tall ellipsoids, some speckled
    const a = k * 1.05 + 0.3, ex = Math.round(cx + Math.cos(a) * 6), ez = Math.round(cz + Math.sin(a) * 6);
    for (let y = 0; y < 9; y++) { const r = 2.6 * Math.sin(((y + 0.5) / 9) * Math.PI) + 0.4; for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) if (dx * dx + dz * dz <= r * r) g.set(ex + dx, G + 1 + y, ez + dz, (dx + y * 3 + dz * 5 + k) % 7 === 0 ? T.FLOWER_YELLOW : T.EGG); }
  }
  g.end();
  g.begin('bones', '🦴', {});
  for (let k = 0; k < 4; k++) { const a = g.rnd() * 6.28, bx = Math.round(cx + Math.cos(a) * 19), bz = Math.round(cz + Math.sin(a) * 19); line(g, bx, G, bz, bx + g.int(-6, 6), G, bz + g.int(-6, 6), T.TILE_WHITE); }
  g.end();
}

// A ring of standing stones, some with lintels across, and a flat altar stone in the middle.
function henge(g, x0, G, z0, L) {
  const cx = x0 + (L >> 1), cz = z0 + (L >> 1), n = 12, r = (L >> 1) - 6, tops = [];
  g.begin('henge', '🗿', { major: true });
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 6.283, sx = Math.round(cx + Math.cos(a) * r), sz = Math.round(cz + Math.sin(a) * r), h = g.int(12, 17);
    g.box(sx - 1, G, sz - 1, 3, h, 3, k & 1 ? T.STONE : T.GRANITE); tops.push([sx, G + h, sz]);
  }
  for (let k = 0; k < n; k += 2) { const [ax, ay, az] = tops[k], [bx, by, bz] = tops[k + 1]; line(g, ax, Math.min(ay, by), az, bx, Math.min(ay, by), bz, T.STONE, 2); }
  g.box(cx - 4, G, cz - 2, 8, 2, 4, T.GRANITE); g.set(cx, G + 2, cz, T.SECRET);
  g.end();
}

// A volcano: a hollow cone of dark rock with lava in its crater and glowing streams down its side, and
// smoke rising (world.vents, drawn by reactions.js).
function volcano(g, x, G, z, W, D, kit, H) {
  const cx = x + (W >> 1), cz = z + (D >> 1), R = Math.min(W, D) / 2 - 4, top = Math.min(H - G - 40, Math.round(R * 1.1)), crater = R * 0.22;
  g.begin('volcano', '🌋', { major: true });
  for (let y = 0; y < top; y++) {
    const r = R - ((R - crater) * y) / top;
    for (let dz = -Math.ceil(r); dz <= r; dz++) for (let dx = -Math.ceil(r); dx <= r; dx++) {
      const d = Math.hypot(dx, dz);
      if (d > r || d < r - 3) continue; // a shell three voxels thick
      g.set(cx + dx, G + y, cz + dz, (dx * 3 + dz * 7 + y) % 11 === 0 ? T.BASALT : y > top - 6 ? T.BASALT : (dx + dz + y) % 5 ? T.STONE : T.GRANITE);
    }
  }
  for (let dz = -crater; dz <= crater; dz++) for (let dx = -crater; dx <= crater; dx++) if (dx * dx + dz * dz <= crater * crater) g.box(cx + dx, G + top - 8, cz + dz, 1, 3, 1, T.LAVA); // the lava lake in the crater
  for (let k = 0; k < 4; k++) { // streams of lava down the flank
    const a = k * 1.57 + g.rnd(), len = top - 10;
    for (let i = 0; i < len; i++) { const y = top - 8 - i, r = R - ((R - crater) * y) / top + 0.5; g.set(Math.round(cx + Math.cos(a + Math.sin(i * 0.08) * 0.08) * r), G + y, Math.round(cz + Math.sin(a + Math.sin(i * 0.08) * 0.08) * r), T.LAVA); }
  }
  g.end();
  (g.w.vents ??= []).push([cx, G + top, cz, crater]);
  void kit;
}

// A swamp: dark water with reeds, giant lily pads, huts on stilts and the bones of a long-necked giant.
function swamp(g, x, B, z, W, D, kit) {
  const top = B + 10; // the floor of the basin lies ten voxels below the water line
  g.begin('reeds', '🌾', { major: true });
  for (let k = 0; k < 40; k++) { const rx = x + g.int(2, W - 3), rz = z + g.int(2, D - 3); for (let i = 0; i < 5; i++) g.box(rx + g.int(-2, 2), B, rz + g.int(-2, 2), 1, 12 + g.int(0, 6), 1, T.REED); }
  g.end();
  g.begin('lilies', '🍃', {});
  for (let k = 0; k < 18; k++) { const lx = x + g.int(6, W - 7), lz = z + g.int(6, D - 7), r = g.int(2, 4); for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dz * dz <= r * r && (dx || dz < 0)) g.set(lx + dx, top - 2, lz + dz, T.LEAF); }
  g.end();
  for (let k = 0; k < 3; k++) {
    const hx = x + Math.round(W * (0.2 + 0.3 * k)), hz = z + (k & 1 ? D - 22 : 10);
    g.begin('hut', '🛖', { major: true });
    for (const [a, b] of [[0, 0], [9, 0], [0, 9], [9, 9]]) g.box(hx + a, B, hz + b, 1, 15, 1, T.WOOD_DARK);
    g.box(hx, B + 15, hz, 10, 1, 10, T.WOOD); g.shell(hx + 1, B + 16, hz + 1, 8, 5, 8, T.WOOD_LIGHT); g.box(hx + 4, B + 16, hz + 8, 2, 3, 1, 0);
    for (let s = 0; s < 4; s++) g.box(hx - 1 + s, B + 21 + s, hz - 1 + s, 12 - 2 * s, 1, 12 - 2 * s, T.REED);
    g.end();
  }
  g.begin('skeleton', '🦴', { major: true }); // a sauropod, half sunk: spine, ribs and the long neck rising out of the water
  const sx = x + Math.round(W * 0.55), sz = z + (D >> 1);
  line(g, sx, top - 3, sz, sx + 30, top + 2, sz, T.TILE_WHITE, 2);
  for (let i = 4; i < 26; i += 3) for (const sd of [-1, 1]) line(g, sx + i, top + 1, sz, sx + i, top - 6, sz + sd * 7, T.TILE_WHITE);
  line(g, sx + 30, top + 2, sz, sx + 44, top + 26, sz + 4, T.TILE_WHITE, 2); g.box(sx + 43, top + 25, sz + 3, 5, 3, 4, T.TILE_WHITE);
  g.end();
  void kit;
}

// Babel ---------------------------------------------------------------------------------------

// A ziggurat: square terraces, each a hall of pillars under a heavy ceiling, with arched doorways.
function ziggurat(g, x0, G, z0, L) {
  const stone = g.pick([T.SANDSTONE, T.CONCRETE_TAN, T.BRICK_YELLOW]);
  g.begin('ziggurat', '🛕', { major: true });
  let k = 0;
  for (let s = L - 2, y = G; s >= 14; s -= 8, y += 14, k++) {
    const x = x0 + 1 + k * 4, z = z0 + 1 + k * 4, m = x + (s >> 1);
    g.shell(x, y, z, s, 13, s, stone); g.shell(x + 1, y, z + 1, s - 2, 12, s - 2, stone);
    for (let a = 6; a < s - 4; a += 6) for (let b = 6; b < s - 4; b += 6) g.box(x + a, y, z + b, 2, 12, 2, T.STONE); // pillars
    g.box(x, y + 12, z, s, 2, s, stone); // ceiling, the floor of the next terrace
    for (const [ax, az, w, d] of [[m - 2, z, 4, 2], [m - 2, z + s - 2, 4, 2], [x, z + (s >> 1) - 2, 2, 4], [x + s - 2, z + (s >> 1) - 2, 2, 4]]) g.box(ax, y, az, w, 7, d, 0); // doorways
    for (let i = 0; i < s; i += 3) { g.set(x + i, y + 14, z, T.LEAF); g.set(x + i, y + 14, z + s - 1, T.LEAF); } // planted edges
  }
  const t = x0 + 1 + k * 4;
  g.box(t, G + k * 14, z0 + 1 + k * 4, 8, 6, 8, T.STEEL_YELLOW); g.set(t + 3, G + k * 14 + 2, z0 + 4 + k * 4, T.SECRET); // golden shrine on top
  g.end();
}

// The tower of Babel: round tiers, ever narrower, each a pillared hall with arched windows, a ramp spiralling
// round the outside and gardens hanging from every terrace. Up to some 240 voxels high.
function babel(g, x, G, z, W, D, kit, H) {
  const cx = x + (W >> 1), cz = z + (D >> 1), stone = T.SANDSTONE, th = 22;
  g.begin('babel', '🏛️', { major: true });
  let y = G, k = 0;
  for (let R = Math.min(W, D) / 2 - 3; R >= 10 && y + th < H - 30; R -= 4.5, y += th, k++) {
    const r = Math.round(R);
    g.cyl(cx, cz, r, y, th, stone, true); g.cyl(cx, cz, r - 1, y, th - 1, stone, true);
    g.cyl(cx, cz, r, y + th - 1, 2, T.STONE); // the vault: the floor of the tier above
    for (let a = 0; a < 6.28; a += 0.52) { // pillars inside, arched windows outside
      g.box(Math.round(cx + Math.cos(a) * (r - 6)), y, Math.round(cz + Math.sin(a) * (r - 6)), 2, th - 1, 2, T.STONE);
      g.box(Math.round(cx + Math.cos(a + 0.26) * r) - 1, y + 6, Math.round(cz + Math.sin(a + 0.26) * r) - 1, 3, 8, 3, 0);
    }
    for (let a = 0; a < 6.28; a += 0.03) { // the ramp, once round each terrace
      const rr = r + 1, yy = y + Math.round((a / 6.28) * th);
      g.box(Math.round(cx + Math.cos(a + k) * rr), yy, Math.round(cz + Math.sin(a + k) * rr), 2, 1, 2, T.BRICK_YELLOW);
    }
    if (k) for (let a = 0; a < 6.28; a += 0.12) g.box(Math.round(cx + Math.cos(a) * (r + 3.5)), y, Math.round(cz + Math.sin(a) * (r + 3.5)), 1, 1 + (g.chance(0.3) ? 1 : 0), 1, g.chance(0.2) ? T.FLOWER_RED : T.LEAF); // gardens on the rim of the terrace
  }
  g.box(cx - 4, y, cz - 4, 8, 10, 8, T.STEEL_YELLOW); g.set(cx, y + 10, cz, T.NEON_YELLOW); g.set(cx, y + 3, cz, T.SECRET);
  g.end();
  void kit;
}

// An aqueduct: two storeys of arches carrying a water channel across the lot.
function aqueduct(g, x0, G, z0, L) {
  const cz = z0 + (L >> 1), top = G + 30;
  g.begin('aqueduct', '🌉', { major: true });
  for (let x = x0; x < x0 + L; x++) {
    const p = (x - x0) % 12;
    if (p < 3) g.box(x, G, cz - 2, 1, top - G, 5, T.STONE); // pillars
    else { const a = Math.sin(((p - 3) / 9) * Math.PI); g.box(x, G + 13 + Math.round(a * 3), cz - 2, 1, 4 - Math.round(a * 3), 5, T.STONE); g.box(x, G + 25 + Math.round(a * 2), cz - 2, 1, 5 - Math.round(a * 2), 5, T.STONE); } // arches
    g.box(x, top, cz - 3, 1, 3, 1, T.STONE); g.box(x, top, cz + 3, 1, 3, 1, T.STONE); g.box(x, top, cz - 2, 1, 1, 5, T.STONE); g.box(x, top + 1, cz - 2, 1, 2, 5, T.WATER); // channel
  }
  g.end();
}

// Hanging gardens: terraces with palms and vines spilling over their edges.
function gardens(g, x0, G, z0, L, kit) {
  g.begin('gardens', '🌴', { major: true });
  for (let k = 0; k < 4; k++) {
    const s = L - 4 - k * 11, x = x0 + 2 + k * 5, z = z0 + 2 + k * 5, y = G + k * 9;
    g.shell(x, y, z, s, 9, s, T.BRICK_YELLOW); g.box(x + 1, y + 8, z + 1, s - 2, 1, s - 2, T.LEAF);
    for (let i = 0; i < s; i += 2) for (const [vx, vz] of [[x + i, z - 1], [x + i, z + s]]) if (g.chance(0.5)) for (let v = 0; v < 5 + (i % 4); v++) g.set(vx, y + 8 - v, vz, T.LEAF_DARK);
  }
  g.end();
  for (let k = 0; k < 5; k++) { // palms
    const px = x0 + 6 + k * 10, pz = z0 + (k & 1 ? 6 : L - 7);
    g.begin('palm', '🌴', { grabbable: true });
    for (let y = 0; y < 14; y++) g.set(px + (y > 8 ? 1 : 0), G + y, pz, T.TRUNK);
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) line(g, px + 1, G + 14, pz, px + 1 + a * 5, G + 12, pz + b * 5, T.LEAF);
    g.end();
  }
  void kit;
}

// A date palm (Babel's kit.tree): a trunk leaning a little, drooping fronds, a bunch of dates.
export function palm(g, x, y, z, scale = 1) {
  const st = g.begin('tree', '🌴', { grabbable: true }), th = Math.round((11 + g.rnd() * 7) * scale), lean = g.chance(0.5) ? 1 : -1;
  for (let i = 0; i < th; i++) g.set(x + (i > th * 0.6 ? lean : 0), y + i, z, i % 3 ? T.TRUNK : T.WOOD_DARK);
  const tx = x + lean, ty = y + th;
  for (let a = 0; a < 6.28; a += 0.9) { const fl = Math.round(6 * scale); for (let i = 1; i <= fl; i++) g.set(Math.round(tx + Math.cos(a) * i), ty - Math.round((i * i) / (fl * 1.4)), Math.round(z + Math.sin(a) * i), T.PALM); }
  g.box(tx, ty - 2, z, 1, 2, 1, T.WOOD_DARK);
  g.end();
  return st;
}

// Houses of mud brick: cubes with flat roofs, a parapet, small dark windows, an awning and jars on the roof terrace.
function adobe(g, x0, G, z0, L) {
  for (const [a, b] of [[2, 2], [28, 2], [2, 28], [28, 28]]) {
    if (g.chance(0.15)) { palm(g, x0 + a + 10, G, z0 + b + 10, 1); continue; }
    const w = g.int(12, 20), d = g.int(12, 18), x = x0 + a + g.int(0, 4), z = z0 + b + g.int(0, 4), floors = g.int(1, 3), fh = 7;
    g.begin('house', '🏠', { major: true });
    for (let f = 0; f < floors; f++) {
      const fw = f ? w - 5 : w, fd = f ? d - 4 : d, fy = G + f * fh; // upper storeys step back, leaving a terrace
      g.box(x, fy, z, fw, 1, fd, T.MUDBRICK); g.shell(x, fy + 1, z, fw, fh - 1, fd, T.MUDBRICK);
      for (let i = 3; i < fw - 2; i += 5) { g.box(x + i, fy + 3, z, 2, 2, 1, 0); g.box(x + i, fy + 3, z + fd - 1, 2, 2, 1, 0); }
      for (let i = 3; i < fd - 2; i += 5) { g.box(x, fy + 3, z + i, 1, 2, 2, 0); g.box(x + fw - 1, fy + 3, z + i, 1, 2, 2, 0); }
      g.box(x, fy + fh, z, fw, 1, fd, T.MUDBRICK); g.shell(x, fy + fh + 1, z, fw, 1, fd, T.MUDBRICK); // roof with a parapet
      for (let i = 2; i < fw; i += 6) g.box(x + i, fy + fh - 1, z - 1, 1, 1, 1, T.WOOD_DARK); // ends of the roof beams
    }
    g.box(x + (w >> 1) - 1, G + 1, z + d - 1, 3, 4, 1, T.WOOD_DARK); // door
    const ty = G + floors * fh + 1, c = g.pick([T.FABRIC_RED, T.FABRIC_BLUE, T.FABRIC_WHITE, T.FABRIC_YELLOW]);
    if (floors === 1) { for (const [px, pz] of [[x + 2, z + 2], [x + 7, z + 2], [x + 2, z + 7], [x + 7, z + 7]]) g.box(px, ty, pz, 1, 4, 1, T.WOOD); g.box(x + 2, ty + 4, z + 2, 6, 1, 6, c); } // awning on posts
    else { g.box(x + w - 4, G + fh + 1, z + 2, 2, 2, 2, T.TERRACOTTA); g.box(x + w - 4, G + fh + 1, z + 6, 2, 3, 2, T.TERRACOTTA); } // jars on the terrace
    g.end();
  }
}

// A bazaar: rows of stalls under striped awnings, with jars, rugs and fruit, around a well.
function bazaar(g, x0, G, z0, L) {
  g.begin('bazaar', '🛍️', { major: true });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) {
    if (r === 1 && (c === 1 || c === 2)) continue; // the middle is free for the well
    const x = x0 + 3 + c * 13, z = z0 + 3 + r * 17, a = g.pick([T.FABRIC_RED, T.FABRIC_BLUE, T.FABRIC_YELLOW, T.FABRIC_GREEN]);
    for (const [px, pz] of [[0, 0], [9, 0], [0, 8], [9, 8]]) g.box(x + px, G, z + pz, 1, 7, 1, T.WOOD);
    for (let i = 0; i < 10; i++) g.box(x + i, G + 7, z - 1, 1, 1, 11, i & 1 ? a : T.FABRIC_WHITE); // striped awning
    g.box(x + 1, G, z + 1, 8, 3, 3, T.WOOD_LIGHT); // counter
    for (let i = 0; i < 4; i++) g.set(x + 2 + i * 2, G + 3, z + 2, g.pick([T.FLOWER_YELLOW, T.FLOWER_RED, T.TERRACOTTA, T.LEAF_AUTUMN]));
    g.box(x + 2, G, z + 6, 6, 1, 2, g.pick([T.FABRIC_RED, T.FABRIC_BLUE])); // a rug laid out
  }
  const cx = x0 + (L >> 1), cz = z0 + (L >> 1);
  g.cyl(cx, cz, 4, G, 3, T.SANDSTONE, true); g.cyl(cx, cz, 3, G, 2, T.WATER);
  g.end();
}

// Two obelisks with golden tips and an avenue of sphinxes between them.
function obelisks(g, x0, G, z0, L) {
  g.begin('obelisk', '🗿', { major: true });
  for (const ox of [x0 + 8, x0 + L - 12]) {
    const h = g.int(44, 62);
    for (let y = 0; y < h; y++) { const r = y < 3 ? 3 : 2 - Math.floor((y / h) * 1.2); g.box(ox - r + 2, G + y, z0 + 8 - r + 2, 2 * r, 1, 2 * r, y < 3 ? T.GRANITE : T.SANDSTONE); }
    g.box(ox + 1, G + h, z0 + 9, 2, 2, 2, T.GOLD); g.set(ox + 1, G + h + 2, z0 + 9, T.GOLD);
    for (let y = 8; y < h - 6; y += 5) g.set(ox + 2, G + y, z0 + 7, T.GOLD); // hieroglyphs in gold
  }
  g.end();
  for (let k = 0; k < 4; k++) { // the sphinxes: lion bodies lying down, heads up
    const sx = x0 + 6 + k * 11, sz = z0 + L - 20;
    g.begin('sphinx', '🦁', { major: true });
    g.box(sx, G, sz, 5, 4, 12, T.SANDSTONE); g.box(sx, G, sz + 12, 2, 2, 4, T.SANDSTONE); g.box(sx + 3, G, sz + 12, 2, 2, 4, T.SANDSTONE); // body and paws
    g.box(sx, G + 4, sz + 8, 5, 5, 4, T.SANDSTONE); g.box(sx - 1, G + 6, sz + 8, 7, 4, 2, T.FABRIC_BLUE); g.box(sx + 1, G + 9, sz + 9, 3, 1, 3, T.GOLD); // head with headdress
    g.end();
  }
}

// The Ishtar gate: two towers of blue glazed brick with golden animals, crenellations, and the city wall to either side.
function gate(g, x0, G, z0, L) {
  const cz = z0 + (L >> 1), h = 44;
  g.begin('gate', '🏯', { major: true });
  g.box(x0, G, cz - 4, L, 26, 8, T.MUDBRICK); // the wall across the lot
  for (const tx of [x0 + (L >> 1) - 16, x0 + (L >> 1) + 6]) {
    g.box(tx, G, cz - 7, 10, h, 14, T.GLAZE_BLUE);
    for (let i = 0; i < 10; i += 2) g.box(tx + i, G + h, cz - 7, 1, 3, 14, T.MUDBRICK); // crenellations
    for (let y = 8; y < h - 6; y += 9) for (let i = 1; i < 9; i += 4) { g.box(tx + i, y + G, cz + 7, 3, 2, 1, T.GOLD); g.set(tx + i + 2, y + G + 2, cz + 7, T.GOLD); g.set(tx + i, y + G - 1, cz + 7, T.GOLD); } // golden bulls and dragons, in pixels
  }
  g.box(x0 + (L >> 1) - 6, G + 26, cz - 6, 12, 10, 12, T.GLAZE_BLUE); // the arch between the towers
  g.box(x0 + (L >> 1) - 5, G, cz - 8, 10, 24, 16, 0); // the passage
  for (let i = 0; i < 10; i++) g.set(x0 + (L >> 1) - 5 + i, G + 24 + (i === 0 || i === 9 ? -2 : i === 1 || i === 8 ? 0 : 1), cz - 6, T.GOLD);
  g.end();
}

// A public well: a round stone well under a roof on four posts, palms around.
function well(g, x0, G, z0, L) {
  const cx = x0 + (L >> 1), cz = z0 + (L >> 1);
  g.begin('well', '⛲', { major: true });
  g.cyl(cx, cz, 5, G, 4, T.SANDSTONE, true); g.cyl(cx, cz, 4, G, 3, T.WATER);
  for (const [a, b] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) g.box(cx + a, G, cz + b, 1, 10, 1, T.WOOD_DARK);
  for (let s = 0; s < 4; s++) g.box(cx - 7 + s, G + 10 + s, cz - 7 + s, 15 - 2 * s, 1, 15 - 2 * s, T.TERRACOTTA);
  g.end();
  for (const [a, b] of [[-16, -14], [15, -12], [-14, 16], [16, 15]]) palm(g, cx + a, G, cz + b, 1.1);
}

// A fire bowl on a stone post: the street lamp of Babel.
export function brazier(g, x, y, z) {
  g.box(x, y, z, 1, 4, 1, T.SANDSTONE);
  g.box(x - 1, y + 4, z - 1, 3, 1, 3, T.GOLD);
  g.set(x, y + 5, z, T.NEON_YELLOW);
}

// Castle world (middle ages) -------------------------------------------------------------------

// Half-timbered houses: white infill between dark beams, each upper storey jutting out over the one below,
// a steep roof of red tiles or thatch, small windows with shutters.
function timber(g, x0, G, z0, L) {
  for (const [a, b] of [[3, 3], [30, 3], [3, 30], [30, 30]]) {
    if (g.chance(0.12)) continue;
    const w = g.int(14, 20), d = g.int(12, 16), floors = g.int(2, 3), fh = 7, roof = g.chance(0.4) ? T.REED : T.ROOF_RED;
    const x = x0 + a + g.int(0, 3), z = z0 + b + g.int(0, 3);
    g.begin('house', '🏠', { major: true });
    for (let f = 0; f < floors; f++) {
      const o = f ? 1 : 0, fx = x - o * f, fz = z - o * f, fw = w + 2 * o * f, fd = d + 2 * o * f, fy = G + f * fh; // jettied storeys
      g.box(fx, fy, fz, fw, 1, fd, f ? T.WOOD_DARK : T.STONE);
      g.shell(fx, fy + 1, fz, fw, fh - 1, fd, f ? T.PLASTER_WHITE : T.STONE);
      if (f) { // the timber frame: posts, a rail at mid height, braces in the corners
        for (let i = 0; i < fw; i += 4) { g.box(fx + i, fy + 1, fz, 1, fh - 1, 1, T.WOOD_DARK); g.box(fx + i, fy + 1, fz + fd - 1, 1, fh - 1, 1, T.WOOD_DARK); }
        for (let i = 0; i < fd; i += 4) { g.box(fx, fy + 1, fz + i, 1, fh - 1, 1, T.WOOD_DARK); g.box(fx + fw - 1, fy + 1, fz + i, 1, fh - 1, 1, T.WOOD_DARK); }
        g.shell(fx, fy + 3, fz, fw, 1, fd, T.WOOD_DARK);
        for (let k = 1; k < 3; k++) { g.set(fx + k, fy + 3 + k, fz, T.WOOD_DARK); g.set(fx + fw - 1 - k, fy + 3 + k, fz + fd - 1, T.WOOD_DARK); }
      }
      for (let i = 2; i < fw - 2; i += 4) { g.box(fx + i, fy + 4, fz, 1, 2, 1, T.GLASS_DARK); g.box(fx + i, fy + 4, fz + fd - 1, 1, 2, 1, T.GLASS_DARK); }
    }
    const ty = G + floors * fh, o = floors - 1, rx = x - o - 1, rz = z - o - 1, rw = w + 2 * o + 2, rd = d + 2 * o + 2;
    for (let k = 0; 2 * k < rd; k++) { g.box(rx, ty + k, rz + k, rw, 1, 1, roof); g.box(rx, ty + k, rz + rd - 1 - k, rw, 1, 1, roof); g.box(rx + 1, ty + k, rz + k + 1, 1, 1, Math.max(0, rd - 2 - 2 * k), T.PLASTER_WHITE); g.box(rx + rw - 2, ty + k, rz + k + 1, 1, 1, Math.max(0, rd - 2 - 2 * k), T.PLASTER_WHITE); }
    g.box(x + (w >> 1) - 1, G + 1, z + d - 1, 3, 4, 1, T.WOOD_DARK); // door
    g.box(x + 2, ty, z + 2, 2, (rd >> 1) + 2, 2, T.STONE); // chimney
    g.end();
  }
}

// The lists: a jousting field with a barrier down the middle, a covered stand with banners, and striped pavilions.
function tourney(g, x0, G, z0, L) {
  const cz = z0 + (L >> 1);
  g.begin('lists', '🏇', { major: true });
  g.box(x0 + 6, G, cz, L - 12, 3, 1, T.WOOD_LIGHT); // the tilt barrier
  for (let i = 6; i < L - 6; i += 3) { g.box(x0 + i, G, z0 + 6, 1, 3, 1, T.WOOD); g.box(x0 + i, G, z0 + L - 7, 1, 3, 1, T.WOOD); }
  for (let k = 0; k < 4; k++) g.box(x0 + 12, G + k * 2, z0 + L - 6 + k, L - 24, 2, 1, T.WOOD); // the stand, in rows
  for (let i = 12; i < L - 12; i += 6) { g.box(x0 + i, G, z0 + L - 2, 1, 14, 1, T.WOOD_DARK); g.box(x0 + i, G + 10, z0 + L - 3, 1, 4, 1, g.pick([T.FABRIC_RED, T.FABRIC_BLUE, T.FABRIC_YELLOW])); }
  g.box(x0 + 11, G + 13, z0 + L - 7, L - 22, 1, 6, T.FABRIC_RED); // the canopy
  g.end();
  for (let k = 0; k < 3; k++) { // pavilions: striped cones on a round wall of cloth
    const px = x0 + 10 + k * 17, pz = z0 + 12, c = [T.FABRIC_RED, T.FABRIC_BLUE, T.FABRIC_YELLOW][k];
    g.begin('tent', '⛺', { major: true });
    g.cyl(px, pz, 5, G, 6, c, true);
    for (let y = 0; y < 7; y++) g.cyl(px, pz, 6 - y, G + 6 + y, 1, y & 1 ? T.FABRIC_WHITE : c);
    g.box(px, G + 13, pz, 1, 4, 1, T.WOOD_DARK); g.box(px + 1, G + 15, pz, 3, 2, 1, c);
    g.end();
  }
}

// Tall additions for the snow world, the airport and the harbour -----------------------------------

// A grand ski hotel: a stone base, storeys of dark wood stepping back as they rise, balconies, snow on every ledge.
function skihotel(g, x0, G, z0, L, kit, H) {
  const top = Math.min(H - 30, G + g.int(80, 140)), fh = 7;
  g.begin('hotel', '🏨', { major: true });
  let w = L - 6, d = L - 10, x = x0 + 3, z = z0 + 5, f = 0;
  for (let y = G; y + fh <= top; y += fh, f++) {
    if (f && f % 5 === 0 && w > 18) { x += 3; z += 3; w -= 6; d -= 6; g.box(x - 3, y, z - 3, w + 6, 1, d + 6, T.TILE_WHITE); } // a terrace with snow on it
    const wall = f < 2 ? T.STONE : T.WOOD_DARK;
    g.box(x, y, z, w, 1, d, T.CONCRETE); g.shell(x, y + 1, z, w, fh - 1, d, wall);
    for (let i = 2; i < w - 2; i += 4) { g.box(x + i, y + 3, z, 2, 3, 1, T.GLASS); g.box(x + i, y + 3, z + d - 1, 2, 3, 1, T.GLASS); g.box(x + i, y + 1, z + d, 3, 1, 2, T.WOOD_LIGHT); } // windows and balconies
    for (let i = 2; i < d - 2; i += 4) { g.box(x, y + 3, z + i, 1, 3, 2, T.GLASS); g.box(x + w - 1, y + 3, z + i, 1, 3, 2, T.GLASS); }
  }
  const ty = G + f * fh;
  for (let k = 0; 2 * k < d; k++) g.box(x - 1, ty + k, z + k - 1, w + 2, 1, Math.max(1, d + 2 - 2 * k), T.TILE_WHITE); // snowed-in gable roof
  g.box(x + (w >> 1), ty + (d >> 1) + 1, z + (d >> 1), 1, 8, 1, T.STEEL); g.box(x + (w >> 1) + 1, ty + (d >> 1) + 5, z + (d >> 1), 5, 3, 1, T.FABRIC_RED); // flag
  g.end();
  void kit;
}

// A cable car mast: a lattice tower with a cross arm, the cable running away down the slope, two cabins on it.
function gondola(g, x0, G, z0, L, kit, H) {
  const cx = x0 + (L >> 1), cz = z0 + (L >> 1), h = Math.min(H - G - 30, g.int(70, 110)), c = T.STEEL_YELLOW;
  g.begin('lift', '🚡', { major: true });
  for (let y = 0; y < h; y++) {
    const r = Math.max(1, Math.round(5 - (y / h) * 3.5));
    for (const [a, b] of [[-r, -r], [r, -r], [-r, r], [r, r]]) g.set(cx + a, G + y, cz + b, c);
    if (y % 6 === 0) g.shell(cx - r, G + y, cz - r, 2 * r + 1, 1, 2 * r + 1, c);
  }
  g.box(cx - 9, G + h, cz - 1, 19, 2, 3, c); // the cross arm
  for (const side of [-8, 8]) {
    line(g, cx + side, G + h - 1, cz, cx + side, G + 12, cz + L + 40, T.STEEL_DARK); // the cable, down towards the valley
    for (const f of [0.25, 0.6]) { const zz = Math.round(cz + (L + 40) * f), yy = Math.round(G + h - 1 - (h - 13) * f); g.box(cx + side, yy - 4, zz, 1, 4, 1, T.STEEL_DARK); g.box(cx + side - 3, yy - 11, zz - 3, 7, 7, 7, side < 0 ? T.CAR_RED : T.CAR_BLUE); g.box(cx + side - 3, yy - 9, zz - 3, 7, 2, 1, T.GLASS); }
  }
  g.box(cx - 10, G, cz - 6, 20, 8, 12, T.WOOD_DARK); g.box(cx - 11, G + 8, cz - 7, 22, 1, 14, T.TILE_WHITE); // the valley station
  g.end();
  void kit;
}

// A mountain: a rugged cone of rock with a snow cap, a summit cross and a hut for the skiers. Hollow inside, like the volcano.
function peak(g, x, G, z, W, D, kit, H) {
  const cx = x + (W >> 1), cz = z + (D >> 1), R = Math.min(W, D) / 2 - 4, top = Math.min(H - G - 30, Math.round(R * 1.3));
  g.begin('mountain', '🏔️', { major: true });
  for (let y = 0; y < top; y++) {
    const r0 = R * (1 - y / top) ** 0.9 + 2;
    for (let a = 0; a < 6.283; a += 1 / Math.max(4, r0)) {
      const r = r0 * (1 + 0.12 * Math.sin(a * 5 + y * 0.07) + 0.06 * Math.sin(a * 13)); // ridges and gullies
      const t = y > top * 0.62 || (y > top * 0.45 && Math.sin(a * 5) > 0.3) ? T.TILE_WHITE : (y + Math.round(a * 9)) % 7 ? T.STONE : T.GRANITE;
      g.box(Math.round(cx + Math.cos(a) * r) - 1, G + y, Math.round(cz + Math.sin(a) * r) - 1, 3, 1, 3, t);
    }
  }
  g.box(cx, G + top, cz, 1, 12, 1, T.WOOD_DARK); g.box(cx - 3, G + top + 8, cz, 7, 1, 1, T.WOOD_DARK); // summit cross
  g.end();
  pine(g, x + 6, G, z + 6, 1.4); pine(g, x + W - 8, G, z + D - 8, 1.6); pine(g, x + 8, G, z + D - 10, 1.2);
  void kit;
}

// A lighthouse: a tall tower in red and white rings with a gallery and a lantern on top.
function lighthouse(g, x0, G, z0, L, kit, H) {
  const cx = x0 + (L >> 1), cz = z0 + (L >> 1), h = Math.min(H - G - 30, g.int(90, 130));
  g.begin('lighthouse', '🗼', { major: true });
  g.cyl(cx, cz, 10, G, 4, T.GRANITE);
  for (let y = 4; y < h; y++) g.cyl(cx, cz, Math.round(8 - (y / h) * 3), G + y, 1, ((y / 12) | 0) & 1 ? T.CAR_WHITE : T.STEEL_RED, true);
  for (let y = 12; y < h; y += 12) g.cyl(cx, cz, Math.round(7 - (y / h) * 3), G + y, 1, T.STEEL_DARK); // floors
  g.cyl(cx, cz, 7, G + h, 1, T.STEEL_DARK); g.cyl(cx, cz, 7, G + h + 1, 1, T.STEEL, true); // gallery and railing
  g.cyl(cx, cz, 4, G + h + 1, 6, T.GLASS, true); g.cyl(cx, cz, 2, G + h + 2, 4, T.LAMP); // lantern
  for (let k = 0; k < 4; k++) g.cyl(cx, cz, 4 - k, G + h + 7 + k, 1, T.STEEL_RED);
  g.end();
  void kit;
}

// A radar mast at the airport: a lattice tower with a turning dish and red lights all the way up.
function radar(g, x0, G, z0, L, kit, H) {
  const cx = x0 + (L >> 1), cz = z0 + (L >> 1), h = Math.min(H - G - 30, g.int(70, 100));
  g.begin('radar', '📡', { major: true });
  for (let y = 0; y < h; y++) {
    const r = Math.max(1, Math.round(4 - (y / h) * 2.5));
    for (const [a, b] of [[-r, -r], [r, -r], [-r, r], [r, r]]) g.set(cx + a, G + y, cz + b, (y >> 3) & 1 ? T.STEEL_RED : T.CAR_WHITE);
    if (y % 5 === 0) g.shell(cx - r, G + y, cz - r, 2 * r + 1, 1, 2 * r + 1, T.STEEL);
    if (y % 20 === 19) g.set(cx + r, G + y, cz, T.NEON_RED);
  }
  g.box(cx - 8, G + h, cz - 1, 17, 6, 2, T.SHEET_WHITE); g.box(cx - 1, G + h - 2, cz - 1, 3, 2, 3, T.STEEL_DARK);
  g.box(cx - 6, G, cz + 8, 12, 6, 10, T.CONCRETE_LIGHT);
  g.end();
  void kit;
}

// Construction site (the excavator's home) -----------------------------------------------------

// A high-rise under construction: bare concrete floors on columns, the top storeys only columns with rebar sticking
// out, brick infill on the lower floors, scaffolding up one side and a hoist on another.
function shell(g, x0, G, z0, L, kit, H) {
  const fh = 6, floors = g.int(8, Math.max(9, Math.min(30, Math.floor((H - G - 40) / fh)))), w = L - 12, x = x0 + 6, z = z0 + 6, open = g.int(2, 4);
  g.begin('shell', '🏗️', { major: true });
  for (let f = 0; f <= floors; f++) {
    const y = G + f * fh, bare = f > floors - open;
    if (!bare || f === floors - open + 1) g.box(x, y, z, w, 1, w, T.CONCRETE); // the slab
    for (let a = 0; a < w; a += 6) for (let b = 0; b < w; b += 6) { // columns, with rebar on the topmost
      if (f === floors) { if ((a + b) % 12 === 0) g.box(x + a, y, z + b, 1, 3, 1, T.STEEL_RED); continue; }
      g.box(x + a, y + 1, z + b, 1, fh - 1, 1, T.CONCRETE_LIGHT);
    }
    if (f < floors - open - 1 && f % 2 === 0) for (let a = 1; a < w - 1; a++) if ((a >> 2) % 3) g.box(x + a, y + 1, z, 1, fh - 2, 1, T.BRICK_RED); // brick infill, here and there
  }
  for (let y = G; y < G + (floors - 1) * fh; y++) { // scaffolding on the side facing +z
    for (let a = 0; a <= w; a += 4) g.set(x + a, y, z + w + 2, T.STEEL);
    if ((y - G) % fh === 0) { g.box(x, y, z + w + 1, w + 1, 1, 3, T.WOOD_LIGHT); g.box(x, y + 2, z + w + 3, w + 1, 1, 1, T.STEEL); }
  }
  for (let y = G; y < G + floors * fh; y++) { g.set(x - 3, y, z + 2, T.STEEL_YELLOW); g.set(x - 3, y, z + 6, T.STEEL_YELLOW); if ((y - G) % 4 === 0) g.box(x - 3, y, z + 2, 1, 1, 5, T.STEEL_YELLOW); } // hoist mast
  const cy = G + Math.floor(floors * 0.6) * fh; g.box(x - 7, cy, z + 2, 4, 4, 5, T.STEEL_YELLOW); g.box(x - 6, cy + 1, z + 3, 2, 2, 3, T.GLASS_DARK); // and its cage
  g.end();
  void kit;
}

// Heaps of gravel and sand: loose material for the bucket.
function heaps(g, x0, G, z0, L) {
  for (let k = 0; k < 3; k++) {
    const r = g.int(7, 13), cx = x0 + 10 + k * 16 + g.int(0, 4), cz = z0 + 12 + (k & 1) * 22 + g.int(0, 6), t = g.pick([[T.STONE, T.GRANITE], [T.SANDSTONE, T.CONCRETE_TAN], [T.MUDBRICK, T.SANDSTONE]]);
    g.begin('heap', '⛰️', { major: true });
    for (let y = 0; y < r; y++) { const rr = r - y * 1.1; if (rr < 1) break; for (let dz = -Math.ceil(rr); dz <= rr; dz++) for (let dx = -Math.ceil(rr); dx <= rr; dx++) if (dx * dx + dz * dz <= rr * rr) g.set(cx + dx, G + y, cz + dz, (dx * 7 + dz * 3 + y) % 5 ? t[0] : t[1]); }
    g.end();
  }
}

// The site camp: office containers stacked two high with an outside stair, toilet cabins, a cement silo on legs.
function sitecamp(g, x0, G, z0, L) {
  g.begin('office', '🏢', { major: true });
  for (let f = 0; f < 2; f++) for (let k = 0; k < 3; k++) {
    const x = x0 + 4 + k * 13, y = G + f * 6, z = z0 + 6, c = g.pick([T.SHEET_BLUE, T.SHEET_WHITE, T.SHEET_GREEN]);
    g.box(x, y, z, 12, 6, 6, c); g.box(x + 1, y + 1, z + 1, 10, 4, 4, 0); g.box(x + 3, y + 2, z + 5, 3, 2, 1, T.GLASS); g.box(x + 8, y + 1, z + 5, 2, 4, 1, T.WOOD_DARK);
  }
  for (let i = 0; i < 6; i++) g.box(x0 + 42 + i, G + i, z0 + 13, 1, 1, 2, T.STEEL); // stairs
  g.end();
  g.begin('toilets', '🚽', { major: true });
  for (let i = 0; i < 3; i++) { g.box(x0 + 6 + i * 4, G, z0 + 20, 3, 6, 3, T.SHEET_GREEN); g.box(x0 + 7 + i * 4, G + 1, z0 + 22, 1, 4, 1, T.SHEET_WHITE); }
  g.end();
  g.begin('silo', '🏭', { major: true });
  for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) g.box(x0 + 40 + a, G, z0 + 38 + b, 1, 9, 1, T.STEEL);
  g.cyl(x0 + 40, z0 + 38, 4, G + 9, 16, T.SHEET_GREY); for (let k = 0; k < 4; k++) g.cyl(x0 + 40, z0 + 38, 4 - k, G + 25 + k, 1, T.SHEET_GREY);
  for (let y = 5; y < 9; y++) g.cyl(x0 + 40, z0 + 38, Math.max(1, y - 5), G + y, 1, T.SHEET_GREY);
  g.end();
}

// A quarry: a mass of rock cut into benches like a stepped pyramid, with a haul road spiralling up, boulders at its
// foot and a crusher with a conveyor. Solid rock all through: it is there to be dug away.
function quarry(g, x, G, z, W, D) {
  const cx = x + (W >> 1), cz = z + (D >> 1), R = Math.min(W, D) / 2 - 10, bench = 9, steps = Math.min(6, Math.floor(R / 12));
  g.begin('quarry', '⛏️', { major: true });
  for (let k = 0; k < steps; k++) {
    const r = Math.round(R - k * 12), y0 = G + k * bench;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) > r - (Math.abs(dx * dz) % 7 === 0 ? 1 : 0)) continue; // ragged edges
      const ramp = dz > r - 5 && dx > -r + 6 && dx < r - 6 && k === 0; // the haul road cut into the lowest bench
      g.box(cx + dx, y0, cz + dz, 1, ramp ? Math.round(bench * (dx + r) / (2 * r)) : bench, 1, (dx * 3 + dz * 5 + k) % 9 ? T.STONE : (k & 1 ? T.GRANITE : T.SANDSTONE));
    }
  }
  g.end();
  g.begin('rocks', '🪨', { major: true });
  for (let k = 0; k < 6; k++) { const a = g.rnd() * 6.283; g.ball(Math.round(cx + Math.cos(a) * (R + 5)), G + 2, Math.round(cz + Math.sin(a) * (R + 5)), g.int(2, 4), [T.STONE, T.GRANITE]); }
  g.end();
  g.begin('crusher', '⚙️', { major: true });
  const kx = x + 6, kz = z + 6;
  for (const [a, b] of [[0, 0], [10, 0], [0, 10], [10, 10]]) g.box(kx + a, G, kz + b, 1, 14, 1, T.STEEL_YELLOW);
  g.box(kx, G + 14, kz, 11, 6, 11, T.STEEL_YELLOW); g.box(kx + 2, G + 20, kz + 2, 7, 3, 7, T.STEEL_DARK);
  for (let i = 0; i < 26; i++) g.box(kx + 11 + i, G + 14 - Math.round(i * 0.45), kz + 4, 1, 1, 3, T.CAR_BLACK); // conveyor down to a heap
  g.end();
}

// Neon megacity --------------------------------------------------------------------------------

// A tower with giant billboards and neon strips. The billboards hang on its facade wherever that turns out to be.
function neontower(g, x0, G, z0, L, kit, H) {
  const fh = g.m(3, 5), floors = Math.max(12, Math.round(((H - G - 40) / fh) * (0.45 + g.rnd() * 0.55)));
  g.begin('tower', floors > 30 ? '🏙️' : '🏢', { major: true });
  skyscraper(g, x0, G, z0, L, floors);
  const w = g.w, cx = x0 + (L >> 1), cz = z0 + (L >> 1);
  for (let k = 0; k < 3; k++) {
    const y = G + 20 + Math.round(g.rnd() * (floors * fh * 0.7)), c1 = g.pick(NEON), c2 = g.pick(NEON);
    // Find the facade: walk in from the edge of the lot towards the middle until something solid is hit.
    const dir = k % 2 ? 1 : -1;
    let z = dir > 0 ? z0 + L : z0 - 1;
    while (Math.abs(z - cz) > 2 && !w.get(cx, y, z - dir)) z -= dir;
    if (Math.abs(z - cz) <= 2) continue;
    const bw = Math.min(L - 8, 22), bh = 12;
    g.box(cx - (bw >> 1), y, z, bw, bh, 1, T.STEEL_DARK);
    for (let i = 1; i < bw - 1; i++) for (let j = 1; j < bh - 1; j++) g.set(cx - (bw >> 1) + i, y + j, z + dir, ((i >> 2) + (j >> 1)) & 1 ? c1 : c2); // the picture
  }
  // Light lines up the facade, from the street to the roof (like the towers of a night-time Hong Kong): a column near
  // one edge of a side, followed upwards; wherever the facade steps back, the line steps back with it.
  for (let k = 0, c = g.pick(NEON); k < 2; k++) {
    const side = (k + g.int(0, 1)) % 2 ? 1 : -1, along = x0 + (k ? L - 7 : 6);
    let miss = 0;
    for (let y = G + 1; y < H - 2 && miss < 4; y++) {
      let z = side > 0 ? z0 + L : z0 - 1;
      while (Math.abs(z - cz) > 2 && !w.get(along, y, z - side)) z -= side;
      if (Math.abs(z - cz) <= 2) { miss++; continue; }
      miss = 0;
      g.set(along, y, z, c);
    }
  }
  for (const [ax, az] of [[x0 + 2, z0 + 2], [x0 + L - 3, z0 + L - 3]]) { // neon strips up the corners of the lot's plinth
    for (let y = G; y < G + 18; y++) g.set(ax, y, az, g.pick(NEON));
  }
  g.end();
}

// Highways on stilts: two decks above each other, carried by a row of piers, with cars standing on them.
function highway(g, x, G, z, W, D) {
  const cz = z + (D >> 1), decks = [G + 26, G + 52];
  g.begin('highway', '🛣️', { major: true });
  for (let px = x + 4; px < x + W - 4; px += 24) { g.box(px, G, cz - 3, 5, decks[1] - G, 7, T.CONCRETE); g.box(px - 2, decks[0] - 2, cz - 9, 9, 2, 19, T.CONCRETE_DARK); } // piers with cross beams
  for (const y of decks) {
    g.box(x, y, cz - 9, W, 2, 19, T.CONCRETE);
    g.box(x, y + 2, cz - 9, W, 2, 1, T.CONCRETE_LIGHT); g.box(x, y + 2, cz + 9, W, 2, 1, T.CONCRETE_LIGHT); // crash barriers
    for (let i = 0; i < W; i += 6) g.set(x + i, y + 1, cz, T.TILE_WHITE); // lane markings
    for (let i = 8; i < W; i += 24) { g.box(x + i, y + 2, cz - 9, 1, 8, 1, T.STEEL_DARK); g.set(x + i, y + 10, cz - 9, g.pick(NEON)); }
    for (let i = 10; i < W - 10; i += 17 + g.int(0, 12)) { const lane = g.chance(0.5) ? -5 : 3, c = g.pick([T.CAR_RED, T.CAR_BLUE, T.CAR_YELLOW, T.CAR_WHITE, T.CAR_BLACK]); g.box(x + i, y + 2, cz + lane, 8, 2, 4, c); g.box(x + i + 2, y + 4, cz + lane, 4, 2, 4, T.GLASS_DARK); g.set(x + i + 7, y + 2, cz + lane, T.HEADLIGHT); }
  }
  g.end();
}

// An arcology: a city in one building, a broad base with a tower rising out of it, glowing all over.
function arcology(g, x, G, z, W, D, kit, H) {
  const top = Math.min(H - 30, G + 230);
  g.begin('arcology', '🏢', { major: true });
  const tiers = [[0, 44, 0.06], [16, 110, 0.2], [30, top - G, 0.33]];
  for (const [inset, h, n] of tiers) {
    const bx = x + inset, bz = z + inset, bw = W - inset * 2, bd = D - inset * 2;
    if (bw < 20 || bd < 20) continue;
    for (let y = 0; y < h; y += 8) { g.box(bx, G + y, bz, bw, 1, bd, T.CONCRETE_DARK); g.shell(bx, G + y + 1, bz, bw, 7, bd, (y >> 3) & 1 ? T.GLASS_BLACK : T.GLASS_DARK); }
    for (let i = 0; i < bw; i += 10) for (let y = 0; y < h; y += 2) { g.set(bx + i, G + y, bz, T.CONCRETE_DARK); g.set(bx + i, G + y, bz + bd - 1, T.CONCRETE_DARK); }
    for (let y = 4; y < h; y += 16) g.box(bx, G + y, bz - 1, bw, 1, 1, g.pick(NEON)); // bands of light
    void n;
  }
  g.end();
  void kit;
}

// Fortress Titan ------------------------------------------------------------------------------

// A flak tower: an octagon of thick concrete with gun turrets on its four corners and ammunition on its roof.
function flak(g, x0, G, z0, L) {
  const cx = x0 + (L >> 1), cz = z0 + (L >> 1), h = 52 + g.int(0, 18), r = 13;
  g.begin('flak', '🗼', { major: true });
  for (let y = 0; y < h; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
    const oct = Math.abs(x) + Math.abs(z) <= r * 1.4;
    if (!oct) continue;
    const edge = Math.abs(x) > r - 3 || Math.abs(z) > r - 3 || Math.abs(x) + Math.abs(z) > r * 1.4 - 3;
    if (edge || y % 13 === 0) g.set(cx + x, G + y, cz + z, T.CONCRETE_DARK); // walls three thick, a floor every 13
  }
  for (const [a, b] of [[-r + 2, -r + 2], [r - 6, -r + 2], [-r + 2, r - 6], [r - 6, r - 6]]) {
    g.cyl(cx + a + 2, cz + b + 2, 3, G + h, 4, T.CONCRETE);
    line(g, cx + a + 2, G + h + 3, cz + b + 2, cx + a + 2 + Math.sign(a) * 9, G + h + 9, cz + b + 2 + Math.sign(b) * 9, T.STEEL_DARK, 2); // gun barrel
    g.w.turrets?.push({ x: cx + a + 2, y: G + h + 3, z: cz + b + 2, rocket: true, cool: g.rnd() * 3 }); // in fortress Titan it fires (actors.js)
  }
  for (let i = -4; i < 4; i += 3) g.box(cx + i, G + h, cz - 2, 2, 2, 4, T.GAS); // ammunition
  g.end();
}

// A bunker: low, massive, with firing slits and ammunition inside.
function bunker(g, x0, G, z0, L) {
  const x = x0 + 6, z = z0 + 12, w = L - 12, d = L - 26;
  g.begin('bunker', '🧱', { major: true });
  for (let k = 0; k < 4; k++) g.shell(x + k, G, z + k, w - 2 * k, 12, d - 2 * k, T.CONCRETE_DARK);
  g.box(x, G + 12, z, w, 4, d, T.CONCRETE_DARK);
  for (let i = 6; i < w - 6; i += 8) g.box(x + i, G + 7, z, 4, 1, 4, 0); // slits
  for (let i = 0; i < 4; i++) g.box(x + 6 + i * 4, G, z + 6, 2, 2, 2, T.GAS);
  g.box(x + (w >> 1) - 2, G, z + d - 4, 4, 6, 4, 0); // entrance
  g.end();
}


// The cloud shipyard --------------------------------------------------------------------------

// A floating island: a disc of earth and rock that tapers to a point underneath. It does not float by
// itself: glowing levitation beams from its engines down to the sea and steel cables hold it up. Cut them
// all and it falls. The island is built from ordinary voxels (no ground), so it can fall like a house.
function island(g, cx, cy, cz, r, G, kit, roof = true) {
  g.begin('island', '🏝️', { major: true });
  const depth = Math.round(r * 1.1);
  for (let k = 0; k <= depth; k++) {
    const rr = r * (1 - k / (depth + 1)) ** 0.7;
    for (let z = -Math.ceil(rr); z <= rr; z++) for (let x = -Math.ceil(rr); x <= rr; x++) if (x * x + z * z <= rr * rr) g.set(cx + x, cy - k, cz + z, k === 0 ? T.LEAF_LIGHT : k < 3 ? T.TERRACOTTA : T.STONE);
  }
  // Engines under the island and their beams down to the sea.
  for (let i = 0; i < 2; i++) {
    const a = i * 3.14 + 0.3, ex = Math.round(cx + Math.cos(a) * r * 0.45), ez = Math.round(cz + Math.sin(a) * r * 0.45), ey = cy - Math.round(depth * 0.55);
    g.box(ex - 2, ey - 3, ez - 2, 5, 4, 5, T.STEEL_DARK); g.box(ex - 1, ey - 4, ez - 1, 3, 1, 3, T.NEON_BLUE);
    for (let y = G; y < ey - 4; y++) g.set(ex, y, ez, T.NEON_BLUE);
  }
  // Two cables to anchor blocks in the sea.
  for (let i = 0; i < 2; i++) {
    const a = i * 3.14 + 1.2, ax = Math.round(cx + Math.cos(a) * (r + 14)), az = Math.round(cz + Math.sin(a) * (r + 14));
    g.box(ax - 2, G, az - 2, 4, 3, 4, T.CONCRETE_DARK);
    line(g, ax, G + 3, az, Math.round(cx + Math.cos(a) * (r - 1)), cy - 1, Math.round(cz + Math.sin(a) * (r - 1)), T.STEEL_DARK);
  }
  g.end();
  if (!roof) return;
  // Something on top: a cottage, a radio mast, a tree or two.
  g.begin('house', '🏠', { major: true });
  kit.house(g, cx - 5, cy + 1, cz - 4, 10, 8, 1, {});
  g.end();
  g.begin('mast', '📡', { major: true });
  for (let y = 0; y < 26; y++) g.set(cx + r - 4, cy + 1 + y, cz, T.STEEL);
  g.set(cx + r - 4, cy + 27, cz, T.NEON_RED);
  g.end();
  kit.tree(g, cx - r + 5, cy + 1, cz + 3, 1);
}

// An airship moored at the top of a mast: the hull is held only by its nose.
function airship(g, mx, mz, G, top, dir = 1) {
  g.begin('mast', '🗼', { major: true });
  for (let y = G; y < top; y++) for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.set(mx + a, y, mz + b, T.STEEL);
  for (let y = G; y < top; y += 5) g.shell(mx - 1, y, mz - 1, 3, 1, 3, T.STEEL);
  g.end();
  g.begin('airship', '🎈', { major: true });
  const len = 40, R = 7, x0 = mx + dir * 2;
  for (let i = 0; i < len; i++) {
    const t = i / (len - 1), rr = Math.max(1, Math.round(R * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) * 1.05));
    for (let z = -rr; z <= rr; z++) for (let y = -rr; y <= rr; y++) { const d = Math.hypot(z, y); if (d <= rr && (d > rr - 1.2 || i === 0 || i === len - 1)) g.set(x0 + dir * i, top + y, mz + z, i % 6 === 0 ? T.SHEET_GREY : T.FABRIC_WHITE); }
  }
  g.box(Math.min(x0 + dir * 14, x0 + dir * 24), top - R - 3, mz - 2, 10, 3, 5, T.SHEET_GREY); g.box(Math.min(x0 + dir * 15, x0 + dir * 23), top - R - 2, mz - 2, 8, 1, 1, T.GLASS_DARK); // gondola
  g.box(Math.min(x0 + dir * 18, x0 + dir * 20), top - R - 1, mz, 2, 2, 1, T.STEEL_DARK);
  for (const [a, b] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) g.box(x0 + dir * (len - 5), top + a * (R - 1), mz + b * (R - 1), 4, a ? 4 : 1, b ? 4 : 1, T.CAR_RED); // tail fins
  g.end();
}

export const LOTS3 = {
  mammoth(g, x0, G, z0, L, kit, H) { mammoth(g, x0 + (L >> 1), G, z0 + (L >> 1), H); },
  fossil,
  ziggurat,
  aqueduct,
  gardens,
  neontower,
  flak,
  bunker,
  fernery,
  nest,
  henge,
  adobe,
  bazaar,
  obelisks,
  gate,
  well,
  timber,
  tourney,
  skihotel,
  gondola,
  shell,
  heaps,
  sitecamp,
  lighthouse,
  radar,
  // A floating island at a random height, somewhere above its lot.
  island(g, x0, G, z0, L, kit, H) { island(g, x0 + (L >> 1), G + g.int(50, Math.max(60, Math.min(190, H - G - 50))), z0 + (L >> 1), g.int(14, 20), G, kit); },
  // A rock spire from the sea with a small island on top.
  spire(g, x0, G, z0, L, kit, H) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), top = G + g.int(60, Math.min(150, H - G - 40));
    g.begin('spire', '🗻', { major: true });
    for (let y = G; y < top - 8; y++) g.cyl(cx, cz, Math.max(3, Math.round(9 - ((y - G) / (top - G)) * 5)), y, 1, T.STONE);
    g.end();
    island(g, cx, top, cz, 13, G, kit);
  },
  zeppelin(g, x0, G, z0, L) { airship(g, x0 + 6, z0 + (L >> 1), G, G + g.int(40, 110)); },
};

// Big plots of the home turfs.
export const BIG3 = {
  // Four mammoth trees linked by rope bridges at two heights.
  treevillage: { w: 2, h: 2, ground: 'soil', build(g, x, G, z, W, D, kit, H) {
    const t = [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]].map(([a, b]) => mammoth(g, x + Math.round(W * a), G, z + Math.round(D * b), H, 1.1));
    for (const [i, k] of [[0, 1], [0, 2], [1, 3], [2, 3]]) { ropeBridge(g, t[i], t[k], t[i].levels[0], t[k].levels[0]); ropeBridge(g, t[i], t[k], t[i].levels[1], t[k].levels[1]); }
  } },
  babel: { w: 2, h: 2, ground: 'pave', build: babel },
  volcano: { w: 3, h: 3, ground: 'soil', build: volcano },
  peak: { w: 3, h: 3, ground: 'soil', build: peak },
  quarry: { w: 3, h: 3, ground: 'soil', build: quarry },
  swamp: { w: 3, h: 2, ground: 'basin', rim: 'soil', bed: [T.MUD, T.MOSS], tint: [0.22, 0.3, 0.12, 0.7], build: swamp }, // murky green water
  highway: { w: (n) => (n >= 16 ? 6 : 4), h: 1, ground: 'asphalt', build: highway },
  arcology: { w: 2, h: 2, ground: 'pave', build: arcology },
  // A great island with a hangar and two moored airships, and a cable car across to a smaller one.
  skyharbor: { w: 2, h: 2, ground: 'soil', build(g, x, G, z, W, D, kit, H) {
    const cy = G + Math.min(130, H - G - 60), cx = x + Math.round(W * 0.35), cz = z + Math.round(D * 0.4);
    island(g, cx, cy, cz, 34, G, kit, false);
    g.begin('hangar', '🏚️', { major: true }); kit.hall(g, cx - 18, cy + 1, cz - 12, 30, 22, 12); g.end();
    airship(g, cx + 20, cz + 18, cy + 1, cy + 30, 1);
    const sx = x + Math.round(W * 0.82), sz = z + Math.round(D * 0.8), sy = cy - 30;
    island(g, sx, sy, sz, 14, G, kit);
    g.begin('cablecar', '🚡', { major: true });
    line(g, cx + 26, cy + 14, cz + 20, sx - 6, sy + 12, sz - 6, T.STEEL_DARK);
    for (const f of [0.35, 0.7]) { const gx = Math.round(cx + 26 + (sx - 6 - cx - 26) * f), gy = Math.round(cy + 14 + (sy - cy - 2) * f), gz = Math.round(cz + 20 + (sz - 6 - cz - 20) * f); g.box(gx, gy - 4, gz, 1, 4, 1, T.STEEL_DARK); g.box(gx - 2, gy - 9, gz - 2, 5, 5, 5, T.CAR_RED); g.box(gx - 2, gy - 7, gz - 2, 5, 2, 1, T.GLASS); }
    for (const [px, py, pz] of [[cx + 26, cy + 1, cz + 20], [sx - 6, sy + 1, sz - 6]]) g.box(px - 1, py, pz - 1, 3, 14, 3, T.STEEL);
    g.end();
  } },
};
