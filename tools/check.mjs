// Development only: checks that need no browser.
// usage: node --experimental-default-type=module tools/check.mjs
//   1. Hostile and damaged save data must come out of the loader as a valid progress object.
//   2. The achievement list must be consistent (unique ids, known counters, one per world).
//   3. Every world must generate without an error, and almost nothing in it may float (tools/floating.mjs):
//      what is not joined face to face with the ground hangs in the air once its surroundings are destroyed.

let failed = 0;
const fail = (msg) => { failed++; console.log('FAIL ' + msg); };

const cases = {
  garbage: 'not json {',
  nulls: 'null',
  array: '[1,2,3]',
  types: JSON.stringify({ stage: 'abc', playStage: 1e99, power: -5, world: '<img src=x onerror=alert(1)>', species: { a: 1 }, completed: 'x', stickers: ['<b>x</b>', 'a'.repeat(999), 7, '🏠', '🏠'], seen: { move: 'yes' }, settings: { volume: 99, detail: 'x', shake: 'no' }, stats: { vox: 'many', evil: 1 }, achieved: ['nope', 7], log: [{ c: '<i>', s: -3, t: 'x' }, 5], creatures: { dino: { stage: 999 }, hacker: { stage: 5 } } }),
  proto: '{"__proto__":{"polluted":true},"stage":5,"seen":{"__proto__":{"polluted":true}},"stats":{"__proto__":{"polluted":true}}}',
  old: JSON.stringify({ stage: 7, playStage: 3, power: 1234.5, world: 'city', species: 'jet', completed: ['blocks', 'nope', 'city'], settings: { quality: 'low', volume: 0.3 } }),
};
const { loadProgress } = await import('../public/src/progress.js');
const { SPECIES } = await import('../public/src/monster.js');
const { WORLDS } = await import('../public/src/worldgen.js');
const { ACHIEVEMENTS, STATS } = await import('../public/src/achievements.js');
const { floating } = await import('./floating.mjs');

for (const [name, raw] of Object.entries(cases)) {
  globalThis.localStorage = { getItem: () => raw };
  const p = loadProgress(), text = JSON.stringify(p);
  if (!(p.stage >= 1 && p.stage <= 30 && p.playStage <= p.stage && p.power >= 0)) fail(name + ': stage/power out of range');
  if (!WORLDS.some((w) => w.id === p.world) || !SPECIES.some((s) => s.id === p.species)) fail(name + ': unknown world or species');
  if (Object.keys(p.creatures).length !== SPECIES.length) fail(name + ': creatures');
  if (Object.keys(p.stats).some((k) => !STATS.includes(k)) || Object.values(p.stats).some((v) => typeof v !== 'number')) fail(name + ': stats');
  if (/[<>]/.test(text) || ({}).polluted) fail(name + ': markup or prototype pollution survived');
}
globalThis.localStorage = { getItem: () => cases.old };
const old = loadProgress();
if (old.species !== 'jet' || old.creatures.jet.stage !== 7 || old.creatures.dino.stage !== 1 || old.settings.detail !== 2) fail('old save is not migrated as expected');

const derived = ['stage', 'stageAll', 'worlds', 'stickers', 'achieved'];
if (new Set(ACHIEVEMENTS.map((a) => a.id)).size !== ACHIEVEMENTS.length) fail('achievement ids are not unique');
if (new Set(ACHIEVEMENTS.map((a) => a.name)).size !== ACHIEVEMENTS.length) fail('achievement names are not unique');
for (const a of ACHIEVEMENTS) if (!STATS.includes(a.stat) && !derived.includes(a.stat) && !/^(stage|world):/.test(a.stat)) fail('unknown counter ' + a.stat);
for (const w of WORLDS) if (!ACHIEVEMENTS.some((a) => a.id === 'world:' + w.id)) fail('no achievement for world ' + w.id);

