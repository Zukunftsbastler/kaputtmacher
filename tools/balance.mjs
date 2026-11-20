// Development only: measures power per second in self-play across creatures and stages,
// and compares each cell against the pace needed to reach stage N in N minutes (70–130 % band).
// usage: node tools/balance.mjs [species=dino,gorilla,...] [stages=1,2,3,4] [world=skyline] [runMs=45000]
import { spawn } from 'node:child_process';
import { SPECIES, stageNeed } from '../public/src/species.js';

const dir = decodeURIComponent(new URL('.', import.meta.url).pathname), PORT = '8769';
const species = (process.argv[2] ? process.argv[2].split(',') : SPECIES.map((s) => s.id));
const stages = (process.argv[3] ? process.argv[3].split(',').map(Number) : [1, 2, 3, 4, 5, 6, 7, 8]);
const world = process.argv[4] ?? 'skyline';
const runMs = Number(process.argv[5] ?? 45000);
const jobs = Number(process.env.JOBS ?? 2);

const server = spawn('node', [dir + 'serve.mjs'], { env: { ...process.env, PORT }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 700));

const queue = [];
for (const sp of species) for (const st of stages) queue.push([sp, st]);
const results = new Map();
let portSeq = 0;

const run1 = (sp, st) => new Promise((done) => {
  const port = 9460 + (portSeq++ % 40);
  const query = `world=${world}&species=${sp}&stage=${st}&idle=1&seed=3&run=${runMs}`;
  const child = spawn('node', [dir + 'browser.mjs', `bal-${sp}-${st}`, query, 'income', String(runMs + 4000)], {
    env: { ...process.env, PORT, CDP_PORT: String(port) },
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.on('close', () => {
    let perSec = null;
    try { perSec = JSON.parse(out.split('\n').find((l) => l.startsWith('{'))).extra?.perSec ?? null; } catch {}
    done(perSec);
  });
});

await Promise.all(Array.from({ length: jobs }, async () => {
  for (let item; (item = queue.shift());) {
    const [sp, st] = item;
    results.set(`${sp}:${st}`, await run1(sp, st));
  }
}));
server.kill();

console.log(`world=${world}, run=${runMs / 1000}s (power/s, % of target need/(60*stage))`);
console.log('stage  target  ' + species.map((s) => s.padStart(12)).join(''));
for (const st of stages) {
  const target = stageNeed(st) / (60 * st);
  const cells = species.map((sp) => {
    const v = results.get(`${sp}:${st}`);
    if (v == null) return 'err'.padStart(12);
    const pct = Math.round((v / target) * 100);
    return `${Math.round(v)} (${pct}%)`.padStart(12);
  });
  console.log(`${String(st).padStart(5)}  ${String(Math.round(target)).padStart(6)}  ${cells.join('')}`);
}
