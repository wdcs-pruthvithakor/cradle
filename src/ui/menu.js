// Main menu: continue, new world, save slots, import/export, settings, how to play.
import { esc } from './dom.js';
import { meta, SLOTS } from '../persist.js';

const WORDS = ['amber', 'river', 'cedar', 'falcon', 'harbor', 'ember', 'meadow', 'stone', 'willow', 'tide', 'north', 'saffron', 'thistle', 'basalt'];
export const randomSeed = () => WORDS[Math.floor(Math.random() * WORDS.length)] + '-' + Math.floor(Math.random() * 900 + 100);

export function menuHtml(game, opts = {}) {
  const slotRow = n => {
    const m = meta(n);
    return `<div class="slot"><span><b>${n === 0 ? 'Autosave' : 'Slot ' + n}</b><small>${m ? `${esc(m.civ)} · ${esc(m.year)} · ${esc(m.era)} · score ${m.score}` : 'Empty'}</small></span>
      ${n ? `<button class="btn sm ghost" data-act="saveSlot" data-slot="${n}" ${game.s ? '' : 'disabled'}>Save</button>` : '<span></span>'}
      <button class="btn sm" data-act="loadSlot" data-slot="${n}" ${m ? '' : 'disabled'}>Load</button></div>`;
  };
  return `<div class="menu-body">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div><h1>Cradle</h1><p class="tag">Grow a civilization from a single fire to a renaissance.</p></div>
      ${game.s && !opts.first ? '<button class="x" data-act="closeModal" aria-label="Close menu">✕</button>' : ''}
    </div>
    <div class="menu-grid">
      ${game.s && !opts.first ? '<button class="btn wide" data-act="closeModal">Continue</button>' : ''}
      <div class="sec" style="margin-top:6px"><h4>New world</h4>
        <div class="field"><label for="seedIn">World seed</label><div class="row"><input id="seedIn" value="${esc(randomSeed())}" style="flex:1" spellcheck="false"><button class="btn ghost sm" data-act="reroll" aria-label="Random seed">↻</button></div></div>
        <button class="btn wide" data-act="newGame">Begin a new world</button>
        <p class="hint">Same seed, same world — share it with a friend and compare your chronicles.</p></div>
      <div class="sec"><h4>Saves</h4><div class="slots">${SLOTS.map(slotRow).join('')}</div>
        <div class="row"><button class="btn ghost sm" data-act="export" ${game.s ? '' : 'disabled'}>Export save file</button>
        <label class="btn ghost sm" style="cursor:pointer">Import save file<input type="file" accept="application/json,.json" data-act="import" hidden></label></div></div>
      <div class="sec"><h4>Settings</h4>
        <label class="toggle-row">Sound (gentle ambience) <input type="checkbox" data-pref="sound" ${game.prefs.sound ? 'checked' : ''}></label>
        <label class="toggle-row">Reduce motion <input type="checkbox" data-pref="reduced" ${game.prefs.reduced ? 'checked' : ''}></label>
        <label class="toggle-row">Pause when an event appears <input type="checkbox" data-pref="pauseOnEvent" ${game.prefs.pauseOnEvent ? 'checked' : ''}></label>
        <label class="toggle-row">Show tutorial tips <input type="checkbox" data-pref="coach" ${game.prefs.coach ? 'checked' : ''}></label></div>
      <div class="sec"><h4>How to play</h4><p class="hint" style="font-size:13.5px">
        Time flows in seasons — use <b>Space</b> to pause and <b>1 / 2 / 3</b> for speed. Click your town to build; click tiles in your borders to improve them.
        Pick research in the <b>Research</b> tab, set work priorities and policies in the <b>Council</b>.
        Grow towns to 4 people to send settlers to new land. Keep people fed, housed, healthy and happy.
        Events will ask you to decide; raiders will test your walls. Everything you do is written in the <b>Chronicle</b>.
        Drag to pan, scroll or pinch to zoom, <b>T</b> opens the tech tree, <b>Esc</b> closes panels.</p></div>
    </div></div>`;
}
