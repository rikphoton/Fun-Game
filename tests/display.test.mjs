import test from 'node:test';
import assert from 'node:assert/strict';
import { computeRenderScale, LOGICAL_WIDTH } from '../src/engine/display.js';

test('1x screen showing the canvas at logical size renders at scale 1', () => {
  assert.equal(computeRenderScale(LOGICAL_WIDTH, 1), 1);
});

test('retina screen doubles the backing store', () => {
  assert.equal(computeRenderScale(LOGICAL_WIDTH, 2), 2);
});

test('small phone canvas never drops below scale 1', () => {
  assert.equal(computeRenderScale(360, 1), 1);
});

test('very dense screens are capped at 2x to protect frame rate', () => {
  assert.equal(computeRenderScale(600, 3), 2);
  assert.equal(computeRenderScale(400, 3), 1.5);
});

test('scale snaps to quarter steps so tiny layout changes do not resize the canvas', () => {
  assert.equal(computeRenderScale(490, 2), computeRenderScale(495, 2));
  assert.equal(computeRenderScale(490, 2), 1.25);
});

test('invalid input falls back to scale 1', () => {
  assert.equal(computeRenderScale(0, 2), 1);
  assert.equal(computeRenderScale(NaN, 2), 1);
  assert.equal(computeRenderScale(800, NaN), 1);
});
