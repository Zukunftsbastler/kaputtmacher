// Idle mode: the game plays itself. The autopilot does nothing a player could not do: it only
// fills in the input state (walk, turn, aim, light/heavy attack, jump) and picks moves and worlds.
// It looks for the nearest building that still stands, walks or flies there, takes it apart with
// changing attacks, moves on, and travels to the next world when one is finished.

import { clamp, wrapDelta } from './math.js';
import { WORLDS } from './worldgen.js';

// Attacks that work from a distance; all others need the creature to stand next to its target.
const RANGED = new Set(['breath', 'laser', 'rockets', 'orbital', 'gun', 'mortar', 'bunker']);
const WORLD_TIME = 12 * 60; // seconds after which the autopilot moves on even if a world is not finished
const v3 = [0, 0, 0];

export class Autopilot {
  constructor(game) {
    this.g = game;
    this.reset();
  }

  reset() {
    this.target = null; // the building being worked on
    this.px = 0; this.py = 0; this.pz = 0; // the spot on it that is aimed at
    this.retarget = 0; // seconds until a new spot is chosen
    this.patience = 0; // seconds left for the current building
    this.cool = 0; // seconds until the next attack
    this.moveT = 0; // seconds until another move is selected
    this.flourish = 6; // seconds until the next jump just for show
    this.second = -1; // seconds until the second press of a double jump, -1 = none
    this.third = false; // a ground pound is planned for this jump
    this.stuckT = 0; this.sx = 0; this.sz = 0; this.stuck = 0;
    this.skip = new Map(); // buildings to leave alone for a while -> time until then
    this.worldT = 0; this.doneT = 0;
    this.rnd = Math.random; // decisions of the autopilot are deliberately not part of the reproducible simulation
  }

  // Chooses the next building. Usually one of the three nearest; every third time or so one further away,
  // so that the creature travels and the whole map gets seen.
  pickTarget() {
    const g = this.g, m = g.monster, size = g.cam.wrap, best = [], far = [], roam = this.rnd() < 0.35;
    for (const st of g.hud.major) {
      if (st.done || st.remaining < 20 || (this.skip.get(st) ?? 0) > g.time) continue;
      const d = Math.hypot(wrapDelta((st.x0 + st.x1) / 2 - m.x, size), wrapDelta((st.z0 + st.z1) / 2 - m.z, size));
      if (d > 140 && d < 460) far.push(st);
      let i = best.length;
      while (i > 0 && best[i - 1].d > d) i--;
      if (i < 3) { best.splice(i, 0, { st, d }); best.length = Math.min(best.length, 3); }
    }
    this.target = roam && far.length ? far[Math.floor(this.rnd() * far.length)] : best.length ? best[Math.floor(this.rnd() * best.length)].st : null;
    this.patience = roam ? 55 : 30; // a journey takes longer
    this.retarget = 0;
  }

  // Finds a spot on the target that is still solid: within reach for close attacks, anywhere for ranged ones.
  pickSpot(ranged) {
    const g = this.g, w = g.world, m = g.monster, st = this.target;
    for (let i = 0; i < 40; i++) {
      const x = st.x0 + Math.floor(this.rnd() * (st.x1 - st.x0 + 1)), z = st.z0 + Math.floor(this.rnd() * (st.z1 - st.z0 + 1));
      if (w.footprint[x + w.sx * z] !== st.id) continue;
      const top = w.heightBelow(x, z, ranged ? st.top + 1 : m.y + m.h * 0.8) - 1;
      if (top < st.y0) continue;
      this.px = x + 0.5; this.pz = z + 0.5;
      this.py = ranged ? st.y0 + this.rnd() * (top - st.y0) : Math.max(st.y0, top - this.rnd() * m.h * 0.5);
      this.retarget = 1.2 + this.rnd();
      return true;
    }
    return false;
  }

