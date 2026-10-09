// Life in the world: little people who stroll around, run from the monster and tumble when
// something blows up next to them. They never come to harm. Once the destruction is under way the
// emergency services turn up: police cars, fire engines, reporters in helicopters and at last the army.

import { wrapDelta } from './math.js';
import { GRAVITY } from './particles.js';
import { T } from './materials.js';

const SHIRTS = [[0.9, 0.25, 0.25], [0.2, 0.5, 0.9], [0.95, 0.8, 0.2], [0.3, 0.75, 0.4], [0.9, 0.5, 0.75], [0.95, 0.95, 0.95], [0.5, 0.3, 0.7]];
const SKINS = [[1, 0.82, 0.66], [0.85, 0.62, 0.45], [0.55, 0.38, 0.26]];
const v3 = [0, 0, 0];
const ALARM_RISE = 8; // seconds of ongoing destruction per star
const ALARM_HOLD = 12; // seconds of peace before the alarm starts to ebb
const ALARM_FALL = 14; // seconds per star on the way down
const BOLD = 9; // creature height (in the world's units) below which the police dare to block its way
const SOLID = 5; // below this height a police car is an obstacle instead of something to step on

export class Actors {
  constructor(game) {
    this.g = game;
    this.list = [];
    this.screamT = 0;
    this.helis = []; // news, army and fire-fighting helicopters
    this.units = []; // police cars and fire engines
    this.jets = []; // fighter jets on a pass
    this.shots = []; // what the army fires: harmless
    this.want = { police: 0, fire: 0, news: 0, army: 0, water: 0 };
    this.heliT = 3; // seconds until the next helicopter may arrive
    this.unitT = 0; this.jetT = 6; this.alarmT = 0; this.slot = 0; this.siren = 0;
    this.heliOn = true;
    this.cityOn = false; // a world with inhabitants: only there do police, fire brigade and army exist
  }

  // Scatters `count` people over free ground.
  populate(count) {
    const g = this.g, w = g.world, rnd = g.rng;
    this.list.length = 0;
    this.helis.length = 0; this.heliT = 3; this.heliOn = count > 0 || !g.world.people;
    this.units.length = 0; this.jets.length = 0; this.shots.length = 0; this.unitT = 1; this.jetT = 6; this.alarmT = 0; this.slot = 0;
    this.cityOn = (g.world.people ?? 0) > 0;
    for (let i = 0, tries = 0; i < count && tries < count * 8; tries++) {
      const x = rnd() * w.sx, z = rnd() * w.sz, y = w.heightBelow(x, z, w.sy - 1);
      if (y > 16 || w.structures[w.footprint[Math.floor(x) + w.sx * Math.floor(z)]].id) continue; // not on roofs
      this.list.push({ x, y, z, vx: 0, vy: 0, vz: 0, dir: rnd() * 6.28, state: 'walk', t: rnd() * 5, phase: rnd() * 6, spin: 0,
        shirt: SHIRTS[(rnd() * SHIRTS.length) | 0], skin: SKINS[(rnd() * SKINS.length) | 0] });
      i++;
    }
  }

  update(dt) {
    const g = this.g, w = g.world, m = g.monster, size = w.wrap ? w.sx : 0, u = w.unit;
    const fear = m.h * 3 + 14 * u, walk = 1.3 * u, run = 4.2 * u;
    let fleeing = 0;
    for (const a of this.list) {
      a.t -= dt;
      if (a.state === 'fly') {
        a.vy -= GRAVITY * dt;
        a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
        a.spin += dt * 9;
        const gy = w.heightBelow(a.x, a.z, a.y + 2);
        if (a.y <= gy && a.vy < 0) { a.y = gy; a.state = 'down'; a.t = 1 + g.rng(); }
        continue;
      }
      if (a.state === 'down') {
        if (a.t <= 0) { a.state = 'walk'; a.spin = 0; }
        continue;
      }
      const dx = wrapDelta(a.x - m.x, size), dz = wrapDelta(a.z - m.z, size), d = Math.hypot(dx, dz);
      const scared = !g.fly && d < fear;
      if (scared) { a.dir = Math.atan2(dx, dz) + Math.sin(a.phase + a.t) * 0.5; fleeing++; }
      else if (a.t <= 0) { a.dir += (g.rng() - 0.5) * 2.5; a.t = 2 + g.rng() * 4; }
      a.run = scared;
      const sp = scared ? run : walk, nx = a.x + Math.sin(a.dir) * sp * dt, nz = a.z + Math.cos(a.dir) * sp * dt;
      // Walls taller than a step turn the walker around.
      const gy = w.heightBelow(nx, nz, a.y + 1.2 * u);
      if (w.get(Math.floor(nx), Math.floor(a.y + 1.2 * u), Math.floor(nz)) || (!w.wrap && (nx < 2 || nz < 2 || nx > w.sx - 2 || nz > w.sz - 2))) {
        a.dir += 1.6 + g.rng();
        // Buried under rubble: climb out.
        if (w.get(Math.floor(a.x), Math.floor(a.y), Math.floor(a.z))) a.y = w.heightBelow(a.x, a.z, w.sy - 1);
      } else {
        a.x = nx; a.z = nz;
        if (gy < a.y - 3 * u) { a.state = 'fly'; a.vx = 0; a.vz = 0; a.vy = 0; } else a.y = gy;
      }
      if (w.wrap) { a.x = ((a.x % w.sx) + w.sx) % w.sx; a.z = ((a.z % w.sz) + w.sz) % w.sz; }
      a.phase += dt * sp * 2.2 / u;
    }
    this.screamT -= dt;
    if (fleeing > 2 && this.screamT <= 0) { this.screamT = 1.2 + g.rng() * 2; g.audio.scream(); }
    this.updateUnits(dt);
    this.updateHelis(dt);
  }

