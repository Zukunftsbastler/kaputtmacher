// What the game does when something happens: dust, sound, shaking, chain reactions, explosions (part of class Game, see main.js).
// The systems call these (onImpact, onCollapse, onShove …); they keep the recipes of feedback in one place.

import { clamp, wrapDelta } from './math.js';
import { MATS, MAT } from './materials.js';
import { launch } from './particles.js';
import { EMOTE_TIME, specOf } from './monster.js';

const GRAVITY_FX = 60; // gravity of spray particles
const CHAIN_FADE = 0.62; // share of a chain reaction's strength that reaches the next generation: a chain dies out after three to five buildings in a row
// Dust colour per material.
const DUST = { [MAT.EARTH]: [0.55, 0.42, 0.3], [MAT.GLASS]: [0.85, 0.95, 1], [MAT.LEAF]: [0.4, 0.7, 0.3], [MAT.WOOD]: [0.75, 0.6, 0.4], [MAT.BRICK]: [0.8, 0.5, 0.4], [MAT.CONCRETE]: [0.75, 0.75, 0.73], [MAT.STEEL]: [0.6, 0.62, 0.66], [MAT.SHEET]: [0.7, 0.72, 0.75], [MAT.EXPLOSIVE]: [0.3, 0.3, 0.3], [MAT.FABRIC]: [0.9, 0.9, 0.85], [MAT.FORT]: [0.78, 0.72, 0.6], [MAT.ROCK]: [0.6, 0.58, 0.56] };

export class GameEvents {
  onDamage(x, y, z, r, removed, m) {
    const c = DUST[m] ?? DUST[MAT.CONCRETE];
    this.audio.hit(MATS[m].sound, removed / 500);
    this.fx.dust(x, y, z, Math.min(r, 10) * 0.6 + 0.6, c[0], c[1], c[2], Math.min(10, 2 + (removed >> 5)));
    if (m === MAT.GLASS || m === MAT.STEEL) this.fx.sparks(x, y, z, 10, 4, 1, 1, 1);
  }

  // A fragment hits something: the sound depends on what the fragment is made of.
  onImpact(x, y, z, body, speed) {
    const t = body.tally, size = Math.min(1, body.count / 12000) * Math.min(1, speed / 30);
    this.shake(clamp((Math.cbrt(body.mass) * speed) / 900, 0, 0.6));
    if (body.count < 40) return;
    if (t[MAT.CONCRETE] + t[MAT.BRICK] + t[MAT.FORT] + t[MAT.ROCK] > body.count * 0.3) this.audio.crumble(size);
    if (t[MAT.GLASS] > 40) this.audio.glassfall(Math.min(1, t[MAT.GLASS] / 3000));
    if (t[MAT.STEEL] + t[MAT.SHEET] > 30) this.audio.hit('metal', size + 0.2);
    if (t[MAT.WOOD] > body.count * 0.3) this.audio.hit('wood', size + 0.3);
    // Heavy wreckage throws up dust: a burst at once and a pale cloud that hangs for a moment (kept short: the collapse must stay visible).
    if (body.count > 600) {
      const r = clamp(Math.cbrt(body.mass) * 0.4, 3, 16);
      this.fx.dust(x, y + 1, z, r, 0.78, 0.76, 0.71, Math.min(14, 4 + (body.count >> 10)));
      if (speed > 10 && this.rng() < 0.6) this.fire.spot(x, y, z, r * 0.6, 1.5 + this.rng() * 1.5, false, true);
    }
  }

  // A small building has been flattened by something much heavier: dust all over where it stood.
  onCrush(st, body) {
    if (this.time - (st.dustT ?? -9) < 0.5) return;
    st.dustT = this.time;
    if (!st.crushed) { st.crushed = true; this.stat('crushed'); }
    const w = st.x1 - st.x0, d = st.z1 - st.z0, r = clamp(Math.max(w, d) * 0.3, 3, 14);
    for (let i = 0; i < 4; i++) this.fx.dust(st.x0 + this.rng() * w, st.y0 + this.rng() * Math.min(st.top - st.y0, 20), st.z0 + this.rng() * d, r, 0.78, 0.76, 0.71, 3);
    for (let i = 0; i < 2; i++) this.fire.spot(st.x0 + this.rng() * w, st.y0 + 2, st.z0 + this.rng() * d, r * 0.7, 2 + this.rng() * 1.5, false, true);
    this.audio.crumble(Math.min(1, st.remaining / 8000 + 0.3));
    this.shake(0.3);
    void body;
  }

