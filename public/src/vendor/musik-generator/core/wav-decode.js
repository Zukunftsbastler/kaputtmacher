// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * WAV decoder (PCM 8/16/24/32 bit, float 32 bit) for untrusted input. Lives in
 * core/ so that the stem player can decode stems at their own sample rate
 * (decodeAudioData would resample to the context rate and use more memory).
 */

/**
 * @typedef {object} DecodedAudio
 * @property {number} sampleRate
 * @property {Float32Array[]} channels
 */

/**
 * Decodes PCM (8/16/24/32-bit) and 32-bit float WAV files, incl. WAVE_FORMAT_EXTENSIBLE.
 * Lengths are validated against the buffer, so malformed files cannot cause
 * oversized allocations.
 * @param {Uint8Array} bytes
 * @returns {DecodedAudio & { format: string, bits: number }}
 */
export function decodeWav(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (/** @type {number} */ off) => String.fromCharCode(bytes[off], bytes[off + 1], bytes[off + 2], bytes[off + 3]);
  if (bytes.length < 12 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new SyntaxError('decodeWav: not a RIFF/WAVE file');
  let o = 12;
  /** @type {{ formatTag: number, numCh: number, sampleRate: number, bits: number } | null} */
  let fmt = null;
  /** @type {{ offset: number, length: number } | null} */
  let data = null;
  while (o + 8 <= bytes.length) {
    const id = tag(o);
    const size = view.getUint32(o + 4, true);
    const body = o + 8;
    if (body + size > bytes.length) {
      if (id === 'data') data = { offset: body, length: bytes.length - body }; // tolerate truncated data
      break;
    }
    if (id === 'fmt ') {
      if (size < 16) throw new SyntaxError('decodeWav: fmt chunk too small');
      let formatTag = view.getUint16(body, true);
      if (formatTag === 0xfffe && size >= 26) formatTag = view.getUint16(body + 24, true); // extensible sub-format
      fmt = {
        formatTag,
        numCh: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bits: view.getUint16(body + 14, true),
      };
    } else if (id === 'data') {
      data = { offset: body, length: size };
    }
    o = body + size + (size & 1);
  }
  if (!fmt || !data) throw new SyntaxError('decodeWav: missing fmt or data chunk');
  const { formatTag, numCh, sampleRate, bits } = fmt;
  if (numCh < 1 || numCh > 32 || sampleRate < 1) throw new SyntaxError('decodeWav: invalid channel count or sample rate');
  const isFloat = formatTag === 3 && bits === 32;
  if (!isFloat && !(formatTag === 1 && [8, 16, 24, 32].includes(bits))) {
    throw new SyntaxError(`decodeWav: unsupported format tag ${formatTag} / ${bits} bit`);
  }
  const bps = bits / 8;
  const frames = Math.floor(data.length / (bps * numCh));
  const channels = Array.from({ length: numCh }, () => new Float32Array(frames));
  let p = data.offset;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numCh; c++, p += bps) {
      let x;
      if (isFloat) x = view.getFloat32(p, true);
      else if (bits === 8) x = (bytes[p] - 128) / 128;
      else if (bits === 16) x = view.getInt16(p, true) / 32768;
      else if (bits === 24) x = (((bytes[p + 2] << 24) | (bytes[p + 1] << 16) | (bytes[p] << 8)) >> 8) / 8388608;
      else x = view.getInt32(p, true) / 2147483648;
      channels[c][i] = x;
    }
  }
  return { sampleRate, channels, format: isFloat ? 'float32' : `pcm${bits}`, bits };
}
