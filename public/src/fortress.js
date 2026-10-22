// Fortress Titan, the home turf of the tank: a fortress in the desert that has to be broken into.
// The creature starts on the empty plain in front of it. Small outposts stand out on the sand (enough for the
// first stage); behind a dry moat a great wall with towers runs round the fortress, and inside a second, higher
// wall guards the citadel: a command tower, a giant war machine and the ammunition depot, which goes up in one
// enormous explosion once it is set off (reactions.js). Every gun on a tower or bunker is a turret (world.turrets)
// that fires at the creature as soon as it comes within range (actors.js); a destroyed gun goes up in an explosion.
// The walls, their towers and the gatehouses are fortification, almost three times as hard as concrete, and a
// shield rises above them into the sky (world.ramparts, rampart.js): nothing gets over them, only through.
// There is no police here, and no traffic: soldiers run about instead.

import { T } from './materials.js';
import { line, LOTS } from './landmarks.js';
import { LOTS2 } from './landmarks2.js';
import { LOTS3 } from './landmarks3.js';

const STONE = T.SANDSTONE, DARK = T.CONCRETE_DARK, OLIVE = T.SHEET_GREEN;
const FORT = T.FORT_STONE, ARMOUR = T.FORT_CONCRETE; // the walls, towers and gatehouses

// The layout for a world of size S: centre, half the side of the outer and the inner wall.
export function fortressPlan(S) {
  const c = S >> 1, A = Math.round(S * 0.27), B = Math.round(A * 0.47);
  return { c, A, B, moat: [A + 7, A + 21] };
}

// Height of the ground: dunes on the plain, a dry moat round the outer wall (bridged at the gate), flat inside.
export function fortressHeight(f, x, z, G) {
  const dx = x - f.c, dz = z - f.c, d = Math.max(Math.abs(dx), Math.abs(dz));
  if (d < f.moat[0]) return G;
  if (d < f.moat[1]) return dz > 0 && Math.abs(dx) < 10 && dz > Math.abs(dx) ? G : G - 7; // the causeway to the gate
  const fade = Math.min(1, (d - f.moat[1]) / 40);
  return G + Math.round(fade * (3 + 3 * Math.sin(x * 0.029 + Math.sin(z * 0.013) * 2.2) * Math.cos(z * 0.021 + x * 0.004)));
}

// What the ground is made of: sand outside, concrete and roads inside the walls.
export function fortressGround(f, x, z) {
  const dx = x - f.c, dz = z - f.c, d = Math.max(Math.abs(dx), Math.abs(dz));
  if (d >= f.moat[0]) return d < f.moat[1] ? T.SEABED2 : ((x * 7 + z * 13) ^ (x * z)) & 7 ? T.SAND : T.SEABED2;
  if (Math.abs(dx) < 6 || Math.abs(dz) < 6 || Math.abs(d - f.B - 12) < 4) return T.ROAD; // roads to the gates and round the inner wall
  return ((x >> 2) + (z >> 2)) & 1 ? T.PAVE : T.PAVE2;
}

// A gun on a mount, aimed outwards along (ax, az); its first barrel voxel is what the turret checks (actors.js).
function gun(g, x, y, z, ax, az, rocket = false) {
  g.cyl(x, z, 2, y, 2, T.STEEL_DARK);
  g.box(x - 1, y + 2, z - 1, 3, 2, 3, rocket ? OLIVE : T.STEEL);
  line(g, x + ax, y + 3, z + az, x + ax * 6, y + 4, z + az * 6, T.STEEL_DARK);
  g.w.turrets.push({ x: x + ax, y: y + 3, z: z + az, rocket, cool: g.rnd() * 2 });
}

