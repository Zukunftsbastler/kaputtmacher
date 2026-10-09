// More special lots for the town generator (see landmarks.js for the rules): the airport, the castle
// and its village, the spaceport, the winter resort and the city under the sea.

import { T } from './materials.js';
import { line, LOTS } from './landmarks.js';

const TOYS = [T.TOY_RED, T.TOY_BLUE, T.TOY_YELLOW, T.TOY_GREEN, T.TOY_ORANGE, T.TOY_PURPLE];
const LIVERY = [T.CAR_RED, T.CAR_BLUE, T.CAR_GREEN, T.CAR_YELLOW, T.STEEL_RED];

// A tube along x (axis 0) or z (axis 1): centre (cy, c), from a over len voxels.
function tube(g, axis, a, cy, c, len, r, t, hollow = true) {
  for (let i = 0; i < len; i++) for (let y = -r; y <= r; y++) for (let s = -r; s <= r; s++) {
    const d2 = y * y + s * s;
    if (d2 > r * r + r * 0.6 || (hollow && i > 0 && i < len - 1 && (r - 1) * (r - 1) + (r - 1) * 0.6 >= d2)) continue;
    if (axis === 0) g.set(a + i, cy + y, c + s, t); else g.set(c + s, cy + y, a + i, t);
  }
}

// The upper half of a sphere, as a shell.
function dome(g, cx, G, cz, R, t, rib = 0) {
  for (let y = 0; y <= R; y++) for (let z = -R; z <= R; z++) for (let x = -R; x <= R; x++) {
    const d = Math.hypot(x, y, z);
    if (d > R + 0.5 || d <= R - 1) continue;
    g.set(cx + x, G + y, cz + z, rib && (x === 0 || z === 0 || y % 6 === 0) ? rib : t);
  }
}

// A conifer with snow on its branches.
export function pine(g, x, y, z, scale = 1) {
  const st = g.begin('tree', '🌲', { grabbable: true });
  const h = g.m((5 + g.rnd() * 4) * scale, 6), r0 = g.m(1.6 * scale, 2), snow = g.chance(0.7);
  g.box(x, y, z, 1, h, 1, T.TRUNK);
  for (let k = 2; k < h + 2; k++) {
    const r = Math.max(0, Math.round(r0 * (1 - (k - 2) / h)) + ((k & 1) ? 0 : 1));
    for (let b = -r; b <= r; b++) for (let a = -r; a <= r; a++) if (Math.abs(a) + Math.abs(b) <= r + 1 && (a || b || k >= h)) g.set(x + a, y + k, z + b, snow && (k & 1) && Math.abs(a) + Math.abs(b) >= r ? T.TILE_WHITE : T.LEAF_DARK);
  }
  g.end();
  return st;
}

function smallPlane(g, x, G, z, c) {
  g.box(x, G + 2, z + 4, 12, 2, 2, T.SHEET_WHITE); g.box(x + 12, G + 2, z + 4, 2, 2, 2, T.STEEL_DARK); g.box(x + 6, G + 4, z + 4, 4, 1, 2, T.GLASS_DARK);
  g.box(x + 5, G + 2, z - 2, 4, 1, 14, c); g.box(x, G + 4, z + 4, 1, 3, 2, c); g.box(x, G + 3, z + 2, 2, 1, 6, c);
  g.box(x + 7, G, z + 3, 1, 2, 1, T.STEEL_DARK); g.box(x + 7, G, z + 6, 1, 2, 1, T.STEEL_DARK); g.box(x + 1, G, z + 4, 1, 2, 1, T.STEEL_DARK);
}

