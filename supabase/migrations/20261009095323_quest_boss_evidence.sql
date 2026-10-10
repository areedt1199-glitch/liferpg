create table public.boss_questions(id text primary key,quest_id text not null references public.quest_definitions(id),position integer not null,prompt text not null,options jsonb not null,unique(quest_id,position));
create index boss_questions_quest_idx on public.boss_questions(quest_id);
create table private.boss_answers(question_id text primary key references public.boss_questions(id),answer integer not null check(answer between 0 and 2));
insert into public.boss_questions values
('tools-run','tools',1,'เมื่อเตรียมเครื่องมือแล้ว ควรตรวจอะไรเป็นอย่างแรก?','["รัน Hello World และดูผลลัพธ์","ลบไฟล์ทั้งหมด","เพิ่มระบบใหญ่ทันที"]'::jsonb),
('tools-error','tools',2,'ถ้าโปรแกรมรันไม่ได้ ควรเริ่มจากอะไร?','["ข้ามไปด่านถัดไป","อ่านข้อความผิดพลาดและตรวจคำสั่งรัน","ยืนยันสำเร็จทันที"]'::jsonb),
('tools-save','tools',3,'ควรเก็บไฟล์โปรแกรมไว้ที่ไหน?','["ที่ที่หาไม่เจอ","ไม่ต้องบันทึก","โฟลเดอร์โปรเจกต์ที่จัดไว้"]'::jsonb),
('variables-use','variables',1,'ตัวแปรมีหน้าที่อะไร?','["เก็บค่าที่โปรแกรมนำไปใช้","ทำให้โปรแกรมจบทันที","แทนข้อผิดพลาด"]'::jsonb),
('variables-score','variables',2,'score = 60 และเงื่อนไข score >= 50 จะได้ผลใด?','["ไม่ผ่าน","ผ่าน","ไม่มีผลลัพธ์เสมอ"]'::jsonb),
('variables-test','variables',3,'ควรทดสอบโปรแกรมผ่าน/ไม่ผ่านอย่างไร?','["ทดสอบแต่คะแนนสูง","ไม่ต้องรัน","ทดสอบทั้งคะแนนผ่านและคะแนนไม่ผ่าน"]'::jsonb),
('loops-use','loops',1,'ลูปช่วยเรื่องใด?','["ทำงานซ้ำอย่างเป็นระบบ","ลบตัวแปรทั้งหมด","ทำให้ทุกเงื่อนไขเป็นจริง"]'::jsonb),
('loops-stop','loops',2,'ลูป while ควรมีอะไรเพื่อไม่ให้วนไม่จบ?','["ข้อความยาว","เงื่อนไขหยุดที่เกิดขึ้นได้","สีพื้นหลัง"]'::jsonb),
('loops-count','loops',3,'ทำงานซ้ำ 3 รอบ รอบละพิมพ์หนึ่งครั้ง จะพิมพ์กี่ครั้ง?','["หนึ่งครั้ง","ห้าครั้ง","สามครั้ง"]'::jsonb),
('game-low','guess-number',1,'ถ้าทายน้อยกว่าเลขเป้าหมาย ควรบอกผู้เล่นอย่างไร?','["ลองเลขที่มากขึ้น","ชนะทันที","จบเกมเสมอ"]'::jsonb),
('game-repeat','guess-number',2,'ส่วนใดช่วยให้ผู้เล่นทายได้หลายครั้ง?','["ชื่อตัวแปร","ลูป","การปิดโปรแกรม"]'::jsonb),
('game-win','guess-number',3,'เมื่อเลขทายเท่ากับเป้าหมาย ควรทำอะไร?','["บอกว่าต่ำไป","ไม่แสดงผล","แจ้งว่าทายถูกและจบรอบ"]'::jsonb),
('polish-edge','improve-game',1,'การทดสอบเกมควรครอบคลุมอะไร?','["กรณีปกติและกรณีขอบ/ข้อมูลผิด","เฉพาะกรณีที่เคยผ่าน","เฉพาะชื่อเกม"]'::jsonb),
('polish-retest','improve-game',2,'หลังแก้บั๊กควรทำอะไร?','["ลบผลทดสอบ","รันทดสอบซ้ำเพื่อยืนยันการแก้","ข้ามการตรวจ"]'::jsonb),
('polish-summary','improve-game',3,'สรุปผลงานควรมีอะไร?','["เฉพาะจำนวนไฟล์","เฉพาะสีหน้าจอ","สิ่งที่ทำ วิธีทดสอบ และสิ่งที่อยากปรับ"]'::jsonb)
;
insert into private.boss_answers values
('tools-run',0),
('tools-error',1),
('tools-save',2),
('variables-use',0),
('variables-score',1),
('variables-test',2),
('loops-use',0),
('loops-stop',1),
('loops-count',2),
('game-low',0),
('game-repeat',1),
('game-win',2),
('polish-edge',0),
('polish-retest',1),
('polish-summary',2)
;
create table public.boss_results(user_id uuid not null references public.user_progress(user_id),quest_id text not null references public.quest_definitions(id),score integer not null check(score between 0 and 3),attempts integer not null check(attempts>0),passed_at timestamptz,primary key(user_id,quest_id),check((score=3)=(passed_at is not null)));
create index boss_results_quest_idx on public.boss_results(quest_id);
create table public.quest_evidence(id uuid primary key,user_id uuid not null references public.user_progress(user_id),quest_id text not null references public.quest_definitions(id),path text not null unique,mime text not null check(mime in ('image/jpeg','image/png','image/webp')),size integer not null check(size between 1 and 5242880),created_at timestamptz not null default clock_timestamp(),unique(user_id,quest_id));
create index quest_evidence_quest_idx on public.quest_evidence(quest_id);
alter table public.boss_questions enable row level security;
alter table public.boss_results enable row level security;
alter table public.quest_evidence enable row level security;
revoke all on public.boss_questions,public.boss_results,public.quest_evidence from public,anon,authenticated;
revoke all on private.boss_answers from public,anon,authenticated;
grant select on public.boss_questions,public.boss_results,public.quest_evidence to authenticated;
create policy boss_questions_read on public.boss_questions for select to authenticated using(true);
create policy boss_results_read on public.boss_results for select to authenticated using((select auth.uid())=user_id);
create policy quest_evidence_read on public.quest_evidence for select to authenticated using((select auth.uid())=user_id);

