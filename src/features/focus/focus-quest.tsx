"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Quest } from "@/features/quests/types";
import { canFocus } from "@/features/journey/progress";
import { controlRound, setStepChecked, useProgress } from "@/features/journey/progress-store";
import { ProgressNotice } from "@/features/journey/progress-notice";
import { useFocusView } from "./use-focus-view";
import { formatTime, roundLabels } from "./rules";
import { CompletionConfirmation, CompletionResult } from "./completion";
import { FocusScene } from "./focus-scene";
import {BossBattle} from '../boss/boss-battle';
import {EvidencePanel} from '../evidence/evidence-panel';

export function FocusQuest({ quest }: { quest: Quest }) {
  const router = useRouter();
  const { ready, progress, error, mode } = useProgress();
  const { focus, view } = useFocusView(quest.id);
  const [freshQuestId, setFreshQuestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const allowed = ready && canFocus(progress, quest.id);
  const mustStart = ready && !error && progress.quests[quest.id] === "available";
  useEffect(() => { if (mustStart) router.replace(`/quests/${quest.id}`); }, [mustStart, router, quest.id]);
  async function act(action: "start" | "pause" | "resume" | "new") {
    if (busy) return;
    setBusy(true);
    try { await controlRound(quest.id, action); } finally { setBusy(false); }
  }
  if (!ready || mustStart) return <p role="status">{mustStart ? "กลับไปเริ่มเควสต์ที่หน้ารายละเอียด…" : "กำลังตรวจสิทธิ์เข้าโฟกัส…"}</p>;
  if (progress.quests[quest.id] === "completed") return <CompletionResult quest={quest} fresh={freshQuestId === quest.id} />;
  if (!allowed) return <div className="focus-blocked"><Link className="back-link" href={`/quests/${quest.id}`}>← กลับรายละเอียดเควสต์</Link><ProgressNotice /><section className="empty-state standalone"><h1>โหมดโฟกัสยังไม่เปิดสำหรับด่านนี้</h1><p>เข้าได้เฉพาะเควสต์ที่กำลังทำ ด่านนี้ยังล็อกอยู่หรือสถานะไม่พร้อม</p></section></div>;
  return <>
    <header className="focus-header"><Link className="back-link" href={`/quests/${quest.id}`}>← กลับรายละเอียดเควสต์</Link><span className="sample-label">กำลังทำ · {mode === "demo" ? "demo ในเบราว์เซอร์" : "บัญชีจริง"}</span></header>
    {error && <p className="storage-error" role="alert">{error} สถานะที่บันทึกครั้งก่อนยังอยู่</p>}
    <div className="focus-intro"><p className="eyebrow">A MOMENT TO GROW</p><h1>{quest.title}</h1><p className="muted">พักเรื่องอื่นไว้ก่อน อยู่กับก้าวเล็ก ๆ ตรงนี้</p></div>
    <div className="focus-layout"><section className="focus-preview" aria-label="พื้นที่โฟกัส">
      <FocusScene progress={view.elapsedMs / focus.round.durationMs} />
      <div className="timer-preview"><span className="section-label">เวลาที่เหลือในรอบ · {roundLabels[view.status]}</span><p className="timer-digits" role="timer" aria-label="เวลาที่เหลือ" aria-live="off">{formatTime(view.remainingMs, true)}</p><p>โฟกัสสะสมของเควสต์ <strong>{formatTime(view.totalMs)}</strong></p>
        <div className="timer-actions">
          {view.status === "idle" && <button className="primary-link" disabled={busy} onClick={() => void act("start")}>เริ่มรอบโฟกัส</button>}
          {view.status === "running" && <button className="primary-link" disabled={busy} onClick={() => void act("pause")}>พักตัวจับเวลา</button>}
          {view.status === "paused" && <button className="primary-link" disabled={busy} onClick={() => void act("resume")}>ทำต่อรอบเดิม</button>}
          {view.status === "finished" && <button className="primary-link" disabled={busy} onClick={() => void act("new")}>เริ่มรอบใหม่</button>}
        </div>
        <p className="round-message" role="status">{view.status === "finished" ? "จบรอบแล้ว พักได้ หรือเริ่มรอบใหม่เมื่อพร้อม เควสต์ยังไม่ถือว่าผ่าน" : view.status === "paused" ? "พักอยู่ ช่วงนี้ไม่นับเวลาเพิ่ม" : "เมื่อเริ่มรอบ เวลายังเดินแม้สลับแท็บหรือออกจากหน้านี้ กดพักเพื่อหยุดนับ"}</p>
      </div>
    </section><section className="focus-task"><p className="eyebrow">งานตรงหน้า</p><h2>{quest.task}</h2><p className="checklist-count">ทำแล้ว {focus.checkedStepIds.length}/{quest.steps.length} ขั้นตอน</p>
      <ul className="focus-checklist">{quest.steps.map(step => <li key={step.id}><label><input type="checkbox" checked={focus.checkedStepIds.includes(step.id)} onChange={event => { void setStepChecked(quest.id, step.id, event.target.checked); }} /><span>{step.text}</span></label></li>)}</ul>
      <div className="success-box"><div><h3>เงื่อนไขสำเร็จ</h3><p>{quest.success}</p></div></div><p className="focus-note">เช็กครบหรือเวลาครบไม่ทำให้ผ่านเควสต์อัตโนมัติ<br />เวลานี้เป็นบันทึกการโฟกัสที่คุณรายงาน ไม่ใช่หลักฐานว่างานสำเร็จ</p>
      <BossBattle quest={quest}/><EvidencePanel questId={quest.id}/>
      <CompletionConfirmation quest={quest} onSaved={() => setFreshQuestId(quest.id)} />
    </section></div>
  </>;
}
