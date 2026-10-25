// Attacks. Every creature has its own set of moves, and every move comes in two versions:
// a quick, lighter one and a slow one with a long wind-up and far more force.
// A move is an animation in three phases (wind-up, strike, recovery) that triggers damage while it plays;
// nothing happens at the instant of the click. Strength and reach grow with the creature's stage.

import { isTerrain, TYPE_MAT, MAT, RUBBLE } from './materials.js';
import { clamp, wrapDelta } from './math.js';
import { GRAVITY, launch } from './particles.js';
import { stageScale, tracked, airborne, SEGS } from './monster.js';

const ease = (x) => x * x * (3 - 2 * x);
const snap = (x) => 1 - (1 - x) ** 3; // fast start, soft landing: the feel of a blow
const pulse = (x) => Math.sin(clamp(x, 0, 1) * Math.PI);
const crossed = (b0, b1, at) => b0 < at && b1 >= at;
// Calls fn(k) for each of n evenly spaced events that fall into the step from b0 to b1.
const eachShot = (b0, b1, n, fn) => { for (let k = 0; k < n; k++) if (crossed(b0, b1, k / n) || (k === 0 && b0 === 0 && b1 > 0)) fn(k); };
// Bends the tentacle: every segment by its share of amt, more towards the tip (forwards; side: sideways).
const curl = (j, amt, side = 0) => { for (let i = 0; i < SEGS; i++) { const w = 2 * (i / (SEGS - 1)) ** 1.3, q = j['seg' + i]; q[0] += amt * w; q[2] += side * w; } };

export const ABILITIES = [
  { id: 'stomp', icon: '🦶', stage: 1 }, // jumping is there from the start; from stage 2 every landing is a stomp
  { id: 'roar', icon: '🗯️', stage: 9 },
];

// Shared by dino and tank: a run straight ahead that knocks through whatever is in the way.
function charge(dist, rMul, pMul, shove, wind, strike) {
  return {
    wind, strike, recover: 0.35, root: true,
    pose(j, p, a, b, c) {
      const go = b > 0 ? 1 - c : 0, ready = a * (1 - Math.min(1, b * 6));
      j.torso[0] += -0.2 * ready + 0.75 * go; j.head[0] += 0.5 * go - 0.3 * ready;
      j.tail[0] += 0.5 * go; j.tail2[0] += 0.3 * go;
      if (b === 0) { j.legR[0] += Math.sin(a * 14) * 0.7; p.squash = 0.3 * a; } // pawing the ground
      else { p.walk += 0.9; p.walkAmp = 1.5 * go; }
    },
    tick(T, act, dt, b0, b1) {
      const g = T.g, m = g.monster, B = T.base(), fx = Math.sin(act.heading), fz = Math.cos(act.heading);
      const step = dist * B.H * (snap(b1) - snap(b0));
      m.x += fx * step; m.z += fz * step;
      const n = T.blow(m.x + fx * B.H * 0.45, m.y + B.H * 0.5, m.z + fz * B.H * 0.45, B.R * rMul * 1.2, B.P * pMul, false, fx, fz, true);
      if (n) g.onShove(m, m.x + fx * (B.H * 0.5 + 3), m.z + fz * (B.H * 0.5 + 3), fx, fz, shove);
      if (g.rng() < 0.6) g.fx.dust(m.x - fx * B.H * 0.3, m.y + 1, m.z - fz * B.H * 0.3, B.H * 0.25, 0.75, 0.7, 0.62, 1);
      g.shake(0.12 * pMul);
    },
  };
}

// Shared by dino (fire breath) and tank (flame thrower).
function flameStream(up, fwd, turret) {
  return {
    wind: 0.25, strike: 0.7, recover: 0.25,
    pose(j, p, a, b, c) {
      const on = a * (1 - c);
      j.head[0] += 0.15 * on; j.jaw[0] += 0.8 * on; j.torso[0] += 0.2 * on + Math.sin(p.time * 40) * 0.02 * on;
      j.barrel[3] += Math.sin(p.time * 50) * 0.3 * on;
    },
    tick(T) {
      const B = T.base(), o = T.at(T.o, up, fwd, 0, turret ? T.turretYaw() : undefined);
      T.flame(o[0], o[1], o[2], B.H * 3.6 + 12, 0.32, 3, 2 + B.S * 0.25);
    },
  };
}

const MOVES = {
  // ---------------------------------------------------------------- Dino: tail, teeth, weight and fire
  dino: [
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
  ],
  // ---------------------------------------------------------------- Gorilla: fists, throws and its own weight
  gorilla: [
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
  ],
  // ---------------------------------------------------------------- Robot: light and rockets, never a fist.
  // It starts with the blade, which only reaches as far as its arm; what works from afar comes later, the cutting beam last.
  robot: [
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
  ],
  // ---------------------------------------------------------------- Tank: everything comes out of a barrel
  tank: [
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
  ],
  // ---------------------------------------------------------------- Excavator: bucket, swing, breaker and blade
  // Everything happens at the end of the arm: it reaches as far as boom and stick go (about one and a half body heights), never further. The upper
  // carriage turns towards the target while the tracks keep their course; only the dozer push moves the whole machine.
  digger: [
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
    } ],
  // ---------------------------------------------------------------- Aircraft: guns ahead, bombs below
  jet: [
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
  ],
  // ---------------------------------------------------------------- Helicopter: gun, rockets, winch and rotor
  // From the least to the most spectacular: a gun that nibbles, rockets, the winch that lifts whole cars and swings a
  // wrecking ball, and at last the rotor itself: a saw that cuts through a building, and the tornado.
  chopper: [
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
  ],
  // ---------------------------------------------------------------- Tentacle: whip, grip, ink and the deep
  // It reaches further than a body length (about two), but it does not walk: to get anywhere it has to go down into the ground.
  // From the least to the most spectacular: the whip, wrapping round and pulling over, ink, and the awakening of the deep.
  tentacle: [
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
  ],
};

export const movesFor = (species) => MOVES[species] ?? MOVES.dino;

export class Tools {
  constructor(game) {
    this.g = game;
    this.o = [0, 0, 0]; this.hp = [0, 0, 0];
    this.pa = [0, 0, 0]; this.pb = [0, 0, 0]; this.hit = [0, 0, 0]; this.deep = [0, 0, 0]; // scratch for beams
    this.pdx = 0; this.pdy = 0; this.pdz = 1; this.hitT = 0;
    this.tgt = { x: 0, y: 0, z: 0 };
    this.opt = { dx: 0, dy: 0.15, dz: 0, impulse: 0, debris: 80, spare: false, blast: 0, quiet: false };
    this.dx = 0; this.dz = 1; // direction of the last blow
    this.ghostAct = { side: 1, heading: 0 };
    this.baseVals = { H: 1, S: 1, R: 1, P: 1 };
    this.reset();
  }

  reset() {
    this.proj = [];
    this.cool = 0;
    this.roarCool = 0;
    this.held = null; // fragment in the creature's grip
    this.act = null; // the move that is playing
    this.side = 1; // alternates left/right between moves
    this.rays = []; // beams to draw: { ax, ay, az, bx, by, bz, w, r, g, b, life }
    this.timers = [];
    this.marks = []; // pending sky strikes
    this.rope = null; // the helicopter's winch rope: { x, y, z, vx, vy, vz, len, want, r, ball, hitT }
    this.hook = null; // the hook on its way down: { x, y, z, t }
    this.vortices = []; // whirlwinds of the helicopter
    this.krakens = []; // the five tentacles of the awakening
    this.queued = null; // an attack pressed while the tentacle was below the ground: it comes up first
    this.driven = false; // a move flies the helicopter (the circling): the controls wait
  }

  // True while a move keeps the feet planted.
  get rooted() { return !!this.act && !!this.act.v.root && this.act.t < this.act.W + this.act.S; }

  // Size, stage and the basic radius and power everything else is derived from.
  base() {
    const m = this.g.monster, B = this.baseVals;
    B.H = m.targetHeight(); B.S = m.stage; B.R = B.H * 0.24 + 1.6; B.P = 4.5 + B.S * 1.8;
    return B; // one shared object: this is called many times per step
  }

  // A point on the creature: up/fwd/side in body heights, yaw defaults to where it faces.
  at(out, up, fwd, side = 0, yaw = this.g.monster.heading) {
    const m = this.g.monster, H = m.h;
    out[0] = m.x + Math.sin(yaw) * fwd * H + Math.cos(yaw) * side * H;
    out[1] = m.y + up * H;
    out[2] = m.z + Math.cos(yaw) * fwd * H - Math.sin(yaw) * side * H;
    return out;
  }

  turretYaw() { return this.g.monster.heading + this.g.monster.pose.look; }
  muzzle() { return this.at(this.o, 0.48, 0.85, 0, this.turretYaw()); }
  // Where the barrels of the aircraft's belly turret end.
  gun() {
    const m = this.g.monster, o = this.at(this.o, 0.09, 0.16), yaw = this.turretYaw(), len = m.h * 0.28, c = Math.cos(m.pose.aimPitch);
    o[0] += Math.sin(yaw) * len * c; o[1] -= Math.sin(m.pose.aimPitch) * len; o[2] += Math.cos(yaw) * len * c;
    return o;
  }
  later(delay, fn) { this.timers.push({ t: delay, fn }); }

  // ---- helicopter -------------------------------------------------------------------------

  // Where the gun under the helicopter's nose ends.
  nose() {
    const m = this.g.monster, o = this.at(this.o, 0.09, 0.42), yaw = this.turretYaw(), len = m.h * 0.26, c = Math.cos(m.pose.aimPitch);
    o[0] += Math.sin(yaw) * len * c; o[1] -= Math.sin(m.pose.aimPitch) * len; o[2] += Math.cos(yaw) * len * c;
    return o;
  }

  // Circling: the circle runs round the aimed spot at the helicopter's distance (not too close, not too far).
  circle(act) {
    const g = this.g, m = g.monster, B = this.base(), size = g.world.wrap ? g.world.sx : 0, dx = wrapDelta(m.x - act.ax, size), dz = wrapDelta(m.z - act.az, size);
    act.r = clamp(Math.hypot(dx, dz), B.H * 1.2 + 8, B.H * 4 + 30); act.a0 = Math.atan2(dx, dz);
    this.driven = true;
  }
  orbit(act, b) {
    const g = this.g, w = g.world, m = g.monster, size = w.wrap ? w.sx : 0, a = act.a0 + act.side * Math.PI * 2 * b;
    const nx = act.ax + Math.sin(a) * act.r, nz = act.az + Math.cos(a) * act.r;
    const x = m.x + wrapDelta(nx - m.x, size) * 0.2, z = m.z + wrapDelta(nz - m.z, size) * 0.2;
    if (!w.get(Math.floor(x), Math.floor(m.y + m.h * 0.4), Math.floor(z))) { m.x = x; m.z = z; } // a wall in the way: it waits there
    m.vx = 0; m.vz = 0;
    m.heading = Math.atan2(wrapDelta(act.ax - m.x, size), wrapDelta(act.az - m.z, size));
  }

