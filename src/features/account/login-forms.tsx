"use client";
import { useActionState, useState, type FormEvent } from 'react';
import { authenticate } from './actions';
import { emptyAuthState } from './messages';
import { clearAccountView, notifyAccountChanged } from '@/features/journey/progress-store';

const S = {
  tabs: { display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '4px', marginBottom: '24px' } as const,
  tabBtn: { flex: 1, minHeight: '42px', border: 0, borderRadius: '10px', background: 'transparent', color: 'rgba(241,223,173,0.5)', fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' } as const,
  tabActive: { flex: 1, minHeight: '42px', border: 0, borderRadius: '10px', background: '#173e32', color: '#f1dfad', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' } as const,
  heading: { fontSize: '22px', fontWeight: 700, color: '#f8f6ee', margin: '0 0 4px' } as const,
  sub: { fontSize: '13px', color: 'rgba(241,223,173,0.45)', margin: '0 0 20px' } as const,
  field: { marginBottom: '16px' } as const,
  label: { display: 'block', fontSize: '13px', fontWeight: 600, color: 'rgba(241,223,173,0.7)', marginBottom: '6px' } as const,
  inputWrap: { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(241,223,173,0.15)', borderRadius: '12px', overflow: 'hidden' as const } as const,
  icon: { width: '20px', height: '20px', flexShrink: 0, marginLeft: '14px', color: 'rgba(241,223,173,0.35)' } as const,
  input: { flex: 1, minHeight: '48px', padding: '10px 14px', background: 'transparent', border: 0, outline: 'none', color: '#f8f6ee', fontSize: '14px', fontFamily: 'inherit' } as const,
  eye: { flexShrink: 0, border: 0, background: 'transparent', padding: '8px 12px', fontSize: '16px', cursor: 'pointer', color: 'rgba(241,223,173,0.4)' } as const,
  submit: { width: '100%', minHeight: '50px', marginTop: '8px', border: 0, borderRadius: '12px', background: 'linear-gradient(135deg, #173e32 0%, #1f5a48 100%)', color: '#f1dfad', fontSize: '15px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', fontFamily: 'inherit' } as const,
  note: { fontSize: '12px', color: 'rgba(241,223,173,0.4)', textAlign: 'center' as const, marginTop: '14px' } as const,
  error: { fontSize: '13px', color: '#f5a623', background: 'rgba(245,166,35,0.1)', padding: '10px 14px', borderRadius: '10px', marginTop: '10px' } as const,
  success: { fontSize: '13px', color: '#7dd3a0', background: 'rgba(125,211,160,0.1)', padding: '10px 14px', borderRadius: '10px', marginTop: '10px' } as const,
};

export function LoginForms() {
  const [authState, authAction, authPending] = useActionState(authenticate, emptyAuthState);
  const [signup, setSignup] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [formError, setFormError] = useState('');
  const [submittedMode, setSubmittedMode] = useState<boolean | null>(null);

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

  return (
    <>
      <div style={S.tabs} role="group">
        <button type="button" style={!signup ? S.tabActive : S.tabBtn}
          onClick={() => { setSignup(false); setFormError(''); }}>เข้าสู่ระบบ</button>
        <button type="button" style={signup ? S.tabActive : S.tabBtn}
          onClick={() => { setSignup(true); setFormError(''); }}>สมัครสมาชิก</button>
      </div>

      <h2 style={S.heading}>{signup ? 'เริ่มการผจญภัย' : 'ยินดีต้อนรับกลับ'}</h2>
      <p style={S.sub}>{signup ? 'สร้างบัญชีเพื่อเก็บความก้าวหน้า' : 'เข้าสู่ระบบเพื่อเดินทางต่อ'}</p>

      <form key={signup ? 's' : 'l'} action={authAction} onSubmit={onSubmit}>
        <input type="hidden" name="action" value={signup ? 'signup' : 'login'} />

        <div style={S.field}>
          <label style={S.label}>อีเมล</label>
          <div style={S.inputWrap}>
            <svg style={S.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 6 10-6" />
            </svg>
            <input name="email" type="email" placeholder="email@example.com"
              autoComplete="email" required disabled={authPending} style={S.input} />
          </div>
        </div>

        <div style={S.field}>
          <label style={S.label}>รหัสผ่าน</label>
          <div style={S.inputWrap}>
            <svg style={S.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="3" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <input name="password" type={showPw ? 'text' : 'password'}
              placeholder="อย่างน้อย 8 ตัวอักษร" autoComplete={signup ? 'new-password' : 'current-password'}
              minLength={8} required disabled={authPending} style={S.input} />
            <button type="button" style={S.eye} onClick={() => setShowPw(v => !v)}>
              {showPw ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        {signup && (
          <div style={S.field}>
            <label style={S.label}>ยืนยันรหัสผ่าน</label>
            <div style={S.inputWrap}>
              <svg style={S.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="3" /><path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <input name="confirmPassword" type={showCf ? 'text' : 'password'}
                placeholder="รหัสผ่านอีกครั้ง" autoComplete="new-password"
                minLength={8} required disabled={authPending} style={S.input} />
              <button type="button" style={S.eye} onClick={() => setShowCf(v => !v)}>
                {showCf ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        )}

        {formError && <p style={S.error} role="alert">{formError}</p>}

        <button type="submit" disabled={authPending} style={{
          ...S.submit, opacity: authPending ? 0.5 : 1,
        }}>
          {authPending ? 'กำลังส่ง…' : signup ? 'สร้างบัญชี' : 'เข้าสู่ระบบ'}
        </button>

        {signup && <p style={S.note}>หลังสมัคร ให้เปิดอีเมลยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ</p>}
      </form>

      {submittedMode === signup && authState.message && (
        <p style={authState.error ? S.error : S.success} role={authState.error ? 'alert' : 'status'}>
          {authState.message}
        </p>
      )}
    </>
  );
}
