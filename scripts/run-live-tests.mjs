import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require=createRequire(import.meta.url);
require('@next/env').loadEnvConfig(process.cwd());
const required=['LIFERPG_TEST_EMAIL_A','LIFERPG_TEST_PASSWORD_A','LIFERPG_TEST_EMAIL_B','LIFERPG_TEST_PASSWORD_B'];
const missing=required.filter(name=>!process.env[name]);
if(missing.length){console.error('กรอกบัญชีทดสอบใหม่ใน .env.local ก่อน: '+missing.join(', '));process.exit(1);}
const result=spawnSync(process.execPath,['--test','tests/supabase.integration.test.mjs'],{stdio:'inherit',env:{...process.env,LIFERPG_INTEGRATION:'1',LIFERPG_TEST_URL:process.env.NEXT_PUBLIC_SUPABASE_URL,LIFERPG_TEST_PUBLISHABLE_KEY:process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}});
if(result.error){console.error('เปิดชุดทดสอบไม่สำเร็จ');process.exit(1);}
process.exit(result.status??1);