  // Emergency services ------------------------------------------------------------------
  //
  // The alarm level (0..5) follows how much of the world is gone, like the stars in a certain
  // series of games: one police car at the first damage, then more, reporters in helicopters,
  // finally the army with helicopters and fighter jets. The fire brigade comes whenever something
  // burns. None of them can hurt the creature: what the army fires bounces off. All of them can be
  // knocked over, stepped on or shot down.

  // How high the alarm can climb: it depends on how much of the world is gone.
  ceiling() {
    const g = this.g, w = g.world;
    if (!this.cityOn || !g.progress.settings.units) return 0;
    const gone = 1 - w.remaining / w.total;
    return gone <= 0 ? 0 : gone < 0.004 ? 1 : gone < 0.02 ? 2 : gone < 0.06 ? 3 : gone < 0.15 ? 4 : 5;
  }

  // The alarm itself (g.alarm, 0..5) takes its time: it climbs one star in about eight seconds while
  // things keep breaking, holds for a while, and ebbs away again when the creature keeps the peace.
  updateAlarm(dt) {
    const g = this.g, quiet = g.time - g.lastGainT, top = this.ceiling();
    if (quiet < 3) g.alarm = Math.min(top, g.alarm + dt / ALARM_RISE);
    else if (quiet > ALARM_HOLD) g.alarm = Math.max(0, g.alarm - dt / ALARM_FALL);
    g.alarm = Math.min(g.alarm, top);
    const level = Math.floor(g.alarm + 1e-6);
    if (level !== g.wanted) { g.wanted = level; g.hud.setWanted(level); g.statMax('wanted', level); }
  }

  // How many of a kind should be around, after the detail setting.
  scaled(n) { return n ? Math.max(1, Math.round(n * this.g.quality.units)) : 0; }

  // A place on open ground about `dist` away from the creature, on a road if one can be found.
  spawnSpot(out, dist) {
    const g = this.g, w = g.world, m = g.monster, rnd = g.rng;
    let found = false;
    for (let i = 0; i < 24; i++) {
      const a = rnd() * 6.283, x = m.x + Math.cos(a) * dist, z = m.z + Math.sin(a) * dist;
      if (!w.wrap && (x < 4 || z < 4 || x > w.sx - 4 || z > w.sz - 4)) continue;
      const y = w.heightBelow(x, z, w.sy - 1);
      if (w.structureAt(x, z)?.id) continue;
      const road = w.get(Math.floor(x), y - 1, Math.floor(z)) === T.ROAD;
      if (!found || road) { out[0] = x; out[1] = y; out[2] = z; found = true; }
      if (road) break;
    }
    return found;
  }

