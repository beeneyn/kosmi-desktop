const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aboutAPI', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
