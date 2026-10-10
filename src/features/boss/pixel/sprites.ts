import { Grid, shade, type Mode } from './engine';
import type { SpriteId } from '../catalog';

// Each boss is a 48×48 sprite facing left (toward the player). f = animation frame, m = pose.
type Draw = (g: Grid, f: number, m: Mode) => void;
const bob = (f: number, m: Mode) => (m === 'idle' && f % 2 ? 1 : 0);

function eyesPair(g: Grid, lx: number, rx: number, y: number, m: Mode, f: number, c = '#2a1d22', h = 3) {
  if (m === 'ko') { for (const x of [lx, rx]) { g.set(x - 1, y - 1, c); g.set(x + 1, y - 1, c); g.set(x, y, c); g.set(x - 1, y + 1, c); g.set(x + 1, y + 1, c); } return; }
  if (m === 'hit') { g.set(lx - 1, y - 1, c); g.set(lx, y, c); g.set(lx - 1, y + 1, c); g.set(rx + 1, y - 1, c); g.set(rx, y, c); g.set(rx + 1, y + 1, c); return; }
  if (m === 'idle' && f % 9 === 8) { g.rect(lx - 1, y, 2, 0, c); g.rect(rx - 1, y, 2, 0, c); return; }
  for (const x of [lx, rx]) { g.rect(x - 1, y - 1, 1, h - 1, c); g.set(x - 1, y - 1, '#ffffff'); }
  if (m === 'attack') { g.line(lx - 2, y - 3, lx + 1, y - 2, c); g.line(rx + 2, y - 3, rx - 1, y - 2, c); }
}

const mushroom: Draw = (g, f, m) => {
  const dy = bob(f, m), capCols = new Set(['#e0584b', '#b03e37', '#f58c74']);
  g.ellipse(17, 44, 4.5, 2, '#e9cfa8'); g.ellipse(31, 44, 4.5, 2, '#e9cfa8');
  g.ellipse(24, 34 + dy * .5, 11 + dy * .5, 10 - dy * .5, shade('#f6e7cf', '#dcc19b', '#fff8ea'));
  const cap = shade('#e0584b', '#b03e37', '#f58c74', -.8, .35);
  g.ellipse(24, 19 + dy, 19 + dy * .6, 14, (nx, ny, x, y) => (y > 24 + dy ? null : (cap as (a: number, b: number) => string)(nx, ny)));
  for (const [sx, sy, r] of [[13, 13, 3.2], [27, 8.5, 2.4], [35, 16, 2.7], [22, 19, 1.8], [8, 20, 1.6], [31, 22, 1.4], [40, 22, 1.2]])
    g.ellipse(sx, sy + dy, r, r * .85, (_a, _b, x, y) => (capCols.has(g.get(x, y) ?? '') ? '#fff4e0' : null));
  for (let x = 0; x < g.w; x++) for (let y = 1; y < g.h; y++) if (['#f6e7cf', '#dcc19b', '#fff8ea'].includes(g.get(x, y) ?? '') && capCols.has(g.get(x, y - 1) ?? '')) g.set(x, y, '#c9a982');
  g.ellipse(27, 4.5 + dy, 3.2, 1.3, '#6f9a5a', -.5);
  eyesPair(g, 20, 29, 31 + dy, m, f, '#2a1d22', 4);
  g.rect(14, 36 + dy, 2, 0, '#f59a8c'); g.rect(32, 36 + dy, 2, 0, '#f59a8c');
  if (m === 'attack') g.rect(23, 36 + dy, 2, 1, '#8a3b3b'); else { g.set(23, 37 + dy, '#8a3b3b'); g.set(24, 37 + dy, '#8a3b3b'); }
  g.outline('#3a2329');
};

