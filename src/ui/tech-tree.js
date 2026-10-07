// Full-screen tech tree: eras as columns, prerequisites as curved links.
import { esc, icon } from './dom.js';
import { TECHS, ERAS } from '../content/techs.js';
import { techAvailable } from '../sim/commands.js';

const COL_W = 180, GAP = 40, ROW_H = 92, ROW_GAP = 8, HEAD = 30;

export function techTreeHtml(game) {
  const s = game.s;
  const cols = ERAS.map((era, e) => {
    const cells = Object.entries(TECHS).filter(([, t]) => t.era === e);
    return `<div class="tree-col"><h4>${era.name}</h4>${Array.from({ length: 6 }, (_, row) => {
      const hit = cells.find(([, t]) => t.row === row);
      if (!hit) return '<div></div>';
      const [id, t] = hit;
      const known = s.techs.includes(id), cur = s.research && s.research.id === id, avail = techAvailable(s, id);
      const state = known ? 'known' : cur ? 'current avail' : avail ? 'avail' : 'locked';
      return `<button class="tnode ${state}" ${avail && !cur ? `data-cmd="${esc(JSON.stringify({ type: 'research', tech: id }))}"` : ''} ${!avail && !known ? 'aria-disabled="true"' : ''} title="${esc(t.desc)}">
        <span class="tcost">${known ? '✓' : cur ? Math.floor(s.research.progress) + '/' + t.cost : t.cost} ${known ? '' : icon('knowledge')}</span>
        <b>${t.name}</b><small>${esc(t.desc)}</small></button>`;
    }).join('')}</div>`;
  }).join('');

  // links: from right edge of a prerequisite to left edge of the tech
  const pos = id => { const t = TECHS[id]; return [t.era * (COL_W + GAP), HEAD + t.row * (ROW_H + ROW_GAP) + ROW_H / 2]; };
  const links = Object.entries(TECHS).flatMap(([id, t]) => t.req.map(r => {
    const [x1, y1] = pos(r), [x2, y2] = pos(id), lit = s.techs.includes(r);
    const stroke = `fill="none" stroke="${lit ? '#4f8a3a' : 'rgba(44,36,27,.25)'}" stroke-width="${lit ? 2 : 1.5}"`;
    if (x1 === x2) return `<path d="M${x1} ${y1} C${x1 - 22} ${y1} ${x2 - 22} ${y2} ${x2} ${y2}" ${stroke}/>`; // same age: loop along the left edge
    const a = x1 + COL_W, mx = (a + x2) / 2;
    return `<path d="M${a} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" ${stroke}/>`;
  })).join('');
  const W = ERAS.length * (COL_W + GAP), H = HEAD + 6 * (ROW_H + ROW_GAP);
  return `<div class="tree-head"><div><span class="sub" style="font:800 11px var(--f-ui);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)">${s.techs.length - 1} of ${Object.keys(TECHS).length - 1} discovered</span><h2 style="font-size:30px">Tree of knowledge</h2></div>
      <button class="x" data-act="closeModal" aria-label="Close">✕</button></div>
    <div class="tree"><div class="tree-grid" style="width:${W}px"><svg class="links" width="${W}" height="${H}" aria-hidden="true">${links}</svg>${cols}</div></div>`;
}
