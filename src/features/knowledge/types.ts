// Knowledge bank authoring types. Options are written with the correct answer FIRST;
// index.ts shuffles them deterministically by question id (same idea as boss/catalog.ts).
export type Source = { title: string; url: string };
export type Level = 1 | 2 | 3;
/** [level, prompt, options (correct first), explanation, source index, code] */
export type QuizDraft = [Level, string, string[], string, number?, string?];
export type PathDraft = {
  /** One-line overview of what to learn first. */
  intro: string;
  sources: Source[];
  /** Key points per career task id, in the same order as the career's tasks. */
  lessons: Record<string, string[]>;
  /** 3 questions per level: easy (1) → medium (2) → hard (3). */
  quiz: QuizDraft[];
};
/** Advanced levels that extend a path's map to 8 levels after the career's own practice tasks. */
export type AdvancedLesson = { id: string; title: string; description: string; points: string[] };
export type AdvancedDraft = {
  /** Extra sources, appended after the path's own (quiz source indexes count across both lists). */
  sources?: Source[];
  lessons: AdvancedLesson[];
  /** 6 questions: 3 medium (2) then 3 hard (3); bosses of the advanced levels draw from these plus the base hard ones. */
  quiz: QuizDraft[];
};
