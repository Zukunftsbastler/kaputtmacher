// The player's creature: a jointed voxel model that changes shape with every power stage,
// its body language (walking, breathing, looking, jumping) and the controller that moves it through the world.
// Attack animations are layered on top by tools.js.

import { meshVolume } from './mesher.js';
import { clamp, wrapDelta, m4 } from './math.js';
import { GRAVITY, launch } from './particles.js';
import { TYPE_FLAGS, F_TERRAIN } from './materials.js';

export const SPECIES = [
  { id: 'dino', icon: '🦖', skin: [0x4caf50, 0x2a9d4a], belly: 0xdce775, dark: 0xf57c00 },
  { id: 'gorilla', icon: '🦍', skin: [0x5d5d66, 0x26262c], belly: 0xb8956a, dark: 0x1a1a1e },
  { id: 'robot', icon: '🤖', skin: [0x6f9fd8, 0x3d4f7a], belly: 0xcfd8dc, dark: 0x263238 },
  { id: 'tank', icon: '🪖', skin: [0x7c8f45, 0x55662e], belly: 0x9aa860, dark: 0x2b2f25, tracked: true },
  // gain: what the aircraft destroys counts for less, most of all while it is small. It is fast, never has to walk
  // anywhere and bombs from above: measured with full value it earned seven to forty times as much as the dino on
  // stages 1 to 3 and raced through them. With this curve it stays ahead on the early stages (about three times) and level later.
  // The excavator: tracks, an upper carriage that turns all the way round, and a boom with stick and bucket.
  // It neither climbs nor shoots: it digs, swings, breaks and pushes.
  { id: 'digger', icon: '🚜', skin: [0xf2b632, 0xd8921c], belly: 0x9fd3ea, dark: 0x2b2b2b, tracked: true },
  { id: 'jet', icon: '✈️', skin: [0xdfe4e8, 0xa9b4bd], belly: 0x3f7fc0, dark: 0x2d3436, gain: (stage) => Math.min(0.9, 0.054 * 1.75 ** (stage - 1)) },
  // The helicopter: hovers where it is let go, slides in every direction, rises while the jump button is held.
  // It flies over what stands in the way and fires rockets from stage 3, so up to stage 4 what it destroys counts for a little less (measured, see NEED).
  { id: 'chopper', icon: '🚁', skin: [0xe53935, 0xc62828], belly: 0x9fd3ea, dark: 0x263238, gain: (stage) => Math.min(1, 0.5 + 0.15 * (stage - 1)) },
  // The giant tentacle: no eyes, no face, all body language. Warm coral with a pink touch, a dark burnt orange-red back
  // and a pale peach underside with round suckers. It never walks: it travels under the ground and reaches out from where it surfaces.
  { id: 'tentacle', icon: '🐙', skin: [0xff8462, 0xff7656], belly: 0xffc6b4, dark: 0xc23f20 },
];
// Creatures on tracks (tank, excavator): no jumping but a hop, no climbing, no swimming, an upper part that turns all round.
export const tracked = (species) => species === 'tank' || species === 'digger';
// Creatures that are always in the air (aircraft, helicopter): no jumping, climbing or stomping, attacks at any time.
export const airborne = (species) => species === 'jet' || species === 'chopper';
// The tentacle is a chain of segments from the root in the ground to the tip.
export const SEGS = 14, SEG_LEN = 4.6;

// Height factor per stage, relative to a stage-1 monster. Grows without limit.
const SCALE = [1, 1.6, 2.6, 3.8, 6, 9, 14, 20, 30];
export const stageScale = (s) => (s <= 9 ? SCALE[s - 1] : 30 * 1.25 ** (s - 9));
// Power needed to leave a stage. Stage N is meant to take N minutes: one minute for the first, two for the second,
// and so on. The game never lets it go faster (PACE in main.js: the bar fills from a reserve at most that quickly),
// and these thresholds are set so that steady destruction reaches that pace on most creatures.
// Measured income while the game plays itself in the skyscraper city, in power per second (dino / gorilla / robot / tank / jet):
// stage 1: 6 / - / 6 / 56 / 13, stage 2: 28 / 12 / 25 / 38 / 107, stage 3: 52 / 46 / 225 / 644 / 254,
// stage 4: 136 / 95 / 1 100 / 5 300 / 320, stage 5: 5 700 / 2 900 / 4 100 / 6 800 / 5 800, stage 6: 11 000 / 8 700 / - / 14 000 / 9 300,
// stage 7: 14 600 / 6 200 / - / 8 800 / 7 700, stage 8: 37 000 / 11 600 / 21 000 / 15 000 / 21 500.
// The slowest creature on a stage takes up to about half as long again. Checked over seven minutes of self-play from stage 1
// (seconds for stages 1, 2, 3): dino 62, 120, 184; tank 74, 120, 180; gorilla 123, 215; robot 71, 288 (with 330 and 2 200 then;
// both lowered since, for the gorilla and the robot).
// Helicopter (with its gain) / tentacle, measured later in the same way: stage 1: 9-16 / 9, 2: 22-48 / 37, 3: 135 / 24, 4: 10 300 / 7 900,
// 5: 10 500 / 12 200, 6: 11 100 / 16 400, 7: 14 500 / 39 900, 8: 26 000 / 27 100 (chain reactions make single runs scatter widely).
// Measure again with: node tools/browser.mjs x "world=skyline&species=dino&stage=N&idle=1&run=50000" income 53000
const NEED = [280, 1600, 8500, 25000, 850000, 2800000, 3200000, 5600000];
export const stageNeed = (s) => (s <= 8 ? NEED[s - 1] : 5600000 * 1.6 ** (s - 8));

export const MODEL_HEIGHT = 28;
// Jumping works like in a classic platformer: hold the button for the full height, tap for a hop,
// rise fast, fall faster, steer freely in the air.
const JUMP_HEIGHT = 3.2; // apex of a full jump in monster heights
const JUMP_CUT = 3; // extra gravity while rising with the button released
const FALL_GRAVITY = 1.7; // extra gravity on the way down
const SPRINT = 1.75;
const AIR_SPEED = 2; // a jump with a direction carries: horizontal speed in the air, relative to walking
const AIR_FLOOR = 12, AIR_FLOOR2 = 21; // least horizontal speed of a first and of a second jump, in world units per second
const AIR_SPEED2 = 3.4; // the same after the second jump: a double jump clears a street with room to spare
const TANK_HOP = 0.7; // the tank only hops, in its own heights: enough to climb out of a crater it has dug
const JUMP2_HEIGHT = 2.4; // extra height of the second jump in mid-air, in monster heights
const FLIP_TIME = 0.55; // seconds the somersault of the second jump takes
// Ground pound, as in classic platformers: third press near the top of the double jump.
const POUND_HANG = 0.2; // seconds the creature hangs and curls up before it drops
const POUND_SPEED = 2.4; // drop speed, in launch speeds of the first jump
const POUND_STUN = 0.3; // seconds it stays crouched in its crater afterwards
const POUND_CHAIN = 8; // how many floors in a row it may smash through

const C = { SKIN: 1, BELLY: 2, DARK: 3, WHITE: 4, EYE: 5, TEETH: 6, ARMOR: 7, GLOW: 8, RED: 9, BLUE: 10, PINK: 11, GOLD: 12, INK: 13, MUD: 14, SOIL: 15, VIOLET: 16, ORANGE: 17, EARTH: 18, BUBBLE: 19, OUTLINE: 20, PAPER: 21 };
const SEG_NAMES = Array.from({ length: SEGS }, (_, i) => 'seg' + i);
// The tentacle's emoticons, drawn the way manga draw feelings: marks with a heavy ink outline (the throbbing vein of
// anger, the big drop of sweat, the snot bubble of sleep, the spiral of dizziness, sparkles), and sound effects
// written in katakana, staggered like the lettering in a comic (ゴゴゴ, ドン!, ズズズ). They pop up above the tip.
// Rows from the top; R red, B blue, P pink, G gold, K ink, W white, V violet, A orange, U earth brown, L bubble blue.
// out: the colour of the outline drawn round every mark (O = ink black), anim: how it moves (main.js), size: scale.
const KANA = {
  go: ['......#.#', '.....#.#.', '#######..', '#######..', '.....##..', '.....##..', '.....##..', '#######..', '#######..'],
  do: ['......#.#', '##...#.#.', '##.......', '##.......', '#####....', '##.###...', '##...##..', '##.......', '##.......'],
  zu: ['......#.#', '.....#.#.', '######...', '######...', '....##...', '...##....', '..#####..', '.##...##.', '##.....##'],
  n: ['.........', '##.......', '.##....##', '......##.', '.....##..', '....##...', '..###....', '###......', '.........'],
  bang: ['##', '##', '##', '##', '##', '..', '##', '##', '..'],
};
// A word in katakana: the signs side by side, each a little higher than the one before.
const word = (signs, c) => {
  const n = signs.length, h = 9 + n - 1, rows = Array.from({ length: h }, () => '');
  signs.forEach((sg, k) => { const g = KANA[sg], off = n - 1 - k; for (let r = 0; r < h; r++) rows[r] += (g[r - off] ?? '.'.repeat(g[0].length)).replaceAll('#', c) + '.'; });
  return rows;
};
const EMOTES = {
  alert: { out: 'O', anim: 'pop', rows: ['W.........W', '.W..RRR..W.', '....RRR....', '....RRR....', '....RRR....', '.....R.....', '...........', '....RRR....', '.W..RRR..W.', 'W.........W'] },
  heart: { out: 'O', anim: 'pop', rows: ['........PP.PP', '.......PPPPPP', '........PPPP.', '.PP...PP.PP..', 'PWPP.PPPP....', 'PWPPPPPPP....', 'PPPPPPPPP....', '.PPPPPPP.....', '..PPPPP......', '...PPP.......', '....P........'] },
  star: { out: 'O', anim: 'twinkle', rows: ['....G.......', '....G.......', '...GWG......', 'GGGWWWGGG...', '...GWG....W.', '....G....WWW', '....G.....W.', '............', '.......G....', '......GWG...', '.......G....'] },
  anger: { out: 'O', anim: 'throb', rows: ['.RR.....RR.', 'RRR.....RRR', '..RR...RR..', '...R...R...', '...........', '...R...R...', '..RR...RR..', 'RRR.....RRR', '.RR.....RR.'] },
  sweat: { out: 'O', anim: 'slide', rows: ['....B....', '...BB....', '...BBB...', '..BBBBB..', '.BWBBBBB.', '.BWWBBBB.', '.BBWBBBB.', '..BBBBB..', '...BBB...'] },
  note: { out: 'W', anim: 'sway', rows: ['....KK...', '....KKK..', '....K.KK.', '....K..K.', '....K....', '..KKK....', '.KKKK....', '.KKKK....', '..KK.....'] },
  sleep: { out: 'O', anim: 'bubble', rows: ['...LLLLL...', '..LLLLLLL..', '.LLWWLLLLL.', '.LLWLLLLLL.', '.LLLLLLLLL.', '.LLLLLLLLL.', '..LLLLLLL..', '...LLLLL...'] },
  dizzy: { out: null, anim: 'spin', rows: ['G.KKKKKK..', '.K......K.', '.K.KKKK.K.', '.K.K..K.K.', '.K.K.KK.K.', '.K.K....K.', '.K.KKKKKK.', '.K........', '..KKKKKKKG'] },
  menace: { out: 'O', anim: 'shake', size: 0.7, rows: word(['go', 'go', 'go'], 'V') },
  boom: { out: 'O', anim: 'shake', size: 0.7, rows: word(['do', 'n', 'bang'], 'A') },
  rumble: { out: 'W', anim: 'shake', size: 0.65, rows: word(['zu', 'zu', 'zu'], 'U') },
};
export const EMOTE_LOOK = Object.fromEntries(Object.entries(EMOTES).map(([id, e]) => [id, { anim: e.anim, size: e.size ?? 1 }]));
// Draws a ring of outline round every filled pixel of an emoticon (the eight neighbours that are empty).
function outlined(rows, out) {
  const h = rows.length, w = Math.max(...rows.map((r) => r.length)) + 2, grid = Array.from({ length: h + 2 }, (_, y) => Array.from({ length: w }, (_, x) => (rows[y - 1]?.[x - 1] ?? '.')));
  if (!out) return grid;
  for (let y = 0; y < h + 2; y++) for (let x = 0; x < w; x++) {
    if (grid[y][x] !== '.') continue;
    for (let dy = -1; dy <= 1 && grid[y][x] === '.'; dy++) for (let dx = -1; dx <= 1; dx++) { const c = grid[y + dy]?.[x + dx]; if (c && c !== '.' && c !== '_') { grid[y][x] = '_'; break; } }
  }
  for (const r of grid) for (let x = 0; x < w; x++) if (r[x] === '_') r[x] = out + '*'; // marked as outline: drawn a little behind the mark
  return grid;
}
export const EMOTE_IDS = Object.keys(EMOTES);
// Every joint has three rotations (x, y, z) and an offset (x, y, z) in model units.
export const JOINTS = ['torso', 'head', 'jaw', 'armL', 'armR', 'legL', 'legR', 'tail', 'tail2', 'turret', 'barrel', 'pods', 'bay', 'rack', 'boom', 'stick', 'bucket', 'breaker',
  'rotor', 'rotor2', 'trotor', 'winch', 'mound', ...SEG_NAMES];
