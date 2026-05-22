const { app, BrowserWindow, desktopCapturer, dialog, globalShortcut, ipcMain, screen, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

const APP_TITLE = 'Smartie';
const IS_SMOKE_TEST = process.argv.includes('--smoke-test');

app.commandLine.appendSwitch('enable-features', 'GlobalShortcutsPortal');

let mainWindow;
let shortcutStatuses = [];

const recorderShortcuts = [
  {
    action: 'toggle-recording',
    accelerator: 'CommandOrControl+Alt+R',
    label: 'Start or stop recording'
  },
  {
    action: 'toggle-pause',
    accelerator: 'CommandOrControl+Alt+P',
    label: 'Pause or resume recording'
  },
  {
    action: 'discard-recording',
    accelerator: 'CommandOrControl+Alt+X',
    label: 'Discard active recording'
  },
  {
    action: 'toggle-smart-stack',
    accelerator: 'CommandOrControl+Alt+S',
    label: 'Toggle smart features'
  }
];

function sendShortcut(action) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send('smartie:shortcut', action);
}

function registerGlobalShortcuts() {
  shortcutStatuses = recorderShortcuts.map((shortcut) => {
    const registered = globalShortcut.register(shortcut.accelerator, () => {
      sendShortcut(shortcut.action);
    });

    return {
      ...shortcut,
      registered
    };
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    title: APP_TITLE,
    backgroundColor: '#101114',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once('ready-to-show', () => {
    if (!IS_SMOKE_TEST) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.once('did-finish-load', () => {
    if (IS_SMOKE_TEST) {
      setTimeout(() => app.exit(0), 250);
    }
  });

  mainWindow.webContents.once('did-fail-load', () => {
    if (IS_SMOKE_TEST) {
      app.exit(1);
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

function toDataUrl(image) {
  if (!image || image.isEmpty()) {
    return null;
  }

  return image.toDataURL();
}

function getDisplaySnapshot() {
  return screen.getAllDisplays().map((display) => ({
    id: display.id,
    scaleFactor: display.scaleFactor,
    bounds: display.bounds,
    workArea: display.workArea,
    size: display.size
  }));
}

function defaultRecordingPath() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `smartie-${stamp}.webm`;

  try {
    return path.join(app.getPath('videos'), filename);
  } catch {
    return path.join(app.getPath('documents'), filename);
  }
}

ipcMain.handle('smartie:list-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    fetchWindowIcons: true,
    thumbnailSize: {
      width: 420,
      height: 260
    }
  });

  return {
    displays: getDisplaySnapshot(),
    sources: sources.map((source) => ({
      id: source.id,
      name: source.name,
      displayId: source.display_id || null,
      thumbnail: toDataUrl(source.thumbnail),
      appIcon: toDataUrl(source.appIcon)
    }))
  };
});

ipcMain.handle('smartie:get-pointer', () => ({
  point: screen.getCursorScreenPoint(),
  displays: getDisplaySnapshot()
}));

ipcMain.handle('smartie:save-recording', async (_event, payload) => {
  const { bytes, suggestedName } = payload || {};
  if (!bytes) {
    throw new Error('No recording data received.');
  }

  const defaultPath = suggestedName
    ? path.join(path.dirname(defaultRecordingPath()), suggestedName)
    : defaultRecordingPath();

  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Smartie recording',
    defaultPath,
    filters: [
      { name: 'WebM video', extensions: ['webm'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  await fs.writeFile(result.filePath, Buffer.from(bytes));
  return {
    canceled: false,
    filePath: result.filePath
  };
});

ipcMain.handle('smartie:reveal-file', async (_event, filePath) => {
  if (!filePath) {
    return;
  }

  shell.showItemInFolder(filePath);
});

ipcMain.handle('smartie:get-shortcuts', () => shortcutStatuses);

app.whenReady().then(() => {
  app.setName(APP_TITLE);
  createWindow();

  if (!IS_SMOKE_TEST) {
    registerGlobalShortcuts();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
