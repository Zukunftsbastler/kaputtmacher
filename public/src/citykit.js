// Big-city construction kit: skyscrapers assembled from stacked segments with different plans,
// facades and roof furniture, plus the street-level pieces that make a downtown feel lived in.
// Everything draws through the generator `g` handed in by worldgen.js.

import { T } from './materials.js';

// Wall/frame, glass and accent colour of a building.
const SKINS = [
  { wall: T.CONCRETE_BLUE, glass: T.GLASS_DARK, accent: T.STEEL },
  { wall: T.GRANITE, glass: T.GLASS_BRONZE, accent: T.STEEL_YELLOW },
  { wall: T.STEEL_DARK, glass: T.GLASS_BLACK, accent: T.STEEL_RED },
  { wall: T.MARBLE, glass: T.GLASS, accent: T.STEEL },
  { wall: T.SANDSTONE, glass: T.GLASS_DARK, accent: T.ROOF_DARK },
  { wall: T.BRICK_RED, glass: T.GLASS, accent: T.TILE_WHITE },
  { wall: T.CONCRETE_LIGHT, glass: T.GLASS_GREEN, accent: T.STEEL },
  { wall: T.CONCRETE_TAN, glass: T.GLASS_MIRROR, accent: T.STEEL_DARK },
  { wall: T.TERRACOTTA, glass: T.GLASS_DARK, accent: T.MARBLE },
  { wall: T.CONCRETE, glass: T.GLASS_MIRROR, accent: T.STEEL_RED },
];
const NEON = [T.NEON_RED, T.NEON_BLUE, T.NEON_GREEN, T.NEON_PINK, T.NEON_YELLOW];
const AWNINGS = [T.FABRIC_RED, T.FABRIC_BLUE, T.FABRIC_GREEN, T.FABRIC_WHITE, T.FABRIC_YELLOW];

// Facade patterns: i runs along the wall, r is the row inside a storey of height fh (row 0 is the floor slab).
const FACADES = {
  curtain: (i, r, fh, s) => (i % 4 === 0 ? s.wall : s.glass), // glass with slim mullions
  piers: (i, r, fh, s) => (i % 3 === 0 || r === fh - 1 ? s.wall : s.glass), // stone piers, narrow windows
  bands: (i, r, fh, s) => (r <= 1 || r === fh - 1 ? s.wall : s.glass), // ribbon windows
  grid: (i, r, fh, s) => (i % 3 === 0 || r <= 1 || r === fh - 1 ? s.wall : s.glass), // punched windows
  sheer: (i, r, fh, s) => s.glass, // all glass
  stripes: (i, r, fh, s) => ((i >> 1) % 3 === 0 ? s.accent : s.glass), // bold vertical fins
};

// Floor plans on a w x d grid. Each returns inside(u, v).
const PLANS = {
  box: (w, d, inset) => (u, v) => u >= inset && v >= inset && u < w - inset && v < d - inset,
  // Corners cut off: an octagon.
  oct: (w, d, inset, c) => (u, v) => u >= inset && v >= inset && u < w - inset && v < d - inset &&
    Math.min(u - inset, w - inset - 1 - u) + Math.min(v - inset, d - inset - 1 - v) >= c,
  round: (w, d, inset) => (u, v) => ((u + 0.5 - w / 2) / (w / 2 - inset)) ** 2 + ((v + 0.5 - d / 2) / (d / 2 - inset)) ** 2 <= 1,
  // Corner squares removed: a plus or cross.
  plus: (w, d, inset, c) => (u, v) => u >= inset && v >= inset && u < w - inset && v < d - inset &&
    !(Math.min(u - inset, w - inset - 1 - u) < c && Math.min(v - inset, d - inset - 1 - v) < c),
};

