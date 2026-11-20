// Development only: reads an exported Kaputtmacher save file (kaputtmacher-spielstand.json)
// and compares the actual duration of every stage in progress.log against the target ("stage N takes N minutes").
// usage: node tools/log.mjs <path-to-save.json>
import fs from 'node:fs';
import { SPECIES } from '../public/src/species.js';

const file = process.argv[2];
if (!file) { console.log('usage: node tools/log.mjs <kaputtmacher-spielstand.json>'); process.exit(1); }
const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const log = Array.isArray(raw?.log) ? raw.log : [];
if (!log.length) { console.log('No stage entries in log.'); process.exit(0); }

const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, '0')}`;
console.log('creature   stage  mode    actual  target  ratio');
for (const sp of SPECIES) {
  const rows = log.filter((e) => e.c === sp.id);
  for (const e of rows) {
    const target = e.s * 60;
    const pct = Math.round((e.t / target) * 100);
    const flag = pct < 70 ? ' (fast)' : pct > 130 ? ' (slow)' : '';
    console.log(
      `${(sp.icon + ' ' + sp.id).padEnd(11)} ${String(e.s).padStart(4)}  ${(e.a ? 'idle' : 'play').padEnd(6)}  ${fmt(e.t).padStart(6)}  ${fmt(target).padStart(6)}  ${String(pct).padStart(4)}%${flag}`
    );
  }
}
