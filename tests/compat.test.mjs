import test from 'node:test';
import assert from 'node:assert/strict';
import { installRoundRectPolyfill, localDateString } from '../src/engine/compat.js';

function fakeContext() {
  const calls = [];
  const proto = {};
  for (const m of ['moveTo', 'lineTo', 'arcTo', 'closePath']) {
    proto[m] = function (...args) { calls.push([m, ...args]); };
  }
  return { proto, calls };
}

test('roundRect polyfill draws four rounded corners and closes the path', () => {
  const { proto, calls } = fakeContext();
  installRoundRectPolyfill(proto);
  proto.roundRect(10, 20, 100, 50, [6]);
  assert.deepEqual(calls[0], ['moveTo', 16, 20]);
  assert.equal(calls.filter((c) => c[0] === 'arcTo').length, 4);
  assert.equal(calls.at(-1)[0], 'closePath');
});

test('roundRect polyfill clamps oversized radii to half the shorter side', () => {
  const { proto, calls } = fakeContext();
  installRoundRectPolyfill(proto);
  proto.roundRect(0, 0, 10, 10, 999);
  assert.deepEqual(calls[0], ['moveTo', 5, 0]);
});

test('roundRect polyfill with no radius gives square corners', () => {
  const { proto, calls } = fakeContext();
  installRoundRectPolyfill(proto);
  proto.roundRect(0, 0, 40, 20);
  assert.deepEqual(calls[0], ['moveTo', 0, 0]);
});

test('roundRect polyfill never replaces a native implementation', () => {
  const native = () => 'native';
  const proto = { roundRect: native };
  installRoundRectPolyfill(proto);
  assert.equal(proto.roundRect, native);
});

test('localDateString uses the local calendar day, not UTC', () => {
  assert.equal(localDateString(new Date(2026, 9, 26, 0, 30)), '2026-10-26');
  assert.equal(localDateString(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
});
