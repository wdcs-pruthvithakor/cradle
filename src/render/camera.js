// Camera: world-pixel center + zoom, with smooth easing toward a target.
export class Camera {
  constructor(worldW, worldH) {
    this.worldW = worldW; this.worldH = worldH;
    this.x = worldW / 2; this.y = worldH / 2; this.zoom = 1;
    this.tx = this.x; this.ty = this.y; this.tz = 1;
    this.min = .45; this.max = 2.6;
  }
  resize(w, h) { this.vw = w; this.vh = h; }
  clamp() {
    const halfW = this.vw / 2 / this.tz, halfH = this.vh / 2 / this.tz, pad = 120;
    this.tx = Math.max(Math.min(halfW - pad, this.worldW / 2), Math.min(this.tx, Math.max(this.worldW - halfW + pad, this.worldW / 2)));
    this.ty = Math.max(Math.min(halfH - pad, this.worldH / 2), Math.min(this.ty, Math.max(this.worldH - halfH + pad, this.worldH / 2)));
  }
  update(instant) {
    const k = instant ? 1 : .2;
    this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.zoom += (this.tz - this.zoom) * k;
  }
  panBy(dx, dy) { this.tx -= dx / this.tz; this.ty -= dy / this.tz; this.clamp(); this.x = this.tx; this.y = this.ty; }
  zoomAt(factor, sx, sy) {
    const before = this.toWorld(sx, sy, true);
    this.tz = Math.max(this.min, Math.min(this.max, this.tz * factor));
    const after = this.toWorld(sx, sy, true);
    this.tx += before[0] - after[0]; this.ty += before[1] - after[1]; this.clamp();
  }
  focus(x, y, zoom) { this.tx = x; this.ty = y; if (zoom) this.tz = zoom; this.clamp(); }
  toWorld(sx, sy, target) {
    const z = target ? this.tz : this.zoom, cx = target ? this.tx : this.x, cy = target ? this.ty : this.y;
    return [cx + (sx - this.vw / 2) / z, cy + (sy - this.vh / 2) / z];
  }
  toScreen(wx, wy) { return [(wx - this.x) * this.zoom + this.vw / 2, (wy - this.y) * this.zoom + this.vh / 2]; }
  /** World-space rectangle currently visible (with margin). */
  view(margin = 60) {
    const hw = this.vw / 2 / this.zoom + margin, hh = this.vh / 2 / this.zoom + margin;
    return { x0: this.x - hw, y0: this.y - hh, x1: this.x + hw, y1: this.y + hh };
  }
}
