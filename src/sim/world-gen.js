// Procedural world: an island continent with mountains, rivers, forests and resources.
import { makeRng } from './rng.js';
import { neighbors, distance, within } from './hex.js';
import { RESOURCES, TERRAIN } from '../content/terrain.js';

function valueNoise(rand, gw, gh) {
  const g = Array.from({ length: (gw + 1) * (gh + 1) }, () => rand());
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi);
    const v = (a, b) => g[(b % (gh + 1)) * (gw + 1) + (a % (gw + 1))];
    return (v(xi, yi) * (1 - xf) + v(xi + 1, yi) * xf) * (1 - yf) + (v(xi, yi + 1) * (1 - xf) + v(xi + 1, yi + 1) * xf) * yf;
  };
}
function fbm(rand, W, H) {
  const octaves = [[4, .55], [8, .28], [16, .12], [32, .05]].map(([f, a]) => ({ n: valueNoise(rand, f + 2, f + 2), f, a }));
  return (c, r) => octaves.reduce((s, o) => s + o.n(c / W * o.f, r / H * o.f) * o.a, 0);
}

export function generateWorld(seed, W = 48, H = 32) {
  const rand = makeRng(seed);
  const elev = fbm(rand, W, H), moist = fbm(rand, W, H), warp = fbm(rand, W, H);
  const tiles = [];
  for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
    // island mask: distance from center, warped so coastlines are irregular
    const nx = (c / (W - 1)) * 2 - 1, ny = (r / (H - 1)) * 2 - 1;
    const d = Math.sqrt(nx * nx * .9 + ny * ny * 1.1) + (warp(c, r) - .5) * .45;
    const e = elev(c, r) * 1.05 - Math.pow(Math.max(0, d), 2.4) * .62 + .19;
    const lat = Math.abs(ny);                                      // 0 at equator row, 1 at poles
    const temp = 1 - lat * .85 - Math.max(0, e - .6) * .8;
    tiles.push({ t: 'ocean', e: +e.toFixed(3), m: +moist(c, r).toFixed(3), temp: +temp.toFixed(3), riv: false, res: null, imp: null, own: -1, seen: false });
  }
  // classify terrain
  tiles.forEach(t => {
    const e = t.e;
    if (e < .32) t.t = 'ocean';
    else if (e < .4) t.t = 'coast';
    else if (e > .84) t.t = 'mountain';
    else if (e > .72) t.t = 'hills';
    else if (t.temp < .3) t.t = 'tundra';
    else if (t.m < .34 && t.temp > .6) t.t = 'desert';
    else if (t.m > .56) t.t = 'forest';
    else if (t.m > .45) t.t = 'grass';
    else t.t = 'plains';
  });
  // coast = water next to land; deep water elsewhere stays ocean
  tiles.forEach((t, i) => {
    if (t.t === 'coast' && !neighbors(W, H, i).some(j => !TERRAIN[tiles[j].t].water)) t.t = 'ocean';
    if (t.t === 'ocean' && neighbors(W, H, i).some(j => !TERRAIN[tiles[j].t].water)) t.t = 'coast';
  });
  // rivers: start high, flow downhill to the sea
  const sources = tiles.map((t, i) => i).filter(i => (tiles[i].t === 'hills' || tiles[i].t === 'mountain') && rand() < .12);
  for (const s0 of sources.slice(0, 9)) {
    let cur = s0, guard = 0;
    while (guard++ < 40) {
      const t = tiles[cur];
      if (TERRAIN[t.t].water) break;
      if (t.t !== 'mountain') t.riv = true;
      const next = neighbors(W, H, cur).sort((a, b) => tiles[a].e - tiles[b].e)[0];
      if (tiles[next].e >= t.e && !TERRAIN[tiles[next].t].water) { t.e -= .01; } // carve a little and keep going
      t.flow = next;
      cur = next;
    }
  }
  // resources
  const resIds = Object.keys(RESOURCES);
  tiles.forEach(t => {
    if (rand() > .14) return;
    const ok = resIds.filter(k => RESOURCES[k].on.includes(t.t));
    if (ok.length) t.res = ok[Math.floor(rand() * ok.length)];
  });
  // starting tile: fertile land near water, far from edges
  let best = -1, bestScore = -1;
  tiles.forEach((t, i) => {
    if (TERRAIN[t.t].water || t.t === 'mountain' || t.t === 'tundra' || t.t === 'desert') return;
    const c = i % W, r = Math.floor(i / W);
    if (c < 5 || c > W - 6 || r < 4 || r > H - 5) return;
    let sc = 0;
    for (const j of within(W, H, i, 2)) {
      const u = tiles[j], y = TERRAIN[u.t].yields;
      sc += (y.food || 0) * 1.2 + (y.wood || 0) * .6 + (y.stone || 0) * .5 + (u.riv ? 1 : 0) + (u.res ? 1.5 : 0) - (u.t === 'ocean' ? .6 : 0);
    }
    if (t.riv) sc += 4;
    if (neighbors(W, H, i).some(j => tiles[j].t === 'coast')) sc += 3;
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  return { W, H, tiles, start: best };
}

export { distance };
