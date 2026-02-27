const CACHE_NAME = 'rpm-blocked-days-v3';
const urlsToCache = [
  '/css/style.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap',
  'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css',
  'https://npmcdn.com/flatpickr/dist/themes/dark.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Navigation requests (HTML pages) -> Network First
  if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Other requests -> Cache First
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('push', event => {
  console.log('[ServiceWorker] Push event received!', event);
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[ServiceWorker] Push data received:', data);
      const options = {
        body: data.body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-192x192.png',
        data: data.url || '/'
      };
      console.log('[ServiceWorker] Showing notification with options:', options);
      event.waitUntil(
        self.registration.showNotification(data.title || 'Blocked Days', options)
          .then(() => console.log('[ServiceWorker] Notification shown successfully'))
          .catch(err => console.error('[ServiceWorker] Error showing notification:', err))
      );
    } catch (e) {
      console.error('[ServiceWorker] Push event parse error:', e);
    }
  } else {
    console.log('[ServiceWorker] Push event triggered but no data was provided');
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data)
  );
});
