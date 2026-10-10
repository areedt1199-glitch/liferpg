// Tiny pixel-art toolkit: sprites are drawn into a colour grid from shapes, then outlined and blitted 1:1
// to a small canvas that CSS scales up with image-rendering: pixelated.
export type Fill = string | null | ((nx: number, ny: number, x: number, y: number) => string | null);
export type Mode = 'idle' | 'attack' | 'hit' | 'ko';

export class Grid {
  readonly px: (string | null)[];
  constructor(readonly w: number, readonly h: number) { this.px = new Array(w * h).fill(null); }
  get(x: number, y: number) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.px[y * this.w + x]; }
  set(x: number, y: number, c: string | null) {
    x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    const i = y * this.w + x, old = this.px[i];
    // Translucent paint over a solid pixel is blended now, so light rays and fog stay soft.
    this.px[i] = c.startsWith('rgba') && old?.startsWith('#') ? blend(old, c) : c;
  }
  /** Paint only where nothing is drawn yet (halos, glows behind a sprite). */
  under(x: number, y: number, c: string) { if (this.get(Math.round(x), Math.round(y)) === null) this.set(x, y, c); }
  private each(fill: Fill, test: (cx: number, cy: number) => [number, number] | null, x0: number, y0: number, x1: number, y1: number) {
    for (let y = Math.max(0, Math.floor(y0)); y <= Math.min(this.h - 1, Math.ceil(y1)); y++)
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(this.w - 1, Math.ceil(x1)); x++) {
        const n = test(x + .5, y + .5); if (!n) continue;
        const c = typeof fill === 'function' ? fill(n[0], n[1], x, y) : fill; if (c) this.set(x, y, c);
      }
  }
  /** Ellipse, optionally rotated (radians). Fill callbacks receive normalised coords (-1..1). */
  ellipse(cx: number, cy: number, rx: number, ry: number, fill: Fill, angle = 0) {
    const cos = Math.cos(angle), sin = Math.sin(angle), r = Math.max(rx, ry);
    this.each(fill, (x, y) => { const dx = x - cx, dy = y - cy, u = (dx * cos + dy * sin) / rx, v = (-dx * sin + dy * cos) / ry; return u * u + v * v <= 1 ? [u, v] : null; }, cx - r, cy - r, cx + r, cy + r);
  }
  /** Elliptical ring of the given thickness (in pixels). */
  ring(cx: number, cy: number, rx: number, ry: number, angle: number, thick: number, fill: Fill) {
    const cos = Math.cos(angle), sin = Math.sin(angle), r = Math.max(rx, ry) + thick;
    this.each(fill, (x, y) => { const dx = x - cx, dy = y - cy, u = (dx * cos + dy * sin), v = (-dx * sin + dy * cos), d = Math.hypot(u / rx, v / ry); return Math.abs(d - 1) * Math.min(rx, ry) <= thick / 2 ? [u / rx, v / ry] : null; }, cx - r, cy - r, cx + r, cy + r);
  }
  /** Whole cells from (x, y) to (x + w, y + h) inclusive, so rect(x, y, 1, 0) is two pixels wide. */
  rect(x: number, y: number, w: number, h: number, fill: Fill) {
    const x0 = Math.round(x), y0 = Math.round(y), x1 = Math.round(x + w), y1 = Math.round(y + h);
    for (let cy = Math.max(0, y0); cy <= Math.min(this.h - 1, y1); cy++) for (let cx = Math.max(0, x0); cx <= Math.min(this.w - 1, x1); cx++) {
      const c = typeof fill === 'function' ? fill(x1 > x0 ? (cx - x0) / (x1 - x0) * 2 - 1 : 0, y1 > y0 ? (cy - y0) / (y1 - y0) * 2 - 1 : 0, cx, cy) : fill;
      if (c) this.set(cx, cy, c);
    }
  }
  tri(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, fill: Fill) {
    const d = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay); if (!d) return;
    this.each(fill, (x, y) => { const l1 = ((bx - x) * (cy - y) - (cx - x) * (by - y)) / d, l2 = ((cx - x) * (ay - y) - (ax - x) * (cy - y)) / d, l3 = 1 - l1 - l2; return l1 >= 0 && l2 >= 0 && l3 >= 0 ? [l2 - l1, l3 * 2 - 1] : null; },
      Math.min(ax, bx, cx), Math.min(ay, by, cy), Math.max(ax, bx, cx), Math.max(ay, by, cy));
  }
  line(x0: number, y0: number, x1: number, y1: number, c: string, thick = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let i = 0; i <= steps; i++) { const x = x0 + (x1 - x0) * i / steps, y = y0 + (y1 - y0) * i / steps;
      if (thick <= 1) this.set(x, y, c); else for (let a = 0; a < thick; a++) for (let b = 0; b < thick; b++) this.set(x - (thick - 1) / 2 + a, y - (thick - 1) / 2 + b, c); }
  }
  /** Quadratic curve, handy for tentacles, beards and roots. */
  curve(x0: number, y0: number, qx: number, qy: number, x1: number, y1: number, c: string, thick = 1) {
    let px = x0, py = y0; for (let i = 1; i <= 16; i++) { const t = i / 16, x = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * qx + t * t * x1, y = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * qy + t * t * y1; this.line(px, py, x, y, c, thick); px = x; py = y; }
  }
  /** One-pixel outline around every drawn pixel (4-neighbourhood). */
  outline(c: string) {
    const add: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (!this.get(x, y) && (this.get(x + 1, y) || this.get(x - 1, y) || this.get(x, y + 1) || this.get(x, y - 1))) add.push(y * this.w + x);
    for (const i of add) this.px[i] = c;
  }
  draw(ctx: CanvasRenderingContext2D, opts: { flash?: boolean; gray?: boolean; outline?: string } = {}) {
    ctx.clearRect(0, 0, this.w, this.h);
    for (let i = 0; i < this.px.length; i++) {
      let c = this.px[i]; if (!c) continue;
      if (opts.flash && c !== opts.outline && !c.startsWith('rgba')) c = '#ffffff';
      else if (opts.gray && c.startsWith('#')) c = grayish(c);
      ctx.fillStyle = c; ctx.fillRect(i % this.w, Math.floor(i / this.w), 1, 1);
    }
  }
}
function blend(hex: string, rgba: string) {
  const [r, g, b, a] = rgba.slice(5, -1).split(',').map(Number), n = parseInt(hex.slice(1, 7), 16);
  const mixc = (base: number, top: number) => Math.round(base * (1 - a) + top * a).toString(16).padStart(2, '0');
  return `#${mixc(n >> 16, r)}${mixc((n >> 8) & 255, g)}${mixc(n & 255, b)}`;
}
function grayish(hex: string) {
  const n = parseInt(hex.slice(1, 7), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255, l = r * .3 + g * .59 + b * .11;
  return `rgb(${(r + l * 2) / 3 | 0},${(g + l * 2) / 3 | 0},${(b + l * 2) / 3 | 0})`;
}
/** Three-tone shading: light on the upper-left, shadow on the lower-right. */
export const shade = (base: string, dark: string, light: string, lo = -.75, hi = .45): Fill => (nx, ny) => { const s = nx * .8 + ny; return s > hi ? dark : s < lo ? light : base; };
/** Deterministic PRNG for decorations that must not jump between frames. */
export function rng(seed: number) { return () => { seed = (seed + 0x6D2B79F5) | 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
