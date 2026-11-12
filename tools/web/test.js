// Development only (never deployed): scenario driver. test.html?<address parameters>#<scenario>
// The scenarios live in scenarios/*.js, grouped by theme; each one runs when its name matches the part after the #.
// What a scenario measures it writes to window.__extra, which tools/browser.mjs prints.
const errors = [];
addEventListener('error', (e) => errors.push(e.message));
const g = window.game, sc = location.hash.slice(1);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const fire = (x, y) => { g.input.aimX = innerWidth * x; g.input.aimY = innerHeight * y; g.input.firePressed = true; };
const moves = () => [...document.querySelectorAll('#toolbar .btn')].length;

// The comparison run (scenarios/measure.js) steps the simulation itself. It has to take over before the game draws its
// first picture, so that nothing has happened yet: the game's own loop is stopped here, synchronously.
if (g && sc.startsWith('hash')) g.frame = () => {};

async function run() {
  if (!g) { document.title = 'NO GAME ' + errors.join('|'); return; }
  if (!sc.startsWith('hash')) await wait(600);
  const ctx = { g, sc, wait, fire, moves, errors };
  for (const group of ['measure', 'attacks', 'movement', 'world', 'ui']) await (await import(`./scenarios/${group}.js`)).default(ctx);
  if (sc.startsWith('hash')) return;
  await wait(400);
  const p = g.progress;
  const info = document.createElement('pre');
  info.style.cssText = 'position:fixed;left:8px;bottom:90px;margin:0;font:12px monospace;background:#000a;color:#fff;padding:4px;z-index:9';
  info.textContent = `err:${errors.join('|') || '-'} ms:${g.frameMs.toFixed(1)} stage:${p.stage} power:${p.power | 0} bodies:${g.bodies.list.length} debris:${g.debris.n} chunks:${g.chunkMeshes.size} dirty:${g.world.dirty.size} world:${(100 - 100 * g.world.remaining / g.world.total).toFixed(1)}%`;
  document.body.appendChild(info);
}
run();
