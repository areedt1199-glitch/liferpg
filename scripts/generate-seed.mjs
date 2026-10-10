import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
if(process.argv.includes('--initial-migration'))throw new Error('Initial definitions migration is already applied; create a new CLI migration for changes.');
const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/journey/definitions.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
const goal=exports.journeyDefinition;
const quote=value=>"'"+String(value).replaceAll("'","''")+"'";
let sql='-- Generated from definitions.ts; reviewed, immutable content for this migration.\n';
sql+=`insert into public.journey_definitions(id,title,description) values (${[goal.id,goal.title,goal.description].map(quote).join(',')}) on conflict (id) do nothing;\n`;
for(const [index,q] of goal.quests.entries()){
 sql+=`insert into public.quest_definitions(id,goal_id,position,title,task,place,success,minutes,xp,coins) values (${[q.id,goal.id,index+1,q.title,q.task,q.place,q.success,q.minutes,q.xp,q.coins].map(quote).join(',')}) on conflict (id) do nothing;\n`;
 for(const [i,step] of q.steps.entries())sql+=`insert into public.quest_steps(quest_id,id,position,text) values (${[q.id,step.id,i+1,step.text].map(quote).join(',')}) on conflict (quest_id,id) do nothing;\n`;
}
fs.writeFileSync('supabase/seed.sql',sql);

