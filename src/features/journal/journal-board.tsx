"use client";
import { useState } from "react";
import Link from "next/link";
import { goalDefinitions, findQuest } from "../journey/definitions";
import { JOURNAL_TEXT_MAX } from "../journey/progress";
import { eraseJournal, progressNow, useProgress, writeJournal } from "../journey/progress-store";
import { ProgressNotice } from "../journey/progress-notice";
import { bangkokDay } from "../analytics/rules";
import { addDays, weekLabel, weekStart, weekStats, weeklyGoal, type WeekStats } from "./report";
import { MentorReply, useAiConsent } from "./mentor-reply";

const tiles: [keyof WeekStats, string][] = [["quests", "ด่านที่ผ่าน"], ["xp", "XP ที่ได้"], ["days", "วันที่ฝึก"], ["plansDone", "แผนที่ทำสำเร็จ"], ["bossWins", "บอสที่ชนะ"], ["notes", "บันทึก"]];
const dayLabel = (time: number) => new Date(time).toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "Asia/Bangkok" });

/** Weekly report to the guild, the week's goal, and the adventurer's reflections. */
export function JournalBoard({ initialQuestId = "", aiReady = false }: { initialQuestId?: string; aiReady?: boolean }) {
  const { ready, progress, mode, userId } = useProgress();
  const [text, setText] = useState(""), [questId, setQuestId] = useState(findQuest(initialQuestId) ? initialQuestId : "");
  const [goalText, setGoalText] = useState(""), [goalFor, setGoalFor] = useState<"this" | "next">("next");
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useAiConsent();
  if (!ready) return <p role="status">กำลังเปิดสมุดบันทึก…</p>;
  if (mode === "account" && !userId) return <ProgressNotice />;

  const now = progressNow(), thisWeek = weekStart(now), lastWeek = addDays(thisWeek, -7), nextWeek = addDays(thisWeek, 7);
  const cur = weekStats(progress, thisWeek), prev = weekStats(progress, lastWeek);
  const goalNow = weeklyGoal(progress, thisWeek), goalNext = weeklyGoal(progress, nextWeek);
  const grew = cur.xp > prev.xp, steady = cur.days >= 3;
  const quests = goalDefinitions.filter(g => progress.goals[g.id]).flatMap(g => g.quests.filter(q => ["in_progress", "completed"].includes(progress.quests[q.id]) || q.id === questId).map(q => ({ id: q.id, label: `${g.title} · ${q.title}` })));
  const notes = progress.journal.filter(j => j.kind === "note").slice().reverse();

  async function save(kind: "note" | "weekly") {
    const body = (kind === "note" ? text : goalText).trim(); if (!body || busy) return;
    setBusy(true);
    const ok = await writeJournal({ id: crypto.randomUUID(), kind, questId: kind === "note" ? questId : "", text: body, week: kind === "note" ? "" : goalFor === "this" ? thisWeek : nextWeek });
    setBusy(false);
    if (ok) { if (kind === "note") { setText(""); setQuestId(""); } else setGoalText(""); }
  }

  return <div className="journal-layout">
    <ProgressNotice />
    <section className="growth-card guild-report" aria-labelledby="report-title">
      <div className="section-heading"><h2 id="report-title">รายงานต่อกิลด์</h2><span>สัปดาห์ {weekLabel(thisWeek)}</span></div>
      <p className="report-line">{cur.xp === 0 && prev.xp === 0 ? "สัปดาห์ใหม่ เริ่มก้าวแรกได้ทุกเมื่อ กิลด์รอฟังเรื่องราวของคุณอยู่" : grew ? "สัปดาห์นี้คุณก้าวไกลกว่าสัปดาห์ก่อนแล้ว เยี่ยมมาก" : steady ? "คุณรักษาจังหวะได้ดี ความสม่ำเสมอคือพลังที่แท้จริง" : "ยังมีเวลาในสัปดาห์นี้ ก้าวเล็ก ๆ วันละนิดก็นับ"}</p>
      <dl className="report-tiles">{tiles.map(([key, label]) => {
        const d = (cur[key] as number) - (prev[key] as number);
        return <div key={key}><dt>{label}</dt><dd>{cur[key]}</dd><span className={`report-delta ${d > 0 ? "up" : d < 0 ? "down" : ""}`}>{d > 0 ? `▲ ${d}` : d < 0 ? `▼ ${-d}` : "เท่าเดิม"}<small> จากสัปดาห์ก่อน</small></span></div>;
      })}</dl>
      <div className="week-goals">
        <div className="week-goal"><p className="week-goal-label">🎯 เป้าหมายสัปดาห์นี้</p><p>{goalNow ? goalNow.text : <span className="muted">ยังไม่ได้ตั้ง</span>}</p></div>
        <div className="week-goal"><p className="week-goal-label">🧭 เป้าหมายสัปดาห์หน้า ({weekLabel(nextWeek)})</p><p>{goalNext ? goalNext.text : <span className="muted">ยังไม่ได้ตั้ง</span>}</p></div>
      </div>
      <form className="journal-form" onSubmit={e => { e.preventDefault(); void save("weekly"); }}>
        <label className="journal-label" htmlFor="goal-text">ตั้งเป้าหมาย (ตั้งซ้ำจะแทนของเดิม)</label>
        <div className="seg" role="group" aria-label="สัปดาห์ของเป้าหมาย">{(["this", "next"] as const).map(w => <button key={w} type="button" aria-pressed={goalFor === w} onClick={() => setGoalFor(w)}>{w === "this" ? "สัปดาห์นี้" : "สัปดาห์หน้า"}</button>)}</div>
        <textarea id="goal-text" rows={2} maxLength={JOURNAL_TEXT_MAX} placeholder="เช่น ผ่าน 2 ด่านของสาย Python และฝึกให้ได้ 4 วัน" value={goalText} onChange={e => setGoalText(e.target.value)} />
        <button type="submit" className="primary-link" disabled={busy || !goalText.trim()}>บันทึกเป้าหมาย</button>
      </form>
    </section>

    <section className="growth-card journal-write" aria-labelledby="write-title">
      <div className="section-heading"><h2 id="write-title">เขียนบันทึกการเดินทาง</h2><span>{text.length}/{JOURNAL_TEXT_MAX}</span></div>
      <form className="journal-form" onSubmit={e => { e.preventDefault(); void save("note"); }}>
        <label className="journal-label" htmlFor="note-text">วันนี้ได้เรียนรู้อะไร ติดตรงไหน หรือภูมิใจเรื่องอะไร</label>
        <textarea id="note-text" rows={4} maxLength={JOURNAL_TEXT_MAX} placeholder="เช่น วันนี้เข้าใจว่า list กับ dict ต่างกันยังไง แต่ยังสับสนเรื่อง loop ซ้อน" value={text} onChange={e => setText(e.target.value)} />
        <label className="journal-label" htmlFor="note-quest">เกี่ยวกับด่าน (ไม่ใส่ก็ได้)</label>
        <select id="note-quest" value={questId} onChange={e => setQuestId(e.target.value)}><option value="">— ไม่ระบุ —</option>{quests.map(q => <option key={q.id} value={q.id}>{q.label}</option>)}</select>
        <button type="submit" className="primary-link" disabled={busy || !text.trim()}>🪶 บันทึก</button>
      </form>
    </section>

    <section className="growth-card journal-entries" aria-labelledby="entries-title">
      <div className="section-heading"><h2 id="entries-title">สมุดบันทึก</h2><span>{notes.length} บันทึก</span></div>
      <div className="mentor-intro"><p><strong>🧙 อาจารย์แห่งกิลด์</strong> อ่านบันทึกแล้วชื่นชม ช่วยคลายจุดที่ติด และเสนอก้าวเล็กถัดไป (ใช้ Gemini AI)</p>{!aiReady ? <p className="muted">ยังไม่ได้ตั้งค่า Gemini ในเซิร์ฟเวอร์ อาจารย์จึงยังตอบไม่ได้</p> : mode === "demo" ? <p className="muted">อาจารย์ตอบได้เมื่อเข้าสู่ระบบบัญชีจริง (โหมด demo ไม่ส่งข้อมูลออกนอกเบราว์เซอร์)</p> : <label className="chat-consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />ยินยอมส่งบันทึกที่กดขอคำแนะนำให้ Google Gemini อย่าเขียนรหัสผ่านหรือข้อมูลส่วนตัวในบันทึก</label>}</div>
      {notes.length === 0 ? <p className="muted">ยังไม่มีบันทึก หน้าแรกของการผจญภัยรอคุณเขียนอยู่</p> : <ol className="journal-list">{notes.map(n => {
        const q = n.questId ? findQuest(n.questId) : undefined;
        return <li key={n.id}>
          <p className="journal-meta"><time dateTime={bangkokDay(n.createdAt)}>{dayLabel(n.createdAt)}</time>{q && <> · <Link className="text-link" href={`/quests/${q.id}`}>{q.title}</Link></>}</p>
          <p className="journal-text">{n.text}</p>
          {aiReady && mode === "account" && <MentorReply entryId={n.id} consent={consent} />}
          <button type="button" className="text-link danger-link" disabled={busy} onClick={() => { if (confirm("ลบบันทึกนี้?")) void eraseJournal(n.id); }}>ลบ</button>
        </li>;
      })}</ol>}
    </section>
  </div>;
}
