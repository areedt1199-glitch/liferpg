import { journeyDefinition, findGoal, findQuest, goalOfQuest, type GoalDefinition } from "./definitions";
import careers from '../careers/catalog.json';
import { itemById, skinById, skinPrice, STARTER_SKIN, MAX_ITEM_QTY, type ItemId } from '../shop/catalog';
import type { QuestStatus } from "@/features/quests/types";
import { initialFocus, validateFocus, settleFocus, changeRound, type QuestFocus } from "../focus/rules";
import { bosses, gradeBoss, type BossResult } from '../boss/catalog';
import { validateImageInfo, type EvidenceRecord } from '../evidence/types';
import { bangkokDay } from '../analytics/rules';

/** One quest completion. Re-doing a quest after abandoning its goal adds another attempt with XP but 0 coins. */
export type RewardRecord = { questId: string; goalId: string; attempt: number; completedAt: number; xp: number; coins: number; totalXPBefore: number };
export type PracticeRecord = { careerId: string; taskId: string; day: string; completedAt: number; xp: number; coins: number };
/** A goal the player has added. Each goal has its own map and at most one active quest. */
/** A planned focus slot: a goal quest, a daily practice task ("careerId|taskId") or a free-text activity. */
export type PlanKind = 'quest' | 'practice' | 'note';
export type PlanItem = { id: string; day: string; start: string; minutes: number; kind: PlanKind; ref: string; note: string; done: boolean };
export const PLAN_MINUTES = [15, 25, 30, 45, 60, 90, 120], PLAN_DAY_LIMIT = 12, PLAN_NOTE_MAX = 80, PLAN_TOTAL_LIMIT = 500;
const PLAN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const planMinutesOf = (start: string) => Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
/** Throws when a slot is malformed or refers to unknown content. */
export function validatePlanItem(item: PlanItem): PlanItem {
  const valid = item && typeof item.id === 'string' && PLAN_ID.test(item.id) && typeof item.day === 'string' && /^(20[2-9]\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(item.day) && !Number.isNaN(Date.parse(`${item.day}T00:00:00Z`)) && new Date(`${item.day}T00:00:00Z`).toISOString().startsWith(item.day)
    && typeof item.start === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item.start) && Number.isInteger(item.minutes) && item.minutes >= 5 && item.minutes <= 240
    && ['quest', 'practice', 'note'].includes(item.kind) && typeof item.ref === 'string' && typeof item.note === 'string' && item.note.length <= PLAN_NOTE_MAX && typeof item.done === 'boolean';
  if (!valid) throw new Error('ข้อมูลแผนไม่ถูกต้อง');
  const [careerId, taskId] = item.ref.split('|');
  if (item.kind === 'quest' && !findQuest(item.ref)) throw new Error('ไม่พบด่านในแผนนี้');
  if (item.kind === 'practice' && !careers.find(c => c.id === careerId)?.tasks.some(t => t.id === taskId)) throw new Error('ไม่พบงานฝึกในแผนนี้');
  if (item.kind === 'note' && (item.ref !== '' || !item.note.trim())) throw new Error('ใส่ชื่อกิจกรรมก่อนบันทึก');
  return { id: item.id.toLowerCase(), day: item.day, start: item.start, minutes: item.minutes, kind: item.kind, ref: item.ref, note: item.note, done: item.done };
}
const planOrder = (a: PlanItem, b: PlanItem) => a.day.localeCompare(b.day) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id);
export function addPlan(progress: UserProgress, item: PlanItem): UserProgress {
  const plan = validatePlanItem(item);
  if (progress.plans.some(p => p.id === plan.id)) return progress;
  if (progress.plans.filter(p => p.day === plan.day).length >= PLAN_DAY_LIMIT) throw new Error(`วางแผนได้ไม่เกิน ${PLAN_DAY_LIMIT} ช่วงต่อวัน`);
  if (progress.plans.length >= PLAN_TOTAL_LIMIT) throw new Error('แผนเต็มแล้ว ลบแผนเก่าก่อน');
  return { ...progress, plans: [...progress.plans, plan].sort(planOrder) };
}
export function removePlan(progress: UserProgress, id: string): UserProgress {
  return { ...progress, plans: progress.plans.filter(p => p.id !== id.toLowerCase()) };
}
export function setPlanDone(progress: UserProgress, id: string, done: boolean): UserProgress {
  if (!progress.plans.some(p => p.id === id.toLowerCase())) throw new Error('ไม่พบแผนนี้');
  return { ...progress, plans: progress.plans.map(p => p.id === id.toLowerCase() ? { ...p, done } : p) };
}
/** Adventurer's journal: a short reflection (optionally about one quest), or the goal set for a week (week = its Monday). */
export type JournalKind = 'note' | 'weekly';
export type JournalEntry = { id: string; kind: JournalKind; questId: string; text: string; week: string; createdAt: number };
export const JOURNAL_TEXT_MAX = 500, JOURNAL_LIMIT = 1000;
const isMonday = (day: string) => new Date(`${day}T12:00:00Z`).getUTCDay() === 1;
/** Throws when an entry is malformed or refers to an unknown quest. */
export function validateJournalEntry(entry: JournalEntry): JournalEntry {
  const valid = entry && typeof entry.id === 'string' && PLAN_ID.test(entry.id) && ['note', 'weekly'].includes(entry.kind) && typeof entry.questId === 'string'
    && typeof entry.text === 'string' && entry.text.trim() !== '' && entry.text.length <= JOURNAL_TEXT_MAX && typeof entry.week === 'string' && Number.isSafeInteger(entry.createdAt) && entry.createdAt >= 0
    && (entry.kind === 'note' ? entry.week === '' : /^(20[2-9]\d)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(entry.week) && new Date(`${entry.week}T00:00:00Z`).toISOString().startsWith(entry.week) && isMonday(entry.week));
  if (!valid) throw new Error('ข้อมูลบันทึกไม่ถูกต้อง');
  if (entry.questId !== '' && !findQuest(entry.questId)) throw new Error('ไม่พบด่านของบันทึกนี้');
  return { id: entry.id.toLowerCase(), kind: entry.kind, questId: entry.questId, text: entry.text, week: entry.week, createdAt: entry.createdAt };
}
const journalOrder = (a: JournalEntry, b: JournalEntry) => a.createdAt - b.createdAt || a.id.localeCompare(b.id);
/** Adds an entry; a second goal for the same week replaces the text of the first (one weekly goal per week). */
export function addJournal(progress: UserProgress, entry: JournalEntry): UserProgress {
  const e = validateJournalEntry(entry);
  if (progress.journal.some(j => j.id === e.id)) return progress;
  const same = e.kind === 'weekly' ? progress.journal.find(j => j.kind === 'weekly' && j.week === e.week) : undefined;
  if (same) return { ...progress, journal: progress.journal.map(j => j === same ? { ...j, text: e.text } : j) };
  if (progress.journal.length >= JOURNAL_LIMIT) throw new Error('สมุดบันทึกเต็มแล้ว ลบบันทึกเก่าก่อน');
  return { ...progress, journal: [...progress.journal, e].sort(journalOrder) };
}
export function removeJournal(progress: UserProgress, id: string): UserProgress {
  return { ...progress, journal: progress.journal.filter(j => j.id !== id.toLowerCase()) };
}
/** The guild teacher's verdict on submitted work for a quest (written only by the server; account mode). */
export type QuestReview = { attempts: number; verdict: 'pass' | 'fail' | null; feedback: string; hint: string; passedAt: number | null; updatedAt: number };
function validateReview(r: QuestReview): QuestReview {
  const time = (t: unknown) => Number.isSafeInteger(t) && (t as number) >= 0;
  if (!r || !Number.isSafeInteger(r.attempts) || r.attempts < 0 || !(r.verdict === null || r.verdict === 'pass' || r.verdict === 'fail') || typeof r.feedback !== 'string' || typeof r.hint !== 'string'
    || !(r.passedAt === null || time(r.passedAt)) || !time(r.updatedAt)) throw new Error('ข้อมูลผลตรวจงานไม่สอดคล้องกัน');
  return { attempts: r.attempts, verdict: r.verdict, feedback: r.feedback, hint: r.hint, passedAt: r.passedAt, updatedAt: r.updatedAt };
}
/** Whether a quest's submitted work has passed the teacher's review (always true in demo, which has no server). */
export const reviewPassed = (progress: UserProgress, questId: string, demo: boolean) => demo || progress.reviews[questId]?.passedAt != null;
export type GoalState = { startedAt: number; completedAt: number | null; activeQuestId: string | null };
// Daily career practice: small repeatable rewards, separate from the journey reward ledger.
export const PRACTICE_XP = 10, PRACTICE_COINS = 15, PRACTICE_DAILY_LIMIT = 3;
export const practiceKey = (day: string, careerId: string, taskId: string) => `${day}|${careerId}|${taskId}`;
export function levelStats(totalXP: number) { return { level: 1 + Math.floor(totalXP / 100), currentXP: totalXP % 100, nextXP: 100 - totalXP % 100 }; }
export type SkinPurchase = { skinId: string; coins: number; purchasedAt: number };
export type ItemPurchase = { id: string; itemId: ItemId; qty: number; coins: number; purchasedAt: number };
/** One potion drunk during one boss fight (battleId ties "×2 damage" to that fight only). */
export type ItemUse = { itemId: ItemId; questId: string; battleId: string; usedAt: number };
const BATTLE_ID = /^[0-9a-f-]{8,64}$/i;
const LEGACY_PRACTICE_COINS = 5;
export type UserProgress = {
  version: 8;
  goals: Record<string, GoalState>;
  /** Status, focus, boss and evidence entries exist only for quests of added goals. */
  quests: Record<string, QuestStatus>;
  focus: Record<string, QuestFocus>;
  bosses: Record<string, BossResult>;
  evidence: Record<string, EvidenceRecord>;
  rewards: RewardRecord[];
  practice: Record<string, PracticeRecord>;
  careerId: string | null;
  equippedSkinId: string;
  skins: Record<string, SkinPurchase>;
  itemPurchases: ItemPurchase[];
  itemUses: ItemUse[];
  /** Daily schedule: focus time slots on calendar days (Bangkok dates). */
  plans: PlanItem[];
  /** Reflections and weekly goals, oldest first. */
  journal: JournalEntry[];
  /** Teacher reviews per quest of an added goal (account mode only). */
  reviews: Record<string, QuestReview>;
  totalXP: number;
  coins: number;
};
export const statusLabels: Record<QuestStatus, string> = {
  locked: "ล็อก", available: "พร้อมเริ่ม", in_progress: "กำลังทำ", completed: "ผ่านแล้ว",
};
export function initialProgress(): UserProgress {
  return { version: 8, goals: {}, quests: {}, focus: {}, bosses: {}, evidence: {}, rewards: [], practice: {}, careerId: null, equippedSkinId: STARTER_SKIN, skins: {}, itemPurchases: [], itemUses: [], plans: [], journal: [], reviews: {}, totalXP: 0, coins: 0 };
}
/** Most recent completion of a quest (the one shown on its result page). */
export function latestReward(progress: UserProgress, questId: string): RewardRecord | undefined {
  for (let i = progress.rewards.length - 1; i >= 0; i--) if (progress.rewards[i].questId === questId) return progress.rewards[i];
  return undefined;
}
/** Coins are paid once per quest; a repeat after abandoning the goal pays XP only. */
export function questCoins(progress: UserProgress, questId: string) {
  const quest = findQuest(questId);
  return !quest || progress.rewards.some(r => r.questId === questId) ? 0 : quest.coins;
}
export function goalProgress(progress: UserProgress, goal: GoalDefinition) {
  return { added: !!progress.goals[goal.id], completed: goal.quests.filter(q => progress.quests[q.id] === "completed").length, total: goal.quests.length };
}
/** The quest to show for a goal: the active one, else the next available, else the last. */
export function currentQuest(progress: UserProgress, goal: GoalDefinition) {
  const active = progress.goals[goal.id]?.activeQuestId;
  return goal.quests.find(q => q.id === active) ?? goal.quests.find(q => progress.quests[q.id] === "available") ?? goal.quests[goal.quests.length - 1];
}
function freshGoal(goal: GoalDefinition) {
  return {
    quests: Object.fromEntries(goal.quests.map((q, i) => [q.id, (i === 0 ? "available" : "locked") as QuestStatus])),
    focus: Object.fromEntries(goal.quests.map(q => [q.id, initialFocus(q.minutes * 60_000)])),
  };
}
const without = <T,>(record: Record<string, T>, keys: string[]) => Object.fromEntries(Object.entries(record).filter(([k]) => !keys.includes(k)));

