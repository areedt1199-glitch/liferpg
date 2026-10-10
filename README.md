# liferpg

เว็บพัฒนาชีวิตในรูปแบบ RPG — ขั้นที่ 7: ตรวจ MVP และแก้คำขอเครือข่ายค้างแล้ว Demo เล่นครบ 5 ด่านผ่าน browser จริง รวมรางวัล 510 XP / 150 เหรียญ / เลเวล 6 ตรวจ UI ที่ 390, 768 และ 1440px แล้ว Supabase เชื่อมจริง แต่การทดสอบสองบัญชีและ live integration เต็มชุดยังติดบัญชีทดสอบ จึงพร้อมสาธิต demo และใช้บัญชีเดิมแบบต้นแบบ ยังไม่รับรองความพร้อมเปิดใช้งานทั่วไป ดู [ผลตรวจล่าสุด](docs/verification.md) และ [คู่มือสาธิต](docs/mvp-demo-guide.md)

## รันในเครื่อง
Node.js 20.9+ (ตรวจบน 24.12.0), npm 11.6.2

```powershell
cd 'C:\งานอาจารย์นาราศักดิ์\liferpg'
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3010
```

เปิด http://127.0.0.1:3010/profile ดู [คู่มือตั้งค่า Supabase](docs/supabase-setup.md) ก่อนใช้งานบัญชี ห้ามส่งรหัสผ่านหรือ secret key ในแชต

## โหมดข้อมูล
- **บัญชีจริง** เป็นค่าเริ่มต้น ใช้ SSR cookies และตรวจตัวตนบน server ก่อนอ่าน/เขียน โหลด snapshot จากฐานข้อมูล ไม่ใช้ข้อมูล demo แทนเมื่อเครือข่ายหรือฐานข้อมูลผิดพลาด
- **demo** ต้องเลือกเองใน profile ใช้ localStorage key เดิม `liferpg.progress.v1` และ schema 4 อ่าน schema 1/2/3 ได้ ใช้ Web Locks สำหรับเขียนข้ามแท็บ ถ้าไม่รองรับจะไม่เขียน ไม่มี reset ใน flow ปกติ
- ข้อมูล demo เดิมยังอยู่ตาม browser/origin (รวมพอร์ต) ไม่อัปโหลด ไม่รวม XP เหรียญหรือ completed เข้าบัญชีใหม่ บัญชีใหม่เริ่มศูนย์จากฐานข้อมูล

## Flow
วันนี้ → เลือก “สร้างเกมแรก” → แผนที่ → รายละเอียด → เริ่มเควสต์ → focus → checklist ครบ → ยืนยันเงื่อนไขด้วยตนเอง → รับรางวัล → เปิดรายละเอียดด่านถัดไป ต้องเริ่มเอง ไม่มี auto start ด่านสุดท้ายจบเป้าหมาย

Checklist ใช้ step ID คงที่ เช็กครบหรือ timer ครบไม่ผ่านอัตโนมัติ Timer เริ่ม/พัก/ทำต่อ/จบรอบ/เริ่มใหม่ ใช้ timestamp และ elapsed ที่บันทึก ไม่เขียนทุกวินาที Running เดินต่อเมื่อออกหน้า; paused ไม่เดิน บัญชีใช้เวลา server สำหรับ lifecycle และปรับเวลาแสดงผลจาก snapshot เวลาเป็นบันทึกที่ผู้ใช้รายงาน ไม่ใช่หลักฐานผลงาน

รางวัลจาก definitions (8 ด่าน): XP 120/80/90/100/120/130/140/150, เหรียญ 35/20/25/30/40/45/50/60 รวม 930/305 เลเวล `1 + floor(totalXP / 100)` ไม่มีโบนัสจบเป้าหมาย บัญชีคำนวณยอดจาก reward ledger แหล่งเดียว ไม่มีคอลัมน์ยอดที่ผู้ใช้แก้ได้

