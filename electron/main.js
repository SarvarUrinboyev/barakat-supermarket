'use strict';

// Electron launcher: boots the Spring Boot backend JAR, shows a splash
// screen while it starts, then loads the UI it serves on port 8086.
// Also checks GitHub Releases for application updates.

const { app, BrowserWindow, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');
const os = require('os');

const BACKEND_PORT = 8086;
// 127.0.0.1, not "localhost": the backend binds to the IPv4 loopback only,
// so this must match exactly (avoids an IPv6/::1 resolution mismatch).
const HEALTH_URL = `http://127.0.0.1:${BACKEND_PORT}/api/health`;
const APP_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const STARTUP_TIMEOUT_SECONDS = 90;

let mainWindow = null;
let backendProcess = null;

/** Absolute path to the backend JAR (packaged vs. development layout). */
function jarPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'barakat-market.jar')
    : path.join(__dirname, '..', 'backend', 'target', 'barakat-market.jar');
}

/**
 * Working directory for the JAR. In the packaged app this is a writable
 * folder under the user's home so application-local.properties can be
 * edited without administrator rights.
 */
function backendWorkdir() {
  if (!app.isPackaged) {
    return path.join(__dirname, '..', 'backend');
  }
  const dir = path.join(os.homedir(), '.barakat');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const localProps = path.join(dir, 'application-local.properties');
  const example = path.join(process.resourcesPath, 'application-local.properties.example');
  if (!fs.existsSync(localProps) && fs.existsSync(example)) {
    fs.copyFileSync(example, localProps);
  }
  return dir;
}

/**
 * Resolves the Java executable used to run the backend JAR. The app ships
 * its own Java 21 runtime (resources/jre), so no system Java is required.
 * JAVA_HOME and PATH are kept only as fallbacks for unbundled / dev runs.
 */
function resolveJava() {
  const exeName = process.platform === 'win32' ? 'java.exe' : 'java';
  // 1. The JRE bundled inside the app — the normal case, no system Java needed.
  const bundled = app.isPackaged
    ? path.join(process.resourcesPath, 'jre', 'bin', exeName)
    : path.join(__dirname, 'jre', 'bin', exeName);
  if (fs.existsSync(bundled)) {
    return bundled;
  }
  // 2. JAVA_HOME, then 3. bare PATH — fallbacks only.
  const home = process.env.JAVA_HOME;
  if (home) {
    const exe = path.join(home, 'bin', exeName);
    if (fs.existsSync(exe)) {
      return exe;
    }
  }
  return exeName;
}

function startBackend() {
  const jar = jarPath();
  if (!fs.existsSync(jar)) {
    dialog.showErrorBox(
      'SavdoPRO',
      'Backend fayli topilmadi:\n' + jar,
    );
    return;
  }
  const workdir = backendWorkdir();
  // Backend stdout/stderr are written to a log file so a failed startup can
  // be diagnosed afterwards instead of vanishing.
  let outFd = 'ignore';
  try {
    outFd = fs.openSync(path.join(workdir, 'backend.log'), 'w');
  } catch {
    /* logging is best-effort; fall back to discarding output */
  }
  backendProcess = spawn(resolveJava(), ['-jar', jar], {
    cwd: workdir,
    stdio: ['ignore', outFd, outFd],
    windowsHide: true,
  });
  backendProcess.on('error', (err) => {
    dialog.showErrorBox(
      'SavdoPRO',
      'Backend ishga tushmadi. Java 21 o‘rnatilganligini tekshiring.\n\n' + err.message,
    );
  });
}

function stopBackend() {
  if (!backendProcess || backendProcess.killed) {
    return;
  }
  try {
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(backendProcess.pid), '/f', '/t']);
    } else {
      backendProcess.kill('SIGTERM');
    }
  } catch {
    /* nothing else we can do on shutdown */
  }
  backendProcess = null;
}

/** Resolves true once the backend health endpoint answers 200. */
function pingBackend() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend() {
  for (let i = 0; i < STARTUP_TIMEOUT_SECONDS; i++) {
    if (await pingBackend()) {
      return true;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

/**
 * Checks GitHub Releases for a newer version. The download happens in the
 * background; when it is ready the user is offered an immediate restart
 * (the same way Telegram / Claude desktop deliver updates).
 */
function setupAutoUpdate() {
  if (!app.isPackaged) {
    return; // updates only apply to an installed build
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', (info) => {
    if (!mainWindow) {
      return;
    }
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'info',
      buttons: ['Hozir qayta ishga tushirish', 'Keyinroq'],
      defaultId: 0,
      cancelId: 1,
      title: 'Yangilanish tayyor',
      message: `SavdoPRO ${info.version} versiyasi yuklab olindi.`,
      detail: 'Yangilanishni o‘rnatish uchun dastur qayta ishga tushadi. '
        + '"Keyinroq" tugmasini bossangiz, dastur keyingi yopilganda yangilanadi.',
    });
    if (choice === 0) {
      stopBackend();
      setImmediate(() => autoUpdater.quitAndInstall());
    }
  });

  autoUpdater.on('error', (err) => {
    // Offline or no release published yet - not fatal, just log.
    console.error('Auto-update check failed:', err == null ? 'unknown' : err.message);
  });

  autoUpdater.checkForUpdates().catch(() => {
    /* offline - ignore, the app keeps working */
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    backgroundColor: '#1e3a5f',
    title: 'SavdoPRO',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.removeMenu();
  mainWindow.loadFile(path.join(__dirname, 'splash.html'));
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
  });

  // Ctrl+Shift+I (or F12) opens DevTools so we can diagnose network /
  // auth issues at the customer site without rebuilding.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isDevtools = (input.control && input.shift && input.key.toLowerCase() === 'i')
      || input.key === 'F12';
    if (isDevtools) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Open external links (e.g. Telegram) in the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  waitForBackend().then((ready) => {
    if (!mainWindow) {
      return;
    }
    if (ready) {
      mainWindow.loadURL(APP_URL);
    } else {
      mainWindow.loadFile(path.join(__dirname, 'splash.html'), { hash: 'error' });
    }
  });
}

// Only allow a single running instance.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    startBackend();
    createWindow();
    setupAutoUpdate();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', () => {
    stopBackend();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', stopBackend);
}
