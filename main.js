// main.js

const { app, BrowserWindow, Menu, Tray, nativeImage, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');
const DiscordRPC = require('discord-rich-presence');

app.setPath('userData', path.join(app.getPath('appData'), app.getName()));

// --- Discord RPC Configuration ---
const clientId = '1424391198860382310';
let rpc;
let activityTimestamp; // To hold the start time of the activity

// --- Global variables ---
let mainWindow;
let tray;
let store;
let splashWindow;
let updaterWindow;
let settingsWindow;
let isQuitting = false;

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
function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 200,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        icon: path.join(__dirname, 'assets/icon.png')
    });
    splashWindow.loadFile('splash.html');
}

/**
 * Creates the main application window.
 */
function createWindow(store) {
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

    const loadingTimeout = setTimeout(() => {
        if (splashWindow) { splashWindow.destroy(); }
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
            dialog.showErrorBox('Connection Timeout', 'The application took too long to load. Please check your internet connection and try again.');
            app.quit();
        }
    }, 30000);

    mainWindow.on('ready-to-show', () => {
        clearTimeout(loadingTimeout);
        if (splashWindow) {
            splashWindow.destroy();
            splashWindow = null;
        }
        mainWindow.show();
        mainWindow.focus();
        autoUpdater.checkForUpdatesAndNotify();
    });

    // --- Window Event Handlers ---
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        clearTimeout(loadingTimeout);
        console.error(`Failed to load page: ${errorDescription} (Code: ${errorCode})`);
        if (splashWindow) { splashWindow.destroy(); }
        dialog.showErrorBox('Connection Error', `Could not connect to Kosmi. Please check your internet connection and try again.\n\nError: ${errorDescription}`);
        app.quit();
    });

    mainWindow.webContents.on('will-prevent-unload', (event) => { event.preventDefault(); });

    mainWindow.webContents.on('did-finish-load', () => {
        setActivity();
        const customCSS = store.get('customCSS', '');
        if (customCSS) {
            mainWindow.webContents.insertCSS(customCSS);
        }
    });

    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        try {
            const parsedUrl = new URL(url);
            const isValidKosmiLink = parsedUrl.hostname.endsWith('kosmi.io') || parsedUrl.hostname.endsWith('kosmi.to');
            if (!isValidKosmiLink) {
                shell.openExternal(url);
                return { action: 'deny' };
            }
        } catch (error) {
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
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
function createMenu() {
    const recentRooms = store.get('recentRooms', []);
    const recentRoomsMenu = recentRooms.map(room => ({
        label: room,
        click: () => loadUrlAndAddToRecents(room)
    }));
    if (recentRooms.length > 0) {
        recentRoomsMenu.push({ type: 'separator' });
        recentRoomsMenu.push({
            label: 'Clear Recent Rooms',
            click: () => { store.set('recentRooms', []); createMenu(); }
        });
    }

    const menuTemplate = [
        {
            label: 'File',
            submenu: [
                { label: 'Go to Home', click: () => loadUrlAndAddToRecents('https://app.kosmi.io/') },
                { label: 'Join Room...', accelerator: 'CmdOrCtrl+J', click: createJoinRoomPrompt },
                { label: 'Take Screenshot', accelerator: 'CmdOrCtrl+S', click: takeScreenshot },
                { type: 'separator' },
                { label: process.platform === 'darwin' ? 'Preferences...' : 'Settings...', accelerator: 'CmdOrCtrl+,', click: createSettingsWindow },
                { type: 'separator' },
                { label: 'Quit', accelerator: 'CmdOrCtrl+Q', click: () => { isQuitting = true; app.quit(); } }
            ]
        },
        {
            label: 'Navigation',
            submenu: [
                { label: 'Back', accelerator: 'Alt+Left', click: (item, focusedWindow) => focusedWindow && focusedWindow.webContents.canGoBack() && focusedWindow.webContents.goBack() },
                { label: 'Forward', accelerator: 'Alt+Right', click: (item, focusedWindow) => focusedWindow && focusedWindow.webContents.canGoForward() && focusedWindow.webContents.goForward() },
            ]
        },
        {
            label: 'Rooms',
            submenu: recentRoomsMenu.length > 0 ? recentRoomsMenu : [{ label: 'No recent rooms', enabled: false }]
        },
        { role: 'editMenu' },
        {
            label: 'View',
            submenu: [
                { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: (item, focusedWindow) => focusedWindow && focusedWindow.reload() },
                { label: 'Hard Reload (Clear Cache)', accelerator: 'CmdOrCtrl+Shift+R', click: (item, focusedWindow) => focusedWindow && focusedWindow.webContents.reloadIgnoringCache() },
                { type: 'separator' },
                { label: 'Toggle Developer Tools', accelerator: 'CmdOrCtrl+Shift+I', click: (item, focusedWindow) => focusedWindow && focusedWindow.webContents.toggleDevTools() },
                { type: 'separator' },
                { label: 'Toggle Full Screen', accelerator: 'F11', click: (item, focusedWindow) => focusedWindow && focusedWindow.setFullScreen(!focusedWindow.isFullScreen()) },
                { id: 'toggle-mute', label: 'Mute Audio', type: 'checkbox', checked: store.get('isMuted', false), click: (item, focusedWindow) => {
                        if (focusedWindow) {
                            const isMuted = !focusedWindow.webContents.isAudioMuted();
                            focusedWindow.webContents.setAudioMuted(isMuted);
                            store.set('isMuted', isMuted);
                            item.checked = isMuted;
                        }
                    }
                },
                { type: 'separator' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { role: 'resetZoom' },
                { type: 'separator' },
                { id: 'always-on-top', label: 'Always on Top', type: 'checkbox', checked: store.get('isAlwaysOnTop', false), click: (item, focusedWindow) => {
                        if (focusedWindow) {
                            focusedWindow.setAlwaysOnTop(!focusedWindow.isAlwaysOnTop());
                        }
                    }
                },
            ]
        },
        {
            label: 'Help',
            submenu: [
                { label: 'About Kosmi', click: () => {
                    const aboutWindow = new BrowserWindow({ width: 430, height: 400, title: 'About Kosmi Desktop', parent: mainWindow, modal: true, autoHideMenuBar: true, resizable: false, icon: path.join(__dirname, 'assets/icon.png'), });
                    aboutWindow.loadFile('about.html');
                }}
            ]
        }
    ];
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
}

/**
 * Creates the system tray icon.
 */
function createTray() {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets/icon.png'));
    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Show Kosmi', click: () => { if (mainWindow) { mainWindow.show(); } } },
        { label: 'Quit', click: () => { isQuitting = true; app.quit(); } }
    ]);
    tray.setToolTip('Kosmi');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => { if (mainWindow) { mainWindow.show(); } });
}

