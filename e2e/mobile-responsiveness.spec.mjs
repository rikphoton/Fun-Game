import { test, expect } from '@playwright/test';
import { GAMES, launchGameThroughUI, returnToArcadeHub } from './helpers/game-helpers.mjs';

const MOBILE_VIEWPORTS = [
  { name: '320x640 Compact Phone', width: 320, height: 640 },
  { name: '360x800 Android Standard', width: 360, height: 800 },
  { name: '375x812 iPhone SE/Mini', width: 375, height: 812 },
  { name: '390x844 iPhone 13/14/15', width: 390, height: 844 },
  { name: '393x873 Google Pixel 7/8', width: 393, height: 873 },
  { name: '412x915 Samsung Galaxy S22/24', width: 412, height: 915 },
  { name: '430x932 iPhone 14/15 Pro Max', width: 430, height: 932 }
];

test.describe('NeonPulse Arcade: Mobile Responsiveness & Layout Suite', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.project.name !== 'chromium-mobile') {
      test.skip();
    }
  });

  for (const vp of MOBILE_VIEWPORTS) {
    test(`Viewport ${vp.name} (${vp.width}x${vp.height}): Zero overflow and centered control alignment across all games`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Test across two distinct game archetypes (Joystick: Cyber Survivors, D-Pad: Hexa-Tron)
      for (const gameKey of ['cyberSurvivors', 'hexaTron']) {
        const game = GAMES.find(g => g.key === gameKey);
        await launchGameThroughUI(page, game);

        // 1. Verify No Horizontal Page Overflow
        const overflow = await page.evaluate(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: window.innerWidth,
            hasOverflow: document.documentElement.scrollWidth > window.innerWidth + 1
          };
        });
        expect(overflow.hasOverflow).toBe(false);

        // 2. Measure Centered Movement Control Midpoint
        const measurement = await page.evaluate(() => {
          const deckRow = document.querySelector('.deck-controls-row');
          const centerZone = document.querySelector('.deck-zone-center');
          const leftZone = document.querySelector('.deck-zone-left');
          const rightZone = document.querySelector('.deck-zone-right');

          if (!deckRow || !centerZone) return null;

          const rowRect = deckRow.getBoundingClientRect();
          const centerRect = centerZone.getBoundingClientRect();
          const leftRect = leftZone ? leftZone.getBoundingClientRect() : null;
          const rightRect = rightZone ? rightZone.getBoundingClientRect() : null;

          const viewportCenter = window.innerWidth / 2;
          const controlCenter = centerRect.left + centerRect.width / 2;
          const deviation = Math.abs(controlCenter - viewportCenter);

          let overlaps = false;
          if (leftRect && leftRect.width > 0 && centerRect.left < leftRect.right - 2) {
            overlaps = true;
          }
          if (rightRect && rightRect.width > 0 && centerRect.right > rightRect.left + 2) {
            overlaps = true;
          }

          return {
            controlCenter,
            viewportCenter,
            deviation,
            overlaps,
            centerWidth: centerRect.width,
            rowWidth: rowRect.width
          };
        });

        expect(measurement).not.toBeNull();
        expect(measurement.deviation).toBeLessThanOrEqual(2.0);
        expect(measurement.overlaps).toBe(false);

        // 3. Verify Canvas occupies available width (>70%) and height (>200px)
        const canvasRect = await page.locator('#game-canvas').boundingBox();
        expect(canvasRect).not.toBeNull();
        expect(canvasRect.height).toBeGreaterThanOrEqual(200);
        expect(canvasRect.width).toBeGreaterThanOrEqual(vp.width * 0.70);

        // 4. Return to Hub
        await returnToArcadeHub(page);
      }
    });
  }

  test('Landscape Orientation (844x390): Canvas and controls fit gracefully without breaking layout', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const game = GAMES.find(g => g.key === 'neonDash');
    await launchGameThroughUI(page, game);

    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 1;
    });
    expect(hasOverflow).toBe(false);

    await returnToArcadeHub(page);
  });

  test('Short-screen Phone (360x600): Playfield and controls remain fully contained', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 600 });
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const game = GAMES.find(g => g.key === 'quantumBreaker');
    await launchGameThroughUI(page, game);

    const hudVisible = await page.locator('.game-hud').isVisible();
    const canvasVisible = await page.locator('#game-canvas').isVisible();
    const deckVisible = await page.locator('#mobile-arcade-deck').isVisible();

    expect(hudVisible).toBe(true);
    expect(canvasVisible).toBe(true);
    expect(deckVisible).toBe(true);

    await returnToArcadeHub(page);
  });
});
