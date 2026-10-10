"use client";
import Link from "next/link";
import type { Quest } from "./types";
import { journeyDefinition } from "@/features/journey/definitions";
import { statusLabels } from "@/features/journey/progress";
import { useProgress } from "@/features/journey/progress-store";
import { ProgressNotice } from "@/features/journey/progress-notice";
import { QuestAction } from "./quest-action";
import { Icon } from "@/components/ui/icon";
import { FocusSummary } from "@/features/focus/focus-summary";
import {EvidencePanel} from '../evidence/evidence-panel';
import {bosses} from '../boss/catalog';

export function QuestDetails({ quest, compact = false }: { quest: Quest; compact?: boolean }) {
  const { ready, progress, mode, userId } = useProgress();
  if (!ready) return <p role="status">กำลังโหลดสถานะเควสต์…</p>;
  if (mode === "account" && !userId) return <ProgressNotice />;
  const status = progress.quests[quest.id];
  return <section className={`quest-details ${compact ? "compact" : ""}`} aria-label={`รายละเอียด ${quest.title}`}>
    <span className={`status-tag status-${status}`}><Icon name={status === "locked" ? "lock" : status === "completed" ? "check" : "leaf"} />{statusLabels[status]}</span>
    <h2>{quest.title}</h2><p className="muted">{quest.task}</p>
    <FocusSummary quest={quest} />
    <div className="quest-meta"><span>◷ {quest.minutes} นาทีแนะนำ</span><span>✦ {quest.xp} XP · {quest.coins} เหรียญ <small>{status === "completed" ? "(ได้รับแล้ว)" : "(เมื่อยืนยันสำเร็จ)"}</small></span></div>
    {!compact && <><h3>ทำทีละขั้น</h3><ol className="steps">{quest.steps.map(step => <li key={step.id}>{step.text}</li>)}</ol></>}
    <div className="success-box"><Icon name="check" /><div><h3>เงื่อนไขสำเร็จ</h3><p>{quest.success}</p></div></div>
    <QuestAction questId={quest.id} compact={compact} />
    {!compact&&<p className="muted">บอสประจำด่าน · {bosses[quest.id].name} {progress.bosses[quest.id]?.passedAt!=null?'✓ ชนะแล้ว':status==='completed'?'· ผ่านเควสต์ก่อนเพิ่มระบบบอส':`· ต่อสู้แบบตอบคำถาม ${bosses[quest.id].questions.length} ข้อในหน้าโฟกัส`}</p>}
    {!compact&&<EvidencePanel questId={quest.id}/>}
    {!compact && <Link className="text-link" href={`/goals/${journeyDefinition.id}`}>← กลับแผนที่</Link>}
  </section>;
}



