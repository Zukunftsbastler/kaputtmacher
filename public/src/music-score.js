// The music of the game as data: an adaptive description for the Musik-Generator suite
// (vendor/musik-generator). The suite composes and renders it in a worker when the page loads;
// nothing is downloaded. See KONZEPT.md, section 13a.
//
// Three states with the same hook, each faster than the one before:
//   stroll  nothing is alarmed yet: light and bouncy; drums and melody join as things break
//   chase   the police is on its way: the full band, clearly more hectic
//   mayhem  fire brigade, helicopters, army: a whole tone higher and faster still
// One-bar bridges with a tempo ramp lead upwards on the next bar; on the way down the music
// changes at the end of a phrase.

// The hook, as [onset in beats, length in beats, scale steps above its first note]:
// a quick run up the triad to the octave, a syncopated step back, and a landing on the fifth.
const HOOK = [[0, 0.25, 0], [0.25, 0.25, 2], [0.5, 0.5, 4], [1, 0.5, 7], [1.5, 1, 6], [2.5, 0.5, 5], [3, 1, 4]];

export const SCORE = {
  format: 'mg-adaptive',
  version: 1,
  engine: '0.7.1',
  title: 'Kaputtmacher',
  seed: 'kaputtmacher',
  initial: 'stroll',
  params: { intensity: { default: 0.1, smoothingSec: 1.2 } },
  layers: {
    base: { roles: ['chords', 'pad', 'arp', 'texture', 'default'] },
    bass: { roles: ['bass', 'sub'], mono: true },
    rhythm: { roles: ['drums', 'percussion'], param: 'intensity', from: 0.12, to: 0.3 },
    melody: { roles: ['melody', 'lead', 'counter'], param: 'intensity', from: 0.35, to: 0.55 },
  },
  states: {
    stroll: { style: 'arcade', key: { tonic: 'D', mode: 'ionian' }, bpm: 120, motif: HOOK, form: [['A', 'A', 8, 0.6]], loudness: -20 },
    chase: { style: 'arcade', key: { tonic: 'D', mode: 'ionian' }, bpm: 138, motif: HOOK, form: [['A', 'A', 8, 0.8], ['B', 'B', 8, 0.9]], loudness: -18 },
    mayhem: { style: 'arcade', key: { tonic: 'E', mode: 'ionian' }, bpm: 152, motif: HOOK, axes: { drive: 0.95, density: 0.85, impact: 0.8 }, form: [['A', 'A', 8, 1], ['B', 'B', 8, 1]], loudness: -17 },
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

// Rendering rate: 32 kHz keeps rendering quick and memory small (about 40 MB decoded).
export const RENDER_RATE = 32000;

// Which state belongs to an alarm level (0..5), with a little hysteresis so it does not flutter:
// police from one star, the big guns from three.
export function stateFor(alarm, current) {
  if (alarm >= 3 || (current === 'mayhem' && alarm >= 2.5)) return 'mayhem';
  if (alarm >= 1 || (current !== 'stroll' && alarm >= 0.6)) return 'chase';
  return 'stroll';
}
