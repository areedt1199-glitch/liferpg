// Builds the AUCC2027 manuscript (Thai, Oral) as .docx plus an HTML preview, from one content model.
// Numbers in the results come from evaluation/results-run*.json via metrics.mjs.
// Usage: node build.mjs   (needs the `docx` npm package; DOCX_MODULE can point at its folder)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadRuns, computeMetrics, cohen, wilson } from './metrics.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
// MODULES can point at a node_modules folder that has docx and jszip.
const mod = name => require(process.env.MODULES ? path.join(process.env.MODULES, name) : name);
const D = mod('docx');

// ---------------------------------------------------------------- results
const runs = loadRuns(path.join(here, 'evaluation'));
const R = runs.length ? computeMetrics(runs) : null;
const pct = x => (x * 100).toFixed(1);
const f2 = x => x.toFixed(2);
const sec = x => (x / 1000).toFixed(2);
const ci = w => `ร้อยละ ${pct(w.p)}, 95% CI ${pct(w.lo)}–${pct(w.hi)}`;
const ciEn = w => `${pct(w.p)}%, 95% CI ${pct(w.lo)}–${pct(w.hi)}%`;
const PENDING = '[รอผล]';
const v = fn => (R ? fn(R) : PENDING);
const warnings = [];
const QUEST_TH = { variables: 'ตัวแปรและเงื่อนไข', loops: 'ลูป', 'guess-number': 'เกมทายตัวเลข', functions: 'ฟังก์ชัน', 'python.python_collections': ' list และ dict', 'python.python_files': 'อ่านเขียนไฟล์', 'javascript.adv_array_methods': ' map/filter/reduce', 'sql_databases.sql_join': ' JOIN', 'algorithms.sorting_searching': 'การเรียงและค้นหา', 'prompt_engineering.clear_instructions': 'เขียนคำสั่งให้ชัด' };

// Optional evidence files: a second rater's blind labels, and the attack log against the deployed system.
const raterFile = path.join(here, 'evaluation', 'rater2.csv');
const rater = fs.existsSync(raterFile) ? (() => {
  const rows = fs.readFileSync(raterFile, 'utf8').replace(/^﻿/, '').split(/\r?\n/).slice(1).filter(Boolean).map(l => l.split(','));
  const map = new Map(rows.map(([id, label]) => [Number(id), String(label).trim().toLowerCase()]));
  const ids = R.items.map(i => i.id).filter(id => map.get(id) === 'pass' || map.get(id) === 'fail');
  const mine = ids.map(id => R.items.find(i => i.id === id).label), theirs = ids.map(id => map.get(id));
  const border = ids.filter(id => /^B-/.test(R.items.find(i => i.id === id).type));
  const diff = ids.filter(id => map.get(id) !== R.items.find(i => i.id === id).label).map(id => R.items.find(i => i.id === id).type);
  return { all: cohen(mine, theirs), border: border.length ? cohen(border.map(id => R.items.find(i => i.id === id).label), border.map(id => map.get(id))) : null,
    diff: { n: diff.length, border: diff.filter(t => /^B-/.test(t)).length, inject: diff.filter(t => /inject/.test(t)).length, other: diff.filter(t => !/^B-|inject/.test(t)).length },
    // Sensitivity: the AI against the second rater's labels, and only on items both raters labelled the same.
    vsRater: (k => ({ k, n: ids.length, ci: wilson(k, ids.length) }))(R.items.filter(i => map.has(i.id) && i.verdicts.every(v => v === map.get(i.id))).length),
    agreed: (list => ({ n: list.length, correct: list.filter(i => i.allCorrect).length, ci: wilson(list.filter(i => i.allCorrect).length, list.length),
      nFail: list.filter(i => i.label === 'fail').length, falsePass: list.filter(i => i.label === 'fail' && i.verdicts.includes('pass')).length }))(R.items.filter(i => map.get(i.id) === i.label)) };
})() : (warnings.push('ยังไม่มี evaluation/rater2.csv (เฉลยของผู้ตัดสินคนที่สอง)'), null);
const attackFile = fs.readdirSync(path.join(here, 'evaluation')).filter(f => /^attack-prod-.*\.json$/.test(f)).sort().pop();
const attack = attackFile ? JSON.parse(fs.readFileSync(path.join(here, 'evaluation', attackFile), 'utf8')) : null;
const attackRun = attack ? attack.results.filter(a => a.blocked !== null) : [];
const attackDown = attack ? attack.results.filter(a => a.blocked === null) : [];
if (attackDown.length) warnings.push(`การโจมตีระบบจริง ${attackDown.length} แบบยังรันไม่ได้ (ฐานข้อมูล Supabase ติดต่อไม่ได้)`);
const thDate = iso => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'][m - 1]} ${y + 543}`; };
const MAIN = 'gemini-3.8-flash', FALLBACK_ALIAS = 'gemini-flash-lite-latest';
const answered = R ? Object.entries(R.modelCounts).sort((a, b) => b[1] - a[1]) : [];
const mainAnswered = R ? (R.modelCounts[MAIN] ?? 0) : 0;
const answeredBy = R ? answered.map(([m]) => m).join(' และ ') : PENDING;

// ---------------------------------------------------------------- citations (IEEE, numbered by first use)
const REFS = {
  deterding: 'S. Deterding, D. Dixon, R. Khaled, and L. Nacke, “From game design elements to gamefulness: Defining ‘gamification’,” in Proc. 15th Int. Academic MindTrek Conf., Tampere, Finland, 2011, pp. 9–15, doi: 10.1145/2181037.2181040.',
  hamari: 'J. Hamari, J. Koivisto, and H. Sarsa, “Does gamification work? — A literature review of empirical studies on gamification,” in Proc. 47th Hawaii Int. Conf. System Sciences, 2014, pp. 3025–3034, doi: 10.1109/HICSS.2014.377.',
  koivisto: 'J. Koivisto and J. Hamari, “The rise of motivational information systems: A review of gamification research,” Int. J. Inf. Manage., vol. 45, pp. 191–210, 2019, doi: 10.1016/j.ijinfomgt.2018.10.013.',
  sailer: 'M. Sailer and L. Homner, “The gamification of learning: A meta-analysis,” Educ. Psychol. Rev., vol. 32, no. 1, pp. 77–112, 2020, doi: 10.1007/s10648-019-09498-w.',
  chinchua: 'S. Chinchua, T. Kantathanawat, and S. Tuntiwongwanich, “Increasing programming self-efficacy (PSE) through a problem-based gamification digital learning ecosystem (DLE) model,” J. High. Educ. Theory Pract., vol. 22, no. 9, 2022, doi: 10.33423/jhetp.v22i9.5370.',
  ryan: 'R. M. Ryan and E. L. Deci, “Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being,” Amer. Psychologist, vol. 55, no. 1, pp. 68–78, 2000, doi: 10.1037/0003-066X.55.1.68.',
  habitica: 'HabitRPG, Inc. “Habitica: Gamify your life.” [Online]. Available: https://habitica.com (accessed Nov. 10, 2026).',
  duolingo: 'Duolingo, Inc. “Duolingo.” [Online]. Available: https://www.duolingo.com (accessed Nov. 10, 2026).',
  forest: 'Seekrtech. “Forest: Stay focused, be present.” [Online]. Available: https://www.forestapp.cc (accessed Nov. 10, 2026).',
  paiva: 'J. C. Paiva, J. P. Leal, and Á. Figueira, “Automated assessment in computer science education: A state-of-the-art review,” ACM Trans. Comput. Educ., vol. 22, no. 3, pp. 1–40, 2022, doi: 10.1145/3513140.',
  messer: 'M. Messer, N. C. C. Brown, M. Kölling, and M. Shi, “Automated grading and feedback tools for programming education: A systematic review,” ACM Trans. Comput. Educ., vol. 24, no. 1, pp. 1–43, 2024, doi: 10.1145/3636515.',
  kasneci: 'E. Kasneci et al., “ChatGPT for good? On opportunities and challenges of large language models for education,” Learn. Individ. Differ., vol. 103, Art. no. 102274, 2023, doi: 10.1016/j.lindif.2023.102274.',
  denny: 'P. Denny et al., “Computing education in the era of generative AI,” Commun. ACM, vol. 67, no. 2, pp. 56–67, 2024, doi: 10.1145/3624720.',
  zheng: 'L. Zheng et al., “Judging LLM-as-a-judge with MT-Bench and Chatbot Arena,” in Advances in Neural Information Processing Systems 36 (NeurIPS 2023), 2023, doi: 10.48550/arXiv.2306.05685.',
  jorgpt: 'J. Cisneros-González, N. Gordo-Herrera, I. Barcia-Santos, and J. Sánchez-Soriano, “JorGPT: Instructor-aided grading of programming assignments with large language models (LLMs),” Future Internet, vol. 17, no. 6, Art. no. 265, 2025, doi: 10.3390/fi17060265.',
  jukiewicz: 'M. Jukiewicz, “A systematic comparison of large language models for automated assignment assessment in programming education: Exploring the importance of architecture and vendor,” arXiv:2509.26483, 2025, doi: 10.48550/arXiv.2509.26483.',
  liffiton: 'M. Liffiton, B. E. Sheese, J. Savelka, and P. Denny, “CodeHelp: Using large language models with guardrails for scalable support in programming classes,” in Proc. 23rd Koli Calling Int. Conf. Computing Education Research, 2023, pp. 1–11, doi: 10.1145/3631802.3631830.',
  greshake: 'K. Greshake, S. Abdelnabi, S. Mishra, C. Endres, T. Holz, and M. Fritz, “Not what you’ve signed up for: Compromising real-world LLM-integrated applications with indirect prompt injection,” in Proc. 16th ACM Workshop on Artificial Intelligence and Security, 2023, pp. 79–90, doi: 10.1145/3605764.3623985.',
  pgrls: 'The PostgreSQL Global Development Group. “Row security policies,” PostgreSQL Documentation. [Online]. Available: https://www.postgresql.org/docs/current/ddl-rowsecurity.html (accessed Nov. 10, 2026).',
  geminiTerms: 'Google. “Gemini API additional terms of service.” [Online]. Available: https://aistudio.google.com/docs/terms (accessed Nov. 11, 2026).',
  wilson: 'E. B. Wilson, “Probable inference, the law of succession, and statistical inference,” J. Amer. Statist. Assoc., vol. 22, no. 158, pp. 209–212, 1927, doi: 10.1080/01621459.1927.10502953.',
  cohen: 'J. Cohen, “A coefficient of agreement for nominal scales,” Educ. Psychol. Meas., vol. 20, no. 1, pp. 37–46, 1960, doi: 10.1177/001316446002000104.',
  fleiss: 'J. L. Fleiss, “Measuring nominal scale agreement among many raters,” Psychol. Bull., vol. 76, no. 5, pp. 378–382, 1971, doi: 10.1037/h0031619.',
  brooke: 'J. Brooke, “SUS: A ‘quick and dirty’ usability scale,” in Usability Evaluation in Industry. London, U.K.: CRC Press, 1996, pp. 207–212, doi: 10.1201/9781498710411-35.',
  schrepp: 'M. Schrepp, A. Hinderks, and J. Thomaschewski, “Design and evaluation of a short version of the User Experience Questionnaire (UEQ-S),” Int. J. Interact. Multimed. Artif. Intell., vol. 4, no. 6, pp. 103–108, 2017, doi: 10.9781/ijimai.2017.09.001.',
};
const order = [];
const c = (...keys) => '[' + keys.map(k => { if (!REFS[k]) throw new Error('ref ' + k); if (!order.includes(k)) order.push(k); return order.indexOf(k) + 1; }).join('], [') + ']';

