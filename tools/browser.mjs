// Development only (never deployed): opens the test page in a private headless browser, lets a scenario from
// tools/web/test.js play, prints the game's state as JSON and saves a screenshot to tools/out/<name>.png.
// It talks to the browser over the DevTools protocol with a tiny built-in WebSocket client: no dependencies.
// usage: node tools/browser.mjs <name> <query> <scenario> [waitMs] [width] [height]
//   e.g. node tools/browser.mjs fair "world=funfair&stage=5" walk 5000
// Needs tools/serve.mjs running. BROWSER=/path/to/chromium picks the browser (default: Chrome or Brave on macOS).
import { spawn } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [name, query = '', scenario = 'none', waitMs = '4000', W = '1280', H = '720'] = process.argv.slice(2);
const OUT = decodeURIComponent(new URL('./out/', import.meta.url).pathname), PORT = 9333;
fs.mkdirSync(OUT, { recursive: true });
// A profile of its own in the temp folder: the browser you use every day is never touched.
const PROFILE = path.join(os.tmpdir(), 'kaputtmacher-test-profile');
const BROWSER = process.env.BROWSER ?? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser', '/Applications/Chromium.app/Contents/MacOS/Chromium', '/usr/bin/chromium', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
if (!BROWSER) { console.log('no browser found: set BROWSER=/path/to/chromium'); process.exit(1); }
const args = ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--mute-audio', '--hide-scrollbars',
  `--window-size=${W},${H}`, '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', ...(process.env.GPU ? process.env.GPU.split(' ') : []), 'about:blank'];
const br = spawn(BROWSER, args, { stdio: 'ignore' });
const kill = () => { try { br.kill('SIGKILL'); } catch {} };
setTimeout(() => { console.log('TIMEOUT'); kill(); process.exit(1); }, Number(waitMs) + 30000);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = (path) => new Promise((res, rej) => http.get({ host: '127.0.0.1', port: PORT, path }, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d)); }).on('error', rej));

let target;
for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = JSON.parse(await get('/json/list')).find((t) => t.type === 'page'); } catch {} }
if (!target) { console.log('no target'); kill(); process.exit(1); }
const u = new URL(target.webSocketDebuggerUrl);
const sock = net.connect(Number(u.port), u.hostname);
await new Promise((r) => sock.once('connect', r));
sock.write(`GET ${u.pathname} HTTP/1.1\r\nHost: ${u.host}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: ${crypto.randomBytes(16).toString('base64')}\r\nSec-WebSocket-Version: 13\r\n\r\n`);
let buf = Buffer.alloc(0), shook = false, frag = [];
const pending = new Map(), logs = [];
let id = 0;
sock.on('data', (d) => {
  buf = Buffer.concat([buf, d]);
  if (!shook) { const i = buf.indexOf('\r\n\r\n'); if (i < 0) return; buf = buf.subarray(i + 4); shook = true; }
  for (;;) {
    if (buf.length < 2) return;
    let len = buf[1] & 127, off = 2;
    if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
    if (buf.length < off + len) return;
    frag.push(buf.subarray(off, off + len));
    const fin = buf[0] & 128;
    buf = buf.subarray(off + len);
    if (!fin) continue;
    const msg = JSON.parse(Buffer.concat(frag).toString()); frag = [];
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg.result ?? msg); pending.delete(msg.id); }
    else if (msg.method === 'Runtime.consoleAPICalled') logs.push(msg.params.type + ': ' + msg.params.args.map((a) => a.value ?? a.description).join(' '));
    else if (msg.method === 'Log.entryAdded') logs.push('LOG ' + msg.params.entry.level + ': ' + msg.params.entry.text);
    else if (msg.method === 'Runtime.exceptionThrown') logs.push('EXC: ' + (msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text));
  }
});
function send(method, params = {}) {
  const p = Buffer.from(JSON.stringify({ id: ++id, method, params })), mask = crypto.randomBytes(4);
  const head = p.length < 126 ? Buffer.from([129, 128 | p.length]) : p.length < 65536 ? Buffer.from([129, 254, p.length >> 8, p.length & 255]) : (() => { const b = Buffer.alloc(10); b[0] = 129; b[1] = 255; b.writeBigUInt64BE(BigInt(p.length), 2); return b; })();
  const body = Buffer.from(p); for (let i = 0; i < body.length; i++) body[i] ^= mask[i & 3];
  sock.write(Buffer.concat([head, mask, body]));
  return new Promise((r) => pending.set(id, r));
}
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.value;
while (!shook) await sleep(20);
await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Network.enable'); await send('Network.setCacheDisabled', { cacheDisabled: true });
await send('Emulation.setDeviceMetricsOverride', { width: Number(W), height: Number(H), deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `http://127.0.0.1:${process.env.PORT ?? 8766}/test.html?${query}#${scenario}` });
await sleep(Number(waitMs));
console.log(await ev(`(() => { const g = window.game; if (!g) return 'NO GAME'; const p = g.progress; return JSON.stringify({ gl: (() => { const e = g.renderer.gl.getExtension('WEBGL_debug_renderer_info'); return e ? g.renderer.gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'; })(), ms: +g.frameMs.toFixed(1), stage: p.stage, power: p.power | 0, bodies: g.bodies.list.length, debris: g.debris.n, fx: g.fx.n, chunks: g.chunkMeshes.size, drawn: g.drawn, dirty: g.world.dirty.size, world: +(100 - 100 * g.world.remaining / g.world.total).toFixed(1), monster: [g.monster.x | 0, g.monster.y | 0, g.monster.z | 0, +g.monster.h.toFixed(1)], hint: g.hud.hintId, idle: g.idle, tool: g.tool, tgt: g.autopilot.target ? g.autopilot.target.icon : null, done: g.hud.major.filter(s => s.done).length, wid: p.world, extra: window.__extra }); })()`));
for (const l of logs.slice(0, 12)) console.log(l.slice(0, 400));
const shot = await send('Page.captureScreenshot', { format: 'png' });
if (shot.data) fs.writeFileSync(`${OUT}${name}.png`, Buffer.from(shot.data, 'base64'));
console.log(shot.data ? 'saved ' + name + '.png' : 'no screenshot ' + JSON.stringify(shot).slice(0, 200));
kill(); process.exit(0);
