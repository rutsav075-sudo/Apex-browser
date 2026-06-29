const { contextBridge, ipcRenderer } = require('electron');

// E2 FIX: Helper to create IPC listeners with cleanup functions
const createListener = (channel) => {
    let handler = null;
    return {
        on: (callback) => {
            // Remove previous listener to prevent accumulation (E1 FIX)
            if (handler) ipcRenderer.removeListener(channel, handler);
            handler = (event, ...args) => callback(...args);
            ipcRenderer.on(channel, handler);
        },
        off: () => {
            if (handler) {
                ipcRenderer.removeListener(channel, handler);
                handler = null;
            }
        }
    };
};

const downloadListener = createListener('download-progress');
const forceUrlListener = createListener('force-url-in-tab');
const permissionListener = createListener('permission-request');
const updateListener = createListener('update-ready');

contextBridge.exposeInMainWorld('electronAPI', {
    minimize: () => ipcRenderer.send('window-controls', 'minimize'),
    maximize: () => ipcRenderer.send('window-controls', 'maximize'),
    close: () => ipcRenderer.send('window-controls', 'close'),
    getWindowState: () => ipcRenderer.invoke('get-window-state'),
    onWindowState: (callback) => {
        ipcRenderer.on('window-state', (event, isMax) => callback(isMax));
    },
    // Auth Integration
    googleLogin: (userData) => ipcRenderer.invoke('google-login', userData),
    googleAuthPopup: (opts) => ipcRenderer.invoke('google-auth-popup', opts),
    clearData: () => ipcRenderer.invoke('clear-data'),
    openIncognito: () => ipcRenderer.invoke('open-incognito'),
    fetchStocks: () => ipcRenderer.invoke('fetch-stocks'),
    getAdsBlocked: () => ipcRenderer.invoke('get-ads-blocked'),
    setAdblock: (enabled) => ipcRenderer.invoke('set-adblock', enabled),
    // E2 FIX: Listeners now expose cleanup methods
    onDownloadProgress: (callback) => { downloadListener.on(callback); },
    offDownloadProgress: () => { downloadListener.off(); },
    onForceUrlInTab: (callback) => { forceUrlListener.on(callback); },
    offForceUrlInTab: () => { forceUrlListener.off(); },
    onUpdateReady: (callback) => { updateListener.on(callback); },
    offUpdateReady: () => { updateListener.off(); },
    onPermissionRequest: (callback) => { permissionListener.on(callback); },
    offPermissionRequest: () => { permissionListener.off(); },
    // Download controls
    downloadPause: (filename) => ipcRenderer.invoke('download-pause', filename),
    downloadResume: (filename) => ipcRenderer.invoke('download-resume', filename),
    downloadCancel: (filename) => ipcRenderer.invoke('download-cancel', filename),
    // VPN / Proxy
    setProxy: (proxyConfig) => ipcRenderer.invoke('set-proxy', proxyConfig),
    testProxy: () => ipcRenderer.invoke('test-proxy'),
    // Site Safety (Google Safe Browsing API v4)
    checkSiteSafety: (url) => ipcRenderer.invoke('check-site-safety', url),
    // Download Safety (SHA-256 hash check)
    checkDownloadSafety: (filePath) => ipcRenderer.invoke('check-download-safety', filePath),
    // Secure API key storage via OS keychain
    safeStoreKey: (key) => ipcRenderer.invoke('safe-store-key', key),
    safeReadKey: (encrypted) => ipcRenderer.invoke('safe-read-key', encrypted),
    // DevTools access
    openDevTools: () => ipcRenderer.invoke('open-devtools'),
    // Open external links in default browser
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    // Download file actions
    openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
    showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
    // Local AI CORS bypass
    ollamaRequest: (opts) => ipcRenderer.invoke('ollama-request', opts),
    // Chrome Extension Engine
    loadExtensionFromDisk: () => ipcRenderer.invoke('load-extension-from-disk'),
    installExtensionFromWebstore: (extensionId) => ipcRenderer.invoke('install-extension-from-webstore', extensionId),
    getLoadedExtensions: () => ipcRenderer.invoke('get-loaded-extensions'),
    unloadExtension: (extensionId) => ipcRenderer.invoke('unload-extension', extensionId),
    toggleExtension: (extensionId, enabled) => ipcRenderer.invoke('toggle-extension', extensionId, enabled),
    openExtensionPopup: (extensionId, popupUrl, bounds) => ipcRenderer.invoke('open-extension-popup', extensionId, popupUrl, bounds),
    // Wallpaper Persistence
    saveWallpaper: (data) => ipcRenderer.invoke('save-wallpaper', data),
    getSavedWallpapers: () => ipcRenderer.invoke('get-saved-wallpapers'),
    deleteWallpaper: (fileName) => ipcRenderer.invoke('delete-wallpaper', fileName),
    // Database integration
    addToHistory: (entry) => ipcRenderer.invoke('add-to-history', entry),
    getHistory: (limit) => ipcRenderer.invoke('get-history', limit),
    clearHistory: () => ipcRenderer.invoke('clear-history'),
    deleteHistoryItem: (id) => ipcRenderer.invoke('delete-history-item', id),
    getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
    addBookmark: (bookmark) => ipcRenderer.invoke('add-bookmark', bookmark),
    setBookmarks: (bookmarks) => ipcRenderer.invoke('set-bookmarks', bookmarks),
    removeBookmark: (id) => ipcRenderer.invoke('remove-bookmark', id),
});
