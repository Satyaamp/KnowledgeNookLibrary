const CACHE_NAME = "knowledgenook-v6"; // UPDATE THIS VERSION ON EVERY DEPLOY TO FORCE REFRESH

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/register.html",
  "/student/dashboard.html",
  "/admin/dashboard.html",

  "/css/style.css",
  "/css/mobile-app-style.css",
  "/css/landing.css",
  "/css/admin.css",
  "/css/admin-mobile.css",

  "/js/api.js",
  "/js/auth.js",
  "/js/landing.js",
  "/js/admin.js",
  "/js/student.js",

  "/images/icons/icon-72.png",
  "/images/icons/icon-96.png",
  "/images/icons/icon-128.png",
  "/images/icons/icon-144.png",
  "/images/icons/icon-152.png",
  "/images/icons/icon-192.png",
  "/images/icons/icon-384.png",
  "/images/icons/icon-512.png"
];

/* ================================
   INSTALL
================================ */
self.addEventListener("install", event => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Caching static assets");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // force activate
});

/* ================================
   ACTIVATE
================================ */
self.addEventListener("activate", event => {
  console.log("🚀 Service Worker activating...");
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then(keys =>
        Promise.all(
          keys.map(key => {
            if (key !== CACHE_NAME) {
              console.log("🧹 Deleting old cache:", key);
              return caches.delete(key);
            }
          })
        )
      ),
      self.clients.claim() // take control immediately
    ])
  );
});

/* ================================
   FETCH
================================ */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 1. Network First for HTML/Navigation (Ensures latest version)
  if (event.request.mode === 'navigate' || url.pathname.indexOf('.') === -1) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Do not cache API calls to ensure dynamic backend data isn't trapped offline
          if (url.pathname.startsWith('/api/')) return networkResponse;
          
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(event.request); // Fallback to cache if offline
        })
    );
  } else {
    // 2. Cache First for Static Assets (Images, CSS, JS)
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // Only cache valid local requests to prevent third-party CORS issues
          if (response.status === 200 && event.request.url.startsWith(self.location.origin)) {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response.clone());
              return response;
            });
          }
          return response;
        });
      })
    );
  }
});

/* ================================
   PUSH NOTIFICATIONS
================================ */
self.addEventListener('push', event => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Knowledge Nook Library';
      const options = {
        body: data.message || 'You have a new notification.',
        icon: '/images/icons/icon-192.png',
        badge: '/images/icons/icon-72.png',
        data: {
          url: data.url || '/student/dashboard.html'
        }
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (e) {
      console.error('Error parsing push data', e);
    }
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const urlToOpen = event.notification.data.url;
      return clients.openWindow(urlToOpen);
    })
  );
});
