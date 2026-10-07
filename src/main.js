// Cradle — bootstrap and game controller.
// The controller owns the state, runs fixed-rate ticks, and turns UI actions into sim commands.
import { createGame } from './sim/state.js';
import { tick } from './sim/tick.js';
import { applyCommand } from './sim/commands.js';
import { civReport, tileYield } from './sim/economy.js';
import { TERRAIN, RESOURCES } from './content/terrain.js';
import { formatYear } from './sim/state.js';
import { Renderer } from './render/renderer.js';
import { $, $$, esc, yieldsHtml, patch, guardClicks } from './ui/dom.js';
import { toast, showEvents } from './ui/toasts.js';
import { renderHud, renderTimeCtrl, renderSeasonRing } from './ui/hud.js';
import { renderTown } from './ui/settlement-panel.js';
import { renderTile } from './ui/tile-panel.js';
import { renderSidebar, sidebar } from './ui/sidebar.js';
import { techTreeHtml } from './ui/tech-tree.js';
import { eventHtml } from './ui/event-modal.js';
import { menuHtml, randomSeed } from './ui/menu.js';
import { renderCoach } from './ui/coach.js';
import { setSound, chime } from './ui/sound.js';
import * as persist from './persist.js';

const INTERVAL = { 1: 2000, 2: 1000, 4: 450 }; // ms per season at each speed
const reducedSystem = matchMedia('(prefers-reduced-motion: reduce)').matches;

const game = {
  s: null, report: null, speed: 0, lastSpeed: 1,
  selectedTile: -1, selectedTown: null, modal: null,
  prefs: {
    sound: persist.prefs.get('sound', false), reduced: persist.prefs.get('reduced', reducedSystem),
    pauseOnEvent: persist.prefs.get('pauseOnEvent', true), coach: persist.prefs.get('coach', true), coachStep: persist.prefs.get('coachStep', 0)
  },
  setPref(k, v) { this.prefs[k] = v; persist.prefs.set(k, v); }
};
window.cradle = game; // handy for debugging in the console

const renderer = new Renderer($('#world'), { reduced: game.prefs.reduced });
game.renderer = renderer;

/* ------------------------------------------------------------------ state lifecycle */
function startState(s, { focus = true } = {}) {
  game.s = s; game.selectedTile = -1; game.selectedTown = null;
  renderer.setState(s);
  if (focus) renderer.focusTile(s.settlements[0].tile, 1.35);
  renderer.cam.update(true);
  refresh(true);
  if (s.pending) openModal('event'); // an event was waiting when the game was saved
}
function newGame(seed) {
  startState(createGame(seed || randomSeed()));
  game.setPref('coachStep', 0);
  setSpeed(0); closeModal();
  toast(`${game.s.civName} awaken by the water.`, 'era');
  persist.save(0, game.s);
}

/* ------------------------------------------------------------------ commands */
function dispatch(cmd) {
  if (!game.s) return;
  const res = applyCommand(game.s, cmd);
  if (!res.ok) { toast(res.error, 'bad'); return res; }
  showEvents(res.events);
  if (cmd.type === 'found' && res.town) selectTown(res.town);
  if (cmd.type === 'choose' && !game.s.pending && game.modal === 'event') closeModal();
  if (cmd.type === 'research' && game.modal === 'tree') openModal('tree');
  refresh(cmd.type === 'policy' || cmd.type === 'labor' || cmd.type === 'research');
  return res;
}

function step() {
  const out = tick(game.s);
  showEvents(out);
  if (out.some(e => e.type === 'era' || e.type === 'achievement')) chime('era');
  else if (out.some(e => e.type === 'bad')) chime('bad');
  else if (out.some(e => e.type === 'tech')) chime('good');
  if (game.s.pending && !game.modal) openModal('event');
  if (game.s.tick % 8 === 0) persist.save(0, game.s);
  refresh();
}

