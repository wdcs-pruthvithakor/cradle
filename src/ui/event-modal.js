// Event modal: a small painted scene plus the choices.
import { esc, costHtml } from './dom.js';
import { pendingView } from '../sim/events.js';

const SKY = { sun: ['#f6c86b', '#f19a4e'], plague: ['#9aa38a', '#5e6b58'], comet: ['#1b2440', '#3c4a7a'], nomads: ['#f3d9a4', '#d9a45f'], flood: ['#8fb7c9', '#5d8aa3'],
  wheat: ['#f8e3a1', '#e8b85a'], ruins: ['#d8c8a6', '#a89070'], lights: ['#141a33', '#2b335c'], fist: ['#d98c6b', '#8c3f2b'], scroll: ['#efe2c2', '#c9a874'],
  fire: ['#f7b267', '#c4472a'], camel: ['#f6d8a0', '#d39a52'], quake: ['#c9b9a0', '#7d6b55'], deer: ['#cfe0b0', '#8fb35c'] };

function art(kind) {
  const [a, b] = SKY[kind] || ['#cfe0f0', '#8fb7c9'];
  const night = ['comet', 'lights'].includes(kind);
  let motif = '';
  if (kind === 'comet') motif = '<path d="M380 30 L250 95" stroke="#fff6d8" stroke-width="3" opacity=".7"/><circle cx="250" cy="96" r="7" fill="#fffbe8"/>';
  if (kind === 'lights') motif = [[120, 60], [220, 40], [330, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#ffe9a8" opacity=".18"/><circle cx="${x}" cy="${y}" r="5" fill="#fff4c9"/>`).join('');
  if (kind === 'sun') motif = '<circle cx="380" cy="55" r="34" fill="#fff1c2" opacity=".9"/>';
  if (kind === 'fire') motif = '<path d="M180 150 q20-60 40-20 q10-40 30 0 q15-30 25 20z" fill="#f6d365" opacity=".85"/>';
  if (kind === 'flood') motif = '<path d="M0 125 q60-12 120 0 t120 0 t120 0 t120 0 V170 H0z" fill="#5d8aa3" opacity=".7"/>';
  if (kind === 'ruins') motif = '<rect x="200" y="85" width="14" height="50" fill="#8c7b62"/><rect x="250" y="95" width="14" height="40" fill="#8c7b62"/><rect x="190" y="78" width="85" height="10" fill="#9c8a70"/>';
  const stars = night ? Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 480}" cy="${(i * 53) % 90}" r="${i % 3 ? .8 : 1.4}" fill="#fff" opacity=".7"/>`).join('') : '';
  return `<svg viewBox="0 0 480 170" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs><linearGradient id="evsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
    <rect width="480" height="170" fill="url(#evsky)"/>${stars}${motif}
    <path d="M0 130 Q80 95 170 122 T330 115 T480 120 V170 H0Z" fill="${night ? '#1f2a2a' : '#6d8f4a'}" opacity=".9"/>
    <path d="M0 150 Q120 128 250 146 T480 140 V170 H0Z" fill="${night ? '#151d1d' : '#557539'}"/>
    <g fill="${night ? '#0f1414' : '#3d2f22'}"><path d="M60 142 l8-12 8 12z"/><rect x="64" y="142" width="8" height="8"/><path d="M84 146 l7-10 7 10z"/><rect x="88" y="146" width="6" height="6"/></g></svg>`;
}

export function eventHtml(game) {
  const v = pendingView(game.s); if (!v) return '';
  return `<div class="ev-art">${art(v.art)}</div>
    <div class="ev-body"><span class="kick">${esc(v.town || '')} · a decision awaits</span><h2 id="evTitle">${esc(v.title)}</h2><p>${esc(v.text)}</p>
      <div class="ev-choices">${v.choices.map(c => `
        <button class="opt" data-cmd="${esc(JSON.stringify({ type: 'choose', choice: c.i }))}" ${c.allowed && c.affordable ? '' : 'disabled'}>
          <span><b>${esc(c.label)}</b>${!c.allowed ? '<small>Not available to your people yet.</small>' : !c.affordable ? '<small>You cannot afford this.</small>' : ''}</span>
          <span class="cost">${c.cost ? costHtml(c.cost, game.s.res) : ''}</span></button>`).join('')}</div></div>`;
}
