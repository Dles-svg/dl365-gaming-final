const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  onSetMode: (callback) => ipcRenderer.on('set-mode', (event, mode) => callback(mode)),
  removeSetModeListener: () => ipcRenderer.removeAllListeners('set-mode'),
  launchLocalGame: (gamePath) => ipcRenderer.invoke('launch-local-game', gamePath),
  checkGameInstalled: (gamePath) => ipcRenderer.invoke('check-game-installed', gamePath),
  isElectron: true,
  appMode: 'gamer'
});
