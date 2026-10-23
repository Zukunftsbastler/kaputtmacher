// The music of the game as data: adaptive descriptions for the Musik-Generator suite (vendor/musik-generator).
// The suite composes and renders them in a worker; nothing is downloaded. See KONZEPT.md, section 13a.
//
// Every world has a piece of its own (TRACKS): its own hook, key, mode, tempi, style and seed, so that the jungle
// bounces on marimbas, Babel snakes along in phrygian, the neon city pulses in synthwave, the fortress marches with
// drums and brass, the knights' castle sounds like an old role-playing game, the village and the harbour dance a
// jig and the funfair rings on glockenspiels. All of them stay bright, quick and 16-bit at heart. The player can also pick one
// piece for all worlds (settings.track).
//
// Every piece has the same three states, each faster than the one before:
//   stroll  nothing is alarmed yet: light and bouncy; drums and melody join as things break
//   chase   the police is on its way: the full band, clearly more hectic
//   mayhem  fire brigade, helicopters, army: a whole tone higher and faster still
// One-bar bridges with a tempo ramp lead upwards on the next bar; on the way down the music
// changes at the end of a phrase.

// A hook is a list of notes [onset in beats, length in beats, scale steps above its first note].
// The first piece's: a quick run up the triad to the octave, a syncopated step back, and a landing on the fifth.
const HOOK = [[0, 0.25, 0], [0.25, 0.25, 2], [0.5, 0.5, 4], [1, 0.5, 7], [1.5, 1, 6], [2.5, 0.5, 5], [3, 1, 4]];

