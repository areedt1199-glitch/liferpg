"use client";
import Link from "next/link";
import { useState } from "react";
import { goalOfQuest } from "../journey/definitions";
import { planMinutesOf, practiceKey, type PlanItem, type UserProgress } from "../journey/progress";
import { markSlotDone, progressNow, unplanSlot, useProgress } from "../journey/progress-store";
import { bangkokDay } from "../analytics/rules";
import { bangkokTime, kindLabels, planEnd, planTitle } from "./calendar";

/** Where a slot leads: start/continue its quest, go practise, or nothing for a free-text activity. */
function SlotAction({ item, progress }: { item: PlanItem; progress: UserProgress }) {
  if (item.kind === "quest") {
    const goal = goalOfQuest(item.ref), status = progress.quests[item.ref];
    if (!goal) return null;
    if (!progress.goals[goal.id]) return <Link className="text-link" href={`/goals/${goal.id}`}>เพิ่มเป้าหมายก่อน →</Link>;
    if (status === "completed") return <span className="status-tag status-completed">ด่านผ่านแล้ว ✓</span>;
    if (status === "in_progress") return <Link className="primary-link slot-go" href={`/quests/${item.ref}/focus`}>เข้าโหมดโฟกัส →</Link>;
    if (status === "available") return <Link className="primary-link slot-go" href={`/quests/${item.ref}`}>เริ่มด่านนี้ →</Link>;
    return <span className="status-tag">ด่านยังล็อก</span>;
  }
  if (item.kind === "practice") {
    const [careerId, taskId] = item.ref.split("|");
    if (progress.practice[practiceKey(item.day, careerId, taskId)]) return <span className="status-tag status-completed">ฝึกแล้ว ✓</span>;
    return item.day === bangkokDay(progressNow()) ? <Link className="primary-link slot-go" href="/today#practice-title">ไปบันทึกการฝึก →</Link> : null;
  }
  return null;
}

export function PlanSlots({ plans, empty }: { plans: PlanItem[]; empty: string }) {
  const { progress } = useProgress();
  const [busy, setBusy] = useState<string | null>(null);
  const now = progressNow(), today = bangkokDay(now), clock = planMinutesOf(bangkokTime(now));
  if (plans.length === 0) return <p className="muted">{empty}</p>;
  const run = async (id: string, work: () => Promise<boolean>) => { setBusy(id); try { await work(); } finally { setBusy(null); } };
  return <ol className="plan-slots">{plans.map(item => {
    const live = item.day === today && planMinutesOf(item.start) <= clock && clock < planMinutesOf(item.start) + item.minutes;
    return <li key={item.id} className={`plan-slot kind-${item.kind} ${item.done ? "done" : ""} ${live ? "live" : ""}`}>
      <div className="slot-time"><strong>{item.start}</strong><span>{planEnd(item)}</span></div>
      <div className="slot-body">
        <span className="slot-kind">{kindLabels[item.kind]} · {item.minutes} นาที{live && " · ตอนนี้"}</span>
        <p className="slot-title">{planTitle(item)}</p>
        {item.kind !== "note" && item.note && <p className="muted">{item.note}</p>}
        <div className="slot-actions">
          <SlotAction item={item} progress={progress} />
          <label className="slot-done"><input type="checkbox" checked={item.done} disabled={busy === item.id} onChange={e => void run(item.id, () => markSlotDone(item.id, e.target.checked))} />ทำตามแผนแล้ว</label>
          <button type="button" className="text-link danger-link" disabled={busy === item.id} onClick={() => { if (window.confirm(`ลบช่วง ${item.start}–${planEnd(item)} ออกจากแผน?`)) void run(item.id, () => unplanSlot(item.id)); }}>ลบ</button>
        </div>
      </div>
    </li>;
  })}</ol>;
}
