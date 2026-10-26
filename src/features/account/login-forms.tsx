"use client";
import { useActionState, useState, type FormEvent } from 'react';
import { authenticate, signInWithGoogle } from './actions';
import { emptyAuthState } from './messages';
import { clearAccountView, notifyAccountChanged } from '@/features/journey/progress-store';

/** Minimal sign-in / sign-up form for the /login page. */
export function LoginForms({ startWithSignup = false, authError = false }: { startWithSignup?: boolean; authError?: boolean }) {
  const [authState, authAction, authPending] = useActionState(authenticate, emptyAuthState);
  const [googleState, googleAction, googlePending] = useActionState(signInWithGoogle, emptyAuthState);
  const [signup, setSignup] = useState(startWithSignup);
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState('');
  const [submittedMode, setSubmittedMode] = useState<boolean | null>(null);
  const switchTo = (next: boolean) => { setSignup(next); setFormError(''); setShowPw(false); };

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    if (signup && fd.get('password') !== fd.get('confirmPassword')) {
      e.preventDefault();
      setFormError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setFormError(''); setSubmittedMode(signup);
    clearAccountView(); notifyAccountChanged();
  }

  return <>
    <h1 className="login-title">{signup ? 'เริ่มการผจญภัย' : 'ยินดีต้อนรับกลับ'}</h1>
    <p className="login-sub">{signup ? 'สร้างบัญชีเพื่อเก็บความก้าวหน้าไว้ทุกเครื่อง' : 'เข้าสู่ระบบเพื่อเดินทางต่อจากที่ค้างไว้'}</p>
    {authError && <p className="login-alert" role="alert">ยืนยันอีเมลไม่สำเร็จ ลิงก์อาจหมดอายุ กรุณาเข้าสู่ระบบหรือขออีเมลใหม่</p>}
    <form action={googleAction} onSubmit={() => { clearAccountView(); notifyAccountChanged(); }}>
      <button type="submit" className="login-google" disabled={googlePending || authPending}>
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        {googlePending ? 'กำลังไปที่ Google…' : signup ? 'สมัครด้วย Google' : 'เข้าสู่ระบบด้วย Google'}
      </button>
    </form>
    {googleState.message && <p className="login-alert" role="alert">{googleState.message}</p>}
    <div className="login-or"><span>หรือใช้อีเมล</span></div>
    <form key={signup ? 's' : 'l'} className="login-form" action={authAction} onSubmit={onSubmit}>
      <input type="hidden" name="action" value={signup ? 'signup' : 'login'} />
      <label className="login-field"><span>อีเมล</span>
        <input name="email" type="email" placeholder="email@example.com" autoComplete="email" required disabled={authPending} /></label>
      <label className="login-field"><span>รหัสผ่าน</span>
        <span className="login-password"><input name="password" type={showPw ? 'text' : 'password'} placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete={signup ? 'new-password' : 'current-password'} minLength={8} required disabled={authPending} />
          <button type="button" className="login-reveal" onClick={() => setShowPw(v => !v)} aria-pressed={showPw}>{showPw ? 'ซ่อน' : 'แสดง'}</button></span></label>
      {signup && <label className="login-field"><span>ยืนยันรหัสผ่าน</span>
        <input name="confirmPassword" type={showPw ? 'text' : 'password'} placeholder="พิมพ์รหัสผ่านอีกครั้ง" autoComplete="new-password" minLength={8} required disabled={authPending} /></label>}
      {formError && <p className="login-alert" role="alert">{formError}</p>}
      <button type="submit" className="login-submit" disabled={authPending}>{authPending ? 'กำลังส่ง…' : signup ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}</button>
      {signup && <p className="login-fine">หลังสมัคร เปิดอีเมลยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ</p>}
    </form>
    {submittedMode === signup && authState.message && <p className={authState.error ? 'login-alert' : 'login-ok'} role={authState.error ? 'alert' : 'status'}>{authState.message}</p>}
    <p className="login-switch">{signup ? 'มีบัญชีอยู่แล้ว?' : 'ยังไม่มีบัญชี?'} <button type="button" onClick={() => switchTo(!signup)}>{signup ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}</button></p>
  </>;
}
