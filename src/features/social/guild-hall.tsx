"use client";
/* eslint-disable @next/next/no-img-element -- pixel-art sprites are small static files scaled by CSS */
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useProgress } from '@/features/journey/progress-store';
import { levelStats } from '@/features/journey/progress';
import { skinImage } from '@/features/shop/catalog';
import { ShareButton } from './share-button';

type GuildRow = { id: string; name: string; code: string; members: number; isOwner: boolean };
type Member = { name: string; handle: string | null; skinId: string; isMe: boolean; isOwner: boolean; weekXP: number; totalXP: number };
type Board = { id: string; name: string; code: string; isOwner: boolean; weekStart: number; members: Member[] };

async function call<T>(action: string, body: Record<string, string> = {}): Promise<T> {
  const response = await fetch('/api/guild', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }), cache: 'no-store' });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? 'ติดต่อกิลด์ไม่สำเร็จ');
  return value as T;
}
const medal = ['🥇', '🥈', '🥉'];

/** Study groups: make one, share its 6-letter code, and race for the most XP this week. */
export function GuildHall({ joinCode }: { joinCode: string }) {
  const { ready, mode, userId } = useProgress();
  const [guilds, setGuilds] = useState<GuildRow[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState(joinCode.toUpperCase());
  const [name, setName] = useState('');
  const account = ready && mode === 'account' && !!userId;

  const run = useCallback(async (work: () => Promise<void>) => { setBusy(true); setError(''); try { await work(); } catch (e) { setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด'); } finally { setBusy(false); } }, []);
  const accept = useCallback((value: { guilds: GuildRow[]; id?: string }) => { setGuilds(value.guilds); setSelected(cur => value.id ?? (value.guilds.some(g => g.id === cur) ? cur : value.guilds[0]?.id ?? null)); }, []);
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
  useEffect(() => { if (!account) return; let live = true; call<{ guilds: GuildRow[] }>('list').then(v => { if (live) accept(v); }, e => { if (live) fail(e); }); return () => { live = false; }; }, [account, accept]);
  useEffect(() => { if (!selected) return; let live = true; call<Board>('board', { id: selected }).then(b => { if (live) setBoard(b); }, e => { if (live) fail(e); }); return () => { live = false; }; }, [selected]);
  // The board on screen always belongs to the selected tab; a stale one hides while the next loads.
  const shown = board && board.id === selected ? board : null;

  if (!ready) return <p role="status">กำลังโหลด…</p>;
  if (mode === 'demo') return <section className="empty-state standalone"><h2>กิลด์ใช้กับบัญชีจริง</h2><p>โหมด demo เก็บข้อมูลในเครื่องนี้เท่านั้น จึงแข่งกับเพื่อนไม่ได้<br />สมัครบัญชีเพื่อสร้างหรือเข้าร่วมกิลด์</p><Link className="primary-link" href="/profile">ไปที่โปรไฟล์ →</Link></section>;
  if (!userId) return <section className="empty-state standalone"><h2>เข้าสู่ระบบเพื่อเข้ากิลด์</h2><p>สร้างกิลด์กับเพื่อนหรือทั้งห้อง แล้วแข่งเก็บ XP รายสัปดาห์</p><Link className="primary-link" href="/login">เข้าสู่ระบบ →</Link></section>;

  const create = (e: FormEvent) => { e.preventDefault(); void run(async () => { accept(await call('create', { name })); setName(''); }); };
  const join = (e: FormEvent) => { e.preventDefault(); void run(async () => { accept(await call('join', { code })); setCode(''); }); };
  const leave = (g: Board) => { if (window.confirm(`ออกจากกิลด์ “${g.name}”?${g.isOwner ? ' สมาชิกที่อยู่นานที่สุดจะเป็นหัวหน้าแทน' : ''}`)) void run(async () => accept(await call('leave', { id: g.id }))); };
  const weekLabel = shown ? new Date(shown.weekStart).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', timeZone: 'Asia/Bangkok' }) : '';

  return <div className="guild-hall">
    {error && <p className="login-alert" role="alert">{error}</p>}
    {guilds && guilds.length > 0 && <nav className="guild-tabs" aria-label="กิลด์ของฉัน">{guilds.map(g => <button key={g.id} type="button" className={g.id === selected ? 'active' : ''} aria-pressed={g.id === selected} onClick={() => setSelected(g.id)}>{g.name}<span>{g.members} คน</span></button>)}</nav>}
    {shown && <section className="guild-board" aria-labelledby="guild-name">
      <div className="guild-board-head">
        <div><p className="eyebrow">WEEKLY RANKING</p><h2 id="guild-name">{shown.name}</h2><p className="muted">นับ XP ตั้งแต่วันจันทร์ {weekLabel}</p></div>
        <div className="guild-invite"><span>รหัสเข้ากิลด์</span><strong>{shown.code}</strong><ShareButton path={`/guild?join=${shown.code}`} title={`กิลด์ ${shown.name}`} text={`มาเข้ากิลด์ “${shown.name}” ใน liferpg ด้วยกัน รหัส ${shown.code}`} label="ชวนเพื่อน" /></div>
      </div>
      <ol className="guild-ranks">{shown.members.map((m, i) => <li key={`${m.name}-${i}`} className={m.isMe ? 'me' : ''}>
        <span className="guild-rank">{medal[i] ?? i + 1}</span>
        <img src={skinImage(m.skinId)} alt="" />
        <span className="guild-member">{m.handle ? <Link href={`/u/${m.handle}`}>{m.name}</Link> : m.name}{m.isMe && <em> (คุณ)</em>}{m.isOwner && <em> · หัวหน้า</em>}<small>Lv.{levelStats(m.totalXP).level}</small></span>
        <span className="guild-xp"><strong>{m.weekXP}</strong> XP</span>
      </li>)}</ol>
      <button type="button" className="text-link guild-leave" disabled={busy} onClick={() => leave(shown)}>ออกจากกิลด์</button>
    </section>}
    {guilds && guilds.length === 0 && <section className="empty-state"><h2>ยังไม่มีกิลด์</h2><p>สร้างกิลด์ใหม่แล้วส่งรหัสให้เพื่อน หรือใส่รหัสที่ได้รับเพื่อเข้าร่วม</p></section>}
    <div className="guild-forms">
      <form onSubmit={join} className="guild-form"><h3>เข้าร่วมกิลด์</h3><label className="login-field"><span>รหัส 6 ตัว</span><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={6} placeholder="เช่น K7MP2Q" autoComplete="off" required disabled={busy} /></label><button type="submit" className="primary-link" disabled={busy || code.trim().length !== 6}>เข้าร่วม</button></form>
      <form onSubmit={create} className="guild-form"><h3>สร้างกิลด์ใหม่</h3><label className="login-field"><span>ชื่อกิลด์</span><input value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="เช่น ห้อง ม.5/1 หรือ ทีมเกมเมอร์" required disabled={busy} /></label><button type="submit" className="primary-link" disabled={busy || !name.trim()}>สร้างกิลด์</button></form>
    </div>
  </div>;
}
