// Score and achievements.
import { ACHIEVEMENTS } from '../content/names.js';
import { writeChronicle, totalPop } from './state.js';

export function computeScore(s) {
  const buildings = s.settlements.reduce((n, t) => n + Object.values(t.buildings).reduce((a, b) => a + b, 0), 0);
  return Math.round(totalPop(s) * 10 + s.techs.length * 25 + buildings * 6 + s.wonders.length * 150 + s.era * 120 + s.settlements.length * 40 + s.achievements.length * 30);
}

export function checkAchievements(s) {
  const out = [];
  for (const [id, a] of Object.entries(ACHIEVEMENTS)) {
    if (s.achievements.includes(id) || !a.test(s)) continue;
    s.achievements.push(id);
    writeChronicle(s, `Milestone — ${a.name}: ${a.desc}`, 'milestone');
    out.push({ type: 'achievement', text: a.name });
  }
  return out;
}
