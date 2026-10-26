import { cache } from 'react';
import { publicClient } from '@/lib/supabase/public';
import { findGoal, findQuest, goalOfQuest } from '@/features/journey/definitions';
import { levelStats } from '@/features/journey/progress';

// Shape returned by public.liferpg_portfolio (supabase/migrations/20261026120000_social.sql).
type Raw = { handle: string; name: string; skinId: string; totalXP: number; bosses: number; practiceDays: number;
  goals: { goalId: string; startedAt: number; completedAt: number | null; done: number }[];
  quests: { questId: string; completedAt: number; reviewed: boolean }[] };

export const HANDLE_PATTERN = /^[a-z0-9_]{3,24}$/;

/** A published player's portfolio with titles resolved, or null when the handle is unknown or private. */
export const loadPortfolio = cache(async (handle: string) => {
  const h = handle.toLowerCase();
  if (!HANDLE_PATTERN.test(h)) return null;
  const client = publicClient();
  if (!client) return null;
  const { data, error } = await client.rpc('liferpg_portfolio', { h });
  if (error || !data) return null;
  const raw = data as Raw;
  const goals = raw.goals.flatMap(g => { const def = findGoal(g.goalId); return def ? [{ ...g, title: def.title, track: def.track, total: def.quests.length }] : []; });
  const quests = raw.quests.flatMap(q => { const def = findQuest(q.questId); return def ? [{ ...q, title: def.title, goalTitle: goalOfQuest(q.questId)?.title ?? '' }] : []; });
  return { ...raw, level: levelStats(raw.totalXP).level, goals, quests, reviewed: quests.filter(q => q.reviewed).length };
});
export type Portfolio = NonNullable<Awaited<ReturnType<typeof loadPortfolio>>>;
