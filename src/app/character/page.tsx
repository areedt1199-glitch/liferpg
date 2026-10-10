import { CharacterStats, CharacterName } from "@/features/character/character-stats";
import { IntroPage } from "@/components/ui/intro-page";
import { CharacterAvatar } from '@/features/character/character-avatar';
import Link from 'next/link';
export default function CharacterPage() {
  return <IntroPage eyebrow="MEET YOUR ADVENTURER" title="ตัวละครของคุณ" description="เพื่อนร่วมทางที่จะเติบโตไปพร้อมกับคุณ"><section className="empty-state standalone"><CharacterAvatar/><CharacterName /><p>ค่าสถานะจากเควสต์ที่คุณยืนยันสำเร็จ</p><CharacterStats /><Link className="primary-link" href="/shop">เลือกชุดในร้านค้า →</Link><span className="quiet-label">ทุกเควสต์ที่สำเร็จคือก้าวหนึ่งของการเติบโต</span></section></IntroPage>;
}