  // Something large has come loose: concrete cracks, steel starts to groan.
  onCollapse(body) {
    const t = body.tally, size = Math.min(1, body.count / 20000);
    if (t[MAT.CONCRETE] + t[MAT.BRICK] + t[MAT.FORT] + t[MAT.ROCK] > 200) this.audio.crack(size);
    if (t[MAT.STEEL] + t[MAT.SHEET] > 30 || body.count > 4000) this.audio.groan(size);
    if (t[MAT.WOOD] > body.count * 0.4) this.audio.hit('wood', 0.8);
    this.audio.rumble(size);
    this.shake(0.25);
  }

  // The moment a blow lands: a ring of dust, a jolt of the camera and a blink of stillness.
  // Running into a building (or charging through it): shaky ones go over.
  onShove(m, x, z, dx, dz, strength) {
    const w = this.world, ix = Math.floor(w.wrap ? ((x % w.sx) + w.sx) % w.sx : x), iz = Math.floor(w.wrap ? ((z % w.sz) + w.sz) % w.sz : z);
    if (ix < 0 || iz < 0 || ix >= w.sx || iz >= w.sz) return;
    const st = w.structures[w.footprint[ix + w.sx * iz]];
    if (!st || !st.S) return;
    this.stat('shoves');
    // How hard the shove is depends on how big the creature is compared with what is left of the building.
    const bonus = clamp((0.08 * m.h ** 3 * strength) / Math.max(200, st.remaining), 0, 0.6);
    this.stability.shove(st, dx, dz, bonus);
    this.audio.step(1);
    this.shake(0.2 + bonus * 0.6);
    this.fx.dust(x, m.y + m.h * 0.4, z, m.h * 0.3, 0.75, 0.72, 0.66, 4);
  }

  onLeapLand() { this.tools.leapLanded(); }

  // Wading through open water: spray around the legs.
  onWade(m, level) {
    for (let i = 0; i < 2; i++) this.fx.add(m.x + (this.rng() - 0.5) * m.h * 0.5, level, m.z + (this.rng() - 0.5) * m.h * 0.5, (this.rng() - 0.5) * 8, 6 + this.rng() * 8, (this.rng() - 0.5) * 8, 0.6 + m.h * 0.02, 0.8, 0.7, 0.8, 0.93, 1, 0.7, 0, GRAVITY_FX, 0.3);
  }

