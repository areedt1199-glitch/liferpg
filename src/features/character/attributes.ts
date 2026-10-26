// Character attributes, derived from real progress (nothing extra is stored):
// each stat is a skill or habit the player actually built, so the sheet reads as a growth record.
import careers from "../careers/catalog.json";
import { goalOfQuest } from "../journey/definitions";
import type { UserProgress } from "../journey/progress";

export type AttributeId = "int" | "dex" | "cre" | "foc" | "wil";
export type Attribute = { id: AttributeId; abbr: string; name: string; meaning: string; title: string };
export const attributes: Attribute[] = [
  { id: "int", abbr: "INT", name: "ปัญญา", meaning: "ความเข้าใจด้าน AI และข้อมูล", title: "นักเวทแห่งข้อมูล" },
  { id: "dex", abbr: "DEX", name: "ฝีมือ", meaning: "ทักษะเขียนโปรแกรมและสร้างซอฟต์แวร์", title: "นักดาบแห่งโค้ด" },
  { id: "cre", abbr: "CRE", name: "สร้างสรรค์", meaning: "การออกแบบและสร้างเกม", title: "ช่างฝีมือแห่งโลกเกม" },
  { id: "foc", abbr: "FOC", name: "สมาธิ", meaning: "เวลาที่ตั้งใจโฟกัสจริง", title: "ผู้บำเพ็ญสมาธิ" },
  { id: "wil", abbr: "WIL", name: "มุ่งมั่น", meaning: "ความสม่ำเสมอและการไม่ยอมแพ้", title: "ผู้ไม่ย่อท้อ" },
];
const TRACK: Partial<Record<AttributeId, string>> = { int: "ai", dex: "dev", cre: "game" };
/** Points per source: a passed level is worth more than one practice session; 25 focused minutes = 1 FOC. */
export const QUEST_POINTS = 3, PRACTICE_POINTS = 1, FOCUS_MINUTES_PER_POINT = 25;

export type AttributeValue = Attribute & { value: number; sources: string[] };
export function characterAttributes(progress: UserProgress): AttributeValue[] {
  const passed = new Map<string, number>(); // unique levels passed per track (rewards survive abandoning a goal)
  for (const questId of new Set(progress.rewards.map(r => r.questId))) {
    const track = goalOfQuest(questId)?.track; if (track) passed.set(track, (passed.get(track) ?? 0) + 1);
  }
  const practiced = new Map<string, number>(); const days = new Set<string>();
  for (const r of Object.values(progress.practice)) {
    const career = careers.find(c => c.id === r.careerId), track = (career && "track" in career && career.track) || "dev";
    practiced.set(track, (practiced.get(track) ?? 0) + 1); days.add(r.day);
  }
  const focusMinutes = Math.floor(Object.values(progress.focus).reduce((sum, f) => sum + f.totalMs, 0) / 60_000);
  const bossWins = Object.values(progress.bosses).filter(b => b.passedAt != null).length;
  return attributes.map(a => {
    const track = TRACK[a.id];
    if (track) {
      const q = passed.get(track) ?? 0, p = practiced.get(track) ?? 0;
      return { ...a, value: 1 + q * QUEST_POINTS + p * PRACTICE_POINTS, sources: [`ผ่านด่าน ${q} ด่าน`, `ฝึกประจำวัน ${p} ครั้ง`] };
    }
    if (a.id === "foc") return { ...a, value: 1 + Math.floor(focusMinutes / FOCUS_MINUTES_PER_POINT), sources: [`โฟกัสรวม ${focusMinutes} นาที`] };
    return { ...a, value: 1 + days.size + bossWins, sources: [`ฝึก ${days.size} วัน`, `ชนะบอส ${bossWins} ครั้ง`] };
  });
}
/** The title of the strongest stat; beginners stay apprentices until one stat reaches 5. */
export function characterTitle(values: AttributeValue[]) {
  const top = values.reduce((best, v) => v.value > best.value ? v : best, values[0]);
  return top.value < 5 ? "นักผจญภัยฝึกหัด" : top.title;
}
