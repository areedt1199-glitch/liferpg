import { heartsFor, type Boss } from './catalog';

// Pure turn-based battle rules (UI timing lives in boss-arena.tsx).
// A wrong answer costs a heart and the question returns to the end of the queue with shuffled options,
// so the fight is won by answering every question correctly before the hearts run out.
export type Battle = {
  phase: 'player' | 'victory' | 'defeat';
  queue: number[]; current: number | null; order: number[];
  bossHP: number; maxHP: number; hearts: number; maxHearts: number;
  hint: number; removed: number | null; combo: number; maxCombo: number; crits: number; turns: number;
  missed: number[]; answers: Record<string, number>;
  /** Potion effects: armed ×2 hits waiting, ×2 hits landed, current answer revealed. */
  armed: number; doubled: number; revealed: boolean;
};
export type Turn = { battle: Battle; correct: boolean; crit: boolean; chosen: number; answer: number; power: number };
type Rand = () => number;
export function shuffle<T>(items: T[], rand: Rand = Math.random) { const a = [...items]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

function ask(b: Battle, boss: Boss, rand: Rand): Battle {
  if (!b.queue.length) return { ...b, current: null, order: [], phase: b.bossHP <= 0 ? 'victory' : 'defeat' };
  const [current, ...queue] = b.queue;
  return { ...b, current, queue, removed: null, revealed: false, order: shuffle(boss.questions[current].options.map((_, i) => i), rand) };
}
export function startBattle(boss: Boss, rand: Rand = Math.random): Battle {
  const hearts = heartsFor(boss), n = boss.questions.length;
  return ask({ phase: 'player', queue: shuffle(Array.from({ length: n }, (_, i) => i), rand), current: null, order: [], bossHP: n, maxHP: n, hearts, maxHearts: hearts,
    hint: 1, removed: null, combo: 0, maxCombo: 0, crits: 0, turns: 0, missed: [], answers: {}, armed: 0, doubled: 0, revealed: false }, boss, rand);
}
/** chosen = original option index (not the on-screen position). */
export function answer(b: Battle, boss: Boss, chosen: number, rand: Rand = Math.random): Turn {
  if (b.phase !== 'player' || b.current === null) throw new Error('ยังไม่ถึงตาของคุณ');
  const q = boss.questions[b.current], correct = chosen === q.answer, crit = correct && !b.revealed && !b.missed.includes(b.current), power = correct && b.armed > 0 ? 2 : 1;
  let next: Battle = { ...b, turns: b.turns + 1 };
  if (correct) {
    const combo = b.combo + 1;
    next = { ...next, bossHP: b.bossHP - power, armed: b.armed - (power - 1), doubled: b.doubled + (power - 1), combo, maxCombo: Math.max(b.maxCombo, combo), crits: b.crits + (crit ? 1 : 0), answers: { ...b.answers, [q.id]: chosen } };
  } else {
    next = { ...next, hearts: b.hearts - 1, combo: 0, missed: b.missed.includes(b.current) ? b.missed : [...b.missed, b.current], queue: [...b.queue, b.current] };
  }
  if (next.bossHP <= 0) next = { ...next, phase: 'victory', current: null, order: [] };
  else if (next.hearts <= 0) next = { ...next, phase: 'defeat', current: null, order: [] };
  else next = ask(next, boss, rand);
  return { battle: next, correct, crit, chosen, answer: q.answer, power };
}
/** Removes one wrong option from the current question; one use per battle. */
export function applyHint(b: Battle, boss: Boss, rand: Rand = Math.random): Battle {
  if (b.phase !== 'player' || b.current === null || b.hint < 1 || b.removed !== null) return b;
  const q = boss.questions[b.current], wrong = q.options.map((_, i) => i).filter(i => i !== q.answer);
  return { ...b, hint: b.hint - 1, removed: wrong[Math.floor(rand() * wrong.length)] };
}

/** Potion effects inside a fight (the potion itself is spent through the progress store). */
export function drinkPotion(b: Battle, item: 'hint' | 'heart' | 'reveal' | 'double'): Battle {
  if (b.phase !== 'player') return b;
  if (item === 'hint') return { ...b, hint: b.hint + 1 };
  if (item === 'heart') return { ...b, hearts: b.hearts + 1, maxHearts: Math.max(b.maxHearts, b.hearts + 1) };
  if (item === 'reveal') return b.current === null || b.revealed ? b : { ...b, revealed: true };
  return { ...b, armed: b.armed + 1 };
}
