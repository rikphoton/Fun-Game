import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 4173;
const DIST_DIR = path.resolve('dist');
const OUT_DIR = path.resolve('screenshots');

const ARTIFACT_DIR = 'C:\\Users\\RIK\\.gemini\\antigravity\\brain\\b5e4046f-1266-41b0-b441-4eed1e026255\\screenshots';

if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACT_DIR)) {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
    res.end(content);
  } catch (err) {
    res.writeHead(500);
    res.end('Error loading file: ' + err.message);
  }
});

const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

function captureScreen(url, outPath, width = 390, height = 844) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      `--window-size=${width},${height}`,
      '--virtual-time-budget=3500',
      `--screenshot=${outPath}`,
      url
    ];

    const proc = spawn(EDGE_PATH, args);
    proc.on('close', (code) => {
      if (code === 0 && fs.existsSync(outPath)) {
        const dest = path.join(ARTIFACT_DIR, path.basename(outPath));
        fs.copyFileSync(outPath, dest);
        console.log(`Captured: ${path.basename(outPath)} (${fs.statSync(outPath).size} bytes)`);
        resolve();
      } else {
        reject(new Error(`Failed to capture screenshot (exit code ${code})`));
      }
    });
    proc.on('error', reject);
  });
}

const GAMES = [
  'cyberSurvivors',
  'neonDash',
  'quantumBreaker',
  'astroPulse',
  'neonDrift',
  'hexaTron',
  'cyberPacman'
];

server.listen(PORT, async () => {
  console.log(`Preview server listening on http://127.0.0.1:${PORT}`);
  try {
    // 1. Capture Lobby
    await captureScreen(`http://127.0.0.1:${PORT}/`, path.join(OUT_DIR, '00_lobby_mobile.png'));

    // 2. Capture Briefing Modal (Cyber Pacman)
    await captureScreen(`http://127.0.0.1:${PORT}/?game=cyberPacman`, path.join(OUT_DIR, '01_briefing_cyberPacman.png'));

    // 3. Capture all 7 games in mobile portrait
    for (const game of GAMES) {
      const outPath = path.join(OUT_DIR, `game_${game}_mobile_390x844.png`);
      await captureScreen(`http://127.0.0.1:${PORT}/?game=${game}&skipTutorial=1`, outPath, 390, 844);
    }

    // 4. Also capture Cyber Pacman at 360x800 and 412x915 to verify boundary scaling
    await captureScreen(`http://127.0.0.1:${PORT}/?game=cyberPacman&skipTutorial=1`, path.join(OUT_DIR, 'game_cyberPacman_mobile_360x800.png'), 360, 800);
    await captureScreen(`http://127.0.0.1:${PORT}/?game=cyberPacman&skipTutorial=1`, path.join(OUT_DIR, 'game_cyberPacman_mobile_412x915.png'), 412, 915);

    // 5. Capture Quantum Breaker and Neon Drift at 360x800
    await captureScreen(`http://127.0.0.1:${PORT}/?game=quantumBreaker&skipTutorial=1`, path.join(OUT_DIR, 'game_quantumBreaker_mobile_360x800.png'), 360, 800);
    await captureScreen(`http://127.0.0.1:${PORT}/?game=neonDrift&skipTutorial=1`, path.join(OUT_DIR, 'game_neonDrift_mobile_360x800.png'), 360, 800);

    console.log('All mobile layout screenshots successfully captured!');
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    server.close();
  }
});
