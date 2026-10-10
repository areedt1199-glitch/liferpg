# ผลตรวจล่าสุด — ขั้นที่ 7 (8 ตุลาคม 2026)

## คำตัดสิน MVP
**พร้อมสาธิต demo** หลังเล่นครบ5ด่านผ่าน production browser จริง ส่วน **บัญชีจริงเชื่อมและใช้เป็นต้นแบบได้ แต่ยังไม่รับรองเปิดใช้งานทั่วไป** เพราะขาด live integration สองบัญชีและอีก session เต็มชุด ไม่ใช้ผล PGlite/mock แทนผล Supabase จริง ไม่มี push/deploy ไม่มีการเขียนหรือ reset ข้อมูลบัญชีผู้ใช้ในขั้น7

## สิ่งที่แก้ในขั้นนี้
- Account GET/POST progress เพิ่ม AbortSignal.timeout 15วินาที เดิมไม่มี deadline ทำให้ loading/ปุ่มบันทึกค้างได้เมื่อเครือข่ายไม่ตอบ ตอนนี้เข้าสู่ error/ลองใหม่ได้ ไม่แสดงรางวัลสำเร็จจากtimeout ถ้า server บันทึกก่อนresponseหาย ledgerยังกัน retryซ้ำ
- QuestAction ปิดปุ่มเริ่มระหว่างบันทึกและคืนปุ่มเมื่อผิดพลาด กฎสถานะ/transactionเดิมยังป้องกันเริ่มซ้ำ
- Sidebar ใช้คำว่าต้นแบบ MVP แทนเลขขั้น6 ไม่เปลี่ยนธีม/เพิ่มฟีเจอร์
- Regression test จำลอง timeoutโดยส่ง signalที่abortทันที ไม่รอ15วินาทีจริง ตรวจออกจากloading/error/reloadสำเร็จ และไม่รับรางวัลปลอม เพิ่ม assertion timerหมดในSQLยังin_progress/XP0

## Demo — ตรวจจริงใน browser
ใช้ production ที่127.0.0.1:3011 และ localStorage originใหม่ซึ่งเริ่ม0XP ไม่ล้างdemoเดิมที่3010 ไม่มี reset DB เลือกโหมดdemoด้วยUI ท้ายงานคืนcookieโหมดบัญชีจริงและปิดแท็บ/production3011 ข้อมูลทดสอบdemo3011คงไว้ ไม่แก้localStorageผ่านbrowser evaluate

เล่นเส้นทางสร้างเกมแรกครบ5ด่าน: เลือกเป้าหมาย→แผนที่→รายละเอียด→เริ่ม→checklist→timerเริ่ม/พัก/ทำต่อ→ยืนยัน→รางวัล→ปลดล็อกเฉพาะถัดไป→จบเป้าหมาย แต่ละด่านยืนยันก่อนtimerครบ ไม่รอcountdownจริงหลายสิบนาที

- ด่านvariablesที่ล็อกเปิดURL focusตรงแสดงblocked ไม่มีchecklist/timerให้แก้
- toolsเริ่ม0/3 ปุ่มสำเร็จdisabled พักที่19:57/สะสม00:03 เช็ก3/3แล้วrefreshยัง3/3/paused/เวลาเท่าเดิม ยกเลิกdialogไม่ผ่านหรือรับรางวัล
- ทำต่อรอบแล้วเปิดdialogสองแท็บ คลิกยืนยันคู่ขนานด้วยPromise.allSettled ได้ผล120XP/35เหรียญครั้งเดียว วันนี้1/5/d่าน2available ไม่เกิดยอด240/70 ตรวจผ่านUI ไม่อ่านstorageหรือtokens
- refreshผลสำเร็จไม่แสดงlevel-upอีก ปุ่มถัดไปเปิดรายละเอียดไม่เริ่มเอง
- ด่าน2ได้80XP/20เหรียญและlevel2→3 ด่าน3ได้90/25ไม่แสดงlevelup ด่าน4ได้100/30 level3→4 ด่าน5ได้120/40 level4→6
- todayหลังrefreshจบ5/5, total510XP/150เหรียญ/level6/10XPในเลเวล/เหลือ90 ตรงcharacterและผลสุดท้าย goalsจบเป้าหมาย map5ด่านcompletedตัวละครอยู่ด่าน5 ไม่มีปุ่มเริ่มเควสต์ที่ไม่มีอยู่
- หลังbuildใหม่เปิดproductionอีกครั้ง refreshยังจบเป้าหมาย ไม่สูญข้อมูล

## กฎและข้อผิดพลาด — ทดสอบในเครื่อง
`npm run test` ผ่าน29/ล้มเหลว0/liveข้าม1: กฎเวลาจำลอง start/pause/resume/expiry/new/closeactualtime, เวลาพักไม่นับ, expiryไม่ผ่านอัตโนมัติ, activeหนึ่งรายการ, locked/incompleteถูกปฏิเสธ, migrationเก็บchecklist/timer/active, localStorageเสีย/quotaไม่เขียนทับ, ล้มเหลวไม่แสดงรางวัล, retry/two-tabdemoครั้งเดียว, level99/100/199/200และข้ามหลายlevel, accountgenerationกันข้อมูลเก่าหลังlogout/modechange, offline/timeoutไม่fallbackdemo

PGlite testsใช้PostgreSQL engineและschema/seedจริงในเครื่อง แต่จำลองauth.uid boundary ตรวจRLS A/B, grants, helper restrictions, payloadปลอมXP/user/time, ledgerunique, atomiccompletion,5ด่านครบ และseedreplay ไม่ใช่SupabaseAuth/PostgRESTหรือlockหลายconnectionจริง Browserfailure injection/networkoffline/storagequotaไม่ได้ทำเพิ่ม ผลนั้นเป็นunit/SQLtestsตามรายการ

