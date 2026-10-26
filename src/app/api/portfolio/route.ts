import { NextResponse } from 'next/server';
import { serverClient } from '@/lib/supabase/server';
const privateHeaders = {'Cache-Control':'private, no-store'};
// The signed-in player's own portfolio link, so share buttons know whether there is a public page to point at.
export async function GET() {
  try {
    const client=await serverClient();
    if (!client) return NextResponse.json({handle:null,isPublic:false},{headers:privateHeaders});
    const {data,error}=await client.auth.getUser();
    if (error || !data.user) return NextResponse.json({error:'กรุณาเข้าสู่ระบบ'},{status:401,headers:privateHeaders});
    const own=await client.from('profiles').select('handle,is_public').eq('user_id',data.user.id).maybeSingle();
    return NextResponse.json({handle:own.data?.handle??null,isPublic:!!own.data?.is_public},{headers:privateHeaders});
  } catch { return NextResponse.json({error:'โหลดไม่สำเร็จ'},{status:502,headers:privateHeaders}); }
}
