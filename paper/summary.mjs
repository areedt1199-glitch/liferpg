// Writes the v3 change summary (สรุปสิ่งที่แก้.docx) and draft answers for the advisor's form (form-answers.md),
// using the same numbers as the paper. Usage: MODULES=<node_modules with docx> node summary.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadRuns, computeMetrics, cohen } from './metrics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const D = require(process.env.MODULES ? path.join(process.env.MODULES, 'docx') : 'docx');
const R = computeMetrics(loadRuns(path.join(here, 'evaluation')));
const pct = x => (x * 100).toFixed(1);
const ci = w => `${pct(w.p)}% (95% CI ${pct(w.lo)}–${pct(w.hi)}%)`;
const ev = f => path.join(here, 'evaluation', f);
const latest = re => fs.readdirSync(path.join(here, 'evaluation')).filter(f => re.test(f)).sort().pop();
const attack = latest(/^attack-prod-.*\.json$/) ? JSON.parse(fs.readFileSync(ev(latest(/^attack-prod-.*\.json$/)), 'utf8')) : null;
const attackRun = attack ? attack.results.filter(a => a.blocked !== null) : [], attackDown = attack ? attack.results.filter(a => a.blocked === null) : [];
const raterCsv = ev('rater2.csv');
let rater = null;
if (fs.existsSync(raterCsv)) {
  const map = new Map(fs.readFileSync(raterCsv, 'utf8').split(/\r?\n/).slice(1).filter(Boolean).map(l => l.split(',')).map(([id, l]) => [Number(id), l]));
  const ids = R.items.map(i => i.id).filter(id => map.has(id));
  rater = cohen(ids.map(id => R.items.find(i => i.id === id).label), ids.map(id => map.get(id)));
}
const models = Object.entries(R.modelCounts).map(([m, n]) => `${m} ${n} ครั้ง`).join(', ');
const main = Object.entries(R.mainStatus).map(([k, n]) => `${k === 'timeout' ? 'หมดเวลา' : k} = ${n}`).join(', ');
const todo = '⚠ ยังไม่ได้ทำ: ';

