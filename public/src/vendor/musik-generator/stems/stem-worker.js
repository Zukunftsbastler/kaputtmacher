// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Web Worker for render-on-load: composes the stems of an adaptive
 * description, posts the manifest at once and then the files job by job
 * (initial state first), transferring the audio buffers.
 *
 * Protocol (main → worker): { type: 'render', description, sampleRate }
 * (worker → main): { type: 'manifest', manifest } · { type: 'progress', fraction, label }
 *   · { type: 'files', files: { name: [left, right] } } · { type: 'done' } · { type: 'error', message }
 */

import { planStems } from './render-stems.js';

const scope = /** @type {any} */ (globalThis);

scope.onmessage = (/** @type {MessageEvent} */ event) => {
  const msg = event.data;
  if (msg?.type !== 'render') return;
  try {
    const { manifest, jobs } = planStems(msg.description, { sampleRate: msg.sampleRate });
    scope.postMessage({ type: 'manifest', manifest });
    const total = jobs.reduce((a, j) => a + j.weight, 0) || 1;
    let done = 0;
    for (const job of jobs) {
      scope.postMessage({ type: 'progress', fraction: done / total, label: job.label });
      const files = job.run();
      /** @type {ArrayBuffer[]} */
      const transfer = [];
      for (const ch of Object.values(files)) for (const c of ch) transfer.push(/** @type {ArrayBuffer} */ (c.buffer));
      if (job.state !== null && manifest.loudness) scope.postMessage({ type: 'loudness', loudness: manifest.loudness });
      scope.postMessage({ type: 'files', files }, transfer);
      done += job.weight;
    }
    scope.postMessage({ type: 'progress', fraction: 1, label: 'fertig' });
    scope.postMessage({ type: 'done' });
  } catch (err) {
    scope.postMessage({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
