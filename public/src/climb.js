// Climbing a wall: where hands and feet hold on and how the body hangs between them.

import { MODEL_HEIGHT } from './species.js';

// Climbing a wall: the body, head and tail. The limbs are not animated by a cycle but placed by Climber (below):
// every hand and foot holds on to a fixed spot on the wall until it has to let go and reach for the next one.
// Everything is blended with pose.cling, so that the walk takes over again smoothly when the creature lets go.
export function climbPose(pose, species) {
  const j = pose.j, c = pose.cling, m = pose.climbAmt * c, a = pose.climbAng;
  const mix = (q, i, v) => { q[i] = q[i] * (1 - c) + v * c; };
  mix(j.torso, 0, 0.3);
  mix(j.torso, 2, (pose.climbLean ?? 0) * 0.18);
  pose.fwd = 1.8 * c; // chest to the wall
  pose.hop *= 1 - c;
  if (a) for (const n of ['armL', 'armR', 'legL', 'legR']) { mix(j[n], 0, a[n][0]); mix(j[n], 2, a[n][1]); j[n][1] *= 1 - c; }
  // Head: up the wall when climbing up, down when climbing down, sideways towards where it goes.
  mix(j.head, 0, pose.climbV > 0.1 ? -0.45 : pose.climbV < -0.1 ? 0.35 : -0.2);
  mix(j.head, 1, -Math.sign(pose.climbH || 0) * 0.6 * pose.climbAmt);
  if (species === 'dino') { mix(j.tail, 0, -0.5); mix(j.tail, 1, (pose.climbLean ?? 0) * -0.5); mix(j.tail2, 0, -0.3); } // the tail hangs down as a counterweight
  mix(j.jaw, 0, 0.1 + 0.1 * m * (pose.climbEffort ?? 0)); // effort
}

// Where the limbs of each creature sit and how long they are, in model units (see buildModel), and how it climbs:
// swing: seconds to move one hand or foot to a new hold. pull: how fast the body still moves while a hand is
// off the wall (1 = full speed). pairs: hand and opposite foot move together (otherwise one limb at a time).
// reach: how far ahead of the shoulder or hip a new hold is taken, as a share of the limb's length.
const CLIMB = {
  dino: { shoulder: [7.5, 17], hip: [4, 9], arm: 8, leg: 9, swing: 0.14, pull: 0.5, pairs: false, reach: 0.75, order: ['legR', 'armL', 'legL', 'armR'] }, // short arms: big steps with the legs, the arms only hold on
  gorilla: { shoulder: [10, 20], hip: [4.5, 10], arm: 17, leg: 10, swing: 0.16, pull: 0.25, pairs: false, reach: 0.85, order: ['armL', 'legR', 'armR', 'legL'] }, // long arms: reach far, haul the body up after each grip
  robot: { shoulder: [8, 19], hip: [4, 9], arm: 14, leg: 9, swing: 0.09, pull: 0, pairs: true, reach: 0.7, order: ['armL', 'armR'] }, // mechanical: diagonal pairs, the body only moves while all four hold
};
const LIMBS = ['armL', 'armR', 'legL', 'legR'], OPPOSITE = { armL: 'legR', armR: 'legL' };

// Hands and feet on the wall. Holds are kept in wall coordinates (model units): a = sideways (model +x),
// u = height. Each frame the joints of the moving body are compared with their holds; a limb lets go only
// when its hold falls too far behind (or out of reach), and only one hand at a time is ever free.
export class Climber {
  constructor() { this.holds = null; }

  reset() { this.holds = null; }

