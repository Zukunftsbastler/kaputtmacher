// A meshing worker (see meshing.js): turns copies of chunks and of falling fragments into quads, away from the
// game's own thread. It keeps nothing but the colour table of the world being played.

import { meshPadded, meshVolume } from './mesher.js';

let rgba = null;

onmessage = (e) => {
  const m = e.data;
  if (m.kind === 'rgba') { rgba = m.rgba; return; }
  if (m.kind === 'chunk') {
    const r = meshPadded(m.pad, 32, 32, 32, 0, 0, 0, rgba, m.maxRun);
    postMessage({ kind: 'chunk', id: m.id, gen: m.gen, ci: m.ci, k: m.k, data: r.data, quads: r.quads, pad: m.pad }, [r.data, m.pad.buffer]);
  } else if (m.kind === 'body') {
    const r = meshVolume(m.vox, m.sx, m.sy, m.sz, 0, 0, 0, rgba);
    postMessage({ kind: 'body', id: m.id, gen: m.gen, k: m.k, data: r.data, quads: r.quads }, [r.data]);
  }
};
