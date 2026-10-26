import type { CSSProperties } from 'react';
import data from './attacks.json';

// Attack flipbooks cut from the painted sheets by scripts/cut-attacks.mjs (public/images/attacks/<kind>-<id>.webp).
// Each strip holds 2–3 frames side by side; (ax, ay) is the character's feet in a frame and bodyH its height,
// so the strip is drawn over the idle sprite at the same size and spot.
type Strip = { frames: number; w: number; h: number; ax: number; ay: number; bodyH: number };
const strips = data as { skin: Record<string, Strip>; boss: Record<string, Strip> };

export const hasAttack = (kind: 'skin' | 'boss', id: string) => id in strips[kind];
const stripUrl = (kind: 'skin' | 'boss', id: string) => `/images/attacks/${kind}-${id}.webp`;
/** Warm the cache so the first attack doesn't flash an empty frame. */
export function preloadAttack(kind: 'skin' | 'boss', id: string) { if (hasAttack(kind, id)) new Image().src = stripUrl(kind, id); }

/** Rendered inside .arena-player / .arena-boss, whose height is the idle sprite's height. */
export function AttackFx({ kind, id }: { kind: 'skin' | 'boss'; id: string }) {
  const s = strips[kind][id]; if (!s) return null;
  const style = {
    height: `${(s.h / s.bodyH) * 100}%`, aspectRatio: `${s.w} / ${s.h}`,
    transform: `translate(${(-s.ax / s.w) * 100}%, ${((s.h - s.ay) / s.h) * 100}%)`,
    backgroundImage: `url(${stripUrl(kind, id)})`, backgroundSize: `${s.frames * 100}% 100%`,
  } as CSSProperties;
  return <i className={`attack-fx frames-${s.frames}`} style={style} aria-hidden="true" />;
}
