import Link from "next/link";
import { notFound } from "next/navigation";
import { IntroPage } from "@/components/ui/intro-page";
import { journeyDefinition } from "@/features/journey/definitions";
import { MapSummary } from "@/features/journey/map-summary";
import { JourneyMap } from "@/features/journey/journey-map";
export default async function GoalPage({ params }: { params: Promise<{ goalId: string }> }) {
  const { goalId } = await params;
  if (goalId !== journeyDefinition.id) notFound();
  return <><Link className="back-link" href="/goals">← กลับเป้าหมาย</Link><IntroPage eyebrow="THE LEARNING TRAIL" title={journeyDefinition.title} description={journeyDefinition.description}><MapSummary /><JourneyMap /></IntroPage></>;
}

