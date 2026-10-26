import Link from 'next/link';
import { serverClient } from '@/lib/supabase/server';
import { ResetPasswordForm } from '@/features/account/password-forms';
import { Icon } from '@/components/ui/icon';
import { FantasyForest } from '@/features/account/fantasy-forest';

export default async function ResetPasswordPage() {
  const client = await serverClient();
  let signedIn = false;
  if (client) { try { const { data, error } = await client.auth.getUser(); signedIn = !!data.user && !error; } catch { /* treat as expired */ } }
  return <div className="login-page">
    <div className="login-main">
      <Link className="login-logo" href="/today"><Icon name="leaf" />liferpg<span>.</span></Link>
      <div className="login-column">
        <span className="login-emblem" aria-hidden="true"><Icon name="leaf" /></span>
        {signedIn ? <ResetPasswordForm /> : <>
          <h1 className="login-title">ลิงก์หมดอายุแล้ว</h1>
          <p className="login-sub">ลิงก์ตั้งรหัสผ่านใช้ได้ครั้งเดียวและมีเวลาจำกัด ขอลิงก์ใหม่จากหน้าเข้าสู่ระบบ</p>
          <Link className="login-submit login-link-button" href="/login?forgot=1">ขอลิงก์ใหม่</Link>
        </>}
      </div>
    </div>
    <aside className="login-art" aria-hidden="true"><FantasyForest /><p className="login-art-caption">YOUR LIFE. YOUR QUEST.</p></aside>
  </div>;
}
