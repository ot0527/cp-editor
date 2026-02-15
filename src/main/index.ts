import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { registerApiIpcHandlers } from './ipc/api';
import { registerCompilerIpcHandlers } from './ipc/compiler';

/**
 * アプリ本体が許可するURLか判定する。
 *
 * @param {string} url 判定対象URL。
 * @returns {boolean} 許可する場合true。
 */
function isAllowedAppUrl(url: string): boolean {
  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl && url.startsWith(rendererUrl)) {
    return true;
  }

  return url.startsWith('file://');
}

/**
 * メインウィンドウのナビゲーション制御を設定する。
 *
 * @param {BrowserWindow} window 設定対象ウィンドウ。
 * @returns {void} 値は返さない。
 */
function configureMainWindowSecurity(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler(() => ({
    action: 'deny',
  }));

  window.webContents.on('will-navigate', (event, url) => {
    if (isAllowedAppUrl(url)) {
      return;
    }

    event.preventDefault();
  });
}

/**
 * メインウィンドウを生成し、開発時はViteサーバー、ビルド時は静的HTMLを読み込む。
 *
 * @returns {void} 値は返さない。
 */
function createMainWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    autoHideMenuBar: true,
    title: 'CPEditor',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
    },
  });

  configureMainWindowSecurity(window);

  const rendererUrl = process.env.ELECTRON_RENDERER_URL;
  if (rendererUrl) {
    window.loadURL(rendererUrl);
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

/**
 * macOSでDockアイコンから再アクティブ化されたときにウィンドウを再生成する。
 *
 * @returns {void} 値は返さない。
 */
function handleAppActivate(): void {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
}

/**
 * 全ウィンドウが閉じたときにアプリ終了を制御する。
 * macOSでは慣習に合わせて終了しない。
 *
 * @returns {void} 値は返さない。
 */
function handleAllWindowsClosed(): void {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}

app.whenReady().then(() => {
  registerApiIpcHandlers();
  registerCompilerIpcHandlers();
  createMainWindow();
  app.on('activate', handleAppActivate);
});

app.on('window-all-closed', handleAllWindowsClosed);