/* ------------------------------------------------------------------ UI refresh */
function refresh(forceSidebar) {
  const s = game.s; if (!s) return;
  game.report = civReport(s);
  renderHud(game); renderTimeCtrl(game);
  const left = $('#leftPanel');
  const town = game.selectedTown != null ? s.settlements.find(t => t.id === game.selectedTown) : null;
  if (town) { left.hidden = false; patch(left, renderTown(game, town)); }
  else if (game.selectedTile >= 0) { left.hidden = false; patch(left, renderTile(game, game.selectedTile)); }
  else left.hidden = true;
  document.body.classList.toggle('has-left', !left.hidden);
  renderSidebar(game, forceSidebar);
  renderCoach(game);
  if (game.modal === 'event') { if (s.pending) patch($('#modalCard'), eventHtml(game)); else closeModal(); }
}

function select(tile) {
  const s = game.s; if (tile < 0) return;
  const town = s.settlements.find(t => t.tile === tile);
  game.selectedTown = town ? town.id : null; game.selectedTile = tile;
  renderer.selected = tile;
  $('#leftPanel')._html = null; $('#leftPanel').scrollTop = 0;
  refresh();
}
function selectTown(id) {
  const t = game.s.settlements.find(x => x.id === id); if (!t) return;
  select(t.tile); renderer.focusTile(t.tile);
}
function clearSelection() { game.selectedTown = null; game.selectedTile = -1; renderer.selected = -1; refresh(); }

function setSpeed(v) {
  game.speed = v; if (v) game.lastSpeed = v;
  renderTimeCtrl(game);
}

/* ------------------------------------------------------------------ modals */
function openModal(kind, extra) {
  const m = $('#modal'), card = $('#modalCard');
  game.modal = kind; m.hidden = false; card._html = null;
  card.className = 'modal-card' + (kind === 'tree' ? ' wide' : '');
  const html = kind === 'event' ? eventHtml(game) : kind === 'tree' ? techTreeHtml(game) : kind === 'menu' ? menuHtml(game, extra || {}) : extra;
  patch(card, html);
  m.setAttribute('aria-labelledby', kind === 'event' ? 'evTitle' : '');
  setTimeout(() => { const f = card.querySelector('button:not([disabled]), input'); f && f.focus({ preventScroll: true }); }, 30);
}
function closeModal() {
  if (game.modal === 'event' && game.s && game.s.pending) return; // events must be answered
  if (game.modal === 'menu' && !game.s) return;
  $('#modal').hidden = true; game.modal = null;
}

