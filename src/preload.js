const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('smartie', {
  listSources: () => ipcRenderer.invoke('smartie:list-sources'),
  getPointer: () => ipcRenderer.invoke('smartie:get-pointer'),
  saveRecording: (payload) => ipcRenderer.invoke('smartie:save-recording', payload),
  revealFile: (filePath) => ipcRenderer.invoke('smartie:reveal-file', filePath),
  platform: process.platform
});