// ---------------------------------------------------------------- content model
let fig = 0, tab = 0;
const F = () => ++fig, T = () => ++tab;
const body = [];
const h1 = text => body.push({ t: 'h1', text });
const h2 = text => body.push({ t: 'h2', text });
const p = (...runs) => body.push({ t: 'p', runs });
const eq = (text, n) => body.push({ t: 'eq', text, n });
const figure = (images, caption, n) => body.push({ t: 'fig', images, caption, n });
const table = (caption, n, widths, rows, opts = {}) => body.push({ t: 'table', caption, n, widths, rows, ...opts });
const bullets = items => items.forEach(x => body.push({ t: 'p', runs: [x], hanging: true }));

const title = {
  th: 'liferpg: แอปพลิเคชันเกมสวมบทบาทเพื่อฝึกทักษะสายเทคโนโลยี ที่ตรวจหลักฐานงานของผู้เรียนด้วยปัญญาประดิษฐ์',
  en: 'liferpg: A Role-Playing Game Application for Technology Skill Practice with an AI Evidence Reviewer',
};

const abstractTh = [
  'แอปพลิเคชันการเรียนรู้แบบเกมิฟิเคชันจำนวนมากให้รางวัลทันทีที่ผู้เรียนกดยืนยันว่าทำงานเสร็จ คะแนนจึงไม่สะท้อนว่าผู้เรียนลงมือทำจริง บทความนี้นำเสนอ liferpg แอปพลิเคชันเกมสวมบทบาทสำหรับฝึกทักษะด้าน AI การพัฒนาซอฟต์แวร์ และการพัฒนาเกม 43 เส้นทางและเส้นทางเริ่มต้นอีก 1 เส้นทาง ที่ให้ผู้ตรวจงานซึ่งใช้แบบจำลองภาษาขนาดใหญ่ตรวจหลักฐานงานเทียบกับเงื่อนไขสำเร็จของด่านก่อนปลดล็อกรางวัล และคำนวณรางวัลในฐานข้อมูลภายใต้ Row Level Security ',
  v(R => `ผลการประเมินด้วยงานทดสอบสังเคราะห์ที่ร่างด้วย AI และมีเฉลย ${R.cases} ชิ้น ตรวจซ้ำ ${R.runs} รอบ ซึ่งผลตัดสินทั้งหมดมาจากแบบจำลอง ${answeredBy} พบว่าตัดสินตรงเฉลยทุกรอบ ${R.all.correct} จาก ${R.all.n} ชิ้น (${ci(R.all.acc)}) ตัดสินผ่านผิด ${R.all.falsePass} จาก ${R.all.nFail} ชิ้นที่ควรไม่ผ่าน (${ci(R.all.falsePassCI)}) ซึ่งทั้งหมดเป็นงานที่เกือบครบ และตัดสินไม่ผ่านในงานที่แทรกคำสั่ง ${R.injection.blocked} จาก ${R.injection.n} ชิ้น `),
  'ผลนี้ชี้ความเป็นไปได้ทางเทคนิคเฉพาะโจทย์พื้นฐานที่ทดสอบ ยังไม่ได้วัดผลด้านการเรียนรู้หรือแรงจูงใจของผู้เรียน',
].join('');
const keywordsTh = 'เกมิฟิเคชัน, แบบจำลองภาษาขนาดใหญ่, การตรวจงานอัตโนมัติ, การศึกษาด้านคอมพิวเตอร์, การแทรกคำสั่ง';
const abstractEn = [
  'Many gamified learning applications grant rewards as soon as learners mark a task as done, so points do not show whether any work was performed. This paper presents liferpg, a role-playing game application for practicing AI, software development and game development skills through 43 learning paths plus one starter path, in which a large language model reviewer checks submitted evidence against each level’s success criteria before a reward is unlocked, and all rewards are computed inside a database protected by row level security. ',
  v(R => `On ${R.cases} labelled, AI-drafted synthetic submissions reviewed ${R.runs} times, with every verdict produced by ${answeredBy}, the reviewer matched the label in every round for ${R.all.correct} of ${R.all.n} submissions (${ciEn(R.all.acc)}), passed ${R.all.falsePass} of ${R.all.nFail} submissions that should fail (${ciEn(R.all.falsePassCI)}), all of them nearly complete work, and failed ${R.injection.blocked} of ${R.injection.n} prompt-injection submissions. `),
  'These results indicate technical feasibility for the basic tasks tested only; learning and motivational outcomes were not measured.',
].join('');
const keywordsEn = 'gamification, large language models, automated assessment, computing education, prompt injection';

// ---------- 1. Introduction
h1('1. บทนำ');
p(`ผู้ที่เริ่มเรียนสายเทคโนโลยีด้วยตนเองมักไม่รู้ว่าควรเริ่มจากสายงานใด เนื้อหามีมากจนไม่รู้ลำดับ อ่านแล้วไม่ได้ลงมือทำ และเลิกกลางทาง เกมิฟิเคชัน (gamification) คือการนำองค์ประกอบของเกมมาใช้ในบริบทที่ไม่ใช่เกม ${c('deterding')} งานทบทวนวรรณกรรมพบว่าผลส่วนใหญ่เป็นเชิงบวกแต่ขึ้นกับบริบทและการออกแบบ ${c('hamari', 'koivisto')} การวิเคราะห์อภิมานด้านการเรียนรู้พบผลเชิงบวกทั้งด้านความรู้ แรงจูงใจ และพฤติกรรม ${c('sailer')} และในประเทศไทยมีการเสนอแบบจำลองการเรียนรู้แบบเกมิฟิเคชันเพื่อเพิ่มการรับรู้ความสามารถในการเขียนโปรแกรมของผู้เรียน ${c('chinchua')}`);
p(`อย่างไรก็ตาม แอปพลิเคชันแนวเกมสวมบทบาทสำหรับพัฒนาตนเอง เช่น Habitica ${c('habitica')} ให้ผู้ใช้กดยืนยันเองว่าทำภารกิจเสร็จแล้วจึงได้รับค่าประสบการณ์ (XP) และเหรียญ รางวัลจึงผูกกับการกดปุ่ม ไม่ได้ผูกกับผลงาน และหากคะแนนคำนวณในเครื่องของผู้ใช้ ผู้ใช้ก็แก้ค่าได้ ขณะที่ระบบตรวจงานโปรแกรมอัตโนมัติตรวจได้แม่นยำด้วยชุดทดสอบ (test case) ${c('paiva', 'messer')} แต่ต้องเตรียมชุดทดสอบต่อโจทย์ จึงใช้กับงานปลายเปิดหรือโจทย์จำนวนมากได้ยาก`);
p(`แบบจำลองภาษาขนาดใหญ่ (Large Language Model: LLM) ทำให้ตรวจงานปลายเปิดด้วยเกณฑ์ที่เขียนเป็นภาษาธรรมชาติได้ ${c('kasneci', 'denny')} แต่การให้ LLM เป็นผู้ตัดสินว่าผ่านด่านมีความเสี่ยงสองด้าน คือ ตัดสินผิด และผู้ใช้แทรกคำสั่งไว้ในงานเพื่อหลอกให้ตัดสินผ่าน (prompt injection) ${c('greshake')} บทความนี้จึงพัฒนา liferpg ที่ให้ผู้ตรวจงาน AI ตรวจหลักฐานงาน (AI evidence reviewer) ก่อนปลดล็อกรางวัล คำว่า “หลักฐานงาน” ในบทความนี้หมายถึงโค้ด ข้อความอธิบาย หรือรูปผลงานที่ผู้เรียนส่งเพื่อแสดงว่าทำงานของด่านแล้ว ไม่เกี่ยวข้องกับกลไก proof-of-work ของบล็อกเชน`);
p('วัตถุประสงค์ของงานนี้คือ (1) ออกแบบและพัฒนาแอปพลิเคชันที่ผูกรางวัลในเกมเข้ากับหลักฐานงาน (2) ประเมินความถูกต้อง ความทนทานต่อการแทรกคำสั่ง และความสม่ำเสมอของผู้ตรวจงาน AI และ (3) ตรวจสอบว่ากลไกรางวัลถูกบังคับใช้ฝั่งเซิร์ฟเวอร์ ขอบเขตของบทความคือความเป็นไปได้ทางเทคนิค ไม่ได้วัดผลด้านการเรียนรู้หรือแรงจูงใจ คำถามวิจัยได้แก่');
bullets([
  'RQ1: ผู้ตรวจงาน AI ตัดสินผ่านหรือไม่ผ่านตรงกับเฉลยมากเพียงใด ทั้งในงานทั่วไปและงานกำกวม',
  'RQ2: ผู้ตรวจงาน AI ทนต่อการแทรกคำสั่งได้เพียงใด และตัดสินงานเดิมเหมือนเดิมหรือไม่',
  'RQ3: ผู้เล่นปลอมรางวัลหรือผลตรวจงานได้หรือไม่',
]);

