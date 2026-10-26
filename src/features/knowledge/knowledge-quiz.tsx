"use client";
import { useMemo, useSyncExternalStore } from 'react';
import { levelLabels, type Level, type QuizQuestion } from './index';

// Self-check quiz: no XP/coins (answers live in the client), so progress is a per-viewer convenience in localStorage.
// `memory` keeps answers for this page when storage is blocked (private mode).
const memory = new Map<string, string>();
const listeners = new Set<() => void>();
const key = (pathId: string) => `liferpg.quiz.${pathId}`;
function read(k: string) { try { return localStorage.getItem(k) ?? memory.get(k) ?? '{}'; } catch { return memory.get(k) ?? '{}'; } }
function write(k: string, value: string) { memory.set(k, value); try { localStorage.setItem(k, value); } catch { /* keep in memory only */ } listeners.forEach(l => l()); }
function subscribe(notify: () => void) { listeners.add(notify); window.addEventListener('storage', notify); return () => { listeners.delete(notify); window.removeEventListener('storage', notify); }; }
function parse(raw: string): Record<string, number> { try { const v = JSON.parse(raw); return v && typeof v === 'object' ? v : {}; } catch { return {}; } }

export function KnowledgeQuiz({ pathId, quiz }: { pathId: string; quiz: QuizQuestion[] }) {
  const raw = useSyncExternalStore(subscribe, () => read(key(pathId)), () => '{}');
  const picks = useMemo(() => parse(raw), [raw]);
  const update = (next: Record<string, number>) => write(key(pathId), JSON.stringify(next));
  const levels = [...new Set(quiz.map(q => q.level))] as Level[];
  const cleared = (level: Level) => quiz.filter(q => q.level === level).every(q => picks[q.id] === q.answer);
  const correct = quiz.filter(q => picks[q.id] === q.answer).length;
  return <section className="growth-card knowledge-quiz" aria-labelledby="quiz-title">
    <div className="section-heading"><h2 id="quiz-title">แบบทดสอบตามระดับ</h2><span>ถูก {correct}/{quiz.length} ข้อ</span></div>
    <p className="muted">ตอบให้ถูกครบทุกข้อในระดับหนึ่งเพื่อปลดล็อกระดับถัดไป ตอบผิดได้ อ่านคำอธิบายแล้วลองใหม่ แบบทดสอบนี้ใช้ทบทวนตัวเอง ไม่ให้ XP หรือเหรียญ</p>
    {levels.map((level, i) => {
      const locked = i > 0 && !cleared(levels[i - 1]);
      const questions = quiz.filter(q => q.level === level);
      return <div key={level} className={`quiz-level level-${level}`}>
        <h3>ระดับ{levelLabels[level]} {cleared(level) ? '✓' : locked ? '🔒' : ''}</h3>
        {locked ? <p className="muted">ผ่านระดับ{levelLabels[levels[i - 1]]}ให้ครบก่อน</p> : <ol className="quiz-list">{questions.map(q => {
          const picked = picks[q.id]; const answered = picked !== undefined; const right = picked === q.answer;
          return <li key={q.id} className="quiz-question">
            <p className="quiz-prompt">{q.prompt}</p>
            {q.code && <pre className="code"><code>{q.code}</code></pre>}
            <div className="quiz-options" role="group" aria-label="ตัวเลือก">{q.options.map((option, o) => {
              const state = !answered ? '' : o === q.answer && right ? 'right' : o === picked ? 'wrong' : '';
              return <button key={o} type="button" className={`quiz-option ${state}`} aria-pressed={picked === o} disabled={right} onClick={() => update({ ...picks, [q.id]: o })}>{option}</button>;
            })}</div>
            {answered && <div className={`quiz-feedback ${right ? 'right' : 'wrong'}`} role="status">
              <strong>{right ? 'ถูกต้อง!' : 'ยังไม่ใช่ ลองเลือกใหม่อีกครั้ง'}</strong>
              {right && <><p>{q.explanation}</p><a className="text-link" href={q.source.url} target="_blank" rel="noreferrer">อ่านเพิ่ม · {q.source.title} ↗</a></>}
            </div>}
          </li>;
        })}</ol>}
      </div>;
    })}
    {correct > 0 && <button type="button" className="text-link quiz-reset" onClick={() => update({})}>เริ่มทำแบบทดสอบใหม่</button>}
  </section>;
}
