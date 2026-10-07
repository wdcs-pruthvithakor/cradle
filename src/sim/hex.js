// Hex grid math. Pointy-top hexes stored in "odd-r" offset coordinates (col, row);
// tiles live in a flat array at index row * W + col.

const ODD = [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]];
const EVEN = [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];

export const idx = (W, c, r) => r * W + c;
export const col = (W, i) => i % W;
export const row = (W, i) => Math.floor(i / W);

export function neighbors(W, H, i) {
  const c = i % W, r = Math.floor(i / W), dirs = r & 1 ? ODD : EVEN, out = [];
  for (const [dc, dr] of dirs) {
    const cc = c + dc, rr = r + dr;
    if (cc >= 0 && cc < W && rr >= 0 && rr < H) out.push(rr * W + cc);
  }
  return out;
}

function toCube(c, r) { const x = c - (r - (r & 1)) / 2; return [x, -x - r, r]; }
export function distance(W, a, b) {
  const [ax, ay, az] = toCube(a % W, Math.floor(a / W)), [bx, by, bz] = toCube(b % W, Math.floor(b / W));
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by), Math.abs(az - bz));
}

/** All tile indices within `radius` of tile i (including i). */
export function within(W, H, i, radius) {
  const out = [], c0 = i % W, r0 = Math.floor(i / W);
  for (let r = Math.max(0, r0 - radius); r <= Math.min(H - 1, r0 + radius); r++)
    for (let c = Math.max(0, c0 - radius - 1); c <= Math.min(W - 1, c0 + radius + 1); c++) {
      const j = r * W + c;
      if (distance(W, i, j) <= radius) out.push(j);
    }
  return out;
}

// Pixel layout (used by the renderer): hex "size" = center-to-corner distance.
export const SQRT3 = Math.sqrt(3);
export const tileCenter = (c, r, size) => [size * SQRT3 * (c + .5 * (r & 1)) + size * SQRT3 / 2, size * 1.5 * r + size];
export function pixelToTile(x, y, size, W, H) {
  // convert to axial, round in cube space, back to odd-r
  const px = x - size * SQRT3 / 2, py = y - size;
  const q = (SQRT3 / 3 * px - py / 3) / size, rr = (2 / 3 * py) / size;
  let cx = q, cz = rr, cy = -cx - cz;
  let rx = Math.round(cx), ry = Math.round(cy), rz = Math.round(cz);
  const dx = Math.abs(rx - cx), dy = Math.abs(ry - cy), dz = Math.abs(rz - cz);
  if (dx > dy && dx > dz) rx = -ry - rz; else if (dy > dz) ry = -rx - rz; else rz = -rx - ry;
  const c = rx + (rz - (rz & 1)) / 2, r = rz;
  return c >= 0 && c < W && r >= 0 && r < H ? r * W + c : -1;
}
