// Push notification service worker handler
// This file handles incoming push notifications

self.addEventListener('push', function(event) {
  console.log('[Push SW] Push received:', event);

  let data = {
    title: 'FleetTrack Alert',
    body: 'You have a new notification',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: 'fleet-notification',
    data: {}
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: data.actions || [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Push SW] Notification clicked:', event);
  
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  if (action === 'dismiss') {
    return;
  }

  // Determine the URL to open
  let urlToOpen = '/';
  
  if (notificationData.url) {
    urlToOpen = notificationData.url;
  } else if (notificationData.type) {
    switch (notificationData.type) {
      case 'sos':
      case 'alert':
        urlToOpen = '/alerts';
        break;
      case 'geofence':
        urlToOpen = '/geofencing';
        break;
      case 'maintenance':
        urlToOpen = '/maintenance';
        break;
      case 'dispatch':
        urlToOpen = '/dispatch';
        break;
      case 'vehicle':
        urlToOpen = notificationData.vehicle_id ? `/map?vehicle=${notificationData.vehicle_id}` : '/map';
        break;
      default:
        urlToOpen = '/dashboard';
    }
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: notificationData
          });
          return client.focus().then(function(focusedClient) {
            if (focusedClient) {
              focusedClient.navigate(urlToOpen);
            }
          });
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[Push SW] Notification closed:', event);
});

// Handle push subscription change
self.addEventListener('pushsubscriptionchange', function(event) {
  console.log('[Push SW] Push subscription changed:', event);
  
  event.waitUntil(
    self.registration.pushManager.subscribe({
      userVisibleOnly: true
    }).then(function(subscription) {
      // Here you would typically send the new subscription to your server
      console.log('[Push SW] New subscription:', subscription);
    })
  );
});