const gnome: Draw = (g, f, m) => {
  const dy = bob(f, m), skin = '#e8b996', coat = shade('#4f6a7a', '#3a4f5c', '#6a8696');
  g.rect(12, 37, 24, 10, shade('#7a5232', '#5a3a22', '#946a42')); g.ellipse(24, 37, 12, 3, '#b08a5a'); g.ring(24, 37, 6, 1.4, 0, 1, '#8a6a42');
  g.ellipse(18, 38, 3.5, 2, '#3b2a22'); g.ellipse(30, 38, 3.5, 2, '#3b2a22');
  g.ellipse(24, 29 + dy, 9, 8, coat); g.rect(16, 31 + dy, 16, 1, '#3b2a22'); g.rect(23, 31 + dy, 2, 1, '#d8b04a');
  g.ellipse(14, 28 + dy, 3, 4, coat); g.ellipse(14, 32 + dy, 2, 2, skin);
  if (m === 'attack') { g.ellipse(35, 24, 3, 4, coat, -.6); g.line(37, 22, 43, 10, '#9aa3ad', 2); g.ring(43, 8, 2.4, 2.4, 0, 1.4, '#9aa3ad'); g.ellipse(37, 21, 2, 2, skin); }
  else { g.ellipse(34, 28 + dy, 3, 4, coat); g.line(36, 31 + dy, 41, 40, '#9aa3ad', 2); g.ring(42, 42, 2.4, 2.4, 0, 1.4, '#9aa3ad'); g.ellipse(35, 31 + dy, 2, 2, skin); }
  g.ellipse(24, 19 + dy, 6.5, 5.5, skin);
  g.ellipse(24, 26 + dy, 7, 5.5, '#f2efe6'); g.tri(17, 26 + dy, 31, 26 + dy, 24, 36 + dy, '#f2efe6');
  g.line(22, 28 + dy, 23, 33 + dy, '#d9d4c6'); g.line(26, 28 + dy, 25, 33 + dy, '#d9d4c6');
  g.ellipse(21, 23 + dy, 3.2, 1.4, '#f2efe6'); g.ellipse(27, 23 + dy, 3.2, 1.4, '#f2efe6');
  g.ellipse(24, 21 + dy, 2.2, 2, '#e58a7a');
  eyesPair(g, 21, 28, 19 + dy, m, f, '#2a1d22', 2);
  g.rect(19, 16 + dy, 3, 0, '#ffffff'); g.rect(26, 16 + dy, 3, 0, '#ffffff');
  g.tri(16, 16 + dy, 32, 16 + dy, 31, 3 + dy, shade('#c0392b', '#922b21', '#e05a4a')); g.tri(29, 6 + dy, 32, 2 + dy, 37, 7 + dy, '#c0392b');
  g.rect(15, 15 + dy, 18, 1, '#922b21');
  g.outline('#24181a');
};

const boneeye: Draw = (g, f, m) => {
  const w = Math.sin(f * .9), bone = '#e8dcc8', boneD = '#bfae94', red = '#b0303a';
  for (const [ex, ey, qx, qy] of [[5, 5, 12, 2], [43, 5, 36, 2], [3, 16, 10, 10], [45, 16, 38, 10], [9, 25, 12, 20], [39, 25, 36, 20]])
    g.curve(24, 12, qx, qy + w * 2, ex, ey + w * 3, red, 2);
  g.line(21, 37, 18, 45, bone, 2); g.line(27, 37, 30, 45, bone, 2); g.rect(14, 45, 4, 1, bone); g.rect(30, 45, 4, 1, bone);
  g.ellipse(24, 36, 6, 2.5, bone); g.line(24, 19, 24, 36, boneD, 2);
  for (const y of [22, 25, 28, 31]) { const s = (y - 22) / 3; g.curve(18 + s, y, 24, y - 2, 30 - s, y, bone, 1); g.curve(18 + s, y + 1, 24, y - 1, 30 - s, y + 1, boneD, 1); }
  g.line(18, 21, 13, 29, bone, 2); g.line(13, 29, 9, 35, bone, 2);
  if (m === 'attack') { g.line(30, 21, 36, 14, bone, 2); g.line(36, 14, 40, 4, '#6b4a2e', 2); g.tri(38, 3, 46, 0, 45, 9, '#9aa3ad'); }
  else { g.line(30, 21, 35, 28, bone, 2); g.line(35, 28, 39, 26, bone, 2); g.line(39, 22, 42, 43, '#6b4a2e', 2); g.tri(40, 20, 47, 17, 46, 28, '#9aa3ad'); g.line(46, 18, 46, 27, '#d8dee6'); }
  g.ellipse(24, 12, 9, 8, shade('#e7a6a6', '#c07878', '#f6c9c9'));
  g.set(17, 9, red); g.set(18, 15, red); g.set(30, 8, red); g.set(20, 25, red); g.set(28, 28, red);
  if (m === 'ko') { g.line(21, 9, 27, 15, '#1a0a0e'); g.line(27, 9, 21, 15, '#1a0a0e'); }
  else if (m === 'hit') { g.rect(19, 12, 10, 0, '#1a0a0e'); }
  else { const ix = m === 'attack' ? 24 : 24 + Math.round(w * 1.5); g.ellipse(24, 12, 5.5, m === 'attack' ? 5.5 : 5, '#fff7f0'); g.ellipse(ix, 12, 3, 3, '#c0182a'); g.ellipse(ix, 12, 1.2, 1.6, '#1a0a0e'); g.set(ix - 2, 10, '#ffffff'); }
  g.outline('#1c1418');
};