// Gear that depends on the selected move: only the matching part is drawn (main.js). The aircraft carries one
// piece under its belly (turret and rocket launcher turn towards the aim point; the aircraft always flies nose
// first); the excavator has a bucket on its stick, or a hydraulic breaker for the hammer.
export const GEAR = {
  jet: { guns: 'turret', rockets: 'pods', carpet: 'bay', heavy: 'rack' },
  digger: { scoop: 'bucket', hammer: 'breaker', swing: 'bucket', load: 'bucket' },
  chopper: { guns: 'turret', rockets: 'pods', winch: 'winch', rotor: '' },
};

function palette(sp, stage) {
  const p = new Uint8Array(1024), t = clamp((stage - 1) / 8, 0, 1);
  const put = (i, rgb, em = 0) => p.set([rgb[0], rgb[1], rgb[2], em], i * 4);
  const hex = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];
  // The skin darkens from the first to the second colour as the monster grows.
  const s0 = hex(sp.skin[0]), s1 = hex(sp.skin[1]);
  put(C.SKIN, s0.map((v, i) => Math.round(v * (1 - t) + s1[i] * t)));
  put(C.BELLY, hex(sp.belly));
  put(C.DARK, hex(sp.dark));
  put(C.WHITE, [250, 250, 250]);
  put(C.EYE, stage >= 5 ? [255, 60, 30] : [20, 20, 20], stage >= 5 ? 255 : 0);
  if (sp.id === 'robot') put(C.EYE, stage >= 5 ? [255, 60, 30] : [80, 230, 255], 230);
  if (sp.id === 'digger') { put(C.EYE, [255, 238, 190], 210); put(C.ARMOR, [62, 64, 70]); put(C.WHITE, [205, 210, 215]); } // headlights, steel, chrome
  put(C.TEETH, [255, 255, 240]);
  put(C.ARMOR, [70, 74, 86]);
  put(C.GLOW, stage >= 8 ? [255, 140, 30] : [255, 210, 60], 230);
  if (sp.id === 'chopper') { put(C.EYE, [255, 245, 200], 220); put(C.ARMOR, [96, 104, 112]); } // searchlight, metal
  if (sp.id === 'tentacle') {
    // A faint glow of its own keeps the coral warm and bright in the shade (unlit, it reads as brick red).
    const sk = p.slice(C.SKIN * 4, C.SKIN * 4 + 3);
    put(C.SKIN, sk, 70); put(C.BELLY, hex(sp.belly), 60); put(C.DARK, hex(sp.dark), 35);
    put(C.WHITE, [255, 214, 200], 60); put(C.TEETH, [236, 146, 132], 40); // the rim and the hollow of a sucker
    put(C.GLOW, [255, 170, 120], 200); // spots that glow on the back of a big tentacle
    put(C.MUD, [124, 96, 66]); put(C.SOIL, [150, 120, 86]);
  }
  // Emoticon colours, slightly glowing so that they read at any light.
  put(C.RED, [235, 45, 45], 110); put(C.BLUE, [90, 175, 255], 110); put(C.PINK, [255, 95, 150], 110); put(C.GOLD, [255, 212, 60], 120); put(C.INK, [34, 28, 44], 30);
  put(C.VIOLET, [130, 60, 190], 110); put(C.ORANGE, [255, 140, 30], 120); put(C.EARTH, [120, 84, 50], 60); put(C.BUBBLE, [170, 225, 255], 140); put(C.OUTLINE, [18, 16, 22], 0); put(C.PAPER, [255, 255, 255], 200);
  return p;
}