/**
 * Creates the join room prompt.
 */
function createJoinRoomPrompt() {
    const joinRoomWindow = new BrowserWindow({
        width: 450,
        height: 160,
        title: 'Join Room',
        parent: mainWindow,
        modal: true,
        autoHideMenuBar: true,
        resizable: false,
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            sandbox: false
        }
    });

    const promptHtmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Join Room</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; background-color: #2a2139; color: #fff; overflow: hidden; }
                label { display: block; margin-bottom: 8px; font-size: 14px; }
                input { width: 100%; padding: 8px; box-sizing: border-box; border-radius: 8px; border: 1px solid #4f3c7a; background-color: #3c2d5c; color: #fff; font-size: 14px; }
                input:focus { outline: none; border-color: #7e57c2; }
                div { margin-top: 15px; text-align: right; }
                button { padding: 8px 16px; border: none; border-radius: 8px; background-color: #7e57c2; color: white; cursor: pointer; font-size: 14px; font-weight: bold; }
                button:hover { background-color: #6a48a0; }
            </style>
        </head>
        <body>
            <label for="room-url">Enter Kosmi room invite link:</label>
            <input type="url" id="room-url" autofocus />
            <div>
                <button id="join-btn">Join</button>
            </div>
            <script>
                const { ipcRenderer } = require('electron');
                const urlInput = document.getElementById('room-url');
                const joinBtn = document.getElementById('join-btn');
                function submitUrl() {
                    const url = urlInput.value;
                    if (url) { ipcRenderer.send('join-room', url); }
                }
                joinBtn.addEventListener('click', submitUrl);
                urlInput.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') { submitUrl(); }
                    if (event.key === 'Escape') { window.close(); }
                });
            </script>
        </body>
        </html>
    `;
    joinRoomWindow.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(promptHtmlContent)}`);
}

