// Music that follows the game, composed and rendered in the browser by the Musik-Generator suite
// (vendor/musik-generator); there are no audio files and nothing is downloaded.
//
// Every world has a piece of its own (TRACKS in music-score.js), unless the player has chosen one piece for all
// (settings.track). When a world is loaded and its piece is not the one playing, the old one fades out and a worker
// composes the new description and renders it into layered loops ("stems") for three states: stroll, chase and
// mayhem. The first one is ready after a second or two, the others follow in the background; only one piece is
// kept in memory. The stem player then plays them in sync with the audio clock:
//   - the music starts with the first key press or click, softly: chords and bass only;
//   - drums and the melody fade in as things break (intensity);
//   - from the first alarm star the faster "chase" takes over on the next bar, through a one-bar
//     bridge with a rising tempo; from three stars "mayhem", faster still and a tone higher;
//   - when the alarm ebbs away, the music steps back down at the end of a phrase.
// If the worker cannot run (very old browser, a stricter policy), the hand-written music of the
// earlier versions plays instead (music-classic.js).

import { ClassicMusic } from './music-classic.js';
import { StemPlayer } from './vendor/musik-generator/player/stem-player.js';
import { RENDER_RATE, stateFor, scoreFor, trackFor } from './music-score.js';

const WORKER = './vendor/musik-generator/stems/stem-worker.js';
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.volume = 0.6;
    this.classic = new ClassicMusic(audio); // only used when rendering is impossible
    this.mode = 'rendering'; // 'rendering' -> 'stems', or 'classic' as the fallback
    this.manifest = null;
    this.files = new Map(); // rendered audio that has not been handed to the player yet
    this.waiting = new Map(); // file name -> callbacks of the player waiting for it
    this.player = null;
    this.started = false;
    this.state = 'stroll';
    this.intensity = 0.1;
    this.swell = 0;
    this.paused = false;
    this.progress = 0; // 0..1 share of the music that is rendered (for tests and diagnostics)
    this.track = null; // the piece that is playing or being rendered
    this.choice = ''; // the piece the player chose for all worlds ('' = each world its own)
    this.world = null;
  }

  // The world that is being played: its piece, unless the player chose one for all.
  setWorld(id) {
    this.world = id;
    this.classic.setWorld(id);
    this.pick();
  }

  setChoice(track) {
    this.choice = track;
    if (this.world !== null) this.pick();
  }

  pick() {
    const want = this.choice || trackFor(this.world);
    if (want !== this.track) this.load(want);
  }

  // Lets the piece that is playing fade out, forgets it and starts rendering another.
  load(id) {
    this.track = id;
    if (this.mode === 'classic') return; // the fallback plays its own music
    this.worker?.terminate();
    if (this.player) {
      const player = this.player, bus = this.bus, ctx = this.audio.ctx;
      bus.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      setTimeout(() => { player.dispose(); bus.disconnect(); }, 900);
    }
    this.player = null; this.bus = null; this.manifest = null;
    this.files.clear(); this.waiting.clear();
    this.mode = 'rendering'; this.started = false; this.state = 'stroll'; this.progress = 0;
    this.render(scoreFor(id));
  }

  // Starts the worker. Under the page's Trusted Types policy a worker address must come from a
  // named policy; this one can only ever produce the address of the stem worker.
  render(description) {
    try {
      const url = new URL(WORKER, import.meta.url);
      const tt = globalThis.trustedTypes;
      this.policy ??= tt?.createPolicy ? tt.createPolicy('kaputtmacher-music', { createScriptURL: () => url.href }) : null;
      const address = this.policy ? this.policy.createScriptURL('') : url;
      const worker = (this.worker = new Worker(address, { type: 'module' }));
      worker.onmessage = (e) => { if (worker === this.worker) this.receive(e.data); }; // (a worker that was replaced has nothing more to say)
      worker.onerror = () => { if (worker === this.worker) this.fallBack(); };
      worker.postMessage({ type: 'render', description, sampleRate: RENDER_RATE });
    } catch {
      this.fallBack();
    }
  }

  receive(msg) {
    if (msg.type === 'manifest') this.manifest = msg.manifest;
    else if (msg.type === 'progress') this.progress = msg.fraction;
    else if (msg.type === 'files') {
      for (const [name, channels] of Object.entries(msg.files)) {
        const data = { sampleRate: RENDER_RATE, channels };
        if (this.player) {
          this.player.addBuffer(name, data);
          for (const done of this.waiting.get(name) ?? []) done(this.player.buffers.get(name));
          this.waiting.delete(name);
        } else this.files.set(name, data);
      }
    } else if (msg.type === 'done') this.worker.terminate();
    else if (msg.type === 'error') this.fallBack();
  }

  fallBack() {
    if (this.mode === 'stems') return; // already playing: keep what is there
    this.mode = 'classic';
    this.worker?.terminate();
  }

  setVolume(v) { this.volume = v; this.classic.setVolume(v); }

  // True once everything the first state needs has been rendered.
  ready() {
    const m = this.manifest;
    if (!m) return false;
    return m.states[m.initial].segments.every((s) => Object.values(m.segments[s].files).every((f) => this.files.has(f.body) && (!f.tail || this.files.has(f.tail))));
  }

  // Builds the player once the audio context runs and the first state is rendered.
  begin() {
    const a = this.audio, ctx = a.ctx;
    this.bus = ctx.createGain(); // volume of the music, in front of the game's master chain
    this.bus.gain.value = 0;
    this.bus.connect(a.master);
    const buffers = Object.fromEntries(this.files);
    this.files.clear();
    this.player = new StemPlayer({
      audioContext: ctx,
      manifest: this.manifest,
      buffers,
      // Files that are still being rendered: the player waits for them (e.g. before a state change).
      load: (file) => new Promise((done) => this.waiting.set(file, [...(this.waiting.get(file) ?? []), done])),
      destination: this.bus,
      profile: 'desktop',
      limiter: false, // the game's own compressor sits behind the master
    });
    this.player.on('error', () => {});
    this.mode = 'stems';
  }

  // Called every frame. target: 0..1 how much is going on; bump: something has just been destroyed (0..1);
  // heat: how much is breaking right now (0..1); alarm: the alarm level (0..5).
  update(dt, target, bump, heat = 0, alarm = 0, paused = false) {
    if (this.mode === 'classic') { this.classic.update(dt, target, bump); return; }
    const ctx = this.audio.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (this.mode === 'rendering') {
      if (!this.ready()) return;
      this.begin();
    }
    const p = this.player;
    if (!this.started && this.volume > 0) {
      this.started = true;
      p.start({ fadeInSec: 2.5 }).catch(() => {});
    }
    // Volume: a little louder when more is going on, a short swell when something breaks.
    this.swell = Math.max(this.swell * (1 - dt * 1.5), bump);
    this.intensity += (target - this.intensity) * Math.min(1, dt / (target > this.intensity ? 1.5 : 7));
    this.bus.gain.setTargetAtTime(this.volume * (0.5 + 0.25 * this.intensity + 0.15 * this.swell), ctx.currentTime, 0.25);
    if (!this.started) return;
    // State: follows the alarm level. The player defers changes that come too quickly.
    const want = paused ? this.state : stateFor(alarm, this.state);
    if (want !== this.state) {
      this.state = want;
      p.setState(want).catch(() => {});
    }
    // Layers: in the calm state drums and melody follow the destruction; later the whole band plays.
    const busy = clamp01(0.06 + heat * 1.5 + bump * 0.5);
    p.setParams({ intensity: this.state === 'stroll' ? busy : this.state === 'chase' ? Math.max(0.62, busy) : 1 });
    if (paused !== this.paused) {
      this.paused = paused;
      if (paused) p.duck(0.3, { attack: 0.3, hold: Infinity });
      else p.unduck({ release: 0.6 });
    }
  }
}
