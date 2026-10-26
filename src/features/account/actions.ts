"use server";
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { serverClient } from '@/lib/supabase/server';
import { authMessage, type AuthState } from './messages';
async function accountMode() { (await cookies()).set('liferpg-mode','account',{httpOnly:true,sameSite:'lax',path:'/',secure:process.env.NODE_ENV==='production' && (await headers()).get('x-forwarded-proto')==='https'}); }
export async function authenticate(_previous: AuthState, form: FormData): Promise<AuthState> {
  const client = await serverClient();
  if (!client) return { message: 'ยังไม่ได้ตั้งค่าฐานข้อมูล', error: true };
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const signup = form.get('action') === 'signup';
  if (signup && password !== String(form.get('confirmPassword') ?? '')) return {message:'รหัสผ่านทั้งสองช่องไม่ตรงกัน กรุณาตรวจอีกครั้ง',error:true};
  if (!email || password.length < 8 || email.length > 254 || password.length > 1024) return {message:'กรอกอีเมลและรหัสผ่านอย่างน้อย 8 ตัวอักษร',error:true};
  try {
    const origin = (await headers()).get('origin');
    if (!origin || !['http:','https:'].includes(new URL(origin).protocol)) return {message:'เปิดแบบฟอร์มจากเว็บไซต์ liferpg แล้วลองใหม่',error:true};
    const result = signup ? await client.auth.signUp({email,password,options:{emailRedirectTo:`${origin}/auth/callback`}}) : await client.auth.signInWithPassword({email,password});
    if (result.error) return {message:authMessage(result.error.code),error:true};
    if (signup && !result.data.session) return {message:'ตรวจกล่องอีเมลเพื่อยืนยันบัญชี แล้วกลับมาเข้าสู่ระบบ หากมีบัญชีแล้วให้ใช้ปุ่มเข้าสู่ระบบ',error:false};
    await accountMode();
  } catch { return {message:authMessage(),error:true}; }
  redirect('/profile');
}
export async function signInWithGoogle(previous: AuthState): Promise<AuthState> {
  void previous;
  const client = await serverClient();
  if (!client) return { message: 'ยังไม่ได้ตั้งค่าฐานข้อมูล', error: true };
  let url: string;
  try {
    const origin = (await headers()).get('origin');
    if (!origin || !['http:','https:'].includes(new URL(origin).protocol)) return {message:'เปิดแบบฟอร์มจากเว็บไซต์ liferpg แล้วลองใหม่',error:true};
    const {data,error} = await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${origin}/auth/callback`,queryParams:{prompt:'select_account'}}});
    if (error || !data.url) return {message:authMessage(error?.code),error:true};
    url = data.url;
  } catch { return {message:authMessage(),error:true}; }
  redirect(url);
}
export async function signOut(previous: AuthState): Promise<AuthState> {
  void previous;
  const client = await serverClient();
  if (!client) return {message:'ยังไม่ได้ตั้งค่าฐานข้อมูล',error:true};
  try {
    const {data,error:identityError} = await client.auth.getUser();
    if (identityError || !data.user) return {message:'ไม่พบ session กรุณาโหลดหน้าใหม่',error:true};
    const {error} = await client.auth.signOut();
    if (error) return {message:authMessage(error.code),error:true};
    await accountMode();
  } catch { return {message:authMessage(),error:true}; }
  redirect('/profile');
}
export async function updateName(_previous: AuthState, form: FormData): Promise<AuthState> {
  const client = await serverClient();
  if (!client) return {message:'ยังไม่ได้ตั้งค่าฐานข้อมูล',error:true};
  const name=String(form.get('characterName')??'').trim();
  if (!name || name.length>40) return {message:'ใช้ชื่อ 1–40 ตัวอักษร',error:true};
  try {
    const {data,error} = await client.auth.getUser();
    if (error || !data.user) return {message:'กรุณาเข้าสู่ระบบใหม่ก่อนบันทึก',error:true};
    const result=await client.from('profiles').update({character_name:name}).eq('user_id',data.user.id).select('character_name').single();
    if (result.error || !result.data) return {message:'บันทึกชื่อไม่สำเร็จ กรุณาตรวจฐานข้อมูลและลองใหม่',error:true};
    return {message:'บันทึกชื่อแล้ว',error:false};
  } catch { return {message:'บันทึกชื่อไม่สำเร็จ กรุณาลองใหม่',error:true}; }
}
export async function enterDemo() { (await cookies()).set('liferpg-mode','demo',{httpOnly:true,sameSite:'lax',path:'/'}); redirect('/today'); }
export async function enterAccount() { await accountMode(); redirect('/profile'); }
