// Worlds are built from code: a small construction kit (walls, roofs, trees, cars ...) and one
// blueprint per world. The same seed always yields the same world, so "rebuild" is just "generate again".

import { World } from './world.js';
import { T, isTerrain } from './materials.js';
import { makeRng } from './math.js';
import { skyscraper, twinTowers, lowrise, carPark, fountain, trafficLight, busStop, hydrant } from './citykit.js';

class Gen {
  constructor(world, seed, u) {
    this.w = world;
    this.rnd = makeRng(seed);
    this.u = u; // voxels per metre
    this.cur = 0;
    this.major = false;
    world.unit = u;
    world.monsterBase = Math.round(1.8 * u * 10) / 10;
  }
  int(a, b) { return a + Math.floor(this.rnd() * (b - a + 1)); }
  pick(arr) { return arr[Math.floor(this.rnd() * arr.length)]; }
  chance(p) { return this.rnd() < p; }
  // m(1.5) = 1.5 metres in voxels, at least `min`.
  m(metres, min = 1) { return Math.max(min, Math.round(metres * this.u)); }

  begin(kind, icon, o = {}) {
    const st = this.w.addStructure(kind, icon, o.counted ?? true, o.grabbable ?? false);
    st.major = o.major ?? false;
    this.cur = st.id;
    this.major = st.major;
    return st;
  }
  end() { this.cur = 0; this.major = false; }

  set(x, y, z, t) {
    const w = this.w;
    w.set(x, y, z, t);
    if (!this.cur || !t || isTerrain(t)) return;
    if (w.wrap) { x &= w.mx; z &= w.mz; } else if (x < 0 || z < 0 || x >= w.sx || z >= w.sz) return;
    const i = x + w.sx * z;
    // The first structure owns a column; buildings take columns over from props.
    if (!w.footprint[i] || this.major) w.footprint[i] = this.cur;
  }
  box(x, y, z, w, h, d, t) {
    for (let yy = y; yy < y + h; yy++) for (let zz = z; zz < z + d; zz++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, zz, t);
  }
  // Four walls without floor and ceiling.
  shell(x, y, z, w, h, d, t) {
    this.box(x, y, z, w, h, 1, t); this.box(x, y, z + d - 1, w, h, 1, t);
    this.box(x, y, z, 1, h, d, t); this.box(x + w - 1, y, z, 1, h, d, t);
  }
  ball(cx, cy, cz, r, types) {
    for (let y = -r; y <= r; y++) for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
      if (x * x + y * y * 1.3 + z * z > r * r + this.rnd() * r) continue;
      this.set(cx + x, cy + y, cz + z, types[Math.floor(this.rnd() * types.length)]);
    }
  }
  cyl(cx, cz, r, y, h, t, hollow = false) {
    for (let z = -r; z <= r; z++) for (let x = -r; x <= r; x++) {
      const d2 = x * x + z * z;
      if (d2 > r * r + r * 0.6) continue;
      if (hollow && (r - 1) * (r - 1) + (r - 1) * 0.6 >= d2) continue;
      for (let yy = y; yy < y + h; yy++) this.set(cx + x, yy, cz + z, t);
    }
  }
}

const WALLS = [T.BRICK_RED, T.BRICK_YELLOW, T.PLASTER_WHITE, T.PLASTER_YELLOW, T.PLASTER_BLUE, T.PLASTER_PINK, T.PLASTER_GREEN];
const ROOFS = [T.ROOF_RED, T.ROOF_DARK, T.ROOF_BROWN];
const CARS = [T.CAR_RED, T.CAR_BLUE, T.CAR_YELLOW, T.CAR_WHITE, T.CAR_GREEN, T.CAR_BLACK];
const TOYS = [T.TOY_RED, T.TOY_BLUE, T.TOY_YELLOW, T.TOY_GREEN, T.TOY_ORANGE, T.TOY_PURPLE];
const LEAVES = [[T.LEAF, T.LEAF_LIGHT], [T.LEAF, T.LEAF_DARK], [T.LEAF_LIGHT, T.LEAF], [T.LEAF_AUTUMN, T.LEAF_LIGHT]];

// Construction kit ------------------------------------------------------------

function windowsRow(g, x, y, z, len, alongX, ww, wh, gap, t = T.GLASS) {
  for (let i = gap; i + ww <= len - gap; i += ww + gap)
    if (alongX) g.box(x + i, y, z, ww, wh, 1, t); else g.box(x, y, z + i, 1, wh, ww, t);
}

function furniture(g, x, y, z, w, d) {
  const u = g.u, kind = g.int(0, 5);
  const fw = Math.min(w, g.m(1.6, 2)), fd = Math.min(d, g.m(0.9, 2));
  if (kind === 0) { // table
    g.box(x, y + g.m(0.7), z, fw, 1, fd, T.WOOD_LIGHT);
    for (const [a, b] of [[0, 0], [fw - 1, 0], [0, fd - 1], [fw - 1, fd - 1]]) g.box(x + a, y, z + b, 1, g.m(0.7), 1, T.WOOD_DARK);
  } else if (kind === 1) { // bed
    g.box(x, y, z, fw, g.m(0.4), fd + g.m(0.3), T.WOOD);
    g.box(x, y + g.m(0.4), z, fw, 1, fd + g.m(0.3), g.pick([T.FABRIC_BLUE, T.FABRIC_RED, T.FABRIC_GREEN]));
    g.box(x, y + g.m(0.4), z, Math.max(1, fw >> 2), 2, fd + g.m(0.3), T.FABRIC_WHITE);
  } else if (kind === 2) { // sofa
    const c = g.pick([T.FABRIC_RED, T.FABRIC_BLUE, T.FABRIC_GREEN]);
    g.box(x, y, z, fw, g.m(0.45), fd, c);
    g.box(x, y, z, fw, g.m(0.9), 1, c);
  } else if (kind === 3) { // shelf
    for (let i = 0; i < g.m(1.9); i++) g.box(x, y + i, z, fw, 1, 1, i % 2 ? g.pick(TOYS) : T.WOOD_DARK);
  } else if (kind === 4) { // kitchen counter
    g.box(x, y, z, fw, g.m(0.9), fd, T.TILE_WHITE);
    g.box(x, y + g.m(0.9), z, fw, 1, fd, T.STEEL);
  } else { // bathtub or cupboard
    g.box(x, y, z, fw, g.m(0.6), fd, T.TILE_WHITE);
    if (fw > 2 && fd > 2) g.box(x + 1, y + 1, z + 1, fw - 2, g.m(0.6), fd - 2, 0);
  }
  void u;
}

