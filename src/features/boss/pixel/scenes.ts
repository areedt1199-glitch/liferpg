import { Grid, rng } from './engine';
import type { SceneId } from '../catalog';

// 160×90 battle backdrops. The static layer is drawn once; particles() animates on top each tick.
export const SCENE_W = 160, SCENE_H = 90, FLOOR = 60;
const BAYER = [[0, .5], [.75, .25]];
/** Ordered-dithered vertical gradient through the given colours (classic 16-bit sky). */
function sky(g: Grid, cols: string[], y0 = 0, y1 = FLOOR) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < g.w; x++) {
    const t = (y - y0) / Math.max(1, y1 - y0 - 1) * (cols.length - 1), i = Math.min(cols.length - 2, Math.floor(t)), frac = t - i;
    g.set(x, y, frac > BAYER[y % 2][x % 2] ? cols[i + 1] : cols[i]);
  }
}
function ground(g: Grid, a: string, b: string, y0 = FLOOR) { for (let y = y0; y < g.h; y++) for (let x = 0; x < g.w; x++) g.set(x, y, (x + y * 3) % 7 === 0 || y === y0 ? b : a); }
function tree(g: Grid, x: number, base: number, h: number, crown: string, trunk: string, r: number) {
  g.rect(x - 1, base - h, 2, h, trunk); g.ellipse(x, base - h, r, r * 1.1, crown); g.ellipse(x - r * .5, base - h + r * .6, r * .7, r * .6, crown); g.ellipse(x + r * .5, base - h + r * .5, r * .7, r * .6, crown);
}
function deadTree(g: Grid, x: number, base: number, h: number, c: string, rand: () => number) {
  g.line(x, base, x, base - h, c, 3);
  for (let i = 0; i < 4; i++) { const y = base - h * (.35 + i * .16), dir = i % 2 ? 1 : -1, len = 6 + rand() * 8; g.line(x, y, x + dir * len, y - len * .6, c, 1); g.line(x + dir * len * .6, y - len * .35, x + dir * len * .8, y - len * .9, c, 1); }
}
function cloud(g: Grid, x: number, y: number, s: number, light: string, dark: string) {
  for (const [dx, dy, r] of [[0, 0, 1], [-1, .3, .75], [1.1, .25, .8], [.4, -.5, .7]]) g.ellipse(x + dx * s, y + dy * s, r * s * 1.3, r * s * .8, (_nx, ny) => (ny > .35 ? dark : light));
}

