// Attacks. Every creature has its own set of moves, and every move comes in two versions:
// a quick, lighter one and a slow one with a long wind-up and far more force.
// A move is an animation in three phases (wind-up, strike, recovery) that triggers damage while it plays;
// nothing happens at the instant of the click. Strength and reach grow with the creature's stage.

import { clamp, wrapDelta } from './math.js';
import { launch } from './particles.js';
import { stageScale, tracked, airborne, motionOf } from './monster.js';
import { ease } from './moves/kit.js';
import dino from './moves/dino.js';
import gorilla from './moves/gorilla.js';
import robot from './moves/robot.js';
import tank from './moves/tank.js';
import digger from './moves/digger.js';
import jet from './moves/jet.js';
import chopper from './moves/chopper.js';
import tentacle from './moves/tentacle.js';
import { mixin } from './mixin.js';
import { ToolsMelee } from './tools-melee.js';
import { ToolsRanged } from './tools-ranged.js';
import { ToolsChopper } from './tools-chopper.js';
import { ToolsTentacle } from './tools-tentacle.js';

export const ABILITIES = [
  { id: 'stomp', icon: '🦶', stage: 1 }, // jumping is there from the start; from stage 2 every landing is a stomp
  { id: 'roar', icon: '🗯️', stage: 9 },
];

/**
 * One version of a move (quick or strong). Times are seconds; b0/b1 run from 0 to 1 through the strike.
 * @typedef {object} MoveVersion
 * @property {number} wind  wind-up (a little longer for bigger creatures)
 * @property {number} strike  the blow itself
 * @property {number} recover  getting back
 * @property {boolean} [root]  the feet stay where they are until the strike is over
 * @property {number} [hitAt]  point of the strike (0..1) at which hit() runs, default 0.5
 * @property {boolean} [cutIn]  the greatest attack: the world holds its breath first (Hud.cutIn)
 * @property {(j: object, p: object, a: number, b: number, c: number, act: object) => void} pose  joints for wind-up a, strike b, recovery c
 * @property {(T: Tools, act: object) => void} [begin]  once, when the strike starts
 * @property {(T: Tools, act: object, dt: number, b0: number, b1: number) => void} [tick]  every step of the strike
 * @property {(T: Tools, act: object) => void} [hit]  once, at hitAt
 * @property {(T: Tools, act: object) => void} [end]  once, when the move is over
 * @property {(T: Tools, act: object) => void} [windTick]  now and then during the wind-up
 *
 * A move of a creature (moves/*.js). It is unlocked at `stage`; the left button plays `light`, the right one `heavy`.
 * @typedef {{ id: string, icon: string, stage: number, light: MoveVersion, heavy: MoveVersion }} Move
 */

/** @type {Record<string, Move[]>} */
const MOVES = { dino, gorilla, robot, tank, digger, jet, chopper, tentacle };

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

  // ---- tentacle ---------------------------------------------------------------------------

  // Starts a move. heavy = the slow, strong version.
  use(moveId, heavy) {
    const g = this.g, m = g.monster;
    if (this.act || this.cool > 0) return;
    if (g.fly) { this.flyFire(heavy); return; }
    const sp = g.progress.species;
    if (motionOf(sp) === 'burrow' && (m.under || m.pose.emerge < 0.9)) { this.queued = { moveId, heavy }; m.surface(); return; } // up out of the ground first
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

  stomp() {
    const g = this.g, m = g.monster, sp = g.progress.species;
    if (motionOf(sp) === 'hover' || g.fly) return; // the helicopter's up and down are held, not pressed
    if (motionOf(sp) === 'burrow') { // the big button: down into the ground or up out of it
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
    if (this.queued && motionOf(g.progress.species) !== 'burrow') this.queued = null;
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

mixin(Tools, ToolsMelee, ToolsRanged, ToolsChopper, ToolsTentacle);