export function addGoal(progress: UserProgress, goalId: string, now: number): UserProgress {
  const goal = findGoal(goalId);
  if (!goal) throw new Error("ไม่พบเป้าหมายนี้");
  if (progress.goals[goalId]) return progress;
  if (!Number.isSafeInteger(now) || now < 0) throw new Error("เวลาไม่ถูกต้อง");
  const fresh = freshGoal(goal), ids = goal.quests.map(q => q.id);
  return { ...progress, goals: { ...progress.goals, [goalId]: { startedAt: now, completedAt: null, activeQuestId: null } },
    quests: { ...progress.quests, ...fresh.quests }, focus: { ...progress.focus, ...fresh.focus }, bosses: without(progress.bosses, ids), evidence: without(progress.evidence, ids), reviews: without(progress.reviews, ids) };
}
/** Removes the goal and all of its map progress (quests, focus, bosses, photos). Earned XP and coins stay. */
export function abandonGoal(progress: UserProgress, goalId: string): UserProgress {
  const goal = findGoal(goalId);
  if (!goal || !progress.goals[goalId]) throw new Error("ยังไม่ได้เพิ่มเป้าหมายนี้");
  const ids = goal.quests.map(q => q.id);
  return { ...progress, goals: without(progress.goals, [goalId]), quests: without(progress.quests, ids), focus: without(progress.focus, ids), bosses: without(progress.bosses, ids), evidence: without(progress.evidence, ids), reviews: without(progress.reviews, ids) };
}
/** Legacy name: choosing a goal now means adding it. */
export function selectGoal(progress: UserProgress, goalId: string, now = 0): UserProgress { return addGoal(progress, goalId, now); }
export function startQuest(progress: UserProgress, questId: string): UserProgress {
  const goal = goalOfQuest(questId);
  if (!goal) throw new Error("ไม่พบเควสต์นี้");
  const state = progress.goals[goal.id];
  if (!state) throw new Error("เพิ่มเป้าหมายก่อนเริ่มเควสต์");
  if (state.activeQuestId === questId && progress.quests[questId] === "in_progress") return progress;
  if (state.activeQuestId) throw new Error("คุณมีเควสต์ที่กำลังทำอยู่แล้วในเป้าหมายนี้");
  if (progress.quests[questId] !== "available") throw new Error("เควสต์นี้ยังไม่พร้อมเริ่ม");
  return { ...progress, goals: { ...progress.goals, [goal.id]: { ...state, activeQuestId: questId } }, quests: { ...progress.quests, [questId]: "in_progress" } };
}
export function canFocus(progress: UserProgress, questId: string): boolean {
  const goal = goalOfQuest(questId);
  return !!goal && progress.goals[goal.id]?.activeQuestId === questId && progress.quests[questId] === "in_progress";
}