## ไฟล์หลัก
- `src/lib/supabase/`: config, browser/server clients; `src/proxy.ts`: session refresh และ private no-store
- `src/features/account/`: Auth actions/forms และ provider; `/profile`, `/auth/callback`, `/auth/confirm`
- `src/app/api/progress/route.ts`: verified user + same-origin mutations; ไม่ส่ง user ID/ยอดรางวัล/เวลา browser ไปเชื่อในฐานข้อมูล
- `src/features/journey/progress-store.ts`: store เดิม เพิ่ม account transport, revision guard, ล้าง view เมื่อ identity เปลี่ยน
- `src/features/journey/definitions.ts`: เนื้อหาเดิม; `progress.ts`/`focus/rules.ts`: กฎ demo/validation/display
- `supabase/migrations/`: schema/RLS/grants/transaction และสำเนานิยามเริ่มต้นแบบ immutable
- `supabase/seed.sql`: seed ทำซ้ำได้; `scripts/generate-seed.mjs`: สร้างจาก definitions เดิม
- `tests/progress.test.mjs`, `database.test.mjs`, `supabase.integration.test.mjs`
- `docs/product-plan.md`, `docs/verification.md`, `docs/screenshots/`

Routes เดิม `/today`, `/goals`, `/goals/[goalId]`, `/quests/[questId]`, `/quests/[questId]/focus`, `/character`, `/profile` ยังอยู่ focus ซ่อน navigation หลัก และ ID ไม่พบใช้ not-found

## ตรวจโค้ด
```powershell
npm run test
npm run lint
npm run typecheck
npm run build
npm start -- --hostname 127.0.0.1 --port 3010
```

Default test ใช้ Node runner และ PGlite ทดสอบ SQL จริงใน PostgreSQL engine จำลอง ไม่ใช่การเชื่อม Supabase Auth/PostgREST ดูผลและรายการที่ยังตรวจไม่ได้ใน [verification](docs/verification.md) Live integration ต้อง opt-in กับบัญชีทดสอบใหม่ตามคู่มือ

ตรึง @supabase/supabase-js 2.117.3, @supabase/ssr 0.12.7, Supabase CLI 2.120.0, PGlite (test only) 0.5.8 และ lockfile ใช้ Next.js 16.4.0/React 19.3.0 เดิม ไม่ใช้ audit fix --force หรือ downgrade ข้าม major; npm ยังรายงาน high 5 รายการใน toolchain เดิม

ตรวจ database advisors จริงแล้ว ล่าสุดขั้น7มีคำเตือน leaked password protection disabled ผู้ใช้สมัคร/ยืนยันอีเมลเอง ตรวจ login/refresh/progress/logout จริงในขั้น6 ยังไม่ตรวจ live integration สองบัญชีครบชุด ไม่มี Docker/Postgres service ในเครื่องนี้ ไม่มี Git repository ไม่มี push/deploy ดูข้อจำกัดและผลตรวจขั้น7ใน verification

หน้าบัญชี: เลือกเข้าสู่ระบบหรือสมัครสมาชิกใน /profile สมัครต้องกรอกรหัสผ่านและยืนยันให้ตรงกัน (ตรวจทั้ง client/server) มีปุ่มแสดง/ซ่อนรหัสผ่าน และคำแนะนำยืนยันอีเมล ไม่เปลี่ยนการตั้งค่า Auth ของ Supabase


