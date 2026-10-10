import type { Quest } from "@/features/quests/types";

// Content definitions only. User progress is stored separately.
export const journeyDefinition = {
  id: "first-game",
  title: "สร้างเกมแรก",
  description: "จากบรรทัดแรก สู่เกมเล็ก ๆ ที่คุณสร้างเอง",
  quests: [
    { id: "tools", title: "เตรียมเครื่องมือ", task: "ติดตั้งเครื่องมือและรัน Hello World", place: "หมู่บ้านเริ่มต้น", minutes: 20, xp: 120, coins: 35, steps: [{ id: "install-tools", text: "ติดตั้งเครื่องมือเขียนโปรแกรม" }, { id: "create-file", text: "สร้างไฟล์โปรแกรมแรก" }, { id: "hello-world", text: "รัน Hello World" }], success: "ติดตั้งเครื่องมือสำเร็จและแสดงข้อความ Hello World ได้" },
    { id: "variables", title: "ตัวแปรและเงื่อนไข", task: "เขียนโปรแกรมรับค่าและใช้ if/else", place: "ป่าของการเรียนรู้", minutes: 25, xp: 80, coins: 20, steps: [{ id: "read-conditions", text: "อ่านตัวอย่างตัวแปรและ if/else" }, { id: "receive-score", text: "เขียนโปรแกรมรับคะแนน" }, { id: "show-result", text: "แสดงผลผ่าน/ไม่ผ่านด้วยเงื่อนไข" }], success: "โปรแกรมรันได้และทดลองทั้งกรณีผ่านกับไม่ผ่าน" },
    { id: "loops", title: "ฝึกลูป", task: "เขียนโปรแกรมทำงานซ้ำ", place: "ค่ายฝึก", minutes: 25, xp: 90, coins: 25, steps: [{ id: "read-loops", text: "อ่านตัวอย่างลูป" }, { id: "repeat-count", text: "เขียนโปรแกรมนับเลขซ้ำ" }, { id: "change-rounds", text: "ทดลองเปลี่ยนจำนวนรอบ" }], success: "โปรแกรมทำงานซ้ำได้ตามจำนวนรอบที่กำหนด" },
    { id: "guess-number", title: "เกมทายตัวเลข", task: "รวมเงื่อนไขและลูปเป็นเกมเล็ก", place: "ดันเจี้ยนตัวเลข", minutes: 30, xp: 100, coins: 30, steps: [{ id: "set-answer", text: "กำหนดตัวเลขคำตอบ" }, { id: "read-guess", text: "รับค่าทายและตรวจด้วยเงื่อนไข" }, { id: "repeat-guesses", text: "ให้ทายซ้ำจนตอบถูก" }], success: "เกมรับค่าทายซ้ำและแสดงผลเมื่อตอบถูกได้" },
    { id: "improve-game", title: "ทดลองและปรับเกม", task: "ทดสอบ แก้ข้อผิดพลาด และสรุปผลงาน", place: "ยอดเขาจุดหมาย", minutes: 30, xp: 120, coins: 40, steps: [{ id: "test-cases", text: "ทดลองเล่นหลายกรณี" }, { id: "fix-errors", text: "แก้ข้อผิดพลาดที่พบ" }, { id: "summarize", text: "สรุปสิ่งที่เรียนรู้" }], success: "เกมผ่านกรณีทดสอบที่เตรียมไว้และมีสรุปผลงาน" },
  ] satisfies Quest[],
};
export function findQuest(id: string): Quest | undefined { return journeyDefinition.quests.find(quest => quest.id === id); }

