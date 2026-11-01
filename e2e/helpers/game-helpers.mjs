import { expect } from '@playwright/test';

export const GAMES = [
  { key: 'cyberSurvivors', name: 'Cyber Survivors', btnId: 'btn-play-survivors', controlType: 'joystick' },
  { key: 'neonDash', name: 'Neon Dash', btnId: 'btn-play-dash', controlType: 'dpad' },
  { key: 'quantumBreaker', name: 'Quantum Breaker', btnId: 'btn-play-breaker', controlType: 'slider' },
  { key: 'astroPulse', name: 'Astro Pulse', btnId: 'btn-play-shmup', controlType: 'joystick' },
  { key: 'neonDrift', name: 'Neon Drift', btnId: 'btn-play-drift', controlType: 'dpad' },
  { key: 'hexaTron', name: 'Hexa-Tron', btnId: 'btn-play-tron', controlType: 'dpad' },
  { key: 'cyberPacman', name: 'Cyber Pacman', btnId: 'btn-play-pacman', controlType: 'dpad' }
];

export async function launchGameThroughUI(page, game) {
  // Click game button on arcade lobby
  const playBtn = page.locator(`#${game.btnId}`);
  await playBtn.waitFor({ state: 'visible', timeout: 5000 });
  await playBtn.click();

  // In Challenge Mode Selector modal, wait for modal and click Standard Arcade
  const modalChallenge = page.locator('#modal-challenge-mode');
  await modalChallenge.waitFor({ state: 'visible', timeout: 5000 });
  const standardCard = page.locator('#challenge-modes-list > div').first();
  await standardCard.waitFor({ state: 'visible', timeout: 3000 });
  await standardCard.click();

  // If Cyber Survivors, wait for mech selection modal and click Launch
  if (game.key === 'cyberSurvivors') {
    const btnLaunch = page.locator('#btn-launch-mech');
    await btnLaunch.waitFor({ state: 'visible', timeout: 3000 });
    await btnLaunch.click();
  }

  // Tutorial / Briefing overlay appears: click Start Mission
  const btnStart = page.locator('#btn-tutorial-start');
  await btnStart.waitFor({ state: 'visible', timeout: 5000 });
  await btnStart.click();

  // Wait for tutorial overlay to close
  await page.locator('#tutorial-overlay').waitFor({ state: 'hidden', timeout: 5000 });

  // Verify game-view and canvas are visible
  const canvas = page.locator('#game-canvas');
  await canvas.waitFor({ state: 'visible', timeout: 5000 });

  return canvas;
}

export async function returnToArcadeHub(page) {
  const pauseModal = page.locator('#modal-pause');
  if (await pauseModal.isVisible()) {
    const resumeBtn = page.locator('#btn-resume-game');
    if (await resumeBtn.isVisible()) {
      await resumeBtn.click();
      await pauseModal.waitFor({ state: 'hidden', timeout: 3000 });
    }
  }

  const hubBtn = page.locator('#btn-back-to-hub');
  await hubBtn.waitFor({ state: 'visible', timeout: 3000 });
  await hubBtn.click();

  // Ensure lobby view is restored
  await page.locator('#lobby-view').waitFor({ state: 'visible', timeout: 5000 });
  await page.locator('#game-view').waitFor({ state: 'hidden', timeout: 5000 });
}