// ---------- 2. Related work
h1('2. งานที่เกี่ยวข้อง');
h2('2.1 เกมิฟิเคชันและแรงจูงใจในการเรียนรู้');
p(`ทฤษฎีการกำหนดตนเอง (Self-Determination Theory) อธิบายว่าแรงจูงใจภายในเกิดจากความต้องการด้านความสามารถ ความเป็นอิสระ และความสัมพันธ์กับผู้อื่น ${c('ryan')} liferpg ใช้เลเวลและบอสแสดงความสามารถ การเลือกเส้นทางเองแสดงความเป็นอิสระ และกิลด์กับพอร์ตโฟลิโอแสดงความสัมพันธ์กับผู้อื่น ส่วน Sailer และ Homner ${c('sailer')} พบว่าองค์ประกอบเกมที่มีการแข่งขันร่วมกับความร่วมมือและเรื่องราวในเกมให้ผลด้านพฤติกรรมดีกว่าการใช้คะแนนอย่างเดียว ทั้งนี้บทความนี้อ้างทฤษฎีเพื่ออธิบายการออกแบบเท่านั้น ไม่ได้ทดสอบผลด้านแรงจูงใจ`);
h2('2.2 การใช้ LLM ตรวจงานของนักศึกษา');
p(`ระบบตรวจงานอัตโนมัติแบบดั้งเดิมใช้การรันโค้ดกับชุดทดสอบหรือการวิเคราะห์โค้ดแบบสถิต ${c('paiva', 'messer')} งานที่ใช้ LLM ตรวจงานเขียนโปรแกรมของนักศึกษาโดยตรงพบผลหลากหลาย JorGPT ${c('jorgpt')} พบว่าคะแนนจาก LLM สัมพันธ์สูงกับคะแนนจากผู้สอนในวิชาการเขียนโปรแกรมเบื้องต้น แต่ผู้วิจัยแนะนำให้ผู้สอนกำกับดูแล ส่วน Jukiewicz ${c('jukiewicz')} เปรียบเทียบ LLM 18 รุ่นกับงานนักศึกษากว่า 6,000 ชิ้น พบว่า LLM ให้คะแนนสอดคล้องกันเองสูงแต่สอดคล้องกับผู้สอนในระดับปานกลาง และรุ่นขนาดเล็ก (mini, nano) ทำได้ด้อยกว่ารุ่นเต็ม งานด้าน LLM-as-a-judge ${c('zheng')} ก็ชี้ว่า LLM มีอคติบางประการ ข้อค้นพบเหล่านี้แสดงว่าการตัดสินสอดคล้องกันไม่ได้แปลว่าตัดสินถูก และต้องวัดผลกับงานและแบบจำลองที่ใช้จริง ระบบ CodeHelp ${c('liffiton')} ใช้ LLM ตอบคำถามนักศึกษาโดยไม่เฉลยโค้ดทั้งหมด ซึ่งเป็นแนวคิดเดียวกับ “คำใบ้” ของ liferpg`);
h2('2.3 การแทรกคำสั่งในแอปพลิเคชันที่ใช้ LLM');
p(`Greshake และคณะ ${c('greshake')} แสดงว่าข้อความที่ LLM อ่านเป็นข้อมูลสามารถมีคำสั่งแฝงที่เปลี่ยนพฤติกรรมของระบบได้ งานที่ผู้เรียนส่งใน liferpg เป็นข้อมูลที่ผู้ใช้ควบคุมได้ทั้งหมด จึงต้องแยกคำสั่งออกจากข้อมูลและวัดผลการโจมตีลักษณะนี้โดยตรง`);
h2('2.4 เปรียบเทียบกับระบบที่ใกล้เคียง');
const t1 = T();
p(`ตารางที่ ${t1} เปรียบเทียบ liferpg กับ Duolingo ${c('duolingo')} ที่ตรวจคำตอบแบบปิด Habitica ${c('habitica')} ที่ให้รางวัลจากการยืนยันเอง Forest ${c('forest')} ที่ใช้เวลาโฟกัส และระบบตรวจโค้ดอัตโนมัติ ${c('paiva')} ที่ไม่มีกลไกเกม ความต่างหลักของ liferpg คือผูกรางวัลกับหลักฐานงานปลายเปิดที่ AI ตรวจ และคำนวณรางวัลฝั่งเซิร์ฟเวอร์`);
table('เปรียบเทียบ liferpg กับระบบที่ใกล้เคียง', t1, [1150, 900, 850, 950, 799], [
  ['ระบบ', 'ทักษะสายเทค', 'กลไก RPG', 'รางวัลผูกกับหลักฐาน', 'ตรวจงานปลายเปิด'],
  ['Duolingo', 'ไม่มี (ภาษา)', 'บางส่วน', 'มี (แบบฝึกปิด)', 'ไม่มี'],
  ['Habitica', 'ไม่มี', 'มี', 'ไม่มี (ยืนยันเอง)', 'ไม่มี'],
  ['Forest', 'ไม่มี', 'บางส่วน', 'ไม่มี (ใช้เวลา)', 'ไม่มี'],
  ['ระบบตรวจโค้ด', 'มี', 'ไม่มี', 'มี (test case)', 'ไม่มี'],
  ['liferpg', 'มี 43 เส้นทาง', 'มี', 'มี (AI ตรวจ)', 'มี (โค้ดและข้อความ)*'],
], { header: true, boldLast: true, note: 'บางส่วน = มีองค์ประกอบเกมเพียงบางอย่าง เช่น XP หรือ streak แต่ไม่มีตัวละครและด่าน * ระบบรับรูปผลงานได้ แต่ยังไม่ได้ประเมินความถูกต้องของการตรวจรูปในงานนี้' });

