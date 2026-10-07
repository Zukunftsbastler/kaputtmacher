// The player's creature: a jointed voxel model that changes shape with every power stage,
// its body language (walking, breathing, looking, jumping) and the controller that moves it through the world.
// Attack animations are layered on top by tools.js.

import { meshVolume } from './mesher.js';
import { clamp, wrapDelta, m4 } from './math.js';
import { GRAVITY, launch } from './particles.js';

export const SPECIES = [
  { id: 'dino', icon: '🦖', skin: [0x4caf50, 0x2a9d4a], belly: 0xdce775, dark: 0xf57c00 },
  { id: 'gorilla', icon: '🦍', skin: [0x5d5d66, 0x26262c], belly: 0xb8956a, dark: 0x1a1a1e },
  { id: 'robot', icon: '🤖', skin: [0x6f9fd8, 0x3d4f7a], belly: 0xcfd8dc, dark: 0x263238 },
  { id: 'tank', icon: '🪖', skin: [0x7c8f45, 0x55662e], belly: 0x9aa860, dark: 0x2b2f25 },
  { id: 'jet', icon: '✈️', skin: [0xdfe4e8, 0xa9b4bd], belly: 0x3f7fc0, dark: 0x2d3436 },
];

// Height factor per stage, relative to a stage-1 monster. Grows without limit.
const SCALE = [1, 1.6, 2.6, 3.8, 6, 9, 14, 20, 30];
export const stageScale = (s) => (s <= 9 ? SCALE[s - 1] : 30 * 1.25 ** (s - 9));
// Power needed to leave a stage. The first growth comes quickly; after that the steps follow the size of the worlds.
const NEED = [1200, 8000, 40000, 120000, 320000, 800000, 2000000, 4500000];
export const stageNeed = (s) => (s <= 8 ? NEED[s - 1] : 4500000 * 1.7 ** (s - 8));

export const MODEL_HEIGHT = 28;
// Jumping works like in a classic platformer: hold the button for the full height, tap for a hop,
// rise fast, fall faster, steer freely in the air.
const JUMP_HEIGHT = 3.2; // apex of a full jump in monster heights
const JUMP_CUT = 3; // extra gravity while rising with the button released
const FALL_GRAVITY = 1.7; // extra gravity on the way down
const SPRINT = 1.75;

const C = { SKIN: 1, BELLY: 2, DARK: 3, WHITE: 4, EYE: 5, TEETH: 6, ARMOR: 7, GLOW: 8 };
// Every joint has three rotations (x, y, z) and an offset (x, y, z) in model units.
export const JOINTS = ['torso', 'head', 'jaw', 'armL', 'armR', 'legL', 'legR', 'tail', 'tail2', 'turret', 'barrel', 'pods'];

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
  put(C.TEETH, [255, 255, 240]);
  put(C.ARMOR, [70, 74, 86]);
  put(C.GLOW, stage >= 8 ? [255, 140, 30] : [255, 210, 60], 230);
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
  if (sp.id !== 'tank' && sp.id !== 'jet') {
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
    parts.push({ name, data: mesh.data, quads: mesh.quads, chain });
  }
  return { parts, pivots, species: sp.id, stage };
}

