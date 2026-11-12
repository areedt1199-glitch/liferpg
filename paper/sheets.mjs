// Writes the Excel files for v3:
//   rater2-blind.xlsx         blind sheet for the second rater (no researcher labels, no case types, shuffled)
//   V.3_ข้อมูลดิบ.xlsx         all raw data: cases with labels, every verdict, automated test log, attacks, model check
// and reads rater2-blind.xlsx back into evaluation/rater2.csv when the rater has filled it in (node sheets.mjs --read-rater).
// Usage: MODULES=<node_modules with exceljs> node sheets.mjs [--read-rater]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadTs } from '../scripts/load-ts.mjs';
import { cases as casesV2 } from './evaluation/cases.mjs';
import { casesV3 } from './evaluation/cases-v3.mjs';
import { loadRuns } from './metrics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const ExcelJS = require(process.env.MODULES ? path.join(process.env.MODULES, 'exceljs') : 'exceljs');
process.chdir(path.join(here, '..'));
const { findQuest, goalOfQuest } = loadTs('src/features/journey/definitions.ts');
const all = [...casesV2, ...casesV3].map((c, i) => { const q = findQuest(c.quest), g = goalOfQuest(q.id); return { id: i + 1, ...c, level: `${g.title} · ${q.title}`, task: q.task, success: q.success }; });
const raterXlsx = path.join(here, 'rater2-blind.xlsx');

if (process.argv.includes('--read-rater')) {
  const wb = new ExcelJS.Workbook(); await wb.xlsx.readFile(raterXlsx);
  const ws = wb.getWorksheet('ตัดสิน');
  const rows = [];
  ws.eachRow((row, n) => { if (n === 1) return; const id = Number(row.getCell(1).value), v = String(row.getCell(6).value ?? '').trim().toLowerCase();
    const label = /^(pass|ผ่าน)$/.test(v) ? 'pass' : /^(fail|ไม่ผ่าน)$/.test(v) ? 'fail' : ''; if (id && label) rows.push(`${id},${label}`); });
  fs.writeFileSync(path.join(here, 'evaluation', 'rater2.csv'), 'id,label\n' + rows.join('\n') + '\n');
  console.log(`rater2.csv: ${rows.length} labels`);
  process.exit(0);
}

