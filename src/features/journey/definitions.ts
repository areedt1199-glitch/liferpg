import type { Quest } from "@/features/quests/types";
import { knowledgePaths } from "@/features/knowledge";

// Content definitions only. User progress is stored separately.
export type GoalDefinition = { id: string; title: string; description: string; track: string; finish: string; quests: Quest[] };

export const journeyDefinition = {
  id: "first-game",
  title: "สร้างเกมแรก",
  description: "จากบรรทัดแรก สู่เกมเล็ก ๆ ที่คุณสร้างเอง",
  track: "game",
  finish: "เกมแรกของคุณพร้อมให้โลกเห็น",
  quests: [
    { id: "tools", title: "เตรียมเครื่องมือ", task: "ติดตั้งเครื่องมือและรัน Hello World", place: "หมู่บ้านเริ่มต้น", minutes: 20, xp: 120, coins: 105, steps: [{ id: "install-tools", text: "ติดตั้งเครื่องมือเขียนโปรแกรม" }, { id: "create-file", text: "สร้างไฟล์โปรแกรมแรก" }, { id: "hello-world", text: "รัน Hello World" }], success: "ติดตั้งเครื่องมือสำเร็จและแสดงข้อความ Hello World ได้" },
    { id: "variables", title: "ตัวแปรและเงื่อนไข", task: "เขียนโปรแกรมรับค่าและใช้ if/else", place: "ป่าของการเรียนรู้", minutes: 25, xp: 80, coins: 60, steps: [{ id: "read-conditions", text: "อ่านตัวอย่างตัวแปรและ if/else" }, { id: "receive-score", text: "เขียนโปรแกรมรับคะแนน" }, { id: "show-result", text: "แสดงผลผ่าน/ไม่ผ่านด้วยเงื่อนไข" }], success: "โปรแกรมรันได้และทดลองทั้งกรณีผ่านกับไม่ผ่าน" },
    { id: "loops", title: "ฝึกลูป", task: "เขียนโปรแกรมทำงานซ้ำ", place: "ค่ายฝึก", minutes: 25, xp: 90, coins: 75, steps: [{ id: "read-loops", text: "อ่านตัวอย่างลูป" }, { id: "repeat-count", text: "เขียนโปรแกรมนับเลขซ้ำ" }, { id: "change-rounds", text: "ทดลองเปลี่ยนจำนวนรอบ" }], success: "โปรแกรมทำงานซ้ำได้ตามจำนวนรอบที่กำหนด" },
    { id: "guess-number", title: "เกมทายตัวเลข", task: "รวมเงื่อนไขและลูปเป็นเกมเล็ก", place: "ดันเจี้ยนตัวเลข", minutes: 30, xp: 100, coins: 90, steps: [{ id: "set-answer", text: "กำหนดตัวเลขคำตอบ" }, { id: "read-guess", text: "รับค่าทายและตรวจด้วยเงื่อนไข" }, { id: "repeat-guesses", text: "ให้ทายซ้ำจนตอบถูก" }], success: "เกมรับค่าทายซ้ำและแสดงผลเมื่อตอบถูกได้" },
    { id: "improve-game", title: "ทดลองและปรับเกม", task: "ทดสอบ แก้ข้อผิดพลาด และสรุปผลงาน", place: "ยอดเขาจุดหมาย", minutes: 30, xp: 120, coins: 120, steps: [{ id: "test-cases", text: "ทดลองเล่นหลายกรณี" }, { id: "fix-errors", text: "แก้ข้อผิดพลาดที่พบ" }, { id: "summarize", text: "สรุปสิ่งที่เรียนรู้" }], success: "เกมผ่านกรณีทดสอบที่เตรียมไว้และมีสรุปผลงาน" },
    { id: "functions", title: "ฟังก์ชันและจัดโค้ด", task: "แยกโค้ดเกมเป็นฟังก์ชันที่ใช้ซ้ำได้", place: "ห้องใต้ดินปราสาท", minutes: 30, xp: 130, coins: 135, steps: [{ id: "write-function", text: "เขียนฟังก์ชันตรวจคำตอบของผู้เล่น" }, { id: "reuse-function", text: "เรียกใช้ฟังก์ชันแทนโค้ดที่เขียนซ้ำ" }, { id: "test-function", text: "ทดสอบฟังก์ชันกับหลายค่า" }], success: "เกมทำงานเหมือนเดิม และโค้ดที่ซ้ำถูกแยกเป็นฟังก์ชัน" },
    { id: "high-score", title: "ลิสต์และคะแนนสูงสุด", task: "เก็บประวัติคะแนนในลิสต์และบันทึกคะแนนสูงสุด", place: "ปราสาทมืด", minutes: 35, xp: 140, coins: 150, steps: [{ id: "store-scores", text: "เก็บจำนวนครั้งที่ทายของแต่ละรอบไว้ในลิสต์" }, { id: "find-best", text: "หาคะแนนที่ดีที่สุดจากลิสต์" }, { id: "save-best", text: "บันทึกคะแนนสูงสุดให้อยู่หลังปิดเกม" }], success: "ปิดแล้วเปิดเกมใหม่ ยังเห็นคะแนนสูงสุดเดิม" },
    { id: "publish-game", title: "เผยแพร่เกมและรับฟีดแบ็ก", task: "เขียน README ให้เพื่อนลองเล่น แล้วรวบรวมฟีดแบ็ก", place: "สวรรค์ชั้นฟ้า", minutes: 30, xp: 150, coins: 180, steps: [{ id: "write-readme", text: "เขียน README บอกวิธีรันและวิธีเล่น" }, { id: "share-game", text: "ให้เพื่อนอย่างน้อย 1 คนลองเล่น" }, { id: "collect-feedback", text: "จดฟีดแบ็กและเลือกสิ่งที่จะปรับต่อ" }], success: "มีคนอื่นได้เล่นเกมของคุณ และคุณมีรายการสิ่งที่จะปรับต่อ" },
  ] satisfies Quest[],
};

