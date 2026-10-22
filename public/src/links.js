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
//
// Hubs are where networks start, end and branch: stations, spiral ramps, towers with platforms at several heights,
// lift towers, lookouts, watchtowers, glass domes ... (HUBS). They stand on free ground or on the roof of a low
// building, which is drawn into the network that way. A network may also join another one (spec.join: the sky
// bridges of the neon city end on the decks of its highways), and piers may rest on the roofs they pass over.

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

// Hubs ------------------------------------------------------------------------------------------------------

// A tower with platforms: four corner posts (or a closed shaft, or a round one) and a platform every `step` from
// `from` up to the top. Returns the heights of the platforms: that is where links attach.
function towerHub(g, x, y, z, o) {
  const r = o.size >> 1, top = y + o.h, levels = [];
  for (let yy = y; yy < top; yy++) {
    if (o.round) g.cyl(x, z, r, yy, 1, o.post, true);
    else if (o.shaft) g.shell(x - r, yy, z - r, o.size, 1, o.size, (yy - y) % 4 === 0 ? o.beam ?? o.post : o.post);
    else {
      for (const [a, b] of [[-r, -r], [r, -r], [-r, r], [r, r]]) g.set(x + a, yy, z + b, o.post);
      if ((yy - y) % (o.brace ?? 6) === 0) g.shell(x - r, yy, z - r, o.size + 1, 1, o.size + 1, o.beam ?? o.post);
    }
  }
  const p = o.plat >> 1;
  for (let yy = y + o.from; yy <= top; yy += o.step) {
    const ly = Math.min(yy, top);
    if (o.round) g.cyl(x, z, p, ly, 1, o.platT); else g.box(x - p, ly, z - p, o.plat + 1, 1, o.plat + 1, o.platT);
    if (o.rim) { if (o.round) g.cyl(x, z, p, ly + 1, 1, o.rim, true); else g.shell(x - p, ly, z - p, o.plat + 1, 1, o.plat + 1, o.rim); }
    levels.push(ly);
    if (top - ly < o.step) break;
  }
  if (!levels.includes(top) && o.topLevel !== false) { if (o.round) g.cyl(x, z, p, top, 1, o.platT); else g.box(x - p, top, z - p, o.plat + 1, 1, o.plat + 1, o.platT); levels.push(top); }
  return levels;
}

