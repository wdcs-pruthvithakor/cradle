// Per-settlement economy. `townReport` is pure: it reads state and returns numbers, and is used
// both by the simulation tick and by the UI (so what you see is exactly what happens).
import { TERRAIN, RIVER_BONUS, RESOURCES, IMPROVEMENTS } from '../content/terrain.js';
import { BUILDINGS, WONDERS } from '../content/buildings.js';
import { TECH_FX, POLICIES } from '../content/techs.js';
import { modSum, seasonOf } from './state.js';

const TILE_KEYS = ['food', 'wood', 'stone', 'ore', 'gold'];
const SEASON_FOOD = [1, 1.15, 1.1, .7];

/** Yields of one tile for a given owner town (includes river, resource, improvement, harbor). */
export function tileYield(s, i, town) {
  const t = s.tiles[i], y = { ...TERRAIN[t.t].yields };
  const add = o => { for (const k in o) y[k] = (y[k] || 0) + o[k]; };
  if (t.riv) add(RIVER_BONUS);
  if (t.res) add(RESOURCES[t.res].yields);
  if (t.imp) add(IMPROVEMENTS[t.imp].yields);
  if (town && TERRAIN[t.t].water && town.buildings.harbor) add({ food: 1 });
  return y;
}

/** Sum an effect key over buildings in a town, plus global wonders, techs, policies and event modifiers. */
export function effect(s, town, key) {
  let v = 0;
  if (town) {
    for (const [id, n] of Object.entries(town.buildings)) {
      const b = BUILDINGS[id] || WONDERS[id];
      if (b && b.fx[key]) v += b.fx[key] * (BUILDINGS[id] ? n : 1);
    }
  }
  for (const w of s.wonders) if (WONDERS[w].global[key]) v += WONDERS[w].global[key];
  for (const t of s.techs) if (TECH_FX[t] && TECH_FX[t][key]) v += TECH_FX[t][key];
  for (const p of s.policies) if (POLICIES[p].fx[key]) v += POLICIES[p].fx[key];
  return v + modSum(s, key);
}

/** Split `n` workers across categories in proportion to the civ's labor weights. */
function allocate(n, weights) {
  const keys = Object.keys(weights), total = keys.reduce((a, k) => a + weights[k], 0) || 1;
  const raw = keys.map(k => n * weights[k] / total), out = {};
  let left = n;
  keys.forEach((k, i) => { out[k] = Math.floor(raw[i]); left -= out[k]; });
  keys.map((k, i) => [k, raw[i] - out[k]]).sort((a, b) => b[1] - a[1]).slice(0, left).forEach(([k]) => out[k]++);
  return out;
}

export function townReport(s, town) {
  const owned = [];
  s.tiles.forEach((t, i) => { if (t.own === town.id && i !== town.tile) owned.push(i); });
  const jobs = allocate(town.pop, s.labor);
  const used = new Set(), worked = [], y = { food: 0, wood: 0, stone: 0, ore: 0, gold: 0, knowledge: 0 };
  const addY = o => { for (const k in o) y[k] = (y[k] || 0) + o[k]; };

  // town center is always worked, plus a little of everything
  addY(tileYield(s, town.tile, town)); addY({ food: 1, wood: 1, knowledge: 1 + town.pop * .1 });

  // tile jobs: most-weighted category picks its best tiles first
  let idle = 0;
  for (const k of ['food', 'wood', 'stone', 'ore'].sort((a, b) => s.labor[b] - s.labor[a])) {
    const cands = owned.filter(i => !used.has(i)).map(i => [i, tileYield(s, i, town)]).filter(([, ty]) => (ty[k] || 0) > 0)
      .sort((a, b) => (b[1][k] - a[1][k]) || ((b[1].food || 0) - (a[1].food || 0)));
    const take = Math.min(jobs[k], cands.length);
    for (let j = 0; j < take; j++) { used.add(cands[j][0]); worked.push(cands[j][0]); addY(cands[j][1]); }
    const left = jobs[k] - take;
    idle += left; y[k] += left * .5; // no free tile: forage what they can of that resource
  }
  y.knowledge += jobs.knowledge * 1;
  y.gold += jobs.gold * 1;

  // multipliers
  const season = seasonOf(s);
  const happyRaw = 72 - town.pop * 1.6 - (s.settlements.length - 1) * 2 + effect(s, town, 'happy');
  const happy = Math.max(0, Math.min(100, Math.round(happyRaw)));
  const unrest = happy < 30 ? .8 : 1;
  const prod = (1 + effect(s, town, 'prodPct')) * unrest;
  y.food *= (1 + effect(s, town, 'foodPct')) * SEASON_FOOD[season] * unrest;
  y.wood *= prod; y.stone *= prod; y.ore *= prod;
  y.knowledge = (y.knowledge + effect(s, town, 'knowledge')) * (1 + effect(s, town, 'knowledgePct')) * unrest;
  y.gold = (y.gold + effect(s, town, 'gold')) * (1 + effect(s, town, 'goldPct')) * unrest;
  for (const k in y) y[k] = Math.round(y[k] * 10) / 10;

  const eat = Math.round(town.pop * (1 + effectPolicy(s, 'foodUse')) * 10) / 10;
  const nearWater = s.tiles[town.tile].riv || owned.some(i => TERRAIN[s.tiles[i].t].water);
  const health = Math.max(0, Math.min(100, Math.round(78 - town.pop * 1.8 + (nearWater ? 5 : 0) + effect(s, town, 'health'))));
  const housing = 5 + effect(s, town, 'housing');
  const defense = Math.round(3 + town.pop * .4 + effect(s, town, 'defense'));
  return { yields: y, eat, surplus: Math.round((y.food - eat) * 10) / 10, jobs, idle, worked, owned, happy, health, housing, defense, unrest: unrest < 1, growNeed: 8 + town.pop * 3 };
}
const effectPolicy = (s, key) => s.policies.reduce((n, p) => n + (POLICIES[p].fx[key] || 0), 0);

export function civStorage(s) {
  return 80 + s.settlements.length * 40 + s.settlements.reduce((n, t) => n + (t.buildings.granary ? BUILDINGS.granary.fx.storage : 0), 0);
}

/** Warehouses are implicit: each settlement can store a share of wood, stone and ore. */
export const materialCap = s => 200 + s.settlements.length * 100;

export function civReport(s) {
  const towns = s.settlements.map(t => ({ town: t, r: townReport(s, t) }));
  const flow = { food: 0, wood: 0, stone: 0, ore: 0, knowledge: 0, gold: 0 };
  for (const { r } of towns) { for (const k in flow) flow[k] += r.yields[k] || 0; flow.food -= r.eat; }
  for (const k in flow) flow[k] = Math.round(flow[k] * 10) / 10;
  return { towns, flow, storage: civStorage(s), materialCap: materialCap(s) };
}

export { TILE_KEYS };
