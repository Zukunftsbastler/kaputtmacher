// Kaputtmacher: game object, fixed-step simulation loop, camera and frame rendering.

import { m4, makeRng, clamp, wrapDelta } from './math.js';
import { MATS, TYPE_MAT, MAT } from './materials.js';
import { CS } from './world.js';
import { meshChunk, meshVolume } from './mesher.js';
import { Renderer } from './renderer.js';
import { Destruction } from './destruction.js';
import { Bodies } from './bodies.js';
import { Debris, Fx, launch } from './particles.js';
import { Actors } from './actors.js';
import { Monster, buildModel, partMatrix, stageNeed, newPose, locomotion, MODEL_HEIGHT } from './monster.js';
import { Stability } from './stability.js';
import { Fire } from './fire.js';
import { Sweeper } from './sweeper.js';
import { Tools, movesFor } from './tools.js';
import { WORLDS } from './worldgen.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { loadProgress, saveProgress, cleanStage, cleanSpecies, cleanQuality } from './progress.js';

const STEP = 1 / 60; // the simulation always advances in equal steps (needed later for slow motion and rewind)
const FOV = (55 * Math.PI) / 180;
const QUALITY = {
  // planet: edge length of planet worlds in voxels (tall: of the skyscraper world). cap: radius of the part of a planet that is visible (and meshed) at once.
  high: { planet: 1024, tall: 1024, cap: 360, debris: 9000, fx: 3000, people: 1 },
  low: { planet: 512, tall: 512, cap: 250, debris: 2200, fx: 1000, people: 0.4 },
};
// Dust colour per material.
const DUST = { [MAT.EARTH]: [0.55, 0.42, 0.3], [MAT.GLASS]: [0.85, 0.95, 1], [MAT.LEAF]: [0.4, 0.7, 0.3], [MAT.WOOD]: [0.75, 0.6, 0.4], [MAT.BRICK]: [0.8, 0.5, 0.4], [MAT.CONCRETE]: [0.75, 0.75, 0.73], [MAT.STEEL]: [0.6, 0.62, 0.66], [MAT.SHEET]: [0.7, 0.72, 0.75], [MAT.EXPLOSIVE]: [0.3, 0.3, 0.3], [MAT.FABRIC]: [0.9, 0.9, 0.85] };

const params = new URLSearchParams(location.search);
const v3 = [0, 0, 0], mat = m4.create(), base = m4.create();

class Game {
  constructor() {
    this.canvas = document.getElementById('view');
    this.renderer = new Renderer(this.canvas);
    this.audio = new Audio();
    this.input = new Input(this.canvas);
    this.input.onFirstGesture = () => this.audio.unlock();
    this.progress = loadProgress();
    this.progress.volatile = ['stage', 'unlock', 'world', 'quality', 'species'].some((k) => params.has(k));
    // Address-bar parameters are for testing. They are validated like stored data and never saved.
    if (params.has('stage')) this.progress.stage = this.progress.playStage = cleanStage(params.get('stage'));
    if (params.has('quality')) this.progress.settings.quality = cleanQuality(params.get('quality'));
    if (params.has('species')) this.progress.species = cleanSpecies(params.get('species'));
    if (params.has('unlock')) this.progress.settings.unlockAll = true;
    this.audio.setVolume(this.progress.settings.volume);

    this.rng = makeRng(1);
    this.time = 0;
    this.paused = false;
    this.lastHit = { dx: 0, dz: 1, pop: 0 }; // direction of the last hit and how hard it tosses loosened pieces upwards
    this.aim = { x: 0, y: 0, z: 0, hit: false };
    this.eye = [0, 0, 0];
    this.fly = false;
    this.flyPos = [0, 0, 0];
    this.camYaw = 0; this.camPitch = 0.5; this.flyPitch = -0.5;
    this.shakeAmt = 0;
    this.cam = { vp: m4.create(), eye: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], fwd: [0, 0, 1], focusX: 0, focusZ: 0, curv: 0, wrap: 0, cap2: 1e12, top: [0, 0, 0], low: [0, 0, 0], horizon: 0, fogDist: 900 };
    this.view = m4.create(); this.proj = m4.create();

    this.destruction = new Destruction(this);
    this.bodies = new Bodies(this);
    this.fire = new Fire(this);
    this.stability = new Stability(this);
    this.sweeper = new Sweeper(this);
    this.heat = 0; // 0..1: how much has been destroyed lately; brings the helicopters
    this.slowT = 0; // seconds of slow motion left after a heavy blow
    this.hitStop = 0; // seconds the simulation holds still after a heavy blow
    this.groanT = 0;
    this.setQuality();
    this.actors = new Actors(this);
    this.monster = new Monster(this);
    this.tools = new Tools(this);
    this.tool = movesFor(this.progress.species)[0].id; // the selected move
    this.chunkMeshes = new Map();
    this.bodyMeshes = new Map();
    this.model = null;
    this.modelMeshes = [];
    this.pending = []; // explosions waiting for their short fuse
    this.recent = []; // recent explosions, to keep one tank from going off a hundred times
    this.gain = 0; this.gainPos = [0, 0, 0]; this.orbAcc = 0;
    this.doneQueue = [];
    this.activeSt = null; this.activeT = 0;
    this.growCool = 0;
    this.worldDone = false; this.fireworks = 0;
    this.walked = 0; this.idle = 0;
    this.frameMs = 16; this.governT = 0;
    this.ghost = { pose: newPose(), t: 0, len: 1 };

    this.hud = new Hud(this);
    this.loadWorld(params.get('world') ?? this.progress.world);
    if (params.has('tool') && this.unlockedTools().includes(params.get('tool'))) this.tool = params.get('tool');
    if (params.has('fly')) this.fly = true;
    this.hud.refreshTools();
    this.hud.requestHint('move');

