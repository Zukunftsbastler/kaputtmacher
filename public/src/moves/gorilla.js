// Moves of one creature (see tools.js for how a move is played).
// Gorilla: fists, throws and its own weight

import { snap, eachShot } from './kit.js';
import { clamp, wrapDelta } from '../math.js';
import { airborne } from '../monster.js';

export default [
  { id: 'fists', icon: '👊', stage: 1,
    light: { // jab, alternating arms
      wind: 0.1, strike: 0.1, recover: 0.16,
      pose(j, p, a, b, c, act) {
        const arm = act.side > 0 ? j.armR : j.armL, go = snap(b) * (1 - c);
        arm[0] += 0.7 * a * (1 - b) - 2.3 * go; j.torso[1] += (0.35 * a * (1 - b) - 0.5 * go) * act.side; j.torso[0] += 0.25 * go; p.fwd = 2 * go;
      },
      hit(T, act) { const B = T.base(), q = T.reachHit(act, 0.6, 0.85); T.blow(q[0], q[1], q[2], B.R * 0.7, B.P * 0.85, false, T.dx, T.dz); },
    },
    heavy: { // hammer blow: both fists from high above the head, with a shock through the ground
      wind: 0.5, strike: 0.16, recover: 0.45, root: true, hitAt: 0.7,
      pose(j, p, a, b, c) {
        const up = a * (1 - snap(b)), down = snap(b) * (1 - c);
        j.armL[0] += -3.0 * up - 0.9 * down; j.armR[0] += -3.0 * up - 0.9 * down; j.armL[2] += 0.25 * up; j.armR[2] -= 0.25 * up;
        j.torso[0] += -0.4 * up + 0.75 * down; j.head[0] += -0.4 * up + 0.2 * down; j.jaw[0] += 0.7 * up;
        p.hop += 5 * up - 1.5 * down; p.squash = 0.5 * down; j.legL[0] -= 0.2 * up; j.legR[0] -= 0.2 * up;
      },
      hit(T, act) {
        const B = T.base(), q = T.reachHit(act, 0.35, 0.8, true);
        T.blow(q[0], q[1], q[2], B.R * 1.45, B.P * 1.6, true, T.dx, T.dz);
        T.shock(q[0], T.g.monster.y, q[2], B.H * 0.5, B.R * 0.75, B.P * 0.8, 6);
      },
    } },
  { id: 'throw', icon: '🪨', stage: 3,
    light: { // rips out a lump and throws it in one motion
      wind: 0.3, strike: 0.34, recover: 0.25, root: true, hitAt: 0.75,
      pose(j, p, a, b, c) {
        const reach = a * (1 - Math.min(1, b * 3)), lift = Math.min(1, b * 3) * (1 - snap(clamp((b - 0.7) * 3.3, 0, 1))), thrown = b > 0.7 ? 1 - c : 0;
        j.torso[0] += 0.75 * reach - 0.3 * lift + 0.5 * thrown; j.armL[0] += -1.3 * reach - 2.9 * lift - 1.2 * thrown; j.armR[0] += -1.3 * reach - 2.9 * lift - 1.2 * thrown;
      },
      begin(T, act) { const B = T.base(), q = T.reachHit(act, 0.25, 0.9, true); T.grab(q[0], q[1], q[2], clamp(B.H * 0.17, 1.6, 10)); },
      hit(T) { T.release(1, false); },
    },
    heavy: { // heaves a boulder over its head and hurls it with everything it has
      wind: 0.6, strike: 0.6, recover: 0.4, root: true, hitAt: 0.8,
      pose(j, p, a, b, c) {
        const reach = a * (1 - Math.min(1, b * 2.5)), lift = Math.min(1, b * 2.5) * (1 - snap(clamp((b - 0.75) * 4, 0, 1))), thrown = b > 0.75 ? 1 - c : 0;
        j.torso[0] += 0.85 * reach - 0.45 * lift + 0.7 * thrown; j.armL[0] += -1.4 * reach - 3.0 * lift - 1.3 * thrown; j.armR[0] += -1.4 * reach - 3.0 * lift - 1.3 * thrown;
        p.squash = 0.5 * reach; p.hop += 2.5 * lift; j.jaw[0] += 0.8 * lift; j.head[0] -= 0.3 * lift; p.fwd = 4 * thrown;
      },
      begin(T, act) { const B = T.base(), q = T.reachHit(act, 0.25, 0.9, true); T.grab(q[0], q[1], q[2], clamp(B.H * 0.3, 2.5, 15)); T.g.audio.crack(0.7); },
      hit(T) { T.release(1.8, true); T.g.shake(0.3); },
    } },
  { id: 'pound', icon: '💥', stage: 5,
    light: { // stamps one foot down
      wind: 0.2, strike: 0.1, recover: 0.28, root: true,
      pose(j, p, a, b, c) { const up = a * (1 - snap(b)); j.legR[0] -= 1.3 * up; j.torso[2] += 0.2 * up; j.torso[0] += 0.3 * snap(b) * (1 - c); p.squash = 0.4 * snap(b) * (1 - c); },
      hit(T) { const B = T.base(), m = T.g.monster; T.shock(m.x, m.y, m.z, B.H * 0.45, B.R * 0.9, B.P, 6); },
    },
    heavy: { // leaps to the aimed spot and comes down with both fists
      wind: 0.42, strike: 3, recover: 0.5, root: true, airborne: true, hitAt: 2,
      pose(j, p, a, b, c) {
        const crouch = b === 0 ? a : 0, air = b > 0 && c === 0 ? 1 : 0, slam = c > 0 ? 1 - c : 0;
        p.squash = 0.6 * crouch + 0.6 * slam; j.armL[0] += 0.8 * crouch - 3.0 * air - 0.8 * slam; j.armR[0] += 0.8 * crouch - 3.0 * air - 0.8 * slam;
        j.torso[0] += 0.4 * crouch - 0.3 * air + 0.7 * slam; j.jaw[0] += 0.8 * air;
      },
      begin(T, act) {
        const m = T.g.monster, B = T.base(), size = T.g.world.wrap ? T.g.world.sx : 0;
        const dx = wrapDelta(act.ax - m.x, size), dz = wrapDelta(act.az - m.z, size), d = Math.hypot(dx, dz) || 1, lim = Math.min(d, B.H * 6);
        if (!m.leap(m.x + (dx / d) * lim, m.z + (dz / d) * lim, B.H * 2.2)) act.t = 99;
        T.g.audio.whoosh();
      },
      land(T) {
        const B = T.base(), m = T.g.monster, x = m.x, y = m.y, z = m.z;
        T.blow(x, y + B.H * 0.1, z, B.H * 0.6 + 1, B.P * 1.7, true, 0, 0);
        T.shock(x, y, z, B.H * 0.7, B.R * 1.1, B.P * 1.1, 8);
        T.later(0.12, () => T.shock(x, y, z, B.H * 1.3, B.R * 0.9, B.P * 0.7, 12));
      },
    } },
  { id: 'rage', icon: '🥁', stage: 7,
    light: { // chest drumming: rings of pressure that shatter glass all around
      wind: 0.2, strike: 0.75, recover: 0.2, root: true,
      pose(j, p, a, b, c) {
        const on = a * (1 - c), beat = Math.sin(b * 44);
        j.torso[0] -= 0.3 * on; j.head[0] -= 0.5 * on; j.jaw[0] += 0.9 * on;
        j.armL[0] += (-1.1 + 0.5 * beat) * on; j.armR[0] += (-1.1 - 0.5 * beat) * on; j.armL[2] += 0.5 * on; j.armR[2] -= 0.5 * on;
      },
      begin(T) { T.g.audio.roar(T.g.monster.stage); },
      tick(T, act, dt, b0, b1) {
        eachShot(b0, b1, 5, (k) => { const B = T.base(), m = T.g.monster; T.shock(m.x, m.y + B.H * 0.5, m.z, B.H * (0.7 + k * 0.55), B.H * 0.22 + 2, 2.6 + B.S * 0.25, 10, true); T.g.audio.step(1); });
      },
    },
    heavy: { // frenzy: a hail of hammer blows left and right
      wind: 0.5, strike: 1.7, recover: 0.5, root: true,
      pose(j, p, a, b, c) {
        const on = b > 0 ? 1 - c : 0, s = Math.sin(b * 34), up = a * (1 - on);
        j.armL[0] += -2.8 * up + (-1.6 + 1.3 * s) * on; j.armR[0] += -2.8 * up + (-1.6 - 1.3 * s) * on;
        j.torso[0] += -0.35 * up + (0.45 + 0.2 * Math.abs(s)) * on; j.torso[1] += 0.3 * s * on; j.jaw[0] += 0.8 * (up + on); p.hop += Math.abs(s) * 2 * on;
      },
      tick(T, act, dt, b0, b1) {
        eachShot(b0, b1, 9, (k) => {
          const B = T.base(), m = T.g.monster, ang = act.heading + (k % 2 ? 0.55 : -0.55) * (0.5 + T.g.rng()), d = B.H * (0.55 + T.g.rng() * 0.4);
          T.dx = Math.sin(ang); T.dz = Math.cos(ang);
          T.blow(m.x + T.dx * d, m.y + B.H * 0.3, m.z + T.dz * d, B.R * 1.2, B.P * 1.4, k % 3 === 2, T.dx, T.dz);
        });
      },
    } },
];
