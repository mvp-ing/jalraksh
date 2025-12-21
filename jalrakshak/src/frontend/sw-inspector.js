/**
 * JalRakshak Inspector Mode Service Worker
 *
 * Handles Web Push notifications for pollution alerts.
 * Enables offline-first experience for inspectors.
 */

const CACHE_NAME = 'jalrakshak-inspector-v1';

// Assets to cache for offline access
const STATIC_ASSETS = [
  '/',
  '/index.html',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Inspector Service Worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );

  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Inspector Service Worker...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  // Take control of all pages immediately
  self.clients.claim();
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = {
    title: 'JalRakshak Alert',
    body: 'New alert detected',
    alertId: null,
    stationCode: null,
    severity: null,
    url: '/inspector',
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  // Determine notification icon based on severity
  const severityIcons = {
    low: '/icons/alert-low.png',
    medium: '/icons/alert-medium.png',
    high: '/icons/alert-high.png',
    critical: '/icons/alert-critical.png',
  };

  const options = {
    body: data.body,
    icon: severityIcons[data.severity] || '/icons/alert-default.png',
    badge: '/icons/badge-72.png',
    vibrate: data.severity === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200],
    tag: data.alertId || 'inspector-alert',
    renotify: true,
    requireInteraction: data.severity === 'critical' || data.severity === 'high',
    data: {
      alertId: data.alertId,
      stationCode: data.stationCode,
      severity: data.severity,
      url: data.url || '/inspector',
      timestamp: Date.now(),
    },
    actions: [
      {
        action: 'investigate',
        title: 'Investigate',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event - handle user interaction
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  const notificationData = event.notification.data;

  if (event.action === 'dismiss') {
    // User dismissed - just close
    return;
  }

  // Default action or 'investigate' - open the inspector view
  const urlToOpen = event.action === 'investigate' && notificationData.alertId
    ? `/inspector?alert=${notificationData.alertId}`
    : notificationData.url || '/inspector';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already an open window
      for (const client of clientList) {
        if (client.url.includes('/inspector') && 'focus' in client) {
          // Navigate existing window to the alert
          client.navigate(urlToOpen);
          return client.focus();
        }
      }

      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification close event - track dismissals
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed without action');

  // Could send analytics here
  const notificationData = event.notification.data;
  if (notificationData.alertId) {
    // Track that this alert was seen but not acted upon
    console.log(`[SW] Alert ${notificationData.alertId} dismissed`);
  }
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests (don't cache dynamic data)
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone response for caching
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request);
      })
  );
});

// Message event - handle messages from the main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('[SW] Inspector Service Worker loaded');
