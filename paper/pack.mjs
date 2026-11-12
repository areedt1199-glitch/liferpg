// Packs what the advisor asked for in v2: the .docx, raw data, reference links and a summary of the work.
// Usage: node build.mjs && node pack.mjs   -> paper/advisor-v2/ and paper/liferpg-AUCC2027-v2.zip
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cases } from './evaluation/cases.mjs';
import { loadRuns, computeMetrics } from './metrics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'advisor-v2');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(path.join(outDir, 'raw-data'), { recursive: true });

const runs = loadRuns(path.join(here, 'evaluation'));
if (!runs.length) throw new Error('no evaluation results yet');
const R = computeMetrics(runs);

fs.copyFileSync(path.join(here, 'liferpg-AUCC2027-oral-th.docx'), path.join(outDir, 'liferpg-AUCC2027-v2.docx'));
// PDF: Edge prints preview.html (same content as the .docx; Word with TH SarabunPSK may paginate slightly differently).
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const pdf = path.join(outDir, 'liferpg-AUCC2027-v2.pdf');
execFileSync(edge, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--user-data-dir=' + path.join(process.env.TEMP, 'edgeshot'), '--print-to-pdf=' + pdf, pathToFileURL(path.join(here, 'preview.html')).href], { stdio: 'ignore' });
for (let i = 0; i < 60 && !(fs.existsSync(pdf) && fs.statSync(pdf).size > 0); i++) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); // Edge may hand off to a child process
if (!fs.existsSync(pdf)) throw new Error('PDF was not created');
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
fs.copyFileSync(path.join(here, 'references.txt'), path.join(outDir, 'references-links.txt'));
runs.forEach((_, i) => fs.copyFileSync(path.join(here, 'evaluation', `results-run${i + 1}.json`), path.join(outDir, 'raw-data', `results-run${i + 1}.json`)));

// One row per submission with the label and every round's verdict, for Excel (UTF-8 with BOM).
const q = s => `"${String(s ?? '').replace(/"/g, '""')}"`;
const head = ['id', 'quest', 'type', 'label', 'kind', 'content', ...runs.flatMap((_, i) => [`verdict_run${i + 1}`, `model_run${i + 1}`, `ms_run${i + 1}`, `retries_run${i + 1}`, `feedback_run${i + 1}`])];
const rows = cases.map((c, i) => [i + 1, c.quest, c.type, c.label, c.kind, c.content, ...runs.flatMap(r => [r[i].verdict, r[i].model, r[i].ms, r[i].retries ?? 0, r[i].feedback])]);
fs.writeFileSync(path.join(outDir, 'raw-data', 'ai-reviewer-results.csv'), '﻿' + [head, ...rows].map(r => r.map(q).join(',')).join('\r\n'));

const pct = x => (x * 100).toFixed(1);
const summary = `# สรุปงาน liferpg สำหรับส่ง v2 (AUCC2027 · Oral · track CE)

## บทความ
- ไฟล์: liferpg-AUCC2027-v2.docx (ภาษาไทย, บทคัดย่อไทย/อังกฤษ, ไม่มีชื่อผู้แต่งและสังกัด)
- คำถามวิจัย: (1) ผู้ตรวจงาน AI ตัดสินถูกแค่ไหน (2) ทนต่อการแทรกคำสั่งและตัดสินคงที่หรือไม่ (3) ระบบกันการปลอมรางวัลได้หรือไม่
- ภาพทุกภาพเป็นหน้าจอจากระบบจริงที่ deploy อยู่ และแผนภาพที่วาดจากโครงสร้างระบบจริง

## ผลที่วัดจริง (ข้อมูลดิบอยู่ในโฟลเดอร์ raw-data)
- ชุดทดสอบ ${R.cases} ชิ้น (10 ด่าน × 7 ประเภท) ส่งให้ AI ตรวจ ${R.runs} รอบ วันที่ 10 พ.ย. 2569
- Accuracy ${pct(R.summary.accuracy.mean)} ± ${pct(R.summary.accuracy.sd)}% · F1 ${R.summary.f1.mean.toFixed(2)} · False-pass ${pct(R.summary.falsePass.mean)}%
- ปฏิเสธงานที่แทรกคำสั่งได้ ${R.injection.blocked}/${R.injection.n}${R.runs > 1 ? ` · ผลเหมือนกันทุกรอบ ${R.consistency.unanimous}/${R.cases} ชิ้น · Fleiss' kappa ${R.consistency.kappa.toFixed(2)}` : ' · (ความสม่ำเสมอระหว่างรอบจะวัดได้เมื่อรันครบ 3 รอบ)'}
- แบบจำลองที่ตอบ: ${Object.entries(R.modelCounts).map(([m, n]) => `${m} ${n} ครั้ง`).join(', ')}${R.retried ? ` · ส่งซ้ำเพราะ HTTP 503 ${R.retried} ครั้ง` : ''}${R.total.err ? ` · ไม่ได้ผล ${R.total.err} ครั้ง (ไม่นำมาคิด)` : ''}
- ทดสอบอัตโนมัติของระบบ (npm test): ผ่าน 68/68 ข้าม 1 (ต้องใช้บัญชี Supabase จริง)

## ไฟล์ข้อมูลดิบ
- ai-reviewer-results.csv: งานทุกชิ้น เฉลย ผลตัดสินแต่ละรอบ แบบจำลอง เวลาตอบ และ feedback ของ AI
- results-run*.json: ผลดิบจากสคริปต์
- สคริปต์ที่ใช้รัน: paper/evaluation/run.mjs ในโปรเจกต์ (ใช้ prompt, schema, model และ temperature เดียวกับระบบจริง)

## การใช้ AI
- ใช้ AI ช่วยเรียบเรียงบทความ ช่วยร่างงานทดสอบบางส่วน และช่วยเขียนโค้ด ผู้วิจัยตรวจทานเนื้อหาและเฉลยทุกชิ้น
- ตัวเลขผลทั้งหมดคำนวณจากข้อมูลดิบด้วยสคริปต์ ไม่มีการแก้ด้วยมือ
- เอกสารอ้างอิงทุกรายการตรวจ DOI/ลิงก์แล้วว่าเปิดได้ (references-links.txt)

## ข้อจำกัดที่ระบุในบทความ
- ชุดทดสอบจัดทำโดยผู้วิจัย ยังไม่ใช่งานจากผู้เรียนจริง และยังไม่ได้ประเมินงานแบบรูปภาพ
- ยังไม่ได้ทดลองกับผู้ใช้ (SUS / UEQ-S) จึงเขียนเป็นงานในอนาคต
`;
fs.writeFileSync(path.join(outDir, 'summary.md'), '﻿' + summary);

const zip = path.join(here, 'liferpg-AUCC2027-v2.zip');
fs.rmSync(zip, { force: true });
execFileSync('powershell', ['-NoProfile', '-Command', `Remove-Item -LiteralPath '${zip}' -ErrorAction SilentlyContinue; Compress-Archive -Path '${outDir}\\*' -DestinationPath '${zip}' -Force`]);
console.log('packed', zip);