/**
 * Creates the updater window.
 */
function createUpdaterWindow() {
    updaterWindow = new BrowserWindow({
        width: 400,
        height: 150,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    updaterWindow.loadFile('updater.html');
    updaterWindow.on('closed', () => { updaterWindow = null; });
}

/**
 * Creates the settings window.
 */
function createSettingsWindow() {
    if (settingsWindow) {
        settingsWindow.focus();
        return;
    }
    settingsWindow = new BrowserWindow({
        width: 600,
        height: 500,
        title: 'Settings',
        parent: mainWindow,
        modal: true,
        autoHideMenuBar: true,
        resizable: true,
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload-settings.js'),
            nodeIntegration: false,
            contextIsolation: true
        }
    });
    settingsWindow.loadFile('settings.html');
    settingsWindow.on('closed', () => {
        settingsWindow = null;
    });
}

/**
 * Takes a screenshot of the main window.
 */
async function takeScreenshot() {
    if (!mainWindow) return;
    try {
        const image = await mainWindow.webContents.capturePage();
        const { filePath, canceled } = await dialog.showSaveDialog({
            title: 'Save Screenshot',
            defaultPath: path.join(app.getPath('pictures'), `kosmi-screenshot-${Date.now()}.png`),
            filters: [{ name: 'PNG Images', extensions: ['png'] }]
        });
        if (!canceled && filePath) {
            fs.writeFileSync(filePath, image.toPNG());
        }
    } catch (error) {
        console.error('Failed to take screenshot:', error);
        dialog.showErrorBox('Screenshot Failed', 'Could not save the screenshot.');
    }
}

/**
 * Helper to add a URL to the recent rooms list.
 */
function addRoomToRecents(url) {
    try {
        const parsedUrl = new URL(url);
        if ((parsedUrl.hostname.endsWith('kosmi.io') || parsedUrl.hostname.endsWith('kosmi.to')) && parsedUrl.pathname !== '/') {
            let recentRooms = store.get('recentRooms', []);
            recentRooms = recentRooms.filter(r => r !== url);
            recentRooms.unshift(url);
            store.set('recentRooms', recentRooms.slice(0, 10));
            createMenu();
        }
    } catch (error) {
        console.error('Failed to parse URL for recent rooms:', url, error);
    }
}

/**
 * Helper to load a URL in the main window and add it to recents.
 */
function loadUrlAndAddToRecents(url) {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(url);
        addRoomToRecents(url);
    }
}

// --- Discord Rich Presence Functions (RE-FIXED) ---

/**
 * Sets the user's activity in Discord.
 */
async function setActivity() {
    if (!rpc || !mainWindow || mainWindow.isDestroyed()) {
        return;
    }

    try {
        const url = mainWindow.webContents.getURL();
        const title = mainWindow.getTitle();
        let details = 'Browsing Kosmi';
        let state = 'Exploring rooms';
        if (url && url.includes('/room/')) {
            details = 'In a Kosmi Room';
            state = title.replace(' - Kosmi', '') || 'Chilling';
        }

        rpc.updatePresence({
            details: details,
            state: state,
            startTimestamp: activityTimestamp, // Use the persistent timestamp
            largeImageKey: 'kosmi_logo',
            largeImageText: 'Kosmi Desktop',
            instance: false,
        });
    } catch (error) {
        console.error('Failed to set Discord activity:', error);
    }
}