// Career/skill paths become goals: one level per practice task (ids `${pathId}.${taskId}`), bosses from the knowledge quiz.
const PATH_PLACES = ["หมู่บ้านเริ่มต้น", "ป่าของการเรียนรู้", "ค่ายฝึก", "ดันเจี้ยนแห่งการทดสอบ", "ยอดเขาจุดหมาย", "ห้องใต้ดินปราสาท", "ปราสาทมืด", "สวรรค์ชั้นฟ้า"];
export const pathQuestId = (pathId: string, taskId: string) => `${pathId}.${taskId}`;
const pathGoals: GoalDefinition[] = knowledgePaths().map(k => ({
  id: k.pathId, title: k.title, description: k.intro, track: k.track, finish: `ผ่านเส้นทาง${k.title}ครบทุกด่าน`,
  quests: k.lessons.map((l, i, all) => ({
    id: pathQuestId(k.pathId, l.taskId), title: l.title, task: l.description,
    place: PATH_PLACES[Math.round(i * (PATH_PLACES.length - 1) / Math.max(1, all.length - 1))], minutes: 25, xp: 80 + 20 * i, coins: 60 + 30 * i,
    steps: [
      { id: "read", text: "อ่านสรุปความรู้ของด่านนี้ในคลังความรู้" },
      { id: "practice", text: `ลงมือฝึก: ${l.description}` },
      { id: "reflect", text: "จดสิ่งที่ได้เรียนรู้หรือจุดที่ยังติดขัดอย่างน้อย 1 ข้อ" },
    ],
    success: `ทำ “${l.title}” ได้จริงอย่างน้อยหนึ่งครั้ง และอธิบายสิ่งที่เรียนรู้ด้วยคำพูดของตัวเองได้`,
  })),
}));

export const goalDefinitions: GoalDefinition[] = [journeyDefinition, ...pathGoals];
const goalById = new Map(goalDefinitions.map(g => [g.id, g]));
const goalByQuest = new Map(goalDefinitions.flatMap(g => g.quests.map(q => [q.id, g] as const)));
export function findGoal(id: string): GoalDefinition | undefined { return goalById.get(id); }
export function goalOfQuest(questId: string): GoalDefinition | undefined { return goalByQuest.get(questId); }
export function findQuest(id: string): Quest | undefined { return goalByQuest.get(id)?.quests.find(quest => quest.id === id); }
