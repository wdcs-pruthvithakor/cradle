// Right sidebar tabs: Council (labor + policies), Research, Chronicle, Goals.
import { $, $$, esc, icon, patch, RES_LABEL } from './dom.js';
import { TECHS, ERAS, POLICIES, policySlots } from '../content/techs.js';
import { ACHIEVEMENTS } from '../content/names.js';
import { techAvailable } from '../sim/commands.js';
import { formatYear } from '../sim/state.js';

const cmd = o => esc(JSON.stringify(o));
export const sidebar = { tab: 'council' };

export function renderSidebar(game, force) {
  const body = $('#tabBody');
  $$('#rightPanel .tabs [data-tab]').forEach(b => {
    b.setAttribute('aria-selected', String(b.dataset.tab === sidebar.tab));
    const dot = b.dataset.tab === 'research' && !game.s.research;
    b.innerHTML = b.textContent.replace(/\s*$/, '') + (dot ? '<span class="dot" title="Nothing being researched"></span>' : '');
  });
  // labor sliders are live inputs: only rebuild that tab when asked to (not every tick)
  if (sidebar.tab === 'council' && !force && body.dataset.view === 'council') return updateCouncilNumbers(game);
  body.dataset.view = sidebar.tab;
  patch(body, ({ council, research, chronicle, goals })[sidebar.tab](game));
}

function council(game) {
  const s = game.s, slots = policySlots(s.era, s.techs);
  const totals = jobTotals(game);
  return `
    <div class="sec" style="margin-top:0"><h4>Settlements <span>${s.settlements.length}</span></h4><div class="list">${game.report.towns.map(({ town, r }) => `
      <button class="opt" data-act="town" data-town="${town.id}" style="grid-template-columns:1fr auto"><span><b>${esc(town.name)}${town.capital ? ' ★' : ''}</b><small>${town.pop} people · ${r.happy < 30 ? '<span style="color:var(--bad)">unrest</span>' : 'happy ' + r.happy} · health ${r.health}</small></span><span class="cost">${town.queue[0] ? '⚒' : '<span style="color:var(--accent)">idle</span>'}</span></button>`).join('')}</div></div>

    <div class="sec"><h4>Work priorities <span>all towns</span></h4>
      ${['food', 'wood', 'stone', 'ore', 'knowledge', 'gold'].map(k => `
        <label class="slider">${icon(k)}<span>${RES_LABEL[k]}</span><input type="range" min="0" max="100" step="5" value="${s.labor[k]}" data-labor="${k}" aria-label="${RES_LABEL[k]} priority"><output data-jobs="${k}">${totals[k]}</output></label>`).join('')}
      <p class="hint">Numbers show how many workers do each job. Tile jobs need suitable tiles inside your borders; scholars and merchants just need people.</p></div>

    <div class="sec"><h4>Policies <span>${s.policies.length}/${slots} slots</span></h4>
      ${Object.entries(POLICIES).map(([id, p]) => {
        const on = s.policies.includes(id), locked = p.tech && !s.techs.includes(p.tech);
        return `<button class="policy ${on ? 'on' : ''} ${locked ? 'locked' : ''}" data-cmd="${cmd({ type: 'policy', id })}" ${locked ? 'disabled' : ''} aria-pressed="${on}">
          <b>${p.name}</b><small>${locked ? 'Requires ' + TECHS[p.tech].name : esc(p.desc)}</small><span class="tog" aria-hidden="true"></span></button>`;
      }).join('')}</div>`;
}
function jobTotals(game) {
  const t = { food: 0, wood: 0, stone: 0, ore: 0, knowledge: 0, gold: 0 };
  for (const { r } of game.report.towns) for (const k in t) t[k] += r.jobs[k] || 0;
  return t;
}
function updateCouncilNumbers(game) {
  const t = jobTotals(game);
  $$('#tabBody [data-jobs]').forEach(o => { o.textContent = t[o.dataset.jobs]; });
}

function research(game) {
  const s = game.s, flow = Math.max(.1, game.report.flow.knowledge);
  const cur = s.research && TECHS[s.research.id];
  const avail = Object.keys(TECHS).filter(id => techAvailable(s, id)).sort((a, b) => TECHS[a].cost - TECHS[b].cost);
  return `
    ${cur ? `<div class="research-now"><span class="sub" style="font:800 11px var(--f-ui);letter-spacing:.1em;text-transform:uppercase;color:var(--c-knowledge)">Researching · ${ERAS[cur.era].name}</span>
      <h3>${cur.name}</h3><p class="hint" style="margin:0 0 8px">${esc(cur.desc)}</p>
      <div class="bar blue"><i style="width:${Math.min(100, s.research.progress / cur.cost * 100)}%"></i></div>
      <p class="hint">${Math.floor(s.research.progress)} / ${cur.cost} · about ${Math.max(1, Math.ceil((cur.cost - s.research.progress) / flow))} seasons</p></div>`
    : `<div class="research-now" style="border-color:var(--accent)"><h3>Choose a research</h3><p class="hint" style="margin:0">Your scholars are idle. ${Math.floor(s.banked)} knowledge is waiting to be spent.</p></div>`}
    <div class="sec"><h4>Available <span>${s.techs.length - 1} known</span></h4><div class="techs-avail">
      ${avail.map(id => `<button class="tech-card" data-cmd="${cmd({ type: 'research', tech: id })}" ${s.research && s.research.id === id ? 'style="border-color:var(--accent)"' : ''}>
        <span class="era">${ERAS[TECHS[id].era].name}</span><b>${TECHS[id].name}</b><small>${esc(TECHS[id].desc)} · ${TECHS[id].cost} ${icon('knowledge')}</small></button>`).join('') || '<p class="hint">You have mastered everything this age can teach.</p>'}
    </div></div>
    <div class="sec"><button class="btn ghost wide" data-act="tree">Open the full tech tree (T)</button></div>`;
}

function chronicle(game) {
  const s = game.s;
  return `<div class="sec" style="margin-top:0"><h4>The chronicle of ${esc(s.civName)} <button class="btn sm ghost" data-act="exportChronicle">Save as text</button></h4>
    <ol class="chron">${s.chronicle.slice().reverse().slice(0, 120).map(c => `<li data-k="${c.kind}"><time>${formatYear(c.year)}</time><p>${esc(c.text)}</p></li>`).join('')}</ol></div>`;
}

function goals(game) {
  const s = game.s;
  const done = Object.keys(ACHIEVEMENTS).filter(k => s.achievements.includes(k)).length;
  return `<div class="sec" style="margin-top:0"><h4>Age</h4>
      <div class="chips">${ERAS.map((e, i) => `<span class="chip" style="${i <= s.era ? 'background:var(--ink);color:var(--panel-solid)' : ''}">${e.name}</span>`).join('')}</div></div>
    <div class="sec"><h4>Milestones <span>${done}/${Object.keys(ACHIEVEMENTS).length}</span></h4>
      ${Object.entries(ACHIEVEMENTS).map(([k, a]) => `<div class="ach ${s.achievements.includes(k) ? 'done' : ''}"><i>${s.achievements.includes(k) ? '★' : '·'}</i><span><b>${a.name}</b><small>${a.desc}</small></span></div>`).join('')}</div>
    <div class="sec"><h4>Score <span>${s.score.toLocaleString()}</span></h4><p class="hint">Population, technologies, buildings, wonders, the current age, settlements and milestones all add to your score. Peak population: ${s.stats.peakPop}. Raids repelled: ${s.stats.raidsRepelled}. Camps cleared: ${s.stats.campsCleared}.</p></div>`;
}
