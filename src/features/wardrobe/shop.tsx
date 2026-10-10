"use client";
import { useState } from 'react';
import { outfits } from './catalog';
import { buyOutfit, wearOutfit, useProgress } from '../journey/progress-store';
import { CharacterAvatar } from '../character/character-avatar';
import { CharacterStats } from '../character/character-stats';
import { ProgressNotice } from '../journey/progress-notice';
export function Shop(){
 const {ready,progress,mode,userId}=useProgress();const [busy,setBusy]=useState<string|null>(null);const [message,setMessage]=useState('');
 const allowed=ready&&(mode==='demo'||!!userId);
 return <><ProgressNotice/><section className="shop-summary growth-card"><CharacterAvatar/><div><h2>แต่งตัวในแบบของคุณ</h2><CharacterStats/><p className="muted">ใช้เหรียญจากเควสต์ ซื้อครั้งเดียว สวมและเปลี่ยนชุดได้ตลอด ไม่มีการซื้อด้วยเงินจริง</p></div></section><p role="status">{message}</p><div className="growth-grid outfit-grid">{outfits.map(item=>{const owned=item.price===0||!!progress.purchases[item.id];const equipped=progress.equippedOutfitId===item.id;return <section key={item.id} className="growth-card outfit-card"><CharacterAvatar outfitId={item.id}/><h2>{item.title}</h2><p>{item.description}</p><span className="status-tag">{equipped?'✓ กำลังสวม':owned?'✓ เป็นเจ้าของแล้ว':`${item.price} เหรียญ`}</span><button className="primary-link" disabled={!allowed||!!busy||equipped||(!owned&&progress.coins<item.price)} onClick={async()=>{
 setBusy(item.id);setMessage('');try{const success=owned?await wearOutfit(item.id):await buyOutfit(item.id);if(success)setMessage(owned?`สวม${item.title}แล้ว`:`ซื้อ${item.title}แล้ว กดสวมใส่เพื่อเปลี่ยนชุด`);}finally{setBusy(null);}
 }}>{busy===item.id?'กำลังบันทึก…':equipped?'กำลังสวม':owned?'สวมใส่':progress.coins<item.price?'เหรียญยังไม่พอ':`ซื้อ · ${item.price} เหรียญ`}</button></section>;})}</div></>;
}