/**
 * Initializes the Discord RPC client.
 */
function initDiscordRPC() {
    try {
        // FIX: Set the timestamp ONCE when the RPC client is initialized for the session.
        activityTimestamp = Date.now();
        rpc = DiscordRPC(clientId);

        rpc.on('error', (error) => {
            console.error('Discord RPC Error:', error);
        });

        rpc.on('ready', () => {
            console.log('Discord RPC connected.');
            setActivity(); // Set initial activity
        });
        
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
    if (rpc) { rpc.disconnect(); }
});

app.whenReady().then(async () => {
    const { default: Store } = await import('electron-store');
    store = new Store();

    createSplashWindow();
    createWindow(store);
    createMenu();
    createTray();
    initDiscordRPC();

    // IPC Handlers
    ipcMain.handle('get-settings', () => ({
        isAlwaysOnTop: store.get('isAlwaysOnTop', false),
        isMuted: store.get('isMuted', false),
        customCSS: store.get('customCSS', '')
    }));
    ipcMain.on('set-setting', (event, key, value) => {
        store.set(key, value);
        if (key === 'isAlwaysOnTop' && mainWindow) { mainWindow.setAlwaysOnTop(value); }
        if (key === 'isMuted' && mainWindow) { mainWindow.webContents.setAudioMuted(value); }
        if (key === 'customCSS' && mainWindow) { mainWindow.reload(); }
        createMenu();
    });
    ipcMain.on('clear-recent-rooms', () => { store.set('recentRooms', []); createMenu(); });
    ipcMain.on('join-room', (event, url) => {
        if(mainWindow) { loadUrlAndAddToRecents(url); }
        const promptWindow = BrowserWindow.fromWebContents(event.sender);
        if(promptWindow) { promptWindow.close(); }
    });
    ipcMain.on('show-notification', (event, { title, options }) => {
        const { Notification } = require('electron');
        if (Notification.isSupported()) {
            const notification = new Notification({ title, body: options.body, icon: path.join(__dirname, 'assets/icon.png') });
            notification.show();
        }
    });
    ipcMain.on('restart-app', () => { autoUpdater.quitAndInstall(); });
    ipcMain.on('close-updater', () => { if (updaterWindow) updaterWindow.close(); });
    
    if (process.platform === 'darwin') {
        app.dock.setMenu(Menu.buildFromTemplate([
            { label: 'Go to Home', click: () => { if (mainWindow) { mainWindow.show(); loadUrlAndAddToRecents('https://app.kosmi.io/'); } } },
            { label: 'Join Room...', click: createJoinRoomPrompt },
        ]));
    }
    globalShortcut.register('MediaPlayPause', () => {
        if (mainWindow) {
            mainWindow.webContents.executeJavaScript(`
                const video = document.querySelector('video');
                if (video) { video.paused ? video.play() : video.pause(); }
            `).catch(err => console.error('Could not execute media key script:', err));
        }
    });
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) { createWindow(store); } else if (mainWindow && !mainWindow.isVisible()) { mainWindow.show(); } });
}).catch(e => {
    console.error("Failed to start application:", e);
    dialog.showErrorBox('Application Startup Error', `A critical error occurred and the application could not start.\n\n${e.message}`);
    app.quit();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') { app.quit(); }
});

// --- Auto Updater Logic ---
autoUpdater.on('update-available', () => { createUpdaterWindow(); });
autoUpdater.on('update-not-available', () => { console.log('Update not available.'); });
autoUpdater.on('download-progress', (progressObj) => { if (updaterWindow) { updaterWindow.webContents.send('download-progress', progressObj.percent); } });
autoUpdater.on('update-downloaded', () => { if (updaterWindow) { updaterWindow.webContents.send('update-downloaded'); } });
autoUpdater.on('error', (err) => { console.error('Error in auto-updater.', err); });

