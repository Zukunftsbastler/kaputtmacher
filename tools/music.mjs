// Development only: lists the pieces of music (public/src/music-score.js) as the suite composes them – the band
// each seed picked per state, the tempi, the first notes of the melody and the memory the rendered stems need.
// Nothing is rendered or played. usage: node --experimental-default-type=module tools/music.mjs [piece]
const V = '../public/src/vendor/musik-generator/';
const { TRACKS, scoreFor, RENDER_RATE } = await import('../public/src/music-score.js');
const { composeSong } = await import(V + 'styles/song.js');
const { createRecipe } = await import(V + 'styles/recipe.js');
const { planStems } = await import(V + 'stems/render-stems.js');
const N = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
for (const t of TRACKS) {
  if (process.argv[2] && process.argv[2] !== t.id) continue;
  const d = scoreFor(t.id), { manifest } = planStems(d, { sampleRate: RENDER_RATE });
  console.log(`${t.id} – ${t.title} (${t.worlds.join(', ')}): ${t.style}, ${t.key.join(' ')}, ${t.bpm.join('/')} BPM, ${(manifest.ram.totalBytes / 1048576).toFixed(0)} MB`);
  for (const name of Object.keys(d.states)) {
    const st = d.states[name];
    const song = composeSong(createRecipe({ style: st.style, seed: st.seed ?? `${d.seed}:${name}`, key: st.key, bpm: st.bpm, ...(st.axes ? { axes: st.axes } : {}), ...(st.variety ? { variety: st.variety } : {}), motif: st.motif, form: st.form, loop: true }));
    const mel = song.score.tracks.find((x) => x.role === 'melody');
    console.log(`  ${name.padEnd(7)} ${song.score.tracks.map((x) => `${x.role}:${x.instrument}`).join(' ')}`);
    if (name === 'stroll' && mel) console.log(`          ${mel.events.slice(0, 12).map((e) => N[e.p % 12] + Math.floor(e.p / 12 - 1)).join(' ')}`);
  }
}
