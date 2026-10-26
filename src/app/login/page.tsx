import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { LoginForms } from '@/features/account/login-forms';
import { enterDemo } from '@/features/account/actions';
import { Icon } from '@/components/ui/icon';
import { FantasyForest } from '@/features/account/fantasy-forest';

// A looping clip placed here replaces the animated illustration; nothing is loaded from other sites.
const VIDEO = '/images/login/forest.mp4';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ auth?: string; signup?: string; forgot?: string }> }) {
  const configured = !!supabaseConfig();
  const client = await serverClient();
  if (client) {
    let signedIn = false;
    try { const { data, error } = await client.auth.getUser(); signedIn = !!data.user && !error; } catch { /* stay on login */ }
    if (signedIn) redirect('/profile');
  }
  const query = await searchParams;
  const video = fs.existsSync(path.join(process.cwd(), 'public', VIDEO));
  return <div className="login-page">
    <div className="login-main">
      <Link className="login-logo" href="/today"><Icon name="leaf" />liferpg<span>.</span></Link>
      <div className="login-column">
        <span className="login-emblem" aria-hidden="true"><Icon name="leaf" /></span>
        {configured ? <LoginForms startWithSignup={query.signup === '1'} startWithForgot={query.forgot === '1'} authError={query.auth === 'error'} /> : <div className="login-unconfigured"><h1>ยังไม่ได้ตั้งค่าฐานข้อมูล</h1><p>ตั้งค่า Supabase ตามคู่มือก่อนสมัครหรือเข้าสู่ระบบ ระหว่างนี้ลองเล่นแบบ demo ได้</p></div>}
        <div className="login-or"><span>หรือ</span></div>
        <form action={enterDemo}><button type="submit" className="login-demo">ลองเล่นแบบ demo ในเบราว์เซอร์นี้</button></form>
        <p className="login-fine">ข้อมูล demo เก็บในเครื่องนี้เท่านั้น แยกจากบัญชีจริง</p>
      </div>
    </div>
    <aside className="login-art" aria-hidden="true">
      {video ? <video className="login-video" src={VIDEO} autoPlay muted loop playsInline /> : <FantasyForest />}
      <p className="login-art-caption">YOUR LIFE. YOUR QUEST.</p>
    </aside>
  </div>;
}
