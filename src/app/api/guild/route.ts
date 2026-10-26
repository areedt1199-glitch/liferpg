import { NextResponse } from 'next/server';
import { requestOrigin } from '@/lib/request-origin';
import { serverClient } from '@/lib/supabase/server';
const privateHeaders = {'Cache-Control':'private, no-store'};
const fail = (message: string, status: number) => NextResponse.json({error:message},{status,headers:privateHeaders});
const messages: [string, string][] = [
  ['GUILD_NAME','ตั้งชื่อกิลด์ 1–40 ตัวอักษร'], ['GUILD_OWNED_LIMIT','สร้างกิลด์ได้ไม่เกิน 5 กิลด์'], ['GUILD_LIMIT','อยู่ได้ไม่เกิน 10 กิลด์ ออกจากกิลด์เดิมก่อน'],
  ['GUILD_NOT_FOUND','ไม่พบรหัสกิลด์นี้ ตรวจรหัส 6 ตัวอีกครั้ง'], ['GUILD_FULL','กิลด์นี้เต็มแล้ว (200 คน)'], ['GUILD_NOT_MEMBER','คุณไม่ได้อยู่ในกิลด์นี้แล้ว'],
];
// Guild list, create, join, leave and weekly board. The database checks membership; the browser only names the guild.
export async function POST(request: Request) {
  if (request.headers.get('origin') !== requestOrigin(request)) return fail('คำขอนี้มาจากแหล่งที่ไม่รองรับ',403);
  try {
    const client=await serverClient(); if (!client) return fail('ยังไม่ได้ตั้งค่าฐานข้อมูล',503);
    const {data:identity,error:authError}=await client.auth.getUser();
    if (authError || !identity.user) return fail('เข้าสู่ระบบเพื่อใช้กิลด์',401);
    const value=await request.json();
    if (!value || !['list','create','join','leave','board'].includes(value.action)) return fail('คำสั่งไม่ถูกต้อง',400);
    const payload={name:typeof value.name==='string'?value.name.slice(0,80):undefined,code:typeof value.code==='string'?value.code.slice(0,12):undefined,id:typeof value.id==='string'?value.id:undefined};
    const {data,error}=await client.rpc('liferpg_guild',{action:value.action,payload});
    if (error || !data) return fail(messages.find(([code])=>error?.message.includes(code))?.[1]??'ติดต่อกิลด์ไม่สำเร็จ กรุณาลองใหม่',409);
    return NextResponse.json(data,{headers:privateHeaders});
  } catch { return fail('ติดต่อกิลด์ไม่สำเร็จ กรุณาลองใหม่',502); }
}