const quality = { planet: 512, tall: 512 }, mix = {};
for (const [i, w] of WORLDS.entries()) {
  try {
    const t0 = performance.now(), world = w.make(1000 + (w.seed ?? i) * 77, quality, mix);
    world.finalize();
    const major = world.structures.filter((s) => s.major && s.total > 0).length;
    if (!major || !world.spawn) fail(w.id + ': no buildings or no starting point');
    const ms = performance.now() - t0, loose = floating(world);
    if (loose.n > 100) fail(w.id + ': ' + loose.n + ' floating voxels: ' + Object.entries(loose.by).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => k + '=' + v).join(' '));
    console.log(w.id.padEnd(9), String(major).padStart(4), 'buildings', String(world.total).padStart(9), 'voxels', ms.toFixed(0).padStart(5), 'ms', String(loose.n).padStart(4), 'floating', world.roads ? 'streets' : '');
  } catch (e) { fail(w.id + ': ' + e.message); }
}
// 4. The fallback music must schedule sensible notes at every intensity and in every world (run against a stand-in for Web Audio).
{
  const { ClassicMusic: Music } = await import('../public/src/music-classic.js');
  let now = 0, notes = 0, bad = 0, lo = 1e9, hi = 0;
  const param = () => ({ value: 0, setValueAtTime(v) { if (!Number.isFinite(v) || v < 0) bad++; }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime(v) { if (!(v > 0)) bad++; }, setTargetAtTime() {} });
  const node = () => ({ connect(n) { return n; }, start() {}, stop() {}, frequency: param(), gain: param(), Q: param(), type: '' });
  const ctx = { get currentTime() { return now; }, state: 'running', createGain: node, createBiquadFilter: node, createBufferSource: node,
    createOscillator() { const o = node(); o.frequency.setValueAtTime = (v) => { notes++; lo = Math.min(lo, v); hi = Math.max(hi, v); if (!Number.isFinite(v)) bad++; }; return o; } };
  const music = new Music({ ctx, master: node(), noiseBuf: {} });
  for (const w of WORLDS) {
    music.setWorld(w.id);
    for (let i = 0; i < 60 * 40; i++) { now += 1 / 60; music.update(1 / 60, (i / 2400) ** 0.7, 0); } // 40 s, from calm to full
  }
  if (bad || notes < 5000 || lo < 20 || hi > 5000) fail(`music: ${notes} notes, ${bad} bad values, ${lo.toFixed(0)}..${hi.toFixed(0)} Hz`);
  console.log(`music: ${notes} notes scheduled, ${lo.toFixed(0)} to ${hi.toFixed(0)} Hz`);
}
// 5. The rendered music: its description must be valid and compose (the suite plans all states, bridges and
//    files without rendering them), the alarm level must map to states without fluttering, and without a
//    worker (as here in Node) the game must fall back to the hand-written music.
{
  const { TRACKS, scoreFor, trackFor, RENDER_RATE, stateFor } = await import('../public/src/music-score.js');
  const { planStems } = await import('../public/src/vendor/musik-generator/stems/render-stems.js');
  let most = 0;
  for (const t of TRACKS) {
    try {
      const { manifest, jobs } = planStems(scoreFor(t.id), { sampleRate: RENDER_RATE });
      const states = Object.keys(manifest.states);
      if (states.join() !== 'stroll,chase,mayhem' || jobs[0].state !== 'stroll') fail(`music ${t.id}: unexpected states ` + states);
      const tempo = states.map((s) => manifest.segments[manifest.states[s].segments[0]].bpm);
      if (!(tempo[0] < tempo[1] && tempo[1] < tempo[2])) fail(`music ${t.id}: the states must get faster: ` + tempo);
      const mb = manifest.ram.totalBytes / 1048576;
      most = Math.max(most, mb);
      if (mb > 90) fail(`music ${t.id}: ${mb.toFixed(0)} MB decoded is too much`);
    } catch (e) { fail(`music ${t.id}: ` + e.message); }
  }
  if (new Set(TRACKS.map((t) => JSON.stringify(t.hook))).size !== TRACKS.length) fail('music: two pieces share a hook');
  for (const w of WORLDS) if (!TRACKS.some((t) => t.id === trackFor(w.id))) fail('music: no piece for ' + w.id);
  console.log(`rendered music: ${TRACKS.length} pieces, each 3 states, at most ${most.toFixed(0)} MB decoded`);
  let cur = 'stroll', changes = 0;
  for (let i = 0; i < 400; i++) { const next = stateFor(0.95 + 0.1 * Math.sin(i), cur); if (next !== cur) changes++; cur = next; }
  if (changes > 1 || stateFor(0, 'mayhem') !== 'stroll' || stateFor(3.2, 'stroll') !== 'mayhem' || stateFor(2.7, 'mayhem') !== 'mayhem') fail('music: alarm-to-state mapping');
  const { Music } = await import('../public/src/music.js');
  const music = new Music({ ctx: null });
  music.setWorld('skyline');
  if (music.mode !== 'classic') fail('music: no fallback without a worker');
}
console.log(`${ACHIEVEMENTS.length} achievements, ${WORLDS.length} worlds`);
console.log(failed ? `${failed} check(s) FAILED` : 'all checks passed');
process.exit(failed ? 1 : 0);
