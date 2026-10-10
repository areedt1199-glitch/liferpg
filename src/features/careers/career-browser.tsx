"use client";
import { useState } from 'react';
import Link from 'next/link';
import careers from './catalog.json';
import { chooseCareer, useProgress } from '../journey/progress-store';
import { ProgressNotice } from '../journey/progress-notice';
export function CareerBrowser(){
 const {ready,progress,mode,userId}=useProgress();const [filter,setFilter]=useState('career');const [selected,setSelected]=useState<string|null>(null);const [busy,setBusy]=useState(false);
 const detail=careers.find(c=>c.id===(selected??progress.careerId))??careers[0];
 return <><ProgressNotice/><div className="growth-filters" role="group" aria-label="ประเภทเส้นทาง">{[['career','อาชีพ'],['skill','ทักษะ'],['life','ชีวิต']].map(([id,label])=><button key={id} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
 <div className="career-layout"><div className="growth-grid">{careers.filter(c=>c.category===filter).map(c=><button key={c.id} className={`growth-card career-card ${detail.id===c.id?'selected':''}`} onClick={()=>setSelected(c.id)} aria-pressed={detail.id===c.id}><span className="eyebrow">{c.englishTitle}</span><h2>{c.title}</h2><p>{c.description}</p>{progress.careerId===c.id&&<span className="status-tag">✓ เส้นทางที่เลือก</span>}</button>)}</div>
 <section className="growth-card career-plan"><p className="eyebrow">YOUR LEARNING DIRECTION</p><h2>{detail.title}</h2><p>{detail.description}</p><h3>แผนฝึกฝนจาก LifeQuest</h3><ol className="career-tasks">{detail.tasks.map(t=><li key={t.id}><strong>{t.title}</strong><p>{t.description}</p></li>)}</ol><p className="muted">เลือกเส้นทางแล้วฝึกงานเหล่านี้ได้ทุกวันในหน้า “วันนี้” (วันละไม่เกิน 3 งาน) เพื่อรับ XP และสร้าง streak การเปลี่ยนเส้นทางไม่ล้างเควสต์หรือ streak เดิม</p><button className="primary-link" disabled={!ready||busy||(mode==='account'&&!userId)||progress.careerId===detail.id} onClick={async()=>{setBusy(true);try{await chooseCareer(detail.id);}finally{setBusy(false);}}}>{busy?'กำลังบันทึก…':progress.careerId===detail.id?'เลือกเส้นทางนี้แล้ว':'เลือกเส้นทางนี้'}</button>{detail.id==='game_developer'&&<Link className="text-link" href="/goals/first-game">เปิดแผนที่สร้างเกมแรก →</Link>}{progress.careerId===detail.id&&<Link className="text-link" href="/today">ไปฝึกประจำวัน →</Link>}<Link className="text-link" href={`/chat?path=${detail.id}`}>ถามผู้ช่วยเกี่ยวกับเส้นทางนี้ →</Link></section></div></>;
}