// Returns { parts: [{ name, data, quads, chain }], pivots, species, stage }.
// Boxes are [x0,y0,z0,x1,y1,z1,colour], end exclusive; the model looks along +z and stands on y = 0.
export function buildModel(speciesId, stage) {
  const sp = SPECIES.find((s) => s.id === speciesId) ?? SPECIES[0];
  const P = {}, pivots = {}, parents = {};
  const part = (name, pivot, parent = null) => { P[name] = []; pivots[name] = pivot; parents[name] = parent; };
  const b = (name, x0, y0, z0, x1, y1, z1, c) => P[name].push([x0, y0, z0, x1, y1, z1, c]);
  // Adds a box to the right part and its mirror image to the left part.
  const pair = (name, x0, y0, z0, x1, y1, z1, c) => { b(name + 'R', x0, y0, z0, x1, y1, z1, c); b(name + 'L', -x1, y0, z0, -x0, y1, z1, c); };
  const spikes = Math.min(7, stage - 1), spikeH = 2 + Math.floor(stage / 3);

  if (sp.id === 'jet') {
    // An aircraft: one rigid part that banks and pitches as a whole. It never lands.
    part('torso', [0, 6, 0]);
    b('torso', -2, 4, -18, 2, 8, 15, C.SKIN); b('torso', -1, 5, 15, 1, 7, 21, C.DARK); b('torso', -1, 8, 5, 1, 10, 12, C.BELLY);
    b('torso', -19, 5, -5, 19, 6, 4, C.SKIN); b('torso', -19, 5, -5, -16, 6, 4, C.BELLY); b('torso', 16, 5, -5, 19, 6, 4, C.BELLY);
    b('torso', -8, 5, -19, 8, 6, -14, C.SKIN); b('torso', 0, 8, -19, 1, 14, -13, C.BELLY); b('torso', 0, 8, -13, 1, 11, -10, C.BELLY);
    for (const x of [-8, 5]) { b('torso', x, 2, -8, x + 3, 5, 3, C.ARMOR); b('torso', x, 2, -9, x + 3, 5, -8, C.GLOW); b('torso', x, 2, 3, x + 3, 5, 4, C.DARK); }
    if (stage >= 3) for (const x of [-14, -11, 11, 14]) { b('torso', x, 3, -3, x + 1, 5, 4, C.DARK); b('torso', x, 3, 4, x + 1, 5, 5, C.EYE); }
    if (stage >= 5) { b('torso', -13, 2, -9, -10, 5, 1, C.ARMOR); b('torso', 10, 2, -9, 13, 5, 1, C.ARMOR); b('torso', -13, 2, -10, -10, 5, -9, C.GLOW); b('torso', 10, 2, -10, 13, 5, -9, C.GLOW); }
    if (stage >= 7) { b('torso', -19, 6, -5, -18, 9, 4, C.BELLY); b('torso', 18, 6, -5, 19, 9, 4, C.BELLY); b('torso', -3, 3, -16, 3, 4, 10, C.ARMOR); }
    if (stage >= 8) { b('torso', -19, 6, 3, 19, 7, 4, C.GLOW); }
    // Gear under the belly, one piece per weapon (see GEAR); only the selected one is drawn.
    part('turret', [0, 3, 4], 'torso'); part('barrel', [0, 2.5, 5], 'turret'); part('pods', [0, 3, 0], 'torso'); part('bay', [0, 3, 0], 'torso'); part('rack', [0, 3, 0], 'torso');
    b('turret', -2, 1, 2, 2, 4, 6, C.ARMOR); b('turret', -1, 0, 3, 1, 1, 5, C.DARK);
    b('barrel', -2, 2, 6, -1, 3, 12, C.DARK); b('barrel', 1, 2, 6, 2, 3, 12, C.DARK); b('barrel', -2, 2, 12, -1, 3, 13, C.EYE); b('barrel', 1, 2, 12, 2, 3, 13, C.EYE);
    b('pods', -4, 2, -1, 4, 3, 2, C.ARMOR); b('pods', -1, 3, -1, 1, 4, 2, C.ARMOR);
    for (const x of [-7, 4]) { b('pods', x, 1, -4, x + 3, 4, 4, C.DARK); b('pods', x, 1, 4, x + 3, 4, 5, C.EYE); }
    for (const z of [-10, -4, 2]) { b('bay', -1, 1, z, 1, 3, z + 5, C.DARK); b('bay', -1, 1, z + 4, 1, 3, z + 5, C.GLOW); b('bay', -2, 2, z, 2, 3, z + 1, C.ARMOR); }
    for (const x of [-4, 1]) { b('rack', x, 0, -7, x + 3, 3, 6, C.GLOW); b('rack', x, 0, -3, x + 3, 3, -2, C.DARK); b('rack', x, 0, 2, x + 3, 3, 3, C.DARK); b('rack', x + 1, 1, 6, x + 2, 2, 8, C.DARK); }
  } else if (sp.id === 'chopper') {
    // A rescue helicopter turned troublemaker: cabin with a big windscreen, skids, a tail boom with the tail rotor,
    // the gun under its nose and a winch under its belly. From stage 5 a transport helicopter with two rotors in a row
    // (and no tail rotor), from stage 7 armoured, with stub wings and rocket pods.
    const big = stage >= 5;
    part('torso', [0, 10, 0]); part('rotor', [0, 18, big ? 8 : 0], 'torso');
    part('turret', [0, 3, 11], 'torso'); part('barrel', [0, 2.5, 12], 'turret'); part('winch', [0, 3, 0], 'torso');
    b('torso', -5, 4, -6, 5, 14, 10, C.SKIN); b('torso', -4, 4, 10, 4, 12, 14, C.SKIN); b('torso', -3, 5, 14, 3, 10, 16, C.SKIN); // cabin and nose
    b('torso', -4, 8, 11, 4, 13, 15, C.BELLY); b('torso', -3, 9, 15, 3, 11, 16, C.BELLY); // windscreen
    b('torso', -6, 9, 2, -5, 12, 9, C.BELLY); b('torso', 5, 9, 2, 6, 12, 9, C.BELLY); // side windows
    b('torso', -6, 6, -6, 6, 7, 10, C.WHITE); // the white band round the cabin
    b('torso', -3, 14, -5, 3, 17, 4, C.ARMOR); b('torso', -1, 17, -1 + (big ? 8 : 0), 1, 18, 1 + (big ? 8 : 0), C.DARK); // engine and mast
    for (const x of [-7, 5]) { b('torso', x, 0, -6, x + 2, 1, 12, C.DARK); b('torso', x, 1, -3, x + 2, 4, -2, C.DARK); b('torso', x, 1, 6, x + 2, 4, 7, C.DARK); b('torso', x, 0, 12, x + 2, 2, 13, C.DARK); } // skids
    b('torso', -2, 3, 12, 2, 4, 14, C.EYE); // searchlight
    b('turret', -2, 1, 9, 2, 4, 13, C.ARMOR); b('barrel', -1, 2, 12, 1, 3, 19, C.DARK); b('barrel', -1, 2, 19, 1, 3, 20, C.EYE);
    b('winch', -2, 2, -2, 2, 4, 2, C.ARMOR); b('winch', -1, 1, -1, 1, 2, 1, C.DARK);
    // Rocket pods on short pylons at the sides, shown while the rockets are chosen.
    part('pods', [0, 6, 2], 'torso');
    for (const x of [-10, 7]) { b('pods', x < 0 ? -7 : 5, 6, 0, x < 0 ? -5 : 7, 7, 3, C.DARK); b('pods', x, 4, -2, x + 3, 7, 7, C.ARMOR); b('pods', x, 4, 7, x + 3, 7, 8, C.EYE); }
    // Rotor blades: four of them, long and thin.
    const rz = big ? 8 : 0, R = big ? 18 : 21;
    b('rotor', -2, 18, rz - 2, 2, 19, rz + 2, C.DARK); b('rotor', -R, 18, rz - 1, R, 19, rz + 1, C.DARK); b('rotor', -1, 18, rz - R, 1, 19, rz + R, C.DARK);
    b('rotor', R - 3, 18, rz - 1, R, 19, rz + 1, C.WHITE); b('rotor', -R, 18, rz - 1, -R + 3, 19, rz + 1, C.WHITE); // white tips
    if (big) {
      // Transport helicopter: a long body right to the back, the second rotor high on a pylon above the tail.
      part('rotor2', [0, 22, -22], 'torso');
      b('torso', -5, 4, -26, 5, 14, -6, C.SKIN); b('torso', -6, 6, -26, 6, 7, -6, C.WHITE); b('torso', -6, 9, -22, -5, 12, -8, C.BELLY); b('torso', 5, 9, -22, 6, 12, -8, C.BELLY);
      b('torso', -3, 14, -27, 3, 21, -18, C.SKIN); b('torso', -1, 21, -23, 1, 22, -21, C.DARK);
      b('torso', -4, 2, -24, 4, 4, -16, C.DARK); // the loading ramp
      b('rotor2', -2, 22, -24, 2, 23, -20, C.DARK); b('rotor2', -R, 22, -23, R, 23, -21, C.DARK); b('rotor2', -1, 22, -22 - R, 1, 23, -22 + R, C.DARK);
      b('rotor2', R - 3, 22, -23, R, 23, -21, C.WHITE); b('rotor2', -R, 22, -23, -R + 3, 23, -21, C.WHITE);
    } else {
      part('trotor', [1.5, 18, -25], 'torso');
      b('torso', -1, 10, -27, 1, 13, -6, C.SKIN); b('torso', -1, 10, -27, 1, 13, -24, C.WHITE); // tail boom
      b('torso', 0, 13, -27, 1, 21, -23, C.SKIN); b('torso', 0, 19, -27, 1, 21, -24, C.DARK); // fin
      b('torso', -5, 11, -21, 5, 12, -19, C.SKIN); // stabiliser
      b('trotor', 1, 15, -26, 2, 21, -24, C.DARK); b('trotor', 1, 17, -28, 2, 19, -22, C.DARK);
    }
    if (stage >= 3) { b('torso', -6, 5, -4, -5, 12, 1, C.DARK); b('torso', 5, 5, -4, 6, 12, 1, C.DARK); } // sliding doors
    if (stage >= 7) { // stub wings with rocket pods, armour plates
      b('torso', -11, 7, -2, 11, 8, 4, C.ARMOR);
      for (const x of [-12, 9]) { b('torso', x, 4, -3, x + 3, 7, 6, C.ARMOR); b('torso', x, 4, 6, x + 3, 7, 7, C.EYE); }
      b('torso', -6, 4, -6, 6, 5, 10, C.ARMOR);
    }
    if (stage >= 8) { b('torso', -6, 13, -6, -5, 14, 10, C.GLOW); b('torso', 5, 13, -6, 6, 14, 10, C.GLOW); }
  } else if (sp.id === 'tentacle') {
    // A chain of segments standing on its root, getting thinner towards the tip. Each segment is a rounded block:
    // coral all round, the back (-z) darker, the inner side (+z, towards what it reaches for) pale, with a round sucker.
    // No eyes, no mouth: the tentacle speaks with its body and with the emoticons above its tip.
    part('mound', [0, 0, 0]);
    for (let i = 0; i < SEGS; i++) {
      const n = SEG_NAMES[i], y0 = Math.round(i * SEG_LEN), y1 = Math.round((i + 1) * SEG_LEN) + (i < SEGS - 1 ? 1 : 0);
      const r = Math.max(1, Math.round(6.4 - 4.9 * (i / (SEGS - 1)) ** 0.85)), back = -Math.max(0, Math.round(r * 0.35));
      part(n, [0, Math.round(i * SEG_LEN), 0], i ? SEG_NAMES[i - 1] : null);
      if (r === 1) { b(n, -1, y0, -1, 1, y1, 1, C.SKIN); b(n, -1, y0, -1, 1, y1, 0, C.DARK); continue; }
      b(n, -r, y0, -r + 1, r, y1, r - 1, C.SKIN); b(n, -r + 1, y0, -r, r - 1, y1, r, C.SKIN);
      // The dark back: a broad band down the middle of the back, coral at the flanks, so that the arm keeps its warm colour
      // seen from behind as well and the band shows how it bends and turns.
      const bw = Math.max(1, r - 2);
      b(n, -bw, y0, -r, bw, y1, back, C.DARK); b(n, -r + 1, y0, -r, r - 1, y1, -r + 1, C.DARK);
      b(n, -r + 2, y0, r - 1, r - 2, y1, r, C.BELLY); // the pale inner side
      // Suckers: round discs standing out from the inner side, two in a row on a big tentacle.
      const s = Math.max(1, Math.round(r * 0.42)), ym = Math.round((y0 + y1 - 1) / 2), cols = stage >= 4 && r >= 4 ? [-s - 0.5, s + 0.5] : [0];
      for (const cx of cols) {
        const x0 = Math.round(cx - s), x1 = Math.round(cx + s);
        b(n, x0 + 1, ym - s, r, x1 - 1, ym + s + 1, r + 1, C.WHITE); b(n, x0, ym - s + 1, r, x1, ym + s, r + 1, C.WHITE);
        if (s >= 2) b(n, x0 + 1, ym - s + 1, r, x1 - 1, ym + s, r + 1, C.TEETH);
      }
      if (stage >= 6 && i > 1 && i < SEGS - 3) b(n, -1, y0, -r - Math.max(1, Math.round(r * 0.4)), 1, y1, -r, C.DARK); // a fin along the back
      if (stage >= 8 && i % 2) { b(n, -r + 1, ym, -r - 1, -r + 2, ym + 1, -r, C.GLOW); b(n, r - 2, ym + 1, -r - 1, r - 1, ym + 2, -r, C.GLOW); } // glowing spots
    }
    // Torn-up ground around the root (and, while it travels below, the bulge of earth that moves along).
    b('mound', -9, 0, -9, 9, 1, 9, C.MUD); b('mound', -7, 1, -7, 7, 2, 7, C.SOIL); b('mound', -5, 2, -5, 5, 3, 5, C.MUD);
    for (const [x, z] of [[-10, -2], [8, -4], [-3, 9], [5, 8], [-8, 6], [2, -10]]) b('mound', x, 0, z, x + 2, 2, z + 2, C.SOIL);
    // The emoticons, each a part of its own centred on its pivot.
    const col = { R: C.RED, B: C.BLUE, P: C.PINK, G: C.GOLD, K: C.INK, W: C.PAPER, V: C.VIOLET, A: C.ORANGE, U: C.EARTH, L: C.BUBBLE, O: C.OUTLINE };
    for (const [id, e] of Object.entries(EMOTES)) {
      const n = 'emo_' + id, grid = outlined(e.rows, e.out), h = grid.length, w = grid[0].length, ox = Math.floor(w / 2), oy = Math.floor(h / 2);
      part(n, [0, 0, 0]);
      grid.forEach((row, k) => row.forEach((ch, x) => {
        const c = col[ch[0]], y = h - 1 - k - oy;
        if (c) b(n, x - ox, y, ch[1] === '*' ? 0 : 1, x - ox + 1, y + 1, ch[1] === '*' ? 1 : 3, c); // the outline one step behind the mark
      }));
    }
  } else if (sp.id === 'tank') {
    part('torso', [0, 6, 0]); part('turret', [0, 12, -1], 'torso'); part('barrel', [0, 13, 5], 'turret');
    b('torso', -8, 3, -12, 8, 10, 12, C.SKIN); b('torso', -8, 6, 12, 8, 9, 14, C.SKIN); b('torso', -6, 10, -11, 6, 11, 9, C.BELLY);
    for (const s of [-1, 1]) {
      b('torso', s < 0 ? -11 : 8, 0, -13, s < 0 ? -8 : 11, 7, 13, C.DARK);
      for (let z = -11; z < 12; z += 5) b('torso', s < 0 ? -12 : 11, 1, z, s < 0 ? -11 : 12, 5, z + 3, C.ARMOR);
    }
    b('torso', -3, 5, -14, -1, 8, -12, C.ARMOR); b('torso', 1, 5, -14, 3, 8, -12, C.ARMOR);
    b('turret', -6, 10, -7, 6, 16, 5, C.SKIN); b('turret', -5, 16, -6, 5, 17, 4, C.BELLY); b('turret', -2, 17, -4, 2, 18, 0, C.DARK);
    b('turret', 4, 17, -5, 5, 24, -4, C.DARK); b('turret', -6, 12, 5, 6, 15, 6, C.ARMOR);
    b('turret', -5, 13, 6, -3, 14, 7, C.EYE);
    if (stage >= 6) { b('barrel', -3, 12, 5, -1, 14, 21, C.DARK); b('barrel', 1, 12, 5, 3, 14, 21, C.DARK); b('barrel', -4, 11, 19, 4, 15, 22, C.ARMOR); }
    else { b('barrel', -1, 12, 5, 1, 14, 22, C.DARK); b('barrel', -2, 11, 20, 2, 15, 23, C.ARMOR); }
    if (stage >= 3) { b('turret', -9, 11, -6, -6, 15, 2, C.ARMOR); b('turret', 6, 11, -6, 9, 15, 2, C.ARMOR); b('turret', -9, 12, 2, -6, 14, 3, C.EYE); b('turret', 6, 12, 2, 9, 14, 3, C.EYE); }
    if (stage >= 4) b('torso', -9, 7, 12, 9, 10, 15, C.ARMOR);
    if (stage >= 8) { b('torso', -8, 10, -12, -7, 11, 12, C.GLOW); b('torso', 7, 10, -12, 8, 11, 12, C.GLOW); }
  } else if (sp.id === 'digger') {
    // Undercarriage with tracks and a dozer blade; the upper carriage turns on its slewing ring; the boom is hinged
    // at the front of it, the stick at the end of the boom, the bucket (or the breaker) at the end of the stick.
    part('torso', [0, 4, 0]); part('turret', [0, 8, 0], 'torso'); part('boom', [3, 12, 5], 'turret');
    part('stick', [3, 13, 25], 'boom'); part('bucket', [3, 1, 25], 'stick'); part('breaker', [3, 1, 25], 'stick');
    for (const s of [-1, 1]) { // tracks with rollers
      b('torso', s < 0 ? -11 : 7, 0, -12, s < 0 ? -7 : 11, 5, 12, C.DARK);
      for (let z = -10; z < 11; z += 4) b('torso', s < 0 ? -12 : 11, 1, z, s < 0 ? -11 : 12, 3, z + 2, C.ARMOR);
      b('torso', s < 0 ? -11 : 7, 5, -12, s < 0 ? -7 : 11, 6, 12, C.ARMOR);
    }
    b('torso', -7, 2, -8, 7, 6, 8, C.ARMOR); b('torso', -5, 6, -5, 5, 8, 5, C.DARK); // carbody, slewing ring
    b('torso', -10, 0, 13, 10, 4, 14, C.SKIN); b('torso', -6, 2, 9, -4, 3, 13, C.ARMOR); b('torso', 4, 2, 9, 6, 3, 13, C.ARMOR); // dozer blade on its arms
    b('turret', -8, 8, -11, 8, 15, 5, C.SKIN); b('turret', -8, 8, -15, 8, 14, -11, C.ARMOR); // house and counterweight
    b('turret', -8, 8, 0, -1, 19, 8, C.SKIN); b('turret', -7, 11, 7, -2, 18, 8, C.BELLY); b('turret', -8, 11, 1, -7, 18, 7, C.BELLY); // cab with windows
    b('turret', -8, 19, -1, -1, 20, 8, C.SKIN); b('turret', -7, 18, 8, -6, 19, 9, C.EYE); b('turret', -3, 18, 8, -2, 19, 9, C.EYE); // roof, lights
    b('turret', -5, 20, 3, -4, 21, 4, C.GLOW); // beacon
    b('turret', 1, 15, -10, 8, 16, 0, C.DARK); b('turret', 5, 15, -7, 6, 22, -6, C.DARK); // engine grille, exhaust
    b('turret', 1, 9, 2, 5, 14, 7, C.SKIN); // boom foot
    b('boom', 1, 11, 4, 5, 15, 26, C.SKIN); b('boom', 2, 8, 6, 4, 11, 16, C.ARMOR); b('boom', 2, 9, 16, 4, 10, 20, C.WHITE); // boom, lift cylinder
    b('boom', 2, 15, 12, 4, 17, 24, C.ARMOR); // stick cylinder on top
    b('stick', 1, 0, 24, 5, 14, 26, C.SKIN); b('stick', 2, 6, 26, 4, 14, 27, C.ARMOR); // stick, bucket cylinder
    b('bucket', -1, -3, 24, 7, 2, 26, C.SKIN); b('bucket', -1, -3, 26, 7, -1, 30, C.SKIN); b('bucket', -1, -1, 29, 7, 1, 30, C.DARK); // the bucket: back, floor, lip
    for (let x = -1; x < 7; x += 2) b('bucket', x, -3, 30, x + 1, -2, 32, C.TEETH);
    b('breaker', 1, -6, 24, 5, 2, 27, C.ARMOR); b('breaker', 2, -11, 25, 4, -6, 26, C.WHITE); // breaker housing and chisel
    if (stage >= 3) { b('turret', -9, 15, -14, -8, 18, 4, C.ARMOR); b('turret', 8, 15, -14, 9, 18, 4, C.ARMOR); } // railings
    if (stage >= 5) { b('turret', -8, 20, 0, -1, 21, 7, C.ARMOR); b('turret', -8, 8, 8, -1, 9, 9, C.ARMOR); } // a guard over the cab
    if (stage >= 7) { b('bucket', -2, -3, 24, -1, 2, 32, C.ARMOR); b('bucket', 7, -3, 24, 8, 2, 32, C.ARMOR); b('torso', -12, 6, -12, 12, 7, 12, C.GLOW); } // armoured bucket, warning stripes
  } else if (sp.id === 'gorilla') {
    part('torso', [0, 10, 0]); part('head', [0, 21, 1], 'torso'); part('jaw', [0, 23, 5], 'head');
    part('armL', [-10, 20, 0], 'torso'); part('armR', [10, 20, 0], 'torso'); part('legL', [-4.5, 10, 0]); part('legR', [4.5, 10, 0]);
    b('torso', -8, 9, -4, 8, 22, 5, C.SKIN); b('torso', -5, 11, 5, 5, 20, 6, C.BELLY);
    pair('leg', 2, 0, -3, 7, 10, 3, C.SKIN); pair('leg', 2, 0, -3, 7, 2, 5, C.DARK);
    pair('arm', 8, 5, -2, 12, 21, 3, C.SKIN); pair('arm', 8, 2, -3, 13, 7, 4, C.DARK);
    b('head', -4, 23, -2, 4, 28, 6, C.SKIN); b('head', -3, 23, 6, 3, 25, 8, C.BELLY); b('head', -5, 26, 0, 5, 28, 5, C.DARK);
    b('head', -3, 25, 6, -1, 27, 7, C.WHITE); b('head', 1, 25, 6, 3, 27, 7, C.WHITE);
    b('head', -2, 25, 7, -1, 26, 8, C.EYE); b('head', 1, 25, 7, 2, 26, 8, C.EYE);
    b('jaw', -4, 21, -1, 4, 23, 6, C.SKIN); b('jaw', -3, 21, 6, 3, 23, 8, C.BELLY); b('jaw', -2, 23, 7, -1, 24, 8, C.TEETH); b('jaw', 1, 23, 7, 2, 24, 8, C.TEETH);
  } else if (sp.id === 'robot') {
    part('torso', [0, 9, 0]); part('head', [0, 22, 0], 'torso'); part('armL', [-8, 19, 0], 'torso'); part('armR', [8, 19, 0], 'torso');
    part('legL', [-4, 9, 0]); part('legR', [4, 9, 0]); part('pods', [0, 21, -2], 'torso');
    b('torso', -6, 9, -4, 6, 21, 4, C.SKIN); b('torso', -4, 12, 4, 4, 18, 5, C.BELLY); b('torso', -1, 14, 5, 1, 16, 6, C.GLOW);
    b('torso', -3, 21, -2, 3, 22, 2, C.DARK);
    pair('leg', 2, 0, -2, 6, 9, 3, C.BELLY); pair('leg', 1, 0, -3, 7, 3, 5, C.SKIN);
    b('armL', -10, 9, -2, -6, 20, 2, C.BELLY); b('armL', -10, 6, -2, -9, 9, 3, C.DARK); b('armL', -7, 6, -2, -6, 9, 3, C.DARK);
    // The right arm is a laser cannon.
    b('armR', 6, 12, -2, 10, 20, 2, C.BELLY); b('armR', 6, 7, -3, 11, 12, 3, C.DARK); b('armR', 7, 5, -2, 10, 7, 2, C.ARMOR); b('armR', 8, 4, -1, 9, 5, 1, C.EYE);
    b('head', -5, 22, -4, 5, 28, 4, C.SKIN); b('head', -4, 24, 4, 4, 26, 5, C.EYE);
    b('head', 0, 28, 0, 1, 31, 1, C.DARK); b('head', 0, 31, 0, 1, 32, 1, C.GLOW); b('head', -3, 22, 4, 3, 23, 5, C.TEETH);
    // Shoulder pods for the rockets.
    b('pods', -11, 20, -4, -6, 25, 2, C.ARMOR); b('pods', 6, 20, -4, 11, 25, 2, C.ARMOR);
    for (const x of [-10, -8, 7, 9]) { b('pods', x, 21, 2, x + 1, 22, 3, C.EYE); b('pods', x, 23, 2, x + 1, 24, 3, C.EYE); }
  } else {
    part('torso', [0, 9, 0]); part('head', [0, 20, 2], 'torso'); part('jaw', [0, 21, 6], 'head');
    part('armL', [-7.5, 17, 3], 'torso'); part('armR', [7.5, 17, 3], 'torso'); part('legL', [-4, 9, 0]); part('legR', [4, 9, 0]);
    part('tail', [0, 12, -5], 'torso'); part('tail2', [0, 11, -16], 'tail');
    b('torso', -6, 8, -5, 6, 20, 6, C.SKIN); b('torso', -4, 9, 6, 4, 18, 7, C.BELLY);
    pair('leg', 2, 0, -2, 6, 9, 3, C.SKIN); pair('leg', 2, 0, -2, 6, 2, 6, C.DARK);
    pair('arm', 6, 11, 1, 9, 18, 5, C.SKIN); pair('arm', 6, 10, 4, 9, 12, 7, C.DARK);
    // A long, heavy tail in two segments with a club at the end: the dino's weapon.
    b('tail', -3, 9, -10, 3, 15, -5, C.SKIN); b('tail', -2, 9, -16, 2, 13, -10, C.SKIN);
    b('tail2', -1, 9, -23, 1, 12, -16, C.SKIN); b('tail2', -1, 9, -27, 1, 11, -23, C.SKIN); b('tail2', -2, 8, -31, 2, 12, -27, C.DARK);
    b('head', -5, 21, -2, 5, 27, 8, C.SKIN); b('head', -4, 22, 8, 4, 25, 13, C.SKIN);
    b('head', -5, 23, 6, -3, 26, 8, C.WHITE); b('head', 3, 23, 6, 5, 26, 8, C.WHITE);
    b('head', -5, 24, 7, -4, 25, 9, C.EYE); b('head', 4, 24, 7, 5, 25, 9, C.EYE);
    for (let i = -3; i < 4; i += 2) b('head', i, 21, 12, i + 1, 22, 13, C.TEETH);
    b('jaw', -5, 19, -2, 5, 21, 7, C.SKIN); b('jaw', -4, 19, 7, 4, 21, 13, C.BELLY);
    for (let i = -4; i < 4; i += 2) b('jaw', i, 21, 11, i + 1, 22, 12, C.TEETH);
    for (let i = 0; i < Math.min(3, spikes); i++) b('tail', -1, 15 - i * 2, -8 - i * 3, 1, 15 - i * 2 + spikeH - 1, -6 - i * 3, C.DARK);
  }
  if (!sp.tracked && sp.id !== 'jet' && sp.id !== 'chopper' && sp.id !== 'tentacle') {
    for (let i = 0; i < spikes; i++) { // back spikes
      const y = 21 - i * 2;
      if (y < 10) break;
      b('torso', -1, y - 1, sp.id === 'dino' ? -5 - spikeH : -4 - spikeH, 1, y + 1, -4, sp.id === 'robot' ? C.GLOW : C.DARK);
    }
    if (stage >= 4) { // horns
      const hy = sp.id === 'robot' ? 26 : 27, hh = 2 + Math.floor(stage / 2);
      b('head', -5, hy, 1, -3, hy + hh, 3, C.TEETH); b('head', 3, hy, 1, 5, hy + hh, 3, C.TEETH);
    }
    if (stage >= 6) { // shoulder armour
      const g = sp.id === 'gorilla';
      pair('arm', g ? 7 : 5, g ? 19 : 17, -3, g ? 14 : 11, g ? 23 : 20, 6, C.ARMOR);
      b('torso', -7, 8, -6, 7, 10, 7, C.ARMOR);
    }
    if (stage >= 8) { // glowing stripes
      b('torso', -7, 14, -1, -6, 15, 5, C.GLOW); b('torso', 6, 14, -1, 7, 15, 5, C.GLOW);
      pair('leg', 6, 3, 0, 7, 7, 1, C.GLOW);
    }
  }

  const pal = palette(sp, stage), parts = [], names = Object.keys(P).filter((n) => P[n].length);
  for (const name of names) {
    const boxes = P[name];
    let x0 = 99, y0 = 99, z0 = 99, x1 = -99, y1 = -99, z1 = -99;
    for (const q of boxes) { x0 = Math.min(x0, q[0]); y0 = Math.min(y0, q[1]); z0 = Math.min(z0, q[2]); x1 = Math.max(x1, q[3]); y1 = Math.max(y1, q[4]); z1 = Math.max(z1, q[5]); }
    const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0, vox = new Uint8Array(sx * sy * sz);
    for (const q of boxes) for (let y = q[1]; y < q[4]; y++) for (let z = q[2]; z < q[5]; z++) for (let x = q[0]; x < q[3]; x++) vox[x - x0 + sx * (z - z0 + sz * (y - y0))] = q[6];
    const mesh = meshVolume(vox, sx, sy, sz, x0, y0, z0, pal);
    // chain: joint names from the root down to this part.
    const chain = [];
    for (let n = name; n; n = parents[n]) chain.unshift(n);
    parts.push({ name, data: mesh.data, quads: mesh.quads, chain, emote: name.startsWith('emo_') ? name.slice(4) : null, seg: name.startsWith('seg') });
  }
  return { parts, pivots, species: sp.id, stage, tipY: SEGS * SEG_LEN };
}

