// Development only: checks that need no browser.
// usage: node --experimental-default-type=module tools/check.mjs
//   1. Hostile and damaged save data must come out of the loader as a valid progress object.
//   2. The achievement list must be consistent (unique ids, known counters, one per world).
//   3. Every world must generate without an error.

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
    const t0 = performance.now(), world = w.make(1000 + i * 77, quality, mix);
    world.finalize();
    const major = world.structures.filter((s) => s.major && s.total > 0).length;
    if (!major || !world.spawn) fail(w.id + ': no buildings or no starting point');
    console.log(w.id.padEnd(9), String(major).padStart(4), 'buildings', String(world.total).padStart(9), 'voxels', (performance.now() - t0).toFixed(0).padStart(5), 'ms', world.roads ? 'streets' : '');
  } catch (e) { fail(w.id + ': ' + e.message); }
}
console.log(`${ACHIEVEMENTS.length} achievements, ${WORLDS.length} worlds`);
console.log(failed ? `${failed} check(s) FAILED` : 'all checks passed');
process.exit(failed ? 1 : 0);
