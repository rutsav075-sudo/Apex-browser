// Apex Browser — Service Worker for PWA support
// Caching strategy: Cache-First for static assets, Network-First for API calls

const CACHE_NAME = 'apex-browser-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './build/icon.png',
  './build/icon512.png',
];

// Install — cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Apex SW] Caching core assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[Apex SW] Some assets failed to cache:', err);
      });
    })
  );
  // Activate immediately (don't wait for old tabs to close)
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => {
            console.log('[Apex SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch — Network First with Cache Fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip chrome-extension:// and other non-http schemes
  if (!url.protocol.startsWith('http')) return;
  
  // Skip API calls, WebSocket upgrades, and external services
  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('unsplash.com') ||
    url.hostname.includes('pollinations.ai') ||
    url.hostname.includes('youtube') ||
    url.hostname.includes('google.com') ||
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1'
  ) {
    return; // Let these pass through to the network directly
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for offline use
        if (response.ok) {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // Return a fallback offline page for navigation requests
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