export function newPose() {
  const j = {};
  for (const n of JOINTS) j[n] = new Float32Array(6);
  // spin/pitch: whole-body yaw and pitch. hop/fwd: whole-body offset in model units. look: where the head turns.
  // bank/climb: how the aircraft leans into a turn and points its nose.
  return { walk: 0, walkAmp: 0, time: 0, squash: 0, spin: 0, pitch: 0, hop: 0, fwd: 0, roar: 0, hold: 0, look: 0, air: 0, bank: 0, climb: 0, j };
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
    pose.hop = Math.sin(t * 2.1) * 0.4;
    return;
  }
  if (species === 'tank') {
    pose.hop = Math.abs(w2) * 0.25;
    j.torso[0] = w2 * 0.02 - pose.air * 0.15;
    j.turret[1] = pose.look;
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
  if (pose.hold) { j.armL[0] -= 2.9 * pose.hold; j.armR[0] -= 2.9 * pose.hold; j.torso[0] -= 0.15 * pose.hold; }
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
    this.steer = 0; this.pitchIn = 0; // aircraft controls: turn and climb, -1..1
    this.homing = false; // aircraft has left an island and is turning back
  }

  targetHeight() {
    const w = this.g.world;
    return Math.min(w.monsterBase * stageScale(this.stage), w.sy * 0.92);
  }

  place(x, y, z, heading) {
    this.x = x; this.y = y; this.z = z; this.heading = heading;
    this.vy = 0; this.leaping = null; this.onGround = true;
    this.h = this.targetHeight();
    if (this.g.progress.species === 'jet') { this.y = y + 40 + this.h; this.onGround = false; } // the aircraft starts in the air
  }

  faceTo(x, z) {
    const size = this.g.world.wrap ? this.g.world.sx : 0;
    const dx = wrapDelta(x - this.x, size), dz = wrapDelta(z - this.z, size);
    if (dx * dx + dz * dz > 1) this.heading = Math.atan2(dx, dz);
  }

  // Big monsters fall faster, so a jump takes about as long at every size instead of floating.
  gravity() { return GRAVITY * 2 * Math.max(1, this.h / 14); }

  jump() {
    if (!this.onGround) return false;
    this.vy = Math.sqrt(2 * this.gravity() * this.h * JUMP_HEIGHT);
    this.onGround = false;
    this.stomping = true;
    return true;
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
  flyPlane(dt) {
    const g = this.g, w = g.world, h = this.h, pose = this.pose;
    const v = (42 + h * 1.3) * (this.sprint ? 1.7 : 1), fx = Math.sin(this.heading), fz = Math.cos(this.heading);
    this.speed = v; this.onGround = false;
    this.x += fx * v * dt; this.z += fz * v * dt;
    this.y = clamp(this.y + this.pitchIn * (24 + h * 0.7) * dt, 3 + h * 0.3, w.sy + 70);
    const floor = w.heightBelow(this.x, this.z, this.y) + h * 0.3 + 1;
    if (this.y < floor) this.y += (floor - this.y) * Math.min(1, dt * 8);
    // Nose first into a building: straight through.
    this.trampleT -= dt;
    const nx = this.x + fx * h * 0.8, nz = this.z + fz * h * 0.8;
    if (this.trampleT <= 0 && w.get(Math.floor(nx), Math.floor(this.y), Math.floor(nz))) {
      this.trampleT = 0.06;
      g.lastHit.dx = fx; g.lastHit.dz = fz;
      g.destruction.sphere(nx, this.y, nz, h * 0.5 + 2, 6 + this.stage * 2, { dx: fx, dy: 0.1, dz: fz, impulse: launch(h * 1.5 + 8), debris: 50 });
      g.shake(0.25);
    }
    if (w.wrap) { this.x = ((this.x % w.sx) + w.sx) % w.sx; this.z = ((this.z % w.sz) + w.sz) % w.sz; }
    else this.homing = this.x < 20 || this.z < 20 || this.x > w.sx - 20 || this.z > w.sz - 20; // islands end: turn back
    pose.bank += (this.steer * 0.75 - pose.bank) * Math.min(1, dt * 5);
    pose.climb += (-this.pitchIn * 0.4 - pose.climb) * Math.min(1, dt * 5);
    pose.air = 0; pose.walkAmp = 0;
    locomotion(pose, 'jet');
  }

  // mx/mz: desired walking direction in world space (length 0..1). aimX/aimZ: where the head looks.
  update(dt, mx, mz, aimX, aimZ) {
    const g = this.g, w = g.world, h = this.h, pose = this.pose, species = g.progress.species;
    this.h += (this.targetHeight() - h) * Math.min(1, dt * 2.5);
    this.grow = Math.max(0, this.grow - dt * 0.7);
    pose.time += dt;
    if (species === 'jet') { pose.roar = Math.max(0, pose.roar - dt * 1.1); pose.squash = 0; this.flyPlane(dt); return; }
    pose.roar = Math.max(0, pose.roar - dt * 1.1);
    pose.squash = Math.max(0, pose.squash - dt * 4);
    pose.air += ((this.onGround ? 0 : 1) - pose.air) * Math.min(1, dt * 12);

    const input = Math.hypot(mx, mz), stepH = Math.max(1.5, h * 0.3), r = h * 0.22;
    this.speed = 0;
    if (this.leaping) {
      this.x += this.leaping.vx * dt; this.z += this.leaping.vz * dt;
    } else if (input > 0.05) {
      const dx = mx / input, dz = mz / input, v = (5 + h * 0.9) * Math.min(1, input) * (this.sprint ? SPRINT : 1);
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
      if (this.trampleT <= 0 && (stopped || this.blocked(px, pz, stepH, dx, dz, r))) {
        this.trampleT = 0.08;
        g.lastHit.dx = dx; g.lastHit.dz = dz;
        g.destruction.sphere(this.x + dx * h * 0.3, this.y + h * 0.48, this.z + dz * h * 0.3, h * 0.36, (1.5 + this.stage * 1.6) * (this.sprint ? 1.3 : 1),
          { dx, dy: 0.1, dz, impulse: launch(h * 0.9 + 3), debris: 30 });
        // Running into a building at full speed shoves it: if it is shaky enough, it goes over.
        if (this.sprint && this.shoveT <= 0) { this.shoveT = 0.35; g.onShove(this, px + dx * 2, pz + dz * 2, dx, dz, 1); }
        stopped = this.blocked(nx + dx * r, nz + dz * r, stepH, dx, dz, r);
      }
      if (!stopped) { this.x = nx; this.z = nz; this.speed = v; }
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
    } else {
      // Released early: the rise is cut short. Falling is faster than rising. A leap always flies its full arc.
      const held = this.jumpHeld || this.leaping;
      this.vy -= this.gravity() * (this.vy > 0 ? (held ? 1 : JUMP_CUT) : FALL_GRAVITY) * dt;
      this.y += this.vy * dt;
      if (this.y <= gy && this.vy <= 0) {
        this.y = gy;
        this.onGround = true;
        pose.squash = 1;
        if (this.leaping) { this.leaping = null; g.onLeapLand(this); }
        else if (this.stomping) g.onStompLand(this);
        this.stomping = false;
      }
    }

    // The head (or the turret) follows the aim point.
    const size = w.wrap ? w.sx : 0;
    let look = Math.atan2(wrapDelta(aimX - this.x, size), wrapDelta(aimZ - this.z, size)) - this.heading;
    look = Math.atan2(Math.sin(look), Math.cos(look));
    if (species !== 'tank') look = clamp(look, -1, 1);
    let dl = look - pose.look;
    if (species === 'tank') dl = Math.atan2(Math.sin(dl), Math.cos(dl));
    pose.look += dl * Math.min(1, dt * 8);
    locomotion(pose, species);
  }

  // True if something solid stands between knee and head height at the given spot.
  blocked(px, pz, stepH, dx, dz, r) {
    const w = this.g.world, h = this.h;
    for (let s = -1; s <= 1; s++) {
      const x = px - dz * r * s * 0.8, z = pz + dx * r * s * 0.8;
      for (let k = 0; k < 5; k++) if (w.get(Math.floor(x), Math.floor(this.y + stepH + 1 + (h * 0.75 - stepH) * (k / 4)), Math.floor(z))) return true;
    }
    return false;
  }
}
