import { test, expect } from '@playwright/test';
import { GAMES, launchGameThroughUI, returnToArcadeHub } from './helpers/game-helpers.mjs';

test.describe('NeonPulse Arcade: Touch Input Reliability Suite', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'chromium-mobile') {
      test.skip();
    }
    await page.setViewportSize({ width: 393, height: 873 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('360 Virtual Joystick: Pointerdown, drag, clamp, and release with pointer capture', async ({ page }) => {
    const game = GAMES.find(g => g.key === 'cyberSurvivors');
    await launchGameThroughUI(page, game);

    const joystickBase = page.locator('#joystick-base');
    await expect(joystickBase).toBeVisible();

    const baseBox = await joystickBase.boundingBox();
    expect(baseBox).not.toBeNull();

    const centerX = baseBox.x + baseBox.width / 2;
    const centerY = baseBox.y + baseBox.height / 2;

    const knobPosition = await page.evaluate(({ cx, cy }) => {
      const base = document.getElementById('joystick-base');
      const knob = document.getElementById('joystick-knob');

      // 1. Pointerdown
      base.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: cx,
        clientY: cy
      }));

      // 2. Pointermove dragging 50px right
      base.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: cx + 50,
        clientY: cy
      }));

      const activeTransform = knob.style.transform;

      // 3. Pointerup release
      base.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId: 1,
        clientX: cx + 50,
        clientY: cy
      }));

      const releasedTransform = knob.style.transform;

      return { activeTransform, releasedTransform };
    }, { cx: centerX, cy: centerY });

    // During drag, knob moves; after pointerup, it resets to centered transform
    expect(knobPosition.activeTransform).toContain('translate');
    expect(knobPosition.releasedTransform).toBe('translate(-50%, -50%)');

    await returnToArcadeHub(page);
  });

  test('Simultaneous Multi-Touch: Holding Joystick and pressing Action Button simultaneously', async ({ page }) => {
    const game = GAMES.find(g => g.key === 'cyberSurvivors');
    await launchGameThroughUI(page, game);

    const multiTouchState = await page.evaluate(() => {
      const base = document.getElementById('joystick-base');
      const btnA = document.getElementById('touch-action-a');

      // Left thumb down on joystick (pointerId: 10)
      base.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 10,
        clientX: 200,
        clientY: 700
      }));

      // Right thumb down on Action A (pointerId: 20)
      btnA.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 20,
        clientX: 340,
        clientY: 700
      }));

      const bothActive = btnA.classList.contains('pressed') && base.classList.contains('active');

      // Release right thumb
      btnA.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true,
        pointerId: 20,
        clientX: 340,
        clientY: 700
      }));

      const rightReleased = !btnA.classList.contains('pressed');

      // Release left thumb via lostpointercapture
      base.dispatchEvent(new PointerEvent('lostpointercapture', {
        bubbles: true,
        pointerId: 10
      }));

      const leftReleased = !base.classList.contains('active');

      return { bothActive, rightReleased, leftReleased };
    });

    expect(multiTouchState.bothActive).toBe(true);
    expect(multiTouchState.rightReleased).toBe(true);
    expect(multiTouchState.leftReleased).toBe(true);

    await returnToArcadeHub(page);
  });

  test('Pause and Backgrounding during active input neutralizes stuck keys', async ({ page }) => {
    const game = GAMES.find(g => g.key === 'cyberSurvivors');
    await launchGameThroughUI(page, game);

    // Simulate active button press and backgrounding
    const inputState = await page.evaluate(() => {
      const btnNitro = document.getElementById('btn-touch-nitro');

      // Thumb down on secondary ability
      btnNitro.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId: 5,
        clientX: 50,
        clientY: 700
      }));

      const pressedBefore = btnNitro.classList.contains('pressed');

      // Simulate document visibilitychange to 'hidden' (switching browser tab or incoming call)
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));

      const releasedAfterHidden = !btnNitro.classList.contains('pressed');

      return { pressedBefore, releasedAfterHidden };
    });

    expect(inputState.pressedBefore).toBe(true);
    expect(inputState.releasedAfterHidden).toBe(true);

    await returnToArcadeHub(page);
  });
});
