// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Prof. Dr. Till Albert
// @ts-check

/**
 * Variety within a style. A style fixes instruments, grooves and patterns, so
 * pieces that differ only in their seed share one sound. With the recipe
 * field `variety` (0…1) the seed also chooses from the alternatives a style
 * offers per role (`variants`: other instruments, patterns, comping, melodic
 * profiles) and from a wider tempo range. 0 leaves the style as designed.
 */

/**
 * @param {import('./styles.js').Style} style
 * @param {number} variety 0…1: probability per role to take one of its alternatives
 * @param {import('../core/prng.js').Rng} rng
 * @returns {{ style: import('./styles.js').Style, chosen: string[] }} the varied style and what was changed
 */
export function applyVariety(style, variety, rng) {
  if (!(variety > 0) || !style.variants) return { style, chosen: [] };
  /** @type {Record<string, any>} */
  const roles = { ...style.roles };
  /** @type {string[]} */
  const chosen = [];
  for (const [role, alternatives] of Object.entries(style.variants)) {
    const r = rng.fork(role);
    if (!roles[role] || alternatives.length === 0 || r.float() >= variety) continue;
    const alt = r.pick(alternatives);
    roles[role] = { ...roles[role], ...alt };
    chosen.push(`${role}: ${Object.entries(alt).map(([k, v]) => (typeof v === 'string' ? v : k)).join(', ')}`);
  }
  const [lo, hi] = style.tempo;
  const widen = 0.08 * variety;
  return {
    style: { ...style, roles: /** @type {any} */ (roles), tempo: [Math.round(lo * (1 - widen)), Math.round(hi * (1 + widen))] },
    chosen,
  };
}