  // Called once per frame while idle mode is on, after the real input has been read.
  update(dt) {
    const g = this.g, inp = g.input, m = g.monster, size = g.cam.wrap, jet = g.progress.species === 'jet';
    inp.forward = 0; inp.turn = 0; inp.lift = 0; inp.sprint = false; inp.jumpHeld = true;
    // Hanging on a wall: climb up it. On the roof the walk goes on.
    if (m.cling) { inp.forward = 1; return; }
    if (g.fly) g.doAction('camera'); // the show needs its star in the picture
    g.pitchOffset = Math.sin(g.time * 0.11) * 0.12; // the camera breathes a little

    // Finished (or long enough here): on to the next world.
    this.worldT += dt;
    if (g.worldDone) this.doneT += dt;
    if (this.doneT > 7 || this.worldT > WORLD_TIME) { this.nextWorld(); return; }

    // Another move every few seconds, so that all of them get shown.
    if ((this.moveT -= dt) <= 0 && !g.tools.act) {
      const list = g.unlockedTools();
      g.selectTool(list[Math.floor(this.rnd() * list.length)]);
      this.moveT = 5 + this.rnd() * 6;
    }
    const ranged = jet || RANGED.has(g.tool);

    if (!this.target || this.target.done || this.target.remaining < 20 || (this.patience -= dt) <= 0) {
      if (this.target && !this.target.done) this.skip.set(this.target, g.time + 25);
      this.pickTarget();
      if (!this.target) return;
    }
    if ((this.retarget -= dt) <= 0 || !g.world.get(Math.floor(this.px), Math.floor(this.py), Math.floor(this.pz))) {
      if (!this.pickSpot(ranged) && !this.pickSpot(true)) { this.skip.set(this.target, g.time + 25); this.target = null; return; }
    }

    // Steering: turn towards the spot. Turning right lowers the yaw, hence the minus.
    const dx = wrapDelta(this.px - m.x, size), dz = wrapDelta(this.pz - m.z, size), dist = Math.hypot(dx, dz);
    let diff = Math.atan2(dx, dz) - g.camYaw;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    inp.turn = clamp(-diff * 2.5, -1, 1);
    const facing = Math.abs(diff) < 0.45;
    // Aiming: the spot's place on the screen.
    if (g.project(this.px, this.py, this.pz, v3)) { inp.aimX = clamp(v3[0], 4, innerWidth - 4); inp.aimY = clamp(v3[1], 4, innerHeight - 4); }
    this.cool -= dt;

    if (jet) {
      // The aircraft circles in on the target at a little above roof height, firing ahead and bombing when close.
      inp.forward = clamp((Math.min(this.target.top + 22 + m.h, g.world.sy + 40) - m.y) / 20, -1, 1);
      if (this.cool <= 0 && !g.tools.act) {
        if (dist < 70 && this.rnd() < 0.7) { inp.heavyPressed = true; this.cool = 0.5; }
        else if (facing && dist < 260) { inp.firePressed = true; this.cool = 0.5 + this.rnd() * 0.5; }
      }
      return;
    }

    // Ranged attackers walk up close as well: within a few body lengths, not from the far end of the street.
    const reach = ranged ? m.h * 2.5 + 22 : g.tool === 'charge' || g.tool === 'ram' || g.tool === 'pound' ? m.h * 3 + 6 : m.h * 0.9 + 4;
    if (dist > reach) {
      inp.forward = facing ? 1 : 0.25;
      inp.sprint = facing && dist > m.h * 4;
    } else {
      // Shooters keep strolling towards their target while they fire; brawlers stand and hit.
      if (ranged && dist > m.h * 1.2 + 6) inp.forward = facing ? 0.45 : 0.2;
      if (facing && this.cool <= 0 && !g.tools.act && m.onGround) {
        if (this.rnd() < 0.4) inp.heavyPressed = true; else inp.firePressed = true;
        this.cool = 0.25 + this.rnd() * 0.5;
      }
    }

    // Not getting anywhere: jump (twice, with the somersault); if that does not help either, try another building.
    if ((this.stuckT += dt) > 2.5) {
      if (inp.forward > 0.5 && Math.hypot(wrapDelta(m.x - this.sx, size), wrapDelta(m.z - this.sz, size)) < 2) {
        if (++this.stuck > 2) { this.skip.set(this.target, g.time + 25); this.target = null; this.stuck = 0; }
        else this.jump();
      } else this.stuck = 0;
      this.stuckT = 0; this.sx = m.x; this.sz = m.z;
    }
    // Every now and then a jump for the joy of it.
    if ((this.flourish -= dt) <= 0 && !g.tools.act && m.onGround) { this.jump(); this.flourish = 9 + this.rnd() * 10; if (this.rnd() < 0.3) g.doAction('roar'); }
    if (this.second >= 0 && (this.second -= dt) < 0) { g.doAction('stomp'); this.second = -1; this.third = this.rnd() < 0.6; }
    // Often the double jump ends in a ground pound: pressed as soon as the moment has come.
    if (this.third && m.poundReady()) { g.doAction('stomp'); this.third = false; }
    if (m.onGround) this.third = false;
  }

  jump() {
    this.g.doAction('stomp');
    this.second = 0.3 + this.rnd() * 0.15; // second press: the double jump
  }

  nextWorld() {
    const g = this.g, list = WORLDS.filter((w) => w.id !== 'random'), i = list.findIndex((w) => w.id === g.progress.world);
    g.hud.close();
    g.travel(list[(i + 1) % list.length].id);
    this.reset();
  }
}
