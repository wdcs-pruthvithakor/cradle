// Renders the world every frame: cached terrain + fog, plus live layers (towns, farms, borders, raiders, smoke).
import { Camera } from './camera.js';
import { HEX, hexPath, corner, paintTerrain, paintFog, worldSize, neighborByEdge } from './painter.js';
import { tileCenter, pixelToTile, SQRT3 } from '../sim/hex.js';
import { TERRAIN } from '../content/terrain.js';
import { WONDERS } from '../content/buildings.js';

const TOWN_COLORS = ['#c2562b', '#2f7d7a', '#8a4fa0', '#c79a2a', '#3d6db3', '#b8456a', '#5f8a2f', '#a06a3a'];
const rnd = (i, k = 0) => { const x = Math.sin(i * 91.7 + k * 47.3) * 12345.678; return x - Math.floor(x); };

export class Renderer {
  constructor(canvas, opts = {}) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.reduced = !!opts.reduced;
    this.hover = -1; this.selected = -1;
    this.time = 0;
  }
  setState(s) {
    this.s = s;
    const [ww, wh] = worldSize(s);
    this.worldW = ww; this.worldH = wh;
    if (!this.cam || this.cam.worldW !== ww) this.cam = new Camera(ww, wh);
    this.cacheScale = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    this.terrain = paintTerrain(s, this.cacheScale);
    this.fogKey = -1; this.borderKey = '';
    this.centers = s.tiles.map((t, i) => tileCenter(i % s.W, Math.floor(i / s.W), HEX));
    this.resize();
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), r = this.cv.getBoundingClientRect();
    this.dpr = dpr; this.cv.width = Math.round(r.width * dpr); this.cv.height = Math.round(r.height * dpr);
    if (this.cam) { this.cam.resize(r.width, r.height); this.cam.clamp(); }
  }
  focusTile(i, zoom) { const [x, y] = this.centers[i]; this.cam.focus(x, y, zoom); }
  pick(sx, sy) { const [wx, wy] = this.cam.toWorld(sx, sy); return pixelToTile(wx, wy, HEX, this.s.W, this.s.H); }

  ensureCaches() {
    const s = this.s;
    if (s.stats.seen !== this.fogKey) { this.fog = paintFog(s); this.fogKey = s.stats.seen; }
    const key = s.settlements.map(t => t.id + ':' + t.pop).join(',') + '|' + s.tiles.reduce((n, t) => n + (t.own > 0 ? t.own : 0), 0);
    if (key !== this.borderKey) { this.borders = this.computeBorders(); this.borderKey = key; }
  }
  computeBorders() {
    const s = this.s, segs = [];
    s.tiles.forEach((t, i) => {
      if (t.own < 0) return;
      const nb = neighborByEdge(s, i), [x, y] = this.centers[i];
      for (let k = 0; k < 6; k++) {
        const j = nb[k];
        if (j >= 0 && s.tiles[j].own === t.own) continue;
        const a = corner(x, y, HEX * .94, k), b = corner(x, y, HEX * .94, (k + 1) % 6);
        segs.push({ own: t.own, a, b });
      }
    });
    return segs;
  }
  townColor(id) { const i = this.s.settlements.findIndex(t => t.id === id); return TOWN_COLORS[(i < 0 ? 0 : i) % TOWN_COLORS.length]; }

  draw(dt) {
    const s = this.s, g = this.ctx, cam = this.cam;
    if (!s) return;
    this.time += this.reduced ? 0 : dt;
    cam.update(this.reduced);
    this.ensureCaches();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#2c5f7a'; g.fillRect(0, 0, this.cv.width, this.cv.height);
    const z = cam.zoom * this.dpr;
    g.setTransform(z, 0, 0, z, (cam.vw / 2 - cam.x * cam.zoom) * this.dpr, (cam.vh / 2 - cam.y * cam.zoom) * this.dpr);
    g.imageSmoothingQuality = 'high';
    g.drawImage(this.terrain, 0, 0, this.worldW, this.worldH);

    const v = cam.view(), vis = [];
    s.tiles.forEach((t, i) => { const [x, y] = this.centers[i]; if (x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1) vis.push(i); });

    this.drawWater(g, vis);
    this.drawSeason(g);
    for (const i of vis) { const t = s.tiles[i]; if (t.imp) this.drawImprovement(g, t.imp, i); }
    this.drawConstruction(g);
    this.drawBorders(g);
    for (const camp of s.camps) if (s.tiles[camp.tile].seen) this.drawCamp(g, camp);
    for (const town of s.settlements) this.drawTown(g, town);
    g.drawImage(this.fog, 0, 0, this.worldW, this.worldH);
    this.drawHighlights(g);
    for (const town of s.settlements) this.drawLabel(g, town);
    this.drawLight(g);
  }

  drawWater(g, vis) {
    if (this.reduced) return;
    const t = this.time;
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
    for (const i of vis) {
      if (!TERRAIN[this.s.tiles[i].t].water || rnd(i) > .45) continue;
      const [x, y] = this.centers[i], ph = (t * .6 + rnd(i, 1) * 6) % 6;
      if (ph > 2) continue;
      const a = Math.sin(ph / 2 * Math.PI), px = x + (rnd(i, 2) - .5) * HEX, py = y + (rnd(i, 3) - .5) * HEX;
      g.globalAlpha = a * .8; g.beginPath(); g.moveTo(px - 5, py); g.quadraticCurveTo(px, py - 2.5, px + 5, py); g.stroke();
    }
    g.globalAlpha = 1;
  }
  drawSeason(g) {
    const season = this.s.tick % 4;
    const tint = [null, 'rgba(255,214,120,.06)', 'rgba(214,120,40,.10)', 'rgba(235,242,255,.30)'][season];
    if (!tint) return;
    g.fillStyle = tint;
    if (season === 3) { // winter: frost on land only
      for (let i = 0; i < this.s.tiles.length; i++) {
        const t = this.s.tiles[i]; if (TERRAIN[t.t].water) continue;
        const [x, y] = this.centers[i]; hexPath(g, x, y, HEX * 1.02); g.fill();
      }
    } else g.fillRect(0, 0, this.worldW, this.worldH);
  }
  drawImprovement(g, imp, i) {
    const [x, y] = this.centers[i];
    g.save(); g.translate(x, y);
    if (imp === 'farm') {
      g.fillStyle = 'rgba(214,180,70,.75)';
      for (let r = -2; r <= 2; r++) { g.save(); g.rotate(-.35); g.fillRect(-15, r * 5.2 - 1.8, 30, 3); g.restore(); }
      g.strokeStyle = 'rgba(110,80,30,.6)'; g.lineWidth = .8; hexPath(g, 0, 0, HEX * .62); g.stroke();
    } else if (imp === 'pasture') {
      g.strokeStyle = '#7a5532'; g.lineWidth = 1.3; hexPath(g, 0, 0, HEX * .6); g.stroke();
      g.fillStyle = '#f5f0e6'; for (let k = 0; k < 4; k++) { g.beginPath(); g.ellipse((rnd(i, k) - .5) * 20, (rnd(i, k + 4) - .5) * 16, 3, 2, 0, 0, 7); g.fill(); }
    } else if (imp === 'camp') {
      g.fillStyle = '#8a5a32'; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(-4 + k * 4, 8 - (k % 2) * 3, 6, 2.2, 0, 0, 7); g.fill(); }
      g.fillStyle = '#d9b48a'; g.beginPath(); g.arc(-8, 6, 2, 0, 7); g.fill();
    } else if (imp === 'quarry') {
      g.fillStyle = '#d8d2c4'; g.strokeStyle = '#7d7466'; g.lineWidth = .8;
      for (const [dx, dy] of [[-6, 4], [2, 6], [-1, -1], [7, 1]]) { g.fillRect(dx - 3.5, dy - 3, 7, 6); g.strokeRect(dx - 3.5, dy - 3, 7, 6); }
    } else if (imp === 'mine') {
      g.fillStyle = '#3a2f26'; g.beginPath(); g.arc(0, 8, 7, Math.PI, 0); g.fill();
      g.strokeStyle = '#a77b47'; g.lineWidth = 1.6; g.beginPath(); g.arc(0, 8, 8, Math.PI, 0); g.stroke();
      g.fillStyle = '#c4672f'; g.fillRect(8, 5, 6, 4);
    } else if (imp === 'boats') {
      const bob = this.reduced ? 0 : Math.sin(this.time * 2 + i) * 1.2;
      for (const [dx, dy] of [[-7, 2], [6, -4]]) {
        g.fillStyle = '#6b4a2b'; g.beginPath(); g.moveTo(dx - 6, dy + bob); g.lineTo(dx + 6, dy + bob); g.lineTo(dx + 4, dy + 3 + bob); g.lineTo(dx - 4, dy + 3 + bob); g.closePath(); g.fill();
        g.fillStyle = '#f5efe0'; g.beginPath(); g.moveTo(dx, dy - 9 + bob); g.lineTo(dx, dy - 1 + bob); g.lineTo(dx + 5, dy - 1 + bob); g.closePath(); g.fill();
      }
    }
    g.restore();
  }
  drawConstruction(g) {
    for (const town of this.s.settlements) {
      const job = town.queue[0]; if (!job || job.kind !== 'improvement') continue;
      const [x, y] = this.centers[job.tile];
      g.strokeStyle = 'rgba(80,55,30,.8)'; g.lineWidth = 1.2; g.setLineDash([3, 3]); hexPath(g, x, y, HEX * .7); g.stroke(); g.setLineDash([]);
      g.strokeStyle = '#f3c74e'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, job.progress / job.time)); g.stroke();
    }
  }
  drawBorders(g) {
    g.lineWidth = 2.4; g.lineCap = 'round';
    for (const seg of this.borders) {
      g.strokeStyle = this.townColor(seg.own);
      g.globalAlpha = .85; g.beginPath(); g.moveTo(...seg.a); g.lineTo(...seg.b); g.stroke();
    }
    g.globalAlpha = 1;
  }
  drawCamp(g, camp) {
    const [x, y] = this.centers[camp.tile];
    g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.ellipse(x, y + 8, 16, 5, 0, 0, 7); g.fill();
    for (const [dx, dy, c] of [[-8, 2, '#7d3b2a'], [7, 4, '#94523a'], [-1, -5, '#6e3324']]) {
      g.fillStyle = c; g.beginPath(); g.moveTo(x + dx, y + dy - 11); g.lineTo(x + dx + 8, y + dy + 3); g.lineTo(x + dx - 8, y + dy + 3); g.closePath(); g.fill();
    }
    const fl = this.reduced ? 1 : .7 + Math.sin(this.time * 12 + camp.id) * .3;
    g.fillStyle = `rgba(255,${140 + fl * 60},40,${fl})`; g.beginPath(); g.arc(x + 1, y + 9, 3 * fl, 0, 7); g.fill();
    g.strokeStyle = '#2a1d15'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x + 13, y + 4); g.lineTo(x + 13, y - 16); g.stroke();
    g.fillStyle = '#b3261e'; g.beginPath(); g.moveTo(x + 13, y - 16); g.lineTo(x + 22, y - 12); g.lineTo(x + 13, y - 8); g.closePath(); g.fill();
  }
  drawTown(g, town) {
    const [x, y] = this.centers[town.tile], col = this.townColor(town.id);
    const n = Math.min(16, 2 + Math.round(town.pop * .7));
    // walls
    if (town.buildings.walls) { g.strokeStyle = '#8f8576'; g.lineWidth = 3.4; g.beginPath(); g.arc(x, y + 2, 22 + Math.min(10, town.pop * .5), 0, 7); g.stroke(); g.strokeStyle = '#b8ae9c'; g.lineWidth = 1.2; g.stroke(); }
    // houses in a gentle spiral, back to front
    const houses = [];
    for (let k = 0; k < n; k++) { const a = k * 2.4 + town.id, r = 4 + Math.sqrt(k) * 6.4; houses.push([x + Math.cos(a) * r, y + Math.sin(a) * r * .75 + 2, k]); }
    houses.sort((a, b) => a[1] - b[1]);
    for (const [hx, hy, k] of houses) {
      const w = 7 + (k % 3), h = 5 + (k % 2) * 2;
      g.fillStyle = 'rgba(40,30,20,.22)'; g.fillRect(hx - w / 2 + 1.5, hy + 1, w, 2);
      g.fillStyle = '#efe4cf'; g.fillRect(hx - w / 2, hy - h, w, h);
      g.fillStyle = k % 4 === 0 ? col : '#9c5a3c'; g.beginPath(); g.moveTo(hx - w / 2 - 1.5, hy - h); g.lineTo(hx, hy - h - 5); g.lineTo(hx + w / 2 + 1.5, hy - h); g.closePath(); g.fill();
      g.fillStyle = '#5d4632'; g.fillRect(hx - 1, hy - 3, 2, 3);
    }
    // landmark: wonder or temple/shrine
    const wonder = Object.keys(town.buildings).find(b => WONDERS[b]);
    if (wonder) this.drawWonder(g, wonder, x + 18, y - 10);
    else if (town.buildings.temple || town.buildings.shrine) { g.fillStyle = '#e8dcc0'; g.fillRect(x + 12, y - 16, 10, 9); g.fillStyle = col; g.beginPath(); g.moveTo(x + 10, y - 16); g.lineTo(x + 17, y - 23); g.lineTo(x + 24, y - 16); g.closePath(); g.fill(); }
    // capital flag
    if (town.capital) { g.strokeStyle = '#3a2a1c'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x - 2, y - 6); g.lineTo(x - 2, y - 24); g.stroke(); g.fillStyle = col; g.beginPath(); g.moveTo(x - 2, y - 24); g.lineTo(x + 8, y - 21); g.lineTo(x - 2, y - 17); g.closePath(); g.fill(); }
    // chimney smoke
    if (!this.reduced) for (let k = 0; k < Math.min(4, 1 + Math.floor(town.pop / 4)); k++) {
      const [hx, hy] = houses[(k * 3) % houses.length];
      for (let p = 0; p < 4; p++) {
        const ph = ((this.time * .35 + p / 4 + k * .13) % 1), sx = hx + Math.sin(ph * 6 + k) * 3 + ph * 6, sy = hy - 10 - ph * 22;
        g.fillStyle = `rgba(245,245,240,${(1 - ph) * .45})`; g.beginPath(); g.arc(sx, sy, 1.5 + ph * 4, 0, 7); g.fill();
      }
    }
  }
  drawWonder(g, id, x, y) {
    g.save(); g.translate(x, y);
    if (id === 'pyramid') { g.fillStyle = '#e2c98a'; g.beginPath(); g.moveTo(-12, 8); g.lineTo(0, -10); g.lineTo(12, 8); g.closePath(); g.fill(); g.fillStyle = '#c4a764'; g.beginPath(); g.moveTo(0, -10); g.lineTo(12, 8); g.lineTo(3, 8); g.closePath(); g.fill(); }
    else if (id === 'stonecircle') { g.fillStyle = '#9d968b'; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; g.fillRect(Math.cos(a) * 9 - 1.5, Math.sin(a) * 5 - 5, 3, 6); } }
    else if (id === 'colossus' || id === 'compass') { g.fillStyle = '#b07a3e'; g.fillRect(-2, -14, 4, 20); g.beginPath(); g.arc(0, -16, 3, 0, 7); g.fill(); g.fillStyle = '#ffcf5a'; g.beginPath(); g.arc(4, -20, 2.5, 0, 7); g.fill(); }
    else { g.fillStyle = '#f1e8d6'; g.fillRect(-10, -6, 20, 12); g.fillStyle = '#c9b48d'; g.beginPath(); g.moveTo(-12, -6); g.lineTo(0, -15); g.lineTo(12, -6); g.closePath(); g.fill(); g.fillStyle = '#b39c74'; for (let k = -8; k <= 8; k += 4) g.fillRect(k - .8, -5, 1.6, 10); }
    g.restore();
  }
  drawHighlights(g) {
    if (this.hover >= 0) { const [x, y] = this.centers[this.hover]; g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 2; hexPath(g, x, y, HEX * .97); g.stroke(); }
    if (this.selected >= 0) {
      const [x, y] = this.centers[this.selected], p = this.reduced ? 0 : (Math.sin(this.time * 4) + 1) / 2;
      g.strokeStyle = `rgba(255,214,90,${.75 + p * .25})`; g.lineWidth = 3 + p; hexPath(g, x, y, HEX * .96); g.stroke();
    }
  }
  drawLabel(g, town) {
    const [x, y] = this.centers[town.tile];
    const label = `${town.name}  ${town.pop}`;
    g.font = '700 11px Nunito Sans, system-ui, sans-serif';
    const w = g.measureText(label).width + 16, lx = x - w / 2, ly = y + 20;
    g.fillStyle = 'rgba(44,36,27,.82)'; roundRect(g, lx, ly, w, 17, 8); g.fill();
    g.fillStyle = this.townColor(town.id); g.beginPath(); g.arc(lx + 8, ly + 8.5, 3, 0, 7); g.fill();
    g.fillStyle = '#fbf6ea'; g.textBaseline = 'middle'; g.fillText(label, lx + 13, ly + 9);
    if (town.queue[0] && town.queue[0].kind !== 'improvement') { // build progress bar
      const p = Math.min(1, town.queue[0].progress / town.queue[0].time);
      g.fillStyle = 'rgba(44,36,27,.6)'; g.fillRect(lx + 6, ly + 18, w - 12, 3); g.fillStyle = '#f3c74e'; g.fillRect(lx + 6, ly + 18, (w - 12) * p, 3);
    }
  }
  drawLight(g) {
    if (this.reduced) return;
    // a slow, subtle day/night breathing of the light
    const d = (Math.sin(this.time / 40 * Math.PI * 2) + 1) / 2;
    if (d < .5) return;
    g.fillStyle = `rgba(30,40,90,${(d - .5) * .22})`;
    g.fillRect(this.cam.view().x0, this.cam.view().y0, this.cam.view().x1 - this.cam.view().x0, this.cam.view().y1 - this.cam.view().y0);
  }
}

function roundRect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
export { TOWN_COLORS, SQRT3 };
