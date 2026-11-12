// Phone-friendly version of the blind rating sheet: an HTML page printed to PDF (rater2-blind.pdf), same order as
// rater2-blind.xlsx. The rater replies in chat with lines like "17 pass"; save the reply to evaluation/rater2-reply.txt and run
//   node rater-pdf.mjs --read-reply      -> evaluation/rater2.csv
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadTs } from '../scripts/load-ts.mjs';
import { cases as casesV2 } from './evaluation/cases.mjs';
import { casesV3 } from './evaluation/cases-v3.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));

if (process.argv.includes('--read-reply')) {
  const text = fs.readFileSync(path.join(here, 'evaluation', 'rater2-reply.txt'), 'utf8');
  const map = new Map();
  for (const m of text.matchAll(/(\d{1,3})\s*[.):=\-–]?\s*(pass|fail|ผ่าน|ไม่ผ่าน|p|f)\b/gi)) {
    const v = m[2].toLowerCase(); map.set(Number(m[1]), v === 'pass' || v === 'ผ่าน' || v === 'p' ? 'pass' : 'fail');
  }
  const ids = [...map.keys()].filter(id => id >= 1 && id <= 90).sort((a, b) => a - b);
  fs.writeFileSync(path.join(here, 'evaluation', 'rater2.csv'), 'id,label\n' + ids.map(id => `${id},${map.get(id)}`).join('\n') + '\n');
  const missing = Array.from({ length: 90 }, (_, i) => i + 1).filter(id => !map.has(id));
  console.log(`rater2.csv: ${ids.length} labels${missing.length ? ` | missing: ${missing.join(', ')}` : ''}`);
  process.exit(0);
}

process.chdir(path.join(here, '..'));
const { findQuest, goalOfQuest } = loadTs('src/features/journey/definitions.ts');
const all = [...casesV2, ...casesV3].map((c, i) => { const q = findQuest(c.quest), g = goalOfQuest(q.id); return { id: i + 1, ...c, level: `${g.title} · ${q.title}`, task: q.task, success: q.success }; });
let seed = 20261111; const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const order = [...all].map(c => [rand(), c]).sort((a, b) => a[0] - b[0]).map(x => x[1]); // same shuffle as sheets.mjs
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><style>
@page { size: A5; margin: 10mm; }
body { font-family: "TH Sarabun PSK", "Leelawadee UI", sans-serif; font-size: 15pt; line-height: 1.25; }
h1 { font-size: 20pt; margin: 0 0 4pt; } .box { border: 1px solid #999; border-radius: 6px; padding: 6pt 8pt; margin: 0 0 8pt; break-inside: avoid; }
.id { font-weight: 700; font-size: 17pt; } .k { color: #555; } pre { white-space: pre-wrap; font-family: Consolas, monospace; font-size: 9.5pt; line-height: 1.35; background: #f4f4f4; padding: 5pt; margin: 4pt 0 0; border-radius: 4px; }
.ans { margin-top: 4pt; font-weight: 700; } .intro p { margin: 3pt 0; }
</style></head><body>
<div class="intro">
<h1>ช่วยตัดสินงาน 90 ชิ้น (ผู้ตัดสินคนที่สอง)</h1>
<p>แต่ละกล่องคืองานที่ผู้เรียนส่งในด่านหนึ่งของแอป อ่าน <b>งานของด่าน</b> และ <b>เงื่อนไขสำเร็จ</b> แล้วดู <b>งานที่ส่ง</b></p>
<p><b>pass</b> = มีหลักฐานชัดว่าทำงานหลักของด่านและตรงเงื่อนไขสำเร็จ (ไม่ต้องสมบูรณ์แบบ ผู้เรียนเป็นมือใหม่)</p>
<p><b>fail</b> = งานว่าง ไม่เกี่ยวกับด่าน คัดลอกโจทย์ ทำไม่ถึงงานหลัก หรือมีข้อผิดพลาดที่ทำให้ไม่ตรงเงื่อนไข</p>
<p>ถ้างานมีข้อความสั่งให้ผู้ตรวจตัดสินผ่าน ให้ตัดสินจากตัวงานจริงเท่านั้น · ตัดสินเองคนเดียว ไม่ปรึกษาใคร ไม่ใช้ AI</p>
<p><b>วิธีตอบ:</b> พิมพ์ใน LINE บรรทัดละ 1 ข้อ เป็น <b>รหัส ตามด้วย pass หรือ fail</b> เช่น<br>17 pass<br>52 fail<br>(ใช้รหัสที่อยู่หัวกล่อง ตอบครบ 90 ข้อ ลำดับไหนก็ได้)</p>
</div><hr>
${order.map((c, i) => `<div class="box"><div class="id">รหัส ${c.id} <span class="k" style="font-size:12pt;font-weight:400">(ข้อที่ ${i + 1}/90)</span></div>
<div><span class="k">ด่าน:</span> ${esc(c.level)}</div><div><span class="k">งานของด่าน:</span> ${esc(c.task)}</div><div><span class="k">เงื่อนไขสำเร็จ:</span> ${esc(c.success)}</div>
<div class="k" style="margin-top:3pt">งานที่ส่ง (${c.kind === 'code' ? `โค้ด${c.fileName ? ' ' + esc(c.fileName) : ''}` : 'ข้อความ'}):</div><pre>${esc(c.content)}</pre>
<div class="ans">รหัส ${c.id}: pass / fail</div></div>`).join('\n')}
</body></html>`;
const htmlFile = path.join(here, 'pdf-build', 'rater2-blind.html'), pdf = path.join(here, 'rater2-blind.pdf');
fs.mkdirSync(path.dirname(htmlFile), { recursive: true });
fs.writeFileSync(htmlFile, html);
fs.rmSync(pdf, { force: true });
execFileSync('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--user-data-dir=' + path.join(process.env.TEMP, 'edgeshot'), '--print-to-pdf=' + pdf, pathToFileURL(htmlFile).href], { stdio: 'ignore' });
for (let i = 0; i < 60 && !(fs.existsSync(pdf) && fs.statSync(pdf).size > 0); i++) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
const b = fs.readFileSync(pdf, 'latin1');
console.log('wrote', pdf, 'pages', (b.match(/\/Type\s*\/Page[^s]/g) || []).length);