export const LOTS2 = {
  // Airport -----------------------------------------------------------------------

  // An airliner on the apron: fuselage, wings with fuel in them, engines, tail.
  airliner(g, x0, G, z0, L) {
    const c = g.pick(LIVERY), len = L - 6, x = x0 + 3, cz = z0 + (L >> 1), cy = G + 7;
    g.begin('airliner', '🛩️', { major: true });
    tube(g, 0, x + 3, cy, cz, len - 8, 3, T.SHEET_WHITE);
    tube(g, 0, x + len - 5, cy, cz, 3, 2, T.SHEET_WHITE, false); tube(g, 0, x + len - 2, cy, cz, 2, 1, T.STEEL_DARK, false); // nose
    tube(g, 0, x + 1, cy + 1, cz, 2, 2, T.SHEET_WHITE, false); tube(g, 0, x, cy + 2, cz, 1, 1, T.SHEET_WHITE, false); // tail cone
    for (let i = 8; i < len - 12; i += 2) { g.set(x + i, cy + 1, cz - 3, T.GLASS_DARK); g.set(x + i, cy + 1, cz + 3, T.GLASS_DARK); }
    g.box(x + 3, cy - 1, cz - 3, len - 8, 1, 1, c); g.box(x + 3, cy - 1, cz + 3, len - 8, 1, 1, c);
    g.box(x + len - 9, cy + 1, cz - 2, 2, 1, 5, T.GLASS_DARK); // cockpit
    for (const s of [-1, 1]) {
      for (let k = 0; k < 20; k++) g.box(x + (len >> 1) - 5 - (k >> 2), cy - 2, cz + s * (3 + k), 9 - (k >> 2), 1, 1, k === 6 || k === 7 ? T.GAS : T.SHEET_GREY); // swept wing
      g.box(x + (len >> 1) - 2, cy - 5, cz + s * 10 - 1, 7, 3, 3, T.STEEL_DARK); g.box(x + (len >> 1) + 5, cy - 4, cz + s * 10, 1, 1, 1, T.NEON_YELLOW); // engine
      for (let k = 0; k < 8; k++) g.box(x + 2 - (k >> 2), cy + 1, cz + s * (2 + k), 4, 1, 1, T.SHEET_GREY); // tailplane
      g.box(x + (len >> 1), G, cz + s * 5, 2, cy - G - 2, 1, T.STEEL_DARK); g.box(x + (len >> 1), G, cz + s * 5 - 1, 2, 2, 3, T.TIRE); // main gear
    }
    g.box(x + len - 12, G, cz, 1, cy - G - 3, 1, T.STEEL_DARK); g.box(x + len - 12, G, cz - 1, 2, 2, 3, T.TIRE); // nose gear
    for (let k = 0; k < 9; k++) g.box(x + 1 + (k >> 1), cy + 4 + k, cz, 6 - (k >> 1), 1, 1, c); // fin
    g.end();
  },

  // A stretch of runway: lights along the edge, a windsock, and a small plane waiting.
  runway(g, x0, G, z0, L) {
    g.begin('lights', '💡', {});
    for (let i = 2; i < L; i += 8) { g.set(x0 + i, G, z0 + 2, T.NEON_BLUE); g.set(x0 + i, G, z0 + L - 3, T.NEON_BLUE); }
    g.box(x0 + 3, G, z0 + 6, 1, 9, 1, T.STEEL); g.box(x0 + 4, G + 7, z0 + 6, 4, 2, 1, T.FABRIC_RED);
    g.end();
    if (g.chance(0.6)) { g.begin('plane', '🛩️', { major: true }); smallPlane(g, x0 + 16 + g.int(0, 14), G, z0 + 20 + g.int(0, 10), g.pick(LIVERY)); g.end(); }
  },

  // Terminal: a long glass hall with two jet bridges.
  terminal(g, x0, G, z0, L) {
    const w = L - 4, d = 22, h = 14, x = x0 + 2, z = z0 + 4;
    g.begin('terminal', '🛄', { major: true });
    g.box(x, G, z, w, 1, d, T.CONCRETE);
    g.shell(x, G + 1, z, w, h, d, T.GLASS);
    for (let i = 0; i < w; i += 6) { g.box(x + i, G + 1, z, 1, h, 1, T.STEEL); g.box(x + i, G + 1, z + d - 1, 1, h, 1, T.STEEL); g.box(x + i, G + h, z, 1, 1, d, T.STEEL); }
    g.box(x + w - 1, G + 1, z, 1, h, 1, T.STEEL); g.box(x + w - 1, G + 1, z + d - 1, 1, h, 1, T.STEEL);
    g.box(x - 1, G + h + 1, z - 1, w + 2, 1, d + 2, T.SHEET_WHITE);
    for (let i = 4; i < w - 6; i += 5) g.box(x + i, G + 1, z + 6, 3, 2, 2, g.pick([T.FABRIC_BLUE, T.FABRIC_RED])); // seats
    for (const i of [10, w - 16]) { // jet bridges on legs
      tube(g, 1, z + d, G + 7, x + i, L - d - 8, 2, T.SHEET_GREY);
      g.box(x + i, G, z + L - 10, 1, 5, 1, T.STEEL_DARK); g.box(x + i, G, z + d + 6, 1, 5, 1, T.STEEL_DARK);
    }
    g.box(x + (w >> 1) - 6, G + h + 2, z + 2, 12, 3, 1, T.NEON_BLUE);
    g.end();
  },

  // Control tower: a slim shaft, a glass cab, a radar on top.
  atc(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), h = 52 + g.int(0, 14);
    g.begin('controltower', '🗼', { major: true });
    g.shell(cx - 3, G, cz - 3, 7, h, 7, T.CONCRETE_LIGHT);
    for (let y = 8; y < h; y += 8) g.box(cx - 3, G + y, cz - 3, 7, 1, 7, T.CONCRETE);
    g.box(cx - 7, G + h, cz - 7, 15, 1, 15, T.CONCRETE);
    g.shell(cx - 7, G + h + 1, cz - 7, 15, 5, 15, T.GLASS_GREEN);
    for (const [a, b] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) g.box(cx + a, G + h + 1, cz + b, 1, 5, 1, T.STEEL);
    g.box(cx - 8, G + h + 6, cz - 8, 17, 1, 17, T.SHEET_WHITE);
    g.box(cx, G + h + 7, cz, 1, 5, 1, T.STEEL); g.box(cx - 4, G + h + 11, cz, 9, 3, 1, T.SHEET_GREY); g.set(cx, G + h + 14, cz, T.NEON_RED);
    g.box(cx - 10, G, cz + 8, 20, 9, 12, T.PLASTER_WHITE); g.box(cx - 9, G + 3, cz + 20, 18, 3, 1, T.GLASS_DARK); // base building
    g.end();
  },

  // Hangar: a barrel roof with an open front and a small plane inside.
  hangar(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1), R = (L >> 1) - 3, d = L - 12, z = z0 + 4;
    g.begin('hangar', '🏚️', { major: true });
    for (let k = 0; k < d; k++) for (let a = 0; a <= 180; a += 2) {
      const x = Math.round(cx + Math.cos(a * 0.01745) * R), y = Math.round(Math.sin(a * 0.01745) * R * 0.75);
      g.box(x, G + y, z + k, 1, 2, 1, k % 8 === 0 ? T.STEEL : T.SHEET_GREY);
    }
    for (let x = -R; x <= R; x++) for (let y = 0; y <= R * 0.75 * Math.sqrt(Math.max(0, 1 - (x * x) / (R * R))); y++) g.set(cx + x, G + y, z, T.SHEET_BLUE); // back wall
    smallPlane(g, cx - 7, G, z + 14, g.pick(LIVERY));
    g.end();
  },

  // Castle and village ------------------------------------------------------------

  // A castle: curtain wall with battlements, four round towers with pointed roofs, a gate and a tall keep.
  keep(g, x0, G, z0, L) {
    const stone = g.pick([T.STONE, T.SANDSTONE, T.CONCRETE_DARK]), roof = g.pick([T.ROOF_RED, T.ROOF_DARK, T.CAR_BLUE]), wh = 14;
    g.begin('castle', '🏰', { major: true });
    g.shell(x0 + 3, G, z0 + 3, L - 6, wh, L - 6, stone); g.shell(x0 + 4, G, z0 + 4, L - 8, wh - 2, L - 8, stone); // wall with a walkway
    for (let i = 3; i < L - 3; i += 2) { g.set(x0 + i, G + wh, z0 + 3, stone); g.set(x0 + i, G + wh, z0 + L - 4, stone); g.set(x0 + 3, G + wh, z0 + i, stone); g.set(x0 + L - 4, G + wh, z0 + i, stone); }
    const m = x0 + (L >> 1);
    g.box(m - 5, G, z0 + L - 6, 10, wh + 6, 5, stone); g.box(m - 2, G, z0 + L - 6, 4, 8, 5, 0); g.box(m - 2, G + 6, z0 + L - 5, 4, 2, 1, T.WOOD_DARK); // gatehouse with portcullis
    for (let i = -5; i < 5; i += 2) g.set(m + i, G + wh + 6, z0 + L - 2, stone);
    for (const [a, b] of [[5, 5], [L - 6, 5], [5, L - 6], [L - 6, L - 6]]) {
      g.cyl(x0 + a, z0 + b, 5, G, wh + 9, stone, true);
      g.cyl(x0 + a, z0 + b, 5, G + wh + 8, 1, stone);
      for (let k = 0; k <= 6; k++) g.cyl(x0 + a, z0 + b, 6 - k, G + wh + 9 + k * 2, 2, roof);
      g.set(x0 + a, G + wh + 23, z0 + b, T.NEON_YELLOW);
    }
    const kx = m - 8, kz = z0 + 12, kh = 38;
    g.shell(kx, G, kz, 16, kh, 16, stone);
    for (let y = 9; y < kh; y += 9) { g.box(kx, G + y, kz, 16, 1, 16, T.WOOD); for (const a of [4, 11]) { g.box(kx + a, G + y - 5, kz + 15, 1, 3, 1, 0); g.box(kx, G + y - 5, kz + a, 1, 3, 1, 0); g.box(kx + 15, G + y - 5, kz + a, 1, 3, 1, 0); } }
    g.box(kx - 1, G + kh, kz - 1, 18, 1, 18, stone);
    for (let i = -1; i < 17; i += 2) { g.set(kx + i, G + kh + 1, kz - 1, stone); g.set(kx + i, G + kh + 1, kz + 16, stone); g.set(kx - 1, G + kh + 1, kz + i, stone); g.set(kx + 16, G + kh + 1, kz + i, stone); }
    g.box(kx + 8, G + kh + 1, kz + 8, 1, 10, 1, T.WOOD_DARK); g.box(kx + 9, G + kh + 7, kz + 8, 6, 4, 1, g.pick([T.FABRIC_RED, T.FABRIC_BLUE, T.FABRIC_YELLOW]));
    g.box(kx + 6, G, kz + 6, 4, 2, 4, T.STEEL_YELLOW); g.set(kx + 7, G + 1, kz + 7, T.SECRET); // the treasure
    g.end();
  },

  // Windmill: a tapering stone tower, a wooden cap, four sails.
  windmill(g, x0, G, z0, L, kit) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1) - 4, h = 26, hy = G + h - 2, fz = cz + 6;
    g.begin('windmill', '🌬️', { major: true });
    for (let y = 0; y < h; y++) g.cyl(cx, cz, y < 9 ? 7 : y < 18 ? 6 : 5, G + y, 1, y % 9 === 8 ? T.STONE : T.PLASTER_WHITE, y % 9 !== 8);
    for (let k = 0; k <= 5; k++) g.cyl(cx, cz, 6 - k, G + h + k, 1, T.WOOD_DARK);
    g.box(cx, hy, cz + 5, 1, 1, 3, T.WOOD_DARK); // shaft
    for (let k = 0; k < 4; k++) { // sails
      const a = k * 1.5708 + 0.5, ex = Math.round(cx + Math.cos(a) * 20), ey = Math.round(hy + Math.sin(a) * 20);
      line(g, cx, hy, fz + 1, ex, ey, fz + 1, T.WOOD_DARK);
      const px = Math.round(-Math.sin(a) * 3), py = Math.round(Math.cos(a) * 3);
      for (let t = 6; t <= 20; t++) { const sx = Math.round(cx + Math.cos(a) * t), sy = Math.round(hy + Math.sin(a) * t); line(g, sx, sy, fz + 1, sx + px, sy + py, fz + 1, T.FABRIC_WHITE); }
    }
    g.box(cx - 1, G, cz + 7, 3, 5, 1, T.WOOD_DARK);
    g.end();
    kit.tree(g, x0 + 6, G, z0 + L - 8, 1.1);
  },

  // Farm: a wooden barn, hay bales that burn like tinder, a fence.
  farm(g, x0, G, z0, L, kit) {
    g.begin('barn', '🛖', { major: true });
    kit.house(g, x0 + 4, G, z0 + 4, 26, 18, 2, { wall: T.WOOD_DARK, roof: T.ROOF_BROWN });
    g.end();
    g.begin('hay', '🌾', { major: true });
    for (let i = 0; i < 6; i++) g.cyl(x0 + 38 + (i % 2) * 8, z0 + 8 + (i >> 1) * 8, 3, G, 4 + (i % 3), T.FABRIC_YELLOW);
    g.end();
    g.begin('fence', '🚧', {});
    for (let i = 0; i < L - 8; i += 2) { g.box(x0 + 4 + i, G, z0 + L - 6, 1, 3, 1, T.WOOD); g.set(x0 + 5 + i, G + 2, z0 + L - 6, T.WOOD); }
    g.end();
    kit.tree(g, x0 + 10, G, z0 + 34, 1.2); kit.tree(g, x0 + 30, G, z0 + 36, 1);
  },

  // Spaceport ---------------------------------------------------------------------

  // A rocket on its pad, full of fuel, next to the launch tower.
  rocket(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1) + 4, cz = z0 + (L >> 1), h = 84 + g.int(0, 16), by = G + 6, c = g.pick([T.CAR_RED, T.CAR_BLUE, T.STEEL_YELLOW]);
    g.begin('rocket', '🚀', { major: true });
    g.box(cx - 12, G, cz - 12, 24, 3, 24, T.CONCRETE_DARK); g.shell(cx - 6, G + 3, cz - 6, 12, 3, 12, T.STEEL_DARK); // pad and launch table
    for (let y = 0; y < h; y++) {
      g.cyl(cx, cz, 5, by + y, 1, y % 20 > 17 ? T.CAR_BLACK : y > h * 0.55 && y < h * 0.62 ? c : T.SHEET_WHITE, true);
      if (y < h * 0.8) g.cyl(cx, cz, y % 3 === 0 ? 2 : 1, by + y, 1, T.TANK); // a column of fuel
      if (y % 12 === 0) g.cyl(cx, cz, 5, by + y, 1, T.SHEET_GREY); // bulkheads hold the tanks
    }
    for (let k = 0; k < 12; k++) g.cyl(cx, cz, Math.max(0, 5 - Math.floor(k / 2.4)), by + h + k, 1, k > 8 ? c : T.SHEET_WHITE);
    for (const [a, b] of [[7, 0], [-7, 0], [0, 7], [0, -7]]) { // boosters
      for (let y = 0; y < 38; y++) g.cyl(cx + a, cz + b, 2, by + y, 1, y % 4 === 0 ? T.TANK : T.SHEET_WHITE, y % 4 !== 0);
      for (let k = 0; k < 4; k++) g.cyl(cx + a, cz + b, Math.max(0, 2 - (k >> 1)), by + 38 + k, 1, c);
      g.cyl(cx + a, cz + b, 2, by - 2, 2, T.STEEL_DARK, true);
      g.box(cx + Math.sign(a) * 5 + (a ? 0 : -1), by + 20, cz + Math.sign(b) * 5 + (b ? 0 : -1), a ? 1 : 3, 1, b ? 1 : 3, T.STEEL); // struts
    }
    g.cyl(cx, cz, 4, by - 3, 3, T.STEEL_DARK, true);
    const tx = cx - 20; // launch tower
    for (let y = 0; y < h + 10; y++) {
      for (const [a, b] of [[0, -2], [4, -2], [0, 2], [4, 2]]) g.set(tx + a, G + y, cz + b, T.STEEL_RED);
      if (y % 4 === 0) g.shell(tx, G + y, cz - 2, 5, 1, 5, T.STEEL_RED);
    }
    for (const y of [Math.round(h * 0.3), Math.round(h * 0.6), Math.round(h * 0.9)]) g.box(tx + 5, by + y, cz, cx - 5 - tx - 4, 1, 1, T.STEEL); // service arms
    g.box(tx + 2, G + h + 10, cz, 1, 6, 1, T.STEEL); g.set(tx + 2, G + h + 16, cz, T.NEON_RED);
    g.end();
  },

  // Radio telescope: a wide dish on a pedestal.
  dish(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), R = (L >> 1) - 4, ph = 22;
    g.begin('dish', '📡', { major: true });
    g.cyl(cx, cz, 6, G, 3, T.CONCRETE); g.cyl(cx, cz, 3, G + 3, ph, T.SHEET_WHITE, true);
    for (let z = -R; z <= R; z++) for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, z);
      if (d > R + 0.5) continue;
      const y = Math.round((d * d) / (R * 2.6));
      g.box(cx + x, G + 3 + ph + y, cz + z, 1, 2, 1, d > R - 1 ? T.STEEL : ((x >> 2) + (z >> 2)) & 1 ? T.SHEET_WHITE : T.SHEET_GREY);
    }
    const top = G + 3 + ph + Math.round(R / 2.6), fy = top + 12;
    for (const [a, b] of [[R - 2, 0], [-R + 2, 0], [0, R - 2], [0, -R + 2]]) line(g, cx + a, top, cz + b, cx, fy, cz, T.STEEL);
    g.box(cx - 1, fy, cz - 1, 3, 3, 3, T.STEEL_DARK); g.set(cx, fy + 3, cz, T.NEON_RED);
    g.end();
  },

  // Assembly building: an enormous hollow box with a door as tall as a rocket.
  assembly(g, x0, G, z0, L) {
    const w = L - 6, d = L - 14, h = 76, x = x0 + 3, z = z0 + 4;
    g.begin('assembly', '🛰️', { major: true });
    g.box(x, G, z, w, 1, d, T.CONCRETE);
    g.shell(x, G + 1, z, w, h, d, T.SHEET_WHITE);
    for (let i = 0; i < w; i += 9) { g.box(x + i, G + 1, z, 1, h, 1, T.STEEL); g.box(x + i, G + 1, z + d - 1, 1, h, 1, T.STEEL); }
    for (let y = 19; y < h; y += 19) { g.shell(x, G + y, z, w, 1, d, T.STEEL); g.box(x + 1, G + y, z + 1, w - 2, 1, 5, T.STEEL); } // galleries
    g.box(x, G + h + 1, z, w, 1, d, T.SHEET_GREY);
    g.box(x + (w >> 1) - 7, G + 1, z + d - 1, 14, h - 10, 1, T.STEEL_DARK); // the door
    g.box(x + 3, G + h - 14, z + d - 1, 10, 7, 1, T.CAR_BLUE); for (let i = 0; i < 7; i += 2) g.box(x + 13, G + h - 14 + i, z + d - 1, 12, 1, 1, T.CAR_RED); // flag
    g.end();
  },

  // Mission control: a low building bristling with aerials.
  control(g, x0, G, z0, L, kit) {
    g.begin('control', '🖥️', { major: true });
    kit.house(g, x0 + 4, G, z0 + 8, L - 10, 20, 2, { flat: true, wall: T.CONCRETE_LIGHT });
    const y = G + 2 * g.m(2.8, 5) + 2;
    for (let i = 0; i < 4; i++) { const ax = x0 + 8 + i * 10; g.box(ax, y, z0 + 14, 1, 6 + i * 3, 1, T.STEEL); g.set(ax, y + 6 + i * 3, z0 + 14, i & 1 ? T.NEON_RED : T.NEON_GREEN); }
    g.box(x0 + 12, y, z0 + 20, 6, 1, 6, T.SHEET_GREY); g.box(x0 + 13, y + 1, z0 + 21, 4, 3, 4, T.SHEET_WHITE);
    g.end();
  },

  // Winter resort -----------------------------------------------------------------

  // Ski jump: a tower, a long in-run on stilts, and the snowy landing hill.
  skijump(g, x0, G, z0, L) {
    const z = z0 + (L >> 1) - 3, top = 58;
    g.begin('skijump', '⛷️', { major: true });
    for (let i = 0; i <= 34; i++) {
      const t = i / 34, y = G + Math.round(top - (top - 14) * (1 - (1 - t) ** 2.2)), x = x0 + 4 + i; // steep at the top, flat at the take-off
      g.box(x, y, z, 1, 1, 6, T.TILE_WHITE); g.set(x, y + 1, z, T.STEEL_RED); g.set(x, y + 1, z + 5, T.STEEL_RED);
      g.box(x, y - 4, z, 1, 4, 6, T.STEEL); // deep enough that the steep part stays in one piece
      if (i % 5 === 0) { g.box(x, G, z, 1, y - G, 1, T.STEEL); g.box(x, G, z + 5, 1, y - G, 1, T.STEEL); if (y - G > 12) g.box(x, G + ((y - G) >> 1), z, 1, 1, 6, T.STEEL); }
    }
    g.shell(x0 + 1, G, z - 1, 5, top + 6, 8, T.CONCRETE_LIGHT); g.box(x0 + 1, G + top + 6, z - 1, 5, 1, 8, T.ROOF_RED); g.box(x0 + 5, G + top + 1, z + 1, 1, 3, 4, T.GLASS_DARK); // tower with the starting hut
    for (let i = 0; i < L - 40; i++) { // landing hill
      const y = Math.max(1, Math.round(11 * (1 - i / (L - 40)) ** 1.4));
      g.box(x0 + 40 + i, G, z - 3, 1, y, 12, T.TILE_WHITE);
    }
    g.box(x0 + 1, G + top + 7, z + 3, 1, 6, 1, T.STEEL); g.box(x0 + 2, G + top + 10, z + 3, 4, 3, 1, T.FABRIC_BLUE);
    g.end();
  },

  // Chalets: dark wooden houses under snow.
  chalet(g, x0, G, z0, L, kit) {
    for (const [a, b] of [[3, 4], [28, 26]]) {
      g.begin('chalet', '🏠', { major: true });
      kit.house(g, x0 + a, G, z0 + b, g.int(18, 22), g.int(14, 18), g.int(1, 2), { wall: g.pick([T.WOOD_DARK, T.WOOD]), roof: T.TILE_WHITE });
      g.end();
    }
    pine(g, x0 + 34, G, z0 + 10, 1); pine(g, x0 + 10, G, z0 + 36, 1.2); pine(g, x0 + 42, G, z0 + 6, 0.8);
  },

  // A giant snowman with hat, scarf, carrot and stick arms.
  snowman(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1);
    g.begin('snowman', '⛄', { major: true });
    let y = G;
    for (const r of [11, 8, 6]) {
      for (let b = -r; b <= r; b++) for (let c = -r; c <= r; c++) for (let a = -r; a <= r; a++) {
        const d = Math.hypot(a, b, c);
        if (d <= r + 0.3 && (d > r - 3 || b < -r + 3 || b > r - 3)) g.set(cx + a, y + r + b, cz + c, T.TILE_WHITE); // thick shell, solid where the balls touch
      }
      y += r * 2 - 2;
    }
    const hy = y - 6 + 2; // centre of the head
    g.box(cx - 3, hy + 1, cz + 5, 2, 2, 1, T.GRANITE); g.box(cx + 2, hy + 1, cz + 5, 2, 2, 1, T.GRANITE);
    line(g, cx, hy - 1, cz + 6, cx, hy - 2, cz + 11, T.TOY_ORANGE, 2);
    for (const dy of [-4, 0, 4]) g.box(cx, hy - 12 + dy, cz + Math.round(Math.sqrt(64 - dy * dy)), 2, 2, 2, T.GRANITE); // buttons
    g.cyl(cx, cz, 8, y - 1, 1, T.CAR_BLACK); g.cyl(cx, cz, 5, y, 7, T.CAR_BLACK); g.cyl(cx, cz, 5, y + 1, 1, T.FABRIC_RED, true);
    for (let b = -7; b <= 7; b++) for (let a = -7; a <= 7; a++) { const d = Math.hypot(a, b); if (d <= 7.4 && d > 5.6) g.box(cx + a, hy - 7, cz + b, 1, 2, 1, T.FABRIC_RED); } // scarf
    for (const s of [-1, 1]) { line(g, cx + s * 8, hy - 14, cz, cx + s * 20, hy - 6, cz, T.WOOD_DARK, 2); line(g, cx + s * 16, hy - 8, cz, cx + s * 18, hy - 2, cz, T.WOOD_DARK); }
    g.end();
  },

  // Ice rink (the lot's ground is ice): boards, floodlights, a hut.
  icerink(g, x0, G, z0, L) {
    g.begin('rink', '⛸️', { major: true });
    g.shell(x0 + 3, G, z0 + 3, L - 6, 2, L - 6, T.WOOD_WHITE);
    for (let i = 3; i < L - 3; i += 6) { g.set(x0 + i, G + 1, z0 + 3, T.CAR_RED); g.set(x0 + i, G + 1, z0 + L - 4, T.CAR_BLUE); }
    for (const [a, b] of [[3, 3], [L - 4, 3], [3, L - 4], [L - 4, L - 4]]) { g.box(x0 + a, G, z0 + b, 1, 16, 1, T.STEEL); g.box(x0 + a - 1, G + 16, z0 + b, 3, 2, 1, T.LAMP); }
    g.box(x0 + 8, G, z0 + 5, 10, 6, 6, T.WOOD); g.box(x0 + 7, G + 6, z0 + 4, 12, 1, 8, T.TILE_WHITE);
    for (const [a, b] of [[20, 20], [30, 26]]) { g.box(x0 + a, G, z0 + b, 1, 4, 1, T.STEEL_RED); g.box(x0 + a - 2, G + 2, z0 + b + 6, 5, 1, 1, T.STEEL_RED); g.box(x0 + a - 2, G, z0 + b + 6, 1, 3, 1, T.STEEL_RED); g.box(x0 + a + 2, G, z0 + b + 6, 1, 3, 1, T.STEEL_RED); } // a goal each
    g.end();
  },

  igloos(g, x0, G, z0, L) {
    for (const [a, b, r] of [[13, 13, 9], [36, 20, 7], [20, 38, 8]]) {
      g.begin('igloo', '🧊', { major: true });
      dome(g, x0 + a, G, z0 + b, r, T.TILE_WHITE);
      g.box(x0 + a - 1, G, z0 + b + r - 1, 3, 3, 3, 0); g.box(x0 + a - 2, G, z0 + b + r, 1, 4, 3, T.TILE_WHITE); g.box(x0 + a + 2, G, z0 + b + r, 1, 4, 3, T.TILE_WHITE); g.box(x0 + a - 2, G + 4, z0 + b + r, 5, 1, 3, T.TILE_WHITE);
      g.end();
    }
    pine(g, x0 + 42, G, z0 + 42, 1.1);
  },

  // City under the sea -------------------------------------------------------------

  // Habitat: a glass dome with a house in it, and tubes leading to the neighbours.
  habitat(g, x0, G, z0, L, kit) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), R = 19;
    g.begin('habitat', '🫧', { major: true });
    dome(g, cx, G, cz, R, T.GLASS, T.STEEL);
    g.box(cx - 7, G, cz - 6, 14, 1, 12, T.CONCRETE); g.shell(cx - 7, G + 1, cz - 6, 14, 6, 12, T.SHEET_WHITE); g.box(cx - 7, G + 7, cz - 6, 14, 1, 12, T.SHEET_BLUE);
    g.box(cx - 5, G + 3, cz + 5, 4, 2, 1, T.LAMP); g.box(cx + 2, G + 3, cz + 5, 4, 2, 1, T.LAMP);
    tube(g, 0, x0, G + 4, cz, (L >> 1) - R + 2, 3, T.GLASS_DARK); tube(g, 0, cx + R - 2, G + 4, cz, (L >> 1) - R + 2, 3, T.GLASS_DARK);
    g.end();
    void kit;
  },

  // Coral: branching trees in loud colours with glowing tips.
  coral(g, x0, G, z0, L) {
    const branch = (x, y, z, dx, dz, len, c, depth) => {
      const ex = Math.round(x + dx * len * 0.5), ey = y + len, ez = Math.round(z + dz * len * 0.5);
      line(g, x, y, z, ex, ey, ez, c, depth < 2 ? 2 : 1);
      if (depth >= 3 || len < 4) { g.set(ex, ey + 1, ez, g.pick([T.NEON_PINK, T.NEON_YELLOW, T.NEON_GREEN, T.NEON_BLUE])); return; }
      for (let k = 0; k < 3; k++) { const a = g.rnd() * 6.283; branch(ex, ey, ez, Math.cos(a), Math.sin(a), len * (0.55 + g.rnd() * 0.25), c, depth + 1); }
    };
    for (let i = 0; i < 6; i++) {
      g.begin('coral', '🪸', { major: true });
      branch(x0 + 8 + (i % 3) * 17 + g.int(-2, 2), G, z0 + 12 + (i >> 1 & 1) * 24 + g.int(-3, 3), 0, 0, g.int(9, 16), g.pick([T.CORAL_PINK, T.CORAL_ORANGE, T.TOY_PURPLE, T.TOY_YELLOW]), 0);
      g.end();
    }
  },

  // Kelp forest: tall swaying stalks.
  kelp(g, x0, G, z0, L) {
    for (let i = 0; i < 14; i++) {
      const x = x0 + g.int(3, L - 4), z = z0 + g.int(3, L - 4), h = g.int(18, 56), ph = g.rnd() * 6;
      g.begin('kelp', '🌿', { grabbable: true });
      for (let y = 0; y < h; y++) {
        const sx = x + Math.round(Math.sin(y * 0.16 + ph) * 2);
        g.box(sx, G + y, z, 2, 1, 1, y % 5 < 3 ? T.LEAF_DARK : T.LEAF); // two wide, so that the bends stay in one piece
        if (y % 6 === 3) g.box(sx - 1, G + y, z - 1, 4, 1, 3, T.LEAF_LIGHT);
      }
      g.end();
    }
  },

  // A yellow submarine in its cradle.
  sub(g, x0, G, z0, L) {
    const cz = z0 + (L >> 1), x = x0 + 5, len = L - 10, cy = G + 9;
    g.begin('submarine', '🤿', { major: true });
    for (const a of [8, len - 12]) { g.box(x + a, G, cz - 5, 3, 4, 11, T.STEEL_DARK); }
    tube(g, 0, x + 3, cy, cz, len - 6, 6, T.CAR_YELLOW);
    tube(g, 0, x + 1, cy, cz, 2, 4, T.CAR_YELLOW, false); tube(g, 0, x + len - 3, cy, cz, 2, 4, T.CAR_YELLOW, false); tube(g, 0, x + len - 1, cy, cz, 1, 2, T.LAMP, false);
    for (let i = 8; i < len - 8; i += 5) { g.box(x + i, cy, cz + 6, 2, 2, 1, T.GLASS); g.box(x + i, cy, cz - 6, 2, 2, 1, T.GLASS); }
    g.box(x + (len >> 1) - 4, cy + 6, cz - 2, 9, 6, 5, T.CAR_YELLOW); g.box(x + (len >> 1) + 5, cy + 8, cz - 1, 1, 2, 3, T.GLASS_DARK);
    g.box(x + (len >> 1), cy + 12, cz, 1, 6, 1, T.STEEL); g.box(x + (len >> 1), cy + 17, cz, 3, 1, 1, T.STEEL); // periscope
    g.box(x - 1, cy - 4, cz, 1, 9, 1, T.STEEL_DARK); g.box(x - 1, cy, cz - 4, 1, 1, 9, T.STEEL_DARK); g.box(x, cy, cz, 1, 1, 1, T.STEEL_DARK); // propeller
    g.box(x + 2, cy + 5, cz, 5, 5, 1, T.CAR_YELLOW); g.box(x + 2, cy, cz - 9, 4, 1, 19, T.CAR_YELLOW); // rudder and planes
    g.end();
  },

  // A sunken freighter.
  wreck(g, x0, G, z0, L) { LOTS.ship(g, x0, G, z0, L); },

  // Drilling rig: four legs up through the water, a deck with tanks and a derrick.
  rig(g, x0, G, z0, L, kit, maxY) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), h = Math.min(86, maxY - G - 60);
    g.begin('rig', '🛢️', { major: true });
    for (const [a, b] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
      g.shell(cx + a - 1, G, cz + b - 1, 3, h, 3, T.STEEL_YELLOW);
      for (let y = 6; y < h; y += 10) g.box(cx + a - 1, G + y, cz + b - 1, 3, 1, 3, T.STEEL_YELLOW);
    }
    for (let y = 10; y < h; y += 20) { g.box(cx - 12, G + y, cz - 12, 25, 1, 1, T.STEEL); g.box(cx - 12, G + y, cz + 12, 25, 1, 1, T.STEEL); g.box(cx - 12, G + y, cz - 12, 1, 1, 25, T.STEEL); g.box(cx + 12, G + y, cz - 12, 1, 1, 25, T.STEEL); }
    g.box(cx - 17, G + h, cz - 17, 35, 2, 35, T.CONCRETE_DARK);
    g.cyl(cx - 9, cz - 9, 4, G + h + 2, 7, T.GAS); g.cyl(cx - 9, cz - 9, 4, G + h + 2, 8, T.SHEET_WHITE, true); g.cyl(cx + 9, cz - 9, 4, G + h + 2, 7, T.GAS); g.cyl(cx + 9, cz - 9, 4, G + h + 2, 8, T.SHEET_WHITE, true);
    g.box(cx - 14, G + h + 2, cz + 4, 12, 7, 9, T.SHEET_WHITE); g.box(cx - 13, G + h + 5, cz + 13, 10, 2, 1, T.GLASS_DARK); // crew quarters
    for (let y = 0; y < 34; y++) { const r = 4 - Math.floor(y / 9); for (const [a, b] of [[-r, -r], [r, -r], [-r, r], [r, r]]) g.set(cx + 6 + a, G + h + 2 + y, cz + 6 + b, T.STEEL_RED); if (y % 5 === 0) g.shell(cx + 6 - r, G + h + 2 + y, cz + 6 - r, 2 * r + 1, 1, 2 * r + 1, T.STEEL_RED); if (y % 9 === 0 && y) g.box(cx + 5 - r, G + h + 2 + y, cz + 5 - r, 2 * r + 3, 1, 2 * r + 3, T.STEEL_RED); } // derrick, with a plate wherever it narrows
    g.box(cx + 6, G + 4, cz + 6, 1, h - 4, 1, T.STEEL_DARK); g.set(cx + 6, G + h + 36, cz + 6, T.NEON_RED); // the drill string
    g.end();
  },
};

