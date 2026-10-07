// Every player action is a plain JSON command validated here. The UI never mutates state directly,
// which is what will let a server run the same rules for a shared world later.
import { BUILDINGS, WONDERS } from '../content/buildings.js';
import { IMPROVEMENTS, TERRAIN } from '../content/terrain.js';
import { TECHS, POLICIES, policySlots } from '../content/techs.js';
import { distance, neighbors } from './hex.js';
import { rand } from './rng.js';
import { canAfford, pay, refund, townById, foundTown, reveal, writeChronicle } from './state.js';
import { resolveEvent } from './events.js';
import { expeditionStrength, EXPEDITION_COST } from './threats.js';

const fail = error => ({ ok: false, error });
const okRes = (text, extra = {}) => ({ ok: true, events: text ? [{ type: 'toast', text }] : [], ...extra });

export const FOUND_COST = { food: 25, wood: 20 };
export const SCOUT_COST = { food: 8, gold: 4 };
export const MAX_QUEUE = 3;

const isCoastal = (s, town) => neighbors(s.W, s.H, town.tile).some(j => TERRAIN[s.tiles[j].t].water);

export const techAvailable = (s, id) => !s.techs.includes(id) && TECHS[id].req.every(r => s.techs.includes(r));

/** Why a building can't be queued in `town` (or null if it can). */
export function buildBlocker(s, town, id, wonder = false) {
  const b = wonder ? WONDERS[id] : BUILDINGS[id];
  if (!b) return 'Unknown building.';
  if (b.tech && !s.techs.includes(b.tech)) return `Requires ${TECHS[b.tech].name}.`;
  if (b.coastal && !isCoastal(s, town)) return 'Must be built on the coast.';
  const queued = town.queue.filter(q => q.id === id).length;
  if (wonder) {
    if (s.wonders.includes(id) || s.settlements.some(t => t.queue.some(q => q.id === id))) return 'Already built or under construction.';
  } else if ((town.buildings[id] || 0) + queued >= (b.max || 1)) return b.max ? 'Maximum built.' : 'Already built.';
  if (town.queue.length >= MAX_QUEUE) return 'Build queue is full.';
  if (!canAfford(s, b.cost)) return 'Not enough resources.';
  return null;
}

export function improveBlocker(s, tile, id) {
  const t = s.tiles[tile], imp = IMPROVEMENTS[id];
  if (!imp) return 'Unknown improvement.';
  if (t.own === -1) return 'Outside your territory.';
  const town = townById(s, t.own);
  if (town && town.tile === tile) return 'That is the town center.';
  if (imp.tech && !s.techs.includes(imp.tech)) return `Requires ${TECHS[imp.tech].name}.`;
  if (!imp.on.includes(t.t) || (imp.needs && !imp.needs(t))) return `Can't be built on ${TERRAIN[t.t].name.toLowerCase()}${t.t === 'desert' ? ' without a river' : ''}.`;
  if (t.imp) return 'Tile already improved.';
  if (s.settlements.some(x => x.queue.some(q => q.tile === tile))) return 'Already being built.';
  if (town.queue.length >= MAX_QUEUE) return `${town.name}'s build queue is full.`;
  if (!canAfford(s, imp.cost)) return 'Not enough resources.';
  return null;
}

export function foundBlocker(s, tile) {
  const t = s.tiles[tile];
  if (!t || !t.seen) return 'You have not explored that land.';
  if (TERRAIN[t.t].water || t.t === 'mountain') return 'Settlements need open land.';
  if (s.settlements.some(x => distance(s.W, x.tile, tile) < 4)) return 'Too close to another settlement (min. 4 tiles).';
  if (s.camps.some(c => c.tile === tile)) return 'Raiders are camped there.';
  const src = foundSource(s, tile);
  if (!src) return 'Settlers must come from a town of 4+ within 10 tiles.';
  if (!canAfford(s, FOUND_COST)) return 'Not enough resources.';
  return null;
}
export const foundSource = (s, tile) => s.settlements.filter(x => x.pop >= 4 && distance(s.W, x.tile, tile) <= 10).sort((a, b) => b.pop - a.pop)[0];

export function scoutBlocker(s, tile) {
  const t = s.tiles[tile];
  if (!t) return 'Nowhere.';
  if (!s.tiles.some((u, i) => u.seen && distance(s.W, i, tile) <= 3)) return 'Too far from known land.';
  if (!canAfford(s, SCOUT_COST)) return 'Not enough resources.';
  return null;
}

