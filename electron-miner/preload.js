const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  onSetMode: (callback) => ipcRenderer.on('set-mode', (event, mode) => callback(mode)),
  removeSetModeListener: () => ipcRenderer.removeAllListeners('set-mode'),
  launchLocalGame: (gamePath) => ipcRenderer.invoke('launch-local-game', gamePath),
  checkGameInstalled: (gamePath) => ipcRenderer.invoke('check-game-installed', gamePath),
  sendRemoteInput: (inputData) => ipcRenderer.send('remote-input', inputData),
  isElectron: true,
  appMode: 'miner'
});