  // Rotor saw: the blades sweep to and fro across what is in front, at the height of the aim, and the helicopter creeps on into the cut.
  saw(act, b0, b1) {
    const g = this.g, w = g.world, m = g.monster, B = this.base(), o = this.opt, reach = B.H * 1.0 + 4, fx = Math.sin(m.heading), fz = Math.cos(m.heading);
    const y = clamp(act.ay, m.y - B.H * 0.2, m.y + B.H * 0.6), step = B.H * 0.9 * (b1 - b0);
    if (!w.get(Math.floor(m.x + fx * B.H * 0.5), Math.floor(m.y + B.H * 0.35), Math.floor(m.z + fz * B.H * 0.5))) { m.x += fx * step; m.z += fz * step; }
    o.dx = 0; o.dz = 0; o.impulse = launch(reach * 0.3 + 4); o.debris = 8; o.spare = false; o.blast = 0; o.quiet = true;
    let n = 0;
    for (let k = 1; k <= 4; k++) { // a broad cut: two blades a little apart in height
      const b = b0 + ((b1 - b0) * k) / 4, a = m.heading + Math.sin(b * Math.PI * 7) * 0.95, sx = Math.sin(a), sz = Math.cos(a), yy = y - (k % 2) * B.H * 0.12;
      g.lastHit.dx = sx; g.lastHit.dz = sz;
      n += g.destruction.capsule(m.x + sx * B.H * 0.25, yy, m.z + sz * B.H * 0.25, m.x + sx * reach, yy, m.z + sz * reach, 1 + B.H * 0.04, B.P * 1.6, o);
    }
    o.quiet = false;
    if (n) { g.fx.sparks(m.x + fx * reach * 0.8, y, m.z + fz * reach * 0.8, 16, 4, 1, 0.85, 0.4); g.audio.sword(); }
  }

  // The winch. The hook goes down to the aimed spot (or as far as the rope reaches) and takes hold of what is there;
  // the load then hangs on the rope and swings along. Dropped, it falls with the swing it has and lands like a bomb.
  lowerHook(act) {
    const g = this.g, m = g.monster, B = this.base(), size = g.world.wrap ? g.world.sx : 0, ay = m.y + m.h * 0.1;
    const dx = wrapDelta(act.ax - m.x, size), dy = act.ay - ay, dz = wrapDelta(act.az - m.z, size), d = Math.hypot(dx, dy, dz) || 1, k = Math.min(1, (B.H * 3 + 20) / d);
    act.hx = m.x + dx * k; act.hy = ay + dy * k; act.hz = m.z + dz * k;
    this.hook = act;
    g.audio.whoosh();
  }
  hookGrab(act) {
    const g = this.g, m = g.monster, B = this.base();
    this.hook = null;
    this.grab(act.hx, act.hy, act.hz, clamp(B.H * 0.3, 2.5, 15), act.hx, act.hz);
    const b = this.held;
    if (!b) return;
    this.rope = { x: b.pos[0], y: b.pos[1], z: b.pos[2], px: b.pos[0], py: b.pos[1], pz: b.pos[2], vx: 0, vy: 0, vz: 0, len: Math.max(m.h * 0.5, Math.hypot(b.pos[0] - m.x, b.pos[1] - m.y, b.pos[2] - m.z)), want: B.H * 0.8 + b.radius, r: Math.max(1, b.radius * 0.8), ball: false, hitT: 0 };
    g.audio.crack(0.5);
  }
  dropLoad() {
    const g = this.g, b = this.held, R = this.rope;
    this.held = null;
    if (b && !b.dead) {
      b.kinematic = false; b.thrown = true; b.age = 0; b.hard = true;
      if (R) { b.v[0] = R.vx; b.v[1] = R.vy; b.v[2] = R.vz; }
      b.w[0] = (g.rng() - 0.5) * 3; b.w[1] = (g.rng() - 0.5) * 3; b.w[2] = (g.rng() - 0.5) * 3;
    }
    if (R && !R.ball) this.rope = null;
    g.audio.whoosh();
  }
  lowerBall() {
    const m = this.g.monster, B = this.base(), y = m.y + m.h * 0.1;
    this.rope = { x: m.x, y, z: m.z, px: m.x, py: y, pz: m.z, vx: 0, vy: 0, vz: 0, len: m.h * 0.3, want: B.H * 1.25 + 2, r: B.H * 0.2 + 1, ball: true, hitT: 0 };
    this.g.audio.hit('metal', 0.6);
  }
  // Put away whatever hangs on the winch (when another move is chosen).
  stow() {
    if (this.held && this.g.progress.species === 'chopper') this.dropLoad();
    this.rope = null; this.hook = null;
  }

  // The rope's end swings like a pendulum under the helicopter (Verlet, with the rope as a limit, not a rod). What hangs
  // on it smashes into whatever it meets, the harder the faster it goes; what does not give way stops it.
  updateRope(dt) {
    const g = this.g, w = g.world, m = g.monster, R = this.rope, size = w.wrap ? w.sx : 0;
    if (!R) return;
    if (this.held?.dead) { this.held = null; if (!R.ball) { this.rope = null; return; } }
    const ax = m.x, ay = m.y + m.h * 0.1, az = m.z, damp = 1 - Math.min(1, dt * 0.5);
    const reel = (6 + m.h * 0.3) * dt; R.len += clamp(R.want - R.len, -reel, reel); // the winch reels slowly: hauling up is no blow
    const nx = R.x + (R.x - R.px) * damp, ny = R.y + (R.y - R.py) * damp - GRAVITY * 0.7 * dt * dt, nz = R.z + (R.z - R.pz) * damp;
    R.px = R.x; R.py = R.y; R.pz = R.z; R.x = nx; R.y = ny; R.z = nz;
    const dx = wrapDelta(R.x - ax, size), dy = R.y - ay, dz = wrapDelta(R.z - az, size), d = Math.hypot(dx, dy, dz) || 1;
    if (d > R.len) { R.x = ax + (dx / d) * R.len; R.y = ay + (dy / d) * R.len; R.z = az + (dz / d) * R.len; }
    if (size) { R.px = R.x - wrapDelta(R.x - R.px, size); R.pz = R.z - wrapDelta(R.z - R.pz, size); }
    R.vx = (R.x - R.px) / dt; R.vy = (R.y - R.py) / dt; R.vz = (R.z - R.pz) / dt;
    R.hitT -= dt;
    // Only a swing does damage: hanging still against a wall (or dragged slowly along it) it just scrapes.
    const r = R.r, solid = (x, y, z) => w.get(Math.floor(x), Math.floor(y), Math.floor(z)), B0 = this.base(), fast = Math.hypot(R.vx, R.vy, R.vz) > 8 + B0.H * 0.15;
    if (R.hitT <= 0 && fast && (solid(R.x, R.y, R.z) || solid(R.x + r * 0.8, R.y, R.z) || solid(R.x - r * 0.8, R.y, R.z) || solid(R.x, R.y - r * 0.8, R.z) || solid(R.x, R.y, R.z + r * 0.8) || solid(R.x, R.y, R.z - r * 0.8))) {
      R.hitT = 0.2;
      const B = this.base(), sp = Math.hypot(R.vx, R.vy, R.vz), k = clamp((sp - 8 - B.H * 0.15) / (14 + B.H * 0.6) + 0.3, 0.3, 2), inv = 1 / (sp || 1), o = this.opt;
      o.dx = R.vx * inv; o.dz = R.vz * inv; o.impulse = launch(sp * 0.5 + 6); o.debris = 50; o.spare = true; o.blast = 0; // buildings, not the ground
      g.lastHit.dx = o.dx; g.lastHit.dz = o.dz; g.lastHit.pop = 0;
      const n = g.destruction.sphere(R.x + o.dx * r * 0.5, R.y, R.z + o.dz * r * 0.5, r * 1.25, B.P * k * (R.ball ? 1.3 : 0.7), o);
      o.spare = false;
      g.actors.hitAir(R.x, R.y, R.z, r + 2);
      if (n) { g.impactFx(R.x, R.y, R.z, r * 1.4, 0.3 + k * 0.25, k > 1.2); g.audio.hit('metal', Math.min(1, 0.3 + k * 0.3)); }
      const keep = n ? 0.6 : -0.3; // through what gave way, a bounce off what did not
      R.px = R.x - (R.x - R.px) * keep; R.py = R.y - (R.y - R.py) * keep; R.pz = R.z - (R.z - R.pz) * keep;
    }
    if (solid(R.x, R.y, R.z)) { R.px = R.x; R.pz = R.z; R.y += 1.5; R.py = R.y; } // stuck in something: it comes to rest on top
    if (this.held && !this.held.dead) { this.held.pos[0] = R.x; this.held.pos[1] = R.y; this.held.pos[2] = R.z; }
  }

