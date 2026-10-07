// Left panel when a settlement is selected: vitals, yields, queue and the build menu.
import { esc, icon, signed, costHtml, yieldsHtml } from './dom.js';
import { BUILDINGS, WONDERS } from '../content/buildings.js';
import { IMPROVEMENTS } from '../content/terrain.js';
import { buildBlocker, techAvailable } from '../sim/commands.js';

const nameOf = job => job.kind === 'improvement' ? IMPROVEMENTS[job.id].name : job.kind === 'wonder' ? WONDERS[job.id].name : BUILDINGS[job.id].name;
const visibleTech = (s, t) => !t || s.techs.includes(t) || techAvailable(s, t);
const cmd = o => esc(JSON.stringify(o));

export function renderTown(game, town) {
  const s = game.s, r = game.report.towns.find(x => x.town.id === town.id).r;
  const growTurns = r.surplus > 0 ? Math.ceil(Math.max(0, r.growNeed - town.grow) / r.surplus) : null;
  const full = town.pop >= r.housing;
  const jobs = Object.entries(r.jobs).filter(([, n]) => n > 0).map(([k, n]) => `<span class="chip">${icon(k)} ${n}</span>`).join('');

  const build = Object.entries(BUILDINGS).filter(([, b]) => visibleTech(s, b.tech)).map(([id, b]) => {
    const why = buildBlocker(s, town, id), count = town.buildings[id] || 0;
    if (count >= (b.max || 1) && !town.queue.some(q => q.id === id)) return '';
    return `<button class="opt" data-cmd="${cmd({ type: 'build', town: town.id, id })}" ${why ? 'disabled' : ''} title="${esc(why || b.desc)}">
      <span class="ico">${b.icon}</span><span><b>${b.name}${b.max ? ` <small style="display:inline">${count}/${b.max}</small>` : ''}</b><small>${esc(why && why !== 'Not enough resources.' ? why : b.desc)}</small></span>
      <span class="cost">${costHtml(b.cost, s.res)}<span>${b.time}✦</span></span></button>`;
  }).join('');
  const wonders = Object.entries(WONDERS).filter(([id, w]) => visibleTech(s, w.tech) && !s.wonders.includes(id)).map(([id, w]) => {
    const why = buildBlocker(s, town, id, true);
    if (why === 'Already built or under construction.' && !town.queue.some(q => q.id === id)) return '';
    return `<button class="opt wonder" data-cmd="${cmd({ type: 'wonder', town: town.id, id })}" ${why ? 'disabled' : ''} title="${esc(why || w.desc)}">
      <span class="ico">★</span><span><b>${w.name}</b><small>${esc(why && why !== 'Not enough resources.' ? why : w.desc)}</small></span>
      <span class="cost">${costHtml(w.cost, s.res)}<span>${w.time}✦</span></span></button>`;
  }).join('');
  const built = Object.entries(town.buildings).map(([id, n]) => `<span class="chip" title="${esc((BUILDINGS[id] || WONDERS[id]).desc)}">${(BUILDINGS[id] || { icon: '★' }).icon} ${(BUILDINGS[id] || WONDERS[id]).name}${n > 1 ? ' ×' + n : ''}</span>`).join('');

  return `
    <div class="p-head"><div>
      <span class="sub">${town.capital ? 'Capital · ' : ''}Founded ${town.founded === 0 ? 'at the dawn' : 'season ' + town.founded}</span>
      <h2>${esc(town.name)} <button class="x" style="display:inline-grid;width:24px;height:24px;font-size:13px" data-act="rename" data-town="${town.id}" aria-label="Rename settlement" title="Rename">✎</button></h2>
    </div><button class="x" data-act="close" aria-label="Close panel">✕</button></div>

    <div class="stats">
      <div class="stat ${full ? 'warn' : ''}" title="Population / housing"><small>${icon('pop')} People</small><b>${town.pop}<span style="font-size:12px;color:var(--ink-3)"> / ${r.housing}</span></b></div>
      <div class="stat ${r.happy < 30 ? 'warn' : ''}" title="Happiness. Below 30 the town is in unrest (−20% output)."><small>${icon('happy')} Happy</small><b>${r.happy}</b></div>
      <div class="stat ${r.health < 40 ? 'warn' : ''}" title="Health slows or speeds growth and affects plague risk."><small>${icon('health')} Health</small><b>${r.health}</b></div>
      <div class="stat" title="Defense against raiders"><small>${icon('shield')} Defense</small><b>${r.defense}</b></div>
      <div class="stat ${r.surplus < 0 ? 'warn' : ''}" title="Food produced minus eaten per season"><small>${icon('food')} Surplus</small><b>${signed(r.surplus)}</b></div>
      <div class="stat" title="Seasons until the next citizen"><small>${icon('house')} Grows in</small><b>${full ? '<span style="font-size:13px;color:var(--bad)">Need houses</span>' : growTurns == null ? '—' : growTurns + '<span style="font-size:12px;color:var(--ink-3)"> ssn</span>'}</b></div>
    </div>
    <div class="bar" style="margin-top:8px" title="Growth"><i style="width:${Math.min(100, town.grow / r.growNeed * 100)}%"></i></div>
    ${r.unrest ? '<p class="why">Unrest! Output reduced. Build a shrine, enact Festivals, or slow growth.</p>' : ''}

    <div class="sec"><h4>Each season <span>${r.worked.length} tiles worked${r.idle ? ` · ${r.idle} foraging` : ''}</span></h4><div class="yields">${yieldsHtml(r.yields)}</div></div>
    <div class="sec"><h4>Workers</h4><div class="chips">${jobs || '<span class="chip">none</span>'}</div><p class="hint">Change job priorities for all towns in the <b>Council</b> tab.</p></div>

    ${town.queue.length ? `<div class="sec"><h4>Building</h4><div class="queue">${town.queue.map((q, i) => `
      <div class="qitem"><b>${nameOf(q)}</b><button data-cmd="${cmd({ type: 'cancel', town: town.id, index: i })}" title="Cancel and recover half the materials">cancel</button>
      <div class="bar gold"><i style="width:${Math.min(100, q.progress / q.time * 100)}%"></i></div></div>`).join('')}</div></div>` : ''}

    ${built ? `<div class="sec"><h4>Standing</h4><div class="chips">${built}</div></div>` : ''}
    <div class="sec"><h4>Build <span>${town.queue.length}/3 queued</span></h4><div class="list">${build || '<p class="hint">Research new technologies to unlock buildings.</p>'}</div></div>
    ${wonders ? `<div class="sec"><h4>Wonders of the world</h4><div class="list">${wonders}</div></div>` : ''}
    <p class="hint">Tip: click a tile inside the borders to build farms, camps, quarries and mines.</p>`;
}

export { nameOf };
