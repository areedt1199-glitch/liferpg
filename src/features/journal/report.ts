// Weekly "report to the guild": what the player did in a Monday–Sunday week (Bangkok dates), from existing records.
import { bangkokDay } from "../analytics/rules";
import type { JournalEntry, UserProgress } from "../journey/progress";

const DAY = 86_400_000;
export const addDays = (day: string, n: number) => new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
/** Monday (Bangkok date) of the week that contains `time`. */
export function weekStart(time: number) {
  const day = bangkokDay(time), dow = (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(day, -dow);
}

export type WeekStats = { week: string; quests: number; xp: number; practice: number; days: number; plansDone: number; notes: number; bossWins: number };
export function weekStats(progress: UserProgress, week: string): WeekStats {
  const end = addDays(week, 7), inWeek = (day: string) => day >= week && day < end;
  const rewards = progress.rewards.filter(r => inWeek(bangkokDay(r.completedAt)));
  const practice = Object.values(progress.practice).filter(r => inWeek(r.day));
  return {
    week,
    quests: new Set(rewards.map(r => r.questId)).size,
    xp: [...rewards, ...practice].reduce((sum, r) => sum + r.xp, 0),
    practice: practice.length,
    days: new Set(practice.map(r => r.day)).size,
    plansDone: progress.plans.filter(p => p.done && inWeek(p.day)).length,
    notes: progress.journal.filter(j => j.kind === "note" && inWeek(bangkokDay(j.createdAt))).length,
    bossWins: Object.values(progress.bosses).filter(b => b.passedAt != null && inWeek(bangkokDay(b.passedAt))).length,
  };
}
export const weeklyGoal = (progress: UserProgress, week: string): JournalEntry | undefined =>
  progress.journal.find(j => j.kind === "weekly" && j.week === week);
/** Thai label of a week, e.g. "13–19 ต.ค." */
export function weekLabel(week: string) {
  const fmt = (day: string, month: boolean) => new Date(`${day}T12:00:00Z`).toLocaleDateString("th-TH", { day: "numeric", ...(month ? { month: "short" } : {}), timeZone: "UTC" });
  return `${fmt(week, false)}–${fmt(addDays(week, 6), true)}`;
}
