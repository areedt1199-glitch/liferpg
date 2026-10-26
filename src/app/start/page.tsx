import Link from 'next/link';
import type { Metadata } from 'next';
import { Icon } from '@/components/ui/icon';
import { PathFinderQuiz } from '@/features/onboarding/path-finder-quiz';
export const metadata: Metadata = { title: 'หาเส้นทางที่ใช่ · liferpg', description: 'ตอบ 4 คำถาม แล้ว liferpg จะเลือกเส้นทางสายเทคที่เหมาะกับคุณ' };
export default function StartPage() {
  return <div className="finder-page">
    <header className="landing-bar"><Link className="landing-logo" href="/"><Icon name="leaf" />liferpg<span>.</span></Link><Link className="text-link" href="/login">เข้าสู่ระบบ</Link></header>
    <div className="finder-wrap"><p className="eyebrow">PATH FINDER · 1 นาที</p><h1>หาเส้นทางที่ใช่</h1><p className="finder-sub">ตอบ 4 คำถาม เราจะเลือก 3 เส้นทางจาก 43 เส้นทางที่เหมาะกับคุณ</p><PathFinderQuiz /></div>
  </div>;
}