// Building at a multiple of the usual size: a stand-in for the generator that enlarges everything a builder
// draws by the whole factor q around (ox, oy, oz). Every voxel becomes a block of q x q x q, so walls get
// thicker and stronger too. That turns any lot into a landmark: a castle, a jumbo jet, an ocean liner.
function scaled(g, ox, oy, oz, q) {
  const X = (v) => ox + (v - ox) * q, Y = (v) => oy + (v - oy) * q, Z = (v) => oz + (v - oz) * q, e = (q - 1) >> 1;
  return {
    u: g.u, rnd: () => g.rnd(), int: (a, b) => g.int(a, b), pick: (arr) => g.pick(arr), chance: (p) => g.chance(p), m: (a, b) => g.m(a, b),
    begin: (kind, icon, o) => g.begin(kind, icon, o), end: () => g.end(),
    set: (x, y, z, t) => g.box(X(x), Y(y), Z(z), q, q, q, t),
    box: (x, y, z, w, h, d, t) => g.box(X(x), Y(y), Z(z), w * q, h * q, d * q, t),
    shell(x, y, z, w, h, d, t) { this.box(x, y, z, w, h, 1, t); this.box(x, y, z + d - 1, w, h, 1, t); this.box(x, y, z, 1, h, d, t); this.box(x + w - 1, y, z, 1, h, d, t); },
    cyl: (cx, cz, r, y, h, t, hollow) => g.cyl(X(cx) + e, Z(cz) + e, r * q + e, Y(y), h * q, t, hollow),
    ball: (cx, cy, cz, r, types) => g.ball(X(cx) + e, Y(cy) + e, Z(cz) + e, r * q, types),
  };
}
// Turns a lot builder into the builder of a big plot: the lot at q times its size, in the middle of the plot.
const enlarged = (fn, q) => (g, x, G, z, W, D, kit, H) => {
  const L = Math.min(52, Math.floor(Math.min(W, D) / q)), ox = x + ((W - L * q) >> 1), oz = z + ((D - L * q) >> 1);
  fn(scaled(g, ox, G, oz, q), ox, G, oz, L, kit, G + Math.floor((H - G) / q));
};

