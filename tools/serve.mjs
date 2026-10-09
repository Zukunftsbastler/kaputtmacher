// Development only (never deployed): serves public/ with the headers from public/_headers, so the game runs
// under the same Content-Security-Policy as on Netlify, plus the test page from tools/web/.
// usage: node tools/serve.mjs   (port 8766, or PORT=…)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const root = decodeURIComponent(new URL('../public', import.meta.url).pathname), scratch = decodeURIComponent(new URL('./web', import.meta.url).pathname);
const headers = Object.fromEntries(fs.readFileSync(root + '/_headers', 'utf8').split('\n').filter((l) => /^\s+\S+:/.test(l)).map((l) => { const i = l.indexOf(':'); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = ['/test.html', '/test.js'].includes(p) ? scratch + p : path.join(root, p);
  if (!file.startsWith(root) && !file.startsWith(scratch)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404, headers); return res.end('not found'); }
    res.writeHead(200, { ...headers, 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream', });
    res.end(data);
  });
}).listen(Number(process.env.PORT ?? 8766), '127.0.0.1');
