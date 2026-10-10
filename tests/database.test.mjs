import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
// Real PostgreSQL SQL engine, with only the Supabase auth.uid/users boundary stubbed.
// This is not a Supabase Auth/PostgREST integration or a multi-connection lock test.
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
async function database(){
 const db=await PGlite.create();
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;
 insert into auth.users values ('${A}'),('${B}');
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,name text,bucket_id text);alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
 for(const file of fs.readdirSync('supabase/migrations').sort())await db.exec(fs.readFileSync(`supabase/migrations/${file}`,'utf8').replace(/^\uFEFF/,''));
 return db;
}
async function asUser(db,id,callback){
 return db.transaction(async tx=>{
  await tx.exec('set local role authenticated');
  await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[id]);
  return callback(tx);
 });
}
async function snapshot(tx){return (await tx.query('select public.liferpg_snapshot() as value')).rows[0].value;}
async function command(tx,action,payload){return (await tx.query('select public.liferpg_command($1,$2::jsonb) as value',[action,JSON.stringify(payload)])).rows[0].value;}
async function fullChecklistAndBoss(tx,questId){
 const {rows}=await tx.query('select id from public.quest_steps where quest_id=$1 order by position',[questId]);
 for(const step of rows)await command(tx,'check',{questId,stepId:step.id,checked:true});
 const questions=(await tx.query('select id,position from public.boss_questions where quest_id=$1',[questId])).rows;
 await command(tx,'boss_attempt',{questId,answers:Object.fromEntries(questions.map(q=>[q.id,q.position-1]))});
}
test('SQL migrations, seed replay, RLS ownership, grants and helper restrictions',async()=>{
 const db=await database();
 try {
  await asUser(db,A,tx=>snapshot(tx)); await asUser(db,B,tx=>snapshot(tx));
  await db.exec(fs.readFileSync('supabase/seed.sql','utf8')); await db.exec(fs.readFileSync('supabase/seed.sql','utf8'));
  assert.equal((await db.query('select count(*)::int as n from public.quest_definitions')).rows[0].n,5);
  assert.equal((await db.query('select count(*)::int as n from public.quest_steps')).rows[0].n,15);
  await asUser(db,A,async tx=>{
   for(const table of ['profiles','user_progress','quest_progress','checklist','focus_sessions','reward_ledger']){
    const rows=(await tx.query(`select * from public.${table} where user_id=$1`,[B])).rows;
    assert.equal(rows.length,0,table);
   }
   assert.equal((await tx.query('update public.profiles set character_name=$1 where user_id=$2 returning user_id',['different',B])).rows.length,0);
   assert.equal((await tx.query('update public.profiles set character_name=$1 where user_id=$2 returning character_name',['ใบไม้',A])).rows[0].character_name,'ใบไม้');
  });
  for(const sql of ["update public.quest_definitions set xp=999", "update public.quest_progress set status='completed'", "delete from public.reward_ledger", "insert into public.reward_ledger(user_id,quest_id,completed_at,xp,coins,total_xp_before) values ('"+A+"','tools',now(),999,999,0)", "update public.profiles set user_id='"+B+"'",'select private.ensure_user()',`select private.settle_session('${B}',now(),true)`])
   await assert.rejects(()=>asUser(db,A,tx=>tx.exec(sql)),undefined,sql);
  await assert.rejects(()=>asUser(db,'',tx=>snapshot(tx)),/AUTH_REQUIRED/);
  const tables=(await db.query("select relname,relrowsecurity from pg_class join pg_namespace on pg_namespace.oid=relnamespace where nspname='public' and relkind='r'")).rows;
  assert.equal(tables.length,18); assert.ok(tables.every(t=>t.relrowsecurity));
 } finally {await db.close();}
});
test('SQL atomic completion uses server rewards, checklist and unique ledger; retries preserve elapsed',async()=>{
 const db=await database();
 try {
  await asUser(db,A,tx=>command(tx,'select',{goalId:'first-game'}));
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'start_quest',{questId:'variables'})),/QUEST_UNAVAILABLE/);
  await asUser(db,A,tx=>command(tx,'start_quest',{questId:'tools'}));
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'complete',{questId:'tools'})),/CHECKLIST_INCOMPLETE/);
  let p=await asUser(db,A,tx=>snapshot(tx)); assert.equal(p.progress.totalXP,0);assert.equal(p.progress.activeQuestId,'tools');
  await asUser(db,A,async tx=>{await fullChecklistAndBoss(tx,'tools');await command(tx,'start',{questId:'tools'});await command(tx,'start',{questId:'tools'});});
  assert.equal((await db.query('select count(*)::int as n from public.focus_sessions')).rows[0].n,1);
  await db.query("update public.focus_sessions set started_at=clock_timestamp()-interval '10 seconds' where user_id=$1",[A]);
  p=await asUser(db,A,tx=>command(tx,'complete',{questId:'tools',xp:999,userId:B,now:0}));
  assert.equal(p.progress.totalXP,120);assert.equal(p.progress.coins,35);assert.equal(p.progress.activeQuestId,null);
  assert.equal(p.progress.quests.variables,'available');assert.equal(p.progress.quests.loops,'locked');
  const elapsed=p.progress.focus.tools.totalMs;assert.ok(elapsed>=10000&&elapsed<20000);assert.equal(p.progress.focus.tools.round.status,'paused');
  const repeat=await asUser(db,A,tx=>command(tx,'complete',{questId:'tools'}));
  assert.deepEqual(repeat.progress,p.progress);
  assert.equal((await db.query('select count(*)::int as n from public.reward_ledger')).rows[0].n,1);
  const b=await asUser(db,B,tx=>snapshot(tx));assert.equal(b.progress.totalXP,0);assert.equal(b.progress.activeQuestId,null);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'resume',{questId:'tools'})),/QUEST_NOT_ACTIVE/);
 }finally{await db.close();}
});
test('SQL focus pause/resume/expiry/manual new and full journey preserve server state',async()=>{
 const db=await database();
 try {
  await asUser(db,A,async tx=>{await command(tx,'select',{goalId:'first-game'});await command(tx,'start_quest',{questId:'tools'});await command(tx,'start',{questId:'tools'});});
  await db.query("update public.focus_sessions set started_at=clock_timestamp()-interval '5 seconds' where user_id=$1",[A]);
  const paused=await asUser(db,A,tx=>command(tx,'pause',{questId:'tools'}));
  const again=await asUser(db,A,tx=>snapshot(tx));assert.equal(again.progress.focus.tools.totalMs,paused.progress.focus.tools.totalMs);
  await asUser(db,A,tx=>command(tx,'resume',{questId:'tools'}));
  await db.query("update public.focus_sessions set started_at=clock_timestamp()-interval '1 hour' where user_id=$1",[A]);
  const expired=await asUser(db,A,tx=>snapshot(tx));assert.equal(expired.progress.focus.tools.totalMs,1200000);assert.equal(expired.progress.focus.tools.round.status,'finished');
  assert.equal(expired.progress.quests.tools,'in_progress');assert.equal(expired.progress.totalXP,0);assert.equal(expired.progress.activeQuestId,'tools');
  await asUser(db,A,tx=>command(tx,'new',{questId:'tools'}));await asUser(db,A,tx=>command(tx,'new',{questId:'tools'}));
  assert.equal((await db.query('select count(*)::int as n from public.focus_sessions')).rows[0].n,2);
  for(const id of ['tools','variables','loops','guess-number','improve-game']){
   await asUser(db,A,async tx=>{if(id!=='tools')await command(tx,'start_quest',{questId:id});await fullChecklistAndBoss(tx,id);await command(tx,'complete',{questId:id});});
  }
  const final=await asUser(db,A,tx=>snapshot(tx));assert.equal(final.progress.totalXP,510);assert.equal(final.progress.coins,150);assert.ok(final.progress.goalCompletedAt);assert.equal(Object.keys(final.progress.rewards).length,5);
 }finally{await db.close();}
});