// A hidden find: something odd that only shows when the building around it comes apart.
// Each has a golden voxel at its heart; breaking it counts (reactions.js).
export function egg(g, x, y, z) {
  const k = g.int(0, 5);
  if (k === 0) { // rubber duck
    g.box(x, y, z, 4, 2, 3, T.TOY_YELLOW); g.box(x + 2, y + 2, z, 2, 2, 3, T.TOY_YELLOW); g.box(x + 4, y + 2, z + 1, 1, 1, 1, T.TOY_ORANGE); g.set(x + 3, y + 3, z, T.CAR_BLACK); g.set(x + 1, y + 1, z + 1, T.SECRET);
  } else if (k === 1) { // golden cup
    g.box(x + 1, y, z + 1, 2, 1, 2, T.GRANITE); g.box(x + 1, y + 1, z + 1, 1, 1, 1, T.STEEL_YELLOW); g.box(x, y + 2, z, 3, 2, 3, T.STEEL_YELLOW); g.set(x + 1, y + 3, z + 1, T.SECRET);
  } else if (k === 2) { // a little Kaputtmacher statue
    g.box(x, y, z, 1, 2, 1, T.TOY_GREEN); g.box(x + 2, y, z, 1, 2, 1, T.TOY_GREEN); g.box(x, y + 2, z, 3, 3, 2, T.TOY_GREEN); g.box(x, y + 5, z, 3, 2, 3, T.TOY_GREEN); g.set(x, y + 6, z + 2, T.TILE_WHITE); g.set(x + 2, y + 6, z + 2, T.TILE_WHITE); g.set(x + 1, y + 3, z + 1, T.SECRET);
  } else if (k === 3) { // piano
    g.box(x, y, z, 5, 3, 2, T.CAR_BLACK); g.box(x, y + 3, z, 5, 1, 3, T.CAR_BLACK); for (let i = 0; i < 5; i++) g.set(x + i, y + 2, z + 2, i & 1 ? T.CAR_BLACK : T.TILE_WHITE); g.set(x + 2, y + 1, z + 1, T.SECRET);
  } else if (k === 4) { // treasure chest
    g.box(x, y, z, 4, 2, 3, T.WOOD_DARK); g.box(x, y + 2, z, 4, 1, 3, T.STEEL_YELLOW); g.box(x + 1, y + 1, z + 1, 2, 1, 1, T.SECRET);
  } else { // disco ball on a stand
    g.box(x + 1, y, z + 1, 1, 3, 1, T.STEEL_DARK);
    for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) g.set(x + b, y + 3 + c, z + d, (b + c + d) & 1 ? T.NEON_PINK : T.NEON_BLUE);
    g.set(x + 1, y + 4, z + 1, T.SECRET);
  }
}

