// Progress and settings, kept in the browser's local storage. Nothing ever leaves the device.
// Whatever comes out of storage (or out of the address bar) is treated as untrusted:
// every field is checked against its type, range or list of allowed values before the game uses it.

import { DEFAULT_MIX, WORLDS } from './worldgen.js';
import { SPECIES } from './monster.js';
import { ACHIEVEMENTS, STATS } from './achievements.js';

const KEY = 'kaputtmacher.v1';
export const MAX_STAGE = 30; // far beyond what any world can show; keeps model building and maths bounded
export const MAX_DETAIL = 5; // detail slider: 1 = fastest .. 5 = richest, 0 = chosen automatically
const HINTS = ['move', 'light', 'heavy', 'stomp', 'roar', 'worlds', 'next']; // demonstrations that can be marked as seen
const TOGGLES = ['shake', 'life', 'units', 'smoke', 'fireSpread', 'unlockAll', 'cascade', 'autoIdle'];

const DEFAULTS = {
  // Stage and power of the creature that is being played. Every creature has its own: see `creatures`.
  stage: 1, // highest stage reached
  playStage: 1, // stage currently played (may be lower by choice)
  power: 0, // power collected towards the next stage
  creatures: {}, // id -> { stage, playStage, power } for every creature
  world: 'skyline', // id of the world last played; a new game starts in the skyscraper city
  completed: [], // ids of worlds destroyed to 100 % at least once
  species: 'dino',
  stickers: [], // icons of structure kinds destroyed completely at least once
  seen: {}, // demonstrations already understood
  stats: {}, // counters behind the achievements (buildings felled, jumps ...)
  achieved: [], // ids of achievements reached
  mixSeed: 0, // seed of the last randomly mixed world
  settings: { volume: 0.8, detail: 0, shake: true, life: true, units: true, smoke: true, fireSpread: true, unlockAll: false, cascade: true, autoIdle: false },
  mix: { ...DEFAULT_MIX },
};

const isObject = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v, lo, hi, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback);
const oneOf = (v, list, fallback) => (list.includes(v) ? v : fallback);

// Whole number between 1 and MAX_STAGE, or the fallback.
export function cleanStage(v, fallback = 1) {
  const n = typeof v === 'string' && /^\d{1,3}$/.test(v) ? Number(v) : v;
  return Math.round(num(n, 1, MAX_STAGE, fallback));
}
export const cleanSpecies = (v) => oneOf(v, SPECIES.map((s) => s.id), DEFAULTS.species);
// Detail level 0..MAX_DETAIL. Also understands the names older saves and links use.
export function cleanDetail(v) {
  if (v === 'low') return 2;
  if (v === 'high') return 4;
  const n = typeof v === 'string' && /^\d$/.test(v) ? Number(v) : v;
  return Math.round(num(n, 0, MAX_DETAIL, 0));
}

function cleanCreature(c) {
  const stage = cleanStage(c.stage);
  return { stage, playStage: Math.min(stage, cleanStage(c.playStage, stage)), power: num(c.power, 0, 1e15, 0) };
}

// Builds a valid progress object from arbitrary input; anything unexpected falls back to its default.
function sanitize(raw) {
  const d = structuredClone(DEFAULTS), s = isObject(raw) ? raw : {};
  const set = isObject(s.settings) ? s.settings : {}, mix = isObject(s.mix) ? s.mix : {}, seen = isObject(s.seen) ? s.seen : {};
  const creatures = isObject(s.creatures) ? s.creatures : {}, stats = isObject(s.stats) ? s.stats : {};
  const worldIds = WORLDS.map((w) => w.id);
  d.species = cleanSpecies(s.species);
  for (const sp of SPECIES) d.creatures[sp.id] = cleanCreature(isObject(creatures[sp.id]) ? creatures[sp.id] : {});
  // Saves from before every creature had its own progress: what was reached belongs to the creature played last.
  if (!isObject(creatures[d.species])) d.creatures[d.species] = cleanCreature(s);
  Object.assign(d, d.creatures[d.species]);
  d.world = oneOf(s.world, worldIds, d.world);
  d.mixSeed = Math.floor(num(s.mixSeed, 0, 2 ** 31 - 1, 0));
  if (Array.isArray(s.completed)) d.completed = worldIds.filter((id) => s.completed.includes(id));
  // Stickers are shown as text: only short emoji strings (no ASCII at all), and not endlessly many.
  if (Array.isArray(s.stickers)) d.stickers = [...new Set(s.stickers.filter((x) => typeof x === 'string' && /^[^\x00-\x7F]{1,8}$/.test(x)))].slice(0, 64);
  for (const k of HINTS) if (Object.hasOwn(seen, k) && seen[k] === true) d.seen[k] = true;
  for (const k of STATS) d.stats[k] = num(Object.hasOwn(stats, k) ? stats[k] : 0, 0, 1e15, 0);
  if (Array.isArray(s.achieved)) d.achieved = ACHIEVEMENTS.map((a) => a.id).filter((id) => s.achieved.includes(id));
  d.settings.volume = num(set.volume, 0, 1, d.settings.volume);
  d.settings.detail = cleanDetail(Object.hasOwn(set, 'detail') ? set.detail : set.quality);
  for (const k of TOGGLES) if (typeof set[k] === 'boolean') d.settings[k] = set[k];
  for (const k of Object.keys(DEFAULT_MIX)) d.mix[k] = num(mix[k], 0, 1, DEFAULT_MIX[k]);
  return d;
}

export function loadProgress() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY)); } catch { /* private mode, blocked storage or damaged data: start fresh */ }
  return sanitize(saved);
}

// Switches the live stage and power over to another creature's own progress.
export function switchCreature(p, id) {
  p.creatures[p.species] = { stage: p.stage, playStage: p.playStage, power: p.power };
  p.species = id;
  Object.assign(p, p.creatures[id]);
}

export function saveProgress(p) {
  if (p.volatile) return; // started with debug parameters in the URL: never touch the real save
  p.creatures[p.species] = { stage: p.stage, playStage: p.playStage, power: p.power };
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// Deletes everything the game has stored in this browser, progress and settings alike
// (the privacy notice promises exactly that). The caller reloads the page afterwards.
export function resetProgress(p) {
  p.volatile = true; // nothing may be written back before the reload
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}