// A house with windows, door, gable roof and chimney. o.interior adds rooms, stairs and furniture.
function house(g, x, y, z, w, d, floors, o = {}) {
  const fh = g.m(2.8, 5), wall = o.wall ?? g.pick(WALLS), roof = o.roof ?? g.pick(ROOFS);
  const ww = g.m(0.9, 2), wh = g.m(1.2, 2), sill = g.m(0.9, 1), gap = g.m(1.1, 2);
  for (let f = 0; f < floors; f++) {
    const fy = y + f * fh;
    g.box(x, fy, z, w, 1, d, f ? T.WOOD : T.CONCRETE);
    g.shell(x, fy + 1, z, w, fh - 1, d, wall);
    windowsRow(g, x, fy + 1 + sill, z, w, true, ww, wh, gap);
    windowsRow(g, x, fy + 1 + sill, z + d - 1, w, true, ww, wh, gap);
    windowsRow(g, x, fy + 1 + sill, z, d, false, ww, wh, gap);
    windowsRow(g, x + w - 1, fy + 1 + sill, z, d, false, ww, wh, gap);
    if (o.interior) {
      const mx = x + (w >> 1), mz = z + (d >> 1), dw = g.m(1, 2), dh = g.m(2.1, 3);
      g.box(mx, fy + 1, z + 1, 1, fh - 1, d - 2, T.PLASTER_WHITE);
      g.box(mx, fy + 1, z + g.m(1.5), 1, dh, dw, 0);
      g.box(mx, fy + 1, z + d - g.m(1.5) - dw, 1, dh, dw, 0);
      g.box(x + 1, fy + 1, mz, (w >> 1) - 1, fh - 1, 1, T.PLASTER_WHITE);
      g.box(x + g.m(1.2), fy + 1, mz, dw, dh, 1, 0);
      // One or two pieces of furniture in every room corner.
      const rooms = [[x + 1, z + 1], [x + 1, mz + 1], [mx + 1, z + 1], [mx + 1, z + d - 2 - g.m(1.2, 2)]];
      for (const [rx, rz] of rooms) {
        furniture(g, rx + 1, fy + 1, rz, (w >> 1) - 3, g.m(1.2, 2));
        if (g.chance(0.7)) furniture(g, rx + (w >> 2), fy + 1, rz + g.m(1.6), (w >> 2) - 2, g.m(1.2, 2));
      }
      if (f < floors - 1) { // staircase with an opening in the ceiling
        const sw = g.m(1, 2);
        for (let i = 0; i < fh; i++) g.box(x + w - 1 - sw, fy + 1, z + 1 + i, sw, i + 1, 1, T.WOOD);
        g.box(x + w - 1 - sw, fy + fh, z + 1, sw, 1, fh, 0);
      }
    }
  }
  const dw = g.m(1, 2), dh = g.m(2.1, 3), dx = x + (w >> 1) - (dw >> 1);
  g.box(dx - 1, y + 1, z + d - 1, dw + 2, dh + 1, 1, wall);
  g.box(dx, y + 1, z + d - 1, dw, dh, 1, T.WOOD_DARK);
  const ty = y + floors * fh;
  g.box(x, ty, z, w, 1, d, T.WOOD);
  if (o.flat) {
    g.shell(x, ty + 1, z, w, 1, d, wall);
  } else {
    for (let k = 0; ; k++) {
      const a = z - 1 + k, b = z + d - k;
      if (a > b) break;
      g.box(x - 1, ty + 1 + k, a, w + 2, 1, Math.min(2, b - a + 1), roof);
      if (b - 1 > a) g.box(x - 1, ty + 1 + k, b - 1, w + 2, 1, 2, roof);
      if (b - a > 3) { g.box(x, ty + 1 + k, a + 2, 1, 1, b - a - 3, wall); g.box(x + w - 1, ty + 1 + k, a + 2, 1, 1, b - a - 3, wall); }
    }
    const cw = g.m(0.6, 1);
    g.box(x + (w >> 2), ty + 1, z + (d >> 1) + 1, cw, (d >> 1) + g.m(1), cw, T.BRICK_DARK);
  }
}

// Glass tower on a concrete frame. Tall ones step back twice on the way up and carry a spire, like classic skyscrapers.
function tower(g, x, y, z, w, d, floors) {
  const fh = g.m(3, 5), bay = g.m(2.5, 3);
  const frame = g.pick([T.CONCRETE, T.CONCRETE_LIGHT, T.CONCRETE_BLUE, T.CONCRETE_TAN]);
  const glass = g.pick([T.GLASS, T.GLASS_DARK, T.GLASS_GREEN]);
  const cw = Math.max(4, Math.min(8, w >> 2)), step = floors > 28 ? Math.max(2, Math.min(w, d) >> 3) : 0;
  const s1 = Math.round(floors * (0.5 + g.rnd() * 0.15)), s2 = Math.round(floors * (0.78 + g.rnd() * 0.1));
  let px = x, pz = z, pw = w, pd = d;
  for (let f = 0; f <= floors; f++) {
    const fy = y + f * fh, inset = step && f >= s2 ? step * 2 : step && f >= s1 ? step : 0;
    const tx = x + inset, tz = z + inset, tw = w - inset * 2, td = d - inset * 2;
    // The slab covers the wider storey below as well, which makes the roof terraces at each setback.
    g.box(px, fy, pz, pw, 1, pd, frame);
    if (f === floors) { g.shell(tx, fy + 1, tz, tw, 1, td, frame); break; }
    px = tx; pz = tz; pw = tw; pd = td;
    g.shell(tx, fy + 1, tz, tw, fh - 1, td, glass);
    for (let i = 0; i < tw; i += bay) { g.box(tx + i, fy + 1, tz, 1, fh - 1, 1, frame); g.box(tx + i, fy + 1, tz + td - 1, 1, fh - 1, 1, frame); }
    for (let i = 0; i < td; i += bay) { g.box(tx, fy + 1, tz + i, 1, fh - 1, 1, frame); g.box(tx + tw - 1, fy + 1, tz + i, 1, fh - 1, 1, frame); }
    g.box(tx + tw - 1, fy + 1, tz, 1, fh - 1, 1, frame); g.box(tx + tw - 1, fy + 1, tz + td - 1, 1, fh - 1, 1, frame);
    g.shell(x + (w >> 1) - (cw >> 1), fy + 1, z + (d >> 1) - (cw >> 1), cw, fh - 1, cw, T.CONCRETE_DARK);
  }
  const ty = y + floors * fh, mx = x + (w >> 1), mz = z + (d >> 1);
  g.box(px + 2, ty + 1, pz + 2, g.m(2), g.m(1.2), g.m(1.5), T.SHEET_GREY);
  if (floors > 44) { // spire
    const sh = g.m(10 + g.rnd() * 14);
    for (let k = 0; k < 4; k++) g.box(mx - 3 + k, ty + 1 + k * 3, mz - 3 + k, 7 - 2 * k, 3, 7 - 2 * k, frame);
    g.box(mx, ty + 13, mz, 1, sh, 1, T.STEEL);
    g.box(mx, ty + 13 + sh, mz, 1, 1, 1, T.LAMP);
  } else {
    g.box(mx, ty + 1, mz, 1, g.m(5), 1, T.STEEL_DARK);
    g.box(mx, ty + 1 + g.m(5), mz, 1, 1, 1, T.LAMP);
  }
}

function tree(g, x, y, z, scale = 1) {
  const st = g.begin('tree', '🌳', { grabbable: true });
  const tw = g.m(0.35 * scale), th = g.m((2.4 + g.rnd() * 1.6) * scale, 3), cr = g.m((1.4 + g.rnd() * 0.9) * scale, 2);
  g.box(x, y, z, tw, th, tw, T.TRUNK);
  g.ball(x + (tw >> 1), y + th + (cr >> 1), z + (tw >> 1), cr, g.pick(LEAVES));
  g.end();
  return st;
}

