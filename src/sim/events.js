// Rolling and resolving narrative events.
import { EVENTS } from '../content/events.js';
import { rand } from './rng.js';
import { townById, writeChronicle, seasonOf, canAfford, pay } from './state.js';
import { townReport } from './economy.js';
import { POLICIES } from '../content/techs.js';

export const eventById = id => EVENTS.find(e => e.id === id);
const fill = (txt, town) => txt.replace(/\{town\}/g, town ? town.name : 'the capital');

function context(s, town) {
  const reps = s.settlements.map(t => townReport(s, t));
  const rep = townReport(s, town);
  return {
    town: { ...town, happy: rep.happy, health: rep.health, housing: rep.housing },
    era: s.era, season: seasonOf(s),
    avgHappy: reps.reduce((n, r) => n + r.happy, 0) / reps.length,
    avgHealth: reps.reduce((n, r) => n + r.health, 0) / reps.length,
    riverTown: s.tiles[town.tile].riv,
    unrestShield: s.policies.some(p => POLICIES[p].fx.unrestShield)
  };
}

/** Maybe start an event. Returns a UI notification or null. */
export function rollEvent(s) {
  if (s.pending || s.tick < s.nextEventTick || !s.settlements.length) return null;
  s.nextEventTick = s.tick + 5 + Math.floor(rand(s) * 7);
  if (rand(s) > .55) return null;
  // pick a town, weighted by population
  const totalPop = s.settlements.reduce((n, t) => n + t.pop, 0);
  let x = rand(s) * totalPop, town = s.settlements[0];
  for (const t of s.settlements) { x -= t.pop; if (x <= 0) { town = t; break; } }
  const ctx = context(s, town);
  const weights = EVENTS.map(e => Math.max(0, e.weight(s, ctx) || 0));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (!sum) return null;
  let y = rand(s) * sum, ev = EVENTS[0];
  for (let i = 0; i < EVENTS.length; i++) { y -= weights[i]; if (y <= 0) { ev = EVENTS[i]; break; } }
  s.pending = { id: ev.id, town: town.id, since: s.tick };
  return { type: 'event', text: ev.title };
}

/** Choices currently offered (requirements checked; affordability reported, not filtered). */
export function pendingView(s) {
  if (!s.pending) return null;
  const ev = eventById(s.pending.id), town = townById(s, s.pending.town);
  return {
    id: ev.id, title: ev.title, art: ev.art, text: fill(ev.text, town), town: town && town.name,
    choices: ev.choices.map((c, i) => ({ i, label: c.label, cost: c.cost || null, allowed: !c.req || c.req(s), affordable: canAfford(s, c.cost) }))
  };
}

export function resolveEvent(s, choiceIndex) {
  if (!s.pending) return { ok: false, error: 'No event is waiting.' };
  const ev = eventById(s.pending.id), c = ev.choices[choiceIndex];
  if (!c) return { ok: false, error: 'Unknown choice.' };
  if (c.req && !c.req(s)) return { ok: false, error: 'That option is not available yet.' };
  if (!canAfford(s, c.cost)) return { ok: false, error: 'Not enough resources.' };
  const town = townById(s, s.pending.town) || s.settlements[0];
  pay(s, c.cost);
  applyFx(s, town, c.fx || {});
  writeChronicle(s, fill(c.chronicle, town), 'event');
  s.pending = null;
  return { ok: true, events: [{ type: 'toast', text: c.label }] };
}

/** Unanswered events resolve themselves with the last (usually "do nothing") option. */
export function autoResolve(s) {
  if (!s.pending || s.tick - s.pending.since < 8) return null;
  const ev = eventById(s.pending.id);
  for (let i = ev.choices.length - 1; i >= 0; i--) if (resolveEvent(s, i).ok) return { type: 'toast', text: `${ev.title}: decided by the elders.` };
  s.pending = null; return null;
}

export function applyFx(s, town, fx) {
  for (const [k, v] of Object.entries(fx.res || {})) s.res[k] = Math.max(0, (s.res[k] || 0) + v);
  if (fx.pop && town) town.pop = Math.max(1, town.pop + fx.pop);
  for (const m of fx.mods || []) s.mods.push({ key: m.key, value: m.value, until: s.tick + m.ticks });
  if (fx.setback && town && town.queue[0]) town.queue[0].progress = Math.max(0, town.queue[0].progress - 3);
}
