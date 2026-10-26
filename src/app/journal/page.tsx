import { IntroPage } from "@/components/ui/intro-page";
import { JournalBoard } from "@/features/journal/journal-board";
import { geminiReady } from "@/lib/gemini";

export default async function JournalPage({ searchParams }: { searchParams: Promise<{ quest?: string }> }) {
  const { quest } = await searchParams;
  return <IntroPage eyebrow="ADVENTURER'S JOURNAL" title="บันทึกการเดินทาง" description="ทบทวนสิ่งที่ได้เรียนรู้ ตั้งเป้าหมายรายสัปดาห์ แล้วรายงานความก้าวหน้าต่อกิลด์">
    <JournalBoard initialQuestId={typeof quest === "string" ? quest : ""} aiReady={geminiReady()} />
  </IntroPage>;
}
