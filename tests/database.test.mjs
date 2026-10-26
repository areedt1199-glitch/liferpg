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
 await db.exec(`create role anon; create role authenticated; create role service_role; create schema auth; create table auth.users(id uuid primary key);
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
/** The server records the teacher's verdict with the secret key (service_role); before that migration there is nothing to pass. */
async function passReview(tx,questId,verdict='pass'){
 if(!(await tx.query("select to_regclass('public.quest_reviews') as t")).rows[0].t)return;
 const uid=(await tx.query('select auth.uid() as u')).rows[0].u;
 await tx.exec('set local role service_role');
 await tx.query('select public.liferpg_record_review($1,$2,$3,$4,$5)',[uid,questId,verdict,'งานครบตามเงื่อนไข','']);
 await tx.exec('set local role authenticated');
}
async function fullChecklistAndBoss(tx,questId){
 const {rows}=await tx.query('select id from public.quest_steps where quest_id=$1 order by position',[questId]);
 for(const step of rows)await command(tx,'check',{questId,stepId:step.id,checked:true});
 await passReview(tx,questId);
 await command(tx,'boss_attempt',{questId,answers:ANSWERS[questId]});
}
test('SQL migrations, seed replay, RLS ownership, grants and helper restrictions',async()=>{
 const db=await database();
 try {
  await asUser(db,A,tx=>snapshot(tx)); await asUser(db,B,tx=>snapshot(tx));
  await db.exec(fs.readFileSync('supabase/seed.sql','utf8')); await db.exec(fs.readFileSync('supabase/seed.sql','utf8'));
  assert.equal((await db.query('select count(*)::int as n from public.quest_definitions')).rows[0].n,352);
  assert.equal((await db.query('select count(*)::int as n from public.quest_steps')).rows[0].n,1056);
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
  assert.equal(tables.length,29); assert.ok(tables.every(t=>t.relrowsecurity));
 } finally {await db.close();}
});
test('SQL atomic completion uses server rewards, checklist and unique ledger; retries preserve elapsed',async()=>{
 const db=await database();
 try {
  await asUser(db,A,tx=>command(tx,'select',{goalId:'first-game'}));
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'start_quest',{questId:'variables'})),/QUEST_UNAVAILABLE/);
  await asUser(db,A,tx=>command(tx,'start_quest',{questId:'tools'}));
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'complete',{questId:'tools'})),/CHECKLIST_INCOMPLETE/);
  let p=await asUser(db,A,tx=>snapshot(tx)); assert.equal(p.progress.totalXP,0);assert.equal(p.progress.goals['first-game'].activeQuestId,'tools');
  await asUser(db,A,async tx=>{await fullChecklistAndBoss(tx,'tools');await command(tx,'start',{questId:'tools'});await command(tx,'start',{questId:'tools'});});
  assert.equal((await db.query('select count(*)::int as n from public.focus_sessions')).rows[0].n,1);
  await db.query("update public.focus_sessions set started_at=clock_timestamp()-interval '10 seconds' where user_id=$1",[A]);
  p=await asUser(db,A,tx=>command(tx,'complete',{questId:'tools',xp:999,userId:B,now:0}));
  assert.equal(p.progress.totalXP,120);assert.equal(p.progress.coins,105);assert.equal(p.progress.goals['first-game'].activeQuestId,null);
  assert.equal(p.progress.quests.variables,'available');assert.equal(p.progress.quests.loops,'locked');
  const elapsed=p.progress.focus.tools.totalMs;assert.ok(elapsed>=10000&&elapsed<20000);assert.equal(p.progress.focus.tools.round.status,'paused');
  const repeat=await asUser(db,A,tx=>command(tx,'complete',{questId:'tools'}));
  assert.deepEqual(repeat.progress,p.progress);
  assert.equal((await db.query('select count(*)::int as n from public.reward_ledger')).rows[0].n,1);
  const b=await asUser(db,B,tx=>snapshot(tx));assert.equal(b.progress.totalXP,0);assert.deepEqual(b.progress.goals,{});
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
  assert.equal(expired.progress.quests.tools,'in_progress');assert.equal(expired.progress.totalXP,0);assert.equal(expired.progress.goals['first-game'].activeQuestId,'tools');
  await asUser(db,A,tx=>command(tx,'new',{questId:'tools'}));await asUser(db,A,tx=>command(tx,'new',{questId:'tools'}));
  assert.equal((await db.query('select count(*)::int as n from public.focus_sessions')).rows[0].n,2);
  for(const id of ['tools','variables','loops','guess-number','improve-game','functions','high-score','publish-game']){
   await asUser(db,A,async tx=>{if(id!=='tools')await command(tx,'start_quest',{questId:id});await fullChecklistAndBoss(tx,id);await command(tx,'complete',{questId:id});});
  }
  const final=await asUser(db,A,tx=>snapshot(tx));assert.equal(final.progress.totalXP,930);assert.equal(final.progress.coins,915);assert.ok(final.progress.goals['first-game'].completedAt);assert.equal(final.progress.rewards.length,8);
 }finally{await db.close();}
});

test('SQL skins use latest funds, outfits are retired, owner-only access and AI quota',async()=>{
 const db=await database();try{
  await asUser(db,A,tx=>command(tx,'select_career',{careerId:'ui_ux_designer'}));
  const initial=await asUser(db,A,tx=>snapshot(tx));assert.equal(initial.progress.careerId,'ui_ux_designer');assert.equal(initial.progress.version,8);assert.equal(initial.progress.equippedSkinId,'swordsman');
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
  await asUser(db,A,async tx=>{const {rows}=await tx.query("select id from public.quest_steps where quest_id='publish-game'");for(const r of rows)await command(tx,'check',{questId:'publish-game',stepId:r.id,checked:true});await passReview(tx,'publish-game');});
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
  assert.equal(p.progress.version,8);assert.equal(p.progress.totalXP,10);assert.equal(p.progress.coins,15);
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

test('SQL tech paths: every catalog path and task exists, and a new path can be practiced',async()=>{
 const db=await database();
 try {
  const catalog=JSON.parse(fs.readFileSync('src/features/careers/catalog.json','utf8'));
  const {rows}=await db.query('select career_id,id from public.career_tasks');const have=new Set(rows.map(r=>`${r.career_id}|${r.id}`));
  for(const c of catalog)for(const t of c.tasks)assert.ok(have.has(`${c.id}|${t.id}`),`missing ${c.id}|${t.id}`);
  await asUser(db,A,tx=>command(tx,'select_career',{careerId:'ai_engineer'}));
  const p=await asUser(db,A,tx=>command(tx,'practice',{taskId:'call_llm_api'}));
  assert.equal(p.progress.careerId,'ai_engineer');assert.equal(Object.values(p.progress.practice)[0].taskId,'call_llm_api');
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'practice',{taskId:'learn_cpp'})),/PRACTICE_TASK_INVALID/);
 }finally{await db.close();}
});

// The browser must accept every server snapshot: parse it with the same client rules.
const {loadTs}=await import('../scripts/load-ts.mjs');
const clientRules=loadTs('src/features/journey/progress.ts');
const accept=snap=>clientRules.parseProgress(JSON.stringify(snap.progress));
async function clearQuest(tx,questId){await fullChecklistAndBoss(tx,questId);return command(tx,'complete',{questId});}

test('SQL multi-goal: several goals at once, one timer, abandon keeps rewards, redo pays XP but no coins',async()=>{
 const db=await database();
 try{
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'add_goal',{goalId:'nope'})),/GOAL_INVALID/);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'start_quest',{questId:'python.python_syntax'})),/GOAL_NOT_ADDED/);
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'abandon_goal',{goalId:'python'})),/GOAL_NOT_ADDED/);
  let p=await asUser(db,A,async tx=>{await command(tx,'add_goal',{goalId:'first-game'});await command(tx,'add_goal',{goalId:'python'});return command(tx,'add_goal',{goalId:'python'});});
  assert.deepEqual(Object.keys(p.progress.goals).sort(),['first-game','python']);assert.equal(p.progress.quests['python.python_syntax'],'available');accept(p);
  // One active quest per goal, both goals in progress together; starting a timer pauses the other goal's timer.
  await asUser(db,A,async tx=>{await command(tx,'start_quest',{questId:'tools'});await command(tx,'start_quest',{questId:'python.python_syntax'});await command(tx,'start',{questId:'tools'});});
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'start_quest',{questId:'variables'})),/QUEST_UNAVAILABLE/);
  p=await asUser(db,A,tx=>command(tx,'start',{questId:'python.python_syntax'}));
  assert.equal(p.progress.focus.tools.round.status,'paused');assert.equal(p.progress.focus['python.python_syntax'].round.status,'running');accept(p);
  p=await asUser(db,A,tx=>clearQuest(tx,'python.python_syntax'));
  assert.equal(p.progress.totalXP,80);assert.equal(p.progress.coins,60);assert.equal(p.progress.quests['python.python_collections'],'available');assert.equal(p.progress.goals.python.activeQuestId,null);accept(p);
  // Abandon: map progress is gone, rewards stay.
  p=await asUser(db,A,tx=>command(tx,'abandon_goal',{goalId:'python'}));
  assert.equal(p.progress.goals.python,undefined);assert.equal(p.progress.quests['python.python_syntax'],undefined);assert.equal(p.progress.bosses['python.python_syntax'],undefined);
  assert.equal(p.progress.totalXP,80);assert.equal(p.progress.coins,60);assert.equal(p.progress.rewards.length,1);assert.equal(p.progress.goals['first-game'].activeQuestId,'tools');accept(p);
  assert.equal((await db.query("select count(*)::int as n from public.focus_sessions where quest_id like 'python.%'")).rows[0].n,0);
  assert.equal((await db.query("select count(*)::int as n from public.checklist where quest_id like 'python.%'")).rows[0].n,0);
  // Re-add starts from level 1; repeating a cleared level pays XP only, a new level pays both.
  p=await asUser(db,A,tx=>command(tx,'add_goal',{goalId:'python'}));assert.equal(p.progress.quests['python.python_syntax'],'available');assert.equal(p.progress.quests['python.python_collections'],'locked');
  p=await asUser(db,A,async tx=>{await command(tx,'start_quest',{questId:'python.python_syntax'});return clearQuest(tx,'python.python_syntax');});
  assert.equal(p.progress.totalXP,160);assert.equal(p.progress.coins,60);assert.deepEqual(p.progress.rewards.map(r=>[r.attempt,r.coins]),[[1,60],[2,0]]);accept(p);
  for(const id of ['python.python_collections','python.python_files','python.python_script','python.adv_oop','python.adv_errors_testing','python.adv_packages','python.adv_python_project'])p=await asUser(db,A,async tx=>{await command(tx,'start_quest',{questId:id});return clearQuest(tx,id);});
  assert.ok(p.progress.goals.python.completedAt);assert.equal(p.progress.coins,60+90+120+150+180+210+240+270);accept(p);
  const b=await asUser(db,B,tx=>snapshot(tx));assert.deepEqual(b.progress.goals,{});assert.deepEqual(b.progress.rewards,[]);accept(b);
  for(const sql of ["delete from public.user_goals",`insert into public.user_goals(user_id,goal_id) values('${A}','godot')`,"select private.goal_command('add_goal','{}'::jsonb)"])await assert.rejects(()=>asUser(db,A,tx=>tx.exec(sql)),undefined,sql);
  assert.equal((await asUser(db,B,tx=>tx.query('select * from public.user_goals where user_id=$1',[A]))).rows.length,0);
 }finally{await db.close();}
});
test('SQL multi-goal upgrade keeps first-game players and drops untouched maps of players without a goal',async()=>{
 const db=await database('20261012180000');
 try{
  await asUser(db,A,async tx=>{await command(tx,'select',{goalId:'first-game'});await command(tx,'start_quest',{questId:'tools'});await clearQuest(tx,'tools');await command(tx,'start_quest',{questId:'variables'});});
  await asUser(db,B,tx=>snapshot(tx));
  await db.exec(fs.readFileSync('supabase/migrations/20261012180000_multi_goals.sql','utf8'));await loadAnswers(db);
  const a=await asUser(db,A,tx=>snapshot(tx));
  assert.equal(a.progress.version,8);assert.equal(a.progress.goals['first-game'].activeQuestId,'variables');assert.equal(a.progress.quests.tools,'completed');
  assert.equal(a.progress.totalXP,120);assert.equal(a.progress.coins,105);assert.equal(a.progress.rewards[0].goalId,'first-game');accept(a);
  const p=await asUser(db,A,tx=>clearQuest(tx,'variables'));assert.equal(p.progress.totalXP,200);accept(p);
  const b=await asUser(db,B,tx=>snapshot(tx));assert.deepEqual(b.progress.goals,{});assert.deepEqual(b.progress.quests,{});
  assert.equal((await db.query('select count(*)::int as n from public.quest_progress where user_id=$1',[B])).rows[0].n,0);
 }finally{await db.close();}
});
test('SQL eight-level paths: players keep their progress, a finished map reopens at the first new level',async()=>{
 const db=await database('20261013120000');
 try{
  const base=['python.python_syntax','python.python_collections','python.python_files','python.python_script'];
  let a=await asUser(db,A,async tx=>{await command(tx,'add_goal',{goalId:'python'});let p;for(const id of base){await command(tx,'start_quest',{questId:id});p=await clearQuest(tx,id);}return p;});
  assert.ok(a.progress.goals.python.completedAt);
  // A snapshot from before the migration is still read by the 8-level client: missing levels appear, the goal reopens.
  const grown=clientRules.parseProgress(JSON.stringify(a.progress));assert.equal(grown.quests['python.adv_oop'],'available');assert.equal(grown.goals.python.completedAt,null);
  await asUser(db,B,async tx=>{await command(tx,'add_goal',{goalId:'python'});await command(tx,'start_quest',{questId:base[0]});await clearQuest(tx,base[0]);await command(tx,'start_quest',{questId:base[1]});});
  await db.exec(fs.readFileSync('supabase/migrations/20261013120000_eight_level_paths.sql','utf8'));await loadAnswers(db);
  a=await asUser(db,A,tx=>snapshot(tx));
  assert.equal(a.progress.goals.python.completedAt,null);assert.equal(a.progress.quests['python.adv_oop'],'available');assert.equal(a.progress.quests['python.adv_python_project'],'locked');
  assert.equal(a.progress.totalXP,80+100+120+140);accept(a);
  const b=await asUser(db,B,tx=>snapshot(tx));
  assert.equal(b.progress.goals.python.activeQuestId,base[1]);assert.equal(b.progress.quests['python.adv_oop'],'locked');accept(b);
  a=await asUser(db,A,async tx=>{await command(tx,'start_quest',{questId:'python.adv_oop'});return clearQuest(tx,'python.adv_oop');});
  assert.equal(a.progress.coins,60+90+120+150+180);assert.equal(a.progress.quests['python.adv_errors_testing'],'available');accept(a);
  assert.equal((await db.query("select count(*)::int as n from public.quest_definitions where goal_id='python'")).rows[0].n,8);
  assert.equal((await db.query("select place from public.quest_definitions where id='python.python_script'")).rows[0].place,'ดันเจี้ยนแห่งการทดสอบ');
 }finally{await db.close();}
});
test('SQL journal: reflections and one goal per week, owner-only, validated; client accepts the snapshot',async()=>{
 const db=await database();
 try{
  const id=n=>`00000000-0000-4000-8000-00000000010${n}`;
  const note=(n,extra={})=>({id:id(n),kind:'note',questId:'',text:'วันนี้เข้าใจลูปมากขึ้น',week:'',...extra});
  let p=await asUser(db,A,tx=>command(tx,'journal_add',note(1,{questId:'python.python_syntax'})));
  assert.equal(p.progress.journal.length,1);assert.equal(p.progress.journal[0].questId,'python.python_syntax');assert.ok(p.progress.journal[0].createdAt>0);accept(p);
  p=await asUser(db,A,tx=>command(tx,'journal_add',note(2,{kind:'weekly',week:'2026-10-19',text:'ผ่าน 2 ด่าน'})));
  p=await asUser(db,A,tx=>command(tx,'journal_add',note(3,{kind:'weekly',week:'2026-10-19',text:'ผ่าน 3 ด่านและโฟกัส 5 ชั่วโมง'})));
  const weekly=p.progress.journal.filter(j=>j.kind==='weekly');assert.equal(weekly.length,1);assert.equal(weekly[0].id,id(2));assert.equal(weekly[0].text,'ผ่าน 3 ด่านและโฟกัส 5 ชั่วโมง');accept(p);
  assert.equal((await asUser(db,A,tx=>command(tx,'journal_add',note(1,{text:'changed'})))).progress.journal.length,2,'same id is idempotent');
  for(const bad of [{kind:'weekly',week:'2026-10-20'},{kind:'weekly',week:''},{week:'2026-10-19'},{text:'   '},{text:'x'.repeat(501)},{questId:'nope'},{kind:'diary'},{id:'nope'},{text:5}])
   await assert.rejects(()=>asUser(db,A,tx=>command(tx,'journal_add',note(9,bad))),/JOURNAL_INVALID/,JSON.stringify(bad));
  await assert.rejects(()=>asUser(db,B,tx=>command(tx,'journal_add',note(1))),/JOURNAL_INVALID/,'another user cannot reuse an id');
  await asUser(db,B,tx=>command(tx,'journal_remove',{id:id(1)}));
  assert.equal((await asUser(db,B,tx=>tx.query('select * from public.journal_entries where user_id=$1',[A]))).rows.length,0);
  await assert.rejects(()=>asUser(db,A,tx=>tx.exec("delete from public.journal_entries")));
  p=await asUser(db,A,tx=>command(tx,'journal_remove',{id:id(1)}));assert.deepEqual(p.progress.journal.map(j=>j.id),[id(2)]);accept(p);
 }finally{await db.close();}
});
test('SQL quest reviews: only the server records verdicts, a pass is required before the boss and completion, and it sticks',async()=>{
 const db=await database();
 try{
  await asUser(db,A,async tx=>{await command(tx,'add_goal',{goalId:'python'});await command(tx,'start_quest',{questId:'python.python_syntax'});
   const {rows}=await tx.query("select id from public.quest_steps where quest_id='python.python_syntax'");for(const r of rows)await command(tx,'check',{questId:'python.python_syntax',stepId:r.id,checked:true});});
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'boss_attempt',{questId:'python.python_syntax',answers:ANSWERS['python.python_syntax']})),/REVIEW_REQUIRED/);
  // Players cannot write or fake a verdict.
  await assert.rejects(()=>asUser(db,A,tx=>tx.query("select public.liferpg_record_review(auth.uid(),'python.python_syntax','pass','x','')")));
  await assert.rejects(()=>asUser(db,A,tx=>tx.exec("insert into public.quest_reviews(user_id,quest_id,verdict,passed_at) values(auth.uid(),'python.python_syntax','pass',now())")));
  // The server can only review a quest that is in progress.
  await assert.rejects(()=>asUser(db,A,tx=>passReview(tx,'python.python_collections')),/REVIEW_QUEST_NOT_ACTIVE/);
  let p=await asUser(db,A,async tx=>{await passReview(tx,'python.python_syntax','fail');return snapshot(tx);});
  assert.equal(p.progress.reviews['python.python_syntax'].verdict,'fail');assert.equal(p.progress.reviews['python.python_syntax'].passedAt,null);accept(p);
  p=await asUser(db,A,async tx=>{await passReview(tx,'python.python_syntax');await passReview(tx,'python.python_syntax','fail');return snapshot(tx);});
  const r=p.progress.reviews['python.python_syntax'];assert.equal(r.attempts,3);assert.equal(r.verdict,'fail');assert.ok(r.passedAt>0,'a pass is kept');accept(p);
  p=await asUser(db,A,async tx=>{await command(tx,'boss_attempt',{questId:'python.python_syntax',answers:ANSWERS['python.python_syntax']});return command(tx,'complete',{questId:'python.python_syntax'});});
  assert.equal(p.progress.quests['python.python_syntax'],'completed');accept(p);
  assert.equal((await asUser(db,B,tx=>tx.query('select * from public.quest_reviews where user_id=$1',[A]))).rows.length,0);
  p=await asUser(db,A,tx=>command(tx,'abandon_goal',{goalId:'python'}));assert.deepEqual(p.progress.reviews,{});accept(p);
 }finally{await db.close();}
});
test('SQL daily plan: validated slots per day, owner-only, done toggle and remove; client accepts the snapshot',async()=>{
 const db=await database();
 try{
  const id=n=>`00000000-0000-4000-8000-00000000000${n}`;
  const slot=(n,extra={})=>({id:id(n),day:'2026-10-20',start:'19:00',minutes:25,kind:'note',ref:'',note:'อ่านหนังสือ',done:false,...extra});
  let p=await asUser(db,A,tx=>command(tx,'plan_add',slot(1)));
  assert.equal(p.progress.plans.length,1);assert.deepEqual(p.progress.plans[0],slot(1));accept(p);
  p=await asUser(db,A,tx=>command(tx,'plan_add',slot(2,{start:'08:30',kind:'quest',ref:'python.python_syntax',note:''})));
  p=await asUser(db,A,tx=>command(tx,'plan_add',slot(3,{day:'2026-10-21',kind:'practice',ref:'python|python_syntax',note:''})));
  assert.deepEqual(p.progress.plans.map(x=>x.start+'/'+x.kind),['08:30/quest','19:00/note','19:00/practice']);accept(p);
  assert.equal((await asUser(db,A,tx=>command(tx,'plan_add',slot(1,{note:'changed'})))).progress.plans.length,3,'same id is idempotent');
  for(const bad of [{day:'2026-02-30'},{start:'25:00'},{minutes:3},{minutes:'25'},{kind:'quest',ref:'nope'},{kind:'practice',ref:'python|nope'},{kind:'note',note:'  '},{note:'x'.repeat(81)},{done:'no'},{id:'not-a-uuid'}])
   await assert.rejects(()=>asUser(db,A,tx=>command(tx,'plan_add',slot(9,bad))),/PLAN_INVALID/,JSON.stringify(bad));
  await assert.rejects(()=>asUser(db,B,tx=>command(tx,'plan_add',slot(1))),/PLAN_INVALID/,'another user cannot reuse an id');
  await asUser(db,A,async tx=>{for(let n=0;n<10;n++)await command(tx,'plan_add',slot(0,{id:`00000000-0000-4000-8000-0000000001${n}0`,start:`1${n}:00`}));});
  await assert.rejects(()=>asUser(db,A,tx=>command(tx,'plan_add',slot(4,{start:'23:00'}))),/PLAN_LIMIT/);
  p=await asUser(db,A,tx=>command(tx,'plan_done',{id:id(1),done:true}));assert.equal(p.progress.plans.find(x=>x.id===id(1)).done,true);
  await assert.rejects(()=>asUser(db,B,tx=>command(tx,'plan_done',{id:id(1),done:true})),/PLAN_INVALID/);
  await asUser(db,B,tx=>command(tx,'plan_remove',{id:id(1)}));
  p=await asUser(db,A,tx=>command(tx,'plan_remove',{id:id(1)}));assert.equal(p.progress.plans.some(x=>x.id===id(1)),false);accept(p);
  assert.equal((await asUser(db,B,tx=>tx.query('select * from public.plan_items where user_id=$1',[A]))).rows.length,0);
  await assert.rejects(()=>asUser(db,A,tx=>tx.exec("delete from public.plan_items")));
 }finally{await db.close();}
});
test('SQL social: portfolios are opt-in and read-only to anyone, guilds need a code and members only see their own board',async()=>{
 const db=await database();
 try{
  const guild=(tx,action,payload={})=>tx.query('select public.liferpg_guild($1,$2::jsonb) as value',[action,JSON.stringify(payload)]).then(r=>r.rows[0].value);
  const portfolio=async(role,h)=>db.transaction(async tx=>{await tx.exec(`set local role ${role}`);return (await tx.query('select public.liferpg_portfolio($1) as value',[h])).rows[0].value;});
  await asUser(db,A,async tx=>{await command(tx,'add_goal',{goalId:'python'});await command(tx,'start_quest',{questId:'python.python_syntax'});await fullChecklistAndBoss(tx,'python.python_syntax');await command(tx,'complete',{questId:'python.python_syntax'});});
  await asUser(db,B,tx=>snapshot(tx));
  // Private until the player publishes; handles are validated and unique.
  await asUser(db,A,tx=>tx.query("update public.profiles set handle='leaf_a' where user_id=auth.uid()"));
  assert.equal(await portfolio('anon','leaf_a'),null);
  await assert.rejects(()=>asUser(db,B,tx=>tx.query("update public.profiles set handle='leaf_a' where user_id=auth.uid()")));
  await assert.rejects(()=>asUser(db,B,tx=>tx.query("update public.profiles set handle='No Spaces!' where user_id=auth.uid()")));
  await assert.rejects(()=>asUser(db,B,tx=>tx.query("update public.profiles set is_public=true where user_id=auth.uid()")),/public_needs_handle/);
  assert.equal((await asUser(db,B,tx=>tx.query("update public.profiles set is_public=true where user_id=$1 returning user_id",[A]))).rows.length,0);
  await asUser(db,A,tx=>tx.query("update public.profiles set is_public=true where user_id=auth.uid()"));
  const pub=await portfolio('anon','LEAF_A');
  assert.equal(pub.handle,'leaf_a');assert.equal(pub.quests.length,1);assert.equal(pub.quests[0].questId,'python.python_syntax');assert.equal(pub.quests[0].reviewed,true);
  assert.equal(pub.goals[0].goalId,'python');assert.equal(pub.goals[0].done,1);assert.equal(pub.bosses,1);assert.ok(pub.totalXP>0);
  assert.equal('coins' in pub || 'journal' in pub,false);
  // Guilds: tables are closed; create/join by code, weekly board for members only.
  await assert.rejects(()=>asUser(db,B,tx=>tx.query('select * from public.guilds')));
  await assert.rejects(()=>portfolio('anon','x').then(()=>db.transaction(async tx=>{await tx.exec('set local role anon');await tx.query("select public.liferpg_guild('list','{}')");})));
  const made=await asUser(db,A,tx=>guild(tx,'create',{name:'ห้อง ม.5/1'}));
  const code=made.guilds[0].code;assert.match(code,/^[A-HJ-NP-Z2-9]{6}$/);assert.equal(made.guilds[0].isOwner,true);
  await assert.rejects(()=>asUser(db,B,tx=>guild(tx,'board',{id:made.id})),/GUILD_NOT_MEMBER/);
  await assert.rejects(()=>asUser(db,B,tx=>guild(tx,'join',{code:'ZZZZZZ'})),/GUILD_NOT_FOUND/);
  const joined=await asUser(db,B,tx=>guild(tx,'join',{code:code.toLowerCase()}));assert.equal(joined.guilds[0].members,2);
  const board=await asUser(db,B,tx=>guild(tx,'board',{id:made.id}));
  assert.equal(board.members.length,2);assert.equal(board.members[0].handle,'leaf_a');assert.ok(board.members[0].weekXP>0);assert.equal(board.members[1].isMe,true);
  // The owner leaving hands the guild over; the last member leaving removes it.
  await asUser(db,A,tx=>guild(tx,'leave',{id:made.id}));
  assert.equal((await asUser(db,B,tx=>guild(tx,'list'))).guilds[0].isOwner,true);
  await asUser(db,B,tx=>guild(tx,'leave',{id:made.id}));
  assert.equal((await db.query('select count(*)::int as n from public.guilds')).rows[0].n,0);
 }finally{await db.close();}
});