// A round tower: hollow, floors every ten, battlements, guns on top pointing outwards.
function tower(g, x, z, r, G, h, ax, az, guns = 2) {
  g.begin('tower', '🏯', { major: true });
  g.cyl(x, z, r, G, h, FORT, true); g.cyl(x, z, r - 1, G, h, FORT, true);
  for (let y = 10; y < h; y += 10) g.cyl(x, z, r - 1, G + y, 1, ARMOUR);
  g.cyl(x, z, r + 1, G + h, 1, ARMOUR);
  for (let a = 0; a < 6.283; a += 0.35) g.box(Math.round(x + Math.cos(a) * r), G + h + 1, Math.round(z + Math.sin(a) * r), 1, 2, 1, FORT);
  for (let a = 0.6; a < 6.283; a += 1.2) g.box(Math.round(x + Math.cos(a) * (r + 0.5)), G + Math.round(h * 0.6), Math.round(z + Math.sin(a) * (r + 0.5)), 1, 3, 1, 0); // arrow slits
  for (let k = 0; k < guns; k++) { const s = guns > 1 ? (k ? 1 : -1) : 0; gun(g, x + Math.round(az * s * 4), G + h + 1, z + Math.round(-ax * s * 4), ax, az, k === 1); }
  g.end();
}

// A stretch of wall along x or z with a walkway, battlements on the outer side and buttresses. Down the middle of
// the walkway runs the glowing line from which the shield rises.
function wall(g, x0, z0, len, alongX, G, h, thick, out) {
  g.begin('wall', '🧱', { major: true });
  const box = (a, y, b, l, hh, t, m) => (alongX ? g.box(x0 + a, y, z0 + b, l, hh, t, m) : g.box(x0 + b, y, z0 + a, t, hh, l, m));
  box(0, G, 0, len, h, thick, FORT);
  box(0, G + h - 1, 0, len, 1, thick, ARMOUR);
  box(0, G + h - 1, thick >> 1, len, 1, 1, T.NEON_BLUE);
  const ob = out > 0 ? thick - 1 : 0;
  for (let i = 0; i < len; i += 3) box(i, G + h, ob, 2, 3, 1, FORT); // crenellations
  for (let i = 8; i < len - 4; i += 16) box(i, G, out > 0 ? thick : -3, 4, h - 6, 3, ARMOUR); // buttresses on the outside
  g.end();
}

// The square wall round the centre with half side `a`: towers on the corners and in the middle of each side,
// a gatehouse with a steel gate on the side facing +z.
function ring(g, f, a, G, h, thick, tr) {
  const c = f.c, gw = 18;
  g.w.ramparts.push({ c, a, G, h, thick }); // the shield over this ring (rampart.js)
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower(g, c + sx * a, c + sz * a, tr, G, h + 12, sx, sz); // corner towers aim diagonally outwards
  // north and the two flanks in two halves each, with a tower between; the south side is broken by the gate
  wall(g, c - a + tr, c - a - (thick >> 1), a - tr - 6, true, G, h, thick, -1); wall(g, c + 6, c - a - (thick >> 1), a - tr - 6, true, G, h, thick, -1);
  tower(g, c, c - a, tr - 2, G, h + 8, 0, -1);
  for (const s of [-1, 1]) {
    wall(g, c + s * a - (thick >> 1), c - a + tr, a - tr - 6, false, G, h, thick, s); wall(g, c + s * a - (thick >> 1), c + 6, a - tr - 6, false, G, h, thick, s);
    tower(g, c + s * a, c, tr - 2, G, h + 8, s, 0);
  }
  wall(g, c - a + tr, c + a - (thick >> 1), a - tr - gw, true, G, h, thick, 1); wall(g, c + gw, c + a - (thick >> 1), a - tr - gw, true, G, h, thick, 1);
  g.begin('gate', '🚪', { major: true }); // gatehouse: two bastions, the arch above the passage, a steel gate
  for (const s of [-1, 1]) { g.box(c + s * 13 - 5, G, c + a - 8, 10, h + 10, 16, ARMOUR); gun(g, c + s * 13, G + h + 10, c + a + 4, 0, 1, s > 0); }
  g.box(c - 8, G + 22, c + a - 8, 16, h - 12, 16, FORT);
  g.box(c - 8, G, c + a + 2, 16, 22, 3, T.STEEL_DARK); // the gate, three plates thick: the weak point of the wall
  for (let i = -8; i < 8; i += 2) g.box(c + i, G, c + a + 5, 1, 22, 1, T.STEEL_YELLOW);
  g.end();
}

