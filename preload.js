const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // From original preload script for notifications
  showNotification: (title, options) => ipcRenderer.send('show-notification', { title, options }),
  // NEW: For drag and drop
  sendDroppedLink: (url) => ipcRenderer.send('dropped-link', url)
});

// Override the native Notification class
class PatchedNotification extends Notification {
  constructor(title, options) {
    // Send to main process to show native notification
    ipcRenderer.send('show-notification', { title, options });
    // Still call the original constructor to maintain other functionality
    super(title, options);
  }
}

// Replace the global Notification with our patched version
window.Notification = PatchedNotification;

