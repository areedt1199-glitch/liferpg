"use client";
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useProgress } from '@/features/journey/progress-store';
import { ShareButton } from './share-button';

type Own = { handle: string | null; isPublic: boolean };
let cached: Promise<Own> | null = null;
let cachedFor: string | null = null;
function ownPortfolio(userId: string) {
  if (!cached || cachedFor !== userId) {
    cachedFor = userId;
    cached = fetch('/api/portfolio', { cache: 'no-store' }).then(r => r.ok ? r.json() : { handle: null, isPublic: false }).catch(() => ({ handle: null, isPublic: false }));
  }
  return cached;
}

/** Called after the player changes their portfolio settings so the next share prompt re-reads them. */
export function forgetOwnPortfolio() { cached = null; cachedFor = null; }

/** Shares a moment (level up, boss win) as a link to the player's public portfolio, whose preview card shows their stats. */
export function ShareProgress({ text }: { text: string }) {
  const { mode, userId } = useProgress();
  const [own, setOwn] = useState<Own | null>(null);
  useEffect(() => { if (mode === 'account' && userId) void ownPortfolio(userId).then(setOwn); }, [mode, userId]);
  if (mode !== 'account' || !own) return null;
  if (!own.handle || !own.isPublic) return <Link className="text-link share-progress" href="/profile#portfolio-title">เปิดพอร์ตโฟลิโอเพื่อแชร์ความสำเร็จ ↗</Link>;
  return <ShareButton path={`/u/${own.handle}`} title="liferpg" text={text} label="แชร์ความสำเร็จ ↗" className="text-link share-progress" />;
}
