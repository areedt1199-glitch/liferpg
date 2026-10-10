import { IntroPage } from '@/components/ui/intro-page';
import { licenseUrl, tracks } from '@/features/boss/music';
import { bosses } from '@/features/boss/catalog';

export default function CreditsPage() {
  const byLevel = Object.values(bosses).sort((a, b) => a.level - b.level);
  return <IntroPage eyebrow="CREDITS" title="เครดิตและที่มา" description="เพลง ภาพ และแหล่งอ้างอิงที่ใช้ในฉากต่อสู้บอส">
    <section className="growth-card credits">
      <h2>เพลงประกอบการต่อสู้</h2>
      <p className="muted">เพลงทั้งหมดมาจาก OpenGameArt.org ใช้ตามสัญญาอนุญาตของแต่ละเพลง ไฟล์ถูกแปลงเป็น MP3 112 kbps โดยไม่ตัดต่อเนื้อหา</p>
      <ol className="credit-list">{tracks.map(t => <li key={t.id}>
        <strong>ด่าน {t.level} · {byLevel[t.level - 1]?.name}</strong>
        <span>“{t.title}” โดย {t.author}</span>
        <span><a href={licenseUrl[t.license]} target="_blank" rel="noopener noreferrer">{t.license}</a> · <a href={t.page} target="_blank" rel="noopener noreferrer">หน้าต้นฉบับ</a></span>
      </li>)}</ol>
    </section>
    <section className="growth-card credits">
      <h2>ภาพบอสและฉาก</h2>
      <p>บอส ตัวละคร และฉากหลังแบบพิกเซลทั้งหมดวาดด้วยโค้ดของ liferpg เอง ไม่ได้ใช้ไฟล์ภาพจากที่อื่น</p>
    </section>
    <section className="growth-card credits">
      <h2>แหล่งอ้างอิงของคำถาม</h2>
      <p className="muted">ทุกคำถามมีลิงก์ “อ่านเพิ่ม” หลังตอบ ส่วนใหญ่มาจาก Python documentation, MDN Web Docs, Pro Git, Semantic Versioning, Creative Commons และ Nielsen Norman Group</p>
    </section>
  </IntroPage>;
}
