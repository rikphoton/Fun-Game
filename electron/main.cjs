const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

let mainWindow = null;

// In development (`npm run dev` + `electron .` with NEONPULSE_DEV_URL set) load the Vite server,
// otherwise load the production build from ../dist.
const DEV_URL = process.env.NEONPULSE_DEV_URL || '';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 860,
    minHeight: 640,
    title: 'NeonPulse Arcade - Ultra Edition',
    backgroundColor: '#0a0a14',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
      // webSecurity stays at its default (enabled): the production bundle is a classic script,
      // so it loads from file:// without needing it turned off.
    }
  });

  if (DEV_URL) {
    mainWindow.loadURL(DEV_URL);
  } else {
    const distPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(distPath).catch((err) => {
      console.error('Could not load dist/index.html. Run "npm run build" first.', err);
    });
  }

  // Never navigate the game window away; open external links in the user's browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && url !== DEV_URL) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      event.preventDefault();
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