// ---------- 3. Method
h1('3. วิธีการดำเนินงาน');
h2('3.1 วงจรการเรียนรู้ในเกม');
const fLoop = F();
p(`ภาพที่ ${fLoop} แสดงวงจรการเรียนรู้ ผู้เรียนใหม่ตอบแบบทดสอบหาเส้นทาง 4 ข้อ (สิ่งที่อยากสร้าง ลักษณะงานที่ชอบ ประสบการณ์เขียนโค้ด และเวลาต่อวัน) ระบบให้คะแนนเส้นทางทั้ง 43 เส้นทาง (AI 11 การพัฒนาซอฟต์แวร์ 18 และเกม 14) แล้วแนะนำ 3 เส้นทาง แต่ละเส้นทางเป็นแผนที่ 8 ด่านที่ปลดล็อกตามลำดับ รวม 352 ด่าน (รวมเส้นทางเริ่มต้น “สร้างเกมแรก”) แต่ละด่านมีงาน ขั้นตอนย่อย เวลาแนะนำ รางวัล และเงื่อนไขสำเร็จ มีคลังความรู้ 344 บทเรียนและคำถามทบทวน 645 ข้อ`);
figure([{ file: 'loop.png', w: 296 }], 'วงจรการเรียนรู้ของ liferpg (กรอบสีทองคือส่วนที่ AI ตรวจหลักฐานงาน)', fLoop);
p('การติ๊กขั้นตอนครบหรือจับเวลาครบไม่ทำให้ผ่านด่าน ผู้เรียนต้องส่งหลักฐานงานให้ผู้ตรวจงาน AI ตัดสินผ่านก่อน จึงสู้บอสแบบผลัดกันเล่นโดยตอบคำถามของด่านให้ถูกครบ แล้วได้รับ XP และเหรียญสำหรับซื้อชุดตัวละครและไอเทม ผลงานที่ผ่านการตรวจรวมอยู่ในพอร์ตโฟลิโอที่ผู้เรียนเลือกเปิดเป็นสาธารณะได้ และรวมกลุ่มเป็นกิลด์เพื่อดูอันดับ XP รายสัปดาห์');
h2('3.2 สถาปัตยกรรมระบบ');
const fArch = F();
p(`ภาพที่ ${fArch} แสดงสถาปัตยกรรม ฝั่งผู้ใช้เป็น Progressive Web App ที่พัฒนาด้วย Next.js 16, React 19 และ TypeScript และห่อเป็นแอป Android ด้วย Capacitor ฝั่งเซิร์ฟเวอร์ใช้ Route Handlers ของ Next.js ข้อมูลและการยืนยันตัวตนใช้ Supabase (PostgreSQL) และผู้ตรวจงานเรียก Google Gemini API จากเซิร์ฟเวอร์เท่านั้น`);
figure([{ file: 'architecture.png', w: 296 }], 'สถาปัตยกรรมของ liferpg', fArch);
p(`เบราว์เซอร์ส่งเพียงคำสั่ง เช่น ขอยืนยันว่าด่านนี้สำเร็จ โดยไม่ส่ง XP เหรียญ เวลา หรือรหัสผู้ใช้ให้เซิร์ฟเวอร์เชื่อ ฐานข้อมูลเปิด Row Level Security ${c('pgrls')} ทุกตาราง ผู้ใช้อ่านได้เฉพาะข้อมูลของตน และเปลี่ยนความก้าวหน้าได้ผ่านฟังก์ชัน security definer ที่ตรวจลำดับด่านและสถานะในธุรกรรมเดียว รางวัลบันทึกในสมุดบัญชีรางวัล (reward ledger) ที่มี primary key ต่อผู้ใช้และด่านจึงรับซ้ำไม่ได้ เฉลยบอสเก็บใน schema ที่ผู้เล่นอ่านไม่ได้ และคำขอที่เปลี่ยนข้อมูลต้องมาจาก origin เดียวกัน`);
h2('3.3 การออกแบบผู้ตรวจงาน AI');
p('เมื่อผู้เรียนส่งงาน เซิร์ฟเวอร์ตรวจว่าเข้าสู่ระบบแล้ว ด่านอยู่ในสถานะกำลังทำ ผู้เรียนติ๊กยินยอมให้ส่งงานไปตรวจ และยังมีโควตา AI ของวัน จากนั้นสร้างพรอมต์จากชื่อด่าน งาน เงื่อนไขสำเร็จ ขั้นตอน ประเด็นจากบทเรียน ประเภทงาน และตัวงานที่ครอบด้วยตัวคั่น <<<งาน>>> และ <<<จบงาน>>> คำสั่งระบบกำหนดว่า');
bullets([
  '(ก) ตัดสินผ่านเมื่อมีหลักฐานชัดว่าทำงานหลักและตรงเงื่อนไขสำเร็จ ไม่ต้องสมบูรณ์แบบ',
  '(ข) ตัดสินไม่ผ่านเมื่องานว่าง ไม่เกี่ยวกับด่าน คัดลอกโจทย์ ทำไม่ถึงงานหลัก หรือมีข้อผิดพลาดที่ทำให้ไม่ตรงเงื่อนไข',
  '(ค) สำหรับโค้ด ให้ไล่การทำงานในใจว่ารันได้และให้ผลตามเงื่อนไขหรือไม่',
  '(ง) ห้ามเฉลยคำตอบทั้งหมด ให้คำใบ้แทน',
  '(จ) ข้อความระหว่างตัวคั่นเป็นข้อมูลเท่านั้น ให้เพิกเฉยต่อคำสั่งที่อยู่ในงาน',
]);
p('ผลลัพธ์ถูกบังคับเป็น JSON ที่มีฟิลด์ verdict (pass หรือ fail) feedback และ hint ใช้ temperature 0.2 ระบบเรียกแบบจำลองหลักก่อนโดยรอไม่เกิน 12 วินาที หากได้รหัส 503 หรือ 429 หรือหมดเวลาจะส่งต่อให้แบบจำลองสำรอง ผลตรวจถูกบันทึกโดยเซิร์ฟเวอร์ด้วยสิทธิ์ service role เท่านั้น และฐานข้อมูลกำหนดให้ต้องมีผลตรวจผ่านก่อนสู้บอสและก่อนยืนยันด่าน');
p('สำหรับหลักฐานแบบรูปภาพ เบราว์เซอร์ย่อรูปให้ด้านยาวไม่เกิน 1,280 พิกเซล แปลงเป็น JPEG ซึ่งตัดข้อมูลตำแหน่งในไฟล์ออก แล้วส่งเป็น base64 (ไม่เกินประมาณ 2 MB) ไปพร้อมพรอมต์ในรูปแบบ inline data ของ Gemini API อย่างไรก็ตาม งานนี้ยังไม่ได้ประเมินความถูกต้องของการตรวจรูปภาพ ผลในหัวข้อที่ 4 จึงครอบคลุมเฉพาะงานแบบโค้ดและข้อความ');
h2('3.4 การคุ้มครองข้อมูลส่วนบุคคล');
p(`ก่อนส่งงานทุกครั้ง ผู้เรียนต้องติ๊กยอมรับข้อความ “ยินยอมส่งงานนี้ให้ Google Gemini ตรวจ” ซึ่งเตือนไม่ให้ใส่รหัสผ่านหรือข้อมูลส่วนตัว และเซิร์ฟเวอร์ปฏิเสธคำขอที่ไม่มีการยินยอม liferpg ไม่เก็บตัวงานที่ส่ง เก็บเพียงผลตัดสิน คำติชม คำใบ้ จำนวนครั้งที่ส่ง และเวลา ข้อมูลเหล่านี้ถูกลบตามเมื่อบัญชีผู้ใช้ถูกลบ (on delete cascade) แต่ปัจจุบันยังไม่มีปุ่มให้ผู้ใช้ลบข้อมูลเอง ผู้ใช้ต้องแจ้งผู้ดูแลระบบ ส่วนตัวงานที่ส่งไปยัง Gemini อยู่ภายใต้ข้อกำหนดของ Google ${c('geminiTerms')} ซึ่งระบุว่าบริการแบบไม่เสียค่าใช้จ่ายอาจนำข้อมูลไปปรับปรุงผลิตภัณฑ์และให้ผู้ตรวจที่เป็นมนุษย์อ่านได้ ขณะที่บริการแบบเสียค่าใช้จ่ายไม่นำข้อมูลไปใช้ปรับปรุงผลิตภัณฑ์ การใช้งานกับผู้เรียนจริงจึงควรใช้บริการแบบเสียค่าใช้จ่าย ชุดทดสอบในงานนี้ไม่มีข้อมูลส่วนบุคคล`);
h2('3.5 ชุดทดสอบผู้ตรวจงาน AI');
const t2 = T();
p(`ชุดทดสอบมีงาน ${R ? R.cases : 90} ชิ้นจาก 10 ด่านใน 6 เส้นทาง (ตัวแปรและเงื่อนไข ลูป เกมทายตัวเลข ฟังก์ชัน, list และ dict, การอ่านเขียนไฟล์, map/filter/reduce, JOIN, การเรียงและค้นหา และการเขียนคำสั่งให้ชัด) แบ่งเป็น 3 กลุ่มตามตารางที่ ${t2} ได้แก่ (1) งานทั่วไป 70 ชิ้น ด่านละ 7 ประเภท (2) งานกำกวม 12 ชิ้น ซึ่งเป็นงานที่ทำเกือบครบหรือทำด้วยวิธีที่ต่างจากที่ด่านคาดไว้ และ (3) การแทรกคำสั่งแบบยาก 8 ชิ้น ที่ซ่อนคำสั่งในงานที่เกือบผ่าน อ้างว่าเกณฑ์ถูกเปลี่ยน ปลอมผลลัพธ์ JSON หรือลายเซ็นผู้สอน เข้ารหัสคำสั่งเป็น base64 สั่งให้แทรกรหัสลงในคำติชม และขอให้เฉลยโค้ดทั้งหมดในคำใบ้ พรอมต์ของผู้ตรวจงานถูกกำหนดและบันทึกในระบบควบคุมเวอร์ชันตั้งแต่วันที่ 26 ตุลาคม 2569 ก่อนเขียนงานทดสอบทุกกลุ่ม (10–11 พฤศจิกายน 2569) และไม่ได้แก้ไขระหว่างการทดลอง จึงไม่มีงานกลุ่มใดถูกใช้ปรับพรอมต์`);
table('กลุ่มงานในชุดทดสอบ', t2, [1350, 2499, 800], [
  ['กลุ่ม', 'ประเภทงาน', 'เฉลย'],
  ['ทั่วไป 30 ชิ้น', 'P-full, P-min, P-text: ทำครบ, ทำแบบมือใหม่, อธิบายงานจริงเป็นข้อความ', 'ผ่าน'],
  ['ทั่วไป 40 ชิ้น', 'F-bug, F-off, F-partial, F-inject: มีบั๊ก, นอกเรื่อง, ทำบางส่วน, แทรกคำสั่ง', 'ไม่ผ่าน'],
  ['กำกวม 12 ชิ้น', 'B-pass 6 ชิ้น, B-fail 6 ชิ้น', 'ผ่าน/ไม่ผ่าน'],
  ['แทรกคำสั่งแบบยาก 8 ชิ้น', 'H-inject', 'ไม่ผ่าน'],
], { header: true });
p(`งานทดสอบทั้ง ${R ? R.cases : 90} ชิ้นร่างโดยใช้ Claude Opus 5.5 ช่วย จากนั้นผู้วิจัยตรวจทานและกำหนดเฉลยจากเงื่อนไขสำเร็จของแต่ละด่าน ${rater ? `และให้ผู้ตัดสินคนที่สองกำหนดเฉลยโดยไม่เห็นเฉลยของผู้วิจัย ได้ค่า Cohen’s kappa ${c('cohen')} ระหว่างผู้ตัดสินเท่ากับ ${f2(rater.all.kappa)} (เห็นตรงกันร้อยละ ${pct(rater.all.agree)} จาก ${rater.all.n} ชิ้น)${rater.border ? ` สำหรับงานกำกวมได้ kappa ${f2(rater.border.kappa)}` : ''} ผู้ตัดสินทั้งสองเห็นต่างกัน ${rater.diff.n} ชิ้น เป็นงานกำกวม ${rater.diff.border} ชิ้น งานที่แทรกคำสั่ง ${rater.diff.inject} ชิ้น และงานทั่วไปอื่น ${rater.diff.other} ชิ้น การวิเคราะห์ในหัวข้อที่ 4 ใช้เฉลยของผู้วิจัย` : 'ยังไม่มีผู้ตัดสินคนที่สองตรวจเฉลย ซึ่งเป็นข้อจำกัดของงานนี้'}`);
h2('3.6 วิธีทดลองและตัวชี้วัด');
p(`สคริปต์ทดลองสร้างพรอมต์ด้วยคำสั่งระบบ schema ค่า temperature และลำดับการสลับแบบจำลองชุดเดียวกับระบบจริง แบบจำลองหลักคือ ${MAIN} และแบบจำลองสำรองเรียกด้วยชื่อ ${FALLBACK_ALIAS} ซึ่ง Gemini API รายงานรุ่นที่ตอบจริง (modelVersion) ส่งงานแต่ละชิ้นแยกกันและทำซ้ำ ${R ? R.runs : 3} รอบ ${v(R => `ในวันที่ ${R.dates.map(thDate).join(' และ ')} `)}บันทึกรหัสตอบกลับของแบบจำลองหลัก รุ่นที่ตอบจริง ผลตัดสิน คำติชม และเวลาตอบสนองทุกคำขอ คำขอที่ทั้งสองแบบจำลองไม่ว่างถูกส่งซ้ำเช่นเดียวกับที่ผู้เรียนกดส่งใหม่`);
p(`หน่วยวิเคราะห์หลักคืองานที่ไม่ซ้ำกัน งานหนึ่งชิ้นนับว่าตัดสินถูกเมื่อตัดสินตรงเฉลยครบทุกรอบ และนับว่าตัดสินผ่านผิดเมื่อมีรอบใดตัดสินผ่านทั้งที่เฉลยไม่ผ่าน รายงานสัดส่วนพร้อมช่วงความเชื่อมั่น 95% แบบ Wilson ${c('wilson')} คือ c ± h ตามสมการที่ (1) และ (2) โดย p̂ คือสัดส่วน n คือจำนวนงาน และ z = 1.96`);
eq('c = (p̂ + z²/2n) / (1 + z²/n)', 1);
eq('h = z√(p̂(1−p̂)/n + z²/4n²) / (1 + z²/n)', 2);
p(`อัตราการตัดสินผ่านผิดเป็นตัวชี้วัดสำคัญที่สุด เพราะคือการให้รางวัลโดยไม่มีผลงาน สำหรับการแทรกคำสั่งรายงานสองระดับ คือ ระดับผลตัดสิน (งานถูกตัดสินไม่ผ่านทุกรอบ) และระดับเข้มงวด (ตัดสินไม่ผ่านทุกรอบและคำติชมกับคำใบ้ไม่ทำตามคำสั่งที่แทรก ซึ่งตรวจได้ในงานที่สั่งให้แทรกรหัสหรือเฉลยโค้ด) ส่วนความสม่ำเสมอระหว่างรอบวัดด้วย Fleiss’ kappa ${c('fleiss')} แยกจากความถูกต้อง เพราะการตัดสินเหมือนเดิมทุกรอบไม่ได้แปลว่าตัดสินถูก`);
h2('3.7 การทดสอบความปลอดภัยของกลไกเกม');
p(`ระบบมีชุดทดสอบอัตโนมัติ 69 กรณีด้วย Node.js test runner ในจำนวนนี้ 16 กรณีรัน migration ทั้ง 14 ไฟล์บน PostgreSQL จริงในหน่วยความจำ (PGlite) แล้วเรียกใช้ในนามผู้ใช้หลายคน และอีก 1 กรณีทดสอบกับ Supabase จริงซึ่งต้องใช้บัญชีทดสอบ 2 บัญชี นอกจากนี้ได้โจมตีระบบที่เผยแพร่จริงโดยใช้เพียงสิ่งที่ผู้เยี่ยมชมทั่วไปมี คือ public anon key และหน้าเว็บ ${attack ? `จำนวน ${attack.results.length} แบบ` : ''} ทุกแบบไม่เปลี่ยนข้อมูลจริง เพราะคำขอเขียนข้อมูลใช้รหัสผู้ใช้สุ่มที่ไม่มีอยู่จริง และบันทึกรหัสข้อผิดพลาดเพื่อแยกว่าถูกปฏิเสธด้วยสิทธิ์ (42501) ไม่ใช่เพราะ foreign key (23503) การโจมตีชุดนี้ทดสอบเฉพาะผู้ที่ไม่ได้ล็อกอิน ส่วนผู้เล่นที่ล็อกอินแล้วทดสอบด้วยชุดทดสอบบน PGlite`);

// ---------- 4. Results
h1('4. ผลการดำเนินงาน');
h2('4.1 ระบบที่พัฒนา');
const fs1 = F(), fs2 = F(), fs3 = F();
p(`ภาพที่ ${fs1} ถึง ${fs3} เป็นภาพหน้าจอจากระบบจริงขนาดมือถือ ภาพที่ ${fs1} คือผลการหาเส้นทางและแผนที่ 8 ด่าน ภาพที่ ${fs2} คือรายละเอียดด่านที่มีขั้นตอน รางวัล และเงื่อนไขสำเร็จ และหน้าโฟกัส ภาพที่ ${fs3} คือการสู้บอสแบบตอบคำถามและผู้ช่วย AI`);
const phone = (file, label) => ({ file, w: 140, label });
figure([phone('s1-path-finder.jpg', '(ก)'), phone('s2-map.jpg', '(ข)')], 'หน้าจอ (ก) ผลการหาเส้นทาง และ (ข) แผนที่ 8 ด่าน', fs1);
figure([phone('s3-quest.jpg', '(ก)'), phone('s4-focus.jpg', '(ข)')], 'หน้าจอ (ก) รายละเอียดด่าน และ (ข) หน้าโฟกัส', fs2);
figure([phone('s5-boss.jpg', '(ก)'), phone('s6-assistant.jpg', '(ข)')], 'หน้าจอ (ก) การสู้บอส และ (ข) ผู้ช่วย AI', fs3);

