/* eslint-disable @next/next/no-img-element -- pixel-art sprites are small static files scaled by CSS */
import Link from 'next/link';
import { Icon } from '@/components/ui/icon';
import { enterDemo } from '@/features/account/actions';
import { knowledgePaths, PATH_LEVELS } from '@/features/knowledge';
import { trackLabels, type Track } from '@/features/careers/tracks';
import { skinImage, skins } from '@/features/shop/catalog';

// Level 1 to 8, in the order players meet them.
const BOSSES = ['mushroom', 'gnome', 'boneeye', 'drunk', 'rocker', 'wolf', 'wizard', 'ophanim'] as const;
const bossImage = (sprite: string) => `/images/bosses/${sprite}.png`;
const steps = [
  { icon: 'route', title: 'เลือกเส้นทาง', text: 'ตอบ 4 คำถาม เราเลือกเส้นทางที่ใช่ให้จาก AI, Dev และเกม' },
  { icon: 'map', title: 'เดินแผนที่ทีละด่าน', text: 'ด่านละ 20–40 นาที อ่านสรุป ลงมือทำจริง จับเวลาโฟกัส' },
  { icon: 'chat', title: 'อาจารย์ AI ตรวจงาน', text: 'ส่งโค้ด ข้อความ หรือรูป ได้คำติชมทันทีว่าผ่านหรือยัง' },
  { icon: 'sun', title: 'สู้บอส รับรางวัล', text: 'ตอบคำถามให้ถูกเพื่อล้มบอส ได้ XP เหรียญ และสกินใหม่' },
] as const;

export function Landing() {
  const paths = knowledgePaths();
  const byTrack = (['ai', 'dev', 'game'] as Track[]).map(t => ({ track: t, paths: paths.filter(p => p.track === t) }));
  return <div className="landing">
    <header className="landing-bar"><Link className="landing-logo" href="/"><Icon name="leaf" />liferpg<span>.</span></Link><Link className="text-link" href="/login">เข้าสู่ระบบ</Link></header>

    <section className="landing-hero">
      <div className="landing-copy">
        <p className="eyebrow">YOUR LIFE. YOUR QUEST.</p>
        <h1>เรียนสายเทค<br />แบบเล่นเกม RPG</h1>
        <p className="landing-lead">เลือกเส้นทาง AI, Dev หรือเกม เดินแผนที่ทีละด่าน ให้อาจารย์ AI ตรวจงาน แล้วสู้บอสเพื่อเลเวลอัป ทุกด่านคือทักษะจริงที่เอาไปใช้ได้</p>
        <div className="landing-cta">
          <Link className="primary-link landing-main-cta" href="/start">หาเส้นทางที่ใช่ใน 1 นาที →</Link>
          <form action={enterDemo}><button type="submit" className="text-link">ลองเล่นเลยโดยไม่ต้องสมัคร</button></form>
        </div>
        <p className="landing-fine">ฟรี · ใช้ได้ทั้งมือถือและคอม · ติดตั้งเป็นแอปได้</p>
      </div>
      <div className="landing-stage" aria-hidden="true">
        <img className="landing-hero-img" src="/images/login/hero.webp" alt="" />
        <img className="landing-hero-skin" src={skinImage('swordsman')} alt="" />
        <img className="landing-hero-boss" src={bossImage('wolf')} alt="" />
      </div>
    </section>

    <dl className="landing-stats">
      <div><dt>เส้นทาง</dt><dd>{paths.length}</dd></div>
      <div><dt>ด่านต่อเส้นทาง</dt><dd>{PATH_LEVELS}</dd></div>
      <div><dt>บอส</dt><dd>{BOSSES.length}</dd></div>
      <div><dt>สกินตัวละคร</dt><dd>{skins.length}</dd></div>
    </dl>

    <section className="landing-section" aria-labelledby="how">
      <p className="eyebrow">HOW IT WORKS</p><h2 id="how">เล่นยังไง</h2>
      <ol className="landing-steps">{steps.map((s, i) => <li key={s.title}><span className="landing-step-n">{i + 1}</span><Icon name={s.icon} /><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
    </section>

    <section className="landing-section landing-bosses" aria-labelledby="bosses">
      <p className="eyebrow">8 BOSSES</p><h2 id="bosses">บอสรออยู่ทุกด่าน</h2>
      <p className="landing-lead">ด่านแรกเจอเห็ดป่องป่อง ด่านสุดท้ายเจอเทวทูตวงแหวนพันตา ยิ่งลึกยิ่งยาก ตอบผิดเสียหัวใจ ใช้ยาช่วยได้</p>
      <div className="landing-boss-row">{BOSSES.map(b => <img key={b} src={bossImage(b)} alt="" />)}</div>
    </section>

    <section className="landing-section" aria-labelledby="tracks">
      <p className="eyebrow">CHOOSE YOUR CLASS</p><h2 id="tracks">3 สาย {paths.length} เส้นทาง</h2>
      <div className="landing-tracks">{byTrack.map(t => <article key={t.track} className={`landing-track track-${t.track}`}>
        <h3>{trackLabels[t.track]}</h3><p className="muted">{t.paths.length} เส้นทาง</p>
        <ul>{t.paths.slice(0, 5).map(p => <li key={p.pathId}>{p.title}</li>)}{t.paths.length > 5 && <li className="muted">และอีก {t.paths.length - 5} เส้นทาง</li>}</ul>
      </article>)}</div>
    </section>

    <section className="landing-section landing-social" aria-labelledby="social">
      <article><Icon name="profile" /><h2 id="social">พอร์ตโฟลิโอที่โชว์ได้จริง</h2><p>ทุกด่านที่ผ่านและงานที่อาจารย์ AI ตรวจแล้ว รวมเป็นหน้าเดียว แชร์ลิงก์แนบ resume หรือส่งครูได้เลย</p></article>
      <article><Icon name="person" /><h2>ตั้งกิลด์กับเพื่อน</h2><p>สร้างกิลด์ ส่งรหัสให้เพื่อนหรือทั้งห้อง แข่งเก็บ XP รายสัปดาห์ ใครขยันสุดได้ขึ้นอันดับหนึ่ง</p></article>
    </section>

    <section className="landing-final">
      <img src={skinImage('wizard')} alt="" aria-hidden="true" />
      <h2>พร้อมออกเดินทางหรือยัง?</h2>
      <p>ใช้เวลาแค่ 1 นาทีหาเส้นทางแรกของคุณ</p>
      <Link className="primary-link landing-main-cta" href="/start">เริ่มเลย →</Link>
    </section>
    <footer className="landing-footer">liferpg · เติบโตทีละก้าว ในจังหวะของคุณ · <Link href="/credits">เครดิตเพลงและภาพ</Link></footer>
  </div>;
}