## Supabase จริง — ตรวจแบบอ่านอย่างเดียวในขั้น7
- .env.localมีอยู่ URLตรงynxtoynvjgvxulvxxmxn/publishableprefixถูกต้อง ไม่พิมพ์ค่า
- Auth settings200/emailenabled/confirmemailtrue; anonymousRPCsnapshot401; DB5quests/15steps/publicRLSทั้งหมดtrue/auth.users1
- HTTPproduction3010 GETprogressไม่มีsession401/private-no-store; unknownquest/goal/route404; callbackไม่มีcode307ไปprofile?auth=errorhost127เดิม; cross-originPOST403 ไม่มีredirectloopในกรณีที่ตรวจ
- SecurityadvisorsปัจจุบันมีWARN leaked password protection disabled: [คำแนะนำ Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ไม่เปลี่ยนsecuritysettingsหรืออัปเกรดแผนเอง ยังไม่รับรองhardeningพร้อมproduction
- หลักฐานบัญชีจริงlogin/ด่าน1/completionสองแท็บ/ledger1/refresh/logoutล้างสองแท็บมาจากขั้น6ด้านล่าง **ไม่ได้เล่นบัญชีเดิมครบ5ด่านในขั้น7** เพื่อรักษาข้อมูลของผู้ใช้ Signup/emailconfirmationเจ้าของทำเอง ไม่ใช่agentตรวจทุกขั้น
- `npm run test:live` รันจริงexit1ที่configurationgateก่อนnetwork: ไม่มีtestemail/password A/B ทั้ง4ตัวแปร ปัจจุบันมีบัญชีเดียว การสมัครบัญชีที่สองก่อนหน้านี้ไม่สำเร็จ ยังไม่ตรวจlive Aอ่าน/แก้BทางDataAPI, signup/refresh/logoutหลายsessionอัตโนมัติ, อีกbrowser/device, concurrentRPCsuiteทั้งชุด ไม่ขอรหัสผ่านในแชตหรือสร้างบัญชีผ่านadminเพื่อเลี่ยงAuth

## UI และ accessibility
Browserจริงวันนี้/แผนที่/โฟกัส/ผลสำเร็จ ตรวจinnerWidth390,768,1440ทุกหน้าที่ระบุและscrollWidth<=innerWidthทั้งหมด แรกใช้hiddentabซึ่งยัง1280แม้ตั้งviewport จึงเปลี่ยนเป็นvisibletab ตรวจขนาดจริงแล้วถ่ายใหม่ ไม่ใช้ผล1280อ้างว่าผ่านมือถือ

ภาพตรวจfocus390และdesktop/map390และdesktop: ข้อความไทยอ่านได้ ไม่เห็นปุ่ม/จุดด่าน/ตัวละครทับกัน map5buttons/ตัวละคร1 โฟกัสไม่มีsidebar navigation มือถือfixednavมีpaddingbottomรวมsafe-areaจากCSS ยังไม่ตรวจnotchหรืออุปกรณ์มือถือจริง Fullpageภาพfixednavอาจอยู่กลางภาพตามตำแหน่งviewport ให้ใช้การเลื่อนหน้าจอจริงประกอบ

Keyboard: Enterเลือกด่าน2แล้วstatusเปลี่ยนชื่อถูกต้อง Tabจากด่าน5ไปลิงก์รายละเอียดและcomputedoutline solid Dialogยกเลิกด้วยปุ่มได้ มีlabelscheckbox/buttons/statusicons+ข้อความ ไม่ใช้สีอย่างเดียว ไม่ใช่fullscreenreader/WCAGaudit

ตรวจCSSมีprefers-reduced-motionสำหรับฉาก/ตัวละคร แต่ไม่ได้จำลองOS reduced-motionผ่านbrowsertools จึงไม่อ้างruntimeผลส่วนนั้น Browserconsoleระดับerrorคืน[]ตลอดflowที่ตรวจ ไม่พบhydrationerrorจากแอปในlogsดังกล่าว หลังbuildสุดท้ายตรวจซ้ำ[] ไม่ครอบคลุมทุกbrowser

ภาพ: screenshots/step7-{today,map,focus,reward}-{390,768,1440}.jpg เป็นสถานะdemoก่อนจบสำหรับแสดงflowตามชื่อไฟล์

## Checks และความปลอดภัยไฟล์
Lint/typecheck/tests/productionbuildผ่าน เปิดproduction3010/3011ได้ Ready หลังbuildสุดท้าย คง3010ไว้ให้ผู้ใช้ ปิด3011หลังทดสอบ

`node scripts/check-mvp-environment.mjs` ตรวจแบบอ่านอย่างเดียว: สแกนsrc/scripts/tests/docs/clientbundle/.env.example/READMEไม่พบsb_secret/privatekey/service_roleJWTตามregexที่ใช้ ไฟล์.env.localignored ไม่มีGitrepositoryให้ตรวจhistory การสแกนpatternไม่ใช่หลักประกันว่าพบsecretทุกรูปแบบ logsที่ดูไม่มีkeys/tokens ไม่พิมพ์ค่าcredentials

`npm audit --omit=dev --json` ไม่พบช่องโหว่0 ส่วนauditเต็มยังhigh5จากbraces→micromatch→fast-glob→Nexteslint toolchain ไม่มีpatchedminor: npmviewbracesล่าสุด3.0.3/3.0.4ไม่พบ npmเสนอdowngradeeslint-config-nextไป14.2.35ข้ามmajor จึงไม่ทำ ไม่ใช้auditfix--force คงข้อค้างสำหรับdependency maintenance [advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)

## ส่งมอบและข้อค้าง
ขั้น7งานตรวจ/แก้ในขอบเขตที่ทำได้จบ พร้อมdemo; liveA/Bintegrationยังเป็นblockerการรับรองใช้งานทั่วไป ไม่เพิ่มร้านค้า/บอส/SkillTree/3D ไม่push/deploy ดู[mvp-demo-guide.md](mvp-demo-guide.md) สำหรับสาธิต ข้อความขั้น1–6ต่อไปนี้เป็นประวัติตามเวลาที่ตรวจ ให้ใช้ส่วนขั้น7ด้านบนเป็นสถานะล่าสุด

---

# ประวัติผลตรวจขั้นที่ 1 — 8 ตุลาคม 2026

## สภาพแวดล้อม
- โฟลเดอร์เริ่มต้นว่าง: `C:\งานอาจารย์นาราศักดิ์\liferpg` สร้างตรงนี้ ไม่มีโฟลเดอร์ซ้อน
- ไม่พบ AGENTS.md ก่อนสร้าง ตัว Next.js สร้าง AGENTS.md ภายหลัง อ่านและตรวจแนวทาง layouts/pages, server/client components และ navigation จากเอกสารที่ติดตั้งไว้แล้ว
- Node.js 24.12.0, npm 11.6.2, Git 2.55.0.windows.2
- ไม่มี Git repository จึงไม่มี diff หรือ commit ไม่ push/deploy

## การตรวจโค้ด
- `npm run lint`: ผ่าน
- `npm run typecheck`: ผ่าน สร้าง route types และตรวจ strict TypeScript
- `npm run build`: ผ่าน สร้าง routes `/`, `/today`, `/goals`, `/character`, `/profile`
- sandbox ของตัวช่วยรันทำให้ SWC canonicalize path บน Windows ไม่ได้ (Access denied) เมื่อรันด้วยสิทธิ์ปกตินอก sandbox ทั้ง dev และการตรวจผ่าน

## Browser
ตรวจด้วย Codex in-app browser บน dev server ที่ localhost:3000
- Desktop 1440 × 900 และมือถือ 390 × 844: เปิดครบทั้ง 4 routes ผ่าน navigation ตรวจ h1 ตรงหน้าและ aria-current ตรงเมนู
- ไม่พบ horizontal overflow ในทั้ง 8 กรณี
- มือถือ 320 × 740: `/` redirect ไป `/today` ถูกต้อง ไม่พบ horizontal overflow ตรวจภาพหน้าจอ เมนูล่างแสดงครบ
- ตรวจภาพหน้า today บน desktop และมือถือ มีพื้นที่เผื่อ bottom navigation และ safe area
- ปิด Next.js dev indicator เพราะตำแหน่งเดิมบังเมนูวันนี้บนมือถือ แล้วตรวจ navigation ซ้ำผ่าน
- มี focus-visible และ skip link ใน CSS ยังไม่ได้ทดสอบกับ screen reader หรืออุปกรณ์มือถือจริง

## Dependency audit
`npm audit` รายงาน high 5 รายการในสาย dependency เครื่องมือ lint จาก braces ถึง eslint-config-next วิธีแก้ที่เสนอคือ downgrade config ไป 14.2.35 ซึ่งไม่สอดคล้องกับ Next.js 16 จึงยังไม่เปลี่ยนข้ามรุ่นหลัก ไม่มีการอ้างว่า audit ผ่าน

ไม่มี unit tests สำหรับ placeholder ตามขอบเขตคำขอ งานสิ้นสุดที่ขั้นที่ 1

---

# ผลตรวจขั้นที่ 2 — 8 ตุลาคม 2026

## ก่อนแก้ไข
อ่าน AGENTS.md, README.md, product-plan และผลตรวจเดิม ตรวจ scripts และโค้ดจริง README ไม่มี product-plan แทรกใน code block คำสั่งรัน อ่านคู่มือ dynamic params, not-found และ server/client components ของ Next.js ที่ติดตั้งไว้ ไม่มี Git repository และไม่เพิ่ม dependencies

## สิ่งที่ตรวจผ่าน
- `npm run lint`, `npm run typecheck`, `npm run build` ผ่าน
- Build มี dynamic routes `/goals/[goalId]`, `/quests/[questId]`, `/quests/[questId]/focus` และรักษา routes เดิม
- Browser ขนาด 390 × 844 และ 1440 × 900: วันนี้, เป้าหมาย, แผนที่, รายละเอียดเควสต์, focus, character, profile ไม่พบ horizontal overflow
- เดินจากวันนี้ผ่านลิงก์ดูแผนที่ → รายละเอียดเควสต์ → โฟกัส → กลับรายละเอียด → แผนที่ → เป้าหมายได้ ลิงก์เปิดแผนที่จากการ์ดเป้าหมายทำงาน และปุ่มเปิดเควสต์จากวันนี้ทำงานด้วย Enter
- เมนูเป้าหมาย active บนแผนที่และรายละเอียดเควสต์ หน้า focus ไม่มี navigation หลัก
- แผนที่มีปุ่ม 5 จุดขนาด 62 × 62px ตรวจชื่อและสถานะด้วย accessibility tree เลือกทุกจุดด้วย Enter และเลือกด่านล็อกบนมือถือด้วย Space ได้ มี focus outline แบบ solid และรายละเอียดเปลี่ยนตามจุดที่เลือก
- ด่านล็อกแสดงชื่อ งาน เงื่อนไขสำเร็จ และรางวัลตัวอย่าง แต่ไม่มีลิงก์เข้าโฟกัส
- เปิด `/quests/loops/focus`, `/quests/guess-number/focus`, `/quests/improve-game/focus` โดยตรง: แสดงหน้าปิดการเข้าถึง ไม่มีตัวจับเวลา preview เช่นเดียวกับ `/quests/tools/focus` ที่ผ่านแล้ว
- เปิด `/quests/missing`, `/goals/missing`, `/quests/missing/focus`: แสดง not-found ภาษาไทย และไม่มีตัวจับเวลา
- ตรวจภาพหน้าจอวันนี้ แผนที่ และโฟกัส ข้อความไทย ขั้นตอน และเงื่อนไขสำเร็จแสดงได้ ภาพ desktop/mobile เก็บใน `docs/screenshots/`

## ข้อจำกัดของการตรวจ
ทดสอบใน Codex in-app browser บนเครื่อง ไม่ได้ทดสอบมือถือจริงหรือ screen reader การ resize ของ browser ใช้เวลาปรับ จึงตรวจ innerWidth และยืนยัน desktop ซ้ำเมื่อเป็น 1440px แล้ว

ระหว่างทำงาน dev server แสดง CSS เก่า หลัง restart และ reload แสดง CSS ล่าสุดถูกต้อง lint/typecheck/build ผ่านนอก sandbox ตามข้อจำกัด SWC ของ Windows ที่บันทึกในขั้นที่ 1

## ขอบเขตที่ยังไม่พัฒนา
ข้อมูลทั้งหมดเป็น fixture ชุดเดียว ไม่มี countdown การผ่านด่าน รับรางวัล persistence หรือฐานข้อมูล ไม่มีปุ่มเริ่ม พัก หรือสำเร็จที่จำลองระบบจริง การตรวจด่านที่ route เป็นเพียงการตรวจสถานะ fixture ไม่ใช่ระบบสิทธิ์จริง

ยังไม่ได้แก้ audit ด้วย force หรือ downgrade ไม่ได้ตรวจ audit ใหม่ในขั้นนี้ รายงานเดิมยังเป็นข้อจำกัดที่ต้องติดตาม ไม่มี push/deploy และหยุดก่อนเริ่มระบบขั้นที่ 3

---

# ผลตรวจขั้นที่ 3 — 8 ตุลาคม 2026

## การเปลี่ยนแปลง
อ่าน AGENTS.md และเอกสาร/implementation ขั้นที่ 2 ก่อนแก้ แยก fixtures เดิมเป็น definitions.ts ที่ไม่มี user status และ progress.ts สำหรับกฎพร้อม progress-store.ts สำหรับ localStorage ใช้แผนที่และ components เดิม ผู้ใช้ใหม่ไม่มีเป้าหมาย/active quest ด่าน 1 available ด่าน 2–5 locked ไม่มี completed ไม่มีความก้าวหน้า 1/5 จาก fixture เดิม

แก้ข้อความใน profile ที่ระบุว่ายังไม่บันทึกความก้าวหน้าให้ตรงกับการบันทึกเฉพาะ browser เครื่องนี้ หน้า character ยังเป็น placeholder เดิม รักษา routes/navigation/theme ไม่เพิ่ม dependencies ไม่ push/deploy ไม่มี Git repository

## ตรวจอัตโนมัติ
- npm run test: ผ่าน 6 tests ด้วย Node test runner และ TypeScript compiler ที่ติดตั้งเดิม
- ตรวจ initial state, immutable definitions/progress, การเลือกเป้าหมาย, เริ่มซ้ำแบบ idempotent, ไม่ปลดล็อกด่าน 2, ไม่เริ่ม locked/unknown/active quest ที่สอง
- ตรวจ JSON round trip, version ผิด, ข้อมูลเสียหาย/สถานะไม่สอดคล้อง, สถานะ completed ที่ยังเกิดไม่ได้ใน schema นี้
- ตรวจ storage persistence ผ่านการสร้าง store ใหม่ และเมื่อ write ล้มเหลวหรือข้อมูลเสียหายจะไม่อ้างว่าเริ่มแล้ว/ไม่เขียนทับ
- npm run lint, npm run typecheck, npm run build: ผ่าน

## Browser
ตรวจด้วย Codex in-app browser บน localhost:3000 (dev) และ localhost:3001 (production ที่เปิดชั่วคราวเพื่อแยก origin ของผู้ใช้ใหม่)
- ผู้ใช้ใหม่แสดงเลือกเป้าหมายและ 0/5 ไม่มีด่านที่ผ่านแล้ว
- เปิด /quests/tools/focus ก่อนเริ่ม: กลับ /quests/tools ให้เริ่มก่อน เลือกเป้าหมาย → เปิดแผนที่ → รายละเอียด → เริ่มเควสต์ด้วย Enter → focus ทำงาน
- reload แผนที่แล้วเป้าหมายยังถูกเลือก reload focus แล้วยังเปิดเควสต์ tools ได้ กลับวันนี้แสดงกำลังทำและทำต่อ ความก้าวหน้ายัง 0/5
- ปุ่มทำต่อจากวันนี้ไป focus ได้ เปิดรายละเอียดแล้วแสดงทำต่อแทนปุ่มเริ่ม
- production origin ใหม่: เลือกเป้าหมาย กลับวันนี้ เห็นพร้อมเริ่ม และกดเริ่มเควสต์จากวันนี้ได้ reload focus แล้วยังคงสถานะ
- เปิด focus ของ variables, loops, guess-number, improve-game โดยตรง: แสดงหน้าปิดการเข้าถึง ไม่มี timer preview
- ID ไม่พบของ goal/quest แสดง not-found
- ขนาด 390 × 844 และ 1440 × 900: วันนี้ เป้าหมาย แผนที่ รายละเอียด tools และ focus ไม่มี horizontal overflow หน้า focus ไม่มี navigation หลัก
- เก็บภาพใหม่ชื่อ step3-* ใน docs/screenshots ภาพเก่าคือหลักฐานขั้นที่ 2

ทดสอบการเริ่มซ้ำ/ข้อมูลเสียหาย/storage failure ด้วย tests ไม่ได้แก้ localStorage ผู้ใช้ผ่าน browser automation ไม่ได้ทดสอบบนมือถือจริงหรือ screen reader

## ข้อจำกัด
LocalStorage แยกตาม browser/origin และหายเมื่อถูกล้าง ไม่ใช่ระบบสิทธิ์ฝั่งเซิร์ฟเวอร์ มี loading gate ก่อนอ่านสถานะเพื่อไม่แสดง fixture เดิม ข้อมูลไม่รองรับจะคงข้อมูลเดิมและแสดงข้อผิดพลาด

ไม่มี countdown การผ่านด่าน ปลดล็อก รับรางวัล หรือเลเวลอัป completed เตรียมชนิดข้อมูลไว้เท่านั้น ฉากและตัวจับเวลาเป็น preview เดิม ยังไม่ตรวจ audit ใหม่ ไม่ใช้ audit fix --force หรือ downgrade

Production test server พอร์ต 3001 ถูกปิดหลังตรวจ Dev server ที่ localhost:3000 เปิดไว้สำหรับใช้งาน

---

# ผลตรวจขั้นที่ 4 — 8 ตุลาคม 2026

## ก่อนพัฒนาและการเปลี่ยนแปลง
อ่าน AGENTS.md, README, product-plan, verification และตรวจ active quest/storage เดิม ใช้ progress/store ชุดเดิม เพิ่ม focus รายเควสต์ใน schema 2 โดยรักษา key liferpg.progress.v1 เพิ่ม step ID คงที่ใน definitions ไม่สร้างความก้าวหน้าอีกชุด ไม่เพิ่ม dependencies

กฎเวลาแยกที่ src/features/focus/rules.ts ส่วนกฎแก้ checklist และ timer ตรวจ canFocus ใน progress.ts การเขียน async ใช้ Web Locks แล้วอ่านข้อมูลล่าสุดภายใน lock ทุกครั้ง ปรับ callers ของเลือกเป้าหมาย/เริ่มเควสต์ให้รอการเขียนสำเร็จก่อนเปลี่ยนหน้า

## Automated checks
- npm run test: ผ่าน 11 tests
- npm run lint: ผ่าน
- npm run typecheck: ผ่าน
- npm run build: ผ่าน routes เดิมทั้งหมด
- ทดสอบเวลาแบบจำลอง: start → pause → resume → finished → new, paused ไม่เพิ่มเวลา, รอบหมดขณะปิดหน้าไม่คิดเกิน duration, finish ซ้ำไม่บวกเวลาเพิ่ม, รอบใหม่รักษายอดสะสมและ checklist
- ทดสอบเริ่มรอบ/พัก/finish/new พร้อมกันจากสอง store ที่ใช้คิว lock ร่วมกัน และ checklist คนละข้อไม่เขียนทับกัน ยอดเวลาไม่ถูกสะสมสองครั้ง
- ทดสอบ migration version 1 พร้อม active quest เป็น version 2 โดยมี idle focus/empty checklist และคง selected goal/status เดิม
- ทดสอบ stable IDs, เช็ก/ยกเลิก, เช็กครบไม่เปลี่ยน quest status, locked/available แก้ checklist/timer ไม่ได้
- ทดสอบข้อมูลเสีย version ไม่รองรับ ledger ติดลบ/duration ผิด/step ID ผิด/ซ้ำ และ storage write failure ไม่อ้างว่าบันทึกสำเร็จ

## Browser ที่ตรวจจริง
พอร์ต 3000 ใน browser แสดงโปรเจกต์ LifeQuest อื่น จึงใช้ liferpg ที่ http://127.0.0.1:3010 (dev server ของโปรเจกต์นี้) เพื่อไม่รบกวนอีกโปรเจกต์ สถานะที่พอร์ตนี้เป็น origin ใหม่ การ migration จากขั้นที่ 3 ตรวจด้วย tests ไม่ได้อ้างว่ามีข้อมูลเก่าใน browser origin นี้

- เลือกเป้าหมาย → แผนที่ → รายละเอียด → เริ่มเควสต์ → focus ทำงานหลังเปลี่ยน storage เป็น async
- checklist เช็กได้ ยกเลิกได้ แสดงจำนวนตรงกัน หลัง refresh ยังคงอยู่ และแก้ด้วย Space บน keyboard ได้
- เริ่มรอบจริง เปิดแท็บที่สอง เห็น countdown และ checklist เดียวกัน พักจากแท็บที่สองแล้วแท็บแรกเปลี่ยนเป็น paused ผ่าน storage event
- refresh หลังพัก: เวลาที่เหลือและยอดสะสมคงเดิม ตรวจอีกครั้งหลังทำงานอื่นแล้วยอด paused เท่าเดิม (00:40)
- ทำต่อรอบเดิม ออกจาก focus ไปหน้ารายละเอียดและวันนี้ timer ยัง running ไม่พักอัตโนมัติ กลับมาหรือ refresh แล้วแสดงเวลาที่คำนวณต่อได้
- หน้า today/รายละเอียดแสดง checklist count เวลาสะสม และ timer status จาก progress จริง ทำต่อเปิด tools active quest เดิม
- เช็กครบ 3/3 แล้วยังแสดงสถานะกำลังทำ ไม่มีรางวัล/ด่านถัดไปปลดล็อก
- เปิด variables/focus ที่ locked โดยตรง: แสดงหน้าปิดการเข้าถึง ไม่มี timer/checklist controls
- Desktop 1440 × 900 ตรวจภาพโฟกัส ตัวจับเวลา checklist และทางกลับ
- Mobile 390 × 844 ยืนยัน innerWidth จริง ตรวจ focus, รายละเอียด และวันนี้ ไม่มี horizontal overflow หน้า focus ไม่มี navigation หลัก ปุ่มพัก/ทำต่อและ checklist ใช้งานได้
- เก็บภาพ docs/screenshots/step4-focus-desktop.jpg และ step4-focus-mobile.jpg

ไม่ได้รอ countdown 20 นาทีใน browser การครบเวลา/ปิดหน้าจนหมดรอบ/เริ่มรอบใหม่และการกดซ้ำพร้อมกันตรวจด้วย tests เวลาจำลอง การ migration และ storage failure ตรวจด้วย tests ไม่ได้แก้ข้อมูล browser ผู้ใช้เพื่อจำลอง ไม่ได้ทดสอบอุปกรณ์มือถือจริงหรือ screen reader; reduced-motion มี CSS ปิด transition แต่ไม่ได้สลับ preference ของอุปกรณ์จริง

## ข้อจำกัดและขอบเขต
ใช้เวลาเครื่อง (timestamp) จึงอาจได้รับผลจากการเปลี่ยนนาฬิกาอุปกรณ์ แต่ clamp ไม่ติดลบและไม่เกินเวลารอบ ต้องรองรับ Web Locks บน localhost/HTTPS ถ้าไม่มีจะไม่เขียนและแสดงข้อผิดพลาด ไม่มี fallback ที่ทำให้หลายแท็บเขียนชนกัน

เวลาเป็นบันทึกโฟกัสที่ผู้ใช้รายงาน ไม่ใช่หลักฐานว่างานสำเร็จ ไม่มีการผ่านเควสต์ ปลดล็อก XP เหรียญ เลเวลอัป ไม่มี push/deploy ไม่มี Git repository

Dev server สำหรับตรวจเปิดไว้ที่ 127.0.0.1:3010 รอบของข้อมูลตรวจถูกพักไว้ หยุดก่อนขั้นที่ 5

# ผลตรวจขั้นที่ 5 — 8 ตุลาคม 2026

## สิ่งที่เปลี่ยน
อ่าน AGENTS.md และเอกสารโครงการ ตรวจ definitions/progress/focus/timer/store และคู่มือ use-client ของ Next.js ที่ติดตั้งจริง ใช้โมดูลเดิม ไม่เพิ่ม dependencies ไม่เชื่อมบัญชี ฐานข้อมูล หรือบริการภายนอก

schema 3 เพิ่ม totalXP, coins, rewards keyed by quest ID (พร้อม completedAt และ totalXPBefore), goalCompletedAt อ่าน schema 1/2 โดยคง active/checklist/เวลาและเติมยอดเป็นศูนย์ กฎ completeQuest อยู่ใน progress.ts ใช้ Web Lock/store เดิม อ่านล่าสุดก่อนเขียน snapshot เดียว ตรวจ checklist และ active แล้ว settle เวลาถึงตอนยืนยัน ปิดรอบที่ยังไม่หมดเป็น paused โดย completed ไม่มีสิทธิ์ resume ให้รางวัลครั้งเดียว ล้าง active ปลดล็อกเฉพาะถัดไป หรือจบเป้าหมาย

ใช้รางวัล definitions เดิม XP 120/80/90/100/120 เหรียญ 35/20/25/30/40 ผู้ใช้ใหม่ไม่มียอดตัวอย่าง Level=1+floor(totalXP/100) ผลรับรางวัลแสดงเลเวลอัปเฉพาะการยืนยันครั้งนั้นที่เปลี่ยนจริง มี dialog ยืนยันด้วยตนเอง ไม่ต้องรอ countdown ไม่เริ่มเควสต์ถัดไปเอง

แก้การป้องกัน timer finish ที่มาถึงหลัง completion ให้เป็น no-op เพื่อไม่แสดง error จาก race และผูกผลเลเวลอัปครั้งใหม่กับ quest ID เพื่อไม่ใช้ผลเดิมเมื่อเปลี่ยนเควสต์ แก้พื้นที่จุดหมายใต้ด่านสุดท้ายที่เคยทับข้อความ เพิ่มความสูง board เป็น 920px โดยคง SVG/จุดเดิม

## Automated checks รอบสุดท้าย
- npm run test: ผ่าน 18 tests (11 เดิม + 7 ขั้นที่ 5)
- npm run lint: ผ่าน
- npm run typecheck: ผ่าน
- npm run build: ผ่านทุก routes เดิม
- typecheck ครั้งแรกติดข้อจำกัด sandbox canonicalize path ภาษาไทย จึงตรวจด้วยสิทธิ์ที่อนุมัติแล้ว พบ type version literal ไม่รองรับ migration และแก้เป็น raw version:number ก่อนรอบสุดท้ายผ่าน
- checklist ไม่ครบผ่านไม่ได้ ครบผ่านได้ขณะที่ timer ยังไม่หมด เก็บ actual elapsed 10 วินาทีไม่บวกซ้ำ repeated completion คืน snapshot เดิม
- ปลดล็อกทีละด่านครบ 5 ด่าน active=null ทุกครั้ง ไม่มีโบนัสหรือ auto start
- ขอบเขต XP 99/100/199/200 และข้ามหลายเลเวลถูกต้อง
- สอง store จำลองสองแท็บยืนยันพร้อมกัน ใช้คิว Web Lock ร่วมกัน เขียนหนึ่ง snapshot ได้หนึ่ง reward record/yอดเวลาเดียว
- storage failure ไม่คืนผลสำเร็จและคง active/ยอดศูนย์; invalid reward/ยอด/goal timestamp ถูกปฏิเสธ; รางวัลติดลบผ่านไม่ได้
- schema 2 migration คง checklist, totalMs, running anchor และ active quest; schema 1 tests เดิมยังผ่าน
- การยกเลิกไม่เรียก mutation ตรวจจริงใน browser (pure test มีเพียงตรวจ snapshot ไม่เปลี่ยน ไม่ได้จำลอง dialog)

## Browser ที่ตรวจจริง
ใช้ http://127.0.0.1:3010 origin เดิมจากขั้นที่ 4 พบ tools active/checklist 3/3/paused 00:40 ยังอยู่ และ XP/coins เริ่มศูนย์ ข้อมูลเดิมอ่านได้ก่อน mutation โดยไม่ล้าง หลังแก้ checklist/ยืนยันเขียน schema ใหม่

- ด่าน 1 ยกเลิกเช็กแล้วปุ่มสำเร็จ disabled เช็กคืนเปิด dialog ยกเลิกแล้วสถานะและ checklist คงอยู่ ทำต่อรอบที่พักได้
- เปิด focus tools สองแท็บพร้อม dialog ยืนยันจากแท็บแรก แท็บที่สองซิงก์เป็น completed และปิด dialog ไม่มีปุ่มรับรางวัลซ้ำ การกดยืนยันพร้อมกันในช่วงเดียวกันตรวจด้วย automated test ไม่ได้อ้างว่ากดจริงสองแท็บในมิลลิวินาทีเดียว
- ด่าน 1 ยืนยันขณะ running ก่อนเวลาครบ หยุดที่เวลาโฟกัสสะสม 00:49 รายละเอียด/แผนที่ยังคงยอดนี้หลังจบเส้นทาง
- Refresh ผลด่าน 1 แสดงบันทึกรางวัลเดิมไม่มีเลเวลอัปซ้ำ แผนที่ด่าน 1 check ด่าน 2 available ด่าน 3–5 locked ตัวละครอยู่ข้างด่าน 2
- เล่นครบทั้ง 5 ด่านผ่าน UI โดยยืนยันงานตัวอย่าง ไม่รอ timer: ด่าน 2–5 checklist ครบและยืนยันได้แม้ timer idle เปิดรายละเอียดถัดไปมีปุ่มเริ่ม ไม่เริ่มอัตโนมัติ
- ด่าน 3 ไม่มีข้อความเลเวลอัป (XP รวม 290) ด่านสุดท้ายเลเวล 4 → 6; รวม 510 XP/150 เหรียญ ไม่มีโบนัสเป้าหมาย
- มือถือ 390×844: details/focus/dialog/reward/today/map ไม่มี horizontal overflow; refresh checklist ด่าน 4 คง 3/3; dialog autofocus ปุ่มกลับไปทำต่อ กด Escape ปิดแล้ว focus คืนปุ่มสำเร็จ
- today ก่อนสุดท้ายแสดง 4/5 และด่าน 5 available หลังสุดท้ายแสดงจบเส้นทาง 5/5 พร้อมยอดจริงและ refresh ได้
- character แสดงเลเวล 6, 10/100 XP, อีก 90 XP ถึงเลเวลถัดไป, รวม510, เหรียญ150; goals แสดงจบเป้าหมาย5/5
- completed จากแผนที่เปิดรายละเอียดได้ ไม่มีปุ่มเริ่มหรือรับซ้ำ
- Desktop 1440×900 ตรวจแผนที่และผลรางวัล; หลัง build เปิด production server ในเครื่องเพื่อเช็กแผนที่ล่าสุด ที่ desktop/mobile จุดหมายแยกจากด่านสุดท้ายประมาณ49/50px ไม่มี overflow และข้อความจบเส้นทางถูกต้อง
- ภาพ: docs/screenshots/step5-map-desktop.jpg, step5-map-mobile.jpg, step5-reward-desktop.jpg, step5-reward-mobile.jpg, step5-goal-completed-mobile.jpg

ไม่ตรวจอุปกรณ์มือถือจริง/screen reader หรือสลับ reduced-motion ใน OS จริง CSS มีปิด animation เมื่อ reduce ไม่มีการบังคับ quota/Web Locks หายจริงใน browser ใช้ tests ตรวจ storage failure ไม่แก้ localStorage ผู้ใช้ด้วย script ไม่ล้างข้อมูล ทดสอบนี่เป็นการยืนยันงานตัวอย่าง ไม่ใช่หลักฐานว่าได้สร้างเกมจริง

## ข้อจำกัดและจุดหยุด
localStorage แก้เองได้ ไม่ป้องกันโกงหรือเป็น server authorization ใช้ Web Locks บน localhost/HTTPS; ไม่มี fallback เขียนแบบไม่ล็อก ถ้าไม่รองรับแสดง error และไม่อ้างว่าได้รางวัล ข้อมูลแยก browser/origin ยังใช้นาฬิกาอุปกรณ์และเวลาเป็นบันทึกที่ผู้ใช้รายงาน

README และ product-plan อัปเดตแล้ว ไม่มี push/deploy หรือเชื่อม Supabase/GitHub/Figma ไม่มี Git repository หยุดก่อนขั้นที่ 6 เปิด production server ในเครื่องไว้ที่ 127.0.0.1:3010 สำหรับดูผล browser origin ทดสอบนี้จบครบ 5 ด่านแล้ว


# ผลตรวจขั้นที่ 6 — 8 ตุลาคม 2026

## การตั้งค่าและขอบเขตจริง
อ่าน AGENTS/README/product-plan/verification ตรวจ progress/timer/checklist/Web Locks และ Next.js proxy guide ใน node_modules ก่อนแก้ ใช้ Supabase skill ตรวจ official SSR/password/functions docs และ changelog รวม breaking changes PostgreSQL รุ่นใหม่ ไม่มี .env.local พบ remote หนึ่งโปรเจกต์ที่ชื่อไม่บ่งชี้ว่าเป็น liferpg และ inactive จึงไม่ query/apply migration/advisors หรือแก้ remote ไม่สร้างบริการเสียเงิน

ติดตั้ง package ตรึงเวอร์ชันและ lockfile: supabase-js 2.117.3, ssr 0.12.7, CLI 2.120.0, PGlite 0.5.8 (dev test only) ตรวจ CLI help และใช้ init/migration new สร้าง config/ชื่อไฟล์จริง ไม่มี remote db push/reset/deploy npm รายงาน high 5 รายการเดิม ไม่ใช้ force/downgrade

## สิ่งที่ตรวจจากโค้ด
SSR cookies แยก browser/server clients; Next Proxy refresh ใช้ getClaims และส่งต่อ cookie/headers ตาม SSR package รุ่นติดตั้ง ทุก account mutation/API ใช้ getUser อีกครั้ง ส่วน SQL ตรวจ auth.uid() ไม่เชื่อ user ID/เวลา/รางวัล client response ส่วนตัว private no-store Root layout dynamic จาก cookies

สมัคร/ล็อกอิน/ออก/แก้ชื่อมี Thai errors/pending; รองรับรอยืนยัน email, callback PKCE และ token hash confirm ไม่เก็บ password เอง ไม่มี runtime service role เปิด demo อย่างชัดเจนใน profile ไม่ import localStorage เข้าบัญชี

เก้าตารางมี RLS/grants/FK/check/unique จำกัด active/running หนึ่งรายการ User read own/name update USING+WITH CHECK ไม่มี direct progress/reward writes privileged entrypoints จำกัด execute/search_path/helper และตรวจตัวตน+ล็อกแถวผู้ใช้ อ่าน latest ใน transaction ปิด timer server actual elapsed รับ ledger ครั้งเดียว ปลดล็อกเฉพาะถัดไป ยอดคำนวณ sum ledger แหล่งเดียว

Store เดิมเพิ่ม transport account, revision และ identity generation กัน response เก่า ล้าง view เมื่อ signout/account/mode เปลี่ยน มี BroadcastChannel/refetch บัญชีไม่ fallback demo แก้ race demo write ที่ค้าง Web Lock ระหว่างเปลี่ยนโหมดให้ยกเลิก และ 401 ล้าง private view แก้ UI ไม่แสดงยอดศูนย์เป็นยอดบัญชีจริงเมื่อ snapshot ยังไม่ได้โหลด

## Automated checks รอบสุดท้าย
- npm run test: **26 ผ่าน, 0 ล้มเหลว, 1 live integration skip**
- npm run lint: ผ่าน ไม่มี warning
- npm run typecheck: ผ่าน
- npm run build: ผ่าน routes เดิม พร้อม /api/progress, /auth/callback, /auth/confirm และ Proxy
- Next typecheck/build ใช้สิทธิ์ที่อนุมัติแล้วเพราะ canonicalization เส้นทางไทยใน sandbox มีข้อจำกัด
- 18 tests เดิมกฎสถานะ/timer/level/migration/Web Locks/storage failure ยังผ่าน
- 4 tests ใหม่ account store: ไม่อ่าน/เขียน demo, unauthorized clear, response หลัง logout ไม่คืนข้อมูล, demo lock ค้างแล้วเปลี่ยน mode ไม่เขียน, network failure ไม่ fallback/ไม่อ้างได้ reward
- 3 SQL tests ใช้ **PostgreSQL engine ของ PGlite ในหน่วยความจำ** apply migrations จริง/seed replay 2 ครั้งได้ 5 quests/15 steps; RLS 9 ตาราง; A อ่าน/แก้ B ไม่ได้; direct definitions/completed/ledger/ownership/helper calls ถูกปฏิเสธ; auth.uid ว่างเข้าไม่ได้
- SQL completion incomplete ล้มเหลว atomic; locked skip denied; server definition rewards แม้ payload ปลอม; repeated completion ledger เดียว; running ปิดตาม server elapsed จำลองเริ่มย้อนหลัง 10 วินาที; B ยอดศูนย์; completed resume ไม่ได้
- SQL pause/resume/expiry capped/manual new ซ้ำไม่ซ้อน ใช้ timestamps จำลองไม่รอจริง; เดินครบ 5 เควสต์ด้วย SQL ได้ 510 XP/150 เหรียญ goal completed

PGlite stub เฉพาะ auth.uid/auth.users และ roles ไม่ใช่ Supabase Auth/PostgREST ไม่มีหลาย database connections จึง **ไม่ยืนยัน concurrent row-lock ใน Supabase จริง** Live test เตรียม login/refresh/logout/Data API cross-user/grants/concurrent completion 2 sessions/retry แต่ไม่ได้รัน ไม่มี credentials test project และไม่ใช้บัญชีจริงผู้ใช้

## Browser production ที่ตรวจจริง
ใช้ build ล่าสุด http://127.0.0.1:3010 ใน in-app browser
- Desktop 1440×900 profile ไม่มี configuration แสดง “ยังไม่ได้ตั้งค่าฐานข้อมูล” ไม่มีแบบฟอร์มสมัครที่แสร้งเชื่อมแล้ว และแยกข้อมูล demo ชัดเจน
- เปิด demo ด้วยปุ่มจริง today โหลด progress เดิมครบ 5/5, 510 XP/150 เหรียญ/เลเวล6; refresh ยังคงเดิม ไม่ล้างข้อมูล
- กลับ profile แล้วเลือก account ด้วยปุ่ม/keyboard Enter ได้ today แสดงข้อผิดพลาดตั้งค่าฐานข้อมูลและทางกลับ profile ไม่แสดงยอด demo หรือยอดบัญชีสมมติ
- Mobile 390×844 profile/today/map ไม่มี horizontal overflow ตรวจ innerWidth จริง; profile หน้าจอมี bottom nav ตามเดิม
- Demo map เปิดรายละเอียด completed ได้ จาก URL focus completed แสดงบันทึกรางวัลเดิม ไม่มี completion controls/level-up ใหม่; refresh คงผลเดิม หน้า focus ซ่อน navigation หลัก
- เก็บ step6-profile-desktop.jpg และ step6-profile-mobile.jpg ใน docs/screenshots คืน viewport override แล้วเปิด profile ไว้ ไม่มีการสร้าง/ใช้บัญชีทดสอบใน browser

HTTP production: GET progress และ POST same-origin เมื่อไม่มี config ได้ 503, POST origin อื่นได้ 403; unknown quest/goal ได้ 404; callback ไม่มี code redirect profile?auth=error; response private no-store

ไม่ได้ตรวจ signup/email/login/logout/session refresh/cookie isolation กับ Supabase จริง, direct Data API จริง, concurrent transaction หลาย connection จริง, advisors หรือข้ามเครื่องจริง ไม่อ้างว่าตรวจจาก browser mock/SQL tests แทน ไม่มีอุปกรณ์มือถือจริง/screen reader/reduced-motion OS ใหม่ในขั้นนี้

## เอกสารและจุดหยุด
README/product-plan อัปเดตตามสถานะจริง คู่มือ docs/supabase-setup.md ระบุ environment, migration/seed, localhost redirect/email template, grants/transactions, live test opt-in และข้อจำกัด ไม่มี secret ใน .env.example; .env.local ignored

ผู้ใช้ต้องระบุ Supabase project liferpg และใส่ URL/publishable key เองบนเครื่องก่อนใช้งานบัญชี ไม่ส่ง password/secret key ในแชต ยังไม่ได้ยืนยันเชื่อมฐานข้อมูลจริง จัดเตรียมโค้ด/schema เท่าที่ทำได้ตาม fallback ที่ผู้ใช้กำหนด หยุดก่อนขั้นที่ 7 ไม่มี Git repository ไม่ push/deploy หรือแก้ remote

HTTP รอบแรกพบ same-origin 127.0.0.1 ถูก Next normalize request.url เป็น localhost และ callback เปลี่ยน host จึงแก้ requestOrigin ให้ใช้ Host จริงพร้อม protocol จาก trusted proxy เพิ่ม unit regression test และตรวจ HTTP ใหม่หลัง build อีกครั้ง Deployment proxy ต้อง preserve Host/sanitize forwarded protocol ตามคู่มือ


# ขั้นที่ 6 — เชื่อม remote ต่อ (8 ตุลาคม 2026)
ผู้ใช้สร้างโปรเจกต์แล้ว ตรวจ connector และ Dashboard ยืนยัน name liferpg, ref ynxtoynvjgvxulvxxmxn, organization hyerbcfaipulmnnycvbx, region ap-south-1, ACTIVE_HEALTHY/Postgres17.11 แผน Free ก่อนเขียนตรวจ public/private tables/functions ว่าง migration history ว่าง auth.users=0

Apply migration ผ่าน Supabase MCP สำเร็จ: 20261008152934 liferpg_accounts, 20261008152947 liferpg_definitions; replay seed เดิมสำเร็จไม่เพิ่มซ้ำ ตรวจ DB จริงมี 5 quests/15 steps, public 9 tables RLS=true, profiles/rewards=0 ไม่มี drop/reset ไม่มีแก้ข้อมูลผู้ใช้

Security advisor: ไม่มี lints Performance advisor พบ unindexed FK 5 รายการ จึงสร้าง migration ด้วย CLI และ apply เป็น 20261008153123 liferpg_foreign_key_indexes หลังแก้ไม่พบ unindexed FK เหลือ unused_index INFO6 เพราะยังไม่มี workload ให้คง indexes ที่ใช้รองรับ FK และ focus ไว้ remediation: https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index

MCP apply_migration สร้าง version ของ remote เอง จึงจัดชื่อ local migrations ให้ตรงกับ version จาก list_migrations จริง โดยไม่เปลี่ยน SQL ที่ apply แล้ว เพื่อไม่ให้ CLI พยายามลงซ้ำ Scripts ปิด --initial-migration หลัง apply แล้วไม่ให้เขียนทับ history

Dashboard Auth URL Configuration บันทึกและตรวจ Site URL=http://127.0.0.1:3010 และ exact redirects /auth/callback, /auth/confirm สำเร็จ ภาพ step6-supabase-auth-urls.jpg

ยังไม่มี .env.local ณ รอบนี้ ยังไม่ restart/build ด้วย configuration, ไม่ทดสอบ signup/login/logout/progress/สองบัญชี/concurrent requests จริง Live integration ยัง skipped (ไม่มีบัญชีทดสอบ/config) การลง schema สำเร็จไม่เท่ากับแอปเชื่อมสำเร็จ ผู้ใช้ต้องกรอก Publishable key ลงไฟล์เองตามคำขอ ไม่ขอ secrets ในแชต ไม่มี push/deploy หยุดก่อน7

ตรวจ Dashboard Sign In/Providers จริง: Allow signups=true, Email enabled, Confirm email=true คงค่าเดิม ไม่ปิดการยืนยันอีเมล เปิดหน้า Settings/API Keys ไว้ให้ผู้ใช้กรอกเอง Tests หลังเพิ่ม indexes ผ่าน26 skipped1 ก่อนจัดชื่อไฟล์ให้ตรง remote และตรวจซ้ำหลังจัดชื่อด้านล่าง
หลังจัดชื่อ migration ให้ตรง remote: npm run test ผ่าน26/ล้มเหลว0/live skipped1 เช่นเดิม ยังไม่มี configuration บัญชีทดสอบ


## Configuration จริงพร้อมแล้ว — ขั้นที่6 (8 ตุลาคม 2026)
ผู้ใช้กรอก .env.local เองแล้ว ตรวจโดยไม่พิมพ์ key: file exists, URL ตรง ynxtoynvjgvxulvxxmxn, publishable prefix ถูกต้อง ไม่มี placeholder ไฟล์ ignored ไม่บันทึกค่าในเอกสาร/output

เรียก Supabase /auth/v1/settings จริงด้วย key จาก environment ได้200: emailEnabled=true, confirmEmail=true Anonymous Data API quest_definitions และ liferpg_snapshot ได้401ตามgrants ไม่ใช่การทดสอบสองบัญชี Build ใหม่โหลด .env.local ผ่านและเปิด production3010 สำเร็จ หน้า profile แสดงแบบฟอร์มสมัคร/เข้าสู่ระบบจริง ไม่มีข้อความยังไม่ได้ตั้งค่าฐานข้อมูล GET /api/progress เมื่อยังไม่มีsessionได้401/private no-store

ตรวจเฉพาะการเชื่อม configuration/anonymous boundary และหน้า Auth ยังไม่มีบัญชีทดสอบในenvironment ผู้ใช้ต้องสมัครด้วยอีเมลที่เข้าถึงได้และกรอกรหัสผ่านเอง/ยืนยันอีเมลก่อน ทดสอบ signupสำเร็จ/login/refresh/progress/logout/สองบัญชี/concurrent completion/live integration ยังไม่ทำและไม่อ้างว่าผ่าน เก็บภาพstep6-live-auth-ready.jpg ส่งต่อหน้าprofileให้ผู้ใช้กรอก ไม่มี push/deploy หยุดก่อน7


## บัญชีจริงและวงจรเควสต์ — ขั้นที่6 ต่อ (8 ตุลาคม 2026)
ผู้ใช้สมัคร/ยืนยันอีเมล/เข้าสู่ระบบเอง ตรวจ profile มี verified account และสร้าง profile/progress จริงใน DB หนึ่งบัญชี ไม่มีการอ่าน password/token ของ browser

พบ blocker เมื่อ today โหลด snapshot: parseProgress เปรียบเทียบ JSON.stringify ของ round กับ initialFocus ซึ่งถือว่าลำดับ key ต้องเหมือนกัน แต่ PostgreSQL jsonb เปลี่ยนลำดับ key จึงปฏิเสธข้อมูลถูกต้อง แก้ตรวจ checkedStepIds/totalMs/idle ตามค่า semantic หลัง validateFocus และเพิ่ม regression test reordered JSON ไม่ล้างหรือแก้ progress เพื่อเลี่ยง error

Browser จริงบน production3010 (viewportขนาดมือถือเดิม):
- Today บัญชีเริ่ม0XP/0เหรียญ/level1 ไม่รวม demo510/150 เลือก first-game ผ่านAPIแล้ว map0/5, tools available และ2–5locked
- เปิดรายละเอียด→เริ่ม tools→focus จริง; incomplete ปุ่มสำเร็จ disabled เริ่มtimer/พัก/ทำต่อได้จากserver
- พักไว้12วินาที ยอดคงเดิมระหว่างตรวจ checklist และ refresh เช็กครบ3/3หลังรอserverตอบกลับแล้วrefreshคงอยู่ ไม่มี auto completed
- เครื่องมือ checkbox.check แจ้งล้มเหลวเพราะ React controlled checkbox รอ server ก่อนแสดง checked แต่ request บันทึกจริงตรวจได้1/3 ใช้ click และรอผลก่อนดำเนินต่อ Refreshระหว่างrequestที่ยังpendingหนึ่งครั้งเหลือ2/3 จึงเช็กข้อสุดท้ายอีกครั้ง รอ3/3แล้วrefreshได้ครบ ไม่อ้างว่าการปิดหน้าก่อนresponseรับประกันบันทึก
- เปิดdialogแล้วยกเลิกยัง paused/checklist3/3 ไม่มีreward ทำต่อtimerแล้วเปิดfocus2แท็บพร้อมdialog
- เรียกคลิกยืนยันทั้งสองแท็บคู่ขนานด้วย Promise.allSettled: clicks fulfilled2 ทั้งคู่แสดง completed ตรวจ DB จริง ledger_count1/XP120/coins35/active0, tools completed, variables available,3–5locked; session closed/started_atnull/elapsed33940ms จากduration1200000 ไม่เติมtimerให้ครบ
- Refreshผลเดิมไม่มีlevel-upซ้ำ ไม่มีcompletionbutton เปิดmapตัวละครด่าน2และ1/5 ภาพstep6-live-reward.jpg, step6-live-map.jpg
- Signoutครั้งแรกแท็บหลักล้าง แต่แท็บที่สองยังเก็บreceipt เนื่องจากbroadcastก่อนserveractionlogoutเสร็จ แก้ AccountForms effect[email] ให้notifyหลังverified identityเปลี่ยนด้วย
- Buildใหม่แล้วเข้าระบบซ้ำด้วย autofill ที่ผู้ใช้มีอยู่ (ไม่อ่านค่า) ยังคงcompleted/rewardเดิม รีโหลดแท็บที่สองให้ใช้โค้ดใหม่แล้วlogoutอีกครั้ง: ทั้งสองแท็บล้างprivateviewจริง แท็บfocusแสดงกรุณาเข้าสู่ระบบ ไม่มีreceiptเก่า โดยไม่ต้องrefreshหลังlogout

Checks: npm run test ผ่าน27 skippedlive1 หลังเพิ่มJSON regression; lint/typecheck/productionbuildผ่านหลังแก้logoutbroadcast ข้อมูลทั้งหมดเป็นการยืนยันงานตัวอย่างสำหรับตรวจวงจร ไม่ใช่หลักฐานว่าทำHelloWorldจริง ไม่resetaccount ไม่push/deploy

เพิ่ม npm run test:live อ่าน4ตัวแปรบัญชีทดสอบจาก.env.local ใช้URL/publishablekeyชุดเดียวกับแอป ไม่แสดงค่าsecret ทดสอบคำสั่งจริงตอนนี้หยุดก่อนส่งrequestเพราะไม่มี LIFERPG_TEST_EMAIL_A/PASSWORD_A/EMAIL_B/PASSWORD_B (exit1 ไม่ใช่integrationผ่าน) ยังไม่มีบัญชีB จึงยังไม่ตรวจA/B DataAPIจริง หรือlive regression suiteเต็ม การคลิกสองแท็บคู่ขนานไม่ทดแทนlive suiteหลายsessions/dataAPIที่ยังต้องรัน บัญชีปัจจุบันมีprogressแล้ว ไม่ใช้เป็นfreshaccountสำหรับsuiteที่กำหนดก่อนเริ่มต้องว่าง

ขั้นที่6ยังเหลือtwo-account/liveintegration ต้องให้ผู้ใช้กรอกบัญชีทดสอบใหม่2บัญชีไว้ในเครื่อง ยังคงหยุดก่อนขั้น7

## ปรับฟอร์มสมัครสมาชิก
เพิ่มตัวเลือก login/signup, confirmPassword แบบ required/new-password, ตรวจ mismatch ก่อนส่งและตรวจซ้ำใน server action พร้อมแสดง/ซ่อนรหัสผ่าน ล้างช่องเมื่อสลับโหมดเพื่อไม่ส่งข้อมูลผิดฟอร์ม ไม่เพิ่ม dependency หรือเปลี่ยน schema/Auth settings
Lint/typecheck/production build ผ่าน Browser ตรวจสลับไปสมัคร: มีช่องยืนยัน required/autocomplete new-password และไม่มี horizontal overflow ที่ viewport จริง706px บันทึก signup-updated.jpg ไม่สร้างบัญชีใหม่ผ่าน browser และไม่อ้างว่าสมัครผ่าน Supabase ใหม่แล้ว

ผล test หลังเพิ่ม auth validation: ผ่าน28 ล้มเหลว0 live integration ข้าม1 (ยังไม่มีบัญชีทดสอบสองบัญชี)

## ตรวจส่วนขยาย LifeQuest — 9 ตุลาคม 2026
- lint, typecheck, production build ผ่าน; tests 35 ผ่าน / 0 ล้มเหลว / live integration 1 ข้าม (ยังไม่มีบัญชีทดสอบใหม่สองบัญชี)
- regression: migrate v3 preserving active/focus/rewards; เลือกเส้นทางไม่ล้าง progress; ซื้อเฉพาะมีเงิน ซื้อซ้ำไม่หักเพิ่ม สวมเฉพาะเป็นเจ้าของ; สอง demo stores ซื้อพร้อมกันครั้งเดียว; failed write ไม่แสดง ownership ปลอม; กราฟวันประเทศไทยและเหรียญได้รับแยกยอดคงเหลือ; ค้นบทเรียนจริง/ไม่แต่งคำตอบเมื่อไม่พบ
- PGlite ทดสอบ SQL จริง: ราคา DB ไม่เชื่อ client, เงินไม่พอ/ชุดไม่เป็นเจ้าของถูกปฏิเสธ, retry snapshot เดิม, ข้อมูล B ไม่เห็น A, ปฏิเสธแก้ catalog/ledger/user_progress โดยตรง, quota AI ป้องกันคำขอถี่ ทดสอบนี้ไม่ใช่ live สองบัญชี
- ตรวจ schema Supabase เดิม 9 ตารางก่อน migration แบบ additive เพิ่ม 4 ตารางและ snapshot v4 สำเร็จ version 20261009093333 ตรวจหลังใช้: user_progress 1 / reward ledger 1 / career catalog 12 / outfits 4 / purchases 0 ไม่ซื้อหรือแก้ progress บัญชีจริงเพื่อทดสอบ
- Browser บน production 3011 แยก demo เดิม: 510XP/150coins migrate ได้ ซื้อ sunrise เหลือ120coins สวมแล้ว refresh คงอยู่; เลือก game_developer แล้ว refresh คงอยู่; ส่งคำถาม if/else ได้บทเรียนจริงพร้อมลิงก์; กราฟแสดง510XP ตามประวัติ
- ทั้งสี่หน้า careers/shop/chat/progress ตรวจจริงที่390/768/1440px scrollWidth ไม่เกิน innerWidth ไม่มี error logs ที่เครื่องมือเก็บได้ เก็บภาพ growth-careers/shop/chat/progress.jpg ใน docs การ navigate เดสก์ท็อปครั้งหนึ่ง timeout แต่หน้าเปิดสำเร็จ ตรวจต่อผ่านลิงก์ UI ไม่อ้างว่าเป็น bug ของแอป
- ข้าม Gemini จริง: ไม่มี configuration Gemini ไม่ส่งคำถามออกไป provider ปุ่มระบุยังไม่ตั้งค่าอย่างชัดเจน ยังไม่ทดสอบ purchase/equip แบบบัญชีจริงหลาย sessions ใช้ PGlite + demo regression + ตรวจ remote schema ไม่ทดแทน live suite
- ไม่ push/deploy ไม่เพิ่ม Firebase dependencies หรือย้ายข้อมูลผู้ใช้ LifeQuest
- Security advisor หลัง migration: ไม่มี database RLS warning; คง warning เดิม Auth Leaked Password Protection Disabled ดู https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection ไม่เปลี่ยน Auth configuration อัตโนมัติ
- Read-only secret scan 141 files: 0 patterns; env ignored / project URL ถูกต้อง ไม่พิมพ์ key

## ปุ่มดูรหัสผ่าน — 9 ตุลาคม 2026
ปรับปุ่มแสดง/ซ่อนให้อยู่ข้างช่องรหัสผ่าน แยกช่องยืนยันรหัสผ่านโดยอิสระ มี aria-controls/aria-pressed และ type=button ไม่ส่งฟอร์ม เมื่อสลับสมัคร/เข้าสู่ระบบกลับมาซ่อนทุกช่อง
Lint/typecheck/production build ผ่าน Browser บน localhost3011 ที่ไม่เข้าสู่บัญชี: login password→text→password; signup แสดง confirmation โดย main ยัง password; Enter บนปุ่มทำงาน; สลับกลับ login ซ่อน ไม่กรอกรหัสผ่านหรือสมัครบัญชีเพื่อทดสอบ เก็บภาพ password-visibility.jpg
