// Development only: starts the test server, plays a short scenario in every world and a few longer ones,
// and reports script errors. Screenshots land in tools/out/.
// Three browsers run side by side (JOBS=n changes that); the comparison runs and the measurements come last, one at a time.
// usage: node tools/smoke.mjs [quick]      JOBS=1 one browser at a time, ONLY=city,neon just those runs
import { spawn } from 'node:child_process';

const dir = decodeURIComponent(new URL('.', import.meta.url).pathname), PORT = '8767';
const server = spawn('node', [dir + 'serve.mjs'], { env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const WORLDS = ['site', 'skyline', 'blocks', 'village', 'funfair', 'city', 'factory', 'harbour', 'giants', 'castle', 'winter', 'airport', 'reef', 'spaceport', 'primeval', 'babel', 'neon', 'fortress', 'skyyard', 'random'];
// [name, query, scenario, milliseconds]
const runs = WORLDS.map((w) => [w, `world=${w}&stage=4`, 'punch', 7000]);
if (process.argv[2] !== 'quick') runs.push(
  ['idle-city', 'world=city&stage=6&idle=1&run=40000', 'units', 43000],
  ['idle-jet', 'world=skyline&stage=5&species=jet&idle=1&run=25000', 'units', 28000],
  ['traffic', 'world=city&stage=3&run=15000', 'traffic', 18000],
  ['all-moves', 'world=village&stage=9&unlock=1', 'allmoves', 28000],
  ['digger-moves', 'world=site&stage=8&species=digger&unlock=1', 'allmoves', 28000],
  ['idle-digger', 'world=site&stage=4&species=digger&idle=1&run=30000', 'units', 33000],
  ['chopper-moves', 'world=harbour&stage=8&species=chopper&unlock=1', 'allmoves', 28000],
  ['idle-chopper', 'world=harbour&stage=4&species=chopper&idle=1&run=30000', 'units', 33000],
  ['tentacle-moves', 'world=reef&stage=8&species=tentacle&unlock=1', 'allmoves', 28000],
  ['idle-tentacle', 'world=city&stage=4&species=tentacle&idle=1&run=30000', 'units', 33000],
  ['tentacle-dive', 'world=reef&stage=3&species=tentacle&do=dive&at=2500', 'newmoves', 8000],
  ['kraken', 'world=city&stage=7&species=tentacle&tool=deep&heavy=1&at=3500', 'newmoves', 9000],
  ['wrecking-ball', 'world=city&stage=5&species=chopper&tool=winch&heavy=1&at=1200&go=2500', 'newmoves', 9000],
  ['span-rope', 'world=primeval&stage=3&style=rope&mode=cut&run=7000', 'span', 12000],
  ['span-pier', 'world=neon&stage=1&style=highway&mode=pier&run=5000', 'span', 10000],
  ['span-arch', 'world=babel&stage=1&style=aqueduct&mode=cut&run=5000', 'span', 10000],
  ['volcano', 'world=primeval&stage=2&cut=0&erupt=6000', 'volcano', 12000],
  ['fortress-shield', 'world=fortress&stage=4&mode=jump', 'fortress', 14000],
  ['fortress-gun', 'world=fortress&stage=2&mode=gun', 'fortress', 9000],
  ['floaters', 'world=site&kind=shell&n=2&cut=0.1', 'floaters', 14000],
  ['phone', 'world=city&stage=4', 'mobile', 5000, '740', '360'],
  ['climb-slant', 'world=skyline&stage=4&yaw=0.6', 'climbslant', 8500],
  ['buttons-laptop', 'world=village', 'buttons', 11000],
  ['buttons-phone', 'world=village', 'buttons', 11000, '390', '844'],
  ['buttons-narrow', 'world=village', 'buttons', 11000, '320', '568'],
  ['lowest-detail', 'world=skyline&stage=6&idle=1&quality=1&run=20000', 'units', 23000],
);
// The comparison run must come out the same twice (scenarios/measure.js); the measurements must stay under their limits
// (milliseconds of computing per picture on average, share of pictures over 25 ms). The limits are those of the
// development machine (Apple M3 Pro) with some room: a slower machine may fail them without anything being wrong.
const serial = [
  ['hash-a', 'world=village&stage=4&quality=2', 'hash', 20000],
  ['hash-b', 'world=village&stage=4&quality=2', 'hash', 20000],
  ['hash-auto-a', 'world=city&stage=5&quality=2&seed=7&auto=1', 'hash', 30000],
  ['hash-auto-b', 'world=city&stage=5&quality=2&seed=7&auto=1', 'hash', 30000],
];
if (process.argv[2] !== 'quick') serial.push(
  ['perf-skyline', 'world=skyline&stage=6&idle=1&quality=4&seed=3&warm=8000&run=25000', 'perf', 36000, '1280', '720', { mean: 6, share: 0.01 }],
  ['perf-neon', 'world=neon&stage=7&species=robot&idle=1&quality=4&seed=3&warm=8000&run=25000', 'perf', 36000, '1280', '720', { mean: 9, share: 0.02 }],
);

// Every run gets a debugging port (and with it a browser profile) of its own: a browser that has just been killed may
// still hold the previous one for a moment, and a new browser that meets it never answers. The ports go round in a
// circle of 60, so that the profiles in the temp folder do not pile up.
let runs1 = 0;
const run1 = (name, query, scenario, ms, w = '1280', h = '720', port = 9400 + (runs1++ % 60)) => new Promise((done) => {
  const child = spawn('node', [dir + 'browser.mjs', name, query, scenario, String(ms), w, h], { env: { ...process.env, PORT, CDP_PORT: String(port) } });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.on('close', () => done(out));
});
// Errors the game caught itself (Game.fault) arrive as console errors.
const broken = (out) => /EXC:|NO GAME|TIMEOUT|no target|LOG error|^error: /m.test(out) || !out.includes('"stage"');
const extra = (out) => { try { return JSON.parse(out.split('\n').find((l) => l.startsWith('{'))).extra ?? {}; } catch { return {}; } };
const report = (name, bad, out, note = '') => console.log((bad ? 'FAIL ' : 'ok   ') + name + note + (bad ? '\n' + out.split('\n').filter((l) => !l.startsWith('{')).join('\n') : ''));

// ONLY=name,name runs just those (the parallel ones and the serial ones alike).
const only = process.env.ONLY?.split(',');
if (only) { for (const list of [runs, serial]) list.splice(0, list.length, ...list.filter((r) => only.includes(r[0]))); }
let failed = 0;
const queue = runs.slice(), jobs = Number(process.env.JOBS ?? 3);
await Promise.all(Array.from({ length: jobs }, async (_, k) => {
  for (let r; (r = queue.shift());) {
    const out = await run1(...r.slice(0, 6)), bad = broken(out);
    if (bad) failed++;
    report(r[0], bad, out);
  }
}));
const hashes = {};
for (const [name, query, scenario, ms, w, h, limit] of serial) {
  const out = await run1(name, query, scenario, ms, w, h), x = extra(out);
  let bad = broken(out), note = '';
  if (scenario.startsWith('hash')) {
    const key = name.replace(/-[ab]$/, '');
    note = ` ${x.hash} (${x.ms} ms, ${x.destroyed} voxels)`;
    if (!x.hash || !x.destroyed) bad = true;
    if (hashes[key] && hashes[key] !== x.hash) { bad = true; note += ` differs from ${hashes[key]}: the simulation is not reproducible`; }
    hashes[key] ??= x.hash;
  }
  if (limit) {
    note = ` ${x.cpu?.mean} ms per picture, ${(100 * (x.over25share ?? 1)).toFixed(1)} % over 25 ms (limits ${limit.mean} ms, ${100 * limit.share} %)`;
    if (!(x.cpu?.mean <= limit.mean) || !(x.over25share <= limit.share)) bad = true;
  }
  if (bad) failed++;
  report(name, bad, out, note);
}
server.kill();
console.log(failed ? `${failed} run(s) FAILED` : 'all runs passed');
process.exit(failed ? 1 : 0);
