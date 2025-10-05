const { contextBridge, ipcRenderer } = require('electron');

// Expose a secure API to the settings window's renderer process
contextBridge.exposeInMainWorld('settingsAPI', {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setSetting: (key, value) => ipcRenderer.send('set-setting', key, value),
  clearRecentRooms: () => ipcRenderer.send('clear-recent-rooms')
});
