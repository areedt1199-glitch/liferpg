"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Quest } from "@/features/quests/types";
import { journeyDefinition } from "@/features/journey/definitions";
import { levelStats } from "@/features/journey/progress";
import { confirmQuest, useProgress } from "@/features/journey/progress-store";
import {EvidencePanel} from '../evidence/evidence-panel';

export function CompletionConfirmation({ quest, onSaved }: { quest: Quest; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { progress, error } = useProgress();
  const [busy, setBusy] = useState(false);
  const eligible = progress.activeQuestId === quest.id && progress.quests[quest.id] === "in_progress" && quest.steps.every(step => progress.focus[quest.id].checkedStepIds.includes(step.id)) && progress.bosses[quest.id]?.passedAt!=null;
  useEffect(() => { if (!eligible) dialog.current?.close(); }, [eligible]);
  async function confirm() {
    if (busy) return;
    setBusy(true);
    try { if (await confirmQuest(quest.id)) { dialog.current?.close(); onSaved(); } } finally { setBusy(false); }
  }
  return <div className="completion-action"><button className="primary-link" disabled={!eligible || busy} onClick={() => dialog.current?.showModal()}>ทำเควสต์สำเร็จ</button><p className="muted">เช็กครบและผ่านบอสแล้ว ยืนยันด้วยตนเองเมื่อทำตามเงื่อนไขสำเร็จ ไม่ต้องรอเวลาครบ</p>
    <dialog ref={dialog} className="completion-dialog" aria-labelledby="confirm-title" onCancel={event => { if (busy) event.preventDefault(); }}>
      <p className="eyebrow">ก้าวนี้ทำสำเร็จแล้วหรือยัง</p><h2 id="confirm-title">ยืนยันสำเร็จ · {quest.title}</h2><p>{quest.success}</p><p className="muted">ความสำเร็จนี้เป็นการยืนยันด้วยตนเอง หากเวลายังเดินจะหยุดและเก็บเวลาถึงจุดยืนยัน</p><p>รางวัล {quest.xp} XP · {quest.coins} เหรียญ</p>{error && <p role="alert" className="storage-error">{error} ลองยืนยันอีกครั้งได้</p>}<div className="action-row"><button className="text-link" disabled={busy} autoFocus onClick={() => dialog.current?.close()}>กลับไปทำต่อ</button><button className="primary-link" disabled={busy || !eligible} onClick={() => void confirm()}>{busy ? "กำลังบันทึก…" : "ยืนยันและรับรางวัล"}</button></div>
    </dialog>
  </div>;
}
export function CompletionResult({ quest, fresh }: { quest: Quest; fresh: boolean }) {
  const { progress } = useProgress();
  const record = progress.rewards[quest.id];
  const next = journeyDefinition.quests[journeyDefinition.quests.findIndex(q => q.id === quest.id) + 1];
  // Level-up is shown only right after completion, when totalXP already includes this reward (and any daily practice).
  const before = levelStats(progress.totalXP - record.xp).level;
  const after = levelStats(progress.totalXP).level;
  return <section className="completion-result" aria-labelledby="result-title"><span className="reward-symbol" aria-hidden="true">✦</span><p className="eyebrow">{fresh ? "อีกก้าวที่คุณทำสำเร็จ" : "บันทึกเควสต์ที่ผ่านแล้ว"}</p><h1 id="result-title">{quest.title} สำเร็จแล้ว</h1><p>{quest.success}</p><div className="reward-values"><strong>+{record.xp} XP</strong><strong>+{record.coins} เหรียญ</strong></div><p className="muted">{fresh ? "บันทึกรางวัลแล้ว" : "ได้รับรางวัลนี้แล้ว รับซ้ำไม่ได้"} · ยืนยันด้วยตนเอง</p>{fresh && after > before && <p className="level-up" role="status">เลเวลอัป! {before} → {after}</p>}
    {next ? <><p>ก้าวถัดไป · {next.title}<br /><span className="muted">เปิดอ่านก่อน เริ่มเมื่อคุณพร้อม</span></p><div className="action-row"><Link className="primary-link" href={`/quests/${next.id}`}>ดูเควสต์ถัดไป →</Link><Link className="text-link" href="/today">พักก่อน</Link></div></> : <><h2>จบเส้นทาง “{journeyDefinition.title}” แล้ว</h2><p>ผ่านครบ 5/5 ด่าน · รวม {progress.totalXP} XP และ {progress.coins} เหรียญ</p><Link className="primary-link" href="/today">กลับหน้าวันนี้ →</Link></>}
    <EvidencePanel questId={quest.id}/><Link className="text-link" href={`/goals/${journeyDefinition.id}`}>ดูแผนที่การเดินทาง</Link>
  </section>;
}