function car(g, x, y, z, alongX, big = false) {
  g.begin('car', '🚗', { grabbable: true });
  const L = g.m(big ? 9 : 4.2, 5), W = g.m(big ? 2.4 : 1.8, 3), h1 = g.m(big ? 1 : 0.7), h2 = g.m(big ? 1.6 : 0.6), wr = g.m(0.3);
  const c = big ? g.pick([T.CAR_YELLOW, T.CAR_RED, T.CAR_WHITE]) : g.pick(CARS);
  const b = (a, yy, bz, l, h, w, t) => (alongX ? g.box(x + a, yy, z + bz, l, h, w, t) : g.box(x + bz, yy, z + a, w, h, l, t));
  b(0, y + wr, 0, L, h1, W, c);
  const c0 = big ? 0 : Math.max(1, L >> 2), cl = big ? L : L - c0 - Math.max(1, L >> 3);
  b(c0, y + wr + h1, 0, cl, h2, W, T.GLASS_DARK);
  b(c0, y + wr + h1 + h2, 0, cl, 1, W, c);
  if (W > 3) b(c0 + 1, y + wr + h1, 1, cl - 2, h2, W - 2, 0);
  for (const a of [Math.max(1, L >> 3), L - Math.max(1, L >> 3) - wr - (wr > 1 ? 1 : 0)]) {
    b(a, y, 0, wr + (wr > 1 ? 1 : 0), wr + 1, 1, T.TIRE); b(a, y, W - 1, wr + (wr > 1 ? 1 : 0), wr + 1, 1, T.TIRE);
  }
  b(L - 1, y + wr, 0, 1, 1, 1, T.HEADLIGHT); b(L - 1, y + wr, W - 1, 1, 1, 1, T.HEADLIGHT);
  g.end();
}

function lamp(g, x, y, z) {
  g.box(x, y, z, 1, g.m(3.5), 1, T.STEEL_DARK);
  g.box(x, y + g.m(3.5), z, 1, 1, 1, T.LAMP);
}

function fence(g, x, y, z, len, alongX, t = T.WOOD_WHITE) {
  const h = g.m(0.9, 2);
  for (let i = 0; i < len; i++) {
    const post = i % g.m(1, 2) === 0;
    if (alongX) g.box(x + i, y, z, 1, post ? h : h - 1, 1, post ? t : i % 2 ? t : 0); else g.box(x, y, z + i, 1, post ? h : h - 1, 1, post ? t : i % 2 ? t : 0);
    if (alongX) g.set(x + i, y + h - 2, z, t); else g.set(x, y + h - 2, z + i, t);
  }
}

function hall(g, x, y, z, w, d, h) {
  const wall = g.pick([T.SHEET_GREY, T.SHEET_BLUE, T.SHEET_GREEN, T.SHEET_WHITE]), bay = g.m(4, 4);
  g.box(x, y, z, w, 1, d, T.CONCRETE);
  g.shell(x, y + 1, z, w, h, d, wall);
  for (let i = 0; i < w; i += bay) { g.box(x + i, y + 1, z, 1, h, 1, T.STEEL); g.box(x + i, y + 1, z + d - 1, 1, h, 1, T.STEEL); }
  for (let i = 0; i < d; i += bay) { g.box(x, y + 1, z + i, 1, h, 1, T.STEEL); g.box(x + w - 1, y + 1, z + i, 1, h, 1, T.STEEL); }
  windowsRow(g, x, y + h - g.m(1.2), z, w, true, g.m(2), g.m(0.8), g.m(1, 2));
  windowsRow(g, x, y + h - g.m(1.2), z + d - 1, w, true, g.m(2), g.m(0.8), g.m(1, 2));
  g.box(x + (w >> 1) - g.m(2), y + 1, z + d - 1, g.m(4), Math.min(h - 2, g.m(4)), 1, T.STEEL_DARK);
  g.box(x, y + h + 1, z, w, 1, d, T.SHEET_GREY);
  for (let i = bay; i + bay <= w; i += bay * 2) { // skylights
    g.box(x + i, y + h + 2, z + 2, bay, g.m(0.8), d - 4, T.GLASS);
    g.box(x + i, y + h + 2 + g.m(0.8), z + 2, bay, 1, d - 4, T.SHEET_GREY);
  }
  for (let i = 0; i < 5; i++) { // machines and barrels inside
    const mx = x + g.int(2, w - g.m(3) - 2), mz = z + g.int(2, d - g.m(3) - 2);
    if (g.chance(0.35)) g.cyl(mx, mz, g.m(0.5), y + 1, g.m(1.2), T.BARREL);
    else g.box(mx, y + 1, mz, g.m(2), g.m(1.5), g.m(1.5), g.pick([T.STEEL, T.STEEL_YELLOW, T.STEEL_RED, T.STEEL_DARK]));
  }
}

function chimney(g, x, y, z, h) {
  const r = g.m(1.3, 2);
  g.cyl(x, z, r + 1, y, g.m(2), T.BRICK_DARK);
  g.cyl(x, z, r, y, h, T.BRICK_RED, true);
  for (let b = 0; b < 3; b++) g.cyl(x, z, r, y + h - g.m(1) - b * g.m(3), g.m(1), b % 2 ? T.BRICK_RED : T.TILE_WHITE, true);
}

function tank(g, x, y, z, r, h) {
  g.cyl(x, z, r, y, h, T.GAS);
  g.cyl(x, z, r, y, h, T.SHEET_WHITE, true);
  g.cyl(x, z, r, y + h, 1, T.SHEET_WHITE);
  g.cyl(x, z, r, y + (h >> 1), 1, T.STEEL_RED, true);
}

function silo(g, x, y, z, r, h) {
  g.cyl(x, z, r, y, h, T.CONCRETE_LIGHT, true);
  for (let k = 0; k < r; k++) g.cyl(x, z, r - k, y + h + k, 1, T.SHEET_GREY);
}

function waterTower(g, x, y, z) {
  const leg = g.m(8), r = g.m(2.5, 3);
  for (const [a, b] of [[-r, -r], [r, -r], [-r, r], [r, r]]) g.box(x + a, y, z + b, 1, leg, 1, T.STEEL);
  for (let i = g.m(2); i < leg; i += g.m(2)) { g.box(x - r, y + i, z - r, 2 * r + 1, 1, 1, T.STEEL); g.box(x - r, y + i, z + r, 2 * r + 1, 1, 1, T.STEEL); g.box(x - r, y + i, z - r, 1, 1, 2 * r + 1, T.STEEL); g.box(x + r, y + i, z - r, 1, 1, 2 * r + 1, T.STEEL); }
  g.cyl(x, z, r + 1, y + leg, 1, T.STEEL);
  g.cyl(x, z, r + 1, y + leg + 1, g.m(3), T.SHEET_BLUE, true);
  g.cyl(x, z, r + 1, y + leg + 1 + g.m(3), 1, T.SHEET_BLUE);
}

function crane(g, x, y, z, h) {
  for (let i = 0; i < h; i++) {
    for (const [a, b] of [[0, 0], [2, 0], [0, 2], [2, 2]]) g.set(x + a, y + i, z + b, T.STEEL_YELLOW);
    if (i % 3 === 0) g.shell(x, y + i, z, 3, 1, 3, T.STEEL_YELLOW);
  }
  const arm = g.m(14);
  g.box(x - g.m(4), y + h, z + 1, arm + g.m(4), 1, 1, T.STEEL_YELLOW);
  g.box(x - g.m(4), y + h + 1, z + 1, arm + g.m(4), 1, 1, T.STEEL_YELLOW);
  g.box(x - g.m(4), y + h - g.m(1.5), z, g.m(2), g.m(1.5), 3, T.CONCRETE_DARK);
  g.box(x + arm - 2, y + h - g.m(6), z + 1, 1, g.m(6), 1, T.STEEL_DARK);
  g.box(x + arm - 3, y + h - g.m(6) - 2, z, 3, 2, 3, T.STEEL_RED);
}

