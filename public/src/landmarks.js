// Special lots for the town generator: the rides of the funfair, the docks of the harbour and the
// giant structures of the last world. Every builder fills one lot: (g, x0, G, z0, L, kit), where
// (x0, z0) is the corner of the usable square, L its edge length, G the ground level and kit a few
// builders borrowed from worldgen.js (tree, tank, silo, hall).

import { T } from './materials.js';

const TOYS = [T.TOY_RED, T.TOY_BLUE, T.TOY_YELLOW, T.TOY_GREEN, T.TOY_ORANGE, T.TOY_PURPLE];
const STRIPES = [[T.FABRIC_RED, T.FABRIC_WHITE], [T.FABRIC_BLUE, T.FABRIC_WHITE], [T.FABRIC_YELLOW, T.FABRIC_RED], [T.FABRIC_GREEN, T.FABRIC_YELLOW]];
const BOXES = [T.CAR_RED, T.CAR_BLUE, T.CAR_GREEN, T.CAR_YELLOW, T.SHEET_GREY, T.SHEET_BLUE, T.SHEET_GREEN, T.CAR_WHITE];
const BALLOONS = [T.BALLOON_RED, T.BALLOON_BLUE, T.BALLOON_YELLOW];

// A straight line of voxels, `thick` wide.
export function line(g, x0, y0, z0, x1, y1, z1, t, thick = 1) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n), y = Math.round(y0 + ((y1 - y0) * i) / n), z = Math.round(z0 + ((z1 - z0) * i) / n);
    if (thick === 1) g.set(x, y, z, t); else g.box(x, y, z, thick, thick, thick, t);
  }
}

// A bunch of balloons on a string; they fly away when they come loose (reactions.js).
function balloons(g, x, y, z, h) {
  g.box(x, y, z, 1, h, 1, T.STEEL_DARK);
  for (const [a, b, c] of [[0, 0, 0], [1, 1, 0], [-1, 1, 1], [0, 2, -1]]) g.box(x + a, y + h + b, z + c, 1, 1, 1, g.pick(BALLOONS));
}

