// Kaputtmacher: the game object. It owns every system, loads worlds, runs the fixed-step simulation and the frame loop.
// The class is written in four files (joined with mixin()): this one; game-view.js (camera, aiming, meshing and drawing);
// game-events.js (what the game does when something happens: dust, sound, shaking, chain reactions, explosions);
// game-power.js (power, growth, finished buildings, achievement counters).

import { m4, makeRng, clamp, wrapDelta } from './math.js';
import { MATS, TYPE_RGBA, T } from './materials.js';
import { meshVolume } from './mesher.js';
import { mixin } from './mixin.js';
import { World } from './world.js';
import { GameView } from './game-view.js';
import { GameEvents } from './game-events.js';
import { GamePower } from './game-power.js';
import { Renderer } from './renderer.js';
import { Destruction } from './destruction.js';
import { Bodies } from './bodies.js';
import { Debris, Fx } from './particles.js';
import { Actors } from './actors.js';
import { Monster, buildModel, stageNeed, newPose, airborne, motionOf, specOf, EMOTE_TIME } from './monster.js';
import { Stability } from './stability.js';
import { Fire } from './fire.js';
import { Sweeper } from './sweeper.js';
import { Autopilot } from './autopilot.js';
import { Reactions } from './reactions.js';
import { Traffic } from './traffic.js';
import { Frail } from './frail.js';
import { Spans } from './spans.js';
import { Ramparts } from './rampart.js';
import { Heave } from './heave.js';
import { Music } from './music.js';
import { Tools, movesFor } from './tools.js';
import { WORLDS } from './worldgen.js';
import { Audio } from './audio.js';
import { Input } from './input.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { MeshQueue } from './meshing.js';
import { PerfMeter } from './perfmeter.js';
import { loadProgress, saveProgress, switchCreature, startWorld, cleanStage, cleanSpecies, cleanDetail, cleanSeed } from './progress.js';

const STEP = 1 / 60; // the simulation always advances in equal steps (needed later for slow motion and rewind)
// Detail levels 1 (fastest) to 5 (richest), chosen with one slider in the settings.
// planet: edge length of planet worlds in voxels (tall: of the skyscraper world). cap: radius of the part of a planet
// that is visible (and meshed) at once. debris, fx: most loose cubes and particles at a time. people, units: share of
// inhabitants and emergency vehicles. thin: share of the ambient effects (dust, smoke, spray). fire: most voxels that
// burn at once. pixel: resolution of the picture relative to the screen.
const DETAIL = [null,
  { planet: 512, tall: 512, cap: 190, debris: 1200, fx: 500, people: 0.25, units: 0.5, thin: 0.35, fire: 150, pixel: 0.7 },
  { planet: 512, tall: 512, cap: 250, debris: 2200, fx: 1000, people: 0.4, units: 0.7, thin: 0.6, fire: 300, pixel: 0.85 },
  { planet: 1024, tall: 1024, cap: 300, debris: 5000, fx: 2000, people: 0.7, units: 1, thin: 0.8, fire: 600, pixel: 1 },
  { planet: 1024, tall: 1024, cap: 360, debris: 9000, fx: 3000, people: 1, units: 1, thin: 1, fire: 900, pixel: 1 },
  { planet: 1024, tall: 1024, cap: 430, debris: 14000, fx: 5000, people: 1.3, units: 1.4, thin: 1.3, fire: 1500, pixel: 1 },
];

const params = new URLSearchParams(location.search);
const v3 = [0, 0, 0];

