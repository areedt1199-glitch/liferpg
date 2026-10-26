"use client";
import { useState } from 'react';
import Link from 'next/link';
import careers from '../careers/catalog.json';
import { practiceKey, practiceStreak, practiceToday, PRACTICE_COINS, PRACTICE_DAILY_LIMIT, PRACTICE_XP } from '../journey/progress';
import { bangkokDay } from '../analytics/rules';
import { practiceTask, progressNow, useProgress } from '../journey/progress-store';
import { Campfire, fireLabels, fireTier } from '../character/campfire';

export function DailyPractice(){
 const {ready,progress,mode,userId}=useProgress();const [busy,setBusy]=useState<string|null>(null);
 if(!ready||(mode==='account'&&!userId))return null;
 const now=progressNow();const career=careers.find(c=>c.id===progress.careerId);
 const streak=practiceStreak(progress,now);const done=practiceToday(progress,now).length;const day=bangkokDay(now);
 const full=done>=PRACTICE_DAILY_LIMIT;
 return <section className="growth-card daily-practice" aria-labelledby="practice-title">
  <div className="section-heading"><h2 id="practice-title">ฝึกฝนประจำวัน</h2><span className="streak-badge" aria-label={`ฝึกต่อเนื่อง ${streak} วัน`}><Campfire streak={streak} litToday={done > 0} size={30} />{streak} วันติดต่อกัน</span></div>
  <p className="fire-note">{streak === 0 ? "จุดกองไฟด้วยการฝึกวันนี้ ไฟจะโตขึ้นทุกวันที่ฝึกต่อเนื่อง" : done > 0 ? `${fireLabels[fireTier(streak)]} · วันนี้เติมฟืนแล้ว` : "ไฟกำลังมอด ฝึกวันนี้สักงานเพื่อเติมฟืน"}</p>
  {!career?<><p>เลือกเส้นทางการเรียนรู้ แล้วฝึกงานเล็ก ๆ ทุกวันเพื่อเก็บ XP และสร้าง streak</p><Link className="primary-link" href="/careers">เลือกเส้นทาง →</Link></>:<>
   {'retired' in career&&<p className="muted">เส้นทางนี้ปิดรับแล้ว ฝึกต่อได้ หรือ <Link href="/careers">เลือกเส้นทางสายเทคใหม่ →</Link></p>}
   <p className="muted">{career.title} · วันนี้ฝึกแล้ว {done}/{PRACTICE_DAILY_LIMIT} งาน · งานละ +{PRACTICE_XP} XP · +{PRACTICE_COINS} เหรียญ</p>
   <ul className="practice-list">{career.tasks.map(t=>{const practiced=!!progress.practice[practiceKey(day,career.id,t.id)];
    return <li key={t.id} className={practiced?'practiced':''}><div><strong>{t.title}</strong><p>{t.description}</p></div>
     <button className={practiced?'status-tag status-completed':'primary-link'} disabled={practiced||full||!!busy} onClick={async()=>{setBusy(t.id);try{await practiceTask(t.id);}finally{setBusy(null);}}}>{busy===t.id?'กำลังบันทึก…':practiced?'✓ ฝึกแล้ววันนี้':full?'ครบโควตาวันนี้':'บันทึกการฝึก'}</button></li>;})}</ul>
   {!('retired' in career)&&<Link className="text-link" href={`/learn/${career.id}`}>ทบทวนความรู้และทำแบบทดสอบของ{career.title} →</Link>}
   <p className="muted">กดเมื่อได้ลงมือฝึกจริงอย่างน้อยสักพัก เป็นการบันทึกด้วยตนเอง {full?'วันนี้ครบแล้ว พรุ่งนี้มาต่อ streak กัน':'ฝึกอย่างน้อย 1 งานต่อวันเพื่อรักษา streak'}</p>
  </>}
 </section>;
}
