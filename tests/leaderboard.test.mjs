import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserMocks } from './helpers/browser-mocks.mjs';

installBrowserMocks();
const { leaderboard } = await import('../src/engine/leaderboard.js');

test('every game starts with ten default scores in descending order', () => {
  for (const key of ['cyberSurvivors', 'neonDash', 'quantumBreaker', 'astroPulse', 'neonDrift', 'hexaTron', 'cyberPacman']) {
    const scores = leaderboard.getScores(key);
    assert.equal(scores.length, 10, key);
    for (let i = 1; i < scores.length; i++) assert.ok(scores[i - 1].score >= scores[i].score, key);
    for (const s of scores) assert.ok(s.tag.length <= 3, `${key} tag ${s.tag}`);
  }
});

test('isHighScore: zero never qualifies, beating the tenth place does', () => {
  assert.equal(leaderboard.isHighScore('neonDash', 0), false);
  assert.equal(leaderboard.isHighScore('neonDash', 1), false);
  assert.equal(leaderboard.isHighScore('neonDash', 100000), true);
});

test('addScore inserts in rank order, keeps ten entries, and flags the player entry', () => {
  const rank = leaderboard.addScore('neonDash', 'abcdef', 3300); // between 3600 (3rd) and 3100 (4th)
  assert.equal(rank, 4);
  const scores = leaderboard.getScores('neonDash');
  assert.equal(scores.length, 10);
  assert.equal(scores[3].tag, 'ABC');
  assert.equal(scores[3].isUser, true);
  assert.match(scores[3].date, /^\d{4}-\d{2}-\d{2}$/);
});

test('a new top score takes rank 1 and pushes the last place out', () => {
  const last = leaderboard.getScores('neonDash').at(-1);
  assert.equal(leaderboard.addScore('neonDash', 'TOP', 999999), 1);
  const scores = leaderboard.getScores('neonDash');
  assert.equal(scores.length, 10);
  assert.ok(!scores.some((s) => s.tag === last.tag && s.score === last.score));
});

test('scores are saved to localStorage', () => {
  const saved = JSON.parse(localStorage.getItem('neonpulse_leaderboards_v1'));
  assert.ok(saved.neonDash.some((e) => e.tag === 'TOP' && e.score === 999999));
});
