import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserMocks } from './helpers/browser-mocks.mjs';

const ls = installBrowserMocks();
const { storage, mergeQuests } = await import('../src/engine/storage.js');

test('new players start with 6 quests and 200 credits', () => {
  assert.equal(storage.data.quests.length, 6);
  assert.equal(storage.getCredits(), 200);
});

test('mergeQuests keeps progress for all 6 quests (regression: it used to reset every load)', () => {
  const fresh = mergeQuests(undefined);
  fresh[0].current = 25;
  fresh[1].claimed = true;
  const back = mergeQuests(JSON.parse(JSON.stringify(fresh)));
  assert.equal(back[0].current, 25);
  assert.equal(back[1].claimed, true);
});

test('mergeQuests upgrades an old 4-quest save without losing progress', () => {
  const fresh = mergeQuests(undefined);
  fresh[0].current = 10;
  const upgraded = mergeQuests(fresh.slice(0, 4));
  assert.equal(upgraded.length, 6);
  assert.equal(upgraded[0].current, 10);
  assert.equal(upgraded[5].current, 0);
});

test('mergeQuests clamps corrupt progress values', () => {
  const [q] = mergeQuests([{ id: 'quest_survivor', current: 99999 }]);
  assert.equal(q.current, q.target);
  const [bad] = mergeQuests([{ id: 'quest_survivor', current: 'abc' }]);
  assert.equal(bad.current, 0);
});

test('credits can be earned and spent, and overspending is refused', () => {
  const start = storage.getCredits();
  storage.addCredits(50);
  assert.equal(storage.getCredits(), start + 50);
  assert.equal(storage.spendCredits(10_000_000), false);
  assert.equal(storage.getCredits(), start + 50);
  assert.equal(storage.spendCredits(50), true);
  assert.equal(storage.getCredits(), start);
});

test('quest progress is clamped to its target and persists to localStorage', () => {
  storage.updateQuestProgress('quest_survivor', 9999);
  const q = storage.data.quests.find((x) => x.id === 'quest_survivor');
  assert.equal(q.current, q.target);
  const saved = JSON.parse(ls.getItem('neonpulse_arcade_v3'));
  assert.equal(saved.quests.find((x) => x.id === 'quest_survivor').current, q.target);
});

test('claiming a finished quest pays out once only', () => {
  const before = storage.getCredits();
  const reward = storage.claimQuest('quest_survivor');
  assert.ok(reward > 0);
  assert.ok(storage.getCredits() > before);
  assert.equal(storage.claimQuest('quest_survivor'), 0);
});

test('high scores only ever go up', () => {
  assert.equal(storage.saveHighScore('neonDash', 500), true);
  assert.equal(storage.saveHighScore('neonDash', 400), false);
  assert.equal(storage.getHighScore('neonDash'), 500);
});
