// The creatures as data: who they are, their colours, how they move about, how tall each stage is and how much
// power each stage needs.
//
// What sets a creature apart is written here instead of being asked by name all over the code:
//   motion: 'walk' (on foot or on tracks, jumps and climbs), 'plane' (always flying forwards), 'hover' (floats where it
//           is let go, rises while the jump button is held) or 'burrow' (travels below the ground) – see Monster.update.
//   tracked: on tracks: a hop instead of a jump, no climbing, an upper part that turns all round.
//   cam: height of the camera's focus and distance of the camera, in body heights (default 1.3 and 3.4).
//   ghost: false if the see-through twin cannot show its moves (its body never stands still to be copied).
//   emotes: it has manga emoticons over its tip (Game.emote).
//   jumpIcon: the icon of its jump button (default the stomp's), or 'up' for a button that is held to rise.
//   gain: share of the usual power, by stage, for creatures that destroy far more easily than the others.

export const SPECIES = [
  { id: 'dino', icon: '🦖', skin: [0x4caf50, 0x2a9d4a], belly: 0xdce775, dark: 0xf57c00, motion: 'walk' },
  { id: 'gorilla', icon: '🦍', skin: [0x5d5d66, 0x26262c], belly: 0xb8956a, dark: 0x1a1a1e, motion: 'walk' },
  { id: 'robot', icon: '🤖', skin: [0x6f9fd8, 0x3d4f7a], belly: 0xcfd8dc, dark: 0x263238, motion: 'walk' },
  { id: 'tank', icon: '🪖', skin: [0x7c8f45, 0x55662e], belly: 0x9aa860, dark: 0x2b2f25, motion: 'walk', tracked: true },
  // gain: what the aircraft destroys counts for less, most of all while it is small. It is fast, never has to walk
  // anywhere and bombs from above: measured with full value it earned seven to forty times as much as the dino on
  // stages 1 to 3 and raced through them. With this curve it stays ahead on the early stages (about three times) and level later.
  // The excavator: tracks, an upper carriage that turns all the way round, and a boom with stick and bucket.
  // It neither climbs nor shoots: it digs, swings, breaks and pushes.
  { id: 'digger', icon: '🚜', skin: [0xf2b632, 0xd8921c], belly: 0x9fd3ea, dark: 0x2b2b2b, motion: 'walk', tracked: true },
  { id: 'jet', icon: '✈️', skin: [0xdfe4e8, 0xa9b4bd], belly: 0x3f7fc0, dark: 0x2d3436, motion: 'plane', cam: [0.5, 3.4], ghost: false, gain: (stage) => Math.min(0.9, 0.054 * 1.75 ** (stage - 1)) },
  // The helicopter: hovers where it is let go, slides in every direction, rises while the jump button is held.
  // It flies over what stands in the way and fires rockets from stage 3, so up to stage 4 what it destroys counts for a little less (measured, see NEED).
  { id: 'chopper', icon: '🚁', skin: [0xe53935, 0xc62828], belly: 0x9fd3ea, dark: 0x263238, motion: 'hover', cam: [0.5, 3.4], ghost: false, jumpIcon: 'up', gain: (stage) => Math.min(1, 0.5 + 0.15 * (stage - 1)) },
  // The giant tentacle: no eyes, no face, all body language. Warm coral with a pink touch, a dark burnt orange-red back
  // and a pale peach underside with round suckers. It never walks: it travels under the ground and reaches out from where it surfaces.
  { id: 'tentacle', icon: '🐙', skin: [0xff8462, 0xff7656], belly: 0xffc6b4, dark: 0xc23f20, motion: 'burrow', cam: [1.1, 3.9], ghost: false, emotes: true, jumpIcon: '🕳️' },
];
const BY_ID = Object.fromEntries(SPECIES.map((s) => [s.id, s]));
// The entry of a creature (the dino for an unknown id).
export const specOf = (species) => BY_ID[species] ?? BY_ID.dino;
export const motionOf = (species) => specOf(species).motion;
// Creatures on tracks (tank, excavator): no jumping but a hop, no climbing, no swimming, an upper part that turns all round.
export const tracked = (species) => !!specOf(species).tracked;
// Creatures that are always in the air (aircraft, helicopter): no jumping, climbing or stomping, attacks at any time.
export const airborne = (species) => { const m = specOf(species).motion; return m === 'plane' || m === 'hover'; };
// The tentacle is a chain of segments from the root in the ground to the tip.
export const SEGS = 14, SEG_LEN = 4.6;
export const SEG_NAMES = Array.from({ length: SEGS }, (_, i) => 'seg' + i);

// Height factor per stage, relative to a stage-1 monster. Grows without limit.
const SCALE = [1, 1.6, 2.6, 3.8, 6, 9, 14, 20, 30];
export const stageScale = (s) => (s <= 9 ? SCALE[s - 1] : 30 * 1.25 ** (s - 9));
// Power needed to leave a stage. Stage N is meant to take N minutes: one minute for the first, two for the second,
// and so on. The game never lets it go faster (PACE in main.js: the bar fills from a reserve at most that quickly),
// and these thresholds are set so that steady destruction reaches that pace on most creatures.
// Measured income while the game plays itself in the skyscraper city, in power per second (dino / gorilla / robot / tank / jet):
// stage 1: 6 / - / 6 / 56 / 13, stage 2: 28 / 12 / 25 / 38 / 107, stage 3: 52 / 46 / 225 / 644 / 254,
// stage 4: 136 / 95 / 1 100 / 5 300 / 320, stage 5: 5 700 / 2 900 / 4 100 / 6 800 / 5 800, stage 6: 11 000 / 8 700 / - / 14 000 / 9 300,
// stage 7: 14 600 / 6 200 / - / 8 800 / 7 700, stage 8: 37 000 / 11 600 / 21 000 / 15 000 / 21 500.
// The slowest creature on a stage takes up to about half as long again. Checked over seven minutes of self-play from stage 1
// (seconds for stages 1, 2, 3): dino 62, 120, 184; tank 74, 120, 180; gorilla 123, 215; robot 71, 288 (with 330 and 2 200 then;
// both lowered since, for the gorilla and the robot).
// Helicopter (with its gain) / tentacle, measured later in the same way: stage 1: 9-16 / 9, 2: 22-48 / 37, 3: 135 / 24, 4: 10 300 / 7 900,
// 5: 10 500 / 12 200, 6: 11 100 / 16 400, 7: 14 500 / 39 900, 8: 26 000 / 27 100 (chain reactions make single runs scatter widely).
// Measure again with: node tools/browser.mjs x "world=skyline&species=dino&stage=N&idle=1&run=50000" income 53000
const NEED = [280, 1600, 8500, 25000, 850000, 2800000, 3200000, 5600000];
export const stageNeed = (s) => (s <= 8 ? NEED[s - 1] : 5600000 * 1.6 ** (s - 8));

export const MODEL_HEIGHT = 28;
