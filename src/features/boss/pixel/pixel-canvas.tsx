"use client";
/* eslint-disable @next/next/no-img-element -- pixel-art sprites/backdrops are small static files scaled by CSS */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { SceneId, SpriteId } from '../catalog';
import type { Mode } from './engine';
import { BOSS_SIZE, PLAYER_SIZE, POTION_SIZE, drawBoss, drawPlayer, drawPotion, outlineOf } from './sprites';
import { SCENE_H, SCENE_W, particles } from './scenes';

const REDUCED = '(prefers-reduced-motion: reduce)';
function subscribeMotion(notify: () => void) { const q = matchMedia(REDUCED); q.addEventListener('change', notify); return () => q.removeEventListener('change', notify); }
export function useReducedMotion() { return useSyncExternalStore(subscribeMotion, () => matchMedia(REDUCED).matches, () => false); }
/** Animation frame counter; frozen at 0 when animation is off or the user prefers reduced motion. */
function useFrame(ms: number, on: boolean) {
  const reduce = useReducedMotion(), [frame, setFrame] = useState(0);
  useEffect(() => { if (!on || reduce) return; const id = setInterval(() => setFrame(f => f + 1), ms); return () => clearInterval(id); }, [ms, on, reduce]);
  return on && !reduce ? frame : 0;
}

export function PixelBoss({ sprite, mode = 'idle', flash = false, animate = true, className, label }: { sprite: SpriteId; mode?: Mode; flash?: boolean; animate?: boolean; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null), frame = useFrame(380, animate);
  useEffect(() => { const ctx = ref.current?.getContext('2d'); if (ctx) drawBoss(sprite, frame, mode).draw(ctx, { flash, gray: mode === 'ko', outline: outlineOf[sprite] }); }, [sprite, frame, mode, flash]);
  return <canvas ref={ref} width={BOSS_SIZE} height={BOSS_SIZE} className={`pixel ${className ?? ''}`} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

export function PixelPlayer({ color, trim, mode = 'idle', flash = false, className }: { color: string; trim: string; mode?: Mode; flash?: boolean; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null), frame = useFrame(420, true);
  useEffect(() => { const ctx = ref.current?.getContext('2d'); if (ctx) drawPlayer(color, trim, frame, mode).draw(ctx, { flash, gray: mode === 'ko', outline: '#173e32' }); }, [color, trim, frame, mode, flash]);
  return <canvas ref={ref} width={PLAYER_SIZE} height={PLAYER_SIZE} className={`pixel ${className ?? ''}`} aria-hidden="true" />;
}

/** Painted backdrop for a level plus a low-res animated particle layer. */
export function PixelScene({ scene, level, className }: { scene: SceneId; level: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null), frame = useFrame(160, true);
  useEffect(() => { const ctx = ref.current?.getContext('2d'); if (!ctx) return; ctx.clearRect(0, 0, SCENE_W, SCENE_H); particles(ctx, scene, frame); }, [scene, frame]);
  return <div className={`scene-${scene} ${className ?? ''}`} aria-hidden="true">
    
    <img src={`/images/battle/lv${level}.jpg`} alt="" className="scene-art" />
    <canvas ref={ref} width={SCENE_W} height={SCENE_H} className="pixel scene-fx" />
  </div>;
}

export function PixelPotion({ kind, liquid, className }: { kind: 'hint' | 'heart' | 'reveal' | 'double'; liquid: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const ctx = ref.current?.getContext('2d'); if (ctx) drawPotion(kind, liquid).draw(ctx); }, [kind, liquid]);
  return <canvas ref={ref} width={POTION_SIZE} height={POTION_SIZE} className={`pixel ${className ?? ''}`} aria-hidden="true" />;
}
