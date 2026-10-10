import { notFound } from "next/navigation";
import { findQuest } from "@/features/journey/definitions";
import { FocusQuest } from "@/features/focus/focus-quest";
export default async function FocusPage({ params }: { params: Promise<{ questId: string }> }) {
  const { questId } = await params;
  const quest = findQuest(questId);
  if (!quest) notFound();
  return <FocusQuest quest={quest} />;
}