export function newPose() {
  const j = {};
  for (const n of JOINTS) j[n] = new Float32Array(6);
  // spin/pitch: whole-body yaw and pitch. hop/fwd: whole-body offset in model units. look: where the head turns.
  // bank/climb: how the aircraft leans into a turn and points its nose. flip: somersault angle of the double jump.
  // ta/ts: the tentacle's bend of every segment forwards and sideways (the shape it reaches with), emerge: how far it is out
  // of the ground (0 = below, 1 = out), lean: the stick's lean of the whole arm (forwards, sideways), emote: the emoticon above the tip.
  return { flip: 0, walk: 0, walkAmp: 0, time: 0, squash: 0, spin: 0, pitch: 0, hop: 0, fwd: 0, roar: 0, hold: 0, look: 0, aimPitch: 0, air: 0, cling: 0, climbAmt: 0, climbV: 0, climbH: 0, bank: 0, climb: 0,
    ta: new Float32Array(SEGS), ts: new Float32Array(SEGS), emerge: 1, leanF: 0, leanS: 0, emote: null, emoteT: 0, j };
}

// The tentacle's reach: a few steps of cyclic coordinate descent in the plane it faces, which bends the segments so that
// the tip comes closer to (f, u) (forwards and up from the root, in model units). Run a little every frame, from last
// frame's shape: the arm follows its target with a soft delay instead of snapping to it.
export function reachFor(pose, f, u, steps = 2) {
  const a = pose.ta, px = new Float32Array(SEGS + 1), py = new Float32Array(SEGS + 1);
  const chain = () => { let ang = 0; for (let i = 0; i < SEGS; i++) { ang += a[i]; px[i + 1] = px[i] + Math.sin(ang) * SEG_LEN; py[i + 1] = py[i] + Math.cos(ang) * SEG_LEN; } };
  for (let s = 0; s < steps; s++) for (let i = SEGS - 1; i >= 0; i--) {
    chain();
    const ex = px[SEGS] - px[i], ey = py[SEGS] - py[i], tx = f - px[i], ty = u - py[i];
    const d = Math.atan2(ex * ty - ey * tx, ex * tx + ey * ty); // turning the tip vector onto the target vector
    a[i] = clamp(a[i] - clamp(d, -0.25, 0.25) * 0.5, -0.42, 0.42);
  }
  for (let i = 1; i < SEGS - 1; i++) a[i] = a[i] * 0.8 + (a[i - 1] + a[i + 1]) * 0.1; // smooth: a bend, not a kink
}

// Body language that is always on: walking, breathing, tail sway, looking at the aim point, tucking in a jump.
// Resets all joints first; attack animations are added afterwards.
export function locomotion(pose, species) {
  const j = pose.j, amp = pose.walkAmp, w = Math.sin(pose.walk) * amp, w2 = Math.sin(pose.walk * 2) * amp, t = pose.time;
  for (const n of JOINTS) j[n].fill(0);
  pose.spin = 0; pose.pitch = 0; pose.fwd = 0;
  const breathe = Math.sin(t * 1.7);
  if (species === 'jet') { // leans into turns, lifts or drops its nose, floats gently on the air
    j.torso[2] = pose.bank; j.torso[0] = pose.climb;
    j.turret[1] = pose.look; j.pods[1] = pose.look; j.barrel[0] = pose.aimPitch;
    pose.hop = Math.sin(t * 2.1) * 0.4;
    return;
  }
  if (species === 'chopper') { // tilts into the way it moves, the rotors turn all the time, the gun follows the aim point
    j.torso[0] = pose.climb; j.torso[2] = pose.bank;
    j.rotor[1] = t * 31; j.rotor2[1] = -t * 31; j.trotor[0] = t * 47;
    j.turret[1] = pose.look; j.barrel[0] = pose.aimPitch;
    pose.hop = Math.sin(t * 2.3) * 0.5;
    return;
  }
  if (species === 'tentacle') {
    // Every segment takes its share of the reach, a slow wave runs up the arm and sways it from side to side,
    // and the lean of the stick tilts the whole arm from the root. Below the ground it is drawn down into its hole.
    const lean = pose.leanF, side = pose.leanS;
    for (let i = 0; i < SEGS; i++) {
      const q = j[SEG_NAMES[i]], k = i / (SEGS - 1);
      q[0] = pose.ta[i] + Math.sin(t * 2.1 - i * 0.55) * 0.05 * (0.4 + k) + (i < 3 ? lean * 0.22 : 0);
      q[2] = pose.ts[i] + Math.sin(t * 1.4 - i * 0.45) * 0.06 * (0.3 + k) + (i < 3 ? -side * 0.2 : 0);
      q[1] = Math.sin(t * 0.9 - i * 0.3) * 0.04;
    }
    j.seg0[4] = -(1 - pose.emerge) * SEGS * SEG_LEN;
    pose.hop = 0;
    if (pose.roar) { const r = pose.roar; for (let i = 0; i < SEGS; i++) { j[SEG_NAMES[i]][0] *= 1 - r; j[SEG_NAMES[i]][2] += Math.sin(t * 40 + i) * 0.08 * r; } pose.squash = Math.min(pose.squash, -0.5 * r); } // rears up and trembles
    return;
  }
  if (species === 'tank') {
    pose.hop = Math.abs(w2) * 0.25;
    j.torso[0] = w2 * 0.02 - pose.air * 0.15;
    j.turret[1] = pose.look;
    return;
  }
  if (species === 'digger') {
    // The upper carriage turns towards the aim point; the arm reaches up or down towards it, folded in while driving.
    // In a hop it pushes itself off with the arm (the bucket goes down to the ground).
    const fold = Math.min(1, amp * 1.5), up = clamp(pose.aimPitch, -0.6, 1.2);
    pose.hop = Math.abs(w2) * 0.2;
    j.torso[0] = w2 * 0.02 - pose.air * 0.1;
    j.turret[1] = pose.look;
    j.boom[0] = -0.35 - 0.55 * up * (1 - fold) - 0.25 * fold + 0.9 * pose.air + Math.sin(t * 0.9) * 0.02;
    j.stick[0] = 0.55 + 0.35 * fold - 0.3 * up * (1 - fold) - 0.6 * pose.air;
    j.bucket[0] = -0.5 - 0.6 * fold + 0.4 * pose.air;
    j.breaker[0] = j.bucket[0] + 0.5;
    return;
  }
  pose.hop = Math.abs(Math.sin(pose.walk)) * amp * 1.1 + breathe * 0.12;
  j.legL[0] = w * 0.8; j.legR[0] = -w * 0.8;
  j.torso[2] = w * 0.06;
  j.head[1] = pose.look * 0.6;
  if (species === 'dino') {
    j.torso[0] = 0.1 + 0.08 * amp;
    j.armL[0] = -0.35 + w * 0.3; j.armR[0] = -0.35 - w * 0.3;
    j.tail[1] = w * 0.3 + Math.sin(t * 1.3) * 0.1; j.tail2[1] = Math.sin(pose.walk - 0.9) * 0.4 * amp + Math.sin(t * 1.3 + 1.1) * 0.14;
    j.tail[0] = 0.1 - 0.06 * amp;
    j.head[0] = -0.1 - 0.06 * amp + w2 * 0.05;
    j.jaw[0] = 0.06 + breathe * 0.03;
  } else if (species === 'gorilla') { // knuckle walk
    j.torso[0] = 0.08 + 0.2 * amp;
    j.armL[0] = -0.12 - w * 0.9; j.armR[0] = -0.12 + w * 0.9;
    j.head[0] = -0.1 - 0.16 * amp;
    j.torso[2] = w * 0.1;
  } else { // robot: stiff, with a counter-twist of the upper body
    pose.hop *= 0.5;
    j.torso[1] = w * 0.14;
    j.armL[0] = -w * 0.4; j.armR[0] = w * 0.4;
    j.head[1] = pose.look * 0.9;
  }
  if (pose.air) { // in the air: legs tucked, arms thrown up
    const a = pose.air;
    j.legL[0] = -0.7 * a; j.legR[0] = -0.45 * a;
    j.armL[2] -= 0.9 * a; j.armR[2] += 0.9 * a;
    if (species === 'dino') { j.tail[0] += 0.5 * a; j.tail2[0] += 0.3 * a; }
  }
  if (pose.roar) { // head thrown back, mouth wide open, arms spread
    const r = pose.roar;
    j.torso[0] -= 0.25 * r; j.head[0] -= 0.6 * r; j.jaw[0] += 0.8 * r;
    j.armL[2] -= 1.0 * r; j.armR[2] += 1.0 * r; j.armL[0] -= 0.4 * r; j.armR[0] -= 0.4 * r;
  }
  if (pose.cling > 0.01) climbPose(pose, species); // only while (still) on a wall: the walk must keep its legs
  if (pose.hold) { j.armL[0] -= 2.9 * pose.hold; j.armR[0] -= 2.9 * pose.hold; j.torso[0] -= 0.15 * pose.hold; }
}

