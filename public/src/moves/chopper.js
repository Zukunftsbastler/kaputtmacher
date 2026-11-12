// Moves of one creature (see tools.js for how a move is played).
// Helicopter: gun, rockets, winch and rotor
// From the least to the most spectacular: a gun that nibbles, rockets, the winch that lifts whole cars and swings a
// wrecking ball, and at last the rotor itself: a saw that cuts through a building, and the tornado.

import { pulse, eachShot } from './kit.js';

export default [
  { id: 'guns', icon: '🔫', stage: 1,
    light: { // a burst from the gun under the nose
      wind: 0.04, strike: 0.4, recover: 0.1,
      pose(j, p, a, b) { j.barrel[5] -= Math.abs(Math.sin(b * 20)) * 1.4 * (b > 0 && b < 1 ? 1 : 0); },
      tick(T, act, dt, b0, b1) { eachShot(b0, b1, 5, () => { const B = T.base(); T.bolt(T.nose(), T.g.aim, 0.6 + B.S * 0.08 + B.H * 0.012, 3 + B.S * 0.35, 1, 0.85, 0.3); T.g.audio.hit('metal', 0.2); }); },
    },
    heavy: { // circling: once round the aimed spot at the same height, firing inwards all the way
      wind: 0.3, strike: 2.6, recover: 0.3,
      pose(j, p, a, b, c, act) { const on = b > 0 ? 1 - c : a * 0.3; j.torso[2] -= 0.35 * on * act.side; j.barrel[5] -= Math.abs(Math.sin(b * 60)) * 1.4 * (b > 0 && b < 1 ? 1 : 0); },
      begin(T, act) { T.circle(act); },
      tick(T, act, dt, b0, b1) {
        T.orbit(act, b1);
        eachShot(b0, b1, 16, () => {
          const B = T.base(), r = T.g.rng, s = B.H * 0.15 + 2;
          T.tgt.x = act.ax + (r() - 0.5) * s; T.tgt.y = act.ay + (r() - 0.5) * s; T.tgt.z = act.az + (r() - 0.5) * s;
          T.bolt(T.nose(), T.tgt, 0.6 + B.S * 0.08 + B.H * 0.012, 3 + B.S * 0.35, 1, 0.85, 0.3); T.g.audio.hit('metal', 0.15);
        });
      },
      end(T) { T.driven = false; },
    } },
  { id: 'rockets', icon: '🚀', stage: 3,
    light: { // a pair of rockets, one from each pod
      wind: 0.1, strike: 0.25, recover: 0.2,
      pose(j, p, a, b) { j.pods[5] -= 1.2 * pulse(b); j.torso[0] -= 0.05 * pulse(b); },
      tick(T, act, dt, b0, b1) { eachShot(b0, b1, 2, (k) => { const B = T.base(), o = T.at(T.o, 0.22, 0.1, k ? 0.32 : -0.32); T.rocket(o, T.g.aim, 4 + B.S * 0.9, 12 + B.S * 2, 70); }); },
    },
    heavy: { // salvo: both pods empty themselves, the rockets climb and come down all over the target
      wind: 0.35, strike: 0.7, recover: 0.3,
      pose(j, p, a, b, c) { j.torso[0] -= 0.12 * a * (1 - c); j.pods[5] -= Math.abs(Math.sin(b * 25)) * 0.8 * (b > 0 && b < 1 ? 1 : 0); },
      tick(T, act, dt, b0, b1) {
        eachShot(b0, b1, 8, (k) => { const B = T.base(), o = T.at(T.o, 0.22, 0.1, k % 2 ? 0.32 : -0.32), aim = T.g.aim, r = T.g.rng, s = B.H * 0.55 + 7; T.tgt.x = aim.x + (r() - 0.5) * 2 * s; T.tgt.y = aim.y; T.tgt.z = aim.z + (r() - 0.5) * 2 * s; T.rocket(o, T.tgt, 5 + B.S, 13 + B.S * 2, 60, true); });
      },
    } },
  { id: 'winch', icon: '🪝', stage: 5,
    light: { // the hook: down on the rope, takes hold of what is there and lifts it. Once more: let go
      wind: 0.12, strike: 0.45, recover: 0.25, hitAt: 0.9,
      pose(j, p, a, b) { j.winch[4] -= 0.6 * pulse(b); },
      begin(T, act) { if (T.held) { act.drop = true; T.dropLoad(); } else T.lowerHook(act); },
      hit(T, act) { if (!act.drop) T.hookGrab(act); },
    },
    heavy: { // the wrecking ball: a steel ball on the rope that swings along behind; flown past a building, it smashes into it
      wind: 0.3, strike: 0.3, recover: 0.25, hitAt: 0.3,
      pose(j, p, a, b) { j.winch[4] -= 0.6 * pulse(b); },
      hit(T) { if (T.held) T.dropLoad(); if (T.rope?.ball) T.stow(); else T.lowerBall(); },
    } },
  { id: 'rotor', icon: '🌪️', stage: 7,
    light: { // rotor saw: the nose goes down, the blades cut to and fro through whatever stands in front, and it pushes on into the cut
      wind: 0.35, strike: 1.3, recover: 0.4,
      pose(j, p, a, b, c) { const on = a * (1 - c); j.torso[0] += 0.75 * on; j.rotor[1] += p.time * 30 * on; p.hop -= 2 * on; },
      tick(T, act, dt, b0, b1) { T.saw(act, b0, b1); },
    },
    heavy: { // tornado: it spins faster and faster until a whirlwind forms under it; the tornado follows the aim point
      wind: 1.0, strike: 0.25, recover: 0.4,
      pose(j, p, a, b, c) { p.spin = Math.PI * 6 * a * a * (1 - c); j.torso[2] += 0.35 * a * (1 - c); p.hop += 3 * a * (1 - c); },
      windTick(T) { const m = T.g.monster, r = T.g.rng, a = r() * 6.283, d = m.h * (0.6 + r()); T.g.fx.add(m.x + Math.cos(a) * d, m.y - r() * m.h, m.z + Math.sin(a) * d, -Math.sin(a) * m.h * 2, m.h * 0.5, Math.cos(a) * m.h * 2, 0.8 + m.h * 0.05, m.h * 0.04, 0.7, 0.78, 0.76, 0.72, 0.7, 0, 0, 1); },
      hit(T) { const B = T.base(), m = T.g.monster; T.vortex(m.x, m.z, T.g.aim.x, T.g.aim.z, 8, B.H * 0.42 + 5, B.H * 2.8 + 10, B.R * 0.8, B.P * 1.1, true); T.g.shake(0.4); },
    } },
];
