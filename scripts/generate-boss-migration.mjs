// Generates only the new, unapplied migration from authored boss definitions.
import fs from 'node:fs';import ts from 'typescript';import vm from 'node:vm';
const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/features/boss/catalog.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports});
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const rows=Object.entries(exports.bosses).flatMap(([questId,b])=>b.questions.map((q,i)=>`(${quote(q.id)},${quote(questId)},${i+1},${quote(q.prompt)},${quote(JSON.stringify(q.options))}::jsonb)`));
const keys=Object.values(exports.bosses).flatMap(b=>b.questions.map(q=>`(${quote(q.id)},${q.answer})`));
const file=fs.readdirSync('supabase/migrations').find(f=>f.endsWith('_quest_boss_evidence.sql'));
const base=fs.readFileSync('scripts/boss-evidence-schema.sql','utf8');
fs.writeFileSync('supabase/migrations/'+file,base.replace('-- QUESTION_ROWS',rows.join(',\n')).replace('-- ANSWER_ROWS',keys.join(',\n')));
