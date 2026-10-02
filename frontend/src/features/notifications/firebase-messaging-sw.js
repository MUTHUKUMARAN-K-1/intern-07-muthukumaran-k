import { initializeApp } from 'firebase/app';
import { getMessaging } from 'firebase/messaging/sw';

import { firebaseConfig } from './firebaseConfig.js';

// Bundled locally: no third-party scripts, credentials or prescription data in
// the service worker. FCM displays notification payloads in the background.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation();
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const existing = clients.find(
        (client) => new URL(client.url).origin === self.location.origin
      );
      if (existing) {
        await existing.navigate('/today');
        return existing.focus();
      }
      return self.clients.openWindow('/today');
    })
  );
});
// Register the click handler before FCM installs its default navigation handler.
if (firebaseConfig.apiKey && firebaseConfig.appId && firebaseConfig.messagingSenderId) {
  getMessaging(initializeApp(firebaseConfig));
}
