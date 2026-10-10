// Read-only readiness check. Never prints key values, tokens or matched text.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
createRequire(import.meta.url)('@next/env').loadEnvConfig(process.cwd());
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const configured=!!url&&key?.startsWith('sb_publishable_')&&new URL(url).hostname==='ynxtoynvjgvxulvxxmxn.supabase.co';
console.log(JSON.stringify({envFilePresent:fs.existsSync('.env.local'),correctProjectAndPublishableKey:!!configured,gitRepositoryPresent:fs.existsSync('.git')}));
function files(dir){return fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(item=>item.isDirectory()?files(path.join(dir,item.name)):[path.join(dir,item.name)]):[];}
const targets=[...files('src'),...files('scripts'),...files('tests'),...files('docs'),...files('.next/static'),'.env.example','README.md'];
let secretFindings=0;
for(const file of targets){
 const value=fs.readFileSync(file,'utf8');
 if(/sb_secret_[a-zA-Z0-9_-]{15,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(value))secretFindings++;
 for(const match of value.matchAll(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)){
  try{if(JSON.parse(Buffer.from(match[0].split('.')[1],'base64url').toString()).role==='service_role')secretFindings++;}catch{}
 }
}
console.log(JSON.stringify({scannedFiles:targets.length,secretPatternFindings:secretFindings,envIgnoredByRule:fs.readFileSync('.gitignore','utf8').includes('.env*')}));
if(configured){
 const settings=await fetch(`${url}/auth/v1/settings`,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
 const auth=await settings.json();
 const anon=await fetch(`${url}/rest/v1/rpc/liferpg_snapshot`,{method:'POST',headers:{apikey:key,'Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
 console.log(JSON.stringify({liveAuthStatus:settings.status,emailEnabled:auth.external?.email,confirmEmail:!auth.mailer_autoconfirm,anonymousSnapshotStatus:anon.status}));
}
for(const route of ['/api/progress','/quests/not-a-quest','/goals/not-a-goal','/wrong-route','/auth/callback']){
 const response=await fetch(`http://127.0.0.1:3010${route}`,{redirect:'manual',signal:AbortSignal.timeout(15000)});
 console.log(JSON.stringify({route,status:response.status,cacheControl:response.headers.get('cache-control'),redirect:response.headers.get('location')}));
}
const rejected=await fetch('http://127.0.0.1:3010/api/progress',{method:'POST',headers:{origin:'https://invalid.example','Content-Type':'application/json'},body:'{}'});
console.log(JSON.stringify({crossOriginWriteStatus:rejected.status}));
if(secretFindings||!configured)process.exitCode=1;
