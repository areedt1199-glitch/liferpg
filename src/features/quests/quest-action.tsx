"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { beginQuest, useProgress } from "@/features/journey/progress-store";
import { journeyDefinition } from "@/features/journey/definitions";

export function QuestAction({ questId, compact = false }: { questId: string; compact?: boolean }) {
  const router = useRouter();
  const [busy,setBusy]=useState(false);
  const { ready, progress, error } = useProgress();
  if (!ready) return <p className="access-note">กำลังโหลดสถานะเควสต์…</p>;
  const status = progress.quests[questId];
  if (status === "completed" && compact) return <Link className="text-link" href={`/quests/${questId}`}>ดูรายละเอียดที่ผ่านแล้ว →</Link>;
  if (status === "locked" || status === "completed") return <p className="access-note">{status === "locked" ? "ด่านนี้ยังล็อกอยู่" : "ด่านนี้ผ่านแล้ว"}</p>;
  if (compact) return <Link className="primary-link" href={`/quests/${questId}`}>เปิดรายละเอียดเควสต์ →</Link>;
  if (progress.selectedGoalId !== journeyDefinition.id) return <Link className="primary-link" href="/goals">เลือกเป้าหมายก่อนเริ่ม →</Link>;
  return <>{error && <p role="alert" className="access-note">{error}</p>}{status === "in_progress" ? <Link className="primary-link" href={`/quests/${questId}/focus`}>ทำต่อ →</Link> : <button className="primary-link" type="button" disabled={busy} onClick={async () => { if(busy)return;setBusy(true);try{if (await beginQuest(questId)) router.push(`/quests/${questId}/focus`);}finally{setBusy(false);} }}>{busy?'กำลังเริ่ม…':'เริ่มเควสต์ →'}</button>}</>;
}

