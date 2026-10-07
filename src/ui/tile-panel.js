// Left panel when a map tile is selected: terrain info, improvements, founding, scouting, raider camps.
import { esc, icon, costHtml, yieldsHtml } from './dom.js';
import { TERRAIN, RESOURCES, IMPROVEMENTS } from '../content/terrain.js';
import { tileYield } from '../sim/economy.js';
import { townById } from '../sim/state.js';
import { improveBlocker, foundBlocker, scoutBlocker, FOUND_COST, SCOUT_COST } from '../sim/commands.js';
import { expeditionStrength, EXPEDITION_COST } from '../sim/threats.js';

const cmd = o => esc(JSON.stringify(o));

export function renderTile(game, i) {
  const s = game.s, t = s.tiles[i], c = i % s.W, r = Math.floor(i / s.W);
  if (!t.seen) {
    const why = scoutBlocker(s, i);
    return `<div class="p-head"><div><span class="sub">${c}, ${r}</span><h2>Uncharted</h2></div><button class="x" data-act="close" aria-label="Close panel">✕</button></div>
      <p class="flavor">Beyond the edge of the map, the elders' stories run out.</p>
      <div class="sec"><button class="btn wide" data-cmd="${cmd({ type: 'scout', tile: i })}" ${why ? 'disabled' : ''}>Send scouts <span class="cost" style="display:inline-flex;gap:6px">${costHtml(SCOUT_COST, s.res)}</span></button>${why ? `<p class="why">${esc(why)}</p>` : '<p class="hint">Reveals the land around this point.</p>'}</div>`;
  }
  const T = TERRAIN[t.t], owner = t.own > 0 ? townById(s, t.own) : null, y = tileYield(s, i, owner);
  const camp = s.camps.find(k => k.tile === i);
  const queued = s.settlements.flatMap(x => x.queue).find(q => q.tile === i);

  let html = `<div class="p-head"><div><span class="sub">${owner ? 'Lands of ' + esc(owner.name) : 'Wild land'} · ${c}, ${r}</span><h2>${T.name}${t.riv ? ' & river' : ''}</h2></div><button class="x" data-act="close" aria-label="Close panel">✕</button></div>
    <div class="yields">${yieldsHtml(y) || '<span>Nothing grows here</span>'}</div>
    ${t.res ? `<p class="hint"><b>${RESOURCES[t.res].name}</b> on this tile adds extra yield.</p>` : ''}
    ${t.imp ? `<p class="hint">Improved: <b>${IMPROVEMENTS[t.imp].name}</b>.</p>` : ''}
    ${queued ? `<p class="hint">Under construction: <b>${IMPROVEMENTS[queued.id].name}</b> (${Math.round(queued.progress / queued.time * 100)}%).</p>` : ''}`;

  if (camp) {
    const str = expeditionStrength(s, camp), cost = EXPEDITION_COST(s);
    html += `<div class="sec"><h4>Raider camp</h4><p class="flavor">Smoke, tents and a red banner. They raid the nearest town every few years.</p>
      <div class="stats" style="margin-top:8px"><div class="stat warn"><small>${icon('shield')} Raiders</small><b>${Math.round(camp.str)}</b></div><div class="stat"><small>${icon('shield')} Your force</small><b>${str || '—'}</b></div></div>
      <button class="btn wide" style="margin-top:10px" data-cmd="${cmd({ type: 'attack', camp: camp.id })}" ${!str ? 'disabled' : ''}>Send an expedition <span class="cost" style="display:inline-flex;gap:6px">${costHtml(cost, s.res)}</span></button>
      <p class="hint">${str ? (str > camp.str + 2 ? 'Good odds.' : str > camp.str - 2 ? 'A fair fight.' : 'Poor odds — build walls or barracks first.') : 'No settlement within 8 tiles to send warriors from.'}</p></div>`;
    return html;
  }

  if (owner && i !== owner.tile && !t.imp && !queued) {
    const opts = Object.entries(IMPROVEMENTS).filter(([, m]) => m.on.includes(t.t)).map(([id, m]) => {
      const why = improveBlocker(s, i, id);
      return `<button class="opt" data-cmd="${cmd({ type: 'improve', tile: i, id })}" ${why ? 'disabled' : ''}>
        <span class="ico">${{ farm: '≡', pasture: '∩', camp: '⍋', quarry: '▦', mine: '⛏', boats: '⛵' }[id]}</span>
        <span><b>${m.name}</b><small>${why && why !== 'Not enough resources.' ? esc(why) : 'Adds ' + Object.entries(m.yields).map(([k, v]) => '+' + v + ' ' + k).join(', ')}</small></span>
        <span class="cost">${costHtml(m.cost, s.res)}<span>${m.time}✦</span></span></button>`;
    }).join('');
    if (opts) html += `<div class="sec"><h4>Improve this tile</h4><div class="list">${opts}</div></div>`;
  }
  if (owner && i === owner.tile) html += `<div class="sec"><button class="btn wide" data-act="town" data-town="${owner.id}">Open ${esc(owner.name)}</button></div>`;

  if (!T.water && t.t !== 'mountain' && (!owner || owner.tile !== i)) {
    const why = foundBlocker(s, i);
    html += `<div class="sec"><h4>New settlement</h4>
      <button class="btn wide ${why ? 'ghost' : ''}" data-cmd="${cmd({ type: 'found', tile: i })}" ${why ? 'disabled' : ''}>Found a settlement here <span class="cost" style="display:inline-flex;gap:6px">${costHtml(FOUND_COST, s.res)}</span></button>
      <p class="${why ? 'why' : 'hint'}">${why ? esc(why) : 'Two people leave the nearest large town to settle here.'}</p></div>`;
  }
  if (!owner && !T.water) html += `<p class="hint">${T.name}: ${Object.entries(T.yields).map(([k, v]) => v + ' ' + k).join(', ') || 'barren'}.${T.impassable ? ' Mountains can be quarried or mined once inside your borders.' : ''}</p>`;
  return html;
}