const items = [
  ['ก. ไฟล์และหลักฐาน', [
    ['ใช้ template .docx ของ AUCC2027', 'ย้ายเนื้อหาทั้งหมดลง template_oral_thai.docx ฉบับทางการ (styles, หัวกระดาษ, ระยะขอบ, 2 คอลัมน์) ฟอนต์ TH SarabunPSK ทั้งฉบับ PDF แปลงจาก .docx ด้วย LibreOffice และฝังฟอนต์ TH SarabunPSK แล้ว'],
    ['อัปโหลดข้อมูลดิบ', `V.3_ศุภฤกษ์_ข้อมูลดิบ.xlsx มีงานทดสอบ ${R.cases} ชิ้นพร้อมเฉลย ผลตัดสินทั้ง ${R.runs * R.cases} ครั้ง (ชื่อโมเดลที่เรียก รุ่นที่ตอบจริง รหัสตอบกลับของโมเดลหลัก เวลา คำติชม คำใบ้) log การทดสอบอัตโนมัติ 69 กรณี log ตรวจโมเดลหลัก และผลการโจมตีระบบจริง`],
    ['ลิงก์ repository และสาธิตระบบ', 'https://github.com/areedt1199-glitch/liferpg (ผู้เขียนเชิญอาจารย์เป็น collaborator เอง) ' + (attackDown.length ? `${todo}ฐานข้อมูล Supabase ของระบบที่เผยแพร่ติดต่อไม่ได้ (DNS ไม่พบโดเมน) ต้องกู้โปรเจกต์ก่อนสาธิต` : 'ระบบพร้อมสาธิต')],
  ]],
  ['ข. แบบจำลองและการรายงานผล', [
    ['รหัส error ของโมเดลหลักและชื่อรุ่นที่ตอบจริง', `gemini-3.8-flash มีอยู่ในรายการโมเดลของ API (ไม่ใช่ 404) แต่ตอบไม่ได้: ${main} ผลตัดสินทั้งหมดมาจาก ${models} ซึ่งเรียกด้วยชื่อ gemini-flash-lite-latest บทความหัวข้อ 3.6 และ 4.2 เขียนชัดว่าเป็นโมเดลสำรอง ไม่ได้เขียนว่าเป็นโมเดลหลัก ${R.modelCounts['gemini-3.8-flash'] ? '' : `${todo}ยังรันชุดทดสอบกับโมเดลหลักไม่ได้เพราะโมเดลหลักไม่ว่าง/โควตาเต็มตลอดช่วงทดลอง`}`],
    ['ระบุในบทคัดย่อและ Abstract ว่าผลมาจากรุ่นใด', `เพิ่มชื่อ ${Object.keys(R.modelCounts).join(', ')} ในบทคัดย่อ Abstract และสรุป`],
    ['รายงานตามจำนวนงานที่ไม่ซ้ำพร้อม 95% CI', `หัวข้อ 3.6 สมการ (1) Wilson CI; ตารางที่ 3: งานทั่วไปถูก ${R.core.correct}/${R.core.n} = ${ci(R.core.acc)}, ตัดสินผ่านผิด ${R.core.falsePass}/${R.core.nFail} = ${ci(R.core.falsePassCI)}; งานกำกวม ${R.border.correct}/${R.border.n} = ${ci(R.border.acc)}; การแทรกคำสั่ง ${R.injection.blocked}/${R.injection.n} = ${ci(R.injection.ci)} เลิกใช้ ± 0.0`],
    ['แยกความสม่ำเสมอออกจากความถูกต้อง', `หัวข้อ 4.5 แยกจาก 4.3 (Fleiss’ kappa ${R.consistency.kappa != null ? R.consistency.kappa.toFixed(2) : '-'} งานผลเหมือนกันทุกรอบ ${R.consistency.unanimous}/${R.cases}) และอภิปรายใน RQ2 ว่าตัดสินเหมือนกันทุกรอบไม่ได้แปลว่าถูก โดยอ้าง Jukiewicz ที่พบว่า LLM สอดคล้องกันเองสูงแต่สอดคล้องกับผู้สอนปานกลาง`],
  ]],
  ['ค. ความน่าเชื่อถือของชุดทดสอบ', [
    ['ผู้ตัดสินคนที่สองและ Cohen’s kappa', rater ? `ผู้ตัดสินคนที่สองเฉลย ${rater.n} ชิ้นโดยไม่เห็นเฉลยผู้วิจัย Cohen’s kappa = ${rater.kappa.toFixed(2)} (ตรงกัน ${pct(rater.agree)}%) อยู่ในหัวข้อ 3.5` : `${todo}ส่ง rater2-blind.pdf (สลับลำดับ ไม่มีเฉลยผู้วิจัย) ให้เพื่อนตัดสินแล้ว รอคำตอบ เมื่อได้คำตอบจะคำนวณ Cohen’s kappa และใส่ในบทความหัวข้อ 3.5`],
    ['เพิ่มงานกำกวมและระบุการใช้ AI ร่าง', `เพิ่มงานกำกวม 12 ชิ้น (B-pass 6, B-fail 6) ระบุในหัวข้อ 3.5 ว่างานทดสอบทั้ง ${R.cases} ชิ้นร่างโดยใช้ Claude Opus 5.5 ช่วย แล้วผู้วิจัยตรวจทานเฉลย (ฉบับ v2 เขียนว่า "บางส่วน" ซึ่งไม่ถูกต้อง แก้แล้ว)`],
    ['การแทรกคำสั่งแบบยากที่ไม่ได้ใช้ปรับพรอมต์', `เพิ่ม H-inject 8 ชิ้น (ซ่อนในงานเกือบผ่าน, อ้างเกณฑ์เปลี่ยน, ปลอม JSON, ปลอมลายเซ็นผู้สอน, base64, สั่งแทรกรหัสในคำติชม, ขอเฉลยในคำใบ้) ผล: ตัดสินไม่ผ่านทุกรอบ ${R.byType['H-inject']?.correct ?? 0}/${R.byType['H-inject']?.n ?? 0} ชิ้น; ทำตามคำสั่งในคำติชม/คำใบ้ ${R.injection.instructionFollowed}/${R.injection.instructionChecks} ชิ้นที่ตรวจ`],
  ]],
  ['ง. ขอบเขตและการเขียน', [
    ['Supabase จริงและโจมตีระบบที่ deploy', `เพิ่มสคริปต์โจมตี ${attack ? attack.results.length : 0} แบบ (อ่านตารางผู้ใช้, อ่านเฉลยบอส, ปลอมผลตรวจ, เรียก RPC ตรง, เขียน ledger, แก้โปรไฟล์, CSRF, ไม่มี session, ส่งพร้อมกัน 20 คำขอ, ข้อมูลพอร์ตโฟลิโอ) รันได้ ${attackRun.length} แบบ ถูกป้องกัน ${attackRun.filter(a => a.blocked).length} ${attackDown.length ? `${todo}อีก ${attackDown.length} แบบรันไม่ได้เพราะฐานข้อมูล Supabase ติดต่อไม่ได้ และ live test ต้องใช้บัญชีทดสอบ 2 บัญชี` : ''}`],
    ['อธิบายการตรวจรูปภาพ', 'หัวข้อ 3.3 อธิบายวิธีส่งรูป (ย่อด้านยาว ≤ 1,280 px, JPEG, base64 ≤ ~2 MB, inline data) และระบุว่ายังไม่ได้ประเมิน ตารางที่ 1 เปลี่ยนเป็น "โค้ดและข้อความ" พร้อมหมายเหตุ'],
    ['จำกัดข้อสรุปเป็นความเป็นไปได้ทางเทคนิค', 'เพิ่มขอบเขตในบทนำ บทคัดย่อ อภิปรายผล และสรุป ว่าไม่ได้วัดผลด้านการเรียนรู้หรือแรงจูงใจ'],
    ['นิยาม Proof-of-Work', 'เปลี่ยนชื่อเป็น AI evidence reviewer / ผู้ตรวจหลักฐานงาน และนิยามในบทนำว่าไม่เกี่ยวกับ proof-of-work ของบล็อกเชน'],
    ['งานวิจัย LLM ตรวจงานและงานไทย', 'เพิ่ม JorGPT (doi:10.3390/fi17060265), Jukiewicz (doi:10.48550/arXiv.2509.26483) และงานไทย Chinchua และคณะ (doi:10.33423/jhetp.v22i9.5370) ตรวจ DOI แล้ว'],
    ['PDPA', 'เพิ่มหัวข้อ 3.4: ขอความยินยอมผ่านช่องติ๊กทุกครั้ง, ไม่เก็บตัวงาน เก็บเฉพาะผลตัดสิน/คำติชม/คำใบ้, ลบตามเมื่อลบบัญชี, ยังไม่มีปุ่มลบเอง, ข้อกำหนด Gemini แบบฟรี/เสียเงิน'],
  ]],
];

