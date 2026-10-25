// Development only: starts the test server, plays a short scenario in every world and a few longer ones,
// and reports script errors. Screenshots land in tools/out/.
// usage: node tools/smoke.mjs [quick]
import { spawn, spawnSync } from 'node:child_process';

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
  ['lowest-detail', 'world=skyline&stage=6&idle=1&quality=1&run=20000', 'units', 23000],
);
let failed = 0;
for (const [name, query, scenario, ms, w = '1280', h = '720'] of runs) {
  const out = spawnSync('node', [dir + 'browser.mjs', name, query, scenario, String(ms), w, h], { env: { ...process.env, PORT }, encoding: 'utf8' }).stdout ?? '';
  const bad = /EXC:|NO GAME|TIMEOUT|no target|LOG error/.test(out) || !out.includes('"stage"');
  if (bad) failed++;
  console.log((bad ? 'FAIL ' : 'ok   ') + name + (bad ? '\n' + out.split('\n').filter((l) => !l.startsWith('{')).join('\n') : ''));
}
server.kill();
console.log(failed ? `${failed} run(s) FAILED` : 'all runs passed');
process.exit(failed ? 1 : 0);
