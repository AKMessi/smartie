const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('smartie', {
  listSources: () => ipcRenderer.invoke('smartie:list-sources'),
  getPointer: () => ipcRenderer.invoke('smartie:get-pointer'),
  saveRecording: (payload) => ipcRenderer.invoke('smartie:save-recording', payload),
  revealFile: (filePath) => ipcRenderer.invoke('smartie:reveal-file', filePath),
  getDefaultOutputDir: () => ipcRenderer.invoke('smartie:get-default-output-dir'),
  chooseOutputDir: () => ipcRenderer.invoke('smartie:choose-output-dir'),
  getShortcuts: () => ipcRenderer.invoke('smartie:get-shortcuts'),
  onShortcut: (callback) => {
    const listener = (_event, action) => callback(action);
    ipcRenderer.on('smartie:shortcut', listener);
    return () => ipcRenderer.removeListener('smartie:shortcut', listener);
  },
  platform: process.platform
});
