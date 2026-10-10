import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Compile the existing pure rules in memory; no additional test dependency.
function loadRules(file, dependencies = {}, environment = {}) {
  const source = fs.readFileSync(file, "utf8");
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { URL, ...environment, exports, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected import: ${name}`);
    return dependencies[name];
  } });
  return exports;
}
const definitions = loadRules("src/features/journey/definitions.ts");
const focusRules = loadRules("src/features/focus/rules.ts");
const shopCatalog=loadRules('src/features/shop/catalog.ts');
const careers=JSON.parse(fs.readFileSync('src/features/careers/catalog.json','utf8'));
const bossRules=loadRules('src/features/boss/catalog.ts');
const evidenceRules=loadRules('src/features/evidence/types.ts');
const chartRules=loadRules('src/features/analytics/rules.ts');
const rules = loadRules("src/features/journey/progress.ts", { '../analytics/rules':chartRules, "./definitions": definitions, "../focus/rules": focusRules, '../careers/catalog.json':{default:careers}, '../shop/catalog':shopCatalog,'../boss/catalog':bossRules,'../evidence/types':evidenceRules });

test("PostgreSQL jsonb key ordering does not invalidate a fresh account snapshot", () => {
  const progress = rules.initialProgress();
  for (const focus of Object.values(progress.focus)) {
    const r = focus.round;
    focus.round = { status:r.status, elapsedMs:r.elapsedMs, startedAt:r.startedAt, durationMs:r.durationMs };
  }
  assert.equal(rules.parseProgress(JSON.stringify(progress)).totalXP, 0);
  assert.equal(rules.parseProgress(JSON.stringify(progress)).activeQuestId, null);
});

test("timer pause, resume, finish and new round preserve ledger without double counting", () => {
  let focus = focusRules.initialFocus(60_000);
  focus = focusRules.changeRound(focus, "start", 1000);
  assert.equal(focusRules.focusView(focus, 11_000).remainingMs, 50_000);
  focus = focusRules.changeRound(focus, "pause", 11_000);
  assert.equal(focusRules.focusView(focus, 91_000).totalMs, 10_000);
  focus = focusRules.changeRound(focus, "resume", 91_000);
  focus = focusRules.settleFocus(focus, 1_000_000);
  assert.equal(focus.round.status, "finished");
  assert.equal(focus.totalMs, 60_000);
  assert.equal(focusRules.settleFocus(focus, 2_000_000).totalMs, 60_000);
  focus = focusRules.changeRound(focus, "new", 2_000_000);
  focus = focusRules.changeRound(focus, "new", 2_000_000);
  assert.equal(focus.round.status, "running");
  assert.equal(focusRules.focusView(focus, 2_005_000).totalMs, 65_000);
  assert.equal(focusRules.focusView(focus, 1_999_000).remainingMs, 60_000);
});
test("invalid focus ledger and step IDs are rejected; countdown cannot become negative", () => {
  let progress = rules.startQuest(rules.selectGoal(rules.initialProgress(), "first-game"), "tools");
  progress = rules.updateRound(progress, "tools", "start", 1000);
  const saved = JSON.stringify(progress);
  for (const mutate of [
    focus => { focus.totalMs = -1; },
    focus => { focus.round.startedAt = null; },
    focus => { focus.checkedStepIds = ["unknown"]; },
    focus => { focus.round.durationMs = 1; },
    focus => { focus.checkedStepIds = ["hello-world", "hello-world"]; },
  ]) {
    const corrupt = JSON.parse(saved);
    mutate(corrupt.focus.tools);
    assert.throws(() => rules.parseProgress(JSON.stringify(corrupt)));
  }
  const view = focusRules.focusView(progress.focus.tools, 9_000_000);
  assert.equal(view.remainingMs, 0);
  assert.equal(view.totalMs, 1_200_000);
  assert.equal(focusRules.formatTime(0, true), "00:00");
  assert.equal(focusRules.formatTime(1001), "00:01");
});
test("version 1 migration preserves active quest and initializes stable checklist IDs", () => {
  const old = { version: 1, selectedGoalId: "first-game", activeQuestId: "tools", quests: { tools: "in_progress", variables: "locked", loops: "locked", "guess-number": "locked", "improve-game": "locked" } };
  const migrated = rules.parseProgress(JSON.stringify(old));
  assert.equal(migrated.version, 7);
  assert.equal(migrated.activeQuestId, "tools");
  assert.equal(migrated.focus.tools.round.status, "idle");
  assert.equal(migrated.focus.tools.totalMs, 0);
  let checked = migrated;
  for (const step of definitions.journeyDefinition.quests[0].steps) checked = rules.updateChecklist(checked, "tools", step.id, true);
  assert.equal(checked.focus.tools.checkedStepIds.length, 3);
  assert.equal(checked.quests.tools, "in_progress");
  assert.equal(checked.quests.variables, "locked");
  checked = rules.updateChecklist(checked, "tools", "hello-world", false);
  assert.equal(checked.focus.tools.checkedStepIds.length, 2);
  assert.throws(() => rules.updateChecklist(checked, "variables", "read-conditions", true));
  assert.throws(() => rules.updateRound(checked, "variables", "start", 1000));
  assert.throws(() => rules.updateChecklist(rules.initialProgress(), "tools", "install-tools", true));
  const saved = rules.parseProgress(JSON.stringify(checked));
  assert.equal(saved.focus.tools.checkedStepIds.join(","), "install-tools,create-file");
});
test("closed running round expires once, restart preserves steps and total", () => {
  let progress = rules.startQuest(rules.selectGoal(rules.initialProgress(), "first-game"), "tools");
  progress = rules.updateChecklist(progress, "tools", "hello-world", true);
  progress = rules.updateRound(progress, "tools", "start", 1000);
  progress = rules.parseProgress(JSON.stringify(progress));
  const expiredAt = 1000 + 20 * 60_000 + 50_000;
  progress = rules.updateRound(progress, "tools", "finish", expiredAt);
  assert.equal(progress.focus.tools.totalMs, 20 * 60_000);
  assert.equal(progress.focus.tools.round.status, "finished");
  progress = rules.updateRound(progress, "tools", "finish", expiredAt + 50_000);
  assert.equal(progress.focus.tools.totalMs, 20 * 60_000);
  progress = rules.updateRound(progress, "tools", "new", expiredAt + 60_000);
  assert.equal(progress.focus.tools.totalMs, 20 * 60_000);
  assert.equal(progress.focus.tools.checkedStepIds[0], "hello-world");
});
test("two tabs serialize simultaneous timer/checklist writes and do not double accumulate", async () => {
  let queue = Promise.resolve();
  const locks = { request: (name, callback) => { const result = queue.then(callback); queue = result.catch(() => {}); return result; } };
  let now = 1000;
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key,value) => data.set(key,value) };
  const tabA = testStore(storage, { locks, now: () => now });
  const tabB = testStore(storage, { locks, now: () => now });
  await tabA.chooseGoal("first-game");
  await tabA.beginQuest("tools");
  await Promise.all([tabA.controlRound("tools", "start"), tabB.controlRound("tools", "start")]);
  now = 11_000;
  await Promise.all([tabA.setStepChecked("tools", "install-tools", true), tabB.setStepChecked("tools", "hello-world", true)]);
  await Promise.all([tabA.controlRound("tools", "pause"), tabB.controlRound("tools", "pause")]);
  const progress = rules.parseProgress(data.get(tabA.STORAGE_KEY));
  assert.equal(progress.focus.tools.totalMs, 10_000);
  assert.equal(progress.focus.tools.checkedStepIds.length, 2);
  now = 100_000;
  assert.equal(focusRules.focusView(progress.focus.tools, now).totalMs, 10_000);
  await tabA.controlRound("tools", "resume");
  now = 9_000_000;
  await Promise.all([tabA.controlRound("tools", "finish"), tabB.controlRound("tools", "finish")]);
  const finished = rules.parseProgress(data.get(tabA.STORAGE_KEY));
  assert.equal(finished.focus.tools.round.status, "finished");
  assert.equal(finished.focus.tools.totalMs, 1_200_000);
  await Promise.all([tabA.controlRound("tools", "new"), tabB.controlRound("tools", "new")]);
  const restarted = rules.parseProgress(data.get(tabA.STORAGE_KEY));
  assert.equal(restarted.focus.tools.round.status, "running");
  assert.equal(restarted.focus.tools.totalMs, 1_200_000);
  assert.equal(restarted.focus.tools.checkedStepIds.length, 2);
});

test("new user has no goal, no active quest, one available and seven locked", () => {
  const progress = rules.initialProgress();
  assert.equal(progress.selectedGoalId, null);
  assert.equal(progress.activeQuestId, null);
  assert.equal(progress.quests.tools, "available");
  assert.equal(Object.values(progress.quests).filter(value => value === "locked").length, 7);
  assert.equal(Object.values(progress.quests).includes("completed"), false);
  assert.equal(rules.canFocus(progress, "tools"), false);
});
function testStore(storage, options = {}) {
  const store = loadRules("src/features/journey/progress-store.ts", {
    "./progress": rules,
    react: { useSyncExternalStore: (subscribe, get) => { subscribe(() => {}); return get(); } },
  }, { AbortSignal: options.AbortSignal ?? AbortSignal, fetch: options.fetch, localStorage: storage, window: { addEventListener() {}, removeEventListener() {} }, document: { addEventListener() {}, removeEventListener() {} }, navigator: { locks: options.locks ?? { request: async (name, callback) => callback() } }, Date: { now: options.now ?? (() => 1000) } });
  store.configureProgress(options.mode ?? "demo");
  store.useProgress();
  return store;
}
test("storage writes survive reloading the store, and repeat start has one active quest", async () => {
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null, setItem: (key,value) => data.set(key,value) };
  const store = testStore(storage);
  assert.equal(await store.chooseGoal("first-game"), true);
  assert.equal(await store.beginQuest("tools"), true);
  assert.equal(await store.beginQuest("tools"), true);
  const reloaded = testStore(storage).useProgress();
  assert.equal(reloaded.progress.activeQuestId, "tools");
  assert.equal(Object.values(reloaded.progress.quests).filter(value => value === "in_progress").length, 1);
  assert.equal(reloaded.progress.quests.variables, "locked");
});
test("blocked writes and corrupt data do not claim success or overwrite stored data", async () => {
  const selected = rules.selectGoal(rules.initialProgress(), "first-game");
  const store = testStore({ getItem: () => JSON.stringify(selected), setItem: () => { throw new Error("quota"); } });
  assert.equal(await store.beginQuest("tools"), false);
  assert.equal(store.useProgress().progress.activeQuestId, null);
  assert.match(store.useProgress().error, /ไม่สำเร็จ/);
  let writes = 0;
  const corrupt = testStore({ getItem: () => "{broken", setItem: () => { writes++; } });
  assert.ok(corrupt.useProgress().error);
  assert.equal(await corrupt.chooseGoal("first-game"), false);
  assert.equal(writes, 0);
});
test("selection and starting are immutable, idempotent and do not unlock next quest", async () => {
  const original = rules.initialProgress();
  const selected = rules.selectGoal(original, "first-game");
  const started = rules.startQuest(selected, "tools");
  assert.equal(original.selectedGoalId, null);
  assert.equal(selected.quests.tools, "available");
  assert.equal(started.activeQuestId, "tools");
  assert.equal(started.quests.tools, "in_progress");
  assert.equal(started.quests.variables, "locked");
  assert.equal(rules.startQuest(started, "tools"), started);
  assert.equal(rules.canFocus(started, "tools"), true);
  assert.equal(rules.canFocus(started, "variables"), false);
  assert.equal("status" in definitions.journeyDefinition.quests[0], false);
});
test("cannot start without selection, locked/unknown quest or second active quest", async () => {
  const fresh = rules.initialProgress();
  assert.throws(() => rules.startQuest(fresh, "tools"));
  const selected = rules.selectGoal(fresh, "first-game");
  assert.throws(() => rules.selectGoal(fresh, "unknown"));
  assert.throws(() => rules.startQuest(selected, "variables"));
  assert.throws(() => rules.startQuest(selected, "unknown"));
  const started = rules.startQuest(selected, "tools");
  const secondAvailable = { ...started, quests: { ...started.quests, variables: "available" } };
  assert.throws(() => rules.startQuest(secondAvailable, "variables"));
});
test("stored progress round trips and rejects corrupt, old or inconsistent data", async () => {
  const started = rules.startQuest(rules.selectGoal(rules.initialProgress(), "first-game"), "tools");
  assert.equal(JSON.stringify(rules.parseProgress(JSON.stringify(started))), JSON.stringify(started));
  for (const raw of ["{", "null", "{}", JSON.stringify({ ...started, version: 99 }), JSON.stringify({ ...started, activeQuestId: null }), JSON.stringify({ ...started, selectedGoalId: null }), JSON.stringify({ ...started, quests: { ...started.quests, variables: "in_progress" } }), JSON.stringify({ ...started, quests: { ...started.quests, tools: "completed" } })]) {
    assert.throws(() => rules.parseProgress(raw));
  }
});

function fullyChecked(progress, questId) {
  const quest = definitions.journeyDefinition.quests.find(q => q.id === questId);
  for (const step of quest.steps) progress = rules.updateChecklist(progress, questId, step.id, true);
  return progress;
}
function fullyCheckedAndBoss(progress, questId) {
  const quest = definitions.journeyDefinition.quests.find(q => q.id === questId);
  for (const step of quest.steps) progress = rules.updateChecklist(progress, questId, step.id, true);
  return rules.attemptBoss(progress,questId,Object.fromEntries(bossRules.bosses[questId].questions.map(q=>[q.id,q.answer])),1000);
}
test("completion requires all steps, ignores timer duration, closes actual time and rewards once", () => {
  let p = rules.startQuest(rules.selectGoal(rules.initialProgress(), "first-game"), "tools");
  assert.throws(() => rules.completeQuest(p, "tools", 1000));
  p = rules.updateRound(p, "tools", "start", 1000);
  p = fullyCheckedAndBoss(p, "tools");
  const prior = JSON.stringify(p); // Opening/cancelling confirmation has no mutation.
  assert.equal(JSON.stringify(p), prior);
  const completed = rules.completeQuest(p, "tools", 11000);
  assert.equal(completed.focus.tools.totalMs, 10000);
  assert.equal(completed.focus.tools.round.status, "paused");
  assert.equal(completed.focus.tools.round.startedAt, null);
  assert.equal(completed.quests.tools, "completed");
  assert.equal(completed.rewards.tools.completedAt, 11000);
  assert.equal(completed.totalXP, definitions.journeyDefinition.quests[0].xp);
  assert.equal(completed.coins, definitions.journeyDefinition.quests[0].coins);
  assert.equal(completed.activeQuestId, null);
  assert.equal(completed.quests.variables, "available");
  assert.equal(completed.quests.loops, "locked");
  assert.equal(rules.completeQuest(completed, "tools", 999999), completed);
  assert.equal(JSON.stringify(rules.parseProgress(JSON.stringify(completed))), JSON.stringify(completed));
  assert.throws(() => rules.updateChecklist(completed, "tools", "hello-world", false));
  assert.throws(() => rules.updateRound(completed, "tools", "resume", 12000));
});
test("eight quests unlock sequentially and complete goal without bonus or auto start", () => {
  let p = rules.selectGoal(rules.initialProgress(), "first-game");
  let xp = 0, coins = 0;
  for (const [index, quest] of definitions.journeyDefinition.quests.entries()) {
    p = rules.startQuest(p, quest.id);
    p = fullyCheckedAndBoss(p, quest.id);
    p = rules.completeQuest(p, quest.id, 1000 + index);
    xp += quest.xp; coins += quest.coins;
    assert.equal(p.totalXP, xp); assert.equal(p.coins, coins);
    assert.equal(p.activeQuestId, null);
    assert.equal(Object.keys(p.rewards).length, index + 1);
    p = rules.parseProgress(JSON.stringify(p));
  }
  assert.equal(p.goalCompletedAt, 1007); assert.equal(p.totalXP, 930); assert.equal(p.coins, 915);
  assert.equal(Object.values(p.quests).every(s => s === "completed"), true);
});
test("level boundaries and jumps use total XP", () => {
  for (const [xp, level, current, remaining] of [[99,1,99,1],[100,2,0,100],[199,2,99,1],[200,3,0,100],[450,5,50,50]]) {
    const stats = rules.levelStats(xp);
    assert.equal(stats.level,level); assert.equal(stats.currentXP,current); assert.equal(stats.nextXP,remaining);
  }
});
test("version 2 migration preserves running round, checklist and active quest with zero balances", () => {
  let p = rules.startQuest(rules.selectGoal(rules.initialProgress(), "first-game"), "tools");
  p = rules.updateChecklist(p,"tools","hello-world",true);
  p = rules.updateRound(p,"tools","start",1000);
  p = rules.updateRound(p,"tools","pause",11000);
  p = rules.updateRound(p,"tools","resume",21000);
  const old = { version:2, selectedGoalId:p.selectedGoalId, activeQuestId:p.activeQuestId, quests:p.quests, focus:p.focus };
  const migrated = rules.parseProgress(JSON.stringify(old));
  assert.equal(migrated.version,7); assert.equal(migrated.totalXP,0); assert.equal(migrated.coins,0);
  assert.equal(Object.keys(migrated.rewards).length,0);
  assert.equal(JSON.stringify(migrated.focus),JSON.stringify(old.focus));
  assert.equal(migrated.activeQuestId,"tools");
});
test("simultaneous confirmations in two tabs create one atomic reward snapshot", async () => {
  let queue = Promise.resolve();
  const locks = { request: (name, callback) => { const result = queue.then(callback); queue = result.catch(() => {}); return result; } };
  let p = fullyCheckedAndBoss(rules.startQuest(rules.selectGoal(rules.initialProgress(),"first-game"),"tools"),"tools");
  p = rules.updateRound(p,"tools","start",1000);
  const data = new Map([["liferpg.progress.v1",JSON.stringify(p)]]);
  let writes=0;
  const storage = { getItem:key=>data.get(key)??null, setItem:(key,value)=>{ writes++; data.set(key,value); } };
  const a=testStore(storage,{locks,now:()=>11000}), b=testStore(storage,{locks,now:()=>11000});
  const results = await Promise.all([a.confirmQuest("tools"),b.confirmQuest("tools")]);
  assert.equal(results.every(Boolean),true); assert.equal(writes,1);
  const saved=rules.parseProgress(data.get(a.STORAGE_KEY));
  assert.equal(saved.totalXP,p.totalXP+definitions.journeyDefinition.quests[0].xp);
  assert.equal(Object.keys(saved.rewards).length,1); assert.equal(saved.focus.tools.totalMs,10000);
});
test("failed completion write retains active progress and does not claim a reward", async () => {
  const p = fullyCheckedAndBoss(rules.startQuest(rules.selectGoal(rules.initialProgress(),"first-game"),"tools"),"tools");
  const store = testStore({getItem:()=>JSON.stringify(p),setItem:()=>{throw new Error("quota");}});
  assert.equal(await store.confirmQuest("tools"),false);
  const snapshot=store.useProgress();
  assert.equal(snapshot.progress.activeQuestId,"tools"); assert.equal(snapshot.progress.totalXP,0);
  assert.equal(Object.keys(snapshot.progress.rewards).length,0); assert.ok(snapshot.error);
});
test("invalid rewards and late timer finish cannot corrupt completed snapshot", () => {
  let p=fullyCheckedAndBoss(rules.startQuest(rules.selectGoal(rules.initialProgress(),"first-game"),"tools"),"tools");
  const quest=definitions.journeyDefinition.quests[0], originalXP=quest.xp;
  try { quest.xp=-1; assert.throws(()=>rules.completeQuest(p,"tools",1000)); } finally { quest.xp=originalXP; }
  p=rules.completeQuest(p,"tools",1000);
  assert.equal(rules.updateRound(p,"tools","finish",9999999),p);
  for (const change of [v=>v.totalXP++,v=>v.rewards.tools.xp=-1,v=>v.rewards.tools.questId="other",v=>v.goalCompletedAt=1]) {
    const value=JSON.parse(JSON.stringify(p)); change(value); assert.throws(()=>rules.parseProgress(JSON.stringify(value)));
  }
});

function envelope(progress=rules.initialProgress(),revision=0,userId="account-A") {return {progress,revision,userId,characterName:"ใบไม้",serverNow:1000};}
const response=(value,ok=true,status=200)=>({ok,status,json:async()=>value});
test("account mode never reads demo balances and clears personal data on unauthorized writes",async()=>{
 let status=200;let payload;
 const store=testStore({getItem:()=>{throw Error("demo must not be read");},setItem:()=>{throw Error("demo must not be written");}}, {mode:"account",fetch:async(url,options)=>{
  if(options.method){payload=JSON.parse(options.body);return status===401?response({error:"เข้าสู่ระบบใหม่"},false,401):response(envelope(rules.selectGoal(rules.initialProgress(),"first-game"),1));}
  return response(envelope());
 }});
 await store.reloadProgress();assert.equal(await store.chooseGoal("first-game"),true);
 assert.deepEqual(JSON.parse(JSON.stringify(payload)),{action:"select",payload:{goalId:"first-game"}});
 status=401;assert.equal(await store.beginQuest("tools"),false);
 const view=store.useProgress();assert.equal(view.userId,null);assert.equal(view.progress.selectedGoalId,null);assert.ok(view.error);
});
test("account responses arriving after logout or mode change cannot restore private data",async()=>{
 let resolve;
 const store=testStore({getItem:()=>null,setItem:()=>{}},{mode:"account",fetch:()=>new Promise(done=>{resolve=done;})});
 const pending=store.reloadProgress();store.clearAccountView();resolve(response(envelope()));await pending;
 assert.equal(store.useProgress().userId,null);
 store.configureProgress("demo");assert.equal(store.useProgress().mode,"demo");
});
test("demo write waiting for a lock is discarded after switching to account",async()=>{
 let release;let writes=0;
 const store=testStore({getItem:()=>null,setItem:()=>{writes++;}},{locks:{request:async(name,callback)=>new Promise(done=>{release=()=>done(callback());})},fetch:async()=>response(envelope())});
 const pending=store.chooseGoal("first-game");store.configureProgress("account");release();
 assert.equal(await pending,false);assert.equal(writes,0);await store.reloadProgress();assert.equal(store.useProgress().mode,"account");
});
test("account network failure never falls back to demo or claims a reward",async()=>{
 const store=testStore({getItem:()=>{throw Error("no demo fallback");},setItem:()=>{}},{mode:"account",fetch:async()=>{throw Error("offline");}});
 await store.reloadProgress();assert.equal(await store.confirmQuest("tools"),false);
 const view=store.useProgress();assert.equal(view.mode,"account");assert.equal(view.progress.totalXP,0);assert.ok(view.error);
});

test("account request timeout exits loading and failed save can be retried without a false reward",async()=>{
 let offline=true;const deadlines=[];
 const store=testStore({getItem:()=>{throw Error('no demo');},setItem:()=>{}},{mode:'account',
  AbortSignal:{timeout:ms=>{deadlines.push(ms);return AbortSignal.abort();}},
  fetch:async(url,options)=>{if(offline){options.signal.throwIfAborted();}return response(envelope());}});
 await store.reloadProgress();assert.equal(store.useProgress().ready,true);assert.ok(store.useProgress().error);
 assert.equal(await store.confirmQuest('tools'),false);assert.equal(store.useProgress().progress.totalXP,0);
 offline=false;await store.reloadProgress();assert.equal(store.useProgress().error,null);
 assert.ok(deadlines.length>=3);assert.ok(deadlines.every(ms=>ms===15000));
});

test("same-origin requests and Auth redirects preserve 127.0.0.1 when Next normalizes its URL",()=>{
 const {requestOrigin}=loadRules("src/lib/request-origin.ts");
 const headers={get:name=>({'host':'127.0.0.1:3010','x-forwarded-proto':'http'}[name]??null)};
 assert.equal(requestOrigin({url:'http://localhost:3010/api/progress',headers}),'http://127.0.0.1:3010');
 assert.notEqual(requestOrigin({url:'http://localhost:3010/api/progress',headers}),'https://other.invalid');
});

test('career selection preserves active progress and schema3 migration preserves rewards and focus',()=>{
 let p=rules.startQuest(rules.selectGoal(rules.initialProgress(),'first-game'),'tools');
 p=rules.updateChecklist(p,'tools','hello-world',true);
 const old={...p,version:3};for(const k of ['careerId','equippedSkinId','skins','itemPurchases','itemUses'])delete old[k];
 const upgraded=rules.parseProgress(JSON.stringify(old));
 assert.equal(upgraded.activeQuestId,'tools');assert.deepEqual(JSON.stringify(upgraded.focus),JSON.stringify(p.focus));assert.equal(upgraded.equippedSkinId,'swordsman');
 const selected=rules.selectCareer(upgraded,'ui_ux_designer');assert.equal(selected.careerId,'ui_ux_designer');assert.equal(selected.activeQuestId,'tools');
 assert.throws(()=>rules.selectCareer(selected,'unknown'));assert.equal(rules.parseProgress(JSON.stringify(selected)).careerId,'ui_ux_designer');
});

test('skins require earned coins; purchases are idempotent and equips require ownership',()=>{
 let p=rules.selectGoal(rules.initialProgress(),'first-game');
 assert.throws(()=>rules.buySkin(p,'monk',1000),/เหรียญไม่พอ/);assert.throws(()=>rules.equipSkin(p,'monk'));assert.equal(rules.equipSkin(p,'swordsman').equippedSkinId,'swordsman');
 p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(p,'tools'),'tools'),'tools',1000);
 p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(p,'variables'),'variables'),'variables',1500);assert.equal(p.coins,165);
 p=rules.buySkin(p,'monk',2000);assert.equal(p.coins,15);assert.equal(rules.buySkin(p,'monk',3000),p);
 p=rules.equipSkin(p,'monk');assert.equal(rules.parseProgress(JSON.stringify(p)).equippedSkinId,'monk');
 assert.throws(()=>rules.buyItem(p,'hint',1,3000,'a'),/เหรียญไม่พอ/);
 const corrupt=JSON.parse(JSON.stringify(p));corrupt.skins.monk.coins=0;assert.throws(()=>rules.parseProgress(JSON.stringify(corrupt)));
 const unowned=JSON.parse(JSON.stringify(p));unowned.equippedSkinId='samurai';assert.throws(()=>rules.parseProgress(JSON.stringify(unowned)));
});

test('potions: bought in stacks, spent one at a time inside the active fight, never below zero',()=>{
 let p=rules.selectGoal(rules.initialProgress(),'first-game');
 for(const [i,q] of definitions.journeyDefinition.quests.slice(0,4).entries())p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(p,q.id),q.id),q.id,1000+i);
 assert.equal(p.coins,330);
 p=rules.buyItem(p,'hint',2,2000,'buy-1');assert.equal(p.coins,30);assert.equal(rules.inventory(p).hint,2);
 assert.throws(()=>rules.buyItem(p,'hint',0,2000,'x'));assert.throws(()=>rules.buyItem(p,'hint',10,2000,'x'));assert.throws(()=>rules.buyItem(p,'potion',1,2000,'x'));
 const battle='0f8fad5b-d9cb-469f-a165-70867728950e';
 assert.throws(()=>rules.consumeItem(p,'hint','improve-game',battle,2100),/ระหว่างสู้บอส/);
 p=fullyChecked(rules.startQuest(p,'improve-game'),'improve-game');
 p=rules.consumeItem(p,'hint','improve-game',battle,2200);p=rules.consumeItem(p,'hint','improve-game',battle,2300);
 assert.equal(rules.inventory(p).hint,0);assert.throws(()=>rules.consumeItem(p,'hint','improve-game',battle,2400),/ไม่มีไอเทม/);
 const back=rules.parseProgress(JSON.stringify(p));assert.equal(back.itemUses.length,2);assert.equal(back.coins,30);
 const over=JSON.parse(JSON.stringify(p));over.itemUses.push({...over.itemUses[0]});assert.throws(()=>rules.parseProgress(JSON.stringify(over)),/มากกว่าที่มี/);
 const cheap=JSON.parse(JSON.stringify(p));cheap.itemPurchases[0].coins=1;assert.throws(()=>rules.parseProgress(JSON.stringify(cheap)));
});

test('x2 potions drunk in this fight let a shorter answer set win; other fights do not count',()=>{
 let p=rules.selectGoal(rules.initialProgress(),'first-game');
 for(const [i,q] of definitions.journeyDefinition.quests.slice(0,7).entries())p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(p,q.id),q.id),q.id,1000+i);
 p=rules.completePractice(rules.selectCareer(p,'english'),careers.find(c=>c.id==='english').tasks[0].id,1500);assert.equal(p.coins,750);
 p=rules.buyItem(p,'double',1,2000,'buy-d');assert.equal(p.coins,0);p=fullyChecked(rules.startQuest(p,'publish-game'),'publish-game');
 const qs=bossRules.bosses['publish-game'].questions,n=qs.length,battle='1f8fad5b-d9cb-469f-a165-70867728950e',other='2f8fad5b-d9cb-469f-a165-70867728950e';
 const answers=Object.fromEntries(qs.slice(0,n-1).map(q=>[q.id,q.answer]));
 assert.throws(()=>rules.attemptBoss(p,'publish-game',answers,3000,battle),/ครบ/);
 p=rules.consumeItem(p,'double','publish-game',battle,3100);
 assert.throws(()=>rules.attemptBoss(p,'publish-game',answers,3200,other),/ครบ/);
 const won=rules.attemptBoss(p,'publish-game',answers,3300,battle);assert.equal(won.bosses['publish-game'].passedAt,3300);assert.equal(won.bosses['publish-game'].score,n);
 const wrong={...answers,[qs[0].id]:(qs[0].answer+1)%qs[0].options.length};
 const lost=rules.attemptBoss(p,'publish-game',wrong,3400,battle);assert.equal(lost.bosses['publish-game'].passedAt,null);assert.ok(lost.bosses['publish-game'].score<n);
});

test('legacy coins are tripled and outfit purchases refunded when loading an older snapshot',()=>{
 const p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(rules.selectGoal(rules.initialProgress(),'first-game'),'tools'),'tools'),'tools',1000);
 const legacy=JSON.parse(JSON.stringify(p));legacy.version=6;legacy.rewards.tools.coins=35;legacy.coins=5;legacy.purchases={sunrise:{itemId:'sunrise',coins:30,purchasedAt:1100}};legacy.equippedOutfitId='sunrise';
 for(const k of ['equippedSkinId','skins','itemPurchases','itemUses'])delete legacy[k];
 const up=rules.parseProgress(JSON.stringify(legacy));
 assert.equal(up.version,7);assert.equal(up.rewards.tools.coins,105);assert.equal(up.coins,105);assert.equal(up.equippedSkinId,'swordsman');assert.equal(Object.keys(up.skins).length,0);
});

test('Bangkok daily charts use earned rewards and do not subtract purchases',()=>{
 const chart=loadRules('src/features/analytics/rules.ts');let p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(rules.selectGoal(rules.initialProgress(),'first-game'),'tools'),'tools'),'tools',Date.parse('2026-10-08T17:01:00Z'));
 p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(p,'variables'),'variables'),'variables',Date.parse('2026-10-08T17:01:30Z'));
 p=rules.buyItem(p,'hint',1,Date.parse('2026-10-08T17:02:00Z'),'b1');
 const buckets=chart.progressBuckets(p,7,Date.parse('2026-10-09T04:00:00Z'));assert.equal(buckets.length,7);assert.equal(buckets[6].date,'2026-10-09');assert.equal(buckets[6].xp,200);assert.equal(buckets[6].coins,165);assert.equal(p.coins,15);
});

test('local lesson assistant retrieves authored content and reports unknown topics without fabricating',()=>{
 const library=loadRules('src/features/chat/library.ts',{'../careers/catalog.json':{default:careers}});
 assert.equal(library.searchLibrary('ตัวแปร if else')[0].href,'/quests/variables');assert.equal(library.searchLibrary('เรื่องที่ไม่มีในคลังxyz').length,0);assert.equal(library.searchLibrary('UI/UX')[0].href,'/careers');
});


test('daily practice rewards once per task per Bangkok day, caps at three and builds a streak',()=>{
 const day=t=>Date.parse(t);let p=rules.selectCareer(rules.initialProgress(),'english');
 assert.throws(()=>rules.completePractice(rules.initialProgress(),'x',day('2026-10-10T03:00:00Z')),/เลือกเส้นทาง/);
 assert.throws(()=>rules.completePractice(p,'learn_cpp',day('2026-10-10T03:00:00Z')),/ไม่พบงานฝึก/);
 const tasks=careers.find(c=>c.id==='english').tasks.map(t=>t.id);
 // 16:59Z and 17:01Z on Oct 9 are different Bangkok days.
 p=rules.completePractice(p,tasks[0],day('2026-10-09T16:59:00Z'));
 assert.equal(rules.completePractice(p,tasks[0],day('2026-10-09T16:59:30Z')),p);
 p=rules.completePractice(p,tasks[0],day('2026-10-09T17:01:00Z'));
 p=rules.completePractice(p,tasks[1],day('2026-10-10T01:00:00Z'));p=rules.completePractice(p,tasks[2],day('2026-10-10T02:00:00Z'));
 assert.throws(()=>rules.completePractice(p,tasks[3],day('2026-10-10T03:00:00Z')),/ครบ 3/);
 assert.equal(p.totalXP,40);assert.equal(p.coins,60);assert.equal(rules.practiceToday(p,day('2026-10-10T05:00:00Z')).length,3);
 assert.equal(rules.practiceStreak(p,day('2026-10-10T05:00:00Z')),2);
 assert.equal(rules.practiceStreak(p,day('2026-10-11T05:00:00Z')),2,'today not practised yet keeps yesterday streak');
 assert.equal(rules.practiceStreak(p,day('2026-10-12T05:00:00Z')),0);
 const parsed=rules.parseProgress(JSON.stringify(p));assert.deepEqual(parsed.practice,p.practice);assert.equal(parsed.totalXP,40);
 // Practice coins are spendable and quest totalXPBefore stays ledger-only.
 assert.throws(()=>rules.buySkin(p,'monk',day('2026-10-10T06:00:00Z')),/เหรียญไม่พอ/);
 const q=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(rules.selectGoal(p,'first-game'),'tools'),'tools'),'tools',day('2026-10-10T07:00:00Z'));
 assert.equal(q.rewards.tools.totalXPBefore,0);assert.equal(q.totalXP,160);assert.equal(rules.parseProgress(JSON.stringify(rules.buySkin(q,'monk',day('2026-10-10T07:30:00Z')))).coins,15);assert.equal(rules.parseProgress(JSON.stringify(q)).totalXP,160);
 const key=Object.keys(p.practice)[0];
 for(const bad of [{...p.practice[key],xp:99},{...p.practice[key],day:'2026-01-01'},{...p.practice[key],taskId:'learn_cpp'}])
  assert.throws(()=>rules.parseProgress(JSON.stringify({...q,practice:{...q.practice,[key]:bad}})));
 assert.throws(()=>rules.parseProgress(JSON.stringify({...q,totalXP:q.totalXP+10})));
 const chart=chartRules.progressBuckets(q,2,day('2026-10-10T08:00:00Z'));assert.equal(chart[1].xp,150);assert.equal(chart[1].quests,1);
});

test('5-quest snapshots gain levels 6-8 without losing rewards; finished players reopen at level 6',()=>{
 const legacy=p=>{const v=JSON.parse(JSON.stringify(p));for(const id of ['functions','high-score','publish-game']){delete v.quests[id];delete v.focus[id];}return v;};
 let p=rules.selectGoal(rules.initialProgress(),'first-game');
 for(const [i,q] of definitions.journeyDefinition.quests.slice(0,5).entries()){p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(p,q.id),q.id),q.id,1000+i);}
 const old=legacy(p);old.goalCompletedAt=1004;
 const migrated=rules.parseProgress(JSON.stringify(old));
 assert.equal(migrated.goalCompletedAt,null);assert.equal(migrated.quests.functions,'available');assert.equal(migrated.quests['publish-game'],'locked');
 assert.equal(migrated.totalXP,510);assert.equal(Object.keys(migrated.rewards).length,5);
 const resumed=rules.startQuest(migrated,'functions');assert.equal(resumed.activeQuestId,'functions');
 // Mid-journey legacy player keeps the current quest.
 let mid=rules.startQuest(rules.selectGoal(rules.initialProgress(),'first-game'),'tools');
 const midOld=legacy(mid);const m=rules.parseProgress(JSON.stringify(midOld));
 assert.equal(m.quests.tools,'in_progress');assert.equal(m.quests.functions,'locked');
 assert.throws(()=>rules.parseProgress(JSON.stringify({...midOld,quests:{tools:'in_progress'}})));
});

test('boss needs every question of its level; legacy 3/3 wins stay valid',()=>{
 let p=fullyChecked(rules.startQuest(rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(rules.selectGoal(rules.initialProgress(),'first-game'),'tools'),'tools'),'tools',1000),'variables'),'variables');
 const qs=bossRules.bosses.variables.questions;assert.equal(qs.length,4);
 const right=Object.fromEntries(qs.map(q=>[q.id,q.answer]));
 const oneWrong={...right,[qs[0].id]:(qs[0].answer+1)%qs[0].options.length};
 let r=rules.attemptBoss(p,'variables',oneWrong,2000);sameJSON(r.bosses.variables,{score:3,total:4,attempts:1,passedAt:null});
 assert.throws(()=>rules.completeQuest(r,'variables',2100),/บอส/);
 r=rules.attemptBoss(r,'variables',right,2200);sameJSON(r.bosses.variables,{score:4,total:4,attempts:2,passedAt:2200});
 assert.equal(rules.parseProgress(JSON.stringify(r)).bosses.variables.total,4);
 // A result saved before levels had more questions has no total and was graded out of 3.
 const legacy={...r,bosses:{...r.bosses,variables:{score:3,attempts:1,passedAt:2200}}};
 sameJSON(rules.parseProgress(JSON.stringify(legacy)).bosses.variables,{score:3,total:3,attempts:1,passedAt:2200});
 for(const bad of [{score:3,total:4,attempts:1,passedAt:2200},{score:4,total:4,attempts:1,passedAt:null},{score:5,total:5,attempts:1,passedAt:1}])
  assert.throws(()=>rules.parseProgress(JSON.stringify({...r,bosses:{...r.bosses,variables:bad}})));
 assert.throws(()=>rules.attemptBoss(p,'variables',{[qs[0].id]:0},2300),/ครบ/);
});

test('language variants keep the same answer index as the shared answer key',()=>{
 for(const boss of Object.values(bossRules.bosses))for(const q of boss.questions){
  assert.ok(q.answer>=0&&q.answer<q.options.length,q.id);assert.ok(q.source.url.startsWith('https://'),q.id);
  for(const lang of ['python','javascript']){const v=bossRules.questionView(q,lang);assert.equal(v.options.length,q.options.length,q.id);assert.ok(v.source.url.startsWith('https://'));}
 }
 assert.equal(Object.values(bossRules.bosses).map(b=>b.questions.length).join(),'3,4,5,6,7,8,9,10');
});
const sameJSON=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));

test('turn-based battle: wrong answers cost hearts and requeue; victory yields a full correct answer set',()=>{
 const battleRules=loadRules('src/features/boss/battle.ts',{'./catalog':bossRules});
 const boss=bossRules.bosses.loops,n=boss.questions.length;let seed=1;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 let b=battleRules.startBattle(boss,rand);assert.equal(b.bossHP,n);assert.equal(b.hearts,bossRules.heartsFor(boss));assert.equal(b.order.length,boss.questions[b.current].options.length);
 const wrongOf=q=>(q.answer+1)%q.options.length;
 const first=b.current;let t=battleRules.answer(b,boss,wrongOf(boss.questions[first]),rand);
 assert.equal(t.correct,false);assert.equal(t.battle.hearts,b.hearts-1);assert.equal(t.battle.queue.at(-1),first);assert.equal(t.battle.combo,0);
 b=t.battle;
 while(b.phase==='player'){const q=boss.questions[b.current];t=battleRules.answer(b,boss,q.answer,rand);if(b.current===first)assert.equal(t.crit,false,'missed question is not a critical');b=t.battle;}
 assert.equal(b.phase,'victory');assert.equal(b.bossHP,0);
 assert.equal(JSON.stringify(Object.keys(b.answers).sort()),JSON.stringify(boss.questions.map(q=>q.id).sort()));
 for(const q of boss.questions)assert.equal(b.answers[q.id],q.answer);
 assert.ok(bossRules.gradeBoss('loops',b.answers)===n);
 assert.throws(()=>battleRules.answer(b,boss,0,rand));
 // Running out of hearts ends the fight.
 let d=battleRules.startBattle(boss,rand);while(d.phase==='player')d=battleRules.answer(d,boss,wrongOf(boss.questions[d.current]),rand).battle;
 assert.equal(d.phase,'defeat');assert.equal(d.hearts,0);
 // The hint removes exactly one wrong option, once per battle.
 const h=battleRules.applyHint(battleRules.startBattle(boss,rand),boss,rand);const hq=boss.questions[h.current];
 assert.equal(h.hint,0);assert.notEqual(h.removed,hq.answer);assert.ok(h.removed>=0&&h.removed<hq.options.length);
 assert.equal(battleRules.applyHint(h,boss,rand),h);
});

test('two demo tabs buy the same skin once and a failed write does not claim ownership',async()=>{
 let p=rules.selectGoal(rules.initialProgress(),'first-game');
 for(const id of ['tools','variables'])p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(p,id),id),id,1000);
 let raw=JSON.stringify(p),writes=0,queue=Promise.resolve();const storage={getItem:()=>raw,setItem:(key,value)=>{raw=value;writes++;}};
 const locks={request:(name,callback)=>{const pending=queue.then(callback);queue=pending.catch(()=>{});return pending;}};
 const a=testStore(storage,{locks}),b=testStore(storage,{locks});await Promise.all([a.purchaseSkin('monk'),b.purchaseSkin('monk')]);
 assert.equal(writes,1);assert.equal(rules.parseProgress(raw).coins,15);
 const failed=testStore({getItem:()=>JSON.stringify(p),setItem:()=>{throw Error('quota');}});assert.equal(await failed.purchaseSkin('monk'),false);assert.equal(failed.useProgress().progress.coins,165);assert.equal(Object.keys(failed.useProgress().progress.skins).length,0);
});