const LEGACY_QUEST_COUNT = 5;
type LegacyProgress = {
  version: number; practice: Record<string, PracticeRecord>; bosses: Record<string, BossResult>; evidence: Record<string, EvidenceRecord>; careerId: string | null;
  equippedSkinId: string; skins: Record<string, SkinPurchase>; itemPurchases: ItemPurchase[]; itemUses: ItemUse[]; totalXP: number; coins: number;
  rewards: Record<string, Omit<RewardRecord, 'goalId' | 'attempt'>>; goalCompletedAt: number | null; selectedGoalId: string | null; activeQuestId: string | null;
  quests: Record<string, QuestStatus>; focus: Record<string, QuestFocus>;
};
type LegacyShop = { coins?: number; rewards?: LegacyProgress['rewards']; practice?: Record<string, PracticeRecord>; purchases?: Record<string, { coins: number }>; equippedOutfitId?: string };
function legacyInitial(): LegacyProgress {
  return { version: 7, practice: {}, bosses: {}, evidence: {}, careerId: null, equippedSkinId: STARTER_SKIN, skins: {}, itemPurchases: [], itemUses: [], totalXP: 0, coins: 0, rewards: {}, goalCompletedAt: null, selectedGoalId: null, activeQuestId: null,
    focus: Object.fromEntries(journeyDefinition.quests.map(quest => [quest.id, initialFocus(quest.minutes * 60_000)])),
    quests: Object.fromEntries(journeyDefinition.quests.map((quest, index) => [quest.id, index === 0 ? "available" : "locked"])) };
}
function validatePractice(value: Record<string, PracticeRecord> | undefined, into: { practice: Record<string, PracticeRecord>; totalXP: number; coins: number }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('ข้อมูลการฝึกไม่รองรับ');
  const perDay: Record<string, number> = {};
  for (const [key, r] of Object.entries(value)) {
    const career = careers.find(c => c.id === r?.careerId);
    if (!career || !career.tasks.some(t => t.id === r.taskId) || !Number.isSafeInteger(r.completedAt) || r.completedAt < 0 || r.day !== bangkokDay(r.completedAt) || key !== practiceKey(r.day, r.careerId, r.taskId) || r.xp !== PRACTICE_XP || r.coins !== PRACTICE_COINS) throw new Error('ข้อมูลการฝึกไม่สอดคล้องกัน');
    perDay[r.day] = (perDay[r.day] ?? 0) + 1;
    if (perDay[r.day] > PRACTICE_DAILY_LIMIT) throw new Error('ข้อมูลการฝึกเกินจำนวนต่อวัน');
    into.practice[key] = { ...r }; into.totalXP += r.xp; into.coins += r.coins;
  }
}
/** Skins and potions; returns potion stock after purchases. Retired skins are refunded into value.coins. */
function validateShop(value: { skins: Record<string, SkinPurchase>; equippedSkinId: string; itemPurchases: ItemPurchase[]; itemUses: ItemUse[]; coins: number }, into: { skins: Record<string, SkinPurchase>; equippedSkinId: string; itemPurchases: ItemPurchase[]; coins: number }) {
  const stock: Record<string, number> = {};
  if (!value.skins || typeof value.skins !== 'object' || Array.isArray(value.skins) || !Array.isArray(value.itemPurchases) || !Array.isArray(value.itemUses)) throw new Error('ข้อมูลร้านค้าไม่รองรับ');
  // Skins retired when the roster changed are refunded; wearing a retired one falls back to the starter.
  const kept: Record<string, SkinPurchase> = {};
  for (const [id, p] of Object.entries(value.skins)) { if (skinById(id)) kept[id] = p; else if (Number.isSafeInteger(p?.coins)) value.coins += p.coins; }
  value.skins = kept;
  if (!skinById(value.equippedSkinId)) value.equippedSkinId = STARTER_SKIN;
  for (const [id, p] of Object.entries(value.skins)) {
    const skin = skinById(id);
    if (!skin || skinPrice(skin) === 0 || p?.skinId !== id || p.coins !== skinPrice(skin) || !Number.isSafeInteger(p.purchasedAt) || p.purchasedAt < 0) throw new Error('ข้อมูลสกินไม่สอดคล้องกัน');
    into.skins[id] = { ...p }; into.coins -= p.coins;
  }
  const worn = skinById(value.equippedSkinId);
  if (!worn || (skinPrice(worn) > 0 && !into.skins[worn.id])) throw new Error('ยังไม่ได้เป็นเจ้าของสกินนี้');
  into.equippedSkinId = worn.id;
  for (const p of value.itemPurchases) {
    const item = itemById(p?.itemId);
    if (!item || typeof p.id !== 'string' || !p.id || !Number.isInteger(p.qty) || p.qty < 1 || p.qty > MAX_ITEM_QTY || p.coins !== item.price * p.qty || !Number.isSafeInteger(p.purchasedAt) || p.purchasedAt < 0) throw new Error('ข้อมูลการซื้อไอเทมไม่สอดคล้องกัน');
    stock[item.id] = (stock[item.id] ?? 0) + p.qty; into.coins -= p.coins; into.itemPurchases.push({ ...p });
  }
  return stock;
}
function validateBoss(id: string, r: BossResult) {
  // Results from before bosses had N+2 questions were graded out of 3 and stay valid.
  const total = r?.total ?? 3;
  if (!bosses[id] || ![3, bosses[id].questions.length].includes(total) || !Number.isInteger(r.score) || r.score < 0 || r.score > total || !Number.isSafeInteger(r.attempts) || r.attempts < 1 || (r.passedAt !== null && (!Number.isSafeInteger(r.passedAt) || r.passedAt < 0 || r.score !== total)) || (r.score === total && r.passedAt === null)) throw new Error('ผลบอสไม่สอดคล้องกัน');
  return { score: r.score, total, attempts: r.attempts, passedAt: r.passedAt };
}
function validateEvidence(id: string, e: EvidenceRecord) {
  validateImageInfo(e?.mime, e?.size);
  if (e.questId !== id || !e.id || !/^[-a-zA-Z0-9/_.]+$/.test(e.path) || e.path.includes('..') || !Number.isSafeInteger(e.createdAt) || e.createdAt < 0) throw new Error('ภาพกิจกรรมไม่สอดคล้องกัน');
  return { ...e };
}
// Schema 1–7 had a single "first-game" goal. Validated with the original rules, then converted to schema 8.
function parseLegacy(value: LegacyProgress): LegacyProgress {
  const ids = journeyDefinition.quests.map(q => q.id);
  if (!value || ![1, 2, 3, 4, 5, 6, 7].includes(value.version) || !value.quests || ![null, journeyDefinition.id].includes(value.selectedGoalId) || !(value.activeQuestId === null || ids.includes(value.activeQuestId))) throw new Error("ข้อมูลที่บันทึกไม่รองรับ");
  // Snapshots saved when the journey had 5 quests: append the new quests untouched and reopen the goal.
  const known = ids.filter(id => id in value.quests);
  if (known.length === LEGACY_QUEST_COUNT && known.every((id, i) => id === ids[i])) {
    value.quests = { ...value.quests };
    if (value.focus) value.focus = { ...value.focus };
    for (const quest of journeyDefinition.quests.slice(known.length)) {
      value.quests[quest.id] = "locked";
      if (value.focus) value.focus[quest.id] = initialFocus(quest.minutes * 60_000);
    }
    if (known.every(id => value.quests[id] === "completed")) value.quests[ids[known.length]] = "available";
    value.goalCompletedAt = null;
  }
  // Before schema 7 coin rewards were a third of today's, and the four outfits are refunded (skins replace them).
  if (value.version >= 3 && value.version < 7) {
    const v = value as unknown as LegacyShop;
    let earned = 0;
    v.rewards = Object.fromEntries(Object.entries(v.rewards ?? {}).map(([id, r]) => {
      const q = journeyDefinition.quests.find(x => x.id === id);
      if (q && r && r.coins * 3 === q.coins) { earned += r.coins; return [id, { ...r, coins: q.coins }]; }
      return [id, r];
    }));
    if (v.practice) v.practice = Object.fromEntries(Object.entries(v.practice).map(([k, r]) => {
      if (r && r.coins === LEGACY_PRACTICE_COINS) { earned += r.coins; return [k, { ...r, coins: PRACTICE_COINS }]; }
      return [k, r];
    }));
    const refund = Object.values(v.purchases ?? {}).reduce((n, p) => n + (Number.isSafeInteger(p?.coins) ? p.coins : 0), 0);
    if (typeof v.coins === "number") v.coins += earned * 2 + refund;
    delete v.purchases; delete v.equippedOutfitId;
    Object.assign(v, { skins: {}, equippedSkinId: STARTER_SKIN, itemPurchases: [], itemUses: [] });
  }
  const expected = legacyInitial();
  let stock: Record<string, number> = {};
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
    if (value.version >= 6) validatePractice(value.practice, expected);
    if (value.version >= 4) {
      if (!(value.careerId === null || careers.some(c => c.id === value.careerId))) throw new Error('ข้อมูลเส้นทางไม่รองรับ');
      expected.careerId = value.careerId;
    }
    stock = validateShop(value, expected);
    if (Object.keys(value.rewards).length !== count || value.totalXP !== expected.totalXP || value.coins !== expected.coins || expected.coins < 0) throw new Error("ยอดรางวัลไม่สอดคล้องกัน");
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
  if (value.version >= 5) {
    if (!value.bosses || !value.evidence || typeof value.bosses !== 'object' || typeof value.evidence !== 'object' || Array.isArray(value.bosses) || Array.isArray(value.evidence)) throw new Error('ข้อมูลบอสหรือภาพไม่รองรับ');
    for (const [id, r] of Object.entries(value.bosses)) {
      if (!ids.includes(id) || !['in_progress', 'completed'].includes(expected.quests[id])) throw new Error('ผลบอสไม่สอดคล้องกัน');
      expected.bosses[id] = validateBoss(id, r);
    }
    for (const [id, e] of Object.entries(value.evidence)) {
      if (!ids.includes(id) || !['in_progress', 'completed'].includes(expected.quests[id])) throw new Error('ภาพกิจกรรมไม่สอดคล้องกัน');
      expected.evidence[id] = validateEvidence(id, e);
    }
  }
  if (value.version >= 3) for (const u of value.itemUses) {
    if (!itemById(u?.itemId) || !ids.includes(u.questId) || !['in_progress', 'completed'].includes(expected.quests[u.questId]) || typeof u.battleId !== 'string' || !BATTLE_ID.test(u.battleId) || !Number.isSafeInteger(u.usedAt) || u.usedAt < 0) throw new Error('ข้อมูลการใช้ไอเทมไม่สอดคล้องกัน');
    stock[u.itemId] = (stock[u.itemId] ?? 0) - 1;
    if (stock[u.itemId] < 0) throw new Error('ใช้ไอเทมมากกว่าที่มี');
    expected.itemUses.push({ ...u });
  }
  return { ...expected, selectedGoalId: value.selectedGoalId, activeQuestId: value.activeQuestId };
}
function fromLegacy(old: LegacyProgress): UserProgress {
  const selected = old.selectedGoalId === journeyDefinition.id;
  const rewards = journeyDefinition.quests.filter(q => old.rewards[q.id]).map(q => ({ ...old.rewards[q.id], goalId: journeyDefinition.id, attempt: 1 }));
  const base = { ...initialProgress(), rewards, practice: old.practice, careerId: old.careerId, equippedSkinId: old.equippedSkinId, skins: old.skins, itemPurchases: old.itemPurchases, itemUses: old.itemUses, totalXP: old.totalXP, coins: old.coins };
  if (!selected) return base;
  return { ...base, goals: { [journeyDefinition.id]: { startedAt: rewards.length ? Math.min(...rewards.map(r => r.completedAt)) : 0, completedAt: old.goalCompletedAt, activeQuestId: old.activeQuestId } },
    quests: old.quests, focus: old.focus, bosses: old.bosses, evidence: old.evidence };
}
/** Maps grow when levels are appended to a path: new levels start locked (the first one opens if the old last level
 *  was passed) and a finished goal is open again. Mirrors supabase/migrations/*_eight_level_paths.sql. */