  // A swimming stroke: a ring of bubbles.
  onSwim(m) {
    this.audio.whoosh();
    this.stat('jumps');
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283; this.fx.add(m.x + Math.cos(a) * m.h * 0.3, m.y + m.h * 0.3, m.z + Math.sin(a) * m.h * 0.3, Math.cos(a) * m.h * 0.6, 4, Math.sin(a) * m.h * 0.6, 0.5 + m.h * 0.03, 0.2, 1.6, 0.85, 0.95, 1, 0.6, 0, -6, 1.5); }
  }

  // The tentacle's emoticons (monster.js): one at a time, a new one replaces the old.
  emote(id) {
    if (!specOf(this.progress.species).emotes) return;
    const p = this.monster.pose;
    if (p.emote === id && p.emoteT < EMOTE_TIME * 0.5) return;
    p.emote = id; p.emoteT = 0;
  }

  // Rotor wash of the helicopter, low over the ground (k: 0 at the edge of its reach, 1 right on top): dust is blown out
  // in a ring, fires flare up, and from stage 3 the glass right under it bursts.
  onWash(m, floor, k) {
    const n = Math.ceil(10 * k * this.fx.thin) + 2;
    for (let i = 0; i < n; i++) {
      const a = this.rng() * 6.283, r = m.h * (0.3 + this.rng() * 0.6);
      this.fx.add(m.x + Math.cos(a) * r, floor + 0.5, m.z + Math.sin(a) * r, Math.cos(a) * m.h * 2, 1 + this.rng() * 3, Math.sin(a) * m.h * 2, 0.6 + m.h * 0.04, m.h * 0.05, 0.7, 0.8, 0.76, 0.68, 0.5, 0, 0, 1.5);
    }
    this.debris.blast(m.x, floor, m.z, m.h * 1.2 * k + 2, launch(m.h * 0.4 * k + 2));
    if (m.stage >= 3 && k > 0.3) {
      this.lastHit.dx = 0; this.lastHit.dz = 0;
      this.destruction.sphere(m.x, floor, m.z, m.h * 0.35 * k + 1, 1.2, { dx: 0, dy: -0.2, dz: 0, impulse: launch(m.h * 0.5 + 3), debris: 20, quiet: true });
    }
  }

  // The tentacle travels below the ground: a bulge of earth, cracks, dust and a deep rumble.
  onBurrow(m) {
    const r = this.rng, h = m.h;
    this.fx.add(m.x + (r() - 0.5) * h * 0.6, m.y + 0.5, m.z + (r() - 0.5) * h * 0.6, (r() - 0.5) * h * 0.5, h * (0.4 + r() * 0.6), (r() - 0.5) * h * 0.5, 0.6 + h * 0.05, h * 0.05, 0.9, 0.55, 0.45, 0.33, 0.8, 0, GRAVITY_FX, 1);
    if (r() < 0.08) this.audio.crumble(0.15);
    if (r() < 0.05) this.shake(0.05);
  }

  // Waiting under a building: it shakes, and a piece of its foundations crumbles away. Slower than hitting it, but unseen.
  onUndermine(m, st) {
    const B = this.tools.base(), x = m.x + (this.rng() - 0.5) * m.h * 0.8, z = m.z + (this.rng() - 0.5) * m.h * 0.8, y = Math.max(st.y0, m.y) + 1;
    this.lastHit.dx = 0; this.lastHit.dz = 0;
    this.destruction.sphere(x, y, z, B.R * 0.5, B.P * 0.8, { dx: 0, dy: 0.4, dz: 0, impulse: launch(B.H * 0.5 + 4), debris: 16 });
    // Each time a little weaker for good, as much as the creature's size measures up to what is left of the building
    // (the reckoning of a shove): a small tentacle under a tower only tickles it.
    this.stability.weaken(st, clamp((0.01 * m.h ** 3) / Math.max(200, st.remaining), 0, 0.03));
    this.fx.dust(x, y + 1, z, B.H * 0.3, 0.6, 0.5, 0.4, 3);
    this.audio.crumble(0.3);
    this.shake(0.12);
  }

  onDive(m) {
    this.audio.whoosh();
    this.fx.dust(m.x, m.y + 1, m.z, m.h * 0.35, 0.6, 0.5, 0.4, 6);
    this.hud.speedLines();
  }

  // The tentacle bursts out of the ground: a fountain of earth and a ring of shock; under a building it punches up
  // through the floors. blow: false if it came up again too quickly (only the show then, no damage).
  onSurface(m, blow) {
    const B = this.tools.base(), x = m.x, y = m.y, z = m.z, r = this.rng;
    for (let i = 0; i < 24 * this.fx.thin + 6; i++) {
      const a = r() * 6.283, s = r() * B.H * 0.5;
      this.fx.add(x + Math.cos(a) * s * 0.3, y + 1, z + Math.sin(a) * s * 0.3, Math.cos(a) * s, B.H * (1.5 + r() * 1.5), Math.sin(a) * s, 0.7 + B.H * 0.06, B.H * 0.06, 1.2, 0.55, 0.43, 0.3, 1, 0, GRAVITY_FX, 1);
    }
    this.audio.boom(0.35 + m.stage * 0.05); this.shake(0.3 + m.stage * 0.04);
    this.hud.speedLines();
    if (!blow) return;
    this.emote('boom');
    this.lastHit.dx = 0; this.lastHit.dz = 0; this.lastHit.pop = launch(B.H * 0.4);
    this.tools.shock(x, y, z, B.H * 0.32, B.R * 0.6, B.P * 0.6, 6, true);
    const st = this.world.structureAt(x, z);
    if (st && st.major) { // up through the building
      this.destruction.capsule(x, y + 1, z, x, y + B.H * 2.1, z, B.H * 0.13 + 1, B.P * 1.05, { dx: 0, dy: 1, dz: 0, impulse: launch(B.H * 1.6 + 8), debris: 90 });
      this.impactFx(x, y + B.H, z, B.H * 0.4, 0.5 + m.stage * 0.06, true);
    }
  }

  // The aircraft has flown into something.
  onCrash(m) {
    this.audio.hit('metal', 1); this.audio.crumble(0.5);
    this.shake(0.7);
    this.fx.sparks(m.x, m.y, m.z, 30, 14);
    this.hitStop = Math.max(this.hitStop, 0.06);
  }

  // The creature grabs a wall (first = the moment it lands on it) or keeps hanging there.
  // Claws and weight leave their mark: a dent for a small creature, a real hole for a big one.
  onCling(m, dx, dz, first) {
    const x = m.x + dx * m.h * 0.3, y = m.y + m.h * 0.75, z = m.z + dz * m.h * 0.3, k = first ? 1 : 0.6;
    this.lastHit.dx = dx; this.lastHit.dz = dz;
    this.destruction.sphere(x, y, z, (m.h * 0.09 + 0.8) * k, (1.5 + m.stage * 1.4) * k, { dx, dy: 0, dz, impulse: launch(m.h * 0.4 + 2), debris: 14 });
    if (first) { this.audio.step(0.8); this.shake(0.12 + m.stage * 0.02); this.fx.dust(x, y, z, m.h * 0.2 + 0.6, 0.78, 0.76, 0.71, 4); }
  }

  // The moment for the ground pound has come: a glint and a short tick.
  onPoundCue(m) {
    this.audio.tick();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.283; this.fx.add(m.x + Math.cos(a) * m.h * 0.5, m.y + m.h * 0.5, m.z + Math.sin(a) * m.h * 0.5, Math.cos(a) * m.h, 0, Math.sin(a) * m.h, m.h * 0.08 + 0.4, 0, 0.3, 1, 0.95, 0.4, 1, 1); }
  }

  onPoundStart() {
    this.audio.whoosh();
    this.stat('pounds');
    this.emit('ability', 'stomp');
  }

  // Ground pound landing: the damage of a creature one stage bigger, done by weight alone.
  onPoundLand(m, chain) {
    this.tools.poundLand(m, chain);
    this.onShove(m, m.x, m.z, 0, 0, 3); // whatever it lands on gets the full weight
  }

  // The second jump kicks off from thin air: a puff below the feet.
  onDoubleJump(m) {
    this.audio.whoosh();
    this.stat('flips');
    for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; this.fx.add(m.x, m.y, m.z, Math.cos(a) * m.h * 1.2, -m.h * 0.3, Math.sin(a) * m.h * 1.2, m.h * 0.12 + 0.5, m.h * 0.3, 0.35, 1, 1, 1, 0.7, 0, 0, 2.5); }
  }

  // A storey is about to give way: creaking first.
  onCreak(st, y) {
    this.audio.crack(Math.min(1, st.remaining / 30000));
    if (st.remaining > 3000) this.audio.groan(Math.min(1, st.remaining / 30000));
    this.shake(0.15);
    void y;
  }

  // A building has lost a storey and is coming down. With chain reactions switched on,
  // the shock weakens its neighbours, which may fall in turn and pass it on.
  onStructureCollapse(st, y) {
    const size = Math.max(st.x1 - st.x0, st.z1 - st.z0), cx = (st.x0 + st.x1) / 2, cz = (st.z0 + st.z1) / 2;
    this.audio.crumble(Math.min(1, st.remaining / 20000));
    this.shake(0.4);
    if (st.major && !st.counted2) {
      st.counted2 = true; this.stat('collapses'); this.orbBurst(cx, y, cz, size * 0.4, 8);
      // While the game plays itself, a big collapse now and then runs in slow motion: something to watch.
      if (this.idle && st.remaining > 8000 && this.time - this.cineT > 9) { this.cineT = this.time; this.slowT = 0.9; }
    }
    this.fx.dust(cx, y, cz, size * 0.45, 0.76, 0.74, 0.7, 14);
    this.spans.collapsed(st, y); // the bridges hanging on it lose their hold
    for (let i = 0; i < 3; i++) this.fire.spot(st.x0 + this.rng() * (st.x1 - st.x0), y, st.z0 + this.rng() * (st.z1 - st.z0), clamp(size * 0.2, 3, 12), 2 + this.rng() * 2, false, true);
    this.cascade(st, cx, cz, size);
  }

  cascade(st, cx, cz, size) {
    const stage = this.monster.stage, s = this.progress.settings;
    if (st.fell || !s.cascade || (stage < 3 && !this.allUnlocked)) return;
    st.fell = true;
    // Stronger with every stage; fades from one generation of the chain to the next.
    // Buildings brought down by falling wreckage start a chain of their own, so on top of the generation
    // every collapse in quick succession tires the chain; it recovers by one step every four seconds.
    // The shock grows gently from stage 3 on, so that the power income does not leap at a single stage.
    const amount = Math.min(0.55, 0.12 + 0.06 * Math.max(0, stage - 3)) * CHAIN_FADE ** Math.max(st.gen, this.chainLoad);
    this.chainLoad += 1;
    this.statMax('chain', Math.floor(this.chainLoad));
    if (amount < 0.06) return;
    this.tools.later(0.55 + this.rng() * 0.3, () => {
      for (const o of this.hud.major) {
        if (o === st || o.fell || !o.S || o.remaining < 20) continue;
        const ox = (o.x0 + o.x1) / 2, oz = (o.z0 + o.z1) / 2, osize = Math.max(o.x1 - o.x0, o.z1 - o.z0);
        const dx = wrapDelta(ox - cx, this.cam.wrap), dz = wrapDelta(oz - cz, this.cam.wrap), d = Math.hypot(dx, dz);
        if (d > (size + osize) / 2 + 44) continue;
        o.gen = Math.max(o.gen, st.gen + 1);
        o.dirX = dx / (d || 1); o.dirZ = dz / (d || 1);
        this.stability.weaken(o, amount);
        // The shock is visible: it bites into the neighbour's foot on the near side and throws up dust in between.
        const hx = ox - (dx / (d || 1)) * osize * 0.45, hz = oz - (dz / (d || 1)) * osize * 0.45;
        this.lastHit.dx = dx / (d || 1); this.lastHit.dz = dz / (d || 1);
        this.destruction.sphere(hx, o.y0 + 4, hz, 3 + osize * 0.1, 9 + stage, { dx: this.lastHit.dx, dz: this.lastHit.dz, impulse: launch(20), debris: 20 });
        this.fx.dust(cx + dx * 0.5, o.y0 + 2, cz + dz * 0.5, 4, 0.8, 0.78, 0.72, 3);
      }
    });
  }

  // The moment a blow lands: a ring of dust, a jolt of the camera and a blink of stillness.
  // A heavy blow holds the world a little longer and lets it run on in slow motion for a moment.
  impactFx(x, y, z, size, shake, heavy = false) {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * 6.283;
      this.fx.add(x, y, z, Math.cos(a) * size * 7, 1 + this.rng() * 3, Math.sin(a) * size * 7, size * 0.35 + 0.6, size * 0.9, 0.3, 1, 1, 0.92, 0.75, 0, 0, 3);
    }
    this.fx.add(x, y, z, 0, 0, 0, size * 1.2, size * 9, 0.14, 1, 1, 0.9, 0.9, 1);
    this.shake(shake);
    this.hitStop = Math.max(this.hitStop, heavy ? 0.09 : 0.045);
    if (heavy) this.slowT = 0.28;
  }

  onStep(m) {
    this.audio.step(m.stage / 9);
    if (m.stage >= 4) this.shake(0.02 * m.stage);
    if (m.stage >= 6) { // heavy feet leave dents
      const side = m.lastStep & 1 ? 1 : -1;
      this.destruction.sphere(m.x + Math.cos(m.heading) * side * m.h * 0.15, m.y, m.z - Math.sin(m.heading) * side * m.h * 0.15, m.h * 0.09 + 1, 4.5, { debris: 3, quiet: true });
    }
  }

  // A landing without a stomp: on a roof with the jump button released, and for stage 1.
  onSoftLand(m) {
    this.fx.dust(m.x, m.y + 0.5, m.z, m.h * 0.3, 0.8, 0.78, 0.7, 5);
    this.audio.step(0.5);
  }

  onStompLand(m) {
    if (m.stage >= 2 || this.allUnlocked) { this.tools.stompLand(m); this.hud.doneHint('stomp'); return; }
    this.onSoftLand(m); // stage 1 lands softly: a puff of dust, no crater yet
  }

  queueExplosion(x, y, z) {
    for (const e of this.pending) if (Math.hypot(e.x - x, e.y - y, e.z - z) < 7) return;
    for (const e of this.recent) if (Math.hypot(e.x - x, e.y - y, e.z - z) < 7) return;
    this.pending.push({ x, y, z, t: 0.05 + this.rng() * 0.12 });
  }

  explode(x, y, z, r, power) {
    this.stat('explosions');
    this.recent.push({ x, y, z, t: 0.6 });
    this.lastHit.pop = launch(r * 1.2);
    this.destruction.sphere(x, y, z, r, power, { impulse: launch(r * 6 + 12), debris: 200, blast: launch(r * 4) });
    this.fx.explosion(x, y, z, r);
    // What can burn nearby catches fire; the crater itself keeps burning and smoking for a while.
    this.fire.heatSphere(x, y, z, r * 1.4, 4, 70);
    this.fire.spot(x, y, z, r * 0.45 + 1, 5 + this.rng() * 7);
    this.audio.boom(r / 9);
    const size = this.world.wrap ? this.world.sx : 0;
    const d = Math.hypot(wrapDelta(x - this.eye[0], size), y - this.eye[1], wrapDelta(z - this.eye[2], size));
    this.shake(clamp((r * 14) / (d + 20), 0, 1.6));
  }
}