  // Whirlwinds. x/z: where it forms, tx/tz: where it goes (the tornado follows the aim point), r: width, h: height,
  // rr and p: the blows it deals as it turns. Loose cubes, cars and people are carried up in a spiral.
  vortex(x, z, tx, tz, life, r, h, rr, p, big) {
    this.vortices.push({ x, z, tx, tz, t: 0, life, r, h, rr, p, big, tick: 0 });
    this.g.audio.whoosh();
  }
  updateVortices(dt) {
    const g = this.g, w = g.world, size = w.wrap ? w.sx : 0, o = this.opt, rnd = g.rng;
    for (let i = this.vortices.length - 1; i >= 0; i--) {
      const v = this.vortices[i];
      v.t += dt;
      const grow = Math.max(0.05, Math.min(1, v.t / 0.6, (v.life - v.t) / 0.5));
      if (v.big) { v.tx = g.aim.x; v.tz = g.aim.z; }
      const dx = wrapDelta(v.tx - v.x, size), dz = wrapDelta(v.tz - v.z, size), d = Math.hypot(dx, dz), sp = (v.big ? 14 + v.r * 0.6 : v.r * 3 + 20) * dt;
      if (d > 1) { v.x += (dx / d) * Math.min(d, sp); v.z += (dz / d) * Math.min(d, sp); }
      if (w.wrap) { v.x = ((v.x % w.sx) + w.sx) % w.sx; v.z = ((v.z % w.sz) + w.sz) % w.sz; }
      if (v.gy === undefined || rnd() < 0.1) v.gy = this.terrainBelow(v.x, v.z);
      // The funnel: dust spiralling up, wider at the top.
      for (let k = 0; k < (v.big ? 26 : 10) * g.fx.thin + 2; k++) {
        const hh = rnd() * v.h, rad = v.r * (0.2 + 0.8 * hh / v.h) * grow, a = rnd() * 6.283, sh = 0.5 + rnd() * 0.25;
        g.fx.add(v.x + Math.cos(a) * rad, v.gy + hh, v.z + Math.sin(a) * rad, -Math.sin(a) * rad * 5, v.h * 0.3, Math.cos(a) * rad * 5, 1.5 + v.r * 0.14, v.r * 0.06, 1, sh, sh * 0.97, sh * 0.92, 0.8, 0, 0, 1);
      }
      if ((v.tick -= dt) <= 0) {
        v.tick = 0.1;
        const n = v.big ? 4 : 3;
        o.impulse = launch(v.h * 0.5 + 10); o.debris = 30; o.spare = false; o.blast = 0; o.quiet = true; o.dy = 0.9;
        for (let k = 0; k < n; k++) {
          const ang = v.t * 7 + k * 2.1, rk = v.r * (0.35 + (0.65 * k) / n) * grow, px = v.x + Math.cos(ang) * rk, pz = v.z + Math.sin(ang) * rk, py = v.gy + v.h * ((k + 0.5) / n) * 0.9;
          o.dx = -Math.sin(ang); o.dz = Math.cos(ang); g.lastHit.dx = o.dx; g.lastHit.dz = o.dz; g.lastHit.pop = launch(v.h * 0.3);
          g.destruction.sphere(px, py, pz, v.rr * grow, v.p, o);
        }
        o.dy = 0.15; o.quiet = false;
        g.debris.swirl(v.x, v.z, v.r * 1.6, 6 + v.r * 0.6, 12 + v.h * 0.12); // loose cubes are drawn in and carried up
        if (rnd() < 0.3) g.audio.crumble(0.2);
      }
      if (v.t >= v.life) {
        if (v.big) { // the end: everything it carried is thrown out in a ring
          const B = this.base();
          this.shock(v.x, v.gy, v.z, v.r * 1.4, B.R * 0.8, B.P * 0.8, 12);
          g.debris.blast(v.x, v.gy, v.z, v.r * 3, launch(B.H * 2));
        }
        this.vortices.splice(i, 1);
      }
    }
  }

  // Top of the ground (not of what is built on it) at (x, z).
  terrainBelow(x, z) {
    const w = this.g.world, ix = Math.floor(x), iz = Math.floor(z);
    for (let y = w.sy - 1; y >= 0; y--) { const t = w.get(ix, y, iz); if (t && isTerrain(t)) return y + 1; }
    return 0;
  }

  // ---- tentacle ---------------------------------------------------------------------------

  // The tentacle's tip, as drawn.
  tip() { return this.g.tipPos(this.o); }

  // Where a blow of the tentacle lands: the first solid thing on the way from high up its arm to the aimed spot, within reach.
  tipHit(act, reachMul) {
    const g = this.g, m = g.monster, B = this.base(), q = this.hp, size = g.world.wrap ? g.world.sx : 0, cy = m.y + B.H * 0.7, reach = B.H * reachMul + 2;
    let dx = wrapDelta(act.ax - m.x, size), dy = clamp(act.ay, m.y + 1, m.y + B.H * 2.3) - cy, dz = wrapDelta(act.az - m.z, size);
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;
    let t = B.H * 0.3;
    for (; t < reach; t += 0.5) {
      const x = m.x + dx * t, y = cy + dy * t, z = m.z + dz * t;
      if (g.world.get(Math.floor(x), Math.floor(y), Math.floor(z)) || g.bodies.solidAt(x, y, z)) break;
    }
    t = Math.min(t + 1, reach, dl);
    q[0] = m.x + dx * t; q[1] = cy + dy * t; q[2] = m.z + dz * t;
    const hl = Math.hypot(dx, dz) || 1;
    this.dx = dx / hl; this.dz = dz / hl;
    return q;
  }

  // Whirl: the arm comes round at full stretch, everything along it is hit, and it rises as it turns.
  whirl(act, v, b0, b1) {
    const g = this.g, m = g.monster, B = this.base(), o = this.opt;
    o.impulse = launch(B.H * 3 + 10); o.debris = 100; o.spare = true; o.blast = 0;
    let n = 0, hx = 0, hy = 0, hz = 0;
    for (let k = 1; k <= 4; k++) {
      const b = b0 + ((b1 - b0) * k) / 4, ang = act.heading + v.turn(1, b) * act.side, sx = Math.sin(ang), sz = Math.cos(ang), y = m.y + B.H * (0.25 + 0.8 * b);
      o.dx = sz * act.side; o.dz = -sx * act.side; // debris flies along the sweep
      g.lastHit.dx = o.dx; g.lastHit.dz = o.dz; g.lastHit.pop = launch(B.H * 0.4);
      for (const r of [0.55, 0.95, 1.35, 1.75]) {
        const x = m.x + sx * B.H * r, z = m.z + sz * B.H * r, c = g.destruction.sphere(x, y, z, B.R * 0.8, B.P * 1.4, o);
        g.actors.hitAir(x, y, z, B.R + 2);
        if (c) { n += c; hx = x; hy = y; hz = z; }
      }
    }
    o.spare = false;
    if (n && g.time - (act.fxT ?? -1) > 0.09) { act.fxT = g.time; g.impactFx(hx, hy, hz, B.R * 1.2, 0.6 + B.S * 0.07, true); }
  }

