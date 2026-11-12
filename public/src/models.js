// The creatures' jointed voxel models, one for every stage, and the tentacle's manga emoticons.

import { meshVolume } from './mesher.js';
import { clamp } from './math.js';
import { SPECIES, SEGS, SEG_LEN, SEG_NAMES } from './species.js';

const C = { SKIN: 1, BELLY: 2, DARK: 3, WHITE: 4, EYE: 5, TEETH: 6, ARMOR: 7, GLOW: 8, RED: 9, BLUE: 10, PINK: 11, GOLD: 12, INK: 13, MUD: 14, SOIL: 15, VIOLET: 16, ORANGE: 17, EARTH: 18, BUBBLE: 19, OUTLINE: 20, PAPER: 21 };
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
export const EMOTE_TIME = 1.7; // seconds an emoticon of the tentacle stays up (main.js, game-view.js)
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
