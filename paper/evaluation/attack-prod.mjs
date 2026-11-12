// Non-destructive attacks against the deployed system with only what any visitor has: the public (anon) key and the website.
// No account is used. Writes target a random UUID that matches no user, so even a broken policy could not change real data.
// Usage (from the liferpg folder): node paper/evaluation/attack-prod.mjs  -> prints a table and writes attack-prod-<date>.json
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(l => /^[A-Z_]+\s*=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
const SB = env.NEXT_PUBLIC_SUPABASE_URL, KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SITE = 'https://liferpg-five-zeta.vercel.app';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };
const nobody = crypto.randomUUID();
const results = [];
const record = (id, attack, expected, observed, blocked) => { if (/unreachable/.test(observed)) blocked = null; results.push({ id, attack, expected, observed, blocked }); console.log(`${id} ${blocked === null ? 'NOT RUN (unreachable)' : blocked ? 'BLOCKED' : '!! NOT BLOCKED'} | ${attack} | ${observed}`); };
// A host that cannot be reached is recorded as such instead of stopping the run.
const get = (...a) => fetch(...a).catch(e => ({ ok: false, status: 'unreachable (' + (e.cause?.code ?? e.name) + ')', text: async () => '' }));
const body = async r => { const t = await r.text(); try { return JSON.parse(t); } catch { return t; } };

const userTables = ['ai_usage', 'boss_results', 'checklist', 'focus_sessions', 'guild_members', 'guilds', 'item_purchases', 'item_uses', 'journal_entries', 'outfit_purchases',
  'plan_items', 'practice_log', 'profiles', 'quest_evidence', 'quest_progress', 'quest_reviews', 'reward_ledger', 'skin_purchases', 'user_goals', 'user_progress'];