const drunk: Draw = (g, f, m) => {
  const sway = m === 'idle' ? (f % 4 < 2 ? 0 : 1) : 0, skin = '#e8b996', jacket = shade('#8a5a3a', '#6a4228', '#a87250'), pants = '#3a5a8a';
  g.rect(18 + sway, 32, 4, 11, pants); g.rect(25 + sway, 32, 4, 6, pants); g.rect(27 + sway, 37, 4, 7, pants);
  g.ellipse(19 + sway, 45, 3.5, 1.6, '#2a2a2a'); g.ellipse(30 + sway, 45, 3.5, 1.6, '#2a2a2a');
  g.ellipse(24 + sway, 25, 9, 9, jacket); g.tri(21 + sway, 17, 27 + sway, 17, 24 + sway, 29, '#f1ece0'); g.line(24 + sway, 20, 25 + sway, 28, '#b03a3a', 1);
  g.line(16 + sway, 20, 10 + sway, 13 + (f % 2), '#8a5a3a', 3); g.ellipse(9 + sway, 12 + (f % 2), 2, 2, skin);
  const bx = m === 'attack' ? 39 : 35, by = m === 'attack' ? 11 : 22;
  g.line(32 + sway, 20, bx - 1, by + 4, '#8a5a3a', 3);
  g.rect(bx - 1, by - 6, 3, 8, '#3c8a4a'); g.rect(bx, by - 9, 1, 3, '#3c8a4a'); g.line(bx - 1, by - 5, bx - 1, by, '#7ccf8a'); g.ellipse(bx, by + 2, 2, 2, skin);
  const hx = 24 + sway + (m === 'idle' && f % 4 === 1 ? 1 : 0);
  g.ellipse(hx, 11, 6, 7, shade(skin, '#cf9a78', '#f6d2b4'));
  g.ellipse(hx - 1, 5, 6, 3, '#5a3a22'); for (const d of [-5, -2, 2, 5]) g.set(hx + d, 2 + Math.abs(d) % 2, '#5a3a22');
  for (const [x, y] of [[-3, 15], [-1, 16], [1, 16], [3, 15], [-4, 14], [4, 13]]) g.set(hx + x, y, '#b88a6a');
  g.ellipse(hx + 1, 12, 1.6, 1.4, '#e0604a');
  if (m === 'idle') { g.rect(hx - 3, 9, 1, 0, '#2a1d22'); g.rect(hx + 2, 9, 1, 0, '#2a1d22'); g.line(hx - 2, 15, hx + 1, 14, '#8a3b3b'); }
  else { eyesPair(g, hx - 2, hx + 3, 9, m, f, '#2a1d22', 2); g.rect(hx - 1, 14, 2, 1, '#8a3b3b'); }
  g.outline('#24181a');
  if (m !== 'ko') for (let i = 0; i < 6; i++) { const a = f * .8 + i * 1.05; g.set(hx + Math.cos(a) * 7, 1 + Math.sin(a) * 1.4, '#c08af0'); }
};