function church(g, x, y, z, w, d) {
  const tw = g.m(4, 5), th = g.m(16);
  house(g, x + tw, y, z, w - tw, d, 2, { wall: T.STONE, roof: T.ROOF_DARK });
  g.box(x, y, z + (d >> 1) - (tw >> 1), tw, 1, tw, T.CONCRETE);
  g.shell(x, y + 1, z + (d >> 1) - (tw >> 1), tw, th, tw, T.STONE);
  g.box(x, y + th - g.m(2), z + (d >> 1) - (tw >> 1) + 1, 1, g.m(1.2), tw - 2, T.LAMP);
  for (let k = 0; k <= tw >> 1; k++)
    g.box(x + k, y + th + 1 + k * 2, z + (d >> 1) - (tw >> 1) + k, tw - 2 * k, 2, tw - 2 * k, T.ROOF_DARK);
}

function gasStation(g, x, y, z) {
  const w = g.m(12), d = g.m(8), h = g.m(4.5);
  for (const [a, b] of [[1, 1], [w - 2, 1], [1, d - 2], [w - 2, d - 2]]) g.box(x + a, y, z + b, 1, h, 1, T.STEEL);
  g.box(x, y + h, z, w, 1, d, T.SHEET_WHITE);
  g.shell(x, y + h, z, w, 1, d, T.STEEL_RED);
  for (let i = g.m(3); i < w - g.m(2); i += g.m(4)) {
    g.box(x + i, y, z + (d >> 1), g.m(0.6), g.m(1.6), g.m(1), T.GAS);
    g.box(x + i, y + g.m(1.6), z + (d >> 1), g.m(0.6), 1, g.m(1), T.STEEL_RED);
  }
  // The underground tank is what makes the big bang.
  for (let yy = y - 3; yy < y - 1; yy++) for (let zz = z + 2; zz < z + d - 2; zz++) for (let xx = x + 2; xx < x + w - 2; xx++) g.set(xx, yy, zz, T.GAS);
  house(g, x + w + 2, y, z, g.m(6), d, 1, { flat: true, wall: T.PLASTER_WHITE });
}

// Toy blocks: stacked bricks in alternating colours.
function toyTower(g, x, y, z, nx, nz, levels, bs) {
  for (let l = 0; l < levels; l++)
    for (let a = 0; a < nx; a++) for (let b = 0; b < nz; b++) {
      if (levels > 3 && l > 0 && l < levels - 1 && nx > 2 && nz > 2 && a > 0 && b > 0 && a < nx - 1 && b < nz - 1) continue; // hollow inside
      g.box(x + a * bs, y + l * bs, z + b * bs, bs, bs, bs, TOYS[(a + b + l * 2 + ((x + z) >> 2)) % TOYS.length]);
    }
  // Roof block: a pyramid.
  const top = g.pick(TOYS), w = nx * bs, d = nz * bs;
  for (let k = 0; k < Math.min(w, d) >> 1; k++) g.box(x + k, y + levels * bs + k, z + k, w - 2 * k, 1, d - 2 * k, top);
}

function ground(g, sx, sz, level, top) {
  const w = g.w;
  for (let z = 0; z < sz; z++) for (let x = 0; x < sx; x++) {
    w.set(x, 0, z, T.BEDROCK);
    for (let y = 1; y < level - 1; y++) w.set(x, y, z, T.DIRT);
    w.set(x, level - 1, z, top(x, z));
  }
}

// Blueprints --------------------------------------------------------------------

// Shuffles a deck of feature names over a grid of cells and calls place(name, x, z) for each cell.
function dealGrid(g, deck, cols, rows, x0, z0, pitch, place) {
  const cards = deck.slice().sort(() => g.rnd() - 0.5);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) place(cards[(i + j * cols) % cards.length], x0 + i * pitch, z0 + j * pitch);
}

function blockRoom(seed) {
  const S = 320, w = new World(S, 96, S, false), g = new Gen(w, seed, 5), G = 4, bs = 4;
  w.monsterBase = 11;
  w.sky = [[0.98, 0.86, 0.62], [1, 0.95, 0.85]];
  ground(g, S, S, G, (x, z) => {
    const dx = Math.abs(x - S / 2), dz = Math.abs(z - S / 2);
    if (dx < 136 && dz < 136) return dx > 130 || dz > 130 ? T.CARPET2 : ((x >> 3) + (z >> 3)) & 1 ? T.CARPET : T.CARPET2;
    return (z >> 3) & 1 ? T.FLOOR : T.FLOOR2;
  });
  const deck = ['tower', 'tower', 'tower', 'tower', 'tower', 'tower', 'tall', 'tall', 'tall', 'tall', 'castle', 'castle', 'castle', 'wall', 'wall', 'wall', 'arch', 'arch', 'arch', 'pyramid', 'pyramid', 'stairs', 'stairs', 'tower', 'tall'];
  dealGrid(g, deck, 5, 5, 44, 28, 52, (kind, x, z) => {
    x += g.int(0, 8); z += g.int(0, 8);
    if (kind === 'tower' || kind === 'tall' || kind === 'castle') {
      const nx = kind === 'castle' ? g.int(4, 6) : g.int(2, 3), nz = kind === 'castle' ? g.int(4, 6) : g.int(2, 3);
      const lv = kind === 'tall' ? g.int(8, 13) : kind === 'castle' ? g.int(4, 6) : g.int(3, 7);
      g.begin('toy', kind === 'tall' ? '🗼' : kind === 'castle' ? '🏰' : '🧱', { major: true });
      toyTower(g, x, G, z, nx, nz, lv, bs);
      if (kind === 'castle') for (const [a, b] of [[0, 0], [nx - 1, 0], [0, nz - 1], [nx - 1, nz - 1]]) toyTower(g, x + a * bs, G + lv * bs, z + b * bs, 1, 1, 2, bs);
      g.end();
    } else if (kind === 'wall') {
      g.begin('toy', '🧱', { major: true });
      for (let i = 0; i < 5; i++) for (let l = 0; l < g.int(3, 5); l++) g.box(x + i * bs * 2 + (l & 1) * bs, G + l * bs, z + 12, bs * 2, bs, bs, TOYS[(i + l) % TOYS.length]);
      g.end();
    } else if (kind === 'arch') {
      const h = g.int(4, 7);
      g.begin('toy', '🌉', { major: true });
      g.box(x + 4, G, z + 12, bs, bs * h, bs, g.pick(TOYS)); g.box(x + 28, G, z + 12, bs, bs * h, bs, g.pick(TOYS));
      g.box(x + 4, G + bs * h, z + 12, 28, bs, bs, g.pick(TOYS));
      g.end();
    } else if (kind === 'pyramid') {
      g.begin('toy', '🔺', { major: true });
      for (let l = 0; l < 5; l++) for (let a = l; a < 10 - l; a++) for (let b = l; b < 10 - l; b++) g.box(x + a * bs, G + l * bs, z + b * bs, bs, bs, bs, TOYS[(a + b + l) % TOYS.length]);
      g.end();
    } else {
      g.begin('toy', '🪜', { major: true });
      for (let i = 0; i < 8; i++) g.box(x + i * bs, G, z + 8, bs, bs * (i + 1), bs * 3, TOYS[i % TOYS.length]);
      g.end();
    }
  });
  w.spawn = [S / 2, G, S - 18];
  w.heading = Math.PI;
  return w;
}