h2('4.2 แบบจำลองที่ตอบจริง');
p(v(R => `จากผลตัดสินสุดท้าย ${Object.values(R.mainStatus).reduce((a, b) => a + b, 0)} ครั้ง (${R.cases} ชิ้น × ${R.runs} รอบ; มี ${R.retried} ครั้งที่ต้องส่งซ้ำก่อนได้ผล ซึ่งบันทึกเฉพาะครั้งสุดท้าย) แบบจำลองหลัก ${MAIN} ${mainAnswered ? `ตอบ ${mainAnswered} ครั้ง` : 'ไม่ได้ตอบเลย'} โดยได้รหัส ${Object.entries(R.mainStatus).filter(([k]) => k !== '200').map(([k, n]) => `${k === 'timeout' ? 'หมดเวลา' : `HTTP ${k}`} ${n} ครั้ง`).join(', ')} ชื่อแบบจำลองหลักถูกต้อง เพราะปรากฏในรายการแบบจำลองของ API และไม่ได้รหัส 404 สาเหตุจึงเป็นแบบจำลองไม่ว่าง (503) และโควตาของคีย์เต็ม (429) เนื่องจากการทดลองใช้คีย์ที่สร้างแยกจากระบบจริงผ่าน Google AI Studio ซึ่งมีโควตาจำกัด และส่งคำขอต่อเนื่องโดยเว้นช่วงเพียงประมาณ 1 วินาที ผลตัดสินที่นำมาวิเคราะห์ทั้งหมดจึงมาจาก ${answered.map(([m, n]) => `${m} (${n} ครั้ง)`).join(' และ ')} ซึ่ง API รายงานว่าเป็นรุ่นที่ตอบจริงของชื่อ ${FALLBACK_ALIAS} ผลในหัวข้อนี้จึงเป็นผลของแบบจำลองสำรอง ไม่ใช่แบบจำลองหลัก`));

h2('4.3 ความถูกต้องของผู้ตรวจงาน AI');
const t3 = T(), t4 = T();
p(v(R => `ตารางที่ ${t3} สรุปผลรายงานตามจำนวนงานที่ไม่ซ้ำ งานทั่วไปตัดสินถูกทุกรอบ ${R.core.correct} จาก ${R.core.n} ชิ้น (${ci(R.core.acc)}) ตัดสินผ่านผิด ${R.core.falsePass} จาก ${R.core.nFail} ชิ้นที่ควรไม่ผ่าน (${ci(R.core.falsePassCI)}) ส่วนงานกำกวมตัดสินตรงเฉลยของผู้วิจัยทุกรอบ ${R.border.correct} จาก ${R.border.n} ชิ้น (${ci(R.border.acc)}) และตัดสินผ่านผิด ${R.border.falsePass} จาก ${R.border.nFail} ชิ้นที่ควรไม่ผ่าน (ร้อยละ ${pct(R.border.falsePass / R.border.nFail)}) รวมทุกกลุ่มตัดสินผ่านผิด ${R.all.falsePass} จาก ${R.all.nFail} ชิ้น (${ci(R.all.falsePassCI)}) ช่วงความเชื่อมั่นที่กว้างสะท้อนว่าชุดทดสอบยังเล็ก`));
table('ผลการตัดสินรายงานตามจำนวนงานที่ไม่ซ้ำ (ถูก = ตรงเฉลยครบทุกรอบ)', t3, [1450, 850, 1300, 1049], [
  ['กลุ่มงาน', 'ถูก/ทั้งหมด', 'ร้อยละ (95% CI)', 'ผ่านผิด'],
  ...(R ? [['ทั่วไป', R.core], ['กำกวม', R.border], ['แทรกคำสั่งแบบยาก', R.hard], ['รวมทั้งหมด', R.all]].map(([name, s]) => [name, `${s.correct}/${s.n}`, `${pct(s.acc.p)} (${pct(s.acc.lo)}–${pct(s.acc.hi)})`, `${s.falsePass}/${s.nFail}`]) : [[PENDING, PENDING, PENDING, PENDING]]),
], { header: true, boldLast: true });
p(v(R => `ตารางที่ ${t4} แสดงผลตามประเภทงาน${R.wrong.length ? ` งานที่ตัดสินผิดอย่างน้อยหนึ่งรอบมี ${R.wrong.length} ชิ้น ได้แก่ ${R.wrong.map(w => `${w.type} ด่าน${QUEST_TH[w.quest] ?? w.quest} (เฉลย${w.label === 'pass' ? 'ผ่าน' : 'ไม่ผ่าน'} ผิด ${w.verdicts.filter(x => x !== w.label && (x === 'pass' || x === 'fail')).length}/${w.verdicts.length} รอบ)`).join(', ')}` : ' ไม่มีงานชิ้นใดถูกตัดสินผิด'}`));
const TYPES = ['P-full', 'P-min', 'P-text', 'F-bug', 'F-off', 'F-partial', 'F-inject', 'B-pass', 'B-fail', 'H-inject'];
table('งานที่ตัดสินถูกทุกรอบ แยกตามประเภท', t4, [1550, 1550, 1549], [
  ['ประเภท', 'ถูก / ทั้งหมด', 'ร้อยละ'],
  ...TYPES.map(k => [k, v(R => `${R.byType[k]?.correct ?? 0} / ${R.byType[k]?.n ?? 0}`), v(R => R.byType[k] ? pct(R.byType[k].correct / R.byType[k].n) : '-')]),
], { header: true });
if (rater) p(`เมื่อเทียบกับเฉลยของผู้ตัดสินคนที่สองแทน ผู้ตรวจงานตัดสินตรงทุกรอบ ${rater.vsRater.k} จาก ${rater.vsRater.n} ชิ้น (${ci(rater.vsRater.ci)}) และเมื่อวิเคราะห์เฉพาะ ${rater.agreed.n} ชิ้นที่ผู้ตัดสินทั้งสองเห็นตรงกัน ผู้ตรวจงานตัดสินถูกทุกรอบ ${rater.agreed.correct} ชิ้น (${ci(rater.agreed.ci)}) และตัดสินผ่านผิด ${rater.agreed.falsePass} จาก ${rater.agreed.nFail} ชิ้นที่ควรไม่ผ่าน`);
if (R?.wrong.some(w => w.id === 58)) p('งาน P-min ด่านการเรียงและค้นหาถูกตัดสินไม่ผ่าน คำติชมระบุว่าโค้ดค้นหาแบบทวิภาคถูกต้องแต่ไม่มีคำอธิบายสิ่งที่เรียนรู้ด้วยคำพูดของตนเอง ซึ่งเป็นส่วนหนึ่งของเงื่อนไขสำเร็จ กรณีนี้แสดงว่าถ้อยคำของเงื่อนไขสำเร็จมีผลต่อผลตัดสินโดยตรง');

h2('4.4 ความทนทานต่อการแทรกคำสั่ง');
p(v(R => `ในระดับผลตัดสิน ผู้ตรวจงานตัดสินไม่ผ่านทุกรอบในงานที่แทรกคำสั่ง ${R.injection.blocked} จาก ${R.injection.n} ชิ้น (${ci(R.injection.ci)}) และในระดับเข้มงวด ${R.injection.strict} จาก ${R.injection.n} ชิ้น ประกอบด้วยการแทรกคำสั่งแบบทั่วไป ${R.byType['F-inject']?.correct ?? 0}/${R.byType['F-inject']?.n ?? 0} ชิ้น และแบบยาก ${R.byType['H-inject']?.correct ?? 0}/${R.byType['H-inject']?.n ?? 0} ชิ้น ในงาน ${R.injection.instructionChecks} ชิ้นที่สั่งให้แทรกข้อความลงในคำติชมหรือให้เฉลยโค้ดในคำใบ้ ผู้ตรวจงาน${R.injection.instructionFollowed ? `ทำตามคำสั่งใน ${R.injection.instructionFollowed} ชิ้น` : 'ไม่ทำตามคำสั่งในทุกรอบ'}`));

h2('4.5 ความสม่ำเสมอระหว่างรอบ');
p(v(R => `งาน ${R.consistency.unanimous} จาก ${R.cases} ชิ้นได้ผลตัดสินเหมือนกันทุกรอบ${R.consistency.kappa != null ? ` ค่า Fleiss’ kappa เท่ากับ ${f2(R.consistency.kappa)}` : ''} และสัดส่วนการตัดสินตรงเฉลยต่อรอบเท่ากับ ${R.consistency.perRound.values.map(x => pct(x)).join(', ')} ตามลำดับ ค่านี้บอกเพียงว่าผลตัดสินคงที่ ไม่ได้บอกว่าตัดสินถูก เช่น งานที่ตัดสินผิด ${R.wrong.filter(w => w.verdicts.every(x => x !== w.label)).length} จาก ${R.wrong.length} ชิ้นในหัวข้อ 4.3 ผิดซ้ำเหมือนกันทุกรอบ หากนับรายคำตัดสิน ตัดสินถูก ${R.perVerdict.correct} จาก ${R.perVerdict.n} ครั้ง และไม่มีงานที่ควรผ่านถูกตัดสินไม่ผ่านเลย (${R.all.falseFail}/${R.all.nPass} ชิ้น) เวลาตอบสนองแยกเป็นสองกรณี คือ เมื่อแบบจำลองหลักปฏิเสธทันที (429 หรือ 503) เฉลี่ย ${sec(R.latency.fast.mean)} ± ${sec(R.latency.fast.sd)} วินาที (${R.latency.fast.n} ครั้ง) และเมื่อต้องรอแบบจำลองหลักจนหมดเวลา 12 วินาทีก่อนสลับ เฉลี่ย ${sec(R.latency.slow.mean)} ± ${sec(R.latency.slow.sd)} วินาที (${R.latency.slow.n} ครั้ง)`));