function growMaps(value: UserProgress) {
  for (const [goalId, state] of Object.entries(value.goals)) {
    const goal = findGoal(goalId); if (!goal || !state) continue;
    goal.quests.forEach((q, i) => {
      if (q.id in value.quests) return;
      value.quests[q.id] = i > 0 && value.quests[goal.quests[i - 1].id] === "completed" ? "available" : "locked";
      value.focus[q.id] ??= initialFocus(q.minutes * 60_000);
      state.completedAt = null;
    });
  }
}
function parseV8(value: UserProgress): UserProgress {
  let expected = initialProgress();
  const record = (v: unknown) => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!record(value.goals) || !record(value.quests) || !record(value.focus) || !record(value.bosses) || !record(value.evidence) || !Array.isArray(value.rewards)) throw new Error("ข้อมูลที่บันทึกไม่รองรับ");
  const attempts = new Map<string, number>();
  for (const r of value.rewards) {
    const quest = findQuest(r?.questId), goal = goalOfQuest(r?.questId), attempt = (attempts.get(r?.questId) ?? 0) + 1;
    if (!quest || !goal || r.goalId !== goal.id || r.attempt !== attempt || !Number.isSafeInteger(r.completedAt) || r.completedAt < 0 || r.xp !== quest.xp || r.coins !== (attempt === 1 ? quest.coins : 0) || r.totalXPBefore !== expected.totalXP) throw new Error("ข้อมูลรางวัลไม่สอดคล้องกัน");
    attempts.set(quest.id, attempt); expected.rewards.push({ ...r }); expected.totalXP += r.xp; expected.coins += r.coins;
  }
  validatePractice(value.practice, expected);
  growMaps(value);
  if (!(value.careerId === null || careers.some(c => c.id === value.careerId))) throw new Error('ข้อมูลเส้นทางไม่รองรับ');
  expected.careerId = value.careerId;
  const stock = validateShop(value, expected);
  if (value.totalXP !== expected.totalXP || value.coins !== expected.coins || expected.coins < 0) throw new Error("ยอดรางวัลไม่สอดคล้องกัน");
  const owned: string[] = [];
  for (const [goalId, state] of Object.entries(value.goals)) {
    const goal = findGoal(goalId);
    if (!goal || !state || !Number.isSafeInteger(state.startedAt) || state.startedAt < 0 || !(state.activeQuestId === null || goal.quests.some(q => q.id === state.activeQuestId))) throw new Error("สถานะเป้าหมายไม่สอดคล้องกัน");
    const ids = goal.quests.map(q => q.id); owned.push(...ids);
    let count = 0;
    while (count < ids.length && value.quests[ids[count]] === "completed") {
      if (!expected.rewards.some(r => r.questId === ids[count] && r.completedAt >= state.startedAt)) throw new Error("สถานะเควสต์ไม่สอดคล้องกัน");
      count++;
    }
    const statuses: Record<string, QuestStatus> = Object.fromEntries(ids.map((id, i) => [id, i < count ? "completed" : i === count ? "available" : "locked"]));
    if (state.activeQuestId) {
      if (state.activeQuestId !== ids[count]) throw new Error("สถานะเควสต์ไม่สอดคล้องกัน");
      statuses[state.activeQuestId] = "in_progress";
    }
    if (ids.some(id => value.quests[id] !== statuses[id])) throw new Error("สถานะเควสต์ไม่สอดคล้องกัน");
    const finishedAt = count === ids.length ? expected.rewards.filter(r => r.questId === ids[ids.length - 1]).at(-1)!.completedAt : null;
    if (state.completedAt !== finishedAt) throw new Error("สถานะเป้าหมายไม่สอดคล้องกัน");
    for (const quest of goal.quests) {
      const focus = validateFocus(value.focus[quest.id], quest.minutes * 60_000, quest.steps.map(s => s.id)); expected.focus[quest.id] = focus;
      if (statuses[quest.id] === "completed") {
        if (focus.checkedStepIds.length !== quest.steps.length || focus.round.status === "running") throw new Error("ข้อมูลเควสต์สำเร็จไม่สอดคล้องกัน");
      } else if (state.activeQuestId !== quest.id && (focus.checkedStepIds.length !== 0 || focus.totalMs !== 0 || focus.round.status !== "idle")) throw new Error("เควสต์ที่ยังไม่เริ่มมีข้อมูลโฟกัส");
    }
    Object.assign(expected.quests, statuses);
    expected.goals[goalId] = { startedAt: state.startedAt, completedAt: state.completedAt, activeQuestId: state.activeQuestId };
  }
  if (Object.keys(value.quests).length !== owned.length || Object.keys(value.focus).length !== owned.length) throw new Error("สถานะเควสต์ไม่สอดคล้องกัน");
  if (Object.values(expected.focus).filter(f => f.round.status === "running").length > 1) throw new Error("จับเวลาได้ทีละเควสต์");
  const started = (id: string) => ['in_progress', 'completed'].includes(expected.quests[id]);
  for (const [id, r] of Object.entries(value.bosses)) { if (!started(id)) throw new Error('ผลบอสไม่สอดคล้องกัน'); expected.bosses[id] = validateBoss(id, r); }
  // Reviews arrived after schema 8 too.
  if (value.reviews !== undefined && (!value.reviews || typeof value.reviews !== 'object' || Array.isArray(value.reviews))) throw new Error('ข้อมูลผลตรวจงานไม่รองรับ');
  for (const [id, r] of Object.entries(value.reviews ?? {})) { if (!started(id)) throw new Error('ผลตรวจงานไม่สอดคล้องกัน'); expected.reviews[id] = validateReview(r); }
  for (const [id, e] of Object.entries(value.evidence)) { if (!started(id)) throw new Error('ภาพกิจกรรมไม่สอดคล้องกัน'); expected.evidence[id] = validateEvidence(id, e); }
  // Potion uses stay after a goal is abandoned (the potion was spent), so they only need a known quest.
  for (const u of value.itemUses) {
    if (!itemById(u?.itemId) || !findQuest(u.questId) || typeof u.battleId !== 'string' || !BATTLE_ID.test(u.battleId) || !Number.isSafeInteger(u.usedAt) || u.usedAt < 0) throw new Error('ข้อมูลการใช้ไอเทมไม่สอดคล้องกัน');
    stock[u.itemId] = (stock[u.itemId] ?? 0) - 1;
    if (stock[u.itemId] < 0) throw new Error('ใช้ไอเทมมากกว่าที่มี');
    expected.itemUses.push({ ...u });
  }
  // Plans arrived after schema 8 was introduced; older v8 snapshots have none.
  if (value.plans !== undefined && !Array.isArray(value.plans)) throw new Error('ข้อมูลแผนไม่รองรับ');
  for (const item of value.plans ?? []) expected = addPlan(expected, item);
  // The journal arrived after schema 8 too.
  if (value.journal !== undefined && !Array.isArray(value.journal)) throw new Error('ข้อมูลบันทึกไม่รองรับ');
  for (const entry of value.journal ?? []) {
    const e = validateJournalEntry(entry);
    if (expected.journal.some(j => j.id === e.id || (e.kind === 'weekly' && j.kind === 'weekly' && j.week === e.week))) throw new Error('ข้อมูลบันทึกซ้ำ');
    expected.journal = [...expected.journal, e].sort(journalOrder);
  }
  return expected;
}
export function parseProgress(raw: string | null): UserProgress {
  if (raw === null) return initialProgress();
  const value = JSON.parse(raw);
  if (value?.version === 8) return parseV8(value);
  return fromLegacy(parseLegacy(value));
}