/* ------------------------------------------------------------------ global clicks */
document.addEventListener('click', ev => {
  const c = ev.target.closest('[data-cmd]');
  if (c && !c.disabled) { dispatch(JSON.parse(c.dataset.cmd)); return; }
  const a = ev.target.closest('[data-act]'); if (!a) return;
  const act = a.dataset.act;
  if (act === 'close') clearSelection();
  else if (act === 'town') selectTown(+a.dataset.town);
  else if (act === 'tree') openModal('tree');
  else if (act === 'closeModal') closeModal();
  else if (act === 'rename') {
    const t = game.s.settlements.find(x => x.id === +a.dataset.town);
    openModal('rename', `<div class="menu-body"><h2>Rename ${esc(t.name)}</h2><div class="field" style="margin-top:14px"><label for="renameIn">New name</label><input id="renameIn" maxlength="20" value="${esc(t.name)}"></div>
      <div class="row"><button class="btn" data-act="doRename" data-town="${t.id}">Rename</button><button class="btn ghost" data-act="closeModal">Cancel</button></div></div>`);
  } else if (act === 'doRename') { dispatch({ type: 'rename', town: +a.dataset.town, name: $('#renameIn').value }); closeModal(); }
  else if (act === 'exportChronicle') {
    const s = game.s, txt = `The Chronicle of ${s.civName}\n\n` + s.chronicle.map(c => `${formatYear(c.year)} — ${c.text}`).join('\n');
    const url = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })), l = document.createElement('a');
    l.href = url; l.download = `chronicle-${s.civName.replace(/\W+/g, '-').toLowerCase()}.txt`; l.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  else if (act === 'newGame') newGame($('#seedIn').value.trim() || randomSeed());
  else if (act === 'reroll') $('#seedIn').value = randomSeed();
  else if (act === 'saveSlot') { if (persist.save(+a.dataset.slot, game.s)) toast('Saved.', 'good'); else toast('Saving is blocked in this browser.', 'bad'); openModal('menu'); }
  else if (act === 'loadSlot') { const s = persist.load(+a.dataset.slot); if (s) { startState(s); setSpeed(0); closeModal(); toast(`Loaded — ${formatYear(s.year)}.`, 'good'); } else toast('That save could not be read.', 'bad'); }
  else if (act === 'export') persist.exportFile(game.s);
  else if (act === 'coachSkip') { game.setPref('coach', false); renderCoach(game); }
  else if (act === 'coachDone') { game.setPref('coach', false); renderCoach(game); }
});
document.addEventListener('change', ev => {
  const t = ev.target;
  if (t.matches('[data-act="import"]') && t.files[0]) {
    persist.importFile(t.files[0]).then(s => { startState(s); setSpeed(0); closeModal(); toast('Save imported.', 'good'); }).catch(e => toast(e.message || 'Invalid save file.', 'bad'));
  } else if (t.matches('[data-pref]')) {
    game.setPref(t.dataset.pref, t.checked);
    if (t.dataset.pref === 'sound') setSound(t.checked);
    if (t.dataset.pref === 'reduced') renderer.reduced = t.checked;
    if (t.dataset.pref === 'coach') { if (t.checked) game.setPref('coachStep', 0); renderCoach(game); }
  } else if (t.matches('[data-labor]')) {
    const weights = {}; $$('[data-labor]').forEach(x => { weights[x.dataset.labor] = +x.value; });
    dispatch({ type: 'labor', weights });
  }
});
$('#modal').addEventListener('click', ev => { if (ev.target.id === 'modal') closeModal(); });
$('#menuBtn').addEventListener('click', () => openModal('menu'));
$$('#timeCtrl [data-speed]').forEach(b => b.addEventListener('click', () => setSpeed(+b.dataset.speed)));
$$('#rightPanel .tabs [data-tab]').forEach(b => b.addEventListener('click', () => { $('#rightPanel').classList.remove('collapsed'); syncSheet(); sidebar.tab = b.dataset.tab; renderSidebar(game, true); $('#tabBody').scrollTop = 0; }));
const syncSheet = () => document.body.classList.toggle('has-right', !$('#rightPanel').classList.contains('collapsed'));
$('#collapseRight').addEventListener('click', () => { $('#rightPanel').classList.toggle('collapsed'); syncSheet(); });
if (matchMedia('(max-width: 760px)').matches) $('#rightPanel').classList.add('collapsed'); // phones: map first
syncSheet();
guardClicks($('#leftPanel')); guardClicks($('#tabBody')); guardClicks($('#modalCard'));

/* ------------------------------------------------------------------ map input: pan, zoom, pinch, click, hover */
const canvas = $('#world'), tip = $('#tooltip');
const pointers = new Map();
let drag = null, pinch = 0;
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, moved: false }; tip.hidden = true;
});
canvas.addEventListener('pointermove', e => {
  if (!game.s) return;
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch) renderer.cam.zoomAt(d / pinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
    pinch = d; if (drag) drag.moved = true; return;
  }
  if (drag && pointers.size) {
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) { drag.moved = true; canvas.classList.add('dragging'); }
    if (drag.moved) { renderer.cam.panBy(e.clientX - drag.x, e.clientY - drag.y); drag.x = e.clientX; drag.y = e.clientY; }
    return;
  }
  if (e.pointerType !== 'mouse') return;
  const i = renderer.pick(e.clientX, e.clientY); renderer.hover = i;
  if (i < 0) { tip.hidden = true; return; }
  const t = game.s.tiles[i];
  if (!t.seen) { tip.innerHTML = '<b>Uncharted</b><span>Click to send scouts</span>'; }
  else {
    const town = game.s.settlements.find(x => x.tile === i), camp = game.s.camps.find(c => c.tile === i);
    tip.innerHTML = town ? `<b>${esc(town.name)}</b><span>${town.pop} people · click to manage</span>`
      : camp ? '<b>Raider camp</b><span>Click to plan an expedition</span>'
      : `<b>${TERRAIN[t.t].name}${t.riv ? ' · river' : ''}${t.res ? ' · ' + RESOURCES[t.res].name : ''}</b><div class="yields" style="margin-top:4px">${yieldsHtml(tileYield(game.s, i, null))}</div>`;
  }
  tip.hidden = false; tip.style.left = Math.min(e.clientX, innerWidth - 260) + 'px'; tip.style.top = Math.min(e.clientY, innerHeight - 90) + 'px';
});
const endPointer = e => {
  pointers.delete(e.pointerId); if (pointers.size < 2) pinch = 0;
  if (drag && !drag.moved && pointers.size === 0 && game.s) select(renderer.pick(e.clientX, e.clientY));
  if (!pointers.size) { drag = null; canvas.classList.remove('dragging'); }
};
canvas.addEventListener('pointerup', endPointer); canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', () => { renderer.hover = -1; tip.hidden = true; });
canvas.addEventListener('wheel', e => { e.preventDefault(); if (game.s) renderer.cam.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY); }, { passive: false });
addEventListener('resize', () => game.s && renderer.resize());

