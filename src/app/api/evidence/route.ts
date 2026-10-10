import {NextResponse} from 'next/server';
import {serverClient} from '@/lib/supabase/server';
import {requestOrigin} from '@/lib/request-origin';
import {findQuest} from '@/features/journey/definitions';
import {validateImageInfo,MAX_IMAGE_BYTES} from '@/features/evidence/types';
const headers={'Cache-Control':'private, no-store'};
const fail=(error:string,status:number)=>NextResponse.json({error},{status,headers});
async function identity(){const client=await serverClient();if(!client)return null;const {data,error}=await client.auth.getUser();return !error&&data.user?{client,user:data.user}:null;}
export async function GET(request:Request){
 try{const auth=await identity();if(!auth)return fail('กรุณาเข้าสู่ระบบ',401);
 if(new URL(request.url).searchParams.get('ownerId')!==auth.user.id)return fail('บัญชีเปลี่ยนแล้ว กรุณาโหลดใหม่',409);
 const questId=new URL(request.url).searchParams.get('questId');if(!questId||!findQuest(questId))return fail('ไม่พบเควสต์',404);
 const {data,error}=await auth.client.from('quest_evidence').select('path,mime').eq('user_id',auth.user.id).eq('quest_id',questId).maybeSingle();if(error)return fail('โหลดภาพไม่สำเร็จ',502);if(!data)return fail('ยังไม่มีภาพ',404);
 const image=await auth.client.storage.from('quest-evidence').download(data.path);if(image.error||!image.data)return fail('โหลดไฟล์ภาพไม่สำเร็จ',502);
 return new Response(image.data,{headers:{...headers,'Content-Type':data.mime,'X-Content-Type-Options':'nosniff'}});
 }catch{return fail('โหลดภาพไม่สำเร็จ ลองใหม่ได้',502);}
}
export async function POST(request:Request){
 if(request.headers.get('origin')!==requestOrigin(request))return fail('แหล่งคำขอไม่ถูกต้อง',403);
 if(Number(request.headers.get('content-length')??0)>MAX_IMAGE_BYTES+100_000)return fail('ภาพใหญ่เกิน 5 MB',413);
 try{const auth=await identity();if(!auth)return fail('กรุณาเข้าสู่ระบบ',401);
 const form=await request.formData();if(form.get('ownerId')!==auth.user.id)return fail('บัญชีเปลี่ยนแล้ว กรุณาโหลดใหม่',409);const questId=String(form.get('questId')??'');const file=form.get('image');
 if(!findQuest(questId)||!(file instanceof File))return fail('เลือกเควสต์และภาพก่อนบันทึก',400);
 try{validateImageInfo(file.type,file.size);}catch{return fail('ใช้ JPG, PNG หรือ WebP ไม่เกิน 5 MB',400);}
 const bytes=new Uint8Array(await file.arrayBuffer());const valid=file.type==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:file.type==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';if(!valid)return fail('ไฟล์นี้ไม่ใช่ภาพที่รองรับ',400);
 const {data:state,error:stateError}=await auth.client.from('quest_progress').select('status').eq('user_id',auth.user.id).eq('quest_id',questId).maybeSingle();if(stateError||!state||!['in_progress','completed'].includes(state.status))return fail('เริ่มเควสต์ก่อนแนบภาพ',409);
 const previous=await auth.client.from('quest_evidence').select('path').eq('user_id',auth.user.id).eq('quest_id',questId).maybeSingle();if(previous.error)return fail('อ่านบันทึกภาพไม่สำเร็จ',502);
 const id=crypto.randomUUID();const path=`${auth.user.id}/${questId}/${id}.jpg`;
 const upload=await auth.client.storage.from('quest-evidence').upload(path,bytes,{contentType:file.type,upsert:false});if(upload.error)return fail('อัปโหลดไม่สำเร็จ กรุณาลองใหม่',502);
 const saved=await auth.client.rpc('liferpg_command',{action:'evidence_add',payload:{questId,id,path,mime:file.type,size:file.size}});
 if(saved.error){await auth.client.storage.from('quest-evidence').remove([path]);return fail('บันทึกภาพไม่สำเร็จ กรุณาลองใหม่',409);}
 if(previous.data?.path&&previous.data.path!==path)await auth.client.storage.from('quest-evidence').remove([previous.data.path]);
 return NextResponse.json({saved:true},{headers});
 }catch{return fail('บันทึกภาพไม่สำเร็จ ลองใหม่ได้',502);}
}
export async function DELETE(request:Request){
 if(request.headers.get('origin')!==requestOrigin(request))return fail('แหล่งคำขอไม่ถูกต้อง',403);
 try{const auth=await identity();if(!auth)return fail('กรุณาเข้าสู่ระบบ',401);const {questId,ownerId}=await request.json();if(ownerId!==auth.user.id)return fail('บัญชีเปลี่ยนแล้ว กรุณาโหลดใหม่',409);if(!findQuest(questId))return fail('ไม่พบเควสต์',404);
 const previous=await auth.client.from('quest_evidence').select('path').eq('user_id',auth.user.id).eq('quest_id',questId).maybeSingle();if(previous.error)return fail('อ่านบันทึกไม่สำเร็จ',502);
 if(previous.data){const removed=await auth.client.storage.from('quest-evidence').remove([previous.data.path]);if(removed.error)return fail('ลบไฟล์ไม่สำเร็จ กรุณาลองใหม่',502);}
 const saved=await auth.client.rpc('liferpg_command',{action:'evidence_remove',payload:{questId}});if(saved.error)return fail('ลบบันทึกไม่สำเร็จ ลองใหม่ได้',409);return NextResponse.json({saved:true},{headers});
 }catch{return fail('ลบภาพไม่สำเร็จ',502);}
}

