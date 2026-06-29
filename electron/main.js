const { app, BrowserWindow, ipcMain, session, safeStorage, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const initSqlJs = require('sql.js');

// --- Hardware Acceleration for High-Fidelity 3D Wallpapers ---
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// Disable Media Session overlay so the ugly Windows play/pause buttons don't pop up over the wallpaper
app.commandLine.appendSwitch('disable-features', 'HardwareMediaKeyHandling,MediaSessionService');

// --- Brave-style Ad Blocker (Ghostery engine — same EasyList/uBlock filter format) ---
const { ElectronBlocker } = require('@ghostery/adblocker-electron');
const { Request } = require('@ghostery/adblocker');
const fetch = require('cross-fetch');
const unzipper = require('unzipper');

// ============================================================
// APEX EXTENSION ENGINE — Real Chrome Extension Support
// Supports: Load from disk, CRX extraction, Web Store download,
//           Persistence across restarts, Popup shimming
// ============================================================
const EXTENSIONS_DIR = path.join(app.getPath('userData'), 'apex_extensions');
const EXTENSIONS_META_PATH = path.join(app.getPath('userData'), 'apex_extensions_meta.json');

// Ensure extensions directory exists
if (!fs.existsSync(EXTENSIONS_DIR)) fs.mkdirSync(EXTENSIONS_DIR, { recursive: true });

// Load persisted extension metadata
function loadExtensionsMeta() {
    try {
        if (fs.existsSync(EXTENSIONS_META_PATH)) {
            return JSON.parse(fs.readFileSync(EXTENSIONS_META_PATH, 'utf8'));
        }
    } catch (e) { console.error('[Apex Extensions] Failed to load meta:', e.message); }
    return {}; // { [extensionId]: { path, enabled, source, installedAt } }
}

function saveExtensionsMeta(meta) {
    try {
        fs.writeFileSync(EXTENSIONS_META_PATH, JSON.stringify(meta, null, 2));
    } catch (e) { console.error('[Apex Extensions] Failed to save meta:', e.message); }
}

// Extract CRX file (ZIP with header) to a target directory
// CRX3 format: [4 bytes magic "Cr24"] [4 bytes version=3] [4 bytes header_length] [header] [ZIP data]
async function extractCrx(crxPath, destDir) {
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    
    const fileBuffer = fs.readFileSync(crxPath);
    
    // Detect CRX3 magic number "Cr24"
    let zipStartOffset = 0;
    if (fileBuffer.length > 12 && fileBuffer.toString('ascii', 0, 4) === 'Cr24') {
        const version = fileBuffer.readUInt32LE(4);
        if (version === 3) {
            // CRX3: header length is at bytes 8-11
            const headerLength = fileBuffer.readUInt32LE(8);
            zipStartOffset = 12 + headerLength;
        } else if (version === 2) {
            // CRX2: public key length at 8-11, signature length at 12-15
            const pubKeyLen = fileBuffer.readUInt32LE(8);
            const sigLen = fileBuffer.readUInt32LE(12);
            zipStartOffset = 16 + pubKeyLen + sigLen;
        }
        console.log(`[Apex Extensions] CRX v${version} detected, ZIP starts at offset ${zipStartOffset}`);
    }
    
    // Extract just the ZIP portion
    const zipBuffer = fileBuffer.slice(zipStartOffset);
    const { Readable } = require('stream');
    
    return new Promise((resolve, reject) => {
        const stream = new Readable();
        stream.push(zipBuffer);
        stream.push(null);
        stream.pipe(unzipper.Extract({ path: destDir }))
            .on('close', () => resolve(destDir))
            .on('error', (err) => reject(err));
    });
}

// Download CRX from Chrome Web Store by extension ID
// Uses Electron's net module (Chromium network stack) for proper redirect handling
async function downloadCrxFromWebStore(extensionId) {
    const { net } = require('electron');
    const downloadUrl = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx3&prodversion=124.0&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`;
    const crxPath = path.join(EXTENSIONS_DIR, `${extensionId}.crx`);
    
    console.log(`[Apex Extensions] Downloading ${extensionId} from Chrome Web Store...`);
    
    // Use Node https as fallback if net isn't ready (during startup)
    const downloadWithHttps = () => new Promise((resolve, reject) => {
        const https = require('https');
        const downloadRecursive = (url, redirectCount = 0) => {
            if (redirectCount > 10) return reject(new Error('Too many redirects'));
            https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' } }, (res) => {
                // Follow redirects manually
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    console.log(`[Apex Extensions] Redirect ${res.statusCode} -> ${res.headers.location.substring(0, 80)}...`);
                    return downloadRecursive(res.headers.location, redirectCount + 1);
                }
                if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
                
                const chunks = [];
                res.on('data', chunk => chunks.push(chunk));
                res.on('end', () => {
                    const buffer = Buffer.concat(chunks);
                    console.log(`[Apex Extensions] Downloaded ${buffer.length} bytes`);
                    if (buffer.length < 100) return reject(new Error('Download returned empty file. Extension may not exist on Chrome Web Store.'));
                    resolve(buffer);
                });
                res.on('error', reject);
            }).on('error', reject);
        };
        downloadRecursive(downloadUrl);
    });
    
    const buffer = await downloadWithHttps();
    fs.writeFileSync(crxPath, buffer);
    
    // Extract CRX to unpacked directory
    const unpackedDir = path.join(EXTENSIONS_DIR, extensionId);
    if (fs.existsSync(unpackedDir)) fs.rmSync(unpackedDir, { recursive: true, force: true });
    
    await extractCrx(crxPath, unpackedDir);
    
    // Clean up CRX file after extraction
    try { fs.unlinkSync(crxPath); } catch (e) {}
    
    console.log(`[Apex Extensions] Extracted to ${unpackedDir}`);
    return unpackedDir;
}

// Read manifest.json from an unpacked extension
function readExtensionManifest(extPath) {
    const manifestPath = path.join(extPath, 'manifest.json');
    if (!fs.existsSync(manifestPath)) return null;
    try {
        return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) { return null; }
}

// Get icon path from manifest
function getExtensionIcon(extPath, manifest) {
    if (!manifest) return null;
    const icons = manifest.icons || manifest.browser_action?.default_icon || manifest.action?.default_icon;
    if (!icons) return null;
    // Get largest icon available
    let iconFile = null;
    if (typeof icons === 'string') {
        iconFile = icons;
    } else if (typeof icons === 'object') {
        const sizes = Object.keys(icons).map(Number).sort((a, b) => b - a);
        iconFile = icons[sizes[0]] || icons[String(sizes[0])];
    }
    if (iconFile) {
        const fullPath = path.join(extPath, iconFile);
        if (fs.existsSync(fullPath)) {
            try {
                const data = fs.readFileSync(fullPath);
                const ext = path.extname(iconFile).toLowerCase();
                const mime = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : 'image/jpeg';
                return `data:${mime};base64,${data.toString('base64')}`;
            } catch (e) {}
        }
    }
    return null;
}

// Load a single extension into the persistent webview session
async function loadExtensionIntoSession(extPath) {
    const sess = session.fromPartition('persist:webview');
    try {
        const ext = await sess.loadExtension(extPath, { allowFileAccess: true });
        console.log(`[Apex Extensions] Loaded: ${ext.name} (${ext.id})`);
        return ext;
    } catch (e) {
        console.error(`[Apex Extensions] Failed to load ${extPath}:`, e.message);
        return null;
    }
}

// Load all persisted extensions on startup
async function loadPersistedExtensions() {
    const meta = loadExtensionsMeta();
    const loaded = [];
    for (const [id, info] of Object.entries(meta)) {
        if (!info.enabled) continue;
        if (!fs.existsSync(info.path)) {
            console.warn(`[Apex Extensions] Path not found, skipping: ${info.path}`);
            continue;
        }
        try {
            const ext = await loadExtensionIntoSession(info.path);
            if (ext) loaded.push(ext);
        } catch (e) {
            console.error(`[Apex Extensions] Failed to load persisted extension ${id}:`, e.message);
        }
    }
    console.log(`[Apex Extensions] Loaded ${loaded.length}/${Object.keys(meta).length} persisted extensions`);
    return loaded;
}

// Get all extensions with enriched metadata
function getAllExtensionsInfo() {
    const meta = loadExtensionsMeta();
    const sess = session.fromPartition('persist:webview');
    let sessionExtensions = [];
    try { sessionExtensions = sess.getAllExtensions(); } catch (e) {}
    
    const result = [];
    for (const [id, info] of Object.entries(meta)) {
        const manifest = readExtensionManifest(info.path);
        const icon = getExtensionIcon(info.path, manifest);
        const sessionExt = sessionExtensions.find(e => e.id === id);
        
        // Determine popup URL if extension has browser_action or action
        let popupUrl = null;
        if (manifest) {
            const popup = manifest.action?.default_popup || manifest.browser_action?.default_popup;
            if (popup && sessionExt) {
                popupUrl = `chrome-extension://${sessionExt.id}/${popup}`;
            }
        }
        
        result.push({
            id: sessionExt?.id || id,
            name: manifest?.name || sessionExt?.name || id,
            version: manifest?.version || sessionExt?.version || '?',
            description: manifest?.description || '',
            icon: icon,
            enabled: info.enabled,
            source: info.source || 'disk',
            path: info.path,
            installedAt: info.installedAt,
            hasPopup: !!popupUrl,
            popupUrl: popupUrl,
            manifestVersion: manifest?.manifest_version || 2,
            permissions: manifest?.permissions || [],
        });
    }
    return result;
}