  updateUnits(dt) {
    const g = this.g, w = g.world, m = g.monster, size = w.wrap ? w.sx : 0, rnd = g.rng, u = w.unit;
    this.updateAlarm(dt);
    const level = g.wanted, burning = g.fire.level();
    // Respect: a creature no bigger than a car gets a road block right in front of its nose.
    // The bigger it grows, the further away the police stay; from house size on they only watch.
    const bold = m.h < BOLD * u, fx = Math.sin(m.heading), fz = Math.cos(m.heading);
    const on = this.cityOn && g.progress.settings.units;
    this.want.police = this.scaled([0, 1, 3, 4, 5, 6][level]);
    this.want.fire = on && burning > 0.01 ? this.scaled(1 + (level >= 3 ? 1 : 0) + (burning > 0.4 ? 1 : 0)) : 0;
    this.want.news = this.heliOn && g.progress.settings.units && g.heat > 0.02 ? (level >= 4 || !this.cityOn ? 2 : 1) : 0;
    this.want.army = level >= 4 ? this.scaled((level - 3) * 2) : 0;
    this.want.water = on && level >= 3 && burning > 0.12 ? (level >= 5 ? 2 : 1) : 0;

    // Arrivals: one vehicle at a time, a few seconds apart.
    this.unitT -= dt;
    if (this.unitT <= 0) for (const kind of ['police', 'fire']) {
      if (this.count(this.units, kind) >= this.want[kind] || !this.spawnSpot(v3, Math.min(210, w.sx * 0.4))) continue;
      this.units.push({ kind, x: v3[0], y: v3[1], z: v3[2], yaw: 0, ax: 0, az: 1, dodge: 0, state: 'drive', slot: this.slot++, t: 0, blink: rnd() * 3, tx: v3[0], ty: 0, tz: v3[2], has: false, work: 0, stuck: 0, age: 0, plan: 0 });
      this.unitT = 4;
      break;
    }
    // Fighter jets: a pass every now and then at the highest alarm level.
    if (level >= 5 && (this.jetT -= dt) <= 0) {
      this.jetT = 9 + rnd() * 8;
      for (let k = 0; k < (rnd() < 0.5 ? 2 : 1); k++) {
        const a = rnd() * 6.283, d = 520, sp = 170;
        this.jets.push({ x: m.x + Math.cos(a) * d + k * 14, y: m.y + m.h * 1.4 + 50 + k * 8, z: m.z + Math.sin(a) * d + k * 14, vx: -Math.cos(a) * sp, vz: -Math.sin(a) * sp, vy: 0, yaw: Math.atan2(-Math.cos(a), -Math.sin(a)), t: (d * 2) / sp, fired: false, state: 'fly', spin: 0 });
      }
    }

    let siren = 0;
    for (let i = this.units.length - 1; i >= 0; i--) {
      const c = this.units[i];
      c.blink += dt; c.age += dt;
      const mdx = wrapDelta(c.x - m.x, size), mdz = wrapDelta(c.z - m.z, size), md = Math.hypot(mdx, mdz);
      const near = Math.abs(m.y - c.y) < m.h * 0.5 + 2;
      if (m.h < SOLID * u) {
        // A creature smaller than the car cannot walk over it: the car stands in its way (and can be smashed).
        if (near && md < 2.6 * u && md > 0.01) { m.x -= (mdx / md) * (2.6 * u - md); m.z -= (mdz / md) * (2.6 * u - md); }
      } else if (near && md < m.h * 0.28 + 2 * u) { this.wreck(i); continue; } // under the creature's feet (or its belly, if it flies low): flat
      // Nobody rushes off: a vehicle stays at least half a minute before it is called back.
      const leaving = c.age > 30 && this.count(this.units, c.kind) > this.want[c.kind] && this.units.findIndex((o) => o.kind === c.kind) === i;
      if (leaving) c.state = 'leave';
      if (c.state === 'leave' && md > 260) { this.units.splice(i, 1); continue; }
      // Unhurried: quick on the way in, slow once the creature is in sight.
      let stop = 4 * u, speed = (md > 90 * u ? 17 : 10) * u, side = false;
      const blockade = bold && c.kind === 'police';
      if (c.state === 'leave') { c.tx = c.x + (mdx / (md || 1)) * 60; c.tz = c.z + (mdz / (md || 1)) * 60; speed = 12 * u; }
      else if (!blockade && md < m.h * 1.3 + 12 * u) { c.tx = c.x + (mdx / (md || 1)) * 50; c.tz = c.z + (mdz / (md || 1)) * 50; c.state = 'drive'; speed = 16 * u; c.plan = 0; } // too close for comfort: back off
      else if (c.kind === 'police') {
        // The plan is only changed every few seconds, so the cars do not twitch with every step of the creature.
        if ((c.plan -= dt) <= 0) {
          c.plan = 3 + rnd() * 2;
          if (blockade) {
            // Road block: side by side across the creature's path, a few car lengths ahead.
            const row = ((c.slot % 5) - 2) * 4.6 * u, ahead = m.h * 1.5 + 9 * u;
            c.tx = m.x + fx * ahead + fz * row; c.tz = m.z + fz * ahead - fx * row;
          } else {
            // A loose ring around the creature. Its radius grows faster than the creature does.
            const a = c.slot * 2.4, R = m.h * (2.2 + Math.min(2.5, m.h / (22 * u))) + 30 * u + (c.slot % 3) * 8 * u;
            c.tx = m.x + Math.cos(a) * R; c.tz = m.z + Math.sin(a) * R;
          }
        }
        stop = blockade ? 2.5 * u : 12 * u; side = blockade;
      } else {
        if ((c.t -= dt) <= 0) { c.t = 1.5; c.has = g.fire.target(v3); if (c.has) { c.tx = v3[0]; c.ty = v3[1]; c.tz = v3[2]; } }
        stop = 26 * u;
        if (!c.has) { c.state = 'park'; }
      }
      const dx = wrapDelta(c.tx - c.x, size), dz = wrapDelta(c.tz - c.z, size), d = Math.hypot(dx, dz);
      if (c.state !== 'leave') c.state = d > stop * (c.state === 'park' ? 2.5 : 1) && (c.kind !== 'fire' || c.has) ? 'drive' : 'park';
      if (c.state === 'park') {
        // Parked: facing the fire, or (police) the creature; in a road block side-on to it.
        let want = (c.kind === 'police' ? Math.atan2(-mdx, -mdz) + (side ? Math.PI / 2 : 0) : Math.atan2(dx, dz)) - c.yaw;
        want = Math.atan2(Math.sin(want), Math.cos(want));
        c.yaw += want * Math.min(1, dt * 2);
        if (c.kind === 'fire' && c.has && d < stop * 1.6) this.spray(c, dt);
      } else this.drive(c, dx, dz, speed, dt);
      const ed = Math.hypot(wrapDelta(c.x - g.eye[0], size), c.y - g.eye[1], wrapDelta(c.z - g.eye[2], size));
      siren = Math.max(siren, 1 - ed / 240);
    }
    this.siren = siren;

    // What the army fires: tracers and rockets that fly at the creature and fizzle out on its skin.
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      const dx = wrapDelta(m.x - s.x, size), dy = m.y + m.h * 0.55 - s.y, dz = wrapDelta(m.z - s.z, size), d = Math.hypot(dx, dy, dz), step = s.speed * dt;
      if ((s.t -= dt) <= 0 || d < m.h * 0.25 + step + 1) {
        if (s.t > 0) {
          if (s.rocket) { g.fx.explosion(s.x, s.y, s.z, 2 + m.h * 0.05); g.audio.boom(0.2); g.shake(0.12); }
          else g.fx.sparks(s.x, s.y, s.z, 14, 3, 1, 0.9, 0.5);
        }
        this.shots.splice(i, 1);
        continue;
      }
      s.x += (dx / d) * step; s.y += (dy / d) * step; s.z += (dz / d) * step;
      if (s.rocket && rnd() < 0.5) g.fx.add(s.x, s.y, s.z, 0, 1, 0, 1.2, 2, 0.5, 0.8, 0.8, 0.8, 0.4, 0, 0, 1);
    }