// Garden features, each drawn into a cell of about 50 x 50 voxels with its corner at (x, z).
const GARDEN = {
  shed(g, x, z, G) {
    g.begin('shed', '🛖', { major: true });
    house(g, x + 12, G, z + 14, 22, 16, 1, { wall: g.pick([T.WOOD, T.WOOD_DARK, T.WOOD_LIGHT]), roof: T.ROOF_BROWN });
    g.box(x + 14, G + 1, z + 16, 4, 5, 3, T.WOOD_DARK); g.box(x + 26, G + 1, z + 16, 3, 4, 3, T.STEEL_RED);
    g.end();
  },
  greenhouse(g, x, z, G) {
    const gx = x + 8, gz = z + 14, gw = 30, gd = 20, gh = 10;
    g.begin('greenhouse', '🪴', { major: true });
    g.shell(gx, G, gz, gw, gh, gd, T.GLASS);
    for (let i = 0; i < gw; i += 5) { g.box(gx + i, G, gz, 1, gh, 1, T.WOOD_WHITE); g.box(gx + i, G, gz + gd - 1, 1, gh, 1, T.WOOD_WHITE); }
    g.box(gx + gw - 1, G, gz, 1, gh, 1, T.WOOD_WHITE); g.box(gx + gw - 1, G, gz + gd - 1, 1, gh, 1, T.WOOD_WHITE);
    for (let k = 0; k < gd >> 1; k++) {
      g.box(gx, G + gh + k, gz + k, gw, 1, 2, T.GLASS); g.box(gx, G + gh + k, gz + gd - 2 - k, gw, 1, 2, T.GLASS);
      g.set(gx, G + gh + k, gz + k + 2, T.WOOD_WHITE);
    }
    for (let i = 3; i < gw - 4; i += 6) { g.box(gx + i, G, gz + 4, 3, 2, 3, T.ROOF_BROWN); g.ball(gx + i + 1, G + 4, gz + 5, 2, [T.LEAF_LIGHT, T.FLOWER_RED]); }
    g.end();
  },
  swing(g, x, z, G) {
    g.begin('swing', '🎠', { major: true });
    for (const a of [12, 36]) { g.box(x + a, G, z + 20, 1, 12, 1, T.STEEL_RED); g.box(x + a, G, z + 28, 1, 12, 1, T.STEEL_RED); g.box(x + a, G + 12, z + 20, 1, 1, 9, T.STEEL_RED); }
    g.box(x + 12, G + 13, z + 24, 25, 1, 1, T.STEEL_RED);
    for (const a of [19, 28]) { g.box(x + a, G + 4, z + 24, 1, 9, 1, T.STEEL_DARK); g.box(x + a + 3, G + 4, z + 24, 1, 9, 1, T.STEEL_DARK); g.box(x + a, G + 3, z + 23, 4, 1, 3, T.WOOD_LIGHT); }
    g.end();
  },
  table(g, x, z, G) {
    g.begin('table', '🪑', { major: true });
    g.box(x + 18, G + 3, z + 22, 12, 1, 7, T.WOOD_LIGHT);
    for (const [a, b] of [[0, 0], [11, 0], [0, 6], [11, 6]]) g.box(x + 18 + a, G, z + 22 + b, 1, 3, 1, T.WOOD_DARK);
    for (const [a, b] of [[2, -4], [7, -4], [2, 8], [7, 8]]) { g.box(x + 18 + a, G, z + 22 + b, 3, 2, 3, T.WOOD_WHITE); g.box(x + 18 + a, G + 2, z + 22 + b + (b < 0 ? 0 : 2), 3, 3, 1, T.WOOD_WHITE); }
    g.end();
  },
  grill(g, x, z, G) {
    g.begin('grill', '🍖', { major: true });
    for (const [a, b] of [[0, 0], [4, 0], [0, 3], [4, 3]]) g.box(x + 20 + a, G, z + 24 + b, 1, 4, 1, T.STEEL_DARK);
    g.box(x + 19, G + 4, z + 23, 7, 2, 6, T.STEEL_DARK);
    g.cyl(x + 30, z + 26, 1, G, 5, T.GAS);
    g.end();
  },
  hedge(g, x, z, G) {
    g.begin('hedge', '🌿', { major: true });
    g.box(x + 4, G, z + 22, 44, 7, 5, T.LEAF_DARK); g.box(x + 4, G + 7, z + 22, 44, 1, 5, T.LEAF);
    if (g.chance(0.5)) { g.box(x + 4, G, z + 4, 5, 7, 18, T.LEAF_DARK); g.box(x + 4, G + 7, z + 4, 5, 1, 18, T.LEAF); }
    g.end();
  },
  flowers(g, x, z, G) {
    g.begin('flowers', '🌷', { major: true });
    for (let i = 0; i < 46; i++) {
      const fx = x + g.int(6, 44), fz = z + g.int(6, 44);
      g.set(fx, G, fz, T.LEAF); g.set(fx, G + 1, fz, g.pick([T.FLOWER_RED, T.FLOWER_YELLOW, T.FLOWER_WHITE]));
    }
    g.end();
  },
  trees(g, x, z, G) {
    for (let i = 0; i < g.int(2, 3); i++) tree(g, x + 8 + i * 16 + g.int(0, 5), G, z + g.int(8, 40), 0.9 + g.rnd() * 0.6);
  },
  gnomes(g, x, z, G) {
    for (let i = 0; i < 3; i++) {
      const gx = x + 10 + i * 12, gz = z + g.int(12, 36);
      g.begin('gnome', '🧙', { grabbable: true });
      g.box(gx, G, gz, 2, 2, 2, T.FABRIC_BLUE); g.box(gx, G + 2, gz, 2, 1, 2, T.TILE_WHITE); g.box(gx, G + 3, gz, 2, 2, 2, T.TOY_RED);
      g.end();
    }
    tree(g, x + 40, G, z + 40, 0.8);
  },
};

function garden(seed) {
  const S = 384, w = new World(S, 96, S, false), g = new Gen(w, seed, 4), G = 8;
  ground(g, S, S, G, (x, z) => (((x * 7 + z * 13) ^ (x * z)) & 7) < 2 ? T.GRASS2 : T.GRASS);
  g.begin('fence', '🚧', { major: true });
  fence(g, 12, G, 12, S - 24, true); fence(g, 12, G, S - 13, S - 24, true);
  fence(g, 12, G, 12, S - 24, false); fence(g, S - 13, G, 12, S - 24, false);
  g.end();
  const deck = ['shed', 'shed', 'shed', 'greenhouse', 'greenhouse', 'greenhouse', 'swing', 'swing', 'table', 'table', 'table', 'grill', 'grill', 'hedge', 'hedge', 'hedge', 'hedge',
    'flowers', 'flowers', 'flowers', 'flowers', 'trees', 'trees', 'trees', 'trees', 'trees', 'trees', 'trees', 'trees', 'gnomes', 'gnomes', 'gnomes', 'trees', 'trees', 'flowers', 'hedge'];
  dealGrid(g, deck, 6, 6, 24, 20, 56, (kind, x, z) => GARDEN[kind](g, x, z, G));
  w.spawn = [S / 2, G, S - 22];
  w.heading = Math.PI;
  return w;
}