  // Returns the share of the climbing speed the body may use this frame.
  update(m, dt, species, moving, dirA, dirU) {
    const C = CLIMB[species] ?? CLIMB.dino, k = MODEL_HEIGHT / m.h, c = m.cling;
    const tx = -c.dz, tz = c.dx, bodyA = -(m.x * tx + m.z * tz) * k, bodyU = m.y * k;
    const joint = (n) => (n[0] === 'a' ? [bodyA + (n === 'armL' ? -C.shoulder[0] : C.shoulder[0]), bodyU + C.shoulder[1]] : [bodyA + (n === 'legL' ? -C.hip[0] : C.hip[0]), bodyU + C.hip[1]]);
    const len = (n) => (n[0] === 'a' ? C.arm : C.leg);
    // Where a limb would like to hold: ahead in the direction of travel, hands above the shoulders, feet below the hips.
    const want = (n) => {
      const J = joint(n), L = len(n), out = n.endsWith('L') ? -1 : 1, hand = n[0] === 'a';
      const rest = hand ? [out * 0.3 * L, 0.55 * L] : [out * 0.3 * L, -0.7 * L];
      let da = rest[0] + dirA * C.reach * L * (moving ? 1 : 0), du = rest[1] + dirU * C.reach * L * (moving ? 1 : 0) * (hand ? 1 : 0.8);
      const d = Math.hypot(da, du), most = 0.92 * L; // within reach, or it would have to let go again at once
      if (d > most) { da *= most / d; du *= most / d; }
      return [J[0] + da, J[1] + du];
    };
    // A new wall, a corner or the seam of the planet: take fresh holds.
    if (!this.holds || this.dir !== c.dx * 3 + c.dz || Math.abs(bodyA - this.lastA) > 40) {
      this.holds = {};
      for (const n of LIMBS) { const p = want(n); this.holds[n] = { a: p[0], u: p[1], fa: p[0], fu: p[1], swing: 0 }; }
      this.gait = 0;
    }
    this.dir = c.dx * 3 + c.dz; this.lastA = bodyA;
    const H = this.holds;
    // Swinging limbs travel to their new hold.
    let swinging = 0, handFree = false;
    for (const n of LIMBS) {
      const h = H[n];
      if (h.swing > 0) { h.swing = Math.max(0, h.swing - dt / C.swing); swinging++; if (n[0] === 'a') handFree = true; }
    }
    // Who lets go next: the next limb in this creature's order whose hold has fallen behind or out of reach.
    if (!swinging) for (let i = 0; i < C.order.length; i++) {
      const n = C.order[(this.gait + i) % C.order.length], h = H[n], J = joint(n), L = len(n);
      const ra = h.a - J[0], ru = h.u - J[1], d = Math.hypot(ra, ru), behind = moving && ra * dirA + ru * dirU < -0.05 * L;
      if (!behind && d < L * 1.05) continue;
      const grip = (q) => { const t = want(q); H[q].fa = H[q].a; H[q].fu = H[q].u; H[q].a = t[0]; H[q].u = t[1]; H[q].swing = 1; };
      grip(n);
      if (C.pairs && OPPOSITE[n]) grip(OPPOSITE[n]); // the robot: diagonal pairs
      this.gait = (this.gait + i + 1) % C.order.length;
      if (n[0] === 'a') handFree = true;
      swinging = 1;
      break;
    }
    // Angles that point each limb at its hold (or, while it swings, at a point on the way, lifted off the wall).
    const ang = (this.ang ??= { armL: [0, 0], armR: [0, 0], legL: [0, 0], legR: [0, 0] });
    let lean = 0, effort = 0;
    for (const n of LIMBS) {
      const h = H[n], J = joint(n), L = len(n), e = 1 - h.swing, s = e * e * (3 - 2 * e);
      const pa = h.fa + (h.a - h.fa) * s, pu = h.fu + (h.u - h.fu) * s + Math.sin(Math.PI * e) * (h.swing > 0 ? 0.15 * L : 0);
      const ra = pa - J[0], ru = pu - J[1];
      // Straight down = 0, out from the wall-facing body horizontally = -pi/2, straight up = -pi.
      ang[n][0] = -(Math.PI / 2 + Math.asin(Math.max(-1, Math.min(1, ru / L)))) + (h.swing > 0 ? 0.25 * Math.sin(Math.PI * e) : 0);
      ang[n][1] = Math.asin(Math.max(-1, Math.min(1, ra / L)));
      if (n[0] === 'a') { lean += ra / L; effort += Math.max(0, ru / L); }
    }
    m.pose.climbAng = ang; m.pose.climbLean = Math.max(-1, Math.min(1, lean * 0.5)); m.pose.climbEffort = effort * 0.5;
    // The body moves while the hands hold; with a hand off the wall it slows down (the robot stops altogether).
    return handFree ? C.pull : 1;
  }
}
