import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 4175;
const CDP_PORT = 9335;
const DIST_DIR = path.resolve('dist');
const OUT_DIR = path.resolve('screenshots');
const ARTIFACT_DIR = 'C:\\Users\\RIK\\.gemini\\antigravity\\brain\\b5e4046f-1266-41b0-b441-4eed1e026255\\screenshots';

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath)) filePath = path.join(DIST_DIR, 'index.html');
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'text/html', 'Access-Control-Allow-Origin': '*' });
  res.end(fs.readFileSync(filePath));
});

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function cdpSend(ws, method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function captureScreen(ws, url, filename, width = 390, height = 844, waitMs = 1800) {
  // 1. Emulate exact mobile device dimensions
  await cdpSend(ws, 'Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: true
  });

  // 2. Navigate to target URL
  await cdpSend(ws, 'Page.navigate', { url });

  // 3. Wait for game loop / rendering
  await new Promise(r => setTimeout(r, waitMs));

  // 4. Capture screenshot
  const shot = await cdpSend(ws, 'Page.captureScreenshot', { format: 'png' });
  const buf = Buffer.from(shot.data, 'base64');
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, buf);

  // Copy to artifacts directory
  const artifactPath = path.join(ARTIFACT_DIR, filename);
  fs.writeFileSync(artifactPath, buf);

  console.log(`Captured: ${filename} [${width}x${height}] (${buf.length} bytes)`);
}

const GAMES = [
  'cyberSurvivors',
  'astroPulse',
  'cyberPacman',
  'hexaTron',
  'neonDrift',
  'neonDash',
  'quantumBreaker'
];

server.listen(PORT, async () => {
  console.log(`Preview server running on http://127.0.0.1:${PORT}`);
  const proc = spawn(EDGE_PATH, [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${CDP_PORT}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1200));

  try {
    const targetsRes = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
    const targets = await targetsRes.json();
    const pageTarget = targets.find(t => t.type === 'page') || targets[0];

    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve);
      ws.addEventListener('error', reject);
    });

    // 1. Briefing modal
    await captureScreen(ws, `http://127.0.0.1:${PORT}/?game=cyberSurvivors`, 'centered_briefing_cyberSurvivors.png', 390, 844, 1500);

    // 2. All 7 games at standard mobile (390x844)
    for (const g of GAMES) {
      await captureScreen(ws, `http://127.0.0.1:${PORT}/?game=${g}&skipTutorial=1`, `centered_game_${g}_390x844.png`, 390, 844, 2000);
    }

    // 3. Multi-viewport verification across requested widths
    // 320px
    await captureScreen(ws, `http://127.0.0.1:${PORT}/?game=cyberSurvivors&skipTutorial=1`, 'centered_game_cyberSurvivors_320x640.png', 320, 640, 1800);
    await captureScreen(ws, `http://127.0.0.1:${PORT}/?game=cyberPacman&skipTutorial=1`, 'centered_game_cyberPacman_320x640.png', 320, 640, 1800);
    // 360px
    await captureScreen(ws, `http://127.0.0.1:${PORT}/?game=astroPulse&skipTutorial=1`, 'centered_game_astroPulse_360x800.png', 360, 800, 1800);
    await captureScreen(ws, `http://127.0.0.1:${PORT}/?game=neonDrift&skipTutorial=1`, 'centered_game_neonDrift_360x800.png', 360, 800, 1800);
    // 375px
    await captureScreen(ws, `http://127.0.0.1:${PORT}/?game=quantumBreaker&skipTutorial=1`, 'centered_game_quantumBreaker_375x812.png', 375, 812, 1800);
    // 393px
    await captureScreen(ws, `http://127.0.0.1:${PORT}/?game=hexaTron&skipTutorial=1`, 'centered_game_hexaTron_393x873.png', 393, 873, 1800);
    // 412px
    await captureScreen(ws, `http://127.0.0.1:${PORT}/?game=neonDash&skipTutorial=1`, 'centered_game_neonDash_412x915.png', 412, 915, 1800);
    // 430px
    await captureScreen(ws, `http://127.0.0.1:${PORT}/?game=cyberPacman&skipTutorial=1`, 'centered_game_cyberPacman_430x932.png', 430, 932, 1800);

    console.log('All centered mobile screenshots successfully captured!');
    ws.close();
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    proc.kill();
    server.close();
  }
});
