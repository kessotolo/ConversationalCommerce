/**
 * Service Worker for ConversationalCommerce
 * Provides offline capabilities and caching strategies
 * Specifically optimized for markets with limited connectivity (e.g., Africa)
 * 
 * @version 1.0.0
 */

// Cache names for different resource types
const CACHE_NAMES = {
  static: 'static-cache-v1',
  dynamic: 'dynamic-cache-v1',
  images: 'images-cache-v1',
  api: 'api-cache-v1'
};

// Resources to precache (app shell)
const APP_SHELL = [
  '/',
  '/offline.html',
  '/dashboard',
  '/admin',
  '/favicon.ico',
  '/logo.png'
];

// Install event - precache app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  // Precache app shell resources
  event.waitUntil(
    caches.open(CACHE_NAMES.static)
      .then(cache => {
        console.log('[Service Worker] Precaching App Shell...');
        return cache.addAll(APP_SHELL);
      })
      .catch(error => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  
  // Clean up old cache versions
  event.waitUntil(
    caches.keys()
      .then(keyList => {
        return Promise.all(keyList.map(key => {
          // If cache name is not in our current cache names, delete it
          if (!Object.values(CACHE_NAMES).includes(key)) {
            console.log('[Service Worker] Removing old cache:', key);
            return caches.delete(key);
          }
        }));
      })
  );
  
  // Ensure the service worker takes control immediately
  return self.clients.claim();
});

// Helper function to determine cache strategy based on request
function getCacheStrategy(request) {
  const url = new URL(request.url);
  
  // Static assets - Cache First
  if (request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font') {
    return 'cache-first';
  }
  
  // Images - Cache First with network fallback
  if (request.destination === 'image') {
    return 'cache-first';
  }
  
  // API requests - Network First with cache fallback
  if (url.pathname.includes('/api/')) {
    return 'network-first';
  }
  
  // HTML navigation - Network First
  if (request.mode === 'navigate') {
    return 'network-first';
  }
  
  // Default - Network First
  return 'network-first';
}

// Helper function to determine appropriate cache for request
function getCacheName(request) {
  const url = new URL(request.url);
  
  if (request.destination === 'image') {
    return CACHE_NAMES.images;
  }
  
  if (url.pathname.includes('/api/')) {
    return CACHE_NAMES.api;
  }
  
  if (request.destination === 'style' || 
      request.destination === 'script' ||
      request.destination === 'font') {
    return CACHE_NAMES.static;
  }
  
  return CACHE_NAMES.dynamic;
}

// Helper function to handle network-first strategy
async function networkFirst(request) {
  const cacheName = getCacheName(request);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    // Clone the response to store in cache and return the original
    const responseToCache = networkResponse.clone();
    
    // Only cache successful responses
    if (networkResponse.ok) {
      caches.open(cacheName).then(cache => {
        cache.put(request, responseToCache);
      });
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a navigation request and we're offline, show offline page
    if (request.mode === 'navigate') {
      return caches.match('/offline.html');
    }
    
    // Otherwise, let the error propagate
    throw error;
  }
}

// Helper function to handle cache-first strategy
async function cacheFirst(request) {
  const cacheName = getCacheName(request);
  
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Cache miss, go to network
  try {
    const networkResponse = await fetch(request);
    
    // Clone the response to store in cache and return the original
    const responseToCache = networkResponse.clone();
    
    // Only cache successful responses
    if (networkResponse.ok) {
      caches.open(cacheName).then(cache => {
        cache.put(request, responseToCache);
      });
    }
    
    return networkResponse;
  } catch (error) {
    // If it's an image, return a placeholder
    if (request.destination === 'image') {
      return caches.match('/images/placeholder.png');
    }
    
    // Otherwise, let the error propagate
    throw error;
  }
}

// Fetch event - intercept network requests
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip Chrome extension requests and other non-http requests
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Determine cache strategy
  const strategy = getCacheStrategy(event.request);
  
  // Apply appropriate strategy
  if (strategy === 'cache-first') {
    event.respondWith(cacheFirst(event.request));
  } else { // network-first
    event.respondWith(networkFirst(event.request));
  }
});

// Handle sync events for offline forms/actions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background Syncing:', event.tag);
  
  if (event.tag === 'sync-activity-logs') {
    event.waitUntil(syncActivityLogs());
  }
  
  if (event.tag === 'sync-form-submissions') {
    event.waitUntil(syncFormSubmissions());
  }
});

// Helper function to sync activity logs
async function syncActivityLogs() {
  try {
    // Get pending logs from IndexedDB or localStorage
    const pendingLogs = await getPendingLogs();
    
    // Process each pending log
    for (const log of pendingLogs) {
      try {
        const response = await fetch('/api/v1/activities', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': log.authToken // Stored token from when offline
          },
          body: JSON.stringify(log.data)
        });
        
        if (response.ok) {
          // Remove from pending logs
          await removePendingLog(log.id);
        }
      } catch (error) {
        console.error('[Service Worker] Failed to sync log:', error);
        // Will retry on next sync
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error in syncActivityLogs:', error);
  }
}

// Helper function to sync form submissions
async function syncFormSubmissions() {
  try {
    // Implementation similar to syncActivityLogs but for form data
    console.log('[Service Worker] Syncing form submissions...');
  } catch (error) {
    console.error('[Service Worker] Error in syncFormSubmissions:', error);
  }
}

// Helper function to get pending logs (placeholder implementation)
async function getPendingLogs() {
  // In a real implementation, this would access IndexedDB
  try {
    const pendingLogsStr = localStorage.getItem('pendingActivityLogs');
    return pendingLogsStr ? JSON.parse(pendingLogsStr) : [];
  } catch (error) {
    console.error('[Service Worker] Error getting pending logs:', error);
    return [];
  }
}

// Helper function to remove pending log (placeholder implementation)
async function removePendingLog(id) {
  // In a real implementation, this would access IndexedDB
  try {
    const pendingLogsStr = localStorage.getItem('pendingActivityLogs');
    if (pendingLogsStr) {
      const pendingLogs = JSON.parse(pendingLogsStr);
      const updatedLogs = pendingLogs.filter(log => log.id !== id);
      localStorage.setItem('pendingActivityLogs', JSON.stringify(updatedLogs));
    }
  } catch (error) {
    console.error('[Service Worker] Error removing pending log:', error);
  }
}