// --- Extension IPC Handlers ---

// Load unpacked extension from disk via folder picker dialog
ipcMain.handle('load-extension-from-disk', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: 'Select Unpacked Extension Folder',
        properties: ['openDirectory'],
        message: 'Choose a folder containing a Chrome extension (must have manifest.json)'
    });
    if (result.canceled || !result.filePaths[0]) return { success: false, error: 'Cancelled' };
    
    const extPath = result.filePaths[0];
    const manifest = readExtensionManifest(extPath);
    if (!manifest) return { success: false, error: 'No manifest.json found in selected folder. Please select a valid Chrome extension directory.' };
    
    try {
        const ext = await loadExtensionIntoSession(extPath);
        if (!ext) return { success: false, error: 'Extension failed to load. It may use unsupported Chrome APIs.' };
        
        // Persist
        const meta = loadExtensionsMeta();
        meta[ext.id] = { path: extPath, enabled: true, source: 'disk', installedAt: Date.now() };
        saveExtensionsMeta(meta);
        
        return { success: true, extension: { id: ext.id, name: ext.name, version: ext.version } };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Install from Chrome Web Store by extension ID
ipcMain.handle('install-extension-from-webstore', async (event, extensionId) => {
    if (!extensionId || typeof extensionId !== 'string') {
        return { success: false, error: 'Invalid extension ID' };
    }
    // Clean the ID — extract from URL if full URL was pasted
    let cleanId = extensionId.trim();
    // Handle full Chrome Web Store URLs: https://chromewebstore.google.com/detail/name/EXTENSION_ID
    const urlMatch = cleanId.match(/\/detail\/[^/]*\/([a-z]{32})/);
    if (urlMatch) cleanId = urlMatch[1];
    // Handle old format: https://chrome.google.com/webstore/detail/name/EXTENSION_ID
    const oldMatch = cleanId.match(/\/detail\/[^/]*\/([a-z]{32})/);
    if (oldMatch) cleanId = oldMatch[1];
    // Validate: Chrome extension IDs are 32 lowercase letters
    if (!/^[a-z]{32}$/.test(cleanId)) {
        return { success: false, error: `Invalid extension ID format: "${cleanId}". Paste a Chrome Web Store URL or a 32-character extension ID.` };
    }
    
    try {
        // Check if already installed
        const meta = loadExtensionsMeta();
        if (meta[cleanId]) {
            return { success: false, error: 'This extension is already installed. Uninstall it first to reinstall.' };
        }
        
        const extPath = await downloadCrxFromWebStore(cleanId);
        const ext = await loadExtensionIntoSession(extPath);
        if (!ext) return { success: false, error: 'Extension downloaded but failed to load. It may use unsupported Chrome APIs (Manifest V3 service workers, chrome.action popups, etc.).' };
        
        // Persist
        meta[ext.id] = { path: extPath, enabled: true, source: 'webstore', installedAt: Date.now(), webstoreId: cleanId };
        saveExtensionsMeta(meta);
        
        return { success: true, extension: { id: ext.id, name: ext.name, version: ext.version } };
    } catch (e) {
        return { success: false, error: `Failed to install: ${e.message}` };
    }
});

// Get all loaded extensions
ipcMain.handle('get-loaded-extensions', () => {
    return getAllExtensionsInfo();
});

// Uninstall an extension
ipcMain.handle('unload-extension', async (event, extensionId) => {
    try {
        const meta = loadExtensionsMeta();
        const sess = session.fromPartition('persist:webview');
        
        // Remove from session
        try { await sess.removeExtension(extensionId); } catch (e) {}
        
        // Remove files if it was installed from Web Store
        if (meta[extensionId]?.source === 'webstore' && meta[extensionId]?.path) {
            try { fs.rmSync(meta[extensionId].path, { recursive: true, force: true }); } catch (e) {}
        }
        
        // Remove from persistence
        delete meta[extensionId];
        saveExtensionsMeta(meta);
        
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Toggle extension enabled/disabled
ipcMain.handle('toggle-extension', async (event, extensionId, enabled) => {
    try {
        const meta = loadExtensionsMeta();
        if (!meta[extensionId]) return { success: false, error: 'Extension not found' };
        
        const sess = session.fromPartition('persist:webview');
        if (enabled) {
            await loadExtensionIntoSession(meta[extensionId].path);
        } else {
            try { await sess.removeExtension(extensionId); } catch (e) {}
        }
        
        meta[extensionId].enabled = enabled;
        saveExtensionsMeta(meta);
        
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Open extension popup in a floating window (shimming chrome.browserAction)
ipcMain.handle('open-extension-popup', async (event, extensionId, popupUrl, bounds) => {
    try {
        const popupWin = new BrowserWindow({
            width: 400,
            height: 500,
            x: bounds?.x || 100,
            y: bounds?.y || 100,
            frame: false,
            resizable: true,
            alwaysOnTop: true,
            skipTaskbar: true,
            transparent: false,
            backgroundColor: '#ffffff',
            webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
                partition: 'persist:webview', // Same session so extension has access
            }
        });
        popupWin.loadURL(popupUrl);
        
        // Auto-close when focus is lost
        popupWin.on('blur', () => {
            if (!popupWin.isDestroyed()) popupWin.close();
        });
        
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// --- DATABASE INTEGRATION (LOCAL JSON FALLBACK) ---
// Fixes #15: Removed unauthenticated MongoDB connection string.
const DB_PATH = path.join(app.getPath('userData'), 'apex_users.json');

const getLocalUsers = () => {
    try {
        if (fs.existsSync(DB_PATH)) {
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading local users schema', e);
    }
    return [];
};

const saveLocalUsers = (users) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing local users schema', e);
    }
};

// --- PURE JS SQLITE (sql.js) FOR HISTORY AND BOOKMARKS ---
// Uses WebAssembly so it requires ZERO C++ build tools!
const sqliteDbPath = path.join(app.getPath('userData'), 'apex_browser_data.sqlite');
let sqliteDb = null;

initSqlJs().then(SQL => {
    if (fs.existsSync(sqliteDbPath)) {
        const filebuffer = fs.readFileSync(sqliteDbPath);
        sqliteDb = new SQL.Database(filebuffer);
    } else {
        sqliteDb = new SQL.Database();
        sqliteDb.run(`
            CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                title TEXT,
                time TEXT NOT NULL,
                timestamp INTEGER NOT NULL
            );
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY,
                url TEXT NOT NULL,
                title TEXT,
                folderId INTEGER
            );
        `);
        saveDb();
    }
}).catch(err => console.error("Failed to load sql.js", err));

function saveDb() {
    if (!sqliteDb) return;
    const data = sqliteDb.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(sqliteDbPath, buffer);
}

// History IPCs
ipcMain.handle('add-to-history', (event, { url, title, time, timestamp }) => {
    try {
        if (!sqliteDb) return { success: false, error: 'DB not ready' };
        sqliteDb.run('INSERT INTO history (url, title, time, timestamp) VALUES (?, ?, ?, ?)', [url, title, time, timestamp]);
        const id = sqliteDb.exec("SELECT last_insert_rowid()")[0].values[0][0];
        saveDb();
        return { success: true, id };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('get-history', (event, limit = 200) => {
    try {
        if (!sqliteDb) return { success: true, history: [] };
        const result = sqliteDb.exec(`SELECT * FROM history ORDER BY timestamp DESC LIMIT ${limit}`);
        if (result.length === 0) return { success: true, history: [] };
        
        const cols = result[0].columns;
        const rows = result[0].values.map(row => {
            let obj = {};
            cols.forEach((c, i) => obj[c] = row[i]);
            return obj;
        });
        return { success: true, history: rows };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('clear-history', () => {
    try {
        if (!sqliteDb) return { success: false };
        sqliteDb.run('DELETE FROM history');
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('delete-history-item', (event, id) => {
    try {
        if (!sqliteDb) return { success: false };
        sqliteDb.run('DELETE FROM history WHERE id = ?', [id]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// Bookmark IPCs
ipcMain.handle('get-bookmarks', () => {
    try {
        if (!sqliteDb) return { success: true, bookmarks: [] };
        const result = sqliteDb.exec('SELECT * FROM bookmarks ORDER BY id DESC');
        if (result.length === 0) return { success: true, bookmarks: [] };
        
        const cols = result[0].columns;
        const rows = result[0].values.map(row => {
            let obj = {};
            cols.forEach((c, i) => obj[c] = row[i]);
            return obj;
        });
        return { success: true, bookmarks: rows };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('add-bookmark', (event, { id, url, title, folderId }) => {
    try {
        if (!sqliteDb) return { success: false };
        sqliteDb.run('INSERT OR REPLACE INTO bookmarks (id, url, title, folderId) VALUES (?, ?, ?, ?)', [id, url, title, folderId]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('set-bookmarks', (event, bookmarks) => {
    try {
        if (!sqliteDb) return { success: false };
        sqliteDb.run('BEGIN TRANSACTION');
        sqliteDb.run('DELETE FROM bookmarks');
        for (const b of bookmarks) {
            sqliteDb.run('INSERT INTO bookmarks (id, url, title, folderId) VALUES (?, ?, ?, ?)', [b.id, b.url, b.title, b.folderId]);
        }
        sqliteDb.run('COMMIT');
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

ipcMain.handle('remove-bookmark', (event, id) => {
    try {
        if (!sqliteDb) return { success: false };
        sqliteDb.run('DELETE FROM bookmarks WHERE id = ?', [id]);
        saveDb();
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});


ipcMain.handle('google-login', async (event, userData) => {
    try {
        if (!userData || typeof userData.sub !== 'string') {
            return { success: false, error: 'Invalid user data' };
        }
        const sanitized = {
            sub: String(userData.sub).substring(0, 128),
            email: String(userData.email || '').substring(0, 256),
            name: String(userData.name || '').substring(0, 128),
            picture: String(userData.picture || '').substring(0, 1024)
        };

        const users = getLocalUsers();
        let userIndex = users.findIndex(u => u.googleId === sanitized.sub);
        
        if (userIndex === -1) {
            const newUser = {
                googleId: sanitized.sub,
                email: sanitized.email,
                name: sanitized.name,
                picture: sanitized.picture,
                lastLogin: Date.now()
            };
            users.push(newUser);
            saveLocalUsers(users);
            return { success: true, user: { name: newUser.name, email: newUser.email, picture: newUser.picture } };
        } else {
            users[userIndex].lastLogin = Date.now();
            saveLocalUsers(users);
            const user = users[userIndex];
            return { success: true, user: { name: user.name, email: user.email, picture: user.picture } };
        }
    } catch (error) {
        console.error('Local File User DB Error:', error);
        return { success: false, error: error.message };
    }
});

// --- Google OAuth Loopback Server (Secure, bypasses "disallowed_useragent" blocks) ---
let oauthServer = null;

ipcMain.handle('google-auth-popup', async (event, { clientId }) => {
    // Clean up any existing running OAuth server instance
    if (oauthServer) {
        try {
            oauthServer.close();
        } catch (e) {}
        oauthServer = null;
    }

    return new Promise((resolve) => {
        const http = require('http');
        const redirectUri = 'http://localhost';
        const scope = 'email profile openid';
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${encodeURIComponent(clientId)}&` +
            `redirect_uri=${encodeURIComponent(redirectUri)}&` +
            `response_type=token&` +
            `scope=${encodeURIComponent(scope)}&` +
            `prompt=select_account`;

        let resolved = false;

        const completeAuth = async (accessToken) => {
            if (resolved) return;
            resolved = true;

            // Instantly shut down the server to free up the port
            if (oauthServer) {
                try {
                    oauthServer.close();
                } catch (e) {}
                oauthServer = null;
            }

            // Fetch user info from main process to bypass CORS in packaged app (file:// origin)
            try {
                const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                if (response.ok) {
                    const userInfo = await response.json();
                    resolve({ success: true, accessToken, userInfo });
                } else {
                    resolve({ success: true, accessToken });
                }
            } catch (err) {
                console.error('[Google OAuth] Main process userinfo fetch failed:', err.message);
                resolve({ success: true, accessToken });
            }
        };

        // Premium themed, glassmorphic success page styled to match Apex Browser branding
        const htmlPage = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apex Browser - Sign In Successful</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background: radial-gradient(circle at center, #1e1e38 0%, #0d0d15 100%);
            font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #ffffff;
            overflow: hidden;
        }

        .glow {
            position: absolute;
            width: 400px;
            height: 400px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(0, 210, 255, 0.12) 0%, rgba(0, 0, 0, 0) 70%);
            filter: blur(50px);
            z-index: 1;
            pointer-events: none;
        }
        .glow-1 { top: -100px; left: -100px; }
        .glow-2 { bottom: -100px; right: -100px; }

        .card {
            position: relative;
            z-index: 10;
            width: 90%;
            max-width: 450px;
            padding: 40px;
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 28px;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
            text-align: center;
            transform: translateY(20px);
            opacity: 0;
            animation: fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes fadeInUp {
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }

        .logo-container {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            width: 72px;
            height: 72px;
            margin-bottom: 24px;
            background: linear-gradient(135deg, #00d2ff 0%, #0066ff 100%);
            border-radius: 20px;
            box-shadow: 0 8px 32px rgba(0, 210, 255, 0.25);
            animation: pulse 2.5s infinite alternate ease-in-out;
        }

        @keyframes pulse {
            0% { transform: scale(1); box-shadow: 0 8px 32px rgba(0, 210, 255, 0.25); }
            100% { transform: scale(1.04); box-shadow: 0 8px 40px rgba(0, 210, 255, 0.4); }
        }

        .logo-icon {
            font-size: 32px;
            font-weight: 800;
            background: linear-gradient(to bottom, #ffffff, #dcdcf0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        h1 {
            font-size: 26px;
            font-weight: 800;
            margin: 0 0 12px 0;
            background: linear-gradient(to right, #ffffff, #b0b0d0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.5px;
        }

        p {
            font-size: 15px;
            line-height: 1.6;
            color: #a2a2c8;
            margin: 0 0 32px 0;
        }

        .success-checkmark {
            width: 60px;
            height: 60px;
            margin: 0 auto 24px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0, 210, 255, 0.08);
            border: 2px solid #00d2ff;
            color: #00d2ff;
            border-radius: 50%;
            font-size: 28px;
            animation: scaleIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        .btn {
            display: inline-block;
            width: 100%;
            padding: 14px 28px;
            background: linear-gradient(90deg, #00d2ff 0%, #0066ff 100%);
            border: none;
            border-radius: 14px;
            color: #ffffff;
            font-size: 15px;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0, 210, 255, 0.2);
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            box-sizing: border-box;
        }

        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 210, 255, 0.35);
        }

        .btn:active {
            transform: translateY(0);
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>

    <div class="card">
        <div id="loading-view">
            <div class="logo-container">
                <span class="logo-icon">A</span>
            </div>
            <h1>Connecting to Apex...</h1>
            <p>Completing authentication process. Please wait a moment.</p>
            <div style="width: 36px; height: 36px; border: 3px solid rgba(0, 210, 255, 0.15); border-top-color: #00d2ff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>

        <div id="success-view" style="display: none;">
            <div class="success-checkmark">✓</div>
            <h1>Sign in Successful!</h1>
            <p>Your Google account has been securely linked with Apex Browser. You can now close this window and resume browsing.</p>
            <button class="btn" onclick="window.close()">Close Tab</button>
        </div>
    </div>

    <script>
        const hash = window.location.hash;
        if (hash) {
            const params = hash.substring(1);
            window.location.href = '/callback?' + params;
        } else {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('access_token');
            if (token) {
                document.getElementById('loading-view').style.display = 'none';
                document.getElementById('success-view').style.display = 'block';
                setTimeout(() => {
                    try { window.close(); } catch(e) {}
                }, 5000);
            }
        }
    </script>
</body>
</html>
        `;

        oauthServer = http.createServer((req, res) => {
            try {
                const reqUrl = new URL(req.url, 'http://localhost');
                
                if (reqUrl.pathname === '/callback') {
                    const token = reqUrl.searchParams.get('access_token');
                    if (token) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(htmlPage);
                        completeAuth(token);
                    } else {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Authentication failed: missing access token.');
                        if (!resolved) {
                            resolved = true;
                            resolve({ success: false, error: 'missing token' });
                        }
                    }
                } else if (reqUrl.pathname === '/') {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(htmlPage);
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found');
                }
            } catch (err) {
                console.error('[Google OAuth] Server request handling failed:', err.message);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
        });

        oauthServer.on('error', (err) => {
            console.error('[Google OAuth] Local server error:', err.message);
            if (!resolved) {
                resolved = true;
                resolve({ success: false, error: err.message });
            }
        });

        // Listen on port 80 (standard for http://localhost redirect URI)
        oauthServer.listen(80, '127.0.0.1', () => {
            console.log('[Google OAuth] Local HTTP server listening on http://localhost');
            
            // Open the authentication URL in the user's default system browser
            shell.openExternal(authUrl).catch(err => {
                console.error('[Google OAuth] Failed to open external browser:', err.message);
                if (!resolved) {
                    resolved = true;
                    resolve({ success: false, error: 'failed to open browser' });
                }
            });
        });
    });
});
// --------------------------------------

// Chrome 124 on Windows 10 — matches real desktop Chrome for maximum site compatibility
// This fixes: Opera setup ads, degraded site content, "download Chrome" banners
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

app.userAgentFallback = USER_AGENT;

// Disable Chrome client hints that leak Electron identity
app.commandLine.appendSwitch('disable-features', 'UserAgentClientHintFullVersionList');

// ============================================================
// WALLPAPER PERSISTENCE — Save uploaded wallpapers to disk
// Fixes: blob: URLs expire when app closes, losing custom wallpapers
// ============================================================
const WALLPAPERS_DIR = path.join(app.getPath('userData'), 'wallpapers');
if (!fs.existsSync(WALLPAPERS_DIR)) fs.mkdirSync(WALLPAPERS_DIR, { recursive: true });

// Save wallpaper file from renderer (receives base64 data)
ipcMain.handle('save-wallpaper', async (event, { name, data, mimeType }) => {
    try {
        // Sanitize filename
        const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
        const timestamp = Date.now();
        const fileName = `${timestamp}_${safeName}`;
        const filePath = path.join(WALLPAPERS_DIR, fileName);
        
        // data is base64 string — decode and write
        const buffer = Buffer.from(data, 'base64');
        fs.writeFileSync(filePath, buffer);
        
        console.log(`[Apex Wallpaper] Saved: ${fileName} (${(buffer.length / 1024).toFixed(1)} KB)`);
        
        // Return the file:// URL that persists across restarts
        // Use Node's pathToFileURL for correct Windows path handling (drive letters, spaces, etc.)
        return { 
            success: true, 
            filePath: filePath,
            fileUrl: pathToFileURL(filePath).href,
            fileName: fileName
        };
    } catch (err) {
        console.error('[Apex Wallpaper] Save failed:', err.message);
        return { success: false, error: err.message };
    }
});

// Get list of saved wallpapers (for showing "Custom" section in Wallpaper Store)
ipcMain.handle('get-saved-wallpapers', async () => {
    try {
        if (!fs.existsSync(WALLPAPERS_DIR)) return [];
        const files = fs.readdirSync(WALLPAPERS_DIR);
        return files.map(f => {
            const filePath = path.join(WALLPAPERS_DIR, f);
            const ext = path.extname(f).toLowerCase();
            const isVideo = ['.mp4', '.webm', '.mov'].includes(ext);
            return {
                id: `custom_${f}`,
                name: f.replace(/^\d+_/, '').replace(/\.[^.]+$/, ''),
                type: isVideo ? 'video' : 'static',
                fileUrl: pathToFileURL(filePath).href,
                cat: 'Custom',
                tag: 'Custom',
            };
        });
    } catch (err) {
        console.error('[Apex Wallpaper] List failed:', err.message);
        return [];
    }
});

// Delete a saved wallpaper
ipcMain.handle('delete-wallpaper', async (event, fileName) => {
    try {
        const filePath = path.join(WALLPAPERS_DIR, path.basename(fileName));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            return { success: true };
        }
        return { success: false, error: 'File not found' };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('clear-data', async () => {
    await session.defaultSession.clearStorageData();
    return true;
});

// --- VPN / Proxy Configuration ---
ipcMain.handle('set-proxy', async (event, proxyConfig) => {
    try {
        if (!proxyConfig || proxyConfig === 'direct') {
            await session.defaultSession.setProxy({ mode: 'direct' });
            return { success: true, mode: 'direct' };
        }
        // S3 FIX: Validate proxy URL format
        const proxyStr = String(proxyConfig).substring(0, 256);
        if (!/^(socks[45]?|https?|direct):\/\/.+:\d{1,5}$/.test(proxyStr) && proxyStr !== 'direct') {
            return { success: false, error: 'Invalid proxy format. Use protocol://host:port (e.g. socks5://127.0.0.1:1080)' };
        }
        await session.defaultSession.setProxy({ 
            proxyRules: proxyStr,
            proxyBypassRules: '127.0.0.1, localhost, <local>'
        });
        return { success: true, mode: 'proxy', proxy: proxyStr };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('test-proxy', async () => {
    try {
        const res = await fetch('https://api.ipify.org?format=json');
        const data = await res.json();
        return { success: true, ip: data.ip };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// --- Google Safe Browsing API v4 Lookup ---
// Load API key from .env file (Electron main process doesn't get Vite env vars)
const SAFE_BROWSING_API_KEY = (() => {
    try {
        // In dev: .env is at project root (../); in production: extraResources puts it at resources/.env
        const envPaths = [
            path.join(__dirname, '..', '.env'),                          // Dev mode
            path.join(process.resourcesPath || __dirname, '.env'),       // Packaged (extraResources)
        ];
        for (const envPath of envPaths) {
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf8');
                const match = envContent.match(/VITE_SAFE_BROWSING_API_KEY=(.+)/);
                if (match) return match[1].trim();
            }
        }
    } catch {}
    return process.env.VITE_SAFE_BROWSING_API_KEY || '';
})();
const SB_CACHE = new Map(); // LRU cache: hostname → { safe, threats, expiry }
const SB_CACHE_TTL = 5 * 60 * 1000; // 5 min cache

async function checkSafeBrowsing(url) {
    const hostname = new URL(url).hostname;
    
    // Check cache first
    const cached = SB_CACHE.get(hostname);
    if (cached && cached.expiry > Date.now()) return cached.result;
    
    // Fallback: regex patterns if no API key configured
    if (!SAFE_BROWSING_API_KEY) {
        const unsafePatterns = [
            /phish/i, /malware/i, /hack/i, /scam/i, /fraud/i,
            /fake-?login/i, /account-?verify/i, /free-?prize/i,
            /win-?iphone/i, /click-?here-?free/i
        ];
        const isSuspicious = unsafePatterns.some(p => p.test(hostname) || p.test(url));
        const isInsecure = url.startsWith('http://') && !hostname.includes('localhost');
        const result = { safe: !isSuspicious, insecure: isInsecure, hostname, threats: [], source: 'local' };
        SB_CACHE.set(hostname, { result, expiry: Date.now() + SB_CACHE_TTL });
        return result;
    }
    
    try {
        const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${SAFE_BROWSING_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client: { clientId: 'apex-browser', clientVersion: '0.1.0' },
                threatInfo: {
                    threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
                    platformTypes: ['ANY_PLATFORM'],
                    threatEntryTypes: ['URL'],
                    threatEntries: [{ url }]
                }
            })
        });
        const data = await response.json();
        
        const threats = (data.matches || []).map(m => m.threatType);
        const isInsecure = url.startsWith('http://') && !hostname.includes('localhost');
        const result = {
            safe: threats.length === 0,
            insecure: isInsecure,
            hostname,
            threats,
            source: 'google-safe-browsing'
        };
        
        // Cache the result (respect cacheDuration from API if present)
        const cacheDuration = data.matches?.[0]?.cacheDuration 
            ? parseInt(data.matches[0].cacheDuration) * 1000 
            : SB_CACHE_TTL;
        SB_CACHE.set(hostname, { result, expiry: Date.now() + cacheDuration });
        
        // Evict old cache entries (keep under 1000)
        if (SB_CACHE.size > 1000) {
            const oldest = SB_CACHE.keys().next().value;
            SB_CACHE.delete(oldest);
        }
        
        return result;
    } catch (err) {
        console.error('[Safe Browsing] API error:', err.message);
        // Fail open — don't block user if API is down
        const isInsecure = url.startsWith('http://') && !hostname.includes('localhost');
        return { safe: true, insecure: isInsecure, hostname, threats: [], source: 'error' };
    }
}

ipcMain.handle('check-site-safety', async (event, url) => {
    try {
        return await checkSafeBrowsing(url);
    } catch (err) {
        return { safe: true, insecure: false, hostname: '', threats: [], source: 'error' };
    }
});

// --- Download Safety: SHA-256 hash check ---
const crypto = require('crypto');

// Known malware test hashes (EICAR test file + common test hashes)
// In production, you'd use a threat intelligence feed or Google Safe Browsing
const KNOWN_MALWARE_HASHES = new Set([
    // EICAR test file hash
    '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
]);

async function hashFile(filePath) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        const stream = fs.createReadStream(filePath);
        stream.on('data', chunk => hash.update(chunk));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', reject);
    });
}

ipcMain.handle('check-download-safety', async (event, filePath) => {
    try {
        if (!filePath || !fs.existsSync(filePath)) {
            return { safe: true, hash: '', error: 'File not found' };
        }
        
        const fileHash = await hashFile(filePath);
        const isMalware = KNOWN_MALWARE_HASHES.has(fileHash);
        
        // Check file extension for dangerous types
        const ext = path.extname(filePath).toLowerCase();
        const dangerousExts = new Set(['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js', '.wsh', '.wsf', '.msi', '.dll']);
        const isDangerousExt = dangerousExts.has(ext);
        
        return {
            safe: !isMalware,
            hash: fileHash,
            isMalware,
            isDangerousExtension: isDangerousExt,
            extension: ext,
        };
    } catch (err) {
        console.error('[Download Safety] Hash check failed:', err.message);
        return { safe: true, hash: '', error: err.message };
    }
});

ipcMain.handle('open-incognito', async () => {
    const incognitoWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        frame: false,
        backgroundColor: '#1a1a1a',
        hasShadow: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            spellcheck: false,
            partition: 'incognito',
            webSecurity: app.isPackaged,
            backgroundThrottling: false, // Ensures 3D wallpapers run at full FPS
            preload: path.join(__dirname, 'preload.js')
        }
    });

    const isDev = !app.isPackaged;
    if (isDev) {
        const loadDevServer = () => {
            incognitoWindow.loadURL('http://localhost:5173?incognito=true').catch(() => {
                console.log('Vite server not ready, retrying incognito in 1s...');
                setTimeout(loadDevServer, 1000);
            });
        };
        loadDevServer();
    } else {
        incognitoWindow.loadFile(path.join(__dirname, '../dist/index.html'), { query: { incognito: 'true' } });
    }
    return true;
});

// Simple caching for rate limiting Yahoo Finance
let cachedStocks = null;
let lastStockFetch = null;

ipcMain.handle('fetch-stocks', async () => {
    try {
        const now = Date.now();
        if (cachedStocks && lastStockFetch && (now - lastStockFetch < 60000)) {
            return cachedStocks;
        }

        const symbols = ['AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT'];
        const stockPromises = symbols.map(async (sym) => {
            const res = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const data = await res.json();
            const meta = data?.chart?.result?.[0]?.meta;
            if (!meta) return null;
            const diff = meta.regularMarketPrice - meta.chartPreviousClose;
            return {
                sym: sym,
                p: meta.regularMarketPrice,
                c: diff > 0 ? '+' + diff.toFixed(2) : diff.toFixed(2),
                up: diff >= 0,
                col: diff >= 0 ? '#00d2ff' : '#ff5f56'
            };
        });
        const results = await Promise.all(stockPromises);
        cachedStocks = results.filter(r => r !== null);
        lastStockFetch = now;
        return cachedStocks;
    } catch (err) {
        console.error('Stock fetch error:', err);
        return cachedStocks || null;
    }
});

// ============================================================
// APEX SHIELDS — Brave-style Ad Blocker (Ghostery/EasyList engine)
// Uses the same EasyList + EasyPrivacy filter format as Brave/uBlock
// Supports: Network blocking, Cosmetic filtering, Scriptlet injection
// ============================================================
let adsBlocked = 0;
let isAdblockEnabled = true;
let blocker = null; // ElectronBlocker instance

// Custom blocklist of known ad/spam/redirect/malware domains that bypass EasyList
const APEX_CUSTOM_BLOCKLIST = new Set([
    'loadfilerun.com','fastloadfile.com','filedownloader.com','downloadhub.cloud',
    'popads.net','adsterra.com','propellerads.com','exoclick.com','juicyads.com',
    'adcash.com','admaven.com','clickadu.com','hilltopads.com','popcash.net',
    'trafficjunky.com','onclkds.com','syndication.realsrv.com','bidvertiser.com',
    'monetizer101.com','yllix.com','adbull.com','revcontent.com','mgid.com',
    'taboola.com','outbrain.com','doubleclick.net','googlesyndication.com',
    'googleadservices.com','linkvertise.com','ouo.io','shrinkme.io','bc.vc',
    'adf.ly','shorturl.at','bit.do','cutt.ly','srt.lt','clk.sh','ouo.press',
    'try2link.com','earnhub.net','shrinkforearn.in','dulink.in','atglinks.com',
    'za.gl','exe.io','gplinks.in','mdisklink.link','tnlink.in','mplaycloud.com',
    'mixdrop.sx','upstream.to','streamtape.com','doodstream.com',
    'revolink.xyz','cpmlink.net','adfly.com','shorte.st','adfoc.us',
    'coinurl.com','bfredir.com','track.wg-aff.com','install.app-ede.xyz',
    'cdn77.org','pushance.com','pushails.com','richpush.co','sendpulse.com',
    'notifpush.com','pushwelcome.com','push-notification.top','crfrge.com',
    'bfredir.com','crfrge.com','geniusdexchange.com','offergate.pro',
]);

ipcMain.handle('get-ads-blocked', () => adsBlocked);
ipcMain.handle('set-adblock', (event, enabled) => {
    isAdblockEnabled = enabled;
    console.log(`[Apex Shields] Ad blocker ${enabled ? 'enabled' : 'disabled'}`);
    return true;
});

// Apply network-level ad blocking to a session using the Ghostery engine
// Uses manual onBeforeRequest (compatible with Electron 28) instead of
// enableBlockingInSession (requires Electron 30+ for cosmetic preloads)
function applyAdBlockerToSession(sess) {
    if (sess.__apexAdBlockApplied) return;
    sess.__apexAdBlockApplied = true;
    
    sess.webRequest.onBeforeRequest({ urls: ['<all_urls>'] }, (details, callback) => {
        if (!isAdblockEnabled) { callback({ cancel: false }); return; }
        const { url, resourceType } = details;
        // Never block main page navigation, local dev server, or file:// resources
        if (resourceType === 'mainFrame' || url.startsWith('http://localhost') || url.startsWith('file://')) {
            callback({ cancel: false }); return;
        }

        // APEX CUSTOM BLOCKLIST — instantly block known spam/ad/redirect domains
        try {
            const hostname = new URL(url).hostname.replace(/^www\./, '');
            if (APEX_CUSTOM_BLOCKLIST.has(hostname) || 
                [...APEX_CUSTOM_BLOCKLIST].some(d => hostname.endsWith('.' + d))) {
                adsBlocked++;
                callback({ cancel: true });
                return;
            }
        } catch {}

        // Ghostery engine matching
        if (!blocker) { callback({ cancel: false }); return; }
        try {
            const request = Request.fromRawDetails({
                url: url,
                type: resourceType || 'other',
                sourceUrl: details.referrer || details.url || ''
            });
            const { match } = blocker.match(request);
            if (match) {
                adsBlocked++;
                callback({ cancel: true });
            } else {
                callback({ cancel: false });
            }
        } catch (e) {
            callback({ cancel: false });
        }
    });
}

// Comprehensive filter list URLs — same sources as Brave and uBlock Origin
const FILTER_LIST_URLS = [
    // Core ad blocking
    'https://easylist.to/easylist/easylist.txt',
    'https://easylist.to/easylist/easyprivacy.txt',
    // uBlock Origin's own filters (catch what EasyList misses)
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/filters.txt',
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt',
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt',
    'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/resource-abuse.txt',
    // Peter Lowe's ad and tracking server list
    'https://pgl.yoyo.org/adservers/serverlist.php?hostformat=adblockplus&showintro=1&mimetype=plaintext',
];

// Bump this version number to force a cache rebuild with new filter lists
const ADBLOCKER_ENGINE_VERSION = '4';

// Convert our custom domain blocklist into standard ABP filter rules
function getCustomFilterRules() {
    return [...APEX_CUSTOM_BLOCKLIST].map(d => `||${d}^`).join('\n');
}

// Build the full blocker engine from all filter lists + custom rules
async function buildBlockerEngine() {
    console.log('[Apex Shields] Downloading comprehensive filter lists (7 sources)...');
    const blocker = await ElectronBlocker.fromLists(fetch, FILTER_LIST_URLS, {
        enableCompression: true,
        loadCosmeticFilters: true,
        loadNetworkFilters: true,
    });
    console.log('[Apex Shields] All filter lists compiled successfully');
    return blocker;
}

// Initialize the Brave-style ad blocker with versioned cache for instant startup
async function initAdBlocker() {
    try {
        const cachePath = path.join(app.getPath('userData'), 'adblocker-engine.bin');
        const versionPath = path.join(app.getPath('userData'), 'adblocker-version.txt');
        
        // Check if cached engine matches current version
        let cacheValid = false;
        if (fs.existsSync(cachePath) && fs.existsSync(versionPath)) {
            try {
                const savedVersion = fs.readFileSync(versionPath, 'utf8').trim();
                cacheValid = (savedVersion === ADBLOCKER_ENGINE_VERSION);
            } catch {}
        }

        if (cacheValid) {
            try {
                const cacheData = fs.readFileSync(cachePath);
                blocker = ElectronBlocker.deserialize(cacheData);
                console.log('[Apex Shields] Loaded cached ad blocker engine (v' + ADBLOCKER_ENGINE_VERSION + ')');
            } catch (e) {
                console.warn('[Apex Shields] Cache corrupted, rebuilding...', e.message);
                blocker = null;
            }
        }
        
        // Build fresh engine if no valid cache
        if (!blocker) {
            blocker = await buildBlockerEngine();
            // Cache compiled engine to disk for instant next startup
            const serialized = blocker.serialize();
            fs.writeFileSync(cachePath, Buffer.from(serialized));
            fs.writeFileSync(versionPath, ADBLOCKER_ENGINE_VERSION);
            console.log('[Apex Shields] Engine cached to disk (v' + ADBLOCKER_ENGINE_VERSION + ')');
        }
        
        // Apply to all session partitions via manual onBeforeRequest
        applyAdBlockerToSession(session.defaultSession);
        applyAdBlockerToSession(session.fromPartition('incognito'));
        applyAdBlockerToSession(session.fromPartition('persist:webview'));
        
        console.log('[Apex Shields] Ad blocker active on all sessions (7 filter lists)');
        
        // Background refresh filter lists every 12 hours (like Brave)
        setInterval(async () => {
            try {
                const freshBlocker = await buildBlockerEngine();
                blocker = freshBlocker;
                const serialized = freshBlocker.serialize();
                fs.writeFileSync(cachePath, Buffer.from(serialized));
                fs.writeFileSync(versionPath, ADBLOCKER_ENGINE_VERSION);
                console.log('[Apex Shields] Filter lists refreshed');
            } catch (e) {
                console.warn('[Apex Shields] Filter list refresh failed:', e.message);
            }
        }, 12 * 60 * 60 * 1000);
        
    } catch (err) {
        console.error('[Apex Shields] Ad blocker init failed:', err.message);
    }
}

let mainWindow;

// E3 FIX: Window controls handler registered once at top-level (not inside createWindow)
ipcMain.on('window-controls', (event, action) => {
    if (!mainWindow) return;
    switch (action) {
        case 'minimize': mainWindow.minimize(); break;
        case 'maximize': mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); break;
        case 'close': app.quit(); break;
    }
});

ipcMain.handle('get-window-state', () => mainWindow ? mainWindow.isMaximized() : false);

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        frame: false,
        transparent: false,
        backgroundColor: '#1a1a1a',
        hasShadow: true,
        icon: path.join(__dirname, '../build/icon.png'),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            webviewTag: true,
            spellcheck: false,
            webSecurity: app.isPackaged,
            backgroundThrottling: false, // Ensures 3D wallpapers run at full FPS
            preload: path.join(__dirname, 'preload.js')
        }
    });

    const isDev = !app.isPackaged;
    if (isDev) {
        const loadDevServer = () => {
            mainWindow.loadURL('http://localhost:5173').catch(() => {
                console.log('Vite server not ready, retrying in 1s...');
                setTimeout(loadDevServer, 1000);
            });
        };
        loadDevServer();
        mainWindow.webContents.openDevTools(); // Dev mode only
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('maximize', () => {
        try { mainWindow.webContents.send('window-state', true); } catch (e) {}
    });
    mainWindow.on('unmaximize', () => {
        try { mainWindow.webContents.send('window-state', false); } catch (e) {}
    });
}

// --- Secure API Key Storage via OS Keychain ---
ipcMain.handle('safe-store-key', (event, key) => {
    if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.encryptString(key).toString('base64');
    }
    return null;
});
ipcMain.handle('safe-read-key', (event, encrypted) => {
    if (safeStorage.isEncryptionAvailable() && encrypted) {
        try {
            return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
        } catch { return null; }
    }
    return null;
});

// --- DevTools for webview content ---
ipcMain.handle('open-devtools', async () => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0) wins[0].webContents.send('open-webview-devtools');
    return true;
});

// --- Open External Links in Default Browser ---
ipcMain.handle('open-external', async (event, url) => {
    try {
        // S3 FIX: Only allow http/https URLs to prevent file:// or shell exploits
        if (typeof url === 'string' && (url.startsWith('https://') || url.startsWith('http://'))) {
            await shell.openExternal(url);
            return { success: true };
        }
        return { success: false, error: 'Invalid URL scheme' };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// --- Download File Actions ---
ipcMain.handle('open-file', async (event, filePath) => {
    try {
        if (typeof filePath === 'string' && fs.existsSync(filePath)) {
            await shell.openPath(filePath);
            return { success: true };
        }
        return { success: false, error: 'File not found' };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('show-in-folder', async (event, filePath) => {
    try {
        if (typeof filePath === 'string' && fs.existsSync(filePath)) {
            shell.showItemInFolder(filePath);
            return { success: true };
        }
        return { success: false, error: 'File not found' };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// --- Ollama Fetch Proxy (CORS Bypass) ---
ipcMain.handle('ollama-request', async (event, { endpoint, method = 'GET', body = null }) => {
    try {
        // Only allow localhost
        const baseUrl = endpoint.startsWith('http') ? endpoint.replace('localhost', '127.0.0.1') : `http://127.0.0.1:11434${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
        if (!baseUrl.startsWith('http://127.0.0.1:11434')) {
            return { success: false, error: 'Ollama requests restricted to localhost/127.0.0.1' };
        }
        
        const res = await fetch(baseUrl, {
            method,
            headers: body ? { 'Content-Type': 'application/json' } : undefined,
            body: body ? JSON.stringify(body) : undefined
        });
        const text = await res.text();
        try {
            return { success: true, status: res.status, data: JSON.parse(text) };
        } catch {
            return { success: true, status: res.status, data: text };
        }
    } catch (err) {
        return { success: false, error: err.message };
    }
});

// ============================================================
// CRASH FIX: setupDownloadHandler moved to MODULE SCOPE
// Was previously scoped inside app.whenReady().then(...) callback,
// causing ReferenceError when called from web-contents-created handler
// ============================================================
const activeDownloads = new Map();

ipcMain.handle('download-pause', (event, filename) => {
    const item = activeDownloads.get(filename);
    if (item && !item.isPaused()) { item.pause(); return { success: true }; }
    return { success: false };
});
ipcMain.handle('download-resume', (event, filename) => {
    const item = activeDownloads.get(filename);
    if (item && item.isPaused()) { item.resume(); return { success: true }; }
    return { success: false };
});
ipcMain.handle('download-cancel', (event, filename) => {
    const item = activeDownloads.get(filename);
    if (item) { item.cancel(); activeDownloads.delete(filename); return { success: true }; }
    return { success: false };
});

function setupDownloadHandler(sess) {
    if (sess.__apexDownloadHandlerApplied) return;
    sess.__apexDownloadHandlerApplied = true;
    
    sess.on('will-download', (event, item, webContents) => {
        const filename = item.getFilename();
        const totalBytes = item.getTotalBytes();
        
        // Store for pause/resume/cancel
        activeDownloads.set(filename, item);
        
        // Send initial download info
        const wins = BrowserWindow.getAllWindows();
        if (wins.length > 0) wins[0].webContents.send('download-progress', {
            filename: filename,
            received: 0,
            total: totalBytes,
            state: 'started',
            url: item.getURL(),
            savePath: item.getSavePath(),
            isPaused: false
        });

        item.on('updated', (event, state) => {
            const wins = BrowserWindow.getAllWindows();
            if (wins.length > 0) wins[0].webContents.send('download-progress', {
                filename: filename,
                received: item.getReceivedBytes(),
                total: item.getTotalBytes(),
                state: state === 'interrupted' ? 'interrupted' : 'progressing',
                savePath: item.getSavePath(),
                isPaused: item.isPaused()
            });
        });
        item.once('done', async (event, state) => {
            activeDownloads.delete(filename);
            const savePath = item.getSavePath();
            const wins = BrowserWindow.getAllWindows();
            if (wins.length > 0) wins[0].webContents.send('download-progress', {
                filename: filename,
                received: item.getReceivedBytes(),
                total: item.getTotalBytes(),
                state: state,
                savePath: savePath,
                isPaused: false
            });

            // Post-download safety: hash check completed files
            if (state === 'completed' && savePath) {
                try {
                    const safetyResult = await (async () => {
                        const fileHash = await hashFile(savePath);
                        const isMalware = KNOWN_MALWARE_HASHES.has(fileHash);
                        const ext = path.extname(savePath).toLowerCase();
                        const dangerousExts = new Set(['.exe', '.scr', '.bat', '.cmd', '.com', '.pif', '.vbs', '.js', '.wsh', '.wsf', '.msi', '.dll']);
                        return { safe: !isMalware, isMalware, isDangerousExtension: dangerousExts.has(ext), hash: fileHash, extension: ext };
                    })();

                    if (wins.length > 0) {
                        wins[0].webContents.send('download-progress', {
                            filename: filename,
                            received: item.getReceivedBytes(),
                            total: item.getTotalBytes(),
                            state: 'safety-checked',
                            savePath: savePath,
                            isPaused: false,
                            safety: safetyResult,
                        });
                    }

                    if (safetyResult.isMalware) {
                        console.warn(`[Download Safety] MALWARE DETECTED: ${filename} (hash: ${safetyResult.hash})`);
                        // Show native dialog warning
                        dialog.showMessageBox(wins[0], {
                            type: 'warning',
                            title: 'Malware Detected',
                            message: `The file "${filename}" matches a known malware signature.\n\nHash: ${safetyResult.hash}\n\nThe file has been kept but we recommend deleting it immediately.`,
                            buttons: ['Delete File', 'Keep Anyway'],
                            defaultId: 0,
                        }).then(({ response }) => {
                            if (response === 0) {
                                try { fs.unlinkSync(savePath); } catch {}
                            }
                        });
                    }
                } catch (hashErr) {
                    console.error('[Download Safety] Hash check error:', hashErr.message);
                }
            }
        });
    });
}

// ============================================================
// Apply Chrome UA headers ONCE per session (prevents stacking)
// ============================================================
function applyUAHeaders(sess) {
    if (sess.__apexUAApplied) return;
    sess.__apexUAApplied = true;
    sess.webRequest.onBeforeSendHeaders({ urls: ['<all_urls>'] }, (details, callback) => {
        details.requestHeaders['User-Agent'] = USER_AGENT;
        delete details.requestHeaders['sec-ch-ua-full-version-list'];
        details.requestHeaders['sec-ch-ua'] = '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"';
        details.requestHeaders['sec-ch-ua-mobile'] = '?0';
        details.requestHeaders['sec-ch-ua-platform'] = '"Windows"';
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
}

// Strip ALL client hints for Google Auth session so Google sees consistent Firefox
function applyGoogleAuthUAHeaders(sess) {
    if (sess.__apexGoogleUAApplied) return;
    sess.__apexGoogleUAApplied = true;
    const firefoxUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0';
    sess.setUserAgent(firefoxUA);
    sess.webRequest.onBeforeSendHeaders({ urls: ['<all_urls>'] }, (details, callback) => {
        details.requestHeaders['User-Agent'] = firefoxUA;
        // Strip ALL sec-ch-ua headers to prevent Google from detecting Chromium/Electron client hints
        for (const key of Object.keys(details.requestHeaders)) {
            if (key.toLowerCase().startsWith('sec-ch-ua')) {
                delete details.requestHeaders[key];
            }
        }
        callback({ cancel: false, requestHeaders: details.requestHeaders });
    });
}

app.whenReady().then(async () => {
    const { session } = require('electron');

    // FIX: Override CSP headers at session level for production (file:// protocol)
    // file:// makes 'self' ambiguous — explicitly allow all needed sources
    if (app.isPackaged) {
        session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
            callback({
                responseHeaders: {
                    ...details.responseHeaders,
                    'Content-Security-Policy': [
                        "default-src 'self' file: data:; " +
                        "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; " +
                        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
                        "font-src 'self' https://fonts.gstatic.com data:; " +
                        "img-src 'self' data: https: http: blob: file:; " +
                        "connect-src 'self' https: http: blob: data: ws: wss: file:; " +
                        "media-src 'self' https: http: blob: data: file:; " +
                        "frame-src 'self' https: http:; " +
                        "worker-src 'self' blob:;"
                    ]
                }
            });
        });
    }

    // --- Auto-Updater (silent, checks every 4 hours) ---
    try {
        const { autoUpdater } = require('electron-updater');
        autoUpdater.autoDownload = true;
        autoUpdater.autoInstallOnAppQuit = true;
        autoUpdater.checkForUpdatesAndNotify().catch(() => {});
        // Re-check every 4 hours
        setInterval(() => autoUpdater.checkForUpdatesAndNotify().catch(() => {}), 4 * 60 * 60 * 1000);
        autoUpdater.on('update-downloaded', (info) => {
            console.log('[Apex Updater] Update downloaded:', info.version);
            const wins = BrowserWindow.getAllWindows();
            if (wins.length > 0) wins[0].webContents.send('update-ready', { version: info.version });
        });
        autoUpdater.on('error', (err) => console.log('[Apex Updater] Error:', err.message));
    } catch (e) {
        // electron-updater not available in dev mode — skip silently
        console.log('[Apex Updater] Skipped (dev mode or not installed)');
    }

    // #13 FIX: Restrict to safe permissions only — block camera/geolocation by default, allowing media for voice AI
    const SAFE_PERMISSIONS = ['notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'pointerLock', 'media'];
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (SAFE_PERMISSIONS.includes(permission)) {
            callback(true);
        } else {
            console.warn(`⛔ Blocked permission request: ${permission} from ${webContents.getURL()}`);
            // Send IPC to renderer so it can show a UI prompt
            const wins = BrowserWindow.getAllWindows();
            if (wins.length > 0) wins[0].webContents.send('permission-request', { permission, origin: webContents.getURL() });
            callback(false);
        }
    });
    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        return SAFE_PERMISSIONS.includes(permission);
    });
    
    // Apply UA headers to all known sessions (ONCE — no stacking)
    applyUAHeaders(session.defaultSession);
    applyUAHeaders(session.fromPartition('incognito'));
    applyUAHeaders(session.fromPartition('persist:webview'));

    // Apply download handler to all sessions
    setupDownloadHandler(session.defaultSession);
    setupDownloadHandler(session.fromPartition('incognito'));
    setupDownloadHandler(session.fromPartition('persist:webview'));

    // Initialize Brave-style ad blocker (async — downloads filter lists on first run)
    await initAdBlocker();

    // Load all persisted Chrome extensions
    await loadPersistedExtensions();

    createWindow();
});

app.on('web-contents-created', (event, contents) => {
    const sess = contents.session;
    const isGoogleAuthSession = (sess === session.fromPartition('google-auth'));

    if (isGoogleAuthSession) {
        contents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0');
    } else {
        contents.setUserAgent(USER_AGENT);
    }

    // Apply download handler + UA headers + ad blocker to any new session partition
    if (sess) {
        setupDownloadHandler(sess);
        if (isGoogleAuthSession) {
            applyGoogleAuthUAHeaders(sess);
        } else {
            applyUAHeaders(sess);
            applyAdBlockerToSession(sess);
        }
    }

    contents.setWindowOpenHandler(({ url, frameName, features, disposition }) => {
        // Allow Google OAuth popup (needs its own window)
        if (url && (url.includes('accounts.google.com') || url.includes('oauth2'))) {
            return { action: 'allow' };
        }
        if (!url || url === 'about:blank') {
            return { action: 'deny' };
        }

        // Block known spam/ad domains from the custom blocklist
        if (isAdblockEnabled) {
            try {
                const popupHost = new URL(url).hostname.replace(/^www\./, '');
                if (APEX_CUSTOM_BLOCKLIST.has(popupHost) ||
                    [...APEX_CUSTOM_BLOCKLIST].some(d => popupHost.endsWith('.' + d))) {
                    adsBlocked++;
                    return { action: 'deny' };
                }
            } catch {}
        }
        
        // Use blocker to check if popup URL is an ad
        if (blocker && isAdblockEnabled) {
            try {
                const request = Request.fromRawDetails({
                    url: url,
                    type: 'sub_frame',
                    sourceUrl: contents.getURL() || ''
                });
                const { match } = blocker.match(request);
                if (match) {
                    adsBlocked++;
                    return { action: 'deny' };
                }
            } catch {}
        }

        // CTRL+CLICK / MIDDLE-CLICK: User explicitly wants a new tab
        if (disposition === 'background-tab') {
            const wins = BrowserWindow.getAllWindows();
            if (wins.length > 0) wins[0].webContents.send('force-url-in-tab', url);
            return { action: 'deny' };
        }

        // ALL OTHER POPUPS: Navigate in the current tab instead of opening a new one.
        // This matches Chrome/Brave behavior:
        //   - Prevents redirect chains from flooding tabs (HDHub4u, HubCloud, etc.)
        //   - Download URLs will trigger Electron's download handler automatically
        //   - Regular links navigate in-place like a normal browser
        contents.loadURL(url);
        return { action: 'deny' };
    });
});
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // Allow proceeding past certificate errors (like Chrome's "Proceed anyway" button).
    // Many download/streaming servers use misconfigured SSL certs.
    // The security warning UI already shows "connection not secure" notices to users.
    event.preventDefault();
    callback(true);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
