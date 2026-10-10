"use client";
import {useEffect,useState} from 'react';
import {useProgress,saveDemoEvidence,removeDemoEvidence,reloadProgress} from '../journey/progress-store';
import {imageOperation,prepareImage} from './image-store';
import type {EvidenceRecord} from './types';
export function EvidencePanel({questId}:{questId:string}){
 const {ready,mode,userId,progress}=useProgress();const record=progress.evidence[questId];
 if(!ready||(mode==='account'&&!userId)||!['in_progress','completed'].includes(progress.quests[questId]))return null;
 return <EvidenceForm key={`${mode}:${userId}:${questId}`} questId={questId} mode={mode} userId={userId} record={record}/>;
}
function EvidenceForm({questId,mode,userId,record}:{questId:string;mode:'demo'|'account';userId:string|null;record?:EvidenceRecord}){
 const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState<{url:string;id:string}|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 useEffect(()=>{let live=true;let url:string|undefined;const controller=new AbortController();
  async function load(){if(!record)return;try{const blob=mode==='demo'?await imageOperation('get',record.id):await fetch(`/api/evidence?questId=${questId}&ownerId=${userId}`,{cache:'no-store',signal:controller.signal}).then(r=>{if(!r.ok)throw new Error();return r.blob();});if(!blob)throw new Error();url=URL.createObjectURL(blob);if(live)setPreview({url,id:record.id});}catch{if(live)setMessage('โหลดภาพไม่สำเร็จ กรุณาลองรีเฟรช');}}
  void load();return()=>{live=false;controller.abort();if(url)URL.revokeObjectURL(url);};
 },[record,mode,questId,userId]);
 async function save(){if(!file||busy)return;setBusy(true);setMessage('');try{
  const blob=await prepareImage(file);
  if(mode==='demo'){const id=crypto.randomUUID();await imageOperation('put',id,blob);const ok=await saveDemoEvidence({id,questId,path:`demo/${questId}/${id}.jpg`,mime:'image/jpeg',size:blob.size,createdAt:Date.now()});if(!ok){await imageOperation('delete',id);throw new Error('บันทึกความก้าวหน้าไม่สำเร็จ');}if(record)await imageOperation('delete',record.id);
  }else{const form=new FormData();form.set('questId',questId);form.set('ownerId',userId!);form.set('image',blob,'activity.jpg');const response=await fetch('/api/evidence',{method:'POST',body:form,signal:AbortSignal.timeout(25_000)});const body=await response.json();if(!response.ok)throw new Error(body.error);await reloadProgress();}
  setFile(null);setMessage('บันทึกภาพกิจกรรมแล้ว');
 }catch(error){setMessage(error instanceof Error?error.message:'บันทึกภาพไม่สำเร็จ ลองใหม่ได้');}finally{setBusy(false);}}
 async function remove(){if(busy||!record||!window.confirm('ลบภาพกิจกรรมนี้? การลบภาพไม่เปลี่ยนเควสต์หรือรางวัล'))return;setBusy(true);try{
  if(mode==='demo'){if(!await removeDemoEvidence(questId))throw new Error('ลบบันทึกไม่สำเร็จ');await imageOperation('delete',record.id);}else{const response=await fetch('/api/evidence',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({questId,ownerId:userId}),signal:AbortSignal.timeout(25_000)});if(!response.ok)throw new Error('ลบภาพไม่สำเร็จ ลองใหม่ได้');await reloadProgress();}setMessage('ลบภาพแล้ว');
 }catch(error){setMessage(error instanceof Error?error.message:'ลบภาพไม่สำเร็จ');}finally{setBusy(false);}}
 return <section className="evidence-panel growth-card"><p className="eyebrow">A MEMORY OF YOUR EFFORT</p><h3>ภาพกิจกรรมของคุณ</h3><p className="muted">ถ่ายภาพงานที่ทำ หรือเลือกภาพหน้าจอผลงาน · ไม่บังคับและไม่ตรวจผลงานด้วย AI</p>{record&&preview?.id===record.id&&<img className="evidence-image" src={preview.url} alt="ภาพกิจกรรมที่คุณแนบไว้สำหรับเควสต์นี้"/>}
 <div className="evidence-inputs"><label className="text-link">เลือกภาพ<input aria-label="เลือกภาพกิจกรรม" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);setMessage('');}}/></label><label className="text-link">ถ่ายภาพ<input aria-label="ถ่ายภาพกิจกรรม" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);setMessage('');}}/></label></div>
 {file&&<p>เลือกแล้ว: {file.name}</p>}<p className="muted">JPG, PNG, WebP ไม่เกิน 5 MB · ย่อภาพและตัดข้อมูลตำแหน่งจากไฟล์ก่อนบันทึก {mode==='demo'?'ภาพอยู่ในเบราว์เซอร์นี้':'ภาพส่งไปพื้นที่ส่วนตัวของบัญชีใน Supabase เมื่อกดบันทึก'}</p><div className="action-row"><button className="primary-link" disabled={busy||!file} onClick={()=>void save()}>{busy?'กำลังบันทึก…':record?'บันทึกภาพใหม่':'บันทึกภาพกิจกรรม'}</button>{record&&<button className="text-link" disabled={busy} onClick={()=>void remove()}>ลบภาพ</button>}</div>{message&&<p role="status">{message}</p>}
 </section>;
}
