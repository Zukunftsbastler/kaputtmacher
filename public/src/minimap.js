// The minimap: a round window onto the ground around the creature, turned so that up is where the camera looks.
// Buildings are light, the more of one is gone the more it turns orange, and whatever has been torn down is marked
// in red: with the narrow view of the camera this is where you see what is left and where you have been.
// It is drawn into a small canvas a few times per second; it can be switched off (button, key M, settings).

import { TYPE_RGBA, TYPE_FLAGS, F_TERRAIN } from './materials.js';
import { wrapDelta } from './math.js';

const CELL = 2; // ground colours are read once per 2 x 2 voxels
const WRECK = 4; // destroyed voxels are counted per 4 x 4 voxels
const REDRAW = 0.15; // seconds between pictures

export class Minimap {
  constructor(game, parent) {
    this.g = game;
    this.box = document.createElement('div');
    this.box.id = 'minimap';
    this.canvas = document.createElement('canvas');
    this.box.appendChild(this.canvas);
    parent.appendChild(this.box);
    this.ctx = this.canvas.getContext('2d');
    this.size = 0;
    this.t = 0;
    this.ground = null; this.wreck = null;
  }

  // A new world: read the colour of the ground once and start with no destruction.
  reset(w) {
    const nx = Math.ceil(w.sx / CELL), nz = Math.ceil(w.sz / CELL), g = (this.ground = new Uint8Array(nx * nz * 3));
    this.nx = nx;
    for (let cz = 0; cz < nz; cz++) for (let cx = 0; cx < nx; cx++) {
      const x = cx * CELL, z = cz * CELL;
      let top = 0;
      for (let y = 0; y < w.sy; y++) { const t = w.get(x, y, z); if (!t || !(TYPE_FLAGS[t] & F_TERRAIN)) break; top = t; }
      const i = (cx + nx * cz) * 3, k = top * 4;
      // Dimmed and a little grey, so the buildings and the red stand out.
      for (let c = 0; c < 3; c++) g[i + c] = TYPE_RGBA[k + c] * 0.42 + 30;
    }
    const wc = w.water?.tint ? w.water.tint.slice(0, 3).map((c) => c * 200) : [40, 90, 150]; // clear or murky
    if (w.water) for (const r of w.water.rects) for (let z = r[1]; z < r[3]; z += CELL) for (let x = r[0]; x < r[2]; x += CELL) g.set(wc, ((x / CELL | 0) + nx * (z / CELL | 0)) * 3);
    this.wx = Math.ceil(w.sx / WRECK);
    this.wreck = new Uint16Array(this.wx * Math.ceil(w.sz / WRECK));
    this.t = 0;
  }

  // Called for every voxel of a building or prop that is destroyed.
  hit(x, z) {
    const w = this.g.world;
    if (!this.wreck) return;
    if (w.wrap) { x &= w.mx; z &= w.mz; }
    const i = (x >> 2) + this.wx * (z >> 2);
    if (i >= 0 && i < this.wreck.length && this.wreck[i] < 65000) this.wreck[i]++;
  }

  get on() { return this.g.progress.settings.minimap; }

  update(dt) {
    this.box.classList.toggle('hidden', !this.on);
    if (!this.on || !this.ground || (this.t -= dt) > 0) return;
    this.t = REDRAW;
    const css = this.box.clientWidth;
    if (!css) return;
    if (css !== this.size) { this.size = this.canvas.width = this.canvas.height = css; this.img = this.ctx.createImageData(css, css); }
    this.draw();
  }

