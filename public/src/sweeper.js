// The city tidies itself up: loose rubble that has been lying around for a while disappears again.
// Only single cubes and small heaps go; larger connected piles of rubble stay as ruins.
// This keeps the number of scattered voxels (and with it memory and mesh size) from growing without end.

import { EMBER } from './materials.js';

const CAP = 1 << 15; // remembered rubble voxels; when full, the oldest entries are overwritten
const AGE = 30; // seconds a loose voxel may lie around
const KEEP = 14; // connected rubble voxels from which a heap counts as a ruin and stays
const PER_STEP = 40; // checks per simulation step

export class Sweeper {
  constructor(game) {
    this.g = game;
    this.pos = new Int32Array(CAP * 3);
    this.born = new Float32Array(CAP);
    this.head = 0; this.tail = 0; // ring buffer: tail = oldest entry
    this.heap = new Int32Array(KEEP * 3);
  }

  clear() { this.head = this.tail = 0; }

  // Remembers a voxel that has just come to rest as rubble.
  add(x, y, z) {
    const i = this.head;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.born[i] = this.g.time;
    this.head = (i + 1) % CAP;
    if (this.head === this.tail) this.tail = (this.tail + 1) % CAP;
  }

  update() {
    const g = this.g;
    for (let n = 0; n < PER_STEP && this.tail !== this.head && g.time - this.born[this.tail] > AGE; n++) {
      const i = this.tail * 3;
      this.tail = (this.tail + 1) % CAP;
      this.sweep(this.pos[i], this.pos[i + 1], this.pos[i + 2]);
    }
  }

  // Collects the rubble connected to the given voxel; removes it if it is only a small heap.
  sweep(x, y, z) {
    const g = this.g, w = g.world, heap = this.heap, loose = (t) => t >= 128 && t !== EMBER;
    if (!loose(w.get(x, y, z))) return;
    let n = 1;
    heap[0] = x; heap[1] = y; heap[2] = z;
    for (let k = 0; k < n; k++) {
      const cx = heap[k * 3], cy = heap[k * 3 + 1], cz = heap[k * 3 + 2];
      for (let d = 0; d < 6; d++) {
        const nx = cx + (d === 0) - (d === 1), ny = cy + (d === 2) - (d === 3), nz = cz + (d === 4) - (d === 5);
        if (!loose(w.get(nx, ny, nz))) continue;
        let known = false;
        for (let q = 0; q < n && !known; q++) known = heap[q * 3] === nx && heap[q * 3 + 1] === ny && heap[q * 3 + 2] === nz;
        if (known) continue;
        if (n >= KEEP) return; // big enough to stay
        heap[n * 3] = nx; heap[n * 3 + 1] = ny; heap[n * 3 + 2] = nz;
        n++;
      }
    }
    for (let k = 0; k < n; k++) {
      w.set(heap[k * 3], heap[k * 3 + 1], heap[k * 3 + 2], 0);
      g.destruction.addSeeds(heap[k * 3], heap[k * 3 + 1], heap[k * 3 + 2]);
    }
  }
}
