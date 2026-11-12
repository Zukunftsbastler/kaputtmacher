// Development only (never deployed). Scenarios of tools/web/test.js: measuring.
//
// hash: the comparison run. The game's own loop is stopped (test.js), the world is rebuilt from its seed and the
//   simulation is stepped by hand with scripted input (or, with ?auto=1, with the autopilot and its seed). At the end
//   a checksum over every voxel and the state of creature, fragments and loose cubes is written to __extra.hash.
//   The same address must always give the same checksum: a refactoring that changes nothing keeps it.
//   ?steps= number of simulation steps (default 2400 = 40 seconds of game time).
// perf: plays (usually in idle mode) and measures every picture: where the time goes per system, how many pictures
//   take longer than 25 ms, what is still waiting to be meshed. ?warm= ms before measuring, ?run= ms measured.
// soak: the long run. Idle mode for ?run= ms, a sample every ?every= ms (memory, picture time, meshes, fragments,
//   timers, graphics memory); ?worldtime= seconds in a world before the autopilot moves on. tools/soak.mjs reads it.
// still: waits until everything in view is meshed, then holds the picture without the interface (for comparing
//   pictures before and after a change to meshing or drawing). ?yaw= turns the camera, ?pitch= tilts it.
export default async function ({ g, sc, wait }) {
  const q = new URLSearchParams(location.search);
  // Chunks inside the visible cap that still wait for their mesh (on a planet those outside it wait for ever).
  const pending = () => {
    if (g.meshQueue) return g.meshQueue.pending;
    const c = g.cam, w = g.world, R = Math.sqrt(c.cap2) + 40, wrap = (d) => (c.wrap ? ((((d % c.wrap) + c.wrap * 1.5) % c.wrap) - c.wrap / 2) : d);
    let n = 0;
    for (const ci of w.dirty) { const dx = wrap((ci % w.ncx) * 32 + 16 - c.focusX), dz = wrap((Math.floor(ci / w.ncx) % w.ncz) * 32 + 16 - c.focusZ); if (dx * dx + dz * dz <= R * R) n++; }
    return n;
  };

  if (sc === 'hash') {
    const STEP = 1 / 60, N = Number(q.get('steps') ?? 2400), auto = q.has('auto'), inp = g.input, m = g.monster, p = g.progress;
    // Start from scratch: the world from its seed, power and time at zero.
    g.loadWorld(p.world);
    g.time = 0; g.reserve = 0; g.growCool = 0; p.power = 0; g.orbAcc = 0; g.absorb = 0;
    if (auto) g.setIdle(true);
    const t0 = performance.now();
    for (let i = 0; i < N; i++) {
      if (auto) { g.autopilot.update(STEP); g.updateCamera(STEP); g.pick(); }
      else {
        // Walk for five seconds, stand for five, turn now and then; hit what is ahead, quick and strong in turn; jump;
        // another move every five seconds.
        inp.forward = i % 600 < 300 ? 1 : 0; inp.turn = i % 900 < 90 ? 0.6 : 0; inp.sprint = i % 1200 > 900; inp.jumpHeld = i % 400 < 20;
        if (i % 400 === 0) g.doAction('stomp');
        if (i % 300 === 0) { const list = g.unlockedTools(); g.selectTool(list[(i / 300) % list.length]); } // every move gets its turn
        const d = m.h * 0.9 + 3;
        g.aim.x = m.x + Math.sin(m.heading) * d; g.aim.y = m.y + m.h * 0.5; g.aim.z = m.z + Math.cos(m.heading) * d; g.aim.hit = true; g.aim.lock = null;
        if (i % 120 === 60) inp.heavyPressed = true; else if (i % 25 === 0) inp.firePressed = true;
      }
      g.step(STEP);
    }
    const ms = performance.now() - t0;
    // FNV-1a over the whole grid (single-value chunks count as their value) and over the moving things.
    let h = 0x811c9dc5;
    const mix = (v) => { h = Math.imul(h ^ (v & 255), 16777619); h = Math.imul(h ^ ((v >>> 8) & 255), 16777619); h = Math.imul(h ^ ((v >>> 16) & 255), 16777619); h = Math.imul(h ^ (v >>> 24), 16777619); };
    const w = g.world;
    for (let ci = 0; ci < w.chunks.length; ci++) {
      const c = w.chunks[ci];
      if (!c) { mix(w.uniform[ci] | 0x100); continue; }
      for (let i = 0; i < c.length; i += 4) mix(c[i] | (c[i + 1] << 8) | (c[i + 2] << 16) | (c[i + 3] << 24));
    }
    const round = (v) => Math.round(v * 64);
    for (const v of [m.x, m.y, m.z, m.heading, w.remaining, p.stage, p.power, g.bodies.list.length, g.debris.n]) mix(round(v));
    for (const b of g.bodies.list) for (const v of [b.count, b.pos[0], b.pos[1], b.pos[2]]) mix(round(v));
    for (let i = 0; i < g.debris.n; i++) mix(round(g.debris.px[i] + g.debris.py[i] + g.debris.pz[i]));
    window.__extra = { hash: (h >>> 0).toString(16), steps: N, auto, seed: g.autopilot.seed, ms: Math.round(ms), destroyed: w.total - w.remaining, bodies: g.bodies.list.length, debris: g.debris.n, monster: [m.x, m.y, m.z].map((v) => +v.toFixed(2)), stage: p.stage };
    g.paused = true;
  }

  if (sc === 'soak') {
    const T = Number(q.get('run') ?? 600000), every = Number(q.get('every') ?? 30000), out = { samples: [], worlds: [g.progress.world] };
    window.__extra = out;
    if (q.has('worldtime')) g.autopilot.worldTime = Number(q.get('worldtime'));
    if (!g.idle) g.setIdle(true);
    const t0 = performance.now();
    let lastVox = -1, lastWorld = g.progress.world, quiet = 0;
    out.maxQuietS = 0;
    while (performance.now() - t0 < T) {
      await wait(every);
      const w = g.world, vox = w.total - w.remaining;
      if (g.progress.world !== lastWorld) { lastWorld = g.progress.world; out.worlds.push(lastWorld); lastVox = -1; }
      quiet = vox === lastVox ? quiet + every : 0;
      out.maxQuietS = Math.max(out.maxQuietS, quiet / 1000);
      lastVox = vox;
      out.samples.push({ s: Math.round((performance.now() - t0) / 1000), world: lastWorld, heap: Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6), gpu: Math.round(g.renderer.meshBytes / 1e6),
        ms: +g.perf.total.toFixed(1), worst: Math.round(g.perf.lastWorst), meshes: g.chunkMeshes.size, bodies: g.bodies.list.length, timers: g.tools.timers.length, debris: g.debris.n, queue: pending() });
    }
    Object.assign(out, { faults: g.faultCount ?? 0, lastError: g.lastError ?? null, idle: g.idle });
  }

  if (sc === 'still') {
    if (q.has('yaw')) g.camYaw = Number(q.get('yaw'));
    if (q.has('pitch')) g.pitchOffset = Number(q.get('pitch'));
    g.hud.hintBox?.remove(); g.hud.hintId = null;
    document.getElementById('hud').style.visibility = 'hidden';
    await wait(300);
    g.paused = true;
    for (let i = 0; i < 100 && pending() > 0; i++) await wait(100);
    await wait(500);
    window.__extra = { queue: pending(), meshes: g.chunkMeshes.size };
  }

  if (sc === 'perf') {
    await wait(Number(q.get('warm') ?? 6000));
    const T = {}, C = {};
    const wrap = (obj, name, label) => {
      const f = obj?.[name];
      if (typeof f !== 'function') return;
      obj[name] = function (...a) { const t = performance.now(); try { return f.apply(this, a); } finally { T[label] = (T[label] ?? 0) + performance.now() - t; C[label] = (C[label] ?? 0) + 1; } };
    };
    for (const [o, n, l] of [[g, 'step', 'step'], [g, 'remesh', 'remesh'], [g, 'render', 'render'], [g, 'pick', 'pick'], [g.hud, 'update', 'hud'], [g.minimap, 'update', 'minimap'], [g.autopilot, 'update', 'autopilot'],
      [g.monster, 'update', 's.monster'], [g.tools, 'update', 's.tools'], [g.bodies, 'update', 's.bodies'], [g.fire, 'update', 's.fire'], [g.stability, 'update', 's.stability'], [g.frail, 'update', 's.frail'], [g.spans, 'update', 's.spans'],
      [g.destruction, 'flush', 's.flush'], [g.debris, 'update', 's.debris'], [g.fx, 'update', 's.fx'], [g.traffic, 'update', 's.traffic'], [g.actors, 'update', 's.actors'], [g.renderer, 'createMesh', 'createMesh']]) wrap(o, n, l);
    const frames = [], cpu = [], worst = [];
    let last = 0;
    const of = g.frame;
    g.frame = function (now) {
      if (last) frames.push(now - last);
      last = now;
      const snap = { ...T }, t = performance.now();
      of.call(this, now);
      const c = performance.now() - t;
      cpu.push(c);
      if (c > 25) { const d = {}; for (const k in T) { const v = T[k] - (snap[k] ?? 0); if (v > 1.5) d[k] = +v.toFixed(1); } worst.push({ ms: +c.toFixed(1), d }); }
    };
    const heap0 = performance.memory?.usedJSHeapSize ?? 0;
    await wait(Number(q.get('run') ?? 25000));
    g.frame = of;
    const pc = (a, f) => { const s = a.slice().sort((x, y) => x - y); return +(s[Math.min(s.length - 1, Math.floor(s.length * f))] ?? 0).toFixed(1); };
    const n = cpu.length, per = {};
    for (const k of Object.keys(T).sort((a, b) => T[b] - T[a])) per[k] = +(T[k] / n).toFixed(2);
    let quads = 0;
    for (const mesh of g.chunkMeshes.values()) quads += mesh.quads;
    window.__extra = {
      frames: n, interval: { p50: pc(frames, 0.5), p95: pc(frames, 0.95), p99: pc(frames, 0.99), max: pc(frames, 1) },
      cpu: { mean: +(cpu.reduce((a, b) => a + b, 0) / n).toFixed(2), p95: pc(cpu, 0.95), p99: pc(cpu, 0.99), max: pc(cpu, 1) },
      over25: worst.length, over25share: +(worst.length / n).toFixed(3), worst: worst.sort((a, b) => b.ms - a.ms).slice(0, 4), msPerFrame: per,
      queue: pending(), meshes: g.chunkMeshes.size, quadsM: +(quads / 1e6).toFixed(2), gpuMB: +(g.renderer.meshBytes / 1e6).toFixed(1),
      heapMB: [Math.round(heap0 / 1e6), Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6)], limits: [g.debris.limit, g.fx.limit, +g.renderer.pixelScale.toFixed(2)],
    };
  }
}