// A residential street: detailed houses with rooms and furniture, garages, cars, gardens.
function houseWorld(seed) {
  const S = 384, w = new World(S, 128, S, false), g = new Gen(w, seed, 4), G = 8;
  ground(g, S, S, G, (x, z) => {
    if (z > 296 && z < 320) return z === 308 && (x >> 2) & 1 ? T.ROADLINE : T.ROAD;
    if (z >= 292 && z <= 324) return T.SIDEWALK;
    return (((x * 5 + z * 11) ^ (x * z)) & 7) < 2 ? T.GRASS2 : T.GRASS;
  });
  const plot = (x, z, floors, withGarage) => {
    g.begin('house', '🏠', { major: true });
    house(g, x, G, z, g.int(42, 50), g.int(32, 40), floors, { interior: true });
    g.end();
    if (withGarage) {
      g.begin('garage', '🏚️', { major: true });
      house(g, x + 56, G, z + 6, 26, 30, 1, { flat: true, wall: T.PLASTER_WHITE });
      g.box(x + 61, G + 1, z + 35, 16, 9, 1, T.SHEET_GREY);
      g.end();
      car(g, x + 65, G, z + 44, false);
    }
    tree(g, x - 8, G, z + g.int(0, 30), 1 + g.rnd() * 0.5);
    g.begin('mailbox', '📮', { major: true });
    g.box(x + 20, G, z + 62, 1, 4, 1, T.WOOD_DARK); g.box(x + 19, G + 4, z + 61, 3, 2, 3, T.STEEL_YELLOW);
    g.end();
  };
  for (let i = 0; i < 4; i++) plot(22 + i * 92, 196 + g.int(0, 10), i % 2 ? 2 : g.int(1, 3), i !== 3);
  for (let i = 0; i < 3; i++) plot(60 + i * 100, 60 + g.int(0, 14), g.int(1, 2), i === 1);
  g.begin('fence', '🚧', { major: true });
  fence(g, 10, G, 12, S - 20, true); fence(g, 10, G, 12, 276, false); fence(g, S - 11, G, 12, 276, false);
  for (let i = 0; i < 4; i++) fence(g, 12 + i * 92, G, 288, 60, true);
  g.end();
  for (let i = 0; i < 4; i++) car(g, 30 + i * 88 + g.int(0, 20), G, i % 2 ? 300 : 311, true, i === 2);
  g.begin('lamp', '💡', { major: true });
  for (let x = 40; x < S; x += 76) lamp(g, x, G, 294);
  g.end();
  for (let i = 0; i < 10; i++) tree(g, g.int(20, S - 24), G, g.pick([g.int(130, 170), g.int(336, 366), g.int(16, 40)]), 0.9 + g.rnd() * 0.6);
  w.spawn = [S / 2, G, 344];
  w.heading = Math.PI;
  return w;
}

