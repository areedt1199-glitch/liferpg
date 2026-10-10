"use client";
import { useRouter } from "next/navigation";
import { IntroPage } from "@/components/ui/intro-page";
import { Icon } from "@/components/ui/icon";
import { journeyDefinition } from "@/features/journey/definitions";
import { chooseGoal, useProgress } from "@/features/journey/progress-store";
import { ProgressNotice } from "@/features/journey/progress-notice";
export default function GoalsPage() {
  const router = useRouter();
  const { ready, progress, mode, userId } = useProgress();
  const count = Object.values(progress.quests).filter(status => status === "completed").length;
  return <IntroPage eyebrow="CHOOSE YOUR PATH" title="เป้าหมายของคุณ" description="เส้นทางการเรียนรู้ที่คุณค่อย ๆ เดินได้ ทีละเควสต์"><ProgressNotice /><section className="goal-card"><span className="empty-icon"><Icon name="compass" /></span><div><p className="eyebrow">เส้นทางการเรียนรู้ · {journeyDefinition.quests.length} ด่าน</p><h2>{journeyDefinition.title}</h2><p className="muted">{journeyDefinition.description}</p>{ready && (mode === "demo" || userId) && <><div className="goal-progress"><progress value={count} max={journeyDefinition.quests.length} aria-label="ด่านที่ผ่านแล้ว" /><span>ผ่านแล้ว {count}/{journeyDefinition.quests.length} ด่าน</span></div><p className="muted">{progress.goalCompletedAt !== null ? "จบเป้าหมายแล้ว ✓" : progress.selectedGoalId ? "เป้าหมายที่เลือก" : "ยังไม่ได้เลือกเป้าหมาย"}</p><button className="primary-link" type="button" onClick={async () => { if (await chooseGoal(journeyDefinition.id)) router.push(`/goals/${journeyDefinition.id}`); }}>{progress.selectedGoalId ? "เปิดแผนที่ผจญภัย" : "เลือกเป้าหมายและเปิดแผนที่"} →</button></>}</div></section></IntroPage>;
}

