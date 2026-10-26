import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from '../scripts/load-ts.mjs';

const finder = loadTs('src/features/onboarding/path-finder.ts');
const { knowledgePaths } = loadTs('src/features/knowledge/index.ts');

test('path finder: every tech path has a style, picks follow the answers, and three distinct paths come back', () => {
  const ids = new Set(knowledgePaths().map(p => p.pathId));
  for (const build of ['game', 'web', 'ai', 'unsure']) for (const style of ['art', 'code', 'data', 'systems']) for (const experience of ['new', 'some', 'pro']) {
    const picks = finder.recommend({ build, style, experience, minutes: 30 });
    assert.equal(picks.length, 3); assert.equal(new Set(picks.map(p => p.pathId)).size, 3);
    for (const p of picks) assert.ok(ids.has(p.pathId), p.pathId);
  }
  const art = finder.recommend({ build: 'game', style: 'art', experience: 'pro', minutes: 30 });
  assert.ok(art.every(p => p.track === 'game'), 'game + art stays in the game track');
  const newcomer = finder.recommend({ build: 'web', style: 'code', experience: 'new', minutes: 15 })[0];
  assert.ok(['programming', 'javascript'].includes(newcomer.pathId), newcomer.pathId);
  assert.ok(finder.daysToFinish(15) > finder.daysToFinish(60));
});