// id, title (German: it is shown in the settings), the worlds it belongs to, style, key of the calm state (the
// wildest state goes a whole tone up), the three tempi, the hook, and optionally character axes, variety (how far
// the seed may pick other instruments and patterns of the style) and a seed of its own. The seeds were picked for
// the band they choose (tools/music.mjs lists it): marimba and glockenspiel in the jungle and at the funfair, a
// saw lead over marimba in Babel, synth leads in the town.
export const TRACKS = [
  { id: 'theme', title: 'Kaputtmacher', worlds: ['skyline', 'random'], style: 'arcade', key: ['D', 'ionian'], bpm: [120, 138, 152], hook: HOOK, seed: 'kaputtmacher' },
  // The jungle: a bouncy, syncopated tune over mallets, like a certain ape's on a certain console.
  { id: 'jungle', title: 'Dschungelfieber', worlds: ['primeval'], style: 'arcade', key: ['A', 'mixolydian'], bpm: [116, 130, 144], variety: 0.8, seed: 'kaputtmacher-jungle-13',
    hook: [[0, 0.5, 0], [0.75, 0.25, 0], [1, 0.5, 2], [1.5, 0.5, 4], [2, 0.75, 5], [2.75, 0.25, 4], [3, 1, 2]], axes: { pulse: 0.9, depth: 0.5 } },
  // Babel: a snaking figure around the tonic in phrygian, the half step above it everywhere.
  { id: 'babel', title: 'Turmbau', worlds: ['babel'], style: 'arcade', key: ['E', 'phrygian'], bpm: [112, 126, 140], variety: 0.6, seed: 'kaputtmacher-babel-4',
    hook: [[0, 0.25, 0], [0.25, 0.25, 1], [0.5, 0.5, 0], [1, 0.5, -1], [1.5, 0.5, 0], [2, 0.25, 1], [2.25, 0.25, 2], [2.5, 0.5, 3], [3, 1, 2]] },
  // The neon city by night: synthwave with long, gliding notes, in dorian instead of the usual minor.
  { id: 'neon', title: 'Neonnacht', worlds: ['neon'], style: 'synthwave', key: ['F#', 'dorian'], bpm: [112, 124, 136],
    hook: [[0, 0.75, 0], [0.75, 0.75, 2], [1.5, 0.5, 4], [2, 1.5, 6], [3.5, 0.5, 5]], axes: { space: 0.35, drive: 0.75 } },
  // Fortress Titan: a march with a dotted rhythm, drums, strings and brass.
  { id: 'fortress', title: 'Sturm auf Titan', worlds: ['fortress'], style: 'action', key: ['D', 'aeolian'], bpm: [134, 146, 158],
    hook: [[0, 0.75, 0], [0.75, 0.25, 0], [1, 0.5, 4], [1.5, 0.5, 4], [2, 0.75, 5], [2.75, 0.25, 4], [3, 1, 7]] },
  // The cloud shipyard: soaring leaps in lydian, lots of air.
  { id: 'clouds', title: 'Über den Wolken', worlds: ['skyyard'], style: 'arcade', key: ['G', 'lydian'], bpm: [126, 140, 154], variety: 0.5,
    hook: [[0, 1, 0], [1, 0.5, 3], [1.5, 0.5, 4], [2, 1, 6], [3, 0.5, 7], [3.5, 0.5, 9]], axes: { space: 0.4 } },
  // The construction site: a boogie of hammered repeated notes, in 8-bit.
  { id: 'site', title: 'Baustellen-Boogie', worlds: ['site'], style: 'chiptune', key: ['C', 'mixolydian'], bpm: [132, 144, 156], variety: 0.5,
    hook: [[0, 0.25, 0], [0.25, 0.25, 0], [0.5, 0.5, 2], [1, 0.25, 0], [1.25, 0.25, 0], [1.5, 0.5, 4], [2, 0.5, 5], [2.5, 0.5, 4], [3, 1, 2]] },
  // The toy-block room: a quick, toy-like polka.
  { id: 'blocks', title: 'Bauklotz-Polka', worlds: ['blocks'], style: 'chiptune', key: ['F', 'ionian'], bpm: [138, 150, 162],
    hook: [[0, 0.5, 0], [0.5, 0.5, 4], [1, 0.5, 3], [1.5, 0.5, 4], [2, 0.5, 7], [2.5, 0.25, 6], [2.75, 0.25, 5], [3, 1, 4]] },
  // The village: a country dance in 6/8 with fiddle and whistle.
  { id: 'village', title: 'Dorftanz', worlds: ['village'], style: 'folk', key: ['G', 'mixolydian'], bpm: [150, 162, 174],
    hook: [[0, 0.5, 0], [0.5, 0.25, 1], [0.75, 0.25, 2], [1, 0.5, 4], [1.5, 0.5, 2], [2, 1, 3], [3, 1, 1]] },
  // The funfair: a fairground tune that leaps about, on glockenspiel and marimba over an electric piano.
  { id: 'funfair', title: 'Jahrmarkt', worlds: ['funfair'], style: 'arcade', key: ['C', 'ionian'], bpm: [128, 142, 156], variety: 0.8,
    hook: [[0, 0.5, 4], [0.5, 0.5, 3], [1, 0.5, 4], [1.5, 0.5, 6], [2, 0.5, 7], [2.5, 0.5, 5], [3, 1, 4]] },
  // The town: busy and cheerful, a figure that turns round the tonic like traffic round a square.
  { id: 'city', title: 'Rushhour', worlds: ['city'], style: 'arcade', key: ['Bb', 'ionian'], bpm: [128, 140, 152], variety: 0.4, seed: 'kaputtmacher-city-3',
    hook: [[0, 0.5, 0], [0.5, 0.5, -1], [1, 0.5, 0], [1.5, 0.5, 2], [2, 0.25, 4], [2.25, 0.25, 3], [2.5, 0.5, 2], [3, 1, 0]] },
  // The factory: a machine of octave jumps, in minor, but driving.
  { id: 'factory', title: 'Fließband', worlds: ['factory'], style: 'chiptune', key: ['E', 'aeolian'], bpm: [136, 148, 160],
    hook: [[0, 0.25, 0], [0.25, 0.25, 7], [0.5, 0.25, 0], [0.75, 0.25, 7], [1, 0.5, 5], [1.5, 0.5, 3], [2, 0.5, 2], [2.5, 0.5, 3], [3, 1, 4]], axes: { pulse: 0.9 } },
  // The knights' castle: a heroic fanfare, played by an orchestra the way the old role-playing games had one.
  { id: 'castle', title: 'Ritterturnier', worlds: ['castle'], style: 'fantasy', key: ['D', 'ionian'], bpm: [116, 128, 140],
    hook: [[0, 0.5, 0], [0.5, 0.5, 4], [1, 1, 7], [2, 0.5, 6], [2.5, 0.5, 4], [3, 1, 5]], axes: { drive: 0.7, pulse: 0.7 } },
  // The winter world: a sparkling sleigh ride in lydian, bells and mallets if the seed wants them.
  { id: 'winter', title: 'Schneegestöber', worlds: ['winter'], style: 'arcade', key: ['F', 'lydian'], bpm: [124, 138, 150], variety: 0.9,
    hook: [[0, 0.25, 7], [0.25, 0.25, 6], [0.5, 0.25, 7], [0.75, 0.25, 9], [1, 0.5, 7], [1.5, 0.5, 4], [2, 0.5, 5], [2.5, 0.5, 2], [3, 1, 4]] },
  // The airport: a take-off, a scale climbing up to the sixth.
  { id: 'airport', title: 'Startfreigabe', worlds: ['airport'], style: 'arcade', key: ['A', 'ionian'], bpm: [130, 142, 154], variety: 0.3,
    hook: [[0, 0.5, 0], [0.5, 0.5, 1], [1, 0.5, 2], [1.5, 0.5, 4], [2, 0.5, 5], [2.5, 0.5, 7], [3, 1, 9]] },
  // The harbour: a sea shanty, a jig in dorian.
  { id: 'harbour', title: 'Leinen los', worlds: ['harbour'], style: 'folk', key: ['D', 'dorian'], bpm: [156, 168, 180],
    hook: [[0, 0.75, 0], [0.75, 0.25, 2], [1, 0.5, 4], [1.5, 0.5, 2], [2, 0.5, 0], [2.5, 0.5, -3], [3, 1, 0]] },
  // The giants: big, slow steps, heavy drums.
  { id: 'giants', title: 'Riesenschritte', worlds: ['giants'], style: 'arcade', key: ['C', 'mixolydian'], bpm: [110, 124, 138], variety: 0.5,
    hook: [[0, 1, 0], [1, 0.5, 0], [1.5, 0.5, 2], [2, 1, -1], [3, 0.5, 0], [3.5, 0.5, 4]], axes: { impact: 0.9, depth: 0.7 } },
  // The town under the sea: bubbling runs that rise and sink, with a lot of room.
  { id: 'reef', title: 'Tiefseeperlen', worlds: ['reef'], style: 'arcade', key: ['A', 'dorian'], bpm: [118, 130, 142], variety: 0.7,
    hook: [[0, 0.25, 0], [0.25, 0.25, 2], [0.5, 0.25, 4], [0.75, 0.25, 2], [1, 1, 5], [2, 0.25, 4], [2.25, 0.25, 2], [2.5, 0.5, 0], [3, 1, -2]], axes: { space: 0.45 } },
  // The spaceport: a countdown arpeggio down, then up into lydian space.
  { id: 'space', title: 'Countdown', worlds: ['spaceport'], style: 'chiptune', key: ['Eb', 'lydian'], bpm: [140, 152, 164], variety: 0.6,
    hook: [[0, 0.5, 7], [0.5, 0.5, 4], [1, 0.5, 2], [1.5, 0.5, 0], [2, 0.25, 2], [2.25, 0.25, 4], [2.5, 0.5, 7], [3, 1, 11]] },
];

