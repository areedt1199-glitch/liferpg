"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { chooseGoal, useProgress } from '@/features/journey/progress-store';
import { enterDemo } from '@/features/account/actions';
import { trackLabels, type Track } from '@/features/careers/tracks';
import { PATH_LEVELS } from '@/features/knowledge';
import { daysToFinish, PENDING_GOAL_KEY, questions, recommend, type Answers } from './path-finder';

/** Four taps, three suggestions; picking one adds the path (or remembers it until the guest signs up). */
export function PathFinderQuiz() {
  const { ready, mode, userId, progress } = useProgress();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<string, string>>>({});
  const [busy, setBusy] = useState('');
  const signedIn = ready && (mode === 'demo' || !!userId);
  const done = step >= questions.length;
  const picks = done ? recommend({ build: answers.build, style: answers.style, experience: answers.experience, minutes: Number(answers.minutes) } as Answers) : [];

  function answer(key: string, value: string) { setAnswers(a => ({ ...a, [key]: value })); setStep(s => s + 1); }
  function remember(pathId: string) { try { localStorage.setItem(PENDING_GOAL_KEY, pathId); } catch { /* the path can still be picked on /goals */ } }
  async function start(pathId: string) {
    setBusy(pathId);
    if (progress.goals[pathId] || await chooseGoal(pathId)) router.push(`/goals/${pathId}`); else setBusy('');
  }

  if (!done) {
    const q = questions[step];
    return <section className="finder-card" aria-labelledby="finder-q">
      <div className="finder-progress" aria-label={`คำถาม ${step + 1} จาก ${questions.length}`}>{questions.map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}</div>
      <p className="finder-count">คำถาม {step + 1}/{questions.length}</p>
      <h2 id="finder-q">{q.title}</h2>
      <div className="finder-options">{q.options.map(o => <button key={o.value} type="button" className="finder-option" onClick={() => answer(q.key, o.value)}><strong>{o.label}</strong><span>{o.hint}</span></button>)}</div>
      {step > 0 && <button type="button" className="text-link finder-back" onClick={() => setStep(s => s - 1)}>← ย้อนกลับ</button>}
    </section>;
  }
  const minutes = Number(answers.minutes);
  return <section className="finder-results" aria-labelledby="finder-done">
    <p className="eyebrow">YOUR PATH</p>
    <h2 id="finder-done">เส้นทางที่เหมาะกับคุณ</h2>
    <p className="finder-sub">แต่ละเส้นทางมี {PATH_LEVELS} ด่านพร้อมบอส ถ้าทำวันละ {minutes >= 60 ? '1 ชั่วโมง' : `${minutes} นาที`} จบได้ในประมาณ {daysToFinish(minutes)} วัน</p>
    <ol className="finder-picks">{picks.map((p, i) => <li key={p.pathId} className={i === 0 ? 'best' : ''}>
      {i === 0 && <span className="finder-badge">เหมาะที่สุด</span>}
      <p className="finder-track">{trackLabels[p.track as Track] ?? p.track} · {p.englishTitle}</p>
      <h3>{p.title}</h3>
      <p>{p.intro}</p>
      {p.reasons.length > 0 && <ul className="finder-reasons">{p.reasons.map(r => <li key={r}>✓ {r}</li>)}</ul>}
      {signedIn
        ? <button type="button" className="primary-link" disabled={!!busy} onClick={() => start(p.pathId)}>{busy === p.pathId ? 'กำลังเพิ่ม…' : progress.goals[p.pathId] ? 'ไปที่แผนที่ →' : 'เริ่มเส้นทางนี้ →'}</button>
        : <div className="finder-guest">
            <Link className="primary-link" href="/login?signup=1" onClick={() => remember(p.pathId)}>สมัครแล้วเริ่มเส้นทางนี้ →</Link>
            <form action={enterDemo} onSubmit={() => remember(p.pathId)}><button type="submit" className="text-link">ลองแบบ demo ก่อน</button></form>
          </div>}
    </li>)}</ol>
    <p className="finder-more"><button type="button" className="text-link" onClick={() => { setStep(0); setAnswers({}); }}>ทำแบบทดสอบใหม่</button> · <Link className="text-link" href="/careers">ดูทุกเส้นทาง</Link></p>
  </section>;
}

/** After a guest signs up or opens the demo, adds the path they picked in the quiz and opens its map. */
export function PendingGoal() {
  const { ready, mode, userId } = useProgress();
  const router = useRouter();
  const handled = useRef(false);
  useEffect(() => {
    if (!ready || handled.current || !(mode === 'demo' || userId)) return;
    handled.current = true;
    let pathId: string | null = null;
    try { pathId = localStorage.getItem(PENDING_GOAL_KEY); localStorage.removeItem(PENDING_GOAL_KEY); } catch { /* nothing pending */ }
    if (pathId) { const id = pathId; void chooseGoal(id).then(ok => { if (ok) router.push(`/goals/${id}`); }); }
  }, [ready, mode, userId, router]);
  return null;
}
