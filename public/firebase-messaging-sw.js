/* eslint-disable no-undef */
// Firebase Messaging Service Worker
// Uses compat scripts (v10) — compatible with any Firebase backend version
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCRfch8PtuqVdBIwjBcGq7NS5NDjt8PeZI',
  authDomain: 'elitepro-16718.firebaseapp.com',
  projectId: 'elitepro-16718',
  storageBucket: 'elitepro-16718.firebasestorage.app',
  messagingSenderId: '167024537410',
  appId: '1:167024537410:web:5250575dd71a17ee0462db',
});

const messaging = firebase.messaging();

// Handle background push notifications (app not in foreground)
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'ElitePro', {
    body: body || 'You have a new notification',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: payload.data?.type || 'default',
    data: payload.data || {},
  });
});

// Handle notification click — open the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlPath = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', url: urlPath });
          return client.focus();
        }
      }
      // Otherwise open new window
      return clients.openWindow(self.location.origin + '/#' + urlPath.replace(/^\/#?/, '/'));
    })
  );
});