// Builds storeys f0..f1-1 of one segment at (x, z). Returns the list of edge cells for later decoration.
function storeys(g, x, y, z, w, d, f0, f1, plan, facade, skin, mechEvery = 0) {
  const fh = g.m(3, 5);
  const inside = (u, v) => u >= 0 && v >= 0 && u < w && v < d && plan(u, v);
  const cells = [], edge = [];
  for (let v = 0; v < d; v++) for (let u = 0; u < w; u++) {
    if (!inside(u, v)) continue;
    if (!inside(u - 1, v) || !inside(u + 1, v) || !inside(u, v - 1) || !inside(u, v + 1)) edge.push(u, v);
    else cells.push(u, v);
  }
  const cw = Math.max(4, Math.min(8, Math.min(w, d) >> 2)), cx = x + (w >> 1) - (cw >> 1), cz = z + (d >> 1) - (cw >> 1);
  for (let f = f0; f < f1; f++) {
    const fy = y + f * fh, mech = mechEvery && f % mechEvery === mechEvery - 1;
    for (let k = 0; k < cells.length; k += 2) g.set(x + cells[k], fy, z + cells[k + 1], T.CONCRETE);
    for (let k = 0; k < edge.length; k += 2) {
      const u = edge[k], v = edge[k + 1];
      g.set(x + u, fy, z + v, skin.wall);
      // Service floors show as a dark louvred band.
      for (let r = 1; r < fh; r++) g.set(x + u, fy + r, z + v, mech ? (r & 1 ? T.CONCRETE_DARK : T.STEEL_DARK) : facade(u + v, r, fh, skin));
    }
    g.shell(cx, fy + 1, cz, cw, fh - 1, cw, T.CONCRETE_DARK); // lift core: what the tower stands on
    // Offices: a few desks with glowing screens, filing cabinets and the odd pot plant on every other floor.
    // They only show when the tower is opened up, which is exactly what happens to towers here.
    if (!mech && (f & 1) === 0 && cells.length > 40) for (let k = 0; k < 5; k++) {
      const c = g.int(0, (cells.length >> 1) - 1) * 2, u = cells[c], v = cells[c + 1];
      if (!inside(u + 2, v) || !inside(u + 1, v + 1) || (x + u + 2 >= cx - 1 && x + u <= cx + cw && z + v + 1 >= cz - 1 && z + v <= cz + cw)) continue; // not across the edge, not in the lift
      const kind = g.int(0, 5);
      if (kind < 3) { g.box(x + u, fy + 1, z + v, 2, 1, 1, T.WOOD_LIGHT); g.set(x + u, fy + 2, z + v, kind ? T.NEON_BLUE : T.NEON_GREEN); g.set(x + u + 1, fy + 1, z + v + 1, T.FABRIC_BLUE); }
      else if (kind === 3) g.box(x + u, fy + 1, z + v, 1, 2, 1, T.STEEL_DARK);
      else if (kind === 4) { g.set(x + u, fy + 1, z + v, T.BRICK_RED); g.set(x + u, fy + 2, z + v, T.LEAF_LIGHT); }
      else g.box(x + u, fy + 1, z + v, 2, 1, 1, T.FABRIC_RED); // a sofa in the corridor
    }
  }
  return { edge, cells, inside, fh };
}

// Closes a segment at the top: roof slab and a low parapet.
function roof(g, x, y, z, seg, skin, glow = 0) {
  for (let k = 0; k < seg.cells.length; k += 2) g.set(x + seg.cells[k], y, z + seg.cells[k + 1], T.CONCRETE);
  for (let k = 0; k < seg.edge.length; k += 2) {
    g.set(x + seg.edge[k], y, z + seg.edge[k + 1], skin.wall);
    g.set(x + seg.edge[k], y + 1, z + seg.edge[k + 1], glow || skin.wall);
  }
}

// Shops at street level: big windows between piers, a lit sign band and awnings that stick out over the pavement.
function shopfront(g, x, y, z, seg, skin) {
  const { edge, inside, fh } = seg;
  for (let k = 0; k < edge.length; k += 2) {
    const u = edge[k], v = edge[k + 1], shop = Math.floor((u + v) / 9), pier = (u + v) % 9 === 0;
    for (let r = 1; r < fh; r++) g.set(x + u, y + r, z + v, pier ? skin.wall : r === fh - 1 ? NEON[(shop * 7 + 3) % NEON.length] : T.GLASS);
    if (pier || shop % 3 === 2) continue;
    for (const [du, dv] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      if (inside(u + du, v + dv)) continue;
      g.set(x + u + du, y + fh - 2, z + v + dv, AWNINGS[shop % AWNINGS.length]);
      g.set(x + u + du * 2, y + fh - 3, z + v + dv * 2, AWNINGS[shop % AWNINGS.length]);
    }
  }
}

