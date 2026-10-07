// Seeded RNG whose entire state lives in the game state (so a game replays identically).
// mulberry32: tiny, fast, good enough for gameplay.

export function hashSeed(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Advance the RNG stored in `s.rng` and return a float in [0, 1). */
export function rand(s) {
  let a = (s.rng = (s.rng + 0x6D2B79F5) >>> 0);
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** A standalone generator (used during world generation, before state exists). */
export function makeRng(seed) {
  const box = { rng: seed >>> 0 };
  return () => rand(box);
}

export const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