// Climbing a wall: the body, head and tail. The limbs are not animated by a cycle but placed by Climber (below):
// every hand and foot holds on to a fixed spot on the wall until it has to let go and reach for the next one.
// Everything is blended with pose.cling, so that the walk takes over again smoothly when the creature lets go.
function climbPose(pose, species) {
  const j = pose.j, c = pose.cling, m = pose.climbAmt * c, a = pose.climbAng;
  const mix = (q, i, v) => { q[i] = q[i] * (1 - c) + v * c; };
  mix(j.torso, 0, 0.3);
  mix(j.torso, 2, (pose.climbLean ?? 0) * 0.18);
  pose.fwd = 1.8 * c; // chest to the wall
  pose.hop *= 1 - c;
  if (a) for (const n of ['armL', 'armR', 'legL', 'legR']) { mix(j[n], 0, a[n][0]); mix(j[n], 2, a[n][1]); j[n][1] *= 1 - c; }
  // Head: up the wall when climbing up, down when climbing down, sideways towards where it goes.
  mix(j.head, 0, pose.climbV > 0.1 ? -0.45 : pose.climbV < -0.1 ? 0.35 : -0.2);
  mix(j.head, 1, -Math.sign(pose.climbH || 0) * 0.6 * pose.climbAmt);
  if (species === 'dino') { mix(j.tail, 0, -0.5); mix(j.tail, 1, (pose.climbLean ?? 0) * -0.5); mix(j.tail2, 0, -0.3); } // the tail hangs down as a counterweight
  mix(j.jaw, 0, 0.1 + 0.1 * m * (pose.climbEffort ?? 0)); // effort
}

// Where the limbs of each creature sit and how long they are, in model units (see buildModel), and how it climbs:
// swing: seconds to move one hand or foot to a new hold. pull: how fast the body still moves while a hand is
// off the wall (1 = full speed). pairs: hand and opposite foot move together (otherwise one limb at a time).
// reach: how far ahead of the shoulder or hip a new hold is taken, as a share of the limb's length.
const CLIMB = {
  dino: { shoulder: [7.5, 17], hip: [4, 9], arm: 8, leg: 9, swing: 0.14, pull: 0.5, pairs: false, reach: 0.75, order: ['legR', 'armL', 'legL', 'armR'] }, // short arms: big steps with the legs, the arms only hold on
  gorilla: { shoulder: [10, 20], hip: [4.5, 10], arm: 17, leg: 10, swing: 0.16, pull: 0.25, pairs: false, reach: 0.85, order: ['armL', 'legR', 'armR', 'legL'] }, // long arms: reach far, haul the body up after each grip
  robot: { shoulder: [8, 19], hip: [4, 9], arm: 14, leg: 9, swing: 0.09, pull: 0, pairs: true, reach: 0.7, order: ['armL', 'armR'] }, // mechanical: diagonal pairs, the body only moves while all four hold
};
const LIMBS = ['armL', 'armR', 'legL', 'legR'], OPPOSITE = { armL: 'legR', armR: 'legL' };

// Hands and feet on the wall. Holds are kept in wall coordinates (model units): a = sideways (model +x),
// u = height. Each frame the joints of the moving body are compared with their holds; a limb lets go only
// when its hold falls too far behind (or out of reach), and only one hand at a time is ever free.
export class Climber {
  constructor() { this.holds = null; }

  reset() { this.holds = null; }

  // Returns the share of the climbing speed the body may use this frame.
  update(m, dt, species, moving, dirA, dirU) {
    const C = CLIMB[species] ?? CLIMB.dino, k = MODEL_HEIGHT / m.h, c = m.cling;
    const tx = -c.dz, tz = c.dx, bodyA = -(m.x * tx + m.z * tz) * k, bodyU = m.y * k;
    const joint = (n) => (n[0] === 'a' ? [bodyA + (n === 'armL' ? -C.shoulder[0] : C.shoulder[0]), bodyU + C.shoulder[1]] : [bodyA + (n === 'legL' ? -C.hip[0] : C.hip[0]), bodyU + C.hip[1]]);
    const len = (n) => (n[0] === 'a' ? C.arm : C.leg);
    // Where a limb would like to hold: ahead in the direction of travel, hands above the shoulders, feet below the hips.
    const want = (n) => {
      const J = joint(n), L = len(n), out = n.endsWith('L') ? -1 : 1, hand = n[0] === 'a';
      const rest = hand ? [out * 0.3 * L, 0.55 * L] : [out * 0.3 * L, -0.7 * L];
      let da = rest[0] + dirA * C.reach * L * (moving ? 1 : 0), du = rest[1] + dirU * C.reach * L * (moving ? 1 : 0) * (hand ? 1 : 0.8);
      const d = Math.hypot(da, du), most = 0.92 * L; // within reach, or it would have to let go again at once
      if (d > most) { da *= most / d; du *= most / d; }
      return [J[0] + da, J[1] + du];
    };
    // A new wall, a corner or the seam of the planet: take fresh holds.
    if (!this.holds || this.dir !== c.dx * 3 + c.dz || Math.abs(bodyA - this.lastA) > 40) {
      this.holds = {};
      for (const n of LIMBS) { const p = want(n); this.holds[n] = { a: p[0], u: p[1], fa: p[0], fu: p[1], swing: 0 }; }
      this.gait = 0;
    }
    this.dir = c.dx * 3 + c.dz; this.lastA = bodyA;
    const H = this.holds;
    // Swinging limbs travel to their new hold.
    let swinging = 0, handFree = false;
    for (const n of LIMBS) {
      const h = H[n];
      if (h.swing > 0) { h.swing = Math.max(0, h.swing - dt / C.swing); swinging++; if (n[0] === 'a') handFree = true; }
    }
    // Who lets go next: the next limb in this creature's order whose hold has fallen behind or out of reach.
    if (!swinging) for (let i = 0; i < C.order.length; i++) {
      const n = C.order[(this.gait + i) % C.order.length], h = H[n], J = joint(n), L = len(n);
      const ra = h.a - J[0], ru = h.u - J[1], d = Math.hypot(ra, ru), behind = moving && ra * dirA + ru * dirU < -0.05 * L;
      if (!behind && d < L * 1.05) continue;
      const grip = (q) => { const t = want(q); H[q].fa = H[q].a; H[q].fu = H[q].u; H[q].a = t[0]; H[q].u = t[1]; H[q].swing = 1; };
      grip(n);
      if (C.pairs && OPPOSITE[n]) grip(OPPOSITE[n]); // the robot: diagonal pairs
      this.gait = (this.gait + i + 1) % C.order.length;
      if (n[0] === 'a') handFree = true;
      swinging = 1;
      break;
    }
    // Angles that point each limb at its hold (or, while it swings, at a point on the way, lifted off the wall).
    const ang = (this.ang ??= { armL: [0, 0], armR: [0, 0], legL: [0, 0], legR: [0, 0] });
    let lean = 0, effort = 0;
    for (const n of LIMBS) {
      const h = H[n], J = joint(n), L = len(n), e = 1 - h.swing, s = e * e * (3 - 2 * e);
      const pa = h.fa + (h.a - h.fa) * s, pu = h.fu + (h.u - h.fu) * s + Math.sin(Math.PI * e) * (h.swing > 0 ? 0.15 * L : 0);
      const ra = pa - J[0], ru = pu - J[1];
      // Straight down = 0, out from the wall-facing body horizontally = -pi/2, straight up = -pi.
      ang[n][0] = -(Math.PI / 2 + Math.asin(Math.max(-1, Math.min(1, ru / L)))) + (h.swing > 0 ? 0.25 * Math.sin(Math.PI * e) : 0);
      ang[n][1] = Math.asin(Math.max(-1, Math.min(1, ra / L)));
      if (n[0] === 'a') { lean += ra / L; effort += Math.max(0, ru / L); }
    }
    m.pose.climbAng = ang; m.pose.climbLean = Math.max(-1, Math.min(1, lean * 0.5)); m.pose.climbEffort = effort * 0.5;
    // The body moves while the hands hold; with a hand off the wall it slows down (the robot stops altogether).
    return handFree ? C.pull : 1;
  }
}

function joint(out, pivot, q) {
  m4.translate(out, pivot[0] + q[3], pivot[1] + q[4], pivot[2] + q[5]);
  if (q[1]) m4.rotateY(out, q[1]);
  if (q[0]) m4.rotateX(out, q[0]);
  if (q[2]) m4.rotateZ(out, q[2]);
  m4.translate(out, -pivot[0], -pivot[1], -pivot[2]);
}

// Fills `out` with the matrix of one model part. base = placement of the whole monster.
export function partMatrix(out, base, model, part, pose) {
  m4.copy(out, base);
  for (const n of part.chain) joint(out, model.pivots[n], pose.j[n]);
  return out;
}

export class Monster {
  constructor(game) {
    this.g = game;
    this.x = 0; this.y = 0; this.z = 0;
    this.heading = 0;
    this.vy = 0;
    this.onGround = true;
    this.stage = 1;
    this.h = 8; // current height in voxels (eases towards the stage's height)
    this.pose = newPose();
    this.jumpHeld = false; // set by the game from the jump button
    this.sprint = false;
    this.speed = 0; // current ground speed in voxels per second
    this.stomping = false;
    this.leaping = null; // { vx, vz }: an aimed leap in progress
    this.trampleT = 0; this.shoveT = 0;
    this.lastStep = 0;
    this.grow = 0; // 1 right after a growth, fades out
    this.jumps = 0; // jumps since the feet last touched the ground (2 = the double jump is used up)
    this.flipT = -1; // seconds into the somersault, -1 = none
    this.flipped = false; // this flight included a somersault: the landing hits harder
    this.v2 = 1; // launch speed of the last double jump
    this.pound = null; // ground pound in progress: { t, falling, chain }
    this.stun = 0; // seconds the creature cannot move after a ground pound
    this.cued = false;
    this.cling = null; // hanging on a wall: { dx, dz, t } (direction of the wall)
    this.climbV = 0; this.climbH = 0; // climbing controls: up/down and sideways, -1..1
    this.climber = new Climber(); // where hands and feet hold on to the wall
    this.kick = null; // shove away from the wall after a wall jump: { vx, vz, t }
    this.clingCool = 0; // seconds until the next wall may be grabbed
    this.wallJump = false;
    this.bounce = 0; this.bounceDir = 1; // aircraft: seconds it is still tumbling after a crash, and which way
    this.steer = 0; this.pitchIn = 0; // aircraft controls: turn and climb, -1..1
    this.homing = false; // aircraft has left an island and is turning back
    this.vx = 0; this.vz = 0; this.liftIn = 0; this.strafe = 0; this.washT = 0; this.landT = 0; // helicopter: drift, height over the ground, controls
    this.under = false; this.diveCool = 0; this.leanT = 0; this.mineT = 0; this.eruptT = -9; this.quietT = 0; // tentacle: below the ground, timers
  }

