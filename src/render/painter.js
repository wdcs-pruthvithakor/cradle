// Paints the static "diorama" terrain once into an offscreen canvas.
// Everything here is deterministic per tile, so the map looks the same every time it loads.
import { TERRAIN } from '../content/terrain.js';
import { neighbors, tileCenter, SQRT3 } from '../sim/hex.js';

export const HEX = 30; // world px from hex center to corner

const tileRand = (i, k = 0) => { let x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

export function hexPath(ctx, x, y, size) {
  ctx.beginPath();
  for (let k = 0; k < 6; k++) {
    const a = Math.PI / 180 * (60 * k - 30);
    const px = x + size * Math.cos(a), py = y + size * Math.sin(a);
    k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}
// corner k of a pointy-top hex; edge k joins corner k and k+1 and faces neighbor direction DIR_OF_EDGE[k]
export const corner = (x, y, size, k) => { const a = Math.PI / 180 * (60 * k - 30); return [x + size * Math.cos(a), y + size * Math.sin(a)]; };

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function worldSize(s) { return [HEX * SQRT3 * (s.W + .5) + HEX * .2, HEX * 1.5 * s.H + HEX * .6]; }

export function paintTerrain(s, scale) {
  const [ww, wh] = worldSize(s);
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(ww * scale); cv.height = Math.ceil(wh * scale);
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  // deep sea background
  const sea = g.createLinearGradient(0, 0, 0, wh);
  sea.addColorStop(0, '#356f8c'); sea.addColorStop(1, '#2c5f7a');
  g.fillStyle = sea; g.fillRect(0, 0, ww, wh);

  const centers = s.tiles.map((t, i) => tileCenter(i % s.W, Math.floor(i / s.W), HEX));

  // pass 1: base fills (slightly oversized so hexes blend into each other)
  s.tiles.forEach((t, i) => {
    const [x, y] = centers[i], T = TERRAIN[t.t];
    let c = T.color;
    if (T.water) c = shade(c, (t.e - .3) * .5);
    else c = shade(c, (tileRand(i) - .5) * .06 + (t.e - .55) * .18);
    g.fillStyle = c; hexPath(g, x, y, HEX * 1.04); g.fill();
  });

  // pass 2: shorelines — sand on land edges, foam on water edges
  s.tiles.forEach((t, i) => {
    const [x, y] = centers[i], water = TERRAIN[t.t].water, nb = neighborByEdge(s, i);
    for (let k = 0; k < 6; k++) {
      const j = nb[k]; if (j < 0) continue;
      const otherWater = TERRAIN[s.tiles[j].t].water;
      if (water === otherWater) continue;
      const [ax, ay] = corner(x, y, HEX, k), [bx, by] = corner(x, y, HEX, (k + 1) % 6);
      g.save();
      if (!water) { g.strokeStyle = 'rgba(236,216,160,.85)'; g.lineWidth = 5; }
      else { g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 1.6; g.setLineDash([5, 4]); }
      g.beginPath();
      const inset = water ? .82 : .9;
      g.moveTo(x + (ax - x) * inset, y + (ay - y) * inset); g.lineTo(x + (bx - x) * inset, y + (by - y) * inset); g.stroke();
      g.restore();
    }
  });

  // pass 3: ground texture
  s.tiles.forEach((t, i) => {
    const [x, y] = centers[i];
    if (t.t === 'grass' || t.t === 'plains') {
      g.strokeStyle = t.t === 'grass' ? 'rgba(60,100,40,.35)' : 'rgba(130,110,50,.35)'; g.lineWidth = 1;
      for (let k = 0; k < 7; k++) { const px = x + (tileRand(i, k) - .5) * HEX * 1.4, py = y + (tileRand(i, k + 9) - .5) * HEX * 1.2; g.beginPath(); g.moveTo(px, py); g.lineTo(px - 1.5, py - 4); g.moveTo(px + 2, py); g.lineTo(px + 2.5, py - 3.5); g.stroke(); }
    } else if (t.t === 'desert') {
      g.strokeStyle = 'rgba(170,130,70,.45)'; g.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) { const px = x + (tileRand(i, k) - .5) * HEX, py = y + (k - 1) * 8; g.beginPath(); g.arc(px, py + 8, 10, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    } else if (t.t === 'tundra') {
      g.fillStyle = 'rgba(255,255,255,.55)';
      for (let k = 0; k < 10; k++) g.fillRect(x + (tileRand(i, k) - .5) * HEX * 1.4, y + (tileRand(i, k + 5) - .5) * HEX * 1.2, 2, 2);
    } else if (TERRAIN[t.t].water && t.t === 'ocean') {
      g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
      const px = x + (tileRand(i) - .5) * HEX, py = y + (tileRand(i, 2) - .5) * HEX;
      g.beginPath(); g.moveTo(px - 6, py); g.quadraticCurveTo(px, py - 3, px + 6, py); g.stroke();
    }
  });

  // pass 4: rivers
  g.lineCap = 'round'; g.lineJoin = 'round';
  s.tiles.forEach((t, i) => {
    if (!t.riv || t.flow == null) return;
    const [x, y] = centers[i], [nx, ny] = centers[t.flow];
    const mx = (x + nx) / 2 + (tileRand(i, 3) - .5) * 10, my = (y + ny) / 2 + (tileRand(i, 4) - .5) * 10;
    for (const [w, c] of [[6, 'rgba(40,90,120,.5)'], [3.4, '#5ea4c8'], [1.2, 'rgba(255,255,255,.5)']]) {
      g.strokeStyle = c; g.lineWidth = w; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(mx, my, nx, ny); g.stroke();
    }
  });

  // pass 5: raised features, drawn top-to-bottom so lower ones overlap upper ones
  s.tiles.forEach((t, i) => {
    const [x, y] = centers[i];
    if (t.t === 'forest') drawForest(g, x, y, i, t.temp < .45);
    else if (t.t === 'hills') drawHills(g, x, y, i);
    else if (t.t === 'mountain') drawMountains(g, x, y, i);
    if (t.res) drawResource(g, t.res, x + HEX * .38, y + HEX * .32);
  });
  return cv;
}

export function neighborByEdge(s, i) {
  // map the 6 neighbors to edges k=0..5 (edge k faces angle 60k: E, SE, SW, W, NW, NE in screen coords)
  const W = s.W, c = i % W, r = Math.floor(i / W), odd = r & 1;
  const d = odd ? [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]] : [[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]];
  return d.map(([dc, dr]) => { const cc = c + dc, rr = r + dr; return cc >= 0 && cc < W && rr >= 0 && rr < s.H ? rr * W + cc : -1; });
}

function drawForest(g, x, y, i, conifer) {
  const n = 6;
  const pts = Array.from({ length: n }, (_, k) => [x + (tileRand(i, k) - .5) * HEX * 1.25, y + (tileRand(i, k + 20) - .5) * HEX * 1.05]).sort((a, b) => a[1] - b[1]);
  for (const [px, py] of pts) {
    const h = 9 + tileRand(px, py) * 5;
    g.fillStyle = 'rgba(30,50,25,.25)'; g.beginPath(); g.ellipse(px + 2, py + 2, 5, 2.2, 0, 0, 7); g.fill();
    g.fillStyle = '#5a3d24'; g.fillRect(px - .8, py - 3, 1.6, 4);
    if (conifer) {
      g.fillStyle = '#2f5a3a'; g.beginPath(); g.moveTo(px, py - h); g.lineTo(px + 5, py - 1); g.lineTo(px - 5, py - 1); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,.12)'; g.beginPath(); g.moveTo(px, py - h); g.lineTo(px - 5, py - 1); g.lineTo(px - 1, py - 2); g.closePath(); g.fill();
    } else {
      g.fillStyle = '#3f7a3a'; g.beginPath(); g.arc(px, py - h * .55, h * .48, 0, 7); g.fill();
      g.fillStyle = 'rgba(200,240,150,.25)'; g.beginPath(); g.arc(px - 1.5, py - h * .65, h * .22, 0, 7); g.fill();
    }
  }
}
function drawHills(g, x, y, i) {
  for (let k = 0; k < 2; k++) {
    const px = x + (k ? 8 : -7) + (tileRand(i, k) - .5) * 6, py = y + (k ? 5 : -3), w = 15, h = 9;
    g.fillStyle = '#9c8656'; g.beginPath(); g.moveTo(px - w, py); g.quadraticCurveTo(px, py - h * 2, px + w, py); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,240,200,.25)'; g.beginPath(); g.moveTo(px - w, py); g.quadraticCurveTo(px - 4, py - h * 2, px, py - h); g.lineTo(px - 2, py); g.closePath(); g.fill();
  }
}
function drawMountains(g, x, y, i) {
  const peaks = [[-8, 4, 15], [7, 6, 13], [0, -2, 20]];
  for (const [dx, dy, h] of peaks) {
    const px = x + dx + (tileRand(i, dx) - .5) * 3, py = y + dy + 6, w = h * .8;
    g.fillStyle = '#7a7166'; g.beginPath(); g.moveTo(px - w, py); g.lineTo(px, py - h); g.lineTo(px + w, py); g.closePath(); g.fill();
    g.fillStyle = '#5c544b'; g.beginPath(); g.moveTo(px, py - h); g.lineTo(px + w, py); g.lineTo(px + 2, py); g.closePath(); g.fill();
    g.fillStyle = '#f4f1ea'; g.beginPath(); g.moveTo(px, py - h); g.lineTo(px - w * .3, py - h * .62); g.lineTo(px + w * .05, py - h * .7); g.lineTo(px + w * .3, py - h * .62); g.closePath(); g.fill();
  }
}
export function drawResource(g, res, x, y) {
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(255,250,235,.85)'; g.strokeStyle = 'rgba(60,40,20,.35)'; g.lineWidth = 1;
  g.beginPath(); g.arc(0, 0, 6.5, 0, 7); g.fill(); g.stroke();
  g.lineWidth = 1.3;
  switch (res) {
    case 'wheat': g.strokeStyle = '#b8861b'; for (const dx of [-2, 0, 2]) { g.beginPath(); g.moveTo(dx, 4); g.lineTo(dx * .5, -4); g.stroke(); } break;
    case 'fish': g.fillStyle = '#3b7fa3'; g.beginPath(); g.ellipse(-1, 0, 3.6, 2, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(2, 0); g.lineTo(5, -2.5); g.lineTo(5, 2.5); g.fill(); break;
    case 'game': g.strokeStyle = '#7a5230'; g.beginPath(); g.moveTo(0, 4); g.lineTo(0, 0); g.lineTo(-3, -4); g.moveTo(0, 0); g.lineTo(3, -4); g.moveTo(-1.5, -2); g.lineTo(-4, -2); g.moveTo(1.5, -2); g.lineTo(4, -2); g.stroke(); break;
    case 'stone': g.fillStyle = '#e8e4dc'; g.strokeStyle = '#8a8478'; g.fillRect(-3.5, -3, 7, 6); g.strokeRect(-3.5, -3, 7, 6); break;
    case 'ore': g.fillStyle = '#c4672f'; for (const [dx, dy] of [[-2, -1], [2, -2], [0, 2]]) { g.beginPath(); g.arc(dx, dy, 1.8, 0, 7); g.fill(); } break;
    case 'horses': g.strokeStyle = '#6b4a2b'; g.lineWidth = 1.8; g.beginPath(); g.arc(0, 0, 3.4, Math.PI * .15, Math.PI * .85, true); g.stroke(); break;
    case 'gems': g.fillStyle = '#b0408f'; g.beginPath(); g.moveTo(0, -4); g.lineTo(3.5, 0); g.lineTo(0, 4); g.lineTo(-3.5, 0); g.closePath(); g.fill(); break;
  }
  g.restore();
}

/** Fog of war: parchment clouds with soft holes over explored tiles. Low-res, drawn scaled up for softness. */
export function paintFog(s, scale = .35) {
  const [ww, wh] = worldSize(s);
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(ww * scale); cv.height = Math.ceil(wh * scale);
  const g = cv.getContext('2d');
  g.scale(scale, scale);
  g.fillStyle = '#e6d9b8'; g.fillRect(0, 0, ww, wh);
  // cloud texture
  for (let k = 0; k < 220; k++) {
    const x = tileRand(k, 1) * ww, y = tileRand(k, 2) * wh, r = 30 + tileRand(k, 3) * 70;
    g.fillStyle = `rgba(${200 + tileRand(k, 4) * 40},${185 + tileRand(k, 5) * 35},${150 + tileRand(k, 6) * 30},.35)`;
    g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  g.globalCompositeOperation = 'destination-out';
  s.tiles.forEach((t, i) => {
    if (!t.seen) return;
    const [x, y] = tileCenter(i % s.W, Math.floor(i / s.W), HEX);
    const grd = g.createRadialGradient(x, y, HEX * .4, x, y, HEX * 1.55);
    grd.addColorStop(0, 'rgba(0,0,0,1)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, HEX * 1.55, 0, 7); g.fill();
  });
  return cv;
}