addEventListener('keydown', e => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { if (e.key === 'Escape') document.activeElement.blur(); return; }
  if (!game.s) return;
  const k = e.key.toLowerCase(), cam = renderer.cam;
  if (k === 'escape') { if (game.modal) closeModal(); else clearSelection(); }
  else if (game.modal && game.modal !== 'tree') return;
  else if (k === ' ') { e.preventDefault(); setSpeed(game.speed ? 0 : game.lastSpeed); }
  else if (k === '1') setSpeed(1); else if (k === '2') setSpeed(2); else if (k === '3') setSpeed(4);
  else if (k === 't') game.modal === 'tree' ? closeModal() : openModal('tree');
  else if (k === 'm') openModal('menu');
  else if (k === 'c') { sidebar.tab = 'chronicle'; renderSidebar(game, true); }
  else if (k === '+' || k === '=') cam.zoomAt(1.2, cam.vw / 2, cam.vh / 2);
  else if (k === '-') cam.zoomAt(1 / 1.2, cam.vw / 2, cam.vh / 2);
  else if (['arrowleft', 'a'].includes(k)) cam.panBy(80, 0); else if (['arrowright', 'd'].includes(k)) cam.panBy(-80, 0);
  else if (['arrowup', 'w'].includes(k)) cam.panBy(0, 80); else if (['arrowdown', 's'].includes(k)) cam.panBy(0, -80);
  else if (k === 'h' && game.s.settlements[0]) selectTown(game.s.settlements[0].id);
});

/* ------------------------------------------------------------------ save on leave */
const autosave = () => game.s && persist.save(0, game.s);
addEventListener('visibilitychange', () => { if (document.hidden) autosave(); });
addEventListener('beforeunload', autosave);

/* ------------------------------------------------------------------ main loop */
let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (game.s) {
    const blocked = game.modal && !(game.modal === 'event' && !game.prefs.pauseOnEvent) || (game.s.pending && game.prefs.pauseOnEvent);
    if (game.speed && !blocked) {
      acc += dt * 1000;
      const iv = INTERVAL[game.speed];
      if (acc >= iv) { acc = acc - iv > iv ? 0 : acc - iv; step(); }
      renderSeasonRing(game, acc / iv);
    }
    renderer.draw(dt);
  }
  requestAnimationFrame(frame);
}

game.refresh = refresh; game.dispatch = dispatch; game.openModal = openModal;

/* ------------------------------------------------------------------ boot */
const saved = persist.load(0);
if (saved) {
  startState(saved);
  toast(`Welcome back to ${saved.civName} — ${formatYear(saved.year)}.`, 'good');
} else {
  startState(createGame(randomSeed()));
  openModal('menu', { first: true });
}
if (game.prefs.sound) addEventListener('pointerdown', () => setSound(true), { once: true }); // browsers need a gesture first
renderSeasonRing(game, 0);
requestAnimationFrame(frame);
