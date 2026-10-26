// Guild badges: milestones of real habits and learning, derived from progress (nothing extra is stored).
import { goalOfQuest } from "../journey/definitions";
import { levelStats, type UserProgress } from "../journey/progress";

export type Badge = { id: string; icon: string; name: string; desc: string; need: number };
export type BadgeState = Badge & { have: number; unlocked: boolean };
export const badges: Badge[] = [
  { id: "first-step", icon: "👣", name: "ก้าวแรก", desc: "ผ่านด่านแรก", need: 1 },
  { id: "pathfinder", icon: "🗺️", name: "นักเดินทาง", desc: "ผ่านครบ 10 ด่าน", need: 10 },
  { id: "veteran", icon: "🏰", name: "ผู้พิชิตดินแดน", desc: "ผ่านครบ 40 ด่าน", need: 40 },
  { id: "first-boss", icon: "⚔️", name: "ล้มบอสตัวแรก", desc: "ชนะบอสครั้งแรก", need: 1 },
  { id: "boss-hunter", icon: "🐉", name: "นักล่าบอส", desc: "ชนะบอส 10 ตัว", need: 10 },
  { id: "goal-done", icon: "🏆", name: "ถึงจุดหมาย", desc: "จบเป้าหมายครบทุกด่าน 1 เป้าหมาย", need: 1 },
  { id: "three-roads", icon: "🧭", name: "สามเส้นทาง", desc: "ผ่านด่านอย่างน้อยสายละ 1 ด่าน ทั้ง AI, Dev และเกม", need: 3 },
  { id: "spark-3", icon: "🔥", name: "จุดไฟ", desc: "ฝึกต่อเนื่อง 3 วัน", need: 3 },
  { id: "flame-7", icon: "🔥", name: "ไฟไม่มอด", desc: "ฝึกต่อเนื่อง 7 วัน", need: 7 },
  { id: "blaze-30", icon: "☄️", name: "เปลวไฟตำนาน", desc: "ฝึกต่อเนื่อง 30 วัน", need: 30 },
  { id: "focus-10h", icon: "⏳", name: "จิตแน่วแน่", desc: "โฟกัสรวม 10 ชั่วโมง", need: 10 },
  { id: "planner", icon: "📅", name: "นักวางแผน", desc: "ทำตามแผนสำเร็จ 10 ช่วงเวลา", need: 10 },
  { id: "scribe", icon: "🪶", name: "นักบันทึก", desc: "เขียนบันทึกการเดินทาง 1 ครั้ง", need: 1 },
  { id: "chronicler", icon: "📜", name: "ผู้จารึกตำนาน", desc: "เขียนบันทึกการเดินทาง 20 ครั้ง", need: 20 },
  { id: "level-5", icon: "⭐", name: "นักผจญภัยตัวจริง", desc: "ถึงเลเวล 5", need: 5 },
  { id: "level-10", icon: "🌟", name: "วีรชน", desc: "ถึงเลเวล 10", need: 10 },
];

/** Longest run of consecutive practice days ever (not just the current streak). */
export function longestStreak(progress: UserProgress) {
  const days = [...new Set(Object.values(progress.practice).map(r => r.day))].sort();
  let best = 0, run = 0, prev = "";
  for (const day of days) {
    run = prev && Date.parse(`${day}T00:00:00Z`) - Date.parse(`${prev}T00:00:00Z`) === 86_400_000 ? run + 1 : 1;
    best = Math.max(best, run); prev = day;
  }
  return best;
}

export function badgeStates(progress: UserProgress): BadgeState[] {
  const quests = new Set(progress.rewards.map(r => r.questId));
  const tracks = new Set([...quests].map(id => goalOfQuest(id)?.track).filter(Boolean));
  const bossWins = Object.values(progress.bosses).filter(b => b.passedAt != null).length;
  const streak = longestStreak(progress);
  const have: Record<string, number> = {
    "first-step": quests.size, pathfinder: quests.size, veteran: quests.size,
    "first-boss": bossWins, "boss-hunter": bossWins,
    "goal-done": Object.values(progress.goals).filter(g => g.completedAt !== null).length,
    "three-roads": ["ai", "dev", "game"].filter(t => tracks.has(t)).length,
    "spark-3": streak, "flame-7": streak, "blaze-30": streak,
    "focus-10h": Math.floor(Object.values(progress.focus).reduce((sum, f) => sum + f.totalMs, 0) / 3_600_000),
    planner: progress.plans.filter(p => p.done).length,
    scribe: progress.journal.filter(j => j.kind === "note").length, chronicler: progress.journal.filter(j => j.kind === "note").length,
    "level-5": levelStats(progress.totalXP).level, "level-10": levelStats(progress.totalXP).level,
  };
  return badges.map(b => ({ ...b, have: Math.min(have[b.id] ?? 0, b.need), unlocked: (have[b.id] ?? 0) >= b.need }));
}
