import Link from "next/link";
import { IntroPage } from "@/components/ui/intro-page";
import { knowledgePaths } from "@/features/knowledge";
import { trackLabels } from "@/features/careers/tracks";

const tracks = Object.entries(trackLabels);

export default function LearnPage() {
  const paths = knowledgePaths();
  return <IntroPage eyebrow="THE KNOWLEDGE LIBRARY" title="คลังความรู้" description={`สรุปความรู้และแบบทดสอบ 3 ระดับ (ง่าย → กลาง → ยาก) ครบทั้ง ${paths.length} เส้นทาง พร้อมแหล่งอ้างอิง`}>
    {tracks.map(([track, label]) => <section key={track} className="knowledge-track">
      <h2>{label}</h2>
      <div className="career-grid">{paths.filter(k => k.track === track).map(k => <Link key={k.pathId} href={`/learn/${k.pathId}`} className={`career-card track-${k.track}`}>
        <h2>{k.title}</h2><span className="career-en">{k.englishTitle}</span><p>{k.lessons.length} บทสรุป · {k.quiz.length} ข้อทดสอบ</p>
      </Link>)}</div>
    </section>)}
  </IntroPage>;
}
