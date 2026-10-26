"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import careers from "../careers/catalog.json";
import { goalDefinitions } from "../journey/definitions";
import { PLAN_DAY_LIMIT, PLAN_MINUTES, PLAN_NOTE_MAX, statusLabels, type PlanKind } from "../journey/progress";
import { planSlot, progressNow, useProgress } from "../journey/progress-store";
import { ProgressNotice } from "../journey/progress-notice";
import { bangkokDay } from "../analytics/rules";
import { bangkokTime, kindLabels, monthGrid, overlapping, planEnd, planTitle, thaiDate, thaiMonths, weekdays } from "./calendar";
import { PlanSlots } from "./plan-slots";

/** Next half hour on the Bangkok clock, as a sensible default start time. */
function nextHalfHour(now: number) {
  const [h, m] = bangkokTime(now).split(":").map(Number);
  const total = Math.min(23 * 60 + 30, Math.ceil((h * 60 + m + 1) / 30) * 30);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function PlanBoard() {
  const { ready, progress, mode, userId, error } = useProgress();
  const [today] = useState(() => bangkokDay(progressNow()));
  const [view, setView] = useState(() => ({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }));
  const [day, setDay] = useState(today);
  if (!ready || (mode === "account" && !userId)) return <ProgressNotice />;
  const byDay = new Map<string, typeof progress.plans>();
  for (const p of progress.plans) byDay.set(p.day, [...(byDay.get(p.day) ?? []), p]);
  const move = (delta: number) => setView(v => { const m = v.month + delta; return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 }; });
  const selected = byDay.get(day) ?? [];
  return <>
    <ProgressNotice />
    {error && <p className="storage-error" role="alert">{error}</p>}
    <div className="plan-layout">
      <section className="growth-card plan-calendar" aria-labelledby="calendar-title">
        <div className="calendar-head">
          <button type="button" className="calendar-nav" onClick={() => move(-1)} aria-label="เดือนก่อนหน้า">‹</button>
          <h2 id="calendar-title">{thaiMonths[view.month]} {view.year + 543}</h2>
          <button type="button" className="calendar-nav" onClick={() => move(1)} aria-label="เดือนถัดไป">›</button>
        </div>
        <button type="button" className="text-link calendar-today" onClick={() => { setDay(today); setView({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) - 1 }); }}>กลับไปวันนี้</button>
        <table className="calendar-grid"><thead><tr>{weekdays.map(w => <th key={w} scope="col">{w}</th>)}</tr></thead>
          <tbody>{monthGrid(view.year, view.month).map((week, i) => <tr key={i}>{week.map((d, j) => {
            if (!d) return <td key={j} />;
            const items = byDay.get(d) ?? [], done = items.filter(p => p.done).length;
            return <td key={d}><button type="button" className={`calendar-day ${d === day ? "selected" : ""} ${d === today ? "today" : ""} ${d < today ? "past" : ""}`} aria-pressed={d === day} aria-label={`${thaiDate(d)}${items.length ? ` มีแผน ${items.length} ช่วง ทำแล้ว ${done}` : " ยังไม่มีแผน"}`} onClick={() => setDay(d)}>
              <span className="day-number">{Number(d.slice(8))}</span>
              {items.length > 0 && <span className="day-dots" aria-hidden="true">{items.slice(0, 4).map(p => <i key={p.id} className={`dot kind-${p.kind} ${p.done ? "done" : ""}`} />)}{items.length > 4 && <b>+{items.length - 4}</b>}</span>}
            </button></td>;
          })}</tr>)}</tbody></table>
        <p className="muted calendar-legend"><i className="dot kind-quest" /> ด่านผจญภัย <i className="dot kind-practice" /> ฝึกประจำวัน <i className="dot kind-note" /> กิจกรรมอื่น · จุดจาง = ทำแล้ว</p>
      </section>
      <section className="growth-card plan-day" aria-labelledby="day-title">
        <div className="section-heading"><h2 id="day-title">{day === today ? "วันนี้ · " : ""}{thaiDate(day)}</h2><span>{selected.length}/{PLAN_DAY_LIMIT} ช่วง</span></div>
        <PlanSlots plans={selected} empty="ยังไม่มีแผนในวันนี้ เพิ่มช่วงเวลาโฟกัสด้านล่างได้เลย" />
        <SlotForm key={day} day={day} past={day < today} />
      </section>
    </div>
  </>;
}

