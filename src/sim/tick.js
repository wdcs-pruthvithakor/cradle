// One simulation step = one season. Returns UI notifications (the sim itself never touches the DOM).
import { BUILDINGS, WONDERS } from '../content/buildings.js';
import { IMPROVEMENTS } from '../content/terrain.js';
import { TECHS, ERAS } from '../content/techs.js';
import { townReport, civStorage, effect, materialCap } from './economy.js';
import { writeChronicle, claimTerritory, territoryRadius, totalPop } from './state.js';
import { rollEvent, autoResolve } from './events.js';
import { spawnCamps, raids } from './threats.js';
import { computeScore, checkAchievements } from './score.js';

export function tick(s) {
  const out = [];
  const reports = s.settlements.map(t => [t, townReport(s, t)]);

  // 1. production and consumption
  const flow = { food: 0, wood: 0, stone: 0, ore: 0, knowledge: 0, gold: 0 };
  for (const [, r] of reports) { for (const k in flow) flow[k] += r.yields[k] || 0; flow.food -= r.eat; }
  for (const k of ['wood', 'stone', 'ore', 'gold']) s.res[k] = Math.max(0, s.res[k] + flow[k]);
  s.res.food += flow.food;
  s.flow = Object.fromEntries(Object.entries(flow).map(([k, v]) => [k, Math.round(v * 10) / 10]));

  // 2. famine
  if (s.res.food < 0) {
    s.res.food = 0;
    const victim = s.settlements.filter(t => t.pop > 1).sort((a, b) => b.pop - a.pop)[0];
    if (victim) {
      victim.pop--; victim.grow = 0; s.stats.famines++;
      writeChronicle(s, `Famine struck ${victim.name}. The granaries were empty and the people grew fewer.`, 'disaster');
      out.push({ type: 'bad', text: `Famine in ${victim.name}!` });
    }
  }
  s.res.food = Math.min(s.res.food, civStorage(s));
  for (const k of ['wood', 'stone', 'ore']) s.res[k] = Math.min(s.res[k], materialCap(s));

  // 3. growth
  for (const [town, r] of reports) {
    const healthFactor = Math.max(.25, r.health / 75);
    if (r.surplus > 0) town.grow += r.surplus * healthFactor;
    else if (s.res.food <= 0) town.grow += r.surplus;
    town.grow = Math.max(0, town.grow);
    if (town.grow >= r.growNeed && town.pop < r.housing && s.res.food > 0) {
      const before = territoryRadius(town.pop);
      town.pop++; town.grow = r.growNeed * effect(s, town, 'keepFood');
      if (territoryRadius(town.pop) > before) { claimTerritory(s, town); out.push({ type: 'good', text: `${town.name}'s borders expand.` }); }
      if (town.pop === 5 || town.pop === 10 || town.pop === 20) writeChronicle(s, `${town.name} grew to ${town.pop} families${town.pop === 10 ? ' and became a true town' : town.pop === 20 ? ' — a city to rival any' : ''}.`, 'growth');
      out.push({ type: 'grow', text: `${town.name} grew to ${town.pop}.`, town: town.id });
    } else if (town.pop >= r.housing && town.grow >= r.growNeed) {
      town.grow = r.growNeed; // waiting for houses
    }
    town.happy = r.happy; town.health = r.health; town.defense = r.defense;
  }

  // 4. construction (first item in each queue)
  for (const [town] of reports) {
    const job = town.queue[0];
    if (!job) continue;
    job.progress += 1 + effect(s, town, 'buildSpeed');
    if (job.progress + 1e-9 < job.time) continue;
    town.queue.shift(); s.stats.built++;
    if (job.kind === 'building') {
      town.buildings[job.id] = (town.buildings[job.id] || 0) + 1;
      if (town.buildings[job.id] === 1 && job.id !== 'houses') writeChronicle(s, `${town.name} completed its first ${BUILDINGS[job.id].name.toLowerCase()}.`, 'build');
      out.push({ type: 'built', text: `${BUILDINGS[job.id].name} completed in ${town.name}.` });
    } else if (job.kind === 'wonder') {
      town.buildings[job.id] = 1; s.wonders.push(job.id);
      writeChronicle(s, `The ${WONDERS[job.id].name} rose above ${town.name}. People came from every valley to see it.`, 'wonder');
      out.push({ type: 'achievement', text: `${WONDERS[job.id].name} completed!` });
    } else if (job.kind === 'improvement') {
      s.tiles[job.tile].imp = job.id;
      out.push({ type: 'built', text: `${IMPROVEMENTS[job.id].name} finished near ${town.name}.` });
    }
  }

  // 5. research
  if (s.research) {
    s.research.progress += flow.knowledge;
    const tech = TECHS[s.research.id];
    if (s.research.progress >= tech.cost) {
      s.banked = s.research.progress - tech.cost;
      s.techs.push(s.research.id);
      out.push({ type: 'tech', text: `Discovered ${tech.name}.` });
      if (['agriculture', 'writing', 'iron', 'philosophy', 'medicine', 'education', 'printing', 'navigation'].includes(s.research.id))
        writeChronicle(s, `Scholars mastered ${tech.name.toLowerCase()}.`, 'tech');
      s.research = null;
      const era = Math.max(...s.techs.map(t => TECHS[t].era));
      if (era > s.era) {
        s.era = era;
        writeChronicle(s, `A new age dawned: the ${ERAS[era].name}.`, 'era');
        out.push({ type: 'era', text: ERAS[era].name });
      }
    }
  } else {
    s.banked += flow.knowledge;
  }

  // 6. world: events, camps, raids
  const ev = autoResolve(s); if (ev) out.push(ev);
  const roll = rollEvent(s); if (roll) out.push(roll);
  const camp = spawnCamps(s); if (camp) out.push(camp);
  out.push(...raids(s));

  // 7. time, cleanup, score
  s.mods = s.mods.filter(m => m.until > s.tick + 1);
  s.tick++;
  s.year += ERAS[s.era].yearsPerSeason;
  s.stats.peakPop = Math.max(s.stats.peakPop, totalPop(s));
  out.push(...checkAchievements(s));
  s.score = computeScore(s);
  return out;
}