    // If the browser takes the graphics context away (driver reset, memory pressure), start over cleanly.
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.contextLost = true; });
    this.canvas.addEventListener('webglcontextrestored', () => location.reload());

    this.last = performance.now();
    this.acc = 0;
    this.tick = (t) => this.frame(t);
    requestAnimationFrame(this.tick);
  }

  setQuality() {
    const s = this.progress.settings.quality;
    const weak = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    this.quality = QUALITY[s === 'auto' ? (weak ? 'low' : 'high') : s];
    this.debris = new Debris(this, this.quality.debris);
    this.fx = new Fx(this, this.quality.fx);
    this.cubeBuf = new Float32Array((this.quality.debris + 1200) * 12);
    this.billBuf = new Float32Array((this.quality.fx + 200) * 9);
  }

  // World handling ---------------------------------------------------------------

  // Generates a world from its blueprint. Calling it again with the same index is "rebuild".
  // `which` is a world id (or its position in the list).
  loadWorld(which, reroll = false) {
    const p = this.progress;
    let index = WORLDS.findIndex((w) => w.id === which);
    if (index < 0) index = clamp(Number(which) | 0, 0, WORLDS.length - 1);
    if (reroll || !p.mixSeed) p.mixSeed = (Math.random() * 1e9) | 0;
    p.world = WORLDS[index].id;
    saveProgress(p);
    const seed = p.world === 'random' ? p.mixSeed : 1000 + index * 77;
    const world = WORLDS[index].make(seed, this.quality, p.mix);
    world.finalize();
    world.onDestroyed = (type, x, y, z, st) => this.onDestroyed(type, x, y, z, st);
    this.world = world;
    this.rng = makeRng(seed + 5);

    for (const m of this.chunkMeshes.values()) this.renderer.deleteMesh(m);
    this.chunkMeshes.clear();
    this.destruction.reset(world);
    this.bodies.clear();
    this.fire.clear();
    this.stability.reset();
    this.sweeper.clear();
    this.heat = 0;
    this.debris.clear();
    this.fx.clear();
    this.tools.reset();
    this.pending.length = 0; this.recent.length = 0; this.doneQueue.length = 0;
    this.gain = 0;
    this.activeSt = null;
    this.worldDone = false; this.fireworks = 0; this.milestone = 0;

    const m = this.monster;
    m.stage = p.playStage;
    m.place(world.spawn[0], world.spawn[1], world.spawn[2], world.heading ?? 0);
    this.camYaw = m.heading;
    this.pitchOffset = 0; // the player's own correction on top of the automatic pitch
    this.flyPos = [world.spawn[0], world.spawn[1] + m.h * 2 + 20, world.spawn[2]];
    this.buildMonster();
    this.actors.populate(p.settings.life ? Math.round((world.people ?? 0) * this.quality.people) : 0);

    const c = this.cam;
    // On a planet only a cap around the focus is visible; its size does not depend on the size of the world.
    const cap = Math.min(this.quality.cap, world.sx / 2 - 2);
    c.wrap = world.wrap ? world.sx : 0;
    c.curv = world.wrap ? 0.6 / cap : 0;
    c.cap2 = world.wrap ? cap * cap : 1e12;
    c.fogDist = world.wrap ? cap * 2.2 : 1400;
    c.top = world.sky[0]; c.low = world.sky[1];
    this.hud.setStructures(world);
    this.hud.showNext(false);
    this.hud.refreshTools();
    this.hud.setPower(p.power / stageNeed(p.stage), p.stage);
    if (p.stage >= 2) this.hud.requestHint('camera');
    this.meshBudget = 60;
  }

  // The big arrow after a finished world: the player picks the next one.
  nextWorld() {
    this.hud.doneHint('next');
    this.hud.openWorlds();
  }

  buildMonster() {
    const m = this.monster;
    for (const mesh of this.modelMeshes) this.renderer.deleteMesh(mesh);
    this.model = buildModel(this.progress.species, m.stage);
    this.modelMeshes = this.model.parts.map((p) => this.renderer.createMesh(p.data, p.quads));
  }

  setSpecies(id) {
    this.progress.species = id;
    saveProgress(this.progress);
    this.tools.reset();
    this.tool = movesFor(id)[0].id; // every creature has its own moves
    this.buildMonster();
    this.hud.refreshTools();
    this.hud.refreshButtons();
  }

  setPlayStage(s) {
    const p = this.progress;
    p.playStage = clamp(s, 1, p.stage);
    saveProgress(p);
    this.monster.stage = p.playStage;
    this.monster.h = this.monster.targetHeight();
    this.buildMonster();
    if (!this.unlockedTools().includes(this.tool)) this.tool = movesFor(p.species)[0].id;
    this.hud.refreshTools();
  }

  applySettings(key) {
    const s = this.progress.settings;
    if (key === 'volume') this.audio.setVolume(s.volume);
    else if (key === 'quality') { this.setQuality(); this.loadWorld(this.progress.world); }
    else if (key === 'life') this.actors.populate(s.life ? Math.round((this.world.people ?? 0) * this.quality.people) : 0);
    else if (key === 'unlockAll') this.hud.refreshTools();
    else if (key === 'cascade') this.hud.refreshButtons();
  }

  // Tools and actions --------------------------------------------------------------

  get allUnlocked() { return this.progress.settings.unlockAll; }

  unlockedTools() {
    const stage = this.allUnlocked ? 99 : this.monster.stage;
    return movesFor(this.progress.species).filter((t) => t.stage <= stage).map((t) => t.id);
  }

  selectTool(id) {
    if (!this.unlockedTools().includes(id)) return;
    this.tool = id;
    this.hud.refreshTools();
  }

  doAction(a) {
    const list = this.unlockedTools();
    if (a === 'stomp') this.tools.stomp();
    else if (a === 'cascade') { const s = this.progress.settings; s.cascade = !s.cascade; saveProgress(this.progress); this.hud.refreshButtons(); }
    else if (a === 'roar') this.tools.roar();
    else if (a === 'rebuild') { this.hud.doneHint('rebuild'); this.loadWorld(this.progress.world); }
    else if (a === 'camera') {
      if (!this.allUnlocked && this.progress.stage < 2) return;
      this.fly = !this.fly;
      if (this.fly) this.flyPos = [this.monster.x - Math.sin(this.camYaw) * 30, this.monster.y + this.monster.h * 1.5 + 25, this.monster.z - Math.cos(this.camYaw) * 30];
      this.hud.doneHint('camera');
      this.hud.refreshButtons();
    } else if (a === 'tool+' || a === 'tool-') this.selectTool(list[(list.indexOf(this.tool) + (a === 'tool+' ? 1 : list.length - 1)) % list.length]);
    else if (a.startsWith('tool:')) { const id = list[Number(a.slice(5))]; if (id) this.selectTool(id); }
  }

  emit(name, data) {
    if (name === 'tool' || name === 'ability') this.hud.doneHint(data);
    if (data === 'light') this.hud.requestHint('heavy');
    if (data === 'heavy' && this.progress.species !== 'jet') this.hud.requestHint('stomp');
    this.idle = 0;
  }

  shake(a) {
    if (this.progress.settings.shake) this.shakeAmt = Math.max(this.shakeAmt, a);
  }

  // Simulation callbacks -------------------------------------------------------------

  // Called by the world for every original voxel that leaves its place.
  onDestroyed(type, x, y, z, st) {
    this.gain += MATS[TYPE_MAT[type]].power;
    this.gainPos[0] = x; this.gainPos[1] = y; this.gainPos[2] = z;
    if (!st || !st.id) return;
    if (st.major) { this.activeSt = st; this.activeT = this.time; }
    if (!st.done && st.remaining <= st.total * 0.1) { st.done = true; this.doneQueue.push(st); }
  }

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
    if (t[MAT.CONCRETE] + t[MAT.BRICK] > body.count * 0.3) this.audio.crumble(size);
    if (t[MAT.GLASS] > 40) this.audio.glassfall(Math.min(1, t[MAT.GLASS] / 3000));
    if (t[MAT.STEEL] + t[MAT.SHEET] > 30) this.audio.hit('metal', size + 0.2);
    if (t[MAT.WOOD] > body.count * 0.3) this.audio.hit('wood', size + 0.3);
    // Heavy wreckage throws up a column of dust that hangs for a few seconds.
    if (body.count > 1500 && speed > 12 && this.rng() < 0.5) this.fire.spot(x, y, z, 2 + size * 3, 2.5 + this.rng() * 3, false);
  }

  // Something large has come loose: concrete cracks, steel starts to groan.
  onCollapse(body) {
    const t = body.tally, size = Math.min(1, body.count / 20000);
    if (t[MAT.CONCRETE] + t[MAT.BRICK] > 200) this.audio.crack(size);
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
    // How hard the shove is depends on how big the creature is compared with what is left of the building.
    const bonus = clamp((0.08 * m.h ** 3 * strength) / Math.max(200, st.remaining), 0, 0.6);
    this.stability.shove(st, dx, dz, bonus);
    this.audio.step(1);
    this.shake(0.2 + bonus * 0.6);
    this.fx.dust(x, m.y + m.h * 0.4, z, m.h * 0.3, 0.75, 0.72, 0.66, 4);
  }

  onLeapLand() { this.tools.leapLanded(); }

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
    this.fx.dust(cx, y, cz, size * 0.45, 0.76, 0.74, 0.7, 12);
    this.cascade(st, cx, cz, size);
  }

  cascade(st, cx, cz, size) {
    const stage = this.monster.stage, s = this.progress.settings;
    if (st.fell || !s.cascade || (stage < 4 && !this.allUnlocked)) return;
    st.fell = true;
    // Stronger with every stage; fades from one generation of the chain to the next.
    const amount = Math.min(0.55, 0.24 + 0.05 * (stage - 4)) * 0.88 ** st.gen;
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

  onStompLand(m) {
    if (m.stage >= 2 || this.allUnlocked) { this.tools.stompLand(m); this.hud.doneHint('stomp'); return; }
    // Stage 1 lands softly: a puff of dust, no crater yet.
    this.fx.dust(m.x, m.y + 0.5, m.z, m.h * 0.3, 0.8, 0.78, 0.7, 5);
    this.audio.step(0.5);
  }

  queueExplosion(x, y, z) {
    for (const e of this.pending) if (Math.hypot(e.x - x, e.y - y, e.z - z) < 7) return;
    for (const e of this.recent) if (Math.hypot(e.x - x, e.y - y, e.z - z) < 7) return;
    this.pending.push({ x, y, z, t: 0.05 + this.rng() * 0.12 });
  }

  explode(x, y, z, r, power) {
    this.recent.push({ x, y, z, t: 0.6 });
    this.lastHit.pop = launch(r * 1.2);
    this.destruction.sphere(x, y, z, r, power, { impulse: launch(r * 6 + 12), debris: 200, blast: launch(r * 4) });
    this.fx.explosion(x, y, z, r);
    // What can burn nearby catches fire; the crater itself keeps burning and smoking for a while.
    this.fire.igniteSphere(x, y, z, r * 1.4, 70);
    this.fire.spot(x, y, z, r * 0.45 + 1, 5 + this.rng() * 7);
    this.audio.boom(r / 9);
    const size = this.world.wrap ? this.world.sx : 0;
    const d = Math.hypot(wrapDelta(x - this.eye[0], size), y - this.eye[1], wrapDelta(z - this.eye[2], size));
    this.shake(clamp((r * 14) / (d + 20), 0, 1.6));
  }

  addPower(v) {
    const p = this.progress;
    p.power += v;
    const need = stageNeed(p.stage);
    if (p.power < need || this.growCool > 0) return;
    p.power = Math.min(p.power - need, stageNeed(p.stage + 1) * 0.8);
    const follow = p.playStage === p.stage;
    p.stage++;
    this.growCool = 2;
    if (follow) { p.playStage = p.stage; this.grow(); }
    saveProgress(p);
  }

  // The growth moment: roar, flash, shock wave, a new ability.
  grow() {
    const m = this.monster, p = this.progress;
    m.stage = p.playStage;
    m.grow = 1;
    m.pose.roar = 1;
    this.buildMonster();
    this.audio.grow();
    this.audio.roar(m.stage);
    this.shake(0.9);
    const H = m.targetHeight();
    this.debris.blast(m.x, m.y, m.z, H * 2, 20 + H * 0.3);
    this.actors.blast(m.x, m.y, m.z, H * 1.5, 14);
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * 6.283;
      this.fx.add(m.x, m.y + 1, m.z, Math.cos(a) * H * 2.5, 2, Math.sin(a) * H * 2.5, H * 0.12 + 1, H * 0.2, 0.7, 1, 0.9, 0.4, 0.9, 1, 0, 1.5);
    }
    this.hud.setPower(p.power / stageNeed(p.stage), p.stage, true);
    const fresh = movesFor(p.species).find((t) => t.stage === m.stage);
    if (fresh) this.tool = fresh.id; // the new move is selected right away
    this.hud.refreshTools(true);
    if (fresh) { this.hud.requestHint('light', true); this.hud.requestHint('heavy', true); }
    if (m.stage === 2) this.hud.requestHint('camera'); // the fly camera button appears with stage 2
  }

  structureDone(st) {
    const p = this.progress;
    this.addPower(st.total * 0.25);
    if (!st.major) return;
    this.cascade(st, (st.x0 + st.x1) / 2, (st.z0 + st.z1) / 2, Math.max(st.x1 - st.x0, st.z1 - st.z0));
    this.audio.fanfare();
    if (this.project((st.x0 + st.x1) / 2, st.top * 0.5 + 6, (st.z0 + st.z1) / 2, v3)) this.hud.stamp(st, v3[0], v3[1]);
    if (!p.stickers.includes(st.icon)) p.stickers.push(st.icon);
    if (!p.seen.rebuildShown) { p.seen.rebuildShown = true; this.hud.refreshButtons(); this.hud.requestHint('rebuild'); }
    if (!this.worldDone && this.hud.major.every((s) => s.done)) {
      this.worldDone = true;
      this.fireworks = 7;
      if (!p.completed.includes(p.world)) p.completed.push(p.world);
      this.audio.win();
      this.hud.showNext(true);
      this.hud.requestHint('next');
      this.hud.refreshButtons();
    }
    saveProgress(p);
  }

  // One fixed simulation step -----------------------------------------------------

  step(dt) {
    const inp = this.input, m = this.monster;
    this.time += dt;
    this.growCool -= dt;

    let mx = 0, mz = 0;
    if (this.fly) {
      const sp = (50 + this.flyPos[1] * 0.5) * dt, cp = Math.cos(this.flyPitch);
      this.flyPos[0] += Math.sin(this.camYaw) * cp * inp.forward * sp;
      this.flyPos[2] += Math.cos(this.camYaw) * cp * inp.forward * sp;
      this.flyPos[1] = clamp(this.flyPos[1] + (Math.sin(this.flyPitch) * inp.forward + inp.lift) * sp, 6, this.world.sy + 90);
      if (!this.world.wrap) { this.flyPos[0] = clamp(this.flyPos[0], -80, this.world.sx + 80); this.flyPos[2] = clamp(this.flyPos[2], -80, this.world.sz + 80); }
      // Never inside the ground or a building.
      const floor = this.world.heightBelow(this.flyPos[0], this.flyPos[2], this.world.sy - 1) + 4;
      if (this.flyPos[1] < floor) this.flyPos[1] += (floor - this.flyPos[1]) * 0.2;
    } else if (this.progress.species === 'jet') {
      // The aircraft always flies where the camera looks: left/right turns, up/down climbs and dives.
      m.steer = inp.turn; m.pitchIn = inp.forward;
      if (m.homing) { // off the edge of an island: a gentle turn back towards the middle
        let d = Math.atan2(this.world.sx / 2 - m.x, this.world.sz / 2 - m.z) - this.camYaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        this.camYaw += clamp(d, -1, 1) * dt * 2.5;
      }
      m.heading = this.camYaw - inp.turn * dt * 1.9;
    } else if (!this.tools.rooted) { // a planted move holds the feet still
      mx = Math.sin(this.camYaw) * inp.forward; mz = Math.cos(this.camYaw) * inp.forward;
    }
    this.camYaw -= inp.turn * dt * 1.9; // forward is (sin yaw, cos yaw), so turning right lowers the yaw
    const px = m.x, pz = m.z;
    m.jumpHeld = inp.jumpHeld;
    m.sprint = inp.sprint;
    m.update(dt, mx, mz, this.aim.x, this.aim.z);
    this.walked += Math.hypot(wrapDelta(m.x - px, this.cam.wrap), wrapDelta(m.z - pz, this.cam.wrap));
    if (this.walked > m.h * 1.2) { this.hud.doneHint('move'); this.hud.requestHint('light'); this.walked = -1e9; }

    // Left = the quick version of the selected move, right = the slow, strong one.
    if (inp.heavyPressed) this.tools.use(this.tool, true);
    else if (inp.firePressed) this.tools.use(this.tool, false);
    inp.firePressed = inp.heavyPressed = false;
    this.tools.update(dt);
    this.bodies.update(dt);
    this.fire.update(dt);
    this.stability.update(dt);
    this.sweeper.update();
    this.destruction.flush();
    this.lastHit.pop = 0;
    this.debris.update(dt);
    this.fx.update(dt, m.x, m.y + m.h * 0.6, m.z);
    this.actors.update(dt);

    for (let i = this.pending.length - 1; i >= 0; i--) {
      const e = this.pending[i];
      if ((e.t -= dt) > 0) continue;
      this.pending.splice(i, 1);
      this.explode(e.x, e.y, e.z, 5 + this.world.unit * 1.5, 15);
    }
    for (let i = this.recent.length - 1; i >= 0; i--) if ((this.recent[i].t -= dt) <= 0) this.recent.splice(i, 1);

    // Turn this step's destruction into power, with orbs flying to the monster.
    if (this.gain > 0) {
      const p = this.progress, per = stageNeed(p.stage) / 60;
      this.orbAcc += this.gain;
      for (let n = 0; this.orbAcc >= per && n < 4; n++) {
        this.orbAcc -= per;
        this.fx.orb(this.gainPos[0] + (this.rng() - 0.5) * 6, this.gainPos[1] + 1, this.gainPos[2] + (this.rng() - 0.5) * 6);
        this.audio.orb();
      }
      this.orbAcc = Math.min(this.orbAcc, per * 4);
      this.heat = Math.min(1, this.heat + this.gain / (this.world.total * 0.012 + 400)); // about one percent of the world brings all four helicopters
      this.addPower(this.gain);
      this.gain = 0;
      this.hud.setPower(p.power / stageNeed(p.stage), p.stage);
      const frac = this.worldDone ? 1 : (1 - this.world.remaining / this.world.total) / 0.9;
      this.hud.setWorld(frac);
      // Big worlds take a while: every quarter is celebrated.
      const quarter = Math.min(3, Math.floor(frac * 4));
      if (quarter > this.milestone) { this.milestone = quarter; this.fireworks = Math.max(this.fireworks, 3); this.audio.fanfare(); }
    }
    this.heat = Math.max(0, this.heat - dt * 0.025);
    while (this.doneQueue.length) this.structureDone(this.doneQueue.shift());

    if (this.fireworks > 0) {
      this.fireworks -= dt;
      if (this.rng() < dt * 5) {
        const a = this.rng() * 6.28, d = m.h * 2 + 20;
        this.fx.firework(m.x + Math.cos(a) * d, m.y + m.h * 1.5 + 20 + this.rng() * 30, m.z + Math.sin(a) * d, 30 + m.h * 0.4);
        this.audio.boom(0.15);
      }
    }
    if (m.stage >= 8 && this.rng() < 0.3) // aura
      this.fx.add(m.x + (this.rng() - 0.5) * m.h * 0.6, m.y + this.rng() * m.h, m.z + (this.rng() - 0.5) * m.h * 0.6, 0, m.h * 0.3, 0, m.h * 0.05, 0, 0.8, 1, 0.5, 0.1, 0.6, 1);

    // While a big piece is on its way down, the steel keeps groaning.
    if ((this.groanT -= dt) <= 0) {
      this.groanT = 0.5 + this.rng() * 0.7;
      for (const b of this.bodies.list) if (b.count > 2500 && Math.hypot(b.v[0], b.v[1], b.v[2]) > 3) { this.audio.groan(Math.min(1, b.count / 20000)); break; }
    }

    // After a long pause the current tool is demonstrated once more.
    this.idle += dt;
    if (inp.forward || inp.turn || inp.fire) this.idle = 0;
    if (this.idle > 25 && !this.hud.hintId) { this.idle = 0; this.hud.requestHint(this.progress.seen.move ? 'light' : 'move', true); }
  }

  // Camera and picking -------------------------------------------------------------

  updateCamera(dt) {
    const c = this.cam, m = this.monster, cv = this.canvas;
    const drag = this.input.takeDrag(v3);
    this.camYaw -= drag[0] * 0.005;
    if (this.fly) this.flyPitch = clamp(this.flyPitch - drag[1] * 0.004, -1.4, 0.6);
    else this.pitchOffset = clamp(this.pitchOffset + drag[1] * 0.004, -0.6, 0.9);
    // A small monster between tall buildings looks ahead and up at them; a giant looks down on its planet.
    const tallness = clamp(m.h / (this.world.sy * 0.45), 0, 1);
    this.camPitch = clamp((this.world.wrap ? 0.2 + 0.5 * tallness : 0.52) + this.pitchOffset, 0.02, 1.25);

    let tx = 0, ty, tz = 0, dist = 0;
    const yaw = this.camYaw, pitch = this.fly ? this.flyPitch : -this.camPitch, cp = Math.cos(pitch);
    c.fwd[0] = Math.sin(yaw) * cp; c.fwd[1] = Math.sin(pitch); c.fwd[2] = Math.cos(yaw) * cp;
    if (this.fly) { c.focusX = this.flyPos[0]; c.focusZ = this.flyPos[2]; ty = this.flyPos[1]; }
    else { c.focusX = m.x; c.focusZ = m.z; ty = m.y + m.h * (this.progress.species === 'jet' ? 0.5 : 1.3); dist = m.h * 3.4 + 12; }
    c.eye[0] = tx - c.fwd[0] * dist; c.eye[1] = ty - c.fwd[1] * dist; c.eye[2] = tz - c.fwd[2] * dist;
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 1.8);
    if (this.shakeAmt > 0.01) {
      const k = this.shakeAmt * (2 + dist * 0.02);
      c.eye[0] += (Math.random() - 0.5) * k; c.eye[1] += (Math.random() - 0.5) * k; c.eye[2] += (Math.random() - 0.5) * k;
    }
    const fl = Math.hypot(c.fwd[0], c.fwd[2]) || 1;
    c.right[0] = -c.fwd[2] / fl; c.right[1] = 0; c.right[2] = c.fwd[0] / fl;
    c.up[0] = c.right[1] * c.fwd[2] - c.right[2] * c.fwd[1]; c.up[1] = c.right[2] * c.fwd[0] - c.right[0] * c.fwd[2]; c.up[2] = c.right[0] * c.fwd[1] - c.right[1] * c.fwd[0];
    this.aspect = cv.clientWidth / Math.max(1, cv.clientHeight);
    m4.perspective(this.proj, FOV, this.aspect, 0.5 + dist * 0.02, 5000);
    m4.lookAt(this.view, c.eye[0], c.eye[1], c.eye[2], c.eye[0] + c.fwd[0], c.eye[1] + c.fwd[1], c.eye[2] + c.fwd[2]);
    m4.mul(c.vp, this.proj, this.view);
    c.fogDist = Math.max(this.world.wrap ? Math.sqrt(c.cap2) * 2.2 : 1400, dist * 4);
    c.horizon = Math.tan(-pitch) / Math.tan(FOV / 2) - (this.world.wrap ? 0.25 : 0.05);
    this.eye[0] = c.focusX + c.eye[0]; this.eye[1] = c.eye[1]; this.eye[2] = c.focusZ + c.eye[2];
  }

  // Finds what the pointer is on. The screen shows the bent world, so the ray is marched in
  // screen space and every sample is straightened before the voxel lookup.
  pick() {
    const c = this.cam, w = this.world, cv = this.canvas, aim = this.aim;
    const nx = (this.input.aimX / cv.clientWidth) * 2 - 1, ny = 1 - (this.input.aimY / cv.clientHeight) * 2;
    const th = Math.tan(FOV / 2);
    let dx = c.fwd[0] + c.right[0] * nx * th * this.aspect + c.up[0] * ny * th;
    let dy = c.fwd[1] + c.right[1] * nx * th * this.aspect + c.up[1] * ny * th;
    let dz = c.fwd[2] + c.right[2] * nx * th * this.aspect + c.up[2] * ny * th;
    const l = Math.hypot(dx, dy, dz);
    dx /= l; dy /= l; dz /= l;
    aim.hit = false;
    const check = this.bodies.list.length > 0;
    let x = 0, y = 0, z = 0;
    for (let t = 2; t < 1100; t += t < 300 ? 0.6 : 1.5) {
      const vx = c.eye[0] + dx * t, vz = c.eye[2] + dz * t;
      x = c.focusX + vx; z = c.focusZ + vz;
      y = c.eye[1] + dy * t + (vx * vx + vz * vz) * c.curv;
      if (y < 0) { aim.hit = true; break; }
      if (y < w.sy && (w.get(Math.floor(x), Math.floor(y), Math.floor(z)) || (check && this.bodies.solidAt(x, y, z)))) { aim.hit = true; break; }
      if (t > 320 && !c.curv && dy >= 0) break;
    }
    aim.x = x; aim.y = y; aim.z = z;
  }

  // World point -> screen pixels. Returns false if it is behind the camera.
  project(x, y, z, out) {
    const c = this.cam;
    const rx = wrapDelta(x - c.focusX, c.wrap), rz = wrapDelta(z - c.focusZ, c.wrap);
    const w = m4.transformPoint(c.vp, rx, y - (rx * rx + rz * rz) * c.curv, rz, out);
    if (w <= 0.1) return false;
    out[0] = (out[0] / w * 0.5 + 0.5) * this.canvas.clientWidth;
    out[1] = (0.5 - out[1] / w * 0.5) * this.canvas.clientHeight;
    return true;
  }

  // Frame -------------------------------------------------------------------------------

  frame(now) {
    if (this.contextLost) { requestAnimationFrame(this.tick); return; }
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.frameMs += (dt * 1000 - this.frameMs) * 0.05;
    this.input.poll(dt);
    for (const a of this.input.actions.splice(0)) if (!this.paused) this.doAction(a);
    this.updateCamera(dt);
    this.pick();
    if (!this.paused) {
      this.acc += dt;
      let n = 0;
      // Hit stop: after a heavy blow the world freezes for a few hundredths of a second.
      if (this.hitStop > 0) { this.hitStop -= dt; this.acc = 0; }
      else if (this.slowT > 0) { this.slowT -= dt; this.acc -= dt * 0.6; } // slow motion: time runs at 40 %
      for (; this.acc >= STEP && n < 3; n++) { this.step(STEP); this.acc -= STEP; }
      if (n === 3) this.acc = 0;
      this.updateCamera(0);
    }
    this.audio.fire(this.fire.level());
    this.audio.heli(this.actors.heliLevel());
    this.govern(dt);
    this.remesh();
    this.render();
    this.hud.update();
    requestAnimationFrame(this.tick);
  }

  // Keeps the frame rate up by trimming effects, never the destruction itself.
  govern(dt) {
    if ((this.governT += dt) < 2) return;
    this.governT = 0;
    const d = this.debris, f = this.fx, r = this.renderer;
    if (this.frameMs > 26) {
      d.limit = Math.max(400, d.limit * 0.8) | 0; f.limit = Math.max(200, f.limit * 0.8) | 0;
      r.pixelScale = Math.max(0.6, r.pixelScale * 0.9);
    } else if (this.frameMs < 18) {
      d.limit = Math.min(d.max, d.limit * 1.15) | 0; f.limit = Math.min(f.max, f.limit * 1.15) | 0;
      r.pixelScale = Math.min(1, r.pixelScale * 1.05);
    }
  }

  // Rebuilds the meshes of changed chunks, nearest first, within a time budget. On a planet only the
  // chunks inside the visible cap have a mesh at all; the rest wait until the player comes near, and
  // meshes that fall behind the horizon are released again.
  remesh() {
    const w = this.world, dirty = w.dirty, c = this.cam;
    const viewR = c.wrap ? Math.sqrt(c.cap2) + 40 : Infinity, view2 = viewR * viewR, drop2 = (viewR + 70) ** 2;
    if (c.wrap) for (const [ci, gm] of this.chunkMeshes) {
      const dx = wrapDelta(gm.x + 16 - c.focusX, c.wrap), dz = wrapDelta(gm.z + 16 - c.focusZ, c.wrap);
      if (dx * dx + dz * dz > drop2) { this.renderer.deleteMesh(gm); this.chunkMeshes.delete(ci); dirty.add(ci); }
    }
    if (!dirty.size) return;
    const list = [];
    for (const ci of dirty) {
      const cx = ci % w.ncx, cz = Math.floor(ci / w.ncx) % w.ncz;
      const dx = wrapDelta(cx * CS + 16 - c.focusX, c.wrap), dz = wrapDelta(cz * CS + 16 - c.focusZ, c.wrap), d2 = dx * dx + dz * dz;
      if (d2 <= view2) list.push(ci, d2);
    }
    if (!list.length) return;
    const order = [];
    for (let i = 0; i < list.length; i += 2) order.push(i);
    order.sort((a, b) => list[a + 1] - list[b + 1]);
    const t0 = performance.now(), budget = this.meshBudget;
    this.meshBudget = order.length > 150 ? 30 : 7;
    for (let k = 0; k < order.length; k++) {
      const ci = list[order[k]];
      dirty.delete(ci);
      const cx = ci % w.ncx, cz = Math.floor(ci / w.ncx) % w.ncz, cy = Math.floor(ci / (w.ncx * w.ncz));
      const mesh = meshChunk(w, cx, cy, cz);
      this.renderer.deleteMesh(this.chunkMeshes.get(ci));
      if (mesh.quads) {
        const gm = this.renderer.createMesh(mesh.data, mesh.quads);
        gm.x = cx * CS; gm.y = cy * CS; gm.z = cz * CS;
        this.chunkMeshes.set(ci, gm);
      } else this.chunkMeshes.delete(ci);
      if (k >= 1 && performance.now() - t0 > budget) break;
    }
  }

  // Placement of the whole creature: position, facing, whole-body pitch, squash, and the pose's hop and lunge.
  monsterBase(out, x, y, z, heading, h, pose) {
    const c = this.cam, s = h / MODEL_HEIGHT, q = pose.squash;
    m4.translation(out, wrapDelta(x - c.focusX, c.wrap), y, wrapDelta(z - c.focusZ, c.wrap));
    m4.rotateY(out, heading + pose.spin);
    if (pose.pitch) m4.rotateX(out, pose.pitch);
    m4.scale(out, s * (1 + q * 0.15), s * (1 - q * 0.2), s * (1 + q * 0.15));
    m4.translate(out, 0, pose.hop, pose.fwd);
    return out;
  }

  drawMonster(b, pose, alpha, tint) {
    for (let i = 0; i < this.model.parts.length; i++)
      this.renderer.drawMesh(this.modelMeshes[i], partMatrix(mat, b, this.model, this.model.parts[i], pose), alpha, tint);
  }

  render() {
    const r = this.renderer, c = this.cam, m = this.monster;
    r.resize();
    r.begin(c);

    // Keep the monster visible behind tall buildings.
    const mDist = Math.hypot(c.eye[0], c.eye[1] - (m.y + m.h * 0.6), c.eye[2]);
    if (!this.fly && this.project(m.x, m.y + m.h * 0.55, m.z, v3)) {
      const k = this.canvas.width / this.canvas.clientWidth;
      r.setHole(v3[0] * k, (this.canvas.clientHeight - v3[1]) * k, ((m.h * 0.75) / mDist) * (this.canvas.height / 2 / Math.tan(FOV / 2)), mDist - m.h * 0.5, m.y + m.h * 0.3);
    } else r.setHole(0, 0, 0, 0, 0);

    // Static world. Chunks behind the camera or beyond the planet's visible cap are skipped.
    // A chunk is also skipped when it lies outside the cone the camera can see (with a generous margin
    // for its own size and for the way the planet's curvature shears it).
    const lim = Math.sqrt(c.cap2) + 24, cone = Math.tan(FOV / 2) * Math.hypot(1, this.aspect);
    this.drawn = 0;
    for (const gm of this.chunkMeshes.values()) {
      const dx = wrapDelta(gm.x + 16 - c.focusX, c.wrap), dz = wrapDelta(gm.z + 16 - c.focusZ, c.wrap);
      if (dx * dx + dz * dz > lim * lim) continue;
      const cy = gm.y + 16 - (dx * dx + dz * dz) * c.curv;
      const vx = dx - c.eye[0], vy = cy - c.eye[1], vz = dz - c.eye[2], along = vx * c.fwd[0] + vy * c.fwd[1] + vz * c.fwd[2];
      if (along < -30) continue;
      const side = Math.max(0, along) * cone + 66;
      if (vx * vx + vy * vy + vz * vz - along * along > side * side) continue;
      this.drawn++;
      r.drawMesh(gm, m4.translation(mat, dx - 16, gm.y, dz - 16), 1, null, gm.x, gm.y, gm.z);
    }

    // Falling fragments.
    for (const [b, e] of this.bodyMeshes) if (b.dead) { r.deleteMesh(e.mesh); this.bodyMeshes.delete(b); }
    for (const b of this.bodies.list) {
      let e = this.bodyMeshes.get(b);
      if (!e || e.version !== b.version) {
        if (e) r.deleteMesh(e.mesh);
        const mesh = meshVolume(b.vox, b.sx, b.sy, b.sz);
        e = { mesh: mesh.quads ? r.createMesh(mesh.data, mesh.quads) : null, version: b.version };
        this.bodyMeshes.set(b, e);
      }
      m4.fromQuatPos(mat, b.q, wrapDelta(b.pos[0] - c.focusX, c.wrap), b.pos[1], wrapDelta(b.pos[2] - c.focusZ, c.wrap));
      m4.translate(mat, -b.com[0], -b.com[1], -b.com[2]);
      r.drawMesh(e.mesh, mat);
    }

    r.setHole(0, 0, 0, 0, 0);
    this.monsterBase(base, m.x, m.y, m.z, m.heading, m.h, m.pose);
    this.drawMonster(base, m.pose, 1, m.grow > 0 ? [1, 1, 0.8, m.grow * 0.7] : null);

    let o = this.debris.write(this.cubeBuf, 0);
    o = this.tools.write(this.cubeBuf, o, this.time);
    o = this.actors.write(this.cubeBuf, o, this.cubeBuf.length);
    r.drawCubes(this.cubeBuf, o / 12);

    this.drawGhost();

    let n = this.fx.write(this.billBuf);
    const bb = this.billBuf;
    for (const ray of this.tools.rays) { // beams: chains of glowing dots with a bright end
      const len = Math.hypot(ray.bx - ray.ax, ray.by - ray.ay, ray.bz - ray.az), cnt = Math.min(140, Math.ceil(len / Math.max(1.2, ray.w * 1.1)));
      for (let i = 0; i <= cnt && n < bb.length / 9 - 1; i++, n++) {
        const t = i / cnt, q = n * 9;
        bb[q] = ray.ax + (ray.bx - ray.ax) * t; bb[q + 1] = ray.ay + (ray.by - ray.ay) * t; bb[q + 2] = ray.az + (ray.bz - ray.az) * t;
        bb[q + 3] = i === cnt ? ray.w * 3 : ray.w * 1.4; bb[q + 4] = ray.r; bb[q + 5] = ray.g; bb[q + 6] = ray.b; bb[q + 7] = 0.95; bb[q + 8] = 0.5;
      }
    }
    n = this.actors.writeLights(bb, n);
    r.drawBillboards(bb, n);

    const st = this.activeSt;
    if (st && this.time - this.activeT < 2.5 && this.project((st.x0 + st.x1) / 2, st.top + 5, (st.z0 + st.z1) / 2, v3)) this.hud.showBuilding(st, v3[0], clamp(v3[1], 150, 1e4));
    else this.hud.showBuilding(null);
  }

  // Show, don't tell: a see-through twin of the creature performs the action that is being introduced.
  drawGhost() {
    const id = this.hud.hintId, m = this.monster, species = this.progress.species;
    if (!id || this.fly || ['rebuild', 'camera', 'worlds', 'next'].includes(id) || species === 'jet') return; // no twin for the aircraft
    const g = this.ghost, p = g.pose, dt = 1 / 60;
    g.t += dt;
    p.time += dt;
    p.walkAmp = 0; p.squash = 0; p.roar = 0; p.air = 0; p.look = 0;
    let ahead = 0, lift = 0;
    if (id === 'move') { ahead = ((g.t % 2.4) / 2.4) * m.h * 3; p.walk += dt * 9; p.walkAmp = 1; }
    else if (id === 'stomp') { const t = (g.t % 1.3) / 1.3; lift = Math.sin(t * Math.PI) * m.h * 1.6; p.air = 1; p.squash = t < 0.08 ? 1 : 0; }
    else if (id === 'roar') { p.roar = g.t % 2 < 1.2 ? 1 - (g.t % 2) / 1.2 : 0; }
    locomotion(p, species);
    // Light and heavy attack: the ghost plays the selected move, with a pause in between.
    if (id === 'light' || id === 'heavy') g.len = this.tools.poseFor(species, this.tool, id === 'heavy', p, g.t % (g.len + 0.6));
    const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw), side = m.h * 1.1;
    const x = m.x + fz * side + fx * ahead, z = m.z - fx * side + fz * ahead;
    this.monsterBase(base, x, this.world.heightBelow(x, z, m.y + m.h) + lift, z, this.camYaw, m.h, p);
    this.drawMonster(base, p, 0.4, [1, 1, 1, 0.55]);
  }
}

try {
  window.game = new Game();
} catch (err) {
  // No WebGL2: show a plain sad face instead of a blank page.
  document.getElementById('hud').textContent = '😢';
  document.getElementById('hud').style.cssText = 'display:grid;place-items:center;font-size:120px';
  console.error(err);
}
