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
  },
  {
    action: 'toggle-mic-mute',
    accelerator: 'CommandOrControl+Alt+M',
    label: 'Mute or unmute microphone'
  },
  {
    action: 'toggle-focus-lock',
    accelerator: 'CommandOrControl+Alt+F',
    label: 'Lock or release smart focus'
  },
  {
    action: 'drop-marker',
    accelerator: 'CommandOrControl+Alt+K',
    label: 'Drop chapter marker'
  },
  {
    action: 'capture-snapshot',
    accelerator: 'CommandOrControl+Alt+J',
    label: 'Capture PNG snapshot'
  },
  {
    action: 'toggle-window-visibility',
    accelerator: 'CommandOrControl+Alt+H',
    label: 'Show or hide Smartie'
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

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show();
  }

  mainWindow.focus();
}

function setMainWindowHidden(hidden) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  if (hidden) {
    mainWindow.hide();
  } else {
    showMainWindow();
  }

  return !mainWindow.isVisible();
}

function toggleMainWindowVisibility() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }

  if (mainWindow.isVisible()) {
    mainWindow.hide();
    return true;
  }

  showMainWindow();
  return false;
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
      sandbox: false,
      backgroundThrottling: false
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

function defaultRecordingDirectory() {
  try {
    return app.getPath('videos');
  } catch {
    return app.getPath('documents');
  }
}

function sidecarPathFor(videoPath) {
  const extension = path.extname(videoPath);
  const base = extension ? videoPath.slice(0, -extension.length) : videoPath;
  return `${base}.smartie.json`;
}

function chapterPathFor(videoPath) {
  const extension = path.extname(videoPath);
  const base = extension ? videoPath.slice(0, -extension.length) : videoPath;
  return `${base}.chapters.vtt`;
}

function formatVttTime(ms) {
  const safeMs = Math.max(0, Math.floor(ms || 0));
  const hours = Math.floor(safeMs / 3_600_000);
  const minutes = Math.floor((safeMs % 3_600_000) / 60_000);
  const seconds = Math.floor((safeMs % 60_000) / 1000);
  const milliseconds = safeMs % 1000;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

function buildMarkerWebVtt(metadata) {
  const markers = Array.isArray(metadata?.markers) ? metadata.markers : [];
  if (markers.length === 0) {
    return null;
  }

  const durationMs = Math.max(0, Number(metadata.durationMs) || 0);
  const lines = [
    'WEBVTT',
    '',
    'NOTE Generated by Smartie'
  ];

  markers.forEach((marker, index) => {
    const startMs = Math.max(0, Number(marker.atMs) || 0);
    const nextMarkerMs = Number(markers[index + 1]?.atMs);
    const naturalEndMs = Number.isFinite(nextMarkerMs) ? nextMarkerMs : durationMs;
    const endMs = Math.max(startMs + 1000, naturalEndMs || startMs + 1000);
    const label = String(marker.label || `Marker ${index + 1}`).replace(/[\r\n]+/g, ' ');

    lines.push('', `${formatVttTime(startMs)} --> ${formatVttTime(endMs)}`, label);
  });

  return `${lines.join('\n')}\n`;
}

async function writeRecordingFiles(filePath, bytes, metadata) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(bytes));

  if (!metadata) {
    return {
      filePath,
      metadataPath: null,
      chaptersPath: null
    };
  }

  const metadataPath = sidecarPathFor(filePath);
  const chaptersPath = chapterPathFor(filePath);
  const chapters = buildMarkerWebVtt(metadata);

  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
  if (chapters) {
    await fs.writeFile(chaptersPath, chapters, 'utf8');
  }

  return {
    filePath,
    metadataPath,
    chaptersPath: chapters ? chaptersPath : null
  };
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
  const { bytes, suggestedName, saveMode, outputDir, metadata } = payload || {};
  if (!bytes) {
    throw new Error('No recording data received.');
  }

  if (saveMode === 'auto') {
    const directory = outputDir || defaultRecordingDirectory();
    const filePath = path.join(directory, suggestedName || path.basename(defaultRecordingPath()));
    const saved = await writeRecordingFiles(filePath, bytes, metadata);
    return {
      canceled: false,
      ...saved
    };
  }

  showMainWindow();

  const defaultPath = suggestedName
    ? path.join(outputDir || defaultRecordingDirectory(), suggestedName)
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

  const saved = await writeRecordingFiles(result.filePath, bytes, metadata);
  return {
    canceled: false,
    ...saved
  };
});

ipcMain.handle('smartie:save-snapshot', async (_event, payload) => {
  const { bytes, suggestedName, saveMode, outputDir } = payload || {};
  if (!bytes) {
    throw new Error('No snapshot data received.');
  }

  if (saveMode === 'auto') {
    const directory = outputDir || defaultRecordingDirectory();
    const filePath = path.join(directory, suggestedName || `smartie-snapshot-${Date.now()}.png`);
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(filePath, Buffer.from(bytes));
    return {
      canceled: false,
      filePath
    };
  }

  showMainWindow();
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Smartie snapshot',
    defaultPath: path.join(outputDir || defaultRecordingDirectory(), suggestedName || `smartie-snapshot-${Date.now()}.png`),
    filters: [
      { name: 'PNG image', extensions: ['png'] },
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

ipcMain.handle('smartie:get-default-output-dir', () => defaultRecordingDirectory());

ipcMain.handle('smartie:choose-output-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Smartie output folder',
    defaultPath: defaultRecordingDirectory(),
    properties: ['openDirectory', 'createDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('smartie:get-shortcuts', () => shortcutStatuses);

ipcMain.handle('smartie:set-window-hidden', (_event, hidden) => setMainWindowHidden(Boolean(hidden)));

ipcMain.handle('smartie:toggle-window-visibility', () => toggleMainWindowVisibility());

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