  targetHeight() {
    const w = this.g.world;
    return Math.min(w.monsterBase * stageScale(this.stage), w.sy * 0.92);
  }

  place(x, y, z, heading) {
    this.x = x; this.y = y; this.z = z; this.heading = heading;
    this.vy = 0; this.leaping = null; this.onGround = true;
    this.jumps = 0; this.flipT = -1; this.flipped = false; this.pose.flip = 0;
    this.pound = null; this.stun = 0; this.cling = null;
    this.h = this.targetHeight();
    const sp = this.g.progress.species;
    if (sp === 'jet') { this.y = y + 40 + this.h; this.onGround = false; } // the aircraft starts in the air
    if (sp === 'chopper') { this.y = y + this.h * 1.1 + 4; this.vx = this.vz = this.vy = 0; this.onGround = false; }
    if (sp === 'tentacle') { this.under = false; this.pose.emerge = 1; this.pose.ta.fill(0); }
  }

  faceTo(x, z) {
    const size = this.g.world.wrap ? this.g.world.sx : 0;
    const dx = wrapDelta(x - this.x, size), dz = wrapDelta(z - this.z, size);
    if (dx * dx + dz * dz > 1) this.heading = Math.atan2(dx, dz);
  }

  // Big monsters fall faster, so a jump takes about as long at every size instead of floating.
  gravity() { return GRAVITY * 2 * Math.max(1, this.h / 14) * this.g.world.grav; }

  // First press: jump from the ground. Second press in the air: one more jump, with a forward somersault.
  jump() {
    const tank = tracked(this.g.progress.species); // tank and excavator only hop (the excavator pushes itself up with its arm)
    if (this.g.world.under && !this.onGround && !this.cling && !this.leaping && !tank) {
      // Under water every press in mid-water is a swimming stroke: up again, as often as you like.
      this.vy = Math.sqrt(2 * this.gravity() * this.h * 1.3);
      this.jumps = Math.max(1, this.jumps); this.stomping = true; this.pound = null;
      this.pose.squash = 0.7;
      this.g.onSwim(this);
      return true;
    }
    if (this.cling) {
      // Up, and a little away from the wall. Steering forwards again brings the creature back to it further up.
      this.kick = { vx: -this.cling.dx * this.h * 1.8, vz: -this.cling.dz * this.h * 1.8, t: 0.28 };
      this.cling = null; this.clingCool = 0.15;
      this.wallJump = true; // until the top of this jump the wall is neither grabbed again nor broken through
      this.vy = Math.sqrt(2 * this.gravity() * this.h * JUMP2_HEIGHT);
      this.jumps = 1; this.stomping = true; this.flipT = -1;
      this.g.stat('jumps');
      return true;
    }
    if (this.onGround) {
      this.vy = Math.sqrt(2 * this.gravity() * this.h * (tank ? TANK_HOP : JUMP_HEIGHT));
      this.onGround = false;
      this.stomping = !tank; // a hop leaves no crater: it is the way out of one
      this.jumps = 1;
      this.g.stat('jumps');
      return true;
    }
    if (this.leaping || this.pound || tank) return false; // 30 tonnes: no second jump, no ground pound
    if (this.jumps >= 2) {
      // Third press: only at the right moment. Then all steering ends and the creature drops like a stone.
      if (!this.poundReady()) return false;
      this.pound = { t: 0, falling: false, chain: 0 };
      this.jumps = 3; this.flipT = -1; this.vy = 0;
      this.stomping = false;
      this.g.onPoundStart(this);
      return true;
    }
    // Also allowed after walking off an edge: then it is the only jump of that fall.
    this.vy = this.v2 = Math.sqrt(2 * this.gravity() * this.h * JUMP2_HEIGHT);
    this.cued = false;
    this.jumps = 2;
    this.stomping = true;
    this.flipT = 0; this.flipped = true;
    this.g.onDoubleJump(this);
    return true;
  }

  // The right moment for the ground pound: around the top of the double jump, from the second half
  // of the somersault until the creature has started to fall in earnest.
  poundReady() {
    return this.jumps === 2 && !this.onGround && !this.leaping && !this.pound &&
      (this.flipT < 0 || this.flipT > FLIP_TIME * 0.5) && this.vy > -this.v2 * 0.55;
  }

  // An aimed leap: flies in an arc to (tx, tz), ignoring what stands in the way, and reports the landing.
  leap(tx, tz, apex) {
    if (!this.onGround) return false;
    const g = this.gravity(), size = this.g.world.wrap ? this.g.world.sx : 0;
    this.vy = Math.sqrt(2 * g * apex);
    const time = this.vy / g + Math.sqrt((2 * apex) / (g * FALL_GRAVITY));
    this.leaping = { vx: wrapDelta(tx - this.x, size) / time, vz: wrapDelta(tz - this.z, size) / time };
    this.onGround = false;
    return true;
  }

  // The aircraft is always moving: it turns with `steer`, climbs or dives with `pitchIn`,
  // skims over whatever is below it and ploughs through whatever is in front of it.
  flyPlane(dt, aimX, aimZ) {
    const g = this.g, w = g.world, h = this.h, pose = this.pose;
    // After a crash the aircraft is thrown round and climbs away; for that moment it does not answer the controls.
    this.bounce = Math.max(0, this.bounce - dt);
    if (this.bounce > 0) { g.camYaw += this.bounceDir * dt * 4.2; this.pitchIn = 1; pose.bank += (this.bounceDir * -1.1 - pose.bank) * Math.min(1, dt * 8); }
    const v = (42 + h * 1.3) * (this.sprint ? 1.7 : 1) * (this.bounce > 0 ? 0.55 : 1), fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    this.speed = v; this.onGround = false;
    this.x += fx * v * dt; this.z += fz * v * dt;
    // Never below the ground: an aircraft is no mole.
    this.y = clamp(this.y + this.pitchIn * (24 + h * 0.7) * dt, Math.max(3, w.spawn[1]) + h * 0.3 + 1, w.sy + 70);
    const floor = w.heightBelow(this.x, this.z, this.y) + h * 0.3 + 1;
    if (this.y < floor) this.y += (floor - this.y) * Math.min(1, dt * 8);
    // Nose first into something solid: a big hole in it (it may well come down), and the aircraft bounces off.
    // Flying on straight through a building is not possible.
    const nx = this.x + fx * h * 0.8, nz = this.z + fz * h * 0.8;
    if (w.get(Math.floor(nx), Math.floor(this.y), Math.floor(nz))) {
      if (this.bounce <= 0) {
        g.lastHit.dx = fx; g.lastHit.dz = fz;
        // A dent the size of the aircraft, no more: ramming is a mishap, not a weapon.
        g.destruction.sphere(nx + fx * h * 0.3, this.y, nz + fz * h * 0.3, h * 0.4 + 1.5, 4 + this.stage * 1.5, { dx: fx, dy: 0.1, dz: fz, impulse: launch(h * 1.5 + 8), debris: 50, spare: true });
        g.onCrash(this);
        this.bounce = 0.75;
        this.bounceDir = g.rng() < 0.5 ? 1 : -1;
      }
      this.x -= fx * v * dt * 1.6; this.z -= fz * v * dt * 1.6; // out of the wall again
    }
    if (w.wrap) { this.x = ((this.x % w.sx) + w.sx) % w.sx; this.z = ((this.z % w.sz) + w.sz) % w.sz; }
    else this.homing = this.x < 20 || this.z < 20 || this.x > w.sx - 20 || this.z > w.sz - 20; // islands end: turn back
    pose.bank += (this.steer * 0.75 - pose.bank) * Math.min(1, dt * 5);
    pose.climb += (-this.pitchIn * 0.4 - pose.climb) * Math.min(1, dt * 5);
    pose.air = 0; pose.walkAmp = 0;
    // The gear under the belly follows the aim point, all the way round and down.
    const size = w.wrap ? w.sx : 0, ax = wrapDelta(aimX - this.x, size), az = wrapDelta(aimZ - this.z, size);
    let dl = Math.atan2(ax, az) - this.heading - pose.look;
    dl = Math.atan2(Math.sin(dl), Math.cos(dl));
    pose.look += dl * Math.min(1, dt * 10);
    pose.aimPitch += (clamp(Math.atan2(this.y - g.aim.y, Math.hypot(ax, az)), -0.15, 1.4) - pose.aimPitch) * Math.min(1, dt * 10);
    locomotion(pose, 'jet');
  }