export const LOTS = {
  // Funfair ---------------------------------------------------------------------

  // Ferris wheel: a ring with spokes and gondolas on two A-frames.
  wheel(g, x0, G, z0, L) {
    const R = Math.min(23, (L >> 1) - 3), cx = x0 + (L >> 1), cz = z0 + (L >> 1), cy = G + R + 5, rim = g.pick([T.STEEL_RED, T.STEEL_YELLOW, T.STEEL]);
    g.begin('wheel', '🎡', { major: true });
    for (const dz of [-3, 3]) { // legs
      line(g, cx, cy, cz + dz, cx - 12, G, cz + dz, T.STEEL_DARK, 2); line(g, cx, cy, cz + dz, cx + 12, G, cz + dz, T.STEEL_DARK, 2);
      g.box(cx - 13, G, cz + dz, 28, 1, 2, T.STEEL_DARK);
    }
    g.box(cx - 1, cy - 1, cz - 3, 3, 3, 8, T.STEEL_DARK); // axle
    for (let a = 0; a < 360; a++) { // ring, two voxels deep
      const x = Math.round(cx + Math.cos(a * 0.01745) * R), y = Math.round(cy + Math.sin(a * 0.01745) * R);
      g.set(x, y, cz, rim); g.set(x, y, cz + 1, rim);
    }
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * 6.283, x = Math.round(cx + Math.cos(a) * R), y = Math.round(cy + Math.sin(a) * R);
      line(g, cx, cy, cz, x, y, cz, T.STEEL);
      g.box(x - 1, y - 4, cz - 1, 3, 3, 4, TOYS[k % TOYS.length]); g.set(x, y - 1, cz, T.STEEL); // gondola
      if (k % 3 === 0) g.set(x, y, cz + 2, T.NEON_YELLOW);
    }
    g.box(cx - 15, G, cz - 6, 6, 5, 5, T.WOOD_WHITE); g.box(cx - 15, G + 5, cz - 7, 6, 1, 7, T.FABRIC_RED); // ticket booth
    g.end();
  },

  // Roller coaster: a track that rises and dips on a forest of wooden posts, with a train on it.
  coaster(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), rx = (L >> 1) - 4, rz = (L >> 1) - 4, rail = g.pick([T.STEEL_RED, T.STEEL_YELLOW, T.CAR_BLUE]);
    g.begin('coaster', '🎢', { major: true });
    const n = 220, ph = g.rnd() * 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * 6.283;
      // A rounded square around the lot with a figure of hills.
      const x = Math.round(cx + rx * Math.cos(a) / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) * 0.86 * (0.9 + 0.1 * Math.cos(a * 4)));
      const z = Math.round(cz + rz * Math.sin(a) / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))) * 0.86 * (0.9 + 0.1 * Math.cos(a * 4)));
      const y = G + 6 + Math.round(11 * (1 + Math.sin(a * 3 + ph)) + 7 * (1 + Math.sin(a + ph * 2)));
      g.box(x, y, z, 2, 1, 2, rail);
      if (i % 5 === 0) { g.box(x, G, z, 1, y - G, 1, T.WOOD_WHITE); if ((i / 5) % 2 === 0) g.box(x + 1, G, z + 1, 1, y - G, 1, T.WOOD_WHITE); }
      if (i > 20 && i < 34 && i % 4 === 0) g.box(x, y + 1, z, 2, 2, 2, TOYS[(i >> 2) % TOYS.length]); // the train
    }
    g.box(cx - 5, G, cz - 4, 10, 5, 8, T.WOOD_LIGHT); g.box(cx - 6, G + 5, cz - 5, 12, 1, 10, T.FABRIC_YELLOW); // station
    balloons(g, cx + 7, G, cz + 6, 7);
    g.end();
  },

  carousel(g, x0, G, z0, L, kit) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), r = 11, st = g.pick(STRIPES);
    g.begin('carousel', '🎠', { major: true });
    g.cyl(cx, cz, r, G, 1, T.WOOD_LIGHT);
    g.box(cx - 1, G + 1, cz - 1, 3, 16, 3, T.STEEL_YELLOW);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * 6.283, x = Math.round(cx + Math.cos(a) * (r - 2)), z = Math.round(cz + Math.sin(a) * (r - 2));
      g.box(x, G + 1, z, 1, 11, 1, T.STEEL_YELLOW);
      g.box(x - 1, G + 3 + (k & 1), z - 1, 3, 2, 2, TOYS[k % TOYS.length]); // horse
    }
    for (let k = 0; k <= r; k++) // striped cone
      for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, z);
        if (d <= r + 1 - k && d > r - 1 - k) g.set(cx + x, G + 11 + (k >> 1), cz + z, st[Math.floor((Math.atan2(z, x) + 3.15) * 2.5) & 1]);
      }
    g.set(cx, G + 12 + (r >> 1), cz, T.NEON_YELLOW);
    g.end();
    kit.tree(g, x0 + 4, G, z0 + 4, 1); kit.tree(g, x0 + L - 6, G, z0 + L - 6, 1);
  },

  // Circus tent: a striped drum with a pointed roof. Cloth burns well.
  tent(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), r = Math.min(19, (L >> 1) - 5), st = g.pick(STRIPES), wall = 9;
    g.begin('tent', '🎪', { major: true });
    for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, z), c = st[Math.floor((Math.atan2(z, x) + 3.15) * 3.2) & 1];
      if (d <= r + 0.5 && d > r - 1) { if (!(Math.abs(x) < 3 && z > 0)) for (let y = 0; y < wall; y++) g.set(cx + x, G + y, cz + z, c); } // entrance left open
      if (d <= r + 0.5) g.box(cx + x, G + wall - 1 + Math.round((r - d) * 0.8), cz + z, 1, 2, 1, c); // two layers, so the cloth hangs together
    }
    g.box(cx, G, cz, 1, wall + Math.round(r * 0.8) + 6, 1, T.WOOD_DARK);
    g.box(cx + 1, G + wall + Math.round(r * 0.8) + 3, cz, 4, 2, 1, T.FABRIC_RED); // flag
    for (const [a, b] of [[-6, -6], [6, -6], [-6, 6], [6, 6]]) g.box(cx + a, G, cz + b, 1, wall + 5, 1, T.WOOD_DARK); // poles inside
    for (let k = 0; k < 10; k++) g.box(cx - 10 + k * 2, G, cz - 12, 2, 1 + (k % 3), 3, T.WOOD); // benches
    g.end();
  },

  // A row of booths with awnings, lights and balloons.
  stalls(g, x0, G, z0, L) {
    for (let k = 0; k < 4; k++) {
      const x = x0 + 3 + (k & 1) * (L >> 1), z = z0 + 4 + (k >> 1) * (L >> 1), st = g.pick(STRIPES), w = 16, d = 10;
      g.begin('stall', '🍭', { major: true });
      g.box(x, G, z, w, 1, d, T.WOOD);
      g.box(x, G + 1, z, w, 7, 1, T.WOOD_LIGHT); g.box(x, G + 1, z, 1, 7, d, T.WOOD_LIGHT); g.box(x + w - 1, G + 1, z, 1, 7, d, T.WOOD_LIGHT);
      g.box(x, G + 1, z + d - 1, w, 3, 1, g.pick(TOYS)); // counter
      for (let i = 0; i < w; i++) g.box(x + i, G + 8, z - 1, 1, 1, d + 4, st[(i >> 1) & 1]); // awning
      for (let i = 1; i < w - 1; i += 3) { g.box(x + i, G + 4, z + 1, 2, 2, 2, g.pick(TOYS)); g.set(x + i, G + 7, z + d, g.pick([T.NEON_RED, T.NEON_YELLOW, T.NEON_GREEN, T.NEON_PINK, T.NEON_BLUE])); } // prizes and lights
      g.end();
      g.begin('balloons', '🎈', {});
      balloons(g, x + w + 2, G, z + d - 2, 6 + (k & 1) * 2);
      g.end();
    }
  },

  // Free-fall tower: a lattice mast with a ring of seats.
  drop(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), h = 62 + g.int(0, 16);
    g.begin('droptower', '🗼', { major: true });
    g.box(cx - 5, G, cz - 5, 11, 2, 11, T.CONCRETE);
    for (let y = 0; y < h; y++) {
      for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) g.set(cx + a, G + 2 + y, cz + b, T.STEEL);
      if (y % 4 === 0) g.shell(cx - 2, G + 2 + y, cz - 2, 5, 1, 5, y % 8 ? T.STEEL : T.STEEL_RED);
    }
    const ry = G + 2 + Math.round(h * 0.7);
    g.shell(cx - 5, ry, cz - 5, 11, 3, 11, g.pick(TOYS));
    for (const [a, b] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) g.box(cx + a, ry + 1, cz + b, 1, 1, 1, T.STEEL); // the ring hangs on the mast
    g.box(cx - 3, ry + 1, cz, 7, 1, 1, T.STEEL); g.box(cx, ry + 1, cz - 3, 1, 1, 7, T.STEEL);
    g.box(cx - 3, G + 2 + h, cz - 3, 7, 2, 7, T.STEEL_RED); g.box(cx, G + 4 + h, cz, 1, 5, 1, T.STEEL); g.set(cx, G + 9 + h, cz, T.NEON_RED);
    g.end();
  },

  // Harbour -----------------------------------------------------------------------

  // Container yard: hollow steel boxes, stacked up to five high.
  containers(g, x0, G, z0, L) {
    g.begin('containers', '📦', { major: true });
    for (let b = 0; b + 6 <= L; b += 8) for (let a = 0; a + 13 <= L; a += 16) {
      const n = g.int(0, 5);
      for (let k = 0; k < n; k++) {
        const c = g.pick(BOXES), x = x0 + a, y = G + k * 5, z = z0 + b;
        g.shell(x, y, z, 13, 5, 6, c); g.box(x, y, z, 13, 1, 6, c); g.box(x, y + 4, z, 13, 1, 6, c);
        g.box(x + 12, y + 1, z + 2, 1, 3, 2, T.STEEL_DARK); // doors
      }
    }
    g.end();
  },

  // Gantry crane: two portals on rails with a long boom over the quay and a container on the hook.
  gantry(g, x0, G, z0, L) {
    const h = 34, w = 22, x = x0 + 6, z = z0 + (L >> 1) - 8, c = g.pick([T.STEEL_RED, T.STEEL_YELLOW, T.CAR_BLUE]);
    g.begin('gantry', '🏗️', { major: true });
    for (const dz of [0, 15]) {
      g.box(x, G, z + dz, 2, h, 2, c); g.box(x + w, G, z + dz, 2, h, 2, c);
      g.box(x, G + h, z + dz, w + 2, 2, 2, c); g.box(x, G + (h >> 1), z + dz, w + 2, 1, 2, c);
      line(g, x, G + (h >> 1), z + dz, x + w, G + h, z + dz, c);
    }
    g.box(x, G + h, z, 2, 2, 17, c); g.box(x + w, G + h, z, 2, 2, 17, c);
    g.box(x - 8, G + h + 2, z + 6, L - 2, 2, 4, c); // boom
    line(g, x + (w >> 1), G + h + 14, z + 8, x - 8, G + h + 4, z + 8, T.STEEL_DARK); line(g, x + (w >> 1), G + h + 14, z + 8, x + L - 12, G + h + 4, z + 8, T.STEEL_DARK);
    g.box(x + (w >> 1), G + h + 2, z + 7, 2, 13, 2, c);
    g.box(x + 6, G + h - 3, z + 5, 6, 5, 6, T.SHEET_WHITE); g.box(x + 6, G + h - 2, z + 11, 6, 2, 1, T.GLASS_DARK); // cabin
    g.box(x + L - 16, G + h - 12, z + 8, 1, 14, 1, T.STEEL_DARK); // cable
    const k = g.pick(BOXES); g.shell(x + L - 22, G + h - 17, z + 5, 13, 5, 6, k); g.box(x + L - 22, G + h - 13, z + 5, 13, 1, 6, k);
    g.end();
  },

  // Tank farm: four fuel tanks. One spark and they all go.
  tanks(g, x0, G, z0, L, kit) {
    for (const [a, b] of [[0.27, 0.27], [0.73, 0.27], [0.27, 0.73], [0.73, 0.73]]) {
      g.begin('tank', '🛢️', { major: true });
      kit.tank(g, x0 + Math.round(L * a), G, z0 + Math.round(L * b), g.m(4.5), g.m(5 + g.rnd() * 4));
      g.end();
    }
    g.begin('pipes', '🔧', {});
    g.box(x0 + Math.round(L * 0.27), G + 3, z0 + (L >> 1), Math.round(L * 0.46), 1, 1, T.STEEL); g.box(x0 + (L >> 1), G + 3, z0 + Math.round(L * 0.27), 1, 1, Math.round(L * 0.46), T.STEEL);
    g.end();
  },

  // A freighter in its dock (the lot's ground is water): hull, deck cargo, bridge and funnel.
  ship(g, x0, G, z0, L) {
    const len = L - 6, wid = 16, x = x0 + 3, z = z0 + (L >> 1) - (wid >> 1), hull = g.pick([T.STEEL_DARK, T.CAR_BLUE, T.CAR_BLACK]);
    g.begin('ship', '🚢', { major: true });
    for (let i = 0; i < len; i++) {
      const taper = i > len - 9 ? Math.ceil((i - (len - 9)) * 0.8) : i < 2 ? 2 - i : 0; // pointed bow, rounded stern
      for (let y = 0; y < 9; y++) {
        const t = y < 2 ? T.STEEL_RED : hull, w = wid - taper * 2;
        if (w < 2) continue;
        if (y === 0 || y === 8) g.box(x + i, G + y, z + taper, 1, 1, w, y ? T.SHEET_GREY : t);
        else { g.set(x + i, G + y, z + taper, t); g.set(x + i, G + y, z + taper + w - 1, t); if (i === 0 || i === len - 1 || taper) g.box(x + i, G + y, z + taper, 1, 1, w, t); }
      }
    }
    for (let a = 16; a + 13 < len - 10; a += 14) for (let b = 2; b + 6 <= wid - 1; b += 6) for (let k = 0; k < g.int(1, 3); k++) { // deck cargo
      const c = g.pick(BOXES);
      g.shell(x + a, G + 9 + k * 5, z + b, 13, 5, 6, c); g.box(x + a, G + 13 + k * 5, z + b, 13, 1, 6, c);
    }
    g.box(x + 2, G + 9, z + 2, 11, 12, wid - 4, T.SHEET_WHITE); // bridge
    for (let y = 2; y < 11; y += 3) { g.box(x + 13, G + 9 + y, z + 3, 1, 1, wid - 6, T.GLASS_DARK); g.box(x + 3, G + 9 + y, z + 2, 9, 1, 1, T.GLASS_DARK); g.box(x + 3, G + 9 + y, z + wid - 3, 9, 1, 1, T.GLASS_DARK); }
    g.box(x + 4, G + 21, z + (wid >> 1) - 2, 4, 7, 4, T.STEEL_RED); g.box(x + 4, G + 26, z + (wid >> 1) - 2, 4, 1, 4, T.CAR_BLACK); // funnel
    g.box(x + 10, G + 21, z + (wid >> 1), 1, 8, 1, T.STEEL); g.set(x + 10, G + 29, z + (wid >> 1), T.LAMP);
    g.end();
  },

  warehouse(g, x0, G, z0, L, kit) {
    g.begin('warehouse', '🏬', { major: true });
    kit.hall(g, x0 + 2, G, z0 + 4, L - 4, L - 14, g.m(7));
    g.end();
  },

  silos(g, x0, G, z0, L, kit) {
    for (let i = 0; i < 3; i++) {
      g.begin('silo', '🌾', { major: true });
      kit.silo(g, x0 + 9 + i * 17, G, z0 + (L >> 1), 7, g.m(18 + g.rnd() * 8));
      g.end();
    }
  },

  // Giants --------------------------------------------------------------------------

  // Step pyramid with a chamber inside.
  pyramid(g, x0, G, z0, L) {
    const stone = g.pick([T.SANDSTONE, T.CONCRETE_TAN, T.STONE]);
    g.begin('pyramid', '🔺', { major: true });
    for (let k = 0; k * 2 < (L >> 1) - 1; k++) {
      const s = L - k * 4;
      if (k % 4 === 3) g.shell(x0 + k * 2, G + k * 3, z0 + k * 2, s, 3, s, stone); // hollow every fourth step: it breaks in layers
      else g.box(x0 + k * 2, G + k * 3, z0 + k * 2, s, 3, s, stone);
    }
    const top = G + Math.ceil(((L >> 1) - 1) / 2) * 3, m = x0 + (L >> 1), mz = z0 + (L >> 1);
    g.box(m - 1, top, mz - 1, 2, 3, 2, T.STEEL_YELLOW);
    g.box(m - 2, G, z0, 4, 6, 14, 0); g.box(m - 6, G, mz - 6, 12, 8, 12, 0); // passage and chamber
    g.box(m - 2, G, mz - 2, 4, 2, 4, T.STEEL_YELLOW); g.set(m - 1, G + 1, mz - 1, T.SECRET); // treasure
    g.end();
  },

  // Cooling tower: a waisted concrete shell, more than a hundred metres... in toy scale.
  cooling(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), R = (L >> 1) - 2, H = 104 + g.int(0, 24);
    g.begin('cooling', '♨️', { major: true });
    for (let y = 0; y < H; y++) {
      const t = y / H, r = Math.round(R * (0.62 + 0.38 * ((t - 0.72) / 0.72) ** 2));
      for (let z = -r - 1; z <= r + 1; z++) for (let x = -r - 1; x <= r + 1; x++) {
        const d = Math.hypot(x, z);
        if (d > r + 0.5 || d <= r - 1.5) continue;
        if (y < 7 && (Math.floor((Math.atan2(z, x) + 3.15) * 5) & 1)) continue; // open legs at the foot
        g.set(cx + x, G + y, cz + z, y % 26 === 25 ? T.CONCRETE_DARK : T.CONCRETE_LIGHT);
      }
    }
    g.end();
  },

  // Television tower: a slim shaft, a pod high up, an antenna on top.
  tvtower(g, x0, G, z0, L, kit, maxY) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), H = Math.min(maxY - G - 46, 230 + g.int(0, 60)), py = G + Math.round(H * 0.72);
    g.begin('tvtower', '📡', { major: true });
    g.cyl(cx, cz, 9, G, 4, T.CONCRETE);
    for (let y = 0; y < H; y++) g.cyl(cx, cz, y < 30 ? 6 - Math.floor(y / 10) : 4, G + y, 1, T.CONCRETE_LIGHT, true);
    for (let k = 0; k < 13; k++) {
      const r = k < 5 ? 5 + k * 2 : k < 9 ? 13 : 13 - (k - 8) * 2;
      g.cyl(cx, cz, r, py + k, 1, k >= 5 && k < 8 ? T.GLASS_DARK : k === 8 ? T.NEON_RED : T.CONCRETE, k >= 5 && k < 9); // the glass band is a ring, the rest solid
    }
    for (let y = 0; y < 34; y++) g.box(cx - (y < 16 ? 1 : 0), G + H + y, cz - (y < 16 ? 1 : 0), y < 16 ? 2 : 1, 1, y < 16 ? 2 : 1, y % 8 < 4 ? T.STEEL_RED : T.TILE_WHITE);
    g.set(cx, G + H + 34, cz, T.NEON_RED);
    g.end();
  },

  // Glass dome with a garden inside.
  dome(g, x0, G, z0, L, kit) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), R = (L >> 1) - 2;
    kit.tree(g, cx - 8, G, cz - 6, 1.3); kit.tree(g, cx + 7, G, cz + 5, 1.5); kit.tree(g, cx + 2, G, cz - 10, 1.1);
    g.begin('dome', '🔮', { major: true });
    for (let y = 0; y <= R; y++) for (let z = -R; z <= R; z++) for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, y, z);
      if (d > R + 0.5 || d <= R - 1) continue;
      const rib = x === 0 || z === 0 || Math.abs(x) === Math.abs(z) || y % 8 === 0;
      g.set(cx + x, G + y, cz + z, rib ? T.STEEL : T.GLASS_GREEN);
    }
    g.end();
  },

  // A colossal statue of a robot, arms raised.
  statue(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), body = g.pick([T.STONE, T.STEEL_YELLOW, T.CONCRETE_BLUE, T.TERRACOTTA]);
    g.begin('statue', '🗿', { major: true });
    g.box(cx - 18, G, cz - 12, 36, 6, 24, T.GRANITE); // plinth
    for (const s of [-1, 1]) {
      g.box(cx + (s < 0 ? -13 : 4), G + 6, cz - 6, 9, 44, 12, body); // legs
      g.box(cx + (s < 0 ? -15 : 4), G + 6, cz - 6, 11, 5, 16, body); // feet
      g.box(cx + (s < 0 ? -24 : 16), G + 78, cz - 5, 8, 46, 10, body); // raised arms
      g.box(cx + (s < 0 ? -25 : 15), G + 124, cz - 6, 10, 9, 12, T.GRANITE); // fists
    }
    g.shell(cx - 16, G + 50, cz - 8, 32, 40, 16, body); g.box(cx - 16, G + 50, cz - 8, 32, 2, 16, body); g.box(cx - 16, G + 88, cz - 8, 32, 2, 16, body); // hollow chest
    g.box(cx - 5, G + 62, cz + 8, 10, 10, 1, T.NEON_BLUE);
    g.box(cx - 4, G + 90, cz - 4, 8, 4, 8, T.GRANITE);
    g.box(cx - 9, G + 94, cz - 8, 18, 16, 16, body); // head
    g.box(cx - 6, G + 101, cz + 8, 4, 4, 1, T.NEON_YELLOW); g.box(cx + 2, G + 101, cz + 8, 4, 4, 1, T.NEON_YELLOW); g.box(cx - 5, G + 96, cz + 8, 10, 2, 1, T.GRANITE);
    g.box(cx, G + 110, cz, 1, 8, 1, T.STEEL); g.set(cx, G + 118, cz, T.NEON_RED);
    g.end();
  },

  // Stadium: stands that rise outwards around a pitch, four floodlight masts.
  arena(g, x0, G, z0, L) {
    const cx = x0 + (L >> 1), cz = z0 + (L >> 1), R = (L >> 1) - 1;
    g.begin('arena', '🏟️', { major: true });
    for (let z = -R; z <= R; z++) for (let x = -R; x <= R; x++) {
      const d = Math.hypot(x, z * 1.12);
      if (d > R || d < R - 14) continue;
      const h = 3 + Math.round((d - (R - 14)) * 1.5), seat = TOYS[Math.floor((Math.atan2(z, x) + 3.15) * 1.6) % TOYS.length];
      if (Math.abs(x) < 3 && z > 0 && h < 14) continue; // gate
      g.box(cx + x, G, cz + z, 1, h - 1, 1, d > R - 2 ? T.CONCRETE : T.CONCRETE_DARK);
      g.set(cx + x, G + h - 1, cz + z, d > R - 2 ? T.CONCRETE_LIGHT : seat);
    }
    g.box(cx - 5, G, cz - 9, 1, 3, 1, T.TILE_WHITE); g.box(cx + 5, G, cz - 9, 1, 3, 1, T.TILE_WHITE); g.box(cx - 5, G + 3, cz - 9, 11, 1, 1, T.TILE_WHITE); // a goal
    g.end();
    g.begin('floodlight', '💡', {});
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const x = cx + a * (R - 1), z = cz + b * (R - 3);
      g.box(x, G, z, 1, 40, 1, T.STEEL); g.box(x - 2, G + 40, z, 5, 4, 1, T.LAMP);
    }
    g.end();
  },
};

// Lots whose ground is not lawn: paved (fair, harbour, giants) or water (the dock).
export const PAVED = new Set(['wheel', 'coaster', 'carousel', 'tent', 'stalls', 'drop', 'containers', 'gantry', 'tanks', 'warehouse', 'silos', 'pyramid', 'cooling', 'tvtower', 'statue', 'arena']);
export const WATER = new Set(['ship']);
