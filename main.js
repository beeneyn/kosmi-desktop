// main.js

const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
// NEW: Using a modern, pure JavaScript Discord RPC client
const DiscordRPC = require('discord-rich-presence');

// --- Discord RPC Configuration ---
const clientId = '1424391198860382310'; // Your client ID remains the same
let rpc;

// --- Global variables ---
let mainWindow;
let tray;
let store;
let splashWindow;
let updaterWindow;
let isQuitting = false;

// ... (Global Uncaught Exception Handler and Single Instance Lock remain unchanged) ...
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    dialog.showErrorBox('An unexpected error occurred', `Error: ${error.message}`);
    app.quit();
});
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) { app.quit(); }
else { app.on('second-instance', () => { if (mainWindow) { if (!mainWindow.isVisible()) mainWindow.show(); if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } }); }


/**
 * Creates the splash screen window.
 */
function createSplashWindow() { /* ... unchanged ... */ }

/**
 * Creates the main application window.
 */
function createWindow() {
    // ... (BrowserWindow creation is unchanged) ...
    const { width, height, x, y } = store.get('windowBounds', { width: 1280, height: 820 });
    const isAlwaysOnTop = store.get('isAlwaysOnTop', false);
    const isMuted = store.get('isMuted', false);

    mainWindow = new BrowserWindow({
        x, y, width, height,
        minWidth: 940,
        minHeight: 600,
        title: 'Kosmi',
        icon: path.join(__dirname, 'assets/icon.png'),
        show: false,
        backgroundColor: '#2a2139',
        alwaysOnTop: isAlwaysOnTop,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    mainWindow.webContents.setAudioMuted(isMuted);
    loadUrlAndAddToRecents('https://app.kosmi.io/');

    mainWindow.on('ready-to-show', () => {
        if (splashWindow) {
            splashWindow.destroy();
            splashWindow = null;
        }
        mainWindow.show();
        mainWindow.focus();
        autoUpdater.checkForUpdatesAndNotify();
    });

    // --- Window Event Handlers ---
    mainWindow.webContents.on('will-prevent-unload', (event) => { event.preventDefault(); });

    mainWindow.webContents.on('did-finish-load', () => {
        setActivity();
        const customCSS = store.get('customCSS', '');
        if (customCSS) {
            mainWindow.webContents.insertCSS(customCSS);
        }
    });

    // ... (Other event handlers are unchanged) ...
    mainWindow.webContents.setWindowOpenHandler(({ url }) => { /* ... */ });
    const saveBounds = () => { if (mainWindow) { store.set('windowBounds', mainWindow.getBounds()); } };
    mainWindow.on('resize', saveBounds);
    mainWindow.on('move', saveBounds);
    mainWindow.on('always-on-top-changed', (event, isAlwaysOnTop) => { store.set('isAlwaysOnTop', isAlwaysOnTop); createMenu(); });
    mainWindow.on('close', (event) => { if (!isQuitting) { event.preventDefault(); mainWindow.hide(); } });
    mainWindow.on('closed', () => { mainWindow = null; });
}

/**
 * Creates or recreates the application menu.
 */
function createMenu() { /* ... unchanged ... */ }

/**
 * Creates the system tray icon.
 */
function createTray() { /* ... unchanged ... */ }

/**
 * Creates the join room prompt.
 */
function createJoinRoomPrompt() { /* ... unchanged ... */ }

/**
 * Creates the updater window.
 */
function createUpdaterWindow() { /* ... unchanged ... */ }

/**
 * Creates a prompt for entering custom CSS.
 */
function createCustomCssPrompt() { /* ... unchanged ... */ }

/**
 * Helper to add a URL to the recent rooms list.
 */
function addRoomToRecents(url) { /* ... unchanged ... */ }

/**
 * Helper to load a URL in the main window and add it to recents.
 */
function loadUrlAndAddToRecents(url) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(url);
        addRoomToRecents(url);
    }
}


// --- Discord Rich Presence Functions (REWRITTEN) ---

/**
 * Sets the user's activity in Discord.
 */
async function setActivity() {
    if (!rpc || !mainWindow) {
        return;
    }

    const url = mainWindow.webContents.getURL();
    const title = mainWindow.getTitle();
    let details = 'Browsing Kosmi';
    let state = 'Exploring rooms';

    if (url.includes('/room/')) {
        details = 'In a Kosmi Room';
        state = title.replace(' - Kosmi', '') || 'Chilling';
    }

    rpc.updatePresence({
        details: details,
        state: state,
        startTimestamp: Date.now(),
        largeImageKey: 'kosmi_logo',
        largeImageText: 'Kosmi Desktop',
        instance: false,
    });
}

/**
 * Initializes the Discord RPC client.
 */
function initDiscordRPC() {
    try {
        rpc = DiscordRPC(clientId);

        rpc.on('error', (error) => {
            console.error('Discord RPC Error:', error);
        });

        console.log('Discord RPC initialized.');
        // Update presence every 15 seconds
        setInterval(() => {
            setActivity();
        }, 15e3);
    } catch (error) {
        console.error('Failed to initialize Discord RPC. Is Discord running?', error);
    }
}


// --- App Lifecycle Events ---
app.on('before-quit', () => { isQuitting = true; });

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
    // NEW: Gracefully disconnect from Discord
    if (rpc) {
        rpc.disconnect();
    }
});

app.whenReady().then(async () => {
    const { default: Store } = await import('electron-store');
    store = new Store();

    createSplashWindow();
    createWindow();
    createMenu();
    createTray();
    initDiscordRPC(); // Initialize Discord RPC
    
    // ... (rest of whenReady is unchanged) ...
    if (process.platform === 'darwin') { /* ... */ }
    globalShortcut.register('MediaPlayPause', () => { /* ... */ });
    ipcMain.on('join-room', (event, url) => { /* ... */ });
    ipcMain.on('save-custom-css', (event, css) => { /* ... */ });
    ipcMain.on('show-notification', (event, { title, options }) => { /* ... */ });
    ipcMain.on('restart-app', () => { autoUpdater.quitAndInstall(); });
    ipcMain.on('close-updater', () => { if (updaterWindow) updaterWindow.close(); });
    app.on('activate', () => { /* ... */ });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') { /* ... */ } });

// --- Auto Updater Logic ---
autoUpdater.on('update-available', () => { /* ... */ });
autoUpdater.on('update-not-available', () => { /* ... */ });
autoUpdater.on('download-progress', (progressObj) => { /* ... */ });
autoUpdater.on('update-downloaded', () => { /* ... */ });
autoUpdater.on('error', (err) => { /* ... */ });