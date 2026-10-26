import Link from "next/link";
import { notFound } from "next/navigation";
import { IntroPage } from "@/components/ui/intro-page";
import { getKnowledge, knowledgePaths } from "@/features/knowledge";
import { KnowledgeQuiz } from "@/features/knowledge/knowledge-quiz";

export function generateStaticParams() { return knowledgePaths().map(k => ({ pathId: k.pathId })); }

export default async function LearnPathPage({ params }: { params: Promise<{ pathId: string }> }) {
  const { pathId } = await params;
  const k = getKnowledge(pathId);
  if (!k) notFound();
  return <><Link className="back-link" href="/learn">← กลับคลังความรู้</Link>
    <IntroPage eyebrow={`KNOWLEDGE · ${k.englishTitle.toUpperCase()}`} title={k.title} description={k.intro}>
      <div className="knowledge-layout">
        <section className={`growth-card knowledge-lessons track-${k.track}`} aria-labelledby="lessons-title">
          <h2 id="lessons-title">สรุปความรู้ทีละขั้น</h2>
          <ol className="career-tasks">{k.lessons.map(l => <li key={l.taskId}><strong>{l.title}</strong><p>{l.description}</p><ul className="lesson-points">{l.points.map(p => <li key={p}>{p}</li>)}</ul></li>)}</ol>
          <h3>แหล่งอ้างอิง</h3>
          <ul className="lesson-sources">{k.sources.map(s => <li key={s.url}><a className="text-link" href={s.url} target="_blank" rel="noreferrer">{s.title} ↗</a></li>)}</ul>
          <Link className="text-link" href={`/goals/${k.pathId}`}>เปิดแผนที่ผจญภัยของสายนี้ (เพิ่มเป็นเป้าหมายได้) →</Link>
          <Link className="text-link" href={`/chat?path=${k.pathId}`}>ถามผู้ช่วยเกี่ยวกับเส้นทางนี้ →</Link>
        </section>
        <KnowledgeQuiz pathId={k.pathId} quiz={k.quiz} />
      </div>
    </IntroPage></>;
}
