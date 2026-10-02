import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: 'src/features/notifications/firebase-messaging-sw.js',
      name: 'PillSyncPush',
      formats: ['iife'],
      fileName: () => 'firebase-messaging-sw.js',
    },
  },
});