test('SQL growth purchases use latest funds, preserve quests and enforce owner-only access and AI quota',async()=>{
 const db=await database();try{
  await asUser(db,A,tx=>command(tx,'select_career',{careerId:'ui_ux_designer'}));
  const initial=await asUser(db,A,tx=>snapshot(tx));assert.equal(initial.progress.careerId,'ui_ux_designer');assert.equal(initial.progress.version,6);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'purchase',{itemId:'sunrise',coins:0})),/COINS_INSUFFICIENT/);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'equip',{itemId:'sunrise'})),/ITEM_NOT_OWNED/);
  await asUser(db,A,async tx=>{await command(tx,'select',{goalId:'first-game'});await command(tx,'start_quest',{questId:'tools'});await fullChecklistAndBoss(tx,'tools');await command(tx,'complete',{questId:'tools'});});
  const bought=await asUser(db,A,tx=>command(tx,'purchase',{itemId:'sunrise',coins:0,userId:B}));assert.equal(bought.progress.coins,5);assert.equal(bought.progress.totalXP,120);
  const retry=await asUser(db,A,tx=>command(tx,'purchase',{itemId:'sunrise'}));assert.deepEqual(retry.progress,bought.progress);
  const equipped=await asUser(db,A,tx=>command(tx,'equip',{itemId:'sunrise'}));assert.equal(equipped.progress.equippedOutfitId,'sunrise');assert.equal(equipped.progress.quests.variables,'available');
  const b=await asUser(db,B,tx=>snapshot(tx));assert.equal(b.progress.coins,0);assert.equal(Object.keys(b.progress.purchases).length,0);
  assert.equal((await asUser(db,B,tx=>tx.query('select * from public.outfit_purchases where user_id=$1',[A]))).rows.length,0);
  for(const sql of ["update public.outfit_catalog set price=0","delete from public.outfit_purchases","update public.user_progress set equipped_outfit_id='river'","select private.snapshot_core()"]){await assert.rejects(()=>asUser(db,A,tx=>tx.exec(sql)));}
  await asUser(db,A,tx=>tx.exec('select public.liferpg_reserve_ai()'));
  await assert.rejects(()=>asUser(db,A,tx=>tx.exec('select public.liferpg_reserve_ai()')),/AI_RATE_LIMIT/);
 }finally{await db.close();}
});

