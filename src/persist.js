// Saving and loading. Local storage access is always guarded: private windows or blocked storage
// must never crash the game — it simply runs without saves.
import { ERAS } from './content/techs.js';
import { formatYear } from './sim/state.js';

const KEY = n => `cradle-save-${n}`; // slot 0 = autosave, 1..3 = manual
export const SLOTS = [0, 1, 2, 3];

export function save(slot, s) {
  try { localStorage.setItem(KEY(slot), JSON.stringify({ savedAt: Date.now(), state: s })); return true; } catch (e) { return false; }
}
export function load(slot) {
  try { const raw = localStorage.getItem(KEY(slot)); if (!raw) return null; return validate(JSON.parse(raw).state); } catch (e) { return null; }
}
export function remove(slot) { try { localStorage.removeItem(KEY(slot)); } catch (e) {} }
export function meta(slot) {
  try {
    const raw = localStorage.getItem(KEY(slot)); if (!raw) return null;
    const { savedAt, state: s } = JSON.parse(raw);
    return { savedAt, civ: s.civName, year: formatYear(s.year), era: ERAS[s.era].name, towns: s.settlements.length, score: s.score };
  } catch (e) { return null; }
}

export function validate(s) {
  if (!s || s.v !== 1 || !Array.isArray(s.tiles) || !Array.isArray(s.settlements) || !s.res) throw new Error('Not a Cradle save file.');
  return s;
}

export function exportFile(s) {
  const blob = new Blob([JSON.stringify(s)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cradle-${s.civName.replace(/\W+/g, '-').toLowerCase()}-${formatYear(s.year).replace(' ', '')}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function importFile(file) {
  return file.text().then(t => validate(JSON.parse(t)));
}

export const prefs = {
  get(k, d) { try { const v = localStorage.getItem('cradle-pref-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('cradle-pref-' + k, JSON.stringify(v)); } catch (e) {} }
};
