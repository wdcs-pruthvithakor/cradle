// Transient notifications. Repeated messages within a short window are merged.
import { $, esc } from './dom.js';

const ICON = { grow: '↑', built: '⚒', good: '✓', bad: '!', warn: '!', tech: '✦', era: '☀', achievement: '★', event: '❖', toast: '' };
let recent = new Map();

export function toast(text, type = 'toast') {
  const now = performance.now();
  if (recent.has(text) && now - recent.get(text) < 2500) return;
  recent.set(text, now);
  const box = $('#toasts');
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = (ICON[type] ? `<span aria-hidden="true">${ICON[type]}</span>` : '') + esc(text);
  box.appendChild(el);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => el.remove(), 3700);
}

/** Show simulation notifications; minor ones (growth/built) only when few things happen at once. */
export function showEvents(events = []) {
  const major = events.filter(e => !['grow', 'built', 'toast'].includes(e.type));
  const minor = events.filter(e => ['grow', 'built', 'toast'].includes(e.type));
  major.forEach(e => toast(e.text, e.type));
  if (major.length < 2) minor.slice(0, 2).forEach(e => toast(e.text, e.type));
}