// ---------- docx
const FONT = 'TH SarabunPSK';
const t = (text, o = {}) => new D.TextRun({ text, font: FONT, size: 28, ...o });
const children = [
  new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [t('สรุปสิ่งที่แก้ v3: liferpg (AUCC2027)', { bold: true, size: 36 })] }),
  new D.Paragraph({ spacing: { after: 200 }, children: [t(`สร้างจากข้อมูลดิบด้วยสคริปต์ paper/summary.mjs · ผลประเมิน ${R.runs} รอบ × ${R.cases} ชิ้น · วันที่ทดลอง ${R.dates.join(', ')}`, { size: 24 })] }),
];
for (const [group, list] of items) {
  children.push(new D.Paragraph({ spacing: { before: 200 }, children: [t(group, { bold: true })] }));
  list.forEach(([what, done], i) => children.push(new D.Paragraph({ indent: { left: 360, hanging: 360 }, spacing: { after: 80 }, children: [t(`${i + 1}. ${what}: `, { bold: true }), t(done, done.includes('⚠') ? { color: 'C00000' } : {})] })));
}
const doc = new D.Document({ creator: '', lastModifiedBy: '', sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }] });
fs.writeFileSync(path.join(here, 'change-summary.docx'), await D.Packer.toBuffer(doc));