// The builders: (g, x, y, z, H, S) -> heights of the attachment levels. y is the ground or the roof they stand on.
const HUBS = {
  // A railway station on stilts: platform, canopy, a stair down to the street.
  station: { r: 8, icon: '🚉', road: true, build(g, x, y, z, H) {
    const h = g.int(16, 26), py = y + h;
    for (const [a, b] of [[-5, -11], [5, -11], [-5, 11], [5, 11]]) g.box(x + a, y, z + b, 2, h, 2, T.CONCRETE);
    g.box(x - 6, py, z - 12, 13, 1, 25, T.CONCRETE); g.box(x - 6, py - 1, z - 12, 13, 1, 25, T.CONCRETE_DARK);
    for (const [a, b] of [[-5, -10], [5, -10], [-5, 10], [5, 10]]) g.box(x + a, py + 1, z + b, 1, 6, 1, T.STEEL);
    g.box(x - 6, py + 7, z - 11, 13, 1, 23, T.SHEET_GREY); g.box(x - 6, py + 1, z - 12, 13, 1, 1, T.STEEL_YELLOW);
    for (let i = 0; i < h; i++) g.box(x - 9, y + i, z - 12 + i, 3, 1, 2, T.CONCRETE_LIGHT); // the stair up from the street
    return [py];
  } },
  // A slender tower of the neon city with platforms at many heights, lit along its edges.
  skyhub: { r: 8, icon: '🗼', roof: true, build(g, x, y, z, H, S) {
    const h = Math.min(H - 30 - y, g.int(90, 220)), neon = S.neon ? g.pick(NEON) : T.STEEL;
    const lv = towerHub(g, x, y, z, { size: 7, h, shaft: true, post: T.GLASS_BLACK, beam: T.CONCRETE_DARK, plat: 15, platT: T.CONCRETE_DARK, rim: neon, from: 30, step: 24 });
    for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) for (let yy = y; yy < y + h; yy++) g.set(x + a, yy, z + b, neon);
    for (let yy = 0; yy < 18; yy++) g.set(x, y + h + 1 + yy, z, yy === 17 ? T.NEON_RED : T.STEEL);
    return lv;
  } },
  // A spiral ramp: the way from the street up to the highways, with a full ring at every level where they join.
  helix: { r: 11, icon: '🌀', road: true, build(g, x, y, z, H, S) {
    const top = Math.min(H - 30, y + g.int(110, 220)), step = 24, levels = [], rim = S.neon ? g.pick(NEON) : T.CONCRETE_LIGHT;
    g.cyl(x, z, 3, y, top - y, T.CONCRETE);
    for (let ly = y + step; ly <= top; ly += step) { // rings with barriers
      for (let dz = -12; dz <= 12; dz++) for (let dx = -12; dx <= 12; dx++) { const d = Math.hypot(dx, dz); if (d > 12 || d < 4) continue; g.set(x + dx, ly, z + dz, T.CONCRETE); if (d > 11) g.set(x + dx, ly + 1, z + dz, rim); }
      levels.push(ly);
    }
    for (let a = 0, yy = y; yy < (levels[levels.length - 1] ?? y); a += 0.03) { // the ramp itself, once round per level
      yy = y + (a / 6.283) * step;
      for (let r = 4.5; r <= 11; r += 0.7) g.set(Math.round(x + Math.cos(a) * r), Math.round(yy), Math.round(z + Math.sin(a) * r), T.CONCRETE_DARK);
    }
    return levels;
  } },
  // The lift hill of a roller coaster: a tall lattice tower with a station roof at its foot.
  lift: { r: 8, icon: '🎢', build(g, x, y, z, H) {
    const h = Math.min(H - 30 - y, g.int(45, 100));
    const lv = towerHub(g, x, y, z, { size: 8, h, post: T.STEEL_RED, beam: T.STEEL, brace: 5, plat: 10, platT: T.STEEL_DARK, from: Math.round(h * 0.55), step: 999 });
    for (const [a, b] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) g.box(x + a, y, z + b, 1, 6, 1, T.WOOD);
    for (let i = -7; i <= 7; i++) g.box(x + i, y + 6, z - 7, 1, 1, 15, i & 1 ? T.FABRIC_RED : T.FABRIC_WHITE); // the station roof
    return lv;
  } },
  // A lookout in the jungle: a wooden tower on four legs with platforms, railings and a thatched roof.
  lookout: { r: 7, icon: '🛖', build(g, x, y, z, H) {
    const h = Math.min(H - 30 - y, g.int(30, 75));
    const lv = towerHub(g, x, y, z, { size: 6, h, post: T.WOOD_DARK, beam: T.WOOD, brace: 8, plat: 11, platT: T.WOOD, rim: T.WOOD_LIGHT, from: 16, step: 18 });
    for (let k = 0; k < 5; k++) g.box(x - 6 + k, y + h + 3 + k, z - 6 + k, 13 - 2 * k, 1, 13 - 2 * k, T.REED);
    for (const [a, b] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) g.box(x + a, y + h + 1, z + b, 1, 2, 1, T.WOOD_DARK);
    return lv;
  } },
  // A stair tower of Babel: a square shaft of sandstone with landings on every level, crenellated on top.
  stairtower: { r: 8, icon: '🏛️', roof: true, build(g, x, y, z, H) {
    const h = Math.min(H - 30 - y, g.int(30, 80));
    const lv = towerHub(g, x, y, z, { size: 9, h, shaft: true, post: T.SANDSTONE, beam: T.BRICK_YELLOW, plat: 13, platT: T.SANDSTONE, rim: T.LEAF, from: 14, step: 14 });
    for (let i = -6; i <= 6; i += 2) { g.set(x + i, y + h + 1, z - 6, T.SANDSTONE); g.set(x + i, y + h + 1, z + 6, T.SANDSTONE); }
    return lv;
  } },
  // A round watchtower of stone with a crenellated top.
  watchtower: { r: 7, icon: '🏰', roof: true, build(g, x, y, z, H) {
    const h = g.int(24, 44);
    const lv = towerHub(g, x, y, z, { size: 10, h, round: true, post: T.STONE, plat: 12, platT: T.STONE, rim: T.STONE, from: h - 14, step: 14 });
    for (let a = 0; a < 6.28; a += 0.5) g.set(Math.round(x + Math.cos(a) * 6), y + h + 2, Math.round(z + Math.sin(a) * 6), T.STONE);
    return lv;
  } },
  // A junction dome under the sea: a glass sphere on four legs where the tubes meet.
  dome: { r: 9, icon: '🫧', build(g, x, y, z) {
    const cy = y + g.int(8, 18), R = 7;
    for (const [a, b] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) g.box(x + a, y, z + b, 1, cy - y - 3, 1, T.STEEL);
    for (let dy = -R; dy <= R; dy++) for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { const d = Math.hypot(dx, dy, dz); if (d <= R && d > R - 1.2) g.set(x + dx, cy + dy, z + dz, dy === -R + 1 ? T.STEEL : T.GLASS); }
    g.cyl(x, z, R - 2, cy - 3, 1, T.STEEL);
    return [cy - 3];
  } },
  // A pipe rack: a steel frame with a deck every few metres.
  rack: { r: 5, icon: '🔧', roof: true, build(g, x, y, z, H) {
    const h = g.int(14, 32);
    return towerHub(g, x, y, z, { size: 6, h, post: T.STEEL, beam: T.STEEL_DARK, brace: 4, plat: 7, platT: T.STEEL_DARK, from: 10, step: 8 });
  } },
  // A transfer tower for conveyors: a steel frame with a clad house on top.
  transfer: { r: 6, icon: '🏗️', roof: true, build(g, x, y, z, H) {
    const h = Math.min(H - 30 - y, g.int(25, 55));
    const lv = towerHub(g, x, y, z, { size: 8, h, post: T.STEEL, beam: T.STEEL_DARK, brace: 6, plat: 10, platT: T.SHEET_GREY, from: h, step: 999 });
    g.shell(x - 5, y + h + 1, z - 5, 11, 5, 11, T.SHEET_BLUE); g.box(x - 5, y + h + 6, z - 5, 11, 1, 11, T.SHEET_GREY);
    return lv;
  } },
  // A lift tower for the skywalks: a white shaft with glass and landings.
  elevator: { r: 6, icon: '🛗', roof: true, build(g, x, y, z, H) {
    const h = g.int(20, 44);
    return towerHub(g, x, y, z, { size: 6, h, shaft: true, post: T.GLASS, beam: T.SHEET_WHITE, plat: 10, platT: T.CONCRETE_LIGHT, from: 12, step: 12 });
  } },
  // A steel lattice tower with platforms: for catwalks.
  lattice: { r: 5, icon: '🗼', roof: true, build(g, x, y, z, H) {
    const h = Math.min(H - 30 - y, g.int(30, 90));
    return towerHub(g, x, y, z, { size: 6, h, post: T.STEEL_YELLOW, beam: T.STEEL, brace: 5, plat: 8, platT: T.STEEL_DARK, rim: T.STEEL, from: 15, step: 15 });
  } },
  // A cable car pylon with a station platform under a roof at the top.
  pylon: { r: 7, icon: '🚡', build(g, x, y, z, H) {
    const h = Math.min(H - 30 - y, g.int(40, 90));
    const lv = towerHub(g, x, y, z, { size: 8, h, post: T.STEEL_YELLOW, beam: T.STEEL, brace: 6, plat: 14, platT: T.WOOD, from: h, step: 999 });
    g.box(x - 7, y + h + 8, z - 7, 15, 1, 15, T.TILE_WHITE); for (const [a, b] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) g.box(x + a, y + h + 1, z + b, 1, 7, 1, T.WOOD_DARK);
    return lv;
  } },
};

