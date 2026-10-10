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
const wardrobe=loadRules('src/features/wardrobe/catalog.ts');
const careers=JSON.parse(fs.readFileSync('src/features/careers/catalog.json','utf8'));
const bossRules=loadRules('src/features/boss/catalog.ts');
const evidenceRules=loadRules('src/features/evidence/types.ts');
const rules = loadRules("src/features/journey/progress.ts", { "./definitions": definitions, "../focus/rules": focusRules, '../careers/catalog.json':{default:careers}, '../wardrobe/catalog':wardrobe,'../boss/catalog':bossRules,'../evidence/types':evidenceRules });

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
  assert.equal(migrated.version, 5);
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

test("new user has no goal, no active quest, one available and four locked", () => {
  const progress = rules.initialProgress();
  assert.equal(progress.selectedGoalId, null);
  assert.equal(progress.activeQuestId, null);
  assert.equal(progress.quests.tools, "available");
  assert.equal(Object.values(progress.quests).filter(value => value === "locked").length, 4);
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
test("five quests unlock sequentially and complete goal without bonus or auto start", () => {
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
  assert.equal(p.goalCompletedAt, 1004);
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
  assert.equal(migrated.version,5); assert.equal(migrated.totalXP,0); assert.equal(migrated.coins,0);
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
 const old={...p,version:3};delete old.careerId;delete old.equippedOutfitId;delete old.purchases;
 const upgraded=rules.parseProgress(JSON.stringify(old));
 assert.equal(upgraded.activeQuestId,'tools');assert.deepEqual(JSON.stringify(upgraded.focus),JSON.stringify(p.focus));assert.equal(upgraded.equippedOutfitId,'forest');
 const selected=rules.selectCareer(upgraded,'ui_ux_designer');assert.equal(selected.careerId,'ui_ux_designer');assert.equal(selected.activeQuestId,'tools');
 assert.throws(()=>rules.selectCareer(selected,'unknown'));assert.equal(rules.parseProgress(JSON.stringify(selected)).careerId,'ui_ux_designer');
});

test('outfits require earned coins, purchases are idempotent and equips require ownership',()=>{
 let p=rules.selectGoal(rules.initialProgress(),'first-game');
 assert.throws(()=>rules.purchaseOutfit(p,'sunrise',1000));assert.throws(()=>rules.equipOutfit(p,'sunrise'));
 p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(p,'tools'),'tools'),'tools',1000);
 p=rules.purchaseOutfit(p,'sunrise',2000);assert.equal(p.coins,5);assert.equal(p.totalXP,120);
 assert.equal(rules.purchaseOutfit(p,'sunrise',3000),p);
 p=rules.equipOutfit(p,'sunrise');assert.equal(rules.parseProgress(JSON.stringify(p)).equippedOutfitId,'sunrise');
 p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(p,'variables'),'variables'),'variables',4000);assert.equal(p.coins,25);
 const corrupt=JSON.parse(JSON.stringify(p));corrupt.purchases.sunrise.coins=0;assert.throws(()=>rules.parseProgress(JSON.stringify(corrupt)));
});

test('two demo tabs buy same outfit once and failed write does not claim ownership',async()=>{
 let p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(rules.selectGoal(rules.initialProgress(),'first-game'),'tools'),'tools'),'tools',1000);
 let raw=JSON.stringify(p),writes=0,queue=Promise.resolve();const storage={getItem:()=>raw,setItem:(key,value)=>{raw=value;writes++;}};
 const locks={request:(name,callback)=>{const pending=queue.then(callback);queue=pending.catch(()=>{});return pending;}};
 const a=testStore(storage,{locks}),b=testStore(storage,{locks});await Promise.all([a.buyOutfit('sunrise'),b.buyOutfit('sunrise')]);
 assert.equal(writes,1);assert.equal(rules.parseProgress(raw).coins,5);
 const failed=testStore({getItem:()=>JSON.stringify(p),setItem:()=>{throw Error('quota');}});assert.equal(await failed.buyOutfit('sunrise'),false);assert.equal(failed.useProgress().progress.coins,35);assert.equal(Object.keys(failed.useProgress().progress.purchases).length,0);
});

test('Bangkok daily charts use earned rewards and do not subtract purchases',()=>{
 const chart=loadRules('src/features/analytics/rules.ts');let p=rules.completeQuest(fullyCheckedAndBoss(rules.startQuest(rules.selectGoal(rules.initialProgress(),'first-game'),'tools'),'tools'),'tools',Date.parse('2026-10-08T17:01:00Z'));
 p=rules.purchaseOutfit(p,'sunrise',Date.parse('2026-10-08T17:02:00Z'));
 const buckets=chart.progressBuckets(p,7,Date.parse('2026-10-09T04:00:00Z'));assert.equal(buckets.length,7);assert.equal(buckets[6].date,'2026-10-09');assert.equal(buckets[6].xp,120);assert.equal(buckets[6].coins,35);assert.equal(p.coins,5);
});

test('local lesson assistant retrieves authored content and reports unknown topics without fabricating',()=>{
 const library=loadRules('src/features/chat/library.ts',{'../careers/catalog.json':{default:careers}});
 assert.equal(library.searchLibrary('ตัวแปร if else')[0].href,'/quests/variables');assert.equal(library.searchLibrary('เรื่องที่ไม่มีในคลังxyz').length,0);assert.equal(library.searchLibrary('UI/UX')[0].href,'/careers');
});