// Outposts on the plain: a pillbox, a watchtower, or a camp with tents and fuel drums. Each has a gun.
function outpost(g, x, z, G, k) {
  if (k === 0) {
    g.begin('pillbox', '🧱', { major: true });
    for (let y = 0; y < 8; y++) g.cyl(x, z, 8 - (y >> 2), G + y, 1, DARK, y < 6);
    for (let a = 0; a < 6.283; a += 1.05) g.box(Math.round(x + Math.cos(a) * 7), G + 4, Math.round(z + Math.sin(a) * 7), 2, 1, 2, 0); // slits
    for (let a = 0; a < 6.283; a += 0.2) g.box(Math.round(x + Math.cos(a) * 11), G, Math.round(z + Math.sin(a) * 11), 2, 2, 2, T.MUDBRICK); // sandbags
    gun(g, x, G + 8, z, 0, 1);
    g.underpin(); // the dunes are not flat
    g.end();
  } else if (k === 1) {
    g.begin('watchtower', '🗼', { major: true });
    for (const [a, b] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) g.box(x + a, G, z + b, 1, 24, 1, T.WOOD_DARK);
    for (let y = 6; y < 24; y += 6) g.shell(x - 4, G + y, z - 4, 9, 1, 9, T.WOOD);
    g.box(x - 5, G + 24, z - 5, 11, 1, 11, T.WOOD); g.shell(x - 5, G + 25, z - 5, 11, 3, 11, T.WOOD_LIGHT); g.box(x - 5, G + 31, z - 5, 11, 1, 11, T.SHEET_GREY);
    for (const [a, b] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) g.box(x + a, G + 28, z + b, 1, 3, 1, T.WOOD_DARK);
    gun(g, x, G + 25, z, 0, 1);
    g.underpin();
    g.end();
  } else {
    g.begin('camp', '⛺', { major: true });
    for (const s of [-1, 1]) for (let y = 0; y < 6; y++) g.box(x + s * 9 - 5 + y, G + y, z - 6, 10 - 2 * y, 1, 12, T.FABRIC_GREEN);
    for (let i = 0; i < 6; i++) g.cyl(x - 3 + (i % 3) * 3, z + 10 + (i >> 1 & 1) * 3, 1, G, 3, T.BARREL);
    g.box(x + 4, G, z + 9, 4, 3, 4, T.WOOD_LIGHT);
    for (let y = 0; y < 18; y++) g.set(x, G + y, z - 12, T.STEEL); g.set(x, G + 18, z - 12, T.NEON_RED); // radio mast
    gun(g, x, G, z + 4, 0, 1);
    g.underpin();
    g.end();
  }
}

// A cactus on the plain: a column with one or two arms. It can be picked up like a tree.
function cactus(g, x, G, z) {
  g.begin('tree', '🌵', { grabbable: true });
  const h = g.int(6, 11);
  g.box(x, G, z, 2, h, 2, T.LEAF_DARK);
  for (const s of g.chance(0.5) ? [-1, 1] : [1]) { const y = G + g.int(3, h - 3); g.box(s > 0 ? x + 2 : x - 2, y, z, 2, 1, 2, T.LEAF_DARK); g.box(s > 0 ? x + 3 : x - 2, y, z, 1, g.int(3, 5), 2, T.LEAF_DARK); }
  g.end();
}