  draw() {
    const g = this.g, w = g.world, m = g.monster, N = this.size, px = this.img.data, half = N / 2;
    const S = w.sx, wrap = w.wrap;
    // How far it reaches grows with the creature: two or three blocks around a small one, a district around a giant.
    const R = Math.min(Math.max(150, m.h * 8 + 120), (Math.min(w.sx, w.sz) >> 1) - 8), k = R / half;
    const yaw = g.camYaw, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = -fz, rz = fx; // forward and right on the ground
    const ox = g.fly ? g.flyPos[0] : m.x, oz = g.fly ? g.flyPos[2] : m.z;
    const st = w.structures, fp = w.footprint, gr = this.ground, nx = this.nx, wr = this.wreck, wx = this.wx;
    const flash = (g.time * 2) & 1;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const o = (i + N * j) * 4, a = i - half + 0.5, b = half - j - 0.5;
      if (a * a + b * b > half * half) { px[o + 3] = 0; continue; }
      let x = Math.floor(ox + (a * rx + b * fx) * k), z = Math.floor(oz + (a * rz + b * fz) * k);
      if (wrap) { x &= w.mx; z &= w.mz; } else if (x < 0 || z < 0 || x >= w.sx || z >= w.sz) { px[o] = 20; px[o + 1] = 22; px[o + 2] = 30; px[o + 3] = 230; continue; }
      const q = ((x / CELL | 0) + nx * (z / CELL | 0)) * 3;
      let r = gr[q], gg = gr[q + 1], bb = gr[q + 2];
      const s = st[fp[x + S * z]];
      if (s && s.id && s.total > 0) {
        const left = s.remaining / s.total, tall = Math.min(1, (s.top - (s.y0 ?? 0)) / 160);
        if (s.done) { r = 95; gg = 38; bb = 34; } // torn down
        else if (s.major) { // buildings: light, the taller the lighter; orange as they lose substance
          const base = 165 + 80 * tall, d = Math.min(1, (1 - left) * 2.2);
          r = base + (255 - base) * d; gg = base - (base - 150) * d; bb = base + 8 - (base - 40) * d;
        } else if (s.kind === 'tree') { r = 58; gg = 120; bb = 52; } // trees: dark green
        else { r = (r + 150) >> 1; gg = (gg + 158) >> 1; bb = (bb + 150) >> 1; } // other props: cars, lamps, benches
      }
      // Red where things have been destroyed: the more, the stronger.
      const n = wr[(x >> 2) + wx * (z >> 2)];
      if (n) { const t = Math.min(0.85, 0.25 + n / 40); r += (240 - r) * t; gg += (40 - gg) * t; bb += (30 - bb) * t; }
      px[o] = r; px[o + 1] = gg; px[o + 2] = bb; px[o + 3] = 235;
    }
    const ctx = this.ctx;
    ctx.putImageData(this.img, 0, 0);
    // Things that move or burn, as dots on top.
    const dot = (x, z, size, col) => {
      const dx = wrap ? wrapDelta(x - ox, S) : x - ox, dz = wrap ? wrapDelta(z - oz, w.sz) : z - oz;
      const a = (dx * rx + dz * rz) / k, b = (dx * fx + dz * fz) / k;
      if (a * a + b * b > (half - size) ** 2) return;
      ctx.fillStyle = col;
      ctx.fillRect(Math.round(half + a - size / 2), Math.round(half - b - size / 2), size, size);
    };
    const f = g.fire;
    for (let i = 0; i < f.n; i += Math.max(1, f.n >> 7)) dot(f.cx[i], f.cz[i], 2, flash ? '#ffb02e' : '#ff6a1a');
    for (const sp of f.spots) if (sp.flames) dot(sp.x, sp.z, 3, '#ff8a1a');
    const COL = { police: flash ? '#3d7bff' : '#ff3b3b', fire: '#ff3b2e' };
    for (const c of g.actors.units) dot(c.x, c.z, 4, COL[c.kind] ?? '#9fb36a');
    for (const h of g.actors.helis) dot(h.x, h.z, 3, '#f2f2f2');
    for (const c of g.traffic.cars) dot(c.x, c.z, 2, '#d9dde3');
    // The creature: an arrow in the middle, pointing where it faces (the map turns with the camera).
    const turn = yaw - m.heading;
    ctx.save();
    ctx.translate(half, half);
    ctx.rotate(turn);
    ctx.beginPath();
    ctx.moveTo(0, -9); ctx.lineTo(6.5, 7); ctx.lineTo(0, 3.5); ctx.lineTo(-6.5, 7); ctx.closePath();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = '#1b1b24'; ctx.lineWidth = 2.5;
    ctx.stroke(); ctx.fill();
    ctx.restore();
  }
}
