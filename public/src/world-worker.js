// The world worker (Game.loadWorldAway): builds a world from its blueprint away from the game's own thread, so that
// the page stays alive meanwhile. A world is pure data; its chunks are handed over without being copied.

import { WORLDS } from './worldgen.js';

onmessage = (e) => {
  const { id, index, seed, quality, mix } = e.data;
  try {
    const w = WORLDS[index].make(seed, quality, mix);
    w.finalize();
    const transfer = [];
    for (const c of w.chunks) if (c) transfer.push(c.buffer);
    postMessage({ id, world: w }, transfer);
  } catch (err) {
    postMessage({ id, error: String(err?.stack ?? err) });
  }
};
