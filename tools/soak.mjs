// Development only: the long run of idle mode (REFACTORING.md, package 3). Starts the test server, lets the game play
// itself for a long time, samples it every half minute and judges the run:
//   - no error may have been caught (Game.fault) or thrown,
//   - the creature must never go a whole minute without destroying anything (a world change excepted),
//   - memory must not keep growing: the JavaScript heap at the start of each world may rise by at most 80 MB
//     between the first and the last world, and graphics memory by at most 60 MB.
// usage: node tools/soak.mjs [minutes=120] [seconds per world=240] [query extra, e.g. "species=tentacle&quality=2"]
import { spawn } from 'node:child_process';

const dir = decodeURIComponent(new URL('.', import.meta.url).pathname), PORT = '8768';
const minutes = Number(process.argv[2] ?? 120), perWorld = Number(process.argv[3] ?? 240), extra = process.argv[4] ?? '';
const server = spawn('node', [dir + 'serve.mjs'], { env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));
const run = minutes * 60000;
const query = `world=skyline&stage=6&idle=1&seed=1&run=${run}&every=30000&worldtime=${perWorld}${extra ? '&' + extra : ''}`;
const out = await new Promise((done) => {
  const child = spawn('node', [dir + 'browser.mjs', 'soak', query, 'soak', String(run + 15000)], { env: { ...process.env, PORT, CDP_PORT: '9371' } });
  let text = '';
  child.stdout.on('data', (d) => (text += d));
  child.on('close', () => done(text));
});
server.kill();
let x = {};
try { x = JSON.parse(out.split('\n').find((l) => l.startsWith('{'))).extra ?? {}; } catch { /* reported below */ }
const samples = x.samples ?? [], problems = [];
if (/EXC:|^error: |LOG error/m.test(out)) problems.push('errors in the log');
if (x.faults) problems.push(`${x.faults} caught error(s): ${x.lastError?.split('\n')[0]}`);
if (!samples.length) problems.push('no samples: ' + out.slice(0, 400));
if (x.maxQuietS >= 60) problems.push(`nothing destroyed for ${x.maxQuietS} s`);
// Memory at the start of each world (the first sample in it), first against last.
const starts = samples.filter((s, i) => i === 0 || s.world !== samples[i - 1].world);
if (starts.length >= 2) {
  const a = starts[0], b = starts[starts.length - 1];
  if (b.heap - a.heap > 80) problems.push(`heap grew from ${a.heap} to ${b.heap} MB`);
  if (b.gpu - a.gpu > 60) problems.push(`graphics memory grew from ${a.gpu} to ${b.gpu} MB`);
}
console.log('  s  world        heap  gpu  ms   worst meshes bodies timers queue');
for (const s of samples) console.log([String(s.s).padStart(5), s.world.padEnd(11), String(s.heap).padStart(5), String(s.gpu).padStart(4), String(s.ms).padStart(5), String(s.worst).padStart(5), String(s.meshes).padStart(6), String(s.bodies).padStart(6), String(s.timers).padStart(6), String(s.queue).padStart(5)].join(' '));
console.log(`worlds: ${(x.worlds ?? []).join(' → ')}`);
console.log(problems.length ? 'FAIL\n  ' + problems.join('\n  ') : 'passed');
process.exit(problems.length ? 1 : 0);
