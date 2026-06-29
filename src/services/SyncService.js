/**
 * SyncService — Cross-device sync via Firebase Realtime Database
 * 
 * Syncs: bookmarks, bookmarkFolders, passwords (encrypted), settings, history, openTabs
 * Strategy: Last-write-wins with timestamps, real-time listeners
 */
import { getDatabase, ref, set as fbSet, onValue, off, get } from 'firebase/database';
import { getAuth, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { initializeApp, getApps } from 'firebase/app';
import { encrypt, decrypt } from './SyncCrypto';

// Debounce timers per category
const debounceTimers = {};
const DEBOUNCE_MS = 800;

// Active real-time listeners (for cleanup)
const activeListeners = {};

// Flag to prevent sync loops (remote change → local update → push → ...)
let _isSyncingFromRemote = false;

// Firebase app reference (reuse from existing FirebaseService)
let db = null;
let currentUserId = null;
let currentGoogleUid = null;

/**
 * Initialize or get the Firebase database instance
 */
function getDb() {
  if (db) return db;
  const apps = getApps();
  if (apps.length > 0) {
    db = getDatabase(apps[0]);
    return db;
  }

  // Fallback: initialize if FirebaseService hasn't yet
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  if (!firebaseConfig.apiKey || !firebaseConfig.databaseURL) {
    console.warn('[Sync] Firebase not configured — sync disabled');
    return null;
  }

  const app = initializeApp(firebaseConfig, 'apex-sync');
  db = getDatabase(app);
  return db;
}

/**
 * Check if sync is available
 */
export function isSyncReady() {
  return !!getDb() && !!currentUserId;
}

/**
 * Check if we're currently applying remote changes (prevents re-push loops)
 */
export function isSyncingFromRemote() {
  return _isSyncingFromRemote;
}

/**
 * Get the user path in Firebase
 */
function userPath(category) {
  return `users/${currentUserId}/sync/${category}`;
}

/**
 * Initialize sync for a logged-in user
 * @param {string} googleUid - The user's Google `sub` ID
 * @param {object} callbacks - { onBookmarks, onBookmarkFolders, onPasswords, onSettings }
 */
export async function initSync(googleUid, callbacks = {}) {
  const database = getDb();
  if (!database) {
    console.warn('[Sync] Firebase not available');
    return false;
  }

  currentUserId = googleUid;
  currentGoogleUid = googleUid;

  console.log('[Sync] Initializing sync for user:', googleUid.substring(0, 8) + '...');

  // Set up real-time listeners for each category
  const categories = ['bookmarks', 'bookmarkFolders', 'settings', 'history', 'openTabs'];

  for (const category of categories) {
    const catRef = ref(database, userPath(category));
    
    const listener = onValue(catRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const remoteData = snapshot.val();
      
      // Prevent sync loops
      _isSyncingFromRemote = true;
      try {
        if (callbacks[`on${capitalize(category)}`]) {
          callbacks[`on${capitalize(category)}`](remoteData.data, remoteData.updatedAt);
        }
      } finally {
        // Use setTimeout to allow the state update to propagate before re-enabling push
        setTimeout(() => { _isSyncingFromRemote = false; }, 100);
      }
    }, (error) => {
      console.error(`[Sync] Listen error for ${category}:`, error.message);
    });

    activeListeners[category] = { ref: catRef, listener };
  }

  // Passwords get special handling (encrypted)
  const pwdRef = ref(database, userPath('passwords'));
  const pwdListener = onValue(pwdRef, async (snapshot) => {
    if (!snapshot.exists()) return;
    const remoteData = snapshot.val();
    
    _isSyncingFromRemote = true;
    try {
      if (remoteData.encrypted && callbacks.onPasswords) {
        const decrypted = await decrypt(remoteData.encrypted, currentGoogleUid);
        callbacks.onPasswords(JSON.parse(decrypted), remoteData.updatedAt);
      }
    } catch (err) {
      console.error('[Sync] Password decryption failed:', err.message);
    } finally {
      setTimeout(() => { _isSyncingFromRemote = false; }, 100);
    }
  });

  activeListeners['passwords'] = { ref: pwdRef, listener: pwdListener };

  console.log('[Sync] Real-time listeners active');
  return true;
}

/**
 * Push data to Firebase (debounced)
 */
export function pushData(category, data) {
  if (!isSyncReady() || _isSyncingFromRemote) return;

  // Clear existing debounce timer
  if (debounceTimers[category]) {
    clearTimeout(debounceTimers[category]);
  }

  debounceTimers[category] = setTimeout(async () => {
    try {
      const database = getDb();
      if (!database) return;

      const payload = {
        data,
        updatedAt: Date.now(),
        device: navigator.userAgent.substring(0, 50),
      };

      await fbSet(ref(database, userPath(category)), payload);
      console.log(`[Sync] Pushed ${category} (${JSON.stringify(data).length} bytes)`);
    } catch (err) {
      console.error(`[Sync] Push failed for ${category}:`, err.message);
    }
  }, DEBOUNCE_MS);
}

