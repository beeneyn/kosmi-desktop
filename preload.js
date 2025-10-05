// preload.js

const { contextBridge, ipcRenderer } = require('electron');

// We can't directly replace window.Notification because of context isolation.
// Instead, we will expose a safe API for the renderer process to use.
// However, to intercept existing notifications from a third-party site,
// we need a different approach. We can inject a script into the page.

// Let's stick to the override method, which works better for intercepting.
// The contextBridge is best practice, but for this specific task of
// hijacking an existing API, direct modification is more effective,
// assuming we manage the context correctly.
// Let's redefine Notification on the window object.

const OriginalNotification = Notification;

// Create a custom Notification class that sends data to the main process.
class CustomNotification extends OriginalNotification {
    constructor(title, options) {
        // Send notification data to the main process via IPC.
        ipcRenderer.send('show-notification', { title, ...options });

        // Call the original constructor to maintain some of the base functionality
        // but we won't show it. The main process will show the native one.
        // We will return an empty object that mimics an event target.
        super(title, options);
        this.addEventListener = () => {};
        this.removeEventListener = () => {};
        this.dispatchEvent = () => true;
        this.close = () => {};
    }

    // You might need to mock static properties/methods if the site uses them.
    static get permission() {
        return OriginalNotification.permission;
    }

    static async requestPermission() {
        return await OriginalNotification.requestPermission();
    }
}

// Override the global Notification object with our custom one.
// This will intercept any attempt by the Kosmi website to create a notification.
window.Notification = CustomNotification;