// Barracks: a long two-storey block with flat roof, windows in rows, sandbags at the door and a flag.
function barracks(g, x0, G, z0, L) {
  g.begin('barracks', '🏚️', { major: true });
  const w = L - 8, d = 18, x = x0 + 4, z = z0 + (L >> 1) - 9;
  for (let f = 0; f < 2; f++) { g.box(x, G + f * 7, z, w, 1, d, DARK); g.shell(x, G + f * 7 + 1, z, w, 6, d, T.CONCRETE_TAN); for (let i = 3; i < w - 3; i += 5) { g.box(x + i, G + f * 7 + 3, z, 2, 2, 1, T.GLASS_DARK); g.box(x + i, G + f * 7 + 3, z + d - 1, 2, 2, 1, T.GLASS_DARK); } }
  g.box(x, G + 14, z, w, 1, d, DARK);
  g.box(x + (w >> 1), G + 15, z + 2, 1, 10, 1, T.STEEL); g.box(x + (w >> 1) + 1, G + 21, z + 2, 6, 4, 1, T.FABRIC_RED);
  for (let i = 0; i < 8; i++) g.box(x + (w >> 1) - 4 + i, G, z + d + 1, 1, 2, 2, T.MUDBRICK);
  g.end();
}

// A giant war machine on display: a tank of some sixty voxels with a turret and a long gun.
function giantTank(g, x, G, z) {
  g.begin('machine', '🪖', { major: true });
  for (const s of [0, 22]) { g.box(x, G, z + s, 56, 8, 8, T.TIRE); for (let i = 3; i < 56; i += 7) g.cyl(x + i, z + s + 4, 3, G + 1, 1, T.STEEL_DARK); } // tracks
  g.box(x + 2, G + 8, z - 1, 52, 9, 32, OLIVE); g.box(x + 40, G + 6, z + 2, 16, 4, 26, OLIVE); // hull
  g.box(x + 14, G + 17, z + 5, 24, 10, 20, OLIVE); g.box(x + 16, G + 27, z + 8, 10, 3, 8, T.STEEL_DARK); // turret and hatch
  for (let i = 0; i < 44; i++) g.box(x + 38 + i, G + 21, z + 13, 1, 3, 3, i > 40 ? T.STEEL_DARK : OLIVE); // gun
  for (let i = 0; i < 4; i++) g.box(x + 6 + i * 4, G + 17, z + 2, 3, 3, 3, T.TANK); // spare fuel on the deck
  g.end();
}

// A giant jet on its stand: fuselage, swept wings, tail fin, cockpit.
function giantJet(g, x, G, z) {
  g.begin('machine', '✈️', { major: true });
  const y = G + 12;
  for (let i = 0; i < 70; i++) { const r = i < 10 ? 2 + (i >> 2) : i > 58 ? 4 : 5; g.cyl(x + i, z, r, y - r, 2 * r, T.SHEET_GREY, true); }
  for (let i = 0; i < 26; i++) { g.box(x + 24 + i, y - 1, z - 28 + i, 18 - (i >> 1), 2, 1, T.SHEET_GREY); g.box(x + 24 + i, y - 1, z + 28 - i, 18 - (i >> 1), 2, 1, T.SHEET_GREY); } // wings
  for (let i = 0; i < 14; i++) g.box(x + 56 + i, y + 4, z, 10 - (i >> 1), 1 + i, 1, T.SHEET_GREY); // fin
  g.box(x + 8, y + 3, z - 2, 10, 3, 5, T.GLASS_DARK);
  for (const s of [-6, 6]) g.box(x + 30, G, z + s, 2, 8, 2, T.STEEL_DARK); g.box(x + 10, G, z, 2, 9, 2, T.STEEL_DARK); // the stand
  for (const s of [-12, 12]) for (let i = 0; i < 4; i++) g.box(x + 34 + i * 2, y - 3, z + s, 1, 2, 1, T.TANK); // missiles under the wings
  g.end();
}

