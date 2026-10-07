// Attacks. Every creature has its own set of moves, and every move comes in two versions:
// a quick, lighter one and a slow one with a long wind-up and far more force.
// A move is an animation in three phases (wind-up, strike, recovery) that triggers damage while it plays;
// nothing happens at the instant of the click. Strength and reach grow with the creature's stage.

import { isTerrain, TYPE_MAT, MAT, RUBBLE } from './materials.js';
import { clamp, wrapDelta } from './math.js';
import { GRAVITY, launch } from './particles.js';

const ease = (x) => x * x * (3 - 2 * x);
const snap = (x) => 1 - (1 - x) ** 3; // fast start, soft landing: the feel of a blow
const pulse = (x) => Math.sin(clamp(x, 0, 1) * Math.PI);
const crossed = (b0, b1, at) => b0 < at && b1 >= at;
// Calls fn(k) for each of n evenly spaced events that fall into the step from b0 to b1.
const eachShot = (b0, b1, n, fn) => { for (let k = 0; k < n; k++) if (crossed(b0, b1, k / n) || (k === 0 && b0 === 0 && b1 > 0)) fn(k); };

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
  // ---------------------------------------------------------------- Robot: light and rockets, never a fist
  robot: [
    { id: 'laser', icon: '⚡', stage: 1,
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
    { id: 'rockets', icon: '🚀', stage: 3,
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
    { id: 'blade', icon: '⚔️', stage: 5,
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
    { id: 'orbital', icon: '🛰️', stage: 7,
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
  // ---------------------------------------------------------------- Aircraft: guns ahead, bombs below
  jet: [
    { id: 'guns', icon: '🔫', stage: 1,
      light: { // strafing run: a burst from the nose guns
        wind: 0.04, strike: 0.4, recover: 0.08,
        pose(j, p, a, b) { j.torso[5] -= Math.abs(Math.sin(b * 22)) * 0.6 * (b > 0 && b < 1 ? 1 : 0); },
        tick(T, act, dt, b0, b1) { eachShot(b0, b1, 6, () => { const B = T.base(), o = T.at(T.o, 0, 0.8); T.bolt(o, T.g.aim, 0.6 + B.S * 0.08 + B.H * 0.012, 3 + B.S * 0.35, 1, 0.85, 0.3); T.g.audio.hit('metal', 0.2); }); },
      },
      heavy: { // one bomb, released from the belly
        wind: 0.25, strike: 0.1, recover: 0.3,
        pose(j, p, a, b, c) { j.torso[0] += 0.12 * a * (1 - c); j.torso[4] += 1.5 * pulse(b); },
        hit(T) { const B = T.base(); T.bomb(6 + B.S * 1.3, 13 + B.S * 2, 0); },
      } },
    { id: 'rockets', icon: '🚀', stage: 3,
      light: {
        wind: 0.1, strike: 0.1, recover: 0.2,
        pose(j, p, a, b) { j.torso[5] -= 1.2 * pulse(b); },
        hit(T, act) { const B = T.base(), o = T.at(T.o, -0.05, 0.3, 0.45 * act.side); T.rocket(o, T.g.aim, 4 + B.S * 0.9, 12 + B.S * 2, 70); },
      },
      heavy: { // salvo from under both wings
        wind: 0.35, strike: 0.6, recover: 0.3,
        pose(j, p, a, b, c) { j.torso[0] -= 0.15 * a * (1 - c); j.torso[5] -= Math.abs(Math.sin(b * 25)) * 0.8 * (b > 0 && b < 1 ? 1 : 0); },
        tick(T, act, dt, b0, b1) {
          eachShot(b0, b1, 8, (k) => { const B = T.base(), o = T.at(T.o, -0.05, 0.3, k % 2 ? 0.45 : -0.45), aim = T.g.aim, r = T.g.rng, s = B.H * 0.55 + 7; T.tgt.x = aim.x + (r() - 0.5) * 2 * s; T.tgt.y = aim.y; T.tgt.z = aim.z + (r() - 0.5) * 2 * s; T.rocket(o, T.tgt, 5 + B.S, 13 + B.S * 2, 60, true); });
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
};

export const movesFor = (species) => MOVES[species] ?? MOVES.dino;

export class Tools {
  constructor(game) {
    this.g = game;
    this.o = [0, 0, 0]; this.hp = [0, 0, 0];
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
  later(delay, fn) { this.timers.push({ t: delay, fn }); }

  // Starts a move. heavy = the slow, strong version.
  use(moveId, heavy) {
    const g = this.g, m = g.monster;
    if (this.act || this.cool > 0) return;
    if (g.fly) { this.flyFire(heavy); return; }
    if (!m.onGround && g.progress.species !== 'jet') return; // no attacks in mid-jump; the aircraft is always in the air
    const list = movesFor(g.progress.species), move = list.find((x) => x.id === moveId) ?? list[0];
    const v = heavy ? move.heavy : move.light, aim = g.aim;
    if (g.progress.species !== 'tank' || v.root) m.faceTo(aim.x, aim.z);
    this.side = -this.side;
    // Bigger creatures take a little longer to wind up: more weight to move.
    const slow = 1 + m.stage * 0.035;
    this.act = { move, v, heavy, t: 0, W: v.wind * slow, S: v.strike, R: v.recover * slow, ax: aim.x, ay: aim.y, az: aim.z, heading: m.heading, side: this.side, begun: false, hit: false, landed: false };
    g.emit('tool', heavy ? 'heavy' : 'light');
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
    if (v.root) m.heading = a.heading; else if (g.progress.species !== 'tank') m.faceTo(g.aim.x, g.aim.z);
    const A = ease(Math.min(1, a.t / a.W)), b = clamp((a.t - a.W) / a.S, 0, 1), c = clamp((a.t - a.W - a.S) / a.R, 0, 1);
    v.pose(m.pose.j, m.pose, A, b, c, a);
    if (a.t < a.W) { if (v.windTick && g.rng() < 0.6) v.windTick(this, a); return; }
    if (!a.begun) { a.begun = true; v.begin?.(this, a); }
    const b0 = clamp((t0 - a.W) / a.S, 0, 1);
    if (v.tick && b0 < 1) v.tick(this, a, dt, b0, b);
    if (!a.hit && b >= (v.hitAt ?? 0.5)) { a.hit = true; v.hit?.(this, a); }
    if (a.t >= a.W + a.S + a.R) {
      v.end?.(this, a);
      if (this.held) this.release(1, false);
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

  // Robot blade: cuts along the line from the body out to full reach, between two angles.
  cut(act, a1, a0, lift, b) {
    const g = this.g, m = g.monster, B = this.base(), reach = B.H * 1.5 + 5;
    const y = clamp(act.ay, m.y + B.H * 0.15, m.y + B.H) + B.H * lift, o = this.opt;
    o.dx = 0; o.dz = 0; o.impulse = launch(reach * 0.25 + 4); o.debris = 6; o.spare = false; o.blast = 0; o.quiet = true;
    let n = 0;
    for (let k = 1; k <= 3; k++) {
      const a = a0 + ((a1 - a0) * k) / 3, sx = Math.sin(a), sz = Math.cos(a);
      g.lastHit.dx = sx; g.lastHit.dz = sz;
      n += g.destruction.capsule(m.x + sx * 2, y, m.z + sz * 2, m.x + sx * reach, y + Math.sin(b * 6) * reach * 0.06, m.z + sz * reach, 0.9, 80, o);
      this.rays.push({ ax: m.x + sx * B.H * 0.3, ay: y, az: m.z + sz * B.H * 0.3, bx: m.x + sx * reach, by: y, bz: m.z + sz * reach, w: 0.7 + B.H * 0.01, r: 0.3, g: 0.9, b: 1, life: 0.08 });
    }
    o.quiet = false;
    if (n) { g.fx.sparks(m.x + Math.sin(a1) * reach * 0.7, y, m.z + Math.cos(a1) * reach * 0.7, 14, 3, 0.4, 0.9, 1); g.audio.sword(); }
  }

  // Marches from o towards the target; leaves the direction in rdx/rdy/rdz and returns the distance
  // to the first solid thing (helicopters included). hitSolid tells whether anything was found.
  trace(o, tx, ty, tz, max) {
    const g = this.g;
    let dx = tx - o[0], dy = ty - o[1], dz = tz - o[2];
    const d = Math.hypot(dx, dy, dz) || 1;
    dx /= d; dy /= d; dz /= d;
    this.rdx = dx; this.rdy = dy; this.rdz = dz; this.hitSolid = false;
    let t = 2;
    for (let i = 0; t < max; t += 0.7, i++) {
      const x = o[0] + dx * t, y = o[1] + dy * t, z = o[2] + dz * t;
      if (y < 0 || y > g.world.sy + 60) break;
      if (g.world.get(Math.floor(x), Math.floor(y), Math.floor(z)) || g.bodies.solidAt(x, y, z)) { this.hitSolid = true; break; }
      if (i % 6 === 0 && g.actors.hitAir(x, y, z, 4)) { this.hitSolid = true; break; }
    }
    return t;
  }

  // A short laser pulse: a flash of light and a small, deep hole.
  bolt(o, aim, radius, depth, r, gr, b) {
    const g = this.g, t = this.trace(o, aim.x, aim.y, aim.z, 520);
    const bx = o[0] + this.rdx * t, by = o[1] + this.rdy * t, bz = o[2] + this.rdz * t, opt = this.opt;
    this.rays.push({ ax: o[0], ay: o[1], az: o[2], bx, by, bz, w: radius * 0.9, r, g: gr, b, life: 0.07 });
    if (!this.hitSolid) return;
    opt.dx = this.rdx; opt.dz = this.rdz; opt.impulse = launch(8); opt.debris = 8; opt.spare = false; opt.blast = 0;
    g.lastHit.dx = this.rdx; g.lastHit.dz = this.rdz;
    g.destruction.capsule(bx, by, bz, bx + this.rdx * depth, by + this.rdy * depth, bz + this.rdz * depth, radius, 60, opt);
    g.fx.sparks(bx, by, bz, 16, 4, r, gr, b);
    if (g.rng() < 0.4) g.fire.igniteSphere(bx + this.rdx * 2, by + this.rdy * 2, bz + this.rdz * 2, radius + 2.5, 5);
  }

  // A continuous beam for one simulation step: burns deeper every step, sets fire, leaves glowing spots.
  ray(o, aim, radius, depth, r, gr, b, burn, dt) {
    const g = this.g, t = this.trace(o, aim.x, aim.y, aim.z, 560), opt = this.opt;
    const bx = o[0] + this.rdx * t, by = o[1] + this.rdy * t, bz = o[2] + this.rdz * t;
    this.rays.push({ ax: o[0], ay: o[1], az: o[2], bx, by, bz, w: radius, r, g: gr, b, life: dt * 1.6 });
    g.audio.laser();
    if (!this.hitSolid) return;
    opt.dx = this.rdx; opt.dz = this.rdz; opt.impulse = launch(10 + radius * 3); opt.debris = 6; opt.spare = false; opt.blast = 0; opt.quiet = true;
    g.lastHit.dx = this.rdx; g.lastHit.dz = this.rdz;
    g.destruction.capsule(bx, by, bz, bx + this.rdx * depth, by + this.rdy * depth, bz + this.rdz * depth, radius, 70, opt);
    opt.quiet = false;
    if (g.rng() < 0.6) g.fx.sparks(bx, by, bz, 18, 3, r, gr, b);
    if (burn && g.rng() < 0.35) g.fire.igniteSphere(bx + this.rdx * 2, by + this.rdy * 2, bz + this.rdz * 2, radius + 3, 6);
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
        g.fire.igniteSphere(x, y, z, 3.5, 6);
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
    this.proj.push({ kind: 'rocket', x: o[0], y: o[1], z: o[2], vx: dx * speed, vy: dy * speed, vz: dz * speed, r: (0.8 + this.g.monster.stage * 0.15) * size, radius, power, life: 7, grav: 0, tx: aim.x, ty: aim.y, tz: aim.z, homing: arc });
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

  // Tears a lump of the given radius out of the world and holds it.
  grab(x, y, z, r) {
    const g = this.g, w = g.world;
    if (this.held) return;
    const ax = Math.floor(x), ay = Math.floor(y), az = Math.floor(z), ri = Math.ceil(r);
    const wx = w.wrap ? ax & w.mx : ax, wz = w.wrap ? az & w.mz : az;
    const st = wx >= 0 && wz >= 0 && wx < w.sx && wz < w.sz ? w.structures[w.footprint[wx + w.sx * wz]] : null;
    let n = 0, cells;
    if (st && st.grabbable && st.remaining > 3 && Math.max(st.x1 - st.x0, st.z1 - st.z0, st.top) < r * 5 + 6) {
      // Small things come up whole: a car, a tree, a garden gnome.
      const span = Math.max(st.x1 - st.x0, st.z1 - st.z0) + 2;
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
    } else {
      cells = g.bodies.reserve((2 * ri + 1) ** 3);
      for (let dy = -ri; dy <= ri; dy++) for (let dz = -ri; dz <= ri; dz++) for (let dx = -ri; dx <= ri; dx++) {
        if (dx * dx + dy * dy + dz * dz > r * r) continue;
        const t = w.get(ax + dx, ay + dy, az + dz);
        if (!t || TYPE_MAT[t] === MAT.BEDROCK || ay + dy < 1) continue;
        cells[n * 4] = ax + dx; cells[n * 4 + 1] = ay + dy; cells[n * 4 + 2] = az + dz; cells[n * 4 + 3] = isTerrain(t) ? t | RUBBLE : t;
        n++;
        w.set(ax + dx, ay + dy, az + dz, 0);
        g.destruction.addSeeds(ax + dx, ay + dy, az + dz);
      }
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
    const g = this.g;
    if (g.fly || this.act || !g.monster.jump()) return;
    g.emit('ability', 'stomp');
    g.audio.whoosh();
  }

  // Called when the monster lands after a jump.
  stompLand(m) {
    const B = this.base();
    this.blow(m.x, m.y + m.h * 0.05, m.z, m.h * 0.42 + 1, 4 + m.stage * 1.7, true, 0, 0, true);
    this.shock(m.x, m.y, m.z, m.h * 0.55, m.h * 0.28 + 1, (4 + m.stage * 1.7) * 0.8, 6);
    this.g.impactFx(m.x, m.y + 1, m.z, B.H * 0.5, 0.5 + m.stage * 0.1, false);
  }

  roar() {
    const g = this.g, m = g.monster;
    if (this.roarCool > 0 || this.act) return;
    this.roarCool = 1.4;
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
      else if (g.progress.species !== 'dino') { b.pos[0] = m.x; b.pos[1] = m.y + m.h * 1.15 + b.radius * 0.6; b.pos[2] = m.z; }
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
            if (p.fire) { g.fire.igniteSphere(p.x, p.y, p.z, p.radius * 2.5, 160); for (let k = 0; k < 4; k++) g.fire.spot(p.x + (g.rng() - 0.5) * p.radius * 2, p.y, p.z + (g.rng() - 0.5) * p.radius * 2, 2, 6 + g.rng() * 6); }
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
      else { out[o++] = 0.15; out[o++] = 0.15; out[o++] = 0.18; out[o++] = 0; }
    }
    return o;
  }
}
