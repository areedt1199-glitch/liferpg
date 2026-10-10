# ตั้งค่า Supabase สำหรับ liferpg

## สิ่งที่ยังต้องทำ
สถานะขั้น7: liferpg ref `ynxtoynvjgvxulvxxmxn` เชื่อมจริงแล้ว มี migrations3ไฟล์/seed/Auth redirects และ .env.local ตรวจ Auth200/anonymous401 ซ้ำผ่าน บัญชีจริงหนึ่งบัญชีเคยตรวจ login/ด่าน1/รางวัล/refresh/logoutในขั้น6 ยังขาดบัญชีทดสอบสองบัญชีสำหรับ live integration เต็มชุด ไม่ต้องตั้งค่าใหม่หรือส่งรหัสผ่าน/secret key ในแชต

คัดลอก `.env.example` เป็น `.env.local` บนเครื่อง แล้วใส่:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://ynxtoynvjgvxulvxxmxn.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

ใช้ URL และ **publishable key `sb_publishable_...`** จาก Dashboard เท่านั้น โค้ดปฏิเสธ secret/service-role และ legacy JWT key ตั้งใจไม่รองรับ legacy anon key ไม่มี secret key ที่ต้องใช้ใน runtime ของแอป `.env.local` ถูก ignore แล้ว ต้อง restart/rebuild Next.js หลังเปลี่ยน environment เพราะ NEXT_PUBLIC ถูกฝังตอน build

## Migration และ seed
ใช้ CLI ที่ตรึงใน devDependencies สร้างชื่อ migrations ผ่าน CLI จริงแล้ว ไม่แก้ migration ที่ apply แล้ว; เพิ่ม migration ใหม่เมื่อเปลี่ยนนิยาม/รางวัล

1. ระบุโปรเจกต์ liferpg หรือ **test project ที่อนุญาต** ให้แน่ชัด ตรวจ backup/สถานะ schema ก่อน apply ไม่มีคำสั่ง reset remote
2. อ่าน migration สามไฟล์ตามลำดับใน `supabase/migrations/` รวม indexes ที่เพิ่มตาม advisors โปรเจกต์นี้ apply แล้ว อย่าลงซ้ำหรือ reset ข้อมูล สำหรับโปรเจกต์ใหม่ต้องตรวจ schema เดิมก่อน
3. หลัง login/link กับโปรเจกต์ที่ยืนยันเองแล้ว ตรวจรายการก่อน apply:

```powershell
npx --no-install supabase db push --linked --dry-run
npx --no-install supabase db push --linked --include-seed --skip-vault
```

คำสั่งนี้เป็นตัวอย่างสำหรับโปรเจกต์ใหม่ที่ยืนยันแล้ว โปรเจกต์ liferpg นี้ลง remote ผ่าน MCP ในขั้น6แล้ว ไม่ต้อง apply ซ้ำ ใช้ CLI prompt/credential store แทนพิมพ์ password/key เป็น argument ที่อาจติด history ไม่มี push โค้ด Git หรือ deploy เว็บไซต์

นิยามเริ่มต้นอยู่ใน migration ที่สองเพื่อให้ snapshot ใช้ได้ทันที Seed ใช้ ON CONFLICT DO NOTHING ไม่เขียนทับนิยามหรือข้อมูลบัญชี รันซ้ำได้ เปลี่ยนเนื้อหาใหม่ใช้ migration ชัดเจน:

```powershell
node scripts/generate-seed.mjs
```

ไม่ใช้ flag `--initial-migration` อีกหลัง apply migration แล้ว สำหรับ local Supabase ต้องติดตั้ง Docker ก่อน ใช้ config ที่ CLI init สร้างไว้ แล้ว `npx --no-install supabase start` (ยังไม่ได้รันในเครื่องนี้) อย่าใช้ db reset กับข้อมูลที่ต้องเก็บ Local publishable key ต้องเป็นรูปแบบใหม่เช่นเดียวกัน

## Auth และ localhost
Dashboard Auth: เปิด Email/password, ตั้ง Site URL เป็น origin ที่ใช้จริง เช่น `http://127.0.0.1:3010` และ Redirect URLs แบบ exact:
- `http://127.0.0.1:3010/auth/callback`
- `http://127.0.0.1:3010/auth/confirm`
- ถ้าใช้พอร์ต 3000 เพิ่ม `http://localhost:3000/auth/callback` และ `/auth/confirm` สำหรับ origin นั้น

