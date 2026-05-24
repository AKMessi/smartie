const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('smartie', {
  listSources: () => ipcRenderer.invoke('smartie:list-sources'),
  getPointer: () => ipcRenderer.invoke('smartie:get-pointer'),
  getSemanticContext: () => ipcRenderer.invoke('smartie:get-semantic-context'),
  saveRecording: (payload) => ipcRenderer.invoke('smartie:save-recording', payload),
  saveCameraPlan: (payload) => ipcRenderer.invoke('smartie:save-camera-plan', payload),
  saveSnapshot: (payload) => ipcRenderer.invoke('smartie:save-snapshot', payload),
  revealFile: (filePath) => ipcRenderer.invoke('smartie:reveal-file', filePath),
  getDefaultOutputDir: () => ipcRenderer.invoke('smartie:get-default-output-dir'),
  chooseOutputDir: () => ipcRenderer.invoke('smartie:choose-output-dir'),
  getShortcuts: () => ipcRenderer.invoke('smartie:get-shortcuts'),
  setWindowHidden: (hidden) => ipcRenderer.invoke('smartie:set-window-hidden', hidden),
  toggleWindowVisibility: () => ipcRenderer.invoke('smartie:toggle-window-visibility'),
  onShortcut: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('smartie:shortcut', listener);
    return () => ipcRenderer.removeListener('smartie:shortcut', listener);
  },
  platform: process.platform
});