export function completeQuest(progress: UserProgress, questId: string, now: number): UserProgress {
  if (progress.quests[questId] === "completed") return progress;
  if (!canFocus(progress, questId)) throw new Error("เควสต์นี้ยังยืนยันสำเร็จไม่ได้");
  const goal = goalOfQuest(questId)!; const index = goal.quests.findIndex(q => q.id === questId); const quest = goal.quests[index]; const focus = progress.focus[questId];
  if (!quest.steps.every(s => focus.checkedStepIds.includes(s.id))) throw new Error("ทำขั้นตอนย่อยให้ครบก่อนยืนยัน");
  if (progress.bosses[questId]?.passedAt == null) throw new Error('ผ่านแบบทดสอบบอสก่อนยืนยัน');
  if (!Number.isSafeInteger(now) || now < 0 || !Number.isSafeInteger(quest.xp) || quest.xp < 0 || !Number.isSafeInteger(quest.coins) || quest.coins < 0) throw new Error("ค่ารางวัลหรือเวลาไม่ถูกต้อง");
  const settled = settleFocus(focus, now);
  // Close early without pretending the entire suggested duration was used.
  const closed = settled.round.status === "running" ? { ...settled, round: { ...settled.round, status: "paused" as const, startedAt: null } } : settled;
  const next = goal.quests[index + 1];
  const coins = questCoins(progress, questId);
  const reward: RewardRecord = { questId, goalId: goal.id, attempt: progress.rewards.filter(r => r.questId === questId).length + 1, completedAt: now, xp: quest.xp, coins, totalXPBefore: progress.rewards.reduce((sum, r) => sum + r.xp, 0) };
  return { ...progress, goals: { ...progress.goals, [goal.id]: { ...progress.goals[goal.id], activeQuestId: null, completedAt: next ? null : now } },
    quests: { ...progress.quests, [questId]: "completed", ...(next ? { [next.id]: "available" as const } : {}) }, focus: { ...progress.focus, [questId]: closed },
    rewards: [...progress.rewards, reward], totalXP: progress.totalXP + quest.xp, coins: progress.coins + coins };
}
export function practiceToday(progress: UserProgress, now: number) {
  const day = bangkokDay(now); return Object.values(progress.practice).filter(r => r.day === day);
}
// Consecutive Bangkok days with practice, ending today (or yesterday while today is still open).
export function practiceStreak(progress: UserProgress, now: number) {
  const days = new Set(Object.values(progress.practice).map(r => r.day));
  let cursor = new Date(`${bangkokDay(now)}T12:00:00+07:00`).getTime();
  if (!days.has(bangkokDay(cursor))) cursor -= 86_400_000;
  let streak = 0; while (days.has(bangkokDay(cursor))) { streak++; cursor -= 86_400_000; }
  return streak;
}
export function completePractice(progress: UserProgress, taskId: string, now: number): UserProgress {
  const career = careers.find(c => c.id === progress.careerId);
  if (!career) throw new Error('เลือกเส้นทางก่อนเริ่มฝึก');
  if (!career.tasks.some(t => t.id === taskId)) throw new Error('ไม่พบงานฝึกนี้ในเส้นทางที่เลือก');
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('เวลาไม่ถูกต้อง');
  const day = bangkokDay(now); const key = practiceKey(day, career.id, taskId);
  if (progress.practice[key]) return progress;
  if (practiceToday(progress, now).length >= PRACTICE_DAILY_LIMIT) throw new Error(`วันนี้ฝึกครบ ${PRACTICE_DAILY_LIMIT} งานแล้ว พรุ่งนี้มาต่อกัน`);
  return { ...progress, totalXP: progress.totalXP + PRACTICE_XP, coins: progress.coins + PRACTICE_COINS, practice: { ...progress.practice, [key]: { careerId: career.id, taskId, day, completedAt: now, xp: PRACTICE_XP, coins: PRACTICE_COINS } } };
}
export function selectCareer(progress: UserProgress, careerId: string): UserProgress {
  if (!careers.some(c => c.id === careerId)) throw new Error('ไม่พบเส้นทางนี้');
  return { ...progress, careerId };
}
/** Doubles drunk in this fight let fewer correct answers win: each lands on one hit for 2 damage. */
export function attemptBoss(progress: UserProgress, questId: string, answers: Record<string, number>, now: number, battleId = ''): UserProgress {
  if (!canFocus(progress, questId)) throw new Error('เริ่มเควสต์ก่อนต่อสู้บอส');
  const quest = findQuest(questId)!;
  if (!quest.steps.every(s => progress.focus[questId].checkedStepIds.includes(s.id))) throw new Error('ทำขั้นตอนย่อยให้ครบก่อนสู้บอส');
  if (!Number.isSafeInteger(now) || now < 0) throw new Error('เวลาไม่ถูกต้อง');
  const old = progress.bosses[questId]; if (old?.passedAt != null) return progress;
  const doubles = battleId ? progress.itemUses.filter(u => u.questId === questId && u.battleId === battleId && u.itemId === 'double').length : 0;
  const total = bosses[questId].questions.length, correct = gradeBoss(questId, answers, doubles > 0), answered = Object.keys(answers).length;
  const passed = correct === answered && correct + Math.min(doubles, correct) >= total;
  return { ...progress, bosses: { ...progress.bosses, [questId]: { score: passed ? total : Math.min(correct, total - 1), total, attempts: (old?.attempts ?? 0) + 1, passedAt: passed ? now : null } } };
}
export function inventory(progress: UserProgress): Record<ItemId, number> {
  const stock: Record<ItemId, number> = { hint: 0, heart: 0, reveal: 0, double: 0 };
  for (const p of progress.itemPurchases) stock[p.itemId] += p.qty;
  for (const u of progress.itemUses) stock[u.itemId] -= 1;
  return stock;
}
export function buySkin(progress: UserProgress, skinId: string, now: number): UserProgress {
  const skin = skinById(skinId); if (!skin || !Number.isSafeInteger(now) || now < 0) throw new Error('ไม่พบสกินนี้');
  const price = skinPrice(skin); if (price === 0 || progress.skins[skinId]) return progress;
  if (progress.coins < price) throw new Error('เหรียญไม่พอสำหรับสกินนี้');
  return { ...progress, coins: progress.coins - price, skins: { ...progress.skins, [skinId]: { skinId, coins: price, purchasedAt: now } } };
}
export function equipSkin(progress: UserProgress, skinId: string): UserProgress {
  const skin = skinById(skinId); if (!skin || (skinPrice(skin) > 0 && !progress.skins[skinId])) throw new Error('ซื้อสกินนี้ก่อนสวมใส่');
  return { ...progress, equippedSkinId: skinId };
}
export function buyItem(progress: UserProgress, itemId: string, qty: number, now: number, id: string): UserProgress {
  const item = itemById(itemId); if (!item || !Number.isInteger(qty) || qty < 1 || qty > MAX_ITEM_QTY || !Number.isSafeInteger(now) || now < 0 || !id) throw new Error('จำนวนหรือไอเทมไม่ถูกต้อง');
  const coins = item.price * qty; if (progress.coins < coins) throw new Error('เหรียญไม่พอสำหรับไอเทมนี้');
  return { ...progress, coins: progress.coins - coins, itemPurchases: [...progress.itemPurchases, { id, itemId: item.id, qty, coins, purchasedAt: now }] };
}
export function consumeItem(progress: UserProgress, itemId: string, questId: string, battleId: string, now: number): UserProgress {
  const item = itemById(itemId); if (!item) throw new Error('ไม่พบไอเทมนี้');
  if (!canFocus(progress, questId)) throw new Error('ใช้ไอเทมได้ระหว่างสู้บอสของเควสต์ที่กำลังทำ');
  if (!BATTLE_ID.test(battleId) || !Number.isSafeInteger(now) || now < 0) throw new Error('การต่อสู้ไม่ถูกต้อง');
  if (inventory(progress)[item.id] < 1) throw new Error('ไม่มีไอเทมนี้ในกระเป๋า');
  return { ...progress, itemUses: [...progress.itemUses, { itemId: item.id, questId, battleId, usedAt: now }] };
}
export function attachEvidence(progress: UserProgress, record: EvidenceRecord): UserProgress {
  if (!['in_progress', 'completed'].includes(progress.quests[record.questId])) throw new Error('เริ่มเควสต์ก่อนแนบภาพ');
  validateImageInfo(record.mime, record.size);
  return parseProgress(JSON.stringify({ ...progress, evidence: { ...progress.evidence, [record.questId]: record } }));
}
export function detachEvidence(progress: UserProgress, questId: string): UserProgress {
  const evidence = { ...progress.evidence }; delete evidence[questId]; return { ...progress, evidence };
}
export function updateChecklist(progress: UserProgress, questId: string, stepId: string, checked: boolean): UserProgress {
  if (!canFocus(progress, questId)) throw new Error("เควสต์นี้ยังแก้ขั้นตอนย่อยไม่ได้");
  const quest = findQuest(questId)!;
  if (!quest.steps.some(step => step.id === stepId)) throw new Error("ไม่พบขั้นตอนย่อย");
  const focus = progress.focus[questId];
  const checkedStepIds = quest.steps.map(step => step.id).filter(id => id === stepId ? checked : focus.checkedStepIds.includes(id));
  return { ...progress, focus: { ...progress.focus, [questId]: { ...focus, checkedStepIds } } };
}
/** Only one timer runs at a time: starting one pauses whichever other quest's round is running. */
function pauseOtherRounds(progress: UserProgress, questId: string, now: number): Record<string, QuestFocus> {
  return Object.fromEntries(Object.entries(progress.focus).map(([id, f]) => {
    if (id === questId || f.round.status !== "running") return [id, f];
    const settled = settleFocus(f, now);
    return [id, settled.round.status === "running" ? { ...settled, round: { ...settled.round, status: "paused" as const, startedAt: null } } : settled];
  }));
}
export function updateRound(progress: UserProgress, questId: string, action: "start" | "pause" | "resume" | "new" | "finish", now: number): UserProgress {
  if (action === "finish" && progress.quests[questId] === "completed") return progress;
  if (!canFocus(progress, questId)) throw new Error("เควสต์นี้ยังใช้ตัวจับเวลาไม่ได้");
  const focus = progress.focus[questId];
  const next = action === "finish" ? (focus.round.status === "running" && now >= focus.round.startedAt! + focus.round.durationMs - focus.round.elapsedMs ? settleFocus(focus, now) : focus) : changeRound(focus, action, now);
  const others = next.round.status === "running" && focus.round.status !== "running" ? pauseOtherRounds(progress, questId, now) : progress.focus;
  return { ...progress, focus: { ...others, [questId]: next } };
}