const statics: Record<SceneId, (g: Grid) => void> = {
  glade: g => {
    const r = rng(11); sky(g, ['#bfe3c9', '#d6ecd0', '#eef3d2']);
    for (let x = -4; x < 170; x += 11) tree(g, x + r() * 4, 46, 6 + r() * 6, '#8ab88a', '#6a8a6a', 7 + r() * 3);
    for (let x = 4; x < 170; x += 17) tree(g, x + r() * 6, 56, 10 + r() * 8, '#5f9465', '#5a4a3a', 8 + r() * 3);
    g.rect(0, 10, 9, 50, '#5a4a3a'); g.rect(151, 6, 9, 54, '#5a4a3a'); g.ellipse(4, 8, 14, 10, '#4f8a55'); g.ellipse(156, 4, 14, 10, '#4f8a55');
    for (let i = 0; i < 4; i++) g.line(40 + i * 25, 0, 20 + i * 25, FLOOR, 'rgba(255,255,230,0.14)', 3);
    ground(g, '#7fb069', '#6a9a58');
    for (let i = 0; i < 40; i++) g.set(r() * 160, FLOOR + 2 + r() * 28, ['#f59ab4', '#8ab4f8', '#ffe27a', '#ffffff'][i % 4]);
    for (const [x, y] of [[26, 66], [132, 70], [118, 63]]) { g.ellipse(x, y, 3, 2, (_a, ny) => (ny > .2 ? null : '#e0584b')); g.rect(x - 1, y, 1, 2, '#f6e7cf'); g.set(x - 1, y - 1, '#fff4e0'); }
  },
  oldwood: g => {
    const r = rng(22); sky(g, ['#c9c7a0', '#b9b68c', '#a8a77a']);
    for (let x = 0; x < 170; x += 14) tree(g, x + r() * 6, 50, 8 + r() * 6, '#7a8a5a', '#5a4a32', 8 + r() * 3);
    for (const x of [8, 40, 122, 152]) { g.rect(x - 4, 0, 8, FLOOR, '#4a3a2a'); g.line(x - 4, 10, x - 4, FLOOR, '#5a4a36'); g.curve(x, FLOOR - 2, x - 10, FLOOR + 2, x - 16, FLOOR + 6, '#4a3a2a', 3); g.curve(x, FLOOR - 2, x + 9, FLOOR + 3, x + 15, FLOOR + 8, '#4a3a2a', 3); }
    g.line(60, 0, 50, FLOOR, 'rgba(255,240,200,0.2)', 4); g.line(100, 0, 92, FLOOR, 'rgba(255,240,200,0.16)', 3);
    ground(g, '#6b5a3a', '#5a4a30');
    for (let i = 0; i < 45; i++) g.set(r() * 160, FLOOR + 1 + r() * 29, ['#a8743a', '#c89a4a', '#8a5a2a'][i % 3]);
    for (const [x, y] of [[58, 72], [104, 68], [80, 80]]) { g.line(x, y, x + 5, y - 2, '#9aa3ad', 1); g.set(x + 6, y - 3, '#9aa3ad'); g.set(x + 6, y - 1, '#9aa3ad'); }
    for (const [x, y] of [[30, 64], [140, 66]]) { g.ellipse(x, y, 2.5, 1.6, (_a, ny) => (ny > .2 ? null : '#d8823a')); g.set(x, y + 1, '#e9cfa8'); }
  },
  darkwood: g => {
    const r = rng(33); sky(g, ['#16201f', '#1e2a2a', '#2e3b36']);
    for (let x = 0; x < 170; x += 12) deadTree(g, x + r() * 5, 54, 24 + r() * 14, '#26302c', r);
    for (let x = 6; x < 170; x += 26) deadTree(g, x + r() * 8, FLOOR + 2, 40 + r() * 12, '#0f1513', r);
    ground(g, '#2a3328', '#222a21');
    for (let i = 0; i < 20; i++) g.set(r() * 160, FLOOR + 2 + r() * 28, '#3a4636');
    g.rect(0, FLOOR - 8, 160, 6, 'rgba(180,200,190,0.10)');
  },
  neonwood: g => {
    const r = rng(44); sky(g, ['#120c30', '#1a1240', '#2e1650', '#3a1a5a']);
    for (let i = 0; i < 30; i++) g.set(r() * 160, r() * 30, 'rgba(255,255,255,0.6)');
    for (let x = 0; x < 170; x += 16) { const h = 22 + r() * 18, cx = x + r() * 6; g.rect(cx - 2, FLOOR - h, 3, h, '#22164a'); g.ellipse(cx, FLOOR - h, 9, 10, '#2a1a5a'); g.ring(cx, FLOOR - h, 9, 10, 0, 1, i3(r) ? '#3ef0ff' : '#ff5ad1'); }
    ground(g, '#1e1a3a', '#2a2050');
    for (let i = 0; i < 14; i++) { const x = r() * 156 + 2, y = FLOOR + 3 + r() * 24, c = i % 2 ? '#3ef0ff' : '#ff5ad1'; g.line(x, y, x, y - 3, '#4a3a8a'); g.ellipse(x, y - 4, 2, 1.3, c); }
  },
  castlegate: g => {
    const r = rng(55); sky(g, ['#22262f', '#2e333e', '#4a505c']);
    for (let i = 0; i < 6; i++) cloud(g, r() * 160, 6 + r() * 14, 6 + r() * 4, '#3a3f4a', '#2a2e36');
    const wall = '#1a1d24';
    g.rect(52, 14, 56, FLOOR - 14, wall); for (let x = 52; x < 108; x += 6) g.rect(x, 10, 3, 4, wall);
    for (const tx of [36, 108]) { g.rect(tx, 8, 16, FLOOR - 8, wall); g.tri(tx - 2, 9, tx + 18, 9, tx + 8, -4, '#141619'); for (const wy of [20, 34]) g.rect(tx + 6, wy, 3, 4, '#c9a24a'); }
    g.ellipse(80, 44, 9, 10, '#0a0b0e'); g.rect(71, 44, 18, FLOOR - 44, '#0a0b0e'); for (let x = 73; x < 88; x += 3) g.line(x, 36, x, FLOOR, '#2a2d34');
    for (const wx of [62, 94]) g.rect(wx, 24, 3, 5, '#c9a24a');
    ground(g, '#2a2a2e', '#36363c'); for (let y = FLOOR; y < 90; y += 4) g.rect(68 - (y - FLOOR) * .6, y, 24 + (y - FLOOR) * 1.2, 0, '#3a3a42');
  },
  dungeon: g => {
    const r = rng(66);
    for (let y = 0; y < FLOOR; y++) for (let x = 0; x < 160; x++) g.set(x, y, y % 6 === 0 || (x + (Math.floor(y / 6) % 2) * 6) % 12 === 0 ? '#2a2a30' : '#3a3a42');
    for (const ax of [35, 125]) { g.ellipse(ax, 30, 14, 14, '#15151a'); g.rect(ax - 14, 30, 28, FLOOR - 30, '#15151a'); for (let x = ax - 10; x <= ax + 10; x += 5) g.line(x, 24, x, FLOOR, '#2a2a30'); }
    for (const cx of [58, 102]) for (let y = 0; y < 26; y += 3) { g.set(cx, y, '#6a6a72'); g.set(cx + 1, y + 1, '#55555c'); }
    for (const [x0, dir] of [[0, 1], [159, -1]] as const) for (let i = 0; i < 4; i++) { g.line(x0, 0, x0 + dir * (14 - i * 3), i * 4 + 4, 'rgba(200,200,210,0.6)'); g.line(x0, i * 4, x0 + dir * 4 * (i + 1), 0, 'rgba(200,200,210,0.4)'); }
    for (const tx of [68, 92]) { g.rect(tx - 1, 28, 2, 6, '#5a4a3a'); g.rect(tx - 2, 27, 4, 0, '#2a2a30'); }
    for (let y = FLOOR; y < 90; y++) for (let x = 0; x < 160; x++) g.set(x, y, x % 16 === 0 || (y - FLOOR) % 8 === 0 ? '#24242a' : '#2e2e34');
    for (let i = 0; i < 6; i++) g.set(r() * 160, FLOOR + 2 + r() * 26, '#4a4a52');
  },
  darkhall: g => {
    sky(g, ['#0c0a12', '#14111c', '#1c1826']);
    g.ring(80, 30, 24, 24, 0, 1.4, '#5a3aa0'); g.ring(80, 30, 18, 18, 0, 1, '#7a4ad0'); g.ring(80, 30, 9, 9, .3, 1, '#7a4ad0');
    for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; g.line(80 + Math.cos(a) * 18, 30 + Math.sin(a) * 18, 80 + Math.cos(a + 2.1) * 18, 30 + Math.sin(a + 2.1) * 18, 'rgba(150,100,240,0.6)'); }
    for (const px of [8, 36, 112, 140]) { g.rect(px, 4, 12, FLOOR - 4, (nx) => (nx < -.6 ? '#3a3446' : nx > .6 ? '#1e1a26' : '#2a2533')); g.rect(px - 2, 2, 16, 3, '#3a3446'); g.rect(px - 2, FLOOR - 3, 16, 3, '#3a3446'); }
    ground(g, '#1a1622', '#221c2c');
    for (let x = 0; x < 160; x += 2) g.set(x, FLOOR + 6 + (x % 4 ? 0 : 1), 'rgba(122,74,208,0.25)');
  },
  heaven: g => {
    const r = rng(88); sky(g, ['#fff6dc', '#ffe9b8', '#ffdca0', '#f6e6c8']);
    for (let i = 0; i < 12; i++) { const d = (i - 5.5) * .2; g.line(80, -6, 80 + Math.sin(d) * 200, -6 + Math.cos(d) * 200, i % 2 ? 'rgba(255,255,240,0.30)' : 'rgba(255,250,225,0.15)', 5); }
    for (let i = 0; i < 7; i++) cloud(g, r() * 170 - 5, 14 + r() * 26, 5 + r() * 4, '#ffffff', '#efe4f4');
    for (let x = -6; x < 170; x += 14) cloud(g, x + r() * 6, FLOOR + 4 + r() * 6, 9 + r() * 4, '#ffffff', '#e8dff0');
    for (let y = FLOOR + 14; y < 90; y++) for (let x = 0; x < 160; x++) g.set(x, y, (x + y) % 9 ? '#fbf6ff' : '#efe4f4');
  },
};
function i3(r: () => number) { return r() > .5; }