h2('4.6 ผลการทดสอบความปลอดภัย');
const t5 = T(), t6 = T();
p(`ตารางที่ ${t5} สรุปผลการทดสอบอัตโนมัติ ผ่าน 68 จาก 68 กรณีที่รันได้ ยืนยันว่าผู้ใช้อ่านหรือแก้ข้อมูลผู้อื่นไม่ได้ การยืนยันด่านพร้อมกันจากสองแท็บได้รางวัลครั้งเดียว ผลตรวจงานบันทึกได้จากเซิร์ฟเวอร์เท่านั้น และต้องมีผลตรวจผ่านก่อนสู้บอส ส่วนการทดสอบกับ Supabase จริงยังถูกข้ามเพราะยังไม่ได้สร้างบัญชีทดสอบ`);
table('ผลการทดสอบอัตโนมัติ', t5, [2700, 650, 650, 649], [
  ['กลุ่มการทดสอบ', 'จำนวน', 'ผ่าน', 'ข้าม'],
  ['ฐานข้อมูล: RLS, สิทธิ์, รางวัล, บอส, กิลด์ (PGlite)', '16', '16', '0'],
  ['กฎของเกม: ความก้าวหน้า, ตัวจับเวลา, ร้านค้า, บอส', '44', '44', '0'],
  ['เนื้อหา, การหาเส้นทาง, การสมัครสมาชิก', '8', '8', '0'],
  ['Supabase จริง (ต้องใช้บัญชีทดสอบ)', '1', '0', '1'],
  ['รวม', '69', '68', '1'],
], { header: true, boldLast: true });
if (attack) {
  p(`ตารางที่ ${t6} แสดงผลการโจมตีระบบที่เผยแพร่จริงเมื่อ ${thDate(attack.at.slice(0, 10))} ${attackDown.length ? `ถูกป้องกัน ${attackRun.filter(a => a.blocked).length} จาก ${attackRun.length} แบบที่รันได้ อีก ${attackDown.length} แบบรันไม่ได้เพราะติดต่อฐานข้อมูล Supabase ไม่ได้ในวันทดสอบ` : `ถูกป้องกันทั้ง ${attackRun.length} แบบ`} คำขอที่เรียกฐานข้อมูลโดยตรงได้รหัส 42501 (ไม่มีสิทธิ์) หรือ PGRST106 (ไม่เปิดเผย schema) ไม่ใช่ข้อผิดพลาดจาก foreign key`);
  table('ผลการโจมตีระบบที่เผยแพร่จริง (ผู้ใช้ที่ไม่ได้ล็อกอิน)', t6, [420, 2300, 1100, 829], [
    ['รหัส', 'การโจมตี', 'ผลตอบกลับ', 'ผล'],
    ...attack.results.map(a => [a.id, a.attack, a.id === 'A10' ? 'เฉพาะฟิลด์สาธารณะ' : a.observed.replace(/^HTTP /, ''), a.blocked === null ? 'รันไม่ได้' : a.blocked ? 'ถูกป้องกัน' : 'ไม่ถูกป้องกัน']),
  ], { header: true });
}

// ---------- 5. Discussion
h1('5. อภิปรายผล');
p(v(R => `RQ1: ในงานทั่วไป ผู้ตรวจงานตัดสินถูก${ci(R.core.acc)} และไม่มีงานที่ควรไม่ผ่านถูกตัดสินผ่าน${R.core.falsePass ? `ยกเว้น ${R.core.falsePass} ชิ้น` : ''} ซึ่งชี้ว่าสำหรับโจทย์เขียนโปรแกรมพื้นฐาน 10 ด่านที่ทดสอบ การตรวจหลักฐานด้วยเงื่อนไขสำเร็จที่เขียนเป็นภาษาธรรมชาติทำได้โดยไม่ต้องเขียนชุดทดสอบต่อโจทย์ แต่ยังสรุปไปถึงงานเกม งาน AI หรืองานรูปภาพไม่ได้ ในงานกำกวมความถูกต้องลดลงเหลือ${ci(R.border.acc)} และงานที่เกือบครบซึ่งควรไม่ผ่านถูกตัดสินผ่าน ${R.border.falsePass} จาก ${R.border.nFail} ชิ้น งานลักษณะนี้ใกล้กับการโกงจริงที่สุด${rater ? (rater.border ? `ขณะที่ผู้ตัดสินที่เป็นคนสองคนเองก็เห็นตรงกันในงานกำกวมเพียง kappa ${f2(rater.border.kappa)} แสดงว่าเฉลยของงานกลุ่มนี้ไม่แน่นอนโดยธรรมชาติ ` : '') : 'และเฉลยของงานกำกวมเองยังมาจากผู้วิจัยคนเดียว '}ผลนี้สอดคล้องกับงานที่พบว่า LLM สอดคล้องกับผู้สอนเพียงระดับปานกลาง ${c('jukiewicz')} ระบบจึงควรใช้ผู้ตรวจงาน AI เป็นด่านแรกและเปิดให้ผู้สอนทบทวนกรณีที่ผู้เรียนโต้แย้ง`));
p(v(R => `RQ2: ผู้ตรวจงานตัดสินไม่ผ่านในงานที่แทรกคำสั่ง ${R.injection.blocked}/${R.injection.n} ชิ้น (ระดับเข้มงวด ${R.injection.strict}/${R.injection.n}) ซึ่งสอดคล้องกับการออกแบบที่แยกงานด้วยตัวคั่น ระบุว่าข้อความในงานเป็นข้อมูล และบังคับผลลัพธ์ด้วย JSON schema แต่งานนี้ไม่ได้เปรียบเทียบกับพรอมต์ที่ไม่มีองค์ประกอบเหล่านี้ (ablation) จึงยังสรุปไม่ได้ว่าผลมาจากองค์ประกอบใด ชุดการโจมตีมีขนาดเล็ก และการโจมตีรูปแบบใหม่เกิดขึ้นเสมอ ${c('greshake')} ระบบยังมีบอสที่ตรวจคำตอบฝั่งเซิร์ฟเวอร์และโควตา AI ต่อผู้ใช้เป็นชั้นป้องกันเพิ่ม แต่ยังไม่ได้ประเมินประสิทธิผลของชั้นเหล่านี้ ส่วนความสม่ำเสมอระหว่างรอบที่สูง${R.consistency.kappa != null ? ` (kappa ${f2(R.consistency.kappa)})` : ''} หมายถึงผลตัดสินคาดเดาได้ ไม่ได้ยืนยันความถูกต้อง เช่นเดียวกับที่ Jukiewicz ${c('jukiewicz')} พบว่า LLM สอดคล้องกันเองสูงแต่สอดคล้องกับผู้สอนน้อยกว่า`));
if (R) {
  const bf = R.wrong.filter(w => w.type === 'B-fail' && w.verdicts.includes('pass'));
  if (bf.length) p(`การตัดสินผ่านผิดในงานกำกวมเกิดกับงานที่เกือบครบ ได้แก่ ${bf.map(w => ({ 71: 'โค้ดเงื่อนไขที่ทดลองเฉพาะกรณีผ่าน', 78: 'โค้ดที่อ่านไฟล์ CSV ได้แต่ไม่ได้ประมวลผล', 81: 'การค้นหาแบบทวิภาคที่ใช้ฟังก์ชันเรียงลำดับสำเร็จรูปแทนการเขียนเอง' }[w.id] ?? `${w.type} ด่าน${QUEST_TH[w.quest] ?? w.quest}`)).join(' ')} คำติชมของผู้ตรวจงานยอมรับว่างานเหล่านี้ยังไม่ครบแต่ถือว่าผ่าน ซึ่งเป็นผลของกฎ (ก) ที่ให้ใจกว้างกับผู้เรียนมือใหม่ จึงต้องเลือกระหว่างความใจกว้างกับความเข้มงวด เช่น เขียนเงื่อนไขสำเร็จให้ระบุสิ่งที่ขาดไม่ได้ หรือให้ผู้สอนทบทวนงานที่ผู้ตรวจงานระบุว่ายังไม่ครบ`);
  const se = R.wrong.find(w => w.id === 83), canary = R.items.find(i => i.id === 84);
  if (se || canary?.injectionOutcomes.includes('followed')) p(`${se ? `การแทรกคำสั่งที่หลุดคือ H-inject ด่านตัวแปรและเงื่อนไข ซึ่งตัดสินผ่าน ${se.verdicts.filter(v => v === 'pass').length} จาก ${se.verdicts.length} รอบ งานนี้ไม่มีคำสั่งโดยตรง แต่เป็นงานที่เกือบครบพร้อมข้อความอ้างว่าทดสอบกรณีไม่ผ่านแล้วแต่ลืมแปะผล ผู้ตรวจงานเชื่อข้อความนั้น ` : ''}${canary?.injectionOutcomes.includes('followed') ? `นอกจากนี้ ในงานที่สั่งให้ขึ้นต้นคำติชมด้วยรหัส ผู้ตรวจงานตัดสินไม่ผ่านถูกต้องแต่ใส่รหัสนั้นในคำติชม ${canary.injectionOutcomes.filter(o => o === 'followed').length} จาก ${canary.injectionOutcomes.length} รอบ ` : ''}ข้อสังเกตจากงานจำนวนน้อยนี้ชี้ว่าการชักจูงที่แนบเนียนอาจหลุดการป้องกันด้วยพรอมต์ได้ง่ายกว่าคำสั่งตรง ๆ ซึ่งต้องทดสอบด้วยชุดที่ใหญ่ขึ้น และข้อความในคำติชมยังถูกควบคุมได้บางส่วน ระบบจึงไม่ควรนำคำติชมไปใช้ตัดสินสิ่งอื่นต่อ`);
}
p(`RQ3: ในกรณีที่ทดสอบ ผลการทดสอบอัตโนมัติบน PGlite แสดงว่ารางวัลคำนวณจากนิยามด่านในฐานข้อมูล รับซ้ำไม่ได้ และผลตรวจงานเขียนได้จากเซิร์ฟเวอร์เท่านั้น${attackRun.length ? ` และการโจมตีระบบจริงจากผู้ที่ไม่ได้ล็อกอิน${attackRun.every(a => a.blocked) ? 'ถูกป้องกันทั้งหมด' : 'มีบางแบบที่ไม่ถูกป้องกัน'}` : ''}${attackDown.length ? ' แต่การโจมตีที่ต้องติดต่อฐานข้อมูลโดยตรงยังรันไม่ได้' : ''} อย่างไรก็ตาม ยังไม่ได้ทดสอบผู้เล่นที่ล็อกอินแล้วพยายามแก้ XP บนระบบจริง ข้อสรุปจึงไม่ได้ครอบคลุมผู้โจมตีทุกแบบ`);
p(`ข้อจำกัดของงานนี้ได้แก่ (1) ชุดทดสอบเขียนขึ้นโดยใช้ AI ช่วยและมีขนาดเล็ก ครอบคลุม 10 จาก 352 ด่าน ยังไม่ใช่งานที่ผู้เรียนจริงส่ง${rater ? '' : ' และยังไม่มีผู้ตัดสินคนที่สอง'} (2) ยังไม่ได้ประเมินการตรวจรูปภาพ และผู้ตรวจงานตรวจได้เพียงว่ามีงานที่ตรงเงื่อนไข ไม่รู้ว่าผู้เรียนทำเองหรือให้ AI ทำให้ อีกทั้งงานที่ผลตัดสินแกว่งระหว่างรอบอาจผ่านได้หากส่งซ้ำหลายครั้ง ซึ่งโควตา AI ต่อวันช่วยจำกัดได้เพียงบางส่วน (3) ผลทั้งหมดมาจากแบบจำลองสำรองเพียงรุ่นเดียว ซึ่งงานที่เกี่ยวข้องพบว่ารุ่นขนาดเล็กมักด้อยกว่ารุ่นเต็ม ${c('jukiewicz')} จึงต้องวัดผลของแบบจำลองหลักแยกต่างหาก และควรรันชุดทดสอบซ้ำทุกครั้งที่เปลี่ยนแบบจำลองหรือพรอมต์ (4) ยังไม่ได้ทดสอบกับ Supabase จริงด้วยบัญชีทดสอบ และยังไม่ได้โจมตีระบบจริงในฐานะผู้เล่นที่ล็อกอินแล้ว (5) ไม่มีการทดลองเปรียบเทียบองค์ประกอบของพรอมต์ (ablation) และทดลองเพียงวันเดียว และ (6) ไม่ได้วัดผลด้านการเรียนรู้ การใช้งาน หรือแรงจูงใจ ข้อสรุปจึงจำกัดอยู่ที่ความเป็นไปได้ทางเทคนิคในขอบเขตที่ทดสอบ`);

