/* eslint-disable @next/next/no-img-element -- pixel-art sprites are small static files scaled by CSS */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Icon } from '@/components/ui/icon';
import { trackLabels, type Track } from '@/features/careers/tracks';
import { skinImage } from '@/features/shop/catalog';
import { loadPortfolio } from '@/features/social/portfolio';
import { ShareButton } from '@/features/social/share-button';

type Props = { params: Promise<{ handle: string }> };
const date = (ms: number) => new Date(ms).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Bangkok' });

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await loadPortfolio((await params).handle);
  if (!p) return { title: 'ไม่พบพอร์ตโฟลิโอ · liferpg' };
  const text = `Lv.${p.level} · ผ่าน ${p.quests.length} ด่าน · ชนะบอส ${p.bosses} ตัว บนเส้นทางสายเทคของ liferpg`;
  return { title: `${p.name} · liferpg`, description: text, openGraph: { title: `${p.name} · Lv.${p.level}`, description: text, type: 'profile' } };
}

export default async function PortfolioPage({ params }: Props) {
  const p = await loadPortfolio((await params).handle);
  if (!p) notFound();
  const path = `/u/${p.handle}`;
  return <div className="portfolio-page">
    <header className="landing-bar"><Link className="landing-logo" href="/"><Icon name="leaf" />liferpg<span>.</span></Link><Link className="primary-link portfolio-cta-small" href="/start">เริ่มผจญภัยของคุณ</Link></header>
    <main className="portfolio-wrap">
      <section className="portfolio-hero">
        <div className="character-portrait"><img src={skinImage(p.skinId)} alt="" /></div>
        <div>
          <p className="eyebrow">ADVENTURER PORTFOLIO</p>
          <h1>{p.name}</h1>
          <p className="muted">@{p.handle}</p>
          <p className="portfolio-level"><strong>Lv.{p.level}</strong> · {p.totalXP.toLocaleString('th-TH')} XP</p>
          <ShareButton path={path} title={`${p.name} · liferpg`} text={`ดูเส้นทางสายเทคของ ${p.name} ใน liferpg`} label="แชร์พอร์ตโฟลิโอ" className="primary-link" />
        </div>
      </section>
      <dl className="portfolio-stats">
        <div><dt>ด่านที่ผ่าน</dt><dd>{p.quests.length}</dd></div>
        <div><dt>บอสที่ชนะ</dt><dd>{p.bosses}</dd></div>
        <div><dt>งานที่ AI ตรวจผ่าน</dt><dd>{p.reviewed}</dd></div>
        <div><dt>วันที่ฝึก</dt><dd>{p.practiceDays}</dd></div>
      </dl>
      <section className="portfolio-section" aria-labelledby="pf-goals">
        <h2 id="pf-goals">เส้นทาง</h2>
        {p.goals.length === 0 ? <p className="muted">ยังไม่ได้เริ่มเส้นทาง</p> : <ul className="portfolio-goals">{p.goals.map(g => <li key={g.goalId}>
          <div><strong>{g.title}</strong><span className="muted">{trackLabels[g.track as Track] ?? ''}</span></div>
          <div className="portfolio-bar" role="img" aria-label={`ผ่าน ${g.done} จาก ${g.total} ด่าน`}><span style={{ width: `${Math.round(100 * g.done / g.total)}%` }} /></div>
          <p className="muted">{g.completedAt ? `✓ จบเส้นทาง ${date(g.completedAt)}` : `${g.done}/${g.total} ด่าน`}</p>
        </li>)}</ul>}
      </section>
      <section className="portfolio-section" aria-labelledby="pf-quests">
        <h2 id="pf-quests">ด่านที่ผ่าน</h2>
        {p.quests.length === 0 ? <p className="muted">ยังไม่มีด่านที่ผ่าน</p> : <ol className="portfolio-quests">{p.quests.map(q => <li key={q.questId}>
          <div><strong>{q.title}</strong><span className="muted">{q.goalTitle}</span></div>
          <div className="portfolio-quest-meta">{q.reviewed && <span className="reward-chip">✓ AI ตรวจผ่าน</span>}<time dateTime={new Date(q.completedAt).toISOString()}>{date(q.completedAt)}</time></div>
        </li>)}</ol>}
      </section>
      <section className="landing-final"><h2>อยากมีพอร์ตแบบนี้บ้าง?</h2><p>เลือกเส้นทางสายเทค ผ่านด่าน สู้บอส แล้วโชว์ผลงานได้แบบนี้</p><Link className="primary-link landing-main-cta" href="/start">หาเส้นทางที่ใช่ →</Link></section>
    </main>
  </div>;
}
