// Body language: the pose of every joint, the walk, breathing and looking that are always on, the tentacle's reach,
// and the matrix of each model part.

import { clamp, m4 } from './math.js';
import { SEGS, SEG_LEN, SEG_NAMES } from './species.js';
import { JOINTS } from './models.js';
import { climbPose } from './climb.js';

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
