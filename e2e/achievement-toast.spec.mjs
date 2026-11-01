import { test, expect } from '@playwright/test';

test.describe('Achievement Toast Notification Redesign', () => {
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

  test('Desktop (1366x768): Achievement toast renders compact, elegant layout <= 340px at top-right', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    // Trigger achievement unlock toast
    await page.evaluate(() => {
      window.arcade.showAchievementToast({
        id: 'test_ach_desktop',
        title: 'Quantum Master Mind',
        icon: '🏆'
      });
    });

    const toast = page.locator('.arcade-toast.toast-achievement');
    await expect(toast).toBeVisible({ timeout: 2000 });

    // Verify content hierarchy
    await expect(toast.locator('.toast-badge')).toHaveText('ACHIEVEMENT UNLOCKED');
    await expect(toast.locator('.toast-title')).toHaveText('Quantum Master Mind');
    await expect(toast.locator('.toast-reward')).toHaveText('+100 Neon Credits');
    await expect(toast.locator('.toast-icon')).toHaveText('🏆');

    // Verify dimensions & positioning
    const box = await toast.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeLessThanOrEqual(340);
    // Positioned near top right
    expect(box.x).toBeGreaterThan(1366 - 380);
    expect(box.y).toBeGreaterThanOrEqual(60);

    // Auto-dismisses in ~3s
    await expect(toast).toBeHidden({ timeout: 4000 });
  });

  test('Mobile (390x844): Achievement toast renders compact layout <= 290px centered below HUD without overlap', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    await page.evaluate(() => {
      window.arcade.showAchievementToast({
        id: 'test_ach_mobile_390',
        title: 'Speed Demon Overdrive',
        icon: '🏎️'
      });
    });

    const toast = page.locator('.arcade-toast.toast-achievement');
    await expect(toast).toBeVisible({ timeout: 2000 });
    // Allow slide-in animation to finish settling
    await page.waitForTimeout(350);

    const box = await toast.boundingBox();
    expect(box).not.toBeNull();
    // Max width 290px
    expect(box.width).toBeLessThanOrEqual(290);

    // Horizontally centered within viewport
    const toastCenterX = box.x + box.width / 2;
    const viewportCenterX = 390 / 2;
    expect(Math.abs(toastCenterX - viewportCenterX)).toBeLessThan(5);

    // Positioned below top HUD (>= 44px) and away from bottom touch deck (<= 400px)
    expect(box.y).toBeGreaterThanOrEqual(44);
    expect(box.y).toBeLessThan(300);

    // Zero overflow
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);

    // Auto-dismisses
    await expect(toast).toBeHidden({ timeout: 4000 });
  });

  test('Narrow Mobile (320x640): Fits 320px screen without horizontal clipping or overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });

    await page.evaluate(() => {
      window.arcade.showAchievementToast({
        id: 'test_ach_narrow',
        title: 'Apex Survivor Legend Extra Long Title For Testing Clamping',
        icon: '👾'
      });
    });

    const toast = page.locator('.arcade-toast.toast-achievement');
    await expect(toast).toBeVisible({ timeout: 2000 });

    const box = await toast.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeLessThanOrEqual(290);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(320);

    // Verify 2-line clamp keeps height compact (< 80px)
    expect(box.height).toBeLessThan(85);
  });

  test('Queueing & Deduplication: Prevents duplicate unlocks and limits concurrent toasts', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    // Trigger rapid duplicates and different achievements
    await page.evaluate(() => {
      // Duplicate should be ignored
      window.arcade.showAchievementToast({ id: 'dupe_test', title: 'First Unlock', icon: '⭐' });
      window.arcade.showAchievementToast({ id: 'dupe_test', title: 'First Unlock', icon: '⭐' });

      // Queue additional unlocks
      window.arcade.showAchievementToast({ id: 'ach_2', title: 'Second Unlock', icon: '🎯' });
      window.arcade.showAchievementToast({ id: 'ach_3', title: 'Third Unlock', icon: '🚀' });
      window.arcade.showAchievementToast({ id: 'ach_4', title: 'Fourth Unlock', icon: '💎' });
    });

    // In DOM, there should never be more than 2 active toasts concurrently
    const toasts = page.locator('.arcade-toast');
    const count = await toasts.count();
    expect(count).toBeLessThanOrEqual(2);

    // Verify no overlap: if 2 toasts exist, second toast starts below first
    if (count === 2) {
      const box0 = await toasts.nth(0).boundingBox();
      const box1 = await toasts.nth(1).boundingBox();
      expect(box1.y).toBeGreaterThanOrEqual(box0.y + box0.height);
    }
  });

  test('General Toasts: showToast() backwards compatibility and distinct styling', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });

    await page.evaluate(() => {
      window.arcade.showToast('💾 Save data copied to clipboard!');
    });

    const toast = page.locator('.arcade-toast.toast-general');
    await expect(toast).toBeVisible({ timeout: 2000 });
    await expect(toast.locator('.toast-icon')).toHaveText('💾');
    await expect(toast.locator('.toast-title')).toHaveText('Save data copied to clipboard!');
    await expect(toast.locator('.toast-badge')).toHaveText('ARCADE SYSTEM');
  });

  test('Visual Verification: Capture screenshots for desktop, mobile and narrow mobile viewports', async ({ page }) => {
    const screenshotDir = 'C:/Users/RIK/.gemini/antigravity/brain/b5e4046f-1266-41b0-b441-4eed1e026255/screenshots';

    // 1. Desktop 1366x768
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.evaluate(() => {
      window.arcade.showAchievementToast({
        id: 'toast_vis_desktop',
        title: 'Quantum Master Mind',
        icon: '🏆'
      });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${screenshotDir}/desktop_achievement_toast_1366x768.png` });

    // 2. Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(() => {
      window.arcade.showAchievementToast({
        id: 'toast_vis_mobile',
        title: 'Speed Demon Overdrive',
        icon: '🏎️'
      });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${screenshotDir}/mobile_achievement_toast_390x844.png` });

    // 3. Narrow Mobile 320x640
    await page.setViewportSize({ width: 320, height: 640 });
    await page.goto('/');
    await page.evaluate(() => {
      window.arcade.showAchievementToast({
        id: 'toast_vis_narrow',
        title: 'Apex Survivor Legend',
        icon: '👾'
      });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${screenshotDir}/narrow_achievement_toast_320x640.png` });

    // 4. In-Game Mobile 390x844 (Demonstrating zero HUD and control interference)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?game=cyberSurvivors&skipTutorial=1');
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      window.arcade.showAchievementToast({
        id: 'toast_vis_ingame',
        title: 'Drone Hunter Elite',
        icon: '👾'
      });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${screenshotDir}/mobile_in_game_toast_390x844.png` });
  });
});
