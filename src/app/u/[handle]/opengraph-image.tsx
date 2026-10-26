/* eslint-disable @next/next/no-img-element -- next/og renders plain img elements */
import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadPortfolio } from '@/features/social/portfolio';
import { thaiFont } from '@/features/social/og-font';
import { skinById, STARTER_SKIN } from '@/features/shop/catalog';

export const alt = 'พอร์ตโฟลิโอ liferpg';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Share card for a public portfolio: character, level and the numbers that show real progress.
// Fixed labels avoid stacked Thai marks (e.g. ที่, เริ่ม): the image renderer drops a tone mark placed above a vowel.
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const p = await loadPortfolio((await params).handle);
  const name = p?.name ?? 'liferpg';
  const stats = p ? [['ด่านผ่านแล้ว', p.quests.length], ['ชนะบอส', p.bosses], ['AI ตรวจผ่าน', p.reviewed]] as const : [];
  const goals = p ? p.goals.slice(0, 3).map(g => `${g.title} ${g.done}/${g.total}`) : ['เรียนสายเทคแบบเล่นเกม RPG'];
  const skin = skinById(p?.skinId ?? '') ? p!.skinId : STARTER_SKIN;
  const sprite = `data:image/png;base64,${(await readFile(join(process.cwd(), 'public', 'images', 'skins', `${skin}.png`))).toString('base64')}`;
  // Digits are listed in full: numbers are rendered from this subset too.
  const text = [name, 'ADVENTURER liferpg Lv. XP 0123456789,/', ...stats.map(s => `${s[0]}${s[1]}`), ...goals, 'ออกผจญภัยไปด้วยกันใน liferpg'].join(' ');
  const fonts = (await Promise.all([thaiFont(text, 400), thaiFont(text, 700)])).filter(f => f !== null);
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', background: 'linear-gradient(135deg,#0f2b23,#173e32 55%,#285444)', color: '#fffdf7', fontFamily: 'Noto Sans Thai', padding: 64 }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', width: 360, height: '100%', background: '#f6f3e922', border: '3px solid #d9a441', borderRadius: 32, marginRight: 56 }}>
        <img src={sprite} width={260} height={260} style={{ objectFit: 'contain' }} alt="" />
        {p && <div style={{ display: 'flex', marginTop: 16, fontSize: 52, fontWeight: 700, color: '#f1dfad' }}>Lv.{p.level}</div>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center' }}>
        <div style={{ display: 'flex', fontSize: 26, letterSpacing: 4, color: '#d9a441' }}>ADVENTURER · liferpg</div>
        <div style={{ display: 'flex', fontSize: 72, fontWeight: 700, marginTop: 8, lineHeight: 1.2 }}>{name}</div>
        {p && <div style={{ display: 'flex', fontSize: 30, color: '#f1dfad', marginTop: 4 }}>{p.totalXP.toLocaleString('en-US')} XP</div>}
        <div style={{ display: 'flex', marginTop: 32 }}>{stats.map(([label, value]) => <div key={label} style={{ display: 'flex', flexDirection: 'column', marginRight: 40 }}>
          <div style={{ display: 'flex', fontSize: 56, fontWeight: 700 }}>{value}</div><div style={{ display: 'flex', fontSize: 24, color: '#cfd8cf' }}>{label}</div></div>)}</div>
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 28 }}>{goals.map(g => <div key={g} style={{ display: 'flex', alignItems: 'center', fontSize: 26, color: '#e7edde', marginTop: 4 }}><div style={{ width: 10, height: 10, borderRadius: 5, background: '#d9a441', marginRight: 14 }} />{g}</div>)}</div>
        <div style={{ display: 'flex', marginTop: 'auto', fontSize: 24, color: '#d9a441' }}>ออกผจญภัยไปด้วยกันใน liferpg</div>
      </div>
    </div>,
    { ...size, fonts },
  );
}
