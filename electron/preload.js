const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  onSetMode: (callback) => ipcRenderer.on('set-mode', callback),
  removeSetModeListener: () => ipcRenderer.removeAllListeners('set-mode')
});