const rocker: Draw = (g, f, m) => {
  const dy = bob(f, m), steel = shade('#4a505c', '#353a44', '#6c7482'), skin = '#5f6470', up = m === 'attack' ? -6 : 0;
  g.rect(18, 31, 5, 12, steel); g.rect(26, 31, 5, 12, steel); g.tri(17, 37, 19, 35, 19, 39, '#c9ccd2'); g.tri(32, 37, 30, 35, 30, 39, '#c9ccd2');
  g.rect(16, 43, 7, 2, '#22252b'); g.rect(26, 43, 7, 2, '#22252b');
  g.ellipse(24, 23 + dy, 10, 9, steel); g.line(24, 16 + dy, 24, 29 + dy, '#353a44');
  g.rect(15, 29 + dy, 18, 1, '#22252b'); g.rect(23, 29 + dy, 2, 1, '#c9ccd2');
  for (const sx of [13, 35]) { g.ellipse(sx, 16 + dy, 5, 3.5, steel); g.tri(sx - 2, 14 + dy, sx + 2, 14 + dy, sx, 7 + dy, '#c9ccd2'); }
  g.ellipse(24, 8 + dy, 7, 5, '#121216'); g.rect(17, 8 + dy, 3, 12, '#121216'); g.rect(28, 8 + dy, 3, 12, '#121216');
  g.ellipse(24, 10 + dy, 5, 6, shade(skin, '#4a4e58', '#777c88'));
  g.rect(18, 4 + dy, 12, 1, '#c0302a'); g.line(30, 5 + dy, 34, 8 + dy + (f % 2), '#c0302a', 2);
  if (m === 'ko') { g.line(21, 8 + dy, 23, 10 + dy, '#2a1d22'); g.line(26, 8 + dy, 28, 10 + dy, '#2a1d22'); }
  else { const eye = m === 'hit' ? '#7a2a2a' : '#ff3030'; g.rect(21, 9 + dy, 1, 0, eye); g.rect(26, 9 + dy, 1, 0, eye); }
  if (m === 'attack') { g.rect(22, 12, 4, 1, '#2a1d22'); g.set(22, 12, '#ffffff'); g.set(25, 12, '#ffffff'); } else g.rect(22, 13 + dy, 3, 0, '#2a1d22');
  g.line(14, 34 + up, 40, 16 + up, '#2a1d1a', 2); for (let i = 0; i < 5; i++) g.set(20 + i * 4, 30 - i * 2.8 + up, '#c9ccd2');
  g.tri(39, 17 + up, 45, 11 + up, 43, 18 + up, '#2a1d1a');
  g.tri(5, 40 + up, 18, 27 + up, 20, 37 + up, shade('#e4e7ec', '#b8bdc6', '#ffffff')); g.tri(9, 45 + up, 17, 31 + up, 22, 39 + up, shade('#e4e7ec', '#b8bdc6', '#ffffff'));
  g.rect(13, 33 + up, 3, 0, '#22252b'); g.rect(15, 35 + up, 3, 0, '#22252b');
  g.ellipse(17, 31 + dy + up / 2, 2.5, 2.5, skin); g.ellipse(33, 21 + dy + up, 2.5, 2.5, skin);
  g.outline('#0d0e12');
};

