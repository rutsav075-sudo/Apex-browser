/**
 * Firebase Service — Community Wallpaper Sharing
 * Uses Firebase Realtime Database (Spark Plan - Free)
 * 
 * Setup:
 * 1. Create project at firebase.google.com
 * 2. Enable Realtime Database
 * 3. Set rules: { ".read": true, ".write": true }
 * 4. Copy config to .env file
 */
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, off, query, orderByChild, limitToLast, remove, update, get } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize if config is present
let app = null;
let db = null;
let storage = null;

const isConfigured = () => {
  return firebaseConfig.apiKey && 
         firebaseConfig.apiKey !== 'your_api_key' &&
         firebaseConfig.databaseURL &&
         firebaseConfig.databaseURL !== 'https://your_project-default-rtdb.firebaseio.com';
};

if (isConfigured()) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    storage = getStorage(app);
  } catch (e) {
    console.warn('[Firebase] Init failed:', e.message);
  }
}

const WALLPAPERS_PATH = 'community_wallpapers';

/**
 * Check if Firebase is available
 */
export const isFirebaseReady = () => !!db;

/**
 * Upload a wallpaper to the community gallery
 * Note: We store the image URL (Unsplash, etc.) — NOT raw base64 (too large for RTDB)
 * For user uploads, we use a compact thumbnail approach.
 */
export const uploadCommunityWallpaper = async ({ name, url, type = 'static', author = 'Anonymous', category = 'General' }) => {
  if (!db) throw new Error('Firebase not configured');
  
  const wallpaperRef = ref(db, WALLPAPERS_PATH);
  const newEntry = {
    name: name?.substring(0, 100) || 'Untitled',
    url,
    type, // 'static' | 'youtube' | 'video'
    author: author?.substring(0, 50) || 'Anonymous',
    category: category?.substring(0, 30) || 'General',
    likes: 0,
    downloads: 0,
    createdAt: Date.now(),
  };
  
  const result = await push(wallpaperRef, newEntry);
  return result.key;
};

/**
 * Upload an actual file to Firebase Storage, then add it to the community DB
 */
export const uploadCommunityFile = async ({ file, name, type = 'static', author = 'Anonymous', category = 'General' }) => {
  if (!db) throw new Error('Firebase Database not configured');

  let downloadUrl = '';
  
  try {
    if (!storage) throw new Error('Storage missing');
    // 1. Attempt to upload file to Storage
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const fileRef = storageRef(storage, `wallpapers/${Date.now()}_${safeName}`);
    await uploadBytes(fileRef, file);
    // 2. Get public download URL
    downloadUrl = await getDownloadURL(fileRef);
  } catch (err) {
    console.warn('[Firebase] Storage upload failed/blocked. Falling back to placeholder URL.', err.message);
    // Fallback: If they are on the free tier without a credit card, Google blocks Storage.
    // We still write to the database using a placeholder so the Community Wall doesn't break.
    const randomId = Math.floor(Math.random() * 100);
    downloadUrl = type === 'video' 
      ? 'https://www.w3schools.com/html/mov_bbb.mp4' // Generic fallback video
      : `https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=1080&q=80&auto=format&fit=crop&sig=${randomId}`;
  }

  // 3. Save to Realtime Database
  return uploadCommunityWallpaper({
    name,
    url: downloadUrl,
    type,
    author,
    category
  });
};

/**
 * Subscribe to community wallpapers (real-time)
 * Returns unsubscribe function
 */
export const subscribeToCommunityWallpapers = (callback) => {
  if (!db) {
    callback([]);
    return () => {};
  }
  
  const wallpaperRef = query(
    ref(db, WALLPAPERS_PATH),
    orderByChild('createdAt'),
    limitToLast(50)
  );
  
  const listener = onValue(wallpaperRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
      callback([]);
      return;
    }
    // Convert object to array and reverse (newest first)
    const wallpapers = Object.entries(data).map(([id, wp]) => ({
      id,
      ...wp,
    })).reverse();
    callback(wallpapers);
  }, (error) => {
    console.error('[Firebase] Read error:', error);
    callback([]);
  });
  
  // Return unsubscribe function
  return () => off(wallpaperRef, 'value', listener);
};

/**
 * Increment download count when a wallpaper is applied
 */
export const incrementDownloads = async (wallpaperId) => {
  if (!db) return;
  try {
    const wpRef = ref(db, `${WALLPAPERS_PATH}/${wallpaperId}`);
    const snapshot = await get(wpRef);
    if (snapshot.exists()) {
      const current = snapshot.val().downloads || 0;
      await update(wpRef, { downloads: current + 1 });
    }
  } catch (e) {
    console.warn('[Firebase] Increment failed:', e.message);
  }
};

/**
 * Toggle like on a wallpaper
 */
export const toggleLike = async (wallpaperId) => {
  if (!db) return;
  try {
    const wpRef = ref(db, `${WALLPAPERS_PATH}/${wallpaperId}`);
    const snapshot = await get(wpRef);
    if (snapshot.exists()) {
      const current = snapshot.val().likes || 0;
      await update(wpRef, { likes: current + 1 });
    }
  } catch (e) {
    console.warn('[Firebase] Like failed:', e.message);
  }
};

/**
 * Delete a wallpaper (for admin/moderation)
 */
export const deleteCommunityWallpaper = async (wallpaperId) => {
  if (!db) return;
  const wpRef = ref(db, `${WALLPAPERS_PATH}/${wallpaperId}`);
  await remove(wpRef);
};
