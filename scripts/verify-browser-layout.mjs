import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const PORT = 4199;
const CDP_PORT = 9338;
const DIST_DIR = path.resolve('dist');

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];
  let filePath = path.join(DIST_DIR, urlPath === '/' ? 'index.html' : urlPath);
  if (!fs.existsSync(filePath)) filePath = path.join(DIST_DIR, 'index.html');
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.js' ? 'text/javascript' : (ext === '.css' ? 'text/css' : (ext === '.png' ? 'image/png' : 'text/html'));
  res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' });
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

const GAMES = [
  'cyberSurvivors',
  'astroPulse',
  'cyberPacman',
  'hexaTron',
  'neonDrift',
  'neonDash',
  'quantumBreaker'
];

const VIEWPORTS = [320, 360, 375, 390, 393, 412, 430];

server.listen(PORT, async () => {
  console.log(`Starting live browser layout measurement across 7 games x 7 viewports (49 test runs)...`);
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

    let passCount = 0;
    let failCount = 0;

    for (const g of GAMES) {
      for (const w of VIEWPORTS) {
        const h = Math.round(w * 2.16);
        await cdpSend(ws, 'Emulation.setDeviceMetricsOverride', {
          width: w,
          height: h,
          deviceScaleFactor: 1,
          mobile: true
        });

        await cdpSend(ws, 'Page.navigate', {
          url: `http://127.0.0.1:${PORT}/?game=${g}&skipTutorial=1`
        });

        // Wait for game active view and layout to paint
        await cdpSend(ws, 'Runtime.evaluate', {
          awaitPromise: true,
          expression: `new Promise((resolve) => {
            const check = () => {
              const joy = document.getElementById('deck-joystick');
              const dpad = document.getElementById('deck-dpad');
              const slider = document.getElementById('deck-slider');
              let ctrl = null;
              if (joy && window.getComputedStyle(joy).display !== 'none') ctrl = joy;
              else if (dpad && window.getComputedStyle(dpad).display !== 'none') ctrl = dpad;
              else if (slider && window.getComputedStyle(slider).display !== 'none') ctrl = slider;

              if (ctrl && ctrl.getBoundingClientRect().width > 0) {
                resolve();
              } else {
                setTimeout(check, 40);
              }
            };
            check();
          })`
        });

        const res = await cdpSend(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const joy = document.getElementById('deck-joystick');
            const dpad = document.getElementById('deck-dpad');
            const slider = document.getElementById('deck-slider');
            let ctrl = null;
            if (joy && window.getComputedStyle(joy).display !== 'none') ctrl = joy;
            else if (dpad && window.getComputedStyle(dpad).display !== 'none') ctrl = dpad;
            else if (slider && window.getComputedStyle(slider).display !== 'none') ctrl = slider;

            const rect = ctrl ? ctrl.getBoundingClientRect() : null;
            const l = document.getElementById('deck-zone-left')?.getBoundingClientRect();
            const r = document.getElementById('deck-zone-right')?.getBoundingClientRect();

            return JSON.stringify({
              windowWidth: window.innerWidth,
              ctrl: rect ? { left: rect.left, width: rect.width, right: rect.right, center: rect.left + rect.width / 2 } : null,
              leftZone: l ? { left: l.left, width: l.width, right: l.right } : null,
              rightZone: r ? { left: r.left, width: r.width, right: r.right } : null
            });
          })()`
        });

        const data = JSON.parse(res.result.value);
        if (!data.ctrl) {
          console.error(`FAIL: ${g} at ${w}px: movement control not visible in DOM`);
          failCount++;
          continue;
        }

        const expectedCenter = w / 2;
        const actualCenter = data.ctrl.center;
        const diff = Math.abs(actualCenter - expectedCenter);

        // Max 2px positioning tolerance as requested
        if (diff <= 2) {
          passCount++;
        } else {
          console.error(`FAIL: ${g} at ${w}px: actual center ${actualCenter.toFixed(2)} != expected ${expectedCenter} (diff: ${diff.toFixed(2)}px)`);
          failCount++;
        }
      }
      console.log(`✓ Completed 7 viewports for ${g}`);
    }

    console.log(`Live Browser Layout Tests Completed: ${passCount} passed, ${failCount} failed (Total: ${passCount + failCount})`);
    ws.close();
    if (failCount > 0) process.exit(1);
    else process.exit(0);
  } catch (err) {
    console.error('Error during browser layout test:', err);
    process.exit(1);
  } finally {
    proc.kill();
    server.close();
  }
});