// Big plots: several lots joined into one, without streets in between (worldgen.js). w, h: size in lots.
// ground: what the plot is paved with. build(g, x, G, z, W, D, kit, H) fills the rectangle W x D at (x, z).
export const BIG = {
  // A roller coaster that is not a ride of its own but winds around the others: its track is a figure of
  // eight, one loop round a Ferris wheel, the other round a circus tent and a carousel. Where the track
  // crosses itself one stretch is high and the other low. The height follows three overlaid waves (one long
  // climb and drop, three hills, and a wave that keeps the crossing apart), so no two coasters are alike.
  megacoaster: { w: 2, h: 2, ground: 'pave', build(g, x, G, z, W, D, kit) {
    const cx = x + (W >> 1), cz = z + (D >> 1), a = (W >> 1) - 5, b = (D >> 1) - 6;
    LOTS.wheel(g, cx - Math.round(a * 0.62) - 26, G, cz - 26, 52);
    LOTS.tent(g, cx + Math.round(a * 0.62) - 26, G, cz - 30, 46);
    LOTS.carousel(g, cx + Math.round(a * 0.6) - 26, G, cz + 2, 52, { tree() {} });
    const rail = g.pick([T.STEEL_RED, T.STEEL_YELLOW, T.CAR_BLUE, T.CAR_GREEN]), p1 = 0.4 + g.rnd() * 0.5, p2 = 0.3 + g.rnd() * 0.6, hill = g.rnd() * 6.283;
    const at = (t) => {
      const sx = Math.sin(t), wob = 1 + 0.1 * Math.sin(5 * t + hill);
      return [cx + a * sx * wob, G + 9 + 11 * (1 + Math.sin(3 * t + p1)) + 9 * (1 + Math.sin(t + p2)) + 8 * (1 + Math.cos(t)) + 16 * Math.exp(-((Math.sin((t - hill) / 2)) ** 2) * 14), cz + b * Math.sin(2 * t) * wob];
    };
    g.begin('megacoaster', '🎢', { major: true });
    const n = 900;
    let px = 0, py = 0, pz = 0;
    for (let i = 0; i <= n; i++) {
      const q = at((i / n) * 6.283), X = Math.round(q[0]), Y = Math.round(q[1]), Z = Math.round(q[2]);
      if (i && X === px && Y === py && Z === pz) continue;
      const lo = i ? Math.min(Y, py) : Y;
      g.box(X, lo - 1, Z, 2, Math.abs(Y - (i ? py : Y)) + 2, 2, rail); // deep enough to stay in one piece on the steep parts
      if (i % 9 === 0) for (let yy = lo - 2; yy >= G; yy--) { if (g.w.get(X, yy, Z)) break; g.set(X, yy, Z, T.WOOD_WHITE); if (i % 18 === 0) g.set(X + 1, yy, Z + 1, T.WOOD_WHITE); } // posts, down to whatever is below
      if (i > 60 && i < 110 && i % 7 === 0) g.box(X, Y + 1, Z, 2, 2, 2, TOYS[(i / 7) % TOYS.length | 0]); // the train
      px = X; py = Y; pz = Z;
    }
    const s0 = at(0.55), bx = Math.round(s0[0]) + 5, bz = Math.round(s0[2]) + 5; // a ticket hut next to the track
    g.box(bx, G, bz, 9, 6, 7, T.WOOD_LIGHT); g.box(bx - 1, G + 6, bz - 1, 11, 1, 9, T.FABRIC_YELLOW); g.box(bx + 3, G + 1, bz + 6, 3, 4, 1, T.WOOD_DARK);
    g.end();
  } },
  bigwheel: { w: 2, h: 2, ground: 'pave', build: enlarged((g, x, G, z, L) => LOTS.wheel(g, x, G, z, L), 2) },
  bigcastle: { w: 2, h: 2, ground: 'soil', build: enlarged((g, x, G, z, L, kit) => LOTS2.keep(g, x, G, z, L, kit), 2) },
  jumbo: { w: 2, h: 2, ground: 'asphalt', build: enlarged((g, x, G, z, L) => LOTS2.airliner(g, x, G, z, L), 2) },
  bigterminal: { w: 2, h: 2, ground: 'pave', build: enlarged((g, x, G, z, L) => { LOTS2.terminal(g, x, G, z, L); LOTS2.atc(g, x, G, z + 12, L); }, 2) },
  bigassembly: { w: 2, h: 2, ground: 'pave', build: enlarged((g, x, G, z, L) => LOTS2.assembly(g, x, G, z, L), 2) },
  bigdish: { w: 2, h: 2, ground: 'soil', build: enlarged((g, x, G, z, L) => LOTS2.dish(g, x, G, z, L), 2) },
  bigsnowman: { w: 2, h: 2, ground: 'soil', build: enlarged((g, x, G, z, L) => LOTS2.snowman(g, x, G, z, L), 2) },
  bighabitat: { w: 2, h: 2, ground: 'soil', build: enlarged((g, x, G, z, L, kit) => LOTS2.habitat(g, x, G, z, L, kit), 2) },
  stadium: { w: 2, h: 2, ground: 'pave', build: enlarged((g, x, G, z, L) => LOTS.arena(g, x, G, z, L), 2) },
  bigpyramid: { w: 2, h: 2, ground: 'pave', build: enlarged((g, x, G, z, L) => LOTS.pyramid(g, x, G, z, L), 2) },
  // The harbour basin: deep water with two ocean-going ships in it. G is the bottom of the basin here.
  basin: { w: 3, h: 2, ground: 'basin', build(g, x, G, z, W, D) {
    for (const [ax, az] of [[x + 2, z + (D >> 2) - 52], [x + W - 106, z + D - (D >> 2) - 52]]) LOTS.ship(scaled(g, ax, G, az, 2), ax, G, az, 52);
    g.begin('buoys', '🛟', {});
    for (let i = 0; i < 4; i++) { const bx = x + 20 + i * ((W - 40) / 3 | 0), bz = z + (D >> 1); g.box(bx, G, bz, 1, 9, 1, T.STEEL_DARK); g.box(bx - 1, G + 9, bz - 1, 3, 2, 3, i & 1 ? T.CAR_RED : T.CAR_GREEN); g.set(bx, G + 11, bz, T.NEON_YELLOW); }
    g.end();
  } },
};

// What the ground of a lot is made of, where it is not the world's ordinary soil.
export const GROUND = { runway: 'asphalt', airliner: 'asphalt', hangar: 'asphalt', icerink: 'ice' };
export const PAVED2 = new Set(['terminal', 'atc', 'rocket', 'dish', 'assembly', 'control', 'keep']);