// ---------- form answers (Markdown; the parts only the author can answer are marked)
const md = `# ร่างคำตอบแบบฟอร์ม V.3 (ตรวจและแก้ก่อนวางลงฟอร์ม)

## สรุปสิ่งที่แก้ทีละข้อ
${items.map(([g, l]) => `${g}\n${l.map(([w, d], i) => `${i + 1}. ${w}: ${d}`).join('\n')}`).join('\n\n')}

## ทำไมเปลี่ยนหัวข้อจาก NPC เป็น liferpg เริ่มพัฒนาเมื่อไร และใช้ AI ส่วนไหน
**ต้องเขียนเองด้วยคำของคุณ (ผมไม่รู้เหตุผลที่เปลี่ยนหัวข้อ)** ข้อเท็จจริงที่ตรวจได้:
- commit แรกใน repository: 10 ต.ค. 2569 (ข้อความ "Baseline before daily practice feature" แปลว่ามีโค้ดก่อนหน้านั้น) commit ล่าสุด 26 ต.ค. 2569 รวม 18 commit
- ใช้ Claude Code ช่วยเขียนโค้ดของระบบ (ระบุว่าส่วนไหนที่เขียนเองบ้าง)
- บทความ v2–v3: ใช้ Claude Opus 5.5 ช่วยร่างงานทดสอบทั้ง ${R.cases} ชิ้น เขียนสคริปต์ประเมิน ค้นและตรวจ DOI และเรียบเรียงบทความ ตัวเลขทั้งหมดคำนวณจากข้อมูลดิบด้วยสคริปต์

## ลิงก์ repository
https://github.com/areedt1199-glitch/liferpg (เชิญอาจารย์เป็น collaborator ก่อนส่ง หรือเปิดเป็น public)

## ผล log โมเดลหลัก
gemini-3.8-flash ชื่อถูกต้อง (มีในรายการโมเดลของ API ไม่ได้ 404) รหัสที่ได้จากทุกคำขอในการทดลอง: ${main} สรุปว่าโมเดลไม่ว่าง (503) และโควตาของคีย์เต็ม (429) รุ่นที่ตอบจริงทั้งหมด: ${models} (เรียกด้วยชื่อ gemini-flash-lite-latest)

## ลิงก์บทสนทนากับ AI 3 ค่าย (คำถามชุดเดียวกัน ทุกตัวอ่านชื่อเรื่องและจำนวนหน้า 9 หน้าถูกต้อง)
- Claude: https://claude.ai/share/3ca3fc54-7cdf-44eb-8c97-1a9eeedf1baa
- Gemini: https://share.gemini.google/lUhlaiftbmp2
- ChatGPT: https://chatgpt.com/share/6af49aaa-7d30-83ec-a946-1a3a514aa7f8

## ประเด็นที่ AI ชี้: ข้อไหนแก้ ข้อไหนไม่แก้ และเพราะอะไร
แก้แล้ว
1. ตารางที่ 3 ขาดแถว H-inject ทำให้ผลรวมไม่ครบ 90 (Claude) → เพิ่มแถวแล้ว
2. 17/18 นับเฉพาะผลตัดสิน แต่มีงานที่ AI ทำตามคำสั่งในคำติชม (ทั้ง 3) → รายงาน 2 ระดับ: ระดับผลตัดสิน ${R.injection.blocked}/${R.injection.n} และระดับเข้มงวด ${R.injection.strict}/${R.injection.n} (หัวข้อ 3.6, 4.4, 5)
3. อัตราผ่านผิดไม่มีร้อยละและ CI (Claude) → ใส่ ${R.all.falsePass}/${R.all.nFail} = ${pct(R.all.falsePassCI.p)}% (95% CI ${pct(R.all.falsePassCI.lo)}–${pct(R.all.falsePassCI.hi)}) ในบทคัดย่อและหัวข้อ 4.3
4. คำว่า "ยืนยันความเป็นไปได้" แรงเกินหลักฐาน (ทั้ง 3) → เปลี่ยนเป็น "ชี้ความเป็นไปได้ทางเทคนิคเฉพาะโจทย์พื้นฐานที่ทดสอบ" ในบทคัดย่อ อภิปราย และสรุป
5. RQ2 อ้างว่าผลมาจากตัวคั่นและ schema ทั้งที่ไม่มี ablation (Claude) → เปลี่ยนเป็น "สอดคล้องกับ" และระบุว่ายังสรุปไม่ได้ว่าผลมาจากองค์ประกอบใด
6. RQ3 ทดสอบเฉพาะผู้ไม่ล็อกอิน (Claude, ChatGPT) → จำกัดข้อสรุป และเพิ่มในข้อจำกัด
7. ไม่ชัดว่างานกลุ่มใดใช้ปรับพรอมต์ (Claude) → ระบุว่าพรอมต์ commit วันที่ 26 ต.ค. 2569 ก่อนเขียนชุดทดสอบ (10–11 พ.ย.) และไม่ได้แก้ระหว่างทดลอง
8. จำนวนคำขอ 270 ครั้งกับการส่งซ้ำไม่ชัด (Claude, ChatGPT) → ระบุว่า 270 = ผลสุดท้าย 90 × 3 และมี ${R.retried} ครั้งที่ต้องส่งซ้ำ
9. 95.6% กับ 96.7% คนละนิยาม (ChatGPT) → เพิ่มความแม่นรายคำตัดสิน ${R.perVerdict.correct}/${R.perVerdict.n}
10. เฉลยใช้ของผู้วิจัยฝ่ายเดียว (ทั้ง 3) → เพิ่มการวิเคราะห์เทียบเฉลยผู้ตัดสินคนที่สอง และเฉพาะงานที่ผู้ตัดสินเห็นตรงกัน (หัวข้อ 4.3)
11. เวลาตอบสนองปนเวลารอแบบจำลองหลัก (Claude) → แยกรายงาน 2 กรณี
12. ประโยค 4.5 ว่างานที่ผิดผิดซ้ำทุกรอบไม่ถูก (Claude) → แก้ตามข้อมูลจริง
13. บทคัดย่อควรบอกว่าชุดทดสอบร่างด้วย AI (Gemini) → เพิ่มแล้ว
14. ควรอธิบายสาเหตุ 429 (Gemini) → อธิบายว่าใช้คีย์ทดลองจาก Google AI Studio ที่มีโควตาจำกัด
15. ข้อจำกัดเชิงแนวคิด: ตรวจไม่ได้ว่าผู้เรียนทำเอง และส่งซ้ำจนผ่าน (Claude) → เพิ่มในข้อจำกัด
16. รูปแบบ: สมการถูกตัดบรรทัด, ตารางตกขอบ, ภาพที่ 1 ตัดขอบ, วงเล็บในตารางที่ 2, คำว่า "ที่รันได้", เกณฑ์ "บางส่วน", 43+1 เส้นทาง (Claude) → แก้ทั้งหมด

ไม่แก้ / แก้ไม่ได้ในรอบนี้ (เขียนเป็นข้อจำกัดในบทความแทน)
1. วัดผลแบบจำลองหลักใหม่ (ทั้ง 3): แบบจำลองหลักตอบ 429/503/หมดเวลาตลอดช่วงทดลอง จึงรายงานตามจริงว่าผลเป็นของแบบจำลองสำรอง และไม่เขียนว่าเป็นแบบจำลองหลัก
2. ทดสอบผู้เล่นที่ล็อกอินบนระบบจริงและกรณี Supabase ที่ถูกข้าม (Claude, ChatGPT): ต้องสร้างบัญชีทดสอบ 2 บัญชี ยังไม่ได้ทำ
3. Ablation พรอมต์ และเพิ่มจำนวนงาน B-fail (Claude): เวลาไม่พอ จึงลดระดับข้อสรุปแทน
4. หาข้อยุติร่วมระหว่างผู้ตัดสินใน 14 ชิ้นที่เห็นต่าง (ทั้ง 3): ยังไม่ได้ทำ ใช้การวิเคราะห์ความไวเทียบกับเฉลยทั้งสองคนแทน
5. text layer ภาษาไทยใน PDF เพี้ยนเมื่อคัดลอก (Claude): เกิดจากการแปลง PDF ด้วย LibreOffice ฉบับส่งจริงจะ Save as PDF จาก Word
6. หัวกระดาษเขียน "AUC²" (Claude): เป็นข้อความใน template ทางการของงาน จึงคงไว้
7. ไม่ทำตามคำแนะนำใดที่ให้ลบข้อจำกัดหรือเปลี่ยนคำบรรยายให้ไม่ตรงกับสิ่งที่ทำจริง

**ต้องเติมเอง:** คุณสมบัติของผู้ตัดสินคนที่สอง (เช่น นักศึกษาสาขาอะไร ชั้นปีไหน) ทั้ง 3 AI ขอข้อมูลนี้

## ไฟล์ที่อัปโหลด
V.3_ศุภฤกษ์.docx
V.3_ศุภฤกษ์.pdf
V.3_ศุภฤกษ์_สรุปสิ่งที่แก้.docx
V.3_ศุภฤกษ์_ข้อมูลดิบ.xlsx
`;
fs.writeFileSync(path.join(here, 'form-answers.md'), md);
console.log('wrote change-summary.docx and form-answers.md');