## ส่วนขยายจาก LifeQuest (9 ตุลาคม 2026)
เพิ่ม /careers (12 เส้นทาง / 54 งานแนะนำ), /shop (ชุด 2D 4 แบบ), /chat และ /progress โดยใช้ progress-store และ snapshot เดิม schema 4 อ่าน schema 1–3 ได้ ไม่ล้างเควสต์ เวลา หรือรางวัลเดิม เลือกเส้นทางเป็นแผนเรียน ยังไม่สร้างเควสต์รับรางวัลเพิ่มเติม
ร้านใช้เหรียญเกม: ชุดเริ่มต้นฟรี รุ่งอรุณ 30 แสงจันทร์ 45 สายน้ำ 60 ซื้อครั้งเดียวและสวมได้เมื่อเป็นเจ้าของ ยอดจริงคือ reward ledger หัก outfit purchases ธุรกรรมบัญชีล็อก user_progress และอ่านราคาใน DB ไม่เชื่อราคาจาก browser
กราฟ XP / เหรียญที่ได้รับ / จำนวนเควสต์ แสดง 7 หรือ 30 วัน ตามวันประเทศไทย เหรียญในกราฟเป็นยอดได้รับก่อนซื้อชุด เวลาโฟกัสแสดงยอดที่บันทึกแล้วต่อเควสต์ ไม่อ้างเป็นเวลาแต่ละวัน
แชทฟรีค้นคลังบทเรียนในเครื่องตาม LifeQuest ไม่ใช่ generative AI มี API Gemini เตรียมไว้แต่ปิดค่าเริ่มต้น: ตั้ง GEMINI_ENABLED=true, GEMINI_API_KEY และ GEMINI_MODEL ใน .env.local เฉพาะ server ต้องเข้าสู่บัญชีและยินยอมส่งคำถามพร้อมเนื้อหาบทเรียนไป Google มี quota 20 requests/วัน และเว้น 2 วินาที รวมคำขอที่ provider ล้มเหลว ยังไม่ทดสอบ Gemini จริง และ quota ไม่รับประกันว่าผู้ให้บริการไม่มีค่าใช้จ่าย
Migration 20261009093333_lifequest_growth.sql ใช้กับ Supabase โปรเจกต์เดิมแล้ว ไม่คัดลอก Firebase configuration หรือข้อมูลผู้ใช้จาก LifeQuest ไม่เพิ่ม dependency ไม่ push/deploy


## ระบบสู้บอส Turn-Based (11 ตุลาคม 2026)
- เป้าหมาย "สร้างเกมแรก" ขยายเป็น 8 ด่าน (เพิ่ม ฟังก์ชัน / ลิสต์และคะแนนสูงสุด / เผยแพร่เกม) บอสด่าน N มี N+2 คำถาม รวม 52 ข้อ ทุกข้อมีคำอธิบายและลิงก์แหล่งอ้างอิง (Python docs, MDN, Pro Git ฯลฯ) ข้อที่มีโค้ดเลือกดูเป็น Python หรือ JavaScript ได้ ตำแหน่งเฉลยตรงกันทั้งสองภาษา
- `src/features/boss/catalog.ts` เป็นแหล่งข้อมูลเดียวของคำถามและเฉลย เขียนตัวเลือกถูกไว้แรกเสมอ แล้วสลับลำดับแบบคงที่ตาม id; `scripts/generate-boss-v2-migration.mjs` สร้าง migration จากไฟล์นี้
- กติกา: ตอบถูก = โจมตีบอส, ตอบผิด = เสียหัวใจและข้อนั้นวนกลับมา, คำใบ้ 1 ครั้ง, หัวใจ 3–5 ดวงตามด่าน ชนะแล้วจึงส่งคำตอบให้ server ตรวจ (`boss_attempt`) แบบเดิม ผลบอสเก็บ `total` แล้ว ผลชนะ 3/3 เดิมยังใช้ได้
- ภาพบอส ตัวละคร และฉาก 16-bit วาดด้วยโค้ดทั้งหมดใน `src/features/boss/pixel/`
- เพลงต่อสู้ 8 เพลงจาก OpenGameArt (CC0 / CC-BY 3.0) แปลงเป็น MP3 112 kbps ใน `public/audio/battle/` เครดิตอยู่ที่ `/credits` และ `src/features/boss/music.ts`
- ข้อมูล demo/snapshot แบบ 5 ด่านย้ายอัตโนมัติ ผู้ที่จบ 5 ด่านแล้วไปต่อด่าน 6 ได้ทันที
- Migration ใหม่ `20261010120000_daily_practice.sql` และ `20261011120000_eight_levels.sql` ทดสอบกับ PGlite แล้ว ยังไม่ได้ apply กับ Supabase จริง
