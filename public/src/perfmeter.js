// A small measuring display for testing on devices without a console (?perf=1 in the address; never saved).
// It shows where the time of a picture goes, averaged (see Game.frame): simulation, meshing, drawing, the whole
// picture and the worst picture of the last second, plus the number of things that cost time.

export class PerfMeter {
  constructor(game, root) {
    this.g = game;
    this.box = document.createElement('pre');
    this.box.id = 'perf';
    root.appendChild(this.box);
    this.t = 0;
  }

  update(dt) {
    if ((this.t += dt) < 0.25) return;
    this.t = 0;
    const g = this.g, p = g.perf, f = (v) => v.toFixed(1).padStart(5);
    const heap = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1e6) + ' MB' : '–';
    this.box.textContent =
      `frame ${f(p.total)} ms  worst ${f(p.lastWorst)}\n` +
      `sim   ${f(p.sim)}   mesh ${f(p.mesh)}   draw ${f(p.draw)}\n` +
      `fps   ${f(1000 / Math.max(1, g.frameMs))}   queue ${g.meshQueue?.pending ?? g.world.dirty.size}\n` +
      `bodies ${g.bodies.list.length}  debris ${g.debris.n}  chunks ${g.drawn}/${g.chunkMeshes.size}\n` +
      `detail ${g.detail}  pixel ${g.renderer.pixelScale.toFixed(2)}  heap ${heap}`;
  }
}
