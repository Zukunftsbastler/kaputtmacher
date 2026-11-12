// Moves of one creature (see tools.js for how a move is played).
// Tank: everything comes out of a barrel

import { ease, pulse, eachShot, charge, flameStream } from './kit.js';

export default [
  { id: 'gun', icon: '💣', stage: 1,
    light: { // machine cannon: a burst of small shells
      wind: 0.06, strike: 0.48, recover: 0.1,
      pose(j, p, a, b) { const on = b > 0 && b < 1 ? 1 : 0; j.barrel[5] -= Math.abs(Math.sin(b * 19)) * 1.5 * on; j.torso[0] -= Math.abs(Math.sin(b * 19)) * 0.02 * on; },
      tick(T, act, dt, b0, b1) {
        eachShot(b0, b1, 6, () => { const B = T.base(), o = T.muzzle(); T.shell(o, T.g.aim, 0.55 + B.S * 0.1, 6 + B.S * 1.5, 1, 0, 170, 0.05); T.g.fx.sparks(o[0], o[1], o[2], 14, 4); T.g.audio.hit('metal', 0.25); });
      },
    },
    heavy: { // main gun: the barrel draws back, the shot throws the whole tank backwards
      wind: 0.55, strike: 0.12, recover: 0.6, root: true, hitAt: 0.1,
      pose(j, p, a, b, c) {
        const ready = a * (1 - Math.min(1, b * 10)), fired = b > 0 ? 1 - ease(c) : 0;
        j.barrel[5] += -1.5 * ready - 6 * fired; j.barrel[0] -= 0.06 * a; j.torso[0] += 0.08 * ready - 0.3 * fired;
        p.fwd = -5 * fired; p.squash = 0.2 * a * (1 - b);
      },
      hit(T) {
        const B = T.base(), o = T.muzzle(), m = T.g.monster, yaw = T.turretYaw();
        T.shell(o, T.g.aim, 1.2 + B.S * 0.3, 14 + B.S * 2.5, 3, 6 + B.S * 1.3, 150, 0);
        T.g.fx.explosion(o[0], o[1], o[2], B.H * 0.12 + 1.5);
        T.g.fx.dust(m.x, m.y + 1, m.z, B.H * 0.5, 0.75, 0.7, 0.6, 8);
        T.g.audio.boom(0.6 + B.S * 0.08); T.g.shake(0.6 + B.S * 0.08); T.g.hitStop = 0.05;
        m.x -= Math.sin(yaw) * B.H * 0.18; m.z -= Math.cos(yaw) * B.H * 0.18;
      },
    } },
  { id: 'mortar', icon: '☄️', stage: 3,
    light: {
      wind: 0.2, strike: 0.1, recover: 0.28,
      pose(j, p, a, b, c) { j.barrel[0] -= 0.7 * a * (1 - c); j.barrel[5] -= 3 * pulse(b); },
      hit(T) { const B = T.base(); T.lob(T.muzzle(), T.g.aim, 5 + B.S, 12 + B.S * 2); T.g.audio.boom(0.3); },
    },
    heavy: { // barrage: six shells rain down around the target
      wind: 0.42, strike: 1.0, recover: 0.32, root: true,
      pose(j, p, a, b, c) { const on = a * (1 - c), fire = b > 0 && b < 1 ? 1 : 0; j.barrel[0] -= 0.8 * on; j.barrel[5] -= Math.abs(Math.sin(b * 19)) * 3 * fire; j.torso[0] -= Math.abs(Math.sin(b * 19)) * 0.06 * fire; p.squash = 0.2 * on; },
      tick(T, act, dt, b0, b1) {
        eachShot(b0, b1, 6, () => { const B = T.base(), aim = T.g.aim, r = T.g.rng, s = B.H * 0.8 + 10; T.tgt.x = aim.x + (r() - 0.5) * 2 * s; T.tgt.y = aim.y; T.tgt.z = aim.z + (r() - 0.5) * 2 * s; T.lob(T.muzzle(), T.tgt, 5 + B.S * 1.1, 12 + B.S * 2); T.g.audio.boom(0.3); T.g.shake(0.15); });
      },
    } },
  { id: 'ram', icon: '💨', stage: 5, light: charge(1.8, 0.9, 1.2, 1.5, 0.2, 0.25), heavy: charge(7, 1.2, 1.7, 4, 0.55, 0.95) },
  { id: 'bunker', icon: '🧨', stage: 7,
    light: flameStream(0.48, 0.85, true),
    heavy: { // bunker buster: one slow, huge missile
      wind: 0.8, strike: 0.15, recover: 0.7, root: true,
      pose(j, p, a, b, c) { const ready = a * (1 - Math.min(1, b * 8)), fired = b > 0 ? 1 - ease(c) : 0; j.barrel[0] -= 0.25 * a * (1 - c); j.barrel[5] += -2 * ready - 7 * fired; j.torso[0] -= 0.35 * fired; p.fwd = -6 * fired; p.squash = 0.3 * a * (1 - b); },
      hit(T) { const B = T.base(), o = T.muzzle(); T.rocket(o, T.g.aim, 12 + B.S * 2.2, 20 + B.S * 2, 26, false, 2.2); T.g.fx.explosion(o[0], o[1], o[2], B.H * 0.15 + 2); T.g.audio.boom(0.9); T.g.shake(0.9); },
    } },
];
