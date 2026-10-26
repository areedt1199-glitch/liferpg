"use client";
import { useActionState, useState, type FormEvent } from 'react';
import { requestPasswordReset, updatePassword } from './actions';
import { emptyAuthState } from './messages';

/** "Forgot password" view on /login: asks for the email and mails a reset link. */
export function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [state, action, pending] = useActionState(requestPasswordReset, emptyAuthState);
  return <>
    <h1 className="login-title">ลืมรหัสผ่าน</h1>
    <p className="login-sub">กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์ตั้งรหัสผ่านใหม่ให้</p>
    <form className="login-form" action={action}>
      <label className="login-field"><span>อีเมล</span>
        <input name="email" type="email" placeholder="email@example.com" autoComplete="email" required disabled={pending} /></label>
      <button type="submit" className="login-submit" disabled={pending}>{pending ? 'กำลังส่ง…' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}</button>
    </form>
    {state.message && <p className={state.error ? 'login-alert' : 'login-ok'} role={state.error ? 'alert' : 'status'}>{state.message}</p>}
    <p className="login-switch">จำรหัสผ่านได้แล้ว? <button type="button" onClick={onBack}>กลับไปเข้าสู่ระบบ</button></p>
  </>;
}

/** /login/reset: the player arrived from the email link with a recovery session and picks a new password. */
export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, emptyAuthState);
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState('');
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    const fd = new FormData(e.currentTarget);
    if (fd.get('password') !== fd.get('confirmPassword')) { e.preventDefault(); setFormError('รหัสผ่านทั้งสองช่องไม่ตรงกัน'); return; }
    setFormError('');
  }
  return <>
    <h1 className="login-title">ตั้งรหัสผ่านใหม่</h1>
    <p className="login-sub">ใช้อย่างน้อย 8 ตัวอักษร แล้วเดินทางต่อได้เลย</p>
    <form className="login-form" action={action} onSubmit={onSubmit}>
      <label className="login-field"><span>รหัสผ่านใหม่</span>
        <span className="login-password"><input name="password" type={showPw ? 'text' : 'password'} placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete="new-password" minLength={8} required disabled={pending} />
          <button type="button" className="login-reveal" onClick={() => setShowPw(v => !v)} aria-pressed={showPw}>{showPw ? 'ซ่อน' : 'แสดง'}</button></span></label>
      <label className="login-field"><span>ยืนยันรหัสผ่านใหม่</span>
        <input name="confirmPassword" type={showPw ? 'text' : 'password'} placeholder="พิมพ์รหัสผ่านอีกครั้ง" autoComplete="new-password" minLength={8} required disabled={pending} /></label>
      {formError && <p className="login-alert" role="alert">{formError}</p>}
      <button type="submit" className="login-submit" disabled={pending}>{pending ? 'กำลังบันทึก…' : 'บันทึกรหัสผ่านใหม่'}</button>
    </form>
    {state.message && <p className={state.error ? 'login-alert' : 'login-ok'} role={state.error ? 'alert' : 'status'}>{state.message}</p>}
  </>;
}