// The piece that belongs to a world (the first one for worlds without a piece of their own).
export const trackFor = (world) => (TRACKS.find((t) => t.worlds.includes(world)) ?? TRACKS[0]).id;

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const up = (tonic, steps) => NAMES[(NAMES.indexOf(tonic.replace('Db', 'C#').replace('D#', 'Eb').replace('Gb', 'F#').replace('G#', 'Ab').replace('A#', 'Bb')) + steps) % 12];

// The full description of a piece.
export function scoreFor(id) {
  const t = TRACKS.find((x) => x.id === id) ?? TRACKS[0], key = { tonic: t.key[0], mode: t.key[1] }, high = { tonic: up(t.key[0], 2), mode: t.key[1] };
  // With variety the seed picks instruments: all three states share it, so the band stays the same when the music speeds up.
  const own = { style: t.style, motif: t.hook, ...(t.variety ? { variety: t.variety, seed: t.seed ?? 'kaputtmacher-' + t.id } : {}) };
  return {
    format: 'mg-adaptive',
    version: 1,
    engine: '0.7.1',
    title: t.id === 'theme' ? 'Kaputtmacher' : 'Kaputtmacher – ' + t.title,
    seed: t.seed ?? 'kaputtmacher-' + t.id,
    initial: 'stroll',
    params: { intensity: { default: 0.1, smoothingSec: 1.2 } },
    layers: {
      base: { roles: ['chords', 'pad', 'arp', 'texture', 'default'] },
      bass: { roles: ['bass', 'sub'], mono: true },
      rhythm: { roles: ['drums', 'percussion'], param: 'intensity', from: 0.12, to: 0.3 },
      melody: { roles: ['melody', 'lead', 'counter'], param: 'intensity', from: 0.35, to: 0.55 },
    },
    states: {
      stroll: { ...own, key, bpm: t.bpm[0], ...(t.axes ? { axes: t.axes } : {}), form: [['A', 'A', 8, 0.6]], loudness: -20 },
      chase: { ...own, key, bpm: t.bpm[1], ...(t.axes ? { axes: t.axes } : {}), form: [['A', 'A', 8, 0.8], ['B', 'B', 8, 0.9]], loudness: -18 },
      mayhem: { ...own, key: high, bpm: t.bpm[2], axes: { ...t.axes, drive: 0.95, density: 0.85, impact: Math.max(0.8, t.axes?.impact ?? 0) }, form: [['A', 'A', 8, 1], ['B', 'B', 8, 1]], loudness: -17 },
    },
    transitions: [
      { from: 'stroll', to: 'chase', at: 'nextBar', via: 'bridge', bars: 1 },
      { from: 'chase', to: 'mayhem', at: 'nextBar', via: 'bridge', bars: 1 },
      { from: 'stroll', to: 'mayhem', at: 'nextBar', via: 'bridge', bars: 1 },
      { from: 'mayhem', to: 'chase', at: 'nextPhrase', fadeSec: 1.5, fadeInSec: 0.4 },
      { from: 'chase', to: 'stroll', at: 'nextPhrase', fadeSec: 2, fadeInSec: 0.8 },
      { from: 'mayhem', to: 'stroll', at: 'nextPhrase', fadeSec: 2, fadeInSec: 0.8 },
    ],
    hysteresis: { minStateSeconds: 8 },
  };
}

// The first piece, as it always was.
export const SCORE = scoreFor('theme');

// Rendering rate: 32 kHz keeps rendering quick and memory small (about 40 MB decoded).
export const RENDER_RATE = 32000;

// Which state belongs to an alarm level (0..5), with a little hysteresis so it does not flutter:
// police from one star, the big guns from three.
export function stateFor(alarm, current) {
  if (alarm >= 3 || (current === 'mayhem' && alarm >= 2.5)) return 'mayhem';
  if (alarm >= 1 || (current !== 'stroll' && alarm >= 0.6)) return 'chase';
  return 'stroll';
}