// Seamless town on a wrapping world. p: size, sy, weights per lot type, unique lots, height, cars, hills, green, people.
// p.metro switches on the big-city street scene: avenues with trees, paved lots, a central park, traffic lights.
function town(seed, p) {
  const S = p.size, H = p.sy ?? 128, w = new World(S, H, S, true), g = new Gen(w, seed, p.u ?? 2), G = 12;
  const P = 64, n = S / P, metro = !!p.metro;
  const maxFloors = Math.floor((H - G - 36) / g.m(3, 5)); // what fits under the world's ceiling, spire included
  // Every fourth street of a metropolis is an avenue: twice as wide, with a planted median.
  const roadW = (i) => (metro && i % 4 === 0 ? 16 : 8);
  // The central park takes a square of lots in the middle of the map; the streets inside it disappear.
  const pk = metro ? (n >= 16 ? 4 : 2) : 0, pk0 = (n - pk) >> 1;
  const inPark = (i, j) => pk > 0 && i >= pk0 && i < pk0 + pk && j >= pk0 && j < pk0 + pk;
  const lots = [];
  for (let i = 0; i < n * n; i++) lots.push({ type: 'park', hill: 0 });
  // Deal lot types by weight; unique ones first (their number grows with the world's area).
  const order = lots.map((_, i) => i).filter((i) => !inPark(i % n, Math.floor(i / n))).sort(() => g.rnd() - 0.5);
  const uniq = Object.entries(p.unique ?? {}).flatMap(([k, c]) => Array(Math.round(c * (n * n) / 64)).fill(k));
  const wsum = Object.values(p.weights).reduce((a, b) => a + b, 0);
  order.forEach((li, k) => {
    if (k < uniq.length) { lots[li].type = uniq[k]; return; }
    let r = g.rnd() * wsum;
    for (const [type, wt] of Object.entries(p.weights)) { r -= wt; if (r <= 0) { lots[li].type = type; break; } }
  });
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (inPark(i, j)) lots[i + n * j].type = 'cpark';
  if (!metro && (lots[0].type === 'tower' || lots[0].type === 'factory')) lots[0].type = 'park'; // keep the view open at the start
  for (const l of lots) if (l.type === 'park' || l.type === 'forest') l.hill = Math.min(22, Math.round(p.hills * g.m(8) * (0.4 + g.rnd()) * (l.type === 'forest' ? 1.5 : 1))); // capped so slopes stay walkable

  // Terrain: flat streets, optional hills inside park lots.
  const height = (x, z) => {
    const l = lots[(x >> 6) + n * (z >> 6)];
    if (!l.hill) return G;
    const dx = (x & 63) - 36, dz = (z & 63) - 36, d = Math.hypot(dx, dz) / 24;
    return d >= 1 ? G : G + Math.round(l.hill * Math.cos((d * Math.PI) / 2) ** 2);
  };
  const grass = (x, z) => ((((x * 7 + z * 13) ^ (x * z)) & 7) < 2 ? T.GRASS2 : T.GRASS);
  const green = new Set(['park', 'forest', 'houses', 'church', 'cpark']);
  const pcx = (pk0 + pk / 2) * P + 4, pcz = pcx; // park centre
  for (let z = 0; z < S; z++) for (let x = 0; x < S; x++) {
    const i = x >> 6, j = z >> 6, lx = x & 63, lz = z & 63, h = height(x, z), l = lots[i + n * j];
    const rwx = roadW(i), rwz = roadW(j);
    let top;
    if (l.type === 'cpark' && (lx >= rwx || inPark(i - 1, j)) && (lz >= rwz || inPark(i, j - 1))) {
      // Lawn with a round plaza in the middle and paths leading out to the four sides.
      const dx = Math.abs(x - pcx), dz = Math.abs(z - pcz), r = Math.hypot(dx, dz);
      top = r < 18 ? ((x >> 1) + (z >> 1)) & 1 ? T.PAVE : T.PAVE2 : dx < 3 || dz < 3 || Math.abs(r - pk * 26) < 2 ? T.PAVE_RED : grass(x, z);
    } else if (lx < rwx || lz < rwz) {
      top = T.ROAD;
      const ax = lx < rwx && lz >= rwz, az = lz < rwz && lx >= rwx; // on the street running along z / along x
      if (ax || az) {
        const across = ax ? lx : lz, along = ax ? lz : lx, rw = ax ? rwx : rwz, cross = ax ? rwz : rwx;
        if (rw === 16) {
          if (across === 7 || across === 8) top = T.PAVE2; // median
          else if ((across === 3 || across === 12) && (along >> 2) & 1) top = T.ROADLINE;
        } else if ((across === 3 || across === 4) && (along >> 2) & 1) top = T.ROADLINE;
        if (metro && along >= cross + 1 && along < cross + 4 && across & 1) top = T.ROADLINE; // zebra crossing
      }
    } else if (lx < rwx + 2 || lz < rwz + 2 || lx >= P - 2 || lz >= P - 2) top = T.SIDEWALK;
    else top = metro && !green.has(l.type) ? (((x >> 2) + (z >> 2)) & 1 ? T.PAVE : T.PAVE2) : grass(x, z);
    w.set(x, 0, z, T.BEDROCK);
    for (let y = 1; y < h - 1; y++) w.set(x, y, z, T.DIRT);
    w.set(x, h - 1, z, top);
  }

  const hf = p.height;
  // A car placed while another structure is being built must not end that structure.
  const parkCar = (x, y, z) => { const cur = g.cur, major = g.major; car(g, x, y, z, true); g.cur = cur; g.major = major; };
  const towerFloors = () => {
    // Mostly mid-rise with a few giants: the random share is raised to a power, so tall towers are rare.
    const share = g.rnd() ** (p.skew ?? 1);
    return Math.max(4, Math.min(maxFloors, Math.round((0.22 + 0.78 * share) * maxFloors * Math.min(1, hf))));
  };
  for (let lz = 0; lz < n; lz++) for (let lx = 0; lx < n; lx++) {
    const l = lots[lx + n * lz], rwx = roadW(lx), rwz = roadW(lz);
    // Usable square of the lot: L x L with its corner at (x0, z0).
    const x0 = lx * P + rwx + 2, z0 = lz * P + rwz + 2, L = P - Math.max(rwx, rwz) - 4;
    switch (l.type) {
      case 'cpark': break; // planted below, as one piece
      case 'houses':
        for (const [a, b] of [[2, 2], [28, 2], [2, 28], [28, 28]]) {
          if (g.chance(0.12)) { tree(g, x0 + a + 10, G, z0 + b + 10, 1.2); continue; }
          const hw = g.int(g.m(7), g.m(10)), hd = g.int(g.m(6), g.m(8));
          g.begin('house', '🏠', { major: true });
          house(g, x0 + a + g.int(0, 3), G, z0 + b + g.int(0, 3), hw, hd, hf > 0.7 && g.chance(0.5) ? 3 : g.int(1, 2));
          g.end();
          if (g.chance(p.green)) tree(g, x0 + a + hw + 2, G, z0 + b + g.int(0, 10), 0.9);
        }
        if (g.chance(p.cars)) car(g, x0 + 22, G, z0 + 20, false);
        break;
      case 'apartment': {
        const floors = Math.max(2, Math.min(maxFloors, Math.round((2 + hf * 5 * (0.6 + g.rnd() * 0.5)) * (H / 128) ** 0.6)));
        g.begin('apartment', '🏬', { major: true });
        house(g, x0 + 4, G, z0 + 10, L - 8, g.m(12), floors, { flat: true, wall: g.pick([T.BRICK_RED, T.BRICK_YELLOW, T.PLASTER_WHITE, T.CONCRETE_TAN]) });
        g.end();
        for (let i = 0; i < 4; i++) if (g.chance(p.green)) tree(g, x0 + 6 + i * 12, G, z0 + L - 10, 1);
        for (let i = 0; i < 3; i++) if (g.chance(p.cars)) car(g, x0 + 4 + i * 14, G, z0 + 2, true);
        break;
      }
      case 'tower': {
        const floors = towerFloors();
        g.begin('tower', floors > 40 ? '🏙️' : '🏢', { major: true });
        if (metro) skyscraper(g, x0, G, z0, L, floors);
        else { const tw = g.int(g.m(11), g.m(16)), td = g.int(g.m(11), g.m(16)); tower(g, x0 + ((L - tw) >> 1), G, z0 + ((L - td) >> 1), tw, td, floors); }
        g.end();
        break;
      }
      case 'twin':
        g.begin('tower', '🌉', { major: true });
        twinTowers(g, x0, G, z0, L, Math.max(16, Math.round(towerFloors() * 0.8)));
        g.end();
        break;
      case 'lowrise':
        g.begin('shops', '🏪', { major: true });
        lowrise(g, x0, G, z0, L);
        g.end();
        for (let i = 0; i < 3; i++) if (g.chance(p.cars)) car(g, x0 + 4 + i * 14, G, z0 + L - 10, true, g.chance(0.1));
        break;
      case 'garage':
        g.begin('carpark', '🅿️', { major: true });
        carPark(g, x0, G, z0, L, g.int(3, 6), parkCar);
        g.end();
        break;
      case 'square': {
        g.begin('fountain', '⛲', { major: true });
        fountain(g, x0 + (L >> 1), G, z0 + (L >> 1), 7);
        g.end();
        for (const [a, b] of [[6, 6], [L - 8, 6], [6, L - 8], [L - 8, L - 8]]) tree(g, x0 + a, G, z0 + b, 1.1);
        g.begin('lamp', '💡', {});
        for (const [a, b] of [[L >> 1, 4], [L >> 1, L - 5], [4, L >> 1], [L - 5, L >> 1]]) lamp(g, x0 + a, G, z0 + b);
        g.end();
        break;
      }
      case 'factory': {
        g.begin('factory', '🏭', { major: true });
        hall(g, x0 + 2, G, z0 + 2, g.m(21), g.m(15), g.m(9));
        g.end();
        g.begin('chimney', '🗼', { major: true });
        chimney(g, x0 + L - g.m(3), G, z0 + L - g.m(4), Math.round(g.m(26) + g.rnd() * g.m(22) * hf));
        g.end();
        for (let i = 0; i < 2; i++) {
          g.begin('tank', '🛢️', { major: true });
          if (g.chance(0.6)) tank(g, x0 + g.m(4) + i * g.m(8), G, z0 + L - g.m(4), g.m(3, 2), g.m(6));
          else silo(g, x0 + g.m(4) + i * g.m(8), G, z0 + L - g.m(4), g.m(3, 2), g.m(14));
          g.end();
        }
        g.begin('pipes', '🔧', { major: false });
        g.box(x0 + g.m(22), G + g.m(5), z0 + g.m(8), g.m(2), 1, 1, T.STEEL);
        g.box(x0 + g.m(24), G, z0 + g.m(8), 1, g.m(5) + 1, 1, T.STEEL);
        g.end();
        break;
      }
      case 'church':
        g.begin('church', '⛪', { major: true });
        church(g, x0 + 4, G, z0 + 14, Math.min(L - 10, 42), g.m(9));
        g.end();
        for (let i = 0; i < 4; i++) tree(g, x0 + 4 + i * 10, G, z0 + 4, 1);
        break;
      case 'gas':
        g.begin('gas', '⛽', { major: true });
        gasStation(g, x0 + 2, G, z0 + 12);
        g.end();
        if (g.chance(p.cars)) car(g, x0 + 8, G, z0 + 34, true);
        break;
      case 'parking':
        for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) if (g.chance(0.35 + p.cars * 0.5)) car(g, x0 + 2 + i * 10, G, z0 + 3 + j * 14, false, g.chance(0.08));
        break;
      case 'water':
        g.begin('watertower', '🗼', { major: true });
        waterTower(g, x0 + (L >> 1), G, z0 + (L >> 1));
        g.end();
        break;
      case 'crane':
        g.begin('crane', '🏗️', { major: true });
        crane(g, x0 + 10, G, z0 + (L >> 1), g.m(22));
        g.end();
        g.begin('site', '🧱', { major: true });
        g.box(x0 + 22, G, z0 + 8, 18, 1, 28, T.CONCRETE);
        for (let f = 0; f < 3; f++) { g.shell(x0 + 22, G + 1 + f * 6, z0 + 8, 18, 5, 28, f < 2 ? T.CONCRETE : T.STEEL); g.box(x0 + 22, G + 6 + f * 6, z0 + 8, 18, 1, 28, T.CONCRETE); }
        g.end();
        break;
      case 'toys': // giant toy blocks, four stacks per lot
        for (const [a, b] of [[2, 2], [28, 2], [2, 28], [28, 28]]) {
          const nx = g.int(2, 5), nz = g.int(2, 5), lv = Math.max(2, Math.round(g.int(3, 16) * (0.5 + hf)));
          g.begin('toy', lv > 12 ? '🗼' : '🧱', { major: true });
          toyTower(g, x0 + a, G, z0 + b, nx, nz, Math.min(lv, 24), 4);
          g.end();
        }
        break;
      default: { // park and forest
        const count = l.type === 'forest' ? g.int(12, 18) : Math.round(2 + p.green * 8 * g.rnd());
        for (let i = 0; i < count; i++) {
          const tx = x0 + g.int(3, L - 6), tz = z0 + g.int(3, L - 6);
          tree(g, tx, height(tx, tz), tz, (0.9 + g.rnd() * 0.7) * (l.type === 'forest' ? 1.3 : 1));
        }
      }
    }
    if (l.type === 'cpark') continue;
    // Street furniture and parked cars along the road.
    const bx = lx * P, bz = lz * P;
    g.begin('lamp', '💡', {});
    lamp(g, bx + rwx, G, bz + rwz + 20);
    lamp(g, bx + rwx + 30, G, bz + rwz);
    if (metro) { trafficLight(g, bx + rwx, G, bz + rwz); if (g.chance(0.4)) hydrant(g, bx + rwx + 1, G, bz + rwz + 12); if (g.chance(0.3)) busStop(g, bx + rwx + 14, G, bz + rwz); }
    g.end();
    if (g.chance(p.cars * 0.6)) car(g, bx + rwx + 16 + g.int(0, 18), G, bz + 1, true, g.chance(0.12));
    if (g.chance(p.cars * 0.6)) car(g, bx + 1, G, bz + rwz + 16 + g.int(0, 18), false);
    if (g.chance(p.cars * 0.4)) car(g, bx + rwx - 4, G, bz + rwz + 16 + g.int(0, 18), false);
    // Trees on the median of avenues.
    if (rwx === 16 && !inPark(lx - 1, lz)) for (let k = rwz + 6; k < P - 4; k += 14) tree(g, bx + 7, G, bz + k, 1);
    if (rwz === 16 && !inPark(lx, lz - 1)) for (let k = rwx + 6; k < P - 4; k += 14) tree(g, bx + k, G, bz + 7, 1);
  }

  if (pk) {
    // Central park: an open lawn to look at the skyline from. Trees stand in a loose ring, the middle stays free.
    const half = pk * 32 - 12;
    g.begin('fountain', '⛲', { major: true });
    fountain(g, pcx, G, pcz + 26, 8);
    g.end();
    for (let k = 0; k < pk * pk * 9; k++) {
      const a = g.rnd() * 6.283, r = half * (0.55 + 0.45 * g.rnd());
      const tx = Math.round(pcx + Math.cos(a) * r * 1.1), tz = Math.round(pcz + Math.sin(a) * r * 1.1);
      if (Math.abs(tx - pcx) > half || Math.abs(tz - pcz) > half || Math.abs(tx - pcx) < 8 || Math.abs(tz - pcz) < 8) continue;
      tree(g, tx, G, tz, 1 + g.rnd() * 0.8);
    }
    g.begin('lamp', '💡', {});
    for (let k = 0; k < 8; k++) lamp(g, Math.round(pcx + Math.cos(k * 0.785) * 24), G, Math.round(pcz + Math.sin(k * 0.785) * 24));
    g.end();
    w.spawn = [pcx, G, pcz];
    w.heading = 0;
  } else {
    w.spawn = [4, G, 4];
    w.heading = Math.PI / 4;
  }
  w.people = Math.round(n * n * 4 * (p.people ?? 0.5));
  return w;
}

