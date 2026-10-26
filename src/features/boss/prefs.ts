"use client";
import { useSyncExternalStore } from 'react';
// Per-browser battle preferences (code language, music, sound effects). Not part of progress.
const listeners = new Set<() => void>();
function read(key: string, fallback: string) { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } }
export function writePref(key: string, value: string) { try { localStorage.setItem(key, value); } catch { /* private mode: keep for this page only */ } listeners.forEach(l => l()); }
function subscribe(notify: () => void) { listeners.add(notify); window.addEventListener('storage', notify); return () => { listeners.delete(notify); window.removeEventListener('storage', notify); }; }
/** Raw stored string (or null) for one key, re-rendering on writePref and on other tabs' changes. */
export function useStoredValue(key: string): string | null {
  return useSyncExternalStore(subscribe, () => { try { return localStorage.getItem(key); } catch { return null; } }, () => null);
}
export function usePref<T extends string>(key: string, fallback: T, allowed: readonly T[]): T {
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  return (allowed as readonly string[]).includes(value) ? value as T : fallback;
}
