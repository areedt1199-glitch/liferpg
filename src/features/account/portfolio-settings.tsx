"use client";
import { useActionState, useEffect, useState } from 'react';
import { updatePortfolio } from './actions';
import { emptyAuthState } from './messages';
import { ShareButton } from '@/features/social/share-button';
import { forgetOwnPortfolio } from '@/features/social/share-progress';

/** Profile section: choose a link name and whether the portfolio is visible to anyone with the link. */
export function PortfolioSettings({ handle, isPublic }: { handle: string; isPublic: boolean }) {
  const [state, action, pending] = useActionState(updatePortfolio, emptyAuthState);
  const [draft, setDraft] = useState(handle);
  const [open, setOpen] = useState(isPublic);
  const saved = state.message && !state.error;
  useEffect(() => { if (saved) forgetOwnPortfolio(); }, [state, saved]);
  const live = saved ? open && !!draft : isPublic && !!handle;
  const path = `/u/${(saved ? draft : handle).toLowerCase()}`;
  return <section className="portfolio-settings" aria-labelledby="portfolio-title">
    <h3 id="portfolio-title">พอร์ตโฟลิโอสาธารณะ</h3>
    <p className="muted">รวมด่านที่ผ่าน บอสที่ชนะ และงานที่อาจารย์ AI ตรวจแล้ว เป็นหน้าเดียวที่แชร์ได้ บันทึกการเดินทาง รูปผลงาน และเหรียญจะไม่แสดง</p>
    <form action={action} className="portfolio-form">
      <label className="login-field"><span>ชื่อลิงก์</span>
        <span className="portfolio-handle"><span className="muted">liferpg/u/</span><input name="handle" value={draft} onChange={e => setDraft(e.target.value.toLowerCase())} placeholder="เช่น leaf_dev" pattern="[a-z0-9_]{3,24}" maxLength={24} autoComplete="off" disabled={pending} /></span></label>
      <label className="portfolio-toggle"><input type="checkbox" name="isPublic" checked={open} onChange={e => setOpen(e.target.checked)} disabled={pending} /> เปิดให้ทุกคนที่มีลิงก์ดูได้</label>
      <button type="submit" className="primary-link" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึก'}</button>
    </form>
    {state.message && <p className={state.error ? 'login-alert' : 'login-ok'} role={state.error ? 'alert' : 'status'}>{state.message}</p>}
    {live && <div className="portfolio-live"><a className="text-link" href={path} target="_blank" rel="noreferrer">ดูพอร์ตโฟลิโอ ↗</a><ShareButton path={path} title="พอร์ตโฟลิโอ liferpg ของฉัน" text="ดูเส้นทางสายเทคที่ฉันผ่านมาใน liferpg" /></div>}
  </section>;
}
