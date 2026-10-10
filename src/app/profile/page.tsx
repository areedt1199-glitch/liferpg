import { cookies } from 'next/headers';
import { IntroPage } from '@/components/ui/intro-page';
import { serverClient } from '@/lib/supabase/server';
import { supabaseConfig } from '@/lib/supabase/config';
import { AccountForms } from '@/features/account/account-forms';
import { enterDemo, enterAccount } from '@/features/account/actions';
export default async function ProfilePage({searchParams}:{searchParams:Promise<{auth?:string}>}) {
 const configured=!!supabaseConfig();
 const mode=(await cookies()).get('liferpg-mode')?.value==='demo'?'demo':'account';
 const client=await serverClient(); let email:string|null=null, name='นักเดินทางใบไม้', problem:string|null=null;
 if(client) {
  try {
   const {data,error}=await client.auth.getUser();
   if(data.user&&!error){
    email=data.user.email??null;
    const {data:snapshot,error:dbError}=await client.rpc('liferpg_snapshot');
    if(dbError)problem='โหลดโปรไฟล์ไม่สำเร็จ กรุณาตรวจ migration และ seed';
    else name=snapshot?.characterName??name;
   } else if(error&&error.name!=='AuthSessionMissingError')problem='ตรวจ session ไม่สำเร็จ กรุณาเข้าสู่ระบบอีกครั้ง';
  }catch{problem='ติดต่อระบบบัญชีไม่สำเร็จ กรุณาลองใหม่';}
 }
 const query=await searchParams;
 return <IntroPage eyebrow="YOUR LITTLE CORNER" title={email?'โปรไฟล์':'ยินดีต้อนรับสู่ liferpg'} description="ทุกก้าวเล็ก ๆ คือจุดเริ่มต้นของการผจญภัย"><section className={`account-panel ${!email&&configured?'auth-card':''}`}>
 {!email&&configured&&<aside className="auth-welcome"><p className="eyebrow">WELCOME, ADVENTURER</p><h2>เริ่มบทใหม่<br/>ในแบบของคุณ</h2><p>เรียนรู้ทีละด่าน เก็บความสำเร็จเล็ก ๆ<br/>แล้วเติบโตไปพร้อมตัวละครของคุณ</p><div className="auth-forest" aria-hidden="true"><span>♧</span><span>♧</span><span>♧</span></div><p className="auth-welcome-note">YOUR LIFE. YOUR QUEST.</p></aside>}
 <div className="auth-content"><p className="sample-label">{mode==='demo'?'กำลังใช้ demo':'โหมดบัญชีจริง'}</p><h2>{configured?'บัญชี liferpg':'ยังไม่ได้ตั้งค่าฐานข้อมูล'}</h2>{!configured?<p>ตั้งค่า Supabase และ environment ตามคู่มือก่อนสมัครหรือเข้าสู่ระบบ<br />ข้อมูล demo เดิมยังอยู่ในเบราว์เซอร์ และไม่ได้อัปโหลดหรือรวมเข้ากับบัญชี</p>:<>{problem&&<p role="alert">{problem}</p>}{query.auth==='error'&&<p role="alert">ยืนยันอีเมลไม่สำเร็จ ลิงก์อาจหมดอายุ กรุณาเข้าสู่ระบบหรือตรวจอีเมลใหม่</p>}<AccountForms email={email} characterName={name}/></>}
 <div className="demo-choice"><h3>อยากลองเล่นก่อน?</h3><p>ข้อมูล demo ในเครื่องแยกจากบัญชีของคุณ</p><form action={mode==='demo'?enterAccount:enterDemo}><button className="text-link">{mode==='demo'?'กลับโหมดบัญชีจริง':'เปิด demo ในเบราว์เซอร์'}</button></form></div></div></section></IntroPage>;
}