เปิด Confirm email ตามนโยบายที่ต้องการ ถ้าเปิด signup จะแสดงข้อความรอยืนยันอีเมลเมื่อ session ยังไม่มี ถ้าปิดจะเข้าสู่ระบบทันที ใช้ email/SMTP ที่จัดไว้ใน Supabase ไม่เพิ่มบริการเสียเงินเอง

Flow PKCE ปกติใช้ลิงก์ confirmation ของ Supabase แล้ว redirect code ไป `/auth/callback` เพื่อ exchangeCodeForSession ใน browser เดิม ถ้าต้องการยืนยันข้าม browser ปรับ template ให้ใช้ token hash ตามเอกสาร Supabase SSR:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">ยืนยันอีเมล</a>
```

Route confirm รองรับ email/signup เท่านั้นและ redirect กลับ profile แบบตายตัว ไม่รองรับ arbitrary next URL รีเฟรช cookie ผ่าน `src/proxy.ts` ใช้ getClaims; server actions/API ตรวจ getUser อีกครั้ง ห้าม cache response ส่วนตัวร่วมบัญชี Auth callback ที่ไม่สำเร็จแสดง error ภาษาไทย หน้า profile ใช้ verified user ไม่ใช้ user_metadata สำหรับสิทธิ์

## Schema และสิทธิ์
9 ตาราง public เปิด RLS ทั้งหมด: journey/quest/steps definitions, profiles, user_progress, quest_progress, checklist, focus_sessions, reward_ledger ให้ authenticated อ่านนิยาม/ข้อมูลของตัวเอง และ update เฉพาะ profiles.character_name พร้อม USING/WITH CHECK ไม่ให้ CRUD progress/rewards โดยตรง

private schema อย่าเพิ่มเข้า exposed schemas ให้เปิด public ตามค่าเริ่มต้น wrappers `liferpg_snapshot`/`liferpg_command` ใช้ private entrypoints สองตัวที่ตรวจ auth.uid() แล้วล็อก user_progress ด้วย FOR UPDATE Privileged code มี search_path ว่าง fully-qualified objects และ revoke helper execute จาก public/anon/authenticated ไม่ใช้ service role ฝั่ง browser/server runtime

ledger PK(user_id,quest_id) เป็นยอดหลักคำนวณ XP/เหรียญ unique active/running จำกัดหนึ่งรายการ การผ่านใช้ transaction เดียว retry คืนสถานะเดิม ไม่ให้ browser ส่งเวลาหรือรางวัลจริง; SQL server ไม่เชื่อ userId/xp ที่ปลอมมา เวลา lifecycle ใช้ clock_timestamp หลังได้ lock

## ทดสอบกับ Supabase จริง
`npm run test` ล่าสุดขั้น7 ผ่าน29 tests ในเครื่อง และ skip live1โดยปริยาย PGlite ใช้ PostgreSQL engine จริงแต่ stub auth boundary ไม่ตรวจ Auth/PostgREST/หลาย connection จริง

เตรียม **บัญชีทดสอบใหม่ 2 บัญชี** ที่ยืนยันอีเมลแล้วบน test project ซึ่งลง migrations แล้วเท่านั้น ตัวทดสอบหยุดหากบัญชีเคยเลือกเป้าหมาย/มีรางวัล ไม่ reset ข้อมูล บัญชี A จะผ่าน tools ระหว่างทดสอบ จึงใช้บัญชีใหม่เมื่อตรวจรอบใหม่

ตั้ง environment ใน local test runner/secret store โดยไม่ commit หรือพิมพ์ค่าลง output:
`LIFERPG_INTEGRATION=1`, `LIFERPG_TEST_URL`, `LIFERPG_TEST_PUBLISHABLE_KEY`, `LIFERPG_TEST_EMAIL_A`, `LIFERPG_TEST_PASSWORD_A`, `LIFERPG_TEST_EMAIL_B`, `LIFERPG_TEST_PASSWORD_B`

```powershell
node --test tests/supabase.integration.test.mjs
```

Live test เตรียม login/refresh/logout, anonymous denied, A อ่าน/แก้ B ไม่ได้ผ่าน Data API, direct reward/definitions/completed denied, locked/incomplete denied, เริ่ม timer ซ้ำ/พัก/ทำต่อ และ completion พร้อมกันสอง sessions/retry ได้ ledger เดียว การ signup/email links/SSR cookie refresh/signout UI และเล่นครบ 5 ด่านข้าม browser/อุปกรณ์ต้องตรวจด้วย browser แยกหลังตั้งค่า ไม่อ้างว่าผ่านจาก test นี้

ตรวจ advisors ของ liferpg จริงในขั้น6และซ้ำsecurityขั้น7 ล่าสุดมี WARN leaked password protection disabled ดู [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ยังไม่เปลี่ยน Auth settings หรือเพิ่มบริการเสียเงิน Performanceขั้น6แก้unindexedFKแล้ว เหลือunused_index INFOตามประวัติ verification

## การซิงก์และข้อจำกัด
store เดิมแยก mode ด้วย httpOnly cookie Auth event/สลับบัญชี/โหมดล้าง view แล้ว refetch; generation/revision ป้องกัน response เก่าทับข้อมูล ข้ามแท็บ browser เดียวใช้ BroadcastChannel และโหลดใหม่ตอน focus/visibility ไม่มี Realtime ข้ามเครื่องตลอดเวลา เปิดหน้า/เข้าบัญชีอีกเครื่องจะอ่าน server ใหม่

Demo ไม่ถูกอัปโหลดและยังแก้เองได้ ไม่มี claim ป้องกันโกง โหมดบัญชีตรวจสถานะ/รางวัลใน DB แต่ checklist และการยืนยันผลงานยังเป็น self-report ไม่ใช่การพิสูจน์ว่างานเสร็จ เครือข่ายล้มเหลวไม่แสดงรับรางวัลสำเร็จ ต้อง retry/load snapshot อาจสำเร็จที่ server แล้วก่อน response หาย unique ledger ป้องกันเพิ่มซ้ำ

อ่าน [ผลตรวจจริง](verification.md) ก่อนสรุปว่าพร้อมใช้งานจริง ขั้น7ตรวจ demo ครบแล้ว บัญชีจริงยังมีข้อจำกัด live integration ไม่มี push/deploy

เมื่อวางหลัง reverse proxy ต้อง preserve Host และ sanitize x-forwarded-proto เพราะการตรวจ same-origin และ callback ใช้ host จริงแทน request.url ที่ Next อาจ normalize เป็น localhost

Remote นี้ลง migrations ผ่าน MCP แล้ว และชื่อ local files ตรงกับ list_migrations จริง ไม่ต้อง apply schema ซ้ำ ดู verification ส่วน remote ล่าสุดก่อนใช้ CLI ต้อง link กับ ref นี้เท่านั้น และ dry-run ก่อนเสมอ


## รัน live test จากไฟล์ในเครื่อง (อัปเดต)
หลังสมัครและยืนยันอีเมลบัญชีทดสอบใหม่2บัญชีแล้ว เพิ่ม4บรรทัดใน `.env.local` โดยกรอกเอง ห้ามส่งรหัสผ่านในแชต:

```dotenv
LIFERPG_TEST_EMAIL_A=อีเมลทดสอบใหม่_A
LIFERPG_TEST_PASSWORD_A=รหัสผ่านของ_A
LIFERPG_TEST_EMAIL_B=อีเมลทดสอบใหม่_B
LIFERPG_TEST_PASSWORD_B=รหัสผ่านของ_B
```

ใช้บัญชีที่ยังไม่เลือกเป้าหมาย/เริ่มเควสต์ ตัวทดสอบตรวจแล้วหยุดหากมีprogressอยู่ ไม่resetให้ บัญชีที่ใช้ตรวจbrowserผ่านด่าน1แล้วไม่ใช้เป็นบัญชีAของsuiteนี้ สคริปต์ใหม่อ่าน.env.localเองและใช้NEXT_PUBLIC URL/keyของแอป ไม่ต้องกรอกURL/keyซ้ำ:

```powershell
npm run test:live
```

บัญชีAจะผ่านด่าน1ระหว่างtest บัญชีBยังไม่ผ่าน ไม่แก้ข้อมูลบัญชีเดิม ใช้บัญชีทดสอบใหม่เมื่อรันรอบใหม่ ดูverificationว่าผลไหนตรวจจริงแล้ว งานยังไม่ครบuntiltwo-account/livechecksสำเร็จ
