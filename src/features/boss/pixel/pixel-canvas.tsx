"use client";
/* eslint-disable @next/next/no-img-element -- pixel-art sprites/backdrops are small static files scaled by CSS */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { SceneId } from '../catalog';
import { POTION_SIZE, drawPotion } from './sprites';
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