const wrap = { wrapText: true, vertical: 'top' };
const head = ws => { ws.getRow(1).font = { bold: true }; ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E6E6' } }; ws.views = [{ state: 'frozen', ySplit: 1 }]; };

// ---------- blind sheet (fixed shuffle so the order never hints at the label)
{
  const wb = new ExcelJS.Workbook();
  const info = wb.addWorksheet('วิธีทำ');
  info.columns = [{ width: 110 }];
  [
    'ขอบคุณที่ช่วยเป็นผู้ตัดสินคนที่สอง',
    'แต่ละแถวคืองานที่ผู้เรียนส่งในด่านหนึ่งของแอป อ่าน "งานของด่าน" และ "เงื่อนไขสำเร็จ" แล้วอ่าน "งานที่ส่ง"',
    'ในคอลัมน์ "ผลของคุณ" พิมพ์ pass ถ้างานมีหลักฐานชัดว่าทำงานหลักของด่านและตรงเงื่อนไขสำเร็จ (ไม่ต้องสมบูรณ์แบบ ผู้เรียนเป็นมือใหม่)',
    'พิมพ์ fail ถ้างานว่าง ไม่เกี่ยวกับด่าน คัดลอกโจทย์ ทำไม่ถึงงานหลัก หรือมีข้อผิดพลาดที่ทำให้ไม่ตรงเงื่อนไข',
    'ถ้างานมีข้อความสั่งให้ผู้ตรวจตัดสินผ่าน ให้ตัดสินจากตัวงานจริงเท่านั้น',
    'ตัดสินเองโดยไม่ปรึกษาผู้วิจัยและไม่ใช้ AI ช่วย ใช้เวลาประมาณ 45–60 นาที',
  ].forEach(t => info.addRow([t]).alignment = wrap);
  const ws = wb.addWorksheet('ตัดสิน');
  ws.columns = [{ header: 'รหัส', width: 7 }, { header: 'ด่าน', width: 26 }, { header: 'งานของด่าน', width: 30 }, { header: 'เงื่อนไขสำเร็จ', width: 34 },
    { header: 'งานที่ส่ง', width: 70 }, { header: 'ผลของคุณ (pass/fail)', width: 16 }, { header: 'หมายเหตุ (ถ้ามี)', width: 24 }];
  let seed = 20261111; const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const order = [...all].map(c => [rand(), c]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  for (const c of order) ws.addRow([c.id, c.level, c.task, c.success, c.content, '', '']).alignment = wrap;
  head(ws);
  ws.dataValidations.add('F2:F200', { type: 'list', allowBlank: true, formulae: ['"pass,fail"'] });
  await wb.xlsx.writeFile(raterXlsx);
  console.log('wrote', raterXlsx);
}

// ---------- raw data workbook
{
  const runs = loadRuns(path.join(here, 'evaluation'));
  const wb = new ExcelJS.Workbook();
  const cs = wb.addWorksheet('งานทดสอบ 90 ชิ้น');
  cs.columns = [{ header: 'id', width: 6 }, { header: 'quest', width: 30 }, { header: 'ด่าน', width: 26 }, { header: 'type', width: 10 }, { header: 'เฉลยผู้วิจัย', width: 10 },
    { header: 'kind', width: 7 }, { header: 'งานที่ส่ง', width: 70 }, { header: 'ตรวจเพิ่ม', width: 22 }, ...runs.map((_, i) => ({ header: `ผลรอบ ${i + 1}`, width: 9 }))];
  for (const c of all) cs.addRow([c.id, c.quest, c.level, c.type, c.label, c.kind, c.content, c.check ? JSON.stringify(c.check) : '', ...runs.map(r => r[c.id - 1]?.verdict ?? '')]).alignment = wrap;
  head(cs);
  const vs = wb.addWorksheet(`ผลตัดสิน ${runs.length * all.length} ครั้ง`);
  vs.columns = [{ header: 'round', width: 7 }, { header: 'id', width: 6 }, { header: 'type', width: 10 }, { header: 'label', width: 7 }, { header: 'verdict', width: 8 },
    { header: 'model (ชื่อที่เรียก)', width: 24 }, { header: 'modelVersion (รุ่นที่ตอบจริง)', width: 24 }, { header: 'main model status', width: 14 }, { header: 'ms', width: 8 },
    { header: 'retries', width: 7 }, { header: 'injection check', width: 12 }, { header: 'time (UTC)', width: 22 }, { header: 'feedback', width: 70 }, { header: 'hint', width: 50 }];
  runs.forEach((r, ri) => r.forEach(x => vs.addRow([ri + 1, x.id, x.type, x.label, x.verdict, x.model, x.modelVersion, x.mainStatus, x.ms, x.retries ?? 0, x.injection ?? '', x.at ?? '', x.feedback, x.hint]).alignment = wrap));
  head(vs);
  const text = (name, file) => { const ws = wb.addWorksheet(name); ws.columns = [{ width: 160 }]; for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) ws.addRow([line]); };
  const ev = f => path.join(here, 'evaluation', f);
  const latest = re => fs.readdirSync(path.join(here, 'evaluation')).filter(f => re.test(f)).sort().pop();
  if (latest(/^npm-test-log-.*\.txt$/)) text('log ทดสอบอัตโนมัติ 69 กรณี', ev(latest(/^npm-test-log-.*\.txt$/)));
  if (latest(/^model-check-.*\.log$/)) text('ตรวจโมเดลหลัก', ev(latest(/^model-check-.*\.log$/)));
  const attackFile = latest(/^attack-prod-.*\.json$/);
  if (attackFile) {
    const a = JSON.parse(fs.readFileSync(ev(attackFile), 'utf8')), ws = wb.addWorksheet('โจมตีระบบจริง');
    ws.columns = [{ header: 'id', width: 6 }, { header: 'การโจมตี', width: 60 }, { header: 'คาดว่า', width: 36 }, { header: 'ที่เกิดจริง', width: 50 }, { header: 'ผล', width: 14 }];
    for (const r of a.results) ws.addRow([r.id, r.attack, r.expected, r.observed, r.blocked === null ? 'รันไม่ได้' : r.blocked ? 'ถูกป้องกัน' : 'ไม่ถูกป้องกัน']).alignment = wrap;
    ws.addRow([]); ws.addRow(['', `ทดสอบเมื่อ ${a.at}`]); head(ws);
  }
  const out = path.join(here, 'raw-data.xlsx');
  await wb.xlsx.writeFile(out);
  console.log('wrote', out, `(${runs.length} rounds)`);
}