// A giant robot of war, standing guard: legs, a torso with glowing core, cannon arms, a head with red eyes.
function giantRobot(g, x, G, z, H, s) {
  g.begin('machine', '🤖', { major: true });
  const b = (a, y, c, w, h, d, t) => g.box(x + a * s, G + y * s, z + c * s, w * s, h * s, d * s, t);
  b(-6, 0, -3, 4, 3, 6, DARK); b(2, 0, -3, 4, 3, 6, DARK); b(-5, 3, -2, 3, 9, 4, T.STEEL); b(2, 3, -2, 3, 9, 4, T.STEEL); // feet, legs
  b(-7, 12, -4, 14, 12, 8, OLIVE); b(-2, 16, 4, 4, 4, 1, T.NEON_RED); // torso and core
  b(-11, 18, -3, 4, 4, 6, T.STEEL); b(7, 18, -3, 4, 4, 6, T.STEEL); b(-11, 9, -2, 3, 9, 4, T.STEEL_DARK); b(8, 9, -2, 3, 9, 4, T.STEEL_DARK); // shoulders, arms
  b(-11, 7, -2, 3, 2, 10, T.STEEL_DARK); b(8, 7, -2, 3, 2, 10, T.STEEL_DARK); // cannons
  b(-4, 24, -3, 8, 6, 6, T.STEEL); b(-3, 26, 3, 2, 1, 1, T.NEON_RED); b(1, 26, 3, 2, 1, 1, T.NEON_RED); // head, eyes
  g.end();
}

// The ammunition depot: a sunken bunker full of shells and fuel drums behind armoured doors. Its outline goes
// into world.depots: when anything inside explodes, the whole depot goes up (reactions.js).
function depot(g, x, G, z, w, d) {
  g.begin('depot', '💥', { major: true });
  for (let k = 0; k < 3; k++) g.shell(x + k, G, z + k, w - 2 * k, 12, d - 2 * k, DARK);
  g.box(x, G + 12, z, w, 3, d, DARK);
  for (let i = 0; i < w; i += 2) g.box(x + i, G + 12, z - 1, 1, 3, 1, T.STEEL_YELLOW); // hazard stripes
  g.box(x + (w >> 1) - 5, G, z + d - 3, 10, 9, 3, T.STEEL_DARK); for (let i = 0; i < 10; i += 2) g.box(x + (w >> 1) - 5 + i, G + 9, z + d - 3, 1, 1, 3, T.STEEL_YELLOW); // armoured door
  for (let a = 5; a < w - 5; a += 4) for (let c = 5; c < d - 6; c += 5) { // rows of crates and drums
    if (Math.abs(a - (w >> 1)) < 4) continue; // the aisle
    g.box(x + a, G, z + c, 3, 2 + ((a + c) % 3), 3, (a + c) & 1 ? T.TANK : T.BARREL);
  }
  g.end();
  g.w.depots.push({ x0: x, y0: G, z0: z, x1: x + w, y1: G + 15, z1: z + d, blown: false });
}

// The command tower: three tiers of concrete, each narrower, guns on every tier, aerials on top.
function command(g, x, G, z, H, k) {
  g.begin('command', '🏢', { major: true });
  const tiers = [[Math.round(24 * k), 50], [Math.round(18 * k), 45], [Math.round(12 * k), Math.min(45, H - G - 170)]];
  let y = G;
  for (const [r, h] of tiers) {
    if (h < 10) break;
    g.shell(x - r, y, z - r, 2 * r, h, 2 * r, DARK); g.shell(x - r + 1, y, z - r + 1, 2 * r - 2, h, 2 * r - 2, T.CONCRETE_TAN);
    for (let f = 8; f < h; f += 8) { g.box(x - r, y + f, z - r, 2 * r, 1, 2 * r, DARK); for (let i = 3; i < 2 * r - 3; i += 4) { g.box(x - r + i, y + f - 4, z - r, 2, 2, 1, T.GLASS_DARK); g.box(x - r + i, y + f - 4, z + r - 1, 2, 2, 1, T.GLASS_DARK); } }
    y += h;
    g.box(x - r, y, z - r, 2 * r, 1, 2 * r, DARK);
    for (const [ax, az] of [[1, 0], [-1, 0], [0, 1]]) gun(g, x + ax * (r - 3), y + 1, z + az * (r - 3), ax, az, r < 20);
  }
  for (const s of [-3, 3]) { g.box(x + s, y + 1, z, 1, 26, 1, T.STEEL); g.set(x + s, y + 27, z, T.NEON_RED); }
  g.box(x - 4, y + 18, z, 9, 4, 1, T.SHEET_WHITE);
  g.end();
}