// A1: read every table that holds user data without logging in.
{
  const leaks = []; let down = '';
  for (const t of userTables) { const r = await get(`${SB}/rest/v1/${t}?select=*&limit=5`, { headers: H }); if (String(r.status).startsWith('unreachable')) { down = r.status; break; } const b = await body(r); if (r.ok && Array.isArray(b) && b.length) leaks.push(`${t}:${b.length}`); }
  record('A1', `อ่านตารางข้อมูลผู้ใช้ ${userTables.length} ตารางโดยไม่ล็อกอิน`, 'ไม่ได้ข้อมูลแถวใดเลย', down ? `HTTP ${down}` : leaks.length ? `ได้ข้อมูล ${leaks.join(', ')}` : `0 แถวจากทั้ง ${userTables.length} ตาราง`, !leaks.length);
}
// A2: read the boss answer key in the private schema.
{
  const r = await get(`${SB}/rest/v1/boss_answers?select=*&limit=5`, { headers: { ...H, 'Accept-Profile': 'private' } }); const b = await body(r);
  const got = r.ok && Array.isArray(b) && b.length;
  record('A2', 'อ่านเฉลยบอสใน schema private ผ่าน Data API', 'ถูกปฏิเสธ', `HTTP ${r.status}${b?.code ? ` (${b.code})` : ''}${got ? ` ได้ ${b.length} แถว` : ''}`, !got);
}
// A3: forge a "pass" verdict through the review-recording function.
{
  const r = await get(`${SB}/rest/v1/rpc/liferpg_record_review`, { method: 'POST', headers: H, body: JSON.stringify({ u: nobody, quest: 'variables', verdict: 'pass', feedback: 'x', hint: '' }) }); const b = await body(r);
  record('A3', 'ปลอมผลตรวจ "pass" ด้วยการเรียกฟังก์ชันบันทึกผลตรวจโดยตรง', 'ถูกปฏิเสธ (สิทธิ์ service role เท่านั้น)', `HTTP ${r.status}${b?.code ? ` (${b.code})` : ''}`, !r.ok);
}
// A4: complete a quest through the game command without a session.
{
  const r = await get(`${SB}/rest/v1/rpc/liferpg_command`, { method: 'POST', headers: H, body: JSON.stringify({ action: 'complete', payload: { questId: 'variables' } }) }); const b = await body(r);
  record('A4', 'สั่งยืนยันด่านสำเร็จผ่าน RPC โดยไม่ล็อกอิน', 'ถูกปฏิเสธ', `HTTP ${r.status}${b?.code ? ` (${b.code})` : ''}`, !r.ok);
}
// A5: write XP straight into the reward ledger.
{
  const r = await get(`${SB}/rest/v1/reward_ledger`, { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: nobody, quest_id: 'variables', completed_at: new Date().toISOString(), xp: 99999, coins: 99999, total_xp_before: 0 }) }); const b = await body(r);
  record('A5', 'เขียน XP และเหรียญลง reward_ledger โดยตรง', 'ถูกปฏิเสธโดยสิทธิ์ (ไม่ใช่เพราะข้อมูลผิดรูปแบบ)', `HTTP ${r.status}${b?.code ? ` (${b.code})` : ''}`, !r.ok && b?.code !== '23503');
}
// A6: edit a profile row (a random id, so nothing real could change).
{
  const r = await get(`${SB}/rest/v1/profiles?user_id=eq.${nobody}`, { method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ character_name: 'hacked' }) }); const b = await body(r);
  record('A6', 'แก้ข้อมูลโปรไฟล์ผ่าน Data API โดยไม่ล็อกอิน', 'ถูกปฏิเสธหรือไม่มีแถวถูกแก้', `HTTP ${r.status}${b?.code ? ` (${b.code})` : ''}${Array.isArray(b) ? ` แก้ ${b.length} แถว` : ''}`, !r.ok || (Array.isArray(b) && !b.length));
}
// A7: call the reviewer API from another website (CSRF) and with no Origin.
{
  const a = await get(`${SITE}/api/review`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify({ questId: 'variables', kind: 'text', content: 'x', consent: true }) });
  const b = await get(`${SITE}/api/progress`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'complete', payload: { questId: 'variables' } }) });
  record('A7', 'ส่งงานให้ AI ตรวจจากเว็บอื่น (Origin ปลอม) และสั่งเกมโดยไม่มี Origin', 'ถูกปฏิเสธ 403', `review HTTP ${a.status}, progress HTTP ${b.status}`, a.status === 403 && b.status === 403);
}
// A8: same-origin requests without a session.
{
  const o = { 'Content-Type': 'application/json', Origin: SITE };
  const a = await get(`${SITE}/api/review`, { method: 'POST', headers: o, body: JSON.stringify({ questId: 'variables', kind: 'text', content: 'x', consent: true }) });
  const b = await get(`${SITE}/api/progress`, { method: 'POST', headers: o, body: JSON.stringify({ action: 'complete', payload: { questId: 'variables' } }) });
  record('A8', 'เรียก API ตรวจงานและ API เกมจาก origin ที่ถูกต้องแต่ไม่มี session', 'ถูกปฏิเสธ 401', `review HTTP ${a.status}, progress HTTP ${b.status}`, a.status === 401 && b.status === 401);
}
// A9: 20 concurrent requests to both the RPC and the API.
{
  const o = { 'Content-Type': 'application/json', Origin: SITE };
  const rs = await Promise.all([
    ...Array.from({ length: 10 }, () => get(`${SB}/rest/v1/rpc/liferpg_command`, { method: 'POST', headers: H, body: JSON.stringify({ action: 'complete', payload: { questId: 'variables' } }) })),
    ...Array.from({ length: 10 }, () => get(`${SITE}/api/progress`, { method: 'POST', headers: o, body: JSON.stringify({ action: 'complete', payload: { questId: 'variables' } }) })),
  ]);
  const ok = rs.filter(r => r.ok).length;
  record('A9', 'ส่งคำสั่งยืนยันด่านพร้อมกัน 20 คำขอ (RPC 10 + API 10)', 'ถูกปฏิเสธทุกคำขอ', `สำเร็จ ${ok}/20 (สถานะ ${[...new Set(rs.map(r => r.status))].join(', ')})`, ok === 0);
}
// A10: the public portfolio must not reveal private fields.
{
  const r = await get(`${SB}/rest/v1/rpc/liferpg_portfolio`, { method: 'POST', headers: H, body: JSON.stringify({ h: 'leaf_adventurer' }) }); const b = await body(r);
  const keys = b && typeof b === 'object' ? Object.keys(b) : [];
  const bad = keys.filter(k => /coin|journal|evidence|email|user_id|image/i.test(k));
  record('A10', 'อ่านพอร์ตโฟลิโอสาธารณะแล้วหาข้อมูลส่วนตัว', 'มีเฉพาะข้อมูลที่ตั้งใจเปิดเผย', !r.ok ? `HTTP ${r.status}` : b ? `ฟิลด์: ${keys.join(', ')}` : 'ไม่พบ (ไม่ได้เปิดสาธารณะ)', !bad.length);
}

const out = path.join(here, `attack-prod-${new Date().toISOString().slice(0, 10)}.json`);
fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), site: SITE, supabase: SB.replace(/^https:\/\/([^.]+).*/, '$1'), results }, null, 1));
console.log(`\n${results.filter(r => r.blocked).length}/${results.length} blocked -> ${out}`);