    for (let i = this.jets.length - 1; i >= 0; i--) {
      const j = this.jets[i];
      if (j.state === 'fall') {
        j.vy -= GRAVITY * 0.6 * dt; j.spin += dt * 7;
        j.x += j.vx * dt; j.y += j.vy * dt; j.z += j.vz * dt;
        if (rnd() < 0.7) g.fire.smoke(j.x, j.y, j.z, 2.5);
        if (j.y < 1 || w.get(Math.floor(j.x), Math.floor(j.y), Math.floor(j.z))) { g.explode(j.x, j.y + 1, j.z, 6 + u * 1.5, 15); this.jets.splice(i, 1); }
        continue;
      }
      j.x += j.vx * dt; j.z += j.vz * dt;
      if ((j.t -= dt) <= 0) { this.jets.splice(i, 1); continue; }
      const d = Math.hypot(wrapDelta(m.x - j.x, size), wrapDelta(m.z - j.z, size));
      if (!j.fired && d < 230) {
        j.fired = true;
        for (const side of [-1, 1]) this.shots.push({ x: j.x + Math.cos(j.yaw) * side * 3, y: j.y - 1, z: j.z - Math.sin(j.yaw) * side * 3, speed: 260, t: 3, rocket: true });
        g.audio.flyby();
      }
    }
  }

  count(list, kind) {
    let n = 0;
    for (const o of list) if (o.kind === kind && o.state !== 'fall') n++;
    return n;
  }

  // Ground vehicles follow the street grid: always along one axis, the one with the longer way to go.
  // When something is in the way they try the other axis for a moment.
  drive(c, dx, dz, speed, dt) {
    const g = this.g, w = g.world, u = w.unit;
    if ((c.dodge -= dt) <= 0) {
      const alongX = Math.abs(dx) > Math.abs(dz) + (c.ax ? -6 : 6); // a little reluctance to change lanes
      c.ax = alongX ? Math.sign(dx) : 0; c.az = alongX ? 0 : Math.sign(dz) || 1;
    }
    const step = speed * dt, nx = c.x + c.ax * step, nz = c.z + c.az * step, px = nx + c.ax * 3 * u, pz = nz + c.az * 3 * u;
    const gy = w.heightBelow(px, pz, c.y + 1.6 * u);
    if (w.get(Math.floor(px), Math.floor(c.y + 1.6 * u), Math.floor(pz)) || gy > c.y + 1.5 * u || (!w.wrap && (px < 3 || pz < 3 || px > w.sx - 3 || pz > w.sz - 3))) {
      // Blocked: turn into the cross street, towards the target if that makes sense, otherwise at random.
      const turn = c.ax ? Math.sign(dz) || (g.rng() < 0.5 ? 1 : -1) : Math.sign(dx) || (g.rng() < 0.5 ? 1 : -1);
      const flip = ++c.stuck > 2 ? -1 : 1;
      if (c.ax) { c.ax = 0; c.az = turn * flip; } else { c.az = 0; c.ax = turn * flip; }
      c.dodge = 1.5 + g.rng() * 1.5;
      if (c.stuck > 5) { c.stuck = 0; c.y = w.heightBelow(c.x, c.z, w.sy - 1); } // buried: climb out
    } else {
      c.x = nx; c.z = nz; c.stuck = 0;
      const ny = w.heightBelow(nx, nz, c.y + 1.6 * u);
      c.y += (ny - c.y) * Math.min(1, dt * 12);
    }
    if (w.wrap) { c.x = ((c.x % w.sx) + w.sx) % w.sx; c.z = ((c.z % w.sz) + w.sz) % w.sz; }
    let want = Math.atan2(c.ax, c.az) - c.yaw;
    want = Math.atan2(Math.sin(want), Math.cos(want));
    c.yaw += want * Math.min(1, dt * 3.5);
  }

  // A fire engine at work: an arc of water onto the fire, which goes out bit by bit.
  spray(c, dt) {
    const g = this.g, w = g.world, u = w.unit, rnd = g.rng, size = w.wrap ? w.sx : 0;
    const ox = c.x, oy = c.y + 3.2 * u, oz = c.z, G = GRAVITY * 0.75, tt = 0.9;
    const dx = wrapDelta(c.tx - ox, size), dy = c.ty + 1 - oy, dz = wrapDelta(c.tz - oz, size);
    for (let k = 0; k < (g.fx.thin < 0.7 ? 1 : 2); k++) {
      const e = 1 + (rnd() - 0.5) * 0.16;
      g.fx.add(ox, oy, oz, (dx / tt) * e, ((dy + 0.5 * G * tt * tt) / tt) * e, (dz / tt) * e, 0.8 + rnd() * 0.7, 1.2, tt + 0.15, 0.6 + rnd() * 0.2, 0.85, 1, 0.9, 0, G, 0);
    }
    if ((c.work -= dt) <= 0) {
      c.work = 0.35;
      g.fire.douse(c.tx, c.ty, c.tz, 6 + 3 * u);
      if (rnd() < 0.5) g.fx.add(c.tx, c.ty + 1, c.tz, 0, 3, 0, 3, 3, 1, 0.9, 0.95, 1, 0.35, 0, -1, 1); // steam
    }
  }

  // A ground vehicle is destroyed: it bursts into its parts.
  wreck(i) {
    const g = this.g, c = this.units[i], u = g.world.unit, rnd = g.rng, types = c.kind === 'police' ? [T.CAR_WHITE, T.CAR_BLUE, T.TIRE] : [T.STEEL_RED, T.CAR_RED, T.TIRE];
    for (let k = 0; k < 14; k++) g.debris.spawn(c.x + (rnd() - 0.5) * 3 * u, c.y + 1 + rnd() * 2 * u, c.z + (rnd() - 0.5) * 3 * u, (rnd() - 0.5) * 30, 12 + rnd() * 22, (rnd() - 0.5) * 30, types[k % 3]);
    g.fx.explosion(c.x, c.y + 1.5 * u, c.z, 2.5 * u);
    g.audio.boom(0.3); g.audio.hit('metal', 0.7);
    g.stat(c.kind === 'police' ? 'police' : 'trucks');
    this.units.splice(i, 1);
    this.unitT = Math.max(this.unitT, 4);
  }

  // Any damage near a ground vehicle destroys it. Called for every blow, so it has to be quick.
  hit(x, y, z, r) {
    const g = this.g, size = g.world.wrap ? g.world.sx : 0, reach = r + g.world.unit * 2;
    for (let i = this.units.length - 1; i >= 0; i--) {
      const c = this.units[i], dx = wrapDelta(c.x - x, size), dy = c.y + 1 - y, dz = wrapDelta(c.z - z, size);
      if (dx * dx + dy * dy + dz * dz < reach * reach) this.wreck(i);
    }
  }

  updateHelis(dt) {
    const g = this.g, w = g.world, m = g.monster, size = w.wrap ? w.sx : 0, rnd = g.rng, u = w.unit;
    this.heliT -= dt;
    if (this.heliT <= 0) for (const kind of ['news', 'army', 'water']) {
      if (this.count(this.helis, kind) >= this.want[kind]) continue;
      const a = rnd() * 6.283, d = 300;
      this.helis.push({ kind, x: m.x + Math.cos(a) * d, y: m.y + m.h * 1.6 + 70, z: m.z + Math.sin(a) * d, vx: 0, vy: 0, vz: 0, ang: a, yaw: 0, rotor: 0, spin: 0, state: 'fly', slot: this.slot++,
        body: kind === 'army' ? [0.33, 0.4, 0.24] : kind === 'water' ? [0.85, 0.15, 0.12] : rnd() < 0.5 ? [0.95, 0.95, 0.97] : [0.2, 0.45, 0.85], blink: rnd() * 6, t: 2 + rnd() * 2, load: 1, tx: 0, ty: 0, tz: 0, has: false });
      this.heliT = 3.5;
      break;
    }
    for (let i = this.helis.length - 1; i >= 0; i--) {
      const h = this.helis[i];
      h.rotor += dt * 34; h.blink += dt;
      if (h.state === 'fall') { // hit: spins down and blows up where it lands
        h.vy -= GRAVITY * 0.7 * dt; h.spin += dt * 11;
        h.x += h.vx * dt; h.y += h.vy * dt; h.z += h.vz * dt;
        if (rnd() < 0.6) g.fire.smoke(h.x, h.y, h.z, 2);
        if (h.y < 1 || w.get(Math.floor(h.x), Math.floor(h.y), Math.floor(h.z))) {
          g.explode(h.x, h.y + 1, h.z, 5 + u * 1.5, 14);
          this.helis.splice(i, 1);
          this.heliT = 6;
        }
        continue;
      }
      const leaving = this.count(this.helis, h.kind) > this.want[h.kind] && this.helis.findIndex((o) => o.kind === h.kind && o.state === 'fly') === i;
      let tx, tz, alt, speed = 70;
      if (h.kind === 'water' && !leaving) {
        // Fire-fighting helicopter: over the fire, drop the load, away to refill, back again.
        if ((h.t -= dt) <= 0) { h.t = 1.5; h.has = g.fire.target(v3); if (h.has) { h.tx = v3[0]; h.ty = v3[1]; h.tz = v3[2]; } }
        if (h.load <= 0) { h.refill = (h.refill ?? 5) - dt; if (h.refill <= 0) { h.load = 1; h.refill = 5; } }
        const away = h.load <= 0 || !h.has;
        tx = away ? m.x + Math.cos(h.ang) * 240 : h.tx; tz = away ? m.z + Math.sin(h.ang) * 240 : h.tz;
        alt = (away ? m.y + m.h : h.ty) + 26 * u + 20; speed = 95;
        if (!away && Math.hypot(wrapDelta(tx - h.x, size), wrapDelta(tz - h.z, size)) < 10 * u) {
          h.load -= dt / 2.5;
          for (let k = 0; k < 3; k++) g.fx.add(h.x + (rnd() - 0.5) * 6 * u, h.y - 2 * u, h.z + (rnd() - 0.5) * 6 * u, (rnd() - 0.5) * 4, -10, (rnd() - 0.5) * 4, 1.5 + rnd(), 2.5, 1.4, 0.6, 0.85, 1, 0.8, 0, GRAVITY * 0.6, 0.2);
          if (rnd() < dt * 4) g.fire.douse(h.tx, h.ty, h.tz, 16 + 6 * u);
        }
      } else {
        // Circle at a respectful distance, a little above the creature's head. With nothing left to watch they leave.
        // The army comes closer than the press, but it too keeps more distance the bigger the creature is.
        const near = h.kind === 'army' ? Math.min(1.1, 0.55 + m.h / (140 * u)) : 1;
        const R = leaving ? 520 : (m.h * 2.8 + 60 + (h.slot % 4) * 16) * near;
        alt = m.y + m.h * 1.35 + 34 + (h.slot % 4) * 11;
        h.ang += (dt * 34) / R * (h.slot & 1 ? -1 : 1);
        tx = m.x + Math.cos(h.ang) * R; tz = m.z + Math.sin(h.ang) * R;
        if (h.kind === 'army' && !leaving && (h.t -= dt) <= 0) {
          // A burst of tracers. It looks dangerous and does nothing.
          h.t = 2.2 + rnd() * 2.5;
          for (let k = 0; k < 5; k++) this.shots.push({ x: h.x, y: h.y - u, z: h.z, speed: 150 + k * 22, t: 4, rocket: false });
          g.audio.burst();
        }
      }
      const dx = wrapDelta(tx - h.x, size), dy = alt - h.y, dz = wrapDelta(tz - h.z, size), k = Math.min(1, dt * 1.1);
      const lim = speed * dt, mv = Math.hypot(dx, dz) * k, f = mv > lim ? lim / mv : 1;
      h.vx = (dx * k * f) / dt; h.vz = (dz * k * f) / dt;
      h.x += dx * k * f; h.y += dy * Math.min(1, dt * 0.9); h.z += dz * k * f;
      if (Math.hypot(h.vx, h.vz) > 2) { let d = Math.atan2(h.vx, h.vz) - h.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); h.yaw += d * Math.min(1, dt * 3); }
      if (w.wrap) { h.x = ((h.x % w.sx) + w.sx) % w.sx; h.z = ((h.z % w.sz) + w.sz) % w.sz; }
      if (leaving && Math.hypot(wrapDelta(h.x - m.x, size), wrapDelta(h.z - m.z, size)) > 420) this.helis.splice(i, 1);
    }
  }

  // Anything that hits near a helicopter or a fighter jet brings it down. Returns true if one was hit.
  hitAir(x, y, z, r) {
    if (!this.helis.length && !this.jets.length) return false;
    const g = this.g, size = g.world.wrap ? g.world.sx : 0, reach = r + g.world.unit * 3;
    for (const list of [this.helis, this.jets]) for (const h of list) {
      if (h.state !== 'fly') continue;
      const dx = wrapDelta(h.x - x, size), dy = h.y - y, dz = wrapDelta(h.z - z, size);
      if (dx * dx + dy * dy + dz * dz > reach * reach) continue;
      h.state = 'fall';
      if (list === this.helis) { h.vy = 6; h.vx += (g.rng() - 0.5) * 30; h.vz += (g.rng() - 0.5) * 30; g.stat(h.kind === 'water' ? 'trucks' : h.kind); }
      else { h.vy = 4; h.vx *= 0.6; h.vz *= 0.6; g.stat('fighters'); }
      g.fx.explosion(h.x, h.y, h.z, 3);
      g.audio.boom(0.35);
      return true;
    }
    return false;
  }

  // 0..1: how close the nearest helicopter is, for its sound.
  heliLevel() {
    const g = this.g, size = g.world.wrap ? g.world.sx : 0;
    let best = 0;
    for (const h of this.helis) best = Math.max(best, 1 - Math.hypot(wrapDelta(h.x - g.eye[0], size), h.y - g.eye[1], wrapDelta(h.z - g.eye[2], size)) / 260);
    return best;
  }

  // Light: the reporters' searchlights and the army's tracers. Returns the new billboard count.
  // A searchlight is a wide, soft cone that ends in a pool of light around the creature, so nobody takes it for a weapon.
  writeLights(bb, n) {
    const g = this.g, m = g.monster, size = g.world.wrap ? g.world.sx : 0, max = bb.length / 9 - 1;
    for (const h of this.helis) {
      if (h.state !== 'fly' || h.kind !== 'news') continue;
      const dx = wrapDelta(m.x - h.x, size), dy = m.y + m.h * 0.3 - h.y, dz = wrapDelta(m.z - h.z, size), wide = m.h * 0.7 + 8;
      for (let k = 1; k <= 7 && n < max; k++, n++) {
        const t = k / 7, q = n * 9;
        bb[q] = h.x + dx * t; bb[q + 1] = h.y + dy * t; bb[q + 2] = h.z + dz * t; bb[q + 3] = 1 + t * wide;
        bb[q + 4] = 1; bb[q + 5] = 0.98; bb[q + 6] = 0.88; bb[q + 7] = k === 7 ? 0.1 : 0.035; bb[q + 8] = 1;
      }
    }
    for (const s of this.shots) {
      if (n >= max) break;
      const q = n++ * 9;
      bb[q] = s.x; bb[q + 1] = s.y; bb[q + 2] = s.z; bb[q + 3] = s.rocket ? 2.2 : 1.1;
      bb[q + 4] = 1; bb[q + 5] = s.rocket ? 0.6 : 0.9; bb[q + 6] = 0.3; bb[q + 7] = 1; bb[q + 8] = 1;
    }
    return n;
  }

  // Explosions send people flying; they land, lie around for a moment and get up again.
  blast(cx, cy, cz, radius, strength) {
    const size = this.g.world.wrap ? this.g.world.sx : 0;
    for (const a of this.list) {
      const dx = wrapDelta(a.x - cx, size), dy = a.y + 1 - cy, dz = wrapDelta(a.z - cz, size), d = Math.hypot(dx, dy, dz);
      if (d > radius) continue;
      const k = (strength * (1 - d / radius) + 4) / (d + 0.5);
      if (a.state !== 'fly') this.g.stat('people');
      a.state = 'fly';
      a.vx = dx * k; a.vz = dz * k; a.vy = strength * 0.6 + 8;
    }
  }

  // Three to five cubes per person (pos3, scale3, yaw, tumble, rgba); returns the new write offset.
  write(out, o, max) {
    const g = this.g, cam = g.cam, u = g.world.unit, s = u * 0.45, far = cam.wrap ? cam.cap2 : 1e12;
    for (const a of this.list) {
      if (o + 60 > max) break;
      const fx = wrapDelta(a.x - cam.focusX, cam.wrap), fz = wrapDelta(a.z - cam.focusZ, cam.wrap);
      if (fx * fx + fz * fz > far) continue; // beyond the horizon
      const down = a.state === 'down', tumble = a.state === 'fly' ? a.spin : down ? 1.57 : 0;
      const bob = a.state === 'walk' ? Math.abs(Math.sin(a.phase)) * 0.15 * u : 0, y = a.y + bob + (down ? s * 0.4 : 0);
      const cube = (ox, oy, oz, sx, sy, sz, c) => {
        // Offsets are rotated around the feet only for the lying/tumbling pose.
        const ct = Math.cos(tumble), sn = Math.sin(tumble), ry = oy * ct - oz * sn, rz = oy * sn + oz * ct;
        const cs = Math.cos(a.dir), ss = Math.sin(a.dir);
        out[o++] = a.x + ox * cs + rz * ss; out[o++] = y + ry; out[o++] = a.z - ox * ss + rz * cs;
        out[o++] = sx; out[o++] = sy; out[o++] = sz; out[o++] = a.dir; out[o++] = tumble;
        out[o++] = c[0]; out[o++] = c[1]; out[o++] = c[2]; out[o++] = 0;
      };
      cube(0, s * 0.8, 0, s * 0.9, s * 1.6, s * 0.6, [0.2, 0.22, 0.35]);
      cube(0, s * 2.3, 0, s * 1.1, s * 1.5, s * 0.7, a.shirt);
      cube(0, s * 3.5, 0, s * 0.8, s * 0.8, s * 0.8, a.skin);
      if (a.run || a.state === 'fly') { // arms up
        cube(-s * 0.8, s * 3.3, 0, s * 0.3, s * 1.4, s * 0.3, a.skin);
        cube(s * 0.8, s * 3.3, 0, s * 0.3, s * 1.4, s * 0.3, a.skin);
      }
    }
    // Everything below is built from cubes placed relative to a vehicle: fwd/up/side in its own lengths.
    let B = null, hs = 1, cs = 1, sn = 0, yaw = 0;
    const at = (b, scale, y) => { B = b; hs = scale; yaw = y; cs = Math.cos(y); sn = Math.sin(y); };
    const cube = (fwd, up, side, sx, sy, sz, c, em = 0, rot = yaw) => {
      out[o++] = B.x + sn * fwd * hs + cs * side * hs; out[o++] = B.y + up * hs; out[o++] = B.z + cs * fwd * hs - sn * side * hs;
      out[o++] = sx * hs; out[o++] = sy * hs; out[o++] = sz * hs; out[o++] = rot; out[o++] = 0;
      out[o++] = c[0]; out[o++] = c[1]; out[o++] = c[2]; out[o++] = em;
    };
    const DARK = [0.2, 0.2, 0.22], GLASS = [0.35, 0.7, 0.9], BLUE = [0.15, 0.4, 1], RED = [1, 0.15, 0.1], WHITE = [0.95, 0.95, 0.97], GREY = [0.6, 0.63, 0.67];
    // Helicopters: fuselage, cockpit, tail boom, fin, skids and two rotor blades.
    for (const h of this.helis) {
      if (o + 190 > max) break;
      const fall = h.state === 'fall';
      at(h, u * 1.5, h.yaw + h.spin);
      cube(0, 0, 0, 1.5, 1.5, 3.2, h.body);
      cube(1.5, 0.1, 0, 1.3, 1.1, 1.2, h.kind === 'army' ? DARK : GLASS);
      cube(-3, 0.3, 0, 0.4, 0.4, 3.4, h.body);
      cube(-4.6, 0.9, 0, 0.3, 1.4, 0.8, h.kind === 'news' ? [0.95, 0.75, 0.1] : h.body);
      cube(0, -1.1, 0.6, 0.2, 0.2, 2.6, DARK); cube(0, -1.1, -0.6, 0.2, 0.2, 2.6, DARK);
      cube(0, 1, 0, 0.3, 0.5, 0.3, DARK);
      cube(0, 1.3, 0, 0.35, 0.1, 7, DARK, 0, h.rotor * (fall ? 0.4 : 1)); cube(0, 1.3, 0, 7, 0.1, 0.35, DARK, 0, h.rotor * (fall ? 0.4 : 1));
      if (h.kind === 'news') { cube(1.2, -0.9, 0, 0.5, 0.5, 0.5, [1, 1, 0.85], 1); cube(0, 0, 0.78, 0.05, 0.6, 1.6, [0.95, 0.75, 0.1]); cube(0, 0, -0.78, 0.05, 0.6, 1.6, [0.95, 0.75, 0.1]); } // lamp and a broadcaster's stripe
      else if (h.kind === 'army') { cube(0.2, -0.3, 1.3, 1.2, 0.15, 0.8, h.body); cube(0.2, -0.3, -1.3, 1.2, 0.15, 0.8, h.body); cube(0.4, -0.6, 1.5, 0.4, 0.4, 1.4, DARK); cube(0.4, -0.6, -1.5, 0.4, 0.4, 1.4, DARK); } // stub wings with pods
      else { cube(0, 0, 0.78, 0.05, 0.5, 2.2, WHITE); cube(0, 0, -0.78, 0.05, 0.5, 2.2, WHITE); cube(0, -2.6, 0, 1.1, 1, 1.1, h.load > 0 ? [0.3, 0.6, 0.95] : [0.9, 0.5, 0.1]); cube(0, -1.7, 0, 0.08, 1.2, 0.08, DARK); } // bucket on a line
      if (Math.floor(h.blink * 3) % 2) cube(-4.6, 1.8, 0, 0.3, 0.3, 0.3, RED, 1);
    }
    for (const j of this.jets) {
      if (o + 80 > max) break;
      at(j, u * 1.6, j.yaw + j.spin);
      cube(0, 0, 0, 0.9, 0.8, 6, GREY); cube(3.4, 0, 0, 0.6, 0.5, 1.2, DARK); cube(1, 0.5, 0, 0.6, 0.4, 1.4, GLASS);
      cube(-0.6, -0.1, 0, 5.4, 0.15, 1.9, GREY); cube(-2.7, 0, 0, 2.6, 0.12, 1, GREY); cube(-2.6, 0.9, 0, 0.12, 1.3, 1.1, GREY);
    }
    // Police cars and fire engines, with flashing lights.
    for (const c of this.units) {
      if (o + 200 > max) break;
      const fx = wrapDelta(c.x - cam.focusX, cam.wrap), fz = wrapDelta(c.z - cam.focusZ, cam.wrap);
      if (fx * fx + fz * fz > far) continue;
      const flash = Math.floor(c.blink * 5) % 2;
      at(c, u * 1.15, c.yaw);
      if (c.kind === 'police') {
        cube(0, 0.75, 0, 1.8, 0.8, 4.2, WHITE); cube(0, 0.75, 0, 1.86, 0.45, 1.7, [0.1, 0.25, 0.7]);
        cube(-0.2, 1.45, 0, 1.6, 0.7, 2, [0.25, 0.4, 0.55]);
        cube(-0.2, 1.95, 0.45, 0.5, 0.28, 0.4, BLUE, flash ? 1 : 0); cube(-0.2, 1.95, -0.45, 0.5, 0.28, 0.4, RED, flash ? 0 : 1);
        for (const s of [-0.9, 0.9]) for (const f of [-1.3, 1.3]) cube(f, 0.32, s, 0.3, 0.64, 0.64, DARK);
      } else {
        cube(-0.7, 1.25, 0, 2.2, 1.7, 4.2, [0.85, 0.1, 0.08]); cube(2.1, 1.1, 0, 2.2, 1.4, 1.4, [0.85, 0.1, 0.08]); cube(2.82, 1.4, 0, 1.9, 0.6, 0.06, GLASS);
        cube(-0.7, 2.25, 0, 0.8, 0.2, 4.6, GREY); cube(-0.7, 1.25, 0, 2.26, 0.3, 4.2, WHITE);
        cube(2.1, 1.95, 0.6, 0.4, 0.3, 0.4, BLUE, flash ? 1 : 0); cube(2.1, 1.95, -0.6, 0.4, 0.3, 0.4, BLUE, flash ? 0 : 1);
        for (const s of [-1.1, 1.1]) for (const f of [-2, -0.8, 2]) cube(f, 0.36, s, 0.3, 0.72, 0.72, DARK);
      }
    }
    return o;
  }
}
