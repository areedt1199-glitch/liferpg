"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { goalDefinitions, type GoalDefinition } from "./definitions";
import { currentQuest, goalProgress, latestReward, statusLabels } from "./progress";
import { chooseGoal, dropGoal, reloadProgress, useProgress } from "./progress-store";
import { ProgressNotice } from "./progress-notice";
import { imageOperation } from "../evidence/image-store";
import { trackFilters, trackLabels } from "../careers/tracks";

const tracks = trackFilters;
const trackLabel: Record<string, string> = trackLabels;

/** My goals (with progress and cancel) plus the catalog of goals that can still be added. */
export function GoalBoard() {
  const router = useRouter();
  const { ready, progress, mode, userId, error } = useProgress();
  const [track, setTrack] = useState("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  if (!ready || (mode === "account" && !userId)) return <ProgressNotice />;
  const mine = goalDefinitions.filter(g => progress.goals[g.id]);
  const open = goalDefinitions.filter(g => !progress.goals[g.id] && (track === "all" || g.track === track));

  async function add(goal: GoalDefinition) {
    setBusy(goal.id); setMessage("");
    try { if (await chooseGoal(goal.id)) router.push(`/goals/${goal.id}`); } finally { setBusy(null); }
  }
  async function abandon(goal: GoalDefinition) {
    const { completed, total } = goalProgress(progress, goal);
    const repeat = goal.quests.some(q => latestReward(progress, q.id));
    if (!window.confirm(`ยกเลิกเป้าหมาย “${goal.title}”?\n\nความคืบหน้า ${completed}/${total} ด่าน ผลบอส เวลาโฟกัส และภาพกิจกรรมของเป้าหมายนี้จะถูกล้าง\nXP และเหรียญที่ได้รับแล้วยังอยู่ครบ\n\nถ้าเพิ่มกลับมา ต้องเริ่มจากด่าน 1${repeat ? " และด่านที่เคยผ่านจะได้ XP แต่ไม่ได้เหรียญซ้ำ" : ""}`)) return;
    setBusy(goal.id); setMessage("");
    try {
      // Photos are removed first so no private file outlives its quest record.
      for (const quest of goal.quests) {
        const photo = progress.evidence[quest.id]; if (!photo) continue;
        if (mode === "demo") await imageOperation("delete", photo.id);
        else {
          const response = await fetch("/api/evidence", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ questId: quest.id, ownerId: userId }), signal: AbortSignal.timeout(25_000) });
          if (!response.ok) { await reloadProgress(); setMessage("ลบภาพกิจกรรมไม่สำเร็จ ยังไม่ได้ยกเลิกเป้าหมาย ลองใหม่อีกครั้ง"); return; }
        }
      }
      if (await dropGoal(goal.id)) setMessage(`ยกเลิกเป้าหมาย “${goal.title}” แล้ว XP และเหรียญที่ได้ยังอยู่`);
    } catch { setMessage("ยกเลิกเป้าหมายไม่สำเร็จ ลองใหม่อีกครั้ง"); } finally { setBusy(null); }
  }

  return <>
    <ProgressNotice />
    {message && <p className="goal-message" role="status">{message}</p>}
    {error && <p className="storage-error" role="alert">{error}</p>}
    <section aria-labelledby="my-goals"><div className="section-heading"><h2 id="my-goals">เป้าหมายของฉัน</h2><span>{mine.length} เป้าหมาย · ทำพร้อมกันได้หลายเป้าหมาย</span></div>
      {mine.length === 0 ? <div className="empty-state"><p>ยังไม่มีเป้าหมาย เลือกเพิ่มจากรายการด้านล่างได้เลย</p></div> :
        <div className="goal-list">{mine.map(goal => {
          const { completed, total } = goalProgress(progress, goal), state = progress.goals[goal.id], next = currentQuest(progress, goal);
          return <article key={goal.id} className={`goal-card track-${goal.track}`}>
            <span className="empty-icon"><Icon name={state.completedAt !== null ? "check" : "compass"} /></span>
            <div><p className="eyebrow">{trackLabel[goal.track]} · {total} ด่าน</p><h2>{goal.title}</h2><p className="muted">{goal.description}</p>
              <div className="goal-progress"><progress value={completed} max={total} aria-label={`ด่านที่ผ่านแล้วของ ${goal.title}`} /><span>ผ่านแล้ว {completed}/{total} ด่าน</span></div>
              <p className="muted">{state.completedAt !== null ? "จบเป้าหมายแล้ว ✓" : `ด่านถัดไป · ${next.title} (${statusLabels[progress.quests[next.id]]})`}</p>
              <div className="action-row"><Link className="primary-link" href={`/goals/${goal.id}`}>เปิดแผนที่ผจญภัย →</Link><button type="button" className="text-link danger-link" disabled={busy !== null} onClick={() => void abandon(goal)}>{busy === goal.id ? "กำลังยกเลิก…" : "ยกเลิกเป้าหมาย"}</button></div>
            </div>
          </article>;
        })}</div>}
    </section>
    <section className="goal-catalog" aria-labelledby="add-goal"><div className="section-heading"><h2 id="add-goal">เพิ่มเป้าหมาย</h2><span>{open.length} เป้าหมายที่เพิ่มได้</span></div>
      <div className="growth-filters track-filters" role="group" aria-label="สายเทคโนโลยี">{tracks.map(([id, label]) => <button key={id} aria-pressed={track === id} onClick={() => setTrack(id)}>{label}</button>)}</div>
      <div className="career-grid">{open.map(goal => <div key={goal.id} className={`career-card track-${goal.track}`}>
        <span className="career-card-top"><span className="track-pill">{trackLabel[goal.track]}</span><span className="career-en">{goal.quests.length} ด่าน</span></span>
        <h2>{goal.title}</h2><p>{goal.description}</p>
        <div className="action-row goal-add-row"><button type="button" className="primary-link" disabled={busy !== null} onClick={() => void add(goal)}>{busy === goal.id ? "กำลังเพิ่ม…" : "เพิ่มเป้าหมาย"}</button><Link className="text-link" href={`/goals/${goal.id}`}>ดูแผนที่</Link></div>
      </div>)}</div>
    </section>
  </>;
}
