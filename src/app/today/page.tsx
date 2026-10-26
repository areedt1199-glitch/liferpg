"use client";
import Link from "next/link";
import { IntroPage } from "@/components/ui/intro-page";
import { goalDefinitions } from "@/features/journey/definitions";
import { currentQuest, goalProgress, questCoins, statusLabels } from "@/features/journey/progress";
import { useProgress } from "@/features/journey/progress-store";
import { ProgressNotice } from "@/features/journey/progress-notice";
import { QuestAction } from "@/features/quests/quest-action";
import { FocusSummary } from "@/features/focus/focus-summary";
import { DailyPractice } from "@/features/practice/daily-practice";
import { TodayPlan } from "@/features/plan/today-plan";
import { BossAvatar } from "@/features/boss/boss-avatar";
import { Icon } from "@/components/ui/icon";

export default function TodayPage() {
  const { ready, progress, characterName, mode, userId } = useProgress();
  const mine = goalDefinitions.filter(g => progress.goals[g.id]);
  // Lead with a goal that has a quest in progress, else the first unfinished goal.
  const goal = mine.find(g => progress.goals[g.id].activeQuestId) ?? mine.find(g => progress.goals[g.id].completedAt === null) ?? mine[0];
  const quest = goal && currentQuest(progress, goal);
  const finished = goal && progress.goals[goal.id].completedAt !== null;
  if (ready && mode === "account" && !userId) return <IntroPage eyebrow="YOUR NEXT CHAPTER" title="วันนี้ เติบโตอีกนิด" description="เข้าสู่ระบบเพื่อดูเส้นทางและความก้าวหน้าของคุณ"><ProgressNotice /></IntroPage>;
  return <IntroPage eyebrow="TODAY'S QUEST" title={ready ? `สวัสดี ${characterName}` : "วันนี้ เติบโตอีกนิด"} description="ไม่ต้องรีบไปให้ไกล แค่ก้าวไปในจังหวะของคุณ">
    <ProgressNotice />
    <div className="today-grid"><div className="today-main">
    {ready && goal && !finished && <FocusSummary quest={quest} />}
    {!ready ? <p role="status">กำลังโหลดสถานะเควสต์…</p> : !goal ? <section className="empty-state standalone"><h2>เพิ่มเป้าหมายแรกของคุณ</h2><p>เลือกได้ทั้ง “สร้างเกมแรก” และทุกสายในคลังความรู้<br />เพิ่มได้หลายเป้าหมาย แต่ละเป้าหมายมีแผนที่ของตัวเอง</p><Link className="primary-link" href="/goals">เลือกเป้าหมาย →</Link></section> : finished ? <section className="empty-state standalone"><h2>คุณผ่านเป้าหมาย “{goal.title}” แล้ว</h2><p>ผ่านครบ {goal.quests.length}/{goal.quests.length} ด่าน<br />ทุกก้าวบันทึกไว้แล้ว เพิ่มเป้าหมายใหม่เพื่อเดินทางต่อได้</p><Link className="primary-link" href="/goals">เพิ่มเป้าหมายใหม่ →</Link></section> : <>
      <section className="welcome-panel today-quest" aria-labelledby="today-quest-title"><div className="welcome-copy"><span className="section-label">เป้าหมาย · {goal.title}</span><p className="current-kicker">{statusLabels[progress.quests[quest.id]]} · ด่าน {goal.quests.indexOf(quest) + 1}</p><h2 id="today-quest-title">{quest.title}</h2><p>{quest.task}</p><div className="quest-meta" aria-label="รางวัลเควสต์"><span className="reward-chip">◷ {quest.minutes} นาที</span><span className="reward-chip xp">+{quest.xp} XP</span><span className="reward-chip reward-coin"><Icon name="coin" />{questCoins(progress, quest.id)}</span></div><div className="action-row"><QuestAction questId={quest.id} /><Link className="text-link" href={`/goals/${goal.id}`}>ดูแผนที่ ↗</Link><Link className="text-link" href={`/quests/${quest.id}`}>รายละเอียดเควสต์</Link></div></div><div className="forest-scene" aria-hidden="true"><div className="scene-sun" /><div className="hill hill-back" /><div className="hill hill-front" /><div className="trail" /><span className="tree tree-one" /><span className="tree tree-two" /><span className="tree tree-three" /><span className="trail-marker">✦</span><div className="quest-boss"><BossAvatar questId={quest.id} small /><span>บอสประจำด่าน</span></div></div></section>
    </>}
    {ready && mine.length > 0 && <div className="today-bottom"><section className="trail-progress"><div className="section-heading"><h2>เป้าหมายของคุณ</h2><span>{mine.length} เป้าหมาย · <Link className="text-link" href="/goals">จัดการ</Link></span></div>
      <ul className="today-goals">{mine.map(g => {
        const { completed, total } = goalProgress(progress, g), next = currentQuest(progress, g), done = progress.goals[g.id].completedAt !== null;
        return <li key={g.id}><div className="today-goal-head"><Link href={`/goals/${g.id}`}><strong>{g.title}</strong></Link><span className="muted">{completed}/{total} ด่าน</span></div>
          <div className="mini-trail" role="img" aria-label={g.quests.map((q, i) => `ด่าน ${i + 1} ${statusLabels[progress.quests[q.id]]}`).join(" · ")}>{g.quests.map((q, i) => <span key={q.id} className={`mini-stop status-${progress.quests[q.id]}`} aria-hidden="true">{progress.quests[q.id] === "completed" ? "✓" : i + 1}</span>)}</div>
          <p className="muted">{done ? "จบเป้าหมายแล้ว ✓" : <>ถัดไป · <Link className="text-link" href={`/quests/${next.id}`}>{next.title}</Link> ({statusLabels[progress.quests[next.id]]})</>}</p></li>;
      })}</ul></section></div>}
    </div><aside className="today-side"><TodayPlan /><DailyPractice /><section className="gentle-note"><p className="eyebrow">A LITTLE REMINDER</p><h2>ก้าวเล็ก ๆ ก็มีความหมาย</h2><p>ออกจากหน้าโฟกัสแล้วกลับมาทำต่อได้ ยืนยันสำเร็จเมื่อทำตามเงื่อนไขแล้ว ก้าวถัดไปจะพร้อมเมื่อคุณพร้อม</p></section></aside></div>
  </IntroPage>;
}
