import { Grid } from './engine';

// Bosses and skins are painted images now (public/images); only the shop's potion icons are drawn in code.
const mix = (hex: string, to: string, t: number) => { const a = parseInt(hex.slice(1), 16), b = parseInt(to.slice(1), 16); const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t); return `#${[16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('')}`; };

/** 20×20 potion bottle; a small glyph inside tells the four potions apart. */
export const POTION_SIZE = 20;
export function drawPotion(kind: 'hint' | 'heart' | 'reveal' | 'double', liquid: string) {
  const g = new Grid(POTION_SIZE, POTION_SIZE), glass = 'rgba(220,240,255,0.55)';
  g.rect(8, 1, 3, 2, '#8a5a2a'); g.rect(8, 4, 3, 2, glass);
  g.ellipse(10, 13, 7, 6.5, glass);
  g.ellipse(10, 13, 6.2, 5.8, (_nx, ny) => (ny > -.25 ? (ny > .55 ? mix(liquid, '#000000', .25) : liquid) : null));
  g.set(6, 10, '#ffffff'); g.set(6, 11, '#ffffff'); g.set(7, 9, '#ffffff');
  const w = '#ffffff';
  if (kind === 'heart') { for (const [x, y] of [[9, 12], [11, 12], [8, 13], [9, 13], [10, 13], [11, 13], [12, 13], [9, 14], [10, 14], [11, 14], [10, 15]]) g.set(x, y, w); }
  if (kind === 'hint') { for (const [x, y] of [[9, 11], [10, 11], [11, 12], [10, 13], [10, 15]]) g.set(x, y, w); }
  if (kind === 'reveal') { g.rect(8, 13, 4, 0, w); g.set(9, 12, w); g.set(10, 12, w); g.set(9, 14, w); g.set(10, 14, w); g.set(10, 13, '#1a1a2a'); }
  if (kind === 'double') { for (const [x, y] of [[7, 12], [9, 14], [8, 13], [7, 14], [9, 12], [11, 12], [12, 12], [12, 13], [11, 14], [11, 15], [12, 15]]) g.set(x, y, w); }
  g.outline('#2a1d14');
  return g;
}
