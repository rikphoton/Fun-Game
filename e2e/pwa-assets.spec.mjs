import { test, expect } from '@playwright/test';

test.describe('NeonPulse Arcade: PWA & Offline Asset Verification Suite', () => {
  test('Web App Manifest is served with correct icons and metadata', async ({ request, page }) => {
    // 1. Check link tag in HTML
    await page.goto('/');
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(manifestHref).toContain('manifest.webmanifest');

    // 2. Fetch and parse manifest JSON
    const response = await request.get('/manifest.webmanifest');
    expect(response.status()).toBe(200);

    const manifest = await response.json();
    expect(manifest.name).toBe('NeonPulse Arcade');
    expect(manifest.short_name).toBe('NeonPulse');
    expect(['standalone', 'fullscreen']).toContain(manifest.display);
    expect(manifest.start_url).toBe('./');

    // Verify icons array
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(3);

    const icon192 = manifest.icons.find(i => i.sizes === '192x192');
    const icon512 = manifest.icons.find(i => i.sizes === '512x512' && i.purpose !== 'maskable');
    const maskable512 = manifest.icons.find(i => i.purpose === 'maskable');

    expect(icon192).toBeDefined();
    expect(icon512).toBeDefined();
    expect(maskable512).toBeDefined();

    // Verify icons can be fetched with normalized leading slash
    const path192 = '/' + icon192.src.replace(/^\.?\//, '');
    const path512 = '/' + icon512.src.replace(/^\.?\//, '');

    const res192 = await request.get(path192);
    expect(res192.status()).toBe(200);

    const res512 = await request.get(path512);
    expect(res512.status()).toBe(200);
  });

  test('Service worker is registered in production build', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const swRegistered = await page.evaluate(async () => {
      if (!('serviceWorker' in navigator)) return false;
      const registrations = await navigator.serviceWorker.getRegistrations();
      return registrations.length > 0;
    });

    expect(swRegistered).toBe(true);
  });
});