  // The helicopter hovers: it drifts where it is steered (mx/mz in the world, plus strafe), with inertia, and comes to a stop
  // when let go. Height works as under water: holding the jump button lifts it, let go it sinks back by itself until it sits
  // on the ground or a roof. What lies just ahead it rises over on its own. The nose turns towards the aim. Running into
  // something solid leaves a dent and throws it back. Sitting on a roof from stage 3 on, it is too heavy for it.
  hover(dt, mx, mz, aimX, aimZ) {
    const g = this.g, w = g.world, h = this.h, pose = this.pose, size = w.wrap ? w.sx : 0;
    this.bounce = Math.max(0, this.bounce - dt);
    const v = (18 + h * 0.9) * (this.sprint ? 1.6 : 1), k = Math.min(1, dt * 2.4);
    const want = Math.hypot(mx, mz) > 1 ? 1 / Math.hypot(mx, mz) : 1;
    if (this.bounce <= 0) { this.vx += (mx * want * v - this.vx) * k; this.vz += (mz * want * v - this.vz) * k; }
    const px = this.x, pz = this.z;
    this.x += this.vx * dt; this.z += this.vz * dt;
    // Height: up while the button is held, a slower sinking otherwise. The floor is the highest thing under the body and a little ahead.
    this.vy += ((this.liftIn > 0 ? 14 + h : -(5 + h * 0.45)) - this.vy) * Math.min(1, dt * 3);
    let floor = 0;
    const r = h * 0.3, ax = this.x + this.vx * 0.45, az = this.z + this.vz * 0.45;
    for (const [ox, oz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]]) floor = Math.max(floor, w.heightBelow(this.x + ox, this.z + oz, w.sy - 1), w.heightBelow(ax + ox, az + oz, w.sy - 1));
    this.y += this.vy * dt;
    if (this.y < floor) { this.y += Math.min(floor - this.y, (30 + h * 1.5) * dt); if (this.vy < 0) this.vy = 0; } // over what is ahead
    if (this.y > w.sy + 60) { this.y = w.sy + 60; this.vy = Math.min(0, this.vy); }
    this.onGround = this.y <= floor + 0.5;
    // Landed on a roof: from stage 3 the roof gives way under it, and it sinks floor by floor until it stands on something firm.
    if (this.onGround && this.stage >= 3 && (this.landT -= dt) <= 0) {
      const st = w.structureAt(this.x, this.z);
      if (st && st.major && floor > st.y0 + 2) {
        this.landT = 0.45;
        g.lastHit.dx = 0; g.lastHit.dz = 0;
        g.destruction.sphere(this.x, floor - 1, this.z, h * 0.32 + 1, 3 + this.stage * 1.3, { dx: 0, dy: -0.3, dz: 0, impulse: launch(h * 0.6 + 4), debris: 30 });
        g.shake(0.15);
      }
    }
    // Into a wall: a dent the size of the helicopter, a bump backwards, a moment of tumbling.
    const sp = Math.hypot(this.vx, this.vz);
    if (sp > 2 && this.bounce <= 0) {
      const fx = this.vx / sp, fz = this.vz / sp, nx = this.x + fx * h * 0.55, nz = this.z + fz * h * 0.55, ny = this.y + h * 0.35;
      if (w.get(Math.floor(nx), Math.floor(ny), Math.floor(nz)) || w.get(Math.floor(this.x + fx * h * 0.3), Math.floor(this.y + h * 0.6), Math.floor(this.z + fz * h * 0.3))) {
        g.lastHit.dx = fx; g.lastHit.dz = fz;
        g.destruction.sphere(nx, ny, nz, h * 0.3 + 1.2, 3 + this.stage * 1.4, { dx: fx, dy: 0.1, dz: fz, impulse: launch(h + 6), debris: 40, spare: true });
        g.onCrash(this);
        this.x = px - fx * 0.5; this.z = pz - fz * 0.5;
        this.vx = -fx * v * 0.5; this.vz = -fz * v * 0.5;
        this.bounce = 0.45; this.bounceDir = g.rng() < 0.5 ? 1 : -1;
      }
    }
    if (w.wrap) { this.x = ((this.x % w.sx) + w.sx) % w.sx; this.z = ((this.z % w.sz) + w.sz) % w.sz; }
    else { this.x = clamp(this.x, 4, w.sx - 4); this.z = clamp(this.z, 4, w.sz - 4); }
    this.speed = sp;
    // The nose turns towards the aim point; the body tilts into the drift (forwards: nose down) and wobbles after a bump.
    let dh = Math.atan2(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) - this.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    if (Math.hypot(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) > h * 0.5) this.heading += dh * Math.min(1, dt * 3);
    const fwd = (this.vx * Math.sin(this.heading) + this.vz * Math.cos(this.heading)) / v, side = (this.vx * Math.cos(this.heading) - this.vz * Math.sin(this.heading)) / v;
    pose.climb += (fwd * 0.28 - pose.climb) * Math.min(1, dt * 4);
    pose.bank += (side * 0.32 + (this.bounce > 0 ? this.bounceDir * Math.sin(this.bounce * 30) * 0.3 : 0) - pose.bank) * Math.min(1, dt * 5);
    pose.air = 0; pose.walkAmp = 0;
    let dl = Math.atan2(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) - this.heading - pose.look;
    dl = Math.atan2(Math.sin(dl), Math.cos(dl));
    pose.look += dl * Math.min(1, dt * 10);
    pose.aimPitch += (clamp(Math.atan2(this.y - g.aim.y, Math.hypot(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size))), -0.3, 1.3) - pose.aimPitch) * Math.min(1, dt * 10);
    // Rotor wash: low over the ground it blows dust about; from stage 3 the windows right under it burst.
    const gap = this.y - floor;
    if (gap < h * 1.6 && (this.washT -= dt) <= 0) {
      this.washT = 0.3;
      g.onWash(this, floor, 1 - gap / (h * 1.6));
    }
    locomotion(pose, 'chopper');
  }

  // Ground under (x, z): the top of the earth at or below y0, not counting what is built on it; -1 if there is none
  // within reach below (the edge of an island in the sky).
  groundBelow(x, z, y0, depth = this.h * 2 + 8) {
    const w = this.g.world, ix = Math.floor(x), iz = Math.floor(z), top = Math.min(Math.floor(y0), w.sy - 1), lo = Math.max(0, top - Math.ceil(depth));
    for (let y = top; y >= lo; y--) { const t = w.get(ix, y, iz); if (t && TYPE_FLAGS[t] & F_TERRAIN) return y + 1; }
    return lo > 0 ? -1 : 0;
  }

  // The tentacle. Below the ground it travels fast and unseen (only a bulge of earth moves along), and under a building
  // it digs away at the foundations. Out of the ground it stays where it is and reaches out; the stick leans the whole arm,
  // and leaning on for a moment sends it down again to travel on.
  burrow(dt, mx, mz, aimX, aimZ) {
    const g = this.g, w = g.world, h = this.h, pose = this.pose, size = w.wrap ? w.sx : 0, input = Math.hypot(mx, mz);
    this.onGround = true; this.vy = 0; this.jumps = 0; this.speed = 0;
    this.diveCool -= dt;
    pose.emerge += ((this.under ? 0 : 1) - pose.emerge) * Math.min(1, dt * (this.under ? 10 : 7));
    if (!this.under && pose.emerge > 0.995) pose.emerge = 1;
    if (this.under && pose.emerge < 0.01) pose.emerge = 0;
    const gy = this.groundBelow(this.x, this.z, this.y + h * 0.3);
    if (gy >= 0 && gy < this.y) this.y = Math.max(gy, this.y - (h * 3 + 20) * dt); // the ground under it was blown away: it follows it down
    if (this.under) {
      if (input > 0.05) {
        const wet = w.under || (w.water && w.water.rects.some((q) => this.x >= q[0] && this.x < q[2] && this.z >= q[1] && this.z < q[3]));
        const v = (12 + h * 1.1) * (wet ? 2 : 1) * (this.sprint ? 1.5 : 1) * Math.min(1, input), dx = mx / input, dz = mz / input;
        // Below the ground every rise is just more earth to dig through: out of a crater, up a slope, under a hill.
        // Only where there is no ground at all (the edge of an island in the sky) it cannot go on.
        const nx = this.x + dx * v * dt, nz = this.z + dz * v * dt, ny = this.groundBelow(nx, nz, this.y + h * 3 + 40, h * 5 + 48);
        if (ny >= 0) { this.x = nx; this.z = nz; this.y += (ny - this.y) * Math.min(1, dt * 12); this.speed = v; }
        this.heading += Math.atan2(Math.sin(Math.atan2(dx, dz) - this.heading), Math.cos(Math.atan2(dx, dz) - this.heading)) * Math.min(1, dt * 8);
        pose.walk += dt * v * 0.4;
        if (g.rng() < 0.15) g.onBurrow(this);
        if ((this.rumbleT = (this.rumbleT ?? 0) - dt) <= 0) { this.rumbleT = 3 + g.rng() * 2; g.emote('rumble'); } // ズズズ over the moving ground, now and then
        this.mineT = 0;
      } else {
        if (pose.emote === 'rumble') pose.emote = null; // standing still below the ground: nothing shows where it is
        this.rumbleT = 0;
        // Waiting under a building: the building shakes and its foundations crumble, bit by bit.
        const st = w.structureAt(this.x, this.z);
        if (st && st.major && !st.done && (this.mineT += dt) > 0.8) { this.mineT = 0; g.onUndermine(this, st); }
      }
    } else {
      // The stick leans the arm; held over for a moment, the tentacle goes down to travel.
      const f = input > 0.05 ? (mx * Math.sin(this.heading) + mz * Math.cos(this.heading)) : 0, s = input > 0.05 ? (mx * Math.cos(this.heading) - mz * Math.sin(this.heading)) : 0;
      pose.leanF += (f - pose.leanF) * Math.min(1, dt * 5); pose.leanS += (s - pose.leanS) * Math.min(1, dt * 5);
      if (input > 0.75 && !g.tools.act) { if ((this.leanT += dt) > 0.35) this.dive(); } else this.leanT = 0;
      let dh = Math.atan2(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) - this.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      if (!g.tools.act && Math.hypot(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) > h * 0.3) this.heading += dh * Math.min(1, dt * 4);
    }
    if (w.wrap) { this.x = ((this.x % w.sx) + w.sx) % w.sx; this.z = ((this.z % w.sz) + w.sz) % w.sz; }
    else { this.x = clamp(this.x, 4, w.sx - 4); this.z = clamp(this.z, 4, w.sz - 4); }
    // The tip looks for the aim point: forwards and up from the root, as far as the arm reaches, with a soft delay.
    const k = MODEL_HEIGHT / h, L = SEGS * SEG_LEN, d = Math.hypot(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) * k;
    let f = d, u = (g.aim.y - this.y) * k;
    const len = Math.hypot(f, u) || 1, reach = Math.min(len, L * 0.78);
    f = (f / len) * reach * 0.85; u = Math.max(L * 0.35, (u / len) * reach);
    reachFor(pose, f, u, this.under ? 0 : 2);
    if (this.under) pose.ta.fill(0);
    for (let i = 0; i < SEGS; i++) pose.ts[i] *= 1 - Math.min(1, dt * 3);
    pose.leanF *= this.under ? 0 : 1;
    // Long without anything to do: a little tune, then a nap.
    this.quietT = input > 0.05 || g.tools.act ? 0 : this.quietT + dt;
    if (this.quietT > 9 && !pose.emote && !this.under) g.emote(this.quietT > 24 ? 'sleep' : 'note');
    locomotion(pose, 'tentacle');
  }

  // The big button of the tentacle: down into the ground, or up out of it. Coming up is a blow of its own: the ground bursts
  // open, and under a building the tentacle shoots up through its floors.
  dive() {
    if (this.diveCool > 0) return false;
    this.diveCool = 0.35;
    this.under = true; this.leanT = 0;
    this.g.onDive(this);
    return true;
  }
  surface() {
    if (this.diveCool > 0 || !this.under) return false;
    this.diveCool = 0.3;
    this.under = false; this.pose.squash = -0.8; this.pose.ta.fill(0);
    this.g.onSurface(this, this.g.time - this.eruptT > 1.4);
    this.eruptT = this.g.time;
    return true;
  }

  // mx/mz: desired walking direction in world space (length 0..1). aimX/aimZ: where the head looks.
  update(dt, mx, mz, aimX, aimZ) {
    const g = this.g, w = g.world, h = this.h, pose = this.pose, species = g.progress.species;
    this.h += (this.targetHeight() - h) * Math.min(1, dt * 2.5);
    this.grow = Math.max(0, this.grow - dt * 0.7);
    pose.time += dt;
    if (species === 'jet') { pose.roar = Math.max(0, pose.roar - dt * 1.1); pose.squash = 0; this.flyPlane(dt, aimX, aimZ); return; }
    if (species === 'chopper') { pose.roar = Math.max(0, pose.roar - dt * 1.1); pose.squash = 0; this.hover(dt, mx, mz, aimX, aimZ); return; }
    if (species === 'tentacle') { pose.roar = Math.max(0, pose.roar - dt * 1.1); pose.squash += (0 - pose.squash) * Math.min(1, dt * 7); this.burrow(dt, mx, mz, aimX, aimZ); return; }
    pose.roar = Math.max(0, pose.roar - dt * 1.1);
    pose.squash = Math.max(0, pose.squash - dt * 4);
    pose.air += ((this.onGround ? 0 : 1) - pose.air) * Math.min(1, dt * 12);
    pose.cling += ((this.cling ? 1 : 0) - pose.cling) * Math.min(1, dt * 14);
    if (!this.cling && pose.cling < 0.01) pose.cling = 0;
    if (this.flipT >= 0) { // somersault: one full forward turn, quick in the middle
      this.flipT += dt;
      const t = Math.min(1, this.flipT / FLIP_TIME);
      pose.flip = Math.PI * 2 * t * t * (3 - 2 * t);
      if (t >= 1) { this.flipT = -1; pose.flip = 0; }
    }

    this.stun = Math.max(0, this.stun - dt);
    if (this.pound || this.stun > 0) { mx = 0; mz = 0; } // no steering during a ground pound or while getting up from it
    if (!this.cued && this.poundReady()) { this.cued = true; g.onPoundCue(this); }
    // In the air a ledge up to half the body height is still caught: a jump that almost reaches a roof lands on it.
    const stepH = Math.max(1.5, h * (this.onGround ? 0.3 : 0.5)), r = h * 0.22;
    this.clingCool -= dt;
    if (this.kick) { // pushed off a wall: a short shove backwards
      this.x += this.kick.vx * dt; this.z += this.kick.vz * dt;
      if ((this.kick.t -= dt) <= 0) this.kick = null;
    }
    if (this.cling) {
      // Climbing. The creature hangs on the wall and moves along it: up, down and sideways, round corners too.
      // It only leaves the wall when there is nothing left to hold on to, when its feet reach the ground,
      // when it has pulled itself onto the roof, or with a jump.
      // The climbing speed pulses with the grips: the body moves while the hands hold (Climber.update, last frame).
      const c = this.cling, reach = r + 1.5 + h * 0.2, sp = (8 + h * 2.2) * dt * (this.climbPace ?? 1);
      // Is there something to hold on to? Probed at three depths: a glass front is only one voxel thick, with an empty room behind it.
      const wall = (x, y, z, dx = c.dx, dz = c.dz) => {
        const y0 = this.y;
        this.y = y;
        let hit = false;
        for (const d of [r + 1, r + 1.5 + h * 0.1, reach]) if (this.blocked(x + dx * d, z + dz * d, stepH, dx, dz, r)) { hit = true; break; }
        this.y = y0;
        return hit;
      };
      mx = 0; mz = 0;
      if (!wall(this.x, this.y, this.z)) { this.cling = null; this.clingCool = 0.3; } // the wall is gone
      else {
        if (this.climbV > 0.1) {
          const ny = this.y + this.climbV * sp;
          if (wall(this.x, ny, this.z)) { this.y = ny; c.stuck = 0; }
          else {
            // The top: pull up onto the roof, if there is one within reach.
            // A narrow ledge (the step of a tower that gets slimmer further up) counts as well.
            for (const d of [r * 2 + 2, r + 1.5]) {
              const fx = this.x + c.dx * d, fz = this.z + c.dz * d, top = w.heightBelow(fx, fz, ny + h * 0.8);
              // The roof may lie a little below the feet as well: in the air the wall is felt from half a body height up only.
              if (top < this.y - h * 0.5 || top > ny + h * 0.8) continue;
              this.x = fx; this.z = fz; this.y = top; this.onGround = true; this.jumps = 0; this.cling = null; this.clingCool = 0.4; pose.squash = 0.6;
              break;
            }
            // Nothing found to step onto (a parapet, an odd roof): after a moment the creature vaults over the edge
            // instead of hanging there for ever.
            if (this.cling && (c.stuck = (c.stuck ?? 0) + dt) > 0.4) {
              this.cling = null; this.clingCool = 0.6; this.wallJump = false;
              this.vy = Math.sqrt(2 * this.gravity() * h * 1.2); this.jumps = 1;
              this.kick = { vx: c.dx * h * 2.5, vz: c.dz * h * 2.5, t: 0.4 };
            }
          }
        } else if (this.climbV < -0.1) {
          const ny = this.y + this.climbV * sp, gy = w.heightBelow(this.x, this.z, this.y + 1);
          if (ny <= gy) { this.y = gy; this.onGround = true; this.jumps = 0; this.cling = null; this.clingCool = 0.4; } // feet on the ground
          else if (wall(this.x, ny, this.z)) this.y = ny;
        }
        if (this.cling && Math.abs(this.climbH) > 0.1) {
          const s = Math.sign(this.climbH), tx = -c.dz * s, tz = c.dx * s; // along the wall, to the creature's right or left
          if (this.blocked(this.x + tx * (r + 1 + sp), this.z + tz * (r + 1 + sp), stepH, tx, tz, r)) { c.dx = tx; c.dz = tz; } // inner corner: on to the next wall
          else {
            const nx = this.x + tx * sp, nz = this.z + tz * sp;
            if (wall(nx, this.y, nz)) { this.x = nx; this.z = nz; }
            else {
              // Outer corner: swing round it onto the side of the building.
              const ox = nx + c.dx * (r * 2 + 2) + tx * (r + 1), oz = nz + c.dz * (r * 2 + 2) + tz * (r + 1);
              if (wall(ox, this.y, oz, -tx, -tz)) { this.x = ox; this.z = oz; c.dx = -tx; c.dz = -tz; }
            }
          }
        }
        if (this.cling) {
          this.heading = Math.atan2(c.dx, c.dz);
          const moving = Math.abs(this.climbV) > 0.1 || Math.abs(this.climbH) > 0.1;
          // Hands and feet take hold of the wall one after the other (Climber).
          const len = Math.hypot(this.climbH, this.climbV) || 1;
          this.climbPace = this.climber.update(this, dt, species, moving, moving ? -this.climbH / len : 0, moving ? this.climbV / len : 0);
          pose.climbAmt += ((moving ? 1 : 0) - pose.climbAmt) * Math.min(1, dt * 8);
          pose.climbV = this.climbV; pose.climbH = this.climbH;
          // A heavy creature tears at the wall it climbs: from stage 3 on the claws keep breaking pieces out.
          if (moving && this.stage >= 3 && (c.t += dt) > 1) { c.t = 0; g.onCling(this, c.dx, c.dz, false); }
        }
      }
    }
    const input = Math.hypot(mx, mz);
    this.speed = 0;
    if (this.leaping) {
      this.x += this.leaping.vx * dt; this.z += this.leaping.vz * dt;
    } else if (input > 0.05) {
      // In a jump the creature keeps going where it is steered, and faster than on foot: that is what carries it
      // across a street from one roof to the next. The higher it starts, the longer it flies and the further it gets.
      const air = this.onGround || !this.jumps || tracked(species) ? 1 : this.jumps >= 2 ? AIR_SPEED2 : AIR_SPEED;
      // Wading through open water (the harbour basin) is slow going while the water is above the knees.
      const wet = this.onGround && w.water && this.y < w.water.level - h * 0.25 && w.water.rects.some((q) => this.x >= q[0] && this.x < q[2] && this.z >= q[1] && this.z < q[3]);
      if (wet && g.rng() < 0.5) g.onWade(this, w.water.level);
      const dx = mx / input, dz = mz / input, push = Math.min(1, input) * (this.sprint ? SPRINT : 1) * (wet ? 0.6 : 1);
      // Small creatures are slow on foot and short in the air, so their jumps have a minimum speed of their own
      // (in the world's scale): even the smallest gets across a street with a double jump.
      const v = Math.max((5 + h * 0.9) * air, air === 1 ? 0 : (air === AIR_SPEED2 ? AIR_FLOOR2 : AIR_FLOOR) * w.unit) * push;
      const want = Math.atan2(dx, dz);
      let dh = want - this.heading;
      dh = Math.atan2(Math.sin(dh), Math.cos(dh));
      this.heading += dh * Math.min(1, dt * 10);

      // Whatever is weaker than the monster simply breaks when it walks into it. The way is probed both
      // where the next step lands and a little beyond, so neither a thin pole nor a fast run slips through.
      this.trampleT -= dt; this.shoveT -= dt;
      const nx = this.x + dx * v * dt, nz = this.z + dz * v * dt;
      const px = this.x + dx * (r + 1 + v * dt), pz = this.z + dz * (r + 1 + v * dt);
      let stopped = this.blocked(nx + dx * r, nz + dz * r, stepH, dx, dz, r);
      // A jump that ends at the wall of a building does not just punch through: the creature grabs hold.
      // (Sprinting into a wall still smashes through it.)
      const rising = this.wallJump && !this.onGround && this.vy > 0;
      if (!this.onGround && this.jumps > 0 && !this.pound && this.clingCool <= 0 && !rising && !this.sprint && !tracked(species)
        && (stopped || this.blocked(px, pz, stepH, dx, dz, r)) && w.structureAt(px + dx * 2, pz + dz * 2)?.major) {
        this.cling = { dx, dz, t: 0 };
        this.climber.reset();
        this.wallJump = false;
        this.vy = 0; this.trampleT = 0.3; this.flipT = -1; pose.flip = 0; this.stomping = false;
        stopped = true;
        g.onCling(this, dx, dz, true);
      }
      if (this.trampleT <= 0 && !rising && (stopped || this.blocked(px, pz, stepH, dx, dz, r))) {
        this.trampleT = 0.08;
        g.lastHit.dx = dx; g.lastHit.dz = dz;
        g.destruction.sphere(this.x + dx * h * 0.3, this.y + h * 0.48, this.z + dz * h * 0.3, h * 0.36, (1.5 + this.stage * 1.6) * (this.sprint ? 1.3 : 1),
          { dx, dy: 0.1, dz, impulse: launch(h * 0.9 + 3), debris: 30 });
        // Running into a building at full speed shoves it: if it is shaky enough, it goes over.
        if (this.sprint && this.shoveT <= 0) { this.shoveT = 0.35; g.onShove(this, px + dx * 2, pz + dz * 2, dx, dz, 1); }
        stopped = this.blocked(nx + dx * r, nz + dz * r, stepH, dx, dz, r);
      }
      if (!stopped) { this.x = nx; this.z = nz; this.speed = v; }
      else if (this.cling) { /* held by the wall */ }
      else if (!this.blocked(nx + dx * r, this.z, stepH, dx, 0, r)) this.x = nx;
      else if (!this.blocked(this.x, nz + dz * r, stepH, 0, dz, r)) this.z = nz;

      pose.walk += (dt * v * 5.2) / h;
      pose.walkAmp = Math.min(this.sprint ? 1.4 : 1, pose.walkAmp + dt * 6);
      const half = Math.floor(pose.walk / Math.PI);
      if (half !== this.lastStep && this.onGround) { this.lastStep = half; g.onStep(this); }
    } else pose.walkAmp = Math.max(0, pose.walkAmp - dt * 5);
    if (w.wrap) { this.x = ((this.x % w.sx) + w.sx) % w.sx; this.z = ((this.z % w.sz) + w.sz) % w.sz; }
    else { this.x = clamp(this.x, r + 1, w.sx - r - 1); this.z = clamp(this.z, r + 1, w.sz - r - 1); }

    // Ground: the highest support under the feet that is not taller than a step.
    let gy = 0;
    for (let i = 0; i < 5; i++) {
      const ox = i === 1 ? r : i === 2 ? -r : 0, oz = i === 3 ? r : i === 4 ? -r : 0;
      gy = Math.max(gy, w.heightBelow(this.x + ox * 0.7, this.z + oz * 0.7, this.y + stepH));
    }
    if (this.onGround) {
      if (gy >= this.y) this.y = Math.min(gy, this.y + h * 5 * dt + 0.2);
      else if (gy < this.y - 0.6) { this.onGround = false; this.vy = 0; }
      else this.y = gy;
    } else if (this.cling) this.vy = 0; // hanging: no rising, no falling
    else {
      // Released early: the rise is cut short. Falling is faster than rising. A leap always flies its full arc.
      const held = this.jumpHeld || this.leaping, pd = this.pound;
      if (pd && !pd.falling) { // curl up and hang for a moment, then go straight down at full speed
        pd.t += dt;
        this.vy = 0;
        if (pd.t >= POUND_HANG) { pd.falling = true; this.vy = -Math.sqrt(2 * this.gravity() * h * JUMP_HEIGHT) * POUND_SPEED; }
      } else if (pd) {
        this.vy -= this.gravity() * dt;
        if (g.rng() < 0.7) g.fx.add(this.x + (g.rng() - 0.5) * h * 0.5, this.y + h * (1 + g.rng()), this.z + (g.rng() - 0.5) * h * 0.5, 0, h * 2, 0, h * 0.05 + 0.4, 0, 0.25, 1, 1, 1, 0.6, 1);
      } else {
        this.vy -= this.gravity() * (this.vy > 0 ? (held ? 1 : JUMP_CUT) : FALL_GRAVITY) * dt;
        if (w.under) this.vy = Math.max(this.vy, -h * 0.9 - 3); // sinking, not falling
      }
      this.y += this.vy * dt;
      if (this.y <= gy && this.vy <= 0) {
        this.y = gy;
        if (pd) {
          // The whole weight comes down. If that breaks a floor away, the drop goes on into the next one;
          // on plain ground it ends in a crater instead of digging a shaft.
          const fx = Math.floor(this.x), fz = Math.floor(this.z), st = fx >= 0 && fz >= 0 && fx < w.sx && fz < w.sz ? w.structures[w.footprint[fx + w.sx * fz]] : null;
          const onGroundLevel = !st || !st.major || this.y <= st.y0 + 1; // only floors of a building count, never the ground
          g.onPoundLand(this, pd.chain);
          let below = 0;
          for (let i = 0; i < 5; i++) below = Math.max(below, w.heightBelow(this.x + (i === 1 ? r : i === 2 ? -r : 0) * 0.7, this.z + (i === 3 ? r : i === 4 ? -r : 0) * 0.7, this.y + stepH));
          if (!onGroundLevel && below < this.y - 1 && pd.chain < POUND_CHAIN) { pd.chain++; this.vy *= 0.85; }
          else { this.pound = null; this.stun = POUND_STUN; this.y = below; }
        }
        if (!this.pound) {
          this.onGround = true;
          this.jumps = 0; this.flipT = -1; pose.flip = 0; this.wallJump = false;
          pose.squash = pd ? 1.6 : 1;
          if (this.leaping) { this.leaping = null; g.onLeapLand(this); }
          else if (this.stomping) {
            // On the ground every landing is a stomp. On a roof it only is one while the jump button is held:
            // hopping from roof to roof must not knock a hole into every roof on the way.
            const st = w.structureAt(this.x, this.z), roof = st && st.major && this.y > st.y0 + h * 0.5;
            if (roof && !this.jumpHeld) g.onSoftLand(this); else g.onStompLand(this);
          }
          this.stomping = false; this.flipped = false;
        }
      }
    }

    // The head (or the turret) follows the aim point.
    const size = w.wrap ? w.sx : 0;
    let look = Math.atan2(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) - this.heading;
    look = Math.atan2(Math.sin(look), Math.cos(look));
    if (!tracked(species)) look = clamp(look, -1, 1);
    let dl = look - pose.look;
    if (tracked(species)) dl = Math.atan2(Math.sin(dl), Math.cos(dl));
    pose.look += dl * Math.min(1, dt * (species === 'digger' ? 4 : 8)); // the excavator's upper carriage swings round more slowly
    if (species === 'digger') { // and its arm follows the height of the aim point
      const d = Math.hypot(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size));
      pose.aimPitch += (Math.atan2(g.aim.y - (this.y + h * 0.45), Math.max(d, h * 0.5)) - pose.aimPitch) * Math.min(1, dt * 5);
    }
    locomotion(pose, species);
    this.poundPose(species);
  }

  // Body language of the ground pound: curl into a ball with one quick turn while hanging,
  // then drop seat first, stretched long, arms thrown up; afterwards stay crouched in the crater.
  poundPose(species) {
    const pose = this.pose, j = pose.j, pd = this.pound;
    if (!pd) { if (this.stun > 0) { pose.squash = Math.max(pose.squash, 1.2 * (this.stun / POUND_STUN)); j.torso[0] += 0.35; j.head[0] += 0.2; } return; }
    if (!pd.falling) {
      const t = pd.t / POUND_HANG;
      pose.flip = Math.PI * 2 * t * t * (3 - 2 * t);
      pose.squash = 0.8 * t; // tucked in tight
      if (!tracked(species)) { j.legL[0] = j.legR[0] = -1.5 * t; j.armL[0] = j.armR[0] = -1.2 * t; j.torso[0] += 0.5 * t; j.head[0] += 0.4 * t; j.tail[0] += 0.9 * t; j.tail2[0] += 0.7 * t; }
      return;
    }
    pose.flip = 0;
    pose.squash = -1.1; // stretched by the speed
    if (tracked(species)) { j.torso[0] = 0; j.barrel[0] -= 0.5; return; }
    j.legL[0] = j.legR[0] = -1.45; // sitting position: the seat hits first
    j.armL[0] = j.armR[0] = 0; j.armL[2] = -2.5; j.armR[2] = 2.5;
    j.torso[0] = -0.12; j.head[0] = 0.35; j.jaw[0] += 0.7;
    j.tail[0] = 1.1; j.tail2[0] = 0.6;
  }

  // True if something solid stands between knee and head height at the given spot.
  blocked(px, pz, stepH, dx, dz, r) {
    const w = this.g.world, h = this.h, falling = this.g.bodies.list.length > 0;
    for (let s = -1; s <= 1; s++) {
      const x = px - dz * r * s * 0.8, z = pz + dx * r * s * 0.8;
      for (let k = 0; k < 5; k++) {
        const y = this.y + stepH + 1 + (h * 0.75 - stepH) * (k / 4);
        if (w.get(Math.floor(x), Math.floor(y), Math.floor(z)) || (falling && this.g.bodies.solidAt(x, y, z))) return true; // a building on its way down is in the way too
      }
    }
    return false;
  }
}
