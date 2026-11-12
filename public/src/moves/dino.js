// Moves of one creature (see tools.js for how a move is played).
// Dino: tail, teeth, weight and fire

import { ease, snap, pulse, crossed, charge, flameStream } from './kit.js';
import { clamp } from '../math.js';
import { launch } from '../particles.js';

export default [
  { id: 'tail', icon: '🌀', stage: 1,
    light: { // tail flick: a quick half turn, alternating sides
      wind: 0.16, strike: 0.16, recover: 0.24, root: true,
      spin: (a, b, c) => -0.7 * a + 3.3 * snap(b) - 2.6 * ease(c),
      pose(j, p, a, b, c, act) {
        p.spin = this.spin(a, b, c) * act.side;
        j.tail[1] += (0.5 * a * (1 - b) - 0.7 * pulse(b)) * act.side; j.tail2[1] += (0.9 * a * (1 - b) - 1.1 * pulse(b)) * act.side;
        j.torso[0] += 0.18 * a * (1 - b); p.squash = 0.25 * a * (1 - b);
      },
      tick(T, act, dt, b0, b1) { T.tailSweep(act, this, b0, b1, [0.45, 0.8, 1.1], 0.75, 0.9, false); },
    },
    heavy: { // whirl: coils up, then the whole body comes round once with the tail at full stretch
      wind: 0.5, strike: 0.32, recover: 0.42, root: true,
      spin: (a, b) => -1.25 * a + (Math.PI * 2 + 1.25) * snap(b),
      pose(j, p, a, b, c, act) {
        p.spin = this.spin(a, b) * act.side;
        const coil = a * (1 - Math.min(1, b * 4));
        j.tail[1] += (1.0 * coil - 0.9 * pulse(b)) * act.side; j.tail2[1] += (1.5 * coil - 1.3 * pulse(b)) * act.side;
        j.torso[0] += 0.3 * coil - 0.15 * pulse(b); j.head[0] += 0.25 * coil; j.jaw[0] += 0.5 * pulse(b);
        p.squash = 0.55 * coil; p.hop += 3 * pulse(b);
        j.armL[2] -= 0.8 * pulse(b); j.armR[2] += 0.8 * pulse(b);
      },
      tick(T, act, dt, b0, b1) { T.tailSweep(act, this, b0, b1, [0.45, 0.8, 1.15, 1.45], 1.25, 1.6, true); },
      end(T) { const m = T.g.monster; T.g.debris.blast(m.x, m.y, m.z, m.h * 2.2, launch(m.h * 1.5)); },
    } },
  { id: 'bite', icon: '🦷', stage: 3,
    light: { // snap: lunges and bites a piece out
      wind: 0.16, strike: 0.12, recover: 0.22, root: true,
      pose(j, p, a, b, c) {
        const go = snap(b) * (1 - c);
        j.torso[0] += -0.18 * a * (1 - b) + 0.5 * go; j.head[0] += -0.35 * a * (1 - b) + 0.35 * go;
        j.jaw[0] += 0.95 * a * (1 - snap(b)); p.fwd = 5 * go - 1.5 * a * (1 - b);
        j.tail[0] += 0.4 * go;
      },
      hit(T, act) {
        const B = T.base(), q = T.reachHit(act, 0.8, 0.95);
        if (T.blow(q[0], q[1], q[2], B.R * 0.65, B.P, false, T.dx, T.dz, false, 8)) T.g.audio.hit('wood', 0.4);
      },
    },
    heavy: { // tear: clamps down, shakes its head and flings a whole chunk away
      wind: 0.42, strike: 0.6, recover: 0.36, root: true, hitAt: 0.2,
      pose(j, p, a, b, c) {
        const ready = a * (1 - Math.min(1, b * 5)), grip = b > 0.2 && b < 0.8 ? 1 : 0, toss = ease(clamp((b - 0.75) * 4, 0, 1));
        const lunge = snap(Math.min(1, b * 5)) * (1 - toss);
        j.torso[0] += -0.25 * ready + 0.55 * lunge - 0.5 * toss * (1 - c);
        j.head[0] += -0.4 * ready + 0.3 * lunge; j.head[1] += Math.sin(b * 38) * 0.55 * grip;
        j.jaw[0] += 1.15 * ready + 0.25 * grip + 0.7 * (b >= 0.8 ? 1 - c : 0);
        p.fwd = 6 * lunge - 2 * ready; j.torso[1] += Math.sin(b * 38) * 0.12 * grip;
        j.tail[1] += Math.sin(b * 38 + 1) * 0.3 * grip;
      },
      hit(T, act) { const B = T.base(), q = T.reachHit(act, 0.8, 1.0); T.grab(q[0], q[1], q[2], clamp(B.H * 0.3, 2.5, 15)); T.g.audio.crack(0.6); },
      tick(T, act, dt, b0, b1) {
        if (T.held) { const o = T.at(T.o, 0.78, 0.6); T.held.pos[0] = o[0]; T.held.pos[1] = o[1]; T.held.pos[2] = o[2]; }
        if (crossed(b0, b1, 0.8)) T.release(1.5, true);
      },
    } },
  { id: 'charge', icon: '💨', stage: 5, light: charge(1.8, 0.85, 1.1, 1.2, 0.22, 0.25), heavy: charge(7, 1.15, 1.6, 3.5, 0.6, 0.95) },
  { id: 'breath', icon: '🔥', stage: 7,
    light: flameStream(0.8, 0.5, false),
    heavy: { // atomic breath: the back spikes charge up, then a thick beam follows the aim
      wind: 0.95, strike: 1.5, recover: 0.5, root: true,
      pose(j, p, a, b, c) {
        const on = b > 0 ? 1 - c : 0;
        j.torso[0] += 0.35 * a * (1 - on) - 0.12 * on; j.head[0] += 0.5 * a * (1 - on) - 0.1 * on + Math.sin(p.time * 55) * 0.03 * on;
        j.jaw[0] += 1.0 * on + 0.2 * a; j.tail[0] += 0.6 * a * (1 - c); j.tail2[0] += 0.4 * a * (1 - c);
        p.squash = 0.3 * a * (1 - on); p.fwd = -1.5 * on;
      },
      windTick(T) { // charging: sparks run up the spine
        const m = T.g.monster, o = T.at(T.o, 0.5 + T.g.rng() * 0.4, -0.25);
        T.g.fx.add(o[0], o[1], o[2], 0, m.h * 0.6, 0, m.h * 0.06 + 0.5, 0, 0.35, 0.4, 0.8, 1, 1, 1);
      },
      tick(T, act, dt) {
        const B = T.base(), o = T.at(T.o, 0.82, 0.5);
        T.ray(o, T.g.aim, 1.3 + B.S * 0.22 + B.H * 0.03, 7 + B.S * 0.7, 0.45, 0.8, 1, true, dt);
        T.g.shake(0.25);
      },
    } },
];
