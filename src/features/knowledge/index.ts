import careers from '../careers/catalog.json';
import { aiKnowledge } from './ai';
import { devKnowledge } from './dev';
import { gameKnowledge } from './game';
import { aiAdvanced } from './advanced-ai';
import { devAdvanced } from './advanced-dev';
import { gameAdvanced } from './advanced-game';
import type { AdvancedDraft, Level, PathDraft, Source } from './types';

export type { Level, Source };
export type Lesson = { taskId: string; title: string; description: string; points: string[] };
export type QuizQuestion = { id: string; level: Level; prompt: string; code?: string; options: string[]; answer: number; explanation: string; source: Source };
/** baseLessons / baseQuiz = how many lessons and questions come from the career's own tasks; the rest are advanced levels. */
export type Knowledge = { pathId: string; title: string; englishTitle: string; track: string; intro: string; sources: Source[]; lessons: Lesson[]; quiz: QuizQuestion[]; baseLessons: number; baseQuiz: number };
/** Every path map has this many levels: the career's tasks first, then advanced lessons. */
export const PATH_LEVELS = 8;

export const levelLabels: Record<Level, string> = { 1: 'ง่าย', 2: 'กลาง', 3: 'ยาก' };

const drafts: Record<string, PathDraft> = { ...aiKnowledge, ...devKnowledge, ...gameKnowledge };
const advanced: Record<string, AdvancedDraft> = { ...aiAdvanced, ...devAdvanced, ...gameAdvanced };

function hash(text: string) { let h = 2166136261; for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
/** Deterministic shuffle so server and client render the same order; the correct option is authored first. */
function arrange(id: string, options: string[]) {
  const order = options.map((_, i) => i);
  let seed = hash(id);
  for (let i = order.length - 1; i > 0; i--) { seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0; const j = seed % (i + 1); [order[i], order[j]] = [order[j], order[i]]; }
  return { options: order.map(i => options[i]), answer: order.indexOf(0) };
}

function build(pathId: string, draft: PathDraft): Knowledge | undefined {
  const career = careers.find(c => c.id === pathId && !('retired' in c));
  if (!career) return undefined;
  const extra = advanced[pathId] ?? { lessons: [], quiz: [] }, sources = [...draft.sources, ...(extra.sources ?? [])];
  const lessons = [
    ...career.tasks.map(t => ({ taskId: t.id, title: t.title, description: t.description, points: draft.lessons[t.id] ?? [] })),
    ...extra.lessons.map(l => ({ taskId: l.id, title: l.title, description: l.description, points: l.points })),
  ];
  // Question ids are positional (base first, then advanced), so the base quiz keeps its ids; each part sorts easy → hard.
  const toQuestion = ([level, prompt, options, explanation, src, code]: PathDraft['quiz'][number], n: number): QuizQuestion =>
    ({ id: `${pathId}-${n}`, level, prompt, ...(code ? { code } : {}), ...arrange(`${pathId}-${n}`, options), explanation, source: sources[src ?? 0] });
  const base = draft.quiz.map((q, i) => toQuestion(q, i + 1)).sort((a, b) => a.level - b.level);
  const more = extra.quiz.map((q, i) => toQuestion(q, draft.quiz.length + i + 1)).sort((a, b) => a.level - b.level);
  return { pathId, title: career.title, englishTitle: career.englishTitle, track: ('track' in career && career.track) || 'dev', intro: draft.intro, sources, lessons, quiz: [...base, ...more], baseLessons: career.tasks.length, baseQuiz: base.length };
}

const all = new Map<string, Knowledge>();
for (const [id, draft] of Object.entries(drafts)) { const k = build(id, draft); if (k) all.set(id, k); }

export function getKnowledge(pathId: string) { return all.get(pathId); }
export function knowledgePaths() { return [...all.values()]; }