alter function private.snapshot() rename to snapshot_growth;
revoke all on function private.snapshot_growth() from public,anon,authenticated;
create function private.snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;u uuid;bosses jsonb;photos jsonb;
begin
 result:=private.snapshot_growth();u:=auth.uid();
 select coalesce(jsonb_object_agg(quest_id,jsonb_build_object('score',score,'attempts',attempts,'passedAt',case when passed_at is null then null else floor(extract(epoch from passed_at)*1000)::bigint end)),'{}'::jsonb)into bosses from public.boss_results where user_id=u;
 select coalesce(jsonb_object_agg(quest_id,jsonb_build_object('id',id,'questId',quest_id,'path',path,'mime',mime,'size',size,'createdAt',floor(extract(epoch from created_at)*1000)::bigint)),'{}'::jsonb)into photos from public.quest_evidence where user_id=u;
 return jsonb_set(result,'{progress}',(result->'progress')||jsonb_build_object('version',5,'bosses',bosses,'evidence',photos));
end $$;
revoke all on function private.snapshot() from public,anon,authenticated;
grant execute on function private.snapshot() to authenticated;
create or replace function public.liferpg_snapshot() returns jsonb language sql security invoker set search_path='' as $$select private.snapshot();$$;

-- Revoke the former helper so calling it directly cannot bypass the new gate.
alter function private.command(text,jsonb) rename to command_core;
revoke all on function private.command_core(text,jsonb) from public,anon,authenticated;
create function private.command(action text,payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid;q text:=payload->>'questId';p public.user_progress;s text;score integer;answers jsonb:=payload->'answers';
begin
 if action not in ('complete','boss_attempt','evidence_add','evidence_remove')then return private.command_core(action,payload);end if;
 u:=private.ensure_user();select * into p from public.user_progress where user_id=u;
 select status into s from public.quest_progress where user_id=u and quest_id=q;
 if action='complete' and s='completed'then return private.snapshot();end if;
 if action in ('evidence_add','evidence_remove') then
  if s is null or s not in ('in_progress','completed')then raise exception 'QUEST_UNAVAILABLE';end if;
  if action='evidence_remove'then delete from public.quest_evidence where user_id=u and quest_id=q;
  else
   if payload->>'path'<>u::text||'/'||q||'/'||(payload->>'id')||'.jpg' then raise exception 'EVIDENCE_PATH_INVALID';end if;
   if not exists(select 1 from storage.objects where bucket_id='quest-evidence' and name=payload->>'path')then raise exception 'EVIDENCE_FILE_MISSING';end if;
   insert into public.quest_evidence(id,user_id,quest_id,path,mime,size)values((payload->>'id')::uuid,u,q,payload->>'path',payload->>'mime',(payload->>'size')::integer)on conflict(user_id,quest_id)do update set id=excluded.id,path=excluded.path,mime=excluded.mime,size=excluded.size,created_at=clock_timestamp();
  end if;
 else
  if s<>'in_progress' or p.active_quest_id is distinct from q then raise exception 'QUEST_NOT_ACTIVE';end if;
  if exists(select 1 from public.quest_steps t where t.quest_id=q and not exists(select 1 from public.checklist c where c.user_id=u and c.quest_id=q and c.step_id=t.id))then raise exception 'CHECKLIST_INCOMPLETE';end if;
  if action='complete'then
   if not exists(select 1 from public.boss_results where user_id=u and quest_id=q and passed_at is not null)then raise exception 'BOSS_REQUIRED';end if;
   return private.command_core(action,payload);
  end if;
  if exists(select 1 from public.boss_results where user_id=u and quest_id=q and passed_at is not null)then return private.snapshot();end if;
  if jsonb_typeof(answers) is distinct from 'object' then raise exception 'BOSS_ANSWERS_INVALID';end if;
  if (select count(*)from jsonb_object_keys(answers))<>3 or (select count(*)from public.boss_questions where quest_id=q)<>3 or exists(select 1 from public.boss_questions b where b.quest_id=q and (jsonb_typeof(answers->b.id) is distinct from 'number' or (answers->>b.id)!~'^[0-2]$'))then raise exception 'BOSS_ANSWERS_INVALID';end if;
  select count(*)into score from public.boss_questions b join private.boss_answers a on a.question_id=b.id where b.quest_id=q and (answers->>b.id)::integer=a.answer;
  insert into public.boss_results values(u,q,score,1,case when score=3 then clock_timestamp()else null end)on conflict(user_id,quest_id)do update set score=excluded.score,attempts=public.boss_results.attempts+1,passed_at=excluded.passed_at;
 end if;
 update public.user_progress set revision=revision+1 where user_id=u;return private.snapshot();
end $$;
revoke all on function private.command(text,jsonb) from public,anon,authenticated;
grant execute on function private.command(text,jsonb) to authenticated;

-- Private images: no public URL or writes to another account's folder.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)values('quest-evidence','quest-evidence',false,5242880,array['image/jpeg','image/png','image/webp'])on conflict(id)do nothing;
create policy liferpg_evidence_upload on storage.objects for insert to authenticated with check(bucket_id='quest-evidence' and split_part(name,'/',1)=(select auth.uid())::text and exists(select 1 from public.quest_progress where user_id=(select auth.uid()) and quest_id=split_part(name,'/',2) and status in ('in_progress','completed')));
create policy liferpg_evidence_read on storage.objects for select to authenticated using(bucket_id='quest-evidence' and split_part(name,'/',1)=(select auth.uid())::text);
create policy liferpg_evidence_delete on storage.objects for delete to authenticated using(bucket_id='quest-evidence' and split_part(name,'/',1)=(select auth.uid())::text);