const wolf: Draw = (g, f, m) => {
  const fur = shade('#4b4b55', '#34343c', '#6a6a76'), jaw = m === 'attack' ? 2 : 0;
  g.curve(38, 26, 47, 22, 44, 12 + (f % 2), '#4b4b55', 3);
  g.rect(33, 31, 3, 12, '#34343c'); g.rect(38, 30, 3, 13, '#4b4b55'); g.ellipse(35, 44, 2.6, 1.2, '#34343c'); g.ellipse(40, 44, 2.6, 1.2, '#4b4b55');
  g.line(24, 22, 24, 13, '#34343c', 4); g.ellipse(24, 12, 2.6, 1.2, '#7a2a2a');
  g.ellipse(28, 27, 14, 8, fur); g.ellipse(27, 31, 9, 3, '#7a7a86');
  g.rect(16, 30, 3, 13, '#34343c'); g.rect(21, 31, 3, 12, '#4b4b55'); g.ellipse(17, 44, 2.6, 1.2, '#34343c'); g.ellipse(22, 44, 2.6, 1.2, '#4b4b55');
  g.ellipse(15, 21, 6, 5, fur);
  g.ellipse(10, 17, 6, 5, fur); g.tri(1, 18, 10, 14, 9, 21, '#4b4b55'); g.set(1, 18, '#111111'); g.set(2, 18, '#111111');
  g.tri(2, 20 + jaw, 10, 20, 9, 23, '#34343c');
  if (m === 'attack') { g.set(3, 20, '#ffffff'); g.set(5, 20, '#ffffff'); g.set(4, 21 + jaw, '#ffffff'); g.set(6, 21 + jaw, '#ffffff'); }
  g.tri(10, 13, 14, 13, 13, 6, '#34343c'); g.tri(5, 13, 9, 12, 6, 7, '#34343c');
  if (m === 'ko') { g.line(7, 14, 9, 16, '#111111'); g.line(9, 14, 7, 16, '#111111'); }
  else if (m === 'hit') g.rect(7, 15, 2, 0, '#111111');
  else g.rect(7, 15, 2, 0, '#ff3b30');
  g.set(25, 15, '#7a2a2a');
  g.outline('#15151a');
  for (let i = 0; i < 4; i++) { const y = 9 - ((f * 2 + i * 3) % 10), x = 24 + Math.sin((f + i) * 1.3) * 2; g.set(x, y, 'rgba(160,160,170,0.8)'); g.set(x + 1, y - 1, 'rgba(160,160,170,0.5)'); }
};

const wizard: Draw = (g, f, m) => {
  const robe = '#1e1b26', robeD = '#14121a', robeL = '#302b3c', glow = m === 'attack' ? '#f2e6ff' : '#b98cff';
  for (let i = 0; i < 7; i++) { const x0 = 10 + i * 4.5; g.curve(x0, 40, x0 + Math.sin(f * .7 + i) * 3, 44, x0 + Math.sin(f * .7 + i * 1.7) * 4, 47, robeD, 2); }
  g.tri(24, 6, 6, 44, 42, 44, (nx) => (nx < -.55 ? robeL : nx > .5 ? robeD : robe));
  g.ellipse(13, 24, 4, 7, robe, .4); g.ellipse(35, 23, 4, 7, robe, -.5);
  g.line(40, 8, 40, 46, '#3a2a22', 2); g.ellipse(40, 6, 2.6, 2.6, glow); g.ellipse(39, 22, 2, 2, '#2a2533');
  if (m === 'attack') g.ellipse(9, 22, 2.5, 2.5, '#f2e6ff');
  g.ellipse(24, 11, 8, 8, shade(robe, robeD, robeL)); g.tri(20, 5, 28, 5, 25, -1, robe);
  g.ellipse(24, 13, 5, 5, '#050408');
  if (m !== 'ko') { const eye = m === 'hit' ? '#5a4a7a' : glow; g.rect(21, 12, 1, 0, eye); g.rect(25, 12, 1, 0, eye); if (m === 'attack') { g.rect(21, 13, 1, 0, eye); g.rect(25, 13, 1, 0, eye); } }
  g.outline('#000000');
  g.ellipse(24, 26, 23, 21, (_nx, _ny, x, y) => (g.get(x, y) ? null : 'rgba(150,100,255,0.10)'));
  for (let i = 0; i < 6; i++) { const a = f * .35 + i * 1.05; g.set(24 + Math.cos(a) * 20, 26 + Math.sin(a) * 6, '#b98cff'); }
};

