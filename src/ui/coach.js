// First-time guidance: a handful of steps that complete themselves as you play.
import { $, esc } from './dom.js';

const STEPS = [
  { t: 'Meet your people', p: s => `This is ${s.settlements[0].name}, home of ${s.civName}. Click the town to see what it needs.`, done: (s, g) => g.selectedTown === s.settlements[0].id },
  { t: 'Choose a research', p: () => 'Open the Research tab on the right and pick Agriculture. Knowledge flows in every season.', done: s => !!s.research || s.techs.includes('agriculture') },
  { t: 'Make room to grow', p: () => 'In the town panel, build Houses. Towns stop growing when housing is full.', done: s => s.settlements.some(t => t.buildings.houses || t.queue.some(q => q.id === 'houses')) },
  { t: 'Let time flow', p: () => 'Press ▶ (or Space). Watch the seasons turn, the smoke rise and the harvest come in.', done: s => s.tick >= 4 },
  { t: 'Work the land', p: () => 'Once Agriculture is known, click a grassland or plains tile inside your borders and build a Farm.', done: s => s.tiles.some(t => t.imp === 'farm') || s.settlements.some(t => t.queue.some(q => q.id === 'farm')) },
  { t: 'Spread out', p: () => 'When a town reaches 4 people, click open land 4+ tiles away and found a new settlement.', done: s => s.settlements.length >= 2 },
  { t: 'The chronicle is yours', p: () => 'You know enough to begin. Keep people fed, housed, healthy and happy — and read the Chronicle as your history unfolds.', done: () => false, last: true }
];

export function renderCoach(game) {
  const el = $('#coach');
  if (!game.prefs.coach || !game.s) { el.hidden = true; return; }
  let i = game.prefs.coachStep || 0;
  while (i < STEPS.length - 1 && STEPS[i].done(game.s, game)) i++;
  if (i !== game.prefs.coachStep) game.setPref('coachStep', i);
  const st = STEPS[i];
  el.hidden = false;
  const html = `<span class="step">STEP ${i + 1} OF ${STEPS.length}</span><b>${esc(st.t)}</b><p>${esc(st.p(game.s))}</p><button data-act="${st.last ? 'coachDone' : 'coachSkip'}">${st.last ? 'Got it' : 'Hide tips'}</button>`;
  if (el._html !== html) { el._html = html; el.innerHTML = html; }
}