export function applyCommand(s, cmd) {
  switch (cmd && cmd.type) {
    case 'labor': {
      const w = {};
      for (const k of ['food', 'wood', 'stone', 'ore', 'knowledge', 'gold']) w[k] = Math.max(0, Math.min(100, Math.round(+cmd.weights?.[k] || 0)));
      if (!Object.values(w).some(v => v > 0)) return fail('At least one job needs workers.');
      s.labor = w; return okRes();
    }
    case 'research': {
      if (!TECHS[cmd.tech]) return fail('Unknown technology.');
      if (!techAvailable(s, cmd.tech)) return fail('Prerequisites not met.');
      const carried = s.research ? s.research.progress : 0;
      s.research = { id: cmd.tech, progress: carried + s.banked }; s.banked = 0;
      return okRes(`Researching ${TECHS[cmd.tech].name}.`);
    }
    case 'build': case 'wonder': {
      const town = townById(s, cmd.town), wonder = cmd.type === 'wonder';
      if (!town) return fail('Unknown settlement.');
      const why = buildBlocker(s, town, cmd.id, wonder); if (why) return fail(why);
      const b = wonder ? WONDERS[cmd.id] : BUILDINGS[cmd.id];
      pay(s, b.cost);
      town.queue.push({ kind: wonder ? 'wonder' : 'building', id: cmd.id, progress: 0, time: b.time, cost: b.cost });
      return okRes(`${town.name}: ${b.name} queued.`);
    }
    case 'improve': {
      const why = improveBlocker(s, cmd.tile, cmd.id); if (why) return fail(why);
      const imp = IMPROVEMENTS[cmd.id], town = townById(s, s.tiles[cmd.tile].own);
      pay(s, imp.cost);
      town.queue.push({ kind: 'improvement', id: cmd.id, tile: cmd.tile, progress: 0, time: imp.time, cost: imp.cost });
      return okRes(`${imp.name} queued in ${town.name}.`);
    }
    case 'cancel': {
      const town = townById(s, cmd.town); if (!town || !town.queue[cmd.index]) return fail('Nothing to cancel.');
      const [job] = town.queue.splice(cmd.index, 1); refund(s, job.cost, .5);
      return okRes('Cancelled — half the materials recovered.');
    }
    case 'found': {
      const why = foundBlocker(s, cmd.tile); if (why) return fail(why);
      const src = foundSource(s, cmd.tile);
      pay(s, FOUND_COST); src.pop -= 2;
      const town = foundTown(s, cmd.tile, 2);
      writeChronicle(s, `Settlers from ${src.name} founded ${town.name}.`, 'founding');
      return okRes(`${town.name} founded!`, { town: town.id });
    }
    case 'scout': {
      const why = scoutBlocker(s, cmd.tile); if (why) return fail(why);
      pay(s, SCOUT_COST); reveal(s, cmd.tile, 3);
      return okRes('Scouts mapped new land.');
    }
    case 'policy': {
      const p = POLICIES[cmd.id]; if (!p) return fail('Unknown policy.');
      if (s.policies.includes(cmd.id)) { s.policies = s.policies.filter(x => x !== cmd.id); return okRes(`${p.name} repealed.`); }
      if (p.tech && !s.techs.includes(p.tech)) return fail(`Requires ${TECHS[p.tech].name}.`);
      if (s.policies.length >= policySlots(s.era, s.techs)) return fail('No free policy slot — repeal one first.');
      s.policies.push(cmd.id);
      writeChronicle(s, `The council adopted ${p.name.toLowerCase()}.`, 'policy');
      return okRes(`${p.name} enacted.`);
    }
    case 'choose': return resolveEvent(s, cmd.choice);
    case 'attack': {
      const camp = s.camps.find(c => c.id === cmd.camp); if (!camp) return fail('That camp is gone.');
      const cost = EXPEDITION_COST(s), str = expeditionStrength(s, camp);
      if (!str) return fail('No settlement close enough to send warriors.');
      if (!canAfford(s, cost)) return fail('Not enough resources.');
      pay(s, cost);
      if (str + rand(s) * 4 > camp.str + rand(s) * 3) {
        s.camps = s.camps.filter(c => c !== camp); s.res.gold += 25; s.stats.campsCleared++;
        writeChronicle(s, 'Our warriors drove the raiders from their camp and returned with plunder.', 'war');
        return okRes('Camp destroyed! +25 gold.');
      }
      camp.str += 1;
      writeChronicle(s, 'An expedition against the raiders was beaten back.', 'war');
      return { ok: true, events: [{ type: 'bad', text: 'The expedition failed.' }] };
    }
    case 'rename': {
      const town = townById(s, cmd.town), name = String(cmd.name || '').trim().slice(0, 20);
      if (!town || !name) return fail('Invalid name.');
      writeChronicle(s, `${town.name} was renamed ${name}.`, 'note'); town.name = name; return okRes();
    }
    default: return fail('Unknown command.');
  }
}
