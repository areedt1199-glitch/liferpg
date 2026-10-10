import { journeyDefinition } from "./definitions";
import careers from '../careers/catalog.json';
import { outfits, type PurchaseRecord } from '../wardrobe/catalog';
import type { QuestStatus } from "@/features/quests/types";
import { initialFocus, validateFocus, settleFocus, changeRound, type QuestFocus } from "../focus/rules";
import { gradeBoss, type BossResult } from '../boss/catalog';
import { validateImageInfo, type EvidenceRecord } from '../evidence/types';
import { bangkokDay } from '../analytics/rules';

export type RewardRecord = { questId: string; completedAt: number; xp: number; coins: number; totalXPBefore: number };
export type PracticeRecord = { careerId: string; taskId: string; day: string; completedAt: number; xp: number; coins: number };
// Daily career practice: small repeatable rewards, separate from the journey reward ledger.
export const PRACTICE_XP = 10, PRACTICE_COINS = 5, PRACTICE_DAILY_LIMIT = 3;
export const practiceKey = (day: string, careerId: string, taskId: string) => `${day}|${careerId}|${taskId}`;
export function levelStats(totalXP: number) { return { level: 1 + Math.floor(totalXP / 100), currentXP: totalXP % 100, nextXP: 100 - totalXP % 100 }; }
export type UserProgress = {
  version: 6;
  practice: Record<string, PracticeRecord>;
  bosses:Record<string,BossResult>;
  evidence:Record<string,EvidenceRecord>;
  careerId: string | null;
  equippedOutfitId: string;
  purchases: Record<string,PurchaseRecord>;
  totalXP: number;
  coins: number;
  rewards: Record<string, RewardRecord>;
  goalCompletedAt: number | null;
  selectedGoalId: string | null;
  activeQuestId: string | null;
  quests: Record<string, QuestStatus>;
  focus: Record<string, QuestFocus>;
};
export const statusLabels: Record<QuestStatus, string> = {
  locked: "ล็อก", available: "พร้อมเริ่ม", in_progress: "กำลังทำ", completed: "ผ่านแล้ว",
};
export function initialProgress(): UserProgress {
  return { version: 6, practice:{}, bosses:{}, evidence:{}, careerId:null, equippedOutfitId:'forest', purchases:{}, totalXP: 0, coins: 0, rewards: {}, goalCompletedAt: null, selectedGoalId: null, activeQuestId: null,
    focus: Object.fromEntries(journeyDefinition.quests.map(quest => [quest.id, initialFocus(quest.minutes * 60_000)])),
    quests: Object.fromEntries(journeyDefinition.quests.map((quest, index) => [quest.id, index === 0 ? "available" : "locked"])) };
}
export function selectGoal(progress: UserProgress, goalId: string): UserProgress {
  if (goalId !== journeyDefinition.id) throw new Error("ไม่พบเป้าหมายนี้");
  return { ...progress, selectedGoalId: goalId };
}
export function startQuest(progress: UserProgress, questId: string): UserProgress {
  if (!journeyDefinition.quests.some(quest => quest.id === questId)) throw new Error("ไม่พบเควสต์นี้");
  if (progress.selectedGoalId !== journeyDefinition.id) throw new Error("เลือกเป้าหมายก่อนเริ่มเควสต์");
  if (progress.activeQuestId === questId && progress.quests[questId] === "in_progress") return progress;
  if (progress.activeQuestId) throw new Error("คุณมีเควสต์ที่กำลังทำอยู่แล้ว");
  if (progress.quests[questId] !== "available") throw new Error("เควสต์นี้ยังไม่พร้อมเริ่ม");
  return { ...progress, activeQuestId: questId, quests: { ...progress.quests, [questId]: "in_progress" } };
}
export function canFocus(progress: UserProgress, questId: string): boolean {
  return journeyDefinition.quests.some(quest => quest.id === questId) && progress.selectedGoalId === journeyDefinition.id && progress.activeQuestId === questId && progress.quests[questId] === "in_progress";
}
// Migrate the same snapshot, without importing former sample UI balances.
export function parseProgress(raw: string | null): UserProgress {
  if (raw === null) return initialProgress();
  const value = JSON.parse(raw) as Omit<UserProgress, "version"> & { version: number };
  const ids = journeyDefinition.quests.map(q => q.id);
  if (!value || ![1, 2, 3, 4, 5, 6].includes(value.version) || !value.quests || ![null, journeyDefinition.id].includes(value.selectedGoalId) || !(value.activeQuestId === null || ids.includes(value.activeQuestId))) throw new Error("ข้อมูลที่บันทึกไม่รองรับ");
  const expected = initialProgress();
  let count = 0;
  if (value.version >= 3) {
    if (!value.rewards || typeof value.rewards !== "object" || Array.isArray(value.rewards)) throw new Error("ข้อมูลรางวัลไม่รองรับ");
    for (const quest of journeyDefinition.quests) {
      const record = value.rewards[quest.id];
      if (!record) break;
      if (record.questId !== quest.id || !Number.isSafeInteger(record.completedAt) || record.completedAt < 0 || record.xp !== quest.xp || record.coins !== quest.coins || record.xp < 0 || record.coins < 0 || record.totalXPBefore !== expected.totalXP) throw new Error("ข้อมูลรางวัลไม่สอดคล้องกัน");
      expected.rewards[quest.id] = { ...record };
      expected.totalXP += record.xp; expected.coins += record.coins;
      expected.quests[quest.id] = "completed"; count++;
    }
    if(value.version>=6){
      if(!value.practice||typeof value.practice!=='object'||Array.isArray(value.practice))throw new Error('ข้อมูลการฝึกไม่รองรับ');
      const perDay:Record<string,number>={};
      for(const [key,r] of Object.entries(value.practice)){
        const career=careers.find(c=>c.id===r?.careerId);
        if(!career||!career.tasks.some(t=>t.id===r.taskId)||!Number.isSafeInteger(r.completedAt)||r.completedAt<0||r.day!==bangkokDay(r.completedAt)||key!==practiceKey(r.day,r.careerId,r.taskId)||r.xp!==PRACTICE_XP||r.coins!==PRACTICE_COINS)throw new Error('ข้อมูลการฝึกไม่สอดคล้องกัน');
        perDay[r.day]=(perDay[r.day]??0)+1;
        if(perDay[r.day]>PRACTICE_DAILY_LIMIT)throw new Error('ข้อมูลการฝึกเกินจำนวนต่อวัน');
        expected.practice[key]={...r};expected.totalXP+=r.xp;expected.coins+=r.coins;
      }
    }
    if(value.version>=4){
      if(!(value.careerId===null||careers.some(c=>c.id===value.careerId))||!value.purchases||Array.isArray(value.purchases)||typeof value.purchases!=='object')throw new Error('ข้อมูลเส้นทางหรือร้านค้าไม่รองรับ');
      expected.careerId=value.careerId;
      for(const [id,purchase] of Object.entries(value.purchases)){
        const item=outfits.find(i=>i.id===id);
        if(!item||item.price===0||purchase.itemId!==id||purchase.coins!==item.price||!Number.isSafeInteger(purchase.purchasedAt)||purchase.purchasedAt<0)throw new Error('ข้อมูลการซื้อไม่สอดคล้องกัน');
        expected.purchases[id]={...purchase};expected.coins-=purchase.coins;
      }
      if(!outfits.some(i=>i.id===value.equippedOutfitId)||(value.equippedOutfitId!=='forest'&&!expected.purchases[value.equippedOutfitId]))throw new Error('ยังไม่ได้เป็นเจ้าของชุดนี้');
      expected.equippedOutfitId=value.equippedOutfitId;
    }
    if (Object.keys(value.rewards).length !== count || value.totalXP !== expected.totalXP || value.coins !== expected.coins || expected.coins<0) throw new Error("ยอดรางวัลไม่สอดคล้องกัน");
    expected.goalCompletedAt = count === ids.length ? expected.rewards[ids[ids.length - 1]].completedAt : null;
    if (value.goalCompletedAt !== expected.goalCompletedAt) throw new Error("สถานะเป้าหมายไม่สอดคล้องกัน");
  }
  if (count > 0 && value.selectedGoalId !== journeyDefinition.id) throw new Error("สถานะเป้าหมายไม่สอดคล้องกัน");
  if (count < ids.length) expected.quests[ids[count]] = "available";
  if (value.activeQuestId) {
    if (value.selectedGoalId !== journeyDefinition.id || value.activeQuestId !== ids[count]) throw new Error("สถานะเควสต์ไม่สอดคล้องกัน");
    expected.quests[value.activeQuestId] = "in_progress";
  }
  if (Object.keys(value.quests).length !== ids.length || journeyDefinition.quests.some(q => value.quests[q.id] !== expected.quests[q.id])) throw new Error("สถานะเควสต์ไม่สอดคล้องกัน");
  if (value.version !== 1) {
    if (!value.focus || Object.keys(value.focus).length !== ids.length) throw new Error("ข้อมูลโฟกัสไม่ครบ");
    for (const quest of journeyDefinition.quests) {
      const focus = validateFocus(value.focus[quest.id], quest.minutes * 60_000, quest.steps.map(s => s.id)); expected.focus[quest.id] = focus;
      if (expected.quests[quest.id] === "completed") {
        if (focus.checkedStepIds.length !== quest.steps.length || focus.round.status === "running") throw new Error("ข้อมูลเควสต์สำเร็จไม่สอดคล้องกัน");
      } else if (value.activeQuestId !== quest.id && (focus.checkedStepIds.length !== 0 || focus.totalMs !== 0 || focus.round.status !== "idle")) throw new Error("เควสต์ที่ยังไม่เริ่มมีข้อมูลโฟกัส");
    }
  }
  if(value.version>=5){
    if(!value.bosses||!value.evidence||typeof value.bosses!=='object'||typeof value.evidence!=='object'||Array.isArray(value.bosses)||Array.isArray(value.evidence))throw new Error('ข้อมูลบอสหรือภาพไม่รองรับ');
    for(const [id,r] of Object.entries(value.bosses)){
      if(!ids.includes(id)||!['in_progress','completed'].includes(expected.quests[id])||!Number.isInteger(r.score)||r.score<0||r.score>3||!Number.isSafeInteger(r.attempts)||r.attempts<1||(r.passedAt!==null&&(!Number.isSafeInteger(r.passedAt)||r.passedAt<0||r.score!==3))||(r.score===3&&r.passedAt===null))throw new Error('ผลบอสไม่สอดคล้องกัน');
      expected.bosses[id]={...r};
    }
    for(const [id,e] of Object.entries(value.evidence)){
      validateImageInfo(e.mime,e.size);
      if(!ids.includes(id)||!['in_progress','completed'].includes(expected.quests[id])||e.questId!==id||!e.id||!/^[-a-zA-Z0-9/_.]+$/.test(e.path)||e.path.includes('..')||!Number.isSafeInteger(e.createdAt)||e.createdAt<0)throw new Error('ภาพกิจกรรมไม่สอดคล้องกัน');
      expected.evidence[id]={...e};
    }
  }
  return { ...expected, selectedGoalId: value.selectedGoalId, activeQuestId: value.activeQuestId };
}
export function completeQuest(progress: UserProgress, questId: string, now: number): UserProgress {
  if (progress.rewards[questId] && progress.quests[questId] === "completed") return progress;
  if (!canFocus(progress, questId)) throw new Error("เควสต์นี้ยังยืนยันสำเร็จไม่ได้");
  const index = journeyDefinition.quests.findIndex(q => q.id === questId); const quest = journeyDefinition.quests[index]; const focus = progress.focus[questId];
  if (!quest.steps.every(s => focus.checkedStepIds.includes(s.id))) throw new Error("ทำขั้นตอนย่อยให้ครบก่อนยืนยัน");
  if(progress.bosses[questId]?.passedAt==null)throw new Error('ผ่านแบบทดสอบบอสก่อนยืนยัน');
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(quest.xp) || quest.xp < 0 || !Number.isSafeInteger(quest.coins) || quest.coins < 0) throw new Error("ค่ารางวัลหรือเวลาไม่ถูกต้อง");
  const settled = settleFocus(focus, now);
  // Close early without pretending the entire suggested duration was used.
  const closed = settled.round.status === "running" ? { ...settled, round: { ...settled.round, status: "paused" as const, startedAt: null } } : settled;
  const next = journeyDefinition.quests[index + 1];
  return { ...progress, activeQuestId: null, quests: { ...progress.quests, [questId]: "completed", ...(next ? { [next.id]: "available" as const } : {}) }, focus: { ...progress.focus, [questId]: closed }, rewards: { ...progress.rewards, [questId]: { questId, completedAt: now, xp: quest.xp, coins: quest.coins, totalXPBefore: Object.values(progress.rewards).reduce((sum, r) => sum + r.xp, 0) } }, totalXP: progress.totalXP + quest.xp, coins: progress.coins + quest.coins, goalCompletedAt: next ? null : now };
}
export function practiceToday(progress:UserProgress,now:number){
 const day=bangkokDay(now);return Object.values(progress.practice).filter(r=>r.day===day);
}
// Consecutive Bangkok days with practice, ending today (or yesterday while today is still open).
export function practiceStreak(progress:UserProgress,now:number){
 const days=new Set(Object.values(progress.practice).map(r=>r.day));
 let cursor=new Date(`${bangkokDay(now)}T12:00:00+07:00`).getTime();
 if(!days.has(bangkokDay(cursor)))cursor-=86_400_000;
 let streak=0;while(days.has(bangkokDay(cursor))){streak++;cursor-=86_400_000;}
 return streak;
}
export function completePractice(progress:UserProgress,taskId:string,now:number):UserProgress{
 const career=careers.find(c=>c.id===progress.careerId);
 if(!career)throw new Error('เลือกเส้นทางก่อนเริ่มฝึก');
 if(!career.tasks.some(t=>t.id===taskId))throw new Error('ไม่พบงานฝึกนี้ในเส้นทางที่เลือก');
 if(!Number.isSafeInteger(now)||now<0)throw new Error('เวลาไม่ถูกต้อง');
 const day=bangkokDay(now);const key=practiceKey(day,career.id,taskId);
 if(progress.practice[key])return progress;
 if(practiceToday(progress,now).length>=PRACTICE_DAILY_LIMIT)throw new Error(`วันนี้ฝึกครบ ${PRACTICE_DAILY_LIMIT} งานแล้ว พรุ่งนี้มาต่อกัน`);
 return {...progress,totalXP:progress.totalXP+PRACTICE_XP,coins:progress.coins+PRACTICE_COINS,practice:{...progress.practice,[key]:{careerId:career.id,taskId,day,completedAt:now,xp:PRACTICE_XP,coins:PRACTICE_COINS}}};
}
export function selectCareer(progress:UserProgress,careerId:string):UserProgress{
 if(!careers.some(c=>c.id===careerId))throw new Error('ไม่พบเส้นทางนี้');
 return {...progress,careerId};
}
export function attemptBoss(progress:UserProgress,questId:string,answers:Record<string,number>,now:number):UserProgress{
 if(!canFocus(progress,questId))throw new Error('เริ่มเควสต์ก่อนต่อสู้บอส');
 const quest=journeyDefinition.quests.find(q=>q.id===questId)!;
 if(!quest.steps.every(s=>progress.focus[questId].checkedStepIds.includes(s.id)))throw new Error('ทำขั้นตอนย่อยให้ครบก่อนสู้บอส');
 if(!Number.isSafeInteger(now)||now<0)throw new Error('เวลาไม่ถูกต้อง');
 const old=progress.bosses[questId];if(old?.passedAt!=null)return progress;
 const score=gradeBoss(questId,answers);
 return {...progress,bosses:{...progress.bosses,[questId]:{score,attempts:(old?.attempts??0)+1,passedAt:score===3?now:null}}};
}
export function attachEvidence(progress:UserProgress,record:EvidenceRecord):UserProgress{
 if(!['in_progress','completed'].includes(progress.quests[record.questId]))throw new Error('เริ่มเควสต์ก่อนแนบภาพ');
 validateImageInfo(record.mime,record.size);
 return parseProgress(JSON.stringify({...progress,evidence:{...progress.evidence,[record.questId]:record}}));
}
export function detachEvidence(progress:UserProgress,questId:string):UserProgress{
 const evidence={...progress.evidence};delete evidence[questId];return {...progress,evidence};
}
export function purchaseOutfit(progress:UserProgress,itemId:string,now:number):UserProgress{
 const item=outfits.find(i=>i.id===itemId);if(!item||!Number.isSafeInteger(now)||now<0)throw new Error('ไม่พบสินค้านี้');
 if(item.price===0||progress.purchases[itemId])return progress;
 if(progress.coins<item.price)throw new Error('เหรียญไม่พอสำหรับชุดนี้');
 return {...progress,coins:progress.coins-item.price,purchases:{...progress.purchases,[itemId]:{itemId,coins:item.price,purchasedAt:now}}};
}
export function equipOutfit(progress:UserProgress,itemId:string):UserProgress{
 if(!outfits.some(i=>i.id===itemId)||(itemId!=='forest'&&!progress.purchases[itemId]))throw new Error('ซื้อชุดนี้ก่อนสวมใส่');
 return {...progress,equippedOutfitId:itemId};
}
export function updateChecklist(progress: UserProgress, questId: string, stepId: string, checked: boolean): UserProgress {
  if (!canFocus(progress, questId)) throw new Error("เควสต์นี้ยังแก้ขั้นตอนย่อยไม่ได้");
  const quest = journeyDefinition.quests.find(quest => quest.id === questId)!;
  if (!quest.steps.some(step => step.id === stepId)) throw new Error("ไม่พบขั้นตอนย่อย");
  const focus = progress.focus[questId];
  const checkedStepIds = quest.steps.map(step => step.id).filter(id => id === stepId ? checked : focus.checkedStepIds.includes(id));
  return { ...progress, focus: { ...progress.focus, [questId]: { ...focus, checkedStepIds } } };
}
export function updateRound(progress: UserProgress, questId: string, action: "start" | "pause" | "resume" | "new" | "finish", now: number): UserProgress {
  if (action === "finish" && progress.quests[questId] === "completed") return progress;
  if (!canFocus(progress, questId)) throw new Error("เควสต์นี้ยังใช้ตัวจับเวลาไม่ได้");
  const focus = progress.focus[questId];
  const next = action === "finish" ? (focus.round.status === "running" && now >= focus.round.startedAt! + focus.round.durationMs - focus.round.elapsedMs ? settleFocus(focus, now) : focus) : changeRound(focus, action, now);
  return { ...progress, focus: { ...progress.focus, [questId]: next } };
}

