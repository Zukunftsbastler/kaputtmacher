// Development only: copies the parts of the Musik-Generator suite the game needs into
// public/src/vendor/musik-generator/ (the stem player for the page, the stem renderer for the worker).
// Only files reachable from the two entry points are copied; nothing is downloaded or built.
// usage: node tools/vendor-music.mjs [path to the Musik-Generator checkout]   (default: ../../Musik-Generator)
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const suite = resolve(process.argv[2] ?? join(here, '../../../Musik-Generator'));
const src = join(suite, 'src');
const out = join(here, '../public/src/vendor/musik-generator');
if (!existsSync(join(src, 'player/stem-player.js'))) throw new Error(`Musik-Generator not found at ${suite}`);

const entries = ['player/stem-player.js', 'stems/stem-worker.js'];
const seen = new Set();
const queue = entries.map((e) => join(src, e));
while (queue.length) {
  const file = queue.pop();
  if (seen.has(file)) continue;
  seen.add(file);
  const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of code.matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]/g)) queue.push(join(dirname(file), m[1]));
}
rmSync(out, { recursive: true, force: true });
let bytes = 0;
for (const file of [...seen].sort()) {
  const to = join(out, relative(src, file));
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(file, to);
  bytes += readFileSync(file).length;
}
copyFileSync(join(suite, 'LICENSE'), join(out, 'LICENSE'));
const version = /VERSION = '([^']+)'/.exec(readFileSync(join(src, 'version.js'), 'utf8'))?.[1] ?? '?';
writeFileSync(join(out, 'README.md'), `# Musik-Generator ${version} (vendored)\n\nCopied by \`tools/vendor-music.mjs\` from the Musik-Generator suite (MIT, see LICENSE): the stem player and the stem\nrenderer with everything they import. Do not edit here; change the suite and copy again.\n\n${seen.size} files, ${(bytes / 1024).toFixed(0)} KB.\n`);
console.log(`Musik-Generator ${version}: ${seen.size} files, ${(bytes / 1024).toFixed(0)} KB -> ${relative(process.cwd(), out)}`);
