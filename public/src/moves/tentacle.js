// Moves of one creature (see tools.js for how a move is played).
// Tentacle: whip, grip, ink and the deep
// It reaches further than a body length (about two), but it does not walk: to get anywhere it has to go down into the ground.
// From the least to the most spectacular: the whip, wrapping round and pulling over, ink, and the awakening of the deep.

import { snap, pulse, eachShot, curl } from './kit.js';
import { launch } from '../particles.js';
import { SEGS } from '../monster.js';

export default [
  { id: 'whip', icon: '〰️', stage: 1,
    light: { // crack of the whip: the tip shoots out to the aimed spot and snaps
      wind: 0.14, strike: 0.12, recover: 0.26, hitAt: 0.6,
      pose(j, p, a, b, c) { curl(j, -0.11 * a * (1 - snap(b)) + 0.13 * snap(b) * (1 - c)); p.squash = -0.6 * pulse(b); },
      hit(T, act) {
        const B = T.base(), q = T.tipHit(act, 2.2);
        T.blow(q[0], q[1], q[2], B.R * 0.72, B.P, false, T.dx, T.dz, false, 10);
        const o = T.opt; o.dx = T.dx; o.dz = T.dz; o.impulse = launch(B.H + 6); o.debris = 8; o.spare = false; o.blast = 0;
        T.g.destruction.capsule(q[0], q[1], q[2], q[0] + T.dx * (B.H * 0.25 + 2), q[1], q[2] + T.dz * (B.H * 0.25 + 2), B.R * 0.3, B.P * 1.1, o); // a deep, narrow hole
        T.g.fx.sparks(q[0], q[1], q[2], 12, 10, 1, 1, 1); T.g.audio.crack(0.45);
      },
    },
    heavy: { // whirl: it winds itself up, then the arm comes round once at full stretch, rising as it goes
      wind: 0.5, strike: 0.42, recover: 0.5, root: true,
      turn: (a, b) => -0.9 * a + (Math.PI * 2 + 0.9) * snap(b),
      pose(j, p, a, b, c, act) {
        p.spin = this.turn(a, b) * act.side;
        const coil = a * (1 - Math.min(1, b * 4)), out = b > 0 ? 1 - c : 0;
        curl(j, -0.06 * coil + 0.09 * out, 0.05 * coil * act.side); p.squash = 0.4 * coil - 0.5 * out;
      },
      tick(T, act, dt, b0, b1) { T.whirl(act, this, b0, b1); },
      end(T) { const m = T.g.monster; T.g.debris.blast(m.x, m.y, m.z, m.h * 2.4, launch(m.h * 1.5)); T.g.emote('dizzy'); },
    } },
  { id: 'wrap', icon: '➰', stage: 3,
    light: { // squeeze: it coils round the target (a corner, a mast, a tower, a tree) and squeezes: a ring cut all round
      wind: 0.25, strike: 0.45, recover: 0.3,
      pose(j, p, a, b, c) { const on = a * (1 - c); curl(j, 0.05 * on, 0); for (let i = SEGS - 5; i < SEGS; i++) { j['seg' + i][0] += 0.35 * on; j['seg' + i][1] += 0.5 * pulse(b); } p.squash = 0.25 * pulse(b); },
      begin(T, act) { const q = T.tipHit(act, 2.2); act.wx = q[0]; act.wy = q[1]; act.wz = q[2]; T.g.audio.crack(0.3); },
      tick(T, act, dt, b0, b1) { eachShot(b0, b1, 3, (k) => T.squeeze(act, 1.2 - k * 0.2)); },
    },
    heavy: { // pull over: the suckers take hold high up on the building, and the tentacle hauls it over towards itself
      wind: 0.45, strike: 0.6, recover: 0.45, root: true, hitAt: 0.35,
      pose(j, p, a, b, c) { const reach = a * (1 - Math.min(1, b * 3)), pull = b > 0.3 ? 1 - c : 0; curl(j, 0.06 * reach - 0.1 * pull); p.squash = -0.5 * reach + 0.4 * pull; },
      hit(T, act) { T.pullOver(act); },
    } },
  { id: 'ink', icon: '💧', stage: 5,
    light: { // ink jet: a thin jet under high pressure that cuts like a water knife while it lasts
      wind: 0.2, strike: 0.9, recover: 0.25,
      pose(j, p, a, b, c) { const on = b > 0 ? 1 - c : 0; p.squash = 0.15 * on + Math.sin(p.time * 40) * 0.05 * on; },
      tick(T, act, dt) {
        const B = T.base(), o = T.tip();
        T.ray(o, T.g.aim, 0.7 + B.S * 0.1 + B.H * 0.014, 7 + B.S * 0.8, 0.42, 0.2, 0.62, false, dt);
        if (T.hitSolid && T.g.rng() < 0.5) T.inkSplash(T.hit[0], T.hit[1], T.hit[2], 0.5 + B.H * 0.05, 3);
      },
    },
    heavy: { // ink bomb: a ball of ink flies in an arc and bursts into a huge cloud; glass, leaves and cloth go to pieces all round
      wind: 0.45, strike: 0.15, recover: 0.4,
      pose(j, p, a, b, c) { p.squash = 0.6 * a * (1 - b) - 0.6 * pulse(b); curl(j, -0.05 * a * (1 - b) + 0.08 * pulse(b)); },
      hit(T) { const B = T.base(); T.inkBomb(T.tip(), T.g.aim, 5 + B.S, 12 + B.S * 2, B.H * 0.75 + 8); },
    } },
  { id: 'deep', icon: '🌊', stage: 7,
    light: { // ground wave: it slams onto the ground, and a wave runs through the earth to the aimed spot
      wind: 0.3, strike: 0.3, recover: 0.4, hitAt: 0.6,
      pose(j, p, a, b, c) { curl(j, -0.06 * a * (1 - snap(b)) + 0.16 * snap(b) * (1 - c)); p.squash = 0.6 * pulse(b); },
      hit(T, act) { T.groundWave(act); },
    },
    heavy: { // awakening of the deep: the cut-in, then five tentacles burst out of the ground round the target and drag it down
      wind: 1.0, strike: 2.8, recover: 0.5, root: true, cutIn: true,
      pose(j, p, a, b, c) { const on = b > 0 ? 1 - c : 0; curl(j, -0.05 * a * (1 - on) + 0.05 * on); p.squash = -0.4 * a * (1 - on) + 0.3 * on; p.roar = Math.max(p.roar, 0.4 * on); },
      begin(T, act) { T.kraken(act); },
      tick(T, act, dt, b0, b1) { T.krakenTick(act, b0, b1); },
    } },
];
