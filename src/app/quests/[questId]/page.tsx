import Link from "next/link";
import { notFound } from "next/navigation";
import { findQuest, goalOfQuest } from "@/features/journey/definitions";
import { IntroPage } from "@/components/ui/intro-page";
import { QuestDetails } from "@/features/quests/quest-details";
import { ProgressNotice } from "@/features/journey/progress-notice";
export default async function QuestPage({ params }: { params: Promise<{ questId: string }> }) {
  const { questId } = await params;
  const quest = findQuest(questId);
  const goal = goalOfQuest(questId);
  if (!quest || !goal) notFound();
  return <><Link className="back-link" href={`/goals/${goal.id}`}>← กลับแผนที่</Link><IntroPage eyebrow="ONE SMALL QUEST" title="ก้าวนี้ของคุณ" description={`เป้าหมาย: ${goal.title}`}><ProgressNotice /><QuestDetails quest={quest} /><Link className="text-link" href="/today">กลับวันนี้</Link></IntroPage></>;
}