// Main entrance on the face towards -z: glass doors in a frame under a canopy on two posts.
function entrance(g, x, y, z, w, seg, skin) {
  const { edge } = seg;
  const mid = w >> 1;
  let front = 1e9;
  for (let k = 0; k < edge.length; k += 2) if (edge[k] === mid && edge[k + 1] < front) front = edge[k + 1];
  if (front > 1e8) return;
  const ex = x + mid, ez = z + front, style = g.int(0, 2);
  g.box(ex - 4, y + 1, ez, 9, 8, 1, skin.accent);
  g.box(ex - 3, y + 1, ez, 7, 7, 1, T.GLASS_MIRROR);
  g.box(ex, y + 1, ez, 1, 7, 1, skin.accent);
  if (style === 0) { // flat canopy on posts
    g.box(ex - 6, y + 8, ez - 6, 13, 1, 6, skin.accent);
    g.box(ex - 6, y, ez - 6, 1, 8, 1, T.STEEL); g.box(ex + 6, y, ez - 6, 1, 8, 1, T.STEEL);
    g.box(ex - 6, y + 9, ez - 6, 13, 1, 1, T.LAMP);
  } else if (style === 1) { // cloth awning sloping down
    const c = g.pick(AWNINGS);
    for (let k = 0; k < 5; k++) g.box(ex - 5, y + 9 - k, ez - 1 - k, 11, 1, 1, c);
  } else { // glass marquee with neon
    g.box(ex - 7, y + 8, ez - 4, 15, 1, 4, T.GLASS);
    g.box(ex - 7, y + 9, ez - 4, 15, 2, 1, g.pick(NEON));
  }
}

// Roof furniture, chosen at random: spire, wooden water tanks, helipad, plant, glowing crown, billboard.
function rooftop(g, cx, y, cz, room, skin, tall) {
  const kind = tall && g.chance(0.6) ? 'spire' : g.pick(['tanks', 'helipad', 'plant', 'antenna', 'sign', 'tanks', 'plant']);
  if (kind === 'spire') {
    const sh = g.m(10 + g.rnd() * 16), steps = Math.max(2, Math.min(5, room >> 2));
    for (let k = 0; k < steps; k++) g.box(cx - steps + k, y + 1 + k * 3, cz - steps + k, (steps - k) * 2 + 1, 3, (steps - k) * 2 + 1, skin.wall);
    g.box(cx, y + 1 + steps * 3, cz, 1, sh, 1, T.STEEL);
    g.box(cx, y + 1 + steps * 3 + sh, cz, 1, 1, 1, T.NEON_RED);
  } else if (kind === 'tanks') {
    for (let i = 0; i < g.int(1, 3); i++) {
      const tx = cx + g.int(-room + 3, room - 3), tz = cz + g.int(-room + 3, room - 3);
      for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) g.box(tx + a, y + 1, tz + b, 1, 4, 1, T.STEEL_DARK);
      g.cyl(tx, tz, 2, y + 5, 5, T.WOOD_DARK);
      g.cyl(tx, tz, 2, y + 10, 1, T.ROOF_DARK); g.cyl(tx, tz, 1, y + 11, 1, T.ROOF_DARK);
    }
  } else if (kind === 'helipad' && room >= 6) {
    g.cyl(cx, cz, 6, y + 1, 1, T.CONCRETE_DARK);
    g.cyl(cx, cz, 6, y + 1, 1, T.TILE_WHITE, true);
    g.box(cx - 2, y + 1, cz - 2, 1, 1, 5, T.NEON_YELLOW); g.box(cx + 2, y + 1, cz - 2, 1, 1, 5, T.NEON_YELLOW); g.box(cx - 2, y + 1, cz, 5, 1, 1, T.NEON_YELLOW);
  } else if (kind === 'sign') { // lit billboard on a steel frame
    const sw = Math.min(room * 2 - 2, 16), c = g.pick(NEON);
    g.box(cx - (sw >> 1), y + 1, cz, 1, 4, 1, T.STEEL_DARK); g.box(cx + (sw >> 1), y + 1, cz, 1, 4, 1, T.STEEL_DARK);
    g.box(cx - (sw >> 1), y + 5, cz, sw + 1, 6, 1, c);
    g.box(cx - (sw >> 1) + 1, y + 6, cz, sw - 1, 4, 1, T.TILE_WHITE);
  } else if (kind === 'antenna') {
    for (let i = 0; i < 3; i++) g.box(cx + g.int(-room + 2, room - 2), y + 1, cz + g.int(-room + 2, room - 2), 1, g.int(6, 18), 1, T.STEEL_DARK);
    g.box(cx, y + 1, cz, 1, 22, 1, T.STEEL); g.box(cx, y + 23, cz, 1, 1, 1, T.NEON_RED);
  } else { // plant: air conditioning and a stair head
    for (let i = 0; i < 4; i++) g.box(cx + g.int(-room + 2, room - 4), y + 1, cz + g.int(-room + 2, room - 4), g.int(2, 4), g.int(2, 3), g.int(2, 4), T.SHEET_GREY);
    g.box(cx - 2, y + 1, cz - 2, 5, 5, 5, skin.wall);
  }
}

