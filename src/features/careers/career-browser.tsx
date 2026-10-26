"use client";
import { useRef, useState } from 'react';
import Link from 'next/link';
import careers from './catalog.json';
import { trackFilters, trackLabels } from './tracks';
import { chooseCareer, useProgress } from '../journey/progress-store';
import { ProgressNotice } from '../journey/progress-notice';
const paths=careers.filter(c=>!('retired' in c)).map(c=>({...c,track:c.track??'dev'}));
const tracks=trackFilters;
const trackLabel:Record<string,string>=trackLabels;
export function CareerBrowser(){
 const {ready,progress,mode,userId}=useProgress();const [filter,setFilter]=useState('career');const [track,setTrack]=useState('all');const [selected,setSelected]=useState<string|null>(null);const [busy,setBusy]=useState(false);const plan=useRef<HTMLElement>(null);
 const pick=(id:string)=>{setSelected(id);if(window.matchMedia('(max-width: 900px)').matches)requestAnimationFrame(()=>plan.current?.scrollIntoView({behavior:'smooth',block:'start'}));};
 const shown=paths.filter(c=>c.category===filter&&(track==='all'||c.track===track));
 const detail=paths.find(c=>c.id===(selected??progress.careerId))??paths[0];
 return <><ProgressNotice/><div className="growth-filters" role="group" aria-label="ประเภทเส้นทาง">{[['career','อาชีพ'],['skill','ทักษะ']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
 <div className="growth-filters track-filters" role="group" aria-label="สายเทคโนโลยี">{tracks.map(([id,label])=><button key={id} aria-pressed={track===id} onClick={()=>setTrack(id)}>{label}</button>)}</div>
 <div className="career-layout"><div><p className="career-count">{shown.length} {filter==='career'?'อาชีพ':'ทักษะ'}</p><div className="career-grid">{shown.map(c=><button key={c.id} className={`career-card track-${c.track} ${detail.id===c.id?'selected':''}`} onClick={()=>pick(c.id)} aria-pressed={detail.id===c.id}><span className="career-card-top"><span className="track-pill">{trackLabel[c.track]}</span>{progress.careerId===c.id&&<span className="career-mine">✓ เส้นทางของฉัน</span>}</span><h2>{c.title}</h2><span className="career-en">{c.englishTitle}</span><p>{c.description}</p></button>)}</div></div>
 <section ref={plan} className={`growth-card career-plan track-${detail.track}`}><p className="eyebrow">YOUR LEARNING DIRECTION · {trackLabel[detail.track]}</p><h2>{detail.title}</h2><p>{detail.description}</p><h3>แผนฝึกฝนจาก LifeQuest</h3><ol className="career-tasks">{detail.tasks.map(t=><li key={t.id}><strong>{t.title}</strong><p>{t.description}</p></li>)}</ol><p className="muted">เลือกเส้นทางแล้วฝึกงานเหล่านี้ได้ทุกวันในหน้า “วันนี้” (วันละไม่เกิน 3 งาน) เพื่อรับ XP และสร้าง streak การเปลี่ยนเส้นทางไม่ล้างเควสต์หรือ streak เดิม</p><button className="primary-link" disabled={!ready||busy||(mode==='account'&&!userId)||progress.careerId===detail.id} onClick={async()=>{setBusy(true);try{await chooseCareer(detail.id);}finally{setBusy(false);}}}>{busy?'กำลังบันทึก…':progress.careerId===detail.id?'เลือกเส้นทางนี้แล้ว':'เลือกเส้นทางนี้'}</button><Link className="text-link" href={`/goals/${detail.id}`}>เปิดแผนที่เป้าหมายของสายนี้ →</Link>{progress.careerId===detail.id&&<Link className="text-link" href="/today">ไปฝึกประจำวัน →</Link>}<Link className="text-link" href={`/learn/${detail.id}`}>อ่านความรู้และทำแบบทดสอบของเส้นทางนี้ →</Link><Link className="text-link" href={`/chat?path=${detail.id}`}>ถามผู้ช่วยเกี่ยวกับเส้นทางนี้ →</Link></section></div></>;
}
