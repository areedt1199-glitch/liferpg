"use client";
/* eslint-disable @next/next/no-img-element -- pixel-art sprites/backdrops are small static files scaled by CSS */
import { useState } from 'react';
import { items, MAX_ITEM_QTY, rarities, skinImage, skinPrice, skins, STARTER_SKIN, type ItemId, type Skin } from './catalog';
import { inventory } from '../journey/progress';
import { purchaseItem, purchaseSkin, useProgress, wearSkin } from '../journey/progress-store';
import { ProgressNotice } from '../journey/progress-notice';
import { PixelPotion } from '../boss/pixel/pixel-canvas';

type Pick = { kind: 'item'; id: ItemId } | { kind: 'skin'; id: string };
const greetings = { item: 'เลือกน้ำยาได้เลย นักเดินทาง ทุกขวดหมักจากน้ำค้างกลางป่า', skin: 'อยากลองชุดใหม่หรือ? ใส่แล้วตัวละครของเจ้าจะเปลี่ยนไปทั้งแอป' };

export function Shop() {
  const { ready, progress, mode, userId } = useProgress();
  const allowed = ready && !(mode === 'account' && !userId);
  const [tab, setTab] = useState<'item' | 'skin'>('item');
  const [pick, setPick] = useState<Pick>({ kind: 'item', id: 'hint' });
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [say, setSay] = useState(greetings.item);
  const bag = inventory(progress);
  const item = pick.kind === 'item' ? items.find(i => i.id === pick.id)! : null;
  const skin = pick.kind === 'skin' ? skins.find(s => s.id === pick.id)! : null;
  const owned = (s: Skin) => skinPrice(s) === 0 || !!progress.skins[s.id];

  function choose(next: Pick) { setPick(next); setQty(1); setSay(next.kind === 'item' ? items.find(i => i.id === next.id)!.effect : `${skins.find(s => s.id === next.id)!.name} · ระดับ${rarities[skins.find(s => s.id === next.id)!.rarity].label}`); }
  function switchTab(next: 'item' | 'skin') { setTab(next); choose(next === 'item' ? { kind: 'item', id: 'hint' } : { kind: 'skin', id: progress.equippedSkinId || STARTER_SKIN }); setSay(greetings[next]); }
  async function act() {
    if (!allowed || busy) return;
    setBusy(true);
    try {
      if (item) { if (await purchaseItem(item.id, qty)) setSay(`ขอบใจนะ! ${item.name} ${qty} ขวดเข้ากระเป๋าแล้ว`); }
      else if (skin) {
        if (owned(skin)) { if (await wearSkin(skin.id)) setSay(`เหมาะกับเจ้ามาก! ตอนนี้สวม${skin.name}อยู่`); }
        else if (await purchaseSkin(skin.id)) setSay(`${skin.name} เป็นของเจ้าแล้ว กดสวมใส่ได้เลย`);
      }
    } finally { setBusy(false); }
  }

  const total = item ? item.price * qty : skin ? skinPrice(skin) : 0;
  const short = progress.coins < total;
  const label = busy ? 'กำลังบันทึก…' : item ? (short ? 'เหรียญยังไม่พอ' : 'ยืนยันการซื้อ') : skin && progress.equippedSkinId === skin.id ? 'กำลังสวมอยู่' : skin && owned(skin) ? 'สวมใส่สกินนี้' : short ? 'เหรียญยังไม่พอ' : `ซื้อ · ${total.toLocaleString('th-TH')} เหรียญ`;
  const disabled = !allowed || busy || (item ? short : !!skin && (progress.equippedSkinId === skin.id || (!owned(skin) && short)));

  return <><ProgressNotice />
    <section className="market" aria-label="ร้านค้า">
      <div className="market-sign"><p>THE FOREST MARKET</p><h2>ร้านค้าป่าเวทมนตร์</h2></div>
      <div className="market-purse" aria-live="polite"><span className="coin" aria-hidden="true" />{progress.coins.toLocaleString('th-TH')} เหรียญ</div>

      <div className="market-panel market-list">
        <div className="market-tabs" role="tablist" aria-label="หมวดสินค้า">
          <button type="button" role="tab" aria-selected={tab === 'item'} onClick={() => switchTab('item')}>ไอเทม</button>
          <button type="button" role="tab" aria-selected={tab === 'skin'} onClick={() => switchTab('skin')}>สกิล</button>
        </div>
        {tab === 'item' ? <div className="market-grid items-grid" role="tabpanel">{items.map(it =>
          <button key={it.id} type="button" className={`slot ${pick.kind === 'item' && pick.id === it.id ? 'picked' : ''}`} aria-pressed={pick.kind === 'item' && pick.id === it.id} onClick={() => choose({ kind: 'item', id: it.id })}>
            <PixelPotion kind={it.id} liquid={it.liquid} className="slot-art" /><span className="slot-name">{it.name}</span><span className="slot-meta">{it.price} เหรียญ</span>{bag[it.id] > 0 && <span className="slot-count">×{bag[it.id]}</span>}
          </button>)}</div>
          : <div className="market-grid skins-grid" role="tabpanel">{skins.map(s =>
            <button key={s.id} type="button" className={`slot skin-slot ${pick.kind === 'skin' && pick.id === s.id ? 'picked' : ''}`} style={{ ['--rarity' as string]: rarities[s.rarity].color }} aria-pressed={pick.kind === 'skin' && pick.id === s.id} aria-label={`${s.name} ${rarities[s.rarity].label}${owned(s) ? ' เป็นเจ้าของแล้ว' : ` ${skinPrice(s)} เหรียญ`}`} onClick={() => choose({ kind: 'skin', id: s.id })}>
              
              <img src={skinImage(s.id)} alt="" className="slot-art" />{progress.equippedSkinId === s.id ? <span className="slot-count">สวมอยู่</span> : owned(s) && <span className="slot-count">✓</span>}
            </button>)}</div>}
      </div>

      <div className="market-keeper" aria-hidden="true">
        <p className="bubble">{say}</p>
        
        <img src={skinImage('sage')} alt="" className="keeper" />
        <div className="counter" />
      </div>

      <div className="market-panel market-detail" aria-live="polite">
        {item && <><div className="detail-head"><PixelPotion kind={item.id} liquid={item.liquid} className="detail-art" /><div><h3>{item.name}</h3><p>{item.effect}</p><p className="detail-own">ในกระเป๋า: {bag[item.id]} ขวด · ใช้ได้ในฉากสู้บอส</p></div></div>
          <div className="qty" role="group" aria-label="จำนวน"><button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="ลดจำนวน">−</button><input type="range" min={1} max={MAX_ITEM_QTY} value={qty} onChange={e => setQty(Number(e.target.value))} aria-label="จำนวนที่ซื้อ" /><output>{qty}</output><button type="button" onClick={() => setQty(q => Math.min(MAX_ITEM_QTY, q + 1))} disabled={qty >= MAX_ITEM_QTY} aria-label="เพิ่มจำนวน">+</button></div>
          <p className="subtotal">รวม: {total.toLocaleString('th-TH')} เหรียญ</p></>}
        {skin && <><div className="detail-head"><img src={skinImage(skin.id)} alt="" className="detail-art skin" /><div><h3>{skin.name}</h3><p className="rarity" style={{ color: rarities[skin.rarity].color }}>ระดับ{rarities[skin.rarity].label}</p><p>{owned(skin) ? 'เป็นเจ้าของแล้ว สวมใส่ได้ทันที' : `ราคา ${skinPrice(skin).toLocaleString('th-TH')} เหรียญ ซื้อครั้งเดียวใช้ได้ตลอด`}</p></div></div></>}
        <button type="button" className="confirm" disabled={disabled} onClick={() => void act()}>{label}</button>
        <p className="market-note">ใช้เหรียญจากเควสต์และการฝึกประจำวัน ไม่มีการซื้อด้วยเงินจริง</p>
      </div>
    </section>
  </>;
}