// A vertical neon sign bolted to the facade, as in Tokyo's shopping streets.
function neonSign(g, x, y, z, w, d) {
  const c = g.pick(NEON), h = g.int(10, 26), sy = y + g.int(8, 20);
  if (g.chance(0.5)) { g.box(x - 1, sy, z + g.int(2, d - 4), 1, h, 2, c); g.box(x - 1, sy - 1, z + 1, 1, 1, d - 2, T.STEEL_DARK); }
  else { g.box(x + g.int(2, w - 4), sy, z - 1, 2, h, 1, c); }
}

// One skyscraper inside a square lot of side L with its corner at (x0, z0). `floors` is the total height.
export function skyscraper(g, x0, y, z0, L, floors) {
  const skin = g.pick(SKINS), fkeys = Object.keys(FACADES), facade = FACADES[g.pick(fkeys)];
  const tall = floors > 40, mech = floors > 24 ? g.int(14, 20) : 0;
  let kind = g.pick(['box', 'setback', 'setback', 'podium', 'podium', 'oct', 'round', 'plus', 'taper', 'slab', 'wedge', 'setback']);
  if (floors < 12 && (kind === 'taper' || kind === 'wedge')) kind = 'box';
  const maxW = Math.min(L - 8, tall ? 42 : 34);
  let w = g.int(22, maxW), d = g.int(22, maxW);
  if (kind === 'slab') { if (g.chance(0.5)) { w = maxW; d = g.int(14, 18); } else { d = maxW; w = g.int(14, 18); } }
  if (kind === 'round' || kind === 'oct') d = w;
  const x = x0 + ((L - w) >> 1), z = z0 + ((L - d) >> 1), fh = g.m(3, 5);
  const cut = Math.max(3, Math.min(w, d) >> 2), step = Math.max(2, Math.min(w, d) >> 3);
  // Segments: [first floor, last floor (exclusive), plan]
  const segs = [];
  switch (kind) {
    case 'setback': {
      const a = Math.round(floors * (0.45 + g.rnd() * 0.15)), b = Math.round(floors * (0.75 + g.rnd() * 0.1));
      segs.push([0, a, PLANS.box(w, d, 0)], [a, b, PLANS.box(w, d, step)], [b, floors, g.chance(0.5) ? PLANS.oct(w, d, step * 2, 2) : PLANS.box(w, d, step * 2)]);
      break;
    }
    case 'podium': {
      const p = Math.min(floors - 2, g.int(3, 6));
      segs.push([0, p, PLANS.box(w, d, 0)], [p, floors, g.pick([PLANS.box(w, d, step + 1), PLANS.round(w, d, step), PLANS.oct(w, d, step, cut)])]);
      break;
    }
    case 'oct': segs.push([0, Math.round(floors * 0.8), PLANS.oct(w, d, 0, cut)], [Math.round(floors * 0.8), floors, PLANS.oct(w, d, step, cut)]); break;
    case 'round': segs.push([0, Math.round(floors * 0.85), PLANS.round(w, d, 0)], [Math.round(floors * 0.85), floors, PLANS.round(w, d, step)]); break;
    case 'plus': segs.push([0, Math.round(floors * 0.7), PLANS.plus(w, d, 0, cut)], [Math.round(floors * 0.7), floors, PLANS.plus(w, d, 0, cut * 2 - 1)]); break;
    case 'taper': {
      const n = Math.min(7, Math.max(3, (Math.min(w, d) - 10) >> 1));
      for (let i = 0; i < n; i++) segs.push([Math.round((floors * i) / n), Math.round((floors * (i + 1)) / n), PLANS.box(w, d, i)]);
      break;
    }
    case 'wedge': { // slanted top: the last storeys recede from one side
      const base = Math.round(floors * 0.75), n = floors - base;
      segs.push([0, base, PLANS.box(w, d, 0)]);
      for (let i = 0; i < n; i++) { const lim = Math.round(w * (1 - (0.42 * (i + 1)) / n)); segs.push([base + i, base + i + 1, (u) => u < lim]); }
      break;
    }
    default: segs.push([0, floors, PLANS.box(w, d, 0)]);
  }
  let last = null, ground = null;
  for (const [f0, f1, plan] of segs) {
    if (f1 <= f0) continue;
    const seg = storeys(g, x, y, z, w, d, f0, f1, plan, facade, skin, mech);
    if (last) roof(g, x, y + f0 * fh, z, last, skin); // terrace on the wider segment below
    if (!ground) ground = seg;
    last = seg;
  }
  const top = y + floors * fh;
  roof(g, x, top, z, last, skin, tall && g.chance(0.5) ? g.pick(NEON) : 0);
  // How much flat roof there is around the centre.
  let room = 0;
  while (room < 12 && last.inside((w >> 1) + room + 2, d >> 1) && last.inside((w >> 1) - room - 2, d >> 1) && last.inside(w >> 1, (d >> 1) + room + 2) && last.inside(w >> 1, (d >> 1) - room - 2)) room++;
  if (room >= 3) rooftop(g, x + (w >> 1), top, z + (d >> 1), room, skin, tall);
  if (g.chance(0.55)) shopfront(g, x, y, z, ground, skin);
  if (g.chance(0.75)) entrance(g, x, y, z, w, ground, skin);
  if (g.chance(0.3)) neonSign(g, x, y, z, w, d);
}