// A free place for a hub of radius r: flat open ground that is no water and no lot of anybody else's, and no street
// unless the hub may stand over one (a station on stilts, a spiral ramp at a crossing), or (if allowed) the middle of
// a low roof. Returns [x, y, z] (y: where the hub stands) or null.
function hubSpot(g, r, roofOk, G, roadOk) {
  const w = g.w;
  const inWater = (x, z) => w.water?.rects.some((q) => x >= q[0] - 2 && x < q[2] + 2 && z >= q[1] - 2 && z < q[3] + 2);
  for (let tries = 0; tries < 160; tries++) {
    const x = g.int(r + 2, w.sx - r - 3), z = g.int(r + 2, w.sz - r - 3);
    let ok = !inWater(x, z) && Math.hypot(x - w.spawn[0], z - w.spawn[2]) > 40, base = -1; // the start stays free
    for (let dz = -r; dz <= r && ok; dz += 2) for (let dx = -r; dx <= r && ok; dx += 2) {
      const cx = x + dx, cz = z + dz;
      if (w.structures[w.footprint[(cx & w.mx) + w.sx * (cz & w.mz)]].major) { ok = false; break; } // lamps and benches may go
      const y = w.heightBelow(cx, cz, w.sy - 1), t = w.get(cx, y - 1, cz);
      if (!isTerrain(t) || (!roadOk && (t === T.ROAD || t === T.ROADLINE)) || t === T.SEA) { ok = false; break; }
      if (base < 0) base = y; else if (Math.abs(y - base) > 1) ok = false;
    }
    if (ok && base >= 0) return [x, base, z];
  }
  if (!roofOk) return null;
  const roofs = w.structures.filter((st) => st.major && !st.link && !st.hub && st.bx1 - st.bx0 > 2 * r + 2 && st.bz1 - st.bz0 > 2 * r + 2 && st.btop - st.by0 > 6 && st.btop - st.by0 < 70);
  for (let tries = 0; tries < 12 && roofs.length; tries++) {
    const st = g.pick(roofs), x = Math.round((st.bx0 + st.bx1) / 2), z = Math.round((st.bz0 + st.bz1) / 2), y = w.heightBelow(x, z, w.sy - 1);
    if (y >= st.btop - 2 && y < G + 80) return [x, y, z];
  }
  return null;
}

