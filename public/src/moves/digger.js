// Moves of one creature (see tools.js for how a move is played).
// Excavator: bucket, swing, breaker and blade
// Everything happens at the end of the arm: it reaches as far as boom and stick go (about one and a half body heights), never further. The upper
// carriage turns towards the target while the tracks keep their course; only the dozer push moves the whole machine.

import { ease, snap, eachShot, charge } from './kit.js';
import { clamp } from '../math.js';
import { launch } from '../particles.js';

export default [
  { id: 'scoop', icon: '🪣', stage: 1,
    light: { // dig: the bucket opens far out, then the stick pulls it in and it curls up, tearing out what it meets
      wind: 0.22, strike: 0.32, recover: 0.26,
      pose(j, p, a, b, c) {
        const out = a * (1 - snap(b)), pull = snap(b) * (1 - c);
        j.boom[0] += -0.35 * out + 0.45 * pull; j.stick[0] += -0.7 * out + 0.8 * pull; j.bucket[0] += 0.8 * out - 1.1 * pull;
      },
      tick(T, act, dt, b0, b1) {
        eachShot(b0, b1, 3, (k) => { const B = T.base(), q = T.reachHit(act, 0.3, 1.45 - k * 0.15); if (T.blow(q[0], q[1] - k * B.H * 0.05, q[2], B.R * 0.85, B.P * 1.1, false, -T.dx, -T.dz, false, 14)) T.g.audio.hit('stone', 0.3); });
      },
    },
    heavy: { // bucket slam: the boom goes up as high as it can, and the bucket comes down on the target with the whole arm
      wind: 0.55, strike: 0.14, recover: 0.45, hitAt: 0.7,
      pose(j, p, a, b, c) {
        const up = a * (1 - snap(b)), down = snap(b) * (1 - c);
        j.boom[0] += -1.0 * up + 0.7 * down; j.stick[0] += -0.6 * up + 0.2 * down; j.bucket[0] += 0.6 * up - 0.2 * down;
        j.torso[0] += 0.08 * down; p.squash = 0.25 * down;
      },
      hit(T, act) {
        const B = T.base(), q = T.reachHit(act, 0.35, 1.4, true);
        T.blow(q[0], q[1], q[2], B.R * 1.4, B.P * 1.6, true, T.dx, T.dz);
        T.shock(q[0], q[1], q[2], B.H * 0.3, B.R * 0.55, B.P * 0.7, 6);
      },
    } },
  { id: 'hammer', icon: '🔨', stage: 3,
    light: { // hydraulic breaker: a quick series of blows with the chisel, each one deep
      wind: 0.2, strike: 0.6, recover: 0.2,
      pose(j, p, a, b, c) { const on = a * (1 - c), rattle = b > 0 && b < 1 ? Math.sin(b * 90) * 0.06 : 0; j.boom[0] += -0.1 * on; j.stick[0] += -0.35 * on; j.breaker[0] += -0.4 * on + rattle; p.hop += Math.abs(rattle) * 3; },
      tick(T, act, dt, b0, b1) { eachShot(b0, b1, 10, (k) => T.chisel(act, 1.9, 2, 5, k % 3 === 2, 0.004)); },
    },
    heavy: { // break through: a long hammering that drives the chisel deep into the building, floor after floor
      wind: 0.4, strike: 1.5, recover: 0.4,
      pose(j, p, a, b, c) { const on = a * (1 - c), rattle = b > 0 && b < 1 ? Math.sin(b * 160) * 0.07 : 0; j.boom[0] += -0.3 * on + 0.4 * b * (1 - c); j.stick[0] += -0.2 * on; j.breaker[0] += -0.2 * on + rattle; p.hop += Math.abs(rattle) * 4; p.squash = 0.15 * on; },
      tick(T, act, dt, b0, b1) { eachShot(b0, b1, 16, (k) => { T.chisel(act, 1.7, 2.3, 6 + k * 0.8, k % 2 === 1, 0.008); T.g.shake(0.1); }); },
    } },
  { id: 'swing', icon: '🔄', stage: 5,
    light: { // slew swipe: the upper carriage swings across with the arm stretched out
      wind: 0.22, strike: 0.3, recover: 0.3,
      turn: (a, b, c) => -0.75 * a * (1 - b) + (1.5 * snap(b) - 0.75) * (b > 0 ? 1 : 0) * (1 - 0.9 * ease(c)),
      pose(j, p, a, b, c, act) { const on = a * (1 - c); j.turret[1] += this.turn(a, b, c) * act.side; j.boom[0] += -0.15 * on; j.stick[0] += -0.55 * on; j.bucket[0] += 0.3 * on; },
      tick(T, act, dt, b0, b1) { T.armSweep(act, this, b0, b1, [0.55, 0.85, 1.1], 0.75, 1, false); },
    },
    heavy: { // carousel: one full turn of the upper carriage with the arm at full stretch
      wind: 0.45, strike: 0.85, recover: 0.4,
      turn: (a, b) => -0.5 * a * (1 - b) + (Math.PI * 2 + 0.5) * snap(b) - 0.5 * (b > 0 ? 1 : 0),
      pose(j, p, a, b, c, act) { const on = a * (1 - c); j.turret[1] += this.turn(a, b, c) * act.side; j.boom[0] += -0.1 * on; j.stick[0] += -0.75 * on; j.bucket[0] += 0.5 * on; p.squash = 0.15 * on; },
      tick(T, act, dt, b0, b1) { T.armSweep(act, this, b0, b1, [0.55, 0.85, 1.15, 1.4], 1.05, 1.4, true); },
      end(T) { const m = T.g.monster; T.g.debris.blast(m.x, m.y, m.z, m.h * 2, launch(m.h * 1.2)); },
    } },
  { id: 'load', icon: '🏗️', stage: 7,
    light: { // load and dump: a full bucket from the ground in front, swung round and emptied on the target
      wind: 0.35, strike: 0.5, recover: 0.35, hitAt: 0.8,
      pose(j, p, a, b, c) {
        const dig = a * (1 - Math.min(1, b * 3)), lift = Math.min(1, b * 3) * (1 - snap(clamp((b - 0.75) * 4, 0, 1))), dump = b > 0.75 ? 1 - c : 0;
        j.boom[0] += 0.45 * dig - 0.9 * lift - 0.6 * dump; j.stick[0] += 0.3 * dig + 0.3 * lift - 0.5 * dump; j.bucket[0] += 0.7 * dig - 1.0 * lift + 1.4 * dump;
      },
      begin(T, act) { const B = T.base(), q = T.reachHit(act, 0.1, 0.9, true); T.grab(q[0], q[1], q[2], clamp(B.H * 0.3, 2.5, 15)); T.g.audio.crack(0.6); },
      tick(T) { if (T.held) { const o = T.at(T.o, 0.85, 0.9, 0, T.turretYaw()); T.held.pos[0] = o[0]; T.held.pos[1] = o[1]; T.held.pos[2] = o[2]; } },
      hit(T) { T.release(1.3, true); },
    },
    heavy: charge(6, 1.15, 1.6, 4, 0.5, 0.9), // dozer push: blade down, full throttle, through everything ahead
  }
];
