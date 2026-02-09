// Service Worker pentru Push Notifications

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
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
