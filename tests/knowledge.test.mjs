import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Compile the knowledge modules in memory (same approach as progress.test.mjs).
const careers = JSON.parse(fs.readFileSync("src/features/careers/catalog.json", "utf8"));
const cache = {};
function load(file) {
  if (cache[file]) return cache[file];
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => {
    if (name === "../careers/catalog.json") return { default: careers };
    const local = { "./ai": "ai.ts", "./dev": "dev.ts", "./game": "game.ts", "./advanced-ai": "advanced-ai.ts", "./advanced-dev": "advanced-dev.ts", "./advanced-game": "advanced-game.ts", "./types": "types.ts" }[name];
    if (!local) throw new Error(`Unexpected import: ${name}`);
    return load(`src/features/knowledge/${local}`);
  } });
  return (cache[file] = exports);
}
const { knowledgePaths, getKnowledge } = load("src/features/knowledge/index.ts");
const active = careers.filter(c => !c.retired);

test("every active career/skill path has a knowledge entry with a lesson per task", () => {
  assert.equal(knowledgePaths().length, active.length);
  for (const c of active) {
    const k = getKnowledge(c.id);
    assert.ok(k, `missing knowledge for ${c.id}`);
    for (const l of k.lessons) assert.ok(l.points.length >= 3, `${c.id}/${l.taskId} needs 3+ points`);
  }
});

test("each quiz has 3 easy, 3 medium, 3 hard base questions, then 3 medium and 3 hard advanced ones", () => {
  for (const k of knowledgePaths()) {
    assert.deepEqual(Array.from(k.quiz, q => q.level), [1, 1, 1, 2, 2, 2, 3, 3, 3, 2, 2, 2, 3, 3, 3], k.pathId);
    assert.equal(k.baseQuiz, 9, k.pathId);
  }
});

test("every path map has 8 levels: the career's tasks, then advanced lessons with their own ids", () => {
  for (const k of knowledgePaths()) {
    const career = active.find(c => c.id === k.pathId);
    assert.equal(k.lessons.length, 8, k.pathId);
    assert.equal(k.baseLessons, career.tasks.length, k.pathId);
    assert.deepEqual(Array.from(k.lessons.slice(0, k.baseLessons), l => l.taskId), career.tasks.map(t => t.id), k.pathId);
    assert.equal(new Set(k.lessons.map(l => l.taskId)).size, 8, `duplicate lesson id in ${k.pathId}`);
  }
});

test("questions are well-formed: valid answer index, unique options, https source", () => {
  const ids = new Set();
  for (const k of knowledgePaths()) for (const q of k.quiz) {
    assert.ok(!ids.has(q.id), `duplicate id ${q.id}`); ids.add(q.id);
    assert.ok(q.options.length >= 3, q.id);
    assert.equal(new Set(q.options).size, q.options.length, `duplicate option in ${q.id}`);
    assert.ok(q.answer >= 0 && q.answer < q.options.length, q.id);
    assert.ok(q.source && q.source.url.startsWith("https://"), `bad source in ${q.id}`);
    assert.ok(q.explanation.length > 10, q.id);
  }
});

test("lesson keys match catalog task ids (no stray or misspelled lessons)", () => {
  for (const file of ["ai", "dev", "game"]) {
    const drafts = Object.values(load(`src/features/knowledge/${file}.ts`))[0];
    for (const [pathId, draft] of Object.entries(drafts)) {
      const career = active.find(c => c.id === pathId);
      assert.ok(career, `unknown path ${pathId}`);
      assert.deepEqual(Array.from(Object.keys(draft.lessons)).sort(), career.tasks.map(t => t.id).sort(), pathId);
    }
  }
});

test("the correct answer is not always in the same position", () => {
  const positions = new Set(knowledgePaths().flatMap(k => k.quiz.map(q => q.answer)));
  assert.ok(positions.size >= 3);
});
