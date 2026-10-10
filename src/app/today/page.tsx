"use client";
import Link from "next/link";
import { IntroPage } from "@/components/ui/intro-page";
import { CharacterStats } from "@/features/character/character-stats";
import { CharacterAvatar } from "@/features/character/character-avatar";
import { journeyDefinition } from "@/features/journey/definitions";
import { statusLabels } from "@/features/journey/progress";
import { useProgress } from "@/features/journey/progress-store";
import { ProgressNotice } from "@/features/journey/progress-notice";
import { QuestAction } from "@/features/quests/quest-action";
import { FocusSummary } from "@/features/focus/focus-summary";

export default function TodayPage() {
  const { ready, progress, characterName, mode, userId } = useProgress();
  const currentQuest = journeyDefinition.quests.find(quest => quest.id === progress.activeQuestId) ?? journeyDefinition.quests.find(quest => progress.quests[quest.id] === "available") ?? journeyDefinition.quests[4];
  const completedCount = Object.values(progress.quests).filter(status => status === "completed").length;
  const selected = progress.selectedGoalId === journeyDefinition.id;
  if (ready && mode === "account" && !userId) return <IntroPage eyebrow="YOUR NEXT CHAPTER" title="วันนี้ เติบโตอีกนิด" description="เข้าสู่ระบบเพื่อดูเส้นทางและความก้าวหน้าของคุณ"><ProgressNotice /></IntroPage>;
  return <IntroPage eyebrow="YOUR NEXT CHAPTER" title="วันนี้ เติบโตอีกนิด" description="ยินดีต้อนรับสู่ liferpg ไม่ต้องรีบไปให้ไกล แค่ก้าวไปในจังหวะของคุณ">
    <ProgressNotice />
    {ready && selected && progress.goalCompletedAt === null && <FocusSummary quest={currentQuest} />}
    <section className="character-strip" aria-label="ตัวละครต้นแบบ"><CharacterAvatar small /><div className="character-identity"><h2>{characterName}</h2><CharacterStats /></div></section>
    {!ready ? <p role="status">กำลังโหลดสถานะเควสต์…</p> : !selected ? <section className="empty-state standalone"><h2>เลือกเส้นทางแรกของคุณ</h2><p>เริ่มจากเป้าหมาย “{journeyDefinition.title}”<br />ยังไม่มีเควสต์ที่กำลังทำหรือด่านที่ผ่านแล้ว</p><Link className="primary-link" href="/goals">เลือกเป้าหมาย →</Link></section> : progress.goalCompletedAt !== null ? <section className="empty-state standalone"><h2>คุณสร้างเกมแรกสำเร็จแล้ว</h2><p>จบเส้นทาง · ผ่านครบ 5/5 ด่าน<br />ทุกก้าวบันทึกไว้แล้ว พักและชื่นชมผลงานของคุณได้</p><Link className="primary-link" href={`/goals/${journeyDefinition.id}`}>ดูเส้นทางที่ผ่านแล้ว →</Link></section> : <>
      <section className="welcome-panel today-quest" aria-labelledby="today-quest-title"><div className="welcome-copy"><span className="section-label">เป้าหมาย · {journeyDefinition.title}</span><p className="current-kicker">{statusLabels[progress.quests[currentQuest.id]]} · ด่าน {journeyDefinition.quests.indexOf(currentQuest) + 1}</p><h2 id="today-quest-title">{currentQuest.title}</h2><p>{currentQuest.task}</p><div className="quest-meta"><span>◷ {currentQuest.minutes} นาทีแนะนำ</span><span>✦ {currentQuest.xp} XP · {currentQuest.coins} เหรียญ</span></div><div className="action-row"><QuestAction questId={currentQuest.id} /><Link className="text-link" href={`/goals/${journeyDefinition.id}`}>ดูแผนที่ ↗</Link><Link className="text-link" href={`/quests/${currentQuest.id}`}>รายละเอียดเควสต์</Link></div></div><div className="forest-scene" aria-hidden="true"><div className="scene-sun" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="trail" /><span className="tree tree-one" /><span className="tree tree-two" /><span className="tree tree-three" /><span className="trail-marker">✦</span></div></section>
      <div className="today-bottom"><section className="trail-progress"><div className="section-heading"><h2>เส้นทางของคุณ</h2><span>ผ่านแล้ว {completedCount}/{journeyDefinition.quests.length} ด่าน</span></div><div className="mini-trail" role="img" aria-label={journeyDefinition.quests.map((quest,index) => `ด่าน ${index + 1} ${statusLabels[progress.quests[quest.id]]}`).join(" · ")}>{journeyDefinition.quests.map((quest,index) => <span key={quest.id} className={`mini-stop status-${progress.quests[quest.id]}`} aria-hidden="true">{progress.quests[quest.id] === "completed" ? "✓" : index + 1}</span>)}</div><p className="muted">{currentQuest.place}</p></section><aside className="gentle-note"><p className="eyebrow">A LITTLE REMINDER</p><h2>ก้าวเล็ก ๆ ก็มีความหมาย</h2><p>ออกจากหน้าโฟกัสแล้วกลับมาทำต่อได้<br />ยืนยันสำเร็จเมื่อทำตามเงื่อนไขแล้ว ก้าวถัดไปจะพร้อมเมื่อคุณพร้อม</p></aside></div>
    </>}
  </IntroPage>;
}

