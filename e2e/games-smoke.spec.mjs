import { test, expect } from '@playwright/test';
import { GAMES, launchGameThroughUI, returnToArcadeHub } from './helpers/game-helpers.mjs';

test.describe('NeonPulse Arcade: Smoke & Game Lifecycle Suite', () => {
  let pageErrors = [];

  test.beforeEach(async ({ page }) => {
    pageErrors = [];
    page.on('pageerror', (err) => {
      if (!err.message?.includes('AudioCtx') && !err.message?.includes('AudioContext')) {
        pageErrors.push(err.message);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('Arcade Lobby initializes cleanly with all seven game cards', async ({ page }) => {
    await expect(page.locator('.hero-title')).toContainText('NeonPulse Arcade');
    const cards = page.locator('.game-card');
    await expect(cards).toHaveCount(7);

    // Verify all 7 play buttons exist and are enabled
    for (const game of GAMES) {
      const btn = page.locator(`#${game.btnId}`);
      await expect(btn).toBeVisible();
      await expect(btn).toBeEnabled();
    }

    expect(pageErrors).toEqual([]);
  });

  for (const game of GAMES) {
    test(`Game: ${game.name} launches, pauses, resumes and returns to hub cleanly`, async ({ page }) => {
      // 1. Launch Game
      const canvas = await launchGameThroughUI(page, game);
      expect(await canvas.isVisible()).toBe(true);

      // Verify in-game HUD score is visible
      const hudScore = page.locator('#hud-score');
      await expect(hudScore).toBeVisible();

      // Wait a moment for frame render loop
      await page.waitForTimeout(300);

      // 2. Pause Game
      const pauseBtn = page.locator('#btn-pause-game');
      await pauseBtn.click();

      const pauseModal = page.locator('#modal-pause');
      await expect(pauseModal).toBeVisible({ timeout: 3000 });

      // 3. Resume Game
      const resumeBtn = page.locator('#btn-resume-game');
      await resumeBtn.click();
      await expect(pauseModal).toBeHidden({ timeout: 3000 });

      // 4. Return to Arcade Hub
      await returnToArcadeHub(page);

      // 5. Assert zero unexpected runtime exceptions
      expect(pageErrors).toEqual([]);
    });
  }
});
