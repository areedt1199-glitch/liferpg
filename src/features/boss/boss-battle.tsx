"use client";
import {useState} from 'react';import {bosses} from './catalog';import {BossAvatar} from './boss-avatar';import {useProgress,submitBoss} from '../journey/progress-store';import type {Quest} from '../quests/types';
export function BossBattle({quest}:{quest:Quest}){
 const {progress}=useProgress();const boss=bosses[quest.id];const result=progress.bosses[quest.id];const [answers,setAnswers]=useState<Record<string,number>>({});const [busy,setBusy]=useState(false);const [submitted,setSubmitted]=useState(false);
 const passed=result?.passedAt!=null;const ready=quest.steps.every(s=>progress.focus[quest.id].checkedStepIds.includes(s.id));
 return <section className="boss-battle growth-card"><div className="boss-intro"><BossAvatar questId={quest.id} defeated={passed}/><div><p className="eyebrow">BOSS CHALLENGE</p><h3>{boss.name}</h3><p>ตอบให้ถูกทั้ง 3 ข้อ เพื่อผ่านบอสของด่านนี้<br/><span className="muted">ลองใหม่ได้ ไม่เสียเหรียญ ไม่มีรางวัลบอสซ้ำเพิ่ม</span></p></div></div>
 {passed?<p className="boss-passed" role="status">✓ ชนะบอสแล้ว · 3/3 ข้อ พร้อมยืนยันงานเมื่อทำตามเงื่อนไข</p>:!ready?<p>เช็กขั้นตอนการเรียนให้ครบก่อนสู้บอส</p>:<form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{if(await submitBoss(quest.id,answers))setSubmitted(true);}finally{setBusy(false);}}}>
 <p>พลังบอส {3-(submitted?(result?.score??0):0)}/3 · ตอบถูกหนึ่งข้อ ลดพลังหนึ่งส่วน</p>
 {boss.questions.map((q,index)=><fieldset key={q.id} disabled={busy}><legend>{index+1}. {q.prompt}</legend>{q.options.map((option,i)=><label className="boss-option" key={i}><input type="radio" name={q.id} checked={answers[q.id]===i} onChange={()=>{setAnswers({...answers,[q.id]:i});setSubmitted(false);}} required/><span>{option}</span></label>)}</fieldset>)}
 <button className="primary-link" disabled={busy||Object.keys(answers).length!==3}>{busy?'กำลังตรวจคำตอบ…':'ส่งคำตอบสู้บอส'}</button>{submitted&&result&&<div className="boss-feedback" role="status"><strong>ตอบถูก {result.score}/3 · ลองอีกครั้งได้</strong><p>ทบทวน: {boss.questions.map(q=>q.explanation).join(' · ')}</p></div>}
 </form>}
 </section>;
}

