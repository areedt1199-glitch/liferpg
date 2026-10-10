import { cookies } from 'next/headers';
import { serverClient } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { LoginForms } from '@/features/account/login-forms';
import { enterDemo } from '@/features/account/actions';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  const configured = !!supabaseConfig();
  const client = await serverClient();

  if (client) {
    try {
      const { data, error } = await client.auth.getUser();
      if (data.user && !error) redirect('/profile');
    } catch { /* stay on login */ }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(160deg, #0a1f18 0%, #173e32 30%, #1a4a3a 50%, #0d2a20 80%, #091a14 100%)',
      padding: '20px',
      fontFamily: '"Noto Sans Thai","Leelawadee UI",Tahoma,system-ui,sans-serif',
    }}>
      <div style={{
        width: '100%', maxWidth: '420px',
        display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
      }}>
        {/* Logo */}
        <h1 style={{
          fontFamily: 'Georgia,"Times New Roman",serif',
          fontSize: 'clamp(42px, 8vw, 56px)',
          fontWeight: 'bold', letterSpacing: '-1px',
          color: '#f1dfad', textAlign: 'center' as const, margin: 0,
        }}>
          Life<span style={{ color: '#956c23' }}>RPG</span>
        </h1>
        <p style={{
          fontSize: '11px', letterSpacing: '3px',
          color: 'rgba(241,223,173,0.5)', margin: '6px 0 28px',
        }}>YOUR LIFE. YOUR QUEST.</p>

        {/* Glass Card */}
        <div style={{
          width: '100%',
          background: 'rgba(255,253,247,0.08)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(241,223,173,0.15)',
          borderRadius: '20px',
          padding: '32px 28px',
        }}>
          {configured ? (
            <LoginForms />
          ) : (
            <div>
              <p style={{ color: '#f5a623' }}>⚠️ ยังไม่ได้ตั้งค่าฐานข้อมูล</p>
              <p style={{ fontSize: '13px', color: 'rgba(241,223,173,0.4)' }}>
                ตั้งค่า Supabase ตามคู่มือก่อนใช้งาน
              </p>
            </div>
          )}
        </div>

        {/* Demo */}
        <div style={{ marginTop: '24px', textAlign: 'center' as const }}>
          <p style={{ fontSize: '12px', color: 'rgba(241,223,173,0.3)', marginBottom: '12px' }}>หรือ</p>
          <form action={enterDemo}>
            <button type="submit" style={{
              border: '1px solid rgba(241,223,173,0.2)',
              background: 'rgba(255,255,255,0.06)',
              color: '#f1dfad', fontSize: '14px',
              padding: '10px 28px', borderRadius: '12px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              🎮 ลองเล่น Demo ก่อน
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