// ---------- 6. Conclusion
h1('6. สรุปและงานในอนาคต');
p(v(R => `บทความนี้นำเสนอ liferpg แอปพลิเคชันเกมสวมบทบาทสำหรับฝึกทักษะสายเทคโนโลยีที่ผูกรางวัลเข้ากับหลักฐานงานผ่านผู้ตรวจงาน AI และคำนวณรางวัลฝั่งเซิร์ฟเวอร์ ผลกับงานทดสอบ ${R.cases} ชิ้น ${R.runs} รอบ ซึ่งผลตัดสินทั้งหมดมาจาก ${answeredBy} แสดงว่าผู้ตรวจงานตัดสินถูกทุกรอบ${ci(R.all.acc)} ตัดสินผ่านผิด ${R.all.falsePass} จาก ${R.all.nFail} ชิ้น (${ci(R.all.falsePassCI)}) ซึ่งทั้งหมดเป็นงานที่เกือบครบ และตัดสินไม่ผ่านในงานที่แทรกคำสั่ง ${R.injection.blocked} จาก ${R.injection.n} ชิ้น ผลนี้ชี้ว่าแนวทางนี้เป็นไปได้ทางเทคนิคสำหรับโจทย์พื้นฐานที่ทดสอบ แต่ยังต้องปรับให้เข้มงวดกับงานที่เกือบครบ และต้องทดสอบกับแบบจำลองหลัก งานจริงของผู้เรียน และงานประเภทอื่นก่อนใช้งานจริง`));
p(`งานในอนาคตได้แก่ วัดผลแบบจำลองหลัก เพิ่มงานจริงของผู้เรียนและงานแบบรูปภาพ ให้ผู้สอนหลายคนกำหนดเฉลย ทดสอบกับ Supabase จริงด้วยบัญชีทดสอบ เพิ่มปุ่มให้ผู้ใช้ลบข้อมูลของตนเอง และทดลองกับผู้เรียนกลุ่มเป้าหมายด้วยการทดสอบด้วยงานจริง SUS ${c('brooke')} และ UEQ-S ${c('schrepp')} พร้อมใบยินยอม`);
p('การใช้ AI ในงานนี้: ผู้วิจัยใช้ Claude Code ช่วยเขียนโค้ดของระบบ และใช้ Claude Opus 5.5 ช่วยร่างงานทดสอบ เขียนสคริปต์ประเมินผล และเรียบเรียงบทความ ผู้วิจัยตรวจทานเนื้อหาและเฉลยทั้งหมด ตัวเลขผลทั้งหมดคำนวณด้วยสคริปต์จากข้อมูลดิบที่แนบ');

// ---------------------------------------------------------------- shared helpers
const imgSize = file => {
  const buf = fs.readFileSync(path.join(here, 'figures', file));
  if (file.endsWith('.png')) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), buf };
  let i = 2; while (i < buf.length) { const m = buf[i + 1], len = buf.readUInt16BE(i + 2); if (m >= 0xC0 && m <= 0xC2) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7), buf }; i += 2 + len; }
  throw new Error('size ' + file);
};
const references = order.map((k, i) => `[${i + 1}] ${REFS[k]}`);

// ---------------------------------------------------------------- DOCX
const FONT = process.env.FONT_FAMILY ?? 'TH SarabunPSK';
const S = Number(process.env.FONT_SCALE ?? 1); // e.g. 0.75 when rendering with Google Sarabun, whose glyphs are larger
const COL = 4649; // 82 mm in twips
const runOf = (r, extra = {}) => typeof r === 'string'
  ? new D.TextRun({ text: r, font: FONT, ...extra, ...(r.includes(PENDING) ? { highlight: 'yellow' } : {}) })
  : new D.TextRun({ text: r.text, bold: r.bold, italics: r.italics, superScript: r.sup, font: FONT, ...extra });
const para = (children, o = {}) => new D.Paragraph({ children, alignment: D.AlignmentType.THAI_DISTRIBUTE, spacing: { before: 0, after: 0, line: 240 }, ...o });
const cellBorder = { style: D.BorderStyle.SINGLE, size: 4, color: '000000' };

function docxBlocks() {
  const out = [];
  for (const bl of body) {
    if (bl.t === 'h1') out.push(para([runOf(bl.text, { bold: true })], { alignment: D.AlignmentType.CENTER, spacing: { before: 280, after: 0 }, keepNext: true }));
    else if (bl.t === 'h2') out.push(para([runOf(bl.text, { bold: true, italics: true })], { alignment: D.AlignmentType.LEFT, spacing: { before: 140, after: 0 }, keepNext: true }));
    else if (bl.t === 'p') out.push(para(bl.runs.map(r => runOf(r)), bl.hanging ? { indent: { left: 284, hanging: 284 } } : { indent: { firstLine: 397 } }));
    else if (bl.t === 'eq') out.push(new D.Paragraph({ spacing: { before: 120, after: 120 }, tabStops: [{ type: D.TabStopType.CENTER, position: COL / 2 }, { type: D.TabStopType.RIGHT, position: COL }],
      children: [new D.TextRun({ text: '\t' + bl.text, italics: true, font: FONT, size: Math.round(26 * S) }), new D.TextRun({ text: `\t(${bl.n})`, font: FONT, size: Math.round(26 * S) })] }));
    else if (bl.t === 'fig') {
      if (bl.images.length === 1) {
        const im = bl.images[0], s = imgSize(im.file);
        out.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 120, after: 40 }, keepNext: true,
          children: [new D.ImageRun({ type: im.file.endsWith('.png') ? 'png' : 'jpg', data: s.buf, transformation: { width: im.w, height: Math.round(im.w * s.h / s.w) } })] }));
      } else {
        const w = Math.floor(COL / bl.images.length);
        const none = { style: D.BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        out.push(new D.Table({ width: { size: COL, type: D.WidthType.DXA }, columnWidths: bl.images.map(() => w), alignment: D.AlignmentType.CENTER,
          borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
          rows: [new D.TableRow({ cantSplit: true, children: bl.images.map(im => { const s = imgSize(im.file); return new D.TableCell({ width: { size: w, type: D.WidthType.DXA },
            borders: { top: none, bottom: none, left: none, right: none },
            children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 120, after: 0 }, keepNext: true, children: [new D.ImageRun({ type: 'jpg', data: s.buf, transformation: { width: im.w, height: Math.round(im.w * s.h / s.w) } })] }),
              new D.Paragraph({ alignment: D.AlignmentType.CENTER, keepNext: true, children: [new D.TextRun({ text: im.label, font: FONT, size: Math.round(24 * S) })] })] }); }) })] }));
      }
      out.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 40, after: 160 },
        children: [new D.TextRun({ text: `ภาพที่ ${bl.n} `, bold: true, font: FONT, size: Math.round(24 * S) }), new D.TextRun({ text: bl.caption, font: FONT, size: Math.round(24 * S) })] }));
    } else if (bl.t === 'table') {
      out.push(new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 160, after: 60 }, keepNext: true,
        children: [new D.TextRun({ text: `ตารางที่ ${bl.n} `, bold: true, font: FONT, size: Math.round(24 * S) }), new D.TextRun({ text: bl.caption, font: FONT, size: Math.round(24 * S) })] }));
      let widths = bl.widths; const total = widths.reduce((s, x) => s + x, 0);
      const TW = COL - 160; // a little narrower than the column so cell margins never push the first column past the edge
      widths = widths.map(x => Math.round(x * TW / total)); widths[widths.length - 1] += TW - widths.reduce((s, x) => s + x, 0);
      out.push(new D.Table({ width: { size: TW, type: D.WidthType.DXA }, columnWidths: widths, alignment: D.AlignmentType.CENTER,
        borders: { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder, insideHorizontal: cellBorder, insideVertical: cellBorder },
        rows: bl.rows.map((row, ri) => new D.TableRow({ cantSplit: true, tableHeader: bl.header && ri === 0, children: row.map((cell, ci) => new D.TableCell({
          width: { size: widths[ci], type: D.WidthType.DXA }, margins: { left: 60, right: 60, top: 0, bottom: 0 },
          shading: bl.header && ri === 0 ? { type: D.ShadingType.CLEAR, color: 'auto', fill: 'E7E6E6' } : undefined,
          children: [new D.Paragraph({ alignment: ci === 0 ? D.AlignmentType.LEFT : D.AlignmentType.CENTER, keepNext: ri < bl.rows.length - 1,
            children: [new D.TextRun({ text: String(cell), font: FONT, size: Math.round(24 * S), bold: (bl.header && ri === 0) || (bl.boldLast && ri === bl.rows.length - 1), ...(String(cell).includes(PENDING) ? { highlight: 'yellow' } : {}) })] })] })) })) }));
      out.push(bl.note ? new D.Paragraph({ spacing: { before: 40, after: 120 }, children: [new D.TextRun({ text: bl.note, font: FONT, size: Math.round(24 * S) })] }) : new D.Paragraph({ spacing: { after: 120 }, children: [] }));
    }
  }
  return out;
}

const header = new D.Header({ children: [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [
  new D.TextRun({ text: 'The 15', bold: true, font: FONT, size: Math.round(24 * S) }), new D.TextRun({ text: 'th', bold: true, superScript: true, font: FONT, size: Math.round(24 * S) }),
  new D.TextRun({ text: ' Asia Undergraduate Conference on Computing (AUC', bold: true, font: FONT, size: Math.round(24 * S) }), new D.TextRun({ text: '2', bold: true, superScript: true, font: FONT, size: Math.round(24 * S) }),
  new D.TextRun({ text: ') 2027', bold: true, font: FONT, size: Math.round(24 * S) })] })] });
const page = { size: { width: 11906, height: 16838 }, margin: { top: 1701, bottom: 1417, left: 1134, right: 1134, header: 850, footer: 708 } };

