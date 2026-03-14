// Service Worker pentru Push Notifications + Offline Caching
// Versiunea 2.0 - Enhanced PWA Support

const CACHE_NAME = 'prevcor-cache-v3';
const STATIC_CACHE = 'prevcor-static-v3';
const DYNAMIC_CACHE = 'prevcor-dynamic-v3';
const IMAGE_CACHE = 'prevcor-images-v3';

// Resurse statice (cache la install)
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/logo.png',
  '/manifest.json',
  '/fonts/afm/Helvetica.afm',
];

// Limite cache
const DYNAMIC_CACHE_LIMIT = 50;
const IMAGE_CACHE_LIMIT = 100;

// Funcție pentru limitarea cache-ului
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    limitCacheSize(cacheName, maxItems);
  }
}

self.addEventListener('push', function(event) {
  if (!event.data) return;

  const data = event.data.json();
  
  const options = {
    body: data.body || 'Ai o notificare nouă',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/admin/orders'
    },
    actions: [
      { action: 'view', title: 'Vezi' },
      { action: 'close', title: 'Închide' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Comandă nouă', options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Dacă există deja o fereastră deschisă, o focusează
      for (let client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      // Altfel deschide una nouă
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url || '/admin/orders');
      }
    })
  );
});

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function(cache) {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) {
          // Șterge cache-urile vechi
          return name !== STATIC_CACHE && 
                 name !== DYNAMIC_CACHE && 
                 name !== IMAGE_CACHE &&
                 name !== CACHE_NAME;
        }).map(function(name) {
          console.log('[SW] Deleting old cache:', name);
          return caches.delete(name);
        })
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Strategii de caching diferențiate
self.addEventListener('fetch', function(event) {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip API calls - nu le cache-uim
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin/api/')) return;
  
  // Skip complet paginile admin - fără caching
  if (url.pathname.startsWith('/admin')) return;
  
  // Skip WebSocket și chrome-extension
  if (url.protocol === 'chrome-extension:' || url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // Strategia pentru imagini - Cache First
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async function(cache) {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
            limitCacheSize(IMAGE_CACHE, IMAGE_CACHE_LIMIT);
          }
          return networkResponse;
        } catch (err) {
          return new Response('', { status: 404 });
        }
      })
    );
    return;
  }

  // Strategia pentru JS/CSS - Stale While Revalidate
  if (url.pathname.match(/\.(js|css)$/) || url.pathname.includes('/_next/static')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async function(cache) {
        const cachedResponse = await cache.match(event.request);
        const fetchPromise = fetch(event.request).then(function(networkResponse) {
          if (networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Strategia pentru HTML pages - Network First cu fallback
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // Cache-uiește paginile vizitate
        if (response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(DYNAMIC_CACHE).then(function(cache) {
            cache.put(event.request, responseClone);
            limitCacheSize(DYNAMIC_CACHE, DYNAMIC_CACHE_LIMIT);
          });
        }
        return response;
      })
      .catch(async function() {
        // Încearcă din cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Fallback la pagina offline pentru navigări
        if (event.request.mode === 'navigate') {
          return caches.match('/offline.html');
        }
        return new Response('Offline', { status: 503 });
      })
  );
});
