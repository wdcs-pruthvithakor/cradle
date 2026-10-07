// Small DOM helpers shared by the UI modules.
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const icon = (name, cls = '') => `<svg class="ic c-${name} ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
export const fmt = n => { const a = Math.abs(n); return a >= 100 ? Math.round(n).toLocaleString() : a >= 10 ? Math.round(n) : (Math.round(n * 10) / 10); };
export const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + fmt(Math.abs(n));
export const RES_LABEL = { food: 'Food', wood: 'Wood', stone: 'Stone', ore: 'Ore', knowledge: 'Knowledge', gold: 'Gold' };

export function costHtml(cost = {}, res) {
  return Object.entries(cost).map(([k, v]) => `<span class="${res && (res[k] || 0) < v ? 'short' : ''}">${icon(k)}${v}</span>`).join('');
}
export function yieldsHtml(y) {
  return Object.entries(y).filter(([, v]) => v > 0).map(([k, v]) => `<span class="c-${k}" title="${RES_LABEL[k]}">${icon(k)}${fmt(v)}</span>`).join('');
}

/** Replace innerHTML only when it changed, and never while the pointer is pressed inside (keeps clicks reliable). */
export function patch(el, html) {
  if (el._html === html) return;
  if (el._pressed) { el._pending = html; return; }
  el._html = html; el.innerHTML = html;
}
export function guardClicks(el) {
  el.addEventListener('pointerdown', () => { el._pressed = true; });
  const up = () => { el._pressed = false; if (el._pending != null) { const h = el._pending; el._pending = null; patch(el, h); } };
  addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