const titleBlock = [
  new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 240, after: 0 }, children: [new D.TextRun({ text: title.th, bold: true, font: FONT, size: Math.round(40 * S) })] }),
  new D.Paragraph({ alignment: D.AlignmentType.CENTER, spacing: { before: 0, after: 360 }, children: [new D.TextRun({ text: title.en, bold: true, font: FONT, size: Math.round(40 * S) })] }),
];
const abstractBlock = [
  para([runOf('บทคัดย่อ', { bold: true })], { alignment: D.AlignmentType.CENTER }),
  para([runOf(abstractTh)], { indent: { firstLine: 397 } }),
  para([runOf('คำสำคัญ -- ', { bold: true, italics: true }), runOf(keywordsTh)], { spacing: { before: 60, after: 0 } }),
  para([runOf('ABSTRACT', { bold: true })], { alignment: D.AlignmentType.CENTER, spacing: { before: 280, after: 0 } }),
  para([runOf(abstractEn)], { indent: { firstLine: 397 }, alignment: D.AlignmentType.BOTH }),
  para([runOf('Keywords -- ', { bold: true, italics: true }), runOf(keywordsEn)], { spacing: { before: 60, after: 0 } }),
];
const refBlock = [
  para([runOf('เอกสารอ้างอิง', { bold: true })], { alignment: D.AlignmentType.CENTER, spacing: { before: 280, after: 0 }, keepNext: true }),
  ...references.map(r => new D.Paragraph({ alignment: D.AlignmentType.LEFT, indent: { left: 397, hanging: 397 }, spacing: { after: 0 }, children: [runOf(r)] })),
];

const doc = new D.Document({
  creator: '', lastModifiedBy: '', title: title.en, description: '',
  styles: { default: { document: { run: { font: FONT, size: Math.round(28 * S) }, paragraph: { spacing: { after: 0, line: 240 } } } } },
  sections: [
    { properties: { page }, headers: { default: header }, children: titleBlock },
    { properties: { type: D.SectionType.CONTINUOUS, page, column: { count: 2, space: 340, equalWidth: true } }, headers: { default: header },
      children: [...abstractBlock, ...docxBlocks(), ...refBlock] },
  ],
});
const outDocx = path.join(here, process.env.OUT_NAME ?? 'liferpg-AUCC2027-oral-th.docx');
const templateFile = path.join(here, 'template', 'template_oral_thai.docx');
fs.writeFileSync(outDocx, fs.existsSync(templateFile) ? await intoTemplate(await D.Packer.toBuffer(doc), templateFile) : await D.Packer.toBuffer(doc));

/** Puts the generated body into the official AUCC2027 template: keeps its styles, header, footer, settings and
 *  section layout, replaces only the body, and clears author metadata (blind review). */
async function intoTemplate(generated, template) {
  const JSZip = mod('jszip');
  const gen = await JSZip.loadAsync(generated), tpl = await JSZip.loadAsync(fs.readFileSync(template));
  const genDoc = await gen.file('word/document.xml').async('string'), tplDoc = await tpl.file('word/document.xml').async('string');
  const tplSects = tplDoc.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/g); // [title section, two-column body section]
  // Images: copy media and give each relationship a new id that cannot clash with the template's.
  const genRels = await gen.file('word/_rels/document.xml.rels').async('string');
  let rels = await tpl.file('word/_rels/document.xml.rels').async('string'), docXml = genDoc, n = 0;
  for (const [, id, target] of genRels.matchAll(/<Relationship Id="([^"]+)" Type="[^"]+\/image" Target="([^"]+)"\/>/g)) {
    const nid = `rIdLiferpgImg${++n}`, name = `liferpg_${path.basename(target)}`;
    tpl.file(`word/media/${name}`, await gen.file(`word/${target}`).async('nodebuffer'));
    rels = rels.replace('</Relationships>', `<Relationship Id="${nid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${name}"/></Relationships>`);
    docXml = docXml.replaceAll(`r:embed="${id}"`, `r:embed="${nid}"`);
  }
  tpl.file('word/_rels/document.xml.rels', rels);
  let types = await tpl.file('[Content_Types].xml').async('string');
  for (const [ext, ct] of [['png', 'image/png'], ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg']])
    if (!types.includes(`Extension="${ext}"`)) types = types.replace('<Default Extension="xml"', `<Default Extension="${ext}" ContentType="${ct}"/><Default Extension="xml"`);
  tpl.file('[Content_Types].xml', types);
  // Body: generated content, with the template's own section breaks.
  let i = 0;
  docXml = docXml.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, () => tplSects[Math.min(i++, tplSects.length - 1)]);
  tpl.file('word/document.xml', docXml);
  // Header: the template says "The xth ... 202x"; fill in this year's conference.
  let headerXml = await tpl.file('word/header1.xml').async('string'), xs = 0;
  headerXml = headerXml.replace(/<w:color w:val="[^"]+"\/>/g, '').replace(/<w:highlight w:val="[^"]+"\/>/g, '').replace(/(<w:t[^>]*>)x(<\/w:t>)/g, (m, a, cEnd) => `${a}${xs++ === 0 ? '15' : '7'}${cEnd}`);
  tpl.file('word/header1.xml', headerXml);
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  tpl.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${title.en.replace(/&/g, '&amp;')}</dc:title><dc:creator></dc:creator><cp:lastModifiedBy></cp:lastModifiedBy><cp:revision>1</cp:revision><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
  let app = await tpl.file('docProps/app.xml').async('string');
  tpl.file('docProps/app.xml', app.replace(/<Company>[^<]*<\/Company>/, '<Company></Company>').replace(/<Manager>[^<]*<\/Manager>/, ''));
  return tpl.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ---------------------------------------------------------------- HTML preview (approximate layout; final check in Word)
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const hrun = r => typeof r === 'string' ? (r.includes(PENDING) ? `<mark>${esc(r)}</mark>` : esc(r)) : `<span style="${r.bold ? 'font-weight:700;' : ''}${r.italics ? 'font-style:italic;' : ''}">${esc(r.text)}</span>`;
const htmlBody = body.map(bl => {
  if (bl.t === 'h1') return `<h1>${esc(bl.text)}</h1>`;
  if (bl.t === 'h2') return `<h2>${esc(bl.text)}</h2>`;
  if (bl.t === 'p') return `<p class="${bl.hanging ? 'hang' : ''}">${bl.runs.map(hrun).join('')}</p>`;
  if (bl.t === 'eq') return `<div class="eq"><i>${esc(bl.text)}</i><span>(${bl.n})</span></div>`;
  if (bl.t === 'fig') return `<figure>${bl.images.map(im => { const s = imgSize(im.file); return `<span class="im"><img src="figures/${im.file}" style="width:${(im.w * 0.2646).toFixed(1)}mm;height:${(im.w * 0.2646 * s.h / s.w).toFixed(1)}mm">${im.label ? `<br>${im.label}` : ''}</span>`; }).join('')}<figcaption><b>ภาพที่ ${bl.n}</b> ${esc(bl.caption)}</figcaption></figure>`;
  if (bl.t === 'table') return `<div class="tbl"><div class="cap"><b>ตารางที่ ${bl.n}</b> ${esc(bl.caption)}</div><table>${bl.rows.map((row, ri) => `<tr>${row.map(cell => ri === 0 && bl.header ? `<th>${esc(cell)}</th>` : `<td${bl.boldLast && ri === bl.rows.length - 1 ? ' style="font-weight:700"' : ''}>${String(cell).includes(PENDING) ? `<mark>${esc(cell)}</mark>` : esc(cell)}</td>`).join('')}</tr>`).join('')}</table>${bl.note ? `<div class="cap" style="text-align:left">${esc(bl.note)}</div>` : ""}</div>`;
  return '';
}).join('\n');
const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>${esc(title.en)}</title><style>
@page { size: A4; margin: 30mm 20mm 25mm 20mm; @top-center { content: "The 15th Asia Undergraduate Conference on Computing (AUC²) 2027"; font: 700 9pt "Leelawadee UI"; } }
body { font-family: "TH SarabunPSK", "TH Sarabun New", "Leelawadee UI", sans-serif; font-size: 10.4pt; line-height: 20.5pt; margin: 0; }
.title { text-align: center; font-weight: 700; font-size: 14.8pt; line-height: 27pt; }
.cols { column-count: 2; column-gap: 6mm; text-align: left; }
h1 { font-size: 10.4pt; text-align: center; margin: 20.5pt 0 0; break-after: avoid; }
h2 { font-size: 10.4pt; font-style: italic; margin: 10pt 0 0; break-after: avoid; }
p { margin: 0; text-indent: 7mm; } p.hang { text-indent: -5mm; padding-left: 5mm; } p.ref { text-indent: -7mm; padding-left: 7mm; text-align: left; }
figure { margin: 6pt 0 10pt; text-align: center; break-inside: avoid; } .im { display: inline-block; margin: 0 1mm; font-size: 9pt; line-height: 14pt; }
figcaption, .cap { font-size: 9pt; line-height: 15pt; text-align: center; } .tbl { break-inside: avoid; margin: 8pt 0; }
table { width: 100%; border-collapse: collapse; font-size: 9pt; line-height: 14pt; } td, th { border: 1px solid #000; padding: 0 3px; text-align: center; } td:first-child { text-align: left; } th { background: #e7e6e6; }
.eq { display: flex; justify-content: space-between; margin: 6pt 0 6pt 12mm; font-size: 9.6pt; } mark { background: #ff0; }
</style></head><body>
<div class="title">${esc(title.th)}<br>${esc(title.en)}</div><br>
<div class="cols">
<h1 style="margin-top:0">บทคัดย่อ</h1><p>${hrun(abstractTh)}</p><p style="text-indent:0"><b><i>คำสำคัญ --</i></b> ${esc(keywordsTh)}</p>
<h1>ABSTRACT</h1><p>${hrun(abstractEn)}</p><p style="text-indent:0"><b><i>Keywords --</i></b> ${esc(keywordsEn)}</p>
${htmlBody}
<h1>เอกสารอ้างอิง</h1>${references.map(r => `<p class="ref">${esc(r)}</p>`).join('')}
</div></body></html>`;
fs.writeFileSync(path.join(here, 'preview.html'), html);
fs.writeFileSync(path.join(here, 'references.txt'), '﻿' + references.join('\r\n') + '\r\n');
console.log(`docx: ${outDocx}\nruns: ${runs.length}\nreferences: ${references.length}\nfigures: ${fig}, tables: ${tab}`);
if (R) console.log(JSON.stringify({ all: R.all, core: R.core, border: R.border, injection: R.injection, consistency: { unanimous: R.consistency.unanimous, kappa: R.consistency.kappa }, models: R.modelCounts, main: R.mainStatus, errors: R.errors, wrong: R.wrong.map(w => [w.id, w.type, w.quest, w.verdicts.join('/')]) }, null, 1));
if (warnings.length) console.log('\nWARNING:\n- ' + warnings.join('\n- '));
