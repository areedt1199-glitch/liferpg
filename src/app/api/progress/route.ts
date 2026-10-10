import { NextResponse } from 'next/server';
import { requestOrigin } from '@/lib/request-origin';
import { serverClient } from '@/lib/supabase/server';
const privateHeaders = {'Cache-Control':'private, no-store'};
const fail = (message: string, status: number) => NextResponse.json({error:message},{status,headers:privateHeaders});
async function authorized() {
  const client=await serverClient();
  if (!client) return {client:null,error:fail('ยังไม่ได้ตั้งค่าฐานข้อมูล',503)};
  const {data,error}=await client.auth.getUser();
  if (error || !data.user) return {client:null,error:fail('กรุณาเข้าสู่ระบบเพื่อโหลดความก้าวหน้า',401)};
  return {client,error:null};
}
export async function GET() {
  try {
    const auth=await authorized(); if (!auth.client) return auth.error;
    const {data,error}=await auth.client.rpc('liferpg_snapshot');
    if (error || !data) return fail('โหลดความก้าวหน้าไม่สำเร็จ กรุณาตรวจ migration และการเชื่อมต่อ',502);
    return NextResponse.json(data,{headers:privateHeaders});
  } catch { return fail('ติดต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่',502); }
}
export async function POST(request: Request) {
  // Cookie-authenticated writes require a same-origin request. RPC also verifies auth.uid().
  if (request.headers.get('origin') !== requestOrigin(request)) return fail('คำขอนี้มาจากแหล่งที่ไม่รองรับ',403);
  try {
    const auth=await authorized(); if (!auth.client) return auth.error;
    const value=await request.json();
    if (!value || !['select','start_quest','check','start','pause','resume','new','finish','complete','select_career','purchase','equip','boss_attempt','practice'].includes(value.action) || !value.payload || typeof value.payload!=='object') return fail('คำสั่งไม่ถูกต้อง',400);
    // No user ID, timestamp or balances from the browser are forwarded.
    const payload={goalId:value.payload.goalId,questId:value.payload.questId,stepId:value.payload.stepId,checked:value.payload.checked,careerId:value.payload.careerId,itemId:value.payload.itemId,answers:value.payload.answers,taskId:value.payload.taskId};
    const {data,error}=await auth.client.rpc('liferpg_command',{action:value.action,payload});
    if (error || !data) {
      const message=error?.message.includes('PRACTICE_LIMIT')?'วันนี้ฝึกครบ 3 งานแล้ว พรุ่งนี้มาต่อกัน':error?.message.includes('PRACTICE_')?'ยังฝึกงานนี้ไม่ได้ เลือกเส้นทางก่อนหรือโหลดข้อมูลล่าสุด':error?.message.includes('COINS_INSUFFICIENT')?'เหรียญไม่พอสำหรับชุดนี้':error?.message.includes('ITEM_NOT_OWNED')?'ซื้อชุดนี้ก่อนสวมใส่':error?.message.includes('CHECKLIST_INCOMPLETE') ? 'ทำขั้นตอนย่อยให้ครบก่อนยืนยัน' : error?.message.includes('QUEST_') ? 'เควสต์ไม่พร้อมหรือไม่ใช่เควสต์ที่กำลังทำ กรุณาโหลดข้อมูลล่าสุด' : 'บันทึกไม่สำเร็จ กรุณาลองใหม่';
      return fail(message,409);
    }
    return NextResponse.json(data,{headers:privateHeaders});
  } catch { return fail('บันทึกไม่สำเร็จ กรุณาลองใหม่',502); }
}
