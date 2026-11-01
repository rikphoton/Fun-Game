import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 4173;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const DIST_DIR = path.resolve('dist');

const GAMES = [
  { key: 'cyberSurvivors', name: 'Cyber Survivors' },
  { key: 'neonDash', name: 'Neon Dash' },
  { key: 'quantumBreaker', name: 'Quantum Breaker' },
  { key: 'astroPulse', name: 'Astro Pulse' },
  { key: 'neonDrift', name: 'Neon Drift' },
  { key: 'hexaTron', name: 'Hexa-Tron' },
  { key: 'cyberPacman', name: 'Cyber Pacman' }
];

async function ensureServer() {
  const isUp = await fetch(BASE_URL).then(() => true).catch(() => false);
  if (isUp) return null;

  const server = http.createServer((req, res) => {
    const urlPath = req.url.split('?')[0];
    let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
    if (!fs.existsSync(filePath)) filePath = path.join(DIST_DIR, 'index.html');
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === '.js' ? 'text/javascript' : (ext === '.css' ? 'text/css' : (ext === '.png' ? 'image/png' : 'text/html'));
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
    res.end(fs.readFileSync(filePath));
  });

  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  return server;
}

async function runBenchmark() {
  console.log('⚡ Starting NeonPulse Arcade Automated Performance Benchmark Suite...\n');

  const staticServer = await ensureServer();

  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-precise-memory-info', '--disable-background-timer-throttling']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // 1. Measure Initial Application Load
  const navStart = performance.now();
  await page.goto(BASE_URL);
  await page.waitForLoadState('load');
  const initialLoadTime = performance.now() - navStart;
  console.log(`✓ Initial App Load Time: ${initialLoadTime.toFixed(1)} ms`);

  const results = {
    timestamp: new Date().toISOString(),
    initialLoadMs: Number(initialLoadTime.toFixed(1)),
    games: {}
  };

  for (const game of GAMES) {
    console.log(`\nBenchmarking ${game.name} (${game.key})...`);

    // Measure Game Startup & In-Game Loop
    const metrics = await page.evaluate(async (key) => {
      const app = window.arcade;
      if (!app) return { error: 'Arcade instance not found on window' };

      const t0 = performance.now();
      app.launchGame(key, 'specter', 'standard');
      const startupMs = performance.now() - t0;

      // Close tutorial overlay if open
      const overlay = document.getElementById('tutorial-overlay');
      if (overlay) overlay.style.display = 'none';
      if (app.activeGame && app.activeGame.isPaused) app.activeGame.isPaused = false;

      // Profile 180 consecutive frames (~3 seconds at 60Hz)
      const frameTimes = [];
      let last = performance.now();

      await new Promise(resolve => {
        let count = 0;
        function step(now) {
          const delta = now - last;
          last = now;
          if (count > 0) frameTimes.push(delta); // skip frame 0 (startup jitter)
          count++;
          if (count < 181) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        }
        requestAnimationFrame(step);
      });

      // Calculate stats
      const totalTime = frameTimes.reduce((a, b) => a + b, 0);
      const avgFrameTime = totalTime / frameTimes.length;
      const fps = 1000 / avgFrameTime;
      const sorted = [...frameTimes].sort((a, b) => a - b);
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const minFrame = sorted[0];
      const maxFrame = sorted[sorted.length - 1];
      const longFrames = frameTimes.filter(t => t > 33.3).length; // >33.3ms dropped frames
      const midDrops = frameTimes.filter(t => t > 20.0).length; // >20ms slight jitters

      const mem = performance.memory ? {
        usedHeapMB: (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
        totalHeapMB: (performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2)
      } : { usedHeapMB: 'N/A', totalHeapMB: 'N/A' };

      // Return back to hub
      app.returnToHub();

      return {
        startupMs: Number(startupMs.toFixed(1)),
        avgFps: Number(fps.toFixed(1)),
        avgFrameMs: Number(avgFrameTime.toFixed(2)),
        p95FrameMs: Number(p95.toFixed(2)),
        minFrameMs: Number(minFrame.toFixed(2)),
        maxFrameMs: Number(maxFrame.toFixed(2)),
        totalFrames: frameTimes.length,
        longFrames,
        midDrops,
        longFrameRate: Number(((longFrames / frameTimes.length) * 100).toFixed(2)),
        memory: mem
      };
    }, game.key);

    results.games[game.key] = metrics;
    console.log(`  Startup Time: ${metrics.startupMs} ms`);
    console.log(`  Average FPS:  ${metrics.avgFps} FPS (avg frame: ${metrics.avgFrameMs} ms, p95: ${metrics.p95FrameMs} ms)`);
    console.log(`  Long Frames (>33ms): ${metrics.longFrames} / ${metrics.totalFrames} (${metrics.longFrameRate}%)`);
    console.log(`  JS Heap Memory: ${metrics.memory.usedHeapMB} MB`);
  }

  await browser.close();
  if (staticServer) {
    await new Promise(resolve => staticServer.close(resolve));
  }

  // Save report
  fs.writeFileSync('benchmark-results.json', JSON.stringify(results, null, 2));
  console.log('\n✓ Benchmark completed successfully. Saved to benchmark-results.json.');
  return results;
}

if (process.argv[1]?.endsWith('benchmark-arcade.mjs')) {
  runBenchmark().catch(err => {
    console.error('Benchmark failed:', err);
    process.exit(1);
  });
}

export { runBenchmark };
