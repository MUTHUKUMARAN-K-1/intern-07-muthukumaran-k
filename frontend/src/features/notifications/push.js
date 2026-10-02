import { getApps, initializeApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

import notificationsApi from '../../api/notifications.js';
import { firebaseConfig, pushConfigured, vapidKey } from './firebaseConfig.js';

const DEVICE_KEY = 'pillsync.push-device';

async function messaging() {
  if (!pushConfigured) throw new Error('Browser push is not configured on this deployment.');
  if (!window.isSecureContext || !(await isSupported())) {
    throw new Error('Browser push needs HTTPS and a browser that supports notifications.');
  }
  const app =
    getApps().find((item) => item.name === 'pillsync-push') ||
    initializeApp(firebaseConfig, 'pillsync-push');
  return getMessaging(app);
}

export async function enablePush() {
  // The permission prompt only follows an explicit click, never a page load.
  if (!pushConfigured) throw new Error('Browser push is not configured on this deployment.');
  if (!('Notification' in window)) throw new Error('This browser does not support notifications.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error(
      'Notifications were not allowed. You can change this in your browser settings.'
    );
  }
  const instance = await messaging();
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    updateViaCache: 'none',
  });
  await navigator.serviceWorker.ready;
  const token = await getToken(instance, { vapidKey, serviceWorkerRegistration: registration });
  if (!token) throw new Error('No push registration was returned. Try again.');
  const device = await notificationsApi.registerDevice({
    token,
    platform: 'WEB',
    device_name: 'Web browser',
  });
  localStorage.setItem(DEVICE_KEY, device.id);
  return device;
}

export async function disablePush({ serverRevoked = false } = {}) {
  const id = localStorage.getItem(DEVICE_KEY);
  if (!id) return;
  // Revoke on the server before unsubscribing locally, so a shared browser never
  // receives the previous user's medication notices after a successful logout.
  try {
    if (!serverRevoked) await notificationsApi.removeDevice(id);
  } finally {
    localStorage.removeItem(DEVICE_KEY);
    if (pushConfigured && (await isSupported())) await deleteToken(await messaging());
  }
}

export async function listenForPush(callback) {
  if (!pushConfigured || !('Notification' in window)) {
    return () => {};
  }
  return onMessage(await messaging(), callback);
}
