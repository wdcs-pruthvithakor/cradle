// Game state creation and small shared helpers. State is plain JSON — no class instances,
// no functions — so it can be saved, hashed, diffed, or sent over a network later.
import { hashSeed, rand, pick } from './rng.js';
import { generateWorld } from './world-gen.js';
import { within } from './hex.js';
import { ERAS } from '../content/techs.js';
import { townName, CIV_NAMES } from '../content/names.js';

export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const RES_KEYS = ['food', 'wood', 'stone', 'ore', 'knowledge', 'gold'];

export function createGame(seedText = 'cradle', opts = {}) {
  const seed = hashSeed(String(seedText));
  const { W, H, tiles, start } = generateWorld(seed, opts.W || 48, opts.H || 32);
  const s = {
    v: 1, seedText: String(seedText), seed, rng: seed ^ 0x9e3779b9,
    tick: 0, year: -4000, era: 0,
    W, H, tiles,
    civName: '',
    res: { food: 30, wood: 25, stone: 5, ore: 0, knowledge: 0, gold: 10 },
    flow: { food: 0, wood: 0, stone: 0, ore: 0, knowledge: 0, gold: 0 },
    settlements: [],
    labor: { food: 45, wood: 25, stone: 10, ore: 0, knowledge: 15, gold: 5 },
    techs: ['foraging'], research: null, banked: 0,
    policies: ['council'],
    wonders: [],
    mods: [],
    pending: null, nextEventTick: 10,
    camps: [], nextCampTick: 36,
    chronicle: [], achievements: [],
    stats: { built: 0, raidsRepelled: 0, campsCleared: 0, lastRaidYear: -4000, seen: 0, peakPop: 0, famines: 0 },
    nextId: 1, score: 0
  };
  s.civName = pick(() => rand(s), CIV_NAMES);
  foundTown(s, start, 3, true);
  writeChronicle(s, `${s.civName} settled by the water and named their first home ${s.settlements[0].name}.`, 'founding');
  return s;
}

export function foundTown(s, tile, pop, capital = false) {
  const name = townName(() => rand(s), s.settlements.map(t => t.name));
  const town = { id: s.nextId++, name, tile, pop, grow: 0, queue: [], buildings: {}, happy: 65, health: 75, defense: 2, founded: s.tick, capital };
  s.settlements.push(town);
  claimTerritory(s, town);
  return town;
}

export const territoryRadius = pop => pop >= 10 ? 3 : pop >= 5 ? 2 : 1;

export function claimTerritory(s, town) {
  for (const j of within(s.W, s.H, town.tile, territoryRadius(town.pop))) {
    const t = s.tiles[j];
    if (t.own === -1 || j === town.tile) t.own = town.id; // first come, first served
  }
  reveal(s, town.tile, territoryRadius(town.pop) + 2);
}

export function reveal(s, tile, radius) {
  for (const j of within(s.W, s.H, tile, radius)) if (!s.tiles[j].seen) { s.tiles[j].seen = true; s.stats.seen++; }
}

export const eraOf = s => ERAS[s.era];
export function formatYear(y) {
  const n = Math.round(y);
  return n < 0 ? `${-n} BCE` : n === 0 ? '1 CE' : `${n} CE`;
}
export const seasonOf = s => s.tick % 4;
export const dateLabel = s => `${SEASONS[seasonOf(s)]}, ${formatYear(s.year)}`;

export function writeChronicle(s, text, kind = 'note') {
  s.chronicle.push({ tick: s.tick, year: Math.round(s.year), text, kind });
  if (s.chronicle.length > 400) s.chronicle.splice(0, s.chronicle.length - 400);
}

export const townById = (s, id) => s.settlements.find(t => t.id === id);
export const totalPop = s => s.settlements.reduce((n, t) => n + t.pop, 0);

export function canAfford(s, cost = {}) { return Object.entries(cost).every(([k, v]) => (s.res[k] || 0) >= v); }
export function pay(s, cost = {}, mult = 1) { for (const [k, v] of Object.entries(cost)) s.res[k] -= v * mult; }
export function refund(s, cost = {}, frac = .5) { for (const [k, v] of Object.entries(cost)) s.res[k] += Math.floor(v * frac); }

/** Sum of active temporary modifiers for `key` (from events). */
export const modSum = (s, key) => s.mods.reduce((n, m) => n + (m.key === key && m.until > s.tick ? m.value : 0), 0);

/** Stable hash of the whole state — used by tests (and later by multiplayer clients) to detect desync. */
export function stateHash(s) {
  const str = JSON.stringify(s);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(16);
}
