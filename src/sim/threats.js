// Raider camps: spawn in the wilds, grow, and raid the nearest settlement.
import { rand } from './rng.js';
import { distance } from './hex.js';
import { TERRAIN } from '../content/terrain.js';
import { writeChronicle } from './state.js';
import { townReport } from './economy.js';

export const MAX_CAMPS = s => 1 + Math.min(3, s.era);

export function spawnCamps(s) {
  if (s.tick < s.nextCampTick) return null;
  s.nextCampTick = s.tick + 22 + Math.floor(rand(s) * 18);
  if (s.camps.length >= MAX_CAMPS(s)) return null;
  const cands = [];
  s.tiles.forEach((t, i) => {
    if (TERRAIN[t.t].water || t.t === 'mountain' || t.own !== -1) return;
    const d = Math.min(...s.settlements.map(x => distance(s.W, i, x.tile)));
    if (d >= 5 && d <= 11 && !s.camps.some(c => c.tile === i)) cands.push(i);
  });
  if (!cands.length) return null;
  const tile = cands[Math.floor(rand(s) * cands.length)];
  const camp = { id: s.nextId++, tile, str: Math.round(2 + s.era * 3 + s.tick / 60), nextRaid: s.tick + 10 + Math.floor(rand(s) * 8) };
  s.camps.push(camp);
  return { type: 'warn', text: s.tiles[tile].seen ? 'Raiders have made camp nearby.' : 'Scouts report smoke from a raider camp in the wilds.' };
}

export function raids(s) {
  const out = [];
  for (const camp of s.camps) {
    if (s.tick < camp.nextRaid) continue;
    camp.nextRaid = s.tick + 9 + Math.floor(rand(s) * 8);
    const targets = s.settlements.map(t => [t, distance(s.W, camp.tile, t.tile)]).filter(([, d]) => d <= 11).sort((a, b) => a[1] - b[1]);
    if (!targets.length) continue;
    const town = targets[0][0], def = townReport(s, town).defense, atk = camp.str + rand(s) * 4;
    s.tiles[camp.tile].seen = true; // you learn where they came from
    if (def >= atk) {
      s.stats.raidsRepelled++; camp.str = Math.max(2, camp.str - 1);
      if (s.stats.raidsRepelled % 3 === 1) writeChronicle(s, `Raiders broke against the defenders of ${town.name}.`, 'war');
      out.push({ type: 'good', text: `${town.name} repelled a raid.` });
    } else {
      const lostGold = Math.min(s.res.gold, Math.round(8 + camp.str * 1.5)), lostFood = Math.min(s.res.food, Math.round(12 + camp.str * 2));
      s.res.gold -= lostGold; s.res.food -= lostFood;
      if (town.pop > 2 && rand(s) < .5) town.pop--;
      s.mods.push({ key: 'happy', value: -5, until: s.tick + 4 });
      s.stats.lastRaidYear = s.year; camp.str += .5;
      camp.nextRaid += 8; // raiders lie low after a successful raid
      writeChronicle(s, `Raiders sacked the outskirts of ${town.name}, carrying off ${Math.round(lostFood)} food and ${Math.round(lostGold)} gold.`, 'war');
      out.push({ type: 'bad', text: `Raiders struck ${town.name}!` });
    }
  }
  return out;
}

/** Strength you can field against a camp: best nearby town defense plus bronze/iron weapons. */
export function expeditionStrength(s, camp) {
  const near = s.settlements.filter(t => distance(s.W, t.tile, camp.tile) <= 8);
  if (!near.length) return 0;
  return Math.max(...near.map(t => townReport(s, t).defense)) + 2 + (s.techs.includes('bronze') ? 3 : 0) + (s.techs.includes('iron') ? 3 : 0);
}
export const EXPEDITION_COST = s => s.techs.includes('bronze') ? { ore: 10, gold: 15, food: 15 } : { wood: 20, food: 20 };