function SlotForm({ day, past }: { day: string; past: boolean }) {
  const { progress } = useProgress();
  const mine = goalDefinitions.filter(g => progress.goals[g.id]);
  const career = careers.find(c => c.id === progress.careerId);
  const [kind, setKind] = useState<PlanKind>(mine.length ? "quest" : career ? "practice" : "note");
  const [start, setStart] = useState(() => nextHalfHour(progressNow()));
  const [minutes, setMinutes] = useState(25);
  const [ref, setRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const quests = mine.flatMap(g => g.quests.filter(q => progress.quests[q.id] !== "completed").map(q => ({ g, q })));
  const choice = kind === "quest" ? (ref || quests[0]?.q.id || "") : kind === "practice" ? (ref || (career ? `${career.id}|${career.tasks[0].id}` : "")) : "";
  const clash = overlapping(progress.plans, day, start, minutes);
  const full = progress.plans.filter(p => p.day === day).length >= PLAN_DAY_LIMIT;
  const blocked = full || busy || !/^\d\d:\d\d$/.test(start) || (kind === "note" ? !note.trim() : !choice);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (blocked) return;
    setBusy(true); setMessage("");
    try {
      const item = { id: crypto.randomUUID(), day, start, minutes, kind, ref: choice, note: note.trim(), done: false };
      if (await planSlot(item)) { setMessage(`เพิ่ม ${start}–${planEnd(item)} · ${planTitle(item)} แล้ว`); setNote(""); }
    } finally { setBusy(false); }
  }
  return <form className="slot-form" onSubmit={submit} aria-labelledby="slot-form-title">
    <h3 id="slot-form-title">เพิ่มช่วงเวลาโฟกัส</h3>
    {past && <p className="muted">วันนี้ผ่านไปแล้ว ยังบันทึกย้อนหลังได้</p>}
    <div className="growth-filters" role="group" aria-label="ประเภทกิจกรรม">{(Object.keys(kindLabels) as PlanKind[]).map(k => <button key={k} type="button" aria-pressed={kind === k} onClick={() => { setKind(k); setRef(""); }}>{kindLabels[k]}</button>)}</div>
    <div className="slot-fields">
      <label>เริ่ม<input type="time" value={start} required onChange={e => setStart(e.target.value)} /></label>
      <label>นานเท่าไร<select value={minutes} onChange={e => setMinutes(Number(e.target.value))}>{PLAN_MINUTES.map(m => <option key={m} value={m}>{m} นาที</option>)}</select></label>
    </div>
    {kind === "quest" && (quests.length ? <label>ด่าน<select value={choice} onChange={e => setRef(e.target.value)}>{mine.map(g => <optgroup key={g.id} label={g.title}>{quests.filter(x => x.g.id === g.id).map(({ q }) => <option key={q.id} value={q.id}>{q.title} ({statusLabels[progress.quests[q.id]]})</option>)}</optgroup>)}</select></label>
      : <p className="muted">ยังไม่มีด่านที่ต้องทำ <Link className="text-link" href="/goals">เพิ่มเป้าหมาย →</Link></p>)}
    {kind === "practice" && (career ? <label>งานฝึกของ{career.title}<select value={choice} onChange={e => setRef(e.target.value)}>{career.tasks.map(t => <option key={t.id} value={`${career.id}|${t.id}`}>{t.title}</option>)}</select></label>
      : <p className="muted">ยังไม่ได้เลือกเส้นทางฝึกประจำวัน <Link className="text-link" href="/careers">เลือกเส้นทาง →</Link></p>)}
    <label>{kind === "note" ? "ชื่อกิจกรรม" : "โน้ต (ไม่บังคับ)"}<input type="text" value={note} maxLength={PLAN_NOTE_MAX} required={kind === "note"} placeholder={kind === "note" ? "เช่น อ่านเอกสาร React 1 บท" : "เช่น ทำข้อ 1–3 ให้เสร็จ"} onChange={e => setNote(e.target.value)} /></label>
    {clash.length > 0 && <p className="slot-warning" role="status">ช่วงนี้ทับกับ {clash.map(c => `${c.start}–${planEnd(c)}`).join(", ")} · บันทึกได้ แต่ลองเลื่อนเวลาดูก่อน</p>}
    {full && <p className="slot-warning">วันนี้วางแผนครบ {PLAN_DAY_LIMIT} ช่วงแล้ว</p>}
    <button className="primary-link" disabled={blocked}>{busy ? "กำลังบันทึก…" : "เพิ่มลงแผน"}</button>
    {message && <p className="muted" role="status">{message}</p>}
  </form>;
}