export function buildFortress(g, f, G, H, kit) {
  const { c, A, B } = f, w = g.w, S = w.sx;
  w.turrets = []; w.depots = []; w.ramparts = [];
  // Outer wall, inner wall (higher).
  ring(g, f, A, G, 40, 6, 12);
  ring(g, f, B, G, 54, 7, 11);
  // The courtyard between the walls: rows of buildings along all four sides, the giant machines in the corners.
  const L = A - B >= 120 ? 54 : 40, gap = L + 8, r0 = B + 18 + (L >> 1), kinds = ['barracks', 'flak', 'bunker', 'warehouse', 'radar', 'barracks', 'hangar', 'flak', 'fuel', 'bunker'];
  let n = 0;
  for (let r = r0; r + (L >> 1) <= A - 10; r += gap) for (const [ax, az] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    for (let t = -(r0 - L); t <= r0 - L; t += gap) { // every row as long as the first: the corners stay free
      if (Math.abs(t) < L / 2 + 8) continue; // the road to the gate
      const mx = c + ax * r - az * t, mz = c + az * r + ax * t, gx = Math.round(mx - L / 2), gz = Math.round(mz - L / 2), k = kinds[(n++ * 3 + g.int(0, 2)) % kinds.length];
      if (k === 'barracks') barracks(g, gx, G, gz, L);
      else if (k === 'flak') LOTS3.flak(g, gx, G, gz, L);
      else if (k === 'bunker') LOTS3.bunker(g, gx, G, gz, L);
      else if (k === 'fuel') LOTS.tanks(g, gx, G, gz, L, kit);
      else if (k === 'radar') LOTS3.radar(g, gx, G, gz, L, kit, H);
      else if (k === 'hangar') LOTS2.hangar(g, gx, G, gz, L);
      else LOTS.warehouse(g, gx, G, gz, L, kit);
    }
  }
  const corner = Math.round((A + B) / 2);
  if (A - B >= 120) { // the corners of a big fortress: a giant tank, a giant jet, a fuel depot and a hangar
    giantTank(g, c - corner - 28, G, c - corner - 16);
    giantJet(g, c + corner - 35, G, c - corner);
    LOTS.tanks(g, c - corner - 27, G, c + corner - 27, L, kit);
    LOTS2.hangar(g, c + corner - 27, G, c + corner - 27, L);
  }
  // The citadel inside the inner wall (smaller in a small world).
  const k = Math.min(1, B / 90);
  command(g, c - Math.round(B * 0.45), G, c - Math.round(B * 0.4), H, k);
  depot(g, c - Math.round(B * 0.1), G, c + Math.round(B * 0.15), Math.round(B * 0.85), Math.round(B * 0.6));
  giantRobot(g, c + Math.round(B * 0.55), G, c - Math.round(B * 0.5), H, Math.max(2, Math.min(4, Math.floor(B / 25))));
  // Outposts on the plain: half of them on the way from the start to the gate, the rest anywhere outside the moat.
  const near = Math.max(8, Math.round(S / 100));
  for (let i = 0, tries = 0; i < near && tries < 300; tries++) {
    const ahead = i < near / 2, x = ahead ? Math.round(c + (g.rnd() - 0.5) * A * 1.6) : g.int(0, S - 1);
    const z = ahead ? Math.round(c + f.moat[1] + 30 + g.rnd() * Math.max(10, f.spawnZ - c - f.moat[1] - 70)) : g.int(0, S - 1);
    if (Math.hypot(x - c, z - f.spawnZ) < 45 || Math.max(Math.abs(x - c), Math.abs(z - c)) < f.moat[1] + 20) continue;
    outpost(g, x, z, f.height(x, z), i % 3);
    i++;
  }
  for (let i = 0; i < S / 12; i++) {
    const x = g.int(0, S - 1), z = g.int(0, S - 1);
    if (Math.max(Math.abs(x - c), Math.abs(z - c)) < f.moat[1] + 10 || Math.hypot(x - c, z - f.spawnZ) < 20) continue;
    cactus(g, x, f.height(x, z), z);
  }
}
