import Link from "next/link";
import { notFound } from "next/navigation";
import { IntroPage } from "@/components/ui/intro-page";
import { findGoal, goalDefinitions } from "@/features/journey/definitions";
import { MapSummary } from "@/features/journey/map-summary";
import { JourneyMap } from "@/features/journey/journey-map";
export function generateStaticParams() { return goalDefinitions.map(g => ({ goalId: g.id })); }
export default async function GoalPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  const goal = findGoal(goalId);
  if (!goal) notFound();
  return <><Link className="back-link" href="/goals">← กลับเป้าหมาย</Link><IntroPage eyebrow="THE LEARNING TRAIL" title={goal.title} description={goal.description}><MapSummary goalId={goal.id} /><JourneyMap goalId={goal.id} /></IntroPage></>;
}