  // Squeeze: a ring cut round the gripped spot, tightening with every squeeze (k: ring size).
  squeeze(act, k) {
    const g = this.g, B = this.base(), o = this.opt, rr = (B.H * 0.2 + 2) * k, t = 0.7 + B.H * 0.04;
    o.impulse = launch(B.H * 0.6 + 4); o.debris = 20; o.spare = false; o.blast = 0; o.quiet = true;
    let n = 0;
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * 6.283, a1 = ((i + 1) / 10) * 6.283;
      o.dx = Math.cos(a0); o.dz = Math.sin(a0); g.lastHit.dx = -o.dx; g.lastHit.dz = -o.dz;
      n += g.destruction.capsule(act.wx + Math.cos(a0) * rr, act.wy, act.wz + Math.sin(a0) * rr, act.wx + Math.cos(a1) * rr, act.wy, act.wz + Math.sin(a1) * rr, t, B.P * 1.15, o);
    }
    o.quiet = false;
    if (n) { g.fx.dust(act.wx, act.wy, act.wz, rr, 0.78, 0.74, 0.68, 4); g.audio.crumble(0.3); g.shake(0.15); }
  }

  // Pull over: a grip high up on the building and a mighty tug towards the tentacle (the same reckoning as a shove,
  // only far stronger): whatever is not very solid goes over.
  pullOver(act) {
    const g = this.g, w = g.world, m = g.monster, B = this.base(), size = w.wrap ? w.sx : 0, st = w.structureAt(act.ax, act.az), q = this.tipHit(act, 2.3);
    let gx = q[0], gz = q[2], gy = q[1];
    if (st && st.major) { // as high up as it reaches: along a level line from the root towards the aim, the first thing solid
      const hy = Math.min(st.top - 2, m.y + B.H * 2.2), ax = wrapDelta(act.ax - m.x, size), az = wrapDelta(act.az - m.z, size), al = Math.hypot(ax, az) || 1;
      for (let t = B.H * 0.3; t < B.H * 2.6 + 4; t += 0.7) {
        const x = m.x + (ax / al) * t, z = m.z + (az / al) * t;
        if (g.world.get(Math.floor(x), Math.floor(hy), Math.floor(z))) { gx = x; gy = hy; gz = z; break; }
      }
    }
    const dx = wrapDelta(m.x - gx, size), dz = wrapDelta(m.z - gz, size), d = Math.hypot(dx, dz) || 1;
    this.blow(gx, gy, gz, B.R * 0.9, B.P * 1.2, true, dx / d, dz / d);
    g.onShove(m, gx - (dx / d) * 2, gz - (dz / d) * 2, dx / d, dz / d, 5);
    g.audio.groan(0.6); g.shake(0.3);
  }

  // Ink: dark splashes where the jet hits, and the ink bomb.
  inkSplash(x, y, z, size, n) {
    const g = this.g, r = g.rng;
    for (let i = 0; i < n; i++) g.fx.add(x, y, z, (r() - 0.5) * 14, r() * 10, (r() - 0.5) * 14, size, size * 0.4, 0.9, 0.2, 0.1, 0.3, 0.9, 0, 40, 0.5);
  }
  inkBomb(o, aim, radius, power, cloud) {
    const d = Math.hypot(aim.x - o[0], aim.z - o[2]), tf = clamp(d / 60, 0.7, 2.2);
    this.proj.push({ kind: 'mortar', ink: true, cloud: Math.min(cloud, 48), x: o[0], y: o[1], z: o[2], vx: (aim.x - o[0]) / tf, vy: (aim.y - o[1]) / tf + 0.5 * GRAVITY * tf, vz: (aim.z - o[2]) / tf, r: 1.2 + this.g.monster.stage * 0.2, radius, power, life: 8, grav: GRAVITY });
    this.g.audio.whoosh();
  }
  // The ink bomb bursts: a huge dark cloud in which glass, leaves and cloth fall apart.
  inkBurst(p) {
    const g = this.g, o = this.opt, r = g.rng;
    o.dx = 0; o.dz = 0; o.impulse = launch(12); o.debris = 60; o.spare = true; o.blast = 0; o.quiet = true;
    g.lastHit.dx = 0; g.lastHit.dz = 0;
    g.destruction.sphere(p.x, p.y, p.z, p.cloud, 1.7, o);
    o.quiet = false; o.spare = false;
    for (let i = 0; i < 60 * g.fx.thin + 10; i++) {
      const a = r() * 6.283, e = (r() - 0.3) * 1.4, s = p.cloud * (0.4 + r() * 0.8);
      g.fx.add(p.x, p.y, p.z, Math.cos(a) * Math.cos(e) * s, Math.sin(e) * s * 0.6, Math.sin(a) * Math.cos(e) * s, 2 + p.cloud * 0.1, p.cloud * 0.08, 2.2, 0.18, 0.1, 0.28, 0.85, 0, 0, 1.5);
    }
    g.audio.boom(0.5);
  }

  // Ground wave: one blow after another through the earth, from the root to the aimed spot.
  groundWave(act) {
    const g = this.g, m = g.monster, B = this.base(), size = g.world.wrap ? g.world.sx : 0, x0 = m.x, z0 = m.z;
    const dx = wrapDelta(act.ax - x0, size), dz = wrapDelta(act.az - z0, size), d = Math.hypot(dx, dz) || 1, len = Math.min(d, B.H * 4 + 20), ux = dx / d, uz = dz / d;
    for (let i = 1; i <= 7; i++) {
      const s = (len * i) / 7;
      this.later(i * 0.08, () => {
        const x = x0 + ux * s, z = z0 + uz * s, gy = this.terrainBelow(x, z);
        this.shock(x, gy, z, B.H * 0.16, B.R * 0.5, B.P * 0.95, 4, i % 3 !== 0);
        g.fx.dust(x, gy + 1, z, B.H * 0.3, 0.6, 0.5, 0.4, 4);
      });
    }
    g.audio.boom(0.5); g.shake(0.4);
  }

  // The awakening of the deep: five tentacles burst out of the ground in a ring round the target, coil round it,
  // squeeze, and drag it down into the earth (its foundations go, and it sinks into its own rubble).
  kraken(act) {
    const g = this.g, w = g.world, B = this.base(), st = w.structureAt(act.ax, act.az), big = st && st.major && !st.done ? st : null;
    const cx = big ? (big.x0 + big.x1) / 2 + 0.5 : act.ax, cz = big ? (big.z0 + big.z1) / 2 + 0.5 : act.az;
    const r = big ? Math.min(Math.max(big.x1 - big.x0, big.z1 - big.z0) * 0.55 + 2, B.H * 1.5) : B.H * 0.4 + 6, gy = big ? big.y0 : this.terrainBelow(cx, cz);
    const top = big ? Math.min(big.top, gy + B.H * 3) : gy + B.H * 1.6;
    this.krakens.push({ cx, cz, gy, r, h: Math.max(B.H * 0.8, top - gy + 3), w: B.H * 0.2 + 1, t: 0, life: act.S, a0: g.rng() * 6.283, st: big });
    g.audio.boom(0.9); g.shake(0.8);
  }
  krakenTick(act, b0, b1) {
    const K = this.krakens[this.krakens.length - 1], g = this.g, B = this.base(), o = this.opt;
    if (!K) return;
    eachShot(b0, b1, 18, (k) => {
      const u = k / 18;
      o.impulse = launch(B.H * 1.2 + 8); o.debris = 40; o.spare = false; o.blast = 0; o.quiet = k % 3 !== 0;
      for (let i = 0; i < 5; i++) {
        const a = K.a0 + (i / 5) * 6.283, ca = Math.cos(a), sa = Math.sin(a), bx = K.cx + ca * K.r, bz = K.cz + sa * K.r;
        o.dx = -ca; o.dz = -sa; g.lastHit.dx = -ca; g.lastHit.dz = -sa;
        if (u < 0.25) g.destruction.sphere(bx, K.gy + 1, bz, B.R * 0.7, B.P * 1.2, o); // bursting out of the ground
        else if (u < 0.6) { const y = K.gy + K.h * (0.25 + 0.6 * ((u - 0.25) / 0.35)); g.destruction.capsule(bx, y, bz, K.cx + ca * K.r * 0.3, y, K.cz + sa * K.r * 0.3, B.R * 0.45, B.P * 1.3, o); } // coiling round, squeezing in
        else { o.dy = -0.6; g.destruction.sphere(K.cx + ca * K.r * 0.55, K.gy + 1 + B.R * 0.5, K.cz + sa * K.r * 0.55, B.R * 1.05, B.P * 1.6, o); o.dy = 0.15; } // down: the foundations go
      }
      o.quiet = false;
      if (K.st && u >= 0.6) { g.stability.weaken(K.st, 0.15 * clamp((0.3 * g.monster.h ** 3) / Math.max(200, K.st.remaining), 0.1, 1)); g.onShove(g.monster, K.cx, K.cz, 0, 0, 2); }
      g.shake(0.2);
    });
  }

  // Starts a move. heavy = the slow, strong version.
  use(moveId, heavy) {
    const g = this.g, m = g.monster;
    if (this.act || this.cool > 0) return;
    if (g.fly) { this.flyFire(heavy); return; }
    const sp = g.progress.species;
    if (sp === 'tentacle' && (m.under || m.pose.emerge < 0.9)) { this.queued = { moveId, heavy }; m.surface(); return; } // up out of the ground first
    if (!m.onGround && !m.cling && !airborne(sp)) return; // no attacks in mid-jump (but while hanging on a wall); aircraft and helicopter are always in the air
    const list = movesFor(sp), move = list.find((x) => x.id === moveId) ?? list[0];
    const v = heavy ? move.heavy : move.light, aim = g.aim;
    // Tank, excavator and aircraft keep their course: only the upper part turns towards the target.
    if ((!tracked(sp) && !airborne(sp)) || v.root) m.faceTo(aim.x, aim.z);
    this.side = -this.side;
    // Bigger creatures take a little longer to wind up: more weight to move.
    const slow = 1 + m.stage * 0.035;
    this.act = { move, v, heavy, t: 0, W: v.wind * slow, S: v.strike, R: v.recover * slow, ax: aim.x, ay: aim.y, az: aim.z, heading: m.heading, side: this.side, begun: false, hit: false, landed: false, rem: g.world.remaining };
    if (heavy) g.emote(v.cutIn ? 'menace' : 'alert'); // the tentacle's "!" before a heavy blow, its ゴゴゴ before the greatest
    if (v.cutIn) { g.hud.cutIn(); g.hitStop = Math.max(g.hitStop, 0.3); g.audio.roar(m.stage); } // the world holds its breath
    g.emit('tool', heavy ? 'heavy' : 'light');
    g.stat(heavy ? 'heavy' : 'light');
    if (heavy) g.audio.whoosh();
  }

  // Fly mode has no body: a bolt for the light attack, a rocket for the heavy one.
  flyFire(heavy) {
    const g = this.g, B = this.base(), o = this.o;
    o[0] = g.eye[0]; o[1] = g.eye[1] - 2; o[2] = g.eye[2];
    this.cool = heavy ? 0.6 : 0.18;
    if (heavy) this.rocket(o, g.aim, 6 + B.S * 1.3, 14 + B.S * 2, 60);
    else { this.bolt(o, g.aim, 0.8 + B.S * 0.12, 4 + B.S * 0.5, 1, 0.3, 0.2); g.audio.laser(); }
    g.emit('tool', heavy ? 'heavy' : 'light');
  }

  // Poses a model for time t of a move and returns the move's length; used by the demonstration ghost.
  poseFor(species, moveId, heavy, pose, t) {
    const list = movesFor(species), move = list.find((x) => x.id === moveId) ?? list[0], v = heavy ? move.heavy : move.light;
    const S = Math.min(v.strike, 1.2), a = ease(Math.min(1, t / v.wind)), b = clamp((t - v.wind) / S, 0, 1), c = clamp((t - v.wind - S) / v.recover, 0, 1);
    v.pose(pose.j, pose, a, b, c, this.ghostAct);
    return v.wind + S + v.recover;
  }

  updateAct(dt) {
    const g = this.g, m = g.monster, a = this.act, v = a.v, t0 = a.t;
    a.t += dt;
    if (v.root) m.heading = a.heading; else if (!tracked(g.progress.species) && !airborne(g.progress.species)) m.faceTo(g.aim.x, g.aim.z);
    const A = ease(Math.min(1, a.t / a.W)), b = clamp((a.t - a.W) / a.S, 0, 1), c = clamp((a.t - a.W - a.S) / a.R, 0, 1);
    v.pose(m.pose.j, m.pose, A, b, c, a);
    if (a.t < a.W) { if (v.windTick && g.rng() < 0.6) v.windTick(this, a); return; }
    if (!a.begun) { a.begun = true; v.begin?.(this, a); }
    const b0 = clamp((t0 - a.W) / a.S, 0, 1);
    if (v.tick && b0 < 1) v.tick(this, a, dt, b0, b);
    if (!a.hit && b >= (v.hitAt ?? 0.5)) { a.hit = true; v.hit?.(this, a); }
    if (a.t >= a.W + a.S + a.R) {
      v.end?.(this, a);
      if (a.heavy && g.world.remaining === a.rem) g.emote('sweat'); // all that effort, and nothing gave way
      if (this.held && g.progress.species !== 'chopper') this.release(1, false); // the helicopter's load stays on its rope
      this.act = null;
      this.cool = 0.05;
    }
  }

  // Called by the game when an aimed leap touches down.
  leapLanded() {
    const a = this.act;
    if (!a || !a.v.airborne || a.landed) return;
    a.landed = true;
    a.t = a.W + a.S; // skip to the recovery
    a.v.land(this, a);
  }

  // ---- building blocks ---------------------------------------------------------------

  // One blow. heavy adds the long hit stop and a pressure wave; debris overrides the number of flying cubes.
  blow(x, y, z, r, p, heavy, dx, dz, quietFx = false, debris = 0) {
    const g = this.g, o = this.opt, B = this.base();
    o.dx = dx; o.dz = dz; o.impulse = launch(B.H * (heavy ? 3 : 2) + 10); o.debris = debris || (heavy ? 160 : 80); o.spare = false; o.blast = heavy ? launch(B.H) : 0;
    g.lastHit.dx = dx; g.lastHit.dz = dz; g.lastHit.pop = launch(B.H * (heavy ? 0.5 : 0.15));
    const n = g.destruction.sphere(x, y, z, r, p, o);
    g.actors.hitAir(x, y, z, r + 2);
    if (n && !quietFx) g.impactFx(x, y, z, r * 1.2, (heavy ? 0.6 : 0.3) + B.S * 0.07, heavy);
    return n;
  }

  // A ring of blows around a point: the shock that runs through the ground.
  shock(x, y, z, radius, r, p, count, quiet = false) {
    const g = this.g, o = this.opt, B = this.base();
    o.impulse = launch(B.H * 2 + 6); o.debris = 24; o.spare = false; o.blast = launch(B.H * 0.8);
    g.lastHit.pop = launch(B.H * 0.35);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 6.283 + radius;
      o.dx = Math.cos(a); o.dz = Math.sin(a);
      g.lastHit.dx = o.dx; g.lastHit.dz = o.dz;
      g.destruction.sphere(x + o.dx * radius, y + r * 0.3, z + o.dz * radius, r, p, o);
    }
    g.fx.dust(x, y + 1, z, radius * 0.8, 0.78, 0.74, 0.66, quiet ? 4 : 10);
    if (!quiet) { g.shake(0.5 + B.S * 0.08); g.audio.boom(0.4 + B.S * 0.06); }
  }

  // Where a blow lands: the first solid thing between the body and the aimed spot, within reach.
  // low = aimed at the ground in front rather than at chest height.
  reachHit(act, up, reachMul, low = false) {
    const g = this.g, m = g.monster, B = this.base(), cy = m.y + B.H * up, reach = B.H * reachMul + 2, q = this.hp;
    let dx = act.ax - m.x, dy = clamp(act.ay, m.y + B.H * (low ? 0.02 : 0.1), m.y + B.H * (low ? 0.5 : 1.15)) - cy, dz = act.az - m.z;
    const dl = Math.hypot(dx, dy, dz) || 1;
    dx /= dl; dy /= dl; dz /= dl;
    let t = B.H * 0.2;
    for (; t < reach; t += 0.5) {
      const x = m.x + dx * t, y = cy + dy * t, z = m.z + dz * t;
      if (g.world.get(Math.floor(x), Math.floor(y), Math.floor(z)) || g.bodies.solidAt(x, y, z)) break;
    }
    t = Math.min(t + 1, reach, dl);
    q[0] = m.x + dx * t; q[1] = cy + dy * t; q[2] = m.z + dz * t;
    const hl = Math.hypot(dx, dz) || 1;
    this.dx = dx / hl; this.dz = dz / hl;
    return q;
  }

  // Dino tail: while the body turns, the tail hits everything along its length in the half circle in front.
  tailSweep(act, v, b0, b1, reaches, rMul, pMul, heavy) {
    const g = this.g, m = g.monster, B = this.base(), o = this.opt;
    const y = clamp(act.ay, m.y + B.H * 0.18, m.y + B.H * 0.7);
    o.impulse = launch(B.H * (heavy ? 3.2 : 2.2) + 10); o.debris = heavy ? 120 : 60; o.spare = true; o.blast = 0;
    let n = 0, hx = 0, hz = 0;
    for (let k = 1; k <= 4; k++) {
      const b = b0 + ((b1 - b0) * k) / 4, ang = act.heading + v.spin(1, b, 0) * act.side + Math.PI;
      const off = Math.atan2(Math.sin(ang - act.heading), Math.cos(ang - act.heading));
      if (Math.abs(off) > 1.5) continue;
      const sx = Math.sin(ang), sz = Math.cos(ang);
      o.dx = sz * act.side; o.dz = -sx * act.side; // debris flies along the sweep
      g.lastHit.dx = o.dx; g.lastHit.dz = o.dz; g.lastHit.pop = launch(B.H * (heavy ? 0.5 : 0.2));
      for (const r of reaches) {
        const c = g.destruction.sphere(m.x + sx * B.H * r, y, m.z + sz * B.H * r, B.R * rMul * 0.85, B.P * pMul, o);
        g.actors.hitAir(m.x + sx * B.H * r, y, m.z + sz * B.H * r, B.R * rMul + 2);
        if (c) { n += c; hx = m.x + sx * B.H * r; hz = m.z + sz * B.H * r; }
      }
    }
    o.spare = false;
    if (n && g.time - (act.fxT ?? -1) > 0.09) { act.fxT = g.time; g.impactFx(hx, y, hz, B.R * rMul * 1.3, (heavy ? 0.6 : 0.3) + B.S * 0.07, heavy); }
  }

  // Excavator: the arm sweeps round with the upper carriage; everything along it in the arc is hit.
  armSweep(act, v, b0, b1, reaches, rMul, pMul, heavy) {
    const g = this.g, m = g.monster, B = this.base(), o = this.opt, size = g.world.wrap ? g.world.sx : 0;
    const y = clamp(act.ay, m.y + B.H * 0.15, m.y + B.H * 0.9), aimYaw = Math.atan2(wrapDelta(act.ax - m.x, size), wrapDelta(act.az - m.z, size));
    o.impulse = launch(B.H * (heavy ? 3 : 2) + 10); o.debris = heavy ? 120 : 60; o.spare = true; o.blast = 0;
    let n = 0, hx = 0, hz = 0;
    for (let k = 1; k <= 4; k++) {
      const b = b0 + ((b1 - b0) * k) / 4, ang = aimYaw + v.turn(1, b, 0) * act.side, sx = Math.sin(ang), sz = Math.cos(ang);
      o.dx = sz * act.side; o.dz = -sx * act.side; // debris flies along the swing
      g.lastHit.dx = o.dx; g.lastHit.dz = o.dz; g.lastHit.pop = launch(B.H * (heavy ? 0.45 : 0.2));
      for (const r of reaches) {
        const x = m.x + sx * B.H * r, z = m.z + sz * B.H * r, c = g.destruction.sphere(x, y, z, B.R * rMul * 0.8, B.P * pMul, o);
        g.actors.hitAir(x, y, z, B.R * rMul + 2);
        if (c) { n += c; hx = x; hz = z; }
      }
    }
    o.spare = false;
    if (n && g.time - (act.fxT ?? -1) > 0.09) { act.fxT = g.time; g.impactFx(hx, y, hz, B.R * rMul * 1.2, (heavy ? 0.6 : 0.3) + B.S * 0.07, heavy); }
  }

  // Excavator: one blow of the hydraulic breaker. The face it hits crumbles, and the chisel drives a hole deep into
  // the building in the direction of the target. rMul: width, pMul: force (a breaker gets through concrete early),
  // depth: voxels beyond the contact point. crack: the blow also sends cracks through the wall around it.
  // shaken: how much every blow weakens the whole building for good (stability.js): a breaker shakes a building to
  // its foundations, so after a long hammering it may come down on its own.
  chisel(act, rMul, pMul, depth, crack = false, shaken = 0) {
    const g = this.g, B = this.base(), q = this.reachHit(act, 0.4, 1.25), o = this.opt;
    o.dx = this.dx; o.dz = this.dz; o.impulse = launch(B.H + 6); o.debris = 14; o.spare = false; o.blast = 0;
    g.lastHit.dx = this.dx; g.lastHit.dz = this.dz;
    const d = depth + B.H * 0.3;
    let n = g.destruction.sphere(q[0], q[1], q[2], B.R * 0.55 * rMul, B.P * pMul * 0.8, o);
    n += g.destruction.capsule(q[0], q[1], q[2], q[0] + this.dx * d, q[1], q[2] + this.dz * d, 0.8 + B.R * 0.35 * rMul, B.P * pMul, o);
    if (crack) this.shock(q[0] + this.dx * d * 0.5, q[1] - B.R * 0.3, q[2] + this.dz * d * 0.5, B.H * 0.18, B.R * 0.45, B.P * 0.9, 5, true);
    const st = shaken && g.world.structureAt(q[0] + this.dx * 2, q[2] + this.dz * 2);
    if (st && st.major && n) g.stability.weaken(st, shaken);
    if (n) { g.fx.sparks(q[0], q[1], q[2], 10, 5, 1, 0.9, 0.6); g.fx.dust(q[0], q[1], q[2], 1.5 + B.R * 0.3, 0.78, 0.76, 0.71, 1); g.audio.hit('metal', 0.2); g.audio.hit('stone', 0.15); }
  }

  // Robot blade: cuts along the line from the body out to full reach, between two angles.
  // The blade is the robot's first move: what it cuts through grows with the stage (glass and brick at first, steel later).
  cut(act, a1, a0, lift, b) {
    const g = this.g, m = g.monster, B = this.base(), reach = B.H * 1.5 + 5;
    const y = clamp(act.ay, m.y + B.H * 0.15, m.y + B.H) + B.H * lift, o = this.opt;
    o.dx = 0; o.dz = 0; o.impulse = launch(reach * 0.25 + 4); o.debris = 6; o.spare = false; o.blast = 0; o.quiet = true;
    let n = 0;
    for (let k = 1; k <= 3; k++) {
      const a = a0 + ((a1 - a0) * k) / 3, sx = Math.sin(a), sz = Math.cos(a);
      g.lastHit.dx = sx; g.lastHit.dz = sz;
      n += g.destruction.capsule(m.x + sx * 2, y, m.z + sz * 2, m.x + sx * reach, y + Math.sin(b * 6) * reach * 0.06, m.z + sz * reach, 0.9, B.P * 1.25, o);
      this.rays.push({ ax: m.x + sx * B.H * 0.3, ay: y, az: m.z + sz * B.H * 0.3, bx: m.x + sx * reach, by: y, bz: m.z + sz * reach, w: 0.7 + B.H * 0.01, r: 0.3, g: 0.9, b: 1, life: 0.08 });
    }
    o.quiet = false;
    if (n) { g.fx.sparks(m.x + Math.sin(a1) * reach * 0.7, y, m.z + Math.cos(a1) * reach * 0.7, 14, 3, 0.4, 0.9, 1); g.audio.sword(); }
  }

  // The planet is drawn bent, so a line that is straight in the world looks curved on screen like a jet of
  // water. Beams therefore run straight in the picture instead: the march goes through "picture space"
  // (positions as drawn), and every sample is converted back to the world for the voxel test.
  // toPicture/toWorld do the two conversions; on flat islands they change nothing.
  toPicture(out, x, y, z) {
    const c = this.g.cam, rx = wrapDelta(x - c.focusX, c.wrap), rz = wrapDelta(z - c.focusZ, c.wrap);
    out[0] = rx; out[1] = y - (rx * rx + rz * rz) * c.curv; out[2] = rz;
    return out;
  }
  toWorld(out, vx, vy, vz) {
    const c = this.g.cam;
    out[0] = c.focusX + vx; out[1] = vy + (vx * vx + vz * vz) * c.curv; out[2] = c.focusZ + vz;
    return out;
  }

  // Marches from o towards the target along a line that is straight on screen. Afterwards `hit` holds the
  // world position of the first solid thing (helicopters included) or of the end of the range, hitSolid
  // tells which, and rdx/rdy/rdz is the beam's direction in the world at that point.
  trace(o, tx, ty, tz, max) {
    const g = this.g, a = this.toPicture(this.pa, o[0], o[1], o[2]), b = this.toPicture(this.pb, tx, ty, tz), p = this.hit;
    let dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    this.pdx = dx; this.pdy = dy; this.pdz = dz;
    this.hitSolid = false;
    let t = 2;
    for (let i = 0; t < max; t += 0.7, i++) {
      this.toWorld(p, a[0] + dx * t, a[1] + dy * t, a[2] + dz * t);
      if (p[1] < 0 || p[1] > g.world.sy + 60) break;
      if (g.world.get(Math.floor(p[0]), Math.floor(p[1]), Math.floor(p[2])) || g.bodies.solidAt(p[0], p[1], p[2])) { this.hitSolid = true; break; }
      if (i % 6 === 0 && g.actors.hitAir(p[0], p[1], p[2], 4)) { this.hitSolid = true; break; }
    }
    this.hitT = t;
    this.toWorld(p, a[0] + dx * t, a[1] + dy * t, a[2] + dz * t);
    const q = this.toWorld(this.deep, a[0] + dx * (t + 1), a[1] + dy * (t + 1), a[2] + dz * (t + 1));
    const l = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) || 1;
    this.rdx = (q[0] - p[0]) / l; this.rdy = (q[1] - p[1]) / l; this.rdz = (q[2] - p[2]) / l;
    return t;
  }

  // World position `depth` further along the last traced beam: how deep it burns in.
  beyond(depth) {
    const a = this.pa, t = this.hitT + depth;
    return this.toWorld(this.deep, a[0] + this.pdx * t, a[1] + this.pdy * t, a[2] + this.pdz * t);
  }

  // A short laser pulse: a flash of light and a small, deep hole.
  bolt(o, aim, radius, depth, r, gr, b) {
    const g = this.g, opt = this.opt;
    this.trace(o, aim.x, aim.y, aim.z, 520);
    const bx = this.hit[0], by = this.hit[1], bz = this.hit[2];
    this.rays.push({ ax: o[0], ay: o[1], az: o[2], bx, by, bz, w: radius * 0.9, r, g: gr, b, life: 0.07 });
    if (!this.hitSolid) return;
    opt.dx = this.rdx; opt.dz = this.rdz; opt.impulse = launch(8); opt.debris = 8; opt.spare = false; opt.blast = 0;
    g.lastHit.dx = this.rdx; g.lastHit.dz = this.rdz;
    const e = this.beyond(depth);
    g.destruction.capsule(bx, by, bz, e[0], e[1], e[2], radius, 60, opt);
    g.fx.sparks(bx, by, bz, 16, 4, r, gr, b);
    if (g.rng() < 0.4) g.fire.heatSphere(bx + this.rdx * 2, by + this.rdy * 2, bz + this.rdz * 2, radius + 2.5, 2, 5);
  }

  // A continuous beam for one simulation step: burns deeper every step, sets fire, leaves glowing spots.
  ray(o, aim, radius, depth, r, gr, b, burn, dt) {
    const g = this.g, opt = this.opt;
    this.trace(o, aim.x, aim.y, aim.z, 560);
    const bx = this.hit[0], by = this.hit[1], bz = this.hit[2];
    this.rays.push({ ax: o[0], ay: o[1], az: o[2], bx, by, bz, w: radius, r, g: gr, b, life: dt * 1.6 });
    g.audio.laser();
    if (!this.hitSolid) return;
    opt.dx = this.rdx; opt.dz = this.rdz; opt.impulse = launch(10 + radius * 3); opt.debris = 6; opt.spare = false; opt.blast = 0; opt.quiet = true;
    g.lastHit.dx = this.rdx; g.lastHit.dz = this.rdz;
    const e = this.beyond(depth);
    g.destruction.capsule(bx, by, bz, e[0], e[1], e[2], radius, 70, opt);
    opt.quiet = false;
    if (g.rng() < 0.6) g.fx.sparks(bx, by, bz, 18, 3, r, gr, b);
    if (burn && g.rng() < 0.35) g.fire.heatSphere(bx + this.rdx * 2, by + this.rdy * 2, bz + this.rdz * 2, radius + 3, 3.5, 6);
    if (burn && g.rng() < 0.05) g.fire.spot(bx, by, bz, radius + 0.5, 2 + g.rng() * 3);
  }

  // A stream of fire: sets alight what can burn and chars the rest a little.
  flame(ox, oy, oz, range, spread, rays, power) {
    const g = this.g, aim = g.aim, r = g.rng;
    let dx = aim.x - ox, dy = aim.y - oy, dz = aim.z - oz;
    const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    for (let k = 0; k < rays; k++) {
      const rx = dx + (r() - 0.5) * spread, ry = dy + (r() - 0.5) * spread, rz = dz + (r() - 0.5) * spread;
      for (let t = 2; t < range; t += 1.5) {
        const x = ox + rx * t, y = oy + ry * t, z = oz + rz * t;
        if (r() < 0.25) g.fire.flame(x, y, z, 1 + t * 0.06);
        if (!g.world.get(Math.floor(x), Math.floor(y), Math.floor(z))) continue;
        g.fire.heatSphere(x, y, z, 3.5, 3.2, 8); // lights what can burn at once; stone and metal turn black if the flame stays on them
        if (r() < 0.25) g.destruction.sphere(x, y, z, 2 + power * 0.3, power, { quiet: true, debris: 3 });
        if (r() < 0.03) g.fire.spot(x, y, z, 1.5, 3 + r() * 3);
        break;
      }
    }
  }

  rocket(o, aim, radius, power, speed, arc = false, size = 1) {
    let dx = aim.x - o[0], dy = aim.y - o[1], dz = aim.z - o[2];
    const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    if (arc) dy += 0.35; // salvo rockets climb first, then come down on the target
    this.proj.push({ kind: 'rocket', x: o[0], y: o[1], z: o[2], vx: dx * speed, vy: dy * speed, vz: dz * speed, r: (0.8 + this.g.monster.stage * 0.15) * size, radius, power, life: 7, grav: 0, lock: this.g.aim.lock ?? null, tx: aim.x, ty: aim.y, tz: aim.z, homing: arc });
    this.g.audio.rocket();
  }

  // A shell from a barrel. blast > 0: explodes once it has punched through `pierce` obstacles.
  shell(o, aim, r, power, pierce, blast, speed, spread) {
    const rnd = this.g.rng;
    let dx = aim.x - o[0], dy = aim.y - o[1], dz = aim.z - o[2];
    const d = Math.hypot(dx, dy, dz) || 1;
    dx = dx / d + (rnd() - 0.5) * spread; dy = dy / d + (rnd() - 0.5) * spread + d * 0.0004; dz = dz / d + (rnd() - 0.5) * spread;
    this.proj.push({ kind: 'ball', x: o[0], y: o[1], z: o[2], vx: dx * speed, vy: dy * speed, vz: dz * speed, r, power, pierce, blast, life: 5, grav: 22 });
  }

  // A bomb from the aircraft: it keeps the aircraft's forward speed and falls. scatter spreads a stick sideways;
  // fire = fire bomb; size scales the bomb itself.
  bomb(radius, power, scatter, fire = false, size = 1) {
    const g = this.g, m = g.monster, r = g.rng, fx = Math.sin(m.heading), fz = Math.cos(m.heading), v = m.speed * 0.85;
    this.proj.push({ kind: 'mortar', x: m.x, y: m.y - m.h * 0.25, z: m.z, vx: fx * v + fz * (r() - 0.5) * 30 * scatter, vy: -10, vz: fz * v - fx * (r() - 0.5) * 30 * scatter,
      r: (0.9 + m.stage * 0.15) * size, radius, power, life: 12, grav: GRAVITY, fire });
    g.audio.whoosh();
  }

  // A shell on a high arc that explodes where it comes down.
  lob(o, aim, radius, power) {
    const d = Math.hypot(aim.x - o[0], aim.z - o[2]), tf = clamp(d / 60, 0.9, 2.6);
    this.proj.push({ kind: 'mortar', x: o[0], y: o[1], z: o[2], vx: (aim.x - o[0]) / tf, vy: (aim.y - o[1]) / tf + 0.5 * GRAVITY * tf, vz: (aim.z - o[2]) / tf, r: 0.9 + this.g.monster.stage * 0.15, radius, power, life: 8, grav: GRAVITY });
  }

  mine(o, aim, radius, power, fuse) {
    const d = Math.hypot(aim.x - o[0], aim.z - o[2]), tf = clamp(d / 50, 0.4, 1.8);
    this.proj.push({ kind: 'dynamite', x: o[0], y: o[1], z: o[2], vx: (aim.x - o[0]) / tf, vy: (aim.y - o[1]) / tf + 0.5 * GRAVITY * tf, vz: (aim.z - o[2]) / tf, r: 0.8 + this.g.monster.stage * 0.12, radius, power, stuck: false, fuse, life: 9, grav: GRAVITY });
  }

  // Marks a spot; a moment later a column of light comes down on it from the sky.
  skyStrike(x, y, z, radius, blast, power) {
    this.marks.push({ x, y, z, radius, blast, power, t: 0.9 });
    this.g.audio.tick();
  }

  // Picks something up to throw. In this order: an object close by that can be lifted whole (a car, a tree,
  // a garden gnome; how big it may be depends on the creature), otherwise a lump torn out of whatever the
  // hand reaches (a piece of a building), and if there is nothing at all, a lump of the ground underfoot.
  // The creature never comes away empty-handed.
  // cx/cz: where to look round for an object (default: the creature itself; the helicopter's hook looks where it is lowered).
  grab(x, y, z, r, cx, cz) {
    const g = this.g, w = g.world, m = g.monster, hooked = cx !== undefined;
    if (this.held) return;
    const fits = (st) => st && st.grabbable && st.remaining > 3 && Math.max(st.x1 - st.x0, st.z1 - st.z0, st.top - (st.y0 ?? 0)) < r * 5 + 6;
    // Look around for an object: the nearest one within a good arm's length.
    let obj = null, best = 1e9, ox = 0, oz = 0, last = 0;
    const R = Math.ceil(m.h * (hooked ? 0.5 : 1.3) + 6), mx = Math.floor(hooked ? cx : m.x), mz = Math.floor(hooked ? cz : m.z);
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const d = dx * dx + dz * dz;
      if (d >= best || d > R * R) continue;
      const cx = w.wrap ? (mx + dx) & w.mx : mx + dx, cz = w.wrap ? (mz + dz) & w.mz : mz + dz;
      if (cx < 0 || cz < 0 || cx >= w.sx || cz >= w.sz) continue;
      const id = w.footprint[cx + w.sx * cz];
      if (!id || id === last) continue;
      last = id;
      if (!fits(w.structures[id])) { last = id; continue; }
      best = d; obj = w.structures[id]; ox = mx + dx; oz = mz + dz; last = 0;
    }
    let n = 0, cells;
    if (obj) {
      // Small things come up whole.
      const st = obj, ax = ox, az = oz, span = Math.max(st.x1 - st.x0, st.z1 - st.z0) + 2;
      x = ox + 0.5; z = oz + 0.5;
      if (!hooked) m.faceTo(x, z);
      cells = g.bodies.reserve((span * 2 + 1) ** 2 * (st.top + 1));
      for (let dz = -span; dz <= span; dz++) for (let dx = -span; dx <= span; dx++) {
        const cx = w.wrap ? (ax + dx) & w.mx : ax + dx, cz = w.wrap ? (az + dz) & w.mz : az + dz;
        if (cx < 0 || cz < 0 || cx >= w.sx || cz >= w.sz || w.footprint[cx + w.sx * cz] !== st.id) continue;
        for (let yy = 0; yy <= st.top; yy++) {
          const t = w.get(cx, yy, cz);
          if (!t || isTerrain(t)) continue;
          cells[n * 4] = ax + dx; cells[n * 4 + 1] = yy; cells[n * 4 + 2] = az + dz; cells[n * 4 + 3] = t;
          n++;
          w.set(cx, yy, cz, 0);
        }
      }
    }
    // A lump out of a sphere. solidOnly: only if there is something built there (not just ground).
    const lump = (px, py, pz, solidOnly) => {
      const ax = Math.floor(px), ay = Math.floor(py), az = Math.floor(pz), ri = Math.ceil(r);
      if (solidOnly) {
        let built = 0;
        for (let dy = -ri; dy <= ri && built < 3; dy += 2) for (let dz = -ri; dz <= ri && built < 3; dz += 2) for (let dx = -ri; dx <= ri; dx += 2) { const t = w.get(ax + dx, ay + dy, az + dz); if (t && !isTerrain(t)) built++; }
        if (built < 3) return 0;
      }
      cells = g.bodies.reserve((2 * ri + 1) ** 3);
      let k = 0;
      for (let dy = -ri; dy <= ri; dy++) for (let dz = -ri; dz <= ri; dz++) for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dy * dy + dz * dz > r * r) continue;
        const t = w.get(ax + dx, ay + dy, az + dz);
        if (!t || TYPE_MAT[t] === MAT.BEDROCK || ay + dy < 1) continue;
        cells[k * 4] = ax + dx; cells[k * 4 + 1] = ay + dy; cells[k * 4 + 2] = az + dz; cells[k * 4 + 3] = isTerrain(t) ? t | RUBBLE : t;
        k++;
        w.set(ax + dx, ay + dy, az + dz, 0);
        g.destruction.addSeeds(ax + dx, ay + dy, az + dz);
      }
      return k;
    };
    if (n < 3) n = lump(x, y, z, true); // a piece of the building within reach
    if (n < 3) { // nothing built: a lump of the ground in front of the feet
      const o = this.at(this.hp, 0, 0.55);
      if (hooked) { x = cx; z = cz; y = w.heightBelow(x, z, w.sy - 1) - r * 0.35; }
      else { x = o[0]; z = o[2]; y = w.heightBelow(x, z, m.y + m.h * 0.5) - r * 0.35; }
      n = lump(x, y, z, false);
    }
    if (n < 3) return;
    const b = g.bodies.fromCells(n);
    b.kinematic = true;
    this.held = b;
    g.audio.hit('earth', 0.6);
    g.fx.dust(x, y, z, r * 0.7, 0.6, 0.5, 0.4, 5);
  }

  // Throws the held lump at the aimed spot. mult = how much faster than a normal throw; hard = it lands like a bomb.
  release(mult, hard) {
    const g = this.g, b = this.held, B = this.base(), aim = g.aim;
    this.held = null;
    if (!b || b.dead) return;
    b.kinematic = false; b.thrown = true; b.age = 0;
    const dx = aim.x - b.pos[0], dy = aim.y - b.pos[1], dz = aim.z - b.pos[2], dist = Math.hypot(dx, dz);
    const tf = clamp(dist / ((38 + B.H * 1.2) * mult), 0.25, 2.4);
    b.v[0] = dx / tf; b.v[1] = dy / tf + 0.5 * GRAVITY * tf; b.v[2] = dz / tf;
    b.w[0] = (g.rng() - 0.5) * 4; b.w[1] = (g.rng() - 0.5) * 4; b.w[2] = (g.rng() - 0.5) * 4;
    b.hard = hard;
    g.audio.whoosh();
  }

  stomp() {
    const g = this.g, m = g.monster, sp = g.progress.species;
    if (sp === 'chopper' || g.fly) return; // the helicopter's up and down are held, not pressed
    if (sp === 'tentacle') { // the big button: down into the ground or up out of it
      if (this.act || !(m.under ? m.surface() : m.dive())) return;
      g.emit('ability', 'stomp');
      return;
    }
    if (this.act || !m.jump()) return;
    g.emit('ability', 'stomp');
    g.audio.whoosh();
  }

  // Called when the monster lands after a jump.
  stompLand(m) {
    const B = this.base(), k = m.flipped ? 1.3 : 1; // coming down out of a somersault hits a third harder and wider
    // A landing is a blow among others, not the strongest one: a crater about a third of the creature wide and a modest ring.
    this.blow(m.x, m.y + m.h * 0.05, m.z, (m.h * 0.28 + 1) * k, (3 + m.stage * 0.9) * k, true, 0, 0, true);
    this.shock(m.x, m.y, m.z, m.h * 0.38 * k, m.h * 0.2 + 1, (3 + m.stage * 0.9) * 0.6 * k, m.flipped ? 6 : 4);
    this.g.impactFx(m.x, m.y + 1, m.z, B.H * 0.5, 0.5 + m.stage * 0.1, false);
  }

  // Ground pound landing. Size and stage are those of a creature one stage higher; the blow is pure weight:
  // a crater under the seat and two rings running outwards. Each further floor of a chain hits a little softer.
  poundLand(m, chain) {
    const g = this.g, w = g.world, S = m.stage + 1, k = 0.88 ** chain;
    const H = Math.min(w.monsterBase * stageScale(S), w.sy * 0.92), P = (3.5 + S * 1.2) * 1.15 * k, x = m.x, y = m.y, z = m.z;
    this.blow(x, y + H * 0.05, z, H * 0.34 + 1, P, true, 0, 0, true, 200);
    this.shock(x, y, z, H * 0.45, H * 0.22 + 1, P * 0.7, 8);
    if (chain === 0) this.later(0.1, () => this.shock(x, y, z, H * 0.75, H * 0.18 + 1, P * 0.5, 10, true));
    g.impactFx(x, y + 1, z, H * 0.6, 0.9 + S * 0.1, true);
    g.debris.blast(x, y, z, H * 2, launch(H * 1.5));
    g.audio.boom(0.8 + S * 0.08);
  }

  roar() {
    const g = this.g, m = g.monster;
    if (this.roarCool > 0 || this.act) return;
    this.roarCool = 1.4;
    g.stat('roars');
    m.pose.roar = 1;
    g.audio.roar(m.stage);
    g.shake(0.4);
    g.emit('ability', 'roar');
    if (m.stage < 9 && !g.allUnlocked) return; // below stage 9 the roar is just for show
    const h = m.h, fx = Math.sin(m.heading), fz = Math.cos(m.heading), power = 4 + m.stage * 1.2;
    g.lastHit.dx = fx; g.lastHit.dz = fz;
    for (let ring = 1; ring <= 4; ring++) {
      const d = h * 0.7 * ring, n = ring + 1;
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n - 0.5) * 1.1, sx = fx * Math.cos(a) - fz * Math.sin(a), sz = fz * Math.cos(a) + fx * Math.sin(a);
        g.destruction.sphere(m.x + sx * d, m.y + h * (0.5 + (g.rng() - 0.5) * 0.4), m.z + sz * d, Math.min(28, h * 0.2 * ring + 2), power / ring + 1.2,
          { dx: sx, dy: 0.2, dz: sz, impulse: launch(h * 1.5 + 6), debris: 30, blast: launch(h), quiet: ring > 1 });
      }
    }
  }

  update(dt) {
    const g = this.g, w = g.world, m = g.monster;
    this.cool -= dt;
    this.roarCool -= dt;
    if (this.act) this.updateAct(dt);

    for (let i = this.timers.length - 1; i >= 0; i--) if ((this.timers[i].t -= dt) <= 0) { const f = this.timers[i].fn; this.timers.splice(i, 1); f(); }
    for (let i = this.rays.length - 1; i >= 0; i--) if ((this.rays[i].life -= dt) <= 0) this.rays.splice(i, 1);

    // A lump in the hands is carried above the head (the dino holds it in its jaws instead).
    if (this.held) {
      const b = this.held;
      if (b.dead) this.held = null;
      else if (g.progress.species !== 'dino' && g.progress.species !== 'chopper') { b.pos[0] = m.x; b.pos[1] = m.y + m.h * 1.15 + b.radius * 0.6; b.pos[2] = m.z; }
    }
    this.updateRope(dt);
    this.updateVortices(dt);
    for (let i = this.krakens.length - 1; i >= 0; i--) if ((this.krakens[i].t += dt) > this.krakens[i].life + 0.8) this.krakens.splice(i, 1);
    // An attack pressed below the ground: the tentacle comes up, then it strikes.
    if (this.queued && g.progress.species !== 'tentacle') this.queued = null;
    if (this.queued && !this.act) {
      if (m.under) m.surface();
      else if (m.pose.emerge > 0.9) { const q = this.queued; this.queued = null; this.use(q.moveId, q.heavy); }
    }

    for (let i = this.marks.length - 1; i >= 0; i--) {
      const s = this.marks[i];
      s.t -= dt;
      // The marker: a ring that closes in on the target.
      const a = g.rng() * 6.283, rr = s.radius * (1 + s.t * 3);
      g.fx.add(s.x + Math.cos(a) * rr, s.y + 1, s.z + Math.sin(a) * rr, 0, 2, 0, 1.2, 0, 0.2, 1, 0.3, 0.2, 1, 1);
      if (s.t > 0) continue;
      this.marks.splice(i, 1);
      const opt = this.opt, top = w.heightBelow(s.x, s.z, w.sy - 1);
      this.rays.push({ ax: s.x, ay: w.sy + 40, az: s.z, bx: s.x, by: 0, bz: s.z, w: s.radius * 1.3, r: 0.8, g: 0.95, b: 1, life: 0.45 });
      opt.dx = 0; opt.dz = 0; opt.impulse = launch(s.radius * 5 + 12); opt.debris = 40; opt.spare = false; opt.blast = 0; opt.quiet = true;
      g.lastHit.dx = 0; g.lastHit.dz = 0; g.lastHit.pop = 0;
      for (let y = top + s.radius; y > 0; y -= s.radius * 1.2) g.destruction.sphere(s.x, y, s.z, s.radius, 70, opt);
      opt.quiet = false;
      g.explode(s.x, Math.max(2, w.heightBelow(s.x, s.z, w.sy - 1)), s.z, s.blast, s.power);
      g.shake(1.2); g.hitStop = 0.08;
    }

    for (let i = this.proj.length - 1; i >= 0; i--) {
      const p = this.proj[i];
      p.life -= dt;
      let dead = p.life <= 0 || p.y < -6;
      if (p.kind === 'dynamite' && p.stuck) {
        p.fuse -= dt;
        if (g.rng() < 0.5) g.fx.sparks(p.x, p.y + 1, p.z, 5, 1, 0.5, 0.8, 1);
        if (Math.floor(p.fuse * 4) !== Math.floor((p.fuse + dt) * 4)) g.audio.tick();
        if (p.fuse <= 0) { g.explode(p.x, p.y, p.z, p.radius, p.power); dead = true; }
      } else if (!dead) {
        if (p.kind === 'rocket') {
          const sp = Math.hypot(p.vx, p.vy, p.vz), k = 1 + dt * 2.2;
          if (sp < 170) { p.vx *= k; p.vy *= k; p.vz *= k; }
          if (p.lock) { if (p.lock.state === 'fly') { p.tx = p.lock.x; p.ty = p.lock.y; p.tz = p.lock.z; p.homing = true; } else p.lock = null; } // locked on something that flies: follow it
          if (p.homing) { // salvo rockets bend towards their target
            const dx = p.tx - p.x, dy = p.ty - p.y, dz = p.tz - p.z, d = Math.hypot(dx, dy, dz) || 1, turn = Math.min(1, dt * 3.5);
            p.vx += ((dx / d) * sp - p.vx) * turn; p.vy += ((dy / d) * sp - p.vy) * turn; p.vz += ((dz / d) * sp - p.vz) * turn;
          }
          g.fx.add(p.x, p.y, p.z, 0, 1, 0, p.r, 2.5, 0.7, 0.85, 0.85, 0.85, 0.5, 0, -1, 1);
          g.fx.add(p.x, p.y, p.z, 0, 0, 0, p.r * 1.4, -2, 0.12, 1, 0.7, 0.2, 1, 1);
        } else if (p.kind === 'mortar' && g.rng() < 0.5) g.fx.add(p.x, p.y, p.z, 0, 0, 0, p.r, 1.5, 0.4, 0.6, 0.6, 0.6, 0.4, 0, 0, 1);
        p.vy -= p.grav * dt;
        const sp = Math.hypot(p.vx, p.vy, p.vz), steps = Math.max(1, Math.ceil((sp * dt) / 0.8)), h = dt / steps;
        for (let s = 0; s < steps && !dead; s++) {
          p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
          const air = (s & 3) === 0 && g.actors.hitAir(p.x, p.y, p.z, p.r + 3);
          if (!air && !w.get(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z)) && !g.bodies.solidAt(p.x, p.y, p.z)) continue;
          const inv = 1 / (sp || 1);
          g.lastHit.dx = p.vx * inv; g.lastHit.dz = p.vz * inv;
          if (p.kind === 'ball') {
            const n = g.destruction.sphere(p.x, p.y, p.z, p.r * 2.4, p.power, { dx: p.vx * inv, dy: p.vy * inv, dz: p.vz * inv, impulse: launch(p.r * 14 + 10), debris: 60 });
            g.shake(0.1 + p.r * 0.12);
            p.power *= 0.62; p.pierce--;
            p.vx *= 0.8; p.vy *= 0.8; p.vz *= 0.8;
            if (!n || p.pierce <= 0) { dead = true; if (p.blast) g.explode(p.x, p.y, p.z, p.blast, p.power + 8); }
          } else if (p.kind === 'rocket' || p.kind === 'mortar') {
            g.explode(p.x, p.y, p.z, p.radius, p.power);
            if (p.ink) this.inkBurst(p);
            if (p.fire) { g.fire.heatSphere(p.x, p.y, p.z, p.radius * 2.5, 8, 160); for (let k = 0; k < 4; k++) g.fire.spot(p.x + (g.rng() - 0.5) * p.radius * 2, p.y, p.z + (g.rng() - 0.5) * p.radius * 2, 2, 6 + g.rng() * 6); }
            dead = true;
          } else {
            p.x -= p.vx * h; p.y -= p.vy * h; p.z -= p.vz * h;
            p.stuck = true;
            break;
          }
        }
      }
      if (dead) this.proj.splice(i, 1);
    }
  }

  // Projectiles as cube instances (pos3, scale3, yaw, tumble, rgba); returns the new write offset.
  write(out, o, time) {
    for (const p of this.proj) {
      const s = p.r * 2, d = p.kind === 'dynamite', rk = p.kind === 'rocket', blink = d && p.stuck && Math.floor(p.fuse * 6) % 2 === 0;
      out[o++] = p.x; out[o++] = p.y; out[o++] = p.z;
      out[o++] = d ? s * 0.9 : s; out[o++] = d ? s * 0.9 : s; out[o++] = rk ? s * 2.4 : d ? s * 0.9 : s;
      out[o++] = rk ? Math.atan2(p.vx, p.vz) : time * 3; out[o++] = rk ? -Math.atan2(p.vy, Math.hypot(p.vx, p.vz)) : d && p.stuck ? 0 : time * 5;
      if (d) { out[o++] = 0.2; out[o++] = blink ? 0.9 : 0.5; out[o++] = 1; out[o++] = blink ? 1 : 0.6; }
      else if (rk) { out[o++] = 0.9; out[o++] = 0.9; out[o++] = 0.95; out[o++] = 0; }
      else if (p.ink) { out[o++] = 0.3; out[o++] = 0.12; out[o++] = 0.42; out[o++] = 0.2; }
      else { out[o++] = 0.15; out[o++] = 0.15; out[o++] = 0.18; out[o++] = 0; }
    }
    return this.writeGear(out, o);
  }

  // One box from a to b, w thick (cube instances are turned by yaw and tumble only, which is all a rope or an arm needs).
  stick(out, o, ax, ay, az, bx, by, bz, w, r, g, b, em = 0) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.hypot(dx, dy, dz) || 0.01;
    out[o++] = (ax + bx) / 2; out[o++] = (ay + by) / 2; out[o++] = (az + bz) / 2;
    out[o++] = w; out[o++] = w; out[o++] = len;
    out[o++] = Math.atan2(dx, dz); out[o++] = -Math.atan2(dy, Math.hypot(dx, dz));
    out[o++] = r; out[o++] = g; out[o++] = b; out[o++] = em;
    return o;
  }

  // The helicopter's rope with hook or wrecking ball, and the five tentacles of the awakening.
  writeGear(out, o) {
    const g = this.g, m = g.monster, size = g.world.wrap ? g.world.sx : 0, B = this.base();
    const ax = m.x, ay = m.y + m.h * 0.1, az = m.z, w = 0.25 + m.h * 0.012;
    let end = null;
    if (this.rope) end = [ax + wrapDelta(this.rope.x - ax, size), this.rope.y, az + wrapDelta(this.rope.z - az, size)];
    else if (this.hook && this.act === this.hook) { // on its way down
      const a = this.hook, k = clamp((a.t - a.W) / (a.S * 0.9), 0, 1);
      end = [ax + wrapDelta(a.hx - ax, size) * k, ay + (a.hy - ay) * k, az + wrapDelta(a.hz - az, size) * k];
    }
    if (end) {
      o = this.stick(out, o, ax, ay, az, end[0], end[1], end[2], w, 0.16, 0.16, 0.18);
      if (this.rope?.ball) { const r = this.rope.r * 1.8; o = this.stick(out, o, end[0], end[1] - r * 0.5, end[2], end[0], end[1] + r * 0.5, end[2], r, 0.3, 0.31, 0.35); o = this.stick(out, o, end[0] - r * 0.6, end[1], end[2], end[0] + r * 0.6, end[1], end[2], r * 0.82, 0.26, 0.27, 0.3); }
      else if (!this.held) o = this.stick(out, o, end[0], end[1] - w * 3, end[2], end[0], end[1] + w, end[2], w * 3, 0.85, 0.65, 0.1); // the hook
    }
    for (const K of this.krakens) {
      const u = K.t / K.life, rise = ease(clamp(u / 0.25, 0, 1)), coil = ease(clamp((u - 0.2) / 0.4, 0, 1)), sink = ease(clamp((u - 0.6) / 0.4, 0, 1)) + Math.max(0, K.t - K.life) / 0.8;
      const N = 10, P = (i, s, c, out3) => {
        const a = K.a0 + (i / 5) * 6.283, ca = Math.cos(a), sa = Math.sin(a), inward = K.r * (0.1 + 0.8 * s * s) * c, swirl = Math.sin(s * 4 + K.t * 5 + i) * K.r * 0.1 * (1 + c);
        out3[0] = K.cx + ca * (K.r - inward) - sa * swirl; out3[1] = K.gy + K.h * s * rise * 1.05 - sink * K.h * 1.1; out3[2] = K.cz + sa * (K.r - inward) + ca * swirl;
        return out3;
      };
      for (let i = 0; i < 5; i++) {
        const a = K.a0 + (i / 5) * 6.283, ca = Math.cos(a), sa = Math.sin(a);
        for (let k = 0; k < N; k++) {
          const p = P(i, k / N, coil, this.pa), q = P(i, (k + 1) / N, coil, this.pb);
          if (q[1] < K.gy - 1) continue; // still (or again) below the ground
          const ww = K.w * (1 - 0.7 * (k / N)) * Math.min(1, rise * 2);
          o = this.stick(out, o, p[0], p[1], p[2], q[0], q[1], q[2], ww, 1, 0.52, 0.38, 0.27);
          o = this.stick(out, o, p[0] + ca * ww * 0.3, p[1], p[2] + sa * ww * 0.3, q[0] + ca * ww * 0.3, q[1], q[2] + sa * ww * 0.3, ww * 0.8, 0.76, 0.25, 0.13, 0.14); // the dark back, facing out
          if (k % 2 === 0) o = this.stick(out, o, p[0] - ca * ww * 0.45, p[1], p[2] - sa * ww * 0.45, (p[0] + q[0]) / 2 - ca * ww * 0.45, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2 - sa * ww * 0.45, ww * 0.45, 1, 0.78, 0.7, 0.24); // a sucker, facing in
        }
      }
    }
    return o;
  }
}