// Two slender towers joined by a glazed bridge high above the street. Rare on purpose.
export function twinTowers(g, x0, y, z0, L, floors) {
  const skin = g.pick(SKINS), facade = FACADES[g.pick(['curtain', 'sheer', 'bands'])], fh = g.m(3, 5);
  const w = Math.min(20, (L - 14) >> 1), d = Math.min(26, L - 10), gap = L - 6 - w * 2, z = z0 + ((L - d) >> 1);
  const xa = x0 + 3, xb = xa + w + gap, plan = PLANS.box(w, d, 0);
  const fa = floors, fb = Math.max(8, floors - g.int(0, 6));
  for (const [x, f] of [[xa, fa], [xb, fb]]) {
    const seg = storeys(g, x, y, z, w, d, 0, f, plan, facade, skin, 18);
    roof(g, x, y + f * fh, z, seg, skin, T.NEON_BLUE);
    rooftop(g, x + (w >> 1), y + f * fh, z + (d >> 1), 4, skin, false);
    entrance(g, x, y, z, w, seg, skin);
  }
  const bf = Math.round(Math.min(fa, fb) * (0.5 + g.rnd() * 0.25)), by = y + bf * fh, bz = z + (d >> 1) - 3;
  g.box(xa + w - 1, by, bz, gap + 2, 1, 6, skin.wall);
  g.box(xa + w - 1, by + fh * 2, bz, gap + 2, 1, 6, skin.wall);
  g.box(xa + w, by + 1, bz, gap, fh * 2 - 1, 1, skin.glass); g.box(xa + w, by + 1, bz + 5, gap, fh * 2 - 1, 1, skin.glass);
  g.box(xa + w, by + fh, bz, gap, 1, 6, skin.accent);
}

