import test from 'node:test';
import assert from 'node:assert/strict';
import { installBrowserMocks, setNavigator } from './helpers/browser-mocks.mjs';

installBrowserMocks();
let pad;
setNavigator({ getGamepads: () => [pad] });
const { gamepad } = await import('../src/engine/gamepad.js');
gamepad.gamepadIndex = 0;

const makePad = ({ hat = 0, mapping = '', pressed = [] } = {}) => {
  const axes = new Array(10).fill(0);
  axes[9] = hat;
  const buttons = Array.from({ length: 16 }, (_, i) => ({ pressed: pressed.includes(i) }));
  return { mapping, axes, buttons };
};

test('standard mapping reads the D-pad from buttons 12-15', () => {
  pad = makePad({ mapping: 'standard', pressed: [12] });
  assert.equal(gamepad.poll().up, true);
  pad = makePad({ mapping: 'standard', pressed: [15] });
  assert.equal(gamepad.poll().right, true);
});

test('non-standard pads report the D-pad as a hat axis (axes[9])', () => {
  const cases = [
    [-1, 'up'], [-0.4286, 'right'], [0.1429, 'down'], [0.7143, 'left']
  ];
  for (const [hat, dir] of cases) {
    pad = makePad({ hat });
    assert.equal(gamepad.poll()[dir], true, `hat ${hat} should press ${dir}`);
  }
});

test('hat in its neutral position presses nothing', () => {
  pad = makePad({ hat: 1.2857 });
  const s = gamepad.poll();
  assert.ok(!s.up && !s.down && !s.left && !s.right);
});

test('face buttons map the same on every layout', () => {
  pad = makePad({ pressed: [0] });
  assert.equal(gamepad.poll().action, true);
  pad = makePad({ pressed: [1] });
  assert.equal(gamepad.poll().super, true);
});

test('rumble does not throw when the browser has no playEffect', () => {
  pad = { ...makePad(), vibrationActuator: {} };
  assert.doesNotThrow(() => gamepad.rumble(100));
});
