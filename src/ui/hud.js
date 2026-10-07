// Top bar: date, era, resources with per-season flow, civ-wide mood.
import { $, icon, fmt, signed, RES_LABEL, patch } from './dom.js';
import { dateLabel, totalPop, SEASONS } from '../sim/state.js';
import { ERAS } from '../content/techs.js';

export function renderHud(game) {
  const s = game.s, rep = game.report;
  $('#civName').textContent = s.civName;
  $('#dateLabel').textContent = dateLabel(s);
  $('#eraLabel').textContent = ERAS[s.era].name;
  $('#scoreLabel').textContent = s.score.toLocaleString();
  const avg = k => rep.towns.length ? Math.round(rep.towns.reduce((n, t) => n + t.r[k], 0) / rep.towns.length) : 0;
  const items = ['food', 'wood', 'stone', 'ore', 'knowledge', 'gold'].map(k => {
    const v = k === 'knowledge' ? (s.research ? s.research.progress : s.banked) : s.res[k];
    const cap = k === 'food' ? rep.storage : ['wood', 'stone', 'ore'].includes(k) ? rep.materialCap : null;
    const f = rep.flow[k], capped = cap != null && s.res[k] >= cap - .5;
    const tip = cap != null ? `${RES_LABEL[k]} ${fmt(s.res[k])} / ${cap} storage${capped ? ' — full!' : ''}` : k === 'knowledge' ? (s.research ? 'Research progress' : 'Knowledge banked (pick a research!)') : RES_LABEL[k];
    return `<li class="${capped ? 'cap' : ''}" title="${tip}: ${signed(f)} per season">${icon(k)}<b>${fmt(v)}</b><small class="${f > 0 ? 'up' : f < 0 ? 'down' : ''}">${signed(f)}</small></li>`;
  });
  items.push(`<li class="meter" title="Total population">${icon('pop')}<b>${totalPop(s)}</b></li>`);
  items.push(`<li class="meter" title="Average happiness (below 30 causes unrest)">${icon('happy', avg('happy') < 30 ? 'c-ore' : '')}<b>${avg('happy')}</b></li>`);
  items.push(`<li class="meter" title="Average health">${icon('health')}<b>${avg('health')}</b></li>`);
  patch($('#resBar'), items.join(''));
}

export function renderTimeCtrl(game) {
  for (const b of document.querySelectorAll('#timeCtrl [data-speed]')) b.setAttribute('aria-pressed', String(+b.dataset.speed === game.speed));
}

export function renderSeasonRing(game, frac) {
  const ring = $('.season-ring');
  ring.style.setProperty('--p', Math.round(frac * 100));
  $('#seasonRing').textContent = SEASONS[game.s.tick % 4][0];
  ring.title = `${SEASONS[game.s.tick % 4]} — next season ${Math.round(frac * 100)}%`;
}