// World list --------------------------------------------------------------------

// stage: the monster stage a world is built for (shown on its tile). `unique` counts are per 8 x 8 lots.
export const WORLDS = [
  // The skyscraper city is the main scenario and the first tile.
  { id: 'skyline', icon: '🌆', stage: 1, make: (seed, q) => town(seed, { size: q.tall, sy: 512, skew: 1.8, metro: true, weights: { tower: 10, lowrise: 2.4, apartment: 0.8, garage: 0.7, square: 0.8, twin: 0.22 }, unique: { crane: 2, gas: 1, church: 1 }, height: 1, cars: 0.8, hills: 0, green: 0.4, people: 1 }) },
  { id: 'blocks', icon: '🧱', stage: 1, make: (seed) => blockRoom(seed) },
  { id: 'garden', icon: '🌷', stage: 2, make: (seed) => garden(seed) },
  { id: 'house', icon: '🏠', stage: 3, make: (seed) => houseWorld(seed) },
  { id: 'toyland', icon: '🧸', stage: 4, make: (seed, q) => town(seed, { size: q.planet, weights: { toys: 8, park: 1.5, parking: 0.5 }, unique: { water: 1 }, height: 0.6, cars: 0.6, hills: 0.5, green: 0.6, people: 0.4 }) },
  { id: 'village', icon: '🏘️', stage: 5, make: (seed, q) => town(seed, { size: q.planet, weights: { houses: 6, park: 3, apartment: 0.6, parking: 0.5 }, unique: { church: 1, gas: 1, water: 1 }, height: 0.4, cars: 0.5, hills: 0.7, green: 0.8, people: 0.6 }) },
  { id: 'park', icon: '🌳', stage: 5, make: (seed, q) => town(seed, { size: q.planet, weights: { forest: 5, park: 4, houses: 1 }, unique: { church: 1, water: 1 }, height: 0.3, cars: 0.2, hills: 1.5, green: 1, people: 0.5 }) },
  { id: 'city', icon: '🏙️', stage: 6, make: (seed, q) => town(seed, { size: q.planet, sy: 256, skew: 1.6, metro: true, weights: { tower: 5, apartment: 2.5, lowrise: 2, park: 1, parking: 0.6, houses: 0.4, square: 0.5, garage: 0.5 }, unique: { church: 1, gas: 1, crane: 1 }, height: 1, cars: 0.8, hills: 0.2, green: 0.5, people: 1 }) },
  { id: 'factory', icon: '🏭', stage: 8, make: (seed, q) => town(seed, { size: q.planet, weights: { factory: 6, parking: 1, tower: 0.7, park: 0.6, apartment: 0.5 }, unique: { gas: 2, water: 2, crane: 2 }, height: 0.8, cars: 0.5, hills: 0.1, green: 0.3, people: 0.4 }) },
  { id: 'random', icon: '🎲', stage: 0, make: (seed, q, mix) => town(seed, mixToParams(mix, q)) },
];

// Mixer sliders (all 0..1) -> town parameters.
export const DEFAULT_MIX = { size: 1, buildings: 0.6, height: 0.6, industry: 0.3, cars: 0.5, people: 0.5, hills: 0.4, green: 0.5 };
export function mixToParams(mix, q) {
  const m = { ...DEFAULT_MIX, ...mix }, built = 0.5 + m.buildings * 6;
  return {
    size: m.size < 0.34 ? 256 : m.size < 0.67 ? Math.min(512, q.planet) : q.planet,
    weights: {
      houses: built * (1 - m.height) * (1 - m.industry) + 0.01, apartment: built * 0.6 * (1 - m.industry), tower: built * m.height * (1 - m.industry * 0.7),
      factory: built * m.industry * 1.5, parking: 0.3 + m.cars, park: 0.4 + (1 - m.buildings) * 5 + m.green, forest: m.green * (1 - m.buildings) * 3,
    },
    unique: { church: 1, gas: 1 + Math.round(m.industry), water: Math.round(m.industry * 2), crane: Math.round(m.height + m.industry) },
    height: 0.3 + m.height * 0.9, cars: m.cars, hills: m.hills * 1.4, green: m.green, people: m.people * 1.6,
  };
}