const ophanim: Draw = (g, f, m) => {
  const spin = f * .18, flap = m === 'idle' && f % 2 ? .08 : 0, wing = shade('#f6e3b4', '#e0b866', '#fffaf0');
  for (let k = 0; k < 5; k++) {
    g.ellipse(14 - k * 2.6, 20 + k * 3.2, 10 - k, 2.6, wing, -.5 + k * .32 + flap);
    g.ellipse(34 + k * 2.6, 20 + k * 3.2, 10 - k, 2.6, wing, .5 - k * .32 - flap);
  }
  const iris = m === 'attack' ? '#ff3b30' : '#3a6ad0', rings = [spin, Math.PI / 3 + spin * .7, 2 * Math.PI / 3 - spin * .5];
  for (const a of rings) g.ring(24, 24, 15, 6, a, 2.2, (_nx, ny) => (ny < -.2 ? '#ffe38a' : ny > .3 ? '#a87a20' : '#e0b040'));
  for (const a of rings) for (let i = 0; i < 4; i++) {
    const t = i * Math.PI / 2 + spin * 1.3, u = Math.cos(t) * 15, v = Math.sin(t) * 6, x = 24 + u * Math.cos(a) - v * Math.sin(a), y = 24 + u * Math.sin(a) + v * Math.cos(a);
    if (m === 'hit' || m === 'ko') g.rect(x - 1, y, 2, 0, '#a87a20'); else { g.rect(x - 1, y, 2, 0, '#fffaf0'); g.set(x, y, iris); }
  }
  if (m === 'ko') g.rect(21, 24, 6, 0, '#6a4a10'); else { g.ellipse(24, 24, 4, 2.6, '#fffaf0'); g.ellipse(24, 24, 1.8, 1.8, iris); g.set(24, 24, '#0a0a14'); }
  g.outline('#6a4a10');
  g.ellipse(24, 24, 23.5, 23.5, (nx, ny, x, y) => (g.get(x, y) || nx * nx + ny * ny > .85 ? null : 'rgba(255,236,170,0.22)'));
  if (m === 'attack') for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + spin; g.line(24 + Math.cos(a) * 5, 24 + Math.sin(a) * 5, 24 + Math.cos(a) * 23, 24 + Math.sin(a) * 23, 'rgba(255,250,220,0.55)'); }
};

const bossDraw: Record<SpriteId, Draw> = { mushroom, gnome, boneeye, drunk, rocker, wolf, wizard, ophanim };
export const BOSS_SIZE = 48, PLAYER_SIZE = 32;
export const outlineOf: Record<SpriteId, string> = { mushroom: '#3a2329', gnome: '#24181a', boneeye: '#1c1418', drunk: '#24181a', rocker: '#0d0e12', wolf: '#15151a', wizard: '#000000', ophanim: '#6a4a10' };
export function drawBoss(id: SpriteId, f: number, m: Mode) { const g = new Grid(BOSS_SIZE, BOSS_SIZE); bossDraw[id](g, f, m === 'hit' ? 'hit' : m); return g; }

const mix = (hex: string, to: string, t: number) => { const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16); const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t); return `#${[16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('')}`; };
/** The traveller, 32×32 facing right, wearing the equipped outfit colours. */
export function drawPlayer(color: string, trim: string, f: number, m: Mode) {
  const g = new Grid(PLAYER_SIZE, PLAYER_SIZE), dy = bob(f, m), cloak = shade(color, mix(color, '#000000', .3), mix(color, '#ffffff', .25)), skin = '#e8c9a0';
  g.rect(12, 25, 2, 4, '#3b2a22'); g.rect(17, 25, 2, 4, '#3b2a22');
  g.tri(16, 8 + dy, 6, 28, 26, 28, cloak); g.rect(6, 26, 20, 1, trim);
  if (m === 'attack') { g.line(18, 16, 25, 15, color, 2); g.line(25, 15, 31, 13, '#d8dee6'); g.rect(24, 13, 0, 3, trim); }
  else { g.line(19, 17 + dy, 22, 21, color, 2); g.line(23, 20, 25, 9, '#d8dee6'); g.rect(22, 20, 2, 0, trim); }
  g.ellipse(16, 10 + dy, 5, 5, skin);
  g.ellipse(16, 8 + dy, 6.2, 5, (_nx, ny) => (ny < .05 ? color : null)); g.rect(10, 8 + dy, 2, 3, color);
  if (m === 'ko') { g.line(17, 9 + dy, 18, 11 + dy, '#2a1d22'); g.line(18, 9 + dy, 17, 11 + dy, '#2a1d22'); }
  else if (m === 'hit') { g.set(17, 10 + dy, '#2a1d22'); g.set(18, 11 + dy, '#2a1d22'); g.set(17, 12 + dy, '#2a1d22'); }
  else { g.rect(17, 10 + dy, 0, 1, '#2a1d22'); g.rect(20, 10 + dy, 0, 1, '#2a1d22'); g.set(18, 13 + dy, '#e59a8c'); }
  g.outline('#173e32');
  return g;
}