class Game {
  constructor() {
    this.canvas = document.getElementById('view');
    this.renderer = new Renderer(this.canvas);
    this.audio = new Audio();
    this.input = new Input(this.canvas);
    this.input.onFirstGesture = () => this.audio.unlock();
    this.progress = loadProgress();
    this.progress.volatile = ['stage', 'unlock', 'world', 'quality', 'species'].some((k) => params.has(k));
    if (params.has('species')) switchCreature(this.progress, cleanSpecies(params.get('species')));
    // Address-bar parameters are for testing. They are validated like stored data and never saved.
    if (params.has('stage')) this.progress.stage = this.progress.playStage = cleanStage(params.get('stage'));
    if (params.has('quality')) this.progress.settings.detail = cleanDetail(params.get('quality'));
    if (params.has('unlock')) this.progress.settings.unlockAll = true;
    this.audio.setVolume(this.progress.settings.volume);
    this.music = new Music(this.audio);
    this.music.setVolume(this.progress.settings.music);
    this.music.setChoice(this.progress.settings.track);

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
    this.cam = { vp: m4.create(), drawVp: m4.create(), eye: [0, 0, 0], right: [1, 0, 0], up: [0, 1, 0], fwd: [0, 0, 1], focusX: 0, focusZ: 0, curv: 0, wrap: 0, cap2: 1e12, top: [0, 0, 0], low: [0, 0, 0], horizon: 0, fogDist: 900 };
    this.view = m4.create(); this.proj = m4.create(); this.shakeView = m4.create();

    this.destruction = new Destruction(this);
    this.bodies = new Bodies(this);
    this.fire = new Fire(this);
    this.stability = new Stability(this);
    this.sweeper = new Sweeper(this);
    this.reactions = new Reactions(this);
    this.frail = new Frail(this);
    this.spans = new Spans(this);
    this.ramparts = new Ramparts(this);
    this.heave = new Heave(this); // the ground over the tentacle travelling below
    this.gainScale = 1; // below 1 while a collapse is being processed: falling voxels are worth less
    this.speciesGain = 1; // some creatures destroy so easily that it is worth less (see SPECIES in monster.js); kept up to date in checkStats
    this.chainLoad = 0; // how many collapses the running chain reaction has behind it
    this.earned = 0; // all power earned in this session (for tuning the stages)
    this.heat = 0; // 0..1: how much has been destroyed lately; brings the reporters' helicopters
    this.wanted = 0; // alarm level 0..5 of the world's emergency services, in whole stars (see actors.js)
    this.alarm = 0; // the same as a fraction: rises while things break, ebbs away in peace
    this.lastGainT = -99; // when something was last destroyed
    this.absorb = 0; // 0..1: glow of the creature while power flows into it
    this.matCount = new Float64Array(MATS.length); // destroyed voxels per material since the last tally
    this.doneTimes = []; // when the last buildings were finished, for "several at once"
    this.checkT = 0; this.saveT = 0; this.auraT = 0; this.cineT = -99;
    this.slowT = 0; // seconds of slow motion left after a heavy blow
    this.hitStop = 0; // seconds the simulation holds still after a heavy blow
    this.groanT = 0;
    this.setQuality();
    this.actors = new Actors(this);
    this.traffic = new Traffic(this);
    this.monster = new Monster(this);
    this.tools = new Tools(this);
    this.tool = movesFor(this.progress.species)[0].id; // the selected move
    this.chunkMeshes = new Map();
    this.meshQueue = new MeshQueue(this);
    this.bodyMeshes = new Map();
    this.model = null;
    this.modelMeshes = [];
    this.pending = []; // explosions waiting for their short fuse
    this.recent = []; // recent explosions, to keep one tank from going off a hundred times
    this.gain = 0; this.gainPos = [0, 0, 0]; this.orbAcc = 0;
    this.doneQueue = [];
    this.activeSt = null; this.activeT = 0;
    this.growCool = 0;
    this.reserve = 0; // power earned but not yet on the bar (see PACE in game-power.js)
    this.worldDone = false; this.fireworks = 0;
    this.walked = 0; this.quietT = 0; // quietT: seconds without input, for the reminder demonstration
    this.frameMs = 16; this.governT = 0;
    this.perf = { sim: 0, mesh: 0, draw: 0, total: 0, worst: 0, lastWorst: 0, since: 0 }; // milliseconds per picture, see frame()
    this.hole = null; // the see-through window of the last picture, in screen pixels
    this.ghost = { pose: newPose(), t: 0, len: 1 };

    this.autopilot = new Autopilot(this, cleanSeed(params.get('seed')));
    this.idle = false; // idle mode: the game plays itself
    this.idleOff = 0;
    this.input.onActivity = () => { if (this.idle) this.setIdle(false); };

    this.hud = new Hud(this);
    this.minimap = new Minimap(this, this.hud.root);
    if (params.has('perf')) this.perfMeter = new PerfMeter(this, this.hud.root);
    this.loadWorld(params.get('world') ?? startWorld(this.progress)); // the creature's home world, unless the player picked another
    if (params.has('tool') && this.unlockedTools().includes(params.get('tool'))) this.tool = params.get('tool');
    if (params.has('fly')) this.fly = true;
    if (params.has('idle')) this.setIdle(true);
    this.hud.refreshTools();
    this.hud.requestHint('move');

    // If the browser takes the graphics context away (driver reset, memory pressure), start over cleanly.
    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.contextLost = true; });
    this.canvas.addEventListener('webglcontextrestored', () => location.reload());
    // In the background nothing runs and nothing sounds; the lost time is not caught up afterwards.
    document.addEventListener('visibilitychange', () => { this.audio.pause(document.hidden); this.last = performance.now(); this.acc = 0; });

    this.last = performance.now();
    this.acc = 0;
    this.tick = (t) => this.frame(t);
    requestAnimationFrame(this.tick);
  }

  setQuality() {
    // 0 = automatic: phones, tablets and small machines start two steps lower.
    const weak = matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency ?? 8) <= 4;
    // (autoDrop: steps taken down in this session because the device could not keep up, see govern.)
    this.detail = this.progress.settings.detail || Math.max(1, (weak ? 2 : 4) - (this.autoDrop ?? 0));
    this.quality = DETAIL[this.detail];
    this.debris = new Debris(this, this.quality.debris);
    this.fx = new Fx(this, this.quality.fx);
    this.fx.thin = this.quality.thin;
    this.fire.resize(this.quality.fire);
    this.renderer.pixelScale = this.quality.pixel;
    this.cubeBuf = new Float32Array((this.quality.debris + 1200) * 12);
    this.billBuf = new Float32Array((this.quality.fx + 200) * 9);
  }

  // World handling ---------------------------------------------------------------

  // Generates a world from its blueprint, here and now. Calling it again with the same world is "rebuild".
  // `which` is a world id (or its position in the list). travel() does the same in a worker.
  loadWorld(which, reroll = false) {
    const job = this.worldJob(which, reroll);
    this.freeWorld();
    const world = WORLDS[job.index].make(job.seed, this.quality, this.progress.mix);
    world.finalize();
    this.installWorld(world, job.index, job.seed);
  }

  // Which world and seed; the choice is remembered at once.
  worldJob(which, reroll) {
    const p = this.progress;
    let index = WORLDS.findIndex((w) => w.id === which);
    if (index < 0) index = clamp(Number(which) | 0, 0, WORLDS.length - 1);
    if (reroll || !p.mixSeed) p.mixSeed = (Math.random() * 1e9) | 0;
    p.world = WORLDS[index].id;
    saveProgress(p);
    return { index, seed: p.world === 'random' ? p.mixSeed : 1000 + (WORLDS[index].seed ?? index) * 77 };
  }

  // Lets go of the old world before the new one is built: the skyscraper city alone holds some 190 MB of voxels, and
  // both at once would double that for a moment. Nothing may draw or step until installWorld (see this.loading).
  freeWorld() {
    if (!this.world) return;
    for (const m of this.chunkMeshes.values()) this.renderer.deleteMesh(m);
    this.chunkMeshes.clear();
    this.world.chunks.fill(null);
    this.destruction.safe = this.destruction.seen = null;
  }

  // Builds a world in a worker (world-worker.js) while the page stays alive: the hourglass turns, the music plays on.
  // Without a worker (or if it fails) the world is built here instead.
  async loadWorldAway(which, reroll = false) {
    const job = this.worldJob(which, reroll);
    this.loading = true;
    try {
      this.freeWorld();
      let world = null;
      try { world = await this.buildAway(job); } catch { /* built here below */ }
      if (!world) { world = WORLDS[job.index].make(job.seed, this.quality, this.progress.mix); world.finalize(); }
      this.installWorld(world, job.index, job.seed);
      this.input.actions.length = 0; // clicks made on the hourglass
    } finally {
      this.last = performance.now(); this.acc = 0;
      this.loading = false; // (if anything above failed, fault() rebuilds the world: Hud.busy passes the error on)
    }
  }

  buildAway(job) {
    if (this.worldWorkerFailed) return Promise.resolve(null);
    if (!this.worldWorker) {
      try {
        // Under the page's Trusted Types policy a worker address must come from a named policy; this one can only ever
        // produce the address of the world worker.
        const url = new URL('./world-worker.js', import.meta.url), tt = globalThis.trustedTypes;
        this.worldPolicy ??= tt?.createPolicy ? tt.createPolicy('kaputtmacher-world', { createScriptURL: () => url.href }) : null;
        this.worldWorker = new Worker(this.worldPolicy ? this.worldPolicy.createScriptURL('') : url, { type: 'module' });
      } catch { this.worldWorkerFailed = true; return Promise.resolve(null); }
    }
    const id = (this.worldJobs = (this.worldJobs ?? 0) + 1), wk = this.worldWorker;
    return new Promise((resolve) => {
      wk.onmessage = (e) => {
        if (e.data.id !== id) return;
        if (!e.data.world) { console.error(e.data.error); resolve(null); return; }
        resolve(Object.setPrototypeOf(e.data.world, World.prototype)); // (a copy has no class: the methods come back here)
      };
      wk.onerror = (e) => { e.preventDefault?.(); this.worldWorkerFailed = true; wk.terminate(); this.worldWorker = null; resolve(null); };
      wk.postMessage({ id, index: job.index, seed: job.seed, quality: this.quality, mix: { ...this.progress.mix } });
    });
  }

  // Puts a freshly built (and finalized) world into play: every system starts over on it.
  installWorld(world, index, seed) {
    const p = this.progress;
    world.onDestroyed = (type, x, y, z, st) => this.onDestroyed(type, x, y, z, st);
    this.audio.muffle(world.under);
    this.music.setWorld(p.world);
    this.world = world;
    this.spans.reset(world);
    this.ramparts.reset(world);
    this.heave.reset();
    this.rng = makeRng(seed + 5);
    this.minimap.reset(world);
    // In a night world glass carries a marker that the shader turns into lit and dark windows (renderer.js, NIGHT).
    for (const t of [T.GLASS, T.GLASS_DARK, T.GLASS_GREEN, T.GLASS_BRONZE, T.GLASS_BLACK, T.GLASS_MIRROR]) TYPE_RGBA[t * 4 + 3] = world.night ? 1 : 0;
    TYPE_RGBA[T.ROADLINE * 4 + 3] = world.night ? 80 : 0; // road markings glow at night

    for (const m of this.chunkMeshes.values()) this.renderer.deleteMesh(m);
    this.chunkMeshes.clear();
    this.meshQueue.reset(); // after the colours of this world are set (just above)
    this.destruction.reset(world);
    this.bodies.clear();
    this.fire.clear();
    this.stability.reset();
    this.sweeper.clear();
    this.reactions.clear();
    this.frail.clear();
    this.heat = 0;
    this.wanted = 0; this.alarm = 0; this.lastGainT = -99; this.chainLoad = 0; this.doneTimes.length = 0;
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
    this.traffic.reset(p.settings.life);

    const c = this.cam;
    // On a planet only a cap around the focus is visible; its size does not depend on the size of the world.
    const cap = Math.min(this.quality.cap, world.sx / 2 - 2);
    c.wrap = world.wrap ? world.sx : 0;
    c.curv = world.wrap ? 0.6 / cap : 0;
    c.cap2 = world.wrap ? cap * cap : 1e12;
    c.fogDist = world.wrap ? cap * 2.2 : 1400;
    c.top = world.sky[0]; c.low = world.sky[1];
    // Open water (the harbour basin) is not made of voxels: it is a see-through sheet laid out in tiles of 16 x 16.
    this.waterTiles = [];
    for (const r of world.water?.rects ?? []) for (let z = r[1]; z < r[3]; z += 16) for (let x = r[0]; x < r[2]; x += 16) this.waterTiles.push(x, z);
    if (this.waterTiles.length && !this.waterMesh) { const slab = meshVolume(new Uint8Array(256).fill(T.WATER), 16, 1, 16); this.waterMesh = this.renderer.createMesh(slab.data, slab.quads); }
    this.hud.setStructures(world);
    this.hud.setWanted(0);
    this.hud.showNext(false);
    this.hud.refreshTools();
    this.hud.setPower(p.power / stageNeed(p.stage), p.stage);
    this.hud.titleCard(specOf(p.species).icon, WORLDS[index].icon); // who plays where: shows that both can be changed
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

  // Every creature has its own stage and power: switching creature switches to its progress.
  // travel: off to its home world (or the world picked for it); false when the caller loads a world itself.
  setSpecies(id, travel = true) {
    const p = this.progress, m = this.monster;
    switchCreature(p, id);
    saveProgress(p);
    this.reserve = 0; // what one creature earned does not flow into another
    m.stage = p.playStage;
    m.h = m.targetHeight();
    this.hud.setPower(p.power / stageNeed(p.stage), p.stage);
    this.tools.reset();
    this.tool = movesFor(id)[0].id; // every creature has its own moves
    this.buildMonster();
    this.hud.refreshTools();
    this.hud.refreshButtons();
    if (!travel || startWorld(p) === p.world) return false;
    this.travel(startWorld(p)); // to its home world, or to the world picked for it
    return true;
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
    else if (key === 'music') this.music.setVolume(s.music);
    else if (key === 'track') this.music.setChoice(s.track);
    else if (key === 'detail') { this.setQuality(); this.loadWorld(this.progress.world); }
    else if (key === 'life') { this.actors.populate(s.life ? Math.round((this.world.people ?? 0) * this.quality.people) : 0); this.traffic.reset(s.life); }
    else if (key === 'unlockAll') this.hud.refreshTools();
    else if (key === 'cascade' || key === 'minimap') this.hud.refreshButtons();
    else if (key === 'smoke' && !s.smoke) this.fire.spots = this.fire.spots.filter((x) => x.flames);
  }

  // Tools and actions --------------------------------------------------------------

  toggleMap() {
    const s = this.progress.settings;
    s.minimap = !s.minimap;
    saveProgress(this.progress);
    this.hud.refreshButtons();
  }

  get allUnlocked() { return this.progress.settings.unlockAll; }

  // Idle mode on or off. Any real input switches it off again (see input.onActivity).
  setIdle(on) {
    if (on === this.idle) return;
    this.idle = on;
    if (on) { this.autopilot.reset(); this.hud.close(); this.ownPlay = { species: this.progress.species, world: this.progress.world }; }
    else {
      this.idleOff = performance.now(); this.pitchOffset = 0; this.input.jumpHeld = false;
      // The show went through other creatures and their worlds (autopilot.nextWorld): the player gets back their own.
      const own = this.ownPlay;
      this.ownPlay = null;
      if (own && own.species !== this.progress.species) { this.setSpecies(own.species, false); this.travel(own.world); }
    }
    this.input.lastActivity = performance.now();
    this.hud.refreshButtons();
    // Keep the screen awake while the game is running as a backdrop, where the browser allows it.
    try {
      if (on) navigator.wakeLock?.request('screen').then((lock) => { this.wakeLock = lock; if (!this.idle) lock.release(); }, () => {});
      else { this.wakeLock?.release(); this.wakeLock = null; }
    } catch { /* not available: the screen follows the system's settings */ }
  }

  unlockedTools() {
    const stage = this.allUnlocked ? 99 : this.monster.stage;
    return movesFor(this.progress.species).filter((t) => t.stage <= stage).map((t) => t.id);
  }

  selectTool(id) {
    if (!this.unlockedTools().includes(id)) return;
    if (id !== this.tool) this.tools.stow(); // the helicopter's wrecking ball and load stay with the winch
    this.tool = id;
    this.hud.refreshTools();
  }

  doAction(a) {
    const list = this.unlockedTools();
    if (a === 'stomp') this.tools.stomp();
    else if (a === 'idle') { if (performance.now() - this.idleOff > 300) this.setIdle(!this.idle); } // the key press itself has just stopped it
    else if (a === 'roar') this.tools.roar();
    else if (a === 'map') this.toggleMap();
    else if (a === 'camera') {
      this.fly = !this.fly;
      if (this.fly) this.flyPos = [this.monster.x - Math.sin(this.camYaw) * 30, this.monster.y + this.monster.h * 1.5 + 25, this.monster.z - Math.cos(this.camYaw) * 30];
      this.hud.refreshButtons();
    } else if (a === 'tool+' || a === 'tool-') this.selectTool(list[(list.indexOf(this.tool) + (a === 'tool+' ? 1 : list.length - 1)) % list.length]);
    else if (a.startsWith('tool:')) { const id = list[Number(a.slice(5))]; if (id) this.selectTool(id); }
  }

  emit(name, data) {
    if (name === 'tool' || name === 'ability') this.hud.doneHint(data);
    if (data === 'light') this.hud.requestHint('heavy');
    if (data === 'heavy' && !airborne(this.progress.species)) this.hud.requestHint('stomp');
    this.quietT = 0;
  }

  shake(a) {
    if (this.progress.settings.shake) this.shakeAmt = Math.max(this.shakeAmt, a);
  }

  // Simulation callbacks -------------------------------------------------------------

  // Loads a world after showing an hourglass: building a planet takes a moment in which the page cannot draw.
  travel(which, reroll = false) {
    if (this.loading) return;
    this.hud.busy(() => this.loadWorldAway(which, reroll));
  }

  // The player picks a world in the world sheet: from now on this creature starts there.
  pickWorld(which, reroll = false) {
    this.progress.pick = which;
    saveProgress(this.progress);
    this.travel(which, reroll);
  }

  // One fixed simulation step -----------------------------------------------------

  step(dt) {
    const inp = this.input, m = this.monster;
    this.time += dt;
    this.growCool -= dt;
    this.flowPower(dt);

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
    } else if (motionOf(this.progress.species) === 'plane') {
      // The aircraft always flies where the camera looks: left/right turns, up/down climbs and dives.
      m.steer = inp.turn; m.pitchIn = inp.forward;
      if (m.homing) { // off the edge of an island: a gentle turn back towards the middle
        let d = Math.atan2(this.world.sx / 2 - m.x, this.world.sz / 2 - m.z) - this.camYaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        this.camYaw += clamp(d, -1, 1) * dt * 2.5;
      }
      m.heading = this.camYaw - inp.turn * dt * 1.9;
    } else if (motionOf(this.progress.species) === 'hover') {
      // The helicopter: forwards and back along the view, Q and E slide it sideways, the jump button (held) lifts it.
      // Left and right turn the view, as for every other creature.
      if (!this.tools.driven) {
        const f = inp.forward, s = inp.lift, cy = Math.cos(this.camYaw), sy = Math.sin(this.camYaw);
        mx = sy * f - cy * s; mz = cy * f + sy * s;
      }
      m.liftIn = inp.jumpHeld ? 1 : 0;
    } else if (m.cling) {
      // On a wall the same controls climb: forwards is up, backwards down, left and right along the wall.
      // The camera settles behind the creature, so that "forwards" keeps meaning "towards the wall".
      m.climbV = inp.forward; m.climbH = inp.turn;
      const d = Math.atan2(Math.sin(m.heading - this.camYaw), Math.cos(m.heading - this.camYaw));
      this.camYaw += d * Math.min(1, dt * 5);
    } else if (!this.tools.rooted) { // a planted move holds the feet still
      mx = Math.sin(this.camYaw) * inp.forward; mz = Math.cos(this.camYaw) * inp.forward;
    }
    if (!m.cling) this.camYaw -= inp.turn * dt * 1.9; // forward is (sin yaw, cos yaw), so turning right lowers the yaw
    const px = m.x, pz = m.z;
    m.jumpHeld = inp.jumpHeld;
    m.sprint = inp.sprint;
    m.update(dt, mx, mz, this.aim.x, this.aim.z);
    if (this.ramparts.limit(m, px, pz)) this.emote('anger'); // fortress Titan: no way over its walls, only through
    if (m.pose.emote && (m.pose.emoteT += dt) > EMOTE_TIME) m.pose.emote = null;
    const moved = Math.hypot(wrapDelta(m.x - px, this.cam.wrap), wrapDelta(m.z - pz, this.cam.wrap));
    this.walked += moved;
    if (!this.fly) this.stat('dist', moved);
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
    this.reactions.update(dt);
    this.frail.update();
    this.spans.update(dt);
    this.heave.update(dt);
    this.ramparts.update();
    this.chainLoad = Math.max(0, this.chainLoad - dt * 0.25);
    // Under the sea, bubbles rise all around.
    if (this.world.under && this.rng() < 0.6 * this.fx.thin) {
      const a = this.rng() * 6.283, d = this.rng() * (m.h * 3 + 50);
      this.fx.add(m.x + Math.cos(a) * d, m.y + this.rng() * m.h * 1.5, m.z + Math.sin(a) * d, 0, 6 + this.rng() * 6, 0, 0.5 + this.rng() * 0.8, 0.1, 3.5, 0.8, 0.95, 1, 0.5, 0, 0, 0);
    }
    this.destruction.flush();
    this.lastHit.pop = 0;
    this.debris.update(dt);
    this.fx.update(dt, m.x, m.y + m.h * 0.55, m.z, m.h * 0.3 + 2);
    // Power arrives: the creature lights up, and a spark carries it on to the ring that fills.
    if (this.fx.arrived) {
      this.absorb = Math.min(1, this.absorb + this.fx.arrived * 0.3);
      this.fx.arrived = 0;
      this.audio.absorb();
      if (this.project(m.x, m.y + m.h * 0.6, m.z, v3)) this.hud.gain(v3[0], v3[1]);
    }
    this.absorb = Math.max(0, this.absorb - dt * 1.6);
    this.traffic.update(dt);
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
      this.lastGainT = this.time;
      this.orbAcc += this.gain;
      for (let n = 0; this.orbAcc >= per && n < 4; n++) {
        this.orbAcc -= per;
        this.fx.orb(this.gainPos[0] + (this.rng() - 0.5) * 6, this.gainPos[1] + 1, this.gainPos[2] + (this.rng() - 0.5) * 6, this.orbSize());
        this.audio.orb();
      }
      this.orbAcc = Math.min(this.orbAcc, per * 4);
      this.heat = Math.min(1, this.heat + this.gain / (this.world.total * 0.012 + 400)); // how busy it is: brings the reporters
      this.addPower(this.gain);
      this.gain = 0;
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
    if (m.stage >= 8) { // aura: from stage 8 the creature glows, from stage 10 it burns
      const hot = m.stage >= 10;
      if (this.rng() < 0.3) this.fx.add(m.x + (this.rng() - 0.5) * m.h * 0.6, m.y + this.rng() * m.h, m.z + (this.rng() - 0.5) * m.h * 0.6, 0, m.h * 0.3, 0, m.h * 0.05, 0, 0.8, 1, 0.5, 0.1, 0.6, 1);
      if (hot && this.rng() < 0.5 * this.fx.thin) this.fire.flame(m.x + (this.rng() - 0.5) * m.h * 0.5, m.y + this.rng() * m.h * 0.9, m.z + (this.rng() - 0.5) * m.h * 0.5, m.h * 0.07 + 1);
      // Such heat leaves traces: scorched ground under the feet, and whatever can burn nearby catches fire.
      if ((this.auraT -= dt) <= 0) { this.auraT = 0.25; this.fire.heatSphere(m.x, m.y + m.h * 0.15, m.z, m.h * 0.3 + 2, hot ? 3.5 : 1.5, hot ? 10 : 5); }
    }

    // While a big piece is on its way down, the steel keeps groaning.
    if ((this.groanT -= dt) <= 0) {
      this.groanT = 0.5 + this.rng() * 0.7;
      for (const b of this.bodies.list) if (b.count > 2500 && Math.hypot(b.v[0], b.v[1], b.v[2]) > 3) { this.audio.groan(Math.min(1, b.count / 20000)); break; }
    }

    // After a long pause the current tool is demonstrated once more.
    this.quietT += dt;
    if (inp.forward || inp.turn || inp.fire || this.idle) this.quietT = 0;
    if (this.quietT > 25 && !this.hud.hintId) { this.quietT = 0; this.hud.requestHint(this.progress.seen.move ? 'light' : 'move', true); }
  }

  // Camera and picking -------------------------------------------------------------

  // Frame -------------------------------------------------------------------------------

  // One picture. Whatever goes wrong inside, the next one is always asked for: a single error must not freeze the
  // game for good (in idle mode it may run for hours with nobody watching). Repeated errors rebuild the world.
  frame(now) {
    try {
      if (!this.contextLost && !this.loading) this.frameBody(now); // (while a world is being built there is none to draw)
    } catch (err) {
      this.fault(err);
    }
    requestAnimationFrame(this.tick);
  }

  fault(err) {
    console.error(err);
    this.lastError = String(err?.stack ?? err).slice(0, 2000);
    this.faultCount = (this.faultCount ?? 0) + 1;
    const now = performance.now();
    this.faults = (this.faults ?? []).filter((t) => now - t < 10000);
    this.faults.push(now);
    if (this.faults.length < 3) return;
    this.faults.length = 0;
    try {
      this.hud.close();
      this.loading = false;
      if (this.idle) this.autopilot.nextWorld(); else this.loadWorld(this.progress.world);
    } catch (again) { console.error(again); }
  }

  frameBody(now) {
    const t0 = performance.now(), pf = this.perf;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.frameMs += (dt * 1000 - this.frameMs) * 0.05;
    this.input.poll(dt);
    for (const a of this.input.actions.splice(0)) if (!this.paused) this.doAction(a);
    if (!this.idle && this.progress.settings.autoIdle && !this.paused && now - this.input.lastActivity > 120000) this.setIdle(true);
    if (this.idle && !this.paused) this.autopilot.update(dt);
    this.updateCamera(dt);
    this.pick();
    const t1 = performance.now();
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
    const t2 = performance.now();
    this.audio.fire(this.fire.level());
    this.audio.heli(this.actors.heliLevel());
    this.audio.hiss(this.reactions.level ?? 0);
    this.audio.siren(this.actors.siren * (this.idle ? 0.35 : 1));
    // The music follows the action: how much is breaking right now, and how alarmed the world is.
    this.music.update(dt, this.paused ? 0.05 : clamp(0.1 + this.heat * 0.55 + (this.alarm / 5) * 0.45, 0, 1), clamp((this.time - this.lastGainT < 0.3 ? 0.5 : 0) + this.heat * 0.5, 0, 1), this.heat, this.alarm, this.paused);
    if (!this.paused && (this.checkT += dt) >= 0.5) { this.checkStats(this.checkT); this.checkT = 0; }
    this.govern(dt);
    const t3 = performance.now();
    this.remesh();
    const t4 = performance.now();
    this.render();
    const t5 = performance.now();
    this.hud.update();
    this.minimap.update(dt);
    this.perfMeter?.update(dt);
    // Where the time of this picture went (shown with ?perf=1, read by the test pages). Exponential averages, plus
    // the worst picture of the last second.
    const k = 0.05, total = performance.now() - t0;
    pf.sim += (t2 - t1 - pf.sim) * k; pf.mesh += (t4 - t3 - pf.mesh) * k; pf.draw += (t5 - t4 - pf.draw) * k; pf.total += (total - pf.total) * k;
    pf.worst = Math.max(pf.worst, total);
    if (now - pf.since > 1000) { pf.lastWorst = pf.worst; pf.worst = 0; pf.since = now; }
  }

  // Keeps the frame rate up by trimming effects, never the destruction itself.
  govern(dt) {
    if ((this.governT += dt) < 2) return;
    this.governT = 0;
    // With the detail chosen automatically, a device that stays below about 35 pictures per second in the first
    // forty seconds gets one level less (once per session, nothing is saved): smaller planet, smaller visible cap.
    const s = this.progress.settings;
    if (!s.detail && !this.autoDrop && this.detail > 1 && this.time > 8 && this.time < 40 && this.frameMs > 28 && !this.idle) {
      this.autoDrop = 1;
      this.setQuality();
      this.travel(this.progress.world);
      return;
    }
    const d = this.debris, f = this.fx, r = this.renderer;
    if (this.frameMs > 26) {
      d.limit = Math.max(400, d.limit * 0.8) | 0; f.limit = Math.max(200, f.limit * 0.8) | 0;
      r.pixelScale = Math.max(0.55, r.pixelScale * 0.9);
    } else if (this.frameMs < 18) {
      d.limit = Math.min(d.max, d.limit * 1.15) | 0; f.limit = Math.min(f.max, f.limit * 1.15) | 0;
      r.pixelScale = Math.min(this.quality.pixel, r.pixelScale * 1.05);
    }
  }

}

mixin(Game, GameView, GameEvents, GamePower);

try {
  window.game = new Game();
} catch (err) {
  // No WebGL2: show a plain sad face instead of a blank page.
  document.getElementById('hud').textContent = '😢';
  document.getElementById('hud').style.cssText = 'display:grid;place-items:center;font-size:120px';
  console.error(err);
}
