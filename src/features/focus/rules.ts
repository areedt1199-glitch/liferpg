export type RoundStatus = "idle" | "running" | "paused" | "finished";
export type QuestFocus = {
  checkedStepIds: string[];
  totalMs: number;
  round: { status: RoundStatus; durationMs: number; elapsedMs: number; startedAt: number | null };
};
export const roundLabels: Record<RoundStatus, string> = { idle: "ยังไม่เริ่มรอบ", running: "กำลังนับเวลา", paused: "พักอยู่", finished: "จบรอบแล้ว" };
export function initialFocus(durationMs: number): QuestFocus {
  return { checkedStepIds: [], totalMs: 0, round: { status: "idle", durationMs, elapsedMs: 0, startedAt: null } };
}
// The ledger includes only committed time. Live time is derived, never added by the display interval.
export function focusView(focus: QuestFocus, now: number) {
  const round = focus.round;
  const delta = round.status === "running" && round.startedAt !== null
    ? Math.min(round.durationMs - round.elapsedMs, Math.max(0, now - round.startedAt)) : 0;
  const elapsedMs = round.elapsedMs + delta;
  return { remainingMs: Math.max(0, round.durationMs - elapsedMs), totalMs: focus.totalMs + delta,
    elapsedMs, status: round.status === "running" && elapsedMs === round.durationMs ? "finished" as const : round.status };
}
export function settleFocus(focus: QuestFocus, now: number): QuestFocus {
  if (focus.round.status !== "running") return focus;
  const view = focusView(focus, now);
  return { ...focus, totalMs: view.totalMs, round: { ...focus.round, elapsedMs: view.elapsedMs,
    status: view.status, startedAt: view.status === "finished" ? null : Math.max(now, focus.round.startedAt!) } };
}
export function changeRound(focus: QuestFocus, action: "start" | "pause" | "resume" | "new", now: number): QuestFocus {
  const settled = settleFocus(focus, now);
  const status = settled.round.status;
  if ((action === "start" && status === "idle") || (action === "resume" && status === "paused"))
    return { ...settled, round: { ...settled.round, status: "running", startedAt: now } };
  if (action === "pause" && status === "running")
    return { ...settled, round: { ...settled.round, status: "paused", startedAt: null } };
  if (action === "new" && status === "finished")
    return { ...settled, round: { ...settled.round, status: "running", elapsedMs: 0, startedAt: now } };
  return settled;
}
export function validateFocus(value: unknown, durationMs: number, stepIds: readonly string[]): QuestFocus {
  if (!value || typeof value !== "object") throw new Error("ข้อมูลโฟกัสไม่รองรับ");
  const focus = value as QuestFocus;
  const round = focus.round;
  if (!round || !["idle", "running", "paused", "finished"].includes(round.status) || round.durationMs !== durationMs ||
    !Number.isSafeInteger(round.elapsedMs) || round.elapsedMs < 0 || round.elapsedMs > durationMs ||
    !Number.isSafeInteger(focus.totalMs) || focus.totalMs < round.elapsedMs ||
    !Array.isArray(focus.checkedStepIds) || new Set(focus.checkedStepIds).size !== focus.checkedStepIds.length ||
    focus.checkedStepIds.some(id => !stepIds.includes(id)) ||
    (round.status === "running" ? !Number.isSafeInteger(round.startedAt) || round.startedAt! < 0 || round.elapsedMs >= durationMs : round.startedAt !== null) ||
    (round.status === "finished" && round.elapsedMs !== durationMs) ||
    (round.status === "paused" && round.elapsedMs >= durationMs) ||
    (round.status === "idle" && (round.elapsedMs !== 0 || focus.totalMs !== 0))) throw new Error("ข้อมูลโฟกัสไม่สอดคล้องกัน");
  return { checkedStepIds: [...focus.checkedStepIds], totalMs: focus.totalMs, round: { ...round } };
}
export function formatTime(ms: number, roundUp = false): string {
  const seconds = roundUp ? Math.ceil(Math.max(0, ms) / 1000) : Math.floor(Math.max(0, ms) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
