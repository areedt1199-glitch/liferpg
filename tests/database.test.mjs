import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
// Real PostgreSQL SQL engine, with only the Supabase auth.uid/users boundary stubbed.
// This is not a Supabase Auth/PostgREST integration or a multi-connection lock test.
const ANSWERS={};
async function loadAnswers(db){for(const k of Object.keys(ANSWERS))delete ANSWERS[k];for(const r of (await db.query('select b.quest_id,b.id,a.answer from public.boss_questions b join private.boss_answers a on a.question_id=b.id')).rows)(ANSWERS[r.quest_id]??={})[r.id]=r.answer;}
const A='11111111-1111-4111-8111-111111111111', B='22222222-2222-4222-8222-222222222222';
async function database(before='~'){
 const db=await PGlite.create();
 await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 grant usage on schema auth to authenticated;
 insert into auth.users values ('${A}'),('${B}');
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid,name text,bucket_id text);alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated;grant select,insert,delete on storage.objects to authenticated;`);
 for(const file of fs.readdirSync('supabase/migrations').sort().filter(f=>f<before))await db.exec(fs.readFileSync(`supabase/migrations/${file}`,'utf8').replace(/^\uFEFF/,''));
 // Server-side answer key lives in the private schema; read it as superuser so tests can win boss fights.
 await loadAnswers(db);
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
 await command(tx,'boss_attempt',{questId,answers:ANSWERS[questId]});
}
test('SQL migrations, seed replay, RLS ownership, grants and helper restrictions',async()=>{
 const db=await database();
 try {
  await asUser(db,A,tx=>snapshot(tx)); await asUser(db,B,tx=>snapshot(tx));
  await db.exec(fs.readFileSync('supabase/seed.sql','utf8')); await db.exec(fs.readFileSync('supabase/seed.sql','utf8'));
  assert.equal((await db.query('select count(*)::int as n from public.quest_definitions')).rows[0].n,8);
  assert.equal((await db.query('select count(*)::int as n from public.quest_steps')).rows[0].n,24);
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
  assert.equal(tables.length,23); assert.ok(tables.every(t=>t.relrowsecurity));
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
  assert.equal(p.progress.totalXP,120);assert.equal(p.progress.coins,105);assert.equal(p.progress.activeQuestId,null);
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
  for(const id of ['tools','variables','loops','guess-number','improve-game','functions','high-score','publish-game']){
   await asUser(db,A,async tx=>{if(id!=='tools')await command(tx,'start_quest',{questId:id});await fullChecklistAndBoss(tx,id);await command(tx,'complete',{questId:id});});
  }
  const final=await asUser(db,A,tx=>snapshot(tx));assert.equal(final.progress.totalXP,930);assert.equal(final.progress.coins,915);assert.ok(final.progress.goalCompletedAt);assert.equal(Object.keys(final.progress.rewards).length,8);
 }finally{await db.close();}
});

test('SQL skins use latest funds, outfits are retired, owner-only access and AI quota',async()=>{
 const db=await database();try{
  await asUser(db,A,tx=>command(tx,'select_career',{careerId:'ui_ux_designer'}));
  const initial=await asUser(db,A,tx=>snapshot(tx));assert.equal(initial.progress.careerId,'ui_ux_designer');assert.equal(initial.progress.version,7);assert.equal(initial.progress.equippedSkinId,'swordsman');
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'purchase',{itemId:'sunrise'})),/ITEM_RETIRED/);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'buy_skin',{skinId:'monk',coins:0})),/COINS_INSUFFICIENT/);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'equip_skin',{skinId:'monk'})),/SKIN_NOT_OWNED/);
  await asUser(db,A,async tx=>{await command(tx,'select',{goalId:'first-game'});for(const id of ['tools','variables']){await command(tx,'start_quest',{questId:id});await fullChecklistAndBoss(tx,id);await command(tx,'complete',{questId:id});}});
  const bought=await asUser(db,A,tx=>command(tx,'buy_skin',{skinId:'monk',coins:0,userId:B}));assert.equal(bought.progress.coins,15);assert.equal(bought.progress.skins.monk.coins,150);
  const retry=await asUser(db,A,tx=>command(tx,'buy_skin',{skinId:'monk'}));assert.deepEqual(retry.progress,bought.progress);
  const worn=await asUser(db,A,tx=>command(tx,'equip_skin',{skinId:'monk'}));assert.equal(worn.progress.equippedSkinId,'monk');assert.equal(worn.progress.quests.loops,'available');
  const b=await asUser(db,B,tx=>snapshot(tx));assert.equal(b.progress.coins,0);assert.equal(Object.keys(b.progress.skins).length,0);
  assert.equal((await asUser(db,B,tx=>tx.query('select * from public.skin_purchases where user_id=$1',[A]))).rows.length,0);
  for(const sql of ["update public.skin_catalog set price=0","delete from public.skin_purchases","insert into public.item_purchases(user_id,item_id,qty,coins) values ('"+A+"','double',9,1)","update public.user_progress set equipped_skin_id='samurai'","select private.funds('"+A+"')","select private.snapshot_v6()"]){await assert.rejects(()=>asUser(db,A,tx=>tx.exec(sql)),undefined,sql);}
  await asUser(db,A,tx=>tx.exec('select public.liferpg_reserve_ai()'));
  await assert.rejects(()=>asUser(db,A,tx=>tx.exec('select public.liferpg_reserve_ai()')),/AI_RATE_LIMIT/);
 }finally{await db.close();}
});

test('SQL potions: stock, use only in the active fight, x2 shortens the winning answer set for that battle only',async()=>{
 const db=await database();try{
  const bid='3f8fad5b-d9cb-469f-a165-70867728950e',other='4f8fad5b-d9cb-469f-a165-70867728950e';
  await asUser(db,A,async tx=>{await command(tx,'select',{goalId:'first-game'});for(const id of ['tools','variables','loops','guess-number','improve-game','functions','high-score']){await command(tx,'start_quest',{questId:id});await fullChecklistAndBoss(tx,id);await command(tx,'complete',{questId:id});}});
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'buy_item',{itemId:'double',qty:2})),/COINS_INSUFFICIENT/);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'buy_item',{itemId:'hint',qty:10})),/QTY_INVALID/);
  let p=await asUser(db,A,tx=>command(tx,'buy_item',{itemId:'hint',qty:2}));assert.equal(p.progress.coins,435);assert.equal(p.progress.itemPurchases[0].qty,2);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'use_item',{itemId:'hint',questId:'publish-game',battleId:bid})),/QUEST_NOT_ACTIVE/);
  await asUser(db,A,tx=>command(tx,'start_quest',{questId:'publish-game'}));
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'use_item',{itemId:'hint',questId:'publish-game',battleId:'nope'})),/BATTLE_INVALID/);
  await asUser(db,A,async tx=>{await command(tx,'use_item',{itemId:'hint',questId:'publish-game',battleId:bid});await command(tx,'use_item',{itemId:'hint',questId:'publish-game',battleId:bid});});
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'use_item',{itemId:'hint',questId:'publish-game',battleId:bid})),/ITEM_OUT_OF_STOCK/);
  // Earn 315 more via practice days so a x2 potion (750) is affordable.
  await asUser(db,A,tx=>command(tx,'select_career',{careerId:'game_developer'}));
  for(let day=0;day<7;day++){await asUser(db,A,async tx=>{for(const t of ['learn_cpp','practice_unreal','mini_game_project'])await command(tx,'practice',{taskId:t});});
   await db.query("update public.practice_log set practice_day=practice_day-1,completed_at=completed_at-interval '1 day' where user_id=$1",[A]);}
  p=await asUser(db,A,tx=>command(tx,'buy_item',{itemId:'double',qty:1}));assert.equal(p.progress.coins,435+315-750);
  await asUser(db,A,async tx=>{const {rows}=await tx.query("select id from public.quest_steps where quest_id='publish-game'");for(const r of rows)await command(tx,'check',{questId:'publish-game',stepId:r.id,checked:true});});
  await asUser(db,A,tx=>command(tx,'use_item',{itemId:'double',questId:'publish-game',battleId:bid}));
  const key=ANSWERS['publish-game'],ids=Object.keys(key),nine=Object.fromEntries(ids.slice(0,9).map(k=>[k,key[k]]));
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'boss_attempt',{questId:'publish-game',answers:nine,battleId:other})),/BOSS_ANSWERS_INVALID/);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'boss_attempt',{questId:'publish-game',answers:nine})),/BOSS_ANSWERS_INVALID/);
  p=await asUser(db,A,tx=>command(tx,'boss_attempt',{questId:'publish-game',answers:{...nine,[ids[0]]:(key[ids[0]]+1)%4},battleId:bid}));assert.equal(p.progress.bosses['publish-game'].passedAt,null);
  p=await asUser(db,A,tx=>command(tx,'boss_attempt',{questId:'publish-game',answers:nine,battleId:bid}));assert.ok(p.progress.bosses['publish-game'].passedAt);assert.equal(p.progress.bosses['publish-game'].score,10);
  assert.equal(p.progress.itemUses.length,3);
  const bView=await asUser(db,B,tx=>tx.query('select * from public.item_uses where user_id=$1',[A]));assert.equal(bView.rows.length,0);
 }finally{await db.close();}
});

test('SQL shop upgrade triples earned coins and refunds outfit purchases',async()=>{
 const db=await database('20261011140000');
 try{
  await asUser(db,A,async tx=>{await command(tx,'select',{goalId:'first-game'});await command(tx,'start_quest',{questId:'tools'});await fullChecklistAndBoss(tx,'tools');await command(tx,'complete',{questId:'tools'});await command(tx,'purchase',{itemId:'sunrise'});await command(tx,'equip',{itemId:'sunrise'});});
  assert.equal((await asUser(db,A,tx=>snapshot(tx))).progress.coins,5);
  await db.exec(fs.readFileSync('supabase/migrations/20261011140000_shop_v2.sql','utf8'));await loadAnswers(db);
  const p=await asUser(db,A,tx=>snapshot(tx));
  assert.equal(p.progress.version,7);assert.equal(p.progress.coins,105);assert.equal(p.progress.rewards.tools.coins,105);assert.equal(p.progress.equippedSkinId,'swordsman');assert.equal(p.progress.purchases,undefined);
 }finally{await db.close();}
});
test('SQL daily practice uses server day and rewards, caps per day, and coins are spendable',async()=>{
 const db=await database();try{
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'practice',{taskId:'learn_cpp'})),/PRACTICE_CAREER_REQUIRED/);
  await asUser(db,A,tx=>command(tx,'select_career',{careerId:'game_developer'}));
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'practice',{taskId:'not-a-task'})),/PRACTICE_TASK_INVALID/);
  let p=await asUser(db,A,tx=>command(tx,'practice',{taskId:'learn_cpp',xp:999,day:'2000-01-01'}));
  assert.equal(p.progress.version,7);assert.equal(p.progress.totalXP,10);assert.equal(p.progress.coins,15);
  const retry=await asUser(db,A,tx=>command(tx,'practice',{taskId:'learn_cpp'}));assert.deepEqual(retry.progress,p.progress);
  await asUser(db,A,async tx=>{await command(tx,'practice',{taskId:'practice_unreal'});await command(tx,'practice',{taskId:'mini_game_project'});});
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'practice',{taskId:'programming_challenge'})),/PRACTICE_LIMIT/);
  // Yesterday's entries do not count toward today's cap; funds include practice coins.
  await db.query("update public.practice_log set practice_day=practice_day-1,completed_at=completed_at-interval '1 day' where user_id=$1",[A]);
  await asUser(db,A,async tx=>{for(const id of ['learn_cpp','practice_unreal','programming_challenge'])await command(tx,'practice',{taskId:id});});
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'buy_item',{itemId:'hint',qty:1})),/COINS_INSUFFICIENT/);p=await asUser(db,A,tx=>snapshot(tx));assert.equal(p.progress.coins,90);assert.equal(p.progress.totalXP,60);
  assert.equal(Object.keys(p.progress.practice).length,6);
  const b=await asUser(db,B,tx=>snapshot(tx));assert.equal(b.progress.totalXP,0);assert.deepEqual(b.progress.practice,{});
  assert.equal((await asUser(db,B,tx=>tx.query('select * from public.practice_log where user_id=$1',[A]))).rows.length,0);
  for(const sql of ["delete from public.practice_log",`insert into public.practice_log values('${A}',current_date,'game_developer','learn_cpp',now(),10,15)`,"select private.growth_core('purchase','{}'::jsonb)","select private.snapshot_boss()"])await assert.rejects(()=>asUser(db,A,tx=>tx.exec(sql)),undefined,sql);
 }finally{await db.close();}
});
test('SQL 8-level upgrade keeps finished players progress and reopens at level 6; boss totals scale per level',async()=>{
 const db=await database('20261011120000');
 try{
  // Before the upgrade: old 3-question key is answer = position-1.
  const old=async(tx,questId)=>{const {rows}=await tx.query('select id from public.quest_steps where quest_id=$1 order by position',[questId]);for(const s of rows)await command(tx,'check',{questId,stepId:s.id,checked:true});
   const qs=(await tx.query('select id,position from public.boss_questions where quest_id=$1',[questId])).rows;await command(tx,'boss_attempt',{questId,answers:Object.fromEntries(qs.map(q=>[q.id,q.position-1]))});};
  await asUser(db,A,async tx=>{await command(tx,'select',{goalId:'first-game'});for(const id of ['tools','variables','loops','guess-number','improve-game']){await command(tx,'start_quest',{questId:id});await old(tx,id);await command(tx,'complete',{questId:id});}});
  await asUser(db,B,async tx=>{await command(tx,'select',{goalId:'first-game'});await command(tx,'start_quest',{questId:'tools'});});
  assert.ok((await asUser(db,A,tx=>snapshot(tx))).progress.goalCompletedAt);
  await db.exec(fs.readFileSync('supabase/migrations/20261011120000_eight_levels.sql','utf8'));
  await loadAnswers(db);
  const a=await asUser(db,A,tx=>snapshot(tx));
  assert.equal(a.progress.goalCompletedAt,null);assert.equal(a.progress.totalXP,510);assert.equal(a.progress.quests.functions,'available');assert.equal(a.progress.quests['publish-game'],'locked');
  assert.equal(a.progress.bosses.tools.total,3);assert.ok(a.progress.bosses.variables.passedAt,'legacy 3/3 win kept');
  const b=await asUser(db,B,tx=>snapshot(tx));assert.equal(b.progress.activeQuestId,'tools');assert.equal(b.progress.quests.functions,'locked');
  // Level 6 has 8 questions: 7/8 does not pass, a wrong-sized answer set is rejected, 8/8 passes.
  await asUser(db,A,tx=>command(tx,'start_quest',{questId:'functions'}));
  await asUser(db,A,async tx=>{const {rows}=await tx.query("select id from public.quest_steps where quest_id='functions'");for(const s of rows)await command(tx,'check',{questId:'functions',stepId:s.id,checked:true});});
  const key=ANSWERS.functions,ids=Object.keys(key);assert.equal(ids.length,8);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'boss_attempt',{questId:'functions',answers:{[ids[0]]:key[ids[0]]}})),/BOSS_ANSWERS_INVALID/);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'boss_attempt',{questId:'functions',answers:{...key,[ids[0]]:9}})),/BOSS_ANSWERS_INVALID/);
  let p=await asUser(db,A,tx=>command(tx,'boss_attempt',{questId:'functions',answers:{...key,[ids[0]]:(key[ids[0]]+1)%4}}));
  assert.equal(p.progress.bosses.functions.score,7);assert.equal(p.progress.bosses.functions.total,8);assert.equal(p.progress.bosses.functions.passedAt,null);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'complete',{questId:'functions'})),/BOSS_REQUIRED/);
  p=await asUser(db,A,tx=>command(tx,'boss_attempt',{questId:'functions',answers:key}));assert.ok(p.progress.bosses.functions.passedAt);assert.equal(p.progress.bosses.functions.attempts,2);
  p=await asUser(db,A,tx=>command(tx,'complete',{questId:'functions'}));assert.equal(p.progress.totalXP,640);assert.equal(p.progress.quests['high-score'],'available');
  await assert.rejects(()=>asUser(db,A,tx=>tx.exec("select private.command_boss3('boss_attempt','{}'::jsonb)")));
  await assert.rejects(()=>asUser(db,A,tx=>tx.exec('select * from private.boss_answers')));
 }finally{await db.close();}
});