/**
 * Push open tabs to Firebase (debounced with longer interval since tabs change frequently)
 */
export function pushOpenTabs(tabs) {
  if (!isSyncReady() || _isSyncingFromRemote) return;
  const OPEN_TABS_DEBOUNCE = 2000; // 2s debounce for tab changes

  if (debounceTimers['openTabs']) clearTimeout(debounceTimers['openTabs']);

  debounceTimers['openTabs'] = setTimeout(async () => {
    try {
      const database = getDb();
      if (!database) return;

      // Only send URL + title (lightweight)
      const lightweight = tabs
        .filter(t => t.url && t.url !== '')
        .map(t => ({ url: t.url, title: t.title || 'New Tab' }))
        .slice(0, 50); // Cap at 50 tabs

      const payload = {
        data: lightweight,
        updatedAt: Date.now(),
        device: navigator.userAgent.substring(0, 50),
        deviceName: navigator.platform || 'Unknown',
      };

      await fbSet(ref(database, userPath('openTabs')), payload);
    } catch (err) {
      console.error('[Sync] Open tabs push failed:', err.message);
    }
  }, OPEN_TABS_DEBOUNCE);
}

/**
 * Push encrypted passwords to Firebase (debounced)
 */
export function pushPasswords(passwordsArray) {
  if (!isSyncReady() || _isSyncingFromRemote) return;

  if (debounceTimers['passwords']) {
    clearTimeout(debounceTimers['passwords']);
  }

  debounceTimers['passwords'] = setTimeout(async () => {
    try {
      const database = getDb();
      if (!database) return;

      const plaintext = JSON.stringify(passwordsArray);
      const encrypted = await encrypt(plaintext, currentGoogleUid);

      const payload = {
        encrypted,
        updatedAt: Date.now(),
        count: passwordsArray.length,
        device: navigator.userAgent.substring(0, 50),
      };

      await fbSet(ref(database, userPath('passwords')), payload);
      console.log(`[Sync] Pushed passwords (${passwordsArray.length} entries, encrypted)`);
    } catch (err) {
      console.error('[Sync] Password push failed:', err.message);
    }
  }, DEBOUNCE_MS);
}

/**
 * Pull all data once (for initial sync on login)
 * @returns {object} { bookmarks, bookmarkFolders, passwords, settings }
 */
export async function pullAllData() {
  if (!isSyncReady()) return null;

  try {
    const database = getDb();
    const syncRef = ref(database, `users/${currentUserId}/sync`);
    const snapshot = await get(syncRef);
    
    if (!snapshot.exists()) {
      console.log('[Sync] No remote data found — first device');
      return null;
    }

    const remote = snapshot.val();
    const result = {};

    if (remote.bookmarks?.data) result.bookmarks = remote.bookmarks.data;
    if (remote.bookmarkFolders?.data) result.bookmarkFolders = remote.bookmarkFolders.data;
    if (remote.settings?.data) result.settings = remote.settings.data;
    if (remote.history?.data) result.history = remote.history.data;
    if (remote.openTabs?.data) result.openTabs = { tabs: remote.openTabs.data, device: remote.openTabs.deviceName, updatedAt: remote.openTabs.updatedAt };

    // Decrypt passwords
    if (remote.passwords?.encrypted) {
      try {
        const decrypted = await decrypt(remote.passwords.encrypted, currentGoogleUid);
        result.passwords = JSON.parse(decrypted);
      } catch (err) {
        console.error('[Sync] Password decryption failed on pull:', err.message);
      }
    }

    console.log('[Sync] Pulled all data:', Object.keys(result).join(', '));
    return result;
  } catch (err) {
    console.error('[Sync] Pull failed:', err.message);
    return null;
  }
}

/**
 * Disconnect sync — remove all listeners, clear state
 */
export function disconnectSync() {
  for (const [category, { ref: catRef }] of Object.entries(activeListeners)) {
    off(catRef);
    console.log(`[Sync] Removed listener for ${category}`);
  }
  
  // Clear debounce timers
  for (const timer of Object.values(debounceTimers)) {
    clearTimeout(timer);
  }
  
  Object.keys(activeListeners).forEach(k => delete activeListeners[k]);
  Object.keys(debounceTimers).forEach(k => delete debounceTimers[k]);

  currentUserId = null;
  currentGoogleUid = null;
  _isSyncingFromRemote = false;

  console.log('[Sync] Disconnected');
}

// Helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
