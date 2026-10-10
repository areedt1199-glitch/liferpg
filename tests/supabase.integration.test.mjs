import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
const enabled=process.env.LIFERPG_INTEGRATION==='1';
const variables=['LIFERPG_TEST_URL','LIFERPG_TEST_PUBLISHABLE_KEY','LIFERPG_TEST_EMAIL_A','LIFERPG_TEST_PASSWORD_A','LIFERPG_TEST_EMAIL_B','LIFERPG_TEST_PASSWORD_B'];
// Explicit opt-in. Only fresh disposable accounts on an identified test project; never reset users.
test('LIVE Supabase Auth, Data API isolation and concurrent transaction retries',{skip:!enabled},async()=>{
 for(const name of variables)assert.ok(process.env[name],`Missing ${name}`);
 const url=process.env.LIFERPG_TEST_URL,key=process.env.LIFERPG_TEST_PUBLISHABLE_KEY;
 assert.ok(key.startsWith('sb_publishable_'),'Use only a publishable key');
 const create=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const a=create(),b=create(),secondA=create(),anon=create();
 const login=async(client,suffix)=>{
  const result=await client.auth.signInWithPassword({email:process.env[`LIFERPG_TEST_EMAIL_${suffix}`],password:process.env[`LIFERPG_TEST_PASSWORD_${suffix}`]});
  assert.equal(result.error,null,'Test account login failed');return result.data.user.id;
 };
 const snap=async(client)=>{const r=await client.rpc('liferpg_snapshot');assert.equal(r.error,null,'Snapshot failed');return r.data;};
 const command=async(client,action,payload)=>{const r=await client.rpc('liferpg_command',{action,payload});assert.equal(r.error,null,`Command ${action} failed`);return r.data;};
 try{
  const idA=await login(a,'A'),idB=await login(b,'B');assert.notEqual(idA,idB);await login(secondA,'A');
  assert.equal((await a.auth.refreshSession()).error,null,'Session refresh failed');
  for(const client of [a,b]){const p=(await snap(client)).progress;assert.equal(p.selectedGoalId,null,'Use a NEW disposable account');assert.equal(p.activeQuestId,null);assert.equal(p.totalXP,0);assert.equal(Object.keys(p.rewards).length,0);}
  assert.ok((await anon.rpc('liferpg_snapshot')).error,'Anonymous RPC must fail');
  for(const table of ['profiles','user_progress','quest_progress','checklist','focus_sessions','reward_ledger']){
   const r=await a.from(table).select('*').eq('user_id',idB);assert.equal(r.error,null);assert.equal(r.data.length,0,table);
  }
  const otherName=await a.from('profiles').update({character_name:'unauthorized'}).eq('user_id',idB).select();assert.equal(otherName.error,null);assert.equal(otherName.data.length,0);
  assert.ok((await a.from('profiles').update({user_id:idB}).eq('user_id',idA)).error);
  assert.ok((await a.from('quest_definitions').update({xp:999}).eq('id','tools')).error);
  assert.ok((await a.from('quest_progress').update({status:'completed'}).eq('user_id',idA)).error);
  assert.ok((await a.from('reward_ledger').insert({user_id:idA,quest_id:'tools',xp:999,coins:999,total_xp_before:0,completed_at:new Date().toISOString()})).error);
  await command(a,'select',{goalId:'first-game'});
  assert.ok((await a.rpc('liferpg_command',{action:'start_quest',payload:{questId:'variables'}})).error);
  await command(a,'start_quest',{questId:'tools'});
  assert.ok((await a.rpc('liferpg_command',{action:'complete',payload:{questId:'tools'}})).error);
  const steps=await a.from('quest_steps').select('id').eq('quest_id','tools');assert.equal(steps.error,null);
  for(const step of steps.data)await command(a,'check',{questId:'tools',stepId:step.id,checked:true});
  await Promise.all([command(a,'start',{questId:'tools'}),command(secondA,'start',{questId:'tools'})]);
  const sessions=await a.from('focus_sessions').select('id').eq('user_id',idA).eq('status','running');assert.equal(sessions.data.length,1);
  await command(a,'pause',{questId:'tools'});const paused=(await snap(a)).progress.focus.tools.totalMs;
  assert.equal((await snap(a)).progress.focus.tools.totalMs,paused);
  await command(a,'resume',{questId:'tools'});
  const results=await Promise.all([command(a,'complete',{questId:'tools',userId:idB,xp:999}),command(secondA,'complete',{questId:'tools'})]);
  const reward=await a.from('quest_definitions').select('xp,coins').eq('id','tools').single();assert.equal(reward.error,null);
  for(const result of results){assert.equal(result.progress.totalXP,reward.data.xp);assert.equal(result.progress.coins,reward.data.coins);assert.equal(result.progress.quests.variables,'available');assert.equal(result.progress.quests.loops,'locked');assert.equal(result.progress.activeQuestId,null);assert.notEqual(result.progress.focus.tools.round.status,'running');}
  const retry=await command(a,'complete',{questId:'tools'});assert.equal(retry.progress.totalXP,reward.data.xp);
  const ledger=await a.from('reward_ledger').select('*').eq('user_id',idA);assert.equal(ledger.data.length,1);
  assert.equal((await snap(b)).progress.totalXP,0);
  assert.equal((await a.auth.signOut()).error,null);assert.ok((await a.rpc('liferpg_snapshot')).error,'Signed-out client must lose access');
 }finally{await Promise.all([a.auth.signOut(),b.auth.signOut(),secondA.auth.signOut()]);}
});
