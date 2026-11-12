// Moves of one creature (see tools.js for how a move is played).
// Robot: light and rockets, never a fist.
// It starts with the blade, which only reaches as far as its arm; what works from afar comes later, the cutting beam last.

import { ease, snap, pulse, eachShot } from './kit.js';

export default [
  { id: 'blade', icon: '⚔️', stage: 1,
    light: { // laser blade: one clean cut
      wind: 0.16, strike: 0.22, recover: 0.22, root: true,
      pose(j, p, a, b, c, act) { const s = act.side, on = a * (1 - c); j.armR[0] -= 1.5 * on; j.armR[1] += (1.1 - 2.2 * snap(b)) * s * on; j.torso[1] += (0.6 - 1.2 * snap(b)) * s * on; },
      tick(T, act, dt, b0, b1) { T.cut(act, act.heading + act.side * (b1 - 0.5) * 2.3, act.heading + act.side * (b0 - 0.5) * 2.3, 0, b1); },
    },
    heavy: { // rotor cut: spins twice with the blade out, the second turn higher than the first
      wind: 0.42, strike: 0.75, recover: 0.4, root: true,
      pose(j, p, a, b, c) { p.spin = -0.8 * a * (1 - Math.min(1, b * 4)) + Math.PI * 4 * ease(b); j.armR[0] -= 1.55 * a * (1 - c); j.armL[0] -= 1.55 * a * (1 - c); j.armL[1] += 3.14 * a * (1 - c); p.squash = 0.3 * a * (1 - b); p.hop += 2 * pulse(b); },
      tick(T, act, dt, b0, b1) { T.cut(act, act.heading + Math.PI * 4 * ease(b1), act.heading + Math.PI * 4 * ease(b0), b1 > 0.5 ? 0.28 : 0, b1); },
    } },
  { id: 'orbital', icon: '🛰️', stage: 3,
    light: { // scatters three plasma mines
      wind: 0.2, strike: 0.2, recover: 0.22,
      pose(j, p, a, b, c) { j.armL[0] -= 2.2 * snap(b) * (1 - c) - 0.6 * a * (1 - b); j.torso[0] += 0.2 * snap(b) * (1 - c); },
      hit(T) { const B = T.base(), aim = T.g.aim, r = T.g.rng; for (let k = 0; k < 3; k++) { T.tgt.x = aim.x + (r() - 0.5) * (B.H * 0.6 + 8); T.tgt.y = aim.y; T.tgt.z = aim.z + (r() - 0.5) * (B.H * 0.6 + 8); T.mine(T.at(T.o, 0.8, 0.2, -0.3), T.tgt, 5 + B.S, 12 + B.S * 2, 1 + k * 0.3); } },
    },
    heavy: { // orbital strike: points at the sky, a column of light comes down on the marked spot
      wind: 0.7, strike: 0.2, recover: 0.6, root: true,
      pose(j, p, a, b, c) { const on = a * (1 - c); j.armR[0] -= 3.0 * on; j.head[0] -= 0.45 * on; j.torso[0] -= 0.15 * on; j.armL[2] -= 0.4 * on; },
      hit(T) { const B = T.base(), aim = T.g.aim; T.skyStrike(aim.x, aim.y, aim.z, B.H * 0.22 + 4, 8 + B.S * 1.6, 16 + B.S * 2); },
    } },
  { id: 'rockets', icon: '🚀', stage: 5,
    light: {
      wind: 0.16, strike: 0.1, recover: 0.22,
      pose(j, p, a, b, c) { const on = a * (1 - c); j.pods[0] -= 0.45 * on; j.torso[0] -= 0.1 * on + 0.15 * pulse(b); },
      hit(T, act) { const B = T.base(), o = T.at(T.o, 0.84, 0.05, 0.3 * act.side); T.rocket(o, T.g.aim, 4 + B.S * 0.9, 12 + B.S * 2, 55); },
    },
    heavy: { // salvo: both pods empty themselves over the target area
      wind: 0.5, strike: 0.7, recover: 0.4, root: true,
      pose(j, p, a, b, c) {
        const on = a * (1 - c), kick = Math.abs(Math.sin(b * 25)) * (b > 0 && c === 0 ? 1 : 0);
        j.pods[0] -= 0.7 * on; j.torso[0] += -0.2 * on - 0.12 * kick; p.squash = 0.35 * on; j.armL[2] -= 0.5 * on; j.armR[2] += 0.5 * on; j.head[0] -= 0.2 * on;
      },
      tick(T, act, dt, b0, b1) {
        eachShot(b0, b1, 8, (k) => {
          const B = T.base(), o = T.at(T.o, 0.86, 0.05, k % 2 ? 0.3 : -0.3), aim = T.g.aim, r = T.g.rng, spread = B.H * 0.55 + 7;
          T.tgt.x = aim.x + (r() - 0.5) * 2 * spread; T.tgt.y = aim.y + (r() - 0.3) * spread * 0.6; T.tgt.z = aim.z + (r() - 0.5) * 2 * spread;
          T.rocket(o, T.tgt, 5 + B.S, 13 + B.S * 2, 40, true);
          T.g.shake(0.1);
        });
      },
    } },
  { id: 'laser', icon: '⚡', stage: 7,
    light: { // three short pulses from the arm cannon
      wind: 0.1, strike: 0.26, recover: 0.12,
      pose(j, p, a, b, c) { const on = a * (1 - c); j.armR[0] -= 1.5 * on - Math.abs(Math.sin(b * 9.4)) * 0.2; j.torso[1] -= 0.25 * on; j.head[0] += 0.1 * on; },
      tick(T, act, dt, b0, b1) {
        eachShot(b0, b1, 3, () => { const B = T.base(), o = T.at(T.o, 0.52, 0.35, 0.3); T.bolt(o, T.g.aim, 0.55 + B.S * 0.07 + B.H * 0.012, 3 + B.S * 0.35, 1, 0.25, 0.2); T.g.audio.laser(); });
      },
    },
    heavy: { // cutting beam: charges, then sweeps a line across whatever it is aimed at
      wind: 0.6, strike: 1.15, recover: 0.38, root: true,
      pose(j, p, a, b, c) {
        const on = b > 0 ? 1 - c : 0;
        j.torso[0] += -0.25 * a * (1 - on) + 0.12 * on; j.head[0] += -0.3 * a * (1 - on) + 0.1 * on; j.head[1] += (b - 0.5) * 0.9 * on;
        j.armL[2] -= 0.7 * a * (1 - c); j.armR[2] += 0.7 * a * (1 - c); j.armL[0] += 0.4 * on; j.armR[0] += 0.4 * on;
        p.squash = 0.2 * on; j.pods[0] -= 0.2 * on;
      },
      windTick(T) { const m = T.g.monster, o = T.at(T.o, 0.9, 0.25), r = T.g.rng; T.g.fx.add(o[0] + (r() - 0.5) * m.h, o[1] + (r() - 0.5) * m.h, o[2] + (r() - 0.5) * m.h, 0, 0, 0, m.h * 0.04 + 0.4, 0, 0.3, 1, 0.3, 0.2, 1, 1, 0, 0, 1); },
      tick(T, act, dt, b0, b1) {
        const B = T.base(), o = T.at(T.o, 0.9, 0.25), aim = T.g.aim;
        // The beam swings from left to right through the aimed point.
        const dx = aim.x - o[0], dz = aim.z - o[2], off = (b1 - 0.5) * 0.9, cs = Math.cos(off), sn = Math.sin(off);
        T.tgt.x = o[0] + dx * cs + dz * sn; T.tgt.y = aim.y; T.tgt.z = o[2] - dx * sn + dz * cs;
        T.ray(o, T.tgt, 0.85 + B.S * 0.12 + B.H * 0.016, 9 + B.S, 1, 0.2, 0.15, true, dt);
      },
    } },
];