export function drawSceneStatic(id: SceneId) { const g = new Grid(SCENE_W, SCENE_H); statics[id](g); return g; }

/** Animated layer, drawn straight onto the canvas each tick. */
export function particles(ctx: CanvasRenderingContext2D, id: SceneId, t: number) {
  const r = rng(id.length * 97), dot = (x: number, y: number, c: string, s = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), s, s); };
  switch (id) {
    case 'glade': for (let i = 0; i < 14; i++) { const x = r() * 160 + Math.sin(t * .05 + i) * 4, y = 20 + r() * 50 + Math.cos(t * .04 + i * 2) * 3; if ((t + i * 3) % 10 < 7) dot(x, y, 'rgba(230,255,140,0.9)'); } break;
    case 'oldwood': for (let i = 0; i < 8; i++) { const y = (r() * 90 + t * (.6 + r() * .4)) % 90, x = r() * 160 + Math.sin(t * .1 + i) * 3; dot(x, y, ['#c89a4a', '#a8743a'][i % 2]); } break;
    case 'darkwood': {
      for (let i = 0; i < 3; i++) { const x = 20 + r() * 120, y = 30 + r() * 20; if ((t + i * 7) % 24 < 18) { dot(x, y, '#ff3030'); dot(x + 3, y, '#ff3030'); } }
      ctx.fillStyle = 'rgba(190,210,200,0.10)'; for (let i = 0; i < 4; i++) ctx.fillRect(((t * .7 + i * 50) % 220) - 60, FLOOR - 10 + i * 2, 60, 3); break; }
    case 'neonwood': for (let i = 0; i < 16; i++) { const y = (90 - ((t * (.4 + r() * .5) + r() * 90) % 90)), x = r() * 160 + Math.sin(t * .08 + i) * 5; dot(x, y, i % 3 ? '#3ef0ff' : '#ff5ad1'); } break;
    case 'castlegate': {
      ctx.fillStyle = 'rgba(200,210,230,0.45)'; for (let i = 0; i < 40; i++) { const x = (r() * 180 + t * 2) % 180 - 10, y = (r() * 100 + t * 6) % 100 - 10; ctx.fillRect(Math.round(x), Math.round(y), 1, 3); }
      if (t % 47 < 2) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, 160, 90); ctx.fillStyle = '#fffbe0'; let x = 120, y = 0; while (y < 30) { const nx = x + (r() - .5) * 8, ny = y + 4; ctx.fillRect(Math.round(nx), Math.round(ny), 1, 4); x = nx; y = ny; } } break; }
    case 'dungeon': for (const tx of [68, 92]) { for (let i = 0; i < 6; i++) { const fy = 26 - ((t + i * 2) % 6), fx = tx + Math.sin(t * .9 + i) * 1.2; dot(fx, fy, i % 2 ? '#ffb347' : '#ffe27a'); } for (const [w, h, a] of [[18, 14, .05], [12, 10, .07], [6, 6, .09]]) { ctx.fillStyle = `rgba(255,170,60,${a + (t % 3) * .01})`; ctx.fillRect(tx - w / 2, 25 - h / 2, w, h); } } break;
    case 'darkhall': for (let i = 0; i < 12; i++) { const y = FLOOR - ((t * (.3 + r() * .3) + r() * 60) % 60), x = r() * 160; dot(x, y, 'rgba(185,140,255,0.8)'); } break;
    case 'heaven': for (let i = 0; i < 14; i++) { const x = r() * 160, y = r() * 60; if ((t + i * 5) % 12 < 4) { dot(x, y, '#fff3b0'); if ((t + i) % 12 < 2) { dot(x - 1, y, 'rgba(255,243,176,0.6)'); dot(x + 1, y, 'rgba(255,243,176,0.6)'); } } } break;
  }
}