// A row of old low-rise houses with shops below, cornices, fire escapes and water tanks: the gaps between the giants.
export function lowrise(g, x0, y, z0, L) {
  const fh = g.m(3, 5), d = g.int(20, 28), z = z0 + 2;
  for (let x = x0 + 1; x + 12 <= x0 + L; ) {
    const w = Math.min(g.int(11, 17), x0 + L - x), floors = g.int(3, 8);
    const wall = g.pick([T.BRICK_RED, T.BRICK_DARK, T.BRICK_YELLOW, T.TERRACOTTA, T.SANDSTONE, T.PLASTER_WHITE]), awn = g.pick(AWNINGS);
    for (let f = 0; f < floors; f++) {
      const fy = y + f * fh;
      g.box(x, fy, z, w, 1, d, f ? T.WOOD : T.CONCRETE);
      g.shell(x, fy + 1, z, w, fh - 1, d, wall);
      if (f === 0) { // shop window, door and awning
        g.box(x + 1, fy + 1, z, w - 2, fh - 2, 1, T.GLASS);
        g.box(x + (w >> 1), fy + 1, z, 2, fh - 2, 1, T.WOOD_DARK);
        g.box(x, fy + fh - 1, z, w, 1, 1, g.pick(NEON));
        g.box(x, fy + fh - 2, z - 1, w, 1, 1, awn); g.box(x, fy + fh - 3, z - 2, w, 1, 1, awn);
      } else {
        for (let i = 2; i + 2 < w; i += 4) { g.box(x + i, fy + 2, z, 2, 3, 1, T.GLASS); g.box(x + i, fy + 2, z + d - 1, 2, 3, 1, T.GLASS); }
        if (f > 1) g.box(x + 1, fy, z - 1, w - 2, 1, 1, T.STEEL_DARK); // fire escape landing
      }
    }
    const ty = y + floors * fh;
    g.box(x, ty, z, w, 1, d, T.CONCRETE_DARK);
    g.box(x, ty + 1, z, w, 1, 1, T.MARBLE); g.box(x, ty, z - 1, w, 1, 1, T.MARBLE); // cornice
    if (g.chance(0.6)) { g.cyl(x + (w >> 1), z + (d >> 1), 2, ty + 4, 4, T.WOOD_DARK); for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) g.box(x + (w >> 1) + a, ty + 1, z + (d >> 1) + b, 1, 3, 1, T.STEEL_DARK); }
    else if (g.chance(0.5)) { const c = g.pick(NEON); g.box(x + 1, ty + 1, z + 2, w - 2, 5, 1, c); g.box(x + 2, ty + 2, z + 2, w - 4, 3, 1, T.TILE_WHITE); }
    x += w;
  }
}

// Multi-storey car park: open concrete decks on columns, with a ramp tower.
export function carPark(g, x0, y, z0, L, decks, parkCar) {
  const w = L - 6, d = L - 14, x = x0 + 3, z = z0 + 7, h = 5;
  for (let f = 0; f <= decks; f++) {
    const fy = y + f * h;
    g.box(x, fy, z, w, 1, d, T.CONCRETE);
    if (f === decks) break;
    g.shell(x, fy + 1, z, w, 1, d, T.CONCRETE_LIGHT);
    for (let i = 0; i < w; i += 8) for (let j = 0; j < d; j += 8) g.box(x + i, fy + 1, z + j, 1, h - 1, 1, T.CONCRETE_DARK);
    g.box(x + w - 1, fy + 1, z + d - 1, 1, h - 1, 1, T.CONCRETE_DARK);
    for (let i = 3; i + 9 < w; i += 10) if (g.chance(0.55)) parkCar(x + i, fy + 1, z + 3 + g.int(0, 1) * (d - 14));
  }
  g.shell(x + w - 8, y + 1, z, 8, decks * h + 4, 8, T.CONCRETE_DARK);
  g.box(x, y + decks * h + 1, z, 1, 4, d, T.NEON_BLUE); // lit "P" edge
}

// Small paved square with a fountain in the middle.
export function fountain(g, cx, y, cz, r) {
  g.cyl(cx, cz, r, y, 2, T.MARBLE, true);
  g.cyl(cx, cz, r - 1, y, 1, T.WATER);
  g.cyl(cx, cz, 2, y, 4, T.MARBLE);
  g.cyl(cx, cz, 3, y + 4, 1, T.MARBLE);
  g.box(cx, y + 5, cz, 1, 3, 1, T.WATER);
}

export function trafficLight(g, x, y, z) {
  g.box(x, y, z, 1, 7, 1, T.STEEL_DARK);
  g.box(x, y + 7, z, 1, 1, 1, T.NEON_RED); g.box(x, y + 8, z, 1, 1, 1, T.NEON_YELLOW); g.box(x, y + 9, z, 1, 1, 1, T.NEON_GREEN);
}

export function busStop(g, x, y, z) {
  g.box(x, y, z, 1, 5, 1, T.STEEL); g.box(x + 9, y, z, 1, 5, 1, T.STEEL);
  g.box(x, y + 5, z - 1, 10, 1, 4, T.GLASS_DARK);
  g.box(x, y + 1, z + 2, 10, 4, 1, T.GLASS);
  g.box(x + 2, y, z + 1, 6, 2, 1, T.WOOD);
}

export function hydrant(g, x, y, z) {
  g.box(x, y, z, 1, 3, 1, T.HYDRANT);
  g.set(x, y + 3, z, T.TILE_WHITE);
}
