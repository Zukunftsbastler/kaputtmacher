// Moves of one creature (see tools.js for how a move is played).
// Aircraft: guns ahead, bombs below

import { pulse, eachShot } from './kit.js';

export default [
  { id: 'guns', icon: '🔫', stage: 1,
    light: { // a burst from the twin guns of the belly turret
      wind: 0.04, strike: 0.4, recover: 0.08,
      pose(j, p, a, b) { j.barrel[5] -= Math.abs(Math.sin(b * 22)) * 1.5 * (b > 0 && b < 1 ? 1 : 0); },
      tick(T, act, dt, b0, b1) { eachShot(b0, b1, 6, () => { const B = T.base(), o = T.gun(); T.bolt(o, T.g.aim, 0.6 + B.S * 0.08 + B.H * 0.012, 3 + B.S * 0.35, 1, 0.85, 0.3); T.g.audio.hit('metal', 0.2); }); },
    },
    heavy: { // one bomb, released from the belly
      wind: 0.25, strike: 0.1, recover: 0.3,
      pose(j, p, a, b, c) { j.torso[0] += 0.12 * a * (1 - c); j.torso[4] += 1.5 * pulse(b); },
      hit(T) { const B = T.base(); T.bomb(6 + B.S * 1.3, 13 + B.S * 2, 0); },
    } },
  { id: 'rockets', icon: '🚀', stage: 3,
    light: {
      wind: 0.1, strike: 0.1, recover: 0.2,
      pose(j, p, a, b) { j.pods[5] -= 1.2 * pulse(b); },
      hit(T, act) { const B = T.base(), o = T.at(T.o, 0.09, 0.16, 0.2 * act.side, T.turretYaw()); T.rocket(o, T.g.aim, 4 + B.S * 0.9, 12 + B.S * 2, 70); },
    },
    heavy: { // salvo from both pods of the launcher
      wind: 0.35, strike: 0.6, recover: 0.3,
      pose(j, p, a, b, c) { j.torso[0] -= 0.15 * a * (1 - c); j.pods[5] -= Math.abs(Math.sin(b * 25)) * 0.8 * (b > 0 && b < 1 ? 1 : 0); },
      tick(T, act, dt, b0, b1) {
        eachShot(b0, b1, 8, (k) => { const B = T.base(), o = T.at(T.o, 0.09, 0.16, k % 2 ? 0.2 : -0.2, T.turretYaw()), aim = T.g.aim, r = T.g.rng, s = B.H * 0.55 + 7; T.tgt.x = aim.x + (r() - 0.5) * 2 * s; T.tgt.y = aim.y; T.tgt.z = aim.z + (r() - 0.5) * 2 * s; T.rocket(o, T.tgt, 5 + B.S, 13 + B.S * 2, 60, true); });
      },
    } },
  { id: 'carpet', icon: '💣', stage: 5,
    light: { // a stick of three bombs
      wind: 0.15, strike: 0.4, recover: 0.2,
      pose(j, p, a, b) { j.torso[4] += Math.abs(Math.sin(b * 9.4)) * 1.2 * (b > 0 && b < 1 ? 1 : 0); },
      tick(T, act, dt, b0, b1) { eachShot(b0, b1, 3, () => { const B = T.base(); T.bomb(5 + B.S * 1.1, 12 + B.S * 2, 0.3); }); },
    },
    heavy: { // carpet bombing: twelve bombs in a long line along the flight path
      wind: 0.4, strike: 1.3, recover: 0.3,
      pose(j, p, a, b, c) { j.torso[0] += 0.1 * a * (1 - c); j.torso[4] += Math.abs(Math.sin(b * 37)) * 1.2 * (b > 0 && b < 1 ? 1 : 0); },
      tick(T, act, dt, b0, b1) { eachShot(b0, b1, 12, () => { const B = T.base(); T.bomb(5 + B.S * 1.2, 12 + B.S * 2, 0.6); T.g.shake(0.08); }); },
    } },
  { id: 'heavy', icon: '🔥', stage: 7,
    light: { // fire bombs: little blast, a lot of fire
      wind: 0.15, strike: 0.5, recover: 0.2,
      pose(j, p, a, b) { j.torso[4] += Math.abs(Math.sin(b * 9.4)) * 1.2 * (b > 0 && b < 1 ? 1 : 0); },
      tick(T, act, dt, b0, b1) { eachShot(b0, b1, 3, () => { const B = T.base(); T.bomb(4 + B.S * 0.7, 8 + B.S, 0.5, true); }); },
    },
    heavy: { // one enormous bomb
      wind: 0.7, strike: 0.15, recover: 0.6,
      pose(j, p, a, b, c) { j.torso[0] += 0.2 * a * (1 - c); j.torso[4] += 4 * pulse(b) + 2 * (b > 0 ? 1 - c : 0); },
      hit(T) { const B = T.base(); T.bomb(14 + B.S * 2.4, 20 + B.S * 2, 0, false, 2.4); T.g.shake(0.4); },
    } },
];
