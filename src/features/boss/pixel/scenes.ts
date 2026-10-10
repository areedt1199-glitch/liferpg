import { rng } from './engine';
import type { SceneId } from '../catalog';

// Battle backdrops are painted images (public/images/battle/lvN.jpg); this adds a light animated layer on top.
export const SCENE_W = 160, SCENE_H = 90, FLOOR = 60;

/** Animated particles, drawn onto a transparent canvas over the backdrop each tick. */
export function particles(ctx: CanvasRenderingContext2D, id: SceneId, t: number) {
  const r = rng(id.length * 97), dot = (x: number, y: number, c: string, s = 1) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), s, s); };
  switch (id) {
    case 'glade': for (let i = 0; i < 14; i++) { const x = r() * 160 + Math.sin(t * .05 + i) * 4, y = 20 + r() * 50 + Math.cos(t * .04 + i * 2) * 3; if ((t + i * 3) % 10 < 7) dot(x, y, 'rgba(230,255,140,0.9)'); } break;
    case 'oldwood': for (let i = 0; i < 8; i++) { const y = (r() * 90 + t * (.6 + r() * .4)) % 90, x = r() * 160 + Math.sin(t * .1 + i) * 3; dot(x, y, ['#c89a4a', '#a8743a'][i % 2]); } break;
    case 'darkwood': ctx.fillStyle = 'rgba(190,210,200,0.10)'; for (let i = 0; i < 4; i++) ctx.fillRect(((t * .7 + i * 50) % 220) - 60, FLOOR - 10 + i * 2, 60, 3); break;
    case 'neonwood': for (let i = 0; i < 16; i++) { const y = (90 - ((t * (.4 + r() * .5) + r() * 90) % 90)), x = r() * 160 + Math.sin(t * .08 + i) * 5; dot(x, y, i % 3 ? '#3ef0ff' : '#ff5ad1'); } break;
    case 'castlegate': {
      ctx.fillStyle = 'rgba(200,210,230,0.45)'; for (let i = 0; i < 40; i++) { const x = (r() * 180 + t * 2) % 180 - 10, y = (r() * 100 + t * 6) % 100 - 10; ctx.fillRect(Math.round(x), Math.round(y), 1, 3); }
      if (t % 47 < 2) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, 160, 90); ctx.fillStyle = '#fffbe0'; let x = 120, y = 0; while (y < 30) { const nx = x + (r() - .5) * 8, ny = y + 4; ctx.fillRect(Math.round(nx), Math.round(ny), 1, 4); x = nx; y = ny; } } break; }
    case 'dungeon': for (let i = 0; i < 5; i++) { const x = 20 + r() * 120, y = (r() * 50 + t * 1.5) % 70; dot(x, y, 'rgba(170,210,230,0.7)'); } break;
    case 'darkhall': for (let i = 0; i < 12; i++) { const y = FLOOR - ((t * (.3 + r() * .3) + r() * 60) % 60), x = r() * 160; dot(x, y, 'rgba(185,140,255,0.8)'); } break;
    case 'heaven': for (let i = 0; i < 14; i++) { const x = r() * 160, y = r() * 60; if ((t + i * 5) % 12 < 4) { dot(x, y, '#fff3b0'); if ((t + i) % 12 < 2) { dot(x - 1, y, 'rgba(255,243,176,0.6)'); dot(x + 1, y, 'rgba(255,243,176,0.6)'); } } } break;
  }
}