test('SQL daily practice uses server day and rewards, caps per day, and coins are spendable',async()=>{
 const db=await database();try{
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'practice',{taskId:'learn_cpp'})),/PRACTICE_CAREER_REQUIRED/);
  await asUser(db,A,tx=>command(tx,'select_career',{careerId:'game_developer'}));
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'practice',{taskId:'not-a-task'})),/PRACTICE_TASK_INVALID/);
  let p=await asUser(db,A,tx=>command(tx,'practice',{taskId:'learn_cpp',xp:999,day:'2000-01-01'}));
  assert.equal(p.progress.version,6);assert.equal(p.progress.totalXP,10);assert.equal(p.progress.coins,5);
  const retry=await asUser(db,A,tx=>command(tx,'practice',{taskId:'learn_cpp'}));assert.deepEqual(retry.progress,p.progress);
  await asUser(db,A,async tx=>{await command(tx,'practice',{taskId:'practice_unreal'});await command(tx,'practice',{taskId:'mini_game_project'});});
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'practice',{taskId:'programming_challenge'})),/PRACTICE_LIMIT/);
  // Yesterday's entries do not count toward today's cap; funds include practice coins.
  await db.query("update public.practice_log set practice_day=practice_day-1,completed_at=completed_at-interval '1 day' where user_id=$1",[A]);
  await asUser(db,A,async tx=>{for(const id of ['learn_cpp','practice_unreal','programming_challenge'])await command(tx,'practice',{taskId:id});});
  p=await asUser(db,A,tx=>command(tx,'purchase',{itemId:'sunrise'}));assert.equal(p.progress.coins,0);assert.equal(p.progress.totalXP,60);
  assert.equal(Object.keys(p.progress.practice).length,6);
  const b=await asUser(db,B,tx=>snapshot(tx));assert.equal(b.progress.totalXP,0);assert.deepEqual(b.progress.practice,{});
  assert.equal((await asUser(db,B,tx=>tx.query('select * from public.practice_log where user_id=$1',[A]))).rows.length,0);
  for(const sql of ["delete from public.practice_log",`insert into public.practice_log values('${A}',current_date,'game_developer','learn_cpp',now(),10,5)`,"select private.growth_core('purchase','{}'::jsonb)","select private.snapshot_boss()"])await assert.rejects(()=>asUser(db,A,tx=>tx.exec(sql)),undefined,sql);
 }finally{await db.close();}
});