// Puts up `n` hubs of one kind; they become nodes of the network like the buildings.
function placeHubs(g, kind, n, S, G) {
  const def = HUBS[kind], w = g.w;
  for (let i = 0; i < n; i++) {
    const at = hubSpot(g, def.r, !!def.roof && g.chance(0.5), G, !!def.road);
    if (!at) continue;
    const st = g.begin('hub', def.icon, { major: false });
    st.hub = kind;
    st.levels = def.build(g, at[0], at[1], at[2], w.sy, S).filter((y) => y > G + 4);
    g.end();
    st.major = true;
  }
}

// Connects the buildings of a world, one network per entry of `specs` ({ style, kinds, count, extra, neon, ... }).
// count: share of the fitting buildings that take part (0..1); extra: chance of a second link per pair beyond the tree.
// hubs: how many hubs of kind `hub` to put up (per 512 x 512 voxels of world); hubs of that kind built by an earlier
// network join in as well. join: styles of earlier networks whose links may be joined (a sky bridge onto a highway).
export function linkUp(g, specs, G) {
  const w = g.w;
  for (const spec of specs) {
    const S = { ...STYLES[spec.style], ...spec };
    if (S.hub && S.hubs) placeHubs(g, S.hub, Math.round(S.hubs * (w.sx / 512) ** 2), S, G);
    const fits = (st) => {
      if (st.hub) return (S.hubKinds ?? [S.hub]).includes(st.hub) && st.levels.length > 0; // hubKinds: other networks' hubs it may use too
      if (st.link) return !!S.join && S.join.includes(st.linkStyle);
      return (S.kinds ? S.kinds.includes(st.kind) : st.major) && st.btop - st.by0 >= S.minH;
    };
    let nodes = w.structures.filter((st) => st.id && st.bx1 >= st.bx0 && fits(st));
    nodes = nodes.sort(() => g.rnd() - 0.5).slice(0, Math.ceil(nodes.length * (S.count ?? 1)));
    const cx = (st) => (st.bx0 + st.bx1) / 2, cz = (st) => (st.bz0 + st.bz1) / 2, pairs = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const d = Math.hypot(cx(nodes[i]) - cx(nodes[j]), cz(nodes[i]) - cz(nodes[j]));
      // Hubs are where a network starts and ends: their pairs come first (as if they were nearer than they are).
      const hub = nodes[i].hub || nodes[j].hub; // a hub may also be joined from close by
      if (d >= S.range[0] * (hub ? 0.35 : 1) && d <= S.range[1] * 1.3) pairs.push([d * (hub ? 0.5 : 1), i, j]);
    }
    pairs.sort((a, b) => a[0] - b[0]);
    const root = nodes.map((_, i) => i), find = (i) => (root[i] === i ? i : (root[i] = find(root[i]))), deg = new Uint8Array(nodes.length);
    let built = 0;
    const limit = S.limit ?? 80;
    const most = (i) => (nodes[i].hub ? 7 : nodes[i].link ? 2 : 4); // hubs are made for branching
    for (const [, i, j] of pairs) { // the spanning tree: nearest pairs first, never two links into one group
      if (built >= limit) break;
      if (find(i) === find(j) || deg[i] >= most(i) || deg[j] >= most(j)) continue;
      if (link(g, nodes[i], nodes[j], S, G)) { root[find(i)] = find(j); deg[i]++; deg[j]++; built++; }
    }
    for (const [, i, j] of pairs) { // and a few loops
      if (built >= limit) break;
      if (deg[i] >= most(i) - 1 || deg[j] >= most(j) - 1 || g.rnd() > (S.extra ?? 0.2)) continue;
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
  if (a.levels && !b.levels) [a, b] = [b, a]; // the building chooses its height first, the hub or link offers the nearest level
  const slope = S.slope * (a.hub || b.hub ? 2.5 : 1); // towards a hub (a ramp, a station) it may climb more steeply
  const w = g.w, ax0 = (a.bx0 + a.bx1) / 2, az0 = (a.bz0 + a.bz1) / 2, bx0 = (b.bx0 + b.bx1) / 2, bz0 = (b.bz0 + b.bz1) / 2;
  let dx = bx0 - ax0, dz = bz0 - az0;
  const D = Math.hypot(dx, dz) || 1;
  dx /= D; dz /= D;
  for (let attempt = 0; attempt < 3; attempt++) {
    const ya = heightOn(g, a, S, G);
    if (ya === null) return false;
    const yb = heightOn(g, b, S, G, ya + (g.rnd() * 2 - 1) * D * slope);
    if (yb === null) return false;
    const pa = attach(w, a, ya, dx, dz), pb = attach(w, b, yb, -dx, -dz);
    if (!pa || !pb) continue;
    const L = Math.hypot(pb[0] - pa[0], pb[1] - pa[1]);
    if (L < Math.max(4, S.range[0] * 0.2) || L > S.range[1] || Math.abs(yb - ya) > L * slope + 2) continue;
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
        // Within the outline of either end anything goes (a hub does not own the columns it shares with a lamp post).
        const mine = own === a.id || own === b.id || [a, b].some((e) => px >= e.bx0 && px <= e.bx1 && pz >= e.bz0 && pz <= e.bz1);
        for (let dy = S.clear[0]; dy <= S.clear[1]; dy++) {
          const v = w.get(px, y + dy, pz);
          if (v && (isTerrain(v) || !mine)) { free = false; break; }
        }
        if (!free) break;
      }
    }
    if (!free) continue;
    // Build it. A link is a structure of its own; it is marked major afterwards, so that it never takes over the
    // footprint of the buildings it touches.
    const st = g.begin('link', S.icon ?? '🌉', { major: false });
    st.link = true; st.linkStyle = S.style; st.levels = [yAt(L / 2)]; // later networks may end on its middle
    st.ends = [a.id, b.id];
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
        const ground = w.get(px, gy, pz), under = w.structures[w.footprint[(px & w.mx) + w.sx * (pz & w.mz)]];
        // On the ground, but not on a street; or on the roof of a building it passes over (which takes the building in).
        const roof = !isTerrain(ground) && under && under.major && !under.link && y - gy > 4;
        if (ground === T.ROAD || ground === T.ROADLINE || (!isTerrain(ground) && !roof)) { nextPier = t + 3; continue; }
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
