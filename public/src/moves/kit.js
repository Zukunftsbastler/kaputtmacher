// Shared pieces of the move tables in moves/*.js: easing curves, timing helpers and two moves that dino and tank share.

import { clamp } from '../math.js';
import { SEGS } from '../monster.js';

export const ease = (x) => x * x * (3 - 2 * x);
export const snap = (x) => 1 - (1 - x) ** 3; // fast start, soft landing: the feel of a blow
export const pulse = (x) => Math.sin(clamp(x, 0, 1) * Math.PI);
export const crossed = (b0, b1, at) => b0 < at && b1 >= at;
// Calls fn(k) for each of n evenly spaced events that fall into the step from b0 to b1.
export const eachShot = (b0, b1, n, fn) => { for (let k = 0; k < n; k++) if (crossed(b0, b1, k / n) || (k === 0 && b0 === 0 && b1 > 0)) fn(k); };
// Bends the tentacle: every segment by its share of amt, more towards the tip (forwards; side: sideways).
export const curl = (j, amt, side = 0) => { for (let i = 0; i < SEGS; i++) { const w = 2 * (i / (SEGS - 1)) ** 1.3, q = j['seg' + i]; q[0] += amt * w; q[2] += side * w; } };


// Shared by dino and tank: a run straight ahead that knocks through whatever is in the way.
export function charge(dist, rMul, pMul, shove, wind, strike) {
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
export function flameStream(up, fwd, turret) {
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

